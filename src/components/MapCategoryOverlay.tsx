"use client";
import { useMemo, useState } from 'react';
import CategoryChips, { CategoryChipOption } from './CategoryChips';
import CategoryBottomSheet, { type ListMerchant } from './CategoryBottomSheet';

interface Props {
  categories: string[];
  merchants?: ListMerchant[];
  onSelectCategories?: (categories: string[] | null) => void;
  onSelectMerchant?: (id: string) => void;
}

export default function MapCategoryOverlay({ categories, merchants = [], onSelectCategories, onSelectMerchant }: Props) {
  const options: CategoryChipOption[] = categories.map(c => ({
    id: c,
    label: c.replace(/_/g,' ').replace(/\b\w/g, s => s.toUpperCase()),
    icon: '🏷️'
  }));

  const [sheetOpen, setSheetOpen] = useState(false);
  const [sheetCat, setSheetCat] = useState<string | null>(null);

  const handleChange = (active: string[] | null) => {
    onSelectCategories?.(active && active.length ? active : null);
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
          onSelectMerchant?.(id);
          setSheetOpen(false);
        }}
      />
    </div>
  );
}
