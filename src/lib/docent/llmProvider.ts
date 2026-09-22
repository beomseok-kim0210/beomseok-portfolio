/**
 * LLM 프로바이더 추상화.
 *
 * 채팅 라우트는 "텍스트 델타를 흘려주는 무언가" 만 안다. 자격증명이 없으면 프로바이더는
 * null 이다 — 그때 라우트는 근거 발췌 폴백으로 내려간다.
 *
 * 선택 순서: OPENAI_API_KEY → ANTHROPIC_API_KEY → null. Human 결정(2026-09-22): DD 답변은
 * GPT 로 한다. Anthropic 경로는 기존 배포 호환을 위해 남겨 둔다.
 * 키는 각 SDK 가 환경에서 직접 읽는다. 이 모듈은 값을 만지지 않는다.
 */
import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";
import type { DocentChatMessage } from "@/types/docent";

export type LlmProviderName = "openai" | "anthropic";

export interface LlmStreamRequest {
  system: string;
  messages: DocentChatMessage[];
  maxTokens: number;
}

export interface LlmProvider {
  readonly name: LlmProviderName;
  readonly model: string;
  /** 텍스트 델타 스트림. 첫 델타 전에 실패하면 throw — 라우트가 폴백한다. */
  stream(req: LlmStreamRequest): AsyncIterable<string>;
  /** 호출 제한(429)인지 — 사용자에게 다르게 말한다. */
  isRateLimit(err: unknown): boolean;
}

const DEFAULT_MODEL: Record<LlmProviderName, string> = {
  // gpt-5.6 계열 중 가장 작은 모델 (Human 결정 2026-09-22). $0.20/$1.20 per 1M.
  // 품질이 부족하면 DOCENT_MODEL 로 gpt-5.6-terra($2/$12) / gpt-5.6($4/$20) 으로 올릴 수 있다.
  // (developers.openai.com/api/docs/models, 2026-09-22 확인)
  openai: "gpt-5.6-luna",
  anthropic: "claude-haiku-4-5",
};

// gpt-5.6 계열은 minimal 을 받지 않는다 — 넣으면 매 요청이 실패해 조용히 폴백된다. 그래서 목록에서 뺀다.
const REASONING_EFFORTS = ["none", "low", "medium", "high", "xhigh", "max"] as const;
export type ReasoningEffort = (typeof REASONING_EFFORTS)[number];
const DEFAULT_REASONING_EFFORT: ReasoningEffort = "medium";

type Env = Record<string, string | undefined>;

/** DOCENT_MODEL 이 있으면 그것, 없으면 프로바이더 기본값. 다른 프로바이더용 이름이면 무시한다. */
export function resolveModel(provider: LlmProviderName, env: Env = process.env): string {
  const requested = env.DOCENT_MODEL?.trim();
  if (!requested) return DEFAULT_MODEL[provider];
  const looksAnthropic = requested.startsWith("claude-");
  if (provider === "openai" && looksAnthropic) return DEFAULT_MODEL.openai;
  if (provider === "anthropic" && !looksAnthropic) return DEFAULT_MODEL.anthropic;
  return requested;
}

/** DOCENT_REASONING_EFFORT 가 유효한 값이면 그것, 아니면 medium. */
export function resolveReasoningEffort(env: Env = process.env): ReasoningEffort {
  const requested = env.DOCENT_REASONING_EFFORT?.trim();
  return (REASONING_EFFORTS as readonly string[]).includes(requested ?? "")
    ? (requested as ReasoningEffort)
    : DEFAULT_REASONING_EFFORT;
}

/** Responses API 스트림 이벤트에서 텍스트 델타만 뽑는다. 그 외 이벤트는 null. */
export function openAiTextDelta(event: { type: string; delta?: unknown }): string | null {
  if (event.type !== "response.output_text.delta") return null;
  return typeof event.delta === "string" ? event.delta : null;
}

/**
 * 스트림이 정상 종료가 아닌 방식으로 끝났다. name 에 사유를 실어 라우트 로그(err.name)에 남긴다.
 * 사유는 고정 문자열이거나 API 가 준 코드라서 자격증명이 섞일 여지가 없다.
 */
export class OpenAiStreamError extends Error {
  readonly code: string | null;
  constructor(reason: string, code: string | null = null, message?: string) {
    super(message ?? reason);
    this.name = `OpenAiStreamError:${reason}`;
    this.code = code;
  }
}

/** 최소한의 Responses API 스트림 이벤트 형태. SDK 타입에 의존하지 않아 테스트에서 가짜를 넣을 수 있다. */
export interface OpenAiStreamEvent {
  type: string;
  delta?: unknown;
  code?: string | null;
  message?: string;
  response?: {
    error?: { code?: string | null; message?: string } | null;
    incomplete_details?: { reason?: string | null } | null;
  };
}

