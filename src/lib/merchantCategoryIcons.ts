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
// Normalize category strings for matching: lowercase, strip non-alphanum, collapse spaces
function normalize(s: string) {
  return s
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/\//g, ' ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, '');
}

// Synonyms map (normalized key -> icon file)
const NORMALIZED_ICON_MAP: Record<string, string> = {
  // food & drink
  'seafood': 'food-seafood.svg',
  'casualdining': 'food-casual.svg', 'casual': 'food-casual.svg', 'dining': 'food-casual.svg', 'restaurant': 'food-casual.svg',
  'coffee': 'drink-coffee.svg', 'cafe': 'drink-coffee.svg',
  'cocktailsbars': 'drink-cocktail.svg', 'bar': 'drink-cocktail.svg', 'bars': 'drink-cocktail.svg', 'cocktails': 'drink-cocktail.svg', 'nightlife': 'drink-cocktail.svg',
  // retail
  'shopping': 'retail-shopping.svg', 'retail': 'retail-shopping.svg', 'store': 'retail-shopping.svg', 'stores': 'retail-shopping.svg',
  'souvenirs': 'retail-souvenir.svg', 'souvenir': 'retail-souvenir.svg',
  'apparel': 'retail-apparel.svg', 'clothing': 'retail-apparel.svg', 'boutique': 'retail-apparel.svg',
  // attractions
  'attractions': 'attraction-general.svg', 'attraction': 'attraction-general.svg', 'activities': 'attraction-general.svg',
  'golf': 'attraction-golf.svg',
  'fishing': 'attraction-fishing.svg', 'charterfishing': 'attraction-fishing.svg',
  // beach & wellness
  'beachservices': 'beach-services.svg', 'beach': 'beach-services.svg',
  'spa': 'wellness-spa.svg',
  'fitness': 'wellness-fitness.svg', 'gym': 'wellness-fitness.svg',
  'yoga': 'wellness-yoga.svg',
  // lodging & rentals
  'hotels': 'lodging-hotel.svg', 'hotel': 'lodging-hotel.svg',
  'vacationrentals': 'lodging-rental.svg', 'rentalhome': 'lodging-rental.svg', 'rental': 'lodging-rental.svg',
  'scooterbikerentals': 'rental-scooter.svg', 'bikerental': 'rental-scooter.svg', 'scooterrental': 'rental-scooter.svg',
  // services
  'maintenance': 'services-maintenance.svg', 'service': 'services-maintenance.svg', 'services': 'services-maintenance.svg',
  'transport': 'services-transport.svg', 'shuttle': 'services-transport.svg', 'taxi': 'services-transport.svg',
  'photographytours': 'services-photography.svg', 'photography': 'services-photography.svg', 'tours': 'services-photography.svg',
  // events
  'livemusic': 'events-music.svg', 'music': 'events-music.svg',
  'theatershows': 'events-theater.svg', 'theater': 'events-theater.svg', 'shows': 'events-theater.svg',
  'seasonalevents': 'events-seasonal.svg', 'festival': 'events-seasonal.svg', 'events': 'events-seasonal.svg'
};

export function resolveMerchantCategoryIcon(category?: string | null): string {
  if (!category) return DEFAULT_MERCHANT_ICON;
  // 1) Exact key match (original labels)
  const exact = CATEGORY_ICON_MAP[category];
  if (exact) return exact;
  // 2) Normalized match on full string
  const norm = normalize(category);
  if (NORMALIZED_ICON_MAP[norm]) return NORMALIZED_ICON_MAP[norm];
  // 3) Try partial token contains
  for (const [key, file] of Object.entries(NORMALIZED_ICON_MAP)) {
    if (norm.includes(key)) return file;
  }
  return DEFAULT_MERCHANT_ICON;
}
