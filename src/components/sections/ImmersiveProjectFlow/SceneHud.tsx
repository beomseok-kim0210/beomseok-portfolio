import type { CSSProperties } from "react";
import hud from "./sceneHud.module.css";

export type HudScene = { no: string; title: string; ko: string; text?: string };

/** Top-left numbered header. `active` drives a simple fade; without it each header reads `--h{i}` (scroll crossfade). */
export function SceneHeaderList({ scenes, active }: { scenes: readonly HudScene[]; active?: number }) {
  return <div className={hud.headers}>{scenes.map((s, i) =>
    <header key={s.no} className={hud.sceneHeader} data-scene={s.no}
      style={{ opacity: active === undefined ? `var(--h${i})` : i === active ? 1 : 0 } as CSSProperties}>
      <b className={hud.sceneNo}>{s.no}</b>
      <div><h3>{s.title}</h3><p className={hud.sceneKo}>{s.ko}</p>{s.text && <p className={hud.sceneText}>{s.text}</p>}</div>
    </header>)}</div>;
}

/** Top-right project identity + skip link + right-edge scene rail. `current` is 1-based (0 = hero, none lit). */
export function SceneChrome({ project, name, count, current, skipHref }: { project: string; name: string; count: number; current: number; skipHref: string }) {
  return <>
    <div className={hud.identity}><span>{project}</span><strong>{name}</strong></div>
    <a href={skipHref} className={hud.skip}>설명으로 건너뛰기 ↓</a>
    <ol className={hud.rail} aria-hidden="true">{Array.from({ length: count }, (_, i) => <li key={i} data-on={i + 1 === current}>{String(i + 1).padStart(2, "0")}</li>)}</ol>
  </>;
}

export function SceneFooter({ note, cue = "SCROLL ↓" }: { note: string; cue?: string }) {
  return <footer className={hud.footer}><span>{note}</span><span>{cue}</span></footer>;
}
