/**
 * 하이브리드 검색 — BM25(어휘) + dense(의미) → Reciprocal Rank Fusion → 약한 메타데이터 prior.
 *
 *   BM25        고유명사·기술명 정확 일치에 강하다 (ARMI, YOLOv11, STOMP, gRPC, Redis).
 *   dense       표현이 달라도 뜻이 같은 질문에 강하다 ("ARMI가 뭔데?", "이거 뭐 하는 거야?").
 *   RRF         두 점수는 척도가 달라 더하지 않는다. 각 목록의 순위만 쓴다: Σ 1/(k + rank).
 *   prior       대화·페이지가 가리키는 프로젝트를 조금 올린다. 순위를 뒤집을 만큼 세지 않다.
 *
 * dense 벡터가 없으면(키 없음·아티팩트 없음/오래됨·임베딩 API 실패) 같은 함수가 BM25 만으로
 * 순위를 낸다(mode "bm25"). 이후 단계(범위 결정·근거 조립·근거 판정)는 두 모드가 같다.
 *
 * 자연어 의미를 정규식으로 판정하지 않는다. "왜" → 결정 섹션, "설명해줘" → 개요, "뭔데" → 질문어
 * 같은 사전은 없다. 남은 규칙은 의미가 아니라 메타데이터다:
 *  - 프로젝트 별칭(ARMI = 아르미): 질문이 프로젝트를 명시하면 그 프로젝트로 범위를 정한다.
 *  - 도슨트 자신("너", "네 목소리"): AI Docent 엔티티로 푼다(refersToDocentItself).
 *  - 섹션은 근거 묶음의 다양성(섹션당 2개)과, 질문이 아무 단서도 주지 않을 때의 정본 순서로만 쓴다.
 *
 * 대화 문맥: 직전 1~2 턴은 "지금 무엇을 가리키는지" 를 푸는 데만 쓴다. 사실의 출처는 코퍼스뿐이다.
 *  - BM25 에는 직전 사용자 발화만 낮은 가중치로 섞는다(어시스턴트 답의 단어는 섞지 않는다).
 *  - dense 에는 [context] User/Assistant + [current] 질문을 한 입력으로 임베딩한 목록을 하나 더 쓴다.
 *  - 이어받는 프로젝트는 대화 상태(conversationStateOf)의 주 엔티티다: 사용자 발화가 명시한 엔티티로 정하고, 비교 대상이
 *    새로 언급됐다고 주 엔티티를 바꾸지 않는다. 비교 대상은 이후 후속 질문의 근거에 작은 몫으로 함께 싣는다.
 */
import { projectRegistry, registryEntity, selfEntityId, softEntityRegistry, type RegistryEntity } from "@/lib/docent/corpus/registry";

import { PORTFOLIO_INVENTORY_CHUNK_ID, getCorpus } from "./corpus";
import type { DenseIndex } from "./embeddings";
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
  byId: Map<string, IndexedDoc>;
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
  return { docs, byId: new Map(docs.map((d) => [d.chunk.id, d])), df, avgLength: docs.length ? total / docs.length : 1 };
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

/* ------------------------------------------------------------- 엔티티 */

// 정규식 소스 문자열을 만들 때 문자 클래스 안에 backslash 리터럴을 직접 쓰면 이스케이프
// 계산이 어긋나기 쉽다. 한 글자씩 순회하며 필요한 문자에만 backslash 를 붙인다.
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
 * 그대로 찾는다. 라틴 별칭만 앞뒤가 [a-z0-9] 가 아닐 때만 인정한다("armi프로젝트" 는 맞다).
 */
function findAliasIndex(q: string, alias: string): number {
  if (/[가-힣]/.test(alias)) return q.indexOf(alias);
  const escaped = escapeForRegex(alias).replace(/ /g, `${BACKSLASH}s+`);
  const m = new RegExp(`(?<![a-z0-9])${escaped}(?![a-z0-9])`, "i").exec(q);
  return m ? m.index : -1;
}

/**
 * 도슨트 자신을 가리키는 질문인가 — 엔티티 해소다. 방문자는 도슨트에게 "너", "네", "당신" 으로
 * 말을 걸고 자기 목소리·입모양·표정·응답 지연을 묻는다. 이런 질문은 AI Docent 프로젝트에 대한
 * 질문이다 — 그러지 않으면 음성 AI 인 ARMI 조각이 이긴다.
 */
export function refersToDocentItself(query: string): boolean {
  const q = query.toLowerCase();
  const topic = /음성|목소리|입모양|입 모양|입이|립싱크|표정|얼굴|아바타|말하는|말할|대답|답변/.test(q);
  const secondPerson = /(^|\s)(너|네|니|당신)(는|가|의|이|랑|한테|\s|$)|네가|니가|너의|당신의/.test(q);
  const latency = /(느려|느린|늦게|늦어|늦는|지연|오래 걸|딜레이|delay)/.test(q) && /음성|목소리|입모양|입 모양|소리/.test(q);
  return (secondPerson && topic) || latency;
}

/** 방문자가 도슨트에게 2인칭으로 말을 거는가("너는", "네가", "당신은") — 엔티티 해소(도슨트 자신)의 약한 신호. */
export function addressesDocent(query: string): boolean {
  return /(^|\s)(너|네|니|당신)(는|가|의|이|랑|한테|\s|$)|네가|니가|너의|당신의/.test(query.toLowerCase());
}

/** 질문 본문에서 명시된 프로젝트. 별칭 우선, 등장 순서대로. */
export function detectProjects(query: string): ProjectId[] {
  const ids = matchEntities(query, projectRegistry());
  const self = selfEntityId();
  return ids.length === 0 && self && refersToDocentItself(query) ? [self] : ids;
}

/** 질문이 이름으로 가리킨 system 엔티티(포트폴리오 사이트) — 약한 기본값으로만 쓴다(registry.ts 설명). */
export function detectSoftEntity(query: string): ProjectId | null {
  return matchEntities(query, softEntityRegistry())[0] ?? null;
}

function matchEntities(query: string, entities: RegistryEntity[]): ProjectId[] {
  const q = query.toLowerCase();
  const found: Array<{ id: ProjectId; at: number }> = [];
  for (const p of entities) {
    let best = -1;
    for (const alias of p.aliases) {
      const at = findAliasIndex(q, alias);
      if (at >= 0 && (best < 0 || at < best)) best = at;
    }
    if (best >= 0) found.push({ id: p.id, at: best });
  }
  return found.sort((a, b) => a.at - b.at).map((f) => f.id);
}

/* ------------------------------------------------------------- 대화 문맥 */

export interface ConversationTurn {
  role: "user" | "assistant";
  content: string;
}

/** dense 문맥 질의에 넣는 직전 턴 수(사용자+어시스턴트 한 쌍 = 1 턴). */
export const CONTEXT_TURNS = 2;
const CONTEXT_USER_CHARS = 200;
const CONTEXT_ASSISTANT_CHARS = 240;
/** BM25 에 섞는 직전 사용자 발화 가중치. 현재 질문(1.0)을 이기지 못한다. */
const CONTEXT_LEXICAL_WEIGHT = 0.35;

function clip(text: string, max: number): string {
  const t = text.replace(/\s+/g, " ").trim();
  return t.length > max ? `${t.slice(0, max)}…` : t;
}

