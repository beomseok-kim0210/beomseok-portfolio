/**
 * 어휘 검색 (BM25) + 페이지 문맥 사전확률 + 엔티티 일치 + 출처 우선순위.
 *
 * 순위 = BM25(질문, 조각) × 엔티티 prior × 페이지 prior × 섹션 prior × 출처 priority
 *
 *  - 엔티티 prior: 질문이 프로젝트를 명시하면("행가래에서…") 그 프로젝트가 우선하고 현재
 *    페이지는 무시된다 — 페이지는 힌트지 필터가 아니다.
 *  - 페이지 prior: 질문이 프로젝트를 명시하지 않았을 때만, 지금 보고 있는 프로젝트의 조각을
 *    올린다. 다른 프로젝트를 0 으로 만들지는 않는다 (교차 비교 질문이 있다).
 *  - 섹션 prior: "역할", "왜 선택", "수치" 같은 의도어가 있으면 그 섹션을 올린다.
 *  - 출처 priority: 케이스 스터디 > 상세 > 카드 > 노트.
 *
 * 곱셈이라 BM25 가 0 인 조각(질문 토큰과 아무 접점이 없는 조각)은 어떤 prior 로도 올라오지
 * 않는다. 근거 없는 조각이 "현재 페이지라서" 답이 되는 일은 없다.
 *
 * 벡터 검색이 아니다. 문서 어디에도 dense/hybrid 라고 쓰지 않는다.
 */
import { PROJECT_ENTITIES, getCorpus, projectEntity } from "./corpus";
import { tokenize, tokenizeQuery } from "./tokenize";
import type { PageContext, ProjectId, RagChunk, Section } from "./types";

/* ------------------------------------------------------------------- BM25 */

const K1 = 1.2;
const B = 0.75;
const TITLE_WEIGHT = 2; // 제목 토큰은 두 번 센다
const TAG_WEIGHT = 2;

interface IndexedDoc {
  chunk: RagChunk;
  tf: Map<string, number>;
  length: number;
}

interface Index {
  docs: IndexedDoc[];
  df: Map<string, number>;
  avgLength: number;
}

function buildIndex(chunks: RagChunk[]): Index {
  const docs: IndexedDoc[] = [];
  const df = new Map<string, number>();
  let total = 0;
  for (const chunk of chunks) {
    const tf = new Map<string, number>();
    const add = (tokens: string[], w: number) => {
      for (const t of tokens) tf.set(t, (tf.get(t) ?? 0) + w);
    };
    add(tokenize(chunk.text), 1);
    add(tokenize(chunk.title), TITLE_WEIGHT);
    add(tokenize(chunk.tags.join(" ")), TAG_WEIGHT);
    let length = 0;
    for (const v of tf.values()) length += v;
    for (const t of tf.keys()) df.set(t, (df.get(t) ?? 0) + 1);
    docs.push({ chunk, tf, length });
    total += length;
  }
  return { docs, df, avgLength: docs.length ? total / docs.length : 1 };
}

let cachedIndex: Index | null = null;
function index(): Index {
  if (!cachedIndex) cachedIndex = buildIndex(getCorpus());
  return cachedIndex;
}

/** 테스트용: 다른 코퍼스로 색인을 만든다. */
export function buildIndexFor(chunks: RagChunk[]): Index {
  return buildIndex(chunks);
}

function idf(ix: Index, term: string): number {
  const n = ix.docs.length;
  const d = ix.df.get(term) ?? 0;
  return Math.log(1 + (n - d + 0.5) / (d + 0.5));
}

function bm25(ix: Index, doc: IndexedDoc, terms: Map<string, number>): { score: number; matched: string[] } {
  let score = 0;
  const matched: string[] = [];
  for (const [term, qw] of terms) {
    const f = doc.tf.get(term);
    if (!f) continue;
    const denom = f + K1 * (1 - B + (B * doc.length) / ix.avgLength);
    score += idf(ix, term) * ((f * (K1 + 1)) / denom) * qw;
    matched.push(term);
  }
  return { score, matched };
}

