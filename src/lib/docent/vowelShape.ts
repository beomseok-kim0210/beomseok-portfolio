/**
 * 모음 모양 보조층 (Phase 4A, 실험).
 *
 * LAM 은 한국어 모음을 거의 가르지 못한다(2026-09-30 실측: ㅣ/ㅡ 의 가로 벌림이 ㅗ/ㅜ 와
 * 비슷하고, 평순 ㅓ·ㅡ 에도 오므림이 섞인다). 같은 합성의 모음 자모 시각(supertonic_align.
 * vowel_tokens)으로 모음마다 가로 벌림·원순 목표를 만들어 LAM 위에 얹는다. 턱과 아랫입술은
 * 건드리지 않는다 — 여는 양은 여전히 LAM 이다.
 *
 * 채널(0~1, 30 fps):
 *   vowelSpread  : ㅣ ㅡ ㅢ 1, ㅐ ㅒ ㅔ ㅖ 0.6
 *   vowelRound   : ㅗ ㅛ ㅜ ㅠ 1, ㅘ ㅙ ㅚ ㅝ ㅞ ㅟ 0.6
 *   vowelUnround : 평순 모음(ㅏ ㅑ ㅓ ㅕ ㅣ ㅡ ㅢ ㅐ ㅒ ㅔ ㅖ) 1 — LAM 의 잘못된 오므림을 누른다
 * 모음 하나의 지지: 앞 자모와의 중점 ~ 뒤 자모와의 중점(없으면 중심 ±60 ms), 양끝 40 ms
 * smoothstep. 겹치면 채널별 최댓값. 표기 자모 기준이지 음소가 아니다.
 */

export type VowelClass = "spread" | "spreadMid" | "open" | "round" | "roundGlide";

export interface VowelToken {
  t: number;
  cls: VowelClass | string;
  /** 모음 자모(중성, U+1161–U+1175). 열림 정도를 ㅏ/ㅓ, ㅗ/ㅜ 로 나눠 주려고 쓴다. */
  j?: string;
  prev?: number | null;
  next?: number | null;
}

export const VOWEL_CHANNEL_WEIGHTS: Record<VowelClass, { spread: number; round: number; unround: number }> = Object.freeze({
  spread: { spread: 1, round: 0, unround: 1 },
  spreadMid: { spread: 0.6, round: 0, unround: 1 },
  open: { spread: 0, round: 0, unround: 1 },
  round: { spread: 0, round: 1, unround: 0 },
  roundGlide: { spread: 0, round: 0.6, unround: 0 },
});

/**
 * 모음별 턱 열림 비율(Phase 4C, 0~1, ㅏ = 1). 표기 중성 기준. 없는 자모는 분류 기본값.
 * 근거: 한국어 모음의 개구도 순서 ㅏ > ㅐ·ㅓ > ㅔ·ㅗ > ㅜ > ㅣ·ㅡ. ㅣ·ㅡ 는 가로로 벌리되
 * 이가 보일 만큼만 연다(사람 검토: "이 할 때 이빨이 안 보여서 어색함").
 */
export const VOWEL_OPENNESS: Readonly<Record<string, number>> = Object.freeze({
  "ᅡ": 1.0, "ᅣ": 0.9, // ㅏ ㅑ
  "ᅢ": 0.75, "ᅤ": 0.7, // ㅐ ㅒ
  "ᅥ": 0.7, "ᅧ": 0.65, // ㅓ ㅕ
  "ᅦ": 0.6, "ᅨ": 0.55, // ㅔ ㅖ
  "ᅩ": 0.5, "ᅭ": 0.45, // ㅗ ㅛ
  "ᅪ": 0.85, "ᅫ": 0.7, "ᅬ": 0.5, // ㅘ ㅙ ㅚ
  "ᅮ": 0.35, "ᅲ": 0.35, // ㅜ ㅠ
  "ᅯ": 0.6, "ᅰ": 0.55, "ᅱ": 0.35, // ㅝ ㅞ ㅟ
  "ᅳ": 0.25, "ᅴ": 0.3, "ᅵ": 0.3, // ㅡ ㅢ ㅣ
});
const OPENNESS_BY_CLASS: Record<VowelClass, number> = { open: 0.85, spreadMid: 0.65, spread: 0.3, round: 0.45, roundGlide: 0.6 };
export function vowelOpenness(v: VowelToken): number {
  const byJamo = v.j ? VOWEL_OPENNESS[v.j] : undefined;
  return byJamo ?? OPENNESS_BY_CLASS[v.cls as VowelClass] ?? 0;
}

export const VOWEL_HALF_SPAN_FALLBACK = 0.06;
export const VOWEL_RAMP = 0.04;

