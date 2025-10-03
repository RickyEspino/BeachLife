import NextImage from 'next/image';
import { resolveMerchantCategoryIcon } from '@/lib/merchantCategoryIcons';

export function MerchantPinIcon({ category }: { category?: string | null }) {
  const file = resolveMerchantCategoryIcon(category);
  return (
    <span className="block h-12 w-12 -translate-y-2">
      <NextImage
        src={`/img/map-pins/${file}`}
        alt={category ? `${category} merchant` : 'Merchant'}
        width={48}
        height={48}
        className="h-12 w-12 select-none drop-shadow-[0_4px_8px_rgba(0,0,0,0.25)]"
        draggable={false}
        loading="lazy"
      />
    </span>
  );
}

export default MerchantPinIcon;
