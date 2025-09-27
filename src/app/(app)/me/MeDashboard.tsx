"use client";

/* eslint-disable @next/next/no-img-element */
import { useMemo, useState } from "react";
import Link from "next/link";

type HistoryRow = {
  id: string;
  type: string;
  points: number;
  metadata: { reason?: string } | null;
  created_at: string;
};

export default function MeDashboard(props: {
  userEmail: string;
  username: string;
  avatarUrl: string;
  initialsFallback: string;

  totalPoints: number;
  level: number;
  pctToNext: number;
  nextMilestone: number;

  canClaimDaily: boolean;
  canClaimProfileComplete: boolean;
  hasAvatar: boolean;

  history: HistoryRow[];

  claimDailyAction: (formData: FormData) => void | Promise<void>;
  claimProfileCompleteAction: (formData: FormData) => void | Promise<void>;

  // Admin
  isAdmin?: boolean;
  adminHref?: string;

  // Avatar controls
  updateAvatarAction: (formData: FormData) => void | Promise<void>;
  removeAvatarAction: (formData?: FormData) => void | Promise<void>;
}) {
  const {
    userEmail,
    username,
    avatarUrl,
    initialsFallback,
    totalPoints,
    level,
    pctToNext,
    nextMilestone,
    canClaimDaily,
    canClaimProfileComplete,
    hasAvatar,
    history,
    claimDailyAction,
    claimProfileCompleteAction,
    isAdmin = false,
    adminHref = "/admin",
    updateAvatarAction,
    removeAvatarAction,
  } = props;

  const [tab, setTab] = useState<"profile" | "wallet" | "activity">("wallet");

  // Progress ring dims
  const ring = useMemo(() => {
    const size = 64;
    const stroke = 6;
    const r = (size - stroke) / 2;
    const c = 2 * Math.PI * r;
    const dash = (pctToNext / 100) * c;
    return { size, stroke, r, c, dash };
  }, [pctToNext]);

  return (
    <div className="space-y-5">
      {/* Header / hero card */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#7C6FC5]/90 via-[#2EC4B6]/90 to-[#FF6A5A]/90 text-white p-5 shadow">
        <div className="absolute -top-10 -left-10 w-40 h-40 bg-white/15 rounded-full blur-2xl" />
        <div className="flex items-center gap-4">
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt={`${username} avatar`}
              className="h-14 w-14 rounded-full object-cover ring-2 ring-white/60"
            />
          ) : (
            <div className="h-14 w-14 rounded-full bg-white/15 grid place-items-center ring-2 ring-white/60">
              <span className="font-semibold">{initialsFallback}</span>
            </div>
          )}

          <div className="flex-1">
            <p className="text-white/80 text-sm">Welcome back</p>
            <h3 className="text-xl font-semibold">{username}</h3>
            <div className="flex items-center gap-2">
              <p className="text-white/90">Level {level}</p>
              {isAdmin && (
                <span className="rounded-md bg-black/30 px-2 py-0.5 text-xs font-medium">
                  Admin
                </span>
              )}
            </div>
          </div>

          {/* Progress ring */}
          <div className="relative">
            <svg width={ring.size} height={ring.size} className="-rotate-90">
              <circle
                cx={ring.size / 2}
                cy={ring.size / 2}
                r={ring.r}
                stroke="rgba(255,255,255,0.25)"
                strokeWidth={ring.stroke}
                fill="none"
              />
              <circle
                cx={ring.size / 2}
                cy={ring.size / 2}
                r={ring.r}
                stroke="#FDFCFB"
                strokeWidth={ring.stroke}
                strokeLinecap="round"
                strokeDasharray={ring.c}
                strokeDashoffset={Math.max(ring.c - ring.dash, 0)}
                className="transition-[stroke-dashoffset] duration-700 ease-out drop-shadow"
                fill="none"
              />
            </svg>
            <div className="absolute inset-0 grid place-items-center">
              <span className="text-center text-sm font-semibold leading-4">
                {pctToNext}%
                <br />
                <span className="text-[10px] font-normal">to next</span>
              </span>
            </div>
          </div>
        </div>

        <div className="mt-3 flex items-center justify-between text-sm text-white/90">
          <div>
            {totalPoints} / {nextMilestone} BP to next level
          </div>
          {isAdmin && (
            <Link
              href={adminHref}
              className="inline-flex items-center gap-2 rounded-lg bg-black/40 px-3 py-1.5 text-white hover:bg-black/50 transition"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden>
                <path d="M12 3l7 4v5c0 4.418-2.686 8.418-7 10-4.314-1.582-7-5.582-7-10V7l7-4z" fill="currentColor" />
                <path d="M9 12l2 2 4-4" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Admin
            </Link>
          )}
        </div>
      </div>

      {/* Sub-tabs */}
      <div className="rounded-2xl bg-white/80 border border-slate-100 shadow">
        <div className="flex p-1 gap-1">
          <SubTab label="Profile" active={tab === "profile"} onClick={() => setTab("profile")} />
          <SubTab label="Wallet" active={tab === "wallet"} onClick={() => setTab("wallet")} />
          <SubTab label="Activity" active={tab === "activity"} onClick={() => setTab("activity")} />
        </div>

        <div className="p-4">
          {tab === "profile" && (
            <ProfilePanel
              username={username}
              userEmail={userEmail}
              avatarUrl={avatarUrl}
              hasAvatar={hasAvatar}
              isAdmin={isAdmin}
              adminHref={adminHref}
              updateAvatarAction={updateAvatarAction}
              removeAvatarAction={removeAvatarAction}
            />
          )}

          {tab === "wallet" && (
            <WalletPanel
              totalPoints={totalPoints}
              canClaimDaily={canClaimDaily}
              canClaimProfileComplete={canClaimProfileComplete}
              claimDailyAction={claimDailyAction}
              claimProfileCompleteAction={claimProfileCompleteAction}
            />
          )}

          {tab === "activity" && <ActivityPanel history={history} />}
        </div>
      </div>
    </div>
  );
}

