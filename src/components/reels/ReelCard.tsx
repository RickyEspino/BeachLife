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
}

export default function ReelCard({ item, onToggleLike }: Props) {
  const [loaded, setLoaded] = useState(false);
  const liked = !!item.liked;
  const likeCount = item.likeCount;
  return (
    <article className="relative h-[100dvh] w-full flex-shrink-0 snap-start overflow-hidden bg-black">
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
      {/* Top gradient for readability */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-black/60 to-transparent" />
      {/* Bottom overlay */}
      <div className="absolute inset-x-0 bottom-0 z-10 p-4 pb-[calc(1.25rem+var(--safe-bottom,0px))] flex flex-col gap-3">
        <div className="flex items-center gap-3">
          {item.avatarUrl ? (
            <Image src={item.avatarUrl} alt={item.username} width={44} height={44} className="h-11 w-11 rounded-full object-cover ring-2 ring-white/70" />
          ) : (
            <div className="h-11 w-11 rounded-full bg-white/20 backdrop-blur grid place-items-center text-white font-semibold text-sm ring-2 ring-white/30">
              {item.username?.[0]?.toUpperCase() || '?'}
            </div>
          )}
          <div className="flex flex-col">
            <span className="text-white font-semibold text-sm">@{item.username}</span>
            <time className="text-[10px] uppercase tracking-wide text-white/70" dateTime={item.createdAt}>{new Date(item.createdAt).toLocaleDateString(undefined,{ month:'short', day:'numeric'})}</time>
          </div>
        </div>
        {item.caption && (
          <p className="text-sm leading-snug text-white/95 whitespace-pre-wrap break-words max-w-[85%]">
            {item.caption}
          </p>
        )}
      </div>
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-48 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />
      <div className="absolute right-3 bottom-28 flex flex-col items-center gap-4">
        <button
          type="button"
          onClick={() => onToggleLike?.(item.id, liked)}
          aria-label={liked ? 'Unlike' : 'Like'}
          className={`group relative h-14 w-14 rounded-full flex items-center justify-center transition active:scale-90 ${liked ? 'bg-rose-600' : 'bg-white/20 backdrop-blur'} border border-white/20`}
        >
          <span className={`text-2xl drop-shadow ${liked ? 'text-white' : 'text-white/90 group-hover:scale-110 transition-transform'}`}>{liked ? '❤️' : '🤍'}</span>
          <span className="absolute -bottom-5 text-[11px] font-medium text-white tabular-nums">{likeCount}</span>
        </button>
      </div>
    </article>
  );
}
