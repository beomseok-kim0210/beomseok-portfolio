import { docentConfig } from "@/data/docent";

// 나이브 IP별 레이트리미터.
// 주의: Vercel 서버리스에서는 Lambda 인스턴스별로 Map이 분리되고 콜드스타트 시
// 리셋된다. 어디까지나 속도 제한용 완충 장치이며, 실질적인 비용 방어선은
// LLM 프로바이더 콘솔(OpenAI Billing / Anthropic Console)의 지출 상한이다.
//
// 버킷은 엔드포인트마다 따로다. 예전에는 채팅·음성·예열이 한 버킷(분당 10회)을 나눠
// 썼는데, 한 턴이 채팅 1 + 음성 N + 예열 1 을 쓰므로 음성을 세그먼트로 나누자 평범한
// 대화 세 턴이 429 에 걸렸다. 채팅의 한도는 그대로 두고, 음성과 예열을 떼어 낸다.
const MAX_TRACKED_IPS = 500;

export interface RateLimitResult {
  ok: boolean;
  retryAfterSec?: number;
}

export function createRateLimiter(
  limits: { readonly windowMs: number; readonly maxRequests: number },
): (key: string) => RateLimitResult {
  const hits = new Map<string, number[]>();
  return (key: string) => {
    const { windowMs, maxRequests } = limits;
    const now = Date.now();
    const windowStart = now - windowMs;

    const timestamps = (hits.get(key) ?? []).filter((t) => t > windowStart);

    if (timestamps.length >= maxRequests) {
      const oldest = timestamps[0];
      return { ok: false, retryAfterSec: Math.ceil((oldest + windowMs - now) / 1000) };
    }

    timestamps.push(now);
    hits.set(key, timestamps);

    if (hits.size > MAX_TRACKED_IPS) {
      const firstKey = hits.keys().next().value;
      if (firstKey !== undefined) hits.delete(firstKey);
    }

    return { ok: true };
  };
}

/** 채팅(LLM). 한도는 예전과 같다. */
export const checkRateLimit = createRateLimiter(docentConfig.rateLimit);
/** 음성 세그먼트 합성. 근거는 docentConfig.voiceRateLimit 주석. */
export const checkVoiceRateLimit = createRateLimiter(docentConfig.voiceRateLimit);
/** 워커 예열. */
export const checkWarmRateLimit = createRateLimiter(docentConfig.warmRateLimit);

export function clientIpFrom(headers: Headers): string {
  const forwarded = headers.get("x-forwarded-for");
  return forwarded?.split(",")[0]?.trim() || "unknown";
}
