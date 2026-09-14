import {
  docentFallbackDefault,
  docentFallbackEntries,
} from "@/data/docentFallback";
import type { DocentEmotion } from "@/types/docent";

export interface FallbackMatch {
  emotion: DocentEmotion;
  answer: string;
  /** 맞은 키워드 수. 0 이면 기본 응답이다. */
  hits: number;
  matchedKeywords: string[];
}

/** 알파벳 비율이 높고 한글이 없으면 영어 질문으로 판단. */
export function isEnglishQuestion(question: string): boolean {
  if (/[가-힣]/.test(question)) return false;
  const letters = question.replace(/[^a-zA-Z]/g, "").length;
  const meaningful = question.replace(/[\s\d\p{P}]/gu, "").length;
  return meaningful > 0 && letters / meaningful > 0.6;
}

// 한 글자 키워드는 부분 문자열 매칭에서 거의 항상 오탐한다("상" 이 "세상", "항상" 안에도
// 있다). 코드리뷰(Codex)에서 재현된 회귀 — 데이터에서 지우는 대신 여기서 한 번에 막는다:
// 누군가 나중에 짧은 키워드를 추가해도 조용히 다시 뚫리지 않는다.
const MIN_KEYWORD_LENGTH = 2;

/** 키워드 히트 수가 가장 많은 캔드 답변을 고른다. 히트 0이면 기본 응답. */
export function matchFallback(question: string): FallbackMatch {
  const q = question.toLowerCase();
  const english = isEnglishQuestion(question);

  let best: { hits: number; matched: string[]; entry: (typeof docentFallbackEntries)[number] } | null =
    null;
  for (const entry of docentFallbackEntries) {
    const matched = entry.keywords.filter(
      (kw) => kw.length >= MIN_KEYWORD_LENGTH && q.includes(kw.toLowerCase()),
    );
    const hits = matched.length;
    if (hits > 0 && (!best || hits > best.hits)) {
      best = { hits, matched, entry };
    }
  }

  if (!best) {
    return {
      emotion: docentFallbackDefault.emotion,
      answer:
        english && docentFallbackDefault.answerEn
          ? docentFallbackDefault.answerEn
          : docentFallbackDefault.answer,
      hits: 0,
      matchedKeywords: [],
    };
  }

  const { entry } = best;
  return {
    emotion: entry.emotion,
    answer: english && entry.answerEn ? entry.answerEn : entry.answer,
    hits: best.hits,
    matchedKeywords: best.matched,
  };
}
