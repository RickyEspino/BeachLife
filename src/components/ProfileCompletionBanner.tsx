"use client";
import { useState, useEffect } from 'react';
import Link from 'next/link';

interface Props {
  missing: boolean;
}

export default function ProfileCompletionBanner({ missing }: Props) {
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (!missing) return;
    const stored = typeof window !== 'undefined' ? window.localStorage.getItem('profile-banner-dismissed') : null;
    if (stored === '1') setDismissed(true);
  }, [missing]);

  if (!missing || dismissed) return null;

  return (
    <div className="sticky top-0 z-40 w-full bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 text-white text-sm">
      <div className="mx-auto max-w-2xl px-4 py-2 flex items-center gap-3">
        <span className="font-medium">Complete your profile</span>
        <span className="hidden sm:inline">Add a username to unlock social and map features.</span>
        <Link href="/onboarding" className="ml-auto inline-flex items-center gap-1 rounded-md bg-white/15 hover:bg-white/25 px-3 py-1 text-xs font-medium transition">
          Finish now →
        </Link>
        <button
          type="button"
          aria-label="Dismiss profile completion banner"
          onClick={() => {
            setDismissed(true);
            try { window.localStorage.setItem('profile-banner-dismissed', '1'); } catch {}
          }}
          className="text-white/80 hover:text-white text-lg leading-none px-1"
        >
          ×
        </button>
      </div>
    </div>
  );
}