/* ------------------------------------------------------------- 의도·엔티티 */

export type Intent =
  | "role" | "decision" | "troubleshooting" | "metric" | "architecture"
  | "technology" | "result" | "overview" | "award" | "problem";

const INTENT_PATTERNS: Array<[Intent, RegExp]> = [
  ["role", /역할|맡[았은]|담당|본인이|직접 (한|했)|기여|포지션|what (did|was) (he|you|beomseok)|role/i],
  ["problem", /무슨 문제|어떤 문제|문제를 풀|문제 정의|문제는 뭐|문제였|풀려고|풀고자|해결하려|what problem/i],
  ["metric", /수치|성과|지표|정확도|precision|map50|mAP|퍼센트|%|근거가|얼마나|몇 ?(장|개|명|퍼|배)|숫자|before|after|개선(됐|되었|했)|올렸|끌어올/i],
  ["decision", /왜|이유|선택|결정|고른|택한|채택|대신|중단|포기|판단|why|chose|decid/i],
  ["troubleshooting", /어려웠|어려운|힘들|문제|트러블|해결|실패|막혔|버그|이슈|장애|충돌|challenge|problem|issue|hard/i],
  ["architecture", /구조|아키텍처|흐름|파이프라인|설계|어떻게 (만들|동작|연결|구성)|how (does|did|is)|architecture|flow/i],
  ["technology", /기술|스택|도구|라이브러리|프레임워크|언어|tech|stack|tool/i],
  ["result", /결과|배운|배웠|배움|얻은|인사이트|교훈|회고|느낀|lesson|learn|result/i],
  ["award", /수상|상을|상 받|award|prize|1위|우승/i],
  // 마지막: 더 구체적인 의도가 없을 때만 "무엇인가" 로 본다
  ["overview", /뭔가요|뭐예요|뭐야|무엇|어떤 (프로젝트|서비스|시스템|것)|소개|설명|알려|what is|tell me about|describe/i],
];

const SECTION_FOR_INTENT: Record<Intent, Section[]> = {
  role: ["role"],
  metric: ["metric"],
  decision: ["decision", "troubleshooting"],
  troubleshooting: ["troubleshooting", "decision", "problem"],
  architecture: ["architecture", "overview"],
  technology: ["technology", "architecture"],
  result: ["result", "lesson"],
  overview: ["overview", "problem"],
  award: ["award", "metric", "result"],
  problem: ["problem", "overview", "troubleshooting"],
};

export function detectIntents(query: string): Intent[] {
  const out: Intent[] = [];
  for (const [intent, re] of INTENT_PATTERNS) if (re.test(query)) out.push(intent);
  // "역할이 뭐예요" 는 역할 질문이지 개요 질문이 아니다. 개요는 다른 의도가 없을 때만.
  return out.length > 1 ? out.filter((i) => i !== "overview") : out;
}

// 정규식 소스 문자열을 만들 때 문자 클래스 안에 backslash 리터럴을 직접 쓰면 이스케이프
// 계산이 어긋나기 쉽다(이 함수의 이전 버전이 그 실수로 문자 하나를 흘렸다). 한 글자씩
// 순회하며 필요한 문자에만 backslash 를 붙이는 쪽이 훨씬 덜 틀린다.
const BACKSLASH = String.fromCharCode(92); // "\"
const REGEX_SPECIAL = new Set([".", "*", "+", "?", "^", "$", "{", "}", "(", ")", "|", "[", "]", BACKSLASH]);

function escapeForRegex(alias: string): string {
  let out = "";
  for (const ch of alias) out += REGEX_SPECIAL.has(ch) ? BACKSLASH + ch : ch;
  return out;
}

