"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type Entity = {
  id: number;
  x: number;    // 0..1 (percent of width)
  y: number;    // 0..1 (percent of height)
  speed: number; // vh per second (normalized)
  kind: "jelly" | "pearl" | "shield";
};

const BASE_SPAWN_JELLY_MS = 900;
const BASE_SPAWN_PEARL_MS = 2400;
const BASE_SPAWN_SHIELD_MS = 9000;

const PLAYER_SPEED = 1.6;       // pct of width per ms when dragging
const PLAYER_RADIUS = 26;       // px
const JELLY_RADIUS = 24;
const PEARL_RADIUS = 18;
const SHIELD_RADIUS = 20;
const SHIELD_DURATION = 6000;   // ms

export const dynamic = "force-static";

export default function Page() {
  // ------- Background SVG -------
  const BG = useMemo(
    () => `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 288" preserveAspectRatio="xMidYMid slice">
  <defs>
    <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#0b1220"/>
      <stop offset="100%" stop-color="#162336"/>
    </linearGradient>
    <linearGradient id="sea" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#0f2a3a"/>
      <stop offset="100%" stop-color="#071821"/>
    </linearGradient>
  </defs>
  <rect width="512" height="168" fill="url(#sky)"/>
  <g opacity=".55">
    <ellipse cx="140" cy="60" rx="120" ry="40" fill="#1a2436"/>
    <ellipse cx="340" cy="50" rx="160" ry="60" fill="#10192a" opacity=".8"/>
    <ellipse cx="260" cy="90" rx="200" ry="50" fill="#1b2a3b" opacity=".6"/>
  </g>
  <rect y="168" width="512" height="120" fill="url(#sea)"/>
  <g id="waves" fill="#0c2030" opacity=".9">
    <path d="M0,206 Q50,186 100,206 T200,206 T300,206 T400,206 T500,206 V288 H0 Z"/>
    <path d="M0,196 Q60,216 120,196 T240,196 T360,196 T480,196 V288 H0 Z" opacity=".75"/>
    <path d="M0,222 Q50,242 100,222 T200,222 T300,222 T400,222 T500,222 V288 H0 Z" opacity=".6"/>
  </g>
</svg>`.trim(),
    []
  );

  // ------- Refs / State -------
  const stageRef = useRef<HTMLDivElement>(null);

  const [running, setRunning] = useState(true);
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [shieldOn, setShieldOn] = useState(false);

  // Combo & Difficulty
  const [combo, setCombo] = useState(0);
  const [mult, setMult] = useState(1);
  const [elapsed, setElapsed] = useState(0); // seconds survived (for UI)

  // internal refs
  const shieldTO = useRef<number | null>(null);
  const player = useRef({ x: 0.5 }); // 0..1
  const targetX = useRef(0.5);
  const ents = useRef<Entity[]>([]);
  const idSeq = useRef(1);
  const tJelly = useRef<number | null>(null);
  const tPearl = useRef<number | null>(null);
  const tShield = useRef<number | null>(null);

  // difficulty helpers
  const elapsedRef = useRef(0); // seconds
  const ramp = () => 1 + elapsedRef.current * 0.015; // +1.5% per sec
  const speedRamp = () => Math.pow(ramp(), 0.35);    // softer curve for speed

  // ------- Spawning -------
  const spawn = (kind: Entity["kind"]) => {
    const baseSpeed =
      kind === "jelly" ? (0.22 + Math.random() * 0.08) :
      kind === "pearl" ? (0.18 + Math.random() * 0.06) :
                         (0.2 + Math.random() * 0.05);
    ents.current.push({
      id: idSeq.current++,
      x: Math.random() * 0.86 + 0.07,
      y: -0.12,
      speed: baseSpeed * speedRamp(),
      kind,
    });
  };

  const scheduleSpawner = (
    ref: React.MutableRefObject<number | null>,
    baseMs: number,
    jitterMin: number,
    jitterMax: number,
    fn: () => void
  ) => {
    const R = ramp();
    const jitter = jitterMin + Math.random() * (jitterMax - jitterMin);
    const delay = Math.max(140, (baseMs / R) * jitter); // never faster than ~7/s
    ref.current = window.setTimeout(() => {
      if (running) fn();
      scheduleSpawner(ref, baseMs, jitterMin, jitterMax, fn);
    }, delay);
  };

  useEffect(() => {
    scheduleSpawner(tJelly, BASE_SPAWN_JELLY_MS, 0.92, 1.10, () => spawn("jelly"));
    scheduleSpawner(tPearl, BASE_SPAWN_PEARL_MS, 0.80, 1.20, () => spawn("pearl"));
    scheduleSpawner(tShield, BASE_SPAWN_SHIELD_MS, 0.85, 1.30, () => spawn("shield"));
    return () => {
      const tj = tJelly.current; if (tj) clearTimeout(tj);
      const tp = tPearl.current; if (tp) clearTimeout(tp);
      const ts = tShield.current; if (ts) clearTimeout(ts);
    };
    // We intentionally exclude dependencies on spawn/scheduleSpawner because they are stable
    // and we only want to re-run when running toggles.
  }, [running]); // uses ramp() at schedule time

  // ------- Game loop -------
  useEffect(() => {
    let raf = 0;
    let last = performance.now();

    const tick = (t: number) => {
      const dt = (t - last) / 1000; // sec
      last = t;

      if (running) {
        elapsedRef.current += dt;
        // Update UI copy of elapsed every ~100ms
        if (Math.floor(elapsedRef.current * 10) !== Math.floor(elapsed * 10)) {
          setElapsed(elapsedRef.current);
        }

        // +1 per second (time score; not multiplied)
        setScore((s) => s + dt);

        // ease to target
        const dx = targetX.current - player.current.x;
        player.current.x += Math.max(Math.min(dx, dt * PLAYER_SPEED), -dt * PLAYER_SPEED);

        // move entities with speed ramp (already baked in at spawn)
        ents.current.forEach((e) => { e.y += e.speed * dt; });
        ents.current = ents.current.filter((e) => e.y < 1.2);

        // collisions
        const stage = stageRef.current;
        if (stage) {
          const rect = stage.getBoundingClientRect();
          const px = player.current.x * rect.width;
          const py = rect.height * 0.82;
          const hit = (ex: number, ey: number, r: number) => {
            const dx2 = ex - px, dy2 = ey - py;
            return Math.hypot(dx2, dy2) < (PLAYER_RADIUS + r);
          };
          const remain: Entity[] = [];
          for (const e of ents.current) {
            const ex = e.x * rect.width;
            const ey = e.y * rect.height;

            if (e.kind === "jelly") {
              if (hit(ex, ey, JELLY_RADIUS)) {
                if (shieldOn) {
                  setShieldOn(false);
                  if (shieldTO.current) clearTimeout(shieldTO.current);
                } else {
                  setLives((l) => l - 1);
                  // reset combo on damage
                  setCombo(0);
                  setMult(1);
                }
                continue; // remove entity
              }
            } else if (e.kind === "pearl") {
              if (hit(ex, ey, PEARL_RADIUS)) {
                // combo on pearl
                setCombo((c) => {
                  const next = c + 1;
                  const nextMult = 1 + Math.floor(next / 3);
                  setMult(nextMult);
                  // Pearl score is multiplied; time score remains separate
                  setScore((s) => s + 5 * nextMult);
                  return next;
                });
                continue;
              }
            } else if (e.kind === "shield") {
              if (hit(ex, ey, SHIELD_RADIUS)) {
                setShieldOn(true);
                if (shieldTO.current) clearTimeout(shieldTO.current);
                shieldTO.current = window.setTimeout(() => setShieldOn(false), SHIELD_DURATION);
                continue;
              }
            }
            remain.push(e);
          }
          ents.current = remain;
        }
      }

      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [running, shieldOn, elapsed]);

  // end game
  useEffect(() => {
    if (lives <= 0) setRunning(false);
  }, [lives]);

  const reset = () => {
    ents.current = [];
    player.current.x = 0.5;
    targetX.current = 0.5;
    elapsedRef.current = 0;
    setElapsed(0);
    setScore(0);
    setLives(3);
    setShieldOn(false);
    setCombo(0);
    setMult(1);
    if (shieldTO.current) clearTimeout(shieldTO.current);
    setRunning(true);
  };

  // ------- input -------
  useEffect(() => {
    const onPointer = (e: PointerEvent) => {
      const rect = stageRef.current?.getBoundingClientRect();
      if (!rect) return;
      const x = e.clientX - rect.left;
      targetX.current = Math.max(0.06, Math.min(0.94, x / rect.width));
    };
    const s = stageRef.current;
    if (!s) return;
    s.addEventListener("pointerdown", onPointer);
    s.addEventListener("pointermove", onPointer);
    return () => {
      s.removeEventListener("pointerdown", onPointer);
      s.removeEventListener("pointermove", onPointer);
    };
  }, []);

  // ------- render helpers -------
  const renderEntities = () =>
    ents.current.map((e) => {
      const key = e.id;
      const tx = `${(e.x * 100).toFixed(3)}%`;
      const ty = `${(e.y * 100).toFixed(3)}%`;
      if (e.kind === "jelly") {
        return (
          <g key={key} transform={`translate(${tx}, ${ty})`}>
            <ellipse cx="0" cy="0" rx="22" ry="18" fill="#8ee" opacity=".9" />
            <g stroke="#8ee" strokeWidth="4" strokeLinecap="round" opacity=".8">
              <path d="M-10,12 q-4,10 2,18" />
              <path d="M0,12 q-2,10 0,18" />
              <path d="M10,12 q4,10 -2,18" />
            </g>
          </g>
        );
      }
      if (e.kind === "pearl") {
        return (
          <g key={key} transform={`translate(${tx}, ${ty})`}>
            <circle r="14" fill="#f6f0ff" />
            <circle r="6" cx="5" cy="-5" fill="#ffffff" opacity=".7" />
          </g>
        );
      }
      return (
        <g key={key} transform={`translate(${tx}, ${ty})`}>
          <circle r="16" fill="#9be7ff" opacity=".85" />
          <circle r="10" fill="#c7f1ff" opacity=".9" />
        </g>
      );
    });

  // hearts
  const hearts = Array.from({ length: 3 }).map((_, i) => (
    <span key={i} className={`inline-block w-3 h-3 rounded-[2px] ${i < lives ? "bg-rose-400" : "bg-white/15"}`} />
  ));

  // player sprite
  const playerX = `${(player.current.x * 100).toFixed(3)}%`;

  return (
    <main className="min-h-[100svh] bg-black text-white">
      <div className="grid place-items-center w-full h-full">
        <div
          ref={stageRef}
          className="relative w-screen h-[100svh] md:max-w-5xl md:h-auto md:aspect-[16/9] overflow-hidden rounded-none md:rounded-2xl ring-1 ring-white/10 select-none touch-none"
        >
          {/* Background */}
          <div className="absolute inset-0" dangerouslySetInnerHTML={{ __html: BG }} />

          {/* Entities */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 800 450" preserveAspectRatio="none">
            <g>{renderEntities()}</g>
          </svg>

          {/* Player */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 800 450" preserveAspectRatio="none">
            <g transform={`translate(${playerX}, 82%)`}>
              {/* Shield aura */}
              {shieldOn && (
                <circle r="40" fill="none" stroke="#9be7ff" strokeDasharray="6 8" opacity=".7">
                  <animate attributeName="r" values="36;44;36" dur="1.6s" repeatCount="indefinite" />
                </circle>
              )}
              {/* Diver helmet */}
              <g>
                <circle r="26" fill="#222b3a" stroke="#96a6ff" strokeWidth="3" />
                <circle r="16" fill="#1a2230" />
                <circle r="8" fill="#8cc7ff" opacity=".9" />
                <rect x="-14" y="18" width="28" height="8" rx="4" fill="#96a6ff" />
              </g>
            </g>
          </svg>

          {/* HUD */}
          <div className="absolute top-3 left-4 right-4 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              {hearts}
              <span className={`ml-2 px-2 py-0.5 rounded ${shieldOn ? "bg-cyan-500/20 text-cyan-200" : "bg-white/10 text-white/70"}`}>
                {shieldOn ? "Shield" : "No Shield"}
              </span>
              {/* Combo badge */}
              <span
                className={`ml-2 px-2 py-0.5 rounded font-semibold transition-all ${
                  combo > 0 ? "bg-amber-400/15 text-amber-200 scale-105" : "bg-white/10 text-white/60"
                }`}
              >
                Combo x{mult} {combo > 0 && <span className="opacity-70">({combo})</span>}
              </span>
            </div>
            <div className="font-mono flex items-center gap-3">
              <span>t={Math.floor(elapsed)}s</span>
              <span>Score: {Math.floor(score)}</span>
            </div>
          </div>

          {/* Game Over */}
          {!running && (
            <button
              onClick={reset}
              className="absolute inset-0 grid place-items-center bg-black/40 backdrop-blur-[2px] focus:outline-none"
            >
              <div className="px-6 py-4 rounded-xl bg-neutral-900/90 ring-1 ring-white/10">
                <div className="text-xl font-bold text-center">Jelly Dash</div>
                <div className="text-sm opacity-80 text-center mt-1">Score: {Math.floor(score)}</div>
                <div className="text-xs opacity-75 mt-2 text-center">Tap to restart</div>
              </div>
            </button>
          )}
        </div>
      </div>

      {/* Global polish */}
      <style jsx global>{`
        svg { shape-rendering: geometricPrecision; text-rendering: optimizeLegibility; }
      `}</style>
    </main>
  );
}
