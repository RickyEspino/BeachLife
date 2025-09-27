// src/components/MerchantOnboardingForm.tsx
"use client";

import { useMemo, useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/browserClient";

type Props = {
  ownerUserId: string;
  ownerEmail: string;
};

const CATEGORIES = [
  "Restaurant",
  "Cafe",
  "Bar",
  "Retail",
  "Attraction",
  "Lodging",
  "Services",
  "Other",
];

export function MerchantOnboardingForm({ ownerUserId, ownerEmail }: Props) {
  const router = useRouter();
  const supabase = useMemo(createSupabaseBrowserClient, []);

  const [ownerFullName, setOwnerFullName] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [businessAddress, setBusinessAddress] = useState("");
  const [latitude, setLatitude] = useState<string>("");
  const [longitude, setLongitude] = useState<string>("");
  const [category, setCategory] = useState("Restaurant");

  const [status, setStatus] = useState<"idle" | "saving" | "error">("idle");
  const [message, setMessage] = useState("");

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setStatus("saving");
    setMessage("");

    try {
      if (!businessName.trim()) throw new Error("Business name is required.");

      // Parse lat/lng (optional)
      const lat = latitude ? Number(latitude) : null;
      const lng = longitude ? Number(longitude) : null;
      if (latitude && isNaN(lat!)) throw new Error("Latitude must be a number.");
      if (longitude && isNaN(lng!)) throw new Error("Longitude must be a number.");

      const { error } = await supabase.from("merchants").insert({
        owner_user_id: ownerUserId,
        owner_full_name: ownerFullName || null,
        owner_email: ownerEmail || null,
        business_name: businessName,
        business_address: businessAddress || null,
        latitude: lat,
        longitude: lng,
        category: category || null,
      });

      if (error) throw error;

      // Go to merchant dashboard
      router.push("/merchant");
    } catch (err: any) {
      setStatus("error");
      setMessage(err?.message ?? "Something went wrong.");
    } finally {
      setStatus("idle");
    }
  };

  return (
    <form onSubmit={onSubmit} className="space-y-5" noValidate>
      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium">Owner full name</label>
          <input
            type="text"
            value={ownerFullName}
            onChange={(e) => setOwnerFullName(e.target.value)}
            className="mt-1 w-full rounded-lg border px-3 py-2 outline-none focus:ring"
            placeholder="Jane Doe"
          />
        </div>

        <div>
          <label className="block text-sm font-medium">Owner email</label>
          <input
            type="email"
            value={ownerEmail}
            readOnly
            className="mt-1 w-full rounded-lg border bg-gray-50 px-3 py-2 text-gray-600"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium">Business name</label>
        <input
          type="text"
          value={businessName}
          onChange={(e) => setBusinessName(e.target.value)}
          required
          className="mt-1 w-full rounded-lg border px-3 py-2 outline-none focus:ring"
          placeholder="BeachLife Cafe"
        />
      </div>

      <div>
        <label className="block text-sm font-medium">Business address</label>
        <input
          type="text"
          value={businessAddress}
          onChange={(e) => setBusinessAddress(e.target.value)}
          className="mt-1 w-full rounded-lg border px-3 py-2 outline-none focus:ring"
          placeholder="123 Ocean Blvd, Myrtle Beach, SC"
        />
      </div>

      <div className="grid sm:grid-cols-3 gap-4">
        <div className="sm:col-span-2">
          <label className="block text-sm font-medium">Business category</label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="mt-1 w-full rounded-lg border px-3 py-2 outline-none focus:ring"
          >
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        <div className="text-xs text-gray-500 sm:pt-6">
          Choose the closest match. You can refine later.
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium">Latitude (optional)</label>
          <input
            type="number"
            step="any"
            value={latitude}
            onChange={(e) => setLatitude(e.target.value)}
            className="mt-1 w-full rounded-lg border px-3 py-2 outline-none focus:ring"
            placeholder="33.6954"
          />
        </div>
        <div>
          <label className="block text-sm font-medium">Longitude (optional)</label>
          <input
            type="number"
            step="any"
            value={longitude}
            onChange={(e) => setLongitude(e.target.value)}
            className="mt-1 w-full rounded-lg border px-3 py-2 outline-none focus:ring"
            placeholder="-78.8803"
          />
        </div>
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
          onClick={() => router.push("/merchant")}
          className="rounded-lg border px-4 py-2 font-medium"
        >
          Skip for now
        </button>
      </div>

      {status === "error" && message && (
        <div className="text-sm text-red-600">{message}</div>
      )}

      <p className="text-xs text-gray-500">
        Tip: You can add a map picker later; for now, lat/lng will place your pin.
      </p>
    </form>
  );
}
