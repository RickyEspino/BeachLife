import Link from "next/link";
import { redirect } from "next/navigation";
import { createServerClientSupabase } from "@/lib/supabase/server";

// -------- Admin gate (SSR) ---------------------------------
async function requireAdmin() {
  const supabase = createServerClientSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: prof } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (!prof || prof.role !== "admin") redirect("/");
  return supabase;
}

// -------- Types --------------------------------------------
type Merchant = {
  id: string;
  slug: string;
  name: string;
  category: string | null;
  lat: number;
  lng: number;
  active: boolean;
  points_per_scan: number | null;
};

// Result type shared with the client component
export type ActionResult = {
  ok: boolean;
  message?: string;
  field?: string;
};

// -------- Server Action: update a merchant ------------------
export async function updateMerchantAction(_: any, formData: FormData): Promise<ActionResult> {
  "use server";
  const supabase = await requireAdmin();

  const id = String(formData.get("id") || "");
  const name = String(formData.get("name") || "").trim();
  const category = String(formData.get("category") || "other");
  const points = Number(formData.get("points_per_scan") || 50);
  const active = String(formData.get("active") || "false") === "true";

  if (!id) return { ok: false, message: "Missing merchant id." };
  if (!name) return { ok: false, field: "name", message: "Name is required." };
  if (Number.isNaN(points)) return { ok: false, field: "points_per_scan", message: "Points must be a number." };

  const { error } = await supabase
    .from("merchants")
    .update({
      name,
      category,
      points_per_scan: points,
      active,
    })
    .eq("id", id);

  if (error) return { ok: false, message: "Update failed. Please try again." };

  return { ok: true, message: "Merchant updated." };
}

// -------- Page: list + quick edit ---------------------------
export const dynamic = "force-dynamic";

export default async function AdminMerchantsPage() {
  const supabase = await requireAdmin();

  const { data: merchants } = await supabase
    .from("merchants")
    .select("id, slug, name, category, lat, lng, active, points_per_scan")
    .order("name", { ascending: true });

  return (
    <div className="max-w-5xl p-6 grid gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Admin · Merchants</h1>
        <Link
          href="/admin/merchants/new"
          className="rounded-xl bg-seafoam px-4 py-2 font-semibold"
        >
          + Add Merchant
        </Link>
      </div>

      <div className="rounded-2xl bg-[var(--card)] border border-white/10 shadow-soft overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-white/5">
            <tr className="text-left">
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Category</th>
              <th className="px-4 py-3">Points/Scan</th>
              <th className="px-4 py-3">Active</th>
              <th className="px-4 py-3">Slug</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {!merchants?.length && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-white/60">
                  No merchants yet. Click “Add Merchant” to create one.
                </td>
              </tr>
            )}
            {merchants?.map((m) => (
              <tr key={m.id} className="border-t border-white/5">
                <td className="px-4 py-3">{m.name}</td>
                <td className="px-4 py-3">{m.category ?? "—"}</td>
                <td className="px-4 py-3">{m.points_per_scan ?? 0}</td>
                <td className="px-4 py-3">
                  <span className={`inline-block px-2 py-0.5 rounded ${m.active ? "bg-green-600" : "bg-white/10"}`}>
                    {m.active ? "Yes" : "No"}
                  </span>
                </td>
                <td className="px-4 py-3 font-mono">{m.slug}</td>
                <td className="px-4 py-3 text-right">
                  <div className="flex justify-end gap-2">
                    <Link
                      href={`/merchants/${m.slug}`}
                      className="underline text-white/70"
                    >
                      View
                    </Link>
                    {/* Client QuickEdit dialog */}
                    {/* @ts-expect-error Server → Client prop (server action) */}
                    <QuickEdit
                      merchant={m}
                      action={updateMerchantAction}
                    />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// -------- Client component (dialog) -------------------------
"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import Toast from "@/components/Toast";

function QuickEdit({
  merchant,
  action,
}: {
  merchant: Merchant;
  action: (state: any, formData: FormData) => Promise<ActionResult>;
}) {
  const [open, setOpen] = useState(false);
  const [initial] = useState(merchant);
  const [name, setName] = useState(merchant.name);
  const [category, setCategory] = useState(merchant.category ?? "other");
  const [points, setPoints] = useState<number>(merchant.points_per_scan ?? 50);
  const [active, setActive] = useState<boolean>(!!merchant.active);

  const [result, formAction, pending] = useActionState(action, null as any);

  const [toast, setToast] = useState<{ msg: string; kind: "success" | "error" | "info" } | null>(null);

  useEffect(() => {
    if (!result) return;
    if (result.ok) {
      setToast({ msg: result.message || "Saved", kind: "success" });
      setOpen(false);
    } else {
      setToast({ msg: result.message || "Could not save", kind: "error" });
    }
  }, [result]);

  // reset form when opening
  useEffect(() => {
    if (open) {
      setName(initial.name);
      setCategory(initial.category ?? "other");
      setPoints(initial.points_per_scan ?? 50);
      setActive(!!initial.active);
    }
  }, [open, initial]);

  const categories = useMemo(
    () => ["food", "nightlife", "activity", "shopping", "golf", "events", "other"],
    []
  );

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="rounded-lg border border-white/10 px-3 py-1.5 hover:bg-white/10"
      >
        Edit
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-black/60"
          onClick={() => !pending && setOpen(false)}
        >
          <div
            className="w-full max-w-md rounded-2xl bg-[var(--card)] p-4 shadow-soft border border-white/10"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="font-semibold mb-3">Edit Merchant</h3>
            <form action={formAction} className="grid gap-3">
              <input type="hidden" name="id" value={merchant.id} />
              <div className="grid gap-1">
                <label className="text-sm">Name</label>
                <input
                  name="name"
                  className="rounded-xl bg-transparent border border-white/10 p-3"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={pending}
                  required
                />
              </div>

              <div className="grid gap-1">
                <label className="text-sm">Category</label>
                <select
                  name="category"
                  className="rounded-xl bg-transparent border border-white/10 p-3"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  disabled={pending}
                >
                  {categories.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              <div className="grid gap-1">
                <label className="text-sm">Points per scan</label>
                <input
                  name="points_per_scan"
                  type="number"
                  className="rounded-xl bg-transparent border border-white/10 p-3"
                  value={points}
                  onChange={(e) => setPoints(Number(e.target.value))}
                  disabled={pending}
                />
              </div>

              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  name="active"
                  value="true"
                  checked={active}
                  onChange={(e) => setActive(e.target.checked)}
                  disabled={pending}
                />
                Active
              </label>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="rounded-lg border border-white/10 px-3 py-2"
                  disabled={pending}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-seafoam px-4 py-2 font-semibold"
                  disabled={pending}
                >
                  {pending ? "Saving..." : "Save"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {toast && (
        <Toast kind={toast.kind} onClose={() => setToast(null)}>
          {toast.msg}
        </Toast>
      )}
    </>
  );
}
