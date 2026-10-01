import { docentConfig } from "@/data/docent";
import { getLlmProvider } from "@/lib/docent/llmProvider";
import { VisibleAnswerStream } from "@/lib/docent/protocolStream";
import {
  answerFromEvidence,
  buildGroundedSystemPrompt,
  leaksInternalPath,
  toSourceDescriptors,
} from "@/lib/docent/rag/grounding";
import { retrieveForChat, type HybridRetrieval } from "@/lib/docent/rag/hybrid";
import { validatePageContext } from "@/lib/docent/rag/pageContext";
import type { RetrievalResult } from "@/lib/docent/rag/retrieval";
import type { PageContext } from "@/lib/docent/rag/types";
import { checkRateLimit, clientIpFrom } from "@/lib/docent/rateLimit";
import type {
  DocentChatMessage,
  DocentStage,
  DocentStreamEvent,
  DocentTimings,
} from "@/types/docent";

// knowledge/*.md 와 임베딩 아티팩트를 fs로 읽으므로 Node 런타임 필수.
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
  hybrid: HybridRetrieval;
  pageContextMs: number;
  retrievalMs: number;
  startedAt: number;
}

/**
 * 검색. 직전 대화(어시스턴트 답 포함)는 "무엇을 가리키는지" 를 푸는 데만 쓴다 — 근거 블록에는
 * 코퍼스 조각만 들어간다. 임베딩 API 가 실패하면 retrieveForChat 이 BM25 로 내려간다.
 */
async function ground(parsed: Parsed, startedAt: number): Promise<Grounded> {
  const { context: page } = validatePageContext(parsed.pageContext);
  const pageContextMs = performance.now() - startedAt;

  const question = parsed.messages[parsed.messages.length - 1].content;
  const history = parsed.messages.slice(0, -1).map(({ role, content }) => ({ role, content }));

  const t1 = performance.now();
  const hybrid = await retrieveForChat(question, page, history, { topK: 8 });
  const retrievalMs = performance.now() - t1;
  return { page, retrieval: hybrid.retrieval, hybrid, pageContextMs, retrievalMs, startedAt };
}

function sourcesEvent(g: Grounded): DocentStreamEvent {
  const sources = toSourceDescriptors(g.retrieval.results).filter((s) => !leaksInternalPath(`${s.title} ${s.sourceId}`));
  return { type: "sources", grounded: g.retrieval.supported, activeProject: g.retrieval.activeProject, sources };
}

function timings(
  g: Grounded,
  llm: { ttfb: number | null; total: number | null },
  failureStage: DocentStage | null = null,
): DocentTimings {
  const r = (x: number | null) => (x === null ? null : Math.round(x * 10) / 10);
  const context = r(g.pageContextMs) as number;
  const retrieval = r(g.retrievalMs) as number;
  const llmTotal = r(llm.total);
  return {
    pageContextMs: context,
    retrievalMs: retrieval,
    llmTtfbMs: r(llm.ttfb),
    llmTotalMs: llmTotal,
    chatTotalMs: r(performance.now() - g.startedAt) as number,
    stages: {
      context,
      retrieval,
      llm: llmTotal,
      voice_warm: null,
      tts: null,
      network: null,
      unknown: null,
    },
    failureStage,
    retrieval: {
      hybridMode: g.hybrid.hybridMode,
      queryEmbeddingMs: g.hybrid.queryEmbeddingMs,
      bm25Ms: g.retrieval.timings.bm25Ms,
      denseSearchMs: g.retrieval.timings.denseSearchMs,
      fusionMs: g.retrieval.timings.fusionMs,
      retrievalTotalMs: g.hybrid.retrievalTotalMs,
    },
  };
}

function logChat(g: Grounded, mode: string, extra: Record<string, unknown>) {
  const entitiesUsed = [...new Set(
    g.retrieval.results.map((item) => item.chunk.entityId).filter(Boolean),
  )];
  // 질문 본문·근거 본문·경로·근거에 없던 질문 어절은 남기지 않는다(어절은 질문의 일부다).
  console.info("[chat]", JSON.stringify({
    mode,
    hybrid_mode: g.hybrid.hybridMode,
    fallback_reason: g.hybrid.fallbackReason,
    scope: g.retrieval.scope,
    support: g.retrieval.support,
    uncovered_words: g.retrieval.coverage.uncovered.length,
    entities_used: entitiesUsed,
    pageType: g.page?.pageType ?? null,
    pageProject: g.page?.projectSlug ?? null,
    activeProject: g.retrieval.activeProject,
    contextProject: g.retrieval.contextProject,
    comparisonEntities: g.retrieval.conversation.comparisonEntities,
    explicitProjects: g.retrieval.explicitProjects,
    supported: g.retrieval.supported,
    topChunk: g.retrieval.results[0]?.chunk.id ?? null,
    lexicalTop: g.retrieval.relevance.lexicalTop,
    denseTop: g.retrieval.relevance.denseTop,
    pageContextMs: Math.round(g.pageContextMs * 10) / 10,
    queryEmbeddingMs: g.hybrid.queryEmbeddingMs,
    bm25Ms: g.retrieval.timings.bm25Ms,
    denseSearchMs: g.retrieval.timings.denseSearchMs,
    fusionMs: g.retrieval.timings.fusionMs,
    retrievalMs: Math.round(g.retrievalMs * 10) / 10,
    ...extra,
  }));
}

