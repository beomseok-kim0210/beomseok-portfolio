const WARM_RESULT_TTL_MS = 10_000;

let warmInFlight: Promise<boolean> | null = null;
let lastWarmResult: { ok: boolean; at: number } | null = null;

/**
 * 한 탭 안의 토글·질문·리렌더·라우트 전환이 같은 예열을 중복 제출하지 않게 한다.
 * 성공 결과는 짧게 기억하되, idle timeout 뒤의 새 질문은 다시 깨울 수 있게 유한하다.
 */
export function requestVoiceWarm(
  signal?: AbortSignal,
  fetcher: typeof fetch = fetch,
  now: () => number = Date.now,
): Promise<boolean> {
  if (warmInFlight) return warmInFlight;
  if (lastWarmResult?.ok && now() - lastWarmResult.at < WARM_RESULT_TTL_MS) {
    return Promise.resolve(true);
  }

  const request = (async () => {
    try {
      const response = await fetcher("/api/docent/voice/warm", {
        method: "POST",
        signal,
      });
      const ok = response.ok;
      if (ok) lastWarmResult = { ok: true, at: now() };
      return ok;
    } catch {
      return false;
    }
  })();

  warmInFlight = request;
  void request.finally(() => {
    if (warmInFlight === request) warmInFlight = null;
  });
  return request;
}

/** 테스트가 모듈 전역 경계를 서로 오염시키지 않게 하는 전용 초기화. */
export function resetVoiceWarmClientForTests(): void {
  warmInFlight = null;
  lastWarmResult = null;
}
