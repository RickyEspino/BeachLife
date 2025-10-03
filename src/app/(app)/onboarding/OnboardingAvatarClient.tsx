"use client";

import { useCallback } from 'react';
import { useRouter } from 'next/navigation';
import AvatarUploader from '@/components/AvatarUploader';

export default function OnboardingAvatarClient({ initialUrl }: { initialUrl?: string }) {
  const router = useRouter();
  const handleUploaded = useCallback(() => {
    // Trigger a soft data refresh so server-rendered onboarding page reflects new avatar immediately.
    router.refresh();
  }, [router]);

  return (
    <div>
      <AvatarUploader initialUrl={initialUrl} onUploaded={handleUploaded} />
    </div>
  );
}
