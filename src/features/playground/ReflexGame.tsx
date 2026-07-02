"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type Phase = "idle" | "playing" | "over";

type Orb = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
};

const BEST_KEY = "playground-reflex-best";
const PATTERN_START = 20; // 초 — 이 시점부터 패턴 공격 등장

export function ReflexGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  const [phase, setPhase] = useState<Phase>("idle");
  const [score, setScore] = useState(0);
  const [best, setBest] = useState(0);
  const [patternActive, setPatternActive] = useState(false);

  // rAF 루프에서 읽고 쓰는 가변 상태 (리렌더 없이 갱신)
  const phaseRef = useRef<Phase>("idle");
  const rafRef = useRef(0);
  const mountedRef = useRef(true);
  const sizeRef = useRef({ w: 0, h: 0, dpr: 1 });
  const targetRef = useRef({ x: 0, y: 0 }); // 우클릭으로 지정하는 이동 목표
  const playerRef = useRef({ x: 0, y: 0, r: 14 });
  const enemiesRef = useRef<Orb[]>([]);
  const startedAtRef = useRef(0);
  const lastSpawnRef = useRef(0);
  const lastSecRef = useRef(0);
  const lastPatternRef = useRef(0);
  const patternCountRef = useRef(0);
  const patternFlagRef = useRef(false);

  useEffect(() => {
    const stored = Number(window.localStorage.getItem(BEST_KEY) ?? "0");
    if (!Number.isNaN(stored)) setBest(stored);
  }, []);

  const endGame = useCallback((finalScore: number) => {
    phaseRef.current = "over";
    setPhase("over");
    setScore(finalScore);
    setBest((prev) => {
      const next = Math.max(prev, finalScore);
      window.localStorage.setItem(BEST_KEY, String(next));
      return next;
    });
  }, []);

  const spawnEnemy = useCallback((elapsed: number) => {
    const { w, h } = sizeRef.current;
    const speed = 1.6 + elapsed * 0.12; // 시간이 지날수록 빨라짐
    const r = 9 + Math.random() * 9;
    const edge = Math.floor(Math.random() * 4);
    let x = 0;
    let y = 0;
    if (edge === 0) {
      x = Math.random() * w;
      y = -r;
    } else if (edge === 1) {
      x = w + r;
      y = Math.random() * h;
    } else if (edge === 2) {
      x = Math.random() * w;
      y = h + r;
    } else {
      x = -r;
      y = Math.random() * h;
    }
    const p = playerRef.current;
    const ang = Math.atan2(p.y - y, p.x - x) + (Math.random() - 0.5) * 0.9;
    enemiesRef.current.push({
      x,
      y,
      vx: Math.cos(ang) * speed,
      vy: Math.sin(ang) * speed,
      r,
    });
  }, []);

  // 20초 이후 등장하는 패턴 공격 (링 수렴 / 틈 있는 벽 스윕 번갈아)
  const spawnPattern = useCallback((elapsed: number) => {
    const { w, h } = sizeRef.current;
    const enemies = enemiesRef.current;
    const variant = patternCountRef.current % 2;
    patternCountRef.current += 1;

    if (variant === 0) {
      // 링 수렴: 아레나 중심을 향해 좁혀 들어오는 원형 배치
      const cx = w / 2;
      const cy = h / 2;
      const radius = Math.hypot(w, h) * 0.55;
      const count = 16;
      const speed = 2.1 + (elapsed - PATTERN_START) * 0.05;
      const gap = Math.floor(Math.random() * count); // 한 곳은 비워 탈출로 확보
      for (let i = 0; i < count; i += 1) {
        if (i === gap) continue;
        const ang = (i / count) * Math.PI * 2;
        const x = cx + Math.cos(ang) * radius;
        const y = cy + Math.sin(ang) * radius;
        enemies.push({
          x,
          y,
          vx: Math.cos(ang + Math.PI) * speed,
          vy: Math.sin(ang + Math.PI) * speed,
          r: 11,
        });
      }
    } else {
      // 벽 스윕: 세로 벽이 좌/우에서 밀려오고, 통과할 틈 하나
      const fromLeft = Math.random() < 0.5;
      const speed = 2.4 + (elapsed - PATTERN_START) * 0.05;
      const slots = Math.max(6, Math.floor(h / 46));
      const gapSlot = 1 + Math.floor(Math.random() * (slots - 2));
      for (let i = 0; i < slots; i += 1) {
        if (i === gapSlot || i === gapSlot + 1) continue; // 2칸짜리 틈
        const y = (i + 0.5) * (h / slots);
        enemies.push({
          x: fromLeft ? -14 : w + 14,
          y,
          vx: fromLeft ? speed : -speed,
          vy: 0,
          r: 13,
        });
      }
    }
  }, []);

  const loop = useCallback(
    (time: number) => {
      if (!mountedRef.current) return;
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext("2d");
      const { w, h, dpr } = sizeRef.current;

      if (ctx && w > 0 && h > 0) {
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

        // 잔상 트레일
        ctx.fillStyle = "rgba(11, 17, 32, 0.32)";
        ctx.fillRect(0, 0, w, h);

        const playing = phaseRef.current === "playing";
        const elapsed = playing ? (time - startedAtRef.current) / 1000 : 0;

        if (playing) {
          const sec = Math.floor(elapsed);
          if (sec !== lastSecRef.current) {
            lastSecRef.current = sec;
            setScore(sec);
          }

          // 패턴 진입 플래그(HUD 표시용)
          if (elapsed >= PATTERN_START && !patternFlagRef.current) {
            patternFlagRef.current = true;
            setPatternActive(true);
          }

          // 일반 스폰
          const spawnGap = Math.max(280, 900 - elapsed * 45);
          if (time - lastSpawnRef.current > spawnGap) {
            spawnEnemy(elapsed);
            lastSpawnRef.current = time;
          }

          // 패턴 스폰 (20초 이후, 약 5초 간격)
          if (
            elapsed >= PATTERN_START &&
            time - lastPatternRef.current > 5000
          ) {
            spawnPattern(elapsed);
            lastPatternRef.current = time;
          }

          // 플레이어: 우클릭으로 지정한 목표로 부드럽게 이동
          const p = playerRef.current;
          p.x += (targetRef.current.x - p.x) * 0.18;
          p.y += (targetRef.current.y - p.y) * 0.18;

          // 적 이동 + 화면 밖 제거 + 충돌 판정
          const enemies = enemiesRef.current;
          for (let i = enemies.length - 1; i >= 0; i -= 1) {
            const e = enemies[i];
            e.x += e.vx;
            e.y += e.vy;
            const margin = 80;
            if (
              e.x < -margin ||
              e.x > w + margin ||
              e.y < -margin ||
              e.y > h + margin
            ) {
              enemies.splice(i, 1);
              continue;
            }
            if (Math.hypot(e.x - p.x, e.y - p.y) < e.r + p.r - 2) {
              endGame(Math.floor(elapsed));
              break;
            }
          }
        }

        // 그리기: 적
        for (const e of enemiesRef.current) {
          ctx.beginPath();
          ctx.fillStyle = "#f87171";
          ctx.shadowColor = "rgba(248, 113, 113, 0.7)";
          ctx.shadowBlur = 16;
          ctx.arc(e.x, e.y, e.r, 0, Math.PI * 2);
          ctx.fill();
        }

        // 그리기: 목표 지점 마커(플레이 중)
        if (phaseRef.current === "playing") {
          const t = targetRef.current;
          ctx.beginPath();
          ctx.strokeStyle = "rgba(96, 165, 250, 0.45)";
          ctx.lineWidth = 1.5;
          ctx.arc(t.x, t.y, 10, 0, Math.PI * 2);
          ctx.stroke();
        }

        // 그리기: 플레이어
        const p = playerRef.current;
        ctx.beginPath();
        ctx.fillStyle = "#60a5fa";
        ctx.shadowColor = "rgba(96, 165, 250, 0.9)";
        ctx.shadowBlur = 24;
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      }

      rafRef.current = requestAnimationFrame(loop);
    },
    [spawnEnemy, spawnPattern, endGame],
  );

  // 캔버스 크기/DPR 관리
  useEffect(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = wrap.clientWidth;
      const h = wrap.clientHeight;
      sizeRef.current = { w, h, dpr };
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      if (phaseRef.current !== "playing") {
        playerRef.current.x = w / 2;
        playerRef.current.y = h / 2;
        targetRef.current.x = w / 2;
        targetRef.current.y = h / 2;
      }
    };

    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(wrap);
    return () => observer.disconnect();
  }, []);

  // 컴포넌트 수명 동안 단일 rAF 루프 유지
  useEffect(() => {
    mountedRef.current = true;
    rafRef.current = requestAnimationFrame(loop);
    return () => {
      mountedRef.current = false;
      cancelAnimationFrame(rafRef.current);
    };
  }, [loop]);

  // 탭이 숨겨지면 진행 중 게임 종료(백그라운드 rAF 스로틀 방지)
  useEffect(() => {
    const onVisibility = () => {
      if (document.hidden && phaseRef.current === "playing") {
        endGame(Math.floor((performance.now() - startedAtRef.current) / 1000));
      }
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () =>
      document.removeEventListener("visibilitychange", onVisibility);
  }, [endGame]);

  const startGame = useCallback(() => {
    const { w, h } = sizeRef.current;
    enemiesRef.current = [];
    playerRef.current = { x: w / 2, y: h / 2, r: 14 };
    targetRef.current = { x: w / 2, y: h / 2 };
    startedAtRef.current = performance.now();
    lastSpawnRef.current = performance.now();
    lastPatternRef.current = performance.now();
    lastSecRef.current = 0;
    patternCountRef.current = 0;
    patternFlagRef.current = false;
    setPatternActive(false);
    setScore(0);
    phaseRef.current = "playing";
    setPhase("playing");
  }, []);

  const setTargetFromEvent = (
    event: React.PointerEvent<HTMLCanvasElement>,
  ) => {
    const rect = event.currentTarget.getBoundingClientRect();
    targetRef.current.x = event.clientX - rect.left;
    targetRef.current.y = event.clientY - rect.top;
  };

  const onPointerDown = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (phaseRef.current !== "playing") {
      // 시작: 좌클릭 또는 터치/펜
      if (event.button === 0 || event.pointerType !== "mouse") startGame();
      return;
    }
    // 플레이 중: 마우스는 우클릭으로만 이동, 터치/펜은 탭으로 이동
    if (event.pointerType === "mouse" && event.button !== 2) return;
    setTargetFromEvent(event);
  };

  return (
    <div className="mx-auto w-full max-w-[900px]">
      <div
        ref={wrapRef}
        className="relative aspect-[16/10] w-full overflow-hidden rounded-[28px] border border-white/10 bg-[#0b1120]"
      >
        <canvas
          ref={canvasRef}
          onPointerDown={onPointerDown}
          onContextMenu={(event) => event.preventDefault()}
          className="absolute inset-0 h-full w-full touch-none"
          aria-label="네온 닷지 게임 캔버스"
        />

        {/* 점수 HUD */}
        {phase === "playing" ? (
          <div className="pointer-events-none absolute left-5 top-4 flex items-center gap-3">
            <span className="font-display text-2xl font-bold tabular-nums text-white">
              {score}
              <span className="ml-1 align-middle text-xs font-medium tracking-widest text-slate-400">
                SEC
              </span>
            </span>
            {patternActive ? (
              <span className="rounded-full bg-red-500/20 px-3 py-1 text-[11px] font-bold uppercase tracking-widest text-red-300">
                ⚠ Pattern
              </span>
            ) : null}
          </div>
        ) : null}

        {/* 조작 힌트 (플레이 중) */}
        {phase === "playing" ? (
          <div className="pointer-events-none absolute bottom-4 left-1/2 -translate-x-1/2 text-[11px] font-medium tracking-wide text-slate-400">
            우클릭으로 이동
          </div>
        ) : null}

        {/* 시작 / 게임오버 오버레이 */}
        {phase !== "playing" ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-5 bg-[#0b1120]/55 text-center backdrop-blur-[2px]">
            {phase === "over" ? (
              <>
                <p className="cinematic-label text-red-400">Game Over</p>
                <p className="font-display text-5xl font-bold text-white">
                  {score}
                  <span className="ml-2 text-lg font-medium text-slate-400">
                    초 생존
                  </span>
                </p>
                <p className="text-sm text-slate-400">최고 기록 {best}초</p>
              </>
            ) : (
              <>
                <p className="cinematic-label text-blue-300">AI Playground</p>
                <h3 className="max-w-[22ch] font-display text-2xl font-semibold text-white md:text-3xl">
                  움직이는 오브를 피해 최대한 오래 버티기
                </h3>
                <p className="max-w-[36ch] text-sm text-slate-300">
                  <strong className="text-white">우클릭</strong>한 지점으로 파란
                  오브가 이동합니다. 빨간 오브를 피하세요. 20초부터는 패턴 공격이
                  시작됩니다. (터치는 탭으로 이동)
                </p>
                {best > 0 ? (
                  <p className="text-xs text-slate-400">최고 기록 {best}초</p>
                ) : null}
              </>
            )}

            <button
              type="button"
              onClick={startGame}
              className="mt-1 inline-flex h-12 items-center rounded-full bg-white px-7 text-sm font-semibold text-[#0b1120] transition-transform hover:-translate-y-0.5"
            >
              {phase === "over" ? "다시 하기" : "게임 시작"}
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
