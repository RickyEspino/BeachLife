"use client";
import { useCallback, useEffect, useRef, useState } from 'react';
import MapComponent, { type MerchantPin, type MerchantPromo } from '@/components/Map';
import MapCategoryOverlay from '@/components/MapCategoryOverlay';

type SharedUser = { id: string; username: string; avatarUrl?: string | null; latitude: number; longitude: number; updatedAt?: string };

interface Props {
  merchants: MerchantPin[];
  loadError?: string;
  initialView?: { latitude: number; longitude: number; zoom?: number };
  focusId?: string;
  userAvatarUrl?: string;
  currentUserId?: string;
  pollIntervalMs?: number; // default 60s
  categories?: string[];
}

export default function LiveMapShell({ merchants, loadError, initialView, focusId, userAvatarUrl, currentUserId, pollIntervalMs = 60_000, categories = [] }: Props) {
  const [sharedUsers, setSharedUsers] = useState<SharedUser[]>([]);
  const [lastFetched, setLastFetched] = useState<number | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [promos, setPromos] = useState<MerchantPromo[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const fetchLive = useCallback(async () => {
    try {
      setFetchError(null);
      const [usersRes, promosRes] = await Promise.all([
        fetch('/api/shared-users?maxAgeMinutes=180&limit=250', { cache: 'no-store' }),
        fetch('/api/merchant-promos', { cache: 'no-store' })
      ]);
      if (!usersRes.ok) throw new Error(`Users ${usersRes.status}`);
      if (!promosRes.ok) throw new Error(`Promos ${promosRes.status}`);
      const usersJson = await usersRes.json();
      const promosJson = await promosRes.json();
      if (Array.isArray(usersJson)) {
        setSharedUsers(currentUserId ? usersJson.filter((u: SharedUser) => u.id !== currentUserId) : usersJson);
      }
      if (Array.isArray(promosJson)) {
        // Validate shape minimally
        const now = Date.now();
        const cleaned: MerchantPromo[] = (promosJson as unknown[])
          .filter((p: unknown): p is { id: string; expiresAt: number } => {
            if (!p || typeof p !== 'object') return false;
            const obj = p as Record<string, unknown>;
            return typeof obj.id === 'string' && typeof obj.expiresAt === 'number';
          })
          .map(p => p as MerchantPromo)
          .filter(p => p.expiresAt > now);
        setPromos(cleaned);
      }
      setLastFetched(Date.now());
    } catch (e) {
      setFetchError(e instanceof Error ? e.message : 'Failed');
    }
  }, [currentUserId]);

  useEffect(() => {
    fetchLive();
    timerRef.current = setInterval(() => {
      if (document.visibilityState === 'visible') fetchLive();
    }, pollIntervalMs);
    const onFocus = () => fetchLive();
    window.addEventListener('focus', onFocus);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      window.removeEventListener('focus', onFocus);
    };
  }, [pollIntervalMs, fetchLive]);

  const [selectedCategories, setSelectedCategories] = useState<string[] | null>(null);

  return (
    <>
      <MapComponent
        merchants={selectedCategories && selectedCategories.length > 0 ? merchants.filter(m => selectedCategories.includes(m.category || '')) : merchants}
        loadError={loadError || fetchError || undefined}
        initialView={initialView}
        focusId={focusId}
        showUserLocation
        userAvatarUrl={userAvatarUrl}
        sharedUsers={sharedUsers}
        serverPromos={promos}
      />
      <MapCategoryOverlay
        categories={categories}
        merchants={merchants}
        onSelectCategories={(cats: string[] | null) => setSelectedCategories(cats)}
        onSelectMerchant={(id: string) => {
          const el = document.querySelector(`[data-merchant-id="${CSS.escape(id)}"] button`) as HTMLButtonElement | null;
          el?.click();
        }}
      />
      <div className="pointer-events-none absolute left-2 bottom-2 text-[10px] text-gray-500 bg-white/70 rounded px-1 py-0.5">
        {lastFetched ? `users:${sharedUsers.length} promos:${promos.length}` : 'loading...'}
      </div>
    </>
  );
}
