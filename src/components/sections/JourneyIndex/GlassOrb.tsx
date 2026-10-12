import type { ReactNode } from "react";
import { hgAnchors, hgBones } from "@/features/world/adapters/hangaraeAnimatic";
import s from "./journey-index.module.css";

/**
 * Glass world sphere, drawn in SVG for crisp edges at any size:
 * dark transparent interior, fresnel rim, curved wireframe, surface sparkles, luminous content,
 * and tilted orbits whose back halves pass behind the sphere.
 * Numbers are pre-rounded strings so server and client markup match exactly.
 */
const R = 100;
const f = (n: number) => n.toFixed(1);
function rand(seed: number) { const x = Math.sin(seed * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); }

/** Half of a tilted ellipse as a path (front = lower half, back = upper half). */
function orbitHalf(rx: number, ry: number, tilt: number, front: boolean) {
  const pts: string[] = [];
  for (let i = 0; i <= 48; i++) {
    const t = (front ? 0 : Math.PI) + (i / 48) * Math.PI;
    const x = rx * Math.cos(t), y = ry * Math.sin(t), c = Math.cos(tilt), sn = Math.sin(tilt);
    pts.push(`${i ? "L" : "M"}${f(x * c - y * sn)} ${f(x * sn + y * c)}`);
  }
  return pts.join(" ");
}

