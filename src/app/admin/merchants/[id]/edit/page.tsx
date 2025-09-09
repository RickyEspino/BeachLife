// src/app/admin/merchants/[id]/edit/page.tsx
import { redirect, notFound } from "next/navigation";
import { createServerClientSupabase } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

async function requireAdmin() {
  const supabase = createServerClientSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: prof } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (!prof || prof.role !== "admin") redirect("/");
  return supabase;
}

async function updateMerchantAction(formData: FormData) {
  "use server";
  const supabase = await requireAdmin();

  const id = String(formData.get("id") || "");
  const name = String(formData.get("name") || "").trim();
  const slug = String(formData.get("slug") || "").trim().toLowerCase();
  const active = !!formData.get("active");
  const points_per_scan = Number(formData.get("points_per_scan") || 50);
  const offer = String(formData.get("offer") || "").trim() || null;
  const how_to_earn = String(formData.get("how_to_earn") || "").trim() || null;

  if (!id || !name || !slug) {
    redirect(`/admin/merchants/${id}/edit`);
  }

  // Optional: ensure slug unique for *other* records
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

  redirect("/admin");
}

export default async function EditMerchantPage({ params }: { params: { id: string } }) {
  const supabase = await requireAdmin();
  const { data: m } = await supabase
    .from("merchants")
    .select("id, name, slug, active, points_per_scan, offer, how_to_earn")
    .eq("id", params.id)
    .maybeSingle();

  if (!m) notFound();

  return (
    <div className="max-w-2xl p-6">
      <h1 className="text-2xl font-bold mb-4">Edit Merchant</h1>
      <form action={updateMerchantAction} className="grid gap-3">
        <input type="hidden" name="id" value={m.id} />
        <div className="grid gap-1">
          <label className="text-sm">Name</label>
          <input name="name" defaultValue={m.name} className="rounded-xl bg-transparent border border-white/10 p-3" required />
        </div>
        <div className="grid gap-1">
          <label className="text-sm">Slug</label>
          <input name="slug" defaultValue={m.slug} className="rounded-xl bg-transparent border border-white/10 p-3" required />
        </div>
        <div className="grid gap-1">
          <label className="text-sm">Offer (public)</label>
          <input name="offer" defaultValue={m.offer ?? ""} className="rounded-xl bg-transparent border border-white/10 p-3" />
        </div>
        <div className="grid gap-1">
          <label className="text-sm">How to earn (public)</label>
          <textarea name="how_to_earn" defaultValue={m.how_to_earn ?? ""} className="rounded-xl bg-transparent border border-white/10 p-3" rows={3} />
        </div>
        <div className="grid gap-1">
          <label className="text-sm">Points per scan</label>
          <input name="points_per_scan" type="number" defaultValue={m.points_per_scan} className="rounded-xl bg-transparent border border-white/10 p-3" />
        </div>
        <div className="flex items-center gap-2">
          <input id="active" name="active" type="checkbox" defaultChecked={m.active} />
          <label htmlFor="active">Active</label>
        </div>
        <div className="flex gap-2">
          <button className="rounded-xl bg-seafoam px-4 py-2 font-semibold">Save</button>
          <a href="/admin" className="rounded-xl border border-white/10 px-4 py-2">Cancel</a>
        </div>
      </form>
    </div>
  );
}
