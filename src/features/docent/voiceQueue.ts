/**
 * 세그먼트 발화의 순서 있는 큐. React 도 오디오 엘리먼트도 모르는 순수 로직이다.
 *
 *   합성(0) ──▶ 재생(0) ─────────▶ 재생(1) ─────────▶ 재생(2)
 *               └ 합성(1) ┘          └ 합성(2) ┘
 *
 * - 합성 요청은 동시에 하나뿐이다. 세그먼트 N 이 **실제로 재생을 시작한 뒤에** N+1
 *   하나만 미리 합성한다(MAX_PREFETCH_AHEAD = 1). 답변 전체를 한꺼번에 GPU 로 던지지
 *   않는다 — 요청 폭주, 레이트리밋 폭주, 취소 난이도를 모두 피한다.
 *   재생 시작 *전에* 던지면 안 된다: 로컬 백엔드에서는 합성이 브라우저와 같은 CPU 를
 *   써서, play() 에서 실제 소리까지가 5~6 초로 늘어나는 것을 실측했다(2026-09-29).
 * - 재생은 엄격히 순서대로, 겹치지 않는다. N 이 끝나야 N+1 이 재생된다.
 * - N+1 이 아직 준비되지 않았으면 기다린다. 그 공백은 공백으로 남는다 — 다른 목소리로
 *   메우지 않는다.
 * - 한 세그먼트라도 실패하면 거기서 멈춘다. 남은 세그먼트는 합성하지도 재생하지도 않는다.
 * - signal 이 끊기면 진행 중인 합성과 재생을 버리고 조용히 끝난다.
 */

export const MAX_PREFETCH_AHEAD = 1;

export type SegmentQueueOutcome =
  | { status: "completed"; segments: number }
  | { status: "failed"; index: number; error: unknown }
  | { status: "cancelled" };

export interface SegmentQueueOptions<P> {
  count: number;
  signal: AbortSignal;
  /** 세그먼트 하나를 합성한다. 실패는 throw 로 알린다. */
  fetchSegment: (index: number, signal: AbortSignal) => Promise<P>;
  /**
   * 세그먼트 하나를 끝까지 재생한다. 재생이 끝나면 resolve, 실패하면 reject.
   * 소리가 실제로 나기 시작하면 `started()` 를 부른다 — 그때 다음 세그먼트 합성이 나간다.
   */
  playSegment: (payload: P, index: number, signal: AbortSignal, started: () => void) => Promise<void>;
}

export async function runSegmentQueue<P>({
  count,
  signal,
  fetchSegment,
  playSegment,
}: SegmentQueueOptions<P>): Promise<SegmentQueueOutcome> {
  if (signal.aborted) return { status: "cancelled" };
  if (count === 0) return { status: "completed", segments: 0 };

  const settle = (index: number, error: unknown): SegmentQueueOutcome =>
    signal.aborted ? { status: "cancelled" } : { status: "failed", index, error };

  let pending: Promise<P> | null = fetchSegment(0, signal);
  for (let index = 0; index < count; index += 1) {
    let payload: P;
    try {
      payload = await pending!;
    } catch (error) {
      return settle(index, error);
    }
    if (signal.aborted) return { status: "cancelled" };

    // 이 세그먼트가 소리를 내기 시작하면 다음 것 하나만 미리 합성한다.
    let next: Promise<P> | null = null;
    const prefetch = () => {
      if (next !== null || index + 1 >= count || signal.aborted) return;
      next = fetchSegment(index + 1, signal);
      // 재생 중에 멈추면 이 약속은 아무도 기다리지 않는다. 처리되지 않은 거절로 남기지 않는다.
      next.catch(() => undefined);
    };

    try {
      await playSegment(payload, index, signal, prefetch);
    } catch (error) {
      return settle(index, error);
    }
    if (signal.aborted) return { status: "cancelled" };
    prefetch(); // 시작 신호 없이 끝난 경우에도 다음 세그먼트는 합성한다
    pending = next;
  }
  return { status: "completed", segments: count };
}
