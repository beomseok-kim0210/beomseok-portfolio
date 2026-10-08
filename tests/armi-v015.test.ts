import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { BoxGeometry, Group, Mesh, MeshStandardMaterial, PerspectiveCamera } from "three";
import { applyArmiReferenceCamera, armiSemanticGroups, prepareArmiV015, type ArmiManifest } from "@/features/world/adapters/armiV015";

const manifest = JSON.parse(readFileSync("public/models/armi/v015/runtime-manifest.json", "utf8")) as ArmiManifest;
function rootFixture() {
  const root = new Group();
  for (const name of armiSemanticGroups) { const group = new Group(); group.name = name; root.add(group); }
  return root;
}
test("shared materials calibrate once, keep authored loader materials and independent groups intact", () => {
  const root = rootFixture(), material = new MeshStandardMaterial({ color: .5 });
  material.name = "MAT-R1-Architecture";
  const before = material.color.clone();
  const a = new Mesh(new BoxGeometry(), material), b = new Mesh(a.geometry, material);
  root.getObjectByName("Environment")!.add(a, b);
  const asset = prepareArmiV015(root, [], manifest);
  assert.equal(a.material, b.material); assert.notEqual(a.material, material);
  assert.ok(a.material.color.equals(before.clone().multiplyScalar(.55)));
  assert.ok(material.color.equals(before)); assert.equal(a.geometry, b.geometry);
  assert.equal(asset.groups.size, 10);
});
test("manifest default pose visibility and UI isolation do not require playing an animation", () => {
  const root = rootFixture(), geometry = new BoxGeometry();
  const incoming = new Mesh(geometry, new MeshStandardMaterial()); incoming.name = "GEO-V014-IncomingRecord-WEB";
  incoming.userData.web_default_visible = true; root.add(incoming);
  const material = new MeshStandardMaterial(); material.name = "MAT-V013-ActualArmiTabletUI";
  const ui = new Mesh(geometry, material); root.getObjectByName("Product")!.add(ui);
  prepareArmiV015(root, [], manifest);
  assert.equal(incoming.visible, false); assert.equal(ui.layers.mask, 1 << 2);
  assert.equal(ui.material.toneMapped, false); assert.equal(ui.material.fog, false);
});
test("reference sampling keeps the live camera and honors authored world transform", () => {
  const root = rootFixture(); root.position.set(10, 20, 30);
  const reference = new PerspectiveCamera(72, .88, .1, 1000);
  reference.name = "CAM-WEB-Reference-RoutingHero"; reference.position.set(0, 50, 60); root.add(reference);
  const asset = prepareArmiV015(root, [], manifest), live = new PerspectiveCamera();
  applyArmiReferenceCamera(asset, live, "RoutingHero");
  assert.deepEqual(live.position.toArray(), [10, 70, 90]); assert.equal(live.fov, 72); assert.equal(live.far, 1000);
  assert.equal(live.parent, null);
});
