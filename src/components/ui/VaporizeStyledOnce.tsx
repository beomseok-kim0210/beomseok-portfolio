"use client";

import { useRef, useEffect, useLayoutEffect, useState, useMemo } from "react";

export type StyledSegment = {
  text: string;
  color: string;
  fontWeight: number;
};

type Props = {
  segments: StyledSegment[];
  fontSize: number;
  fontFamily?: string;
  spread?: number;
  density?: number;
  vaporizeDuration?: number;
  onReady?: () => void;
  onComplete?: () => void;
};

type Particle = {
  x: number;
  y: number;
  originalX: number;
  originalY: number;
  color: string;
  opacity: number;
  originalAlpha: number;
  velocityX: number;
  velocityY: number;
  speed: number;
  shouldFadeQuickly: boolean;
};

export function VaporizeStyledOnce({
  segments,
  fontSize,
  fontFamily = "Pretendard, Inter, sans-serif",
  spread = 3,
  density = 7,
  vaporizeDuration = 1200,
  onReady,
  onComplete,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const textBoundsRef = useRef<{ left: number; right: number; width: number } | null>(null);
  const frameRef = useRef<number | null>(null);
  const progressRef = useRef(0);
  const [ready, setReady] = useState(false);

  const globalDpr = useMemo(() => {
    if (typeof window !== "undefined") return window.devicePixelRatio * 1.5 || 1;
    return 1;
  }, []);

  // density 0-10 → 0.3-1
  const densityNorm = Math.min(1, Math.max(0.3, density / 10));
  // spread factor scaled by font size
  const vaporSpread = (fontSize / 50) * 0.5 * spread;

  // 1. 캔버스에 styled text 렌더링 → 픽셀 샘플링 → 파티클 생성 (페인트 전에 실행)
  useLayoutEffect(() => {
    const wrapper = wrapperRef.current;
    const canvas = canvasRef.current;
    if (!wrapper || !canvas) return;

    const { width, height } = wrapper.getBoundingClientRect();
    if (!width || !height) return;

    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    canvas.width = Math.floor(width * globalDpr);
    canvas.height = Math.floor(height * globalDpr);

    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.textBaseline = "middle";
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";

    const textY = canvas.height / 2;
    const scaledFontSize = fontSize * globalDpr;

    // 1단계: 전체 너비 측정 (가운데 정렬용)
    let totalWidth = 0;
    for (const seg of segments) {
      ctx.font = `${seg.fontWeight} ${scaledFontSize}px ${fontFamily}`;
      totalWidth += ctx.measureText(seg.text).width;
    }

    let currentX = (canvas.width - totalWidth) / 2;
    const textLeft = currentX;

    // 2단계: 각 세그먼트 그리기 (색상·굵기 개별 적용)
    for (const seg of segments) {
      ctx.font = `${seg.fontWeight} ${scaledFontSize}px ${fontFamily}`;
      ctx.fillStyle = seg.color;
      ctx.fillText(seg.text, currentX, textY);
      currentX += ctx.measureText(seg.text).width;
    }

    textBoundsRef.current = { left: textLeft, right: textLeft + totalWidth, width: totalWidth };

    // 3단계: 픽셀 → 파티클
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    const currentDPR = canvas.width / width;
    const sampleRate = Math.max(1, Math.round(currentDPR / 3));

    const particles: Particle[] = [];
    for (let y = 0; y < canvas.height; y += sampleRate) {
      for (let x = 0; x < canvas.width; x += sampleRate) {
        const idx = (y * canvas.width + x) * 4;
        const alpha = data[idx + 3];
        if (alpha > 0) {
          const originalAlpha = (alpha / 255) * (sampleRate / currentDPR);
          particles.push({
            x, y,
            originalX: x, originalY: y,
            color: `rgba(${data[idx]},${data[idx + 1]},${data[idx + 2]},${originalAlpha})`,
            opacity: originalAlpha,
            originalAlpha,
            velocityX: 0, velocityY: 0,
            speed: 0,
            shouldFadeQuickly: false,
          });
        }
      }
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    particlesRef.current = particles;
    setReady(true);
    onReady?.();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 2. 파티클 애니메이션 (즉시 시작)
  useEffect(() => {
    if (!ready) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    let lastTime = performance.now();
    let completed = false;

    const animate = (now: number) => {
      const dt = (now - lastTime) / 1000;
      lastTime = now;

      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      if (!ctx) return;

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      progressRef.current += (dt * 100) / (vaporizeDuration / 1000);
      const progress = Math.min(100, progressRef.current);
      const bounds = textBoundsRef.current;
      if (!bounds) { frameRef.current = requestAnimationFrame(animate); return; }

      const vaporX = bounds.left + (bounds.width * progress) / 100;

      let allDone = true;
      particlesRef.current.forEach((p) => {
        const hit = p.originalX <= vaporX;
        if (hit) {
          if (p.speed === 0) {
            const angle = Math.random() * Math.PI * 2;
            p.speed = (Math.random() + 0.5) * vaporSpread;
            p.velocityX = Math.cos(angle) * p.speed;
            p.velocityY = Math.sin(angle) * p.speed;
            p.shouldFadeQuickly = Math.random() > densityNorm;
          }
          if (p.shouldFadeQuickly) {
            p.opacity = Math.max(0, p.opacity - dt);
          } else {
            const dx = p.originalX - p.x;
            const dy = p.originalY - p.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            const damp = Math.max(0.95, 1 - dist / (100 * vaporSpread));
            p.velocityX = (p.velocityX + (Math.random() - 0.5) * vaporSpread * 3 + dx * 0.002) * damp;
            p.velocityY = (p.velocityY + (Math.random() - 0.5) * vaporSpread * 3 + dy * 0.002) * damp;
            const maxV = vaporSpread * 2;
            const curV = Math.sqrt(p.velocityX ** 2 + p.velocityY ** 2);
            if (curV > maxV) { const s = maxV / curV; p.velocityX *= s; p.velocityY *= s; }
            p.x += p.velocityX * dt * 20;
            p.y += p.velocityY * dt * 10;
            p.opacity = Math.max(0, p.opacity - dt * 0.25 * (2000 / vaporizeDuration));
          }
          if (p.opacity > 0.01) allDone = false;
        } else {
          allDone = false;
        }
      });

      const dpr = globalDpr;
      ctx.save();
      ctx.scale(dpr, dpr);
      particlesRef.current.forEach((p) => {
        if (p.opacity > 0) {
          ctx.fillStyle = p.color.replace(/[\d.]+\)$/, `${p.opacity})`);
          ctx.fillRect(p.x / dpr, p.y / dpr, 1, 1);
        }
      });
      ctx.restore();

      if (progress >= 100 && allDone) {
        if (!completed) { completed = true; onComplete?.(); }
        return;
      }
      frameRef.current = requestAnimationFrame(animate);
    };

    frameRef.current = requestAnimationFrame(animate);
    return () => { if (frameRef.current) cancelAnimationFrame(frameRef.current); };
  }, [ready, vaporizeDuration, vaporSpread, densityNorm, globalDpr, onComplete]);

  return (
    <div ref={wrapperRef} style={{ width: "100%", height: "100%", pointerEvents: "none" }}>
      <canvas ref={canvasRef} style={{ minWidth: "30px", minHeight: "20px", pointerEvents: "none" }} />
    </div>
  );
}