/**
 * 별칭이 더 큰 라틴 단어 안에 우연히 들어 있는지 확인한다("dress" ⊂ "address").
 * 한글 별칭은 조사가 바로 붙어("행가래에서") 단어 경계 매칭이 안 통하므로 부분 문자열
 * 그대로 찾는다 — 오탐 위험보다 한국어 교착어 특성이 우선한다. 라틴 별칭만 앞뒤가
 * [a-z0-9] 가 아닐 때만 인정한다.
 */
function findAliasIndex(q: string, alias: string): number {
  if (/[가-힣]/.test(alias)) return q.indexOf(alias);
  const escaped = escapeForRegex(alias).replace(/ /g, `${BACKSLASH}s+`);
  const m = new RegExp(`(?<![a-z0-9])${escaped}(?![a-z0-9])`, "i").exec(q);
  return m ? m.index : -1;
}

/** 질문 본문에서 명시된 프로젝트. 별칭 우선, 등장 순서대로. */
export function detectProjects(query: string): ProjectId[] {
  const q = query.toLowerCase();
  const found: Array<{ id: ProjectId; at: number }> = [];
  for (const p of PROJECT_ENTITIES) {
    let best = -1;
    for (const alias of p.aliases) {
      const at = findAliasIndex(q, alias);
      if (at >= 0 && (best < 0 || at < best)) best = at;
    }
    if (best >= 0) found.push({ id: p.id, at: best });
  }
  return found.sort((a, b) => a.at - b.at).map((f) => f.id);
}

/* ----------------------------------------------------------------- 검색 API */

export interface RetrievalOptions {
  topK?: number;
  /** 페이지 prior 를 끈다 — 평가용 ablation. */
  usePagePrior?: boolean;
  /** 엔티티 prior 를 끈다 — 평가용 ablation. */
  useEntityPrior?: boolean;
  useSectionPrior?: boolean;
  useSourcePriority?: boolean;
  /** 직전 사용자 질문들. 지시어("그중")를 풀 때 낮은 가중치로 섞는다. */
  recentUserQueries?: string[];
}

export interface RetrievedChunk {
  chunk: RagChunk;
  score: number;
  lexical: number;
  priors: { entity: number; page: number; section: number; source: number };
  matched: string[];
}

export interface RetrievalResult {
  query: string;
  /** 질문이 명시한 프로젝트. 비어 있으면 페이지가 힌트가 된다. */
  explicitProjects: ProjectId[];
  /** 최종적으로 "이 질문이 가리키는 프로젝트" 로 본 것. */
  activeProject: ProjectId | null;
  intents: Intent[];
  /** 엔티티·기능어를 뺀, 코퍼스 어휘에 실제로 있는 질문 어절. 비어 있으면 근거를 찾을 내용어가 없다. */
  focusWords: string[];
  /** 내용어처럼 생겼지만 코퍼스 어휘에 없는 어절("혈액형", "팀원"). 있으면 근거 없는 질문일 가능성이 높다. */
  oovWords: string[];
  /** lexical: BM25 순위. overview: 내용어가 없어 활성 프로젝트의 개요 조각을 돌려준 경우. */
  mode: "lexical" | "overview";
  results: RetrievedChunk[];
  /** 최고 점수가 근거로 삼을 만한지. 임계값은 평가 셋으로 정했다 (rag-eval). */
  supported: boolean;
  supportThreshold: number;
  tookMs: number;
}

/** 근거로 인정하는 최소 어휘 점수. 평가 셋의 unsupported 질문(I) 분포 위, 사실 질문 분포 아래. */
export const SUPPORT_THRESHOLD = 2.5;

const ENTITY_MATCH = 1.6;
const ENTITY_OTHER = 0.55;
const PAGE_MATCH = 1.5;
const PAGE_OTHER = 0.7;
const PROFILE_ON_PROFILE_PAGE = 1.5;
const PROJECT_ON_PROFILE_PAGE = 0.85;
const SECTION_MATCH = 1.5;
const SECTION_HINT = 1.15;

