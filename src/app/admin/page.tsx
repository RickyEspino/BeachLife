// src/app/admin/page.tsx
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/serverClient";
import { inviteUserAction, deleteUserAction } from "@/app/actions/admin";

type AuthUser = {
  id: string;
  email?: string;
  created_at: string;
  last_sign_in_at: string | null;
};

export default async function AdminPage() {
  const sb = createSupabaseServerClient();

  // Require login
  const { data: { user } } = await sb.auth.getUser();
  if (!user) redirect("/login");

  // Require admin role
  const { data: me } = await sb.from("profiles").select("role, username").eq("id", user.id).single();
  if (me?.role !== "admin") redirect("/me");

  // Fetch users (auth) and decorate with profile role/username if available
  // We call the admin list via RPC through a serverless function—BUT we already have
  // server actions using the admin client. To keep it simple, read from your own tables here
  // and show a "Delete" only when email exists.
  //
  // If you want full auth listing, consider exposing a server action that
  // returns admin.auth.admin.listUsers() and call it here. For static SSR,
  // we'll do a minimal join approach:

  // Pull last 100 profiles
  const { data: profiles } = await sb
    .from("profiles")
    .select("id, email, username, role, created_at")
    .order("created_at", { ascending: false })
    .limit(100);

  return (
    <main className="min-h-[100dvh] p-6">
      <div className="mx-auto max-w-3xl space-y-6">
        <header className="flex items-end justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Admin</h1>
            <p className="text-gray-600">
              Signed in as <strong>{me?.username ?? user.email}</strong> (admin)
            </p>
          </div>
        </header>

        {/* Invite form */}
        <section className="rounded-xl border p-4">
          <h2 className="font-semibold mb-3">Invite user</h2>
          <form action={inviteUserAction} className="grid gap-3 sm:grid-cols-[1fr,1fr,auto] items-end">
            <div>
              <label className="text-sm text-gray-600">Email</label>
              <input
                name="email"
                type="email"
                required
                placeholder="user@example.com"
                className="mt-1 w-full rounded-lg border px-3 py-2"
              />
            </div>
            <div>
              <label className="text-sm text-gray-600">Username (optional)</label>
              <input
                name="username"
                type="text"
                placeholder="new_user"
                className="mt-1 w-full rounded-lg border px-3 py-2"
              />
            </div>
            <button className="h-[42px] rounded-lg bg-black text-white px-4 font-medium mt-6 sm:mt-0">
              Send invite
            </button>
          </form>
          <p className="mt-2 text-xs text-gray-500">
            Sends a Supabase invite email. A profile row is upserted with the provided username.
          </p>
        </section>

        {/* Users table (from profiles) */}
        <section className="rounded-xl border overflow-hidden">
          <div className="p-4 border-b">
            <h2 className="font-semibold">Users (latest 100)</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr className="text-left">
                  <th className="px-4 py-2">Email</th>
                  <th className="px-4 py-2">Username</th>
                  <th className="px-4 py-2">Role</th>
                  <th className="px-4 py-2">Created</th>
                  <th className="px-4 py-2"></th>
                </tr>
              </thead>
              <tbody>
                {(profiles ?? []).map((p) => (
                  <tr key={p.id} className="border-t">
                    <td className="px-4 py-2">{p.email ?? "—"}</td>
                    <td className="px-4 py-2">{p.username ?? "—"}</td>
                    <td className="px-4 py-2">{p.role}</td>
                    <td className="px-4 py-2">
                      {p.created_at ? new Date(p.created_at).toLocaleString() : "—"}
                    </td>
                    <td className="px-4 py-2 text-right">
                      <form action={deleteUserAction}>
                        <input type="hidden" name="user_id" value={p.id} />
                        <button
                          className="rounded-lg border px-3 py-1.5 text-red-600 hover:bg-red-50"
                          onClick={(e) => {
                            if (!confirm(`Delete ${p.email ?? p.username ?? p.id}?`)) e.preventDefault();
                          }}
                        >
                          Delete
                        </button>
                      </form>
                    </td>
                  </tr>
                ))}
                {(profiles ?? []).length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-6 text-center text-gray-500">
                      No users yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <p className="p-4 text-xs text-gray-500">
            Deleting removes the user’s profile/points and their Auth account.
          </p>
        </section>
      </div>
    </main>
  );
}
