/**
 * 도슨트 답변을 화면에 보일 때만 쓰는 정리. 제품 정책은 일반 텍스트다 — 마크다운을 렌더하지
 * 않는다(임의 HTML·마크다운을 허용하면 XSS 표면이 커진다). 모델이 가끔 붙이는 강조 문법
 * `**ARMI**`, `__ARMI__` 만 걷어내 글자 그대로 보이게 한다.
 *
 * 건드리지 않는 것: 코드 스팬(`a*b`)·코드 블록 안, 짝이 없는 단일 `*`(곱셈, "5*", 각주 표시).
 * 스트리밍 중에는 여는 `**` 만 먼저 도착할 수 있다 — 닫는 표시가 올 때까지 여는 표시만 숨긴다.
 *
 * TTS 는 따로 stripMarkdownForSpeech(ttsSegments.ts)가 정리한다.
 */

const PAIRED_STRONG = /\*\*(?=\S)([^*\n]*?\S)\*\*/g;
const PAIRED_UNDERSCORE = /(^|[^\w])__(?=\S)([^_\n]*?\S)__(?![\w])/g;
/** 닫는 짝 없이 남은 여는 `**` (스트리밍 도중). 뒤에 같은 줄의 글자만 있을 때만. */
const DANGLING_STRONG = /\*\*(?=\S[^*\n]*$)/;

function stripOutsideCode(text: string): string {
  return text
    .replace(PAIRED_STRONG, "$1")
    .replace(PAIRED_UNDERSCORE, "$1$2")
    .replace(DANGLING_STRONG, "");
}

export function stripEmphasisForDisplay(text: string): string {
  if (!text.includes("**") && !text.includes("__")) return text;
  // 코드 블록(```)과 코드 스팬(`)은 그대로 두고, 그 밖의 조각만 정리한다.
  const parts = text.split(/(```[\s\S]*?(?:```|$)|`[^`\n]*`)/);
  return parts.map((part, i) => (i % 2 === 1 ? part : stripOutsideCode(part))).join("");
}
