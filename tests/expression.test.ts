// 표정 — 말하는 동안에도 눈·눈썹·볼로 감정이 보이고, 입 영역(립싱크)은 한 정점도 더 흔들리지 않는다.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "node:test";
import { BufferAttribute, BufferGeometry, Mesh, MeshBasicMaterial } from "three";

import { UPPER_FACE_MASK, deriveUpperFaceMorphs, upperFaceName, upperFaceWeight } from "@/features/docent/upperFaceMorphs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (...p: string[]) => readFileSync(path.join(root, ...p), "utf8").replace(/\r\n/g, "\n");

test("가림 경계: 입술 높이(y ≈ -0.4)는 0, 눈 높이(y ≈ 0)는 1, 사이는 단조롭게 오른다", () => {
  assert.equal(upperFaceWeight(-0.4), 0);
  assert.equal(upperFaceWeight(UPPER_FACE_MASK.fromY), 0);
  assert.equal(upperFaceWeight(0), 1);
  let prev = -1;
  for (let y = -0.4; y <= 0.1; y += 0.01) {
    const w = upperFaceWeight(y);
    assert.ok(w >= prev - 1e-12 && w >= 0 && w <= 1);
    prev = w;
  }
});

function faceMesh() {
  // 정점 셋: 입술(y -0.4), 볼(y -0.22), 눈(y 0.05). smile 모프가 셋 다 움직인다.
  const g = new BufferGeometry();
  g.setAttribute("position", new BufferAttribute(new Float32Array([0, -0.4, 0.6, 0.2, -0.22, 0.6, 0.1, 0.05, 0.6]), 3));
  g.morphAttributes.position = [
    new BufferAttribute(new Float32Array([0, 0.01, 0, 0, 0, 0, 0, 0, 0]), 3), // jawOpen
    new BufferAttribute(new Float32Array([0.02, 0.03, 0, 0.01, 0.02, 0, 0, 0.004, 0]), 3), // smile
  ];
  g.morphAttributes.normal = [
    new BufferAttribute(new Float32Array(9), 3),
    new BufferAttribute(new Float32Array([0.1, 0.1, 0, 0.1, 0.1, 0, 0.1, 0.1, 0]), 3),
  ];
  const mesh = new Mesh(g, new MeshBasicMaterial());
  mesh.updateMorphTargets();
  mesh.morphTargetDictionary = { jawOpen: 0, smile: 1 };
  return { g, mesh };
}

test("윗얼굴 사본은 입술 정점을 움직이지 않고, 눈 정점은 원래 모프 그대로 움직인다(위치·법선 함께)", () => {
  const { g, mesh } = faceMesh();
  const added = deriveUpperFaceMorphs(mesh, ["smile", "thinking"]);
  assert.deepEqual(added, ["smile:upper"]); // 없는 모프(thinking)는 만들지 않는다
  const slot = mesh.morphTargetDictionary![upperFaceName("smile")];
  const copy = g.morphAttributes.position![slot];
  assert.equal(copy.getX(0), 0); assert.equal(copy.getY(0), 0); // 입술
  assert.ok(Math.abs(copy.getY(2) - 0.004) < 1e-9); // 눈
  assert.ok(copy.getY(1) > 0 && copy.getY(1) < 0.02); // 볼은 일부
  assert.equal(g.morphAttributes.normal!.length, g.morphAttributes.position!.length);
  assert.equal(g.morphAttributes.normal![slot].getX(0), 0);
  assert.equal(mesh.morphTargetInfluences!.length, g.morphAttributes.position!.length);
  // 원래 모프는 건드리지 않는다
  assert.equal(g.morphAttributes.position![1].getY(0), Math.fround(0.03));
});

test("같은 지오메트리에 두 번 만들지 않는다(캐시된 장면 재마운트)", () => {
  const { g, mesh } = faceMesh();
  deriveUpperFaceMorphs(mesh, ["smile"]);
  const count = g.morphAttributes.position!.length;
  assert.deepEqual(deriveUpperFaceMorphs(mesh, ["smile"]), []);
  assert.equal(g.morphAttributes.position!.length, count);
  // 같은 지오메트리를 쓰는 다른 메쉬는 자리만 받는다
  const other = new Mesh(g, new MeshBasicMaterial());
  other.updateMorphTargets();
  other.morphTargetDictionary = { jawOpen: 0, smile: 1 };
  assert.deepEqual(deriveUpperFaceMorphs(other, ["smile"]), ["smile:upper"]);
  assert.equal(g.morphAttributes.position!.length, count);
  assert.equal(other.morphTargetDictionary![upperFaceName("smile")], mesh.morphTargetDictionary![upperFaceName("smile")]);
});