/**
 * 모음 지지가 중심에서 뻗을 수 있는 최대 거리(초). 앞뒤 자모가 이보다 멀면 그 사이는 쉼이다.
 * 한 합성 안의 문장·쉼표 사이에는 0.3 s 이상의 무음이 들어가는데, 그 너머의 자모를 이웃으로
 * 쓰면 입이 쉼 내내 벌어진 채로 남는다(2026-10-01 사람 검토: "문장 사이 공백 동안 입을 벌리고
 * 있다"). 말하는 구간의 간격은 중앙값 0.06 s, p95 0.12 s 이고, 0.15 s 를 넘는 것은 거의
 * 모두 쉼이었다(자모 691 개 중 15 개).
 */
export const VOWEL_MAX_REACH = 0.15;

export interface VowelChannels {
  vowelSpread: number[];
  vowelRound: number[];
  vowelUnround: number[];
  /** 모음별 턱 열림 목표(0~1, ㅏ = 1) */
  vowelOpen: number[];
}

const smooth = (x: number) => x * x * (3 - 2 * x);
const finite = (x: unknown): x is number => typeof x === "number" && Number.isFinite(x);

export function vowelSupport(v: VowelToken): [number, number] {
  const s = finite(v.prev) && v.prev < v.t ? Math.max((v.prev + v.t) / 2, v.t - VOWEL_MAX_REACH) : v.t - VOWEL_HALF_SPAN_FALLBACK;
  const e = finite(v.next) && v.next > v.t ? Math.min((v.t + v.next) / 2, v.t + VOWEL_MAX_REACH) : v.t + VOWEL_HALF_SPAN_FALLBACK;
  return [s, e];
}

/**
 * 열림 채널의 지지(Phase 4C): 앞 자모 중심 ~ 뒤 자모 중심, 둘러싼 자음 사이 전체. 턱은 자음을 풀면서
 * 벌어져 다음 자음까지 이어진다 — 중점 지지(~50 ms)는 턱 감쇠 시상수(~55 ms)보다 짧아 목표에 닿지 못했다.
 */
export function vowelOpenSupport(v: VowelToken): [number, number] {
  const s = finite(v.prev) && v.prev < v.t ? Math.max(v.prev, v.t - VOWEL_MAX_REACH) : v.t - VOWEL_HALF_SPAN_FALLBACK;
  const e = finite(v.next) && v.next > v.t ? Math.min(v.next, v.t + VOWEL_MAX_REACH) : v.t + VOWEL_HALF_SPAN_FALLBACK;
  return [s, e];
}

export function vowelEnvelope(v: VowelToken, t: number, support: [number, number] = vowelSupport(v)): number {
  const [s, e] = support;
  if (t >= s && t <= e) return 1;
  const d = t < s ? s - t : t - e;
  return d < VOWEL_RAMP ? 1 - smooth(d / VOWEL_RAMP) : 0;
}

/**
 * 열림 채널의 선행(Phase 4D). 모음 주도 턱 목표는 소리와 정렬돼 있어 감쇠(λ18, 시상수 ~55 ms)를 거치면
 * 렌더된 턱이 소리보다 늦는다(4C 실측 +30~50 ms). 열림 지지만 이만큼 앞당긴다. 다른 채널·게이트는 그대로.
 */
export const VOWEL_OPEN_LEAD = 0.06;

/**
 * w-이중모음을 원순 시작 + 핵 모음으로 나눈다(Phase 4D, 사람 검토: "ㅙ·ㅞ 는 ㅗ/ㅜ 에서 ㅐ/ㅔ 로 빠르게").
 * ㅚ 는 표준 발음 [we] 로 ㅗ+ㅔ. 시작부는 모양 지지의 앞 40 %.
 */
export const W_DIPHTHONGS: Readonly<Record<string, readonly [string, string]>> = Object.freeze({
  "ᅪ": ["ᅩ", "ᅡ"], "ᅫ": ["ᅩ", "ᅢ"], "ᅬ": ["ᅩ", "ᅦ"], // ㅘ ㅙ ㅚ
  "ᅯ": ["ᅮ", "ᅥ"], "ᅰ": ["ᅮ", "ᅦ"], "ᅱ": ["ᅮ", "ᅵ"], // ㅝ ㅞ ㅟ
});
export const GLIDE_ONSET_SHARE = 0.4;
const SIMPLE_CLASS: Readonly<Record<string, VowelClass>> = { "ᅩ": "round", "ᅮ": "round", "ᅡ": "open", "ᅥ": "open", "ᅢ": "spreadMid", "ᅦ": "spreadMid", "ᅵ": "spread" };

