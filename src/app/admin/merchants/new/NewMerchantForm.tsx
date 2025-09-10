"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Toast from "@/components/Toast";

type ActionResult = { ok: boolean; message?: string; slug?: string; field?: string };

type Props = {
  // Server action signature from page.tsx: export async function createMerchantAction(_: any, formData: FormData)
  action: (prevState: ActionResult | undefined, formData: FormData) => Promise<ActionResult>;
};

const initialState: ActionResult = { ok: false };

export default function NewMerchantForm({ action }: Props) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(action, initialState);

  // toast state
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [toastType, setToastType] = useState<"success" | "error">("success");

  // derived field error
  const fieldError = useMemo(() => (state?.ok ? null : state?.field ?? null), [state]);

  useEffect(() => {
    if (!state || state === initialState) return;

    if (state.ok) {
      setToastType("success");
      setToastMsg(state.message ?? "Saved!");
      // route to the new merchant after a short beat so the toast is visible
      const to = state.slug ? `/merchants/${state.slug}` : "/merchants";
      const t = setTimeout(() => router.push(to), 800);
      return () => clearTimeout(t);
    } else {
      if (state.message) {
        setToastType("error");
        setToastMsg(state.message);
      }
    }
  }, [state, router]);

  return (
    <form action={formAction} className="grid gap-3">
      <div className="grid gap-1">
        <label className="text-sm">Name</label>
        <input
          name="name"
          className={`rounded-xl bg-transparent border p-3 ${
            fieldError === "name" ? "border-red-500/60" : "border-white/10"
          }`}
          placeholder="Merchant name"
          required
        />
        {fieldError === "name" && (
          <p className="text-xs text-red-400">Name is required.</p>
        )}
      </div>

      <div className="grid gap-1">
        <label className="text-sm">Slug</label>
        <input
          name="slug"
          className={`rounded-xl bg-transparent border p-3 font-mono ${
            fieldError === "slug" ? "border-red-500/60" : "border-white/10"
          }`}
          placeholder="lowercase-dashes"
          required
        />
        {fieldError === "slug" && (
          <p className="text-xs text-red-400">
            {state?.message ?? "Slug is required or already taken."}
          </p>
        )}
      </div>

      <div className="grid gap-1">
        <label className="text-sm">Category</label>
        <select
          name="category"
          defaultValue="other"
          className="rounded-xl bg-transparent border border-white/10 p-3"
        >
          <option value="food">food</option>
          <option value="nightlife">nightlife</option>
          <option value="activity">activity</option>
          <option value="shopping">shopping</option>
          <option value="golf">golf</option>
          <option value="events">events</option>
          <option value="other">other</option>
        </select>
      </div>

      <div className="grid gap-1 grid-cols-2">
        <div>
          <label className="text-sm">Latitude</label>
          <input
            name="lat"
            type="number"
            step="any"
            className={`w-full rounded-xl bg-transparent border p-3 ${
              fieldError === "lat" ? "border-red-500/60" : "border-white/10"
            }`}
            required
          />
          {fieldError === "lat" && (
            <p className="text-xs text-red-400">Latitude is required.</p>
          )}
        </div>
        <div>
          <label className="text-sm">Longitude</label>
          <input
            name="lng"
            type="number"
            step="any"
            className={`w-full rounded-xl bg-transparent border p-3 ${
              fieldError === "lng" ? "border-red-500/60" : "border-white/10"
            }`}
            required
          />
          {fieldError === "lng" && (
            <p className="text-xs text-red-400">Longitude is required.</p>
          )}
        </div>
      </div>

      <div className="grid gap-1">
        <label className="text-sm">Points per scan</label>
        <input
          name="points_per_scan"
          type="number"
          defaultValue={50}
          className="rounded-xl bg-transparent border border-white/10 p-3"
        />
      </div>

      <div className="grid gap-1">
        <label className="text-sm">Owner Email (optional)</label>
        <input
          name="owner_email"
          type="email"
          placeholder="merchant-owner@example.com"
          className="rounded-xl bg-transparent border border-white/10 p-3"
        />
      </div>

      <div className="flex items-center gap-2">
        <input id="active" name="active" type="checkbox" defaultChecked />
        <label htmlFor="active">Active</label>
      </div>

      <button
        disabled={pending}
        className="rounded-xl bg-seafoam px-4 py-2 font-semibold mt-2 disabled:opacity-60"
      >
        {pending ? "Creating…" : "Create Merchant"}
      </button>

      {/* Toast */}
      {toastMsg && (
        <Toast
          kind={toastType}
          onClose={() => setToastMsg(null)}
        >
          {toastMsg}
        </Toast>
      )}
    </form>
  );
}
