import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { Group, Mesh } from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { createArmiSelectedRoute } from "../src/features/world/adapters/armiSelectedRoute";
import type { ArmiProductionAsset } from "../src/features/world/adapters/armiV015";

test("authored replacement GLB loads independently and restores activation / legacy suppression on reverse seek",async()=>{
  const bytes=readFileSync("public/models/armi/v016/ARMI_v016_TextRoute.glb");
  const gltf=await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),"");
  assert.equal(gltf.scene.children.length,3);assert.equal(gltf.animations.length,0);
  const legacy=new Group(),oldSignal=new Group();
  const asset={objects:new Map([["GEO-R1-Highway-ANSWER",legacy],["GEO-V013-SelectedSignal-ANSWER",oldSignal]])} as unknown as ArmiProductionAsset;
  const route=createArmiSelectedRoute(asset,gltf.scene);
  const deck=gltf.scene.getObjectByName("GEO-V016-TextContinuousDeck") as Mesh;
  deck.geometry.computeBoundingBox();assert.ok(deck.geometry.boundingBox!.min.x < -40);assert.ok(deck.geometry.boundingBox!.min.y<40);
  const signal=gltf.scene.getObjectByName("GEO-V016-TextActivation") as Mesh;
  route.sample(.48);const count=signal.geometry.drawRange.count;
  assert.equal(legacy.visible,false);assert.equal(oldSignal.visible,false);
  route.sample(.31);assert.ok(signal.geometry.drawRange.count<count);
  route.sample(.9);assert.equal(signal.visible,false);
  oldSignal.visible=true;route.sample(.48);
  assert.equal(signal.geometry.drawRange.count,count);assert.equal(signal.visible,true);assert.equal(oldSignal.visible,false);
  route.dispose();assert.equal(legacy.visible,true);
});