/** LLM 없는 경로: 근거 발췌 → 캔드 → 근거 부족. */
function evidenceResponse(parsed: Parsed): Response {
  const startedAt = performance.now();
  const question = parsed.messages[parsed.messages.length - 1].content;
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (e: DocentStreamEvent) => controller.enqueue(encoder.encode(line(e)));
      const g = await ground(parsed, startedAt);
      const { emotion, answer, kind } = answerFromEvidence(question, g.page, g.retrieval);
      const mode = kind === "evidence" || kind === "partial" ? "evidence" : "fallback";
      send({ type: "stage", stage: "context", status: "complete", elapsedMs: g.pageContextMs });
      send({ type: "stage", stage: "retrieval", status: "complete", elapsedMs: g.retrievalMs });
      send({ type: "meta", emotion, mode, provider: "none" });
      send(sourcesEvent(g));
      enqueueChunkedAnswer(send, answer);
      const t = timings(g, { ttfb: null, total: null });
      send({ type: "done", timings: t });
      controller.close();
      logChat(g, mode, { answerKind: kind, visible_answer_chars: answer.length, chatTotalMs: t.chatTotalMs });
    },
  });
  return new Response(stream, { headers: NDJSON_HEADERS });
}

/** 메타(감정) 이벤트 전에 붙잡아 두는 최대 글자 수. 감정 태그 없이 이만큼 오면 neutral 로 시작한다. */
const META_HOLD_CHARS = 64;

/**
 * 라이브: 검색 근거를 시스템 프롬프트에 싣고 LLM 스트리밍. 모델 출력은 VisibleAnswerStream
 * (ProtocolStreamParser)을 거친다 — 감정 태그는 위치(처음·중간·끝)와 델타 경계에 상관없이 메타데이터로만 쓰이고 글로는
 * 나가지 않는다.
 */
function liveResponse(parsed: Parsed): Response {
  const provider = getLlmProvider();
  if (!provider) return evidenceResponse(parsed);

  const startedAt = performance.now();
  const question = parsed.messages[parsed.messages.length - 1].content;
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: DocentStreamEvent) => controller.enqueue(encoder.encode(line(event)));
      send({ type: "stage", stage: "retrieval", status: "started" });
      const g = await ground(parsed, startedAt);
      send({ type: "stage", stage: "context", status: "complete", elapsedMs: g.pageContextMs });
      send({ type: "stage", stage: "retrieval", status: "complete", elapsedMs: g.retrievalMs });
      send(sourcesEvent(g));

      let firstTokenAt: number | null = null;
      const llmStart = performance.now();
      const answer = new VisibleAnswerStream(
        (emotion) => send({ type: "meta", emotion, mode: "live", provider: provider.name }),
        (text) => send({ type: "delta", text }),
        META_HOLD_CHARS,
      );

      try {
        send({ type: "stage", stage: "llm", status: "started" });
        const system = buildGroundedSystemPrompt(g.page, g.retrieval);
        for await (const text of provider.stream({ system, messages: parsed.messages, maxTokens: docentConfig.maxTokens })) {
          if (firstTokenAt === null) firstTokenAt = performance.now();
          answer.push(text);
        }
        answer.end();
        if (!answer.text.trim()) {
          // 모델이 태그만 냈다 — 빈 말풍선 대신 근거 발췌로 채운다.
          answer.emit(answerFromEvidence(question, g.page, g.retrieval).answer);
        }
        const t = timings(g, { ttfb: firstTokenAt === null ? null : firstTokenAt - llmStart, total: performance.now() - llmStart });
        send({ type: "stage", stage: "llm", status: "complete", elapsedMs: t.llmTotalMs ?? undefined });
        send({ type: "done", timings: t });
        logChat(g, "live", { provider: provider.name, model: provider.model, visible_answer_chars: answer.text.length, llmTtfbMs: t.llmTtfbMs, llmTotalMs: t.llmTotalMs, chatTotalMs: t.chatTotalMs });
      } catch (err) {
        if (!answer.started) {
          // 첫 글 전에 죽었다 — 아직 아무 말도 안 했으니 근거 발췌로 조용히 내려간다.
          const fallback = answerFromEvidence(question, g.page, g.retrieval);
          const mode = fallback.kind === "evidence" || fallback.kind === "partial" ? "evidence" : "fallback";
          send({ type: "meta", emotion: fallback.emotion, mode, provider: "none" });
          enqueueChunkedAnswer(send, fallback.answer);
          const t = timings(g, { ttfb: null, total: performance.now() - llmStart });
          send({ type: "done", timings: t });
          logChat(g, mode, { providerFailed: provider.name, rateLimited: provider.isRateLimit(err), error: err instanceof Error ? err.name : "unknown", visible_answer_chars: fallback.answer.length, chatTotalMs: t.chatTotalMs });
        } else {
          // 스트리밍 시작 후에는 상태코드를 바꿀 수 없으므로 error 이벤트로 전달.
          const message = provider.isRateLimit(err)
            ? "지금 질문이 많아요. 잠시 후 다시 시도해 주세요."
            : "답변 생성 중 문제가 생겼어요.";
          send({ type: "error", message, failureStage: "llm" });
          logChat(g, "live", { providerFailed: provider.name, midStream: true, error: err instanceof Error ? err.name : "unknown", visible_answer_chars: answer.text.length });
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
      { error: "요청이 너무 잦아요. 잠시 후 다시 시도해 주세요.", failure_stage: "network" },
      { status: 429, headers: { "Retry-After": String(rate.retryAfterSec ?? 30) } }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "잘못된 JSON입니다.", failure_stage: "context" }, { status: 400 });
  }

  const parsed = validate(body);
  if ("error" in parsed) {
    return Response.json({ error: parsed.error, failure_stage: "context" }, { status: 400 });
  }

  // 프로바이더 자격증명이 없으면 근거 발췌 모드 — 요청마다 체크하므로 키 추가만으로 라이브 전환.
  return liveResponse(parsed);
}