/** 지시어만 있고 프로젝트 언급이 없는 짧은 후속 질문인가. */
export function looksLikeFollowUp(query: string): boolean {
  return /그중|그 중|그것|그건|그건요|이건|그럼|그러면|거기서|그 프로젝트|이 프로젝트|위에서|방금|아까|그리고요|then|that one|it\b/i.test(query)
    || query.trim().length <= 12;
}

export function retrieve(
  rawQuery: string,
  page: PageContext | null,
  options: RetrievalOptions = {},
): RetrievalResult {
  const t0 = performance.now();
  const ix = index();
  const query = rawQuery.trim();
  const topK = options.topK ?? 6;
  const usePage = options.usePagePrior ?? true;
  const useEntity = options.useEntityPrior ?? true;
  const useSection = options.useSectionPrior ?? true;
  const useSource = options.useSourcePriority ?? true;

  const explicitProjects = detectProjects(query);
  const intents = detectIntents(query);

  // 후속 질문: 직전 사용자 질문의 프로젝트를 이어받고, 그 토큰을 낮은 가중치로 섞는다.
  // 어시스턴트 답변은 절대 섞지 않는다 — 이전 답의 환각이 검색 근거가 되면 안 된다.
  const recent = options.recentUserQueries ?? [];
  let inheritedProject: ProjectId | null = null;
  const terms = new Map<string, number>();
  for (const t of tokenizeQuery(query)) terms.set(t, (terms.get(t) ?? 0) + 1);
  if (explicitProjects.length === 0 && recent.length > 0 && looksLikeFollowUp(query)) {
    for (let i = recent.length - 1; i >= 0 && !inheritedProject; i--) {
      inheritedProject = detectProjects(recent[i])[0] ?? null;
    }
    const prev = recent[recent.length - 1];
    for (const t of tokenizeQuery(prev)) terms.set(t, (terms.get(t) ?? 0) + 0.35);
  }

  // 질문이 프로젝트를 명시하면 그 이름 토큰은 어휘 점수에서 뺀다. 이름은 그 프로젝트의
  // 모든 조각 제목에 있어서, 짧은 조각(하이라이트)을 이유 없이 띄운다. 엔티티는 prior 가 맡는다.
  const wantedProjects: ProjectId[] = explicitProjects.length > 0 ? explicitProjects : inheritedProject ? [inheritedProject] : [];
  if (useEntity && wantedProjects.length > 0) {
    for (const id of wantedProjects) {
      const ent = projectEntity(id);
      for (const alias of ent?.aliases ?? []) for (const t of tokenizeQuery(alias)) terms.delete(t);
      for (const t of tokenizeQuery(ent?.title ?? "")) terms.delete(t);
    }
  }

  // 내용어: 코퍼스 어휘에 통째로(또는 별칭으로) 존재하는 질문 어절. 엔티티 이름은 제외.
  const { focus: focusWords, oov: oovWords } = classifyWords(ix, query, wantedProjects);

  const pageProject: ProjectId | null = page?.pageType === "project" || page?.pageType === "playground"
    ? (page.projectSlug ?? null)
    : null;
  const activeProject: ProjectId | null = explicitProjects[0] ?? inheritedProject ?? pageProject;
  const profilePage = page?.pageType === "about" || page?.pageType === "home";
  const primarySections = new Set<Section>(intents.map((i) => SECTION_FOR_INTENT[i][0]));
  const sections = new Set<Section>(intents.flatMap((i) => SECTION_FOR_INTENT[i]));

  const scored: RetrievedChunk[] = [];
  for (const doc of ix.docs) {
    const { score: lexical, matched } = bm25(ix, doc, terms);
    if (lexical <= 0) continue;
    const c = doc.chunk;

    let entity = 1;
    if (useEntity && wantedProjects.length > 0 && c.projectId) {
      entity = wantedProjects.includes(c.projectId) ? ENTITY_MATCH : ENTITY_OTHER;
    }

    let pagePrior = 1;
    if (usePage && wantedProjects.length === 0) {
      if (pageProject && c.projectId) pagePrior = c.projectId === pageProject ? PAGE_MATCH : PAGE_OTHER;
      else if (profilePage) pagePrior = c.projectId ? PROJECT_ON_PROFILE_PAGE : isProfileChunk(c) ? PROFILE_ON_PROFILE_PAGE : 1;
      if (page?.sectionId && c.section === page.sectionId && c.projectId === pageProject) pagePrior *= SECTION_HINT;
    }

    let section = 1;
    if (useSection && sections.size > 0) {
      if (primarySections.has(c.section)) section = SECTION_MATCH;
      else if (sections.has(c.section)) section = SECTION_HINT;
    }

    const source = useSource ? c.priority : 1;
    scored.push({ chunk: c, score: lexical * entity * pagePrior * section * source, lexical, priors: { entity, page: pagePrior, section, source }, matched });
  }

  scored.sort((a, b) => b.score - a.score || a.chunk.id.localeCompare(b.chunk.id));
  let results = scored.slice(0, topK);
  let mode: RetrievalResult["mode"] = "lexical";

  // "이 프로젝트 설명해줘", "그중 가장 어려웠던 건?" 처럼 내용어가 없는 질문: 어휘 점수는
  // 우연이 된다. 가리키는 프로젝트(또는 프로필)의 조각을 의도 섹션 → 개요 순으로, 출처
  // 우선순위대로 돌려준다. 페이지 prior 를 끈 평가 설정에서는 페이지만으로는 발동하지 않는다.
  if (focusWords.length === 0 && oovWords.length === 0) {
    const target: { projectId?: ProjectId; profile?: boolean } | null = activeProject && (usePage || wantedProjects.length > 0)
      ? { projectId: activeProject }
      : !activeProject && (profilePage || !page) && usePage ? { profile: true } : null;
    if (target) {
      const wantedSections: Section[] = intents.length > 0
        ? [...new Set(intents.flatMap((i) => SECTION_FOR_INTENT[i]))]
        : target.profile ? ["profile"] : ["overview"];
      const pool = ix.docs.map((d) => d.chunk).filter((c) => target.projectId ? c.projectId === target.projectId : isProfileChunk(c));
      const picked: RagChunk[] = [];
      for (const sec of [...wantedSections, ...(target.profile ? ["profile" as Section] : ["overview" as Section])]) {
        for (const c of pool.filter((x) => x.section === sec).sort((a, b) => b.priority - a.priority || a.id.localeCompare(b.id))) {
          if (!picked.includes(c)) picked.push(c);
        }
        if (picked.length >= topK) break;
      }
      if (picked.length > 0) {
        results = picked.slice(0, topK).map((chunk) => ({ chunk, score: chunk.priority, lexical: SUPPORT_THRESHOLD, priors: { entity: 1, page: 1, section: 1, source: chunk.priority }, matched: [] }));
        mode = "overview";
      }
    }
  }

  const top = results[0];
  const supported = mode === "overview"
    ? true
    : Boolean(top) && top.lexical >= SUPPORT_THRESHOLD && focusWords.length > 0
      && focusWords.some((w) => wordMatched(w, top.matched));

  return {
    query,
    explicitProjects,
    activeProject,
    intents,
    focusWords,
    oovWords,
    mode,
    results,
    supported,
    supportThreshold: SUPPORT_THRESHOLD,
    tookMs: Math.round((performance.now() - t0) * 100) / 100,
  };
}


