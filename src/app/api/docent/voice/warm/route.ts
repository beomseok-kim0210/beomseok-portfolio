import { checkRateLimit } from "@/lib/docent/rateLimit";
import { VoiceProviderUnavailable, getVoiceProvider } from "@/lib/docent/voiceProvider";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** 레이트리밋 키는 음성 라우트와 같은 규칙을 쓴다 — 예열도 GPU 를 쓰는 행위다. */
function clientKey(headers: Headers): string {
  const forwarded = headers.get("x-forwarded-for");
  return forwarded ? forwarded.split(",")[0]!.trim() : "unknown";
}

/**
 * 워커 예열.
 *
 * scale-to-zero 엔드포인트의 콜드 스타트는 대부분 우리 코드 밖에 있다(측정: 전체 84 초
 * 중 컨테이너 내부 준비는 7 초, 나머지는 GPU 배정 + 기동). 그래서 합성 시점에 줄일 수
 * 있는 것이 없고, **합성보다 앞선 신호**에 기동을 걸어 타이핑·답변 생성 시간과 겹치게
 * 하는 것이 유일한 방법이다. 클라이언트는 사용자가 음성을 켤 때와 질문을 보낼 때 부른다.
 *
 * 돈이 드는 경로는 워커가 하나도 없을 때뿐이다 — 공짜인 `/health` 로 먼저 확인하고,
 * 떠 있으면 아무것도 하지 않는다. 그래서 여러 번 불려도 비용이 누적되지 않는다.
 *
 * 항상 202 로 답한다. 예열은 최선 노력이고 실패가 사용자에게 보일 오류가 아니다 —
 * 실패하면 실제 요청이 평소대로 콜드를 겪을 뿐이다.
 */
export async function POST(request: Request) {
  const limit = checkRateLimit(clientKey(request.headers));
  if (!limit.ok) {
    return Response.json(
      { outcome: "rate-limited", retryAfterSec: limit.retryAfterSec },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSec ?? 60) } },
    );
  }

  try {
    const outcome = await getVoiceProvider().warm();
    return Response.json({ outcome }, { status: 202 });
  } catch (err) {
    // 설정이 없는 것은 고장이 아니다 — 브라우저 TTS 로 갈 뿐이다.
    const outcome = err instanceof VoiceProviderUnavailable ? "unconfigured" : "unavailable";
    return Response.json({ outcome }, { status: 202 });
  }
}
