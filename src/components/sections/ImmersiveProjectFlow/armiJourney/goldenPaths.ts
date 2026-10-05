import { Vector3 } from "three";
import { cameraPath, lookPath, travelProgress } from "./paths";
import { ease, entryLocal, interval } from "./experienceData";
import { spatialCurve as curve, worldRoutes } from "./worldConfig";
export const routeCurves=worldRoutes;
export const returnCurve=curve([[-20,10,-68],[-22,14,-46],[-14,9,-29],[-3,4,-13],[.3,-.4,.1]]);
const legs=[
  {start:.43,end:.60,camera:curve([[0,3,-21],[-5,9,-23],[1,8,-25]]),look:curve([[0,4,-38],[0,6,-48],[0,5,-44]])},
  {start:.60,end:.70,camera:curve([[1,8,-25],[1,8,-25],[4,3,-24]]),look:curve([[0,5,-44],[0,5,-44],[5,3,-43]])},
  {start:.70,end:.84,camera:curve([[4,3,-24],[10,5,-37],[-1,6,-51],[-20,10.8,-56]]),look:curve([[5,3,-43],[3,4,-49],[-10,8,-62],[-20,10,-68]])},
  {start:.84,end:.92,camera:curve([[-20,10.8,-56],[-20.1,10.8,-56.2],[-20,10.8,-56]]),look:curve([[-20,10,-68],[-20,10,-68]])},
  {start:.92,end:.985,camera:curve([[-20,10.8,-56],[-30,16,-45],[-25,9,-28],[-10,3,-9],[2.4,.6,12]]),look:curve([[-20,10,-68],[-14,9,-29],[2.4,0,0]])},
];
const sttSignal=curve([[-1.15,.1,-8.4],[-2,1,-12],[2,3,-17],[7,3,-21],[1,3,-29]]);
const sttObserve=new Vector3(-4,2,-8),sttFocus=new Vector3(2.8,3,-18),entry=new Vector3(0,3,-21),entryFocus=new Vector3(0,4,-38);
const responseLook=new Vector3(),travelLook=new Vector3(),productFocus=new Vector3(2.4,0,0),junction=new Vector3(0,5,-44);
export function compactScale(p:number){return ease(interval(p,.32,.35))*(1-ease(interval(p,.92,.95)));}
export function compressWorld(p:number,point:Vector3){const t=compactScale(p);point.x*=1-.5*t;point.y*=1-.3*t;}
export function sampleSignal(p:number,position:Vector3,compact=false){
  if(p<.43)sttSignal.getPointAt(ease(interval(p,.32,.43)),position);
  else if(p<.60)position.set(1,3,-29).lerp(junction,ease(interval(p,.43,.60)));
  else if(p<.70)position.set(0,5,-44);
  else if(p<.84)routeCurves[0].getPointAt(ease(interval(p,.70,.82)),position);
  else if(p<.92)position.set(-20,10,-68);
  else returnCurve.getPointAt(ease(interval(p,.92,.98)),position);
  if(compact)compressWorld(p,position);
}
const desktopFov=[[.32,43],[.38,46],[.43,50],[.57,56],[.70,50],[.78,48],[.84,42],[.92,42],[.985,43]];
const mobileFov=[[.32,43],[.38,56],[.43,62],[.57,68],[.70,65],[.84,52],[.92,52],[.985,43]];
export function journeyFov(p:number,compact:boolean){
  if(p<=.32)return 43;
  const stops=compact?mobileFov:desktopFov;
  const i=stops.findIndex(s=>p<=s[0]);if(i<0)return 43;
  const a=stops[Math.max(0,i-1)],b=stops[i];return a[1]+(b[1]-a[1])*ease(interval(p,a[0],b[0]));
}
export function sampleJourney(progress:number,compact:boolean,position:Vector3,target:Vector3){
  const p=Math.max(0,Math.min(1,progress));
  if(p<=.32){const t=travelProgress(entryLocal(p));cameraPath.getPointAt(t,position);lookPath.getPointAt(t,target);if(compact){position.z+=(1-t)*12;target.x+=(1-t)*.8;}return;}
  if(p<.43){
    if(p<=.395){const t=ease(interval(p,.32,.395));position.set(-1.4,.15,-7).lerp(sttObserve,t);target.set(-1.5,.2,-12).lerp(sttFocus,t);}
    else{const t=ease(interval(p,.395,.43));position.copy(sttObserve).lerp(entry,t);target.copy(sttFocus).lerp(entryFocus,t);}
    // Keep mobile STT behind the product plane: excessive pullback re-exposes its back face.
    if(compact){compressWorld(p,position);compressWorld(p,target);position.z+=Math.sin(interval(p,.32,.43)*Math.PI)*4;}
    return;
  }
  const leg=legs.find(item=>p<=item.end)??legs[legs.length-1];
  const local=interval(p,leg.start,leg.end);
  const move=p>=.60&&p<.70?ease(interval(p,.665,.70)):p>=.92?ease(interval(p,.938,.985)):ease(local);
  leg.camera.getPointAt(move,position);leg.look.getPointAt(p>=.60&&p<.70?ease(interval(p,.655,.70)):ease(local),target);
  if(p>=.70&&p<.84){sampleSignal(Math.min(.84,p+.006),travelLook);target.lerp(travelLook,ease(interval(p,.70,.735))*.85);}
  if(p>=.92){sampleSignal(p,responseLook);target.copy(responseLook).lerp(productFocus,ease(interval(p,.963,.985)));}
  if(compact){
    compressWorld(p,position);compressWorld(p,target);
    position.z+=8*Math.sin(interval(p,.43,.70)*Math.PI);
    position.z+=7*ease(interval(p,.75,.84))*(1-ease(interval(p,.92,.95)));
    if(p>.92){position.z+=ease(interval(p,.96,.985))*14;target.y-=ease(interval(p,.955,.985))*2.1;}
  }
}
