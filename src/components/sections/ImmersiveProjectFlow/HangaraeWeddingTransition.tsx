"use client";

import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { HomeWeddingShowcase } from "../HomeWeddingShowcase";
import { HomeProjectBrief } from "../HomeProjectBrief";
import { mixColor, mixPoint, phase, smooth, type Point } from "./geometry";
import { observeScrollLayout } from "./observeScrollLayout";
import styles from "./wedding-transition.module.css";

type Frame = { x: number; y: number; width: number; height: number };
const initialFrame = {x:180,y:390,width:640,height:540};

export function HangaraeWeddingTransition({ children }: { children: ReactNode }) {
  const track = useRef<HTMLDivElement>(null);
  const reading = useRef<HTMLDivElement>(null);
  const arrival = useRef<HTMLDivElement>(null);
  const frameSlot = useRef<HTMLDivElement>(null);
  const [progress, setProgress] = useState(0);
  const [frame, setFrame] = useState<Frame>(initialFrame);
  const [source, setSource] = useState<[Point,Point][]>([[[45,240],[955,240]],[[45,480],[955,480]],[[380,480],[380,850]],[[700,480],[700,850]]]);

  useEffect(()=>{
    gsap.registerPlugin(ScrollTrigger);
    const measure = ()=>{
      if (!track.current || !reading.current || !arrival.current || !frameSlot.current) return;
      const readHeight = Math.max(window.innerHeight-72,reading.current.offsetHeight);
      track.current.style.setProperty("--reading-height",`${readHeight}px`);
      const parent = arrival.current.getBoundingClientRect();
      const rect = frameSlot.current.getBoundingClientRect();
      if (parent.width && parent.height) {
        const next = {x:(rect.left-parent.left)/parent.width*1000,y:(rect.top-parent.top)/parent.height*1000,width:rect.width/parent.width*1000,height:rect.height/parent.height*1000};
        const pipeline = reading.current.querySelector("ol");
        const grid = pipeline?.nextElementSibling;
        if (pipeline && grid && grid.children.length >= 3) {
          const readRect = reading.current.getBoundingClientRect();
          const toPoint = (left:number,top:number):Point=>[(left-parent.left)/parent.width*1000,(top-readRect.top+parent.height-readHeight)/parent.height*1000];
          const line = pipeline.getBoundingClientRect();
          const detail = grid.getBoundingClientRect();
          const columns = [grid.children[1],grid.children[2]].map(child=>child.getBoundingClientRect());
          const lines:[Point,Point][] = [[toPoint(line.left,line.top),toPoint(line.right,line.top)],[toPoint(detail.left,detail.top),toPoint(detail.right,detail.top)],...columns.map(column=>[toPoint(column.left,detail.top),toPoint(column.left,detail.bottom)] as [Point,Point])];
          setSource(previous=>JSON.stringify(previous)===JSON.stringify(lines)?previous:lines);
        }
        setFrame(previous=>Object.keys(next).every(key=>Math.abs(next[key as keyof Frame]-previous[key as keyof Frame])<.1)?previous:next);
      }
    };
    measure();
    const media = gsap.matchMedia();
    media.add("(min-width: 901px) and (prefers-reduced-motion: no-preference)",()=>{
      const state = {progress:0};
      gsap.to(state,{progress:1,ease:"none",onUpdate:()=>setProgress(phase(state.progress*1.15,0,.9)),scrollTrigger:{trigger:track.current,start:()=>`top ${window.innerHeight-Math.max(window.innerHeight-72,reading.current?.offsetHeight??0)}`,end:()=>`+=${window.innerHeight*1.15}`,scrub:.35,invalidateOnRefresh:true,onRefresh:self=>setProgress(phase(self.progress*1.15,0,.9))}});
    });
    media.add("(max-width: 900px) and (prefers-reduced-motion: no-preference)",()=>{
      const state = {progress:0};
      gsap.to(state,{progress:1,ease:"none",onUpdate:()=>setProgress(state.progress),scrollTrigger:{trigger:arrival.current,start:"top 90%",end:"top 25%",scrub:.35,invalidateOnRefresh:true}});
    });
    const stop = observeScrollLayout(reading.current,measure);
    return ()=>{stop();media.revert();};
  },[]);

  const exit = smooth(phase(progress,.2,.45));
  const reveal = smooth(phase(progress,.35,.75));
  const title = smooth(phase(progress,.6,.9));
  const align = smooth(phase(progress,.12,.55));
  const {x,y,width:w,height:h} = frame;
  const target: [Point,Point][] = [[[x,y],[x+w,y]],[[x,y+h],[x+w,y+h]],[[x,y],[x,y+h]],[[x+w,y],[x+w,y+h]]];
  const css = {"--handoff-bg":mixColor([244,242,236],[255,249,247],smooth(progress)),"--brief-opacity":1-exit,"--brief-y":`${-60*exit}px`,"--image-inset":`${50*(1-reveal)}%`,"--image-scale":.96+.04*reveal,"--title-opacity":title,"--title-y":`${24*(1-title)}px`} as CSSProperties;

  return <>
    <div ref={track} className={styles.track} style={css} data-wedding-transition={progress.toFixed(4)}>
      <div className={styles.stage}>
        <div ref={reading} className={styles.reading} style={{visibility:exit>.99?"hidden":"visible",pointerEvents:exit>.2?"none":"auto"}}>{children}</div>
        <div ref={arrival} className={styles.arrival}>
          <HomeWeddingShowcase progress={progress} frameRef={frameSlot}/>
          <svg className={styles.frameBridge} viewBox="0 0 1000 1000" preserveAspectRatio="none" aria-hidden="true" style={{opacity:smooth(phase(progress,.04,.12))*(1-smooth(phase(progress,.65,.9)))}}>
            {source.map(([a,b],i)=>{
              const start=mixPoint(a,target[i][0],align),end=mixPoint(b,target[i][1],align);
              return <g key={i}><path d={`M${start[0]} ${start[1]} L${end[0]} ${end[1]}`} fill="none" stroke={mixColor([65,77,207],[185,137,121],align)} strokeWidth="1" vectorEffect="non-scaling-stroke"/><circle cx={end[0]} cy={end[1]} r="3" fill="#414dcf" opacity={1-align}/></g>;
            })}
          </svg>
        </div>
      </div>
    </div>
    <HomeProjectBrief project="wedding"/>
  </>;
}
