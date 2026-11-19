/**
 * 모델 출력 스트림에서 프로토콜 표지를 걷어내는 파서. 감정 태그는 메타데이터이지 방문자가 보거나
 * 듣는 글이 아니다.
 *
 * 운영에서 `<emotion>neutral</emotion>` 이 화면에 나왔다. 예전 라우트는 응답 맨 앞의 태그 하나만
 * 정규식으로 떼고, 그 뒤 델타는 그대로 흘렸다 — 모델이 태그를 늦게 쓰거나, 두 번 쓰거나, 앞에 글이
 * 64자 넘게 오면 태그가 그대로 나갔다. 델타 하나에 정규식을 적용하는 방식은 태그가 델타 경계에서
 * 쪼개지면("<emo" + "tion>smile</emo" + "tion>") 어차피 못 잡는다.
 *
 * 그래서 문자 단위 상태 기계로 처리한다:
 *  - `<` 를 만나면 그 뒤가 태그의 앞부분일 수 있는 동안 내보내지 않고 붙잡는다.
 *  - 완성된 `<emotion>값</emotion>` 은 버리고, 첫 값만 감정으로 쓴다(늦게 오거나 중복된 태그도 버린다).
 *  - 짝 없는 `</emotion>`, `<emotion>값` 뒤에 닫는 태그 없이 글이 이어지는 경우도 표지만 버린다.
 *  - 속성형으로 흐트러진 태그(`<emotion=smile>` — 운영에서 실제로 나갔다)도 같은 표지로 본다.
 *  - `<evidence>` 구분자와 `[E3]` 근거 번호도 같은 방식으로 버린다(프롬프트 표지).
 *  - 태그가 아닌 `<`(예: "1 < 2")는 그대로 내보낸다.
 * 스트림이 끝나면 붙잡고 있던 것 중 태그가 될 수 없는 글은 내보낸다.
 */
import { isDocentEmotion, type DocentEmotion } from "@/types/docent";

const OPEN = "<emotion>";
const CLOSE = "</emotion>";
const NAME = "<emotion";
const CLOSE_NAME = "</emotion";
const EVIDENCE_TAGS = ["<evidence>", "</evidence>"];
const MAX_VALUE = 24;
/** 속성형 태그("<emotion=smile>", "<emotion value=\"smile\"/>")에서 ">" 를 기다리는 최대 길이. */
const MAX_TAG = 48;

type Match =
  | { kind: "partial" }
  | { kind: "none" }
  | { kind: "drop"; length: number; emotion?: string };

/**
 * s 는 "<" 또는 "[" 로 시작한다. 그 자리에서 프로토콜 표지를 찾는다.
 * 감정 태그는 모델이 형식을 자주 흐트린다 — 운영에서 "<emotion=smile>" 이 그대로 나갔다. 그래서
 * "<emotion" 으로 시작해 ">" 로 끝나는 것은 모양과 상관없이 표지로 보고, 안의 첫 단어를 값으로 쓴다.
 */
