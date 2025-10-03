"use client";
import dynamic from 'next/dynamic';
import { useState, useCallback, useEffect } from 'react';
import type { ReelItem } from '@/components/reels/ReelCard';

const ReelsFeed = dynamic(() => import('@/components/reels/ReelsFeed'));
const CreateReel = dynamic(() => import('@/components/reels/CreateReel'));

interface Props {
  initial: ReelItem[];
  initialNextCursor?: string;
}

export default function ReelsClientShell({ initial, initialNextCursor }: Props) {
  const [open, setOpen] = useState(false); // slide-over panel
  const [panelMounted, setPanelMounted] = useState(false);
  const [fabExpanded, setFabExpanded] = useState(false);

  // Lazy-mount panel contents only once opened to save initial hydration cost
  useEffect(() => {
    if (open) setPanelMounted(true);
  }, [open]);

  const handleCreated = useCallback((item: ReelItem) => {
    window.dispatchEvent(new CustomEvent('reel:created', { detail: item }));
    setOpen(false); // close after successful post
  }, []);

  return (
    <div className="relative h-[100dvh] w-full bg-black overflow-hidden">
      {/* Feed layer below nav & FAB */}
      <div className="absolute inset-0 z-0">
        <ReelsFeed initial={initial} initialNextCursor={initialNextCursor} />
      </div>

      {/* Expanding FAB */}
      <div className="fixed bottom-[110px] right-4 z-[55]">
        <div className={`relative flex flex-col items-end transition-[height,width] duration-300 ease-out`}>          
          {/* Expanded pill */}
          <div
            className={`mb-2 flex items-center gap-2 rounded-full border border-white/60 bg-white/80 supports-[backdrop-filter]:bg-white/60 backdrop-blur-md shadow-lg px-3 py-2 transition-all duration-300 overflow-hidden ${fabExpanded ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2 pointer-events-none'}`}
            aria-hidden={!fabExpanded}
          >
            <button
              type="button"
              aria-label="Capture from camera"
              disabled
              className="group relative flex h-11 w-11 items-center justify-center rounded-full bg-white/70 border border-white/60 text-gray-700 hover:text-gray-900 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-blue-500/60"
              title="Camera (coming soon)"
            >
              <span className="text-xl">📷</span>
            </button>
            <button
              type="button"
              aria-label="Upload from folder"
              onClick={() => { setOpen(true); setFabExpanded(false); }}
              className="group relative flex h-11 w-11 items-center justify-center rounded-full bg-white/70 border border-white/60 text-gray-700 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500/60"
            >
              <span className="text-xl">📁</span>
            </button>
          </div>
          {/* Main FAB */}
          <button
            type="button"
            aria-label={fabExpanded ? 'Close create options' : 'Open create options'}
            onClick={() => setFabExpanded(v => !v)}
            className={`group relative h-14 w-14 rounded-full flex items-center justify-center active:scale-95 transition focus:outline-none focus:ring-2 focus:ring-blue-500/70 ${fabExpanded ? 'bg-blue-600 text-white' : 'bg-white/80 supports-[backdrop-filter]:bg-white/60 text-gray-800'} backdrop-blur-md border border-white/60 shadow-lg`}
          >
            <span className={`text-[26px] leading-none -mt-px transition-transform ${fabExpanded ? 'rotate-45' : ''}`}>＋</span>
            <span className="pointer-events-none absolute -bottom-5 text-[10px] font-medium tracking-wide text-gray-200 opacity-0 group-hover:opacity-100 transition select-none">Create</span>
            <span className="absolute inset-0 rounded-full ring-1 ring-inset ring-white/70" aria-hidden="true" />
          </button>
        </div>
      </div>

      {/* Slide-over Panel */}
      <div
        aria-hidden={!open}
        className={`pointer-events-none fixed inset-0 z-[70] flex justify-end transition ${open ? '': ''}`}
      >
        {/* Backdrop */}
        <div
          onClick={() => setOpen(false)}
          className={`pointer-events-auto absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity ${open ? 'opacity-100' : 'opacity-0'}`}
        />
        <aside
          role="dialog"
          aria-label="Create a new reel"
          className={`pointer-events-auto relative h-full w-full max-w-sm bg-white/95 backdrop-blur border-l border-gray-200 shadow-xl transform transition-transform duration-300 ease-out flex flex-col ${open ? 'translate-x-0' : 'translate-x-full'}`}
        >
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200/70 bg-white/70 backdrop-blur-sm">
            <h2 className="text-sm font-semibold tracking-wide text-gray-800">New Reel</h2>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close create reel panel"
              className="rounded p-1 text-gray-500 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
            >✕</button>
          </div>
          <div className="overflow-y-auto p-4 pb-24">
            {panelMounted && (
              <CreateReel onCreated={handleCreated} />
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
