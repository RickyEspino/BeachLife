// Mapping of merchant categories/subcategories to their SVG icon filenames in /public/img/map-pins
// Extend this map as new categories are introduced.
export const CATEGORY_ICON_MAP: Record<string, string> = {
  'Seafood': 'food-seafood.svg',
  'Casual Dining': 'food-casual.svg',
  'Coffee': 'drink-coffee.svg',
  'Cocktails/Bars': 'drink-cocktail.svg',
  'Shopping': 'retail-shopping.svg',
  'Souvenirs': 'retail-souvenir.svg',
  'Apparel': 'retail-apparel.svg',
  'Attractions': 'attraction-general.svg',
  'Golf': 'attraction-golf.svg',
  'Fishing': 'attraction-fishing.svg',
  'Beach Services': 'beach-services.svg',
  'Spa': 'wellness-spa.svg',
  'Fitness': 'wellness-fitness.svg',
  'Yoga': 'wellness-yoga.svg',
  'Hotels': 'lodging-hotel.svg',
  'Vacation Rentals': 'lodging-rental.svg',
  'Scooter/Bike Rentals': 'rental-scooter.svg',
  'Maintenance': 'services-maintenance.svg',
  'Transport': 'services-transport.svg',
  'Photography/Tours': 'services-photography.svg',
  'Live Music': 'events-music.svg',
  'Theater/Shows': 'events-theater.svg',
  'Seasonal Events': 'events-seasonal.svg'
};

// Default fallback icon filename when a category is unknown
export const DEFAULT_MERCHANT_ICON = 'retail-shopping.svg';

// Resolve the filename (only the file, not the path) for a given category.
export function resolveMerchantCategoryIcon(category?: string | null): string {
  if (!category) return DEFAULT_MERCHANT_ICON;
  return CATEGORY_ICON_MAP[category] || DEFAULT_MERCHANT_ICON;
}