/** 직전 대화 중 마지막 CONTEXT_TURNS 턴. 현재 질문은 넣지 않는다. */
export function recentContext(history: ConversationTurn[]): ConversationTurn[] {
  const out: ConversationTurn[] = [];
  let users = 0;
  for (let i = history.length - 1; i >= 0; i--) {
    out.unshift(history[i]);
    if (history[i].role === "user" && ++users >= CONTEXT_TURNS) break;
  }
  return out;
}

/**
 * dense 문맥 질의 문자열. 어시스턴트 답은 짧게 잘라 "무엇을 가리키는지" 의 단서로만 넣는다 —
 * 이 문자열로 찾은 것은 코퍼스 조각이고, 어시스턴트 문장이 근거 블록에 들어가지는 않는다.
 */
export function contextualQueryText(history: ConversationTurn[], current: string): string | null {
  const ctx = recentContext(history);
  if (ctx.length === 0) return null;
  const lines = ctx.map((t) => (t.role === "user"
    ? `User: ${clip(t.content, CONTEXT_USER_CHARS)}`
    : `Assistant: ${clip(t.content, CONTEXT_ASSISTANT_CHARS)}`));
  return `[context]\n${lines.join("\n")}\n[current]\n${current.trim()}`;
}

/** 사용자 발화에서만 이어받는 프로젝트를 찾는다(가장 최근에 명시된 것). */
export function contextProjectOf(history: ConversationTurn[]): ProjectId | null {
  for (let i = history.length - 1; i >= 0; i--) {
    if (history[i].role !== "user") continue;
    const found = detectProjects(history[i].content)[0] ?? exclusiveProjectIn(history[i].content);
    if (found) return found;
  }
  return null;
}

/**
 * 대화 상태 — 무엇에 대한 대화인가.
 *  - primaryEntity: 대화의 주제. 처음 명시된 엔티티이고, 사용자가 주제를 다른 엔티티로 옮길 때만 바뀐다.
 *  - comparisonEntities: 주제와 함께 다루는 엔티티(비교·관계). 후속 질문에서 주제 근거와 함께 작은 몫으로 싣는다.
 *  - lastExplicitEntity: 가장 최근 사용자 발화가 명시한 엔티티(디버그·설명용).
 */
export interface ConversationState {
  primaryEntity: ProjectId | null;
  comparisonEntities: ProjectId[];
  lastExplicitEntity: ProjectId | null;
}

/**
 * 직전 대화에서 대화 상태를 만든다. 사용자 발화가 명시한 엔티티(등록부 별칭 · 코퍼스 특유어)만 본다.
 *  - 발화가 주제를 다시 명시하면 주제는 그대로, 함께 명시한 다른 엔티티가 비교 대상이다.
 *  - 발화가 주제 없이 다른 엔티티만 명시했을 때, 그것이 비교인지 주제 전환인지는 발화 문장이 아니라 그 턴의 결과로 본다:
 *    그 턴의 답이 기존 주제도 함께 다뤘으면(근거가 둘을 이었으면) 비교, 새 엔티티만 다뤘으면 전환이다.
 *    답은 "무엇을 다뤘는가" 의 단서로만 쓴다 — 사실의 출처가 아니다.
 * 실패 사례(B4): "BCOS가 뭐야?" → "Claw Dev랑 뭐가 달라?" → … → "실제로 검증했어?" 에서 "가장 최근에 명시된 엔티티"
 * 규칙은 주제를 Claw Dev 로 덮어써서 BCOS 검증 근거를 놓쳤다.
 */
export function conversationStateOf(history: ConversationTurn[]): ConversationState {
  let primary: ProjectId | null = null;
  let comparison: ProjectId[] = [];
  let last: ProjectId | null = null;
  for (let i = 0; i < history.length; i++) {
    const turn = history[i];
    if (turn.role !== "user") continue;
    const named = detectProjects(turn.content);
    const exclusive = named.length === 0 ? exclusiveProjectIn(turn.content) : null;
    const mentioned = named.length > 0 ? named : exclusive ? [exclusive] : [];
    if (mentioned.length === 0) continue;
    last = mentioned[0];
    if (primary === null) {
      primary = mentioned[0];
      comparison = mentioned.slice(1);
    } else if (mentioned.includes(primary)) {
      comparison = mentioned.filter((p) => p !== primary);
    } else {
      const reply = history[i + 1]?.role === "assistant" ? history[i + 1].content : "";
      if (reply && detectProjects(reply).includes(primary)) {
        comparison = [...new Set([...comparison, ...mentioned])].filter((p) => p !== primary);
      } else {
        primary = mentioned[0];
        comparison = mentioned.slice(1);
      }
    }
  }
  return { primaryEntity: primary, comparisonEntities: comparison, lastExplicitEntity: last };
}

/**
 * 질문 속 어절 중 코퍼스에서 한 프로젝트의 조각에만 나오는 말(2개 이상)이 가리키는 프로젝트 — 엔티티 해소의 데이터 신호다.
 * 큐레이션 별칭에 없는 표기("Wedding ECON" 의 ECON, "립싱크")도 코퍼스가 그 프로젝트 것이라고 말해 준다. 여러 프로젝트를
 * 가리키면 null. 문구 사전이 아니라 코퍼스 통계다.
 */
export function exclusiveProjectIn(text: string): ProjectId | null {
  const ix = index();
  const heads = new Set(text.split(/\s+/).map((w) => tokenizeQuery(w)[0]).filter((t): t is string => Boolean(t) && t.length >= 2 && !GENERIC.has(t)));
  const owners = new Set<ProjectId>();
  for (const term of heads) {
    const projects = new Set<string | undefined>();
    let n = 0;
    for (const d of ix.docs) {
      if (!d.tf.has(term)) continue;
      n += 1;
      projects.add(d.chunk.projectId);
    }
    const [only] = [...projects];
    if (n >= 2 && projects.size === 1 && only) owners.add(only);
  }
  return owners.size === 1 ? [...owners][0] : null;
}

/* ----------------------------------------------------------------- 검색 API */

/** 질문 임베딩. current 는 현재 질문만, contextual 은 contextualQueryText 의 임베딩. */
export interface DenseQuery {
  index: DenseIndex;
  current: Float32Array;
  contextual: Float32Array | null;
}

export interface RetrievalOptions {
  topK?: number;
  /** 직전 대화(현재 질문 제외). */
  history?: ConversationTurn[];
  /** 옛 호출 호환: 직전 사용자 발화만. history 가 있으면 무시한다. */
  recentUserQueries?: string[];
  /** 있으면 하이브리드, 없으면 BM25 만. */
  dense?: DenseQuery | null;
  /** 평가용: BM25 를 끄고 dense 목록만으로 순위를 낸다. */
  denseOnly?: boolean;
  /** 평가용 ablation. */
  usePagePrior?: boolean;
  useSourcePriority?: boolean;
  /** 평가용: RRF 상수·목록 가중치 덮어쓰기(기본값은 RRF_K / RRF_WEIGHTS). */
  rrfK?: number;
  rrfWeights?: Partial<typeof RRF_WEIGHTS>;
}

