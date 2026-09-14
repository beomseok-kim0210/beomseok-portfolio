import type { RawMouthChannels } from "./semanticMouth";

/**
 * 오디오 재생 시계에서 LAM 타임라인을 읽는 순수 함수들.
 *
 * 렌더러에서 떼어 놓은 이유는 단순하다: 여기가 동기화의 정의이고, 브라우저 없이
 * 검증할 수 있어야 한다.
 */

export interface VoiceTimelineFrame extends RawMouthChannels {
  t: number;
}

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
): RawMouthChannels | null {
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
