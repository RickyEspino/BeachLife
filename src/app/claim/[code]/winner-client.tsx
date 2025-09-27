"use client";

import { useEffect } from "react";
import confetti from "canvas-confetti";
import { useRouter } from "next/navigation";

export default function AwardClient({
  points,
  redirectTo,
  alreadyClaimed = false,
}: {
  points: number;
  redirectTo: string;
  alreadyClaimed?: boolean;
}) {
  const router = useRouter();

  useEffect(() => {
    // fire a nice burst
    const end = Date.now() + 800;
    const frame = () => {
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
        startVelocity: 45,
        scalar: 1,
      });
      if (Date.now() < end) requestAnimationFrame(frame);
    };
    frame();

    const t = setTimeout(() => router.push(redirectTo), 1800);
    return () => clearTimeout(t);
  }, [router, redirectTo]);

  return (
    <main className="min-h-[100dvh] flex items-center justify-center p-6">
      <div className="w-full max-w-md text-center">
        <div className="text-6xl font-black tracking-tight">
          {alreadyClaimed ? "🎉 Already claimed!" : "🎉 Congrats!"}
        </div>
        <div className="mt-4 text-2xl">
          {alreadyClaimed ? (
            <>You’ve already received these points.</>
          ) : (
            <>
              You earned <span className="font-bold">{points}</span> points!
            </>
          )}
        </div>
        <div className="mt-6 text-sm text-gray-600">
          Sending you back to your dashboard…
        </div>
      </div>
    </main>
  );
}

