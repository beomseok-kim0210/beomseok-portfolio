/**
 * LLM 프로바이더 추상화.
 *
 * 채팅 라우트는 "텍스트 델타를 흘려주는 무언가" 만 안다. 지금 구현은 이미 의존성에 있는
 * Anthropic SDK 하나이고, 자격증명(ANTHROPIC_API_KEY)이 없으면 프로바이더는 null 이다 —
 * 그때 라우트는 근거 발췌 폴백으로 내려간다. 새 유료 프로바이더를 여기서 만들지 않는다.
 * 키는 SDK 가 환경에서 직접 읽는다. 이 모듈은 값을 만지지 않는다.
 */
import Anthropic from "@anthropic-ai/sdk";
import { docentConfig } from "@/data/docent";
import type { DocentChatMessage } from "@/types/docent";

export interface LlmStreamRequest {
  system: string;
  messages: DocentChatMessage[];
  maxTokens: number;
}

export interface LlmProvider {
  readonly name: "anthropic";
  readonly model: string;
  /** 텍스트 델타 스트림. 첫 델타 전에 실패하면 throw — 라우트가 폴백한다. */
  stream(req: LlmStreamRequest): AsyncIterable<string>;
  /** 호출 제한(429)인지 — 사용자에게 다르게 말한다. */
  isRateLimit(err: unknown): boolean;
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

/** 설정된 프로바이더가 있으면 그것, 없으면 null. 요청마다 확인하므로 키만 추가하면 켜진다. */
export function getLlmProvider(): LlmProvider | null {
  if (!process.env.ANTHROPIC_API_KEY) return null;
  return new AnthropicProvider(docentConfig.model);
}

/** 상태 표시용. 값은 절대 내보내지 않는다. */
export function describeLlmProvider(): { provider: "anthropic" | "none"; configured: boolean; model: string | null } {
  const configured = Boolean(process.env.ANTHROPIC_API_KEY);
  return { provider: configured ? "anthropic" : "none", configured, model: configured ? docentConfig.model : null };
}