/**
 * 어절을 셋으로 나눈다.
 *   focus — 조사 뗀 원형(또는 별칭)이 코퍼스 어휘에 있거나, 활용형이라도 bigram 이 둘 이상·60% 이상 있는 어절
 *   oov   — 내용어처럼 생겼는데 어휘에 없는 어절 ("혈액형", "팀원", "파이썬")
 *   무시  — 기능어(전부 STOP), 엔티티 이름, 일반어("김범석", "가장")
 * bigram 우연 하나로는 focus 로 세지 않는다 — "파이썬" 의 "파이" 가 "파이프라인" 과 만나는 일.
 */
function classifyWords(ix: Index, query: string, wanted: ProjectId[]): { focus: string[]; oov: string[] } {
  const entityTokens = new Set<string>();
  for (const id of wanted) {
    const ent = projectEntity(id);
    for (const alias of ent?.aliases ?? []) for (const t of tokenizeQuery(alias)) entityTokens.add(t);
    for (const t of tokenizeQuery(ent?.title ?? "")) entityTokens.add(t);
  }
  const focus: string[] = [];
  const oov: string[] = [];
  for (const word of query.split(/\s+/)) {
    const toks = tokenizeQuery(word);
    if (toks.length === 0) continue; // 기능어만 있던 어절
    const head = toks[0];
    if (GENERIC.has(head) || entityTokens.has(head)) continue;
    const heads = toks.filter((t) => t === head || !isBigramOf(t, head));
    const inVocab = heads.filter((t) => t.length >= 2 && ix.df.has(t) && !entityTokens.has(t) && !GENERIC.has(t));
    if (inVocab.length > 0) { focus.push(word); continue; }
    const grams = toks.filter((t) => isBigramOf(t, head) && !GENERIC.has(t));
    const hits = grams.filter((t) => ix.df.has(t)).length;
    if (grams.length >= 2 && hits >= 2 && hits / grams.length >= 0.6) { focus.push(word); continue; }
    if (!/[가-힣]/.test(head)) { oov.push(word); continue; } // 라틴 미등록어("zzzz", "kubernetes")
    // 약한 어절: bigram 하나만 닿거나("시작된", "담당한"), 어미만 남은 긴 활용형("설명해줘"). 내용어도 미등록어도 아니다.
    if (hits >= 1 || (grams.length <= 1 && head.length >= 3)) continue;
    oov.push(word); // "혈액형", "팀원", "날씨": 어휘에 전혀 없는 명사
  }
  return { focus, oov };
}

