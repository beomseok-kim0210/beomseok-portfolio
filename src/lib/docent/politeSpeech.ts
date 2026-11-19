/**
 * 코퍼스 문장은 사이트 본문용 서술체("…프로젝트다.", "…연결한다.")로 쓰여 있다.
 * LLM 이 없을 때 DD 는 그 문장을 그대로 읽어 주므로, 말하는 쪽 어투(합니다체)로 문장 끝만 바꾼다.
 * 문장 끝("다" 뒤에 마침표·물음표·느낌표·말줄임·줄바꿈·끝)만 건드리고 본문 어휘는 그대로 둔다.
 */

const HANGUL_BASE = 0xac00;
const JONG_COUNT = 28;
const JONG_NIEUN = 4; // ㄴ
const JONG_RIEUL = 8; // ㄹ
const JONG_BIEUP = 17; // ㅂ
const JONG_SSANGSIOS = 20; // ㅆ

function jong(ch: string): number {
  const code = ch.charCodeAt(0) - HANGUL_BASE;
  return code >= 0 && code < 11172 ? code % JONG_COUNT : -1;
}

function withJong(ch: string, j: number): string {
  const code = ch.charCodeAt(0) - HANGUL_BASE;
  return String.fromCharCode(HANGUL_BASE + code - (code % JONG_COUNT) + j);
}

/** 받침 없는 어간의 서술어 — 명사+"다" 로 오인하지 않게 따로 둔다(크다 → 큽니다). */
const VOWEL_STEM_PREDICATES = ["하다", "되다", "아니다", "크다", "빠르다", "느리다", "다르다"];

function politeWord(word: string): string {
  if (word === "이다") return "입니다";
  if (word.endsWith("아니다")) return `${word.slice(0, -2)}닙니다`; // 아니다 → 아닙니다
  if (word.endsWith("니다")) return word; // 이미 합니다체
  const stem = word.slice(0, -1); // "다" 제거
  const last = stem.slice(-1);
  const head = stem.slice(0, -1);
  const j = jong(last);
  if (j < 0) return word;
  if (last === "는" && head && jong(head.slice(-1)) > 0) return `${head}습니다`; // 읽는다 → 읽습니다
  if (last === "이" && head) return `${head}입니다`; // 시스템이다 → 시스템입니다
  if (j === JONG_SSANGSIOS) return `${stem}습니다`; // 했다 → 했습니다
  if (j === JONG_NIEUN || j === JONG_RIEUL) return `${head}${withJong(last, JONG_BIEUP)}니다`; // 연결한다 → 연결합니다
  if (j > 0) return `${stem}습니다`; // 있다 → 있습니다
  if (VOWEL_STEM_PREDICATES.some((p) => word.endsWith(p))) return `${head}${withJong(last, JONG_BIEUP)}니다`;
  return `${stem}입니다`; // 프로젝트다 → 프로젝트입니다
}

export function toPoliteSpeech(text: string): string {
  return text.replace(/([가-힣]+)다(?=[.!?…]|["'”’)\]]?\s*(?:\n|$))/g, (match) => politeWord(match));
}
