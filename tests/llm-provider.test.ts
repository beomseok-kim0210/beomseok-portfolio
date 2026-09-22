// LLM 프로바이더 선택·모델/effort 해석·OpenAI 스트림 델타 추출.
// 실제 API 는 부르지 않는다 — 키 존재 여부와 순수 함수만 본다.
import assert from "node:assert/strict";
import { test } from "node:test";

import {
  OpenAiStreamError,
  configuredProviderName,
  consumeOpenAiStream,
  describeLlmProvider,
  getLlmProvider,
  openAiTextDelta,
  resolveModel,
  resolveReasoningEffort,
  type OpenAiStreamEvent,
} from "@/lib/docent/llmProvider";

async function* fromArray(events: OpenAiStreamEvent[]): AsyncIterable<OpenAiStreamEvent> {
  for (const e of events) yield e;
}

async function collect(events: OpenAiStreamEvent[]): Promise<{ text: string; error: unknown }> {
  let text = "";
  try {
    for await (const d of consumeOpenAiStream(fromArray(events))) text += d;
    return { text, error: null };
  } catch (error) {
    return { text, error };
  }
}

const delta = (d: string): OpenAiStreamEvent => ({ type: "response.output_text.delta", delta: d });
const COMPLETED: OpenAiStreamEvent = { type: "response.completed" };

function withEnv<T>(vars: Record<string, string | undefined>, fn: () => T): T {
  const saved: Record<string, string | undefined> = {};
  for (const k of Object.keys(vars)) {
    saved[k] = process.env[k];
    if (vars[k] === undefined) delete process.env[k];
    else process.env[k] = vars[k];
  }
  try {
    return fn();
  } finally {
    for (const k of Object.keys(vars)) {
      if (saved[k] === undefined) delete process.env[k];
      else process.env[k] = saved[k];
    }
  }
}

const NO_KEYS = { OPENAI_API_KEY: undefined, ANTHROPIC_API_KEY: undefined, DOCENT_MODEL: undefined, DOCENT_REASONING_EFFORT: undefined };

test("키가 없으면 프로바이더는 none 이고 라우트는 폴백한다", () => {
  withEnv(NO_KEYS, () => {
    assert.equal(configuredProviderName(), null);
    assert.equal(getLlmProvider(), null);
    assert.deepEqual(describeLlmProvider(), { provider: "none", configured: false, model: null });
  });
});

test("OPENAI_API_KEY 가 있으면 OpenAI 가 우선하고 기본 모델은 gpt-5.6-luna 이다", () => {
  withEnv({ ...NO_KEYS, OPENAI_API_KEY: "test-key-not-real", ANTHROPIC_API_KEY: "also-not-real" }, () => {
    assert.equal(configuredProviderName(), "openai");
    const p = getLlmProvider();
    assert.ok(p);
    assert.equal(p.name, "openai");
    assert.equal(p.model, "gpt-5.6-luna");
    assert.deepEqual(describeLlmProvider(), { provider: "openai", configured: true, model: "gpt-5.6-luna" });
  });
});

test("ANTHROPIC_API_KEY 만 있으면 Anthropic 으로 내려간다", () => {
  withEnv({ ...NO_KEYS, ANTHROPIC_API_KEY: "test-key-not-real" }, () => {
    assert.equal(configuredProviderName(), "anthropic");
    assert.equal(getLlmProvider()?.model, "claude-haiku-4-5");
  });
});

test("DOCENT_MODEL 은 같은 프로바이더 이름일 때만 쓰고, 엇갈리면 기본값이다", () => {
  assert.equal(resolveModel("openai", { DOCENT_MODEL: "gpt-5.6-terra" }), "gpt-5.6-terra");
  assert.equal(resolveModel("openai", { DOCENT_MODEL: "claude-opus-5" }), "gpt-5.6-luna");
  assert.equal(resolveModel("anthropic", { DOCENT_MODEL: "claude-opus-5" }), "claude-opus-5");
  assert.equal(resolveModel("anthropic", { DOCENT_MODEL: "gpt-5.6" }), "claude-haiku-4-5");
  assert.equal(resolveModel("openai", { DOCENT_MODEL: "   " }), "gpt-5.6-luna");
});

