"use client";
import { createContext } from "react";
import { GLTFLoader, type GLTF } from "three/addons/loaders/GLTFLoader.js";
import { DRACOLoader } from "three/addons/loaders/DRACOLoader.js";

export type AuditVariant = "baseline" | "A" | "B" | "C" | "D";
export const ArmiAuditContext=createContext<{variant:AuditVariant;alternatives:boolean;response:boolean;trial:number}|null>(null);
export const auditLoads: {url:string;bytes:number;fetchMs:number;parseDecodeMs:number;totalMs:number}[]=[];
/** Diagnostic route only: fetch and GLTF parse/Draco timing boundaries are explicit. */
export class AuditGLTFLoader extends GLTFLoader {
  override load(url:string,onLoad:(gltf:GLTF)=>void,_onProgress?:((event:ProgressEvent)=>void),onError?:(error:unknown)=>void){
    const start=performance.now();
    void fetch(url,{cache:"no-store"}).then(async response=>{
      if(!response.ok)throw Error(`Audit asset ${response.status}: ${url}`);
      const bytes=await response.arrayBuffer(),fetched=performance.now();
      const gltf=await this.parseAsync(bytes,url.slice(0,url.lastIndexOf("/")+1));
      const parsed=performance.now();auditLoads.push({url,bytes:bytes.byteLength,fetchMs:fetched-start,parseDecodeMs:parsed-fetched,totalMs:parsed-start});onLoad(gltf);
    }).catch(error=>onError?.(error));
  }
}
export function configureAuditLoader(loader:GLTFLoader){loader.setDRACOLoader(new DRACOLoader().setDecoderPath("/models/armi/v015/decoder/").setWorkerLimit(2));}


export { createAuditInstances,createAuditDrawCounter,auditDomainCounters } from "./auditInstancing";
