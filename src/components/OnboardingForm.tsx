"use client";

import { useState } from "react";
import Image from "next/image";

type InitialProfile = {
  username?: string | null;
  avatar_url?: string | null;
};

type Mode = "create" | "edit";

export type Props = {
  initialProfile?: InitialProfile;
  mode?: Mode;
  /** Server action passed from the parent page */
  onSubmitAction?: (formData: FormData) => Promise<void>;
  /** Keep false to show the legacy avatar_url text field; default true to hide it (we upload above) */
  hideAvatarInput?: boolean;
};

export default function OnboardingForm({
  initialProfile = {},
  mode = "create",
  onSubmitAction,
  hideAvatarInput = true,
}: Props) {
  const [username, setUsername] = useState(initialProfile.username ?? "");
  const [avatarUrl, setAvatarUrl] = useState(initialProfile.avatar_url ?? "");

  return (
    <form action={onSubmitAction} className="space-y-4" noValidate>
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

      {!hideAvatarInput && (
        <div>
          <label className="block text-sm text-gray-600">Avatar URL</label>
          <input
            name="avatar_url"
            value={avatarUrl}
            onChange={(e) => setAvatarUrl(e.target.value)}
            className="mt-1 w-full rounded border px-3 py-2"
            placeholder="https://…"
          />
        </div>
      )}

      {avatarUrl ? (
        <div className="mt-2">
          <Image
            src={avatarUrl}
            alt="Current avatar"
            width={64}
            height={64}
            className="rounded-full border object-cover"
          />
        </div>
      ) : null}

      <button className="rounded-lg bg-black px-4 py-2 font-medium text-white">
        {mode === "edit" ? "Save changes" : "Complete onboarding"}
      </button>
    </form>
  );
}
