// src/app/(app)/admin/page.tsx
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/serverClient";
import { createSupabaseServiceClient } from "@/lib/supabase/serviceClient";
import { createUserAction, deleteUserAction } from "./actions";

// Ensure Node.js (env vars available) and no caching
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const supabase = createSupabaseServerClient();

  // Require auth
  const { data: userRes } = await supabase.auth.getUser();
  const user = userRes?.user;
  if (!user) redirect("/login");

  // Require admin role from your profiles table
  const { data: profile, error: profErr } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (profErr || !profile || profile.role !== "admin") {
    redirect("/me"); // not allowed
  }

  // List users via service role
  const admin = createSupabaseServiceClient();
  const { data: list, error } = await admin.auth.admin.listUsers({
    page: 1,
    perPage: 100,
  });

  if (error) {
    // Render a friendly error rather than crashing the page
    return (
      <main className="p-6">
        <h1 className="text-2xl font-semibold">Admin</h1>
        <p className="mt-4 text-red-600">Error loading users: {error.message}</p>
        <p className="mt-2 text-sm text-gray-600">
          Ensure SUPABASE_SERVICE_ROLE_KEY is set on Vercel and this page runs on Node.js runtime.
        </p>
      </main>
    );
  }

  const users = list?.users ?? [];

  return (
    <main className="max-w-3xl mx-auto p-6">
      <h1 className="text-2xl font-semibold">Admin</h1>
      <p className="text-gray-600 mt-1">Create and delete users.</p>

      {/* Create user */}
      <section className="mt-6 rounded-xl border p-4">
        <h2 className="font-medium">Create user</h2>
        <form action={createUserAction} className="mt-3 flex gap-2">
          <input
            type="email"
            name="email"
            required
            placeholder="user@example.com"
            className="flex-1 rounded border px-3 py-2"
          />
          <button className="rounded bg-black text-white px-4 py-2">Create</button>
        </form>
      </section>

      {/* Users list */}
      <section className="mt-6 rounded-xl border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr className="text-left">
              <th className="px-4 py-2">Email</th>
              <th className="px-4 py-2">User ID</th>
              <th className="px-4 py-2">Created</th>
              <th className="px-4 py-2 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-gray-500">
                  No users found.
                </td>
              </tr>
            ) : (
              users.map((u) => (
                <tr key={u.id} className="border-t">
                  <td className="px-4 py-2">{u.email ?? "—"}</td>
                  <td className="px-4 py-2">{u.id}</td>
                  <td className="px-4 py-2">
                    {u.created_at ? new Date(u.created_at).toLocaleString() : "—"}
                  </td>
                  <td className="px-4 py-2 text-right">
                    <form action={deleteUserAction}>
                      <input type="hidden" name="user_id" value={u.id} />
                      <button className="rounded border px-3 py-1 hover:bg-gray-50">
                        Delete
                      </button>
                    </form>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </section>
    </main>
  );
}
