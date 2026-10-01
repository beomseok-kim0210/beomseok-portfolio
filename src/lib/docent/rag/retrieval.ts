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

/**
 * A project-page prior must not turn a portfolio-wide question into a question
 * about only the current project. Keep this deliberately small and lexical:
 * it is routing, not another model or a second relevance score.
 */
export function isBroadPortfolioOverviewQuery(
  query: string,
  intents: Intent[] = detectIntents(query),
  explicitProjects: ProjectId[] = detectProjects(query),
): boolean {
  if (!intents.includes("overview") || explicitProjects.length > 0) return false;
  return /(어떤|무슨|대표|주요|여러)\s*(프로젝트|작업)|프로젝트(들|를|가|는)?[^?.!]{0,16}(만들|했|진행|있)|포트폴리오[^?.!]{0,16}(프로젝트|작업)|what\s+(projects|have you built)|which\s+projects/i.test(query);
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

/**
 * 도슨트 자신을 가리키는 질문인가. 방문자는 도슨트에게 "너", "네", "당신" 으로 말을 걸고, 자기
 * 목소리·입모양·표정·응답 지연을 묻는다("왜 너는 입모양이 나중에 나와?", "왜 첫 음성은 느려?").
 * 이런 질문은 AI Docent 프로젝트에 대한 질문이다 — 그러지 않으면 음성 AI 인 ARMI 조각이 이긴다.
 * 이름 별칭이 아니라 좁은 규칙이다: 2인칭 + 자기 화제, 또는 음성 지연 + 음성·입모양.
 */
export function refersToDocentItself(query: string): boolean {
  const q = query.toLowerCase();
  const topic = /음성|목소리|입모양|입 모양|입이|립싱크|표정|얼굴|아바타|말하는|말할|대답|답변/.test(q);
  const secondPerson = /(^|\s)(너|네|니|당신)(는|가|의|이|랑|한테|\s|$)|네가|니가|너의|당신의/.test(q);
  const latency = /(느려|느린|늦게|늦어|늦는|지연|오래 걸|딜레이|delay)/.test(q) && /음성|목소리|입모양|입 모양|소리/.test(q);
  return (secondPerson && topic) || latency;
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
  const ids = found.sort((a, b) => a.at - b.at).map((f) => f.id);
  return ids.length === 0 && refersToDocentItself(query) ? ["docent"] : ids;
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
  /** 최종 근거가 질문에 답할 만한지. 어휘 임계값은 평가 셋으로 정했다 (rag-eval). */
  supported: boolean;
  /**
   * 무엇으로 근거를 인정했는가. canonical: 질문이 가리킨 프로젝트의 의도 섹션 정본.
   * lexical: 어휘 점수. overview: 포트폴리오 전체·프로필 개요. none: 근거 없음.
   */
  support: "lexical" | "canonical" | "overview" | "none";
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

  // 질문이 가리키는 프로젝트: 명시·이어받은 프로젝트는 확정이고, 페이지 프로젝트는 내용어가
  // 없을 때만("이 프로젝트 설명해줘") 대상이 된다. 페이지 prior 를 끈 평가 설정에서는 페이지만으로는 발동하지 않는다.
  const noContentWords = focusWords.length === 0 && oovWords.length === 0;
  const broad = isBroadPortfolioOverviewQuery(query, intents, explicitProjects);
  const targets: ProjectId[] = broad
    ? []
    : useEntity && wantedProjects.length > 0
      ? wantedProjects
      : noContentWords && activeProject && usePage ? [activeProject] : [];

  if (targets.length > 0) {
    // 프로젝트 단위 근거 묶음: 의도가 가리키는 섹션들을 그 프로젝트의 정본 조각으로 채운다.
    // "설명해줘" 는 개요 한 줄이 아니라 문제·역할·구조·기술·결과까지 담아야 답이 된다 — 개요만
    // 넘기면 모델이 "문제·기술·성과는 기록돼 있지 않다" 고 답한다(2026-10-01 ARMI 오답).
    const contentWords = focusWords.filter((w) => !isQuestionWord(w));
    results = assembleProjectEvidence(ix, scored, targets, intents, topK, contentWords);
    if (noContentWords) mode = "overview";
  } else if (noContentWords && !activeProject && (profilePage || !page) && usePage && !broad) {
    // 내용어도 프로젝트도 없는 질문("자기소개 해줘"): 프로필 조각을 의도 섹션 → 프로필 순으로.
    const pool = ix.docs.map((d) => d.chunk).filter(isProfileChunk);
    const wanted: Section[] = intents.length > 0 ? [...new Set(intents.flatMap((i) => SECTION_FOR_INTENT[i]))] : [];
    const picked: RagChunk[] = [];
    for (const sec of [...wanted, "profile" as Section]) {
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

  // Evidence selection is intentionally downstream of scoring. BM25 and every
  // existing prior above remain the source of relevance; this layer only keeps
  // one entity from monopolising a broad package and reserves section evidence
  // when the question clearly points at an active project.
  if (broad) {
    results = diversifiedPortfolioOverview(ix, scored, topK);
  } else if (targets.length === 0 && activeProject && intents.length > 0) {
    results = guaranteeActiveProjectSections(ix, scored, results, activeProject, intents, topK);
  } else if (targets.length === 0 && !activeProject && intents.includes("technology")) {
    // 프로젝트를 정하지 않은 기술 질문("어떤 기술을 다루나요?")은 포트폴리오 전체 기술 질문이다.
    // 프로젝트마다 있는 기술 조각이 프로필의 기술 스택 정리를 밀어내지 않게, 그것을 앞에 둔다.
    const toolbox = scored.find((item) => item.chunk.id === "profile:skill:toolbox");
    if (toolbox) results = [toolbox, ...results.filter((item) => item.chunk.id !== toolbox.chunk.id)].slice(0, topK);
  }

  // 근거 판정은 최종 근거 조립 뒤에 한다. 다음 중 하나면 근거가 있다:
  //  - lexical: 최고 어휘 점수가 임계값 이상이고, 질문의 내용어가 그 조각에서 실제로 맞았다.
  //  - canonical: 질문이 특정 프로젝트를 가리키고, 그 의도의 정본 섹션이 근거에 실제로 들어 있으며,
  //    코퍼스에 없는 내용어("혈액형", "월간", "투자")가 없고, 남은 내용어는 모두 질문어이거나
  //    근거에서 맞았다. "프로젝트·섹션이 있다" 와 "그 사실이 있다" 를 가른다 — 없는 사실은 unsupported.
  //  - overview: 포트폴리오 전체 개요, 또는 프로필 개요(내용어 없는 자기소개류).
  //  - 대상 프로젝트 안의 어휘 근거: 질문이 프로젝트를 가리키지만 의도 섹션이 없는 경우(예: AI Docent
  //    에는 decision 섹션이 없는데 "왜 첫 음성은 느려?")에는 그 프로젝트 조각의 어휘 점수로 판정한다.
  //    이때도 코퍼스에 없는 사실어가 있으면 근거가 아니다.
  const selfQuestion = targets.includes("docent") && refersToDocentItself(query);
  const askWord = (w: string) => isQuestionWord(w) || (selfQuestion && isSelfQuestionWord(w));
  const lexicalTop = scored[0];
  const lexicalSupport = targets.length === 0 && mode === "lexical" && Boolean(lexicalTop)
    && lexicalTop.lexical >= SUPPORT_THRESHOLD && focusWords.length > 0
    && focusWords.some((w) => wordMatched(w, lexicalTop.matched));
  const targetTop = scored.find((r) => r.chunk.projectId && targets.includes(r.chunk.projectId));
  const targetLexicalSupport = targets.length > 0 && oovWords.every(askWord) && Boolean(targetTop)
    && targetTop!.lexical >= SUPPORT_THRESHOLD && focusWords.length > 0
    && focusWords.some((w) => wordMatched(w, targetTop!.matched))
    && results.some((r) => r.chunk.id === targetTop!.chunk.id);
  const canonicalSupport = targets.length > 0 && oovWords.every(askWord)
    && hasTargetSectionEvidence(results, targets, intents)
    && focusWords.every((w) => askWord(w) || results.some((r) => wordMatched(w, r.matched)));
  const overviewSupport = results.length > 0 && (broad || (mode === "overview" && targets.length === 0));
  const supported = lexicalSupport || targetLexicalSupport || canonicalSupport || overviewSupport;
  // 근거가 없다고 판정한 프로젝트 질문("행가래 월간 활성 사용자 수는?")은 프로젝트 묶음 대신 원래
  // 어휘 순위를 돌려준다 — 모델에는 약한 근거 두 개만 가고, 가장 가까운 기록이 그대로 드러난다.
  if (targets.length > 0 && !supported) results = scored.slice(0, topK);
  const support: RetrievalResult["support"] = canonicalSupport ? "canonical" : lexicalSupport || targetLexicalSupport ? "lexical" : overviewSupport ? "overview" : "none";

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
    support,
    supportThreshold: SUPPORT_THRESHOLD,
    tookMs: Math.round((performance.now() - t0) * 100) / 100,
  };
}

/**
 * 프로젝트를 가리키는 질문에 싣는 섹션 묶음(앞일수록 먼저). 첫 섹션이 의도의 정본 섹션이다.
 * overview 는 L2 설명(문제·만든 것·핵심 기술·기여·결과)에 필요한 섹션을 모두 담는다.
 */
const PROJECT_PACKAGE: Record<Intent, Section[]> = {
  overview: ["overview", "problem", "role", "architecture", "technology", "result"],
  role: ["role", "overview"],
  technology: ["technology", "architecture"],
  architecture: ["architecture", "technology"],
  troubleshooting: ["troubleshooting", "decision", "problem"],
  decision: ["decision", "troubleshooting", "technology"],
  result: ["result", "metric", "lesson"],
  metric: ["metric", "result"],
  problem: ["problem", "overview", "troubleshooting"],
  award: ["award", "metric", "result"],
};

/** 의도의 정본 섹션에서 싣는 최대 개수. 보조 섹션은 하나씩. */
const PRIMARY_PER_SECTION = 3;

function packageSections(intents: Intent[]): { primary: Section[]; secondary: Section[] } {
  const list = intents.length > 0 ? intents : (["overview"] as Intent[]);
  const primary = [...new Set(list.map((i) => PROJECT_PACKAGE[i][0]))];
  const secondary = [...new Set(list.flatMap((i) => PROJECT_PACKAGE[i].slice(1)))].filter((sec) => !primary.includes(sec));
  return { primary, secondary };
}

/**
 * 질문이 가리킨 프로젝트의 근거 묶음. 섹션마다 어휘 점수가 가장 높은 조각을, 동점이면 출처
 * 우선순위(케이스 스터디 > 상세 > 카드)대로 고른다. 남는 자리는 그 프로젝트의 어휘 순위로 채운다.
 * 다른 프로젝트 조각은 싣지 않는다 — "ARMI 역할" 근거에 다른 프로젝트의 역할이 섞이면 모델이
 * 섞어 말한다. 여러 프로젝트를 명시한 비교 질문은 프로젝트마다 같은 몫을 준다.
 */
function assembleProjectEvidence(
  ix: Index,
  scored: RetrievedChunk[],
  targets: ProjectId[],
  intents: Intent[],
  topK: number,
  contentWords: string[] = [],
): RetrievedChunk[] {
  const scoredById = new Map(scored.map((item) => [item.chunk.id, item]));
  const { primary, secondary } = packageSections(intents);
  const overviewIntent = intents.length === 0 || intents.includes("overview");
  const share = Math.max(2, Math.floor(topK / targets.length));
  const out: RetrievedChunk[] = [];
  for (const project of targets) {
    const own = ix.docs.map((d) => d.chunk).filter((c) => c.projectId === project);
    const rank = (a: RagChunk, b: RagChunk) =>
      (scoredById.get(b.id)?.score ?? 0) - (scoredById.get(a.id)?.score ?? 0)
      || b.priority - a.priority || a.id.localeCompare(b.id);
    const picked: RetrievedChunk[] = [];
    // 질문에 사실을 가리키는 내용어("에이전트 구성", "WebSocket")가 있으면 그 말이 실제로 맞은 이
    // 프로젝트의 어휘 상위 조각이 섹션 묶음보다 앞선다 — "역할" 이라는 말 하나로 역할 조각이
    // 질문의 핵심(에이전트 구성)을 밀어내면 안 된다.
    for (const item of scored) {
      if (picked.length >= 2 || contentWords.length === 0) break;
      if (item.chunk.projectId !== project || item.lexical < SUPPORT_THRESHOLD) continue;
      if (contentWords.some((w) => wordMatched(w, item.matched))) picked.push(item);
    }
    const take = (sec: Section, n: number) => {
      for (const c of own.filter((x) => x.section === sec).sort(rank).slice(0, n)) {
        if (picked.length >= share) return;
        if (!picked.some((p) => p.chunk.id === c.id)) picked.push(scoredOrNeutral(c, scoredById));
      }
    };
    // 개요 묶음은 섹션마다 하나(개요만 둘) — 폭을 먼저 보여 준다. 다른 의도는 정본 섹션을 여럿.
    for (const sec of primary) take(sec, overviewIntent ? 2 : PRIMARY_PER_SECTION);
    for (const sec of secondary) take(sec, 1);
    // 남는 자리: 이 프로젝트의 어휘 순위. 개발 일지는 개요 묶음에 넣지 않는다.
    for (const item of scored) {
      if (picked.length >= share) break;
      if (item.chunk.projectId !== project || picked.some((p) => p.chunk.id === item.chunk.id)) continue;
      if (overviewIntent && item.chunk.section === "devlog") continue;
      picked.push(item);
    }
    out.push(...picked);
  }
  return out.slice(0, topK);
}

/**
 * 최종 근거에 대상 프로젝트의 의도 정본 섹션이 실제로 있는가(비교 질문이면 프로젝트마다).
 * 성과 질문은 result 대신 metric 조각만 있어도 된다.
 */
function hasTargetSectionEvidence(results: RetrievedChunk[], targets: ProjectId[], intents: Intent[]): boolean {
  const { primary } = packageSections(intents);
  const accepted = new Set<Section>(primary);
  if (intents.includes("result")) accepted.add("metric");
  return targets.every((project) => results.some((r) => r.chunk.projectId === project && accepted.has(r.chunk.section)));
}

/**
 * 질문을 이루는 말이지 사실을 가리키는 말이 아닌 어절의 앞부분 — "설명해줘", "역할은", "성과는".
 * canonical 근거 판정에서만 쓴다: 이런 말이 근거 본문에 없다고 해서 질문이 근거 없는 사실을
 * 묻는 것은 아니다. 사실을 가리키는 말("정확도", "혈액형")은 여기 넣지 않는다.
 */
const QUESTION_WORD_STEMS = [
  "설명", "소개", "알려", "무엇", "뭐", "어떤", "프로젝트", "대해", "대한", "자세", "간단", "요약", "정리",
  "역할", "맡은", "맡았", "담당", "기여", "포지션",
  "기술", "스택", "도구", "라이브러리", "프레임워크", "언어", "썼", "사용",
  "결과", "성과", "배운", "배웠", "교훈", "회고", "인사이트", "얻은", "느낀",
  "문제", "어려웠", "어려운", "힘들", "해결", "트러블", "막혔", "이슈",
  "선택", "이유", "결정", "고른", "택한", "채택", "판단",
  "구조", "아키텍처", "설계", "흐름", "파이프라인", "구성", "동작",
  "차이", "비교", "달라", "다른", "다르", "공통",
];

/** 앞부분 비교가 위험한 짧은 질문어는 어절 그대로만 인정한다("점이" 는 되고 "점수" 는 안 된다). */
const QUESTION_WORDS_EXACT = new Set(["점", "점이", "점은", "내가", "제가", "네가", "니가", "너가", "당신이", "좀", "한번", "혹시"]);

/** 도슨트에게 직접 묻는 질문에서만 질문어로 보는 말 — 2인칭과 "늦다/느리다" 류. */
const SELF_QUESTION_STEMS = ["너", "네가", "니가", "당신", "나중", "느려", "느린", "늦", "지연", "딜레이", "거야", "건가", "먼저", "왜"];
function isSelfQuestionWord(word: string): boolean {
  const w = word.toLowerCase().replace(/[?!.,~]+$/g, "");
  return SELF_QUESTION_STEMS.some((stem) => w.startsWith(stem));
}

function isQuestionWord(word: string): boolean {
  const w = word.toLowerCase().replace(/[?!.,~]+$/g, "");
  return QUESTION_WORDS_EXACT.has(w) || QUESTION_WORD_STEMS.some((stem) => w.startsWith(stem));
}

const OVERVIEW_EVIDENCE_SECTIONS: readonly Section[] = ["overview", "role", "result"];

function scoredOrNeutral(
  chunk: RagChunk,
  scoredById: Map<string, RetrievedChunk>,
): RetrievedChunk {
  return scoredById.get(chunk.id) ?? {
    chunk,
    // A guaranteed canonical chunk did not lexically match, so it has no BM25
    // score. Preserve that fact in `lexical` and expose source priority as its
    // deterministic assembly score rather than pretending it was irrelevant.
    score: chunk.priority,
    lexical: 0,
    priors: { entity: 1, page: 1, section: 1, source: chunk.priority },
    matched: [],
  };
}

function diversifiedPortfolioOverview(
  ix: Index,
  scored: RetrievedChunk[],
  topK: number,
): RetrievedChunk[] {
  const scoredById = new Map(scored.map((item) => [item.chunk.id, item]));
  const chosen: RetrievedChunk[] = [];

  for (const project of PROJECT_ENTITIES) {
    const candidates = ix.docs
      .map((doc) => doc.chunk)
      .filter((chunk) => chunk.projectId === project.id && OVERVIEW_EVIDENCE_SECTIONS.includes(chunk.section))
      .sort((a, b) => {
        const section = OVERVIEW_EVIDENCE_SECTIONS.indexOf(a.section) - OVERVIEW_EVIDENCE_SECTIONS.indexOf(b.section);
        if (section !== 0) return section;
        const priority = b.priority - a.priority;
        if (priority !== 0) return priority;
        const score = (scoredById.get(b.id)?.score ?? 0) - (scoredById.get(a.id)?.score ?? 0);
        return score || a.id.localeCompare(b.id);
      });
    if (candidates[0]) chosen.push(scoredOrNeutral(candidates[0], scoredById));
    if (chosen.length >= topK) break;
  }

  // If topK leaves room, add only portfolio-level supporting sections and keep
  // the per-entity cap at two. Dated implementation diaries never enter this path.
  const counts = new Map<string, number>();
  for (const item of chosen) counts.set(item.chunk.entityId, 1);
  for (const item of scored) {
    if (chosen.length >= topK) break;
    if (!item.chunk.projectId || item.chunk.section === "devlog") continue;
    if (!OVERVIEW_EVIDENCE_SECTIONS.includes(item.chunk.section)) continue;
    if ((counts.get(item.chunk.entityId) ?? 0) >= 2) continue;
    if (chosen.some((entry) => entry.chunk.id === item.chunk.id)) continue;
    chosen.push(item);
    counts.set(item.chunk.entityId, (counts.get(item.chunk.entityId) ?? 0) + 1);
  }
  return chosen;
}

function guaranteeActiveProjectSections(
  ix: Index,
  scored: RetrievedChunk[],
  ranked: RetrievedChunk[],
  activeProject: ProjectId,
  intents: Intent[],
  topK: number,
): RetrievedChunk[] {
  const primarySections = [...new Set(intents.map((intent) => SECTION_FOR_INTENT[intent][0]))];
  const alreadyGuaranteed = ranked.filter(
    (item) => item.chunk.projectId === activeProject && primarySections.includes(item.chunk.section),
  );
  if (alreadyGuaranteed.length > 0) return ranked;

  const scoredById = new Map(scored.map((item) => [item.chunk.id, item]));
  const guaranteed = ix.docs
    .map((doc) => doc.chunk)
    .filter((chunk) => chunk.projectId === activeProject && primarySections.includes(chunk.section))
    .sort((a, b) => {
      const section = primarySections.indexOf(a.section) - primarySections.indexOf(b.section);
      if (section !== 0) return section;
      const score = (scoredById.get(b.id)?.score ?? 0) - (scoredById.get(a.id)?.score ?? 0);
      return score || b.priority - a.priority || a.id.localeCompare(b.id);
    })
    .slice(0, Math.min(2, topK))
    .map((chunk) => scoredOrNeutral(chunk, scoredById));

  if (guaranteed.length === 0) return ranked;
  const ids = new Set(guaranteed.map((item) => item.chunk.id));
  return [
    ...guaranteed,
    ...ranked.filter((item) => !ids.has(item.chunk.id)),
  ].slice(0, topK);
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