export interface RetrievedChunk {
  chunk: RagChunk;
  /** 최종 정렬 점수(모드마다 척도가 다르다 — 비교는 같은 결과 안에서만). */
  score: number;
  /** BM25 점수(현재 질문 + 문맥 토큰). */
  lexical: number;
  /** 현재 질문 임베딩과의 코사인(dense 가 없으면 null). */
  dense: number | null;
  /** 목록별 순위(1부터, 목록에 없으면 null). */
  ranks: { bm25: number | null; dense: number | null; denseContext: number | null };
  priors: { focus: number; source: number };
  matched: string[];
}

export type RetrievalScope = "project" | "portfolio" | "open";
export type SupportLevel = "full" | "partial" | "none";

export interface RetrievalResult {
  query: string;
  /** "hybrid" | "bm25" | "dense"(평가 전용). */
  mode: "hybrid" | "bm25" | "dense";
  /** 질문이 명시한 프로젝트. */
  explicitProjects: ProjectId[];
  /** 대화가 이어받는 프로젝트(대화 상태의 주 엔티티). */
  contextProject: ProjectId | null;
  /** 직전 대화에서 만든 대화 상태. */
  conversation: ConversationState;
  /** 최종적으로 이 질문이 가리킨다고 본 프로젝트. 포트폴리오 전체·열린 질문이면 null. */
  activeProject: ProjectId | null;
  /** project: 특정 프로젝트 묶음 / portfolio: 프로젝트마다 고르게 / open: 순위 그대로. */
  scope: RetrievalScope;
  results: RetrievedChunk[];
  /**
   * 근거 판정. full: 관련 근거가 있고 질문의 내용어가 모두 근거에 있다. partial: 관련 근거는 있지만
   * 근거에 없는 질문 어절이 있다(어미·구어체일 수도, 없는 사실일 수도 — 모델이 가린다).
   * none: 관련 근거가 없다.
   */
  support: SupportLevel;
  /** support === "full". 옛 계약 호환. */
  supported: boolean;
  coverage: { covered: string[]; uncovered: string[] };
  relevance: { lexicalTop: number; denseTop: number | null; currentSignal: boolean };
  supportThreshold: number;
  timings: { bm25Ms: number; denseSearchMs: number; fusionMs: number };
  tookMs: number;
}

/** 어휘 관련성 임계값. 평가 셋의 unsupported 질문 분포 위, 사실 질문 분포 아래(rag-eval). */
export const SUPPORT_THRESHOLD = 2.5;
/**
 * dense 관련성 임계값(text-embedding-3-small 코사인). 실측(2026-10-01, 230 조각): 무관·지시 대상 없는 질문의
 * 최고 코사인 — "오늘 서울 날씨 어때?" 0.225, 문맥 없는 "왜?" 0.252, "왜 그렇게 한 거야?" 0.269. 관련 질문 0.33–0.73.
 * 코퍼스 중앙값은 0.07–0.31. 0.3 이 두 분포 사이에 있어 그대로 둔다. 코퍼스를 바꾸면 다시 잰다.
 */
export const DENSE_RELEVANCE = 0.3;
/** 포트폴리오 목록 조각이 현재 질문의 최고 코사인에서 이만큼 안이면 "프로젝트들 자체를 묻는다" 로 본다(실측 보정). */
export const INVENTORY_COSINE_GAP = 0.05;

/**
 * RRF 상수. 문헌 표준은 60 이지만 이 코퍼스(230 조각)의 실측 스윕(2026-10-01, text-embedding-3-small,
 * k ∈ {10, 30, 60} × dense 가중치 ∈ {1 … 0.25})에서 k=10 이 기존 64문항 Hit@1 이 가장 높았다(0.759 vs 0.690).
 * 상위 순위에 무게를 더 주는 값이다. 평가 셋이 작아 과적합 가능성이 있다 — 코퍼스를 바꾸면 다시 잰다.
 */
export const RRF_K = 10;
/** 목록별 RRF 가중치. */
export const RRF_WEIGHTS = { bm25: 1, dense: 1, denseContext: 1 };
/** 각 목록에서 융합에 넣는 깊이. */
const FUSION_DEPTH = 40;

/**
 * 대화·페이지가 가리키는 프로젝트의 가산. BM25 점수는 질문마다 척도가 커서 배수가 커야
 * 힌트 노릇을 하고, RRF 점수는 상위 순위 간격이 작아(1/61 vs 1/70) 배수가 작아야 의미 순위를
 * 뒤집지 않는다. 어느 쪽도 필터가 아니다 — 다른 프로젝트를 0 으로 만들지 않는다.
 */
export const FOCUS_PRIOR = { bm25: { match: 1.5, other: 0.7 }, fused: { match: 1.08, other: 0.97 } } as const;
/** 소개·홈 페이지의 프로필 기울기. BM25 값은 예전 평가로 정한 값(1.5 / 0.85)을 그대로 쓴다. */
const PROFILE_PAGE_PRIOR = { bm25: { profile: 1.5, project: 0.85 }, fused: { profile: 1.05, project: 0.98 } } as const;

/** 질문이 아무 단서도 주지 않을 때("ARMI가 뭔데?" 의 BM25) 프로젝트를 설명하는 정본 순서. */
const CANONICAL_SECTION_ORDER: readonly Section[] = [
  "overview", "problem", "role", "architecture", "technology", "decision",
  "troubleshooting", "result", "metric", "evaluation", "lesson", "award", "devlog", "roadmap", "note",
];
const PER_SECTION_CAP = 2;
const PORTFOLIO_FILL_SECTIONS: readonly Section[] = ["overview", "role", "result"];