export function GlassOrb({ id, accent, children }: { id: string; accent: string; children: ReactNode }) {
  const g = `orb-${id}`;
  const meridians = [18, 36, 54, 72].map(a => f(R * Math.cos(a * Math.PI / 180)));
  const parallels = [-60, -30, 0, 30, 60].map(y => ({ y: f(y), rx: f(Math.sqrt(R * R - y * y)), ry: f(Math.sqrt(R * R - y * y) * .16) }));
  const sparkles = Array.from({ length: 46 }, (_, i) => {
    const a = rand(i + 1) * Math.PI * 2, r = Math.sqrt(rand(i + 50)) * R * .97;
    return { x: f(Math.cos(a) * r), y: f(Math.sin(a) * r), r: f(.35 + rand(i + 99) * 1.1), o: f(.25 + rand(i + 7) * .7) };
  });
  const orbits = [{ rx: 148, ry: 26, tilt: -.16 }, { rx: 128, ry: 40, tilt: .2 }];
  return (
    <svg className={s.orbSvg} viewBox="-165 -165 330 330" aria-hidden="true">
      <defs>
        <radialGradient id={`${g}-body`} cx="50%" cy="54%" r="50%">
          <stop offset="0" stopColor="#040810" stopOpacity=".72" />
          <stop offset=".66" stopColor="#060c18" stopOpacity=".5" />
          <stop offset=".86" stopColor={accent} stopOpacity=".13" />
          <stop offset=".96" stopColor={accent} stopOpacity=".42" />
          <stop offset="1" stopColor={accent} stopOpacity=".9" />
        </radialGradient>
        <radialGradient id={`${g}-floor`} cx="50%" cy="100%" r="60%">
          <stop offset="0" stopColor={accent} stopOpacity=".3" /><stop offset="1" stopColor={accent} stopOpacity="0" />
        </radialGradient>
        <linearGradient id={`${g}-spec`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#ffffff" stopOpacity=".85" /><stop offset=".4" stopColor="#ffffff" stopOpacity=".1" /><stop offset="1" stopColor="#ffffff" stopOpacity="0" />
        </linearGradient>
        <clipPath id={`${g}-clip`}><circle r={R - 1} /></clipPath>
        <filter id={`${g}-glow`} x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="2.6" result="b" /><feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
        <filter id={`${g}-halo`} x="-60%" y="-60%" width="220%" height="220%"><feGaussianBlur stdDeviation="14" /></filter>
      </defs>

      {/* Outer halo */}
      <circle r={R + 6} fill={accent} opacity=".11" filter={`url(#${g}-halo)`} />
      {/* Back halves of the orbits pass behind the glass */}
      {orbits.map((o, i) => <path key={`b${i}`} d={orbitHalf(o.rx, o.ry, o.tilt, false)} fill="none" stroke={accent} strokeWidth="1" opacity=".28" />)}

      <circle r={R} fill={`url(#${g}-body)`} />
      <g clipPath={`url(#${g}-clip)`}>
        <circle r={R} fill={`url(#${g}-floor)`} />
        {/* curved wireframe */}
        <g fill="none" stroke={accent} strokeWidth=".55" opacity=".32">
          {meridians.map((rx, i) => <ellipse key={i} rx={rx} ry={R} />)}
          <line x1="0" y1={-R} x2="0" y2={R} />
          {parallels.map((p, i) => <ellipse key={i} cy={p.y} rx={p.rx} ry={p.ry} />)}
        </g>
        <g className={s.orbContent} filter={`url(#${g}-glow)`}>{children}</g>
        {sparkles.map((p, i) => <circle key={i} cx={p.x} cy={p.y} r={p.r} fill="#ffffff" opacity={p.o} />)}
      </g>
      {/* Fresnel rim + specular */}
      <circle r={R} fill="none" stroke={accent} strokeWidth="1.6" opacity=".95" filter={`url(#${g}-glow)`} />
      <circle r={R - 3} fill="none" stroke="#ffffff" strokeWidth=".6" opacity=".25" />
      <path d={`M ${f(-R * .82)} ${f(-R * .38)} A ${R - 6} ${R - 6} 0 0 1 ${f(-R * .2)} ${f(-R * .9)}`} fill="none" stroke={`url(#${g}-spec)`} strokeWidth="3" strokeLinecap="round" opacity=".9" />
      <ellipse cx={f(-R * .38)} cy={f(-R * .55)} rx="13" ry="6" transform={`rotate(-38 ${f(-R * .38)} ${f(-R * .55)})`} fill="#ffffff" opacity=".22" />

      {/* Front halves of the orbits */}
      {orbits.map((o, i) => <path key={`f${i}`} d={orbitHalf(o.rx, o.ry, o.tilt, true)} fill="none" stroke={accent} strokeWidth={i ? 1 : 1.6} opacity={i ? .55 : .95} filter={`url(#${g}-glow)`} />)}
      {orbits.map((o, i) => { const t = o.tilt, x = o.rx * Math.cos(.6), y = o.ry * Math.sin(.6); return <circle key={`n${i}`} cx={f(x * Math.cos(t) - y * Math.sin(t))} cy={f(x * Math.sin(t) + y * Math.cos(t))} r="2.4" fill="#ffffff" filter={`url(#${g}-glow)`} />; })}
    </svg>
  );
}

/** Multi-tier pedestal: metallic base, rim glints, glowing ring and a pool of the world's colour. */
export function Pedestal({ id, accent }: { id: string; accent: string }) {
  const g = `ped-${id}`;
  return (
    <svg className={s.pedestal} viewBox="-200 -60 400 120" aria-hidden="true">
      <defs>
        <radialGradient id={`${g}-base`} cx="50%" cy="35%" r="60%"><stop offset="0" stopColor="#2a3a52" /><stop offset=".55" stopColor="#0f1826" /><stop offset="1" stopColor="#05080f" /></radialGradient>
        <linearGradient id={`${g}-rim`} x1="0" x2="1"><stop offset="0" stopColor="#ffffff" stopOpacity=".05" /><stop offset=".18" stopColor="#ffffff" stopOpacity=".9" /><stop offset=".32" stopColor="#ffffff" stopOpacity=".08" /><stop offset=".7" stopColor="#c8d6ee" stopOpacity=".18" /><stop offset="1" stopColor="#ffffff" stopOpacity=".05" /></linearGradient>
        <radialGradient id={`${g}-pool`} cx="50%" cy="50%" r="50%"><stop offset="0" stopColor={accent} stopOpacity=".7" /><stop offset=".5" stopColor={accent} stopOpacity=".18" /><stop offset="1" stopColor={accent} stopOpacity="0" /></radialGradient>
        <filter id={`${g}-glow`} x="-30%" y="-80%" width="160%" height="260%"><feGaussianBlur stdDeviation="3" result="b" /><feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
      </defs>
      <ellipse cx="0" cy="22" rx="196" ry="38" fill="#03060b" opacity=".7" />
      <ellipse cx="0" cy="10" rx="190" ry="40" fill={`url(#${g}-base)`} />
      <ellipse cx="0" cy="10" rx="190" ry="40" fill="none" stroke={`url(#${g}-rim)`} strokeWidth="2" />
      <ellipse cx="0" cy="2" rx="150" ry="30" fill="none" stroke="#c8d6ee" strokeOpacity=".12" />
      <ellipse cx="0" cy="-2" rx="118" ry="23" fill="#0b121e" stroke={`url(#${g}-rim)`} strokeWidth="1.4" />
      <ellipse cx="0" cy="-4" rx="96" ry="18" fill={`url(#${g}-pool)`} />
      <ellipse cx="0" cy="-4" rx="86" ry="16" fill="none" stroke={accent} strokeWidth="2.2" filter={`url(#${g}-glow)`} />
      <ellipse cx="0" cy="-4" rx="62" ry="11" fill="none" stroke={accent} strokeOpacity=".45" strokeWidth="1" />
    </svg>
  );
}

/** Luminous contents per world (in the orb's -100..100 space). */
export function OrbContent({ id }: { id: "armi" | "hangarae" | "wedding" }) {
  if (id === "armi") return (
    <>
      <g transform="translate(-6 -18) skewY(-6)" opacity=".95">
        <rect x="-58" y="-38" width="104" height="66" rx="5" fill="#0c1608" stroke="#d2f059" strokeOpacity=".7" />
        <image href="/images/armi/patient-tablet-original.webp" x="-55" y="-35" width="98" height="60" preserveAspectRatio="xMidYMid slice" opacity=".8" />
      </g>
      <g transform="translate(18 -2) skewY(-6)"><rect x="-30" y="-20" width="62" height="40" rx="4" fill="#d2f059" fillOpacity=".08" stroke="#d2f059" strokeOpacity=".6" /></g>
      <g fill="#e6f7a8">{Array.from({ length: 33 }, (_, i) => { const h = Math.round(4 + Math.abs(Math.sin(i * .9) * 15 + Math.sin(i * .37) * 9)); return <rect key={i} x={-64 + i * 4} y={46 - h / 2} width="2" height={h} rx="1" />; })}</g>
    </>
  );
  if (id === "hangarae") return <Skeleton />;
  return (
    <>
      <g transform="translate(-40 -8) rotate(-8)"><rect x="-26" y="-36" width="52" height="72" rx="4" fill="#120c22" stroke="#cbb8ff" strokeOpacity=".6" /><image href="/images/before_wedding.webp" x="-24" y="-34" width="48" height="68" preserveAspectRatio="xMidYMid slice" opacity=".75" /></g>
      <g transform="translate(36 -4) rotate(7)"><rect x="-26" y="-36" width="52" height="72" rx="4" fill="#120c22" stroke="#cbb8ff" strokeOpacity=".6" /><image href="/images/after_wedding.webp" x="-24" y="-34" width="48" height="68" preserveAspectRatio="xMidYMid slice" opacity=".8" /></g>
      <g transform="translate(0 4)"><rect x="-34" y="-46" width="68" height="92" rx="5" fill="#120c22" stroke="#e2d6ff" strokeOpacity=".85" /><image href="/images/after_wedding.webp" x="-32" y="-44" width="64" height="88" preserveAspectRatio="xMidYMid slice" /></g>
    </>
  );
}

/** Full-body pose skeleton (the product's 21 slots, explanatory alignment) as an x-ray hologram. */
function Skeleton() {
  // Fit 73..148 × 67..302 (pose box) into the orb's −80..80 vertical span.
  const k = 172 / 235, cx = 110.5, cy = 186;
  const P = hgAnchors.map(([x, y]) => [f((x - cx) * k), f((y - cy) * k)] as const);
  // Face slots (0–4) read as a cartoon face at this size: draw the head as one outline instead.
  const bones = hgBones.filter(([a, b]) => a > 4 && b > 4);
  const neck = [f(0), f((104 - cy) * k)] as const, head = [f(((P.length && hgAnchors[0][0]) - cx) * k), f((86 - cy) * k)] as const;
  return (
    <g>
      {/* anatomical hints: spine, ribs, pelvis (explanatory, aligned to the 21-slot frame) */}
      <g fill="none" stroke="#bff1f8" strokeOpacity=".55" strokeWidth="1.2">
        <line x1={neck[0]} y1={neck[1]} x2="0" y2={f((189 - cy) * k)} strokeWidth="1.8" />
        {[0, 1, 2, 3, 4].map(i => { const y = (118 + i * 12 - cy) * k, w = (20 - Math.abs(i - 1.5) * 2.2) * k * 1.15; return <path key={i} d={`M ${f(-w)} ${f(y + 3)} Q 0 ${f(y - 5)} ${f(w)} ${f(y + 3)}`} />; })}
        <path d={`M ${f(-15 * k)} ${f((182 - cy) * k)} Q 0 ${f((200 - cy) * k)} ${f(15 * k)} ${f((182 - cy) * k)}`} stroke="#f3d7a8" />
      </g>
      {bones.map(([a, b]) => <line key={`h${a}-${b}`} x1={P[a][0]} y1={P[a][1]} x2={P[b][0]} y2={P[b][1]} stroke={a >= 11 && b >= 11 ? "#e7b16a" : "#63cbdb"} strokeOpacity=".55" strokeWidth="7" strokeLinecap="round" />)}
      {bones.map(([a, b]) => <line key={`c${a}-${b}`} x1={P[a][0]} y1={P[a][1]} x2={P[b][0]} y2={P[b][1]} stroke={a >= 11 && b >= 11 ? "#fde6c4" : "#e6fbff"} strokeWidth="2.4" strokeLinecap="round" />)}
      <line x1={head[0]} y1={f(Number(head[1]) + 11)} x2={neck[0]} y2={neck[1]} stroke="#e6fbff" strokeWidth="2.4" strokeLinecap="round" />
      <ellipse cx={head[0]} cy={head[1]} rx="9.5" ry="11.5" fill="#63cbdb" fillOpacity=".18" stroke="#e6fbff" strokeWidth="2" />
      {P.map(([x, y], i) => i > 4 && <circle key={i} cx={x} cy={y} r="2.6" fill="#ffffff" />)}
    </g>
  );
}
