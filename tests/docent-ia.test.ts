import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

import { projectDetails } from "@/data/projectDetails";
import { projects } from "@/data/projects";
import {
  DOCENT_DOCK_MIN_VIEWPORT_WIDTH,
  GLOBAL_DOCENT_VIEW_STORAGE_KEY,
  PORTFOLIO_CANONICAL_CONTENT_WIDTH,
  canDockGlobalDocent,
  defaultGlobalDocentView,
  globalDocentPresentationReducer,
  initialGlobalDocentState,
  persistGlobalDocentView,
  readGlobalDocentView,
} from "@/features/docent/globalDocentState";

const read = (path: string) => readFileSync(path, "utf8").replace(/\r\n/g, "\n");

test("view state has exactly expanded/minimized transitions and defaults expanded", () => {
  assert.equal(initialGlobalDocentState, "expanded");
  const minimized = globalDocentPresentationReducer(initialGlobalDocentState, { type: "MINIMIZE" });
  assert.equal(minimized, "minimized");
  assert.equal(globalDocentPresentationReducer(minimized, { type: "EXPAND" }), "expanded");
  const source = read("src/features/docent/globalDocentState.ts");
  assert.doesNotMatch(source, /"closed"|"OPEN"|"RESTING"|"SUGGESTING"|"SPEAKING"/);
});

test("view state persistence is SSR-safe and invalid/missing storage defaults expanded", () => {
  assert.equal(readGlobalDocentView(null), "expanded");
  const values = new Map<string, string>();
  const storage = {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => { values.set(key, value); },
  };
  assert.equal(readGlobalDocentView(storage), "expanded");
  persistGlobalDocentView("minimized", storage);
  assert.equal(values.get(GLOBAL_DOCENT_VIEW_STORAGE_KEY), "minimized");
  assert.equal(readGlobalDocentView(storage), "minimized");
  values.set(GLOBAL_DOCENT_VIEW_STORAGE_KEY, "closed");
  assert.equal(readGlobalDocentView(storage), "expanded");
  assert.match(read("src/features/docent/GlobalDocent.tsx"), /readGlobalDocentView\(window\.localStorage/);
});

test("mobile first visit minimizes while a stored user choice takes precedence", () => {
  assert.equal(defaultGlobalDocentView(375), "minimized");
  assert.equal(defaultGlobalDocentView(767), "minimized");
  assert.equal(defaultGlobalDocentView(768), "minimized");

  const values = new Map<string, string>();
  const storage = {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => { values.set(key, value); },
  };
  assert.equal(readGlobalDocentView(storage, defaultGlobalDocentView(375)), "minimized");
  persistGlobalDocentView("expanded", storage);
  assert.equal(readGlobalDocentView(storage, defaultGlobalDocentView(375)), "expanded");
});

test("first visits expand only when the canonical content gutter can hold the sidecar", () => {
  assert.equal(PORTFOLIO_CANONICAL_CONTENT_WIDTH, 1440);
  assert.equal(DOCENT_DOCK_MIN_VIEWPORT_WIDTH, 2316);
  for (const width of [375, 1280, 1440, 1920, 2315]) {
    assert.equal(canDockGlobalDocent(width), false, `${width}px must fall back`);
    assert.equal(defaultGlobalDocentView(width), "minimized");
  }
  assert.equal(canDockGlobalDocent(2316), true);
  assert.equal(defaultGlobalDocentView(2316), "expanded");
});

test("layout wrapper has no docent-driven horizontal padding in either view", () => {
  const layout = read("src/app/layout.tsx");
  const styles = read("src/app/globals.css");
  const shell = read("src/features/docent/GlobalDocent.tsx");
  assert.match(layout, /data-global-docent-layout/);
  assert.match(shell, /dataset\.globalDocentView = state/);
  assert.match(
    styles,
    /\.global-docent-layout\s*\{[^}]*padding-right:\s*0;/,
  );
  assert.doesNotMatch(styles, /data-global-docent-view[^}]*\.global-docent-layout/);
  assert.doesNotMatch(styles, /global-docent-layout[\s\S]{0,160}transition:\s*padding-right/);
  assert.doesNotMatch(styles, /global-docent-layout \.scene-shell/);
});

