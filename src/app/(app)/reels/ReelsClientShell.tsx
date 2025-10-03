"use client";
import dynamic from 'next/dynamic';
import type { ReelItem } from '@/components/reels/ReelCard';

const ReelsFeed = dynamic(() => import('@/components/reels/ReelsFeed'));
const CreateReel = dynamic(() => import('@/components/reels/CreateReel'));

interface Props {
  initial: ReelItem[];
  initialNextCursor?: string;
}

export default function ReelsClientShell({ initial, initialNextCursor }: Props) {
  return (
    <div className="relative h-[100dvh] w-full bg-black">
      <div className="absolute right-2 top-2 z-30">
        <CreateReel onCreated={(item) => {
          window.dispatchEvent(new CustomEvent('reel:created', { detail: item }));
        }} />
      </div>
      <ReelsFeed initial={initial} initialNextCursor={initialNextCursor} />
    </div>
  );
}
