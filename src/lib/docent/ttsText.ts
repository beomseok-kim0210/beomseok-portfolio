/**
 * 합성 전 텍스트 정화.
 *
 * Supertonic 은 지원하지 않는 문자가 하나라도 있으면 `ValueError: Found N unsupported
 * character(s)` 로 **발화 전체를 거부한다.** 한 글자 때문에 그 답변의 목소리와 입모양이
 * 통째로 사라지고 브라우저 TTS 로 내려간다 — LAM 립싱크를 잃는다.
 *
 * 아래 표는 추측이 아니라 실측이다. 모델의 `unicode_indexer.json` 을 로드한
 * `UnicodeProcessor.validate_text()` 에 후보 기호를 하나씩 넣어 거부되는 것만 남겼다
 * (2026-09-23, supertonic 1.3.1 / Supertonic 3). 그래서 `→` 는 통과인데 `⇒ ↑ ↔` 는
 * 거부처럼 직관에 어긋나는 조합이 들어 있다.
 *
 * 표에 없는 거부 문자는 `supertonicUnsupported` 의 생성된 범위표가 막는다 (2026-09-29).
 * 예전에는 표 밖의 기호를 브라우저 TTS 폴백에 맡겼지만, 그 폴백은 도슨트의 목소리를
 * 다른 사람(OS 음성)으로 바꿔 버리므로 제거됐다. 이제 거부 문자 하나가 곧 그 세그먼트의
 * 무음이다 — 그래서 뜻이 있는 것은 위 표로 읽을 수 있게 바꾸고, 괄호류는 `( )` 로,
 * 나머지 장식·서식 문자는 공백으로 지운다. 모델이 받아들이는 문자(★ ● • 등)는 그대로 둔다.
 */
import { isSupertonicUnsupported } from "./supertonicUnsupported";

/** 거부되는 문자 → 읽을 수 있는 대체. 빈 문자열은 "읽지 않고 버린다". */
const UNSUPPORTED: Record<string, string> = {
  // 비교·수식 — 뜻이 있으므로 말이 되게 바꾼다
  "≤": " 이하 ", // ≤
  "≥": " 이상 ", // ≥
  "≠": " 같지 않음 ", // ≠
  "≡": " 동일 ", // ≡
  "∑": " 합 ", // ∑
  "∏": " 곱 ", // ∏
  "∫": " 적분 ", // ∫
  "⊕": " 더하기 ", // ⊕
  "⊗": " 곱하기 ", // ⊗
  "¬": " 부정 ", // ¬
  "‰": " 퍼밀 ", // ‰
  // 화살표 — → ← ↓ 는 통과하지만 이 셋은 거부된다
  "⇒": " 따라서 ", // ⇒
  "↔": " 양방향 ", // ↔
  "↑": " 증가 ", // ↑
  // 장식·구두점 — 소리 내 읽을 것이 없다
  "′": "", // ′
  "″": "", // ″
  "‡": "", // ‡
  "‹": "", // ‹
  "›": "", // ›
  "▲": "", // ▲
  "■": "", // ■
  "◆": "", // ◆
  "¤": "", // ¤
};

const PATTERN = new RegExp(`[${Object.keys(UNSUPPORTED).join("")}]`, "g");

/** 거부되는 괄호·따옴표의 모양만 바꾼다 — 괄호 안의 말은 그대로 읽힌다. */
const BRACKETS: Record<string, string> = {
  "〔": "(", "〕": ")", "〖": "(", "〗": ")", "〘": "(", "〙": ")", "〚": "(", "〛": ")",
  "⟨": "(", "⟩": ")", "⟦": "(", "⟧": ")", "⟪": "(", "⟫": ")", "⦅": "(", "⦆": ")",
  "｟": "(", "｠": ")", "⌈": "(", "⌉": ")", "⌊": "(", "⌋": ")",
  "‚": "'", "‛": "'", "„": "\"", "‟": "\"",
};
const BRACKET_PATTERN = new RegExp(`[${Object.keys(BRACKETS).join("")}]`, "g");

/** 문자열의 모든 코드포인트 중 모델이 거부하는 것. 서로게이트 쌍을 한 글자로 본다. */
const ANY_CHAR = /[\s\S]/gu;

export interface TtsSanitizeResult {
  text: string;
  /** 바뀐 문자들(중복 제거). 로그용 — 무엇이 들어오는지 알아야 표를 넓힐 수 있다. */
  replaced: string[];
}

export function sanitizeForTts(input: string): TtsSanitizeResult {
  const replaced = new Set<string>();
  const text = input
    .replace(PATTERN, (ch) => {
      replaced.add(ch);
      return UNSUPPORTED[ch];
    })
    .replace(BRACKET_PATTERN, (ch) => {
      replaced.add(ch);
      return BRACKETS[ch];
    })
    .replace(ANY_CHAR, (ch) => {
      if (!isSupertonicUnsupported(ch.codePointAt(0)!)) return ch;
      replaced.add(ch);
      return " ";
    })
    // 대체가 만든 연속 공백을 정리한다. 원문의 줄바꿈은 건드리지 않는다.
    .replace(/[^\S\n]{2,}/g, " ")
    .trim();
  return { text, replaced: [...replaced] };
}
