/**
 * 스트리밍 중인 답변에서 "더 이상 바뀌지 않는" 발화 세그먼트만 꺼낸다.
 *
 * 전에는 답변이 끝까지 생성된 뒤에야 세그먼트를 나눠 합성했다(LLM 전체 → 합성 → 재생).
 * 여기서는 답변이 자라는 동안 완결된 문장만 확정해, 첫 문장이 끝나면 바로 합성을 걸 수 있게 한다.
 *
 * 무엇이 "확정" 인가:
 *  - 문장 끝(. ? ! … 줄바꿈) 뒤에 공백이나 줄바꿈이 이미 도착한 곳까지만 본다. 마침표만 온
 *    상태("0.")는 소수점일 수 있고, 끝 문장은 아직 자랄 수 있다 — 스트림이 끝날 때만 읽는다.
 *  - 첫 세그먼트는 첫 완결 문장이 MIN_FIRST_SEGMENT_CHARS 이상이면 바로 확정한다(첫 음성을 당긴다).
 *  - 그 뒤 세그먼트는 기존 규칙(ttsSegments.segmentForTts)처럼 MAX_TTS_SEGMENT_CHARS 까지 문장을
 *    채우고, 다음 문장이 들어가면 넘칠 때 확정한다. 남은 것은 스트림이 끝날 때 확정한다.
 *
 * 보존 계약은 segmentForTts 와 같다: 확정된 세그먼트를 이어 붙이면 공백을 빼고 prepareSpokenText
 * 결과와 같다. 같은 글을 두 번 내보내지 않는다 — 세그먼트마다 합성은 한 번이다.
 * 답변 전체 상한(MAX_SPOKEN_ANSWER_CHARS)에 닿으면 그 뒤는 읽지 않는다(텍스트는 화면에 그대로 있다).
 */
import {
  MAX_SPOKEN_ANSWER_CHARS,
  MAX_TTS_SEGMENT_CHARS,
  SENTENCE_BOUNDARY,
  SPEAKABLE,
  cutAfter,
  explode,
  prepareSpokenText,
  visibleLength,
} from "./ttsSegments";

/** 첫 세그먼트를 혼자 내보낼 최소 글자 수. 너무 짧은 조각("네.")을 따로 합성하지 않는다. */
export const MIN_FIRST_SEGMENT_CHARS = 12;

/** 원문에서 문장 끝과 그 뒤 공백까지 도착한 마지막 위치. 없으면 0. */
export function stablePrefixLength(raw: string): number {
  let end = 0;
  for (const m of raw.matchAll(new RegExp(SENTENCE_BOUNDARY.source, "g"))) end = m.index! + m[0].length;
  return end;
}

/**
 * 확정 접두부의 마지막 문장은 뒤 공백 없이 잘려 온다(prepareSpokenText 가 줄 끝 공백을 다듬는다).
 * 다음 문장을 붙일 때 문장 사이 공백이 사라지지 않게 한 칸을 둔다.
 */
function join(buffer: string, piece: string): string {
  if (!buffer || /\s$/.test(buffer) || /^\s/.test(piece)) return buffer + piece;
  return `${buffer} ${piece}`;
}

export class StreamingSegmenter {
  private consumed = 0; // prepared 문장 조각 중 이미 버퍼에 넣은 수
  private buffer = "";
  private emittedChars = 0;
  private emittedCount = 0;
  private capped = false;
  private done = false;

  private readonly max: number;
  private readonly minFirst: number;

  constructor(max = MAX_TTS_SEGMENT_CHARS, minFirst = MIN_FIRST_SEGMENT_CHARS) {
    this.max = max;
    this.minFirst = minFirst;
  }

  /** 지금까지 도착한 답변 전체. 새로 확정된 세그먼트를 순서대로 돌려준다. */
  push(rawSoFar: string): string[] {
    if (this.done) return [];
    return this.advance(rawSoFar.slice(0, stablePrefixLength(rawSoFar)), false);
  }

  /** 답변이 끝났다. 남은 것을 모두 확정한다. */
  finish(rawFinal: string): string[] {
    if (this.done) return [];
    const out = this.advance(rawFinal, true);
    this.done = true;
    return out;
  }

  get emitted(): number {
    return this.emittedCount;
  }

  private pieces(raw: string): string[] {
    const prepared = prepareSpokenText(raw);
    if (!prepared) return [];
    return cutAfter(prepared, SENTENCE_BOUNDARY).flatMap((sentence) => explode(sentence, this.max, 1));
  }

  private advance(raw: string, final: boolean): string[] {
    const out: string[] = [];
    if (this.capped) return out;
    const pieces = this.pieces(raw);
    const emit = (segment: string) => {
      const text = segment.trim();
      if (!text) return;
      if (this.emittedChars + visibleLength(text) > MAX_SPOKEN_ANSWER_CHARS) {
        this.capped = true;
        return;
      }
      this.emittedChars += visibleLength(text);
      this.emittedCount += 1;
      out.push(text);
    };
    for (; this.consumed < pieces.length && !this.capped; this.consumed += 1) {
      const piece = pieces[this.consumed];
      // 말할 글자가 없는 조각("……")은 혼자 내보내지 않는다 — 버퍼에 붙어 간다.
      if (this.buffer && SPEAKABLE.test(this.buffer) && SPEAKABLE.test(piece)
        && visibleLength(this.buffer + piece) > this.max) {
        emit(this.buffer);
        this.buffer = piece;
      } else {
        this.buffer = join(this.buffer, piece);
      }
      if (this.emittedCount === 0 && SPEAKABLE.test(this.buffer) && visibleLength(this.buffer) >= this.minFirst) {
        emit(this.buffer);
        this.buffer = "";
      }
    }
    if (final && !this.capped && this.buffer.trim()) {
      if (SPEAKABLE.test(this.buffer)) emit(this.buffer);
      this.buffer = "";
    }
    return out;
  }
}
