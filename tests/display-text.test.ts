// 도슨트 답변 표시 — 모델이 붙인 마크다운 강조 기호가 화면·음성에 새지 않는다.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "node:test";

import { stripEmphasisForDisplay } from "@/lib/docent/displayText";
import { planSpokenSegments, prepareSpokenText } from "@/lib/docent/ttsSegments";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

test("**ARMI** 는 화면에 ARMI 로 보인다", () => {
  assert.equal(stripEmphasisForDisplay("**ARMI**는 병상 보조 로봇이에요."), "ARMI는 병상 보조 로봇이에요.");
  assert.equal(stripEmphasisForDisplay("대표 프로젝트는 **Wedding AI**와 **ARMI**예요."), "대표 프로젝트는 Wedding AI와 ARMI예요.");
  assert.equal(stripEmphasisForDisplay("__행가래__ 는 재활 게임"), "행가래 는 재활 게임");
});

test("TTS 문장에도 별표가 없다", () => {
  const spoken = prepareSpokenText("**ARMI**는 **Wedding AI**와 달라요.");
  assert.doesNotMatch(spoken, /\*/);
  const plan = planSpokenSegments("**ARMI**는 병상 보조 로봇이에요. **Claw Dev**는 협업 실험이에요.");
  assert.ok(plan && plan.segments.length > 0);
  for (const seg of plan.segments) assert.doesNotMatch(seg, /\*/);
});

test("일반 * 와 코드는 부수지 않는다", () => {
  assert.equal(stripEmphasisForDisplay("정확도는 2*3 배가 아니라 5* 표시예요"), "정확도는 2*3 배가 아니라 5* 표시예요");
  assert.equal(stripEmphasisForDisplay("`a**b**c` 는 코드예요 **강조**"), "`a**b**c` 는 코드예요 강조");
  assert.equal(stripEmphasisForDisplay("```\nx = a**2\n```"), "```\nx = a**2\n```");
  assert.equal(stripEmphasisForDisplay("snake_case__name 은 그대로"), "snake_case__name 은 그대로");
  assert.equal(stripEmphasisForDisplay("강조 없는 문장"), "강조 없는 문장");
});

test("스트리밍 도중 여는 ** 만 온 상태도 기호가 보이지 않는다", () => {
  assert.equal(stripEmphasisForDisplay("대표 프로젝트는 **Wedd"), "대표 프로젝트는 Wedd");
  assert.equal(stripEmphasisForDisplay("대표 프로젝트는 **Wedding AI**"), "대표 프로젝트는 Wedding AI");
});

test("마크다운을 HTML 로 렌더하지 않는다 — 텍스트 노드로만 들어간다", () => {
  const panel = readFileSync(path.join(root, "src", "features", "docent", "ChatPanel.tsx"), "utf8");
  assert.match(panel, /stripEmphasisForDisplay\(message\.content\)/);
  assert.doesNotMatch(panel, /dangerouslySetInnerHTML/);
  const grounding = readFileSync(path.join(root, "src", "lib", "docent", "rag", "grounding.ts"), "utf8");
  assert.match(grounding, /마크다운 강조\(\*\*굵게\*\*, __밑줄__\)/);
});
