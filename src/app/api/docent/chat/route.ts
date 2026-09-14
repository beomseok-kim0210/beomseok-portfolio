import { docentConfig } from "@/data/docent";
import { getLlmProvider } from "@/lib/docent/llmProvider";
import { answerFromEvidence, buildGroundedSystemPrompt, leaksInternalPath, toSourceDescriptors } from "@/lib/docent/rag/grounding";
import { validatePageContext } from "@/lib/docent/rag/pageContext";
import { retrieve, type RetrievalResult } from "@/lib/docent/rag/retrieval";
import type { PageContext } from "@/lib/docent/rag/types";
import { checkRateLimit, clientIpFrom } from "@/lib/docent/rateLimit";
import {
  isDocentEmotion,
  type DocentChatMessage,
  type DocentEmotion,
  type DocentStreamEvent,
  type DocentTimings,
} from "@/types/docent";

// knowledge/*.md를 fs로 읽으므로 Node 런타임 필수.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const NDJSON_HEADERS = {
  "Content-Type": "application/x-ndjson; charset=utf-8",
  "Cache-Control": "no-store",
} as const;

function line(event: DocentStreamEvent): string {
  return `${JSON.stringify(event)}\n`;
}

interface Parsed {
  messages: DocentChatMessage[];
  pageContext: unknown;
}

function validate(body: unknown): Parsed | { error: string } {
  if (!body || typeof body !== "object" || !Array.isArray((body as { messages?: unknown }).messages)) {
    return { error: "messages 배열이 필요합니다." };
  }
  const raw = (body as { messages: unknown[] }).messages;
  if (raw.length === 0 || raw.length > 12) {
    return { error: "메시지는 1~12개여야 합니다." };
  }
  const messages: DocentChatMessage[] = [];
  for (const m of raw) {
    if (!m || typeof m !== "object" || Array.isArray(m)) {
      return { error: "메시지 형식이 올바르지 않습니다." };
    }
    const msg = m as Partial<DocentChatMessage>;
    if (
      (msg.role !== "user" && msg.role !== "assistant") ||
      typeof msg.content !== "string" ||
      msg.content.length === 0 ||
      msg.content.length > 1000
    ) {
      return { error: "메시지 형식이 올바르지 않습니다." };
    }
    messages.push({ role: msg.role, content: msg.content });
  }
  if (messages[messages.length - 1].role !== "user") {
    return { error: "마지막 메시지는 user여야 합니다." };
  }
  return {
    messages: messages.slice(-docentConfig.maxHistoryMessages),
    pageContext: (body as { pageContext?: unknown }).pageContext,
  };
}

/** 폴백 답변을 라이브와 같은 스트림 모양으로 흘린다. */
function enqueueChunkedAnswer(send: (e: DocentStreamEvent) => void, answer: string) {
  const words = answer.split(" ");
  const chunkSize = Math.max(1, Math.ceil(words.length / 6));
  for (let i = 0; i < words.length; i += chunkSize) {
    const text = (i === 0 ? "" : " ") + words.slice(i, i + chunkSize).join(" ");
    send({ type: "delta", text });
  }
}

interface Grounded {
  page: PageContext | null;
  retrieval: RetrievalResult;
  pageContextMs: number;
  retrievalMs: number;
  startedAt: number;
}

function ground(parsed: Parsed): Grounded {
  const startedAt = performance.now();
  const { context: page } = validatePageContext(parsed.pageContext);
  const pageContextMs = performance.now() - startedAt;

  // 직전 사용자 발화만 (어시스턴트 답은 검색 근거가 아니다). 최근 3개.
  const users = parsed.messages.filter((m) => m.role === "user").map((m) => m.content);
  const question = users[users.length - 1];
  const recentUserQueries = users.slice(0, -1).slice(-3);

  const t1 = performance.now();
  const retrieval = retrieve(question, page, { recentUserQueries });
  const retrievalMs = performance.now() - t1;
  return { page, retrieval, pageContextMs, retrievalMs, startedAt };
}

function sourcesEvent(g: Grounded): DocentStreamEvent {
  const sources = toSourceDescriptors(g.retrieval.results).filter((s) => !leaksInternalPath(`${s.title} ${s.sourceId}`));
  return { type: "sources", grounded: g.retrieval.supported, activeProject: g.retrieval.activeProject, sources };
}

function timings(g: Grounded, llm: { ttfb: number | null; total: number | null }): DocentTimings {
  const r = (x: number | null) => (x === null ? null : Math.round(x * 10) / 10);
  return {
    pageContextMs: r(g.pageContextMs) as number,
    retrievalMs: r(g.retrievalMs) as number,
    llmTtfbMs: r(llm.ttfb),
    llmTotalMs: r(llm.total),
    chatTotalMs: r(performance.now() - g.startedAt) as number,
  };
}

function logChat(g: Grounded, mode: string, extra: Record<string, unknown>) {
  // 질문 본문·근거 본문·경로는 남기지 않는다.
  console.info("[chat]", JSON.stringify({
    mode,
    pageType: g.page?.pageType ?? null,
    pageProject: g.page?.projectSlug ?? null,
    activeProject: g.retrieval.activeProject,
    explicitProjects: g.retrieval.explicitProjects,
    intents: g.retrieval.intents,
    supported: g.retrieval.supported,
    retrievalMode: g.retrieval.mode,
    topChunk: g.retrieval.results[0]?.chunk.id ?? null,
    topLexical: g.retrieval.results[0] ? Math.round(g.retrieval.results[0].lexical * 100) / 100 : null,
    pageContextMs: Math.round(g.pageContextMs * 10) / 10,
    retrievalMs: Math.round(g.retrievalMs * 10) / 10,
    ...extra,
  }));
}

