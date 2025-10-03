"use client";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";

/**
 * King Crab: Tap Battle (30s)
 * Copy‑paste this file to: src/app/play/crab/page.tsx
 * TailwindCSS required. No external images.
 *
 * States: READY → BATTLE → RESULT
 */

type BattleState = "READY" | "BATTLE" | "RESULT";

const BATTLE_DURATION_MS = 30_000; // 30s
const STARTING_HP = 100; // avg ~6 taps/sec to win
const TAP_DAMAGE = 1;
const CRIT_DAMAGE = 3;
const CRIT_CHANCE = 0.05; // 5%
const MAX_TAPS_PER_100MS_BUCKET = 12; // anti-macro burst
const MAX_TAPS_PER_SECOND = 20; // soft cap

export default function Page() {
  const [state, setState] = useState<BattleState>("READY");
  const [hp, setHp] = useState<number>(STARTING_HP);
  const [timeLeft, setTimeLeft] = useState<number>(BATTLE_DURATION_MS);
  const [taps, setTaps] = useState<number>(0);
  const [crits, setCrits] = useState<number>(0);
  const [reducedMotion, setReducedMotion] = useState<boolean>(false);
  const [win, setWin] = useState<boolean | null>(null);

  // Anti‑cheat buckets
  const bucket100Ref = useRef<{ key: number; count: number }>({ key: 0, count: 0 });
  const perSecRef = useRef<{ key: number; count: number }>({ key: 0, count: 0 });

  // Anim smidge
  const [shakeKey, setShakeKey] = useState<number>(0);
  const [flash, setFlash] = useState<boolean>(false);

  const progress = useMemo(() => {
    return Math.max(0, Math.min(1, 1 - timeLeft / BATTLE_DURATION_MS));
  }, [timeLeft]);

  // Detect reduced motion preference
  useEffect(() => {
    if (typeof window !== "undefined") {
      const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
      setReducedMotion(mq.matches);
      const onChange = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
      mq.addEventListener?.("change", onChange);
      return () => mq.removeEventListener?.("change", onChange);
    }
  }, []);

  const vibrate = useCallback((pattern: number | number[]) => {
    if (typeof window === "undefined") return;
    if ("vibrate" in navigator && typeof navigator.vibrate === "function") {
      try {
        navigator.vibrate(pattern);
      } catch {
        // ignore vibration failures (desktop or restricted environments)
      }
    }
  }, []);

  // Timer loop
  useEffect(() => {
    if (state !== "BATTLE") return;
    const startedAt = performance.now();
    const base = timeLeft; // resume if replaying quickly

    let raf = 0;
    const tick = () => {
      const elapsed = performance.now() - startedAt;
      const remaining = Math.max(0, base - elapsed);
      setTimeLeft(remaining);
      if (remaining <= 0) {
        setState("RESULT");
        setWin(hp <= 0);
        vibrate(hp <= 0 ? [40, 60, 40] : 20);
        return;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  // Flash the screen at low HP thresholds
  useEffect(() => {
    if (state !== "BATTLE") return;
    if (hp === Math.floor(STARTING_HP * 0.25) || hp === Math.floor(STARTING_HP * 0.1)) {
      setFlash(true);
      const t = setTimeout(() => setFlash(false), 120);
      return () => clearTimeout(t);
    }
  }, [hp, state]);

  const reset = useCallback(() => {
    setHp(STARTING_HP);
    setTimeLeft(BATTLE_DURATION_MS);
    setTaps(0);
    setCrits(0);
    setWin(null);
    setState("READY");
  }, []);

  const start = useCallback(() => {
    setHp(STARTING_HP);
    setTimeLeft(BATTLE_DURATION_MS);
    setTaps(0);
    setCrits(0);
    setWin(null);
    setState("BATTLE");
  }, []);

  const onTap = useCallback(() => {
    if (state !== "BATTLE") return;

    const now = performance.now();
    // 100ms bucket
    const bucketKey = Math.floor(now / 100);
    if (bucket100Ref.current.key !== bucketKey) {
      bucket100Ref.current.key = bucketKey;
      bucket100Ref.current.count = 0;
    }
    bucket100Ref.current.count++;
    if (bucket100Ref.current.count > MAX_TAPS_PER_100MS_BUCKET) return; // ignore burst

    // per‑second bucket
    const secKey = Math.floor(now / 1000);
    if (perSecRef.current.key !== secKey) {
      perSecRef.current.key = secKey;
      perSecRef.current.count = 0;
    }
    perSecRef.current.count++;
    if (perSecRef.current.count > MAX_TAPS_PER_SECOND) return; // ignore too fast

    // Hit only if we still have HP/time
    if (hp <= 0 || timeLeft <= 0) return;

    // crit?
    const isCrit = Math.random() < CRIT_CHANCE;
    const dmg = isCrit ? CRIT_DAMAGE : TAP_DAMAGE;

    setTaps((t) => t + 1);
    if (isCrit) setCrits((c) => c + 1);

    setHp((prev) => {
      const next = Math.max(0, prev - dmg);
      if (!reducedMotion) {
        setShakeKey((k) => k + 1);
      }
      // win instantly if HP hits 0
      if (next === 0) {
        setState("RESULT");
        setWin(true);
        vibrate([30, 60, 30]);
      } else {
        // light tap vibra
        if (!reducedMotion) vibrate(isCrit ? [8, 12, 8] : 8);
      }
      return next;
    });
  }, [state, hp, timeLeft, reducedMotion, vibrate]);

  // Circular timer progress (SVG)
  const circumference = 2 * Math.PI * 120; // r=120
  const dash = useMemo(() => `${circumference * progress} ${circumference}`, [circumference, progress]);

  const lowHp = hp > 0 && hp <= STARTING_HP * 0.25;

  return (
    <main className="min-h-dvh w-full bg-gradient-to-b from-sky-100 via-sky-50 to-amber-50 dark:from-slate-900 dark:via-slate-900 dark:to-slate-950 flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="mb-4 text-center">
          <h1 className="text-2xl font-bold tracking-tight">King Crab — Tap Battle</h1>
          {state !== "RESULT" ? (
            <p className="text-sm text-gray-600 dark:text-gray-300">Defeat the crab in 30 seconds by tapping it. Crit chance 5%.</p>
          ) : (
            <p className="text-sm text-gray-600 dark:text-gray-300">Taps: {taps} · Crits: {crits} · Time left: {Math.ceil(timeLeft / 1000)}s</p>
          )}
        </div>

        {/* HP + Timer */}
        <div className="mb-3 flex items-center justify-between gap-3">
          <div className="flex-1">
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="font-medium">HP</span>
              <span className="tabular-nums">{hp}</span>
            </div>
            <div className={`h-2 rounded-full overflow-hidden ${lowHp ? "ring-2 ring-red-300" : "ring-1 ring-black/5 dark:ring-white/10"}`}>
              <div
                className={`h-full transition-[width] duration-150 ${lowHp ? "bg-red-500" : "bg-emerald-500"}`}
                style={{ width: `${(hp / STARTING_HP) * 100}%` }}
              />
            </div>
          </div>
          <div className="w-20 text-right">
            <div className="text-xs font-medium">Time</div>
            <div className="text-lg font-bold tabular-nums">{Math.ceil(timeLeft / 1000)}s</div>
          </div>
        </div>

        {/* Arena */}
        <div className={`relative bg-white/70 dark:bg-white/5 backdrop-blur-sm rounded-3xl shadow-lg p-4 ${flash ? "animate-[pulse_0.12s_ease]" : ""}`}>
          <div className="relative mx-auto aspect-square max-w-[360px]">
            {/* Timer ring */}
            <svg viewBox="0 0 300 300" className="absolute inset-0 w-full h-full">
              <circle cx="150" cy="150" r="120" className="fill-none stroke-black/10 dark:stroke-white/10" strokeWidth="14" />
              <circle
                cx="150"
                cy="150"
                r="120"
                className="fill-none stroke-amber-500"
                strokeWidth="10"
                strokeDasharray={dash}
                strokeLinecap="round"
                transform="rotate(-90 150 150)"
              />
            </svg>

            {/* Crab button */}
            <button
              onClick={onTap}
              aria-label="Tap the King Crab"
              className={`absolute inset-6 rounded-full focus:outline-none focus-visible:ring-4 focus-visible:ring-amber-400/60 select-none ${state === "BATTLE" ? "cursor-pointer" : "cursor-default"}`}
              disabled={state !== "BATTLE"}
            >
              <div
                key={shakeKey}
                className={`size-full rounded-full grid place-items-center transition-transform ${reducedMotion ? "" : "animate-[pop_0.08s_ease]"}`}
                style={{
                  background: "radial-gradient(ellipse at 50% 40%, rgba(255,255,255,0.7), rgba(255,200,150,0.3))",
                }}
              >
                <CrabSVG className="w-[70%] h-[70%] drop-shadow-[0_8px_20px_rgba(0,0,0,0.25)]" lowHp={lowHp} />
              </div>
            </button>
          </div>

          {/* State overlays */}
          {state === "READY" && (
            <div className="absolute inset-0 rounded-3xl bg-gradient-to-b from-white/80 to-white/40 dark:from-black/60 dark:to-black/40 backdrop-blur-sm grid place-items-center text-center p-6">
              <div>
                <h2 className="text-xl font-bold mb-2">King Crab Challenge</h2>
                <p className="text-sm text-gray-700 dark:text-gray-200 mb-4">Tap to defeat in 30 seconds. Crits deal extra damage.</p>
                <div className="flex items-center justify-center gap-3">
                  <button
                    onClick={start}
                    className="px-4 py-2 rounded-full bg-amber-500 text-white font-semibold shadow hover:brightness-105 active:scale-[0.98]"
                  >
                    Tap to Begin
                  </button>
                  <label className="flex items-center gap-2 text-xs text-gray-700 dark:text-gray-200">
                    <input
                      type="checkbox"
                      checked={reducedMotion}
                      onChange={(e) => setReducedMotion(e.target.checked)}
                      className="accent-amber-500"
                    />
                    Reduced motion
                  </label>
                </div>
              </div>
            </div>
          )}

          {state === "RESULT" && (
            <div className="absolute inset-0 rounded-3xl bg-gradient-to-b from-white/90 to-white/60 dark:from-black/70 dark:to-black/50 backdrop-blur-sm grid place-items-center text-center p-6">
              <div>
                <h2 className="text-2xl font-extrabold mb-1">
                  {win ? "You cracked the crab!" : "Pinched!"}
                </h2>
                <p className="text-sm text-gray-700 dark:text-gray-200 mb-4">
                  Taps: {taps} · Crits: {crits} · {win ? "Victory" : "Try again for a better rhythm"}
                </p>
                <div className="flex items-center justify-center gap-3">
                  <button
                    onClick={start}
                    className="px-4 py-2 rounded-full bg-amber-500 text-white font-semibold shadow hover:brightness-105 active:scale-[0.98]"
                  >
                    Play Again
                  </button>
                  <button
                    onClick={reset}
                    className="px-4 py-2 rounded-full bg-white/80 dark:bg-white/10 border border-black/10 dark:border-white/10 text-gray-800 dark:text-gray-100 font-semibold shadow hover:brightness-105 active:scale-[0.98]"
                  >
                    Back
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer note */}
        <p className="mt-3 text-center text-xs text-gray-600 dark:text-gray-300">
          Win rewards in future builds. For now, we’re testing feel, timing, and juice.
        </p>
      </div>

      <style jsx global>{`
        @keyframes pop { from { transform: translateZ(0) scale(1.0) } to { transform: translateZ(0) scale(1.02) } }
      `}</style>
    </main>
  );
}

function CrabSVG({ className, lowHp }: { className?: string; lowHp?: boolean }) {
  // Simple inline SVG crab (no external assets)
  // Color shifts a bit when low HP
  const shell = lowHp ? "#ef4444" : "#f97316"; // red-500 vs orange-500
  const claw = lowHp ? "#b91c1c" : "#c2410c"; // deeper
  const eye = "#111827"; // gray-900

  return (
    <svg viewBox="0 0 256 256" className={className} aria-hidden>
      {/* Shadow */}
      <ellipse cx="128" cy="200" rx="70" ry="16" fill="rgba(0,0,0,0.12)" />
      {/* Body */}
      <ellipse cx="128" cy="120" rx="70" ry="45" fill={shell} />
      {/* Dots on shell */}
      <circle cx="110" cy="110" r="4" fill="rgba(255,255,255,0.5)" />
      <circle cx="146" cy="116" r="3" fill="rgba(255,255,255,0.5)" />
      <circle cx="128" cy="128" r="2.5" fill="rgba(255,255,255,0.5)" />
      {/* Eyes */}
      <line x1="106" y1="84" x2="106" y2="100" stroke={eye} strokeWidth="4" />
      <line x1="150" y1="84" x2="150" y2="100" stroke={eye} strokeWidth="4" />
      <circle cx="106" cy="78" r="6" fill={eye} />
      <circle cx="150" cy="78" r="6" fill={eye} />
      {/* Legs */}
      <path d="M60 140 l-24 8" stroke={claw} strokeWidth="8" strokeLinecap="round" />
      <path d="M68 156 l-26 14" stroke={claw} strokeWidth="8" strokeLinecap="round" />
      <path d="M196 140 l24 8" stroke={claw} strokeWidth="8" strokeLinecap="round" />
      <path d="M188 156 l26 14" stroke={claw} strokeWidth="8" strokeLinecap="round" />
      {/* Claws */}
      <path d="M68 110 q-20 -16 -30 -30 q20 2 30 12 q2 -10 8 -18 q2 14 -8 36 z" fill={claw} />
      <path d="M188 110 q20 -16 30 -30 q-20 2 -30 12 q-2 -10 -8 -18 q-2 14 8 36 z" fill={claw} />
    </svg>
  );
}
