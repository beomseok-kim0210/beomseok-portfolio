"use client";

import { useCallback, useEffect, useState } from "react";
import {
  contextualHintFor,
  type DocentContextualHint,
} from "@/data/docentHints";
import type { DocentPageContext } from "@/types/docent";
import { canOfferContextualHint, type GlobalDocentView } from "./globalDocentState";

export const DOCENT_HINT_DWELL_MS = 6_500;
const SESSION_KEY = "dd:dismissed-hints";

function readDismissed(storage: Pick<Storage, "getItem"> | null): Set<string> {
  if (!storage) return new Set();
  try {
    const value = JSON.parse(storage.getItem(SESSION_KEY) ?? "[]");
    return new Set(Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : []);
  } catch {
    return new Set();
  }
}

export function isContextualHintDismissed(
  id: string,
  storage: Pick<Storage, "getItem"> | null,
): boolean {
  return readDismissed(storage).has(id);
}

export function suppressContextualHint(
  id: string,
  storage: Pick<Storage, "getItem" | "setItem"> | null,
): void {
  if (!storage) return;
  const dismissed = readDismissed(storage);
  dismissed.add(id);
  try {
    storage.setItem(SESSION_KEY, JSON.stringify([...dismissed]));
  } catch {
    // Session storage can be unavailable in privacy modes; the current render still dismisses it.
  }
}

export interface ContextualHintState {
  hint: DocentContextualHint | null;
  dismiss: (hint: DocentContextualHint) => void;
}

export function useContextualHint(
  context: DocentPageContext,
  view: GlobalDocentView,
  dwellMs = DOCENT_HINT_DWELL_MS,
): ContextualHintState {
  const [hint, setHint] = useState<DocentContextualHint | null>(null);
  const candidate = contextualHintFor(context);
  const candidateId = candidate?.id ?? null;
  const eligible = canOfferContextualHint(view);

  useEffect(() => {
    setHint(null);
    if (!eligible || !candidate) return;
    const storage = typeof window === "undefined" ? null : window.sessionStorage;
    if (isContextualHintDismissed(candidate.id, storage)) return;
    const timer = window.setTimeout(() => setHint(candidate), dwellMs);
    return () => window.clearTimeout(timer);
  }, [candidate, candidateId, dwellMs, eligible]);

  const dismiss = useCallback((target: DocentContextualHint) => {
    const storage = typeof window === "undefined" ? null : window.sessionStorage;
    suppressContextualHint(target.id, storage);
    setHint((current) => current?.id === target.id ? null : current);
  }, []);

  return { hint, dismiss };
}
