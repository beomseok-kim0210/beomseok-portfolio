"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Mic, RotateCcw, SendHorizontal, Volume2, VolumeX } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { docentConfig, docentCopy, docentStarterQuestions } from "@/data/docent";
import type { DocentChatState } from "./useDocentChat";
import type { VoiceState } from "./useVoice";
import type { DocentFailure } from "@/types/docent";
import { ACTIVATION_PENDING_COPY, DOCENT_STATUS_COPY, resolveDocentSurfaceStatus } from "./docentStatus";
import { stripEmphasisForDisplay } from "@/lib/docent/displayText";

type ChatPanelProps = DocentChatState & {
  voice: VoiceState;
  compact?: boolean;
  fill?: boolean;
  focusInputToken?: number;
  /** 3D 얼굴이 돌아오는 중 — 이때 들어온 질문에는 "곧 활성화" 안내를 보인다. */
  avatarRecovering?: boolean;
};

function VoiceLifecycleIndicator({ voice }: { voice: VoiceState }) {
  const reduceMotion = useReducedMotion();
  const [showReady, setShowReady] = useState(false);

  useEffect(() => {
    if (voice.lifecycle !== "VOICE_READY") {
      setShowReady(false);
      return;
    }
    setShowReady(true);
    const timer = setTimeout(() => setShowReady(false), 2_500);
    return () => clearTimeout(timer);
  }, [voice.lifecycle]);

  const visible = voice.lifecycle !== "VOICE_OFF"
    && (voice.lifecycle !== "VOICE_READY" || showReady)
    && Boolean(voice.statusMessage);
  const active = voice.lifecycle === "VOICE_WARMING"
    || voice.lifecycle === "VOICE_DELAYED"
    || voice.lifecycle === "VOICE_SYNTHESIZING";
  const dotColor = voice.lifecycle === "VOICE_ERROR" ? "bg-amber-300" : "bg-blue-300";

  return (
    <div
      role="status"
      aria-live="polite"
      aria-atomic="true"
      data-voice-status={voice.lifecycle}
      className="min-h-4"
    >
      <AnimatePresence mode="wait" initial={false}>
        {visible ? (
          <motion.div
            key={`${voice.lifecycle}:${voice.statusMessage}`}
            initial={reduceMotion ? false : { opacity: 0, y: 2 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -2 }}
            transition={{ duration: reduceMotion ? 0 : 0.18 }}
            className="flex max-w-[min(58vw,24rem)] items-center justify-end gap-2 text-right text-[11px] leading-4 text-slate-400"
          >
            <span
              aria-hidden="true"
              className={`h-1.5 w-1.5 shrink-0 rounded-full ${dotColor} ${active ? "animate-pulse motion-reduce:animate-none" : ""}`}
            />
            <span>{voice.statusMessage}</span>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

function FailureRecovery({
  failure,
  retry,
  continueTextOnly,
  send,
}: {
  failure: DocentFailure;
  retry: () => void;
  continueTextOnly: () => void;
  send: (text: string) => void;
}) {
  const [now, setNow] = useState(Date.now());
  const waitSeconds = failure.retryAt
    ? Math.max(0, Math.ceil((failure.retryAt - now) / 1000))
    : 0;

  useEffect(() => {
    if (!failure.retryAt || failure.retryAt <= Date.now()) return;
    const timer = setInterval(() => setNow(Date.now()), 1_000);
    return () => clearInterval(timer);
  }, [failure.retryAt]);

  return (
    <div
      className="mt-2 max-w-[92%] rounded-xl border border-amber-300/20 bg-amber-300/[0.07] p-3 text-xs text-amber-50"
      data-docent-failure={failure.stage}
    >
      {/* 단계 이름은 진단용이다 — data-docent-failure 로만 남기고 방문자에게 보이지 않는다. */}
      <p className="leading-5">{failure.message}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        <button type="button" onClick={retry} disabled={waitSeconds > 0} className="inline-flex items-center gap-1.5 rounded-full border border-amber-200/25 px-3 py-1.5 text-amber-100 disabled:cursor-wait disabled:opacity-45">
          <RotateCcw className="h-3 w-3" />
          {waitSeconds > 0 ? `${waitSeconds}초 후 다시 시도` : "다시 시도"}
        </button>
        <button type="button" onClick={continueTextOnly} disabled={waitSeconds > 0} className="rounded-full border border-white/15 px-3 py-1.5 text-slate-200 disabled:cursor-wait disabled:opacity-45">
          텍스트로 계속
        </button>
      </div>
      <div className="mt-3 flex flex-wrap gap-1.5" aria-label="추천 질문">
        {docentStarterQuestions.slice(0, 2).map((question) => (
          <button key={question} type="button" onClick={() => send(question)} className="rounded-full bg-white/[0.06] px-2.5 py-1 text-left text-[11px] text-slate-300 hover:bg-white/[0.1]">
            {question}
          </button>
        ))}
      </div>
    </div>
  );
}

export function ChatPanel({
  messages,
  isStreaming,
  mode,
  send,
  retryLast,
  requestState,
  voice,
  lastAnswer,
  compact = false,
  fill = false,
  focusInputToken = 0,
  avatarRecovering = false,
}: ChatPanelProps) {
  const reduceMotion = useReducedMotion();
  const [input, setInput] = useState("");
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const nearBottomRef = useRef(true);
  const surfaceStatus = resolveDocentSurfaceStatus(requestState.status, voice.lifecycle);
  const surfaceStage = voice.failureStage
    ?? (voice.lifecycle === "VOICE_WARMING" || voice.lifecycle === "VOICE_DELAYED" ? "voice_warm" : null)
    ?? (voice.lifecycle === "VOICE_SYNTHESIZING" || voice.lifecycle === "VOICE_SPEAKING" ? "tts" : null)
    ?? requestState.stage;

  // 사용자가 위로 스크롤해 읽는 중이면 자동 스크롤하지 않는다.
  const handleScroll = () => {
    const el = listRef.current;
    if (!el) return;
    nearBottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
  };

  const lastContent = messages[messages.length - 1]?.content;
  useEffect(() => {
    const el = listRef.current;
    if (el && nearBottomRef.current) el.scrollTop = el.scrollHeight;
  }, [messages.length, lastContent]);

  useEffect(() => {
    if (focusInputToken > 0) inputRef.current?.focus();
  }, [focusInputToken]);

  const submit = () => {
    if (isStreaming) return;
    const text = input.trim();
    if (!text) return;
    setInput("");
    send(text);
  };

  const handleMic = () => {
    if (voice.listening) {
      voice.stopListening();
      return;
    }
    voice.startListening((transcript) => {
      setInput("");
      send(transcript);
    });
  };

  return (
    <div
      className={fill
        ? "flex h-full min-h-0 flex-1 flex-col rounded-[26px] border border-white/10 bg-white/[0.04] shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] backdrop-blur-sm lg:rounded-[32px]"
        : compact
          ? "flex h-[52vh] min-h-[360px] flex-col rounded-[24px] border border-white/10 bg-white/[0.04] backdrop-blur-sm"
        : "flex h-[60vh] min-h-[420px] flex-col rounded-[32px] border border-white/10 bg-white/[0.04] backdrop-blur-sm lg:h-[560px]"}
      data-docent-mode={mode ?? ""}
      data-docent-grounded={lastAnswer ? String(lastAnswer.grounded) : ""}
      data-docent-active-project={lastAnswer?.activeProject ?? ""}
    >
      <div className="flex items-center justify-between border-b border-white/10 px-4 py-3 sm:px-6 sm:py-4">
        <p className="hidden small-label text-slate-400 sm:block">Ask the docent</p>
        <div className="flex items-center gap-2">
          {mode === "fallback" ? (
            <span
              title={docentCopy.demoNotice}
              className="rounded-full border border-amber-400/40 bg-amber-400/10 px-3 py-1 text-xs font-medium text-amber-300"
            >
              {docentCopy.demoBadge}
            </span>
          ) : mode === "evidence" ? (
            <span
              title={docentCopy.evidenceNotice}
              className="rounded-full border border-emerald-400/40 bg-emerald-400/10 px-3 py-1 text-xs font-medium text-emerald-300"
            >
              {docentCopy.evidenceBadge}
            </span>
          ) : null}
          {voice.ttsSupported ? <VoiceLifecycleIndicator voice={voice} /> : null}
          {voice.ttsSupported ? (
            <button
              type="button"
              onClick={voice.toggleVoice}
              aria-pressed={voice.voiceEnabled}
              aria-label={voice.voiceEnabled ? "음성 답변 끄기" : "음성 답변 켜기"}
              title={voice.voiceEnabled ? "음성 답변 켜짐" : "음성 답변 꺼짐"}
              className={
                voice.voiceEnabled
                  ? "inline-flex h-8 w-8 items-center justify-center rounded-full border border-blue-400/50 bg-blue-400/15 text-blue-300"
                  : "inline-flex h-8 w-8 items-center justify-center rounded-full border border-white/15 bg-white/[0.06] text-slate-400 transition-colors hover:text-slate-200"
              }
            >
              {voice.voiceEnabled ? (
                <Volume2 className="h-4 w-4" />
              ) : (
                <VolumeX className="h-4 w-4" />
              )}
            </button>
          ) : null}
        </div>
      </div>

      <div
        role="status"
        aria-live="polite"
        data-docent-status={surfaceStatus}
        data-docent-stage={surfaceStage}
        className="flex min-h-9 shrink-0 items-center gap-2 border-b border-white/[0.07] bg-sky-300/[0.035] px-4 text-[11px] text-slate-400 sm:px-6"
      >
        <span aria-hidden="true" className={`h-1.5 w-1.5 rounded-full ${surfaceStatus === "failed" ? "bg-amber-300" : surfaceStatus === "ready" ? "bg-emerald-300" : "bg-sky-300"} ${surfaceStatus === "searching" || surfaceStatus === "answering" || surfaceStatus === "warming_voice" || surfaceStatus === "delayed" ? "animate-pulse motion-reduce:animate-none" : ""}`} />
        <span>
          {avatarRecovering && surfaceStatus !== "ready" && surfaceStatus !== "failed"
            ? ACTIVATION_PENDING_COPY
            : DOCENT_STATUS_COPY[surfaceStatus]}
        </span>
        {voice.voiceEnabled && requestState.status !== "ready" ? (
          <span className="ml-auto hidden text-slate-500 sm:inline">텍스트 우선</span>
        ) : null}
      </div>

      {/* overflow-x 를 명시하지 않으면 y축이 auto 인 순간 x축도 auto 로 계산된다 —
          긴 URL 하나에 가로 스크롤바가 생긴다. 대화 목록은 세로로만 스크롤한다. */}
      <div
        ref={listRef}
        onScroll={handleScroll}
        data-lenis-prevent
        className="mx-auto w-full max-w-[860px] flex-1 space-y-4 overflow-y-auto overflow-x-hidden overscroll-contain px-4 pb-4 pt-5 sm:px-6 sm:pb-6 sm:pt-6 lg:px-8 lg:pb-8 lg:pt-8"
      >
        {messages.length === 0 ? (
          <div className="flex min-h-full flex-col justify-end gap-2" data-docent-starters>
            <p className="mb-2 text-sm text-slate-400">
              이런 질문으로 시작해 보세요:
            </p>
            {docentStarterQuestions.map((q) => (
              <button
                key={q}
                type="button"
                onClick={() => send(q)}
                className="w-fit rounded-full border border-white/15 bg-white/[0.06] px-4 py-2 text-left text-sm text-slate-200 transition-colors hover:border-blue-400/50 hover:bg-blue-400/10"
              >
                {q}
              </button>
            ))}
          </div>
        ) : (
          <AnimatePresence initial={false}>
            {messages.map((message, index) => {
              const isUser = message.role === "user";
              const isLast = index === messages.length - 1;
              const showCaret = isLast && !isUser && isStreaming;
              const failure = !isUser ? message.failure : undefined;
              return (
                <motion.div
                  key={index}
                  initial={reduceMotion ? { opacity: 1 } : { opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.25 }}
                  className={isUser ? "flex justify-end" : "flex flex-col items-start"}
                >
                  {message.content || showCaret ? <div
                    className={
                      isUser
                        ? "max-w-[85%] break-words rounded-2xl rounded-br-md bg-blue-500/90 px-4 py-3 text-sm leading-relaxed text-white"
                        : "max-w-[85%] break-words rounded-2xl rounded-bl-md border border-white/10 bg-white/[0.07] px-4 py-3 text-sm leading-relaxed text-slate-100"
                    }
                  >
                    {/* 아직 한 글자도 오지 않은 동안 커서만 두면 입력칸처럼 보인다 —
                        기다리는 중이라는 걸 점 세 개로 말한다. */}
                    {!message.content && showCaret ? (
                      <span className="flex items-center gap-1 py-0.5" role="status" aria-label="답변을 작성하는 중이에요">
                        {[0, 160, 320].map((delay) => (
                          <span
                            key={delay}
                            aria-hidden="true"
                            className="h-1.5 w-1.5 animate-pulse rounded-full bg-slate-400 motion-reduce:animate-none"
                            style={{ animationDelay: `${delay}ms`, animationDuration: "1.1s" }}
                          />
                        ))}
                      </span>
                    ) : (
                      <>
                        {(isUser ? message.content : stripEmphasisForDisplay(message.content)) || "…"}
                        {showCaret ? (
                          <span className="ml-0.5 inline-block h-4 w-[2px] animate-pulse bg-blue-300 align-middle motion-reduce:animate-none" />
                        ) : null}
                      </>
                    )}
                  </div> : null}
                  {failure ? (
                    <FailureRecovery
                      failure={failure}
                      retry={retryLast}
                      continueTextOnly={() => {
                        voice.disableVoice();
                        retryLast();
                      }}
                      send={send}
                    />
                  ) : null}
                </motion.div>
              );
            })}
          </AnimatePresence>
        )}
      </div>

      <form
        onSubmit={(event) => {
          event.preventDefault();
          submit();
        }}
        className="border-t border-white/10 p-3 sm:p-4"
      >
        <div className="mx-auto flex w-full max-w-[860px] items-center gap-2 rounded-full border border-white/15 bg-white/[0.06] pl-5 pr-2">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder={
              voice.listening ? docentCopy.listeningPlaceholder : docentCopy.inputPlaceholder
            }
            maxLength={docentConfig.maxInputLength}
            disabled={isStreaming || voice.listening}
            className="h-12 flex-1 bg-transparent text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none disabled:opacity-50"
            aria-label="도슨트에게 질문하기"
          />
          {voice.sttSupported ? (
            <button
              type="button"
              onClick={handleMic}
              disabled={isStreaming}
              aria-pressed={voice.listening}
              aria-label={voice.listening ? "음성 입력 중지" : "음성으로 질문하기"}
              className={
                voice.listening
                  ? "inline-flex h-9 w-9 animate-pulse items-center justify-center rounded-full bg-red-500 text-white"
                  : "inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/15 bg-white/[0.06] text-slate-300 transition-colors hover:text-white disabled:opacity-30"
              }
            >
              <Mic className="h-4 w-4" />
            </button>
          ) : null}
          <button
            type="submit"
            disabled={isStreaming || !input.trim()}
            aria-label="질문 보내기"
            className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-blue-500 text-white transition-opacity disabled:opacity-30"
          >
            <SendHorizontal className="h-4 w-4" />
          </button>
        </div>
      </form>
    </div>
  );
}
