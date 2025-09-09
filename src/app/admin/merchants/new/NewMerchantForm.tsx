// src/app/admin/merchants/new/NewMerchantForm.tsx
"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Toast from "@/components/toast"; // <- keep lowercase to match file casing

// Keep in sync with server action’s return type
type ActionResult = {
  ok: boolean;
  message?: string;
  slug?: string;
  field?: string;
};

type Props = {
  action: (prevState: unknown, formData: FormData) => Promise<ActionResult>;
};

export default function NewMerchantForm({ action }: Props) {
  const router = useRouter();
  const [toast, setToast] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const [state, formAction, pending] = useActionState<ActionResult, FormData>(action as any, {
    ok: false,
  });

  // Inline errors
  const [fieldError, setFieldError] = useState<Record<string, string>>({});
  useEffect(() => {
    if (!state) return;

    if (state.ok && state.slug) {
      setToast({ type: "success", text: state.message ?? "Created!" });
      // A tiny delay so users see the toast before navigation
      setTimeout(() => {
        router.push(`/merchants/${state.slug}`);
      }, 300);
    } else if (!state.ok) {
      setToast({ type: "error", text: state.message ?? "Something went wrong." });
      if (state.field) setFieldError({ [state.field]: state.message ?? "Invalid value" });
    }
  }, [state, router]);

  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");

  const suggestedSlug = useMemo(
    () =>
      name
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, ""),
    [name]
  );

  return (
    <>
      {toast && <Toast type={toast.type} onClose={() => setToast(null)}>{toast.text}</Toast>}

      <form action={formAction} className="grid gap-3">
        <div className="grid gap-1">
          <label className="text-sm">Name</label>
          <input
            name="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="rounded-xl bg-transparent border border-white/10 p-3"
            required
          />
          {fieldError.name && <p className="text-sm text-red-400">{fieldError.name}</p>}
        </div>

        <div className="grid gap-1">
          <label className="text-sm">Slug</label>
          <input
            name="slug"
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            placeholder={suggestedSlug || "lowercase-dashes"}
            className="rounded-xl bg-transparent border border-white/10 p-3"
            required
          />
          <p className="text-xs text-white/50">Suggestion: {suggestedSlug || "—"}</p>
          {fieldError.slug && <p className="text-sm text-red-400">{fieldError.slug}</p>}
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
            <input
              name="lat"
              type="number"
              step="any"
              className="w-full rounded-xl bg-transparent border border-white/10 p-3"
              required
            />
            {fieldError.lat && <p className="text-sm text-red-400">{fieldError.lat}</p>}
          </div>
          <div>
            <label className="text-sm">Longitude</label>
            <input
              name="lng"
              type="number"
              step="any"
              className="w-full rounded-xl bg-transparent border border-white/10 p-3"
              required
            />
            {fieldError.lng && <p className="text-sm text-red-400">{fieldError.lng}</p>}
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
      </form>
    </>
  );
}