test("reasoning effort 는 허용값만 받고 기본은 medium 이다", () => {
  assert.equal(resolveReasoningEffort({}), "medium");
  assert.equal(resolveReasoningEffort({ DOCENT_REASONING_EFFORT: "low" }), "low");
  assert.equal(resolveReasoningEffort({ DOCENT_REASONING_EFFORT: "xhigh" }), "xhigh");
  assert.equal(resolveReasoningEffort({ DOCENT_REASONING_EFFORT: "turbo" }), "medium");
  // gpt-5.6 (sol) 이 거부하는 값 — 받아들이면 매 요청이 조용히 폴백된다
  assert.equal(resolveReasoningEffort({ DOCENT_REASONING_EFFORT: "minimal" }), "medium");
});

test("정상 스트림: 델타를 순서대로 내고 completed 에서 끝난다 (감정 태그가 쪼개져 와도 그대로 전달)", async () => {
  const r = await collect([
    { type: "response.created" },
    delta("<emo"),
    delta("tion>smile</emotion>안녕"),
    delta("하세요"),
    { type: "response.output_text.done" },
    COMPLETED,
  ]);
  assert.equal(r.error, null);
  assert.equal(r.text, "<emotion>smile</emotion>안녕하세요");
});

test("첫 델타 전 실패(error / failed / refusal)는 throw 해서 라우트가 근거 발췌로 폴백하게 한다", async () => {
  const cases: [OpenAiStreamEvent, string][] = [
    [{ type: "error", code: "server_error", message: "boom" }, "OpenAiStreamError:error"],
    [{ type: "response.failed", response: { error: { code: "invalid_prompt", message: "x" } } }, "OpenAiStreamError:failed"],
    [{ type: "response.refusal.delta", delta: "I can't" }, "OpenAiStreamError:refusal"],
    [{ type: "response.incomplete", response: { incomplete_details: { reason: "content_filter" } } }, "OpenAiStreamError:incomplete:content_filter"],
  ];
  for (const [event, name] of cases) {
    const r = await collect([{ type: "response.created" }, event]);
    assert.equal(r.text, "", name);
    assert.ok(r.error instanceof OpenAiStreamError, name);
    assert.equal((r.error as Error).name, name);
  }
});

test("completed 없이 스트림이 끝나면 빈/잘린 답변을 done 으로 보내지 않고 throw 한다", async () => {
  const empty = await collect([{ type: "response.created" }]);
  assert.equal((empty.error as Error)?.name, "OpenAiStreamError:no_completion");
  const cut = await collect([delta("절반만")]);
  assert.equal(cut.text, "절반만");
  assert.equal((cut.error as Error)?.name, "OpenAiStreamError:no_completion");
});

test("텍스트를 낸 뒤 max_output_tokens 로 잘린 것은 부분 답변으로 마치고, 그 외 incomplete 는 throw 한다", async () => {
  const truncated = await collect([delta("긴 답변"), { type: "response.incomplete", response: { incomplete_details: { reason: "max_output_tokens" } } }]);
  assert.equal(truncated.error, null);
  assert.equal(truncated.text, "긴 답변");
  const filtered = await collect([delta("긴 답변"), { type: "response.incomplete", response: { incomplete_details: { reason: "content_filter" } } }]);
  assert.equal((filtered.error as Error)?.name, "OpenAiStreamError:incomplete:content_filter");
});

test("스트림 도중의 rate limit 코드는 isRateLimit 이 알아본다", () => {
  withEnv({ ...NO_KEYS, OPENAI_API_KEY: "test-key-not-real" }, () => {
    const p = getLlmProvider();
    assert.ok(p);
    assert.equal(p.isRateLimit(new OpenAiStreamError("error", "rate_limit_exceeded")), true);
    assert.equal(p.isRateLimit(new OpenAiStreamError("error", "server_error")), false);
    assert.equal(p.isRateLimit(new Error("plain")), false);
  });
});

test("OpenAI 스트림에서는 output_text.delta 의 문자열만 텍스트로 본다", () => {
  assert.equal(openAiTextDelta({ type: "response.output_text.delta", delta: "안녕" }), "안녕");
  assert.equal(openAiTextDelta({ type: "response.output_text.delta", delta: 42 }), null);
  assert.equal(openAiTextDelta({ type: "response.reasoning_summary_text.delta", delta: "x" }), null);
  assert.equal(openAiTextDelta({ type: "response.completed" }), null);
});
