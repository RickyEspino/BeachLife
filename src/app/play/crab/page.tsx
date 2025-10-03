"use client";
import React, { useCallback, useEffect, useRef, useState } from "react";

/**
 * King Crab: Tap Battle (30s) — with Sound Toggle + SFX
 * Paste to: src/app/play/crab/page.tsx
 * TailwindCSS required. No external images.
 *
 * States: READY → BATTLE → RESULT
 */

type BattleState = "READY" | "BATTLE" | "RESULT";

// Legacy: historical battle target length (30s) kept for tuning reference.
// Removed unused constant to satisfy lint.
const STARTING_HP = 100; // crab HP
const PLAYER_STARTING_HP = 100; // player HP
const PLAYER_DRAIN_PER_SEC = PLAYER_STARTING_HP / 30; // drains fully in ~30s if no win
const TAP_DAMAGE = 1;
const CRIT_DAMAGE = 5;
const CRIT_CHANCE = 0.10; // 10%
const MAX_TAPS_PER_100MS_BUCKET = 12; // anti-macro burst
const MAX_TAPS_PER_SECOND = 20; // soft cap

// Power Ups
type PowerUpKey = 'slow' | 'double' | 'shield';
interface ActivePowerUp { key: PowerUpKey; expiresAt: number; }
const POWER_UP_DURATIONS: Record<PowerUpKey, number> = {
  slow: 6000,      // 6s slower drain
  double: 6000,    // 6s double taps score weighting (here: extra damage tick on crit)
  shield: 1        // shield is single-use flag (expiresAt ignored after consumption)
};

// Power-up & FX groundwork (extensible)
// (Future power-ups will hook into these structures.)

type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
};

