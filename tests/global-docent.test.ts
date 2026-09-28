import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

import { contextualHintFor, docentContextualHints } from "@/data/docentHints";
import {
  canOfferContextualHint,
  globalDocentPresentationReducer,
  initialGlobalDocentState,
} from "@/features/docent/globalDocentState";
import {
  DOCENT_HINT_DWELL_MS,
  isContextualHintDismissed,
  suppressContextualHint,
} from "@/features/docent/useContextualHint";

const read = (path: string) => readFileSync(path, "utf8").replace(/\r\n/g, "\n");
const layout = read("src/app/layout.tsx");
const globalShell = read("src/features/docent/GlobalDocent.tsx");
const runtime = read("src/features/docent/DocentRuntime.tsx");
const pageContext = read("src/features/docent/usePageContext.ts");
const chat = read("src/features/docent/useDocentChat.ts");
const playground = read("src/app/playground/page.tsx");
const projectLayout = read("src/components/project/ProjectDetailLayout.tsx");

test("global availability: root layout owns exactly one DD outside route children", () => {
  assert.equal((layout.match(/<GlobalDocent\s*\/>/g) ?? []).length, 1);
  assert.ok(layout.indexOf("{children}") < layout.indexOf("<GlobalDocent />"));
  assert.equal(playground.includes("<DocentExperience"), false);
  assert.equal(projectLayout.includes("DocentDock"), false);
});

test("route persistence: presentation closes without destroying the persistent runtime", () => {
  let state = globalDocentPresentationReducer(initialGlobalDocentState, { type: "MINIMIZE" });
  assert.equal(state, "minimized");
  state = globalDocentPresentationReducer(state, { type: "DOCK" });
  assert.equal(state, "docked");
  assert.match(globalShell, /aria-hidden=\{!isOpen\}/);
  assert.match(globalShell, /<DocentRuntimeProvider>/);
  assert.match(chat, /const \[messages, setMessages\]/);
});

test("PageContext follows pathname/section and every send reads the latest ref", () => {
  assert.match(pageContext, /usePathname\(\)/);
  assert.match(pageContext, /\[data-docent-section\]/);
  assert.match(pageContext, /\}, \[pathname\]\)/);
  assert.match(chat, /pageRef\.current = pageContext/);
  assert.match(chat, /pageContext: pageRef\.current/);
});

test("hints are deterministic, section-specific, and limited to meaningful project contexts", () => {
  const hint = contextualHintFor({
    pathname: "/projects/hangarae",
    pageType: "project",
    projectSlug: "hangarae",
    sectionId: "result",
  });
  assert.equal(hint?.id, "hangarae-result-precision");
  assert.equal(contextualHintFor({ pathname: "/", pageType: "home" }), null);
  assert.ok(docentContextualHints.every((item) => item.pathname.startsWith("/projects/") && item.sectionId));
  assert.equal(DOCENT_HINT_DWELL_MS, 6_500);
});

test("authored hint facts match canonical data", () => {
  const hangarae = read("src/data/hangaraeCaseStudy.ts");
  const armi = read("src/data/armiCaseStudy.ts");
  for (const fact of ["66,950", "20,507", "0.447", "0.982", "18개 keypoint"]) {
    assert.ok(hangarae.includes(fact), `missing canonical Hangarae fact: ${fact}`);
  }
  for (const fact of ["connectionState", "subscriptionState", "활성 sessionId", "gRPC", "Robot State Event"]) {
    assert.ok(armi.includes(fact), `missing canonical ARMI fact: ${fact}`);
  }
});

test("dismissed hints are suppressed for the browser session", () => {
  const values = new Map<string, string>();
  const storage = {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => { values.set(key, value); },
  };
  assert.equal(isContextualHintDismissed("hint-a", storage), false);
  suppressContextualHint("hint-a", storage);
  assert.equal(isContextualHintDismissed("hint-a", storage), true);
  assert.equal(isContextualHintDismissed("hint-b", storage), false);
});

