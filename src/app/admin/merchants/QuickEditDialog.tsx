// src/app/admin/merchants/QuickEditDialog.tsx
"use client";

import React, { useActionState, useEffect, useState } from "react";
import Toast from "@/components/Toast";

type Merchant = {
  id: string;
  name: string;
  slug: string;
  category: string;
  active: boolean;
  points_per_scan: number;
};

type Props = {
  open: boolean;
  onClose: () => void;
  merchant: Merchant | null;
  /** Optional: called after a successful save to refresh the table */
  onSaved?: (updated: Merchant) => void;
};

type ActionState =
  | { ok: true; data: Merchant; message?: string }
  | { ok: false; field?: string; message: string }
  | null;

async function saveMerchant(prevState: ActionState, formData: FormData): Promise<ActionState> {
  "use server";
  // NOTE: Replace this with your real server action to update the row.
  // Here we just echo back the payload so the dialog/UI wiring compiles.
  try {
    const updated: Merchant = {
      id: String(formData.get("id")),
      name: String(formData.get("name") || ""),
      slug: String(formData.get("slug") || ""),
      category: String(formData.get("category") || "other"),
      active: Boolean(formData.get("active")),
      points_per_scan: Number(formData.get("points_per_scan") || 50),
    };
    if (!updated.name) return { ok: false, field: "name", message: "Name is required." };
    if (!updated.slug) return { ok: false, field: "slug", message: "Slug is required." };
    return { ok: true, data: updated, message: "Saved!" };
  } catch {
    return { ok: false, message: "Failed to save. Try again." };
  }
}

export default function QuickEditDialog({ open, onClose, merchant, onSaved }: Props) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(saveMerchant, null);

  const [msg, setMsg] = useState<{ kind: "success" | "error" | "info"; text: string } | null>(null);
  const [local, setLocal] = useState<Merchant | null>(merchant);

  useEffect(() => setLocal(merchant), [merchant]);

  useEffect(() => {
    if (!state) return;
    if (state.ok) {
      setMsg({ kind: "success", text: state.message || "Saved!" });
      if (onSaved) onSaved(state.data);
      // Close a beat after success
      const t = setTimeout(onClose, 600);
      return () => clearTimeout(t);
    } else {
      setMsg({ kind: "error", text: state.message });
    }
  }, [state, onClose, onSaved]);

  if (!open || !local) return null;

  return (
    <>
      {msg && (
        <Toast kind={msg.kind} onClose={() => setMsg(null)}>
          {msg.text}
        </Toast>
      )}

      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/50 z-40" onClick={onClose} />

      {/* Dialog */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="w-full max-w-lg rounded-2xl border border-white/10 bg-[var(--card,#0b0b0c)] shadow-soft">
          <div className="flex items-center justify-between p-4 border-b border-white/10">
            <h2 className="text-lg font-semibold">Quick Edit – {local.name}</h2>
            <button
              type="button"
              className="text-white/70 hover:text-white"
              onClick={onClose}
              aria-label="Close"
            >
              ✕
            </button>
          </div>

          <form action={formAction} className="p-4 grid gap-3">
            <input type="hidden" name="id" value={local.id} />

            <label className="grid gap-1">
              <span className="text-sm text-white/80">Name</span>
              <input
                name="name"
                defaultValue={local.name}
                className="rounded-xl bg-transparent border border-white/10 p-3"
                required
              />
            </label>

            <label className="grid gap-1">
              <span className="text-sm text-white/80">Slug</span>
              <input
                name="slug"
                defaultValue={local.slug}
                className="rounded-xl bg-transparent border border-white/10 p-3"
                required
              />
            </label>

            <label className="grid gap-1">
              <span className="text-sm text-white/80">Category</span>
              <select
                name="category"
                defaultValue={local.category}
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
            </label>

            <label className="grid gap-1">
              <span className="text-sm text-white/80">Points per scan</span>
              <input
                name="points_per_scan"
                type="number"
                defaultValue={local.points_per_scan}
                className="rounded-xl bg-transparent border border-white/10 p-3"
              />
            </label>

            <label className="flex items-center gap-2">
              <input
                name="active"
                type="checkbox"
                defaultChecked={local.active}
              />
              <span>Active</span>
            </label>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl border border-white/10"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={pending}
                className="px-4 py-2 rounded-xl bg-seafoam font-semibold disabled:opacity-60"
              >
                {pending ? "Saving…" : "Save"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}