export function retrieve(rawQuery: string, page: PageContext | null, options: RetrievalOptions = {}): RetrievalResult {
  const t0 = performance.now();
  const ix = index();
  const query = rawQuery.trim();
  const topK = options.topK ?? 6;
  const usePage = options.usePagePrior ?? true;
  const useSource = options.useSourcePriority ?? true;
  const history: ConversationTurn[] = options.history
    ?? (options.recentUserQueries ?? []).map((content) => ({ role: "user" as const, content }));
  const dense = options.dense ?? null;
  const denseOnly = Boolean(options.denseOnly && dense);
  const mode: RetrievalResult["mode"] = denseOnly ? "dense" : dense ? "hybrid" : "bm25";

  const explicitProjects = detectProjects(query);
  // 약하게 가리키는 엔티티: 이름이 일반어와 겹치는 system 엔티티, 또는 2인칭("너는 답을 어떻게 찾는 거야?")이 가리키는
  // 도슨트 자신. 질문이 다른 프로젝트 특유의 말을 하면 그쪽이 이긴다.
  const conversation = conversationStateOf(history);
  const contextProject = conversation.primaryEntity;
  // 질문 속 말이 한 프로젝트에만 나오면(코퍼스 통계) 그 프로젝트를 가리킨다 — 이름을 말하지 않아도("립싱크는 어떻게 만들었어?").
  const termProject = explicitProjects.length === 0 ? exclusiveProjectIn(query) : null;
  // 약하게 가리키는 엔티티, 강한 순서대로: 이름이 일반어와 겹치는 system 엔티티(포트폴리오 사이트) → 대화가 이어지던 프로젝트 →
  // 2인칭("너는 답을 어떻게 찾는 거야?")이 가리키는 도슨트 자신 → 지금 보는 페이지. 질문이 다른 프로젝트 특유의 말을 하면
  // 그쪽이 이긴다.
  const systemSoft = explicitProjects.length === 0 ? detectSoftEntity(query) : null;
  const pronounSoft = explicitProjects.length === 0 && addressesDocent(query) ? selfEntityId() : null;
  const softEntity = systemSoft ?? (contextProject ? null : pronounSoft);
  const pageProject: ProjectId | null = page?.pageType === "project" || page?.pageType === "playground"
    ? (page.projectSlug ?? null)
    : null;

  /* --- 1. 목록별 순위 ------------------------------------------------- */
  const tb = performance.now();
  // 질문이 명시한 프로젝트 이름 토큰은 어휘 점수에서 뺀다. 이름은 그 프로젝트의 모든 조각 제목에
  // 있어서 짧은 조각을 이유 없이 띄운다. 프로젝트는 범위(scope)가 맡는다.
  const entityTokens = projectNameTokens(explicitProjects);
  // 이어받는 프로젝트의 이름도 문맥 토큰에서 뺀다 — 이름은 그 프로젝트의 짧은 조각(하이라이트)만 띄운다.
  const contextEntityTokens = projectNameTokens(contextProject ? [contextProject] : []);
  const currentTerms = new Map<string, number>();
  for (const t of tokenizeQuery(query)) if (!entityTokens.has(t)) currentTerms.set(t, (currentTerms.get(t) ?? 0) + 1);
  const terms = new Map(currentTerms);
  // "현재 질문 자체가 어디를 가리키는가" 를 볼 때는 코퍼스 어디에나 있는 말("있는", "어떤")을 뺀다 —
  // 그런 말이 우연히 몰린 프로젝트로 대화 주제가 넘어가면 안 된다.
  const signalTerms = new Map([...currentTerms].filter(([t]) => !GENERIC.has(t)));
  // 어절의 원형 토큰(조사 뗀 말·별칭·라틴 단어). 글자 2-gram 은 우연히 한 프로젝트에 몰리기 쉬워
  // ("자기소개" 의 "자기") 프로젝트 특유의 말 판단에는 쓰지 않는다.
  const wordHeads = new Set(query.split(/\s+/).map((w) => tokenizeQuery(w).filter((t) => !entityTokens.has(t))[0]).filter((t): t is string => Boolean(t) && !GENERIC.has(t!)));
  const lastUser = [...history].reverse().find((t) => t.role === "user");
  if (lastUser) {
    for (const t of tokenizeQuery(lastUser.content)) {
      if (!entityTokens.has(t) && !contextEntityTokens.has(t)) terms.set(t, (terms.get(t) ?? 0) + CONTEXT_LEXICAL_WEIGHT);
    }
  }

  const lexical = new Map<string, { score: number; matched: string[] }>();
  const currentLexical = new Map<string, number>();
  if (!denseOnly) {
    for (const doc of ix.docs) {
      const s = bm25(ix, doc, terms);
      if (s.score > 0) lexical.set(doc.chunk.id, s);
      const c = bm25(ix, doc, signalTerms).score;
      if (c > 0) currentLexical.set(doc.chunk.id, c);
    }
  }
  const bm25Ms = performance.now() - tb;

  const td = performance.now();
  const denseCurrentAll = dense ? dense.index.search(dense.current) : [];
  const denseContextAll = dense?.contextual ? dense.index.search(dense.contextual) : [];
  // 융합에는 dense 전체 순위를 쓴다. 관련성 임계값은 "어느 프로젝트를 볼지" 판단(currentViewOrder)에만 쓴다 — 실측에서
  // 코사인 0.272("ECON은 어땠어?", 프로젝트 안 정답 1위)와 0.265("립싱크는 어떻게 만들었어?", 엉뚱한 프로젝트)는 임계값으로
  // 가를 수 없었고, 차이는 범위에서 났다: dense 관련 조각이 모자라면 범위는 BM25 순서로 정하고, 정해진 범위 안의 순서는
  // dense 가 돕는다.
  const denseCurrent = denseCurrentAll;
  const denseContext = denseContextAll;
  const denseMs = performance.now() - td;

  /* --- 2. 융합 + prior ------------------------------------------------ */
  const tf = performance.now();
  const k = options.rrfK ?? RRF_K;
  const w = { ...RRF_WEIGHTS, ...options.rrfWeights };
  const rankOf = (list: string[]) => new Map(list.slice(0, FUSION_DEPTH).map((id, i) => [id, i + 1]));
  const bm25Order = [...lexical.entries()].sort((a, b) => b[1].score - a[1].score || a[0].localeCompare(b[0])).map(([id]) => id);
  const bm25Rank = rankOf(bm25Order);
  const denseRank = rankOf(denseCurrent.map((h) => h.chunkId));
  const denseCtxRank = rankOf(denseContext.map((h) => h.chunkId));
  const cosineById = new Map(denseCurrentAll.map((h) => [h.chunkId, h.cosine]));

  // 대화가 가리킨 프로젝트가 페이지보다 우선한다(대화가 더 최근의 신호다). 질문이 프로젝트를
  // 명시했으면 그것이 범위이므로 prior 는 필요 없다.
  const focusProject = explicitProjects.length > 0 ? null : termProject ?? systemSoft ?? contextProject ?? pronounSoft ?? (usePage ? pageProject : null);
  const priorTable = dense ? FOCUS_PRIOR.fused : FOCUS_PRIOR.bm25;
  // 소개·홈 페이지에서 프로젝트를 가리키지 않는 질문은 프로필·기술 조각 쪽으로 조금 기운다(페이지 메타데이터).
  const profilePage = usePage && !focusProject && explicitProjects.length === 0 && (page?.pageType === "about" || page?.pageType === "home");

  const scored: RetrievedChunk[] = [];
  for (const doc of ix.docs) {
    const id = doc.chunk.id;
    const r = { bm25: bm25Rank.get(id) ?? null, dense: denseRank.get(id) ?? null, denseContext: denseCtxRank.get(id) ?? null };
    let base: number;
    if (dense) {
      base = (r.bm25 ? w.bm25 / (k + r.bm25) : 0) + (r.dense ? w.dense / (k + r.dense) : 0) + (r.denseContext ? w.denseContext / (k + r.denseContext) : 0);
    } else {
      base = lexical.get(id)?.score ?? 0;
    }
    if (base <= 0) continue;
    const c = doc.chunk;
    let focus = 1;
    if (focusProject && c.projectId) focus = c.projectId === focusProject ? priorTable.match : priorTable.other;
    else if (profilePage) focus = c.projectId ? PROFILE_PAGE_PRIOR[dense ? "fused" : "bm25"].project : isProfileChunk(c) ? PROFILE_PAGE_PRIOR[dense ? "fused" : "bm25"].profile : 1;
    if (usePage && focusProject && focusProject === pageProject && page?.sectionId && c.section === page.sectionId && c.projectId === pageProject) {
      focus *= dense ? 1.02 : 1.15;
    }
    const source = useSource ? c.priority : 1;
    scored.push({
      chunk: c,
      score: base * focus * source,
      lexical: lexical.get(id)?.score ?? 0,
      dense: cosineById.get(id) ?? null,
      ranks: r,
      priors: { focus, source },
      matched: lexical.get(id)?.matched ?? [],
    });
  }
  scored.sort((a, b) => b.score - a.score || a.chunk.id.localeCompare(b.chunk.id));
  const scoredById = new Map(scored.map((s) => [s.chunk.id, s]));

  /* --- 3. 범위 결정 --------------------------------------------------- */
  const lexicalTop = Math.max(0, ...currentLexical.values());
  const denseTop = dense ? (denseCurrentAll[0]?.cosine ?? 0) : null;
  // 현재 질문 자체에 검색 신호가 있는가("왜?" 처럼 문맥 없이는 아무것도 가리키지 않는 질문이 아닌가).
  const currentSignal = lexicalTop >= SUPPORT_THRESHOLD || (denseTop !== null && denseTop >= DENSE_RELEVANCE);

  // 범위는 질문 문장이 아니라 검색 결과의 모양과 대화의 흐름으로 정한다.
  //  1. 질문이 프로젝트를 명시했다 → 그 프로젝트(들).
  //  2. 현재 질문의 상위 결과가 포트폴리오 목록 조각이거나 여러 프로젝트의 개요다 → 포트폴리오 전체.
  //     문맥 질의(직전 대화 포함)의 상위가 목록 조각이면("그중 AI 프로젝트만") 역시 전체.
  //  3. 대화가 이어지던 프로젝트(없으면 지금 보는 프로젝트 페이지)가 기본이다. 현재 질문 자체가
  //     다른 프로젝트를 뚜렷하게 가리킬 때만 그쪽으로 넘어간다 — 사람의 대화처럼 주제는 이어지는 게 기본이다.
  //  4. 현재 질문의 상위가 프로필·기술 조각이면 열린 질문(프로젝트로 좁히지 않는다).
  const currentOrder = currentViewOrder(dense ? null : currentLexical, denseCurrentAll, currentLexical);
  const contextOrder = denseContext.map((h) => h.chunkId);
  // 실제 임베딩(text-embedding-3-small)에서 "어떤 프로젝트를 만들었나요?" 의 상위 10개는 코사인 0.37–0.41 에
  // 몰려 있어 순위가 호출마다 한두 칸씩 흔들린다(목록 조각 5위 0.375 vs 6위 0.374). 그래서 dense 에서는 순위 대신
  // 최고 코사인과의 차이(INVENTORY_COSINE_GAP 이내)로 본다. BM25 모드는 상위 5위 안. 대신 지금 보던(대화·페이지)
  // 프로젝트가 현재 질문 상위 6에 있으면 그 프로젝트를 묻는 것으로 본다.
  const inventoryHit = denseCurrent.find((h) => h.chunkId === PORTFOLIO_INVENTORY_CHUNK_ID);
  const inventoryNearCurrent = dense
    ? Boolean(inventoryHit && inventoryHit.cosine >= DENSE_RELEVANCE && denseCurrent[0].cosine - inventoryHit.cosine <= INVENTORY_COSINE_GAP)
    : currentOrder.slice(0, 5).includes(PORTFOLIO_INVENTORY_CHUNK_ID);
  const inventoryNear = (order: string[]) => order.includes(PORTFOLIO_INVENTORY_CHUNK_ID);
  const softProject = systemSoft ?? contextProject ?? pronounSoft ?? (usePage ? pageProject : null);
  // 프로젝트 페이지에서 대화 문맥 없이 묻는 지시어 질문("이 프로젝트 뭐 하는 거야?")이 실측상 진짜 전체 질문보다
  // 목록 조각과 더 가깝다(1위 vs 5위). 그래서 페이지만 있을 때는 여러 프로젝트 개요가 고루 오를 때만 전체 범위다.
  // 전체 질문이 페이지 프로젝트에 머물러도 프롬프트의 정본 프로젝트 목록으로 답할 수 있다.
  const pageOnlySoft = !softEntity && !contextProject && usePage && pageProject !== null;
  const softInCurrentTop = softProject !== null && currentOrder.slice(0, 6).some((id) => ix.byId.get(id)?.chunk.projectId === softProject);
  const currentDominant = currentSignal ? dominantKey(currentOrder, ix) : null;

  let scope: RetrievalScope = "open";
  let targets: ProjectId[] = [];
  let hintProject: ProjectId | null = null;
  if (explicitProjects.length > 0) {
    scope = "project";
    targets = [...explicitProjects];
    // "행가래랑 뭐가 달라?" — 직전 사용자 발화의 프로젝트와 비교하는 질문일 수 있다. 직전에 다른
    // 프로젝트를 이야기하고 있었다면 그 프로젝트도 작은 몫으로 싣는다(없는 사실은 근거 판정이 가린다).
    if (contextProject && !targets.includes(contextProject)) targets.push(contextProject);
  } else if (termProject) {
    scope = "project";
    targets = [termProject];
    if (contextProject && contextProject !== termProject) targets.push(contextProject);
  } else if (
    // 대화가 이어지던 프로젝트가 있으면 "프로젝트" 라는 말만으로 전체로 넘어가지 않는다("그게 네 프로젝트 성능이야?") —
    // 그때는 여러 프로젝트 개요가 고루 오를 때만 전체 범위다.
    (currentSignal && (spansPortfolio(currentOrder, ix) || (inventoryNearCurrent && !softInCurrentTop && !pageOnlySoft && !contextProject)))
    || (!contextProject && inventoryNear(contextOrder.slice(0, 3)))
  ) {
    scope = "portfolio";
  } else {
    const soft = systemSoft ?? contextProject ?? pronounSoft ?? (usePage ? pageProject : null);
    // 넘어가려면 현재 질문의 상위 6개가 다른 곳(프로젝트 또는 프로필·기술)으로 쏠려 있고, 이어지던 프로젝트는
    // 하나도 없고, 그곳에 몰려 있는 말(코퍼스 통계)이 질문에 있어야 한다. "어떻게 동작해?", "왜 그 기술을
    // 선택했어?" 처럼 모든 프로젝트에 있는 말이 우연히 한쪽에 몰린 것으로는 지금 보던 프로젝트를 떠나지 않는다.
    // 대화·페이지가 가리키는 프로젝트가 없을 때도 같은 기준으로만 프로젝트로 좁힌다("자기소개 해줘" 가 우연히
    // 몰린 프로젝트로 좁혀지지 않게). 프로필 쪽으로 쏠리면 열린 질문이다.
    const specific = currentDominant && hasSpecificTerm(ix, wordHeads, currentDominant) ? currentDominant : null;
    const softInTop = soft !== null && currentOrder.slice(0, 6).some((id) => ix.byId.get(id)?.chunk.projectId === soft);
    // 2인칭만으로 가리킨 도슨트는 가장 약한 신호다("ECON 성능이 네 프로젝트 실측이야?" 의 "네" 는 포트폴리오 주인일 수 있다) —
    // 다른 프로젝트 특유의 말이 있으면 그 프로젝트가 상위에 함께 있어도 넘어간다.
    const softIsPronoun = soft !== null && soft === pronounSoft && !systemSoft && !contextProject;
    const target: ProjectId | "profile" | null = specific && specific !== soft && (!softInTop || (softIsPronoun && soft === softEntity))
      ? specific
      : soft ?? (currentDominant === "profile" ? "profile" : specific);
    if (target && target !== "profile") {
      scope = "project";
      targets = [target];
      // 대화의 주제에 머무는 후속 질문이면 비교 대상의 근거도 작은 몫으로 싣는다 — "실제로 검증했어?" 가 둘 중 무엇을
      // 묻는지는 근거를 다 보고 모델이 답한다. 주제의 근거가 주(主)다.
      if (target === contextProject) for (const p of conversation.comparisonEntities) if (!targets.includes(p)) targets.push(p);
      // 지금 보던 프로젝트에 머물지만 질문에 다른 프로젝트 특유의 말이 있으면("정확도" → 행가래), 그 근거도
      // 두 개 싣는다 — 페이지·대화는 힌트지 필터가 아니다.
      if (specific && specific !== "profile" && specific !== target) hintProject = specific;
    }
  }

  let results: RetrievedChunk[];
  if (scope === "project") {
    // 질문에서 프로젝트 이름을 빼면 BM25 가 맞힌 내용이 없고("ARMI가 뭔데?", "이 프로젝트 뭐 하는 거야?"), 해석에 쓸
    // 대화 문맥도 없다 — 이때 dense 는 사실상 이름 유사도라 짧은 조각(회고 한 줄)이 이긴다(실측: "ARMI가 뭔데?" 1위 =
    // "ARMI 회고 3" 0.647, 개요 0.636). 그 프로젝트를 정본 구조 순서(개요부터)로 소개한다. 대화가 있으면("왜 그렇게
    // 한 거야?") 문맥 dense 순위가 무엇을 가리키는지 알려 주므로 그대로 쓴다.
    // "맞힌 내용이 없다" 는 대상 프로젝트 조각 안에서 본다 — 다른 조각이 질문 문장을 인용하고 있으면(v4 의 DD 조각은
    // 운영 실패 사례로 "armi프로젝트가 뭔데" 를 인용한다) 코퍼스 전체로는 무언가 맞는다.
    // 정본 순서는 프로젝트를 이름으로 하나만 말한 질문에만 — 비교 질문("BCOS는 Claw Dev랑 뭐가 달라?")은 관계를 묻고,
    // 약하게 가리킨 대상(페이지·2인칭)은 질문 내용이 따로 있다. 그런 경우는 개요를 맨 앞에 두고 관련도 순서를 따른다.
    const noInTargetLexical = ![...currentLexical.keys()].some((id) => { const p = ix.byId.get(id)?.chunk.projectId; return p !== undefined && targets.includes(p); });
    const anchorFirst = !denseOnly && denseContext.length === 0 && noInTargetLexical;
    const nameOnly = anchorFirst && explicitProjects.length === 1
      && ![...currentLexical.keys()].some((id) => { const p = ix.byId.get(id)?.chunk.projectId; return p !== undefined && targets.includes(p); });
    // 주 근거: 질문이 명시한 프로젝트, 명시가 없고 비교 대상을 함께 실을 때는 대화의 주제(첫 대상). 나머지는 작은 몫.
    const lead = explicitProjects.length > 0 ? explicitProjects : targets.length > 1 && targets[0] === contextProject ? [targets[0]] : [];
    results = assembleProjectEvidence(ix, scored, scoredById, targets, lead, topK, nameOnly, anchorFirst, Boolean(dense));
    if (hintProject) {
      const hints = currentOrder.map((id) => scoredById.get(id)).filter((x): x is RetrievedChunk => Boolean(x) && x!.chunk.projectId === hintProject).slice(0, 2);
      results = [...results.slice(0, Math.max(0, topK - hints.length)), ...hints];
    }
  } else if (scope === "portfolio") {
    results = diversifyPortfolio(ix, scored, scoredById, topK);
  } else {
    results = scored.slice(0, topK);
  }
  const fusionMs = performance.now() - tf;

  /* --- 4. 근거 판정 --------------------------------------------------- */
  const coverage = evidenceCoverage(ix, query, results, entityTokens);
  // 관련 근거가 있는가: 질문·대화·페이지가 프로젝트를 가리켰거나, 포트폴리오 전체 범위이거나, 현재 질문
  // 자체가 검색 신호를 냈다. 이것은 "관련" 판정일 뿐 — 질문의 사실이 근거에 있는지는 coverage 가 본다.
  const relevant = results.length > 0 && (
    scope !== "open" || currentSignal
    // 소개·홈 페이지의 자기소개류("김범석은 어떤 사람이에요?"): 내용어는 없지만 프로필 조각이 맞았다
    || (profilePage && !results[0].chunk.projectId && results[0].lexical > 0)
  );
  const support: SupportLevel = !relevant ? "none" : coverage.uncovered.length === 0 ? "full" : "partial";

  return {
    query,
    mode,
    explicitProjects,
    contextProject,
    conversation,
    activeProject: scope === "project" ? targets[0] : null,
    scope,
    results,
    support,
    supported: support === "full",
    coverage,
    relevance: { lexicalTop: round2(lexicalTop), denseTop: denseTop === null ? null : round3(denseTop), currentSignal },
    supportThreshold: SUPPORT_THRESHOLD,
    timings: { bm25Ms: round2(bm25Ms), denseSearchMs: round2(denseMs), fusionMs: round2(fusionMs) },
    tookMs: round2(performance.now() - t0),
  };
}

