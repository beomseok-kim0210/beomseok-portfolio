"use client";
import { useEffect, useRef } from "react";
import type { WorldRuntime } from "@/features/world/director/worldRuntime";
import { local, productTransition } from "@/features/world/adapters/armiChoreography";
import { productEvidence } from "./experienceData";
import styles from "./journey.module.css";

/** Original product pixels stay in DOM, outside WebGL exposure and bloom. */
export function ArmiProductTransition({ runtime }: { runtime: WorldRuntime }) {
  const opening = useRef<HTMLDivElement>(null), ending = useRef<HTMLDivElement>(null);
  const signal = useRef<SVGPathElement>(null), voice = useRef<HTMLDivElement>(null);
  const speech = useRef<HTMLDivElement>(null);
  const packet = useRef<HTMLDivElement>(null), packetTrail = useRef<SVGSVGElement>(null);
  const veil = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const sync = () => {
      const p = runtime.progress.current, state = productTransition(p);
      if (veil.current) veil.current.style.opacity = String(state.opacity);
      for (const [element, show] of [[opening.current, !state.returning], [ending.current, state.returning]] as const) {
        if (!element) continue;
        element.style.opacity = String(show ? state.opacity : 0);
        element.style.transform = `scale(${state.scale})`;
        element.style.visibility = show && state.opacity > .001 ? "visible" : "hidden";
      }
      if (voice.current) {
        voice.current.style.opacity = String(local(p, .025, .045) * (1 - local(p, .15, .19)));
        const collapse = local(p, .082, .12);
        const mic = voice.current.querySelector<SVGElement>("[data-voice-mic]");
        if(mic) mic.style.opacity=String(1-local(p,.082,.112));
        voice.current.querySelectorAll<HTMLElement>("i").forEach((bar, i) => {
          const x=(i-15)/15;
          const envelope=Math.sqrt(Math.max(0,1-x*x));
          const height=12+envelope*(26+64*Math.abs(Math.sin(p*110+i*.65)));
          const discHeight=Math.max(3,44*envelope);
          bar.style.height=`${height*(1-collapse)+discHeight*collapse}px`;
          bar.style.transform=`translate(-50%,-50%) translateX(${(i-15)*8*(1-collapse)+x*21*collapse}px)`;
          bar.style.opacity=String(1-local(p,.12,.132));
          bar.style.background=`rgb(${Math.round(222-12*collapse)},${Math.round(237+3*collapse)},${Math.round(235-146*collapse)})`;
        });
      }
      if(speech.current) {
        const spread=local(p,.955,.985);
        speech.current.style.opacity=String(local(p,.95,.958));
        const speaker=speech.current.querySelector<SVGElement>("svg");
        if(speaker)speaker.style.opacity=String(local(p,.96,.978));
        speech.current.querySelectorAll<HTMLElement>("i").forEach((bar,i)=>{
          const x=(i-15)/15, envelope=Math.sqrt(Math.max(0,1-x*x));
          const discHeight=Math.max(3,36*envelope);
          const waveHeight=8+envelope*(18+38*Math.abs(Math.sin((p-.955)*150+i*.65)));
          bar.style.height=`${discHeight*(1-spread)+waveHeight*spread}px`;
          bar.style.transform=`translate(-50%,-50%) translateX(${x*17*(1-spread)+(i-15)*7*spread}px)`;
          bar.style.opacity=String(local(p,.955,.965));
          bar.style.background=`rgb(${Math.round(210+12*spread)},${Math.round(240-3*spread)},${Math.round(89+146*spread)})`;
        });
      }
      if (signal.current) {
        const output=state.returning&&p>=.942;
        const t=state.returning?output?local(p,.942,.955):local(p,.89,.94):local(p,.132,.155);
        const visible=state.returning?p<.965:p>=.12 && p<.16;
        const alpha=state.returning
          ? output ? local(p,.942,.947)*(1-local(p,.955,.965)) : local(p,.89,.897)*(1-local(p,.937,.942))
          : local(p,.12,.132)*(1-local(p,.155,.16));
        // Register the waveform and intake to actual DOM image bounds on every viewport.
        const surface=(state.returning?ending.current:opening.current)?.getBoundingClientRect(), bounds=packet.current?.parentElement?.getBoundingClientRect();
        const wave=(state.returning?speech.current:voice.current)?.querySelector("[data-voice-wave]")?.getBoundingClientRect();
        const start=surface && bounds && wave ? [(wave.x+wave.width/2-bounds.x)/bounds.width*100,(wave.y+wave.height/2-bounds.y)/bounds.height*100]:[42,70];
        const screen=(state.returning?ending.current:opening.current)?.querySelector("img")?.getBoundingClientRect();
        const intake=screen && bounds ? [(screen.x+screen.width*.282-bounds.x)/bounds.width*100,(screen.y+screen.height*.61-bounds.y)/bounds.height*100]:[45.5,56];
        const a=state.returning?output?intake:[50,50]:start;
        const d=output?start:intake;
        const b=output?[intake[0],intake[1]+5]:state.returning?[50,45]:[start[0],start[1]-5];
        const c=output?[start[0],start[1]-5]:[intake[0],intake[1]+5];
        signal.current.setAttribute("d",`M${a.join(" ")} C${b.join(" ")} ${c.join(" ")} ${d.join(" ")}`);
        signal.current.setAttribute("stroke-width",state.returning?".25":".1");
        signal.current.style.strokeDashoffset=String(100*(1-t));
        if(packetTrail.current)packetTrail.current.style.opacity=String(!state.returning&&visible?alpha:0);
        if(packet.current){
          const coordinate=(axis:number)=>(1-t)**3*a[axis]+3*(1-t)**2*t*b[axis]+3*(1-t)*t*t*c[axis]+t**3*d[axis];
          packet.current.style.left=`${coordinate(0)}%`;packet.current.style.top=`${coordinate(1)}%`;
          packet.current.style.opacity=String(visible?alpha:0);
          const scale=state.returning ? (output ? .24+.58*t : 1-.76*t) : 1*(1-t*.8);
          packet.current.style.transform=`translate(-50%,-50%) scale(${scale})`;
        }
      }
    };
    sync(); return runtime.subscribeFrame(sync);
  }, [runtime]);
  return <>
    <div ref={veil} style={{ position: "absolute", inset: 0, background: "#060b10", zIndex: 1, pointerEvents: "none" }}/>
    <div ref={opening} className={styles.productSurface} data-product="opening">
      <div className={styles.tabletDevice}>
      <span className={styles.tabletCamera} aria-hidden="true"/>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={productEvidence.poster} alt="실제 ARMI 환자 태블릿 앱"/>
      </div>
      <span className={styles.tabletCaption}>SAMSUNG GALAXY TAB <span>실제 사용 기기 · 환자용 ARMI</span></span>
    </div>
      <div ref={voice} className={styles.productVoice} role="img" aria-label="사용자의 음성 파형이 하나의 요청 신호로 모여 태블릿에 들어갑니다">
        <svg data-voice-mic viewBox="0 0 40 56" aria-hidden="true"><rect x="14" y="3" width="12" height="28" rx="6"/><path d="M7 23v3a13 13 0 0 0 26 0v-3M20 39v11M12 50h16"/></svg>
        <div data-voice-wave aria-hidden="true">{Array.from({ length: 31 }, (_, i) => <i key={i}/>)}</div>
      </div>
    <div ref={ending} className={styles.productSurface} data-product="return">
      <div className={styles.tabletDevice}>
      <span className={styles.tabletCamera} aria-hidden="true"/>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={productEvidence.poster} alt="처음 보았던 실제 ARMI 환자 태블릿 UI로 복귀"/>
      </div>
      <span className={styles.tabletCaption}>SAMSUNG GALAXY TAB <span>실제 사용 기기 · 환자용 ARMI</span></span>
    </div>
      <div ref={speech} className={styles.productVoice} role="img" aria-label="응답 신호가 태블릿으로 돌아온 뒤 TTS 음성 파형으로 나옵니다">
        <svg viewBox="0 0 40 56" aria-hidden="true"><path d="M4 21h8l10-9v32L12 35H4ZM27 21a10 10 0 0 1 0 14M31 14a20 20 0 0 1 0 28"/></svg>
        <div data-voice-wave aria-hidden="true">{Array.from({length:31},(_,i)=><i key={i}/>)}</div>
      </div>
    <svg ref={packetTrail} viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true" style={{position:"absolute",inset:0,width:"100%",height:"100%",zIndex:2,pointerEvents:"none",opacity:0}}>
      <path ref={signal} fill="none" stroke="#d2f059" strokeWidth=".25" pathLength="100" strokeDasharray="100" strokeDashoffset="100"/>
    </svg>
    <div ref={packet} aria-hidden="true" data-request-head="product" style={{position:"absolute",width:44,height:44,border:"3px solid #d2f059",borderRadius:"50%",background:"#d2f059",boxShadow:"0 0 0 7px #d2f05930,0 0 22px #d2f05990",zIndex:2,pointerEvents:"none",opacity:0}}/>
  </>;
}
