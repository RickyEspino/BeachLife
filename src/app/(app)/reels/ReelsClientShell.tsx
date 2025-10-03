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
  const [open, setOpen] = useState(false);
  const [panelMounted, setPanelMounted] = useState(false);

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
      <ReelsFeed initial={initial} initialNextCursor={initialNextCursor} />

      {/* Floating Action Button (styled like BottomTabs pill) */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Create Reel"
        className="group fixed bottom-24 right-4 z-40 h-14 w-14 rounded-full bg-white/80 supports-[backdrop-filter]:bg-white/60 backdrop-blur-md border border-white/60 shadow-lg flex items-center justify-center active:scale-95 transition focus:outline-none focus:ring-2 focus:ring-blue-500/70 text-gray-800 hover:text-gray-900"
      >
        <span className="text-[26px] leading-none -mt-px">＋</span>
        <span className="pointer-events-none absolute -bottom-5 text-[10px] font-medium tracking-wide text-gray-200 opacity-0 group-hover:opacity-100 transition select-none">Create</span>
        <span className="absolute inset-0 rounded-full ring-1 ring-inset ring-white/70" aria-hidden="true" />
      </button>

      {/* Slide-over Panel */}
      <div
        aria-hidden={!open}
        className={`pointer-events-none fixed inset-0 z-50 flex justify-end transition ${open ? '': ''}`}
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
