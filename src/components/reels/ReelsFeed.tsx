"use client";
import { useCallback, useEffect, useRef, useState } from 'react';
import ReelCard, { type ReelItem } from './ReelCard';

interface FeedResponse {
  items: ReelItem[];
  nextCursor?: string;
}

interface Props {
  initial: ReelItem[];
  initialNextCursor?: string;
}

export default function ReelsFeed({ initial, initialNextCursor }: Props) {
  const [items, setItems] = useState<ReelItem[]>(initial);
  const [nextCursor, setNextCursor] = useState<string | undefined>(initialNextCursor);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const reachedEnd = !nextCursor;

  const updateItem = (id: number | string, patch: Partial<ReelItem>) => {
    setItems(prev => prev.map(it => it.id === id ? { ...it, ...patch } : it));
  };

  const handleToggleLike = async (id: number | string, currentlyLiked: boolean) => {
    const numericId = typeof id === 'string' ? Number(id) : id;
    if (!Number.isFinite(numericId)) return;
    // optimistic
    updateItem(id, { liked: !currentlyLiked, likeCount: (items.find(i => i.id === id)?.likeCount || 0) + (currentlyLiked ? -1 : 1) });
    try {
      const method = currentlyLiked ? 'DELETE' : 'POST';
      const res = await fetch(`/api/reels/${numericId}/like`, { method });
      if (!res.ok) throw new Error('Failed');
      const data = await res.json();
      if (typeof data.likeCount === 'number') {
        updateItem(id, { likeCount: data.likeCount, liked: data.liked });
      } else {
        updateItem(id, { liked: data.liked });
      }
    } catch {
      // rollback
      updateItem(id, { liked: currentlyLiked, likeCount: (items.find(i => i.id === id)?.likeCount || 0) + (currentlyLiked ? 1 : -1) });
    }
  };

  const loadMore = useCallback(async () => {
    if (!nextCursor || loadingMore) return;
    setLoadingMore(true);
    setError(null);
    try {
      const url = new URL('/api/reels', window.location.origin);
      url.searchParams.set('limit', '10');
      url.searchParams.set('cursor', nextCursor);
      const res = await fetch(url.toString(), { cache: 'no-store' });
      if (!res.ok) throw new Error(`Fetch ${res.status}`);
      const json: FeedResponse = await res.json();
      setItems(prev => [...prev, ...json.items]);
      setNextCursor(json.nextCursor);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed');
    } finally {
      setLoadingMore(false);
    }
  }, [nextCursor, loadingMore]);

  // IntersectionObserver to trigger loadMore
  useEffect(() => {
    if (!sentinelRef.current) return;
    if (!nextCursor) return; // no need if no more
    const el = sentinelRef.current;
    const observer = new IntersectionObserver(entries => {
      const first = entries[0];
      if (first.isIntersecting) {
        loadMore();
      }
    }, { root: null, rootMargin: '400px', threshold: 0 });
    observer.observe(el);
    return () => observer.disconnect();
  }, [loadMore, nextCursor]);

  // Listen for newly created reel events
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail as ReelItem | undefined;
      if (!detail) return;
      setItems(prev => [detail, ...prev]);
    };
    window.addEventListener('reel:created', handler as EventListener);
    return () => window.removeEventListener('reel:created', handler as EventListener);
  }, []);

  return (
    <div className="relative h-[100dvh] w-full overflow-y-scroll snap-y snap-mandatory scrollbar-none bg-black">
      {items.map(item => (
        <ReelCard key={item.id} item={item} onToggleLike={handleToggleLike} />
      ))}
      <div ref={sentinelRef} />
      <div className="absolute left-2 top-2 z-20 text-[10px] rounded bg-black/50 text-white px-2 py-1">
        {items.length} reels
      </div>
      {loadingMore && (
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 text-xs text-white/70 animate-pulse">Loading…</div>
      )}
      {error && (
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 text-xs text-red-400">{error}</div>
      )}
      {reachedEnd && items.length > 0 && (
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 text-[11px] text-white/50">No more reels</div>
      )}
      {items.length === 0 && !loadingMore && !error && (
        <div className="flex h-full items-center justify-center text-sm text-white/70">Be the first to post a reel!</div>
      )}
    </div>
  );
}
