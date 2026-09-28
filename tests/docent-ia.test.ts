import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

import { projectDetails } from "@/data/projectDetails";
import { projects } from "@/data/projects";
import {
  DESKTOP_DOCENT_RESERVED_WIDTH,
  DOCENT_DOCK_MIN_VIEWPORT_WIDTH,
  GLOBAL_DOCENT_VIEW_STORAGE_KEY,
  PORTFOLIO_CANONICAL_CONTENT_WIDTH,
  canDockGlobalDocent,
  defaultGlobalDocentView,
  dockedContentInset,
  globalDocentPresentationReducer,
  initialGlobalDocentState,
  persistGlobalDocentView,
  readGlobalDocentView,
} from "@/features/docent/globalDocentState";

const read = (path: string) => readFileSync(path, "utf8").replace(/\r\n/g, "\n");

test("view state is docked / fullscreen / minimized and opens docked", () => {
  assert.equal(initialGlobalDocentState, "docked");
  const full = globalDocentPresentationReducer(initialGlobalDocentState, { type: "FULLSCREEN" });
  assert.equal(full, "fullscreen");
  // 전체 화면의 "축소"는 사이드 패널로, "내리기"는 버튼으로.
  assert.equal(globalDocentPresentationReducer(full, { type: "DOCK" }), "docked");
  const minimized = globalDocentPresentationReducer(full, { type: "MINIMIZE" });
  assert.equal(minimized, "minimized");
  // 버튼으로 다시 열면 전체 화면이 아니라 사이드 패널로 돌아온다.
  assert.equal(globalDocentPresentationReducer(minimized, { type: "DOCK" }), "docked");
  const source = read("src/features/docent/globalDocentState.ts");
  assert.doesNotMatch(source, /"closed"|"OPEN"|"RESTING"|"SUGGESTING"|"SPEAKING"/);
});

test("view state persistence is SSR-safe, migrates legacy 'expanded', rejects junk", () => {
  assert.equal(readGlobalDocentView(null), "docked");
  const values = new Map<string, string>();
  const storage = {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => { values.set(key, value); },
  };
  assert.equal(readGlobalDocentView(storage), "docked");
  for (const view of ["minimized", "fullscreen", "docked"] as const) {
    persistGlobalDocentView(view, storage);
    assert.equal(values.get(GLOBAL_DOCENT_VIEW_STORAGE_KEY), view);
    assert.equal(readGlobalDocentView(storage), view);
  }
  values.set(GLOBAL_DOCENT_VIEW_STORAGE_KEY, "expanded");
  assert.equal(readGlobalDocentView(storage), "docked");
  values.set(GLOBAL_DOCENT_VIEW_STORAGE_KEY, "closed");
  assert.equal(readGlobalDocentView(storage), "docked");
  assert.match(read("src/features/docent/GlobalDocent.tsx"), /readGlobalDocentView\(window\.localStorage/);
});

test("narrow first visit minimizes while a stored user choice takes precedence", () => {
  assert.equal(defaultGlobalDocentView(375), "minimized");
  assert.equal(defaultGlobalDocentView(768), "minimized");
  assert.equal(defaultGlobalDocentView(1023), "minimized");

  const values = new Map<string, string>();
  const storage = {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => { values.set(key, value); },
  };
  assert.equal(readGlobalDocentView(storage, defaultGlobalDocentView(375)), "minimized");
  persistGlobalDocentView("docked", storage);
  assert.equal(readGlobalDocentView(storage, defaultGlobalDocentView(375)), "docked");
});

test("desktop docks on the right and pushes the content only as far as it must", () => {
  assert.equal(PORTFOLIO_CANONICAL_CONTENT_WIDTH, 1440);
  assert.equal(DOCENT_DOCK_MIN_VIEWPORT_WIDTH, 1024);
  assert.equal(DESKTOP_DOCENT_RESERVED_WIDTH, 480);
  for (const width of [1024, 1280, 1440, 1920, 2560]) {
    assert.equal(canDockGlobalDocent(width), true);
    assert.equal(defaultGlobalDocentView(width), "docked");
  }
  // 본문이 좁아지는 화면에서도 예약 폭 이상 밀지 않는다.
  assert.equal(dockedContentInset(1280), 480);
  assert.equal(dockedContentInset(1920), 480);
  // 오른쪽 바깥 여백이 커질수록 덜 밀고, 충분하면 본문은 제자리.
  assert.equal(dockedContentInset(2200), 200);
  assert.equal(dockedContentInset(2400), 0);
  assert.equal(dockedContentInset(2560), 0);
  assert.equal(dockedContentInset(375), 0);
  for (const width of [1920, 2200, 2400]) {
    // 밀린 뒤 본문의 오른쪽 바깥 여백이 패널 예약 폭을 담는다.
    const inset = dockedContentInset(width);
    const rightGutter = (width - inset - PORTFOLIO_CANONICAL_CONTENT_WIDTH) / 2 + inset;
    assert.ok(rightGutter >= DESKTOP_DOCENT_RESERVED_WIDTH, `${width}px`);
  }
});

test("content is pushed (never scaled) only while docked on desktop", () => {
  const layout = read("src/app/layout.tsx");
  const styles = read("src/app/globals.css");
  const shell = read("src/features/docent/GlobalDocent.tsx");
  assert.match(layout, /data-global-docent-layout/);
  assert.match(shell, /dataset\.globalDocentView = state/);
  assert.match(styles, /\.global-docent-layout\s*\{[^}]*padding-right:\s*0;/);
  // CSS 식은 dockedContentInset 과 같아야 한다.
  assert.match(
    styles,
    /@media \(min-width: 1024px\)\s*\{\s*html\[data-global-docent-view="docked"\] \.global-docent-layout\s*\{\s*padding-right: clamp\(0px, calc\(2 \* 480px \+ 1440px - 100vw\), 480px\);/,
  );
  assert.doesNotMatch(styles, /data-global-docent-view="fullscreen"/);
  assert.doesNotMatch(styles, /global-docent-layout[\s\S]{0,160}transition:\s*padding-right/);
  assert.doesNotMatch(styles, /global-docent-layout[^{]*\{[^}]*(zoom|scale)/);
});

test("mobile launcher is labelled and starter chips use unclipped scroll content", () => {
  const shell = read("src/features/docent/GlobalDocent.tsx");
  const chatPanel = read("src/features/docent/ChatPanel.tsx");
  assert.match(shell, /aria-label="AI Docent 열기"/);
  assert.match(shell, /h-\[52px\]/);
  assert.match(shell, />\s*AI DOCENT\s*</);
  // 클래스 인접이 아니라 성질을 고정한다 — 세로만 스크롤하고 가로는 잠근다.
  assert.match(chatPanel, /overflow-y-auto/);
  assert.match(chatPanel, /overflow-x-hidden/);
  assert.match(chatPanel, /overscroll-contain/);
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
  assert.match(canvas, /h-\[clamp\(148px,24dvh,210px\)\]/);
  assert.match(canvas, /lg:aspect-square/);
  assert.match(canvas, /lg:max-w-\[520px\]/);
  assert.match(canvas, /data-avatar-stage/);
  assert.match(head, /new Box3\(\)\.setFromObject/);
  assert.match(head, /bounds\.getSize/);
  assert.match(head, /frameAvatarPortrait/);
  assert.match(head, /camera\.lookAt\(target\)/);
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