/** LLM 없는 경로: 근거 발췌 → 캔드 → 근거 부족. */
function evidenceResponse(parsed: Parsed): Response {
  const g = ground(parsed);
  const question = parsed.messages[parsed.messages.length - 1].content;
  const { emotion, answer, kind } = answerFromEvidence(question, g.page, g.retrieval);
  const mode = kind === "evidence" ? "evidence" : "fallback";
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    start(controller) {
      const send = (e: DocentStreamEvent) => controller.enqueue(encoder.encode(line(e)));
      send({ type: "meta", emotion, mode, provider: "none" });
      send(sourcesEvent(g));
      enqueueChunkedAnswer(send, answer);
      const t = timings(g, { ttfb: null, total: null });
      send({ type: "done", timings: t });
      controller.close();
      logChat(g, mode, { answerKind: kind, chatTotalMs: t.chatTotalMs });
    },
  });
  return new Response(stream, { headers: NDJSON_HEADERS });
}

/** 라이브: 검색 근거를 시스템 프롬프트에 싣고 LLM 스트리밍 + 감정 태그 파싱. */
function liveResponse(parsed: Parsed): Response {
  const provider = getLlmProvider();
  if (!provider) return evidenceResponse(parsed);

  const g = ground(parsed);
  const question = parsed.messages[parsed.messages.length - 1].content;
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: DocentStreamEvent) => controller.enqueue(encoder.encode(line(event)));
      send(sourcesEvent(g));

      let buffer = "";
      let metaSent = false;
      let firstTokenAt: number | null = null;
      const llmStart = performance.now();

      const flushMeta = (emotion: DocentEmotion, rest: string) => {
        send({ type: "meta", emotion, mode: "live", provider: provider.name });
        metaSent = true;
        if (rest) send({ type: "delta", text: rest });
      };

      try {
        const system = buildGroundedSystemPrompt(g.page, g.retrieval);
        for await (const text of provider.stream({ system, messages: parsed.messages, maxTokens: docentConfig.maxTokens })) {
          if (firstTokenAt === null) firstTokenAt = performance.now();
          if (metaSent) {
            send({ type: "delta", text });
            continue;
          }
          buffer += text;
          const match = buffer.match(/^\s*<emotion>\s*(\w+)\s*<\/emotion>\s*/);
          if (match) {
            const emotion = isDocentEmotion(match[1]) ? match[1] : "neutral";
            flushMeta(emotion, buffer.slice(match[0].length));
          } else if (buffer.length > 64) {
            flushMeta("neutral", buffer);
          }
        }
        if (!metaSent) flushMeta("neutral", buffer);
        const t = timings(g, { ttfb: firstTokenAt === null ? null : firstTokenAt - llmStart, total: performance.now() - llmStart });
        send({ type: "done", timings: t });
        logChat(g, "live", { provider: provider.name, model: provider.model, llmTtfbMs: t.llmTtfbMs, llmTotalMs: t.llmTotalMs, chatTotalMs: t.chatTotalMs });
      } catch (err) {
        if (!metaSent) {
          // 첫 토큰 전에 죽었다 — 아직 아무 말도 안 했으니 근거 발췌로 조용히 내려간다.
          const { emotion, answer, kind } = answerFromEvidence(question, g.page, g.retrieval);
          const mode = kind === "evidence" ? "evidence" : "fallback";
          send({ type: "meta", emotion, mode, provider: "none" });
          enqueueChunkedAnswer(send, answer);
          const t = timings(g, { ttfb: null, total: performance.now() - llmStart });
          send({ type: "done", timings: t });
          logChat(g, mode, { providerFailed: provider.name, rateLimited: provider.isRateLimit(err), error: err instanceof Error ? err.name : "unknown", chatTotalMs: t.chatTotalMs });
        } else {
          // 스트리밍 시작 후에는 상태코드를 바꿀 수 없으므로 error 이벤트로 전달.
          const message = provider.isRateLimit(err)
            ? "지금 질문이 많아요. 잠시 후 다시 시도해 주세요."
            : "답변 생성 중 문제가 생겼어요.";
          send({ type: "error", message });
          logChat(g, "live", { providerFailed: provider.name, midStream: true, error: err instanceof Error ? err.name : "unknown" });
        }
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, { headers: NDJSON_HEADERS });
}

export async function POST(request: Request) {
  const rate = checkRateLimit(clientIpFrom(request.headers));
  if (!rate.ok) {
    return Response.json(
      { error: "요청이 너무 잦아요. 잠시 후 다시 시도해 주세요." },
      { status: 429, headers: { "Retry-After": String(rate.retryAfterSec ?? 30) } }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "잘못된 JSON입니다." }, { status: 400 });
  }

  const parsed = validate(body);
  if ("error" in parsed) {
    return Response.json({ error: parsed.error }, { status: 400 });
  }

  // 프로바이더 자격증명이 없으면 근거 발췌 모드 — 요청마다 체크하므로 키 추가만으로 라이브 전환.
  return liveResponse(parsed);
}