export default function Page() {
  const [state, setState] = useState<BattleState>("READY");
  const [hp, setHp] = useState<number>(STARTING_HP); // crab HP
  const [playerHp, setPlayerHp] = useState<number>(PLAYER_STARTING_HP); // player HP (drains over time)
  const [taps, setTaps] = useState<number>(0);
  const [crits, setCrits] = useState<number>(0);
  const [reducedMotion, setReducedMotion] = useState<boolean>(false);
  const [soundOn, setSoundOn] = useState<boolean>(true);
  const [win, setWin] = useState<boolean | null>(null);
  // Power-up state
  const [powerUps, setPowerUps] = useState<ActivePowerUp[]>([]);
  const hasPowerUp = useCallback((k: PowerUpKey) => powerUps.some(p => p.key === k && (p.key === 'shield' ? true : p.expiresAt > performance.now())), [powerUps]);
  const addPowerUp = useCallback((k: PowerUpKey) => {
    setPowerUps(prev => {
      const now = performance.now();
      if (k === 'shield') {
        // single shield active at a time
        if (prev.some(p => p.key === 'shield')) return prev;
        return [...prev, { key: 'shield', expiresAt: now + 60_000 }]; // long expiry (functionally until used)
      }
      const expiresAt = now + POWER_UP_DURATIONS[k];
      // refresh if already present
      return [...prev.filter(p => p.key !== k), { key: k, expiresAt }];
    });
  }, []);
  const consumeShield = useCallback(() => {
    setPowerUps(prev => prev.filter(p => p.key !== 'shield'));
  }, []);
  // Periodic cleanup of expired (non-shield) powerups
  useEffect(() => {
    if (!powerUps.length) return;
    const id = setInterval(() => {
      const now = performance.now();
      setPowerUps(prev => prev.filter(p => p.key === 'shield' || p.expiresAt > now));
    }, 1000);
    return () => clearInterval(id);
  }, [powerUps.length]);

  // Anti-cheat buckets
  const bucket100Ref = useRef<{ key: number; count: number }>({ key: 0, count: 0 });
  const perSecRef = useRef<{ key: number; count: number }>({ key: 0, count: 0 });

  // Anim state
  const [shakeKey, setShakeKey] = useState<number>(0);
  const [flash, setFlash] = useState<boolean>(false);
  const [celebrate, setCelebrate] = useState<boolean>(false);
  const [damageFlash, setDamageFlash] = useState<boolean>(false); // red flash when player takes damage
  // Screen shake (separate from pop animation key)
  const [shakeMag, setShakeMag] = useState<number>(0); // pixels (max amplitude)
  const shakeUntilRef = useRef<number>(0);

  // Imperative shake trigger
  const triggerShake = useCallback((magnitude: number, durationMs: number) => {
    if (reducedMotion) return; // respect reduced motion
    const now = performance.now();
    // Keep the strongest magnitude for overlap windows
    if (magnitude > shakeMag) setShakeMag(magnitude);
    if (now + durationMs > shakeUntilRef.current) shakeUntilRef.current = now + durationMs;
  }, [shakeMag, reducedMotion]);
  // Particles
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const particlesRef = useRef<Particle[]>([]);
  const particleRafRef = useRef<number>(0);
  const crabButtonRef = useRef<HTMLButtonElement | null>(null);

  // Spawn a particle burst at a normalized (0-1) position within the crab button
  const spawnParticles = useCallback((nx: number, ny: number, crit: boolean) => {
    const arr = particlesRef.current;
    const count = crit ? 42 : 24;
    for (let i = 0; i < count; i++) {
      const angle = (Math.random() * Math.PI * 2);
      const speed = crit ? 140 + Math.random() * 160 : 90 + Math.random() * 110; // px/s
      const vx = Math.cos(angle) * speed;
      const vy = Math.sin(angle) * speed;
      const maxLife = 400 + Math.random() * 300; // ms
      const size = crit ? 5 + Math.random() * 6 : 4 + Math.random() * 4;
      const hues = crit ? [30, 40, 45, 50] : [18, 20, 24, 28];
      const hue = hues[Math.floor(Math.random() * hues.length)];
      const sat = crit ? 95 : 92;
      const light = crit ? 60 + Math.random() * 15 : 55 + Math.random() * 10;
      arr.push({
        x: nx,
        y: ny,
        vx,
        vy,
        life: 0,
        maxLife,
        size,
        color: `hsl(${hue} ${sat}% ${light}%)`
      });
    }
  }, []);

  // Particle animation loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let last = performance.now();
    const run = () => {
      const now = performance.now();
      const dt = now - last; // ms
      last = now;

      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w * window.devicePixelRatio;
        canvas.height = h * window.devicePixelRatio;
        ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
      }

      ctx.clearRect(0, 0, w, h);
      const arr = particlesRef.current;
      for (let i = arr.length - 1; i >= 0; i--) {
        const p = arr[i];
        p.life += dt;
        const t = p.life / p.maxLife; // 0..1
        if (t >= 1) { arr.splice(i, 1); continue; }
        // simple motion
        p.x += (p.vx * dt) / 1000 / w; // convert px/s to normalized
        p.y += (p.vy * dt) / 1000 / h;
        // fade & scale
        const alpha = t < 0.7 ? 1 - t * 0.6 : Math.max(0, 1 - (t - 0.7) / 0.3);
        const size = p.size * (1 - t * 0.35);
        ctx.globalAlpha = alpha;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x * w, p.y * h, size, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      particleRafRef.current = requestAnimationFrame(run);
    };
    particleRafRef.current = requestAnimationFrame(run);
    return () => cancelAnimationFrame(particleRafRef.current);
  }, []);

  // Web Audio
  const audioCtxRef = useRef<AudioContext | null>(null);
  // (Removed timer ring progress; using HP bars now)

  // Reduced motion preference
  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReducedMotion(mq.matches);
    const onChange = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    mq.addEventListener?.("change", onChange);
    return () => mq.removeEventListener?.("change", onChange);
  }, []);

  // Ensure/resume AudioContext on user gesture
  const ensureAudio = useCallback(async () => {
    if (!soundOn) return;
    if (typeof window === "undefined") return;
    if (!audioCtxRef.current) {
      const _win = window as typeof window & { webkitAudioContext?: typeof AudioContext };
      const Ctx = window.AudioContext || _win.webkitAudioContext;
      if (Ctx) {
        audioCtxRef.current = new Ctx();
      }
    }
    if (audioCtxRef.current && audioCtxRef.current.state === "suspended") {
      try {
        await audioCtxRef.current.resume();
      } catch {}
    }
  }, [soundOn]);

  // Play tiny procedural SFX
  const sfx = useCallback(
  (type: "tap" | "crit" | "tick" | "win" | "lose" | "alert") => {
      if (!soundOn) return;
      const ctx = audioCtxRef.current;
      if (!ctx) return;

      const now = ctx.currentTime;

      const make = (freq: number, dur = 0.06, type: OscillatorType = "sine", gain = 0.12) => {
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.type = type;
        o.frequency.setValueAtTime(freq, now);
        g.gain.setValueAtTime(0, now);
        g.gain.linearRampToValueAtTime(gain, now + 0.005);
        g.gain.exponentialRampToValueAtTime(0.0001, now + dur);
        o.connect(g).connect(ctx.destination);
        o.start(now);
        o.stop(now + dur + 0.01);
      };

      switch (type) {
        case "tap": {
          // Soft, quick pop (downward sweep)
          make(520, 0.05, "sine", 0.10);
          make(200, 0.05, "triangle", 0.06);
          break;
        }
        case "crit": {
          // Brighter blip + short double
          make(880, 0.06, "triangle", 0.14);
          setTimeout(() => make(660, 0.05, "sine", 0.08), 30);
          break;
        }
        case "tick": {
          // Subtle tick each second
          make(320, 0.035, "square", 0.06);
          break;
        }
        case "win": {
          // Tiny ascending arpeggio
          make(523.25, 0.09, "sine", 0.12); // C5
          setTimeout(() => make(659.25, 0.09, "sine", 0.12), 110); // E5
          setTimeout(() => make(783.99, 0.12, "sine", 0.12), 220); // G5
          break;
        }
        case "lose": {
          // Short downward wah
          make(240, 0.12, "sawtooth", 0.10);
          break;
        }
        case "alert": {
          // Pulsing low HP alert: two quick beeps
          make(440, 0.08, "sine", 0.13);
          setTimeout(() => make(392, 0.10, "triangle", 0.11), 110);
          break;
        }
      }
    },
    [soundOn]
  );

  const vibrate = useCallback((pattern: number | number[]) => {
    if (typeof window === "undefined") return;
    const nav = navigator as Navigator & { vibrate?: (p: number | number[]) => boolean };
    if (typeof nav.vibrate === 'function') {
      try { nav.vibrate(pattern); } catch { /* noop */ }
    }
  }, []);

  // Player HP drain loop
  useEffect(() => {
    if (state !== "BATTLE") return;
    let raf = 0;
    let prev = performance.now();
    const loop = () => {
      const now = performance.now();
      const dt = (now - prev) / 1000; // seconds
      prev = now;

      setPlayerHp((prevHp) => {
        if (prevHp <= 0 || hp <= 0) return prevHp;
        const slowFactor = hasPowerUp('slow') ? 0.4 : 1; // slower drain
        const next = Math.max(0, prevHp - PLAYER_DRAIN_PER_SEC * dt * slowFactor);
        if (next === 0 && hp > 0) {
          if (hasPowerUp('shield')) {
            consumeShield();
            return Math.max(prevHp, PLAYER_STARTING_HP * 0.25); // restore some HP instead of losing
          } else {
            setState("RESULT");
            setWin(false);
            vibrate(20);
            sfx("lose");
          }
        }
        return next;
      });
      if (hp > 0 && state === "BATTLE") {
        raf = requestAnimationFrame(loop);
      }
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [state, hp, vibrate, sfx, hasPowerUp, consumeShield]);

  // Shake animation loop (separate so it persists across state small changes)
  const shakeAnimRef = useRef<number>(0);
  useEffect(() => {
    const run = () => {
      const now = performance.now();
      if (now >= shakeUntilRef.current) {
        if (shakeMag !== 0) setShakeMag(0);
      } else {
        // keep animating until deadline
      }
      shakeAnimRef.current = requestAnimationFrame(run);
    };
    shakeAnimRef.current = requestAnimationFrame(run);
    return () => cancelAnimationFrame(shakeAnimRef.current);
  }, [shakeMag]);

  // Screen pulse at low HP thresholds
  useEffect(() => {
    if (state !== "BATTLE") return;
    if (hp === Math.floor(STARTING_HP * 0.25) || hp === Math.floor(STARTING_HP * 0.1)) {
      setFlash(true);
      const t = setTimeout(() => setFlash(false), 140);
      return () => clearTimeout(t);
    }
  }, [hp, state]);

  const reset = useCallback(() => {
  setHp(STARTING_HP);
  setPlayerHp(PLAYER_STARTING_HP);
    setTaps(0);
    setCrits(0);
    setWin(null);
    setCelebrate(false);
    setState("READY");
  }, []);

  const start = useCallback(async () => {
    await ensureAudio(); // prime/resume audio on user action
    // Try fullscreen (graceful fail) for immersion
    const el: HTMLElement | null = document.documentElement;
    const reqFs = (el as HTMLElement & { requestFullscreen?: () => Promise<void> }).requestFullscreen;
    if (el && typeof reqFs === 'function') {
      try { await reqFs.call(el); } catch { /* ignore */ }
    }
  setHp(STARTING_HP);
  setPlayerHp(PLAYER_STARTING_HP);
    setTaps(0);
    setCrits(0);
    setWin(null);
    setCelebrate(false);
    setState("BATTLE");
  }, [ensureAudio]);

  const onTap = useCallback(async (ev?: React.PointerEvent | React.MouseEvent | React.TouchEvent) => {
    if (state !== "BATTLE") return;
    await ensureAudio();

    const now = performance.now();
    // 100ms bucket
    const bucketKey = Math.floor(now / 100);
    if (bucket100Ref.current.key !== bucketKey) {
      bucket100Ref.current.key = bucketKey;
      bucket100Ref.current.count = 0;
    }
    bucket100Ref.current.count++;
    if (bucket100Ref.current.count > MAX_TAPS_PER_100MS_BUCKET) return;

    // per-second bucket
    const secKey = Math.floor(now / 1000);
    if (perSecRef.current.key !== secKey) {
      perSecRef.current.key = secKey;
      perSecRef.current.count = 0;
    }
    perSecRef.current.count++;
    if (perSecRef.current.count > MAX_TAPS_PER_SECOND) return;

    // Ignore if already done
  if (hp <= 0 || playerHp <= 0) return;

    const isCrit = Math.random() < CRIT_CHANCE;
    let dmg = isCrit ? CRIT_DAMAGE : TAP_DAMAGE;
    if (hasPowerUp('double')) {
      dmg *= isCrit ? 1.8 : 1.4; // scale damage modestly
    }

    setTaps((t) => t + 1);
    if (isCrit) setCrits((c) => c + 1);

    setHp((prev) => {
      const next = Math.max(0, prev - dmg);
      if (!reducedMotion) setShakeKey((k) => k + 1);
      // tap-level shake (low amplitude)
      if (!reducedMotion) {
        if (isCrit) triggerShake(7, 200); else triggerShake(4, 140);
      }

      if (next === 0) {
        setState("RESULT");
        setWin(true);
        setCelebrate(true);
        vibrate([30, 60, 30]);
        sfx("win");
        if (!reducedMotion) triggerShake(14, 480);
        setTimeout(() => setCelebrate(false), 900);
      } else {
        sfx(isCrit ? "crit" : "tap");
        if (!reducedMotion) vibrate(isCrit ? [8, 12, 8] : 8);
      }
      return next;
    });

    // Particle origin (normalized inside crab button)
    if (crabButtonRef.current) {
      const rect = crabButtonRef.current.getBoundingClientRect();
      let clientX: number | undefined; let clientY: number | undefined;
      // Try multiple event coordinate sources
      if (ev) {
        // @ts-expect-error unify touch
        const t = ev.touches?.[0];
        if (t) { clientX = t.clientX; clientY = t.clientY; }
        // @ts-expect-error pointer/mouse
        if (ev.clientX != null) { clientX = ev.clientX; clientY = ev.clientY; }
      }
      if (clientX == null || clientY == null) {
        clientX = rect.left + rect.width / 2;
        clientY = rect.top + rect.height / 2;
      }
      const nx = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
      const ny = Math.min(1, Math.max(0, (clientY - rect.top) / rect.height));
      spawnParticles(nx, ny, isCrit);
    }
  }, [state, hp, playerHp, reducedMotion, vibrate, ensureAudio, sfx, spawnParticles, triggerShake, hasPowerUp]);

  const lowHp = hp > 0 && hp <= STARTING_HP * 0.25;
  const percent = (STARTING_HP - hp) / STARTING_HP;
  const grade = hp <= 0 ? "S" : percent >= 0.75 ? "A" : percent >= 0.5 ? "B" : "C";
  const crabHpPct = hp / STARTING_HP;
  const playerHpPct = playerHp / PLAYER_STARTING_HP;

  // Low HP sound cue (once per battle per entity)
  const crabLowPlayedRef = useRef(false);
  const playerLowPlayedRef = useRef(false);
  useEffect(() => {
    if (state !== 'BATTLE') {
      crabLowPlayedRef.current = false;
      playerLowPlayedRef.current = false;
      return;
    }
    if (!crabLowPlayedRef.current && crabHpPct < 0.3 && hp > 0) {
      sfx('alert');
      crabLowPlayedRef.current = true;
    }
    if (!playerLowPlayedRef.current && playerHpPct < 0.3 && playerHp > 0) {
      sfx('alert');
      playerLowPlayedRef.current = true;
    }
  }, [state, crabHpPct, playerHpPct, hp, playerHp, sfx]);

  // Track player HP drops to trigger damage flash (rate-limited)
  const lastDamageFlashRef = useRef<number>(0);
  const prevPlayerHpRef = useRef<number>(playerHp);
  useEffect(() => {
    if (state === 'BATTLE' && playerHp < prevPlayerHpRef.current) {
      const now = performance.now();
      if (now - lastDamageFlashRef.current > 420) { // rate limit ~0.4s
        lastDamageFlashRef.current = now;
        setDamageFlash(true);
        setTimeout(() => setDamageFlash(false), 160);
      }
    }
    prevPlayerHpRef.current = playerHp;
  }, [playerHp, state]);

  return (
    <main className="min-h-dvh w-full relative overflow-hidden bg-[radial-gradient(1200px_600px_at_70%_-10%,rgba(255,200,150,0.35),transparent),radial-gradient(800px_400px_at_10%_90%,rgba(56,189,248,0.25),transparent)] dark:bg-[radial-gradient(1200px_600px_at_70%_-10%,rgba(251,146,60,0.25),transparent),radial-gradient(800px_400px_at_10%_90%,rgba(59,130,246,0.2),transparent)]">
      {/* Floating bubbles */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {Array.from({ length: 12 }).map((_, i) => (
          <span
            key={i}
            className="absolute -bottom-10 left-1/2 rounded-full opacity-30 animate-bubble"
            style={{
              width: 8 + ((i * 13) % 18),
              height: 8 + ((i * 13) % 18),
              transform: `translateX(${(i - 6) * 48}px)`,
              animationDelay: `${(i % 6) * 0.6}s`,
            }}
          />
        ))}
      </div>

      {/* Gentle waves at the bottom */}
      <div className="pointer-events-none absolute bottom-0 left-0 right-0">
        <WaveSVG />
      </div>

      {/* Content container */}
      <div className="relative z-10 flex min-h-dvh items-center justify-center p-4 sm:p-6">
        <div className="w-full max-w-2xl">
          {/* Header + Controls (hidden during battle for immersion) */}
          {state !== "BATTLE" && (
            <div className="mb-4 flex items-center justify-between">
              <div className="text-center flex-1">
                <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight drop-shadow-sm">
                  King Crab <span className="text-amber-500">Quick Battle</span>
                </h1>
                <p className="mt-1 text-xs sm:text-sm text-gray-700 dark:text-gray-300">
                  Tap to defeat in <strong>30s</strong>. Crits deal extra damage. Good rhythm wins. 🦀
                </p>
              </div>
              <button
                aria-label={soundOn ? "Sound on" : "Sound off"}
                onClick={async () => {
                  if (!soundOn) {
                    setSoundOn(true);
                    await ensureAudio();
                  } else {
                    setSoundOn(false);
                  }
                }}
                className={`ml-3 rounded-full p-2 ring-1 ring-black/5 dark:ring-white/10 shadow-sm 
                ${soundOn ? "bg-emerald-500 text-white" : "bg-white/70 dark:bg-white/10 text-gray-700 dark:text-gray-200"}`}
                title={soundOn ? "Sound on" : "Sound off"}
              >
                {soundOn ? "🔊" : "🔇"}
              </button>
            </div>
          )}

          {/* Status (hidden during battle; BATTLE shows inline bars instead) */}
          {state !== 'BATTLE' && (
            <div className="mb-4 grid grid-cols-3 gap-3">
              <InfoPill label="Crab HP" value={hp.toString()} emphasize={lowHp} />
              <InfoPill label="Player HP" value={Math.ceil(playerHp).toString()} />
              <InfoPill label="Grade" value={grade} />
            </div>
          )}

          {/* Arena */}
          <div
            className={`relative rounded-[28px] p-2 sm:p-4 shadow-2xl ring-1 ring-black/5 dark:ring-white/10 backdrop-blur-md 
            bg-white/70 dark:bg-white/5 ${flash ? "animate-[pulse_0.14s_ease]" : ""} 
            ${state === 'BATTLE' ? 'fixed inset-0 m-0 rounded-none z-20 flex items-center justify-center p-0 sm:p-0' : ''}`}
            style={shakeMag ? { transform: `translate(${(Math.random()*2-1)*shakeMag}px, ${(Math.random()*2-1)*shakeMag}px)` } : undefined}
          >
            {/* Glow border */}
            <div className="pointer-events-none absolute inset-0 rounded-[28px] border border-transparent [mask:linear-gradient(#000,transparent)]">
              <div className="absolute inset-0 rounded-[28px] blur-xl opacity-60 bg-gradient-to-r from-amber-400/40 via-pink-400/30 to-sky-400/40" />
            </div>

            <div className={`relative mx-auto aspect-square ${state === 'BATTLE' ? 'w-[min(100vh,100vw)] max-w-none' : 'max-w-[520px]'}`}>
              {/* (Removed inline HUD bars; repositioned to fixed top/bottom) */}

              {/* Celebration burst */}
              {celebrate && !reducedMotion && (
                <div className="pointer-events-none absolute inset-0 grid place-items-center">
                  <div className="size-40 rounded-full animate-burst bg-amber-400/30" />
                </div>
              )}

              {/* Particle canvas (behind interactive content) */}
              <canvas
                ref={canvasRef}
                className="absolute inset-8 sm:inset-10 rounded-full pointer-events-none"
                aria-hidden
              />

              {/* Tap target */}
              <button
                ref={crabButtonRef}
                onClick={onTap}
                onPointerDown={onTap}
                onTouchStart={(e) => onTap(e)}
                aria-label="Tap the King Crab"
                className={`absolute inset-8 sm:inset-10 rounded-full select-none focus:outline-none focus-visible:ring-4 focus-visible:ring-amber-400/60 ${
                  state === "BATTLE" ? "cursor-pointer" : "cursor-default"
                }`}
                disabled={state !== "BATTLE"}
              >
                <div
                  key={shakeKey}
                  className={`size-full rounded-full grid place-items-center transition-transform ${
                    reducedMotion ? "" : "animate-[pop_0.09s_ease]"
                  }`}
                  style={{
                    background:
                      "radial-gradient(ellipse at 50% 40%, rgba(255,255,255,0.75), rgba(255,200,150,0.28))",
                  }}
                >
                  <CrabSVG
                    className="w-[70%] h-[70%] drop-shadow-[0_18px_30px_rgba(0,0,0,0.25)]"
                    lowHp={lowHp}
                  />
                </div>
              </button>
            </div>

            {/* Overlays */}
            {state === "READY" && (
              <Overlay>
                <h2 className="text-xl sm:text-2xl font-extrabold mb-2">King Crab Challenge</h2>
                <p className="text-sm sm:text-base text-gray-700 dark:text-gray-200 mb-4">
                  Beat the timer. Land some crits. Claim the shell-glory.
                </p>
                <div className="flex flex-wrap items-center justify-center gap-3">
                  <button
                    onClick={start}
                    className="px-5 py-2.5 rounded-full bg-amber-500 text-white font-semibold shadow hover:brightness-105 active:scale-[0.98]"
                  >
                    Tap to Begin
                  </button>
                  <div className="flex gap-1">
                    <button onClick={() => addPowerUp('slow')} className="px-2 py-1 text-[10px] rounded bg-blue-500 text-white">Slow</button>
                    <button onClick={() => addPowerUp('double')} className="px-2 py-1 text-[10px] rounded bg-fuchsia-500 text-white">Double</button>
                    <button onClick={() => addPowerUp('shield')} className="px-2 py-1 text-[10px] rounded bg-emerald-600 text-white">Shield</button>
                  </div>
                  <label className="flex items-center gap-2 text-xs sm:text-sm text-gray-700 dark:text-gray-200">
                    <input
                      type="checkbox"
                      checked={reducedMotion}
                      onChange={(e) => setReducedMotion(e.target.checked)}
                      className="accent-amber-500"
                    />
                    Reduced motion
                  </label>
                  <button
                    onClick={async () => {
                      setSoundOn((v) => !v);
                      await ensureAudio();
                    }}
                    className={`px-3 py-1.5 rounded-full text-xs ring-1 ring-black/5 dark:ring-white/10 shadow-sm ${
                      soundOn ? "bg-emerald-500 text-white" : "bg-white/80 dark:bg-white/10 text-gray-800 dark:text-gray-200"
                    }`}
                  >
                    {soundOn ? "Sound: On" : "Sound: Off"}
                  </button>
                </div>
              </Overlay>
            )}

            {state === "RESULT" && (
              <Overlay>
                <div className="mb-1">
                  <span
                    className={`inline-flex items-center justify-center rounded-full px-3 py-1 text-sm font-bold ${
                      win ? "bg-green-500/20 text-green-700 dark:text-green-300" : "bg-red-500/20 text-red-700 dark:text-red-300"
                    }`}
                  >
                    {win ? "VICTORY" : "PINCHED"}
                  </span>
                </div>
                <h2 className="text-2xl sm:text-3xl font-extrabold mb-2">
                  {win ? "You cracked the crab!" : "So close… try a new rhythm"}
                </h2>
                <p className="text-sm sm:text-base text-gray-700 dark:text-gray-200 mb-5">
                  Taps: {taps} · Crits: {crits} · Grade: {grade}
                </p>
                <div className="flex flex-wrap items-center justify-center gap-3">
                  <button
                    onClick={start}
                    className="px-5 py-2.5 rounded-full bg-amber-500 text-white font-semibold shadow hover:brightness-105 active:scale-[0.98]"
                  >
                    Play Again
                  </button>
                  <button
                    onClick={reset}
                    className="px-5 py-2.5 rounded-full bg-white/80 dark:bg-white/10 border border-black/10 dark:border-white/10 text-gray-800 dark:text-gray-100 font-semibold shadow hover:brightness-105 active:scale-[0.98]"
                  >
                    Back
                  </button>
                </div>
              </Overlay>
            )}
          </div>

          {/* Footer note */}
          <p className="mt-4 text-center text-xs sm:text-sm text-gray-600 dark:text-gray-300">
            Rewards coming soon. This build tests timing, rhythm, and juice. 🫶
          </p>
        </div>
      </div>

      {/* Page-scoped styles */}
      <style jsx global>{`
        @keyframes pop { from { transform: translateZ(0) scale(1) } to { transform: translateZ(0) scale(1.02) } }
        @keyframes bubble {
          0%   { transform: translateY(0) translateX(var(--dx, 0px)); opacity: 0.0 }
          10%  { opacity: 0.35 }
          100% { transform: translateY(-110vh) translateX(calc(var(--dx, 0px) + 40px)); opacity: 0 }
        }
        .animate-bubble {
          background: radial-gradient(circle at 30% 30%, rgba(255,255,255,.6), rgba(255,255,255,.15));
          animation: bubble 10s linear infinite;
        }
        @keyframes burst {
          0% { transform: scale(0.4); opacity: 0.0 }
          60% { transform: scale(1.05); opacity: 0.8 }
          100% { transform: scale(1.2); opacity: 0 }
        }
        .animate-burst { animation: burst 0.9s ease forwards; }
        @keyframes hpFlash { 0%, 100% { opacity: 1 } 50% { opacity: .35 } }
        .hp-bar-critical { animation: hpFlash 0.7s linear infinite; }
        @keyframes damageFlash { 0% { background: rgba(239,68,68,0); } 25% { background: rgba(239,68,68,0.35); } 100% { background: rgba(239,68,68,0); } }
        .animate-damageFlash { animation: damageFlash 0.18s ease; }
      `}</style>

      {/* Fixed HUD Bars (top/bottom) */}
      {state === 'BATTLE' && (
        <>
          <div className="fixed top-2 left-1/2 -translate-x-1/2 w-full max-w-2xl px-4 z-40 select-none">
            <BattleHpBar label="CRAB" pct={crabHpPct} />
            {powerUps.length > 0 && (
              <div className="flex gap-2 flex-wrap pt-2">
                {powerUps.filter(p => p.key === 'shield' || p.expiresAt > performance.now()).map(p => {
                  const remaining = p.key === 'shield' ? 0 : Math.ceil((p.expiresAt - performance.now()) / 1000);
                  const label = p.key === 'slow' ? 'Slow' : p.key === 'double' ? 'Double' : 'Shield';
                  const color = p.key === 'slow' ? 'bg-blue-500/80' : p.key === 'double' ? 'bg-fuchsia-500/80' : 'bg-emerald-600/80';
                  return (
                    <span key={p.key} className={`text-[10px] tracking-wide font-semibold px-2 py-1 rounded-full text-white backdrop-blur ${color}`}>
                      {label}{p.key !== 'shield' && <span className="ml-1 opacity-80">{remaining}s</span>}
                    </span>
                  );
                })}
              </div>
            )}
          </div>
          <div className="fixed bottom-2 left-1/2 -translate-x-1/2 w-full max-w-2xl px-4 z-40 select-none">
            <BattleHpBar label="YOU" pct={playerHpPct} />
          </div>
          {/* Damage flash overlay */}
          <div className={`pointer-events-none fixed inset-0 z-30 ${damageFlash ? 'animate-damageFlash' : ''}`}></div>
        </>
      )}
    </main>
  );
}

/* ---------- Small components ---------- */

function InfoPill({ label, value, emphasize }: { label: string; value: string; emphasize?: boolean }) {
  return (
    <div
      className={`rounded-2xl px-3 py-2 text-center ring-1 ring-black/5 dark:ring-white/10 backdrop-blur 
      ${emphasize ? "bg-red-50/80 dark:bg-red-900/20" : "bg-white/70 dark:bg-white/5"}`}
    >
      <div className="text-[10px] uppercase tracking-wide text-gray-600 dark:text-gray-300">{label}</div>
      <div className={`text-lg font-bold tabular-nums ${emphasize ? "text-red-600 dark:text-red-300" : ""}`}>{value}</div>
    </div>
  );
}

// Legacy HpBar kept for reference (unused now)
// function HpBar(...) {}

function BattleHpBar({ label, pct }: { label: string; pct: number }) {
  const clamped = Math.max(0, Math.min(1, pct));
  let color = 'bg-green-500';
  let gradient = 'from-green-500 to-green-400';
  if (clamped < 0.6 && clamped >= 0.3) {
    color = 'bg-yellow-400';
    gradient = 'from-yellow-400 to-yellow-300';
  } else if (clamped < 0.3) {
    color = 'bg-red-600';
    gradient = 'from-red-600 to-red-500';
  }
  const critical = clamped < 0.3;
  return (
    <div className="w-full">
      <div className="flex justify-between mb-1 text-[11px] font-semibold tracking-wide text-white drop-shadow">
        <span>{label}</span>
        <span>{Math.ceil(clamped * 100)}%</span>
      </div>
      <div className="h-4 w-full rounded-full bg-black/40 overflow-hidden ring-1 ring-white/10 backdrop-blur-sm">
        <div
          className={`h-full ${critical ? 'hp-bar-critical' : 'transition-[width] duration-150'} ${color} bg-gradient-to-r ${gradient}`}
          style={{ width: `${clamped * 100}%` }}
        />
      </div>
    </div>
  );
}

function Overlay({ children }: { children: React.ReactNode }) {
  return (
    <div className="absolute inset-0 rounded-[28px] bg-gradient-to-b from-white/85 to-white/55 dark:from-black/70 dark:to-black/50 backdrop-blur-md grid place-items-center text-center p-6">
      <div className="max-w-md">{children}</div>
    </div>
  );
}

function WaveSVG() {
  return (
    <svg viewBox="0 0 1440 200" className="w-full h-[120px] sm:h-[160px]" aria-hidden>
      <path
        fill="url(#waveGrad)"
        d="M0,160 C240,120 360,160 480,160 C600,160 720,120 840,120 C960,120 1200,160 1440,120 L1440,200 L0,200 Z"
        opacity="0.5"
      />
      <defs>
        <linearGradient id="waveGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#bae6fd" />
          <stop offset="100%" stopColor="#fde68a" />
        </linearGradient>
      </defs>
    </svg>
  );
}

function CrabSVG({ className, lowHp }: { className?: string; lowHp?: boolean }) {
  // Inline SVG crab (no external assets)
  const shell = lowHp ? "#ef4444" : "#f97316"; // red-500 vs orange-500
  const claw = lowHp ? "#b91c1c" : "#c2410c";
  const eye = "#111827";

  return (
    <svg viewBox="0 0 256 256" className={className} aria-hidden>
      {/* Shadow */}
      <ellipse cx="128" cy="200" rx="70" ry="16" fill="rgba(0,0,0,0.12)" />
      {/* Body */}
      <ellipse cx="128" cy="120" rx="70" ry="45" fill={shell} />
      {/* Dots on shell */}
      <circle cx="110" cy="110" r="4" fill="rgba(255,255,255,0.55)" />
      <circle cx="146" cy="116" r="3" fill="rgba(255,255,255,0.55)" />
      <circle cx="128" cy="128" r="2.5" fill="rgba(255,255,255,0.55)" />
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
