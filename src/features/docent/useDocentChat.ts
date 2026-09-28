"use client";

import { useCallback, useEffect, useReducer, useRef, useState } from "react";
import { docentConfig } from "@/data/docent";
import type {
  DocentChatMessage,
  DocentEmotion,
  DocentFailure,
  DocentMode,
  DocentPageContext,
  DocentSource,
  DocentStreamEvent,
  DocentTimings,
} from "@/types/docent";
import {
  failureFromResponse,
  failureFromStreamError,
  preserveAssistantFailure,
  safeFailureMessage,
} from "./chatFailure";
import {
  docentRequestReducer,
  initialDocentRequestState,
  type DocentRequestState,
} from "./docentStatus";

interface UseDocentChatOptions {
  onEmotion: (emotion: DocentEmotion) => void;
  pageContext?: DocentPageContext;
}

export interface DocentLastAnswerDebug {
  grounded: boolean;
  activeProject: string | null;
  sources: DocentSource[];
  timings: DocentTimings | null;
  provider: "openai" | "anthropic" | "none" | null;
}

export interface DocentChatState {
  messages: DocentChatMessage[];
  isStreaming: boolean;
  mode: DocentMode | null;
  send: (text: string) => void;
  retryLast: () => void;
  requestState: DocentRequestState;
  lastAnswer: DocentLastAnswerDebug | null;
}

export function useDocentChat({ onEmotion, pageContext }: UseDocentChatOptions): DocentChatState {
  const [messages, setMessages] = useState<DocentChatMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [mode, setMode] = useState<DocentMode | null>(null);
  const [lastAnswer, setLastAnswer] = useState<DocentLastAnswerDebug | null>(null);
  const [requestState, dispatchRequest] = useReducer(docentRequestReducer, initialDocentRequestState);
  const abortRef = useRef<AbortController | null>(null);
  const delayTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastQuestionRef = useRef("");
  const pageRef = useRef(pageContext);
  pageRef.current = pageContext;

  useEffect(() => () => {
    abortRef.current?.abort();
    if (delayTimerRef.current) clearTimeout(delayTimerRef.current);
  }, []);

  const send = useCallback(
    (text: string) => {
      const question = text.trim();
      if (!question || abortRef.current) return;

      const history: DocentChatMessage[] = [
        ...messages.map(({ role, content }) => ({ role, content })),
        { role: "user" as const, content: question },
      ].slice(-docentConfig.maxHistoryMessages);
      lastQuestionRef.current = question;

      setMessages((prev) => [
        ...prev,
        { role: "user", content: question },
        { role: "assistant", content: "" },
      ]);
      setIsStreaming(true);
      setLastAnswer(null);
      dispatchRequest({ type: "SEND", now: Date.now() });
      delayTimerRef.current = setTimeout(() => dispatchRequest({ type: "DELAYED" }), 3_500);
      onEmotion("thinking");

      const appendToAssistant = (delta: string) =>
        setMessages((prev) => {
          const next = [...prev];
          const last = next[next.length - 1];
          next[next.length - 1] = { ...last, content: last.content + delta };
          return next;
        });

      const failAssistant = (failure: DocentFailure) => {
        setMessages((prev) => preserveAssistantFailure(prev, failure));
        dispatchRequest({ type: "FAILED", stage: failure.stage });
        onEmotion("sad");
      };

      const controller = new AbortController();
      abortRef.current = controller;

      void (async () => {
        let activeStage: DocentFailure["stage"] = "network";
        let terminalEvent = false;
        try {
          const res = await fetch("/api/docent/chat", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ messages: history, pageContext: pageRef.current }),
            signal: controller.signal,
          });
          if (!res.ok) {
            terminalEvent = true;
            failAssistant(await failureFromResponse(res));
            return;
          }
          if (!res.body) {
            terminalEvent = true;
            failAssistant({ message: safeFailureMessage(null), stage: "network" });
            return;
          }

          const reader = res.body.getReader();
          const decoder = new TextDecoder();
          let buffer = "";

          const handleLine = (raw: string) => {
            if (!raw.trim()) return;
            let event: DocentStreamEvent;
            try {
              event = JSON.parse(raw) as DocentStreamEvent;
            } catch {
              return;
            }
            switch (event.type) {
              case "stage":
                activeStage = event.stage;
                dispatchRequest({ type: "STAGE", stage: event.stage });
                break;
              case "meta":
                setMode(event.mode);
                onEmotion(event.emotion);
                setLastAnswer((prev) => ({
                  ...(prev ?? { grounded: false, activeProject: null, sources: [], timings: null }),
                  provider: event.provider ?? null,
                }));
                break;
              case "sources":
                setLastAnswer((prev) => ({
                  grounded: event.grounded,
                  activeProject: event.activeProject,
                  sources: event.sources,
                  timings: null,
                  provider: prev?.provider ?? null,
                }));
                break;
              case "delta":
                appendToAssistant(event.text);
                break;
              case "error": {
                terminalEvent = true;
                failAssistant(failureFromStreamError(event));
                break;
              }
              case "done":
                terminalEvent = true;
                dispatchRequest({ type: "DONE" });
                setLastAnswer((prev) => (prev ? { ...prev, timings: event.timings ?? null } : prev));
                break;
            }
          };

          for (;;) {
            const { done, value } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split("\n");
            buffer = lines.pop() ?? "";
            lines.forEach(handleLine);
          }
          if (buffer) handleLine(buffer);
          if (!terminalEvent) {
            failAssistant({ message: safeFailureMessage(null), stage: activeStage });
          }
        } catch (err) {
          if (!(err instanceof DOMException && err.name === "AbortError")) {
            failAssistant({ message: safeFailureMessage(null), stage: activeStage });
          }
        } finally {
          abortRef.current = null;
          if (delayTimerRef.current) {
            clearTimeout(delayTimerRef.current);
            delayTimerRef.current = null;
          }
          setIsStreaming(false);
        }
      })();
    },
    [messages, onEmotion],
  );

  const retryLast = useCallback(() => {
    if (!isStreaming && lastQuestionRef.current) send(lastQuestionRef.current);
  }, [isStreaming, send]);

  return { messages, isStreaming, mode, send, retryLast, requestState, lastAnswer };
}
