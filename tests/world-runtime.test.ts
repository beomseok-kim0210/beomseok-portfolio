import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { Fog, PerspectiveCamera, Vector3 } from "three";
import { createWorldRuntime, evaluateRuntime, worldPositionForDomProgress, worldPositionForScroll } from "../src/features/world/director/worldRuntime";
import { armiLegacyPhase, armiRuntimeProfile, sampleArmiCamera, sampleArmiLookdev } from "../src/features/world/adapters/armiRuntime";
import { journeyFov, sampleJourney } from "../src/components/sections/ImmersiveProjectFlow/armiJourney/goldenPaths";
import { ease, entryLocal, interval, journeyPhase } from "../src/components/sections/ImmersiveProjectFlow/armiJourney/experienceData";
import { travelProgress } from "../src/components/sections/ImmersiveProjectFlow/armiJourney/paths";
import { projectCatalog } from "../src/features/world/catalog/projectCatalog";
const read = (path: string) => readFileSync(path, "utf8");
const base = "src/components/sections/ImmersiveProjectFlow/armiJourney/";
const world = "src/features/world/";
const checkpoints = [0, .18, .235, .378, .56, .675, .78, .885, .94, .994];
const identity = (state: ReturnType<typeof evaluateRuntime>) => [state.segmentId, state.districtId, state.shotId, state.shotProgress, state.localProgress];