function isBigramOf(token: string, head: string): boolean {
  return token.length === 2 && head.length >= 3 && head.includes(token);
}

/** 내용어가 상위 조각에서 실제로 맞았는지 — 어절의 토큰 중 하나라도. */
function wordMatched(word: string, matched: string[]): boolean {
  const toks = tokenizeQuery(word);
  return toks.some((t) => matched.includes(t));
}

/** 어디에나 있어서 근거의 표지가 못 되는 말. */
const GENERIC = new Set([
  "김범석", "김범", "범석", "beomseok", "kim", "사람", "본인", "이분", "것", "때", "위해", "통해", "대해", "관련",
  "가장", "제일", "정말", "많이", "어떻게", "왜", "이유",
  "있는", "있어", "있었", "없는", "없어", "하는", "되는", "대한", "관한", "같은", "이런", "그런", "어떤",
  "여기", "지금", "보고", "보는", "현재", "이거", "이건", "그거", "무슨", "부분", "내용", "얘기", "이야기",
  // 거의 모든 조각에 등장하는 일반 명사 — 이 말 하나만 겹쳤다고 "근거를 찾았다" 로 볼 수 없다.
  // ("행가래의 월간 활성 사용자 수는?" 처럼 코퍼스에 없는 지표 질문이 "사용자" 하나로 오판되던 사례.)
  "사용자", "사용", "용자",
]);

function isProfileChunk(c: RagChunk): boolean {
  return !c.projectId && (c.entityType === "profile" || c.entityType === "skill" || c.entityType === "experience" || c.entityType === "education");
}

export function projectTitle(id: ProjectId | null | undefined): string | null {
  return id ? projectEntity(id)?.title ?? null : null;
}
