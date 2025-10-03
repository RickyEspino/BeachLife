"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

const BOSS_MAX = 100;
const PLAYER_MAX = 100;
const TIMER_DRAIN_PER_SEC = 12;
const BLOCK_DURATION_MS = 1200;
const BLOCK_COOLDOWN_MS = 900;
const BASE_DAMAGE = { crown: 18, eyes: 14, body: 10, claws: 0, legs: 6 } as const;
type Part = keyof typeof BASE_DAMAGE;

export const dynamic = "force-static";

export default function Page() {
  // ===== SVG STRINGS (your full SVGs) =====
  const BG = useMemo(
    () =>
      `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 288">
  <defs>
    <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#111418"/>
      <stop offset="100%" stop-color="#2c3235"/>
    </linearGradient>
    <linearGradient id="ocean" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#1a2c34"/>
      <stop offset="100%" stop-color="#0c181c"/>
    </linearGradient>
    <linearGradient id="shore" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#332e29"/>
      <stop offset="100%" stop-color="#1a1815"/>
    </linearGradient>
  </defs>
  <rect width="512" height="160" fill="url(#sky)" />
  <ellipse cx="180" cy="60" rx="120" ry="40" fill="#20262b" opacity="0.5"/>
  <ellipse cx="340" cy="50" rx="150" ry="60" fill="#1a1f22" opacity="0.6"/>
  <ellipse cx="260" cy="90" rx="180" ry="50" fill="#252a2f" opacity="0.4"/>
  <rect y="160" width="512" height="80" fill="url(#ocean)" />
  <path d="M0,200 Q40,180 80,200 T160,200 T240,200 T320,200 T400,200 T480,200 T560,200 V240 H0 Z" fill="#0f2026"/>
  <path d="M0,190 Q60,210 120,190 T240,190 T360,190 T480,190 T600,190 V240 H0 Z" fill="#123039" opacity="0.8"/>
  <path d="M0,210 Q50,230 100,210 T200,210 T300,210 T400,210 T500,210 T600,210 V240 H0 Z" fill="#0d1c21" opacity="0.6"/>
  <rect y="240" width="512" height="48" fill="url(#shore)" />
</svg>
`.trim(),
    []
  );

  const CRAB = useMemo(
    () =>
      `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <defs>
    <style>
      :root {
        --crab-base: #C73A29;
        --crab-dark: #7A1F16;
        --crab-light: #E55644;
        --crown: #E2B300;
        --crown-dark: #A47800;
        --eye: #111111;
        --glow: #FF4D3D;
        --outline: #1A0E0C;
      }
      .base { fill: var(--crab-base); }
      .dark { fill: var(--crab-dark); }
      .light { fill: var(--crab-light); }
      .crown { fill: var(--crown); }
      .crown-dark { fill: var(--crown-dark); }
      .eye { fill: var(--eye); }
      .glow { fill: var(--glow); }
      .stroke { stroke: var(--outline); stroke-width: 6; stroke-linejoin: round; stroke-linecap: round; }
      .no-stroke { stroke: none; }
      .shadow { opacity: .18; }
    </style>
    <filter id="innerGlow">
      <feGaussianBlur in="SourceGraphic" stdDeviation="2" result="blur"/>
      <feComposite in="blur" in2="SourceAlpha" operator="arithmetic" k2="-1" k3="2" result="inner"/>
      <feColorMatrix type="matrix"
        values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 1 0" />
    </filter>
  </defs>

  <ellipse cx="256" cy="450" rx="170" ry="28" class="shadow no-stroke"/>

  <g id="body" style="cursor:crosshair">
    <path class="base stroke" d="M96,250c0,-70 82,-120 160,-120s160,50 160,120c0,45 -35,85 -80,102l-18,7c-20,8 -42,12 -62,12s-42,-4 -62,-12l-18,-7c-45,-17 -80,-57 -80,-102z"/>
    <path class="dark stroke" d="M128,230l-26,-22 34,-10 18,-30 32,18 40,-34 40,34 32,-18 18,30 34,10 -26,22" />
    <path class="dark stroke" d="M156,290c24,-26 60,-38 100,-38s76,12 100,38c-14,34 -58,62 -100,62s-86,-28 -100,-62z"/>
    <path class="light no-stroke" opacity=".2" d="M120,256c0,-56 72,-98 136,-98 44,0 104,16 134,56 -40,-46 -110,-68 -170,-52 -66,18 -100,62 -100,94z"/>
  </g>

  <g id="eyes" style="cursor:crosshair">
    <g id="leftEye">
      <ellipse class="eye stroke" cx="196" cy="290" rx="20" ry="24"/>
      <circle class="glow no-stroke" cx="196" cy="298" r="10" filter="url(#innerGlow)"/>
      <circle fill="#FFFFFF" cx="204" cy="282" r="5"/>
    </g>
    <g id="rightEye">
      <ellipse class="eye stroke" cx="316" cy="290" rx="20" ry="24"/>
      <circle class="glow no-stroke" cx="316" cy="298" r="10" filter="url(#innerGlow)"/>
      <circle fill="#FFFFFF" cx="324" cy="282" r="5"/>
    </g>
    <path class="eye stroke" d="M214,330c28,-10 56,-10 84,0"/>
  </g>

  <g id="claws" style="cursor:crosshair">
    <path class="dark stroke" d="M96,308c-28,-4 -56,10 -66,32 28,10 64,0 88,-20" />
    <path class="base stroke" d="M92,320c-30,30 -40,62 -16,78 18,12 54,-8 82,-42 12,-14 22,-30 28,-46 -30,-12 -64,-10 -94,10z"/>
    <path class="base stroke" d="M160,300c-20,18 -20,46 -6,62 18,-10 36,-30 48,-50 -10,-16 26,-20 42,-12z"/>
    <path class="dark stroke" d="M148,362c10,8 28,8 40,-2 4,-18 -8,-30 -22,-30 -12,0 -20,12 -18,32z"/>
    <path class="dark stroke" d="M416,308c28,-4 56,10 66,32 -28,10 -64,0 -88,-20" />
    <path class="base stroke" d="M420,320c30,30 40,62 16,78 -18,12 -54,-8 -82,-42 -12,-14 -22,-30 -28,-46 30,-12 64,-10 94,10z"/>
    <path class="base stroke" d="M352,300c20,18 20,46 6,62 -18,-10 -36,-30 -48,-50 10,-16 26,-20 42,-12z"/>
    <path class="dark stroke" d="M364,362c-10,8 -28,8 -40,-2 -4,-18 8,-30 22,-30 12,0 20,12 18,32z"/>
  </g>

  <g id="legs" style="cursor:crosshair">
    <path class="dark stroke" d="M136,356l-30,40"/>
    <path class="dark stroke" d="M184,364l-16,48"/>
    <path class="dark stroke" d="M328,364l16,48"/>
    <path class="dark stroke" d="M376,356l30,40"/>
  </g>

  <g id="crown" transform="translate(0,-6)" style="cursor:crosshair">
    <path class="crown stroke" d="M202,194l-22,60h152l-22,-60 -32,26 -22,-36 -22,36 -32,-26z"/>
    <rect x="170" y="254" width="172" height="28" rx="8" class="crown-dark stroke"/>
  </g>
</svg>
`.trim(),
    []
  );

  // ===== REFS =====
  const stageRef = useRef<HTMLDivElement>(null);
  const bgRef = useRef<HTMLDivElement>(null);
  const crabRef = useRef<HTMLDivElement>(null);
  const thunderRef = useRef<HTMLAudioElement>(null);

  // ===== STATE =====
  const [bossHp, setBossHp] = useState(BOSS_MAX);
  const [playerHp, setPlayerHp] = useState(PLAYER_MAX);
  const [blocked, setBlocked] = useState(false);
  const [blockCd, setBlockCd] = useState(false);
  const [strikeOn, setStrikeOn] = useState(false);
  const [soundReady, setSoundReady] = useState(false);
  const [combatText, setCombatText] = useState<Array<{ id: number; text: string; type: 'hit' | 'crit' | 'combo' | 'block'; created: number }>>([]);
  const comboCountRef = useRef(0);
  const lastHitTimeRef = useRef<number>(0);
  const nextIdRef = useRef(1);

  // refs to avoid stale closures
  const bossHpRef = useRef(bossHp);
  const playerHpRef = useRef(playerHp);
  const blockedRef = useRef(blocked);
  const blockCdRef = useRef(blockCd);
  const blockTimer = useRef<number | null>(null);
  const cooldownTimer = useRef<number | null>(null);
  const strikeTimer = useRef<number | null>(null);

  // Mount SVGs once and apply sinister style overrides
  useEffect(() => {
    if (bgRef.current) {
      bgRef.current.innerHTML = BG.replace(
        "<svg ",
        '<svg preserveAspectRatio="xMidYMid slice" '
      );
    }
    if (crabRef.current) {
      crabRef.current.innerHTML = CRAB;

      const svg = crabRef.current.querySelector("svg") as SVGSVGElement | null;
      if (svg) {
        // Bigger SVG rendering
        svg.setAttribute("preserveAspectRatio", "xMidYMid meet");
        svg.style.width = "100%";
        svg.style.height = "auto";
        svg.style.maxWidth = "none";
        svg.style.overflow = "visible";

        // Sinister palette
        svg.style.setProperty("--crab-base", "#7b1510");
        svg.style.setProperty("--crab-dark", "#3a0a07");
        svg.style.setProperty("--crab-light", "#a52a1f");
        svg.style.setProperty("--eye", "#c10000");
        svg.style.setProperty("--glow", "#ff2b2b");

        // Sharper strokes, extra pop on claws
        const override = document.createElement("style");
        override.textContent = `
          .stroke { stroke-width: 7.5 !important; stroke-linejoin: miter !important; stroke-linecap: square !important; }
          #claws .stroke, #claws path { filter: drop-shadow(0 0 6px rgba(255,0,0,.3)); }
        `;
        svg.prepend(override);
      }
    }
  }, [BG, CRAB]);

  // keep refs in sync
  useEffect(() => { bossHpRef.current = bossHp; }, [bossHp]);
  useEffect(() => { playerHpRef.current = playerHp; }, [playerHp]);
  useEffect(() => { blockedRef.current = blocked; }, [blocked]);
  useEffect(() => { blockCdRef.current = blockCd; }, [blockCd]);

  // Timer-as-health drain
  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    const tick = (t: number) => {
      const dt = (t - last) / 1000;
      last = t;
      if (!blockedRef.current && bossHpRef.current > 0 && playerHpRef.current > 0) {
        setPlayerHp((hp) => Math.max(0, hp - TIMER_DRAIN_PER_SEC * dt));
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  // Unlock audio on first user gesture (for mobile autoplay policies)
  useEffect(() => {
    if (soundReady) return;
    const handler = () => {
      if (!soundReady) {
        // Attempt a silent play to satisfy gesture requirement
        const el = thunderRef.current;
        if (el) {
          try { el.play().then(() => { el.pause(); el.currentTime = 0; }).catch(() => {}); } catch {}
        }
        setSoundReady(true);
      }
    };
    window.addEventListener('pointerdown', handler, { once: true });
    return () => window.removeEventListener('pointerdown', handler);
  }, [soundReady]);

  // Lightning scheduler (6–14s) + thunder audio (gated by soundReady)
  useEffect(() => {
    let alive = true;
    const schedule = () => {
      const delay = 6000 + Math.random() * 8000;
      strikeTimer.current = window.setTimeout(() => {
        if (!alive) return;
        setStrikeOn(true);
        if (soundReady) {
          if (thunderRef.current?.currentTime) thunderRef.current.currentTime = 0;
          thunderRef.current?.play().catch(() => {});
        }
        window.setTimeout(() => setStrikeOn(false), 520);
        schedule();
      }, delay);
    };
    schedule();
    return () => { alive = false; if (strikeTimer.current) clearTimeout(strikeTimer.current); };
  }, [soundReady]);

  const flash = useCallback((id: Part) => {
    const svg = crabRef.current?.querySelector("svg");
    const g = svg?.querySelector(`#${id}`);
    if (!g) return;
    g.classList.add("kc-hit");
    setTimeout(() => g.classList.remove("kc-hit"), 140);
  }, []);

  const handleDamage = useCallback((part: Exclude<Part, "claws">) => {
    if (bossHpRef.current <= 0 || playerHpRef.current <= 0) return;
    const now = performance.now();
    // combo if within 900ms of last hit
    if (now - lastHitTimeRef.current < 900) {
      comboCountRef.current += 1;
    } else {
      comboCountRef.current = 1;
    }
    lastHitTimeRef.current = now;
    const base = BASE_DAMAGE[part];
    // simple crit: 20% chance
    const isCrit = Math.random() < 0.2;
    const dmg = isCrit ? Math.round(base * 1.6) : base;
    setBossHp((h) => Math.max(0, h - dmg));
    flash(part);
    // build combat text events
    const events: Array<{ text: string; type: 'hit' | 'crit' | 'combo' } > = [];
    if (isCrit) events.push({ text: `CRIT ${dmg}`, type: 'crit' });
    else events.push({ text: `${dmg}`, type: 'hit' });
    if (comboCountRef.current >= 3) {
      events.push({ text: `${comboCountRef.current}x Combo!`, type: 'combo' });
    }
    setCombatText((prev) => [
      ...prev,
      ...events.map(e => ({ id: nextIdRef.current++, text: e.text, type: e.type, created: Date.now() }))
    ]);
  }, [flash]);

  const handleBlock = useCallback(() => {
    if (blockCdRef.current || blockedRef.current) return;
    setBlocked(true);
    flash("claws");
    if (blockTimer.current) clearTimeout(blockTimer.current);
    if (cooldownTimer.current) clearTimeout(cooldownTimer.current);
    blockTimer.current = window.setTimeout(() => {
      setBlocked(false);
      setBlockCd(true);
      cooldownTimer.current = window.setTimeout(() => setBlockCd(false), BLOCK_COOLDOWN_MS);
    }, BLOCK_DURATION_MS);
    // show block text
    setCombatText(prev => [...prev, { id: nextIdRef.current++, text: 'BLOCK', type: 'block', created: Date.now() }]);
  }, [flash]);

  const restartGame = useCallback(() => {
    setBossHp(BOSS_MAX);
    setPlayerHp(PLAYER_MAX);
    setBlocked(false);
    setBlockCd(false);
  }, []);

  // Attach hit handlers
  useEffect(() => {
    const svg = crabRef.current?.querySelector("svg");
    if (!svg) return;
    const parts: Part[] = ["crown", "eyes", "body", "claws", "legs"];
    const handlers: Array<{ el: Element; fn: (e: Event) => void }> = [];
    parts.forEach((p) => {
      const el = svg.querySelector(`#${p}`);
      if (!el) return;
      const fn = () => (p === "claws" ? handleBlock() : handleDamage(p as Exclude<Part, "claws">));
      el.addEventListener("pointerdown", fn);
      handlers.push({ el, fn });
      (el as HTMLElement).style.touchAction = "manipulation";
    });
    return () => handlers.forEach(({ el, fn }) => el.removeEventListener("pointerdown", fn));
  }, [handleBlock, handleDamage]);

  const bossPct = (bossHp / BOSS_MAX) * 100;
  const playerPct = (playerHp / PLAYER_MAX) * 100;
  const gameOver = bossHp <= 0 || playerHp <= 0;

  // Cleanup old combat text ( >1100ms )
  useEffect(() => {
    if (!combatText.length) return;
    const now = Date.now();
    const stale = combatText.filter(e => now - e.created > 1100).length > 0;
    if (!stale) {
      const id = setTimeout(() => {
        const t = Date.now();
        setCombatText(prev => prev.filter(e => t - e.created <= 1100));
      }, 400);
      return () => clearTimeout(id);
    }
    setCombatText(prev => prev.filter(e => now - e.created <= 1100));
  }, [combatText]);

  return (
    <main className="fixed inset-0 bg-black text-white">
      <div className="w-full h-full">
        <div
          id="kingcrab-stage"
          ref={stageRef}
          className={`relative bg-black select-none ring-1 ring-white/10 overflow-hidden w-full h-full ${strikeOn ? "strike" : ""}`}
        >
          {/* Background */}
          <div ref={bgRef} id="bg" className="absolute inset-0" />

          {/* Mist overlay */}
          <div className="mist pointer-events-none absolute inset-0" />

          {/* Boss Crab (HUGE) */}
          <div className="absolute inset-0 grid place-items-center">
            <div ref={crabRef} id="crab" className="w-[120%] max-w-none translate-y-[2%]" />
          </div>

          {/* ⚡ Lightning overlay */}
          <div className={`lightning pointer-events-none absolute inset-0 ${strikeOn ? "on" : ""}`} />

          {/* Floating combat text */}
          <div className="pointer-events-none absolute inset-0 overflow-hidden">
            {combatText.map(evt => (
              <span
                key={evt.id}
                className={`absolute left-1/2 top-1/2 -translate-x-1/2 select-none font-bold text-xs sm:text-sm md:text-base combat-float opacity-0
                  ${evt.type === 'crit' ? 'text-amber-300 drop-shadow-[0_0_6px_rgba(255,191,71,0.6)]' : ''}
                  ${evt.type === 'hit' ? 'text-red-300 drop-shadow-[0_0_4px_rgba(255,60,60,0.5)]' : ''}
                  ${evt.type === 'combo' ? 'text-fuchsia-300 drop-shadow-[0_0_6px_rgba(255,0,200,0.5)]' : ''}
                  ${evt.type === 'block' ? 'text-emerald-300 drop-shadow-[0_0_6px_rgba(16,185,129,0.5)]' : ''}`}
                style={{
                  // slight random jitter
                  transform: `translate(-50%, -50%) translate(${(evt.id % 5 - 2) * 8}px, ${(evt.id % 7 - 3) * 4}px)`
                }}
              >{evt.text}</span>
            ))}
          </div>

          {/* TOP: Boss HP */}
          <div className="absolute top-4 left-0 right-0 px-4 flex items-center justify-between">
            <div className="flex items-center gap-3 flex-1">
              <div className="h-2 w-full bg-white/10 rounded-full overflow-hidden">
                <div
                  className="h-full bg-red-500 transition-[width] duration-150"
                  style={{ width: `${bossPct}%` }}
                />
              </div>
              <span className="ml-2 text-xs uppercase tracking-wide opacity-80 shrink-0">
                King Crab
              </span>
            </div>
            <span className="ml-3 text-xs font-mono opacity-75 shrink-0">
              {Math.ceil(bossHp)}/{BOSS_MAX}
            </span>
          </div>

          {/* BOTTOM: Player HP (timer) */}
          <div className="absolute bottom-4 left-0 right-0 px-4 flex items-center justify-between">
            <div className="flex items-center gap-3 flex-1">
              <div className="h-2 w-full bg-white/10 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-[width] duration-150 ${
                    blocked ? "bg-emerald-400" : "bg-sky-400"
                  }`}
                  style={{ width: `${playerPct}%` }}
                />
              </div>
              <span className="ml-2 text-xs uppercase tracking-wide opacity-80 shrink-0">
                {blocked ? "Blocking…" : "Stamina"}
              </span>
            </div>
            <span className="ml-3 text-xs font-mono opacity-75 shrink-0">
              {Math.ceil(playerHp)}/{PLAYER_MAX}
            </span>
          </div>

          {/* Block badge */}
          <div className="absolute bottom-12 right-4">
            <div
              className={`px-2 py-1 rounded text-xs font-semibold ${
                blocked
                  ? "bg-emerald-500/20 text-emerald-300"
                  : blockCd
                  ? "bg-yellow-500/10 text-yellow-300"
                  : "bg-white/10 text-white/80"
              }`}
            >
              {blocked ? "BLOCK ACTIVE" : blockCd ? "Cooldown…" : "Tap claws to BLOCK"}
            </div>
          </div>

          {/* Result */}
          {gameOver && (
            <button
              type="button"
              onClick={restartGame}
              className="absolute inset-0 grid place-items-center bg-black/40 backdrop-blur-[2px] focus:outline-none"
            >
              <div className="px-6 py-4 rounded-xl bg-neutral-900/90 ring-1 ring-white/10">
                <div className="text-xl font-bold text-center">
                  {bossHp <= 0 ? "You Win! 🦀" : "Defeated… 😵"}
                </div>
                <div className="text-xs opacity-75 mt-2 text-center">Tap to restart</div>
              </div>
            </button>
          )}

          {/* Thunder audio (optional) */}
          <audio ref={thunderRef} preload="auto" src="/sfx/thunder.mp3" aria-hidden="true" />
          {!soundReady && (
            <div className="pointer-events-none absolute inset-x-0 top-2 flex justify-center">
              <div className="px-3 py-1 rounded-full text-[10px] font-medium bg-white/10 backdrop-blur-sm border border-white/15 animate-pulse">
                Tap once to enable thunder
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Animations */}
      <style jsx global>{`
        /* Floating combat text animation */
        .combat-float { animation: combat-float 900ms ease-out forwards; }
        @keyframes combat-float {
          0% { opacity: 0; transform: translate(-50%, -50%) scale(0.6); }
          10% { opacity: 1; transform: translate(-50%, -60%) scale(1); }
          60% { opacity: 1; transform: translate(-50%, -90%) scale(1.05); }
          100% { opacity: 0; transform: translate(-50%, -130%) scale(1.1); }
        }
        /* Idle motions for crab */
        #crab svg #claws {
          transform-origin: 50% 70%;
          animation: kc-flex 1.1s ease-in-out infinite;
          will-change: transform;
        }
        @keyframes kc-flex { 0%,100% { transform: rotate(0deg); } 50% { transform: rotate(-3deg); } }
        #crab svg #eyes {
          animation: kc-pulse 1.2s ease-in-out infinite;
          will-change: filter;
        }
        @keyframes kc-pulse { 0%,100% { filter: none; } 50% { filter: drop-shadow(0 0 6px #ff2b2b); } }

        /* Background animation */
        #bg svg ellipse {
          transform-box: fill-box; transform-origin: 50% 50%;
          animation: cloud-drift 30s linear infinite;
        }
        #bg svg ellipse:nth-of-type(2){ animation-duration: 36s; opacity:.55; }
        #bg svg ellipse:nth-of-type(3){ animation-duration: 44s; opacity:.4; }
        @keyframes cloud-drift { 0%{transform:translateX(-6%)} 50%{transform:translateX(6%)} 100%{transform:translateX(-6%)} }

        #bg svg path:nth-of-type(1),
        #bg svg path:nth-of-type(2),
        #bg svg path:nth-of-type(3){
          transform-box: fill-box; transform-origin: 50% 50%;
          animation: wave-bob 4s ease-in-out infinite;
        }
        #bg svg path:nth-of-type(2){ animation-duration: 4.8s; animation-delay: .15s; }
        #bg svg path:nth-of-type(3){ animation-duration: 5.6s; animation-delay: .3s; }
        @keyframes wave-bob { 0%,100%{ transform: translateY(0) } 50%{ transform: translateY(3px) } }

        /* Mist overlay */
        .mist {
          background:
            radial-gradient(120% 60% at 50% 12%, rgba(255,255,255,0.03), transparent 60%),
            linear-gradient(to bottom, rgba(255,255,255,0.02), transparent 40%),
            radial-gradient(180% 80% at 50% 90%, rgba(255,255,255,0.015), transparent 60%);
          mix-blend-mode: screen;
          animation: mist-move 18s ease-in-out infinite;
          will-change: transform, opacity;
        }
        @keyframes mist-move {
          0%   { transform: translateX(-2%) translateY(0); opacity: .85; }
          50%  { transform: translateX(2%) translateY(-1%); opacity: .95; }
          100% { transform: translateX(-2%) translateY(0); opacity: .85; }
        }

        /* Hit flash */
        #crab svg .kc-hit,
        #crab svg g.kc-hit path,
        #crab svg g.kc-hit ellipse,
        #crab svg g.kc-hit rect {
          filter: drop-shadow(0 0 10px rgba(255,77,61,.85));
        }

        /* ⚡ Lightning overlay */
        .lightning {
          opacity: 0;
          background:
            radial-gradient(120% 80% at 50% 20%, rgba(255,255,255,0.22), rgba(255,255,255,0) 60%),
            linear-gradient(to bottom, rgba(255,255,255,0.12), rgba(255,255,255,0) 40%),
            radial-gradient(200% 100% at 50% 100%, rgba(255,255,255,0.08), rgba(255,255,255,0) 60%);
          mix-blend-mode: screen;
        }
        .lightning.on { animation: bolt 520ms ease-out both; }
        @keyframes bolt {
          0%   { opacity: 0; }
          5%   { opacity: 1; }   /* first flash */
          18%  { opacity: 0.12; }
          30%  { opacity: 0.85;} /* second flash */
          60%  { opacity: 0.0; }
          100% { opacity: 0; }
        }

        /* Scene reaction during lightning */
        .strike #bg svg { filter: brightness(1.25) contrast(1.1); }
        .strike #crab svg {
          filter: brightness(1.15) saturate(1.1) drop-shadow(0 0 18px rgba(255,255,255,0.25));
        }
        .strike #crab svg #eyes { filter: drop-shadow(0 0 12px #ff2b2b); }
      `}</style>
    </main>
  );
}