function matchAt(s: string): Match {
  const lower = s.toLowerCase();
  if (lower.startsWith("<")) {
    for (const tag of EVIDENCE_TAGS) {
      if (lower.startsWith(tag)) return { kind: "drop", length: tag.length };
      if (tag.startsWith(lower)) return { kind: "partial" };
    }
    // 닫는 태그(짝 없이 남은 것 포함): "</emotion>" 또는 "</emotion >"
    if (lower.startsWith(CLOSE_NAME)) {
      const gt = lower.indexOf(">");
      if (gt >= 0 && gt < MAX_TAG) return { kind: "drop", length: gt + 1 };
      return lower.length < MAX_TAG ? { kind: "partial" } : { kind: "drop", length: CLOSE_NAME.length };
    }
    if (CLOSE_NAME.startsWith(lower) || NAME.startsWith(lower)) return { kind: "partial" };
    if (!lower.startsWith(NAME)) return { kind: "none" };

    const next = lower[NAME.length];
    if (next === undefined) return { kind: "partial" };
    if (/[a-z0-9]/.test(next)) return { kind: "none" }; // "<emotional" — 다른 단어다

    if (next === ">") {
      // 짝형: <emotion>값</emotion>
      const after = lower.slice(OPEN.length);
      const m = /^\s*([a-z_]*)\s*/.exec(after)!;
      const valueEnd = OPEN.length + m[0].length;
      const tail = lower.slice(valueEnd);
      if (tail.startsWith(CLOSE)) return { kind: "drop", length: valueEnd + CLOSE.length, emotion: m[1] };
      if (tail.length === 0 || CLOSE.startsWith(tail)) {
        return m[1].length > MAX_VALUE ? { kind: "drop", length: valueEnd, emotion: m[1] } : { kind: "partial" };
      }
      // 닫는 태그 없이 글이 이어진다 — 여는 태그와 값만 버린다
      return { kind: "drop", length: valueEnd, emotion: m[1] };
    }

    // 속성형: <emotion=smile>, <emotion: smile>, <emotion value="smile"/>, <emotion smile>
    const gt = lower.indexOf(">");
    if (gt < 0) return lower.length < MAX_TAG ? { kind: "partial" } : { kind: "drop", length: NAME.length };
    if (gt >= MAX_TAG) return { kind: "drop", length: NAME.length };
    const inside = lower.slice(NAME.length, gt);
    const words = inside.match(/[a-z_]+/g) ?? [];
    const value = words.find((w) => w !== "value" && w !== "type" && w !== "name") ?? "";
    return { kind: "drop", length: gt + 1, emotion: value };
  }
  if (s.startsWith("[")) {
    const m = /^\[E(\d{0,3})(\]?)/.exec(s);
    if (!m) return s.length === 1 ? { kind: "partial" } : { kind: "none" };
    if (m[2] === "]" && m[1].length > 0) return { kind: "drop", length: m[0].length };
    // "[E1" 까지 왔고 뒤가 아직 없다
    return m[0].length === s.length && m[1].length < 3 ? { kind: "partial" } : { kind: "none" };
  }
  return { kind: "none" };
}

export interface ProtocolChunk {
  /** 방문자에게 보내도 되는 글(비어 있을 수 있다). */
  text: string;
  /** 이번에 처음 확정된 감정. 한 스트림에서 한 번만 나온다. */
  emotion?: DocentEmotion;
}

export class ProtocolStreamParser {
  private pending = "";
  private emotionSeen = false;
  /** 아직 보이는 글을 하나도 내보내지 않았다 — 태그 뒤 앞쪽 공백을 버리기 위해. */
  private atStart = true;

  push(delta: string): ProtocolChunk {
    this.pending += delta;
    return this.drain(false);
  }

  end(): ProtocolChunk {
    return this.drain(true);
  }

