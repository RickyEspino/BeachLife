"use client";

import * as React from "react";

export function Claimables({
  canClaimDaily,
  canClaimProfileComplete,
  hasAvatar,
  claimDailyAction,
  claimProfileCompleteAction,
  compact = false, // compact for "Now", full on Wallet
}: {
  canClaimDaily: boolean;
  canClaimProfileComplete: boolean;
  hasAvatar: boolean;
  claimDailyAction: (fd: FormData) => void | Promise<void>;
  claimProfileCompleteAction: (fd: FormData) => void | Promise<void>;
  compact?: boolean;
}) {
  const wrap = (children: React.ReactNode) =>
    compact ? <div className="space-y-2">{children}</div> : <div className="mt-6 grid gap-4">{children}</div>;

  const dailyCard = (
    <div
      className={`rounded-xl border p-4 ${
        compact ? "" : "sm:p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
      }`}
    >
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-full border grid place-items-center">
          <span className="font-semibold">+500</span>
        </div>
        <div>
          <div className="font-medium">Daily check-in</div>
          <div className="text-sm text-gray-600">Come back every day to earn 500 points.</div>
        </div>
      </div>
      {canClaimDaily ? (
        <form action={claimDailyAction}>
          <button className="mt-3 sm:mt-0 rounded-lg bg-black text-white px-4 py-2 font-medium">Claim +500</button>
        </form>
      ) : !compact ? (
        <div className="rounded-lg border px-4 py-2 font-medium text-center">Already claimed today</div>
      ) : null}
    </div>
  );

  const profileCard = (
    <div
      className={`rounded-xl border p-4 ${
        compact ? "" : "sm:p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
      }`}
    >
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-full border grid place-items-center">
          <span className="font-semibold">+100</span>
        </div>
        <div>
          <div className="font-medium">Profile complete</div>
          <div className="text-sm text-gray-600">Add an avatar and a username to earn a one-time bonus.</div>
        </div>
      </div>
      {canClaimProfileComplete ? (
        <form action={claimProfileCompleteAction}>
          <button className="mt-3 sm:mt-0 rounded-lg bg-black text-white px-4 py-2 font-medium">Claim +100</button>
        </form>
      ) : !compact ? (
        <div className="rounded-lg border px-4 py-2 font-medium text-center">
          {hasAvatar ? "Already claimed / edit in Profile tab" : "Finish in Profile tab"}
        </div>
      ) : null}
    </div>
  );

  // Compact mode only shows actionable items
  const showDaily = compact ? canClaimDaily : true;
  const showProfile = compact ? canClaimProfileComplete : true;

  if (compact && !showDaily && !showProfile) return null;

  return wrap(
    <>
      {showDaily && dailyCard}
      {showProfile && profileCard}
    </>
  );
}
