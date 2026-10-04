"use client";

import { useId } from "react";
import { illustrativeBones, lerp, mixPoint, phase, pointAt, smooth, transitionPoints } from "./geometry";

export type Branch = "response" | "search" | "robot" | "memory";

const routes = [
  { id: "voice", path: "M465 350 C530 350 575 300 650 310", end: [650,310] },
  { id: "stt", path: "M650 310 C720 300 748 350 800 350", end: [800,350] },
  { id: "response", path: "M935 350 C1010 350 1010 245 1110 245", end: [1110,245] },
  { id: "search", path: "M935 350 L1110 350", end: [1110,350] },
  { id: "robot", path: "M935 350 C1010 350 1010 455 1110 455", end: [1110,455] },
  { id: "memory", path: "M865 400 L865 495 L1100 565", end: [1100,565] },
  { id: "memory", path: "M1100 565 L830 540 L830 408", end: [830,408] },
] as const;

export function ProjectStage({ progress: p, branch = "robot", compact = false, hideSystemLabels = false }: { progress: number; branch?: Branch; compact?: boolean; hideSystemLabels?: boolean }) {
  const id = useId().replaceAll(":", "");
  const labels = hideSystemLabels ? 0 : 1 - smooth(phase(p, .18, .32));
  const detach = smooth(phase(p, .2, .4));
  const spatial = smooth(phase(p, .92, .99));
  const points = transitionPoints.map((point, i) => pointAt(point, p, i));
  const focus = phase(p, 0, .18);
  const hubScale = lerp(1.12, 1.24, focus);
  const viewBox = compact ? "370 95 1010 650" : "0 0 1440 800";

  return (
    <svg className="ipf-geometry" viewBox={viewBox} role="img" aria-label={!hideSystemLabels && p < .4 ? "ARMI 요청 인식, Agent 분기와 Redis·Chroma 기억 관계 설명도" : p < .8 ? "시스템 연결이 해체되고 같은 점이 포즈 위치로 이동하는 시각적 전환" : "설명용 포즈와 깊이·좌표·피드백 관계. 실제 모델의 관절 정의나 측정값이 아닙니다."}>
      <defs>
        <linearGradient id={`${id}-edge`}><stop stopColor="currentColor" stopOpacity=".16"/><stop offset=".6" stopColor="currentColor"/><stop offset="1" stopColor="currentColor" stopOpacity=".5"/></linearGradient>
        <filter id={`${id}-light`} x="-150%" y="-150%" width="400%" height="400%"><feGaussianBlur stdDeviation="4" /></filter>
      </defs>

      {/* A projected floor gives the topology a shared depth reference. */}
      <g className="ipf-floor" opacity={lerp(.26, .46, spatial)}>
        {Array.from({length: compact ? 6 : 10}, (_, i) => <path key={`ray-${i}`} d={`M865 400 L${350+i*105} 740`} />)}
        {[490,530,580,640,710].map((y, i) => <path key={y} d={`M${620-i*65} ${y} L${1100+i*65} ${y}`} />)}
      </g>

      <g opacity={1-detach} className="ipf-routes">
        {routes.map((route, i) => (
          <g key={`${route.id}-${i}`} opacity={route.id === branch || route.id === "voice" || route.id === "stt" ? 1 : .3}>
            <path d={route.path} fill="none" stroke={`url(#${id}-edge)`} strokeWidth="1.8" pathLength="1" strokeDasharray={`${1-detach} 1`} strokeDashoffset={-detach*.2} />
            <path d={route.path} fill="none" stroke="currentColor" strokeWidth="4" pathLength="1" strokeDasharray=".025 .975" strokeDashoffset={-(focus + phase(p,.18,.38)*.8 + i*.11)%1} opacity=".8" />
            <circle cx={route.end[0]} cy={route.end[1]} r="3" />
          </g>
        ))}
      </g>

      <g opacity={labels} className="ipf-system-labels">
        <g transform={`translate(${-detach*50} ${detach*25})`}>
          <path d="M432 350 L438 350 L443 333 L449 366 L455 324 L460 360 L466 340 L472 350 L488 350" stroke="currentColor" strokeWidth="2" fill="none"/>
          <text x="430" y="307">VOICE</text><text className="ipf-svg-sub" x="430" y="390">음성 요청</text>
        </g>
        <g transform={`translate(${-detach*25} ${-detach*30})`}>
          <path d="M616 290 L670 290 M616 307 L662 307 M616 324 L646 324" fill="none" stroke="currentColor" strokeWidth="2"/>
          <text x="616" y="260">STT</text><text className="ipf-svg-sub" x="616" y="365">음성 → 텍스트</text>
        </g>
        <g transform={`translate(865 350) scale(${hubScale}) translate(-865 -350)`}>
          {/* Layered planar hub: structure, not an AI orb or glass box. */}
          {[0,1,2].map(i => <path key={i} d={`M${785+i*12} ${282-i*12} L${910+i*12} ${282-i*12} L${940+i*12} ${310-i*12} L${940+i*12} ${395-i*12} L${815+i*12} ${395-i*12} L${785+i*12} ${367-i*12} Z`} fill={i === 0 ? "#0d1515" : "none"} stroke="currentColor" strokeWidth={i===0 ? 1.4 : .6} opacity={i===0 ? 1 : .3} />)}
          <path d="M810 312 H840 M840 312 L860 295 H900 M840 312 H900 M840 312 L860 329 H900" stroke="currentColor" fill="none" strokeWidth="1" />
          <text x="815" y="353" className="ipf-svg-hub">LANGGRAPH</text><text x="863" y="375" textAnchor="middle" className="ipf-svg-sub">REQUEST ROUTING</text>
        </g>
        <g transform={`translate(${detach*60} ${-detach*30})`}>
          <path d="M1120 218 H1160 V236 H1120 Z M1126 244 H1153" fill="none" stroke="currentColor"/>
          <text x="1180" y="230">RESPONSE</text><text className="ipf-svg-sub" x="1180" y="252">텍스트 답변</text>
          <path d="M1140 326 A15 15 0 1 0 1140 356 A15 15 0 1 0 1140 326 M1151 351 L1166 366" fill="none" stroke="currentColor"/>
          <text x="1180" y="342">SEARCH</text><text className="ipf-svg-sub" x="1180" y="364">Tavily 검색</text>
          <path d="M1120 455 L1135 427 L1160 440 L1145 466 Z M1145 466 L1162 478 M1135 427 L1140 416" fill="none" stroke="currentColor"/>
          <text x="1180" y="450">ROBOT ACTION</text><text className="ipf-svg-sub" x="1180" y="472">가능한 행동 분기</text>
        </g>
        <g transform={`translate(0 ${detach*60})`}>
          {[{x:800,label:"REDIS",sub:"원문 · 실시간 상태"},{x:1040,label:"CHROMA",sub:"장기 기억 의미 검색"}].map(item => <g key={item.label}>
            <ellipse cx={item.x+30} cy="540" rx="30" ry="10" fill="none" stroke="currentColor"/>
            <path d={`M${item.x} 540 V565 C${item.x} 579 ${item.x+60} 579 ${item.x+60} 565 V540`} stroke="currentColor" fill="none"/>
            <text x={item.x} y="613">{item.label}</text><text className="ipf-svg-sub" x={item.x} y="637">{item.sub}</text>
          </g>)}
          <text className="ipf-svg-sub" x="872" y="530">MEMORY RETRIEVAL</text>
        </g>
      </g>

      {/* Shared point identities survive after the semantic structure detaches. */}
      <g className="ipf-shared-points">
        {points.map((point, i) => {
          const aligned = smooth(phase(p, .69+i*.004, .78+i*.004));
          const trail = mixPoint(point, transitionPoints[i].armiPosition, .16);
          return <g key={transitionPoints[i].id} data-transition-point={transitionPoints[i].id}>
            <path d={`M${trail[0]} ${trail[1]} L${point[0]} ${point[1]}`} fill="none" stroke="currentColor" strokeWidth=".8" opacity={Math.sin(phase(p,.2,.8)*Math.PI)*.38}/>
            <circle cx={point[0]} cy={point[1]} r="9" fill="currentColor" opacity={lerp(.2,.04,aligned)} filter={`url(#${id}-light)`}/>
            <circle cx={point[0]} cy={point[1]} r={lerp(3,5,aligned)} fill="currentColor" />
            <circle cx={point[0]} cy={point[1]} r={lerp(4,9,aligned)} fill="none" stroke="currentColor" strokeWidth=".9" opacity={aligned}/>
          </g>;
        })}
      </g>

      <g className="ipf-bones">
        {illustrativeBones.map(([a,b],i) => {
          const draw = smooth(phase(p,.72+i*.002,.88+i*.002));
          const end = mixPoint(points[a],points[b],draw);
          return <path key={`${a}-${b}`} d={`M${points[a][0]} ${points[a][1]} L${end[0]} ${end[1]}`} fill="none" stroke="currentColor" strokeWidth="2" opacity={draw}/>;
        })}
      </g>

      <g opacity={spatial} className="ipf-spatial">
        <path d="M560 430 L585 420 L585 450 L560 440 Z M543 423 H560 V446 H543 Z" fill="none" stroke="currentColor" strokeWidth="1.3"/>
        <path d="M585 420 L758 210 L1080 210 M585 450 L758 690 L1080 690" fill="none" stroke="currentColor" opacity=".25"/>
        <text x="518" y="483">CAMERA</text>
        {/* Projection lines associate joints with a depth plane; no invented depth samples. */}
        {points.filter((_,i)=>i%2===0).map((pt,i)=><path key={i} d={`M${pt[0]} ${pt[1]} L${pt[0]+130} ${pt[1]-65}`} stroke="currentColor" strokeWidth=".65" opacity=".18"/>)}
        <path d="M1120 220 L1235 170 L1235 630 L1120 680 Z" fill="none" stroke="currentColor" opacity=".28"/>
        {[0,1,2,3,4].map(i=><path key={i} d={`M1120 ${250+i*85} L1235 ${200+i*85}`} stroke="currentColor" opacity=".14"/>)}
        <text x="1150" y="705">DEPTH</text>
        <g transform="translate(680 665)">
          <path d="M0 0 H90 M0 0 V-90 M0 0 L-48 35" fill="none" stroke="currentColor" strokeWidth="1"/>
          <text x="98" y="5">X</text><text x="-5" y="-101">Y</text><text x="-64" y="45">Z</text>
        </g>
        <text className="ipf-svg-sub" x="770" y="730">POSE / 설명용 도식</text>
      </g>
    </svg>
  );
}
