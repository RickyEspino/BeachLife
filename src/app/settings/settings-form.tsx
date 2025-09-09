"use client";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function SettingsForm({ userId, initial }: { userId: string; initial: any }) {
  const supabase = createClient();
  const [displayName, setDisplayName] = useState(initial?.display_name ?? "");
  const [avatarUrl, setAvatarUrl] = useState(initial?.avatar_url ?? "");

  async function save() {
    const { error } = await supabase.from("profiles").upsert({
      id: userId, display_name: displayName, avatar_url: avatarUrl,
      updated_at: new Date().toISOString(),
    });
    if (error) alert(error.message); else alert("Saved!");
  }

  return (
    <div className="max-w-lg space-y-4">
      <h1 className="text-2xl font-bold mb-2">Settings</h1>
      <label className="block text-sm">Display Name</label>
      <input className="w-full rounded-xl bg-transparent border border-white/10 p-3"
        value={displayName} onChange={e=>setDisplayName(e.target.value)} />
      <label className="block text-sm">Avatar URL</label>
      <input className="w-full rounded-xl bg-transparent border border-white/10 p-3"
        value={avatarUrl} onChange={e=>setAvatarUrl(e.target.value)} />
      <button onClick={save} className="rounded-xl bg-sunset px-4 py-2 font-semibold">Save</button>
    </div>
  );
}
