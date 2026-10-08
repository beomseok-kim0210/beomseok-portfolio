"use client";
import styles from "./journey.module.css";
/** Still keys keep the district silhouettes without a first-person flight. */
export function ArmiStillWorld({phase}:{phase:string}){
  const routing=phase==="routing"||phase==="decision",selected=phase==="decision";
  return <div className={styles.stillWorld} data-key={phase} aria-hidden="true">
    <svg viewBox="0 0 600 360" preserveAspectRatio="xMidYMid meet">
      <g stroke="#324852" fill="none" strokeWidth="2" opacity=".7">
        {Array.from({length:12},(_,i)=><path key={i} d={"M "+(i*54)+" 10 V 350 M "+(i*54)+" 80 h 35 M "+(i*54)+" 280 h 35"}/>)}
        <path d="M 0 330 L 300 190 L 600 330 M 0 70 H 600"/>
      </g>
      <g display={phase==="stt"?undefined:"none"}>
        {[0,1,2,3,4,5].map(i=><path key={i} d={"M "+(210+i*29)+" 55 l 50 25 v 230 l -50 -25 Z"} fill="#779ca5" fillOpacity=".08" stroke="#b6d8e0"/>)}
        {Array.from({length:18},(_,i)=><rect key={i} x={45+i*7} y={140-Math.abs(Math.sin(i*1.3))*40} width="4" height={30+Math.abs(Math.sin(i*1.3))*80} fill="#d7e4df"/>)}
        {Array.from({length:18},(_,i)=><rect key={i} x={455+(i%6)*9} y={152+Math.floor(i/6)*11} width="6" height="3" fill="#d2ef58"/>)}
      </g>
      <g display={routing?undefined:"none"}>
        <path d="M 300 170 L 130 100 M 300 170 L 490 200 M 300 170 L 460 75 M 300 170 L 130 275" stroke="#6e8790" strokeWidth="3"/>
        {[0,1,2].map(i=><g key={"response"+i}><rect x={90+i*24} y="70" width="18" height="60" fill="#24343b" stroke="#d6b679"/><path d={"M "+(95+i*24)+" 90 h 9 m -9 12 h 9 m -9 12 h 9"} stroke="#d6b679"/></g>)}
        {Array.from({length:6},(_,i)=><rect key={"source"+i} x={435+(i%3)*32} y={165+Math.floor(i/3)*27} width="25" height="18" fill="#263d48" stroke="#80c3d9"/>)}
        {Array.from({length:9},(_,i)=><rect key={"memory"+i} x={430+(i%3)*24} y={40+Math.floor(i/3)*23} width="16" height="16" fill="#947745" stroke="#e8be7a"/>)}
        <path d="M 90 290 H 160 M 110 290 V 250 L 137 228 L 160 252" fill="none" stroke="#b49160" strokeWidth="9"/>
        <path d="M 300 170 C 380 245 200 245 130 100" fill="none" stroke="#d2ef58" strokeWidth="6" display={selected?undefined:"none"}/>
        <rect x="290" y="155" width="20" height="20" fill="#d2ef58"/>
      </g>
      <g display={phase==="travel"?undefined:"none"}>
        {[0,1,2,3,4].map(i=><path key={i} d={"M "+(40+i*125)+" 40 v 245 m -20 -180 h 50 m -50 95 h 50"} stroke="#58757e" strokeWidth="9" fill="none"/>)}
        <path d="M 110 350 C 480 330 130 190 390 65" fill="none" stroke="#d2ef58" strokeWidth="6"/>
        <path d="M 125 350 C 495 330 145 190 405 65" fill="none" stroke="#9fa57b" strokeWidth="2"/>
        <rect x="312" y="157" width="16" height="16" fill="#d2ef58"/>
      </g>
      <g display={phase==="result"?undefined:"none"}>
        {[0,1,2,3].map(i=><rect key={i} x={210+i*12} y={65+i*6} width="155" height="215" fill="#b9d5ba" fillOpacity=".07" stroke="#b9d5ba"/>)}
        {[1,.82,.94,.68,.87,.55].map((width,row)=><rect key={row} x="232" y={100+row*26} width={width*120} height="3" fill="#eee7d5"/>)}
        <ellipse cx="300" cy="295" rx="130" ry="13" fill="none" stroke="#89adb6"/>
      </g>
    </svg>
    {routing&&<div className={styles.stillAnchors}>
      <span style={{left:"10%",top:"8%"}} data-active={selected}>TEXT ANSWER</span>
      <span style={{right:"2%",top:"52%"}}>TAVILY SEARCH</span>
      <span style={{right:"5%",top:"1%"}}>MEMORY RETRIEVAL</span>
      <span style={{left:"9%",top:"76%"}}>ROBOT ACTION</span>
    </div>}
  </div>;
}
