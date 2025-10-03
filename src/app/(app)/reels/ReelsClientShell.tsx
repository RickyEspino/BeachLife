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

  return (
  <div className="relative w-full bg-black" style={{ height: 'calc(var(--vh, 1vh) * 100)' }}>
      <ReelsFeed initial={initial} initialNextCursor={initialNextCursor} />

      {/* Creation actions */}
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
