// src/app/admin/merchants/[id]/edit/page.tsx
import { redirect, notFound } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createServerClientSupabase } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

// ---------- Admin gate ----------
async function requireAdmin() {
  const supabase = createServerClientSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: prof } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (!prof || prof.role !== "admin") redirect("/");
  return supabase;
}

// ---------- Types ----------
type Merchant = {
  id: string;
  name: string;
  slug: string;
  active: boolean;
  points_per_scan: number;
  offer: string | null;
  how_to_earn: string | null;
};

type MemberRow = {
  user_id: string;
  role: "owner" | "staff" | string;
  profile: {
    id: string;
    email: string | null;
    display_name: string | null;
  } | null;
};

// ---------- Server actions ----------
async function updateMerchantAction(formData: FormData) {
  "use server";
  const supabase = await requireAdmin();

  const id = String(formData.get("id") || "");
  const name = String(formData.get("name") || "").trim();
  const slug = String(formData.get("slug") || "").trim().toLowerCase();
  const active = !!formData.get("active");
  const points_per_scan = Number(formData.get("points_per_scan") || 50);
  const offer = (String(formData.get("offer") || "").trim() || null) as string | null;
  const how_to_earn = (String(formData.get("how_to_earn") || "").trim() || null) as
    | string
    | null;

  if (!id || !name || !slug) redirect(`/admin/merchants/${id}/edit?error=invalid`);

  // Ensure slug unique for other records
  const { data: exists } = await supabase
    .from("merchants")
    .select("id")
    .eq("slug", slug)
    .neq("id", id)
    .maybeSingle();

  if (exists) {
    redirect(`/admin/merchants/${id}/edit?error=slug`);
  }

  await supabase
    .from("merchants")
    .update({ name, slug, active, points_per_scan, offer, how_to_earn })
    .eq("id", id);

  revalidatePath(`/admin/merchants/${id}/edit`);
  redirect(`/admin/merchants/${id}/edit?ok=1`);
}

async function addMemberAction(formData: FormData) {
  "use server";
  const supabase = await requireAdmin();

  const merchant_id = String(formData.get("merchant_id") || "");
  const emailRaw = String(formData.get("email") || "").trim();
  const role = (String(formData.get("role") || "staff") as "owner" | "staff");

  if (!merchant_id || !emailRaw) {
    redirect(`/admin/merchants/${merchant_id}/edit?merr=missing`);
  }

  const email = emailRaw.toLowerCase();

  // Look up user id by email (RPC returns user_id if present)
  const { data: inspect } = await supabase.rpc("admin_user_inspect", {
    p_email: email,
  });

  const row = Array.isArray(inspect) ? inspect?.[0] : inspect;
  const user_id = (row as { user_id?: string } | null | undefined)?.user_id;

  if (!user_id) {
    redirect(
      `/admin/merchants/${merchant_id}/edit?merr=user_not_found&email=${encodeURIComponent(
        email
      )}`
    );
  }

  // Link user to merchant, avoid dupes
  await supabase
    .from("merchant_users")
    .upsert(
      { merchant_id, user_id, role },
      { onConflict: "merchant_id,user_id" }
    );

  revalidatePath(`/admin/merchants/${merchant_id}/edit`);
  redirect(`/admin/merchants/${merchant_id}/edit?mlinked=1`);
}

async function removeMemberAction(formData: FormData) {
  "use server";
  const supabase = await requireAdmin();

  const merchant_id = String(formData.get("merchant_id") || "");
  const user_id = String(formData.get("user_id") || "");

  if (!merchant_id || !user_id) {
    redirect(`/admin/merchants/${merchant_id}/edit?merr=missing`);
  }

  await supabase
    .from("merchant_users")
    .delete()
    .eq("merchant_id", merchant_id)
    .eq("user_id", user_id);

  revalidatePath(`/admin/merchants/${merchant_id}/edit`);
  redirect(`/admin/merchants/${merchant_id}/edit?mremoved=1`);
}

