"use client";

import { useId } from "react";
import { ArmiArchitecture } from "./ArmiArchitecture";
import { illustrativeBones, lerp, mixPoint, phase, pointAt, smooth, transitionPoints } from "./geometry";

export type Branch = "response" | "search" | "robot" | "memory";

export function ProjectStage({ progress: p, branch = "robot", compact = false, hideSystemLabels = false }: { progress: number; branch?: Branch; compact?: boolean; hideSystemLabels?: boolean }) {
  const id = useId().replaceAll(":", "");
  const spatial = smooth(phase(p, .92, .99));
  const points = transitionPoints.map((point, i) => pointAt(point, p, i));
  const viewBox = compact ? "430 65 1030 760" : "0 0 1440 800";

  return (
    <svg className="ipf-geometry" viewBox={viewBox} preserveAspectRatio={compact ? "xMidYMid meet" : "none"} role="img" aria-label={!hideSystemLabels && p < .4 ? "ARMI 요청 인식, Agent 분기와 Redis·Chroma 기억 관계 설명도" : p < .8 ? "시스템 연결이 해체되고 같은 점이 포즈 위치로 이동하는 시각적 전환" : "설명용 포즈와 깊이·좌표·피드백 관계. 실제 모델의 관절 정의나 측정값이 아닙니다."}>
      <defs>
        <linearGradient id={`${id}-edge`}><stop stopColor="currentColor" stopOpacity=".16"/><stop offset=".6" stopColor="currentColor"/><stop offset="1" stopColor="currentColor" stopOpacity=".5"/></linearGradient>
        <filter id={`${id}-light`} x="-150%" y="-150%" width="400%" height="400%"><feGaussianBlur stdDeviation="4" /></filter>
      </defs>

      {/* A projected floor gives the topology a shared depth reference. */}
      <g className="ipf-floor" opacity={lerp(0, .46, spatial)}>
        {Array.from({length: compact ? 6 : 10}, (_, i) => <path key={`ray-${i}`} d={`M865 400 L${350+i*105} 740`} />)}
        {[490,530,580,640,710].map((y, i) => <path key={y} d={`M${620-i*65} ${y} L${1100+i*65} ${y}`} />)}
      </g>

      <ArmiArchitecture progress={p} branch={branch} compact={compact}/>

      {/* Shared point identities survive after the semantic structure detaches. */}
      <g className="ipf-shared-points">
        {points.map((point, i) => {
          const aligned = smooth(phase(p, .69+i*.004, .78+i*.004));
          const trail = mixPoint(point, transitionPoints[i].armiPosition, .16);
          const active = i < 7 || (branch === "response" && (i === 7 || i === 8)) || (branch === "search" && i === 9) || (branch === "robot" && i === 10) || (branch === "memory" && i > 10);
          return <g key={transitionPoints[i].id} data-transition-point={transitionPoints[i].id} style={{color:p < .2 && !active ? "#6e7b7b" : undefined}} opacity={p < .2 && !active ? .42 : 1}>
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