test("contextual suggestions appear only while minimized and add no presentation state", () => {
  assert.equal(canOfferContextualHint("docked"), false);
  assert.equal(canOfferContextualHint("fullscreen"), false);
  assert.equal(canOfferContextualHint("minimized"), true);
  assert.doesNotMatch(read("src/features/docent/globalDocentState.ts"), /RESTING|SUGGESTING|SPEAKING/);
});

test("hint selection opens chat and submits through the normal RAG send path", () => {
  assert.match(globalShell, /dismiss\(hint\);\s*open\(\);\s*runtime\.send\(hint\.question\)/);
  assert.match(runtime, /chat\.send\(text\)/);
  assert.match(chat, /fetch\("\/api\/docent\/chat"/);
});

test("navigation, hints, opening, and text-only chat contain no voice warm call", () => {
  const nonVoiceFiles = [
    globalShell,
    read("src/data/docentHints.ts"),
    read("src/features/docent/useContextualHint.ts"),
    chat,
  ];
  for (const source of nonVoiceFiles) assert.equal(source.includes("/api/docent/voice/warm"), false);
  assert.match(runtime, /if \(voiceEnabled\) ensureReady\(\)/);
  assert.equal((read("src/features/docent/voiceWarmClient.ts").match(/\/api\/docent\/voice\/warm/g) ?? []).length, 1);
});

test("avatar mounts in the initially expanded panel and is retained when minimized", () => {
  assert.match(globalShell, /const DocentExperience = dynamic\(/);
  assert.match(globalShell, /<DocentExperience focusInputToken=\{focusInputToken\} layout=\{sidecar \? "sidecar" : "workspace"\} \/>/);
  assert.match(runtime, /\.\.\.readDocentMountMetrics\(\)/);
  const metrics = read("src/features/docent/docentMetrics.ts");
  assert.match(metrics, /runtimeMountCount: runtimeIds\.size/);
  assert.match(metrics, /avatarMountCount: avatarIds\.size/);
  assert.match(metrics, /\/models\/docent-/);
});

test("docked sidecar sits on the right, below the nav, down to the bottom", () => {
  // 헤더 56px + 12px 아래에서 시작, 바닥 12px, 오른쪽 16px, 폭 440px.
  assert.match(globalShell, /bottom-3 right-4 top-\[68px\] w-\[440px\]/);
  assert.match(globalShell, /const sidecar = state === "docked" && canDock/);
  // 컨트롤은 절대 배치가 아니라 자기 줄에 있다 — 채팅의 음성 버튼과 겹치지 않는다.
  assert.match(globalShell, /data-docent-controls/);
  assert.doesNotMatch(globalShell, /absolute right-3 top-3/);
});

test("expanded shell is a header-safe workspace with a stacked mobile fallback", () => {
  assert.match(globalShell, /fixed inset-x-0 bottom-0 top-14/);
  assert.match(globalShell, /data-docent-workspace/);
  assert.match(globalShell, /data-lenis-prevent/);
  const experience = read("src/features/docent/DocentExperience.tsx");
  assert.match(experience, /grid-rows-\[auto_minmax\(0,1fr\)\]/);
  assert.match(experience, /lg:grid-cols-\[minmax\(360px,42%\)_minmax\(0,58%\)\]/);
  assert.match(experience, /data-docent-conversation-region/);
  assert.match(read("src/features/docent/ChatPanel.tsx"), /h-full min-h-0 flex-1 flex-col/);
});

test("launcher, hint, dialog, focus, labels, and reduced motion affordances are wired", () => {
  assert.match(globalShell, /aria-expanded=\{isOpen\}/);
  assert.match(globalShell, /role="dialog"/);
  assert.match(globalShell, /aria-label="AI Docent 내리기"/);
  assert.match(globalShell, /aria-label="전체 화면으로 보기"/);
  assert.match(globalShell, /aria-label="사이드 패널로 축소"/);
  assert.match(globalShell, /aria-label="AI Docent 열기"/);
  assert.match(globalShell, /launcherRef\.current\?\.focus\(\)/);
  assert.match(globalShell, /motion-reduce:transition-none/);
  assert.match(read("src/features/docent/ChatPanel.tsx"), /inputRef\.current\?\.focus\(\)/);
});
