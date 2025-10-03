"use client";

import { useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browserClient";

export default function AvatarDebugPage() {
  const [log, setLog] = useState<string>("");

  async function runProbe(file?: File) {
    setLog("Starting…");
    const supabase = createSupabaseBrowserClient();

    const { data: { user }, error: userErr } = await supabase.auth.getUser();
    if (userErr || !user) {
      setLog(`No session: ${userErr?.message ?? "not logged in"}`);
      return;
    }

    try {
      let blob: Blob;
      let path: string;

      if (file) {
        const ext = (file.name.split(".").pop() || "png").toLowerCase();
        path = `${user.id}/avatar.${ext}`;
        blob = file;
      } else {
        path = `${user.id}/_probe.bin`;
        blob = new Blob([new Uint8Array([1,2,3,4])], { type: "application/octet-stream" });
      }

      const { error } = await supabase
        .storage
        .from("avatars")
        .upload(path, blob, { upsert: true });

      if (error) {
        setLog(`Upload failed\npath=${path}\n${error.message}`);
      } else {
        const { data } = supabase.storage.from("avatars").getPublicUrl(path);
        setLog(`✅ Upload OK\npath=${path}\npublicUrl=${data.publicUrl}`);
      }
    } catch (e: any) {
      setLog(`Exception: ${e?.message ?? String(e)}`);
    }
  }

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-xl font-semibold">Avatar Upload Debug</h1>

      <div className="flex items-center gap-3">
        <button
          onClick={() => runProbe()}
          className="px-3 py-2 rounded bg-blue-600 text-white"
        >
          Run 4-byte probe
        </button>

        <label className="inline-flex items-center gap-2 px-3 py-2 rounded border cursor-pointer">
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) runProbe(f);
            }}
          />
          Upload actual image
        </label>
      </div>

      <pre className="whitespace-pre-wrap bg-black/5 p-3 rounded">{log}</pre>
    </div>
  );
}
