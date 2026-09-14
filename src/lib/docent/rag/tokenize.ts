/**
 * 한국어를 위한 가벼운 토크나이저 — 형태소 분석기 없이.
 *
 * 한국어는 조사가 붙고("ARMI에서", "정확도를") 어미가 바뀌어("선택했어요" / "선택한")
 * 공백 토큰이 그대로 맞지 않는다. 형태소 분석기(mecab 등)를 들이지 않고도 실용적인
 * 수준을 얻는 두 가지 장치:
 *
 *   1. 흔한 조사를 어절 끝에서 떼어낸다 (남는 길이 ≥ 2 일 때만).
 *   2. 한글 어절은 글자 2-gram 으로도 낸다 — "정확도" → 정확, 확도. "선택했어요" 의
 *      선택 이 코퍼스의 "선택" 과 만난다.
 *
 * 라틴/숫자 토큰은 소문자 그대로에 더해 앞쪽 알파벳 줄기("yolov11" → "yolo")를 낸다.
 * 별칭 사전으로 한글 표기("아르미")를 정본 토큰("armi")에 붙인다.
 *
 * 결정론적이다. 같은 입력 → 같은 토큰 배열.
 */

const HANGUL = /[가-힣]/;

// 길이 긴 것부터 — "에서는" 을 "는" 보다 먼저 봐야 한다.
const PARTICLES = [
  "에서는", "에서도", "으로는", "으로도", "이라고", "에게는", "한테는",
  "에서", "으로", "로는", "라고", "에게", "한테", "부터", "까지", "처럼", "보다", "이랑",
  "과는", "와는", "에는", "에도", "이나", "이든", "밖에", "마다", "조차", "마저",
  "은", "는", "이", "가", "을", "를", "의", "와", "과", "도", "에", "로", "만", "랑", "요", "께",
];

/** 코퍼스에 거의 없거나 아무 조각에나 있는 질문 어미/기능어 bigram. */
const STOP = new Set([
  "습니", "니다", "입니", "합니", "했습", "였습", "됩니", "있습", "없습",
  "어요", "에요", "해요", "했어", "예요", "이에", "죠", "네요", "나요", "가요", "까요", "을까", "ㄹ까",
  "무엇", "뭐예", "뭐야", "뭔가", "어떤", "어떻", "떻게", "무슨", "어디", "언제", "누구",
  "이야", "인가", "건가", "건데", "는지", "은지", "인지", "것은", "것이", "것을",
  "해서", "하고", "하는", "한다", "하다", "했다", "이다", "있다", "없다",
  "그중", "그리고", "그래서", "그런", "이런", "저런", "여기", "거기", "지금",
  "알려", "려줘", "설명", "명해", "말해", "해줘", "주세", "세요", "줘요",
  "이번", "그거", "이거", "저거",
  "뭐였", "였어", "였던", "였나", "이었", "었어", "었나", "는데", "인데", "라서", "니까", "어서", "아서", "지만", "던가",
  // 코퍼스 거의 모든 조각에 있는 말 — 점수만 흐린다 (bigram 까지)
  "포트폴리오", "포트", "트폴", "폴리", "리오", "프로젝트", "프로", "로젝", "젝트",
  "페이지", "페이", "이지", "사이트", "사이", "이트",
]);

