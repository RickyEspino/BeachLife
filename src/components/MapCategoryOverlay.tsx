"use client";
import { useMemo, useState } from 'react';
import CategoryChips, { CategoryChipOption } from './CategoryChips';
import CategoryBottomSheet, { type ListMerchant } from './CategoryBottomSheet';

interface Props {
  categories: string[];
  merchants?: ListMerchant[];
}

export default function MapCategoryOverlay({ categories, merchants = [] }: Props) {
  const options: CategoryChipOption[] = categories.map(c => ({
    id: c,
    label: c.replace(/_/g,' ').replace(/\b\w/g, s => s.toUpperCase()),
    icon: '🏷️'
  }));

  const [sheetOpen, setSheetOpen] = useState(false);
  const [sheetCat, setSheetCat] = useState<string | null>(null);

  const handleChange = (active: string[] | null) => {
    // DOM visibility toggle for markers
    const markers = document.querySelectorAll('[data-merchant-id]');
    markers.forEach(el => {
      const id = el.getAttribute('data-category');
      if (!active || active.length === 0) {
        (el as HTMLElement).style.display = '';
      } else {
        (el as HTMLElement).style.display = active.includes(id || '') ? '' : 'none';
      }
    });
    // Open bottom sheet if single selected category
    if (active && active.length === 1) {
      setSheetCat(active[0]);
      setSheetOpen(true);
    } else {
      setSheetOpen(false);
    }
  };

  const listMerchants: ListMerchant[] = useMemo(() => merchants, [merchants]);

  return (
    <div className="pointer-events-none absolute left-0 right-0 top-2 flex justify-center z-50">
      <div className="pointer-events-auto max-w-full w-full px-2 flex justify-center">
        <CategoryChips
          options={options}
          onChange={handleChange}
          className="w-auto max-w-[95%]"
          variant="google"
        />
      </div>
      <CategoryBottomSheet
        open={sheetOpen}
        category={sheetCat}
        merchants={listMerchants}
        onClose={() => setSheetOpen(false)}
        onSelectMerchant={(id) => {
          // Center map on this merchant's marker by clicking it programmatically
          const el = document.querySelector(`[data-merchant-id="${CSS.escape(id)}"] button`) as HTMLButtonElement | null;
          el?.click();
          setSheetOpen(false);
        }}
      />
    </div>
  );
}