export interface VowelChannelOptions {
  /** 열림 지지 선행(초). 기본 VOWEL_OPEN_LEAD */
  openLead?: number;
  /** w-이중모음 분할. 기본 true */
  glides?: boolean;
}

interface VowelPart {
  w: { spread: number; round: number; unround: number };
  open: number;
  shape: [number, number];
  openSupport: [number, number];
}

function vowelParts(v: VowelToken, glides: boolean): VowelPart[] {
  const shape = vowelSupport(v), openSupport = vowelOpenSupport(v);
  const pair = glides && v.j ? W_DIPHTHONGS[v.j] : undefined;
  if (!pair) return [{ w: VOWEL_CHANNEL_WEIGHTS[v.cls as VowelClass], open: vowelOpenness(v), shape, openSupport }];
  const split = shape[0] + GLIDE_ONSET_SHARE * (shape[1] - shape[0]);
  return pair.map((j, k) => {
    const cls = SIMPLE_CLASS[j];
    return {
      w: VOWEL_CHANNEL_WEIGHTS[cls],
      open: vowelOpenness({ t: v.t, cls, j }),
      shape: (k === 0 ? [shape[0], split] : [split, shape[1]]) as [number, number],
      openSupport: (k === 0 ? [openSupport[0], split] : [split, openSupport[1]]) as [number, number],
    };
  });
}

export function buildVowelChannels(vowels: readonly VowelToken[], durationSeconds: number, fps = 30, opts: VowelChannelOptions = {}): VowelChannels {
  if (!finite(durationSeconds) || durationSeconds < 0) return { vowelSpread: [], vowelRound: [], vowelUnround: [], vowelOpen: [] };
  const lead = finite(opts.openLead) ? opts.openLead : VOWEL_OPEN_LEAD;
  const parts = vowels.filter((v) => finite(v.t) && v.cls in VOWEL_CHANNEL_WEIGHTS).flatMap((v) => vowelParts(v, opts.glides ?? true));
  const n = Math.ceil(durationSeconds * fps) + 1;
  const out: VowelChannels = { vowelSpread: new Array(n).fill(0), vowelRound: new Array(n).fill(0), vowelUnround: new Array(n).fill(0), vowelOpen: new Array(n).fill(0) };
  const env = (t: number, [s, e]: [number, number]) => vowelEnvelope({ t: s, cls: "" }, t, [s, e]);
  for (let i = 0; i < n; i++) {
    const t = i / fps;
    for (const p of parts) {
      const e = env(t, p.shape);
      out.vowelSpread[i] = Math.max(out.vowelSpread[i], e * p.w.spread);
      out.vowelRound[i] = Math.max(out.vowelRound[i], e * p.w.round);
      out.vowelUnround[i] = Math.max(out.vowelUnround[i], e * p.w.unround);
      out.vowelOpen[i] = Math.max(out.vowelOpen[i], env(t + lead, p.openSupport) * p.open);
    }
    out.vowelSpread[i] = Math.round(out.vowelSpread[i] * 1e4) / 1e4;
    out.vowelRound[i] = Math.round(out.vowelRound[i] * 1e4) / 1e4;
    out.vowelUnround[i] = Math.round(out.vowelUnround[i] * 1e4) / 1e4;
    out.vowelOpen[i] = Math.round(out.vowelOpen[i] * 1e4) / 1e4;
  }
  return out;
}

/**
 * 워커의 모음 토큰으로 채널을 만들어 LAM 프레임에 인덱스로 싣는다. 토큰이 없거나 이상하면
 * 프레임을 그대로 돌려준다 — 그러면 융합은 모음층 이전과 같다.
 */
export function attachVowelChannels<F extends object>(
  frames: F[],
  vowels: unknown,
  durationSeconds: number,
  timelineFps: number,
): { attached: boolean; frames: F[] } {
  if (!Array.isArray(vowels) || vowels.length === 0 || timelineFps !== 30) return { attached: false, frames };
  const ok = vowels.every((v) => v && typeof v === "object" && finite((v as VowelToken).t) && typeof (v as VowelToken).cls === "string");
  if (!ok) return { attached: false, frames };
  const ch = buildVowelChannels(vowels as VowelToken[], durationSeconds, timelineFps);
  if (ch.vowelSpread.length + 2 < frames.length) return { attached: false, frames };
  return {
    attached: true,
    frames: frames.map((f, i) => ({ ...f, vowelSpread: ch.vowelSpread[i] ?? 0, vowelRound: ch.vowelRound[i] ?? 0, vowelUnround: ch.vowelUnround[i] ?? 0, vowelOpen: ch.vowelOpen[i] ?? 0 })),
  };
}
