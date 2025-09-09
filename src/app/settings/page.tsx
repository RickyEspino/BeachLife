import { createServerClientSupabase } from "@/lib/supabase/server";
import SettingsForm from "./settings-form";

export default async function Settings() {
  const supabase = createServerClientSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return <div>Please sign in.</div>;

  const { data: profile } = await supabase
    .from("profiles").select("*").eq("id", user.id).maybeSingle();

  return <SettingsForm userId={user.id} initial={profile || null} />;
}
