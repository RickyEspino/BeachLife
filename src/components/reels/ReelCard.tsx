"use client";
import Image from 'next/image';
import { useState } from 'react';

export interface ReelItem {
  id: number | string;
  userId: string;
  username: string;
  avatarUrl?: string | null;
  imageUrl: string;
  caption: string | null;
  createdAt: string;
  likeCount: number;
  liked?: boolean;
}

interface Props {
  item: ReelItem;
  onToggleLike?: (id: number | string, currentLiked: boolean) => void;
  onVisible?: (id: string | number) => void; // future use
  liking?: boolean; // in-flight like/unlike to prevent spamming
  immersive?: boolean;
}

export default function ReelCard({ item, onToggleLike, liking, immersive }: Props) {
  const [loaded, setLoaded] = useState(false);
  const liked = !!item.liked;
  const likeCount = item.likeCount;
  return (
  <article className="relative w-full flex-shrink-0 snap-start overflow-hidden bg-black" style={{ height: 'calc(var(--vh, 1vh) * 100)' }}>
      <Image
        src={item.imageUrl}
        alt={item.caption || 'BeachLife reel'}
        fill
        priority={false}
        sizes="100vw"
        className={`object-cover transition-opacity duration-500 ${loaded ? 'opacity-100' : 'opacity-0'}`}
        onLoadingComplete={() => setLoaded(true)}
      />
      {!loaded && <div className="absolute inset-0 animate-pulse bg-gradient-to-br from-gray-800 to-gray-700" />}
      {/* Top gradient + overlay container */}
      {!immersive && <div className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-black/70 via-black/30 to-transparent" />}
      {!immersive && <div className="absolute left-0 right-0 top-0 z-10 flex items-start justify-between px-3 pt-4">
        <div className="flex max-w-[70%] items-center gap-3 rounded-full bg-black/40 backdrop-blur-md px-3 py-2 border border-white/20 shadow">
          {item.avatarUrl ? (
            <Image src={item.avatarUrl} alt={item.username} width={40} height={40} className="h-10 w-10 rounded-full object-cover ring-2 ring-white/60" />
          ) : (
            <div className="h-10 w-10 rounded-full bg-white/15 backdrop-blur grid place-items-center text-white font-semibold text-sm ring-2 ring-white/30">
              {item.username?.[0]?.toUpperCase() || '?'}
            </div>
          )}
          <div className="flex flex-col">
            <span className="text-white font-semibold leading-tight text-sm">@{item.username}</span>
            <time className="text-[10px] uppercase tracking-wide text-white/70" dateTime={item.createdAt}>{new Date(item.createdAt).toLocaleDateString(undefined,{ month:'short', day:'numeric'})}</time>
          </div>
        </div>
        <div className="flex flex-col items-center gap-1 z-[60] pointer-events-auto">
          <button
            type="button"
            onClick={() => onToggleLike?.(item.id, liked)}
            aria-label={liked ? 'Unlike' : 'Like'}
            disabled={liking}
            className={`group relative h-12 w-12 rounded-full flex items-center justify-center transition active:scale-90 border ${liked ? 'bg-rose-600 border-rose-400/50' : 'bg-black/40 backdrop-blur border-white/25'} shadow focus:outline-none focus:ring-2 focus:ring-white/60 disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            <span className={`text-xl drop-shadow ${liked ? 'text-white' : 'text-white/90 group-hover:scale-110 transition-transform'}`}>{liked ? '❤️' : '🤍'}</span>
            <span className="absolute -bottom-4 text-[10px] font-medium text-white tabular-nums">{likeCount}</span>
            {liking && <span className="sr-only">Updating like</span>}
          </button>
        </div>
      </div>}
      {/* Caption lower-left (keep readable, above bottom nav) */}
      {item.caption && !immersive && (
        <div className="absolute left-3 bottom-24 z-10 max-w-[70%]">
          <p className="text-sm leading-snug text-white/95 whitespace-pre-wrap break-words drop-shadow-md">
            {item.caption}
          </p>
        </div>
      )}
      {!immersive && <div className="pointer-events-none absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />}
    </article>
  );
}
