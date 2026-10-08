import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { AnimationClip, Group, Mesh, BoxGeometry, MeshStandardMaterial, PerspectiveCamera, Quaternion, VectorKeyframeTrack, Vector3 } from "three";
import { prepareArmiV015, armiSemanticGroups, type ArmiManifest } from "../src/features/world/adapters/armiV015";
import { armiMotionWindows, createArmiCameraPath, createArmiMotion, productTransition,coreRotorAngle } from "../src/features/world/adapters/armiChoreography";

import { createArmiRoutingDecision } from "../src/features/world/adapters/armiRoutingDecision";

function fixture() {
  const root = new Group();
  for (const name of armiSemanticGroups) { const group = new Group(); group.name = name; root.add(group); }
  const moving = new Group(); moving.name = "request"; root.getObjectByName("Text")!.add(moving);
  const door = new Group(); door.name = "GEO-V015-Core-SelectedSideWall"; door.position.y = 43; root.getObjectByName("Core")!.add(door);
  const clips = armiMotionWindows.map(w => new AnimationClip(w.clip, 1, w.group === "Text" ? [new VectorKeyframeTrack("request.position", [0, 1], [0, 0, 0, 10, 20, 30])] : []));
  const source = JSON.parse(readFileSync("public/models/armi/v015/runtime-manifest.json", "utf8"));
  const bytes = readFileSync("public/models/armi/v015/ARMI_v015_Web.glb");
  const document = JSON.parse(bytes.subarray(20, 20 + bytes.readUInt32LE(12)).toString());
  for (const ref of source.cameras) {
    const camera = new PerspectiveCamera(65, 1, .1, 1000); camera.name = ref.name;
    const node = document.nodes.find((n: { name: string }) => n.name === ref.name);
    camera.position.fromArray(node.translation); camera.quaternion.fromArray(node.rotation ?? [0, 0, 0, 1]); root.add(camera);
  }
  const manifest: ArmiManifest = { ...source, visibility_contract: { request: [[121, false], [150, true], [180, false]] } };
  return { asset: prepareArmiV015(root, clips, manifest), moving };
}
test("Core inspection holds its entry camera while rotor speed rises deterministically",()=>{
  const {asset}=fixture(),path=createArmiCameraPath(asset),camera=new PerspectiveCamera();
  path.sample(.31,camera);const position=camera.position.clone(),rotation=camera.quaternion.clone(),fov=camera.fov;
  for(const p of [.318,.33,.344,.37,.41]){path.sample(p,camera);assert.ok(camera.position.distanceTo(position)<1e-10);assert.ok(camera.quaternion.angleTo(rotation)<1e-7);assert.equal(camera.fov,fov);}
  const early=coreRotorAngle(.316)-coreRotorAngle(.315),late=coreRotorAngle(.339)-coreRotorAngle(.338);
  assert.ok(late>early*5);assert.ok(Math.abs(coreRotorAngle(.345)-Math.PI*4)<1e-10);
});
test("arbitrary reverse seeks restore the same authored transforms and visibility", () => {
  const { asset, moving } = fixture(), motion = createArmiMotion(asset);
  motion.sample(.53); const position = moving.position.clone(), visible = moving.visible;
  for (const p of [.91, .2, .8, .6, .53]) motion.sample(p);
  assert.ok(moving.position.equals(position)); assert.equal(moving.visible, visible);
  motion.sample(.1); assert.deepEqual(moving.position.toArray(), [0, 0, 0]); assert.equal(moving.visible, false);
  assert.equal(asset.groups.get("Product")!.visible, false);
  const door = asset.objects.get("GEO-V015-Core-SelectedSideWall")!;
  motion.sample(.445); assert.equal(door.position.y, 29);
  motion.sample(.8); assert.equal(door.position.y, 43);
  motion.sample(.445); assert.equal(door.position.y, 29);
  motion.dispose(); motion.sample(.53); assert.ok(moving.position.equals(position));
});
test("camera path is continuous and independent of scroll direction", () => {
  const { asset } = fixture(), path = createArmiCameraPath(asset), camera = new PerspectiveCamera();
  const lastPosition = new Vector3(), lastRotation = new Quaternion();
  for (let i = 0; i <= 1000; i++) {
    path.sample(i / 1000, camera);
    if (i) { assert.ok(lastPosition.distanceTo(camera.position) < 7); assert.ok(lastRotation.angleTo(camera.quaternion) < .3, `rotation step at ${i / 1000}: ${lastRotation.angleTo(camera.quaternion)}`); }
    lastPosition.copy(camera.position); lastRotation.copy(camera.quaternion);
  }
  path.sample(.55, camera); const position = camera.position.clone(), rotation = camera.quaternion.clone();
  path.sample(.92, camera); path.sample(.1, camera); path.sample(.55, camera);
  assert.ok(position.equals(camera.position)); assert.ok(rotation.equals(camera.quaternion));
});
test("real UI has deterministic opaque endpoints and an unobstructed chamber middle", () => {
  assert.equal(productTransition(0).opacity, 1); assert.equal(productTransition(1).opacity, 1);
  assert.equal(productTransition(.5).opacity, 0);
  assert.equal(productTransition(1).returning, true);
});



test("inactive district dimming isolates shared materials and restores on reverse seeks", () => {
  const { asset } = fixture();
  const shared = new MeshStandardMaterial({ color: 0xffffff, emissive: 0xffffff, emissiveIntensity: 2 });
  const text = new Mesh(new BoxGeometry(), shared), memory = new Mesh(new BoxGeometry(), shared);
  asset.groups.get("Text")!.add(text); asset.groups.get("Memory")!.add(memory);
  const decision = createArmiRoutingDecision(asset);
  decision.sample(.5);
  assert.equal((text.material as MeshStandardMaterial).emissiveIntensity, 2);
  assert.ok((memory.material as MeshStandardMaterial).emissiveIntensity < .31);
  decision.sample(.24); assert.equal((memory.material as MeshStandardMaterial).emissiveIntensity, 2);
  decision.dispose(); assert.equal(memory.material, shared);
  decision.sample(.5); assert.notEqual(memory.material, shared, "development remount restores runtime binding");
  decision.dispose(); text.geometry.dispose(); memory.geometry.dispose(); shared.dispose();
});

test("candidate animations are scroll sampled previews and disappear outside the split beat", () => {
  const { asset } = fixture();
  const memory = new Group(); memory.name = "preview-memory"; asset.groups.get("Memory")!.add(memory);
  asset.objects.set(memory.name, memory);
  asset.manifest.visibility_contract[memory.name] = [[189, true]];
  asset.clips.push(new AnimationClip("Memory_AuthoredMotion", 1, [new VectorKeyframeTrack("preview-memory.position", [0,1], [0,0,0,0,8,0])]));
  const motion = createArmiMotion(asset);
  motion.sample(.375); assert.equal(memory.visible, true); assert.ok(memory.position.y > 0);
  const pose = memory.position.clone();
  motion.sample(.55); assert.equal(memory.visible, false); assert.equal(memory.position.y,0);
  motion.sample(.375); assert.ok(memory.position.equals(pose));
  motion.dispose();
});
