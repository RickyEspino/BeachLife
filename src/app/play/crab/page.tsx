"use client";

import { useEffect, useMemo, useRef, useState } from "react";

const BOSS_MAX = 100;
const PLAYER_MAX = 100;
const TIMER_DRAIN_PER_SEC = 12;
const BLOCK_DURATION_MS = 1200;
const BLOCK_COOLDOWN_MS = 900;
const BASE_DAMAGE = { crown: 18, eyes: 14, body: 10, claws: 0, legs: 6 } as const;
type Part = keyof typeof BASE_DAMAGE;

export const dynamic = "force-static";

export default function Page() {
  const BG = useMemo(
    () => `...svg background...`.trim(), // keep your SVG
    []
  );

  const CRAB = useMemo(
    () => `...svg crab...`.trim(), // keep your SVG
    []
  );

  const stageRef = useRef<HTMLDivElement>(null);
  const [bossHp, setBossHp] = useState(BOSS_MAX);
  const [playerHp, setPlayerHp] = useState(PLAYER_MAX);
  const [blocked, setBlocked] = useState(false);
  const [blockCd, setBlockCd] = useState(false);
  const blockTimer = useRef<number | null>(null);
  const cooldownTimer = useRef<number | null>(null);

  // timer drain
  useEffect(() => {
    let raf: number;
    let last = performance.now();
    const tick = (t: number) => {
      const dt = (t - last) / 1000;
      last = t;
      if (!blocked && bossHp > 0 && playerHp > 0) {
        setPlayerHp((hp) => Math.max(0, hp - TIMER_DRAIN_PER_SEC * dt));
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [blocked, bossHp, playerHp]);

  // attach click listeners
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const crab = stage.querySelector("svg:nth-of-type(2)");
    if (!crab) return;
    const parts: Part[] = ["crown", "eyes", "body", "claws", "legs"];
  const handlers: Array<{ el: Element; fn: () => void }> = [];
    parts.forEach((p) => {
      const el = crab.querySelector(`#${p}`);
      if (!el) return;
      const fn = () => (p === "claws" ? handleBlock() : handleDamage(p as Exclude<Part, "claws">));
      el.addEventListener("pointerdown", fn);
      handlers.push({ el, fn });
    });
    return () => handlers.forEach(({ el, fn }) => el.removeEventListener("pointerdown", fn));
  }, []);

  const handleDamage = (part: Exclude<Part, "claws">) => {
    if (bossHp <= 0 || playerHp <= 0) return;
    setBossHp((h) => Math.max(0, h - BASE_DAMAGE[part]));
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
    <main className="min-h-[100svh] bg-black text-white">
      <div className="grid place-items-center w-full h-full">
        <div
          id="kingcrab-stage"
          ref={stageRef}
          className="relative bg-black select-none ring-1 ring-white/10 overflow-hidden w-screen h-[100svh] md:w-full md:max-w-5xl md:h-auto md:aspect-[16/9] rounded-none md:rounded-2xl"
        >
          {/* Background */}
          <div
            className="absolute inset-0"
            dangerouslySetInnerHTML={{
              __html: BG.replace('<svg ', '<svg preserveAspectRatio="xMidYMid slice" '),
            }}
          />

          {/* Mist overlay */}
          <div className="mist pointer-events-none absolute inset-0" />

          {/* Boss Crab */}
          <div className="absolute inset-0 grid place-items-center">
            <div
              className="w-[62%] max-w-[780px]"
              dangerouslySetInnerHTML={{ __html: CRAB }}
            />
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

          {/* BOTTOM: Player HP */}
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
      </div>

      {/* Animations (same as before) */}
      <style jsx global>{`
        #kingcrab-stage svg:nth-of-type(2) #claws {
          transform-origin: 50% 70%;
          animation: kc-flex 1.1s ease-in-out infinite;
        }
        @keyframes kc-flex { 0%,100%{transform:rotate(0)}50%{transform:rotate(-3deg)} }
        #kingcrab-stage svg:nth-of-type(2) #eyes {
          animation: kc-pulse 1.2s ease-in-out infinite;
        }
        @keyframes kc-pulse { 0%,100%{filter:none}50%{filter:drop-shadow(0 0 6px #ff4d3d)} }
        #kingcrab-stage svg .kc-hit { filter: drop-shadow(0 0 10px rgba(255,77,61,.85)); }
      `}</style>
    </main>
  );
}