/** 한글 표기/별칭 → 정본 토큰. 질문과 코퍼스 양쪽에 적용된다. */
const ALIASES: Record<string, string[]> = {
  "아르미": ["armi"],
  "알미": ["armi"],
  "항가래": ["hangarae"],
  "행가래": ["hangarae"],
  "웨딩": ["wedding"],
  "드레스": ["wedding", "dress"],
  "클로": ["claw"],
  "클로데브": ["claw", "clawdev"],
  "도슨트": ["docent"],
  "욜로": ["yolo"],
  "젯슨": ["jetson"],
  "제트슨": ["jetson"],
  "블렌더": ["blender"],
  "플러터": ["flutter"],
  "리액트": ["react"],
  "레디스": ["redis"],
  "웹소켓": ["websocket"],
  "래그": ["rag"],
  "랙": ["rag"],
  "엠씨피": ["mcp"],
  "멀티에이전트": ["multi", "agent", "multiagent"],
  "에이전트": ["agent"],
  "프롬프트": ["prompt"],
  "임베딩": ["embedding"],
  "라마": ["llama"],
  "제미나이": ["gemini"],
  "올라마": ["ollama"],
  "큐원": ["qwen"],
  "스프링": ["spring"],
  "코틀린": ["kotlin"],
  "장고": ["django"],
  "뷰": ["vue"],
  "딥러닝": ["deep", "learning"],
  "컴퓨터비전": ["computer", "vision"],
  "비전": ["vision"],
  "포즈": ["pose"],
  "키포인트": ["keypoint", "keypoints"],
  "정밀도": ["precision"],
  "백엔드": ["backend"],
  "프론트엔드": ["frontend"],
  "프론트": ["frontend"],
  // 프로필 데이터가 영어라 한국어 질문이 닿지 않는 자리
  "전공": ["major", "education"],
  "학력": ["education", "major"],
  "학교": ["education"],
  "교육": ["education", "training"],
  "이름": ["name"],
  "관심사": ["interests"],
  "관심": ["interests", "focus"],
  "거주": ["location"],
  "경력": ["experience", "journey"],
  "상을": ["수상", "award"],
  "상은": ["수상", "award"],
  "상도": ["수상", "award"],
  "수상": ["award"],
  // 이 코퍼스에서 LLM 은 'AI Agent' 로 서술된다
  "llm": ["llm", "agent"],
};

function stripParticle(word: string): string {
  for (const p of PARTICLES) {
    if (word.length - p.length >= 2 && word.endsWith(p)) return word.slice(0, -p.length);
  }
  return word;
}

function bigrams(word: string): string[] {
  if (word.length < 2) return [word];
  const out: string[] = [];
  for (let i = 0; i < word.length - 1; i++) out.push(word.slice(i, i + 2));
  return out;
}

function latinTokens(run: string): string[] {
  const out = [run];
  const stem = run.match(/^[a-z]+/)?.[0];
  if (stem && stem.length >= 3 && stem !== run) out.push(stem);
  // 버전 접미("yolov11", "qwen3") 를 뗀 제품명도 낸다 — 질문의 "YOLO" 가 코퍼스의 "YOLOv11-M" 과 만나도록.
  const versioned = run.match(/^([a-z]{3,}?)v?\d+[a-z]*$/);
  if (versioned && versioned[1] !== stem) out.push(versioned[1]);
  return out;
}

/** 어절 하나를 토큰들로. 라틴 런과 한글 런을 나눠 각각 처리한다. */
function tokenizeWord(word: string): string[] {
  const out: string[] = [];
  const runs = word.match(/[a-z0-9]+|[가-힣]+/g) ?? [];
  for (const run of runs) {
    if (!HANGUL.test(run)) {
      const alias = ALIASES[run];
      out.push(...(alias ?? latinTokens(run)));
      continue;
    }
    const core = stripParticle(run);
    const alias = ALIASES[core] ?? ALIASES[run];
    if (alias) out.push(...alias);
    out.push(core);
    // 두 글자 어절은 그 자체가 bigram 이라 따로 내지 않는다.
    if (core.length >= 3) out.push(...bigrams(core));
  }
  // 한 글자 한글 토큰("다", "한", "둘")은 거의 기능어라 버린다. 라틴/숫자 한 글자도 신호가 아니다.
  return out.filter((t) => t.length > 1 && !STOP.has(t));
}

export function normalize(text: string): string {
  return text
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[→·ㆍ]/g, " ")
    .replace(/[^a-z0-9가-힣\s-]/g, " ");
}

/** 문서·질문 공용. 하이픈 결합형("yolov11-m" → "yolov11m")도 함께 낸다. */
export function tokenize(text: string): string[] {
  const norm = normalize(text);
  const words = norm.split(/\s+/).filter(Boolean);
  const out: string[] = [];
  for (const w of words) {
    if (w.includes("-")) {
      const joined = w.replace(/-/g, "");
      if (/^[a-z0-9]+$/.test(joined)) out.push(joined);
      for (const part of w.split("-")) if (part) out.push(...tokenizeWord(part));
    } else {
      out.push(...tokenizeWord(w));
    }
  }
  return out;
}

/** 질문 쪽 토큰. 문서와 같은 규칙이되, 통계용으로 중복을 남긴다. */
export function tokenizeQuery(text: string): string[] {
  return tokenize(text);
}