  private drain(final: boolean): ProtocolChunk {
    let out = "";
    let emotion: DocentEmotion | undefined;
    let s = this.pending;
    for (;;) {
      const i = s.search(/[<[]/);
      if (i < 0) { out += s; s = ""; break; }
      out += s.slice(0, i);
      s = s.slice(i);
      const m = matchAt(s);
      if (m.kind === "drop") {
        if (m.emotion !== undefined && !this.emotionSeen) {
          this.emotionSeen = true;
          emotion = isDocentEmotion(m.emotion) ? m.emotion : "neutral";
        }
        s = s.slice(m.length);
        // 글 사이의 표지를 뺀 자리에 공백이 겹치지 않게 — "안녕 <emotion>x</emotion> 끝" → "안녕 끝"
        if (/\s$/.test(out) && /^[^\S\n]/.test(s)) s = s.replace(/^[^\S\n]+/, "");
        continue;
      }
      if (m.kind === "partial" && !final) break; // 다음 델타를 기다린다
      // 스트림이 끝났는데 표지가 미완성("…<emotion")이면 표지 조각으로 보고 버린다. "<" 한 글자는 글이다.
      if (m.kind === "partial" && s.length >= 2) { s = ""; break; }
      // 태그가 아니다 — 한 글자 내보내고 계속
      out += s[0];
      s = s.slice(1);
    }
    this.pending = s;
    if (this.atStart) {
      out = out.replace(/^\s+/, "");
      if (out) this.atStart = false;
    }
    return { text: out, emotion };
  }
}

/**
 * 문자열 하나를 정리한다(클라이언트 표시·TTS 방어선). 스트리밍 중인 글이면 holdPartial 로
 * 끝에 걸린 미완성 표지("<emo")를 숨긴다 — 다음 델타가 오면 완성되거나 글로 풀린다.
 */
export function stripProtocolMarkers(text: string, options: { holdPartial?: boolean } = {}): string {
  if (!/[<[]/.test(text)) return text;
  const p = new ProtocolStreamParser();
  const a = p.push(text);
  return options.holdPartial ? a.text : a.text + p.end().text;
}

/**
 * 라이브 답변 스트림: 모델 델타 → (감정 메타 1회) + 보이는 글 델타. 메타는 감정 태그가 확정되거나,
 * 태그 없이 보이는 글이 holdChars 를 넘거나, 스트림이 끝날 때 한 번 나간다. 그 전의 글은 붙잡았다가
 * 메타 뒤에 내보낸다 — 클라이언트는 메타를 받은 뒤 글을 그리므로 표정과 첫 문장이 어긋나지 않는다.
 */
/**
 * 한국어 문장이 끝난 뒤 스트림 끝에 붙는 뜻 없는 영문 한 단어("…시스템입니다. sermitsiaq")를 걸러 낸다.
 * gpt-5.6-luna 가 가끔 내는 글리치 토큰이다(2026-11-19 운영에서 재현). 화면과 음성에 그대로 나가므로
 * 한글 종결 뒤에 오는 영문 한 단어는 다음 글이 올 때까지 붙잡아 두고, 그대로 스트림이 끝나면 버린다.
 * 영어 답변(한글 종결이 없음)과 "…입니다. ARMI는" 처럼 이어지는 글에는 영향이 없다.
 */
export class TrailingGlitchFilter {
  private tail = "";
  private readonly onText: (text: string) => void;
  private lastChar = "";

  constructor(onText: (text: string) => void) {
    this.onText = onText;
  }

  push(text: string): void {
    if (!text) return;
    const combined = this.tail + text;
    // 한글 + 문장부호 뒤, 공백과 라틴 문자만 남은 꼬리.
    const match = /(?<=[가-힣][.!?。]["'”’)]?)(\s*[A-Za-z]*)$/.exec(this.lastChar + combined);
    const tailLen = match ? match[1].length : 0;
    const safe = tailLen > 0 ? combined.slice(0, combined.length - tailLen) : combined;
    this.tail = tailLen > 0 ? combined.slice(combined.length - tailLen) : "";
    if (safe) {
      this.onText(safe);
      this.lastChar = (this.lastChar + safe).slice(-3);
    }
  }

  /** 스트림 끝. 붙잡아 둔 꼬리가 영문 한 단어뿐이면 버린다. 버렸으면 true. */
  end(): boolean {
    const tail = this.tail;
    this.tail = "";
    if (!tail) return false;
    if (/^\s*[A-Za-z]{2,}\s*$/.test(tail)) return true;
    this.onText(tail);
    return false;
  }
}

export class VisibleAnswerStream {
  private readonly parser = new ProtocolStreamParser();
  private held = "";
  private metaSent = false;
  private visible = "";
  private readonly onMeta: (emotion: DocentEmotion) => void;
  private readonly onText: (text: string) => void;
  private readonly holdChars: number;
  private readonly glitch: TrailingGlitchFilter;
  /** 스트림 끝의 글리치 토큰을 버렸는지 (로그용). */
  droppedGlitch = false;

  constructor(onMeta: (emotion: DocentEmotion) => void, onText: (text: string) => void, holdChars = 64) {
    this.onMeta = onMeta;
    this.onText = onText;
    this.holdChars = holdChars;
    this.glitch = new TrailingGlitchFilter((text) => {
      this.visible += text;
      this.onText(text);
    });
  }

  get started(): boolean {
    return this.metaSent;
  }

  /** 지금까지 방문자에게 보낸 글 전체. */
  get text(): string {
    return this.visible;
  }

  push(delta: string): void {
    this.accept(this.parser.push(delta));
  }

  end(): void {
    this.accept(this.parser.end());
    if (!this.metaSent) this.start("neutral");
    this.droppedGlitch = this.glitch.end();
  }

  /** 모델이 아무 글도 내지 않았을 때 대신 채울 글. 메타 뒤에만 부른다. */
  emit(text: string): void {
    if (!text) return;
    this.visible += text;
    this.onText(text);
  }

  private accept({ text, emotion }: ProtocolChunk): void {
    if (this.metaSent) {
      this.glitch.push(text);
      return;
    }
    this.held += text;
    if (emotion) this.start(emotion);
    else if (this.held.length > this.holdChars) this.start("neutral");
  }

  private start(emotion: DocentEmotion): void {
    this.onMeta(emotion);
    this.metaSent = true;
    const pending = this.held;
    this.held = "";
    this.glitch.push(pending);
  }
}
