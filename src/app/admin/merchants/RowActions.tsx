"use client";

import Link from "next/link";

type MerchantMinimal = {
  id: string;
  slug: string;
};

export default function RowActions({ merchant }: { merchant: MerchantMinimal }) {
  return (
    <div className="flex items-center gap-3">
      <Link className="underline" href={`/merchants/${merchant.slug}`}>
        View
      </Link>
      <Link className="underline" href={`/admin/merchants/${merchant.id}/edit`}>
        Edit
      </Link>
    </div>
  );
}
