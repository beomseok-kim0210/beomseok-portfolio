import { Mesh, MeshStandardMaterial } from "three";
import type { ArmiProductionAsset } from "./armiV015";
import { armiOptionsWindow, local } from "./armiChoreography";

export function routingCue(p: number) {
  const rise = local(p,.317,.331);
  const glow = Math.sin(rise*Math.PI/2) * (1-local(p,armiOptionsWindow.start,armiOptionsWindow.start+.012));
  const t = local(p,armiOptionsWindow.select,armiOptionsWindow.select+.035);
  const blink = t > 0 && t < 1 ? Math.sin(t*3*Math.PI)**2 : 0;
  return { glow, blink, blend: local(p,armiOptionsWindow.start,armiOptionsWindow.start+.012) };
}

/** Isolate only the named sign/spindle materials; no global bloom/exposure boost. */
export function createArmiRoutingCue(asset: ArmiProductionAsset) {
  const entries: { mesh: Mesh; original: Mesh["material"]; cloned: Mesh["material"] }[]=[];
  const materials: { material: MeshStandardMaterial; intensity: number; sign: boolean; ring: boolean }[]=[];
  for (const name of ["GEO-V015-Core-RoutingSelectorLabel","GEO-V015-Core-RoutingInternal","GEO-V014-Core-SwitchingSpindle","GEO-V014-Core-SelectorRotor--2.9","GEO-V014-Core-SelectorRotor-2.9"]) {
    asset.objects.get(name)?.traverse(node=>{
      if (!(node instanceof Mesh)) return;
      const original=node.material;
      const cloned=(Array.isArray(original)?original:[original]).map(base=>{
        if (!(base instanceof MeshStandardMaterial)) return base;
        const sign=name.includes("Routing"),ring=name.includes("SelectorRotor");
        if(ring&&base.name!=="M_ARMI_FUNCTIONAL_LIME")return base;
        const material=base.clone();
        if (!sign&&!ring) material.emissive.set("#8dba49");
        materials.push({material,intensity:base.emissiveIntensity,sign,ring});
        return material;
      });
      entries.push({mesh:node,original,cloned:Array.isArray(original)?cloned:cloned[0]});
    });
  }
  return { sample(p:number) {
    const {glow}=routingCue(p);
    for(const entry of entries)entry.mesh.material=entry.cloned;
    for(const {material,intensity,sign,ring} of materials)material.emissiveIntensity=ring?(p>=.31&&p<.357?Math.min(intensity,.65)*(.2+.8*glow)+glow*.45:intensity):sign?(p>=.31&&p<.357?Math.min(intensity,1.1):intensity)+glow*.4:glow*.18;
  },dispose(){for(const entry of entries)entry.mesh.material=entry.original; for(const {material} of materials)material.dispose();} };
}