test("mobile launcher is labelled and starter chips use unclipped scroll content", () => {
  const shell = read("src/features/docent/GlobalDocent.tsx");
  const chatPanel = read("src/features/docent/ChatPanel.tsx");
  assert.match(shell, /aria-label="AI Docent 열기"/);
  assert.match(shell, /h-\[52px\]/);
  assert.match(shell, />\s*AI DOCENT\s*</);
  assert.match(chatPanel, /overflow-y-auto overscroll-contain/);
  assert.match(chatPanel, /min-h-full/);
  assert.match(chatPanel, /data-docent-starters/);
});

test("AI Docent exists in Projects data and its detail follows the shared schema", () => {
  const project = projects.find((item) => item.key === "docent");
  assert.ok(project);
  for (const key of [
    "name", "label", "headline", "description", "background", "foreground",
    "muted", "core", "sections", "points", "technologies", "productCards", "impact", "theme",
  ]) {
    assert.ok(key in project, `missing Project schema field: ${key}`);
  }
  assert.equal(project.name, "AI Docent");
  const detail = projectDetails.find((item) => item.slug === "ai-docent");
  assert.ok(detail);
  assert.match(detail.architecture.description, /PageContext/);
  assert.deepEqual(
    detail.architecture.items.map((item) => item.title),
    [
      "1. Question → PageContext",
      "2. PageContext → Retrieval",
      "3. Retrieval → LLM",
      "4. LLM → TTS → Avatar Animation",
    ],
  );
});

test("Docent project CTA dispatches the established global open event, not a second chat", () => {
  const button = read("src/features/docent/OpenGlobalDocentButton.tsx");
  const layout = read("src/components/project/ProjectDetailLayout.tsx");
  assert.match(button, /new CustomEvent\(OPEN_GLOBAL_DOCENT_EVENT\)/);
  assert.match(layout, /<OpenGlobalDocentButton label="도슨트 체험하기" \/>/);
  assert.doesNotMatch(layout, /<DocentExperience|<ChatPanel/);
});

test("Playground makes Crime Scene primary and launches only the verified deployment on intent", () => {
  const playground = read("src/app/playground/page.tsx");
  const launch = read("src/features/playground/CrimeSceneLaunchButton.tsx");
  assert.match(playground, />PLAYGROUND</);
  assert.match(playground, /3D 사건 현장을 탐색/);
  assert.match(playground, /자유롭게 AI 심문/);
  assert.match(playground, /증거를 제시/);
  assert.match(playground, /마지막 추리/);
  assert.match(playground, /<CrimeSceneLaunchButton \/>/);
  assert.match(playground, /href="\/projects\/crime-scene"/);
  assert.match(launch, /https:\/\/crime-scene\.vercel\.app/);
  assert.match(launch, /window\.location\.assign\(CRIME_SCENE_URL\)/);
  assert.match(launch, /수사를 시작합니다/);
  assert.doesNotMatch(playground, /DocentDevlog|OpenGlobalDocentButton|ReflexGame/);
});

test("avatar stage is enlarged and GLB camera framing derives from measured bounds", () => {
  const canvas = read("src/features/docent/AvatarCanvas.tsx");
  const head = read("src/features/docent/DocentHead.tsx");
  assert.match(canvas, /h-\[136px\]/);
  assert.match(canvas, /sm:h-\[204px\]/);
  assert.match(canvas, /data-avatar-stage/);
  assert.match(head, /new Box3\(\)\.setFromObject/);
  assert.match(head, /bounds\.getSize/);
  assert.match(head, /camera\.lookAt\(center\)/);
});

test("navigation, hint, panel open, and text-only send still cannot warm voice", () => {
  const nonVoiceSources = [
    read("src/features/docent/GlobalDocent.tsx"),
    read("src/features/docent/OpenGlobalDocentButton.tsx"),
    read("src/features/docent/useContextualHint.ts"),
    read("src/features/docent/useDocentChat.ts"),
    read("src/app/playground/page.tsx"),
  ];
  for (const source of nonVoiceSources) {
    assert.equal(source.includes("/api/docent/voice/warm"), false);
  }
  assert.match(read("src/features/docent/DocentRuntime.tsx"), /if \(voiceEnabled\) ensureReady\(\)/);
});
