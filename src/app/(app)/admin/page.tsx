// src/app/(app)/admin/page.tsx
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/serverClient";
import { createSupabaseServiceClient } from "@/lib/supabase/serviceClient";
import { createUserAction, deleteUserAction } from "./actions";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type SearchParams = { created?: string; deleted?: string; error?: string };

function isPromise<T>(val: unknown): val is Promise<T> {
  return !!val && typeof (val as Promise<T>).then === "function";
}

export default async function AdminPage({
  searchParams,
}: {
  searchParams?: SearchParams | Promise<SearchParams>;
}) {
  const supabase = createSupabaseServerClient();

  // Require auth
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Require admin role
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile || profile.role !== "admin") {
    redirect("/me");
  }

  // Normalize search params without using `any`
  const sp: SearchParams = searchParams
    ? isPromise<SearchParams>(searchParams)
      ? await searchParams
      : searchParams
    : {};

  // List users via service role (server-side only)
  const admin = createSupabaseServiceClient();
  const { data: list, error } = await admin.auth.admin.listUsers({
    page: 1,
    perPage: 100,
  });

  const users = list?.users ?? [];
  const loadError = error?.message || sp.error;

  return (
    <main className="max-w-3xl mx-auto p-6">
      <h1 className="text-2xl font-semibold">Admin</h1>
      <p className="text-gray-600 mt-1">Create and delete users.</p>

      {/* Alerts */}
      {sp.created && (
        <div className="mt-4 rounded-md border border-green-200 bg-green-50 px-4 py-2 text-green-800">
          User created successfully.
        </div>
      )}
      {sp.deleted && (
        <div className="mt-4 rounded-md border border-amber-200 bg-amber-50 px-4 py-2 text-amber-800">
          User deleted.
        </div>
      )}
      {loadError && (
        <div className="mt-4 rounded-md border border-red-200 bg-red-50 px-4 py-2 text-red-800">
          {loadError}
        </div>
      )}

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
