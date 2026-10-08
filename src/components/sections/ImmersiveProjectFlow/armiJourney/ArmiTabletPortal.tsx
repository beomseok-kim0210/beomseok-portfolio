"use client";
import { useEffect, useMemo, useRef, type RefObject } from "react";
import { useFrame } from "@react-three/fiber";
import { useTexture } from "@react-three/drei";
import { DoubleSide, ShaderMaterial, SRGBColorSpace, VideoTexture } from "three";
import { ease, entryLocal, interval, productEvidence } from "./experienceData";

/** Original media + an explicitly illustrative aperture. Never a simulated app. */
export function ArmiTabletPortal({ progress, video }: { progress: RefObject<number>; video: HTMLVideoElement | null }) {
  const poster = useTexture(productEvidence.poster);
  const returnPoster = useTexture(productEvidence.returnPoster);
  useEffect(() => { returnPoster.colorSpace = SRGBColorSpace; returnPoster.needsUpdate = true; }, [returnPoster]);
  useEffect(() => { poster.colorSpace = SRGBColorSpace; poster.needsUpdate = true; }, [poster]);
  const videoTexture = useMemo(() => video ? new VideoTexture(video) : null, [video]);
  useEffect(() => { if (videoTexture) videoTexture.colorSpace = SRGBColorSpace; return () => videoTexture?.dispose(); }, [videoTexture]);
  const material = useMemo(() => new ShaderMaterial({
    side: DoubleSide, toneMapped: false,
    uniforms: { original: { value: poster }, opening: { value: 0 } },
    vertexShader: "varying vec2 vUv; void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}",
    fragmentShader: `uniform sampler2D original; uniform float opening; varying vec2 vUv;
      void main(){
        vec2 p=(vUv-vec2(.25,.42))*vec2(1.6,1.);
        float d=length(p); float radius=opening*.57;
        if(opening>.001 && d<radius) discard;
        vec3 rgb=texture2D(original,vUv).rgb;
        float edge=opening>.001 ? 1.-smoothstep(.001,.004,abs(d-radius)) : 0.;
        gl_FragColor=vec4(mix(rgb,vec3(.78,.92,.28),edge*.8),1.);
        #include <colorspace_fragment>
      }`,
  }), [poster]);
  useEffect(() => () => material.dispose(), [material]);
  const surface = useRef<ShaderMaterial>(null);
  const uploadedTime = useRef(-1);
  useFrame(() => {
    material.uniforms.opening.value = ease(interval(entryLocal(progress.current), .66, .94)) * (1-ease(interval(progress.current,.955,.985)));
    material.uniforms.original.value = video && video.readyState >= 2 && videoTexture ? videoTexture : progress.current>=.89 ? returnPoster : poster;
    // A paused video seek does not reliably request a new WebGL frame on every browser.
    if(video && videoTexture && video.readyState>=2 && !video.seeking && uploadedTime.current!==video.currentTime) {
      videoTexture.needsUpdate=true; uploadedTime.current=video.currentTime;
    }
  });
  return <group position={[2.4, 0, 0]} rotation={[0, -.16, -.025]}>
    <mesh><planeGeometry args={[8.5, 8.5 / productEvidence.aspect]}/><primitive ref={surface} object={material} attach="material"/></mesh>
    {/* Frame is a boundary, not an advertising device mockup. No backing fills the portal. */}
    {[-1, 1].map(side => <mesh key={`h${side}`} position={[0, side * 2.69, -.04]}><boxGeometry args={[8.58, .055, .08]}/><meshStandardMaterial color="#667572" metalness={.6} roughness={.4}/></mesh>)}
    {[-1, 1].map(side => <mesh key={`v${side}`} position={[side * 4.28, 0, -.04]}><boxGeometry args={[.055, 5.43, .08]}/><meshStandardMaterial color="#667572" metalness={.6} roughness={.4}/></mesh>)}
  </group>;
}
