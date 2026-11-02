"use client";
import { useEffect, useRef } from "react";
import { contactLinks } from "@/components/sections/Contact/ContactSection";
import styles from "./galleryExit.module.css";

/**
 * The page's last screen. The turn and the walk to the exit doors happen in the 3D hall (LabDistrictScene);
 * this layer takes over at the threshold, driven by CSS vars LabExperience sets from the scroll
 * (--exit-through, --outside):
 *  1. walking through the open doors into the light (white-out);
 *  2. it clears onto the night plaza of the opening scene: the same lit doorway, now behind the visitor.
 *     The figure that walked in at the start is gone — the visitor is the one who came back out.
 * Contact lives out here, in the real world, not as a section below the exhibition.
 */
const PLATE = "/images/hero/hero-door.jpg";

export function GalleryExit() {
  // The plate first paints at the white-out peak; decode it beforehand so that frame never waits on it.
  const plate = useRef<HTMLImageElement>(null);
  useEffect(() => { plate.current?.decode().catch(() => {}); }, []);
  return <div className={styles.exit}>
    <span className={styles.flash} aria-hidden="true"/>

    <footer className={styles.outside} data-outside aria-label="연락처" inert>
      <div className={styles.plate} aria-hidden="true">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img ref={plate} src={PLATE} alt="" decoding="async"/>
        <span className={styles.empty}/>
        <span className={styles.glow}/>
        <span className={styles.scrim}/>
      </div>
      <div className={styles.copy}>
        <p className={styles.kicker}>EXIT · 전시 밖으로</p>
        <h2>관람해 주셔서<br/>감사합니다.</h2>
        <p className={styles.lede}>여기서부터는 전시가 아니라 실제 대화입니다.<br/>제품처럼 작동하는 AI 경험을 함께 만들고 싶습니다.</p>
        <ul className={styles.links}>
          {contactLinks.map(link => {
            const Icon = link.icon;
            return <li key={link.label}><a href={link.href} target={link.external ? "_blank" : undefined} rel={link.external ? "noopener noreferrer" : undefined}>
              <Icon aria-hidden="true"/><b>{link.label}</b><span>{link.handle}</span><i aria-hidden="true">{link.external ? "↗" : "→"}</i>
            </a></li>;
          })}
        </ul>
        <a className={styles.again} href="#hero">↺ 처음부터 다시 관람하기</a>
      </div>
      <p className={styles.colophon}>© 2026 Kim Beomseok · 사람은 기술보다 경험을 기억합니다.</p>
    </footer>
  </div>;
}
