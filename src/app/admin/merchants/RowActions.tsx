"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import QuickEditDialog from "./QuickEditDialog";

type Merchant = {
  id: string;
  name: string;
  slug: string;
  category: string;
  active: boolean;
  points_per_scan: number;
};

export default function RowActions({ merchant }: { merchant: Merchant }) {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="underline"
      >
        Edit
      </button>

      <QuickEditDialog
        open={open}
        onClose={() => setOpen(false)}
        merchant={merchant}
        onSaved={() => {
          // Refresh the table after save
          router.refresh();
        }}
      />
    </>
  );
}
