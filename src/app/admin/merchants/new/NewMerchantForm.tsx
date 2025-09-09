// src/app/admin/merchants/new/NewMerchantForm.tsx
"use client";

import * as React from "react";
import { useActionState } from "react";
import { useRouter } from "next/navigation";
import Toast from "@/components/Toast";

type ActionResult = { ok: boolean; message?: string; slug?: string; field?: string };

export default function NewMerchantForm({
  action,
}: {
  action: (prevState: ActionResult | null, formData: FormData) => Promise<ActionResult>;
}) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState<ActionResult, FormData>(action, null);
  const [showToast, setShowToast] = React.useState<string | null>(null);

  const slugError = state?.ok === false && state.field === "slug" ? state.message : null;

  React.useEffect(() => {
    if (state?.ok && state.message) {
      setShowToast(state.message);
      const to = setTimeout(() => {
        // Go to the merchant detail after a beat
        router.replace(`/merchants/${state.slug}`);
      }, 900);
      return () => clearTimeout(to);
    }
    if (!state?.ok && state?.message && !state?.field) {
      // generic failure
      setShowToast(state.message);
    }
  }, [state, router]);

  return (
    <>
      <form action={formAction} className="grid gap-3">
        <div className="grid gap-1">
          <label className="text-sm">Name</label>
          <input name="name" className="rounded-xl bg-transparent border border-white/10 p-3" required />
        </div>

        <div className="grid gap-1">
          <label className="text-sm">Slug</label>
          <input
            name="slug"
            className={`rounded-xl bg-transparent border p-3 ${
              slugError ? "border-red-500/70" : "border-white/10"
            }`}
            placeholder="lowercase-dashes"
            required
          />
          {slugError && <p className="text-xs text-red-400 mt-1">{slugError}</p>}
        </div>

        <div className="grid gap-1">
          <label className="text-sm">Category</label>
          <select name="category" className="rounded-xl bg-transparent border border-white/10 p-3" defaultValue="other">
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
            <input name="lat" type="number" step="any" className="w-full rounded-xl bg-transparent border border-white/10 p-3" required />
          </div>
          <div>
            <label className="text-sm">Longitude</label>
            <input name="lng" type="number" step="any" className="w-full rounded-xl bg-transparent border border-white/10 p-3" required />
          </div>
        </div>

        <div className="grid gap-1">
          <label className="text-sm">Points per scan</label>
          <input name="points_per_scan" type="number" defaultValue={50} className="rounded-xl bg-transparent border border-white/10 p-3" />
        </div>

        <div className="grid gap-1">
          <label className="text-sm">Owner Email (optional)</label>
          <input name="owner_email" type="email" placeholder="merchant-owner@example.com" className="rounded-xl bg-transparent border border-white/10 p-3" />
        </div>

        <div className="flex items-center gap-2">
          <input id="active" name="active" type="checkbox" defaultChecked />
          <label htmlFor="active">Active</label>
        </div>

        <button
          disabled={pending}
          className="rounded-xl bg-seafoam px-4 py-2 font-semibold mt-2 disabled:opacity-60"
        >
          {pending ? "Creating..." : "Create Merchant"}
        </button>
      </form>

      <Toast open={!!showToast} onClose={() => setShowToast(null)}>
        {showToast}
      </Toast>
    </>
  );
}