const round2 = (x: number) => Math.round(x * 100) / 100;
const round3 = (x: number) => Math.round(x * 1000) / 1000;

/* ---------------------------------------------------------- 범위 판단 도구 */

/** 현재 질문만의 순위(대화 문맥·prior 없이). 하이브리드면 dense 순위, 아니면 BM25 순위. */
function currentViewOrder(currentLexical: Map<string, number> | null, denseCurrent: { chunkId: string; cosine: number }[], lexicalFallback?: Map<string, number>): string[] {
  const byLexical = (m: Map<string, number>) => [...m.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).map(([id]) => id);
  if (currentLexical) return byLexical(currentLexical);
  // dense 는 모든 조각에 점수를 준다 — 관련성 임계값 아래의 꼬리는 "현재 질문이 가리키는 곳" 이 아니다.
  const relevant = denseCurrent.filter((h) => h.cosine >= DENSE_RELEVANCE).map((h) => h.chunkId);
  // dense 가 의미적으로 닿지 못한 질문(관련 조각 3개 미만)은 BM25 순서로 본다.
  return relevant.length >= 3 || !lexicalFallback ? relevant : byLexical(lexicalFallback);
}

/**
 * 포트폴리오 전체를 묻는 질문인가 — 질문 문장이 아니라 검색 결과의 모양으로 판단한다.
 * 현재 질문만의 상위 8개에 서로 다른 프로젝트 셋 이상의 "개요" 조각이 있으면, 질문은 한 프로젝트가
 * 아니라 프로젝트들 자체를 가리킨다("어떤 프로젝트를 만들었나요?", "만든 것들 알려줘").
 * "역할이 뭐예요?" 처럼 프로젝트마다 있는 섹션이 고르게 오르는 질문은 개요 조각이 아니라서 걸리지 않는다.
 */
