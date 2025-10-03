"use client";
import dynamic from 'next/dynamic';
import { useState, useCallback, useEffect, useRef } from 'react';
import type { ReelItem } from '@/components/reels/ReelCard';

const ReelsFeed = dynamic(() => import('@/components/reels/ReelsFeed'));
const CreateReel = dynamic(() => import('@/components/reels/CreateReel'));
const CaptureReel = dynamic(() => import('@/components/reels/CaptureReel'));

interface Props {
  initial: ReelItem[];
  initialNextCursor?: string;
}

export default function ReelsClientShell({ initial, initialNextCursor }: Props) {
  const [panelOpen, setPanelOpen] = useState(false);
  const [showCreate, setShowCreate] = useState(false); // expand secondary actions
  const [mountedCreate, setMountedCreate] = useState(false);
  const [mode, setMode] = useState<'upload' | 'capture'>('upload');
  const [immersive, setImmersive] = useState(false);
  const [overlayVisible, setOverlayVisible] = useState(true);
  const touchStartY = useRef<number | null>(null);
  const touchDelta = useRef<number>(0);
  const touchStartTime = useRef<number>(0);
  const touchStartX = useRef<number | null>(null);
  const touchDeltaX = useRef<number>(0);
  const fabRef = useRef<HTMLButtonElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => { if (panelOpen) setMountedCreate(true); }, [panelOpen]);

  // Close on Escape
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (panelOpen) { setPanelOpen(false); fabRef.current?.focus(); }
        else if (showCreate) { setShowCreate(false); }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [panelOpen, showCreate]);

  // Focus first focusable in panel when opened
  useEffect(() => {
    if (!panelOpen) return;
    const t = setTimeout(() => {
      panelRef.current?.querySelector<HTMLElement>('button, input, textarea, select')?.focus();
    }, 30);
    return () => clearTimeout(t);
  }, [panelOpen]);

  const handleCreated = useCallback((item: ReelItem) => {
    window.dispatchEvent(new CustomEvent('reel:created', { detail: item }));
    setPanelOpen(false);
    fabRef.current?.focus();
  }, []);

  // Set CSS --vh for accurate mobile viewport height (excluding browser UI)
  useEffect(() => {
    const setVh = () => {
      const vh = window.innerHeight * 0.01;
      document.documentElement.style.setProperty('--vh', `${vh}px`);
    };
    setVh();
    window.addEventListener('resize', setVh);
    window.addEventListener('orientationchange', setVh);
    return () => {
      window.removeEventListener('resize', setVh);
      window.removeEventListener('orientationchange', setVh);
    };
  }, []);

  // Reflect immersive state on <html>
  useEffect(() => {
    const cls = 'reels-immersive';
    if (immersive) document.documentElement.classList.add(cls);
    else document.documentElement.classList.remove(cls);
  }, [immersive]);

  const onTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length !== 1) return;
    touchStartY.current = e.touches[0].clientY;
    touchStartX.current = e.touches[0].clientX;
    touchDelta.current = 0;
    touchDeltaX.current = 0;
    touchStartTime.current = Date.now();
  };
  const onTouchMove = (e: React.TouchEvent) => {
    if (touchStartY.current == null) return;
    const currentY = e.touches[0].clientY;
    touchDelta.current = currentY - touchStartY.current; // positive if swiping down
    if (touchStartX.current != null) {
      const currentX = e.touches[0].clientX;
      touchDeltaX.current = currentX - touchStartX.current; // positive if swiping right
    }
  };
  const onTouchEnd = () => {
    const deltaY = touchDelta.current;
    const deltaX = touchDeltaX.current;
    const absY = Math.abs(deltaY);
    const absX = Math.abs(deltaX);
    const THRESH = 40;
    if (absX > THRESH || absY > THRESH) {
      if (absY >= absX) {
        // vertical wins
        if (deltaY < 0 && !immersive) setImmersive(true); // swipe up to enter
        if (deltaY > 0 && immersive) { setImmersive(false); setOverlayVisible(true); }
      } else if (immersive) {
        // horizontal only active in immersive
        if (deltaX < 0) setOverlayVisible(false); // left = fully immersive (hide overlays)
        if (deltaX > 0) setOverlayVisible(true);  // right = show overlays
      }
    }
    touchStartY.current = null;
    touchStartX.current = null;
    touchDelta.current = 0;
    touchDeltaX.current = 0;
  };

  const onContainerClick = () => {
    if (immersive) setImmersive(false);
  };

  return (
    <div className="relative w-full bg-black" style={{ height: 'calc(var(--vh, 1vh) * 100)' }}>
  <ReelsFeed initial={initial} initialNextCursor={initialNextCursor} immersive={immersive} overlayVisible={overlayVisible} onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd} onClick={onContainerClick} />

      {/* Creation actions */}
      {!immersive && (
      <div className="fixed right-4 bottom-[110px] z-[60] flex flex-col items-end">
        <div className={`flex items-center gap-2 mb-2 transition-all duration-300 ${showCreate ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2 pointer-events-none'}`} aria-hidden={!showCreate}>
          <button
            type="button"
            onClick={() => { setMode('capture'); setPanelOpen(true); setShowCreate(false); }}
            className="h-11 w-11 rounded-full bg-white/70 border border-white/60 flex items-center justify-center text-gray-700 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500/60"
            aria-label="Open camera to capture reel"
          >📷</button>
          <button
            type="button"
            onClick={() => { setMode('upload'); setPanelOpen(true); setShowCreate(false); }}
            className="h-11 w-11 rounded-full bg-white/70 border border-white/60 flex items-center justify-center text-gray-700 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500/60"
            aria-label="Upload image reel"
          >📁</button>
        </div>
        <button
          ref={fabRef}
          type="button"
          onClick={() => setShowCreate(v => !v)}
          aria-expanded={showCreate}
          aria-label={showCreate ? 'Close create options' : 'Open create options'}
          className={`h-14 w-14 rounded-full border border-white/60 shadow-lg flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-blue-500/70 transition active:scale-95 ${showCreate ? 'bg-blue-600 text-white' : 'bg-white/80 supports-[backdrop-filter]:bg-white/60 text-gray-800 backdrop-blur'}`}
        >
          <span className={`text-[26px] leading-none -mt-px transition-transform ${showCreate ? 'rotate-45' : ''}`}>＋</span>
        </button>
      </div>
      )}

      {/* Panel */}
      <div className="fixed inset-0 z-[70] flex justify-end pointer-events-none" aria-hidden={!panelOpen}>
        <div
          onClick={() => panelOpen && setPanelOpen(false)}
          className={`absolute inset-0 transition-opacity ${panelOpen ? 'bg-black/50 backdrop-blur-sm opacity-100 pointer-events-auto' : 'opacity-0'}`}
        />
        <div
          ref={panelRef}
          role="dialog"
          aria-label="Create a new reel"
          className={`relative h-full w-full max-w-sm bg-white/95 backdrop-blur border-l border-gray-200 shadow-xl transform transition-transform duration-300 ease-out flex flex-col pointer-events-auto ${panelOpen ? 'translate-x-0' : 'translate-x-full'}`}
        >
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200/70 bg-white/70 backdrop-blur-sm">
            <h2 className="text-sm font-semibold tracking-wide text-gray-800">New Reel</h2>
            <button
              type="button"
              onClick={() => setPanelOpen(false)}
              aria-label="Close create reel panel"
              className="rounded p-1 text-gray-500 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
            >✕</button>
          </div>
          <div className="overflow-y-auto p-4 pb-24">
            {mountedCreate && panelOpen && (
              mode === 'upload' ? <CreateReel onCreated={handleCreated} /> : <CaptureReel onCreated={handleCreated} onCancel={() => setPanelOpen(false)} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
