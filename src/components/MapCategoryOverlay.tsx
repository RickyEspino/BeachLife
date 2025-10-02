"use client";
import CategoryChips, { CategoryChipOption } from './CategoryChips';

interface Props {
  categories: string[];
}

export default function MapCategoryOverlay({ categories }: Props) {
  if (categories.length === 0) return null;
  const options: CategoryChipOption[] = categories.map(c => ({
    id: c,
    label: c.replace(/_/g,' ').replace(/\b\w/g, s => s.toUpperCase()),
    icon: '🏷️'
  }));

  return (
    <div className="pointer-events-none absolute left-0 right-0 top-2 flex justify-center z-50">
      <div className="pointer-events-auto max-w-full w-full px-2 flex justify-center">
        <CategoryChips
          options={options}
          onChange={(active) => {
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
          }}
          className="w-auto max-w-[95%]"
          variant="google"
        />
      </div>
    </div>
  );
}
