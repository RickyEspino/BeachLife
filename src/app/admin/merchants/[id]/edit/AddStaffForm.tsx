// src/app/admin/merchants/[id]/edit/AddStaffForm.tsx
"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import Toast from "@/components/Toast";

type Result = { ok: boolean; message?: string; field?: string };
type Props = {
  merchantId: string;
  addAction: (prev: Result | undefined, formData: FormData) => Promise<Result>;
};

const init: Result = { ok: false };

export default function AddStaffForm({ merchantId, addAction }: Props) {
  const [state, formAction, pending] = useActionState(addAction, init);
  const [toast, setToast] = useState<{ kind: "success" | "error"; text: string } | null>(null);
  const fieldError = useMemo(() => (state?.ok ? null : state?.field ?? null), [state]);

  useEffect(() => {
    if (!state || state === init) return;
    if (state.ok) setToast({ kind: "success", text: state.message ?? "Linked!" });
    else if (state.message) setToast({ kind: "error", text: state.message });
  }, [state]);

  return (
    <form action={formAction} className="grid gap-2 mt-3">
      <input type="hidden" name="merchant_id" value={merchantId} />
      <div className="grid gap-1">
        <label className="text-sm">User email</label>
        <input
          name="email"
          type="email"
          placeholder="user@example.com"
          className={`rounded-xl bg-transparent border p-3 ${
            fieldError === "email" ? "border-red-500/60" : "border-white/10"
          }`}
          required
        />
      </div>
      <div className="grid gap-1">
        <label className="text-sm">Role</label>
        <select name="role" defaultValue="staff" className="rounded-xl bg-transparent border border-white/10 p-3">
          <option value="owner">owner</option>
          <option value="staff">staff</option>
        </select>
      </div>
      <button
        disabled={pending}
        className="rounded-xl bg-seafoam px-4 py-2 font-semibold disabled:opacity-60"
      >
        {pending ? "Linking…" : "Link user"}
      </button>

      {toast && (
        <Toast kind={toast.kind} onClose={() => setToast(null)}>
          {toast.text}
        </Toast>
      )}
    </form>
  );
}
