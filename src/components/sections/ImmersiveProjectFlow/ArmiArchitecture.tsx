import { phase, smooth } from "./geometry";
import { routingAnchors, systemRoutes } from "./armiRouting";
import type { Branch } from "./ProjectStage";

/** Projected routing planes describe branching, rather than a generic network. */
export function ArmiArchitecture({ progress, branch, compact }: { progress: number; branch: Branch; compact: boolean }) {
  const detach = smooth(phase(progress, .2, .4));
  const activation = phase(progress, 0, .18);
  const layers = compact ? [0, 2, 4] : [0, 1, 2, 3, 4];
  return <g opacity={1 - detach} className="ipf-architecture" strokeLinejoin="round">
    {/* Background: parallel routing surfaces recede beyond the upper edge. */}
    <g fill="none" stroke="#667476" strokeWidth=".7" opacity=".2">
      {layers.map(i => <g key={i} transform={`translate(${i * 54} ${-i * 92 - activation * i * 6})`}>
        <path d="M620 230 L925 155 L1340 270 L1035 440 Z"/>
        <path d="M620 230 L800 275 L1035 440 M800 275 L1105 200 M925 155 L1095 350 L1340 270"/>
        {[0,1,2,3].map(n => <path key={n} d={`M${695+n*62} ${249+n*17} L${1000+n*62} ${174+n*17}`}/>)}
      </g>)}
      <path d="M580 -100 L580 250 L710 325 M1480 -80 L1235 185 M1600 750 L1120 710 M1420 890 L855 620"/>
    </g>
    {/* Midground: an oblique stack of junctions; no enclosing node card. */}
    <g fill="none" stroke="#748181" strokeWidth=".9">
      {layers.map(i => <g key={i} transform={`translate(${i*19} ${-i*24})`} opacity={.7-i*.11}>
        <path d="M785 350 L920 252 L1150 315 L1015 470 Z" fill={i===0 ? "#101718" : "none"} fillOpacity=".7"/>
        <path d="M785 350 L1015 470 M830 318 L1060 420 M875 285 L1105 368 M855 388 L990 290 M935 430 L1070 302"/>
        <path d="M920 252 V300 M1150 315 V363 M1015 470 V518" opacity=".5"/>
      </g>)}
      <path d="M520 295 L555 270 L590 295 L555 320 Z M710 325 L748 298 L775 320 M710 325 L748 350 L775 320"/>
      <path d="M1235 185 L1275 148 L1330 162 M1235 185 L1290 200 L1330 162 M1240 555 L1290 520 L1338 570 L1288 605 Z"/>
      <path d="M855 620 L910 585 L958 611 L904 646 Z M855 620 V651 L904 676 L958 641 V611 M904 646 V676"/>
      {[0,1,2].map(i => <path key={i} d={`M${1065+i*9} ${675-i*14} L${1120+i*9} ${638-i*14} L${1175+i*9} ${665-i*14} L${1120+i*9} ${710-i*14} Z`}/>)}
    </g>
    {/* All routes exist; only the selected request route receives lime. */}
    {Object.entries(systemRoutes).map(([key, path]) => {
      const active = key === "input" || key === branch;
      return <g key={key} data-system-route={key} data-route-active={active}>
        <path d={path} fill="none" stroke={active ? "currentColor" : "#748181"} strokeWidth={active ? 1.4 : .8} opacity={active ? .65 : .32} pathLength="1" strokeDasharray={`${1-detach} 1`}/>
        {active && <path d={path} fill="none" stroke="currentColor" strokeWidth="3" pathLength="1" strokeDasharray=".018 .982" strokeDashoffset={-.12-activation*.65} opacity=".95"/>}
      </g>;
    })}
    <g fill="#7b8989">
      {routingAnchors.map(([x,y],i) => <path key={i} d={`M${x-5} ${y} H${x+5} M${x} ${y-5} V${y+5}`} stroke="#97a39a" strokeWidth=".6" opacity=".5"/>)}
    </g>
    <path d="M1330 162 L1430 125 M1360 380 L1500 366" fill="none" stroke="#799da4" strokeWidth=".6" opacity=".3"/>
    {/* Foreground routes are cropped, giving the viewer a position inside it. */}
    {!compact && <g fill="none" stroke="#536063" opacity=".42" strokeWidth="1.1" transform={`translate(${-activation*12} ${activation*9})`}>
      <path d="M340 910 L680 680 L1040 820 L1590 500 M680 680 L750 630 L1110 770 L1660 450 M1040 820 L1110 770"/>
      <path d="M1490 -80 L1325 90 L1470 125 M1325 90 L1370 45 L1540 85"/>
    </g>}
  </g>;
}
