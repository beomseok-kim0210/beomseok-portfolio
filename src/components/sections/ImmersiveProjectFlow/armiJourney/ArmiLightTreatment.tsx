"use client";
import { useEffect, useMemo, type RefObject } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Vector2 } from "three";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
import { ease, interval } from "./experienceData";

/** Existing Three.js passes: modest light spread, no extra dependency.
 * Original ENTRY and actual product landing use the original render pipeline. */
export function ArmiLightTreatment({progress,compact}:{progress:RefObject<number>;compact:boolean}){
  const {gl,scene,camera,size}=useThree();
  const pipeline=useMemo(()=>{
    const composer=new EffectComposer(gl);
    const bloom=new UnrealBloomPass(new Vector2(1,1),.35,.4,.85);
    composer.addPass(new RenderPass(scene,camera));composer.addPass(bloom);composer.addPass(new OutputPass());
    return{composer,bloom};
  },[gl,scene,camera]);
  useEffect(()=>{pipeline.composer.setPixelRatio(compact?1:Math.min(gl.getPixelRatio(),1.5));pipeline.composer.setSize(size.width,size.height);},[pipeline,size.width,size.height,compact,gl]);
  useEffect(()=>()=>{pipeline.composer.passes.forEach(pass=>pass.dispose());pipeline.composer.dispose();},[pipeline]);
  useFrame(()=>{
    const p=progress.current;
    if(p<=.32||p>=.965){gl.render(scene,camera);return;}
    pipeline.bloom.strength=(compact?.23:.36)*ease(interval(p,.32,.43))*(1-ease(interval(p,.92,.965)));
    pipeline.composer.render();
  },1);
  return null;
}
