import type { CSSProperties } from "react";
import { hgShots, hgSceneRanges } from "@/features/world/adapters/hangaraeAnimatic";
import styles from "./hangarae.module.css";

/** Every curve/patch here is authored explanatory graphics, never recorded telemetry. */
function tracePath(variant: number, n = 64, w = 240, h = 56) {
  return Array.from({ length: n }, (_, i) => {
    const x = i / (n - 1) * w;
    const y = h * .55 - Math.sin(i * .32 + variant) * h * .16 - Math.sin(i * .11 + variant * 1.7) * h * .2 - Math.sin(i * .71 + variant * .3) * h * .05;
    return `${i ? "L" : "M"}${x.toFixed(1)} ${y.toFixed(1)}`;
  }).join(" ");
}
export function Trace({ variant = 0, tone = "upper" }: { variant?: number; tone?: "upper" | "lower" }) {
  const d = tracePath(variant);
  return <svg className={styles.trace} data-tone={tone} viewBox="0 0 240 56" preserveAspectRatio="none" aria-hidden="true">
    <path className={styles.traceGrid} d="M0 14H240M0 28H240M0 42H240M40 0V56M80 0V56M120 0V56M160 0V56M200 0V56"/>
    <path className={styles.traceFill} d={`${d} L240 56 L0 56 Z`}/>
    <path className={styles.traceLine} d={d} pathLength={1}/>
  </svg>;
}

export function SceneHeaders() {
  const scenes = hgSceneRanges.map((_, i) => hgShots.find(s => Number(s.scene) === i + 1)!);
  return <div className={styles.headers}>{scenes.map((s, i) =>
    <header key={s.scene} className={styles.sceneHeader} style={{ opacity: `var(--h${i})` }} data-scene={s.scene}>
      <b className={styles.sceneNo}>{s.scene}</b>
      <div><h3>{s.title}</h3><p className={styles.sceneKo}>{s.ko}</p>{s.text && <p className={styles.sceneText}>{s.text}</p>}</div>
    </header>)}</div>;
}

export function PoseLegend() {
  return <aside className={styles.legend}>
    <div className={styles.legendHead}><strong>21 KEYPOINTS</strong><span>COCO 17 + FOOT 4</span></div>
    <ul className={styles.legendList}>
      <li data-c="up">Upper Body</li><li data-c="low">Lower Body</li>
      <li data-c="face">Face <em>(5)</em></li><li data-c="arm">Arm <em>(6)</em></li>
      <li data-c="leg">Leg <em>(6)</em></li><li data-c="foot">Foot <em>(4)</em></li>
    </ul>
    <small>원본 코드의 21개 슬롯 · 위치는 화면에 맞춘 설명용 정렬</small>
  </aside>;
}

export function DepthHud() {
  return <div className={styles.depthHud} aria-hidden="true">
    <svg className={styles.leader}><line data-hg-line="depth" x1="0" y1="0" x2="0" y2="0"/></svg>
    <div className={styles.deviceLabel}><b>DEPTH CAMERA</b><span>몸까지의 거리를 함께 읽습니다</span></div>
    <div className={styles.zBar}><span>Z <small>(깊이)</small></span><em>Far</em><i/><em>Near</em></div>
    <div className={styles.depthPanel} data-hg-depth-panel>
      <span className={styles.panelTitle}>DEPTH SAMPLING <small>(예시)</small></span>
      <div className={styles.depthRow}>
        <div className={styles.patch}>{Array.from({ length: 49 }, (_, i) => { const x = i % 7 - 3, y = Math.floor(i / 7) - 3, r = Math.hypot(x, y); return <i key={i} style={{ "--r": r, "--n": ((i * 37) % 11) / 11 } as CSSProperties}/>; })}</div>
        <dl><dt>Wrist</dt><dd>Depth Patch</dd><dt className={styles.arrowDown}>↓</dt><dd>2D 관절 + 주변 깊이 → <b>Z</b></dd></dl>
      </div>
      <div className={styles.depthStrip}>{Array.from({ length: 14 }, (_, i) => <i key={i} style={{ "--k": i / 13 } as CSSProperties}/>)}</div>
      <small className={styles.panelFoot}>XYZ = 2D 관절 위치 + 깊이 · 수치는 표시하지 않습니다</small>
    </div>
    <svg className={styles.gizmo} viewBox="0 0 120 100"><path d="M52 64 L104 82" className={styles.gx}/><path d="M52 64 L52 12" className={styles.gz}/><path d="M52 64 L14 86" className={styles.gy}/><text x="106" y="88">X</text><text x="47" y="9">Z</text><text x="2" y="94">Y</text></svg>
  </div>;
}

export function SplitHud() {
  return <div className={styles.splitHud}>
    <div className={styles.seam} aria-hidden="true"><i/></div>
    <div className={styles.seamArrows} aria-hidden="true"><b>‹</b><span>ONE → TWO</span><b>›</b></div>
    <div className={styles.branchTitle} data-tone="upper"><b>05A</b><div><strong>UPPER BODY ANALYSIS</strong><span>상체 관절 움직임 분석</span><small>(어깨 각도 / 손목 높이)</small></div></div>
    <div className={styles.branchTitle} data-tone="lower"><b>05B</b><div><strong>LOWER BODY ANALYSIS</strong><span>발판 하중 분석</span><small>(Load Cell · 단일 하중 신호)</small></div></div>
    <div className={styles.jointPanel}>
      <span className={styles.panelTitle}>JOINT SELECTION</span>
      <ul><li>Shoulder</li><li>Elbow</li><li data-on>Wrist</li></ul>
    </div>
    <div className={styles.measurePanel}>
      <span className={styles.panelTitle}>MEASUREMENT <small>설명용</small></span>
      <h4>Shoulder Flexion</h4><Trace variant={.4}/>
      <h4>Wrist Height</h4><Trace variant={2.3}/>
    </div>
    <div className={styles.anchorLabel} data-a="shoulder">Shoulder Flexion</div>
    <div className={styles.anchorLabel} data-a="uwrist">Wrist Height <b>↕</b></div>
    <div className={styles.anchorLabel} data-a="plate" data-tone="lower"><b>Load Cell</b><span>발판 하나 · 하중 신호 하나</span></div>
    <div className={styles.sensorPanel}>
      <span className={styles.panelTitle}>SENSOR FLOW</span>
      <div className={styles.flowStep}><svg viewBox="0 0 40 40" aria-hidden="true"><path d="M15 4 L17 22 L11 27 L6 30 Q4 35 10 35 L31 32 Q37 31 32 27 L23 22 L21 4"/></svg><span>Foot Press</span></div>
      <i className={styles.flowArrow}/>
      <div className={styles.flowStep}><svg viewBox="0 0 40 40" aria-hidden="true"><path d="M4 22 L20 14 L36 22 L20 30 Z M4 22 V26 L20 34 L36 26 V22"/></svg><span>Load Cell</span></div>
      <i className={styles.flowArrow}/>
      <div className={styles.flowStep}><svg viewBox="0 0 40 40" aria-hidden="true"><path d="M2 22 H9 L13 10 L18 32 L23 14 L27 26 L30 22 H38"/></svg><span>Sensor Power</span></div>
      <small>weight_kg → sensor.power</small>
    </div>
    <div className={styles.powerPanel}><span className={styles.panelTitle}>Sensor Power <small>설명용</small></span><Trace variant={4.1} tone="lower"/></div>
  </div>;
}
