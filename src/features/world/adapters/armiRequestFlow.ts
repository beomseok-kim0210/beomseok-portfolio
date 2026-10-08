import { CatmullRomCurve3, CurvePath, LineCurve3, Group, Mesh, MeshBasicMaterial, PointLight, SphereGeometry, TorusGeometry, TubeGeometry, Vector3 } from "three";
import type { BufferGeometry, PerspectiveCamera } from "three";
import type { ArmiProductionAsset } from "./armiV015";
import { local } from "./armiChoreography";

export const requestArrivals={Core:.31,Text:.507,Response:.68} as const;
export const ingressControls=[[-4,1,24],[-5,14,6],[-3,28,-9],[-2.25,36.8,-14],[-2.0395,39.25,-16.223]];
const textControls=[[-6.277,39.55,-24.539],[-10,41.65,-27.3],[-15,46.15,-31.8],[-20,49.5,-36],[-25,53,-40],[-31,57,-44],[-37,62,-48],[-37,64.8,-54]];
const elevated=(points:number[][])=>points.map(p=>[p[0],p[1]+1.1,p[2]]);

export const requestLegs=[
  {id:"ingress",start:.155,end:requestArrivals.Core,hold:.31,points:elevated(ingressControls),trail:false},
  {id:"core",start:.31,end:.33,hold:.33,points:[elevated(ingressControls).at(-1)!,[-1.1,41,-18.5],[-2.5,41.1,-22]],trail:false},
  {id:"core-hold",start:.33,end:.422,hold:.422,points:[[-2.5,41.1,-22],[-2.5,41.1,-22]],trail:false},
  {id:"core-exit",start:.422,end:.442,hold:.442,points:[[-2.5,41.1,-22],[-4,41,-23],elevated(textControls)[0]],trail:false},
  {id:"text",start:.442,end:requestArrivals.Text,hold:.59,points:elevated(textControls),trail:false},
  {id:"response",start:.59,end:requestArrivals.Response,hold:.88,points:[[0,35,-152],[0,61,-152],[0,61,-166]],trail:true},
  {id:"return",start:.88,end:.905,hold:.905,points:[[0,61,-166],[0,61,-156],[0,61,-145]],trail:false},
] as const;
const curveProgress=(_id:string,t:number)=>t;
export function sampleRequest(p:number){
  const leg=requestLegs.find(l=>p>=l.start && p<l.hold);
  if(!leg)return null;
  const t=local(p,leg.start,leg.end);
  const curve=new CatmullRomCurve3(leg.points.map(v=>new Vector3(...v)),false,"catmullrom",.5);
  return {id:leg.id,t,arrived:p>=leg.end,position:leg.id==="ingress"?curve.getPointAt(t):curve.getPoint(curveProgress(leg.id,t))};
}

/** Project the viewer's nearby forward point onto the rail, never into screen space. */
export function railRequestProgress(points:Vector3[],camera:PerspectiveCamera){
  const target=new Vector3(0,0,-8).applyQuaternion(camera.quaternion).add(camera.position);
  let best=0,distance=Infinity;
  points.forEach((point,i)=>{const d=point.distanceToSquared(target);if(d<distance){distance=d;best=i;}});
  return best/(points.length-1);
}
function trackCurve(points:number[][]){
  const curve=new CurvePath<Vector3>();
  for(let i=1;i<points.length;i++)curve.add(new LineCurve3(new Vector3(...points[i-1]),new Vector3(...points[i])));
  return curve;
}
export function authoredRequestTracks(){
  return { response:[[0,35,-152],[0,61,-152],[0,61,-166]] };
}

