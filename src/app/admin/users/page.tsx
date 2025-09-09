// src/app/admin/users/page.tsx
import Link from "next/link";
import { redirect } from "next/navigation";
import { createServerClientSupabase } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

// Gate: must be admin
async function requireAdmin() {
  const supabase = createServerClientSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: prof } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  if (!prof || prof.role !== "admin") redirect("/");
  return supabase;
}

// ---------- Server action: link user(email) to merchant(slug) ----------
async function linkUserToMerchant(_: unknown, formData: FormData) {
  "use server";
  const supabase = await requireAdmin();
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const slug = String(formData.get("slug") || "").trim().toLowerCase();
  const role = String(formData.get("role") || "owner");

  if (!email || !slug) {
    return { ok: false, message: "Email and slug are required." };
  }

  // find user id via admin RPC
  const { data: rows, error: rpcErr } = await supabase
    .rpc("admin_user_inspect", { p_email: email });

  if (rpcErr || !rows || rows.length === 0 || !rows[0].user_id) {
    return { ok: false, message: "User not found for that email." };
  }
  const userId = rows[0].user_id as string;

  // find merchant id by slug
  const { data: m } = await supabase
    .from("merchants")
    .select("id, slug, name")
    .eq("slug", slug)
    .maybeSingle();
  if (!m) return { ok: false, message: "Merchant not found for that slug." };

  // insert link
  const { error: insErr } = await supabase
    .from("merchant_users")
    .insert({ merchant_id: m.id, user_id: userId, role })
    .select("merchant_id")
    .maybeSingle();
  if (insErr) {
    // on conflict do nothing? if you prefer, add a unique index (merchant_id,user_id)
    return { ok: false, message: "Could not link (maybe already linked?)." };
  }

  return { ok: true, message: `Linked ${email} → ${m.name} as ${role}` };
}

// ---------- Page ----------
export default async function AdminUsersPage({
  searchParams,
}: { searchParams: { email?: string } }) {
  const supabase = await requireAdmin();
  const email = (searchParams.email || "").trim();

  let result:
    | null
    | {
        user_id: string;
        email: string;
        created_at: string | null;
        last_sign_in_at: string | null;
        display_name: string | null;
        profile_role: string | null;
        merchant_links: number;
        merchants: Array<{ merchant_id: string; role: string; name: string; slug: string }>;
      } = null;

  if (email) {
    const { data } = await supabase
      .rpc("admin_user_inspect", { p_email: email.toLowerCase() });
    if (data && data.length > 0 && data[0].user_id) {
      const row = data[0] as any;
      result = {
        ...row,
        merchants: Array.isArray(row.merchants) ? row.merchants : [],
      };
    }
  }

  return (
    <div className="mx-auto max-w-3xl p-6 grid gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Admin · User Inspector</h1>
        <Link href="/admin/merchants/new" className="text-sm underline">
          + Add Merchant
        </Link>
      </div>

      {/* Search */}
      <form method="get" className="flex gap-2">
        <input
          name="email"
          type="email"
          required
          defaultValue={email}
          placeholder="user@example.com"
          className="flex-1 rounded-xl bg-transparent border border-white/10 p-3"
        />
        <button className="rounded-xl bg-seafoam px-4 py-2 font-semibold">
          Search
        </button>
      </form>

      {/* Result */}
      {!email ? (
        <p className="text-white/60">Enter an email to inspect.</p>
      ) : !result ? (
        <div className="rounded-2xl bg-[var(--card)] p-4 border border-white/10">
          <div className="font-semibold">No user found</div>
          <div className="text-white/60 text-sm">
            Make sure they signed in at least once or you typed the exact email.
          </div>
        </div>
      ) : (
        <div className="grid gap-4">
          <section className="rounded-2xl bg-[var(--card)] p-4 border border-white/10">
            <h2 className="font-semibold mb-2">Auth User</h2>
            <div className="grid sm:grid-cols-2 gap-x-6 gap-y-1 text-sm">
              <div><span className="text-white/60">Email:</span> {result.email}</div>
              <div><span className="text-white/60">User ID:</span> <span className="font-mono">{result.user_id}</span></div>
              <div><span className="text-white/60">Created:</span> {result.created_at ? new Date(result.created_at).toLocaleString() : "—"}</div>
              <div><span className="text-white/60">Last sign-in:</span> {result.last_sign_in_at ? new Date(result.last_sign_in_at).toLocaleString() : "—"}</div>
            </div>
          </section>

          <section className="rounded-2xl bg-[var(--card)] p-4 border border-white/10">
            <h2 className="font-semibold mb-2">Profile</h2>
            <div className="grid sm:grid-cols-2 gap-x-6 gap-y-1 text-sm">
              <div><span className="text-white/60">Display name:</span> {result.display_name ?? "—"}</div>
              <div><span className="text-white/60">Role:</span> {result.profile_role ?? "user"}</div>
            </div>
          </section>

          <section className="rounded-2xl bg-[var(--card)] p-4 border border-white/10">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold">Merchant Links</h2>
              <span className="text-xs text-white/60">{result.merchant_links} linked</span>
            </div>
            {result.merchants.length === 0 ? (
              <p className="text-white/60 mt-2">No merchant links.</p>
            ) : (
              <ul className="divide-y divide-white/5 mt-2">
                {result.merchants.map((m: any) => (
                  <li key={m.merchant_id} className="py-2 flex items-center justify-between">
                    <div>
                      <div className="font-medium">{m.name}</div>
                      <div className="text-xs text-white/60">{m.slug}</div>
                    </div>
                    <div className="text-sm">{m.role}</div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* Quick link form */}
          <section className="rounded-2xl bg-[var(--card)] p-4 border border-white/10">
            <h2 className="font-semibold mb-2">Link to Merchant</h2>
            <p className="text-white/60 text-sm mb-3">
              Link <b>{result.email}</b> to a merchant as a role.
            </p>
            <QuickLinkForm email={result.email} action={linkUserToMerchant} />
          </section>
        </div>
      )}
    </div>
  );
}

// ---------- Client mini-form ----------
function QuickLinkForm({
  email,
  action,
}: {
  email: string;
  action: (state: any, formData: FormData) => Promise<{ ok: boolean; message: string }>;
}) {
  // client-only tiny component inlined here
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const React = require("react");
  const [state, formAction] = React.useActionState(action, { ok: false, message: "" });
  const [slug, setSlug] = React.useState("");
  const [role, setRole] = React.useState("owner");

  return (
    <form action={formAction} className="flex flex-wrap gap-2 items-center">
      <input type="hidden" name="email" value={email} />
      <input
        name="slug"
        placeholder="merchant-slug"
        value={slug}
        onChange={(e:any)=>setSlug(e.target.value)}
        className="rounded-xl bg-transparent border border-white/10 p-3"
        required
      />
      <select
        name="role"
        value={role}
        onChange={(e:any)=>setRole(e.target.value)}
        className="rounded-xl bg-transparent border border-white/10 p-3"
      >
        <option value="owner">owner</option>
        <option value="manager">manager</option>
        <option value="staff">staff</option>
      </select>
      <button className="rounded-xl bg-seafoam px-4 py-2 font-semibold">Link</button>
      {state?.message && (
        <span className={`text-sm ml-2 ${state.ok ? "text-green-400" : "text-red-400"}`}>
          {state.message}
        </span>
      )}
    </form>
  );
}
