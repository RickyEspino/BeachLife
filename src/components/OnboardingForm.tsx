// src/components/OnboardingForm.tsx
"use client";

import { useState, useMemo, FormEvent } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { createSupabaseBrowserClient } from "@/lib/supabase/browserClient";

type Props = {
  userId: string;
  email: string;
  initialUsername?: string;
  initialAvatarUrl?: string;
};

const USERNAME_REGEX = /^[a-zA-Z0-9_]{3,20}$/;

/** Downscale large images client-side (free-plan friendly). */
async function downscaleImageToJpeg(file: File, maxSize = 512): Promise<File> {
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.onload = () => resolve(reader.result as string);
    reader.readAsDataURL(file);
  });

  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const i = new Image();
    i.onload = () => resolve(i);
    i.onerror = () => reject(new Error("Failed to load image"));
    i.src = dataUrl;
  });

  const scale = Math.min(maxSize / img.width, maxSize / img.height, 1);
  const w = Math.round(img.width * scale);
  const h = Math.round(img.height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas not supported");
  ctx.drawImage(img, 0, 0, w, h);

  const blob: Blob = await new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Failed to encode image"))), "image/jpeg", 0.85)
  );

  return new File([blob], file.name.replace(/\.[^.]+$/, "") + ".jpg", {
    type: "image/jpeg",
    lastModified: Date.now(),
  });
}

export function OnboardingForm({
  userId,
  email,
  initialUsername = "",
  initialAvatarUrl = "",
}: Props) {
  const router = useRouter();
  const supabase = useMemo(createSupabaseBrowserClient, []);
  const [username, setUsername] = useState(initialUsername);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string>(initialAvatarUrl); // can be blob: or https:
  const [status, setStatus] = useState<"idle" | "saving" | "error">("idle");
  const [message, setMessage] = useState("");

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] ?? null;
    setFile(f || null);
    if (f) setPreview(URL.createObjectURL(f));
    else setPreview(initialAvatarUrl || "");
  };

  const saveProfile = async (e: FormEvent) => {
    e.preventDefault();
    setStatus("saving");
    setMessage("");

    try {
      if (!USERNAME_REGEX.test(username)) {
        throw new Error("Username must be 3–20 characters: letters, numbers, or underscores.");
      }

      const { data: taken, error: checkErr } = await supabase
        .from("profiles")
        .select("id")
        .eq("username", username)
        .neq("id", userId)
        .maybeSingle();
      if (checkErr) throw checkErr;
      if (taken) throw new Error("That username is taken. Try another.");

      let avatarUrl = initialAvatarUrl || "";
      if (file) {
        const resized = await downscaleImageToJpeg(file, 512);
        const path = `${userId}/${Date.now()}.jpg`;

        const { error: uploadErr } = await supabase.storage
          .from("avatars")
          .upload(path, resized, {
            cacheControl: "3600",
            upsert: true,
            contentType: "image/jpeg",
          });
        if (uploadErr) throw uploadErr;

        const { data: pub } = await supabase.storage.from("avatars").getPublicUrl(path);
        avatarUrl = pub.publicUrl;
        setPreview(avatarUrl); // show uploaded image
      }

      const { error: upsertErr } = await supabase.from("profiles").upsert(
        {
          id: userId,
          email,
          username,
          avatar_url: avatarUrl,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "id" }
      );
      if (upsertErr) throw upsertErr;

      router.push("/me");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Something went wrong.";
      setStatus("error");
      setMessage(msg);
    } finally {
      setStatus("idle");
    }
  };

  return (
    <form onSubmit={saveProfile} className="space-y-5" noValidate>
      {/* Avatar picker */}
      <div className="flex items-center gap-4">
        <div className="h-16 w-16 rounded-full overflow-hidden border bg-gray-50 relative">
          {preview ? (
            <Image
              src={preview}
              alt="Avatar preview"
              fill
              sizes="64px"
              className="object-cover"
              // Allows blob: URLs and avoids optimization in dev for arbitrary origins
              unoptimized
              priority
            />
          ) : (
            <div className="h-full w-full flex items-center justify-center text-xs text-gray-400">
              No avatar
            </div>
          )}
        </div>
        <div>
          <label className="block text-sm font-medium">Avatar</label>
          <input
            type="file"
            accept="image/*"
            onChange={onFileChange}
            className="mt-1 block text-sm"
          />
          <p className="mt-1 text-xs text-gray-500">JPG/PNG/WebP, ~5MB max recommended.</p>
        </div>
      </div>

      {/* Username */}
      <div>
        <label className="block text-sm font-medium">Username</label>
        <input
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value.replace(/\s+/g, "_").toLowerCase())}
          placeholder="your_handle"
          className="mt-1 w-full rounded-lg border px-3 py-2 outline-none focus:ring"
          required
          minLength={3}
          maxLength={20}
        />
        <p className="mt-1 text-xs text-gray-500">3–20 characters. Letters, numbers, or underscores.</p>
      </div>

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={status === "saving"}
          className="rounded-lg bg-black text-white px-4 py-2 font-medium disabled:opacity-60"
        >
          {status === "saving" ? "Saving…" : "Save & Continue"}
        </button>
        <button
          type="button"
          onClick={() => router.push("/me")}
          className="rounded-lg border px-4 py-2 font-medium"
        >
          Skip for now
        </button>
      </div>

      {status === "error" && message && (
        <div className="text-sm text-red-600">{message}</div>
      )}
    </form>
  );
}

export default OnboardingForm;
