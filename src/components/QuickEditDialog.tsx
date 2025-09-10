// src/app/admin/merchants/QuickEditDialog.tsx
"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import Toast from "@/components/Toast";

type MerchantRow = {
  id: string;
  name: string;
  slug: string;
  category: string;
  active: boolean;
  points_per_scan: number;
};

type ActionResult = { ok: boolean; message?: string };

export default function QuickEditDialog({ merchant }: { merchant: MerchantRow }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(merchant.name);
  const [points, setPoints] = useState<number>(merchant.points_per_scan);
  const [active, setActive] = useState<boolean>(merchant.active);
  const [msg, setMsg] = useState<{ kind: "success" | "error" | "info"; text: string } | null>(null);

  const initialState: ActionResult = useMemo(() => ({ ok: false, message: "" }), []);
  const [state, submitAction, pending] = useActionState<ActionResult, FormData>(
    async (_prev, formData) => {
      try {
        const res = await fetch("/api/admin/merchants/quick-edit", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            id: merchant.id,
            name: formData.get("name"),
            points_per_scan: Number(formData.get("points_per_scan")),
            active: Boolean(formData.get("active")),
          }),
        });
        const data = (await res.json()) as ActionResult;
        return data;
      } catch {
        return { ok: false, message: "Network error." };
      }
    },
    initialState
  );

  useEffect(() => {
    if (state.message) {
      setMsg({ kind: state.ok ? "success" : "error", text: state.message });
      if (state.ok) setOpen(false);
    }
  }, [state]);

  return (
    <>
      <button
        className="underline"
        onClick={() => setOpen(true)}
        aria-label={`Quick edit ${merchant.name}`}
      >
        Edit
      </button>

      {open && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <form
            className="w-full max-w-md rounded-2xl bg-[var(--card)] border border-white/10 shadow-soft p-4 grid gap-3"
            action={(fd) => {
              // keep inputs in sync with local state
              submitAction(fd);
            }}
            onSubmit={(e) => {
              // preload values to FormData for booleans/numbers
              const form = e.currentTarget as HTMLFormElement;
              const fd = new FormData(form);
              fd.set("name", name);
              fd.set("points_per_scan", String(points));
              if (active) fd.set("active", "on"); else fd.delete("active");
            }}
          >
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">Quick edit</h3>
              <button type="button" onClick={() => setOpen(false)} className="text-white/60">
                Close
              </button>
            </div>

            <label className="grid gap-1">
              <span className="text-sm text-white/70">Name</span>
              <input
                name="name"
                className="rounded-xl bg-transparent border border-white/10 p-3"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </label>

            <label className="grid gap-1">
              <span className="text-sm text-white/70">Points per scan</span>
              <input
                name="points_per_scan"
                type="number"
                className="rounded-xl bg-transparent border border-white/10 p-3"
                value={points}
                onChange={(e) => setPoints(Number(e.target.value))}
              />
            </label>

            <label className="inline-flex items-center gap-2">
              <input
                name="active"
                type="checkbox"
                checked={active}
                onChange={(e) => setActive(e.target.checked)}
              />
              <span>Active</span>
            </label>

            <button
              disabled={pending}
              className="rounded-xl bg-seafoam px-4 py-2 font-semibold mt-2 disabled:opacity-60"
            >
              {pending ? "Saving…" : "Save"}
            </button>
          </form>
        </div>
      )}

      {msg && (
        <Toast
          kind={msg.kind}
          show
          onClose={() => setMsg(null)}
        >
          {msg.text}
        </Toast>
      )}
    </>
  );
}