function spansPortfolio(order: string[], ix: Index): boolean {
  const projects = new Set<ProjectId>();
  for (const id of order.slice(0, 8)) {
    const c = ix.byId.get(id)?.chunk;
    if (c?.projectId && c.section === "overview") projects.add(c.projectId);
  }
  return projects.size >= 3;
}

/**
 * 현재 질문만의 상위 6개 중 2/3 이상이 한 프로젝트(또는 프로필·기술 같은 비프로젝트 조각)면 그것.
 * 질문 자체가 어디를 가리키는지의 신호다 — 대화·페이지 prior 가 들어가기 전의 순위로 본다.
 */
function dominantKey(order: string[], ix: Index): ProjectId | "profile" | null {
  const top = order.slice(0, 6).map((id) => ix.byId.get(id)?.chunk).filter((c): c is RagChunk => Boolean(c));
  if (top.length < 3) return null;
  const counts = new Map<ProjectId | "profile", number>();
  for (const c of top) {
    const key = c.projectId ?? "profile";
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  const [best, n] = [...counts.entries()].sort((a, b) => b[1] - a[1])[0];
  return n / top.length >= 2 / 3 ? best : null;
}

/**
 * 한 곳에 몰려 있는 말: 그 말이 나오는 조각의 2/3 이상이 이 프로젝트(또는 프로젝트 밖의 프로필·기술 조각)다
 * (조각 2개 이상). 코퍼스 통계다.
 */
const PROJECT_SPECIFIC_SHARE = 2 / 3;
function hasSpecificTerm(ix: Index, terms: Iterable<string>, key: ProjectId | "profile"): boolean {
  for (const term of terms) {
    let total = 0;
    let own = 0;
    for (const d of ix.docs) {
      if (!d.tf.has(term)) continue;
      total += 1;
      if ((d.chunk.projectId ?? "profile") === key) own += 1;
    }
    if (own >= 2 && own / total >= PROJECT_SPECIFIC_SHARE) return true;
  }
  return false;
}

function projectNameTokens(ids: ProjectId[]): Set<string> {
  const out = new Set<string>();
  for (const id of ids) {
    const ent = registryEntity(id);
    for (const alias of ent?.aliases ?? []) for (const t of tokenizeQuery(alias)) out.add(t);
    for (const t of tokenizeQuery(ent?.title ?? "")) out.add(t);
  }
  return out;
}

function neutral(chunk: RagChunk): RetrievedChunk {
  // 순위 목록에 없던 조각(정본 앵커). 점수는 출처 우선순위로만 정한다 — 관련 없다고 꾸미지 않는다.
  return { chunk, score: 0, lexical: 0, dense: null, ranks: { bm25: null, dense: null, denseContext: null }, priors: { focus: 1, source: chunk.priority }, matched: [] };
}

/** 프로젝트의 정본 개요 앵커 — "이 프로젝트가 무엇인지" 한 줄. 출처 우선순위가 가장 높은 개요 조각. */
function overviewAnchor(ix: Index, project: ProjectId): RagChunk | null {
  return ix.docs.map((d) => d.chunk)
    .filter((c) => c.projectId === project && c.section === "overview")
    .sort((a, b) => b.priority - a.priority || a.id.localeCompare(b.id))[0] ?? null;
}

/**
 * 특정 프로젝트(들)의 근거 묶음. 그 프로젝트의 조각을 융합 순위대로 담되 섹션당 2개로 다양성을
 * 지키고, 개요 앵커를 하나 꼭 넣는다. 순위가 없는 조각(질문이 아무 단서도 주지 않은 "ARMI가 뭔데?" 의
 * BM25 모드)은 정본 섹션 순서로 채운다. 다른 프로젝트 조각은 싣지 않는다 — 섞이면 모델이 섞어 말한다.
 * 명시된 프로젝트가 여럿이면(비교 질문) 같은 몫을, 문맥에서 이어받은 비교 대상은 2개를 준다.
 */
function assembleProjectEvidence(
  ix: Index,
  scored: RetrievedChunk[],
  scoredById: Map<string, RetrievedChunk>,
  targets: ProjectId[],
  explicit: ProjectId[],
  topK: number,
  canonicalFirst = false,
  anchorFirst = false,
  hasDense = false,
): RetrievedChunk[] {
  const primary = targets.filter((p) => explicit.length === 0 || explicit.includes(p));
  const secondary = targets.filter((p) => !primary.includes(p));
  const secondaryShare = secondary.length > 0 ? 2 : 0;
  const share = Math.max(2, Math.floor((topK - secondaryShare * secondary.length) / primary.length));
  const out: RetrievedChunk[] = [];
  for (const project of [...primary, ...secondary]) {
    const limit = primary.includes(project) ? share : secondaryShare;
    const ranked = canonicalFirst ? [] : scored.filter((s) => s.chunk.projectId === project);
    const rest = ix.docs.map((d) => d.chunk)
      .filter((c) => c.projectId === project && (canonicalFirst || !scoredById.has(c.id)))
      .sort((a, b) => sectionOrder(a.section) - sectionOrder(b.section) || b.priority - a.priority || a.id.localeCompare(b.id))
      .map((c) => scoredById.get(c.id) ?? neutral(c));
    const picked: RetrievedChunk[] = [];
    const perSection = new Map<Section, number>();
    // 섹션 상한은 채움 단계에만 건다. 관련도 상위 조각은 섹션이 겹쳐도 먼저 싣는다 — 큐레이션 코퍼스는 factType 이
    // 한쪽으로 쏠려 있어(Claw Dev 20 조각 중 architecture 13) 상한이 정답을 밀어냈다(실측).
    const tryPick = (item: RetrievedChunk, capped = true) => {
      if (picked.length >= limit || picked.some((p) => p.chunk.id === item.chunk.id)) return;
      const n = perSection.get(item.chunk.section) ?? 0;
      if (capped && n >= PER_SECTION_CAP) return;
      picked.push(item);
      perSection.set(item.chunk.section, n + 1);
    };
    // 개요 앵커는 질문에 가장 맞는 조각 셋 뒤에 둔다 — 근거 순서는 관련도 순이고, 앵커는 "이 프로젝트가
    // 무엇인지" 를 잃지 않게 하는 보험이다. 순위 신호가 없으면(rest 만 있으면) 정본 순서상 개요가 맨 앞이다.
    const anchor = overviewAnchor(ix, project);
    const anchorItem = anchor ? scoredById.get(anchor.id) ?? neutral(anchor) : null;
    const ANCHOR_SLOT = anchorFirst ? 0 : 3;
    for (const item of ranked) {
      if (picked.length >= Math.min(ANCHOR_SLOT, limit - 1)) break;
      tryPick(item, false);
    }
    if (anchorItem) tryPick(anchorItem, false);
    // 순위가 있는 조각은 상위 몇 개만 먼저 — 나머지 자리는 섹션 폭(정본 순서, 섹션당 1개)을 먼저 채운다.
    // "ARMI 설명해줘" 처럼 단서가 적은 질문에 개요·역할·구조·기술·결과가 고루 실려야 "기록이 없다" 고 답하지 않는다.
    const RANKED_FIRST = Math.max(ANCHOR_SLOT + 1, Math.ceil(limit / 2));
    for (const item of ranked) {
      if (picked.length >= RANKED_FIRST) break;
      tryPick(item, false);
    }
    // 섹션 폭 채움은 순위 신호가 모자랄 때만(이름만 있는 질문, 또는 BM25 가 몇 개만 맞힌 경우). 하이브리드처럼 프로젝트
    // 조각 전체에 의미 순위가 있으면 그 순서를 따른다 — 폭을 먼저 채우면 관련도 6~10위의 정답이 밀려난다(실측).
    // BM25 폴백 모드(dense 없음)의 어휘 순위는 의미 질문에 약하므로 그때도 폭을 먼저 채운다.
    const sparse = canonicalFirst || !hasDense || ranked.length < limit;
    if (sparse) {
      const coveredSections = () => new Set(picked.map((p) => p.chunk.section));
      for (const item of [...ranked, ...rest]) {
        if (!coveredSections().has(item.chunk.section)) tryPick(item);
      }
    }
    for (const item of ranked) tryPick(item, sparse);
    for (const item of rest) tryPick(item);
    out.push(...picked);
  }
  return out.slice(0, topK);
}

function sectionOrder(s: Section): number {
  const i = CANONICAL_SECTION_ORDER.indexOf(s);
  return i < 0 ? CANONICAL_SECTION_ORDER.length : i;
}

/**
 * 포트폴리오 전체 질문의 근거: 전체 목록 조각 + 프로젝트마다 한 자리(그 프로젝트의 가장 높은 순위 개요 조각, 없으면
 * 정본 개요 앵커). 남는 자리는 융합 순위대로, 엔티티당 2개까지. 개발 일지는 싣지 않는다.
 */
function diversifyPortfolio(ix: Index, scored: RetrievedChunk[], scoredById: Map<string, RetrievedChunk>, topK: number): RetrievedChunk[] {
  const chosen: RetrievedChunk[] = [];
  // 프로젝트 전체 목록 조각이 맨 앞 — 모델이 포트폴리오의 범위를 근거로도 본다.
  const inventory = ix.byId.get(PORTFOLIO_INVENTORY_CHUNK_ID)?.chunk;
  if (inventory) chosen.push(scoredById.get(inventory.id) ?? neutral(inventory));
  const firstRank = (p: ProjectId) => {
    const i = scored.findIndex((s) => s.chunk.projectId === p);
    return i < 0 ? Number.MAX_SAFE_INTEGER : i;
  };
  const projects = projectRegistry().map((p) => p.id).sort((a, b) => firstRank(a) - firstRank(b));
  for (const project of projects) {
    const ov = scored.find((s) => s.chunk.projectId === project && s.chunk.section === "overview");
    const anchor = overviewAnchor(ix, project);
    const pick = ov ?? (anchor ? scoredById.get(anchor.id) ?? neutral(anchor) : null);
    if (pick) chosen.push(pick);
    if (chosen.length >= topK) return chosen;
  }
  const counts = new Map<string, number>();
  for (const item of chosen) counts.set(item.chunk.entityId, 1);
  for (const item of scored) {
    if (chosen.length >= topK) break;
    // 남는 자리는 프로젝트의 개요·역할·결과만 — 개발 일지·지식 노트는 포트폴리오 개요의 근거가 아니다.
    if (!item.chunk.projectId || !PORTFOLIO_FILL_SECTIONS.includes(item.chunk.section)) continue;
    if (chosen.some((c) => c.chunk.id === item.chunk.id)) continue;
    if ((counts.get(item.chunk.entityId) ?? 0) >= 2) continue;
    chosen.push(item);
    counts.set(item.chunk.entityId, (counts.get(item.chunk.entityId) ?? 0) + 1);
  }
  return chosen;
}

/* ----------------------------------------------------------- 근거 커버리지 */

/**
 * 질문 어절이 최종 근거에 실제로 있는가. 질문어 사전 대신 근거 본문 자체와 대조한다.
 *  - 기능어(토크나이저 STOP 만 남는 어절)·프로젝트 이름·코퍼스 어디에나 있는 일반어는 세지 않는다.
 *  - 어절의 원형(조사 뗀 것)이나 별칭이 근거 토큰에 있으면 covered.
 *  - 활용형은 bigram 의 60% 이상(2개 이상)이 근거에 있으면 covered("선택했어요" ↔ "선택").
 *  - 나머지는 uncovered. "뭔데" 와 "혈액형" 은 여기서 똑같이 uncovered 다 — 그 둘을 가르는 일은
 *    언어를 이해하는 모델에게 넘긴다(프롬프트가 uncovered 어절을 명시하고, 사실을 묻는 말이면
 *    "기록돼 있지 않다" 고 말하게 한다). 사전으로 가르면 다음 구어체에서 또 깨진다.
 */
function evidenceCoverage(ix: Index, query: string, results: RetrievedChunk[], entityTokens: Set<string>): { covered: string[]; uncovered: string[] } {
  const evidence = new Set<string>();
  for (const r of results) for (const t of ix.byId.get(r.chunk.id)?.tf.keys() ?? []) evidence.add(t);
  const covered: string[] = [];
  const uncovered: string[] = [];
  for (const word of query.split(/\s+/)) {
    const toks = tokenizeQuery(word).filter((t) => !entityTokens.has(t));
    if (toks.length === 0) continue; // 기능어·프로젝트 이름뿐인 어절
    const head = toks[0];
    if (GENERIC.has(head)) continue;
    const grams = toks.filter((t) => isBigramOf(t, head));
    const wholes = toks.filter((t) => !isBigramOf(t, head));
    if (wholes.some((t) => evidence.has(t))) { covered.push(word); continue; }
    const hits = grams.filter((t) => evidence.has(t)).length;
    if (grams.length >= 2 && hits >= 2 && hits / grams.length >= 0.6) { covered.push(word); continue; }
    uncovered.push(word);
  }
  return { covered, uncovered };
}

function isBigramOf(token: string, head: string): boolean {
  return token.length === 2 && head.length >= 3 && head.includes(token);
}

/**
 * 코퍼스 어디에나 있어서 근거의 표지가 못 되는 말(질문의 의미를 판정하는 사전이 아니다). 이 말 하나가
 * 근거에 있다고 질문의 사실이 덮였다고 볼 수 없다 — "행가래의 월간 활성 사용자 수는?" 의 "사용자".
 */
const GENERIC = new Set([
  "김범석", "김범", "범석", "beomseok", "kim", "사람", "본인", "이분", "것", "때", "위해", "통해", "대해", "관련",
  "가장", "제일", "정말", "많이", "어떻게", "왜", "이유",
  "있는", "있어", "있었", "없는", "없어", "하는", "되는", "대한", "관한", "같은", "이런", "그런", "어떤",
  "여기", "지금", "보고", "보는", "현재", "이거", "이건", "그거", "무슨", "부분", "내용", "얘기", "이야기",
  "사용자", "사용", "용자",
]);

function isProfileChunk(c: RagChunk): boolean {
  return !c.projectId && (c.entityType === "profile" || c.entityType === "skill" || c.entityType === "experience" || c.entityType === "education");
}

export function projectTitle(id: ProjectId | null | undefined): string | null {
  return registryEntity(id)?.title ?? null;
}
