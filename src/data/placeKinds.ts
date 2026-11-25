// Shared by the app and scripts/sync-places.ts, so this file must not import anything at runtime.

export const CATEGORIES = [
  'food',
  'night-market',
  'nature',
  'hot-spring',
  'history',
  'shopping',
  'fun',
  'stay',
  'other',
] as const;

export type Category = (typeof CATEGORIES)[number];

export const CATEGORY_LABELS: Record<Category, { label: string; short: string }> = {
  food: { label: 'Food & Drink', short: 'Food' },
  'night-market': { label: 'Night Markets', short: 'Night markets' },
  nature: { label: 'Nature & Scenery', short: 'Nature' },
  'hot-spring': { label: 'Hot Springs', short: 'Hot springs' },
  history: { label: 'Temples & History', short: 'Temples' },
  shopping: { label: 'Shopping & Neighborhoods', short: 'Shopping' },
  fun: { label: 'Attractions & Fun', short: 'Attractions' },
  stay: { label: 'Stay & Transport', short: 'Stay & transport' },
  other: { label: 'Uncategorized', short: 'Other' },
};

/** A more specific icon within a category; places without one use the category's icon. */
export type Kind =
  | 'noodles'
  | 'coffee'
  | 'tea'
  | 'dessert'
  | 'bakery'
  | 'waterfall'
  | 'beach'
  | 'hiking'
  | 'island'
  | 'forest'
  | 'cable-car'
  | 'gallery'
  | 'scooter'
  | 'car';

export interface Classification {
  category: Category;
  kind?: Kind;
}

export interface PlaceOverride {
  /** Display name, e.g. an English name for a place saved under its Chinese name. */
  name?: string;
  category?: Category;
  /** `null` drops an automatically picked kind. */
  kind?: Kind | null;
  /** Whether this is the same place as a scooter route stop; decided automatically when unset. */
  onRoute?: boolean;
  hidden?: boolean;
}

interface Hints {
  name: string;
  note?: string;
  /** Google Places types, most specific first. */
  types?: string[];
}

const has = (types: string[], ...wanted: string[]) => wanted.some((t) => types.includes(t));

function kindOf(text: string, types: string[], category: Category): Kind | undefined {
  if (category === 'food') {
    if (has(types, 'ramen_restaurant') || /noodle|ramen|麵/i.test(text)) return 'noodles';
    if (has(types, 'cafe', 'coffee_shop') || /coffee|café|cafe|咖啡/i.test(text)) return 'coffee';
    if (has(types, 'tea_house') || /\btea\b|茶/i.test(text)) return 'tea';
    if (
      has(types, 'ice_cream_shop', 'dessert_shop', 'dessert_restaurant') ||
      /ice cream|soft serve|pudding|donut/i.test(text)
    )
      return 'dessert';
    if (has(types, 'bakery') || /bakery|\bbun\b|包子/i.test(text)) return 'bakery';
  }
  if (category === 'nature') {
    if (/falls|waterfall|瀑布/i.test(text)) return 'waterfall';
    if (has(types, 'beach') || /beach|灘/i.test(text)) return 'beach';
    if (has(types, 'hiking_area') || /trail|hike|步道|古道/i.test(text)) return 'hiking';
    if (/island|嶼|島/i.test(text)) return 'island';
    if (/forest|森林/i.test(text)) return 'forest';
  }
  if (category === 'fun') {
    if (/gondola|cable car|纜車/i.test(text)) return 'cable-car';
    if (has(types, 'art_gallery') || /gallery|art village|美術/i.test(text)) return 'gallery';
  }
  if (category === 'stay') {
    if (/scooter|motorbike|機車/i.test(text)) return 'scooter';
    if (has(types, 'car_rental') || /car rental|租車/i.test(text)) return 'car';
  }
  return undefined;
}

function categoryOf(name: string, types: string[]): Category {
  // A shop's branch name, like 饒河夜市店, isn't the market itself.
  if (/night market(?! branch)|夜市(?!店)/i.test(name)) return 'night-market';
  if (/hot spring|溫泉|温泉/i.test(name)) return 'hot-spring';
  if (/temple|shrine|宮|廟|寺/i.test(name)) return 'history';
  if (has(types, 'lodging', 'hotel', 'motel', 'hostel', 'bed_and_breakfast', 'guest_house', 'resort_hotel'))
    return 'stay';
  if (has(types, 'car_rental', 'train_station', 'bus_station', 'transit_station') || /rental|租/i.test(name))
    return 'stay';
  if (
    types.some((t) => t.endsWith('_restaurant') || t.endsWith('_shop') || t.endsWith('_cafe')) &&
    !has(types, 'gift_shop', 'clothing_store', 'shopping_mall')
  )
    return 'food';
  if (has(types, 'restaurant', 'food', 'cafe', 'coffee_shop', 'bakery', 'meal_takeaway', 'food_court', 'tea_house'))
    return 'food';
  if (has(types, 'place_of_worship', 'church', 'buddhist_temple', 'hindu_temple', 'historical_landmark', 'monument'))
    return 'history';
  if (
    has(types, 'national_park', 'state_park', 'park', 'hiking_area', 'beach', 'natural_feature', 'garden', 'lake') ||
    /park|lake|falls|beach|mountain|trail|geopark|lookout|gorge|山|湖|潭/i.test(name)
  )
    return 'nature';
  if (
    has(types, 'shopping_mall', 'store', 'market', 'gift_shop', 'clothing_store', 'book_store', 'department_store') ||
    /street|shopping|market|mall|市場/i.test(name)
  )
    return 'shopping';
  if (
    has(types, 'tourist_attraction', 'museum', 'art_gallery', 'amusement_park', 'zoo', 'aquarium', 'observation_deck')
  )
    return 'fun';
  if (/restaurant|noodle|ramen|coffee|café|cafe|bakery|pancake|dumpling|xiao long bao|kitchen|食|麵|館|餅/i.test(name))
    return 'food';
  return 'other';
}

/** Best guess from the name, the list note and, when available, Google Places types. */
export function classify({ name, note = '', types = [] }: Hints): Classification {
  const category = categoryOf(name, types);
  const kind = kindOf(`${name} ${note}`, types, category);
  return kind ? { category, kind } : { category };
}
