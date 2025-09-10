// src/app/admin/merchants/AdminMerchantsTable.tsx
"use client";

import { useActionState, useOptimistic, useState } from "react";
import Toast from "@/components/Toast";

type MerchantRow = {
  id: string;
  name: string;
  slug: string;
  category: string | null;
  points_per_scan: number | null;
  active: boolean | null;
};

type ActionResult = {
  ok: boolean;
  message?: string;
  field?: string;
};

type Props = {
  items: MerchantRow[];
  updateAction: (prev: unknown, form: FormData) => Promise<ActionResult>;
  deleteAction: (prev: unknown, form: FormData) => Promise<ActionResult>;
};

export default function AdminMerchantsTable({ items, updateAction, deleteAction }: Props) {
  // Optimistic local edits
  const [optimistic, setOptimistic] = useOptimistic(items);
  const [toast, setToast] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Per-row update state handler
  const [updateState, updateFormAction, updating] =
    useActionState<ActionResult, FormData>(updateAction as any, { ok: false });

  // Delete state
  const [deleteState, deleteFormAction, deleting] =
    useActionState<ActionResult, FormData>(deleteAction as any, { ok: false });

  // Surface results
  const showResult = (res?: ActionResult) => {
    if (!res) return;
    setToast({ type: res.ok ? "success" : "error", text: res.message ?? (res.ok ? "OK" : "Error") });
  };

  // Reflect server results in a toast
  if (updateState) showResult(updateState);
  if (deleteState) showResult(deleteState);

  return (
    <>
      {toast && <Toast type={toast.type} onClose={() => setToast(null)}>{toast.text}</Toast>}

      <div className="overflow-x-auto rounded-2xl border border-white/10">
        <table className="w-full text-sm">
          <thead className="bg-white/5">
            <tr>
              <th className="text-left p-3">Name</th>
              <th className="text-left p-3">Slug</th>
              <th className="text-left p-3">Category</th>
              <th className="text-right p-3">Pts/scan</th>
              <th className="text-center p-3">Active</th>
              <th className="p-3"></th>
            </tr>
          </thead>
          <tbody>
            {optimistic.map((m) => (
              <tr key={m.id} className="border-t border-white/10">
                <td className="p-2">
                  <InlineInput
                    name="name"
                    value={m.name}
                    onChange={(v) =>
                      setOptimistic((prev) =>
                        prev.map((row) => (row.id === m.id ? { ...row, name: v } : row))
                      )
                    }
                  />
                </td>
                <td className="p-2">
                  <InlineInput
                    name="slug"
                    value={m.slug}
                    onChange={(v) =>
                      setOptimistic((prev) =>
                        prev.map((row) => (row.id === m.id ? { ...row, slug: v } : row))
                      )
                    }
                  />
                </td>
                <td className="p-2 text-white/80">{m.category ?? "—"}</td>
                <td className="p-2">
                  <InlineNumber
                    name="points_per_scan"
                    value={m.points_per_scan ?? 0}
                    onChange={(v) =>
                      setOptimistic((prev) =>
                        prev.map((row) =>
                          row.id === m.id ? { ...row, points_per_scan: v } : row
                        )
                      )
                    }
                  />
                </td>
                <td className="p-2 text-center">
                  <input
                    type="checkbox"
                    checked={!!m.active}
                    onChange={(e) =>
                      setOptimistic((prev) =>
                        prev.map((row) =>
                          row.id === m.id ? { ...row, active: e.target.checked } : row
                        )
                      )
                    }
                  />
                </td>
                <td className="p-2">
                  <div className="flex gap-2 justify-end">
                    <form action={updateFormAction}>
                      <input type="hidden" name="id" value={m.id} />
                      <input type="hidden" name="name" value={m.name} />
                      <input type="hidden" name="slug" value={m.slug} />
                      <input type="hidden" name="points_per_scan" value={m.points_per_scan ?? 0} />
                      <input type="hidden" name="active" value={m.active ? "on" : ""} />
                      <button
                        className="rounded-lg border border-white/15 px-3 py-1.5 hover:bg-white/5 disabled:opacity-60"
                        disabled={updating || deleting}
                      >
                        {updating ? "Saving…" : "Save"}
                      </button>
                    </form>

                    <form
                      action={deleteFormAction}
                      onSubmit={(e) => {
                        if (!confirm("Delete this merchant?")) e.preventDefault();
                      }}
                    >
                      <input type="hidden" name="id" value={m.id} />
                      <button
                        className="rounded-lg border border-red-400/40 text-red-300 px-3 py-1.5 hover:bg-red-500/10 disabled:opacity-60"
                        disabled={updating || deleting}
                      >
                        {deleting ? "Deleting…" : "Delete"}
                      </button>
                    </form>
                  </div>
                </td>
              </tr>
            ))}

            {!optimistic.length && (
              <tr>
                <td colSpan={6} className="p-6 text-center text-white/60">
                  No merchants yet. Click “New”.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}

function InlineInput({
  value,
  onChange,
  name,
}: {
  value: string;
  name: string;
  onChange: (v: string) => void;
}) {
  return (
    <input
      name={name}
      className="w-full rounded-lg bg-transparent border border-white/10 px-2 py-1"
      value={value}
      onChange={(e) => onChange(e.target.value)}
    />
  );
}

function InlineNumber({
  value,
  onChange,
  name,
}: {
  value: number;
  name: string;
  onChange: (v: number) => void;
}) {
  return (
    <input
      name={name}
      type="number"
      className="w-28 rounded-lg bg-transparent border border-white/10 px-2 py-1 text-right"
      value={value}
      onChange={(e) => onChange(Number(e.target.value || 0))}
    />
  );
}
