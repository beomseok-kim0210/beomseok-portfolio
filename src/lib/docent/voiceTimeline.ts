import type { LamMouthChannels } from "./lamMouthFusion";

/**
 * 오디오 재생 시계에서 LAM 타임라인을 읽는 순수 함수들.
 *
 * 렌더러에서 떼어 놓은 이유는 단순하다: 여기가 동기화의 정의이고, 브라우저 없이
 * 검증할 수 있어야 한다.
 */

export interface VoiceTimelineFrame extends LamMouthChannels {
  t: number;
}

/** 워커 버전에 따라 없을 수 있는 채널. 두 프레임 모두에 있을 때만 보간한다. */
const lerpOptional = (a: number | undefined, b: number | undefined, f: number) =>
  typeof a === "number" && typeof b === "number" ? a + (b - a) * f : undefined;

/** LAM 프레임 간격. 모델이 30 fps 로 뱉으므로 한 프레임은 33.33 ms 다. */
export const LAM_FPS = 30;
export const LAM_FRAME_STEP_SECONDS = 1 / LAM_FPS;

/**
 * 재생 위치 t(초)에서의 원시 채널. 두 프레임 사이는 선형 보간한다.
 *
 * 타임라인 끝을 지나면 null 을 준다 — 오디오가 남아 있어도 얼굴은 중립이어야지,
 * 마지막 프레임에서 굳어 있으면 안 된다.
 */
export function sampleTimeline(
  frames: VoiceTimelineFrame[],
  fps: number,
  t: number,
  gateAdvanceSeconds = 0,
): LamMouthChannels | null {
  const out = sampleAt(frames, fps, t);
  if (!out || gateAdvanceSeconds === 0) return out;
  const present = ALIGNED_CHANNELS.filter((k) => out[k] !== undefined);
  if (present.length === 0) return out;
  // 텍스트 정렬에서 온 채널(양순음 게이트, 모음)만 앞의 시각에서 읽는다 — LAM 에 맞추는 상대 보정(MOUTH_TIMING).
  // LAM 채널은 그대로 t 다. 타임라인 밖이면 0 — 다음 세그먼트나 없는 프레임을 읽지 않는다.
  const ahead = t + gateAdvanceSeconds;
  const last = frames.length - 1;
  const x = ahead * fps;
  const next: LamMouthChannels = { ...out };
  for (const k of present) {
    let v = 0;
    if (x < last) {
      const i = Math.max(0, Math.floor(x));
      const f = Math.max(0, x - i);
      v = lerpOptional(frames[i][k], frames[i + 1][k], f) ?? 0;
    }
    next[k] = v;
  }
  return next;
}

/**
 * 입이 소리보다 먼저 가는 양(초). Phase 4D 사람 검토(입-소리 싱크 막대)로 고른 값이다.
 *
 * 모음 채널이 실린 경로(같은 합성의 자모 정렬 → 4D 조음)에서만 건다. 그 검토가 본 것이
 * 그 경로의 렌더 결과를 통째로 80 ms 앞당긴 것이기 때문이다. 오디오도, 재생 시계도,
 * LAM 추론도 건드리지 않는다 — 타임라인을 읽는 시각만 currentTime + 선행이다.
 * 정렬 채널 안쪽의 30 ms(게이트·모음을 LAM 에 맞추는 선행)와 60 ms(열림 채널의 감쇠
 * 보상)는 LAM 기준의 상대 보정이라 이것과 겹쳐 세지 않는다 — 4D 검토 영상이 그 둘을
 * 이미 포함한 상태였다. LAM 전용(정렬 없는) 경로는 0 이다: LAM 턱은 원래 소리보다
 * 앞서 있어서, 거기에 더하면 검토하지 않은 상태가 된다.
 */
export const MOUTH_AUDIO_LEAD_SECONDS = 0.08;

/** 이 세그먼트에 쓸 입 선행. 모음 채널(vowelOpen)이 실려 있을 때만 MOUTH_AUDIO_LEAD_SECONDS. */
export function mouthLeadSeconds(frames: readonly VoiceTimelineFrame[]): number {
  const v = frames[0]?.vowelOpen;
  return typeof v === "number" && Number.isFinite(v) ? MOUTH_AUDIO_LEAD_SECONDS : 0;
}

/** 텍스트(같은 합성의 자모 정렬)에서 온 채널. 선행 샘플링은 이것들에만 적용된다. */
const ALIGNED_CHANNELS = ["bilabialGate", "vowelSpread", "vowelRound", "vowelUnround", "vowelOpen"] as const;

function sampleAt(
  frames: VoiceTimelineFrame[],
  fps: number,
  t: number,
): LamMouthChannels | null {
  if (frames.length === 0) return null;
  const x = t * fps;
  if (x <= 0) return frames[0];
  const last = frames.length - 1;
  if (x >= last) return null;
  const i = Math.floor(x);
  const f = x - i;
  const a = frames[i];
  const b = frames[i + 1];
  return {
    jaw: a.jaw + (b.jaw - a.jaw) * f,
    round: a.round + (b.round - a.round) * f,
    stretch: a.stretch + (b.stretch - a.stretch) * f,
    upperLift: a.upperLift + (b.upperLift - a.upperLift) * f,
    close: lerpOptional(a.close, b.close, f),
    press: lerpOptional(a.press, b.press, f),
    roll: lerpOptional(a.roll, b.roll, f),
    funnel: lerpOptional(a.funnel, b.funnel, f),
    lowerDownLeft: lerpOptional(a.lowerDownLeft, b.lowerDownLeft, f),
    lowerDownRight: lerpOptional(a.lowerDownRight, b.lowerDownRight, f),
    bilabialGate: lerpOptional(a.bilabialGate, b.bilabialGate, f),
    vowelSpread: lerpOptional(a.vowelSpread, b.vowelSpread, f),
    vowelRound: lerpOptional(a.vowelRound, b.vowelRound, f),
    vowelUnround: lerpOptional(a.vowelUnround, b.vowelUnround, f),
    vowelOpen: lerpOptional(a.vowelOpen, b.vowelOpen, f),
  };
}

/**
 * 재생될 오디오와 LAM 이 읽은 오디오가 같은 생성물인지.
 *
 * 이 게이트의 중심 불변식이다. 세 지점에서 같은 해시가 나와야 "들은 소리 == 분석한
 * 소리" 라고 말할 수 있고, 하나라도 어긋나면 응답을 내보내면 안 된다.
 */
export function sameAudioSource(
  canonicalSha256: string,
  lamSourceSha256: string,
  responseSha256: string,
): boolean {
  return (
    canonicalSha256.length === 64 &&
    canonicalSha256 === lamSourceSha256 &&
    canonicalSha256 === responseSha256
  );
}

/**
 * 오디오 길이와 타임라인 길이의 허용 오차.
 *
 * 임의로 고른 값이 아니라 모델의 프레임 간격이다. LAM 은 30 fps 로 프레임을 내므로
 * 마지막 프레임 하나만큼은 언제나 길거나 짧을 수 있고, 그보다 큰 차이는 전처리나
 * 청크 분할이 어긋났다는 뜻이다.
 */
export function durationDeltaWithinFrameStep(
  audioSeconds: number,
  timelineSeconds: number,
): boolean {
  return Math.abs(timelineSeconds - audioSeconds) <= LAM_FRAME_STEP_SECONDS;
}
