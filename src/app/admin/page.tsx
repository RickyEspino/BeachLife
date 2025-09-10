// src/app/admin/page.tsx
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default function AdminHome() {
  // Keep admin home simple — go straight to merchant list
  redirect("/admin/merchants");
}
