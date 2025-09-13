"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Toast from "@/components/Toast";

type ActionResult = { ok: boolean; message?: string; slug?: string; field?: string };

type Props = {
  action: (prevState: ActionResult | undefined, formData: FormData) => Promise<ActionResult>;
};

const initialState: ActionResult = { ok: false };

export default function NewMerchantForm({ action }: Props) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(action, initialState);

  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [toastType, setToastType] = useState<"success" | "error">("success");

  const fieldError = useMemo(() => (state?.ok ? null : state?.field ?? null), [state]);

  // client-side helpers
  function normalizeSlug(v: string) {
    return v
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-");
  }

  // guard numeric inputs
  function validNumber(n: unknown) {
    const num = typeof n === "number" ? n : Number(n);
    return Number.isFinite(num);
  }

  useEffect(() => {
    if (!state || state === initialState) return;

    if (state.ok) {
      setToastType("success");
      setToastMsg(state.message ?? "Saved!");
      const to = state.slug ? `/merchants/${state.slug}` : "/merchants";
      const t = setTimeout(() => router.push(to), 800);
      return () => clearTimeout(t);
    } else if (state.message) {
      setToastType("error");
      setToastMsg(state.message);
    }
  }, [state, router]);

  // Intercept submit to normalize inputs & add a few client checks
  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    if (pending) return; // extra guard
    // Mutate form values before passing to action
    const form = e.currentTarget;
    const fd = new FormData(form);

    // normalize slug
    const rawSlug = String(fd.get("slug") || "");
    fd.set("slug", normalizeSlug(rawSlug));

    // numbers
    const lat = fd.get("lat");
    const lng = fd.get("lng");
    const pps = fd.get("points_per_scan");

    if (!validNumber(lat) || !validNumber(lng)) {
      e.preventDefault();
      setToastType("error");
      setToastMsg("Latitude and longitude must be valid numbers.");
      return;
    }

    const ppsNum = Number(pps ?? 50);
    fd.set("points_per_scan", String(Math.max(0, ppsNum)));

    // Let the server action run with our updated FormData
    // @ts-expect-error – useActionState accepts (formData) when bound via action prop
    formAction(fd);
    e.preventDefault();
  }

  return (
    <form action={formAction} onSubmit={onSubmit} className="grid gap-3">
      <div className="grid gap-1">
        <label className="text-sm" htmlFor="name">Name</label>
        <input
          id="name"
          name="name"
          className={`rounded-xl bg-transparent border p-3 ${
            fieldError === "name" ? "border-red-500/60" : "border-white/10"
          }`}
          placeholder="Merchant name"
          aria-invalid={fieldError === "name" || undefined}
          required
          disabled={pending}
        />
        {fieldError === "name" && <p className="text-xs text-red-400">Name is required.</p>}
      </div>

      <div className="grid gap-1">
        <label className="text-sm" htmlFor="slug">Slug</label>
        <input
          id="slug"
          name="slug"
          className={`rounded-xl bg-transparent border p-3 font-mono ${
            fieldError === "slug" ? "border-red-500/60" : "border-white/10"
          }`}
          placeholder="lowercase-dashes"
          aria-invalid={fieldError === "slug" || undefined}
          onBlur={(e) => (e.currentTarget.value = normalizeSlug(e.currentTarget.value))}
          pattern="[a-z0-9-]+"
          title="Lowercase letters, numbers and dashes only"
          required
          disabled={pending}
        />
        {fieldError === "slug" && (
          <p className="text-xs text-red-400">
            {state?.message ?? "Slug is required or already taken."}
          </p>
        )}
      </div>

      <div className="grid gap-1">
        <label className="text-sm" htmlFor="category">Category</label>
        <select
          id="category"
          name="category"
          defaultValue="other"
          className="rounded-xl bg-transparent border border-white/10 p-3"
          disabled={pending}
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
          <label className="text-sm" htmlFor="lat">Latitude</label>
          <input
            id="lat"
            name="lat"
            type="number"
            step="any"
            className={`w-full rounded-xl bg-transparent border p-3 ${
              fieldError === "lat" ? "border-red-500/60" : "border-white/10"
            }`}
            aria-invalid={fieldError === "lat" || undefined}
            required
            disabled={pending}
          />
          {fieldError === "lat" && <p className="text-xs text-red-400">Latitude is required.</p>}
        </div>
        <div>
          <label className="text-sm" htmlFor="lng">Longitude</label>
          <input
            id="lng"
            name="lng"
            type="number"
            step="any"
            className={`w-full rounded-xl bg-transparent border p-3 ${
              fieldError === "lng" ? "border-red-500/60" : "border-white/10"
            }`}
            aria-invalid={fieldError === "lng" || undefined}
            required
            disabled={pending}
          />
          {fieldError === "lng" && <p className="text-xs text-red-400">Longitude is required.</p>}
        </div>
      </div>

      <div className="grid gap-1">
        <label className="text-sm" htmlFor="pps">Points per scan</label>
        <input
          id="pps"
          name="points_per_scan"
          type="number"
          defaultValue={50}
          min={0}
          className="rounded-xl bg-transparent border border-white/10 p-3"
          disabled={pending}
        />
      </div>

      <div className="grid gap-1">
        <label className="text-sm" htmlFor="owner_email">Owner Email (optional)</label>
        <input
          id="owner_email"
          name="owner_email"
          type="email"
          placeholder="merchant-owner@example.com"
          className="rounded-xl bg-transparent border border-white/10 p-3"
          disabled={pending}
        />
        <p className="text-xs text-white/50">
          If the email already exists, the user will be linked as <span className="font-mono">owner</span>.
        </p>
      </div>

      <div className="flex items-center gap-2">
        <input id="active" name="active" type="checkbox" defaultChecked disabled={pending} />
        <label htmlFor="active">Active</label>
      </div>

      <button
        disabled={pending}
        className="rounded-xl bg-seafoam px-4 py-2 font-semibold mt-2 disabled:opacity-60"
      >
        {pending ? "Creating…" : "Create Merchant"}
      </button>

      {toastMsg && (
        <Toast kind={toastType} onClose={() => setToastMsg(null)}>
          {toastMsg}
        </Toast>
      )}
    </form>
  );
}
