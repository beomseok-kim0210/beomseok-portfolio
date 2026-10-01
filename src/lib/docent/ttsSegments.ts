import { sanitizeForTts } from "./ttsText";

/**
 * 답변 → 합성 가능한 세그먼트들.
 *
 * 왜 나누는가. 음성 라우트는 오디오를 base64 로 실어 보내고, 플랫폼 응답 한도(4.5 MB)
 * 에서 머리 공간을 뺀 몫이 약 35 초다. 실측(2026-09-29): 267 자 한국어 → 39.2 초 →
 * 413 `response_too_large`. 도슨트의 평범한 답변(300~500 자)이 그 선을 넘는다.
 * 한도를 올리는 것은 답이 아니다 — 답변 길이에는 위가 없다.
 *
 * 그래서 발화 단위를 "답변 하나" 에서 "세그먼트 하나"(최대 140 자) 로 내린다. 세그먼트마다 정본
 * WAV 가 하나씩 생기고, 재생과 LAM 이 그 같은 WAV 를 본다 — 불변식은 세그먼트 단위로
 * 그대로 성립한다. 세그먼트 PCM 을 이어 붙여 다른 소스를 만들지 않는다.
 *
 * 경계 우선순위: 문장 끝(. ? ! … 。 ？ ！, 줄바꿈) → 절 구두점(, ; : 、) → 공백 →
 * (최후) 글자 수로 자르기. 한국어 어절은 공백으로 나뉘므로 공백 경계는 단어를 자르지 않는다.
 *
 * 보존 계약: 세그먼트를 순서대로 이어 붙이면, 공백을 제외하고 `prepareSpokenText` 의
 * 결과와 글자 단위로 같다. 버리는 것도 두 번 읽는 것도 없다.
 */

/**
 * 세그먼트 글자 수 상한 (클라이언트가 자를 때).
 *
 * 글자 수가 아니라 합성된 응답 크기로 정했다(2026-09-29, 로컬 Supertonic M1 실측):
 *   일반 한국어    약 0.145 초/자  (179 자 → 26.1 초, 응답 3.13 MB)
 *   숫자 위주      약 0.178 초/자  (139 자 → 24.8 초, 응답 2.98 MB) ← 가장 느림
 * 라우트가 받아 주는 오디오는 약 34.9 초(응답 4.5 MB − 머리 공간 0.4 MB, base64 4/3).
 * 처음 후보였던 180 자는 숫자 위주 문장에서 약 32 초 — 여유가 8% 뿐이라 버렸다.
 * 140 자면 가장 느린 경우에도 약 25 초(여유 약 29%), 일반 문장은 약 20 초다.
 */
export const MAX_TTS_SEGMENT_CHARS = 140;

/**
 * 라우트가 받는 세그먼트 한 개의 상한. 클라이언트 상한보다 넉넉하다 — 정화가 기호를
 * 말로 바꾸며 몇 자 늘릴 수 있다. 180 자는 가장 느린 실측 발화율(0.178 초/자)로도
 * 약 32 초라 응답 한도 안쪽이다. 이것을 넘으면 413 이고, 응답 크기 검사도 여전히
 * 뒤에서 한 번 더 막는다.
 */
export const MAX_SEGMENT_TEXT_LENGTH = 180;

/**
 * 답변 하나를 음성으로 읽을 수 있는 상한. 세그먼트로 나눈다고 한 답변의 GPU 작업이
 * 무한정 늘어나도 되는 것은 아니다. 약 5 분 분량(15 세그먼트 안팎). 넘으면 음성은
 * 시작하지 않고 오류 상태가 된다 — 텍스트는 그대로 남는다.
 */
export const MAX_SPOKEN_ANSWER_CHARS = 2_000;