test("A: mounted Home runtime exposes ARMI and separates continuous/semantic notifications", () => {
  const runtime = createWorldRuntime(); let semantic = 0, frames = 0;
  const stop = runtime.subscribeSemantic(() => semantic++);
  runtime.subscribeFrame(() => frames++);
  for (const p of [.5, .51, .52]) runtime.publish(worldPositionForDomProgress("armi", p), "webgl");
  assert.equal(runtime.state.current.districtId, "armi");
  assert.equal(semantic, 1); assert.equal(frames, 3); assert.equal(runtime.progress.current, .52);
  stop(); runtime.publish(3.6, "fallback"); assert.equal(semantic, 1);
  assert.match(read(world + "runtime/WorldHost.tsx"), /createWorldRuntime/);
  assert.match(read("src/app/page.tsx"), /<WorldHost><ImmersiveProjectFlow/);
});
test("B/C: equal absolute positions restore deterministic identity forward, reverse and direct", () => {
  for (const p of checkpoints) {
    const position = worldPositionForDomProgress("armi", p);
    const forward = evaluateRuntime(position, "forward", "webgl");
    assert.deepEqual(identity(forward), identity(evaluateRuntime(position, "reverse", "webgl")));
    assert.deepEqual(forward, evaluateRuntime(position, "forward", "webgl"));
  }
});
test("D: direct ARMI anchor/range resolves without event replay or document normalization", () => {
  assert.equal(worldPositionForScroll(100, 100, 1100), 0);
  assert.equal(worldPositionForScroll(600, 100, 1100), 2);
  assert.equal(worldPositionForScroll(99999, 100, 1100), 4);
  assert.equal(worldPositionForScroll(-100, 100, 1100), 0);
  assert.throws(() => worldPositionForScroll(100, 100, 100));
  assert.equal(evaluateRuntime(0, "stationary", "webgl").shotId, "entry");
});
test("E/F: isolated compatibility preserves all V1 phases and protected local clock", () => {
  for (let i = 0; i <= 10000; i++) {
    const p = i / 10000;
    const state = evaluateRuntime(worldPositionForDomProgress("armi", p), "forward", "webgl");
    assert.equal(state.localProgress, p);
    assert.equal(armiLegacyPhase(state.shotId), journeyPhase(p), `legacy phase at ${p}`);
  }
  assert.deepEqual([0, .08, .18, .235].map(p => evaluateRuntime(p * 4, "forward", "webgl").shotId), ["entry", "voice", "tablet-approach", "portal"]);
  assert.ok(armiRuntimeProfile.shots.some(shot => shot.shotId === "legacy-stt"));
});
test("G: V1 numeric choreography remains outside catalog/registry/itinerary", () => {
  for (const file of ["catalog/projectCatalog.ts", "registry/districtRegistry.ts", "itinerary/worldItinerary.ts"]) {
    assert.doesNotMatch(read(world + file), /legacy-stt|legacy-travel|legacy-result|legacy-return|\.985|\.675|\.235/);
  }
});
test("H: active district supplies samples; only World controller applies final camera", () => {
  const scene = read(world + "adapters/ArmiDistrictScene.tsx");
  assert.doesNotMatch(scene, /ArmiCameraRig|lookAt|camera\.position/);
  assert.match(read(world + "runtime/WorldCameraController.tsx"), /camera\.position\.copy\(sample\.position\)/);
  assert.doesNotMatch(read(world + "runtime/WorldCanvas.tsx"), /ArmiCameraRig/);
});
test("I/J: one mounted World Canvas/final render, legacy owners retained but unmounted", () => {
  assert.doesNotMatch(read(base + "ArmiExperience.tsx"), /ArmiCanvas|<Canvas/);
  assert.doesNotMatch(read(world + "adapters/ArmiDistrictScene.tsx"), /<Canvas|ArmiLightTreatment|gl\.render/);
  assert.equal((read(world + "runtime/WorldCanvas.tsx").match(/<Canvas /g) ?? []).length, 1);
  assert.match(read(world + "runtime/WorldRenderPipeline.tsx"), /if \(intent\.direct\) gl\.render/);
  assert.match(read(world + "runtime/WorldRenderPipeline.tsx"), /\}, 1\)/);
  for (const legacy of ["ArmiCanvas.tsx", "ArmiCameraRig.tsx", "ArmiLightTreatment.tsx", "ArmiScrollDirector.ts"]) assert.ok(read(base + legacy));
});
test("K: reduced/fallback director preserves identities without WebGL; reduced track is brief", () => {
  for (const mode of ["reduced-motion", "fallback", "static"] as const) {
    const state = evaluateRuntime(.94 * 4, "reverse", mode);
    assert.equal(state.shotId, "legacy-return"); assert.equal(state.renderMode, mode);
  }
  assert.match(read(world + "runtime/WorldHost.tsx"), /surface\?\.mode === "webgl"/);
  assert.match(read(base + "journey.module.css"), /prefers-reduced-motion:reduce\) \{ \.track \{ height:180svh/);
  assert.match(read(base + "ArmiExperience.tsx"), /href="#armi-brief"/);
});
test("L/M: all existing routes and Docent identity remain available; Claw Dev excluded", () => {
  assert.deepEqual(projectCatalog.map(project => project.routeSlug), ["armi", "hangarae", "wedding", "ai-docent", "bcos", "crime-scene", "claw-dev"]);
  assert.equal(projectCatalog.find(project => project.projectId === "digital-docent")?.summaryReference?.key, "docent");
  assert.equal(projectCatalog.find(project => project.projectId === "claw-dev")?.worldParticipation, "excluded");
});
test("N: adopted scene contains only preserved V1 scene modules, no Phase 2 art", () => {
  assert.deepEqual([...read(world + "adapters/ArmiDistrictScene.tsx").matchAll(/import \{ (Armi\w+) \}/g)].map(match => match[1]), ["ArmiEnvironment", "ArmiSystemWorld", "ArmiTabletPortal", "ArmiVoiceSignal"]);
  assert.doesNotMatch(read(world + "runtime/WorldCanvas.tsx"), /RoutingChamber|Hangarae|Wedding/);
});
test("responsive synchronization uses actual size and invalidates demand frames", () => {
  assert.match(read(world + "runtime/WorldCanvas.tsx"), /state\.size\.width <= 700/);
  assert.match(read(world + "runtime/WorldCanvas.tsx"), /subscribeFrame\(invalidate\)/);
  assert.match(read(world + "runtime/WorldCanvas.tsx"), /active \? "always" : "demand"/);
  assert.match(read(world + "runtime/WorldHost.tsx"), /ResizeObserver\(measure\)/);
  assert.match(read(world + "adapters/ArmiDistrictScene.tsx"), /ArmiVoiceSignal progress=\{progress\} compact=\{compact\}/);
  assert.match(read(base + "ArmiVoiceSignal.tsx"), /compactPolicy \?\? size\.width < 700/);
});

test("numeric camera/fog regression uses preserved V1 callback as oracle at both layouts and pointer offsets", () => {
  const preserved = (path: string) => execFileSync("git", ["show", `portfolio-world-v1-preserved-2026-10-05:${path}`], { encoding: "utf8" });
  // Dependencies must also remain exact V1 code; comparing against changed math
  // on both sides would otherwise hide a regression.
  for (const file of ["goldenPaths.ts", "paths.ts", "worldConfig.ts", "experienceData.ts"]) {
    assert.equal(read(base + file).replace(/\r\n/g, "\n"), preserved(base + file).replace(/\r\n/g, "\n"));
  }
  const source = preserved(base + "ArmiCameraRig.tsx");
  const body = source.slice(source.indexOf("    const t ="), source.lastIndexOf("  });"));
  const oracle = new Function("camera", "pointer", "scene", "progress", "compact", "target", "travelProgress", "entryLocal", "sampleJourney", "interval", "journeyFov", "PerspectiveCamera", "Fog", "ease", body);
  for (const compact of [false, true]) for (const p of checkpoints) for (const pointer of [{ x: 0, y: 0 }, { x: .8, y: -.4 }]) {
    const camera = new PerspectiveCamera(), target = new Vector3(), scene = { fog: new Fog("#080d10", 12, 42) };
    oracle(camera, pointer, scene, { current: p }, compact, target, travelProgress, entryLocal, sampleJourney, interval, journeyFov, PerspectiveCamera, Fog, ease);
    const sample = sampleArmiCamera(p, compact, pointer), lookdev = sampleArmiLookdev(p, compact);
    assert.deepEqual(sample.position.toArray(), camera.position.toArray());
    assert.deepEqual(sample.target.toArray(), target.toArray());
    assert.deepEqual(sample.up.toArray(), camera.up.toArray());
    assert.equal(sample.fov, camera.fov); assert.equal(sample.far, camera.far);
    assert.equal(lookdev.fogNear, scene.fog.near); assert.equal(lookdev.fogFar, scene.fog.far);
  }
});

test("numeric render intent preserves V1 direct/bloom dispatch and strengths", () => {
  const source = execFileSync("git", ["show", `portfolio-world-v1-preserved-2026-10-05:${base}ArmiLightTreatment.tsx`], { encoding: "utf8" });
  const body = source.slice(source.indexOf("    const p="), source.lastIndexOf("  },1);"));
  const oracle = new Function("progress", "compact", "gl", "scene", "camera", "pipeline", "ease", "interval", body);
  for (const compact of [false, true]) for (const p of [...checkpoints, .32, .965, 1]) {
    let direct = 0, composed = 0;
    const pipeline = { bloom: { strength: 0 }, composer: { render() { composed++; } } };
    oracle({ current: p }, compact, { render() { direct++; } }, {}, {}, pipeline, ease, interval);
    const intent = sampleArmiLookdev(p, compact);
    assert.equal(direct + composed, 1);
    assert.equal(intent.direct, direct === 1);
    if (!intent.direct) assert.equal(intent.bloomStrength, pipeline.bloom.strength);
  }
});