/**
 * Responses API 이벤트 → 텍스트 델타. 라우트 계약: 첫 델타 전에 throw 하면 근거 발췌로 폴백하고,
 * 그 뒤에 throw 하면 error 이벤트로 알린다. 그래서 "빈 답변을 done 으로 끝내는" 경우는 없어야 한다.
 *  - `error` / `response.failed` → throw
 *  - `response.refusal.*` → 답변으로 내보내지 않고 throw (근거 발췌가 더 낫다)
 *  - `response.incomplete` → throw. 단 이미 텍스트를 냈고 사유가 max_output_tokens 면 부분 답변으로 마친다
 *    (이미 흘려보낸 문장을 되돌릴 수 없고, 잘린 것이지 틀린 것은 아니다)
 *  - `response.completed` 없이 끝나면 throw
 */
export async function* consumeOpenAiStream(events: AsyncIterable<OpenAiStreamEvent>): AsyncIterable<string> {
  let completed = false;
  let yielded = false;
  for await (const event of events) {
    const delta = openAiTextDelta(event);
    if (delta !== null) {
      yielded = true;
      yield delta;
      continue;
    }
    switch (event.type) {
      case "response.completed":
        completed = true;
        break;
      case "error":
        throw new OpenAiStreamError("error", event.code ?? null, event.message);
      case "response.failed":
        throw new OpenAiStreamError("failed", event.response?.error?.code ?? null, event.response?.error?.message);
      case "response.refusal.delta":
      case "response.refusal.done":
        throw new OpenAiStreamError("refusal");
      case "response.incomplete": {
        const reason = event.response?.incomplete_details?.reason ?? "unknown";
        if (yielded && reason === "max_output_tokens") {
          completed = true;
          break;
        }
        throw new OpenAiStreamError(`incomplete:${reason}`);
      }
      default:
        break;
    }
    if (completed) break;
  }
  if (!completed) throw new OpenAiStreamError("no_completion");
}

const RATE_LIMIT_PATTERN = /rate_limit/i;

class OpenAIProvider implements LlmProvider {
  readonly name = "openai" as const;
  readonly model: string;
  readonly reasoningEffort: ReasoningEffort;
  private readonly client: OpenAI;

  constructor(model: string, reasoningEffort: ReasoningEffort) {
    this.model = model;
    this.reasoningEffort = reasoningEffort;
    this.client = new OpenAI();
  }

  async *stream(req: LlmStreamRequest): AsyncIterable<string> {
    const s = await this.client.responses.create({
      model: this.model,
      instructions: req.system,
      input: req.messages.map((m) => ({ role: m.role, content: m.content })),
      max_output_tokens: req.maxTokens,
      reasoning: { effort: this.reasoningEffort },
      stream: true,
    });
    yield* consumeOpenAiStream(s);
  }

  isRateLimit(err: unknown): boolean {
    if (err instanceof OpenAI.RateLimitError) return true;
    // SSE 도중의 오류는 SDK 가 일반 APIError 로 만든다 — status/code/type 으로도 본다.
    if (err instanceof OpenAI.APIError) {
      return err.status === 429 || RATE_LIMIT_PATTERN.test(err.code ?? "") || RATE_LIMIT_PATTERN.test(err.type ?? "");
    }
    if (err instanceof OpenAiStreamError) return RATE_LIMIT_PATTERN.test(err.code ?? "");
    return false;
  }
}

class AnthropicProvider implements LlmProvider {
  readonly name = "anthropic" as const;
  readonly model: string;
  private readonly client: Anthropic;

  constructor(model: string) {
    this.model = model;
    this.client = new Anthropic();
  }

  async *stream(req: LlmStreamRequest): AsyncIterable<string> {
    const s = this.client.messages.stream({
      model: this.model,
      max_tokens: req.maxTokens,
      system: req.system,
      messages: req.messages,
    });
    for await (const event of s) {
      if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
        yield event.delta.text;
      }
    }
  }

  isRateLimit(err: unknown): boolean {
    return err instanceof Anthropic.RateLimitError;
  }
}

/** 어느 프로바이더가 설정돼 있는지. 값은 보지 않고 존재만 본다. */
export function configuredProviderName(env: Env = process.env): LlmProviderName | null {
  if (env.OPENAI_API_KEY) return "openai";
  if (env.ANTHROPIC_API_KEY) return "anthropic";
  return null;
}

/** 설정된 프로바이더가 있으면 그것, 없으면 null. 요청마다 확인하므로 키만 추가하면 켜진다. */
export function getLlmProvider(): LlmProvider | null {
  const name = configuredProviderName();
  if (name === "openai") return new OpenAIProvider(resolveModel("openai"), resolveReasoningEffort());
  if (name === "anthropic") return new AnthropicProvider(resolveModel("anthropic"));
  return null;
}

/** 상태 표시용. 값은 절대 내보내지 않는다. */
export function describeLlmProvider(): { provider: LlmProviderName | "none"; configured: boolean; model: string | null } {
  const name = configuredProviderName();
  if (!name) return { provider: "none", configured: false, model: null };
  return { provider: name, configured: true, model: resolveModel(name) };
}