// ---------- Page ----------
export default async function EditMerchantPage({
  params,
}: {
  params: { id: string };
}) {
  const supabase = await requireAdmin();

  // Load merchant
  const { data: m } = await supabase
    .from("merchants")
    .select(
      "id, name, slug, active, points_per_scan, offer, how_to_earn"
    )
    .eq("id", params.id)
    .maybeSingle();

  if (!m) notFound();

  // Load members with embedded profile.
  // NOTE: Some generated types treat embedded rows as arrays; we normalize below.
  const { data: members } = await supabase
    .from("merchant_users")
    .select(
      `
        user_id,
        role,
        profile:profiles!merchant_users_user_id_fkey (
          id,
          email,
          display_name
        )
      `
    )
    .eq("merchant_id", params.id);

  // Normalize `profile` to a single object (handles array/object inference differences)
  const rows: MemberRow[] = (members ?? []).map((r: any) => {
    const p = Array.isArray(r.profile) ? (r.profile[0] ?? null) : (r.profile ?? null);
    return {
      user_id: String(r.user_id),
      role: r.role,
      profile: p
        ? {
            id: String(p.id),
            email: p.email ?? null,
            display_name: p.display_name ?? null,
          }
        : null,
    };
  });

  return (
    <div className="max-w-2xl p-6 space-y-8">
      <h1 className="text-2xl font-bold">Edit Merchant</h1>

      {/* ----- Edit merchant form ----- */}
      <form action={updateMerchantAction} className="grid gap-3">
        <input type="hidden" name="id" value={m.id} />

        <div className="grid gap-1">
          <label className="text-sm">Name</label>
          <input
            name="name"
            defaultValue={m.name}
            className="rounded-xl bg-transparent border border-white/10 p-3"
            required
          />
        </div>

        <div className="grid gap-1">
          <label className="text-sm">Slug</label>
          <input
            name="slug"
            defaultValue={m.slug}
            className="rounded-xl bg-transparent border border-white/10 p-3 font-mono"
            required
          />
          <p className="text-xs text-white/50">
            Public URL: <span className="font-mono">/merchants/{m.slug}</span>
          </p>
        </div>

        <div className="grid gap-1">
          <label className="text-sm">Offer (public)</label>
          <input
            name="offer"
            defaultValue={m.offer ?? ""}
            className="rounded-xl bg-transparent border border-white/10 p-3"
          />
        </div>

        <div className="grid gap-1">
          <label className="text-sm">How to earn (public)</label>
          <textarea
            name="how_to_earn"
            defaultValue={m.how_to_earn ?? ""}
            className="rounded-xl bg-transparent border border-white/10 p-3"
            rows={3}
          />
        </div>

        <div className="grid gap-1">
          <label className="text-sm">Points per scan</label>
          <input
            name="points_per_scan"
            type="number"
            defaultValue={m.points_per_scan}
            min={0}
            className="rounded-xl bg-transparent border border-white/10 p-3"
          />
        </div>

        <div className="flex items-center gap-2">
          <input id="active" name="active" type="checkbox" defaultChecked={m.active} />
          <label htmlFor="active">Active</label>
        </div>

        <div className="flex gap-2">
          <button className="rounded-xl bg-seafoam px-4 py-2 font-semibold">
            Save
          </button>
          <a
            href="/admin/merchants"
            className="rounded-xl border border-white/10 px-4 py-2"
          >
            Cancel
          </a>
        </div>
      </form>

      {/* ----- Member management ----- */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold">Members</h2>

        {/* Add member by email */}
        <form action={addMemberAction} className="grid gap-3 sm:grid-cols-3">
          <input type="hidden" name="merchant_id" value={m.id} />
          <div className="sm:col-span-2 grid gap-1">
            <label className="text-sm">User email</label>
            <input
              name="email"
              type="email"
              placeholder="user@example.com"
              className="rounded-xl bg-transparent border border-white/10 p-3"
              required
            />
          </div>
          <div className="grid gap-1">
            <label className="text-sm">Role</label>
            <select
              name="role"
              defaultValue="staff"
              className="rounded-xl bg-transparent border border-white/10 p-3"
            >
              <option value="owner">owner</option>
              <option value="staff">staff</option>
            </select>
          </div>
          <div className="sm:col-span-3">
            <button className="rounded-xl bg-sunset px-4 py-2 font-semibold">
              Add Member
            </button>
          </div>
        </form>

        {/* Current members */}
        {!rows.length ? (
          <p className="text-white/70">No members yet..</p>
        ) : (
          <ul className="divide-y divide-white/10 rounded-2xl border border-white/10">
            {rows.map((row) => {
              const label =
                row.profile?.display_name ||
                row.profile?.email ||
                row.user_id;
              return (
                <li
                  key={row.user_id}
                  className="flex items-center justify-between p-3"
                >
                  <div className="space-y-0.5">
                    <div className="font-medium">{label}</div>
                    <div className="text-white/60 text-sm">{row.role}</div>
                  </div>

                  <form action={removeMemberAction}>
                    <input type="hidden" name="merchant_id" value={m.id} />
                    <input type="hidden" name="user_id" value={row.user_id} />
                    <button className="rounded-xl border border-white/10 px-3 py-1.5 text-sm">
                      Remove
                    </button>
                  </form>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
