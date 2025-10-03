"use client";
import dynamic from 'next/dynamic';
import type { MerchantPin } from '@/components/Map';

const LiveMapShell = dynamic(() => import('@/components/LiveMapShell'));

interface Props {
  merchants: MerchantPin[];
  loadError?: string;
  initialView?: { latitude: number; longitude: number; zoom?: number };
  focusId?: string;
  userAvatarUrl?: string;
  currentUserId?: string;
  categories?: string[];
}

export default function ClientLiveMap(props: Props) {
  return <LiveMapShell {...props} />;
}
