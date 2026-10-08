import { Color, Group, Matrix4, Mesh, MeshStandardMaterial, PerspectiveCamera, RectAreaLight } from "three";
import type { AnimationClip, Material, Object3D } from "three";
export const armiV015Base = "/models/armi/v015";
export const armiSemanticGroups = ["Core", "Text", "Memory", "Tavily", "Robot", "Response", "Product", "Routes", "Environment", "Anchors"] as const;
export type ArmiManifest = {
  export_default_pose_source_frame: number;
  visibility_contract: Record<string, [number, boolean][]>;
  cameras: { name: string; source_frame: number; aspect: number }[];
  lights: { name: string; type: string; color_linear: number[]; energy_blender: number; size: number | null; size_y: number | null; matrix_gltf: number[][] }[];
};
export type ArmiProductionAsset = {
  root: Group; groups: Map<string, Object3D>; objects: Map<string, Object3D>;
  clips: AnimationClip[]; manifest: ArmiManifest;
};
/** Retain authored coordinates, mesh sharing, robot parent chain and clip targets. */
export function prepareArmiV015(root: Group, clips: AnimationClip[], manifest: ArmiManifest): ArmiProductionAsset {
  const objects = new Map<string, Object3D>();
  const materials = new Map<Material, Material>();
  root.traverse(object => {
    const sourceName = object.userData.web_source_name ?? object.name;
    objects.set(sourceName, object);
    let visible = object.userData.web_default_visible ?? true;
    const events = manifest.visibility_contract[sourceName] ?? object.userData.runtimeVisibility ?? [];
    for (const [frame, state] of events) if (frame <= manifest.export_default_pose_source_frame) visible = state;
    object.visible = visible;
    if (object instanceof Mesh) {
      const cloneMaterial = (source: Material) => {
        if (!materials.has(source)) materials.set(source, source.clone());
        return materials.get(source)!;
      };
      object.material = Array.isArray(object.material) ? object.material.map(cloneMaterial) : cloneMaterial(object.material);
      for (const material of Array.isArray(object.material) ? object.material : [object.material]) {
        if (material instanceof MeshStandardMaterial && !material.userData.v015LookdevCalibrated) {
          material.envMapIntensity = material.metalness > .5 ? 1 : .3;
          if (material.name === "MAT-V008-RobotEnamel") material.roughness = .42;
          if (material.name === "MAT-R1-Architecture") material.color.multiplyScalar(.55);
          material.userData.v015LookdevCalibrated = true;
        }
        if (material.name === "MAT-V013-ActualArmiTabletUI") {
          material.toneMapped = false; material.fog = false;
          object.layers.set(2);
          const map = (material as MeshStandardMaterial).map;
          if (map) map.anisotropy = 8;
        }
      }
    }
  });
  root.updateMatrixWorld(true);
  const groups = new Map<string, Object3D>();
  for (const name of armiSemanticGroups) {
    const group = root.getObjectByName(name);
    if (!group) throw new Error(`ARMI v015 missing semantic group: ${name}`);
    groups.set(name, group);
  }
  return { root, groups, objects, clips, manifest };
}
/** One static reference pose, applied only by WorldCameraController. No timeline. */
export function applyArmiReferenceCamera(asset: ArmiProductionAsset, camera: PerspectiveCamera, name: string) {
  const reference = asset.root.getObjectByName(`CAM-WEB-Reference-${name}`);
  if (!(reference instanceof PerspectiveCamera)) return;
  reference.updateWorldMatrix(true, false);
  reference.matrixWorld.decompose(camera.position, camera.quaternion, camera.scale);
  camera.fov = reference.fov;
  camera.near = reference.near; camera.far = reference.far;
  camera.updateProjectionMatrix();
}
// Consolidated authored roles; no 44-light duplication.
export const armiLightRoles = [
  ["V008-ColdKey", .10], ["V008-FrontStructuralFill", .24],
  ["V008-RearShaftRim", .16], ["V008-TextGold", .6],
  ["V008-MemoryGold", .6], ["V008-SearchBlue", .65],
  ["V008-RobotGold", .6], ["V008-CoreLime", .45],
  ["V010-ChamberDepthFill", .14], ["V010-LowerDistrictRaking", .4],
  ["V010-LeftWingUndercroft", .55], ["V010-RightWingUndercroft", .55],
  ["V008-RobotFront", .45],
  ["V009-ForegroundRaking", .65],
  ["V013-ProductSoftbox", .65], ["V013-ProductRim", .65],
] as const;
export function createArmiLightRig(manifest: ArmiManifest) {
  const rig = new Group(); rig.name = "ARMI_RuntimeLighting";
  const chamber = new Group(), product = new Group();
  chamber.name = "ARMI_ChamberLighting"; product.name = "ARMI_ProductLighting";
  rig.add(chamber, product);
  for (const [role, multiplier] of armiLightRoles) {
    const ref = manifest.lights.find(light => light.name === `LGT-${role}`);
    if (!ref) throw new Error(`Missing authored lighting reference: ${role}`);
    const width = ref.size ?? 1;
    const light = new RectAreaLight(new Color().fromArray(ref.color_linear), ref.energy_blender / (width * width) * multiplier, width, width);
    light.name = `Runtime-${role}`;
    new Matrix4().fromArray(ref.matrix_gltf.flat()).transpose().decompose(light.position, light.quaternion, light.scale);
    (role.startsWith("V013-Product") ? product : chamber).add(light);
  }
  return rig;
}
export const armiLook = { exposure: 2 ** (-.3), environmentIntensity: .065, fogNear: 180, fogFar: 700, bloomStrength: .025, bloomRadius: .1, bloomThreshold: 3.5 };