/** 문장 끝 구두점 뒤 공백, 또는 줄바꿈. 소수점(0.87)은 뒤가 공백이 아니라서 걸리지 않는다. */
export const SENTENCE_BOUNDARY = /[.?!…。？！]+["'”’」』)\]]*[^\S\n]+|\n+/g;
/** 절 구두점 뒤 공백. 10:30 처럼 공백이 없으면 경계가 아니다. */
const CLAUSE_BOUNDARY = /[,;:，、；：][^\S\n]+/g;
const WHITESPACE_BOUNDARY = /\s+/g;

/** 말할 수 있는 글자가 하나라도 있는가. 구두점만 남은 조각은 합성이 거부한다. */
export const SPEAKABLE = /[\p{L}\p{N}]/u;

/**
 * 마크다운 문법과 보이지 않는 문자를 걷어낸다. 뜻을 가진 글은 건드리지 않는다.
 *
 * - 링크·이미지 `[글](url)` → 글
 * - 줄머리의 제목 `#`, 인용 `>`, 목록 기호(-, *, +, •, 1.)
 * - 강조 `**` `__` `*`, 단어 가장자리의 `_`, 코드 표시 `` ` ``
 * - 표의 `|` 와 구분선, 수평선
 * - 폭 없는 문자(ZWSP·ZWJ·BOM·변형 선택자), 그림 문자(이모지 평면)
 * - NBSP·전각 공백·탭 → 공백. 줄바꿈은 문장 경계로 남긴다.
 */
export function stripMarkdownForSpeech(input: string): string {
  return input
    .replace(/\r\n?/g, "\n")
    .replace(/!?\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/^[ \t]*(?:[-*_]\s*){3,}$/gm, "")
    .replace(/^[ \t]*\|?(?:[ \t]*:?-{2,}:?[ \t]*\|)+[ \t]*:?-*:?[ \t]*$/gm, "")
    .replace(/^[ \t]*#{1,6}[ \t]+/gm, "")
    .replace(/^[ \t]*>+[ \t]?/gm, "")
    .replace(/^[ \t]*(?:[-*+•]|\d{1,3}[.)])[ \t]+/gm, "")
    .replace(/`+/g, "")
    .replace(/\*+/g, "")
    .replace(/(^|[\s(])_+|_+(?=[\s).,!?]|$)/gm, "$1")
    .replace(/[ \t]*\|[ \t]*/g, " ")
    .replace(/[​-‍⁠﻿︎️]/g, "")
    .replace(/[\u{1F000}-\u{1FAFF}]/gu, "")
    .replace(/[\t 　]/g, " ");
}

/**
 * 합성에 넘길 정규화 문자열. 세그먼트 분할의 기준이 되는 원문이다.
 * 공백은 줄 안에서 한 칸, 빈 줄은 줄바꿈 하나로 모은다.
 */
export function prepareSpokenText(input: string): string {
  const sanitized = sanitizeForTts(stripMarkdownForSpeech(input)).text;
  return sanitized
    .split("\n")
    .map((line) => line.replace(/[^\S\n]+/g, " ").trim())
    .filter((line) => line.length > 0)
    .join("\n");
}

/** 경계 매치 바로 뒤에서 자른다. 조각을 이어 붙이면 원문 그대로다. */
export function cutAfter(text: string, boundary: RegExp): string[] {
  const pieces: string[] = [];
  let start = 0;
  for (const match of text.matchAll(boundary)) {
    const end = match.index! + match[0].length;
    if (end > start && end < text.length) {
      pieces.push(text.slice(start, end));
      start = end;
    }
  }
  pieces.push(text.slice(start));
  return pieces;
}

/** 어떤 경계도 없는 덩어리의 마지막 수단. 서로게이트 쌍은 쪼개지 않는다. */
function hardCut(text: string, max: number): string[] {
  const chars = Array.from(text);
  const pieces: string[] = [];
  for (let i = 0; i < chars.length; i += max) pieces.push(chars.slice(i, i + max).join(""));
  return pieces;
}

const LEVELS = [SENTENCE_BOUNDARY, CLAUSE_BOUNDARY, WHITESPACE_BOUNDARY] as const;

export const visibleLength = (s: string) => Array.from(s.trim()).length;

/** 상한을 넘는 조각만 한 단계 더 잘게 자른다. 결과 조각은 모두 상한 이하다. */
export function explode(text: string, max: number, level: number): string[] {
  if (visibleLength(text) <= max) return [text];
  if (level >= LEVELS.length) return hardCut(text, max);
  const pieces = cutAfter(text, LEVELS[level]);
  if (pieces.length === 1) return explode(text, max, level + 1);
  return pieces.flatMap((piece) => explode(piece, max, level + 1));
}

/**
 * 정규화된 문자열을 세그먼트로 나눈다.
 *
 * 문장 단위로 먼저 자르고, 상한을 넘는 문장만 절 → 공백 → 글자 순으로 더 자른 뒤,
 * 순서대로 상한까지 탐욕적으로 채운다. 세그먼트 앞뒤 공백만 다듬는다.
 */
export function segmentForTts(text: string, max = MAX_TTS_SEGMENT_CHARS): string[] {
  if (!Number.isInteger(max) || max < 1) throw new RangeError("max must be a positive integer");
  const pieces = cutAfter(text, SENTENCE_BOUNDARY).flatMap((sentence) => explode(sentence, max, 1));

  const segments: string[] = [];
  let current = "";
  for (const piece of pieces) {
    if (current && visibleLength(current + piece) > max) {
      segments.push(current.trim());
      current = piece;
    } else {
      current += piece;
    }
  }
  if (current.trim()) segments.push(current.trim());

  // 말할 글자가 없는 조각("……" 같은)은 혼자 합성할 수 없다. 앞 세그먼트에 붙인다.
  const merged: string[] = [];
  for (const segment of segments.filter((s) => s.length > 0)) {
    if (!SPEAKABLE.test(segment) && merged.length > 0) merged[merged.length - 1] += ` ${segment}`;
    else merged.push(segment);
  }
  if (merged.length > 1 && !SPEAKABLE.test(merged[0])) {
    merged[1] = `${merged[0]} ${merged[1]}`;
    merged.shift();
  }
  return merged.filter((segment) => SPEAKABLE.test(segment));
}

/** 답변 → 세그먼트. 음성으로 읽을 수 없을 만큼 길면 null. */
export function planSpokenSegments(
  answer: string,
  max = MAX_TTS_SEGMENT_CHARS,
): { text: string; segments: string[] } | null {
  const text = prepareSpokenText(answer);
  if (Array.from(text).length > MAX_SPOKEN_ANSWER_CHARS) return null;
  return { text, segments: segmentForTts(text, max) };
}