export function createArmiRequestFlow(asset:ArmiProductionAsset,ingress:Group){
  const group=new Group();group.name="ARMI_RequestFlow";group.add(ingress);
  const head=new Group();head.name="ARMI_RequestHead";
  const bright=new MeshBasicMaterial({color:0xd2f059,toneMapped:false});
  const core=new Mesh(new SphereGeometry(.72,16,12),bright);
  const ring=new Mesh(new TorusGeometry(1.05,.085,6,32),bright);
  head.add(core,ring,new PointLight(0xc6f54a,24,11,2));group.add(head);
  const tracks=authoredRequestTracks();
  const trajectories=requestLegs.map(leg=>{
    const points=tracks[leg.id as keyof typeof tracks];
    const curve=points?trackCurve(points):new CatmullRomCurve3(leg.points.map(v=>new Vector3(...v)),false,"catmullrom",.5);
    const trail=leg.trail?new Mesh(new TubeGeometry(curve,80,.09,4,false),bright):null;
    if(trail)group.add(trail);
    return {leg,curve,trail,samples:curve.getPoints(200)};
  });
  const signal=ingress.getObjectByName("GEO-V017-BoxIngressSignal") as Mesh;
  const originalSignalGeometry=signal.geometry;
  signal.geometry=originalSignalGeometry.clone();
  const signalCount=signal.geometry.index?.count??0;
  const hideNames=["GEO-V014-Core-SelectedPath","GEO-V014-Core-SwitchingConduitBed",...['ANSWER','MEMORY','SEARCH','ROBOT'].flatMap(k=>[`GEO-V013-${k}-Request`,`GEO-V013-SelectedSignal-${k}`])];
  const hidden=hideNames.map(name=>({object:asset.objects.get(name),visible:asset.objects.get(name)?.visible}));
  // Original ingress is part of environment batches. Remove only its corridor.
  const oldCurve=new CatmullRomCurve3([[-4,1,24],[-5,14,6],[-3,28,-9],[0,38,-18],[0,40.25,-23]].map(v=>new Vector3(...v)),false,"catmullrom",.5).getPoints(120);
  const repairs:{mesh:Mesh;original:BufferGeometry;replacement:BufferGeometry}[]=[];
  const candidates=new Set<Mesh>();
  asset.root.traverse(node=>{
    const sources=node.userData.web_batched_sources??[];
    if(sources.some((n:string)=>['GEO-R1-Highway-RequestIngress','GEO-R1-Highway-RequestIngress-Deck','GEO-V009-RequestBridgeIndicators'].includes(n)))node.traverse(child=>{if(child instanceof Mesh)candidates.add(child);});
  });
  for(const mesh of candidates){
    const original=mesh.geometry,pos=original.getAttribute('position'),index=original.index,kept:number[]=[];
    for(let i=0;i<(index?.count??pos.count);i+=3){
      const ids=[0,1,2].map(j=>index?index.getX(i+j):i+j);
      const center=new Vector3(...[0,1,2].map(axis=>ids.reduce((sum,v)=>sum+pos.getComponent(v,axis),0)/3));
      if(oldCurve.some(p=>p.distanceToSquared(center)<3.25**2))continue;
      kept.push(...ids);
    }
    const replacement=original.clone();replacement.setIndex(kept);repairs.push({mesh,original,replacement});
  }
  const progressFor=(p:number,entry:typeof trajectories[number])=>{
    if(entry.leg.id!=="response")return curveProgress(entry.leg.id,local(p,entry.leg.start,entry.leg.end));
    const length=entry.curve.getLength(),liftStart=1-40/length,liftEnd=1-14/length;
    if(p<.635)return liftStart;
    if(p<.67)return liftStart+(liftEnd-liftStart)*local(p,.635,.67);
    return liftEnd+(1-liftEnd)*local(p,.67,requestArrivals.Response);
  };
  const railProgress=(entry:typeof trajectories[number],camera:PerspectiveCamera,p:number)=>{
    if(entry.leg.id==="core-hold")return 0;
    // Same scroll interval as the physical camera entry; no nearest-point jumps inside.
    if(entry.leg.id==="core" || entry.leg.id==="core-exit")return local(p,entry.leg.start,entry.leg.end);
    const projected=railRequestProgress(entry.samples,camera);
    if(entry.leg.id==="ingress")return entry.curve.getUtoTmapping(local(p,entry.leg.start,entry.leg.end),0);
    return entry.leg.id==="text"?projected+(1-projected)*local(p,.50,requestArrivals.Text):projected;
  };
  return {group,textTrackProgress(camera:PerspectiveCamera,p:number){
    return p<.442?0:p>=requestArrivals.Text?1:railProgress(trajectories.find(e=>e.leg.id==="text")!,camera,p);
  },sample(p:number,camera:PerspectiveCamera){
    for(const {object} of hidden)if(object)object.visible=false;
    for(const {mesh,replacement} of repairs)mesh.geometry=replacement;
    const current=trajectories.find(({leg})=>p>=leg.start && p<leg.hold);
    head.visible=!!current && !(p>=.31&&p<.422) && !(current.leg.id==="response" && p<.635);
    if(current){
      head.position.copy(current.curve.getPoint(p<requestArrivals.Text?railProgress(current,camera,p):progressFor(p,current)));
      bright.depthTest=true;
      const size=Math.max(.25,Math.min(2.2,head.position.distanceTo(camera.position)*.023));
      head.scale.setScalar(size);ring.quaternion.copy(camera.quaternion);
    }
    for(const entry of trajectories){const {leg,trail}=entry;if(trail){
      trail.visible=p>=leg.start && p<leg.hold && !(leg.id==="response" && p<.635);
      trail.geometry.setDrawRange(0,Math.floor(progressFor(p,entry)*80)*24);
    }}
    signal.visible=p>=.155 && p<.442;
    const ingressProgress=p>=requestArrivals.Core?1:railProgress(trajectories[0],camera,p);
    signal.geometry.setDrawRange(0,Math.floor(ingressProgress*signalCount/3)*3);
  },dispose(){
    for(const {object,visible} of hidden)if(object)object.visible=visible??true;
    for(const {mesh,original,replacement} of repairs){mesh.geometry=original;replacement.dispose();}
    signal.geometry.dispose();signal.geometry=originalSignalGeometry;
    core.geometry.dispose();ring.geometry.dispose();bright.dispose();for(const {trail} of trajectories)trail?.geometry.dispose();
  }};
}
