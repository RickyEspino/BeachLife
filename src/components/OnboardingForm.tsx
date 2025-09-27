// src/components/OnboardingForm.tsx
"use client";

import { useState } from "react";
import Image from "next/image"; // replace <img> to silence Next lint warning

type InitialProfile = {
  username?: string | null;
  avatar_url?: string | null;
};

type Mode = "create" | "edit";

export type Props = {
  initialProfile?: InitialProfile;
  mode?: Mode;
};

export default function OnboardingForm({
  initialProfile = {},
  mode = "create",
}: Props) {
  const [username, setUsername] = useState(initialProfile.username ?? "");
  const [avatarUrl, setAvatarUrl] = useState(initialProfile.avatar_url ?? "");

  // TODO: wire to your existing submit/server-action logic
  // Make sure any form `action` handlers are typed as: (formData: FormData) => Promise<void>

  return (
    <form /* action={yourSubmitAction} */ className="space-y-4">
      <div>
        <label className="block text-sm text-gray-600">Username</label>
        <input
          name="username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          className="mt-1 w-full rounded border px-3 py-2"
          placeholder="beachfan123"
          required
        />
      </div>

      <div>
        <label className="block text-sm text-gray-600">Avatar URL</label>
        <input
          name="avatar_url"
          value={avatarUrl}
          onChange={(e) => setAvatarUrl(e.target.value)}
          className="mt-1 w-full rounded border px-3 py-2"
          placeholder="https://…"
        />
        {avatarUrl ? (
          <div className="mt-2">
            <Image
              src={avatarUrl}
              alt="Preview"
              width={64}
              height={64}
              className="rounded-full border object-cover"
            />
          </div>
        ) : null}
      </div>

      <button className="rounded-lg bg-black px-4 py-2 font-medium text-white">
        {mode === "edit" ? "Save changes" : "Complete onboarding"}
      </button>
    </form>
  );
}
