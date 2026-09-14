import { describeVoiceBackend } from "@/lib/docent/voiceProvider";
import { voiceBackendHealth } from "@/lib/docent/voiceWorkers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * 음성 런타임의 준비 상태.
 *
 * 워커를 깨우지 않는다. 헬스체크가 모델 로드를 유발하면 그 자체가 부하가 되고,
 * "준비됐나?" 라는 질문이 "준비시켜라" 로 바뀐다. 아직 아무도 말하지 않았다면
 * 정직하게 `idle` 이라고 답한다.
 *
 * 경로·GPU 식별자·환경변수 값·스택트레이스는 내보내지 않는다. 상세 진단은
 * 서버 로그에 남는다.
 *
 * 원격 백엔드(RunPod)는 설정 유무만 답한다. 워커 상태는 이 프로세스가 알 수 없고,
 * 알아보러 가는 것은 곧 깨우는 것이다 — scale-to-zero 엔드포인트는 첫 요청이
 * 워커를 띄운다.
 */
export async function GET() {
  const backend = describeVoiceBackend();
  if (!backend.configured) {
    return Response.json(
      { status: "unconfigured", provider: backend.backend,
        supertonic: "unconfigured", lam: "unconfigured", fallback: "browser_tts" },
      { status: 503 },
    );
  }
  if (backend.backend === "runpod") {
    return Response.json({ status: "configured", provider: "runpod",
      supertonic: "remote", lam: "remote", fallback: "browser_tts" });
  }

  const health = voiceBackendHealth();
  if (!health) {
    // 설정은 있으나 아직 아무 요청도 없었다. 첫 요청이 워커를 띄운다.
    return Response.json({ status: "idle", supertonic: "idle", lam: "idle" });
  }

  const both = [health.supertonic, health.lam];
  const status = both.every((w) => w.state === "READY" || w.state === "BUSY")
    ? "ready"
    : both.some((w) => w.state === "FAILED")
      ? "degraded"
      : "starting";

  const view = (w: (typeof both)[number]) => ({
    state: w.state,
    restarts: w.restarts,
    pending: w.pending,
    modelLoadMs: w.modelLoadMs,
    warmupMs: w.warmupMs,
    readyAt: w.readyAt,
    // READY 라는 상태값보다 "마지막으로 실제 답을 준 시각" 이 살아 있음의 증거다.
    // 무응답으로 굳은 워커도 상태만으로는 READY 로 보일 수 있다.
    lastRepliedAt: w.lastRepliedAt,
    lastFailureStage: w.lastFailureStage,
    lastFailureAt: w.lastFailureAt,
  });

  return Response.json(
    { status, supertonic: view(health.supertonic), lam: view(health.lam) },
    { status: status === "degraded" ? 503 : 200 },
  );
}
