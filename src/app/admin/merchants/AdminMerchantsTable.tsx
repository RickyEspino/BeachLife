// src/app/admin/merchants/AdminMerchantsTable.tsx
"use client";

import React, { useOptimistic, useState } from "react";
import Toast from "@/components/Toast";

type MerchantRow = {
  id: string;
  name: string;
  slug: string;
  category: string;
  active: boolean;
  points_per_scan: number;
  updated_at: string | null;
};

type Props = {
  initialMerchants: MerchantRow[];
};

type ToastState =
  | { type: "success" | "error" | "info"; text: string }
  | null;

export default function AdminMerchantsTable({ initialMerchants }: Props) {
  // optimistic list (noop for now, but ready for future inline edits)
  const [optimisticMerchants] = useOptimistic(initialMerchants);
  // ✅ toast state is lowercase to avoid shadowing the component import
  const [toast, setToast] = useState<ToastState>(null);

  return (
    <>
      {toast && (
        <Toast kind={toast.type} onClose={() => setToast(null)}>
          {toast.text}
        </Toast>
      )}

      <div className="overflow-x-auto rounded-2xl border border-white/10">
        <table className="w-full text-sm">
          <thead className="text-white/60">
            <tr className="border-b border-white/10">
              <th className="text-left p-3">Name</th>
              <th className="text-left p-3">Slug</th>
              <th className="text-left p-3">Category</th>
              <th className="text-left p-3">Active</th>
              <th className="text-left p-3">Pts/Scan</th>
              <th className="text-left p-3">Updated</th>
              <th className="text-left p-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {optimisticMerchants.map((m) => (
              <tr key={m.id} className="border-b border-white/5 last:border-none">
                <td className="p-3">{m.name}</td>
                <td className="p-3 font-mono">{m.slug}</td>
                <td className="p-3">{m.category}</td>
                <td className="p-3">{m.active ? "✅" : "—"}</td>
                <td className="p-3">{m.points_per_scan}</td>
                <td className="p-3 text-white/60">
                  {m.updated_at ? new Date(m.updated_at).toLocaleString() : "—"}
                </td>
                <td className="p-3 flex gap-2">
                  <a className="underline" href={`/merchants/${m.slug}`}>
                    View
                  </a>
                  <a className="underline" href={`/admin/merchants/${m.id}/edit`}>
                    Edit
                  </a>
                  {/* Example toast trigger */}
                  <button
                    type="button"
                    className="underline"
                    onClick={() => setToast({ type: "info", text: "Coming soon ✨" })}
                  >
                    Quick Edit
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