/* ---------- Small UI fragments ---------- */

function SubTab({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex-1 rounded-xl px-4 py-2 text-sm font-medium transition
        ${active ? "bg-slate-900 text-white" : "text-slate-700 hover:bg-slate-100"}`}
    >
      {label}
    </button>
  );
}

function ProfilePanel({
  username,
  userEmail,
  avatarUrl,
  hasAvatar,
  isAdmin,
  adminHref,
  updateAvatarAction,
  removeAvatarAction,
}: {
  username: string;
  userEmail: string;
  avatarUrl: string;
  hasAvatar: boolean;
  isAdmin: boolean;
  adminHref: string;
  updateAvatarAction: (formData: FormData) => void | Promise<void>;
  removeAvatarAction: (formData?: FormData) => void | Promise<void>;
}) {
  return (
    <div className="grid gap-4">
      {/* Avatar row with clickable Admin badge right next to it */}
      <div className="flex items-center gap-3">
        {avatarUrl ? (
          <img
            src={avatarUrl}
            alt={`${username} avatar`}
            className="h-16 w-16 rounded-full object-cover border"
          />
        ) : (
          <div className="h-16 w-16 rounded-full border bg-gradient-to-br from-gray-100 to-gray-200" />
        )}

        {isAdmin && (
          <Link
            href={adminHref}
            className="rounded-md border border-black/10 bg-black/5 px-2 py-1 text-xs font-medium hover:bg-black/10"
            title="Go to Admin"
          >
            Admin
          </Link>
        )}
      </div>

      {/* Basic profile info */}
      <div>
        <div className="text-sm text-gray-500">Username</div>
        <div className="font-medium">{username}</div>
        <div className="mt-2 text-sm text-gray-500">Email</div>
        <div className="font-medium">{userEmail}</div>
      </div>

      {/* Inline avatar uploader (no redirect) */}
      <div className="rounded-xl border p-4">
        <div className="font-medium">Change avatar</div>
        <p className="text-sm text-gray-600 mt-1">
          Upload a square image (PNG or JPG) for best results.
        </p>
        <form action={updateAvatarAction} className="mt-3 flex items-center gap-2">
          <input
            type="file"
            name="avatar"
            accept="image/*"
            className="block w-full text-sm file:mr-3 file:py-2 file:px-3 file:rounded-md file:border file:border-gray-200 file:bg-white file:text-sm file:font-medium hover:file:bg-gray-50"
            required
          />
          <button
            type="submit"
            className="rounded-lg bg-black text-white px-4 py-2 text-sm font-medium"
          >
            Upload
          </button>
        </form>

        {hasAvatar && (
          <form action={removeAvatarAction} className="mt-2">
            <button
              type="submit"
              className="text-sm text-red-600 hover:text-red-700 underline underline-offset-4"
            >
              Remove current avatar
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

function WalletPanel({
  totalPoints,
  canClaimDaily,
  canClaimProfileComplete,
  claimDailyAction,
  claimProfileCompleteAction,
}: {
  totalPoints: number;
  canClaimDaily: boolean;
  canClaimProfileComplete: boolean;
  claimDailyAction: (formData: FormData) => void | Promise<void>;
  claimProfileCompleteAction: (formData: FormData) => void | Promise<void>;
}) {
  const showDaily = canClaimDaily;
  const showProfileComplete = canClaimProfileComplete;
  const nothingToClaim = !showDaily && !showProfileComplete;

  return (
    <div className="space-y-4">
      {/* Points summary */}
      <div className="rounded-lg border p-4">
        <div className="text-sm text-gray-500">Total Points</div>
        <div className="mt-1 text-3xl font-semibold">{totalPoints.toLocaleString()}</div>
      </div>

      {/* Claimables (hidden once completed) */}
      {showDaily && (
        <div className="rounded-xl border p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full border grid place-items-center">
              <span className="font-semibold">+500</span>
            </div>
            <div>
              <div className="font-medium">Daily check-in</div>
              <div className="text-sm text-gray-600">
                Come back every day to earn 500 points.
              </div>
            </div>
          </div>

          <form action={claimDailyAction}>
            <button className="rounded-lg bg-black text-white px-4 py-2 font-medium">
              Claim +500
            </button>
          </form>
        </div>
      )}

      {showProfileComplete && (
        <div className="rounded-xl border p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full border grid place-items-center">
              <span className="font-semibold">+100</span>
            </div>
            <div>
              <div className="font-medium">Profile complete</div>
              <div className="text-sm text-gray-600">
                Add an avatar and a username to earn a one-time bonus.
              </div>
            </div>
          </div>

          <form action={claimProfileCompleteAction}>
            <button className="rounded-lg bg-black text-white px-4 py-2 font-medium">
              Claim +100
            </button>
          </form>
        </div>
      )}

      {nothingToClaim && (
        <div className="rounded-xl border p-5 text-center text-sm text-gray-600">
          🎉 All caught up — no claimables right now.
        </div>
      )}
    </div>
  );
}

function ActivityPanel({ history }: { history: HistoryRow[] }) {
  if (!history?.length) {
    return (
      <div className="rounded-lg border p-6 text-center text-gray-500">
        No point activity yet.
      </div>
    );
  }

  return (
    <div className="rounded-lg border overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-gray-50">
          <tr className="text-left">
            <th className="px-4 py-2">Date</th>
            <th className="px-4 py-2">Type</th>
            <th className="px-4 py-2">Details</th>
            <th className="px-4 py-2 text-right">Points</th>
          </tr>
        </thead>
        <tbody>
          {history.map((row) => (
            <tr key={row.id} className="border-t">
              <td className="px-4 py-2">{new Date(row.created_at).toLocaleString()}</td>
              <td className="px-4 py-2 capitalize">{row.type.replace(/_/g, " ")}</td>
              <td className="px-4 py-2 text-gray-600">{row.metadata?.reason ?? "—"}</td>
              <td className="px-4 py-2 text-right font-medium">
                {row.points > 0 ? `+${row.points}` : row.points}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
