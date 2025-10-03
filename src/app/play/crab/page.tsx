"use client";

import { useEffect, useMemo, useRef, useState } from "react";

// ───────────────────────────────────────────────────────────────────────────────
// TUNABLES
// ───────────────────────────────────────────────────────────────────────────────
const BOSS_MAX = 100;
const PLAYER_MAX = 100;                       // timer total
const TIMER_DRAIN_PER_SEC = 12;               // player HP lost per second
const BLOCK_DURATION_MS = 1200;               // how long the block pauses timer
const BLOCK_COOLDOWN_MS = 900;                // after block ends, brief cooldown
const BASE_DAMAGE = { crown: 18, eyes: 14, body: 10, claws: 0, legs: 6 } as const;

type Part = keyof typeof BASE_DAMAGE;

// ───────────────────────────────────────────────────────────────────────────────

export const dynamic = "force-static";

export default function Page() {
  // ===== SVGs (exactly your assets) =====
  const BG = useMemo(
    () => `
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
</svg>`.trim(),
    []
  );

  const CRAB = useMemo(
    () => `
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

  // ===== State =====
  const stageRef = useRef<HTMLDivElement>(null);
  const [bossHp, setBossHp] = useState(BOSS_MAX);
  const [playerHp, setPlayerHp] = useState(PLAYER_MAX);
  const [blocked, setBlocked] = useState(false);
  const [blockCd, setBlockCd] = useState(false);
  const blockTimer = useRef<number | null>(null);
  const cooldownTimer = useRef<number | null>(null);

  // drain player HP over time (timer) unless blocked or dead/won
  useEffect(() => {
    let raf: number;
    let last = performance.now();

    const tick = (t: number) => {
      const dt = (t - last) / 1000; // seconds
      last = t;
      const gameOver = bossHp <= 0 || playerHp <= 0;
      if (!blocked && !gameOver) {
        setPlayerHp((hp) => Math.max(0, hp - TIMER_DRAIN_PER_SEC * dt));
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [blocked, bossHp, playerHp]);

  // click handlers bound to SVG parts
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const crab = stage.querySelector("svg:nth-of-type(2)");
    if (!crab) return;

    const parts: Part[] = ["crown", "eyes", "body", "claws", "legs"];
  const handlers: Array<{ el: Element; fn: (ev: Event) => void }> = [];

    parts.forEach((p) => {
      const el = crab.querySelector(`#${p}`);
      if (!el) return;
      const fn = (ev: Event) => {
        const part = p;
        if (part === "claws") handleBlock();
        else handleDamage(part);
      };
      el.addEventListener("pointerdown", fn);
      handlers.push({ el, fn });
      (el as HTMLElement).style.touchAction = "manipulation";
    });

    return () => handlers.forEach(({ el, fn }) => el.removeEventListener("pointerdown", fn));
  }, []);

  const handleDamage = (part: Exclude<Part, "claws">) => {
    if (bossHp <= 0 || playerHp <= 0) return;
    const dmg = BASE_DAMAGE[part];
    setBossHp((h) => Math.max(0, h - dmg));
    flash(part);
  };

  const handleBlock = () => {
    if (blockCd || blocked) return;
    setBlocked(true);
    flash("claws");
    if (blockTimer.current) clearTimeout(blockTimer.current);
    if (cooldownTimer.current) clearTimeout(cooldownTimer.current);

    blockTimer.current = window.setTimeout(() => {
      setBlocked(false);
      setBlockCd(true);
      cooldownTimer.current = window.setTimeout(() => setBlockCd(false), BLOCK_COOLDOWN_MS);
    }, BLOCK_DURATION_MS);
  };

  const flash = (id: Part) => {
    const svg = stageRef.current?.querySelector("svg:nth-of-type(2)");
    const g = svg?.querySelector(`#${id}`);
    if (!g) return;
    g.classList.add("kc-hit");
    setTimeout(() => g.classList.remove("kc-hit"), 140);
  };

  const bossPct = (bossHp / BOSS_MAX) * 100;
  const playerPct = (playerHp / PLAYER_MAX) * 100;
  const gameOver = bossHp <= 0 || playerHp <= 0;

  return (
    <main className="min-h-dvh grid place-items-center bg-black text-white">
      <div
        id="kingcrab-stage"
        ref={stageRef}
        className="relative w-full max-w-5xl aspect-[16/9] overflow-hidden rounded-2xl ring-1 ring-white/10 bg-black select-none"
      >
        {/* Background */}
        <div
          className="absolute inset-0"
          dangerouslySetInnerHTML={{
            __html: BG.replace('<svg ', '<svg preserveAspectRatio="xMidYMid slice" '),
          }}
        />

        {/* Boss crab */}
        <div className="absolute inset-0 grid place-items-center">
          <div
            className="w-[62%] max-w-[780px]"
            dangerouslySetInnerHTML={{ __html: CRAB }}
          />
        </div>

        {/* TOP: Boss HP */}
        <div className="absolute top-4 left-4 right-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-2 w-56 bg-white/10 rounded-full overflow-hidden">
              <div
                className="h-full bg-red-500 transition-[width] duration-150"
                style={{ width: `${bossPct}%` }}
              />
            </div>
            <span className="text-xs uppercase tracking-wide opacity-80">King Crab</span>
          </div>
          <span className="text-xs font-mono opacity-75">
            {Math.ceil(bossHp)}/{BOSS_MAX}
          </span>
        </div>

        {/* BOTTOM: Player HP (timer) */}
        <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-2 w-56 bg-white/10 rounded-full overflow-hidden">
              <div
                className={`h-full transition-[width] duration-150 ${
                  blocked ? "bg-emerald-400" : "bg-sky-400"
                }`}
                style={{ width: `${playerPct}%` }}
              />
            </div>
            <span className="text-xs uppercase tracking-wide opacity-80">
              {blocked ? "Blocking…" : "Stamina"}
            </span>
          </div>
          <span className="text-xs font-mono opacity-75">
            {Math.ceil(playerHp)}/{PLAYER_MAX}
          </span>
        </div>

        {/* Block badge / cooldown */}
        <div className="absolute bottom-12 right-4">
          <div
            className={`px-2 py-1 rounded text-xs font-semibold ${
              blocked ? "bg-emerald-500/20 text-emerald-300" : blockCd ? "bg-yellow-500/10 text-yellow-300" : "bg-white/10 text-white/80"
            }`}
          >
            {blocked ? "BLOCK ACTIVE" : blockCd ? "Cooldown…" : "Tap claws to BLOCK"}
          </div>
        </div>

        {/* Result banner */}
        {gameOver && (
          <div className="absolute inset-0 grid place-items-center bg-black/40 backdrop-blur-[2px]">
            <div className="px-6 py-4 rounded-xl bg-neutral-900/90 ring-1 ring-white/10">
              <div className="text-xl font-bold text-center">
                {bossHp <= 0 ? "You Win! 🦀" : "Defeated… 😵"}
              </div>
              <div className="text-xs opacity-75 mt-2 text-center">Tap to restart</div>
            </div>
          </div>
        )}
      </div>

      {/* Animations */}
      <style jsx global>{`
        /* Original idle motions */
        #kingcrab-stage svg #claws {
          transform-origin: 50% 70%;
          animation: kc-flex 1.1s ease-in-out infinite;
        }
        @keyframes kc-flex {
          0%, 100% { transform: rotate(0deg); }
          50% { transform: rotate(-3deg); }
        }
        #kingcrab-stage svg #eyes {
          animation: kc-pulse 1.2s ease-in-out infinite;
        }
        @keyframes kc-pulse {
          0%, 100% { filter: none; }
          50% { filter: drop-shadow(0 0 6px #ff4d3d); }
        }

        /* Hit flash */
        #kingcrab-stage svg .kc-hit,
        #kingcrab-stage svg g.kc-hit path,
        #kingcrab-stage svg g.kc-hit ellipse,
        #kingcrab-stage svg g.kc-hit rect {
          filter: drop-shadow(0 0 10px rgba(255,77,61,.85));
        }
      `}</style>
    </main>
  );
}
