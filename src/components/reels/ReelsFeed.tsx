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
  immersive?: boolean;
  onTouchStart?: React.TouchEventHandler<HTMLDivElement>;
  onTouchMove?: React.TouchEventHandler<HTMLDivElement>;
  onTouchEnd?: React.TouchEventHandler<HTMLDivElement>;
  onClick?: React.MouseEventHandler<HTMLDivElement>;
}

export default function ReelsFeed({ initial, initialNextCursor, immersive, onTouchStart, onTouchMove, onTouchEnd, onClick }: Props) {
  const [items, setItems] = useState<ReelItem[]>(initial);
  const [nextCursor, setNextCursor] = useState<string | undefined>(initialNextCursor);
  const [loadingMore, setLoadingMore] = useState(false);
  const [likingIds, setLikingIds] = useState<Set<number | string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const reachedEnd = !nextCursor;

  // helper removed (was unused)

  const handleToggleLike = async (id: number | string, currentlyLiked: boolean) => {
    const numericId = typeof id === 'string' ? Number(id) : id;
    if (!Number.isFinite(numericId)) return;
    if (likingIds.has(id)) return; // prevent double taps while in-flight
    setLikingIds(prev => new Set(prev).add(id));
    // optimistic functional update ensures no stale closure
    setItems(prev => prev.map(it => {
      if (it.id !== id) return it;
      const delta = currentlyLiked ? -1 : 1;
      const nextCount = Math.max(0, it.likeCount + delta);
      return { ...it, liked: !currentlyLiked, likeCount: nextCount };
    }));
    try {
      const method = currentlyLiked ? 'DELETE' : 'POST';
      const res = await fetch(`/api/reels/${numericId}/like`, { method });
      if (!res.ok) throw new Error('Failed');
      const data = await res.json();
      setItems(prev => prev.map(it => it.id === id ? {
        ...it,
        liked: typeof data.liked === 'boolean' ? data.liked : it.liked,
        likeCount: typeof data.likeCount === 'number' ? data.likeCount : it.likeCount
      } : it));
    } catch {
      // rollback
      setItems(prev => prev.map(it => {
        if (it.id !== id) return it;
        const delta = currentlyLiked ? 1 : -1; // undo previous
        const nextCount = Math.max(0, it.likeCount + delta);
        return { ...it, liked: currentlyLiked, likeCount: nextCount };
      }));
    }
      setLikingIds(prev => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
  };

  const loadMore = useCallback(async () => {
    if (!nextCursor || loadingMore) return;
    setLoadingMore(true);
    setError(null);
    const controller = new AbortController();
    try {
      const url = new URL('/api/reels', window.location.origin);
      url.searchParams.set('limit', '10');
      url.searchParams.set('cursor', nextCursor);
      const res = await fetch(url.toString(), { cache: 'no-store', signal: controller.signal });
      if (!res.ok) throw new Error(`Fetch ${res.status}`);
      const json: FeedResponse = await res.json();
      setItems(prev => [...prev, ...json.items]);
      setNextCursor(json.nextCursor);
    } catch (e) {
      if ((e as Error).name !== 'AbortError') {
        setError(e instanceof Error ? e.message : 'Failed');
      }
    } finally {
      setLoadingMore(false);
    }
    return () => controller.abort();
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
      setItems(prev => {
        if (prev.find(r => r.id === detail.id)) return prev; // avoid duplicates
        return [detail, ...prev];
      });
    };
    window.addEventListener('reel:created', handler as EventListener);
    return () => window.removeEventListener('reel:created', handler as EventListener);
  }, []);

  return (
    <div
      className="relative w-full overflow-y-auto snap-y snap-mandatory scrollbar-none bg-black overscroll-contain"
      style={{ height: 'calc(var(--vh, 1vh) * 100)' }}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      onClick={onClick}
    >
      {items.map(item => (
        <ReelCard key={item.id} item={item} immersive={immersive} onToggleLike={handleToggleLike} liking={likingIds.has(item.id)} />
      ))}
      <div ref={sentinelRef} />
      {!immersive && (
        <div className="absolute left-2 top-2 z-20 text-[10px] rounded bg-black/50 text-white px-2 py-1">
          {items.length} reels
        </div>
      )}
      <div aria-live="polite" className="sr-only">
        {loadingMore ? 'Loading more reels' : ''}
      </div>
      {!immersive && loadingMore && (
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 text-xs text-white/70 animate-pulse" role="status" aria-label="Loading more reels">Loading…</div>
      )}
      {!immersive && error && (
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 text-xs text-red-400">{error}</div>
      )}
      {!immersive && reachedEnd && items.length > 0 && (
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 text-[11px] text-white/50">No more reels</div>
      )}
      {items.length === 0 && !loadingMore && !error && (
        <div className="flex h-full items-center justify-center text-sm text-white/70">Be the first to post a reel!</div>
      )}
    </div>
  );
}