test("운영 GLB: 네 감정의 윗얼굴 사본은 입술 높이에서 변위 0, 눈 높이 변위는 원래 모프와 같다", () => {
  const b = readFileSync(path.join(root, "public", "models", "docent-qka2-m213-runtime-compat.glb"));
  const jl = b.readUInt32LE(12);
  const json = JSON.parse(b.subarray(20, 20 + jl).toString());
  const binOff = 20 + jl + 8;
  const acc = (i: number) => {
    const a = json.accessors[i]; const bv = json.bufferViews[a.bufferView];
    const o = binOff + (bv.byteOffset || 0) + (a.byteOffset || 0);
    const f = new Float32Array(a.count * 3);
    for (let k = 0; k < f.length; k += 1) f[k] = b.readFloatLE(o + 4 * k);
    return f;
  };
  const mesh = json.meshes[0]; const names: string[] = mesh.extras.targetNames; const prim = mesh.primitives[0];
  const P = acc(prim.attributes.POSITION);
  for (const name of ["smile", "thinking", "surprised", "sad"]) {
    const D = acc(prim.targets[names.indexOf(name)].POSITION);
    let lips = 0, lipsOriginal = 0, eyes = 0, eyesOriginal = 0;
    for (let v = 0; v < P.length / 3; v += 1) {
      const y = P[3 * v + 1]; const d = Math.hypot(D[3 * v], D[3 * v + 1], D[3 * v + 2]);
      if (y < -0.3) { lips += d * upperFaceWeight(y); lipsOriginal += d; }
      if (y > -0.05 && y < 0.25) { eyes += d * upperFaceWeight(y); eyesOriginal += d; }
    }
    assert.equal(lips, 0, `${name}: 입술 높이 변위`);
    assert.ok(lipsOriginal > 0);
    assert.ok(Math.abs(eyes - eyesOriginal) < 1e-9, `${name}: 눈 높이 변위가 줄었다`);
  }
});

test("발화 중 입 영역의 감정 가중치는 이전과 같다(0.1) — 윗얼굴 사본이 나머지 0.9 를 채운다", () => {
  const head = read("src", "features", "docent", "DocentHead.tsx");
  assert.match(head, /export const EMOTION_SCALE_DURING_SPEECH = 0\.1;/);
  assert.match(head, /export const UPPER_FACE_EMOTION_DURING_SPEECH = 1 - EMOTION_SCALE_DURING_SPEECH;/);
  assert.match(head, /const upperScale = speechActive \? UPPER_FACE_EMOTION_DURING_SPEECH : 0;/);
  assert.match(head, /for \(const mesh of found\) deriveUpperFaceMorphs\(mesh, EMOTION_MORPHS\);/);
  // 입 액추에이터 쓰기는 감정과 무관하다 — 립싱크 경로는 그대로
  assert.match(head, /const rendered = dampMouth\(dampState\.current, MOUTH_ACTUATORS, pose as MouthTarget, delta, MOUTH_TIMING\);/);
});

test("질문하면 thinking, 답변의 감정 태그가 오면 그 표정, 답변·발화가 끝나면 잠시 뒤 중립", () => {
  const chat = read("src", "features", "docent", "useDocentChat.ts");
  assert.match(chat, /onEmotion\("thinking"\);/);
  assert.match(chat, /onEmotion\(event\.emotion\);/);
  const runtime = read("src", "features", "docent", "DocentRuntime.tsx");
  assert.match(runtime, /export const EMOTION_HOLD_AFTER_ANSWER_MS = 2_500;/);
  assert.match(runtime, /if \(emotion === "neutral" \|\| chat\.isStreaming \|\| supertonicSpeaking \|\| supertonicPreparing \|\| voiceBusy\) return;/);
  assert.match(runtime, /setTimeout\(\(\) => setEmotion\("neutral"\), EMOTION_HOLD_AFTER_ANSWER_MS\)/);
});
