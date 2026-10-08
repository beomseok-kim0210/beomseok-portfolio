import type { CSSProperties, Ref } from "react";
import styles from "./ImmersiveProjectFlow/wedding-transition.module.css";
import { BeforeAfterFrame } from "@/components/ui/BeforeAfterFrame";
import { SplitHeadline } from "@/components/ui/SplitHeadline";


export function HomeWeddingShowcase({ progress = 1, frameRef }: { progress?: number; frameRef?: Ref<HTMLDivElement> }) {
  return (
    <section className={styles.weddingHero} style={{"--wedding-progress":progress} as CSSProperties} aria-label="Wedding AI 대표 이미지 비교">
      <div className={styles.weddingCopy}>
        <p className="cinematic-label text-[var(--wedding-accent)]">
          Choice Intelligence
        </p>
        <h2 className="mt-5 font-display text-[clamp(44px,4.5vw,68px)] font-[700] leading-[0.9] tracking-[-0.05em]">
          Wedding AI
        </h2>
        <SplitHeadline
          lines={["사람은", "자신에게 가장 어울리는 선택을", "얼마나 알고 있을까?"]}
          className="mx-auto mt-4 max-w-[860px] text-[clamp(20px,2vw,30px)] font-medium leading-[1.4] tracking-normal text-slate-600"
        />
      </div>

      <div ref={frameRef} className={styles.frameSlot}><div className={styles.imageReveal}>
        <BeforeAfterFrame
          beforeSrc="/images/before_wedding.png"
          afterSrc="/images/after_wedding.png"
          beforePosition="center calc(50% + 5px)"
        />
      </div></div>

    </section>
  );
}
