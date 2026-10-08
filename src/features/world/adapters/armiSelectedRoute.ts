import { Mesh, MeshStandardMaterial } from "three";
import type { BufferGeometry, Group } from "three";
import type { ArmiProductionAsset } from "./armiV015";

/** Blender-authored replacement: one continuous sweep, no overlapping runtime deck. */
export function createArmiSelectedRoute(asset: ArmiProductionAsset, group: Group) {
  const replaced=["GEO-R1-Highway-ANSWER","GEO-V014-CoreToText-ConnectorDeck","GEO-V014-CoreToText-SelectedConduit","GEO-V013-SelectedSignal-ANSWER"];
  const previous=replaced.map(name=>({object:asset.objects.get(name),visible:asset.objects.get(name)?.visible}));
  const signal=group.getObjectByName("GEO-V016-TextActivation") as Mesh;
  if(!signal)throw new Error("Missing authored v016 Text activation mesh");
  const material=(signal.material as MeshStandardMaterial).clone();signal.material=material;
  material.emissiveIntensity=2.4;
  const selectedMaterial=material.clone();selectedMaterial.emissiveIntensity=.65;
  const selected=new Mesh(signal.geometry.clone(),selectedMaterial);selected.name="ARMI_TextSelectedRoute";
  selected.position.copy(signal.position);selected.quaternion.copy(signal.quaternion);selected.scale.copy(signal.scale);
  const selectedParent=signal.parent!;selectedParent.add(selected);
  const fullCount=signal.geometry.index?.count??signal.geometry.getAttribute("position").count;
  const repairs:{mesh:Mesh;original:BufferGeometry;replacement:BufferGeometry}[]=[];
  const detailNames=["GEO-V009-BridgeDiaphragmsAndDeckJoints","GEO-V009-BridgeCoreAndLandingThresholds","GEO-V009-BridgeFunctionalGuides"];
  const source=asset.objects.get("GEO-R1-Highway-ANSWER");
  const routePoints=(JSON.parse(source?.userData.route_points??"[]") as number[][]).map(p=>[p[0],p[2],-p[1]]);
  const candidates=new Set<Mesh>();
  asset.root?.traverse(node=>{
    const sources=node.userData.web_batched_sources??[node.userData.web_source_name??node.name];
    if(sources.some((name:string)=>detailNames.includes(name)))node.traverse(child=>{if(child instanceof Mesh)candidates.add(child);});
  });
  for(const object of candidates){
      const original=object.geometry,position=original.getAttribute("position"),index=original.index,kept:number[]=[];
      for(let i=0;i<(index?.count??position.count);i+=3){
        const vertices=[0,1,2].map(j=>index?index.getX(i+j):i+j);
        const center=[0,1,2].map(axis=>vertices.reduce((sum,v)=>sum+position.getComponent(v,axis),0)/3);
        let closest=-1,distance=Infinity;
        routePoints.forEach((p,j)=>{const d=(center[0]-p[0])**2+(center[2]-p[2])**2;if(d<distance){distance=d;closest=j;}});
        if(closest>=0){
          const p=routePoints[closest],t=closest/(routePoints.length-1);
          const width=2.65+1.45*Math.min(1,t*2)+2.9*Math.max(0,(t-.72)/.28);
          if(distance<(width+.7)**2 && Math.abs(center[1]-p[1])<.85)continue;
        }
        kept.push(...vertices);
      }
      const replacement=original.clone();replacement.setIndex(kept);repairs.push({mesh:object,original,replacement});
  }
  return {group,sample(p:number,trackProgress?:number){
    if(!selected.parent)selectedParent.add(selected);
    for(const {object} of previous)if(object)object.visible=false;
    for(const {mesh,replacement} of repairs)mesh.geometry=replacement;
    selected.visible=p>=.402 && p<.59;
    selected.geometry.setDrawRange(0,fullCount);
    signal.visible=p>=.442 && p<.59;
    signal.geometry.setDrawRange(0,Math.floor(Math.max(0,Math.min(1,trackProgress??(p-.442)/.065))*fullCount/3)*3);
  },dispose(){
    for(const {object,visible} of previous)if(object)object.visible=visible??true;
    for(const {mesh,original,replacement} of repairs){mesh.geometry=original;replacement.dispose();}
    selected.removeFromParent();selected.geometry.dispose();selectedMaterial.dispose();material.dispose();
  }};
}
