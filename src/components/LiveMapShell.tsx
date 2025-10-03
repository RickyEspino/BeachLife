"use client";
import { useEffect, useRef, useState } from 'react';
import MapComponent, { type MerchantPin } from '@/components/Map';

type SharedUser = { id: string; username: string; avatarUrl?: string | null; latitude: number; longitude: number; updatedAt?: string };

interface Props {
  merchants: MerchantPin[];
  loadError?: string;
  initialView?: { latitude: number; longitude: number; zoom?: number };
  focusId?: string;
  userAvatarUrl?: string;
  pollIntervalMs?: number; // default 60s
}

export default function LiveMapShell({ merchants, loadError, initialView, focusId, userAvatarUrl, pollIntervalMs = 60_000 }: Props) {
  const [sharedUsers, setSharedUsers] = useState<SharedUser[]>([]);
  const [lastFetched, setLastFetched] = useState<number | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const fetchShared = async () => {
    try {
      setFetchError(null);
      const res = await fetch('/api/shared-users?maxAgeMinutes=180&limit=250', { cache: 'no-store' });
      if (!res.ok) throw new Error(`Fetch ${res.status}`);
      const json = await res.json();
      if (Array.isArray(json)) setSharedUsers(json);
      setLastFetched(Date.now());
    } catch (e) {
      setFetchError(e instanceof Error ? e.message : 'Failed');
    }
  };

  useEffect(() => {
    fetchShared();
    timerRef.current = setInterval(() => {
      if (document.visibilityState === 'visible') fetchShared();
    }, pollIntervalMs);
    const onFocus = () => fetchShared();
    window.addEventListener('focus', onFocus);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      window.removeEventListener('focus', onFocus);
    };
  }, [pollIntervalMs]);

  return (
    <>
      <MapComponent
        merchants={merchants}
        loadError={loadError || fetchError || undefined}
        initialView={initialView}
        focusId={focusId}
        showUserLocation
        userAvatarUrl={userAvatarUrl}
        sharedUsers={sharedUsers}
      />
      {/* Tiny status badge for debug (could be removed later) */}
      <div className="pointer-events-none absolute left-2 bottom-2 text-[10px] text-gray-500 bg-white/70 rounded px-1 py-0.5">
        {lastFetched ? `users:${sharedUsers.length}` : 'loading...'}
      </div>
    </>
  );
}
