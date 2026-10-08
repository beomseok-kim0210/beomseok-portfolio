import { Mesh, MeshStandardMaterial } from "three";
import type { ArmiProductionAsset } from "./armiV015";
import { armiOptionsWindow, local } from "./armiChoreography";

/** Shared GLB materials are cloned only on inactive landmarks, preserving Text and Core. */
export function createArmiRoutingDecision(asset: ArmiProductionAsset) {
  const originals: { mesh: Mesh; material: Mesh["material"]; cloned?: Mesh["material"] }[] = [];
  const materials: { material: MeshStandardMaterial; base: MeshStandardMaterial }[] = [];
  for (const name of ["Memory", "Tavily", "Robot"]) {
    asset.groups.get(name)?.traverse(object => {
      if (!(object instanceof Mesh)) return;
      originals.push({ mesh: object, material: object.material });
      const cloned = (Array.isArray(object.material) ? object.material : [object.material]).map(base => {
        if (!(base instanceof MeshStandardMaterial)) return base;
        const material = base.clone(); materials.push({ material, base }); return material;
      });
      object.material = Array.isArray(object.material) ? cloned : cloned[0];
      originals.at(-1)!.cloned = object.material;
    });
  }
  return {
    sample(p: number) {
      for (const entry of originals) entry.mesh.material = entry.cloned!;
      const selected = local(p, armiOptionsWindow.select, armiOptionsWindow.select + .01);
      for (const { material, base } of materials) {
        material.color.copy(base.color).multiplyScalar(1 - selected * .45);
        material.emissiveIntensity = base.emissiveIntensity * (1 - selected * .85);
      }
    },
    dispose() {
      for (const { mesh, material } of originals) mesh.material = material;
      for (const { material } of materials) material.dispose();
    },
  };
}
