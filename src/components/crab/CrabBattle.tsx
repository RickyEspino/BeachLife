"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

// Constants
const BOSS_MAX = 100;
const PLAYER_MAX = 100;
const TIMER_DRAIN_PER_SEC = 12;
const BLOCK_DURATION_MS = 1200;
const BLOCK_COOLDOWN_MS = 900;
const BASE_DAMAGE = { crown: 18, eyes: 14, body: 10, claws: 0, legs: 6 } as const;

type Part = keyof typeof BASE_DAMAGE;

export interface CrabBattleProps {
  className?: string;
  // Future customization hooks
  onFinish?: (result: {
    victory: boolean; duration: number; hits: number; crits: number; blocks: number; maxCombo: number; totalDamage: number; dps: number; runId?: number | null;
  }) => void;
}

export function CrabBattle({ className, onFinish }: CrabBattleProps) {
  // SVG templates memoized
  const BG = useMemo(() => `\n<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 512 288\">\n  <defs>\n    <linearGradient id=\"sky\" x1=\"0\" y1=\"0\" x2=\"0\" y2=\"1\">\n      <stop offset=\"0%\" stop-color=\"#111418\"/>\n      <stop offset=\"100%\" stop-color=\"#2c3235\"/>\n    </linearGradient>\n    <linearGradient id=\"ocean\" x1=\"0\" y1=\"0\" x2=\"0\" y2=\"1\">\n      <stop offset=\"0%\" stop-color=\"#1a2c34\"/>\n      <stop offset=\"100%\" stop-color=\"#0c181c\"/>\n    </linearGradient>\n    <linearGradient id=\"shore\" x1=\"0\" y1=\"0\" x2=\"0\" y2=\"1\">\n      <stop offset=\"0%\" stop-color=\"#332e29\"/>\n      <stop offset=\"100%\" stop-color=\"#1a1815\"/>\n    </linearGradient>\n  </defs>\n  <rect width=\"512\" height=\"160\" fill=\"url(#sky)\" />\n  <ellipse cx=\"180\" cy=\"60\" rx=\"120\" ry=\"40\" fill=\"#20262b\" opacity=\"0.5\"/>\n  <ellipse cx=\"340\" cy=\"50\" rx=\"150\" ry=\"60\" fill=\"#1a1f22\" opacity=\"0.6\"/>\n  <ellipse cx=\"260\" cy=\"90\" rx=\"180\" ry=\"50\" fill=\"#252a2f\" opacity=\"0.4\"/>\n  <rect y=\"160\" width=\"512\" height=\"80\" fill=\"url(#ocean)\" />\n  <path d=\"M0,200 Q40,180 80,200 T160,200 T240,200 T320,200 T400,200 T480,200 T560,200 V240 H0 Z\" fill=\"#0f2026\"/>\n  <path d=\"M0,190 Q60,210 120,190 T240,190 T360,190 T480,190 T600,190 V240 H0 Z\" fill=\"#123039\" opacity=\"0.8\"/>\n  <path d=\"M0,210 Q50,230 100,210 T200,210 T300,210 T400,210 T500,210 T600,210 V240 H0 Z\" fill=\"#0d1c21\" opacity=\"0.6\"/>\n  <rect y=\"240\" width=\"512\" height=\"48\" fill=\"url(#shore)\" />\n</svg>\n`.trim(), []);

  const CRAB = useMemo(() => `\n<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 512 512\">\n  <defs>\n    <style>\n      :root { --crab-base: #C73A29; --crab-dark: #7A1F16; --crab-light: #E55644; --crown: #E2B300; --crown-dark: #A47800; --eye: #111111; --glow: #FF4D3D; --outline: #1A0E0C; }\n      .base { fill: var(--crab-base); } .dark { fill: var(--crab-dark); } .light { fill: var(--crab-light); }\n      .crown { fill: var(--crown); } .crown-dark { fill: var(--crown-dark); } .eye { fill: var(--eye); } .glow { fill: var(--glow); }\n      .stroke { stroke: var(--outline); stroke-width: 6; stroke-linejoin: round; stroke-linecap: round; } .no-stroke { stroke: none; } .shadow { opacity: .18; }\n    </style>\n    <filter id=\"innerGlow\">\n      <feGaussianBlur in=\"SourceGraphic\" stdDeviation=\"2\" result=\"blur\"/>\n      <feComposite in=\"blur\" in2=\"SourceAlpha\" operator=\"arithmetic\" k2=\"-1\" k3=\"2\" result=\"inner\"/>\n      <feColorMatrix type=\"matrix\" values=\"1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 1 0\" />\n    </filter>\n  </defs>\n  <ellipse cx=\"256\" cy=\"450\" rx=\"170\" ry=\"28\" class=\"shadow no-stroke\"/>\n  <g id=\"body\" style=\"cursor:crosshair\">\n    <path class=\"base stroke\" d=\"M96,250c0,-70 82,-120 160,-120s160,50 160,120c0,45 -35,85 -80,102l-18,7c-20,8 -42,12 -62,12s-42,-4 -62,-12l-18,-7c-45,-17 -80,-57 -80,-102z\"/>\n    <path class=\"dark stroke\" d=\"M128,230l-26,-22 34,-10 18,-30 32,18 40,-34 40,34 32,-18 18,30 34,10 -26,22\" />\n    <path class=\"dark stroke\" d=\"M156,290c24,-26 60,-38 100,-38s76,12 100,38c-14,34 -58,62 -100,62s-86,-28 -100,-62z\"/>\n    <path class=\"light no-stroke\" opacity=\".2\" d=\"M120,256c0,-56 72,-98 136,-98 44,0 104,16 134,56 -40,-46 -110,-68 -170,-52 -66,18 -100,62 -100,94z\"/>\n  </g>\n  <g id=\"eyes\" style=\"cursor:crosshair\">\n    <g id=\"leftEye\"><ellipse class=\"eye stroke\" cx=\"196\" cy=\"290\" rx=\"20\" ry=\"24\"/><circle class=\"glow no-stroke\" cx=\"196\" cy=\"298\" r=\"10\" filter=\"url(#innerGlow)\"/><circle fill=\"#FFFFFF\" cx=\"204\" cy=\"282\" r=\"5\"/></g>\n    <g id=\"rightEye\"><ellipse class=\"eye stroke\" cx=\"316\" cy=\"290\" rx=\"20\" ry=\"24\"/><circle class=\"glow no-stroke\" cx=\"316\" cy=\"298\" r=\"10\" filter=\"url(#innerGlow)\"/><circle fill=\"#FFFFFF\" cx=\"324\" cy=\"282\" r=\"5\"/></g>\n    <path class=\"eye stroke\" d=\"M214,330c28,-10 56,-10 84,0\"/>\n  </g>\n  <g id=\"claws\" style=\"cursor:crosshair\">\n    <path class=\"dark stroke\" d=\"M96,308c-28,-4 -56,10 -66,32 28,10 64,0 88,-20\" />\n    <path class=\"base stroke\" d=\"M92,320c-30,30 -40,62 -16,78 18,12 54,-8 82,-42 12,-14 22,-30 28,-46 -30,-12 -64,-10 -94,10z\"/>\n    <path class=\"base stroke\" d=\"M160,300c-20,18 -20,46 -6,62 18,-10 36,-30 48,-50 -10,-16 26,-20 42,-12z\"/>\n    <path class=\"dark stroke\" d=\"M148,362c10,8 28,8 40,-2 4,-18 -8,-30 -22,-30 -12,0 -20,12 -18,32z\"/>\n    <path class=\"dark stroke\" d=\"M416,308c28,-4 56,10 66,32 -28,10 -64,0 -88,-20\" />\n    <path class=\"base stroke\" d=\"M420,320c30,30 40,62 16,78 -18,12 -54,-8 -82,-42 -12,-14 -22,-30 -28,-46 30,-12 64,-10 94,10z\"/>\n    <path class=\"base stroke\" d=\"M352,300c20,18 20,46 6,62 -18,-10 -36,-30 -48,-50 10,-16 26,-20 42,-12z\"/>\n    <path class=\"dark stroke\" d=\"M364,362c-10,8 -28,8 -40,-2 -4,-18 8,-30 22,-30 12,0 20,12 18,32z\"/>\n  </g>\n  <g id=\"legs\" style=\"cursor:crosshair\">\n    <path class=\"dark stroke\" d=\"M136,356l-30,40\"/>\n    <path class=\"dark stroke\" d=\"M184,364l-16,48\"/>\n    <path class=\"dark stroke\" d=\"M328,364l16,48\"/>\n    <path class=\"dark stroke\" d=\"M376,356l30,40\"/>\n  </g>\n  <g id=\"crown\" transform=\"translate(0,-6)\" style=\"cursor:crosshair\">\n    <path class=\"crown stroke\" d=\"M202,194l-22,60h152l-22,-60 -32,26 -22,-36 -22,36 -32,-26z\"/>\n    <rect x=\"170\" y=\"254\" width=\"172\" height=\"28\" rx=\"8\" class=\"crown-dark stroke\"/>\n  </g>\n</svg>\n`.trim(), []);

  // State & refs mirroring original implementation (condensed where possible)
  const stageRef = useRef<HTMLDivElement>(null);
  const bgRef = useRef<HTMLDivElement>(null);
  const crabRef = useRef<HTMLDivElement>(null);
  const thunderRef = useRef<HTMLAudioElement>(null);
  const [bossHp, setBossHp] = useState(BOSS_MAX);
  const [playerHp, setPlayerHp] = useState(PLAYER_MAX);
  const [blocked, setBlocked] = useState(false);
  const [blockCd, setBlockCd] = useState(false);
  const [strikeOn, setStrikeOn] = useState(false);
  const [soundReady, setSoundReady] = useState(false);
  const [combatText, setCombatText] = useState<Array<{ id: number; text: string; type: 'hit' | 'crit' | 'combo' | 'block'; created: number }>>([]);
  const [comboCharge, setComboCharge] = useState(0);
  const [comboLevel, setComboLevel] = useState(0);
  const [particles, setParticles] = useState<Array<{ id: number; x: number; y: number; hue: number; size: number; life: number; created: number }>>([]);
  const [victoryAt, setVictoryAt] = useState<number | null>(null);
  const [defeatAt, setDefeatAt] = useState<number | null>(null);
  const [runId, setRunId] = useState<number | null>(null);
  const [grade, setGrade] = useState<string | null>(null);
  const [shells, setShells] = useState<number | null>(null);
  const statsRef = useRef({ start: performance.now(), hits: 0, crits: 0, blocks: 0, totalDamage: 0, maxCombo: 0 });
  const comboRef = useRef(0);
  const comboExpireTimer = useRef<number | null>(null);
  const nextParticleId = useRef(1);
  const comboCountRef = useRef(0);
  const lastHitTimeRef = useRef(0);
  const nextIdRef = useRef(1);
  const bossHpRef = useRef(bossHp); useEffect(()=>{bossHpRef.current=bossHp;},[bossHp]);
  const playerHpRef = useRef(playerHp); useEffect(()=>{playerHpRef.current=playerHp;},[playerHp]);
  const blockedRef = useRef(blocked); useEffect(()=>{blockedRef.current=blocked;},[blocked]);
  const blockCdRef = useRef(blockCd); useEffect(()=>{blockCdRef.current=blockCd;},[blockCd]);
  const blockTimer = useRef<number | null>(null);
  const cooldownTimer = useRef<number | null>(null);
  const strikeTimer = useRef<number | null>(null);
  const finishedRef = useRef(false);
  const router = useRouter();

  // Mount SVGs & palette overrides
  useEffect(() => {
    if (bgRef.current) bgRef.current.innerHTML = BG.replace('<svg ', '<svg preserveAspectRatio="xMidYMid slice" ');
    if (crabRef.current) {
      crabRef.current.innerHTML = CRAB;
      const svg = crabRef.current.querySelector('svg');
      if (svg) {
        svg.setAttribute('preserveAspectRatio','xMidYMid meet');
        const style = (svg as SVGElement).style;
        style.width = '100%';
        style.height = 'auto';
        style.maxWidth = 'none';
        style.overflow = 'visible';
        style.setProperty('--crab-base', '#7b1510');
        style.setProperty('--crab-dark', '#3a0a07');
        style.setProperty('--crab-light', '#a52a1f');
        style.setProperty('--eye', '#c10000');
        style.setProperty('--glow', '#ff2b2b');
        const override = document.createElement('style');
        override.textContent = `.stroke { stroke-width: 7.5 !important; stroke-linejoin: miter !important; stroke-linecap: square !important; } #claws .stroke, #claws path { filter: drop-shadow(0 0 6px rgba(255,0,0,.3)); }`;
        svg.prepend(override);
      }
    }
  }, [BG, CRAB]);

  // Timers & effects (similar to original)
  useEffect(() => {
    let raf = 0; let last = performance.now();
    const tick = (t:number) => { const dt=(t-last)/1000; last=t; if(!blockedRef.current && bossHpRef.current>0 && playerHpRef.current>0){ setPlayerHp(h=>Math.max(0,h-TIMER_DRAIN_PER_SEC*dt)); } raf=requestAnimationFrame(tick); };
    raf=requestAnimationFrame(tick); return ()=>cancelAnimationFrame(raf);
  }, []);

  useEffect(() => {
    if (soundReady) return; const handler = () => { if (!soundReady) { const el = thunderRef.current; try { el?.play().then(()=>{ el.pause(); el.currentTime=0; }).catch(()=>{}); } catch {} setSoundReady(true); } }; window.addEventListener('pointerdown', handler, { once: true }); return () => window.removeEventListener('pointerdown', handler); }, [soundReady]);

  useEffect(() => { let alive=true; const schedule=()=>{ const delay=6000+Math.random()*8000; strikeTimer.current=window.setTimeout(()=>{ if(!alive) return; setStrikeOn(true); if(soundReady){ if(thunderRef.current?.currentTime) thunderRef.current.currentTime=0; thunderRef.current?.play().catch(()=>{}); } window.setTimeout(()=>setStrikeOn(false),520); schedule(); }, delay); }; schedule(); return ()=>{ alive=false; if(strikeTimer.current) clearTimeout(strikeTimer.current); }; }, [soundReady]);

  const flash = useCallback((id: Part) => { const svg=crabRef.current?.querySelector('svg'); const g=svg?.querySelector(`#${id}`); if(!g) return; g.classList.add('kc-hit'); setTimeout(()=>g.classList.remove('kc-hit'),140); }, []);

  const handleDamage = useCallback((part: Exclude<Part,'claws'>) => {
    if (bossHpRef.current<=0 || playerHpRef.current<=0) return;
    const now=performance.now();
    if (now - lastHitTimeRef.current < 900) comboCountRef.current += 1; else comboCountRef.current = 1;
    lastHitTimeRef.current = now;
    const raw = comboCountRef.current;
    const gain = Math.min(0.12 + raw * 0.02, 0.35);
    setComboCharge(prev => Math.min(1, prev + gain));
    setComboLevel(() => (raw >= 15) ? 4 : (raw >= 10) ? 3 : (raw >= 6) ? 2 : (raw >= 3) ? 1 : 0);
    comboRef.current = raw;
    if (comboExpireTimer.current) clearTimeout(comboExpireTimer.current);
    comboExpireTimer.current = window.setTimeout(() => { comboCountRef.current=0; comboRef.current=0; setComboLevel(0); setComboCharge(ch=>ch*0.5); }, 1400);
    const base = BASE_DAMAGE[part]; const isCrit = Math.random() < 0.2; const dmg = isCrit ? Math.round(base*1.6) : base;
    setBossHp(h=>Math.max(0,h-dmg)); flash(part);
    statsRef.current.hits += 1; if(isCrit) statsRef.current.crits +=1; statsRef.current.totalDamage += dmg; if(comboCountRef.current > statsRef.current.maxCombo) statsRef.current.maxCombo = comboCountRef.current;
    const events: Array<{ text:string; type:'hit'|'crit'|'combo' }> = []; events.push(isCrit ? { text:`CRIT ${dmg}`, type:'crit'} : { text:`${dmg}`, type:'hit'}); if(comboCountRef.current>=3) events.push({ text:`${comboCountRef.current}x Combo!`, type:'combo'});
    setCombatText(prev => [...prev, ...events.map(e=>({ id: nextIdRef.current++, text:e.text, type:e.type, created: Date.now() }))]);
    const shouldBurst = isCrit || raw===3 || raw===6 || raw===10 || raw===15 || raw % 20 === 0;
    if (shouldBurst) {
      const centerX=50, centerY=38; const count = isCrit ? 14 : (raw>=15 ? 18 : 8 + Math.min(raw,10));
      setParticles(prev => { const nowMs=Date.now(); const list=[...prev]; for(let i=0;i<count;i++){ list.push({ id: nextParticleId.current++, x:centerX+(Math.random()*30-15), y:centerY+(Math.random()*10-5), hue:isCrit?40+Math.random()*20:300+Math.random()*40, size:isCrit?9+Math.random()*6:6+Math.random()*5, life:650+Math.random()*400, created: nowMs }); } return list.slice(-220); });
    }
  }, [flash]);

  const handleBlock = useCallback(() => { if(blockCdRef.current || blockedRef.current) return; setBlocked(true); flash('claws'); if(blockTimer.current) clearTimeout(blockTimer.current); if(cooldownTimer.current) clearTimeout(cooldownTimer.current); blockTimer.current = window.setTimeout(()=>{ setBlocked(false); setBlockCd(true); cooldownTimer.current = window.setTimeout(()=>setBlockCd(false), BLOCK_COOLDOWN_MS); }, BLOCK_DURATION_MS); setCombatText(prev=>[...prev,{ id: nextIdRef.current++, text:'BLOCK', type:'block', created: Date.now() }]); statsRef.current.blocks += 1; }, [flash]);

  const restartGame = useCallback(() => {
    setBossHp(BOSS_MAX); setPlayerHp(PLAYER_MAX); setBlocked(false); setBlockCd(false); comboCountRef.current=0; comboRef.current=0; setComboLevel(0); setComboCharge(0); setParticles([]); setVictoryAt(null); setDefeatAt(null); setGrade(null); setShells(null); statsRef.current={ start: performance.now(), hits:0, crits:0, blocks:0, totalDamage:0, maxCombo:0 }; finishedRef.current=false; fetch('/api/crab-battle/start',{ method:'POST', headers:{'Content-Type':'application/json'} }).then(r=>r.json()).then(j=>{ if(j?.run_id) setRunId(j.run_id); else setRunId(null); }).catch(()=> setRunId(null));
  }, []);

  // Attach hit handlers
  useEffect(() => { const svg=crabRef.current?.querySelector('svg'); if(!svg) return; const parts:Part[]=['crown','eyes','body','claws','legs']; const handlers: Array<{el:Element; fn:(e:Event)=>void}> = []; parts.forEach(p=>{ const el=svg.querySelector(`#${p}`); if(!el) return; const fn=()=> (p==='claws'? handleBlock(): handleDamage(p as Exclude<Part,'claws'>)); el.addEventListener('pointerdown', fn); handlers.push({el, fn}); (el as HTMLElement).style.touchAction='manipulation'; }); return ()=> handlers.forEach(({el,fn})=> el.removeEventListener('pointerdown', fn)); }, [handleBlock, handleDamage]);

  const gameOver = bossHp <= 0 || playerHp <= 0;

  // Decide outcome timestamps
  useEffect(()=>{ if(victoryAt || defeatAt) return; if(bossHp<=0 && playerHp>0) setVictoryAt(performance.now()); else if(playerHp<=0 && bossHp>0) setDefeatAt(performance.now()); }, [bossHp, playerHp, victoryAt, defeatAt]);

  // Start run on mount
  useEffect(()=>{ fetch('/api/crab-battle/start',{ method:'POST', headers:{'Content-Type':'application/json'} }).then(r=>r.json()).then(j=>{ if(j?.run_id) setRunId(j.run_id); }).catch(()=>{}); }, []);

  // Finish run
  useEffect(()=>{ if(finishedRef.current) return; if(!(bossHp<=0 || playerHp<=0)) return; finishedRef.current=true; const end=performance.now(); const elapsed=(end - statsRef.current.start)/1000; const payload={ run_id: runId ?? undefined, victory: bossHp<=0 && playerHp>0, duration_seconds: Number(elapsed.toFixed(2)), hits: statsRef.current.hits, crits: statsRef.current.crits, blocks: statsRef.current.blocks, max_combo: statsRef.current.maxCombo, total_damage: statsRef.current.totalDamage, dps: Number((statsRef.current.totalDamage/(elapsed||1)).toFixed(2)) }; fetch('/api/crab-battle/finish',{ method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(payload) }).then(r=>r.json().catch(()=>null)).then(resp=>{ if(resp){ if(typeof resp.grade === 'string') setGrade(resp.grade); if(typeof resp.shells_awarded === 'number') setShells(resp.shells_awarded); } if(onFinish){ onFinish({ victory: payload.victory, duration: payload.duration_seconds, hits: payload.hits, crits: payload.crits, blocks: payload.blocks, maxCombo: payload.max_combo, totalDamage: payload.total_damage, dps: payload.dps, runId }); } }).catch(()=>{}); }, [bossHp, playerHp, runId, onFinish]);

  // Decay & cleanup cycles
  useEffect(()=>{ if(!comboCharge) return; const id=setInterval(()=> setComboCharge(ch=> ch<=0.0001?0: Math.max(0, ch-0.015)), 180); return ()=>clearInterval(id); }, [comboCharge]);
  useEffect(()=>{ if(!particles.length) return; const id=setTimeout(()=>{ const now=Date.now(); setParticles(prev=> prev.filter(p=> now - p.created < p.life)); }, 400); return ()=> clearTimeout(id); }, [particles]);
  useEffect(()=>{ if(!combatText.length) return; const now=Date.now(); const stale = combatText.filter(e=> now - e.created > 1100).length>0; if(!stale){ const id=setTimeout(()=>{ const t=Date.now(); setCombatText(prev=> prev.filter(e=> t - e.created <= 1100)); }, 400); return ()=> clearTimeout(id); } setCombatText(prev=> prev.filter(e=> now - e.created <= 1100)); }, [combatText]);

  return (
    <div className={className ?? 'fixed inset-0 bg-black text-white'}>
      <div className="w-full h-full">
        <div id="kingcrab-stage" ref={stageRef} className={`relative bg-black select-none ring-1 ring-white/10 overflow-hidden w-full h-full ${strikeOn? 'strike': ''}`}>
          <div ref={bgRef} id="bg" className="absolute inset-0" />
          <div className="mist pointer-events-none absolute inset-0" />
          <div className="absolute inset-0 grid place-items-center"><div ref={crabRef} id="crab" className="w-[120%] max-w-none translate-y-[2%]" /></div>
          <div className={`lightning pointer-events-none absolute inset-0 ${strikeOn ? 'on' : ''}`} />
          <div className="pointer-events-none absolute left-0 right-0 top-12 flex flex-col items-center z-20">
            <div className="relative min-h-[80px] w-full flex items-start justify-center overflow-visible">
              {combatText.map(evt => (
                <span key={evt.id} className={`absolute select-none font-extrabold tracking-wide text-4xl md:text-5xl combat-float-large opacity-0 ${evt.type==='crit'?'text-amber-300 drop-shadow-[0_0_10px_rgba(255,191,71,0.65)]':''} ${evt.type==='hit'?'text-red-300 drop-shadow-[0_0_8px_rgba(255,60,60,0.55)]':''} ${evt.type==='combo'?'text-fuchsia-300 drop-shadow-[0_0_10px_rgba(255,0,200,0.6)]':''} ${evt.type==='block'?'text-emerald-300 drop-shadow-[0_0_10px_rgba(16,185,129,0.55)]':''}`} style={{ top:0, left:'50%', transform:`translateX(-50%) translate(${(evt.id % 5 - 2) * 14}px, ${(evt.id % 7 - 3) * 6}px)` }}>{evt.text}</span>
              ))}
            </div>
          </div>
          <div className="absolute top-4 left-0 right-0 px-4 flex items-center justify-between">
            <div className="flex items-center gap-3 flex-1">
              <div className="h-2 w-full bg-white/10 rounded-full overflow-hidden"><div className="h-full bg-red-500 transition-[width] duration-150" style={{ width:`${(bossHp/BOSS_MAX)*100}%` }} /></div>
              <span className="ml-2 text-xs uppercase tracking-wide opacity-80 shrink-0">King Crab</span>
            </div>
            <span className="ml-3 text-xs font-mono opacity-75 shrink-0">{Math.ceil(bossHp)}/{BOSS_MAX}</span>
          </div>
          <div className="absolute bottom-4 left-0 right-0 px-4 flex items-center justify-between">
            <div className="flex items-center gap-3 flex-1">
              <div className="h-2 w-full bg-white/10 rounded-full overflow-hidden"><div className={`h-full transition-[width] duration-150 ${blocked?'bg-emerald-400':'bg-sky-400'}`} style={{ width:`${(playerHp/PLAYER_MAX)*100}%` }} /></div>
              <span className="ml-2 text-xs uppercase tracking-wide opacity-80 shrink-0">{blocked? 'Blocking…':'Stamina'}</span>
            </div>
            <span className="ml-3 text-xs font-mono opacity-75 shrink-0">{Math.ceil(playerHp)}/{PLAYER_MAX}</span>
          </div>
          <div className="absolute bottom-16 left-4 right-4">
            <div className="flex flex-col items-stretch gap-1">
              <div className="h-3 rounded-full bg-white/5 ring-1 ring-white/10 overflow-hidden relative">
                <div className={`h-full combo-fill transition-[width,filter] duration-150 ${comboLevel>=3?'glow-pulse':''}`} style={{ width:`${Math.min(100, comboCharge*100)}%`, background:'linear-gradient(90deg, rgba(255,60,60,0.85), rgba(255,160,0,0.9), rgba(255,255,255,0.95))', filter: comboLevel>=2? 'brightness(1.2) saturate(1.3)':'none' }} />
                {comboLevel>=4 && (<div className="absolute inset-0 animate-[meter-shine_1.8s_linear_infinite] bg-[linear-gradient(120deg,transparent,rgba(255,255,255,0.5),transparent)] mix-blend-screen" />)}
              </div>
              <div className="text-[10px] uppercase tracking-wider font-semibold flex justify-between text-white/70"><span>Combo</span><span>{comboRef.current>0? `${comboRef.current}x`:''}{comboLevel>=1 && `  Lv${comboLevel}`}</span></div>
            </div>
          </div>
          <div className="absolute bottom-12 right-4">
            <div className={`px-2 py-1 rounded text-xs font-semibold ${blocked? 'bg-emerald-500/20 text-emerald-300': blockCd? 'bg-yellow-500/10 text-yellow-300':'bg-white/10 text-white/80'}`}>{blocked? 'BLOCK ACTIVE': blockCd? 'Cooldown…':'Tap claws to BLOCK'}</div>
          </div>
          {gameOver && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/55 backdrop-blur-[3px] z-40 p-4">
              <div className="w-full max-w-sm rounded-2xl bg-neutral-950/90 ring-1 ring-white/10 shadow-xl px-6 py-6 space-y-5">
                {bossHp<=0 && playerHp>0 ? (
                  <div className="space-y-3">
                    <div className="text-center space-y-1">
                      <h2 className="text-2xl font-black tracking-wide text-amber-300 drop-shadow-[0_0_8px_rgba(255,200,0,0.35)]">YOU WIN!!</h2>
                      <p className="text-xs uppercase tracking-widest text-white/60">King Crab defeated</p>
                      {grade && (
                        <div className="mt-2 flex items-center justify-center gap-2">
                          <span className="text-3xl font-extrabold tracking-wide bg-gradient-to-br from-amber-300 via-yellow-200 to-white text-transparent bg-clip-text drop-shadow-[0_0_10px_rgba(255,200,0,0.35)]">
                            {grade}
                          </span>
                          {shells !== null && shells > 0 && (
                            <span className="text-[11px] font-mono px-2 py-1 rounded bg-amber-500/15 text-amber-200 border border-amber-400/30">+{shells} shells</span>
                          )}
                        </div>
                      )}
                    </div>
                    {(()=>{ const elapsed=((victoryAt ?? performance.now()) - statsRef.current.start)/1000; const dps=statsRef.current.totalDamage/(elapsed||1); return (<ul className="text-[11px] font-mono leading-relaxed grid grid-cols-2 gap-x-3 gap-y-1 text-white/80"><li><span className="text-white/40">Time:</span> {elapsed.toFixed(1)}s</li><li><span className="text-white/40">DPS:</span> {dps.toFixed(1)}</li><li><span className="text-white/40">Hits:</span> {statsRef.current.hits}</li><li><span className="text-white/40">Crits:</span> {statsRef.current.crits}</li><li><span className="text-white/40">Blocks:</span> {statsRef.current.blocks}</li><li><span className="text-white/40">MaxCombo:</span> {statsRef.current.maxCombo}x</li><li className="col-span-2"><span className="text-white/40">Total Damage:</span> {statsRef.current.totalDamage}</li></ul>); })()}
                    <div className="flex gap-3 pt-2">
                      <button onClick={()=> router.push('/map')} className="flex-1 h-9 rounded-md bg-gradient-to-r from-amber-400 to-amber-600 text-black text-xs font-bold tracking-wide uppercase shadow hover:brightness-110 active:scale-[.97] transition">Exit to Map</button>
                      <button onClick={restartGame} className="flex-1 h-9 rounded-md bg-white/10 text-white text-xs font-semibold tracking-wide uppercase hover:bg-white/15 transition">Restart</button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="text-center space-y-1"><h2 className="text-2xl font-black tracking-wide text-red-300 drop-shadow-[0_0_8px_rgba(255,0,0,0.35)]">DEFEATED…</h2><p className="text-xs uppercase tracking-widest text-white/60">Out of stamina</p></div>
                    {(()=>{ const elapsed=((defeatAt ?? performance.now()) - statsRef.current.start)/1000; const dps=statsRef.current.totalDamage/(elapsed||1); return (<ul className="text-[11px] font-mono leading-relaxed grid grid-cols-2 gap-x-3 gap-y-1 text-white/80"><li><span className="text-white/40">Time:</span> {elapsed.toFixed(1)}s</li><li><span className="text-white/40">DPS:</span> {dps.toFixed(1)}</li><li><span className="text-white/40">Hits:</span> {statsRef.current.hits}</li><li><span className="text-white/40">Crits:</span> {statsRef.current.crits}</li><li><span className="text-white/40">Blocks:</span> {statsRef.current.blocks}</li><li><span className="text-white/40">MaxCombo:</span> {statsRef.current.maxCombo}x</li><li className="col-span-2"><span className="text-white/40">Total Damage:</span> {statsRef.current.totalDamage}</li></ul>); })()}
                    <div className="flex gap-3 pt-2">
                      <button onClick={()=> router.push('/map')} className="flex-1 h-9 rounded-md bg-white/10 text-white text-xs font-semibold tracking-wide uppercase hover:bg-white/15 transition">Exit</button>
                      <button onClick={restartGame} className="flex-1 h-9 rounded-md bg-red-500/80 text-white text-xs font-bold tracking-wide uppercase shadow hover:brightness-110 active:scale-[.97] transition">Retry</button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
          <audio ref={thunderRef} preload="auto" src="/sfx/thunder.mp3" aria-hidden="true" />
          <div className="pointer-events-none absolute inset-0 z-30">
            {particles.map(p=>{ const age=Date.now()-p.created; const prog=Math.min(1, age/p.life); const scale=0.4+(1-prog)*0.8; const fade=prog<0.1? prog/0.1: 1-(prog-0.1)/0.9; const driftX=(prog**1.2)*(p.x<50?-1:1)*18; const driftY=(prog**0.9)*-40; return (<span key={p.id} className="absolute block will-change-transform" style={{ left:`${p.x}%`, top:`${p.y}%`, width:p.size, height:p.size, opacity:fade, background:`radial-gradient(circle, hsl(${p.hue} 90% 70%), hsl(${p.hue} 90% 45%) 60%, transparent)`, borderRadius:'50%', transform:`translate(-50%, -50%) translate(${driftX}px, ${driftY}px) scale(${scale}) rotate(${prog*540}deg)` }} />); })}
          </div>
          {!soundReady && (<div className="pointer-events-none absolute inset-x-0 top-2 flex justify-center"><div className="px-3 py-1 rounded-full text-[10px] font-medium bg-white/10 backdrop-blur-sm border border-white/15 animate-pulse">Tap once to enable thunder</div></div>)}
        </div>
      </div>
      <style jsx global>{`
        .combat-float { animation: combat-float 900ms ease-out forwards; }
        .combat-float-large { animation: combat-float-large 1100ms cubic-bezier(.2,.8,.3,1) forwards; }
        @keyframes combat-float { 0% { opacity:0; transform:translate(-50%, -50%) scale(.6);} 10% {opacity:1; transform:translate(-50%, -60%) scale(1);} 60% {opacity:1; transform:translate(-50%, -90%) scale(1.05);} 100% {opacity:0; transform:translate(-50%, -130%) scale(1.1);} }
        @keyframes combat-float-large { 0% {opacity:0; transform:translate(-50%,10px) scale(.55); filter:blur(2px);} 12% {opacity:1; transform:translate(-50%,-8px) scale(1); filter:blur(0);} 55% {opacity:1; transform:translate(-50%,-32px) scale(1.08);} 100% {opacity:0; transform:translate(-50%,-70px) scale(1.15);} }
        #crab svg #claws { transform-origin:50% 70%; animation:kc-flex 1.1s ease-in-out infinite; }
        @keyframes kc-flex { 0%,100% {transform:rotate(0deg);} 50% {transform:rotate(-3deg);} }
        #crab svg #eyes { animation:kc-pulse 1.2s ease-in-out infinite; }
        @keyframes kc-pulse { 0%,100% {filter:none;} 50% {filter:drop-shadow(0 0 6px #ff2b2b);} }
        #bg svg ellipse { transform-box:fill-box; transform-origin:50% 50%; animation:cloud-drift 30s linear infinite; }
        #bg svg ellipse:nth-of-type(2){ animation-duration:36s; opacity:.55; }
        #bg svg ellipse:nth-of-type(3){ animation-duration:44s; opacity:.4; }
        @keyframes cloud-drift { 0%{transform:translateX(-6%)} 50%{transform:translateX(6%)} 100%{transform:translateX(-6%)} }
        #bg svg path:nth-of-type(1), #bg svg path:nth-of-type(2), #bg svg path:nth-of-type(3){ transform-box:fill-box; transform-origin:50% 50%; animation:wave-bob 4s ease-in-out infinite; }
        #bg svg path:nth-of-type(2){ animation-duration:4.8s; animation-delay:.15s; }
        #bg svg path:nth-of-type(3){ animation-duration:5.6s; animation-delay:.3s; }
        @keyframes wave-bob { 0%,100%{transform:translateY(0)} 50%{transform:translateY(3px)} }
        .mist { background: radial-gradient(120% 60% at 50% 12%, rgba(255,255,255,0.03), transparent 60%), linear-gradient(to bottom, rgba(255,255,255,0.02), transparent 40%), radial-gradient(180% 80% at 50% 90%, rgba(255,255,255,0.015), transparent 60%); mix-blend-mode:screen; animation:mist-move 18s ease-in-out infinite; }
        @keyframes mist-move { 0% {transform:translateX(-2%) translateY(0); opacity:.85;} 50% {transform:translateX(2%) translateY(-1%); opacity:.95;} 100% {transform:translateX(-2%) translateY(0); opacity:.85;} }
        #crab svg .kc-hit, #crab svg g.kc-hit path, #crab svg g.kc-hit ellipse, #crab svg g.kc-hit rect { filter:drop-shadow(0 0 10px rgba(255,77,61,.85)); }
        .lightning { opacity:0; background: radial-gradient(120% 80% at 50% 20%, rgba(255,255,255,0.22), rgba(255,255,255,0) 60%), linear-gradient(to bottom, rgba(255,255,255,0.12), rgba(255,255,255,0) 40%), radial-gradient(200% 100% at 50% 100%, rgba(255,255,255,0.08), rgba(255,255,255,0) 60%); mix-blend-mode:screen; }
        .lightning.on { animation:bolt 520ms ease-out both; }
        @keyframes bolt { 0%{opacity:0;} 5%{opacity:1;} 18%{opacity:0.12;} 30%{opacity:0.85;} 60%{opacity:0;} 100%{opacity:0;} }
        .strike #bg svg { filter:brightness(1.25) contrast(1.1); }
        .strike #crab svg { filter:brightness(1.15) saturate(1.1) drop-shadow(0 0 18px rgba(255,255,255,0.25)); }
        .strike #crab svg #eyes { filter:drop-shadow(0 0 12px #ff2b2b); }
        @keyframes meter-shine { 0% {transform:translateX(-60%);} 100% {transform:translateX(120%);} }
        .glow-pulse { animation:glowPulse 1.3s ease-in-out infinite; }
        @keyframes glowPulse { 0%,100% { filter:drop-shadow(0 0 4px rgba(255,180,0,0.6)); } 50% { filter:drop-shadow(0 0 10px rgba(255,255,255,0.9)); } }
      `}</style>
    </div>
  );
}

export default CrabBattle;
