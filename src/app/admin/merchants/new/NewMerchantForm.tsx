"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Toast from "@/components/Toast";

// Keep this in sync with server action return type
type ActionResult = {
  ok: boolean;
  message?: string;
  slug?: string;
  field?: "name" | "slug" | "lat" | "lng";
};

type Props = {
  action: (_prevState: unknown, formData: FormData) => Promise<ActionResult>;
};

export default function NewMerchantForm({ action }: Props) {
  const router = useRouter();

  // form state via server action
  const [result, formAction, pending] = useActionState<ActionResult, FormData>(action, {
    ok: false,
  });

  // local UI state
  const [toastOpen, setToastOpen] = useState(false);
  const [toastVariant, setToastVariant] = useState<"success" | "error" | "info">("info");
  const [toastMsg, setToastMsg] = useState<string>("");

  // When the server responds, show toast & route if success
  useEffect(() => {
    if (result?.message) {
      setToastMsg(result.message);
      setToastVariant(result.ok ? "success" : "error");
      setToastOpen(true);
    }
    if (result?.ok && result.slug) {
      // small delay so the toast is visible in dev; feel free to remove
      const t = setTimeout(() => router.push(`/merchants/${result.slug}`), 600);
      return () => clearTimeout(t);
    }
  }, [result, router]);

  // For inline field error highlighting
  const errorField = result?.ok ? undefined : (result?.field as ActionResult["field"] | undefined);

  const inputClass = useMemo(
    () =>
      "rounded-xl bg-transparent border p-3 outline-none focus:ring-1 transition " +
      "border-white/10 focus:ring-white/20",
    []
  );

  const invalidClass = "border-red-500/70 focus:ring-red-500/50";

  return (
    <>
      <form action={formAction} className="grid gap-3">
        <div className="grid gap-1">
          <label className="text-sm">Name</label>
          <input
            name="name"
            className={`${inputClass} ${errorField === "name" ? invalidClass : ""}`}
            required
            aria-invalid={errorField === "name"}
          />
        </div>

        <div className="grid gap-1">
          <label className="text-sm">Slug</label>
          <input
            name="slug"
            placeholder="lowercase-dashes"
            className={`${inputClass} ${errorField === "slug" ? invalidClass : ""}`}
            required
            aria-invalid={errorField === "slug"}
          />
          <p className="text-xs text-white/50">
            This becomes the URL: <code>/merchants/&lt;slug&gt;</code>
          </p>
        </div>

        <div className="grid gap-1">
          <label className="text-sm">Category</label>
          <select name="category" defaultValue="other" className={inputClass}>
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
              className={`${inputClass} ${errorField === "lat" ? invalidClass : ""} w-full`}
              required
              aria-invalid={errorField === "lat"}
            />
          </div>
          <div>
            <label className="text-sm">Longitude</label>
            <input
              name="lng"
              type="number"
              step="any"
              className={`${inputClass} ${errorField === "lng" ? invalidClass : ""} w-full`}
              required
              aria-invalid={errorField === "lng"}
            />
          </div>
        </div>

        <div className="grid gap-1">
          <label className="text-sm">Points per scan</label>
          <input name="points_per_scan" type="number" defaultValue={50} className={inputClass} />
        </div>

        <div className="grid gap-1">
          <label className="text-sm">Owner Email (optional)</label>
          <input
            name="owner_email"
            type="email"
            placeholder="merchant-owner@example.com"
            className={inputClass}
          />
        </div>

        <div className="flex items-center gap-2">
          <input id="active" name="active" type="checkbox" defaultChecked />
          <label htmlFor="active">Active</label>
        </div>

        <button
          disabled={pending}
          className="rounded-xl bg-seafoam px-4 py-2 font-semibold disabled:opacity-60"
        >
          {pending ? "Creating..." : "Create Merchant"}
        </button>

        {!result?.ok && result?.message && (
          <p className="text-sm text-red-400">{result.message}</p>
        )}
      </form>

      <Toast
        open={toastOpen}
        onClose={() => setToastOpen(false)}
        title={toastVariant === "success" ? "Success" : "Notice"}
        description={toastMsg}
        variant={toastVariant}
      />
    </>
  );
}
