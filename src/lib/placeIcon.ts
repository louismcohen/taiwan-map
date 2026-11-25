import {
  Bathtub01Icon,
  BeachIcon,
  Bread01Icon,
  BubbleTea01Icon,
  CableCarIcon,
  Car01Icon,
  ChinaTempleIcon,
  Coffee01Icon,
  FerrisWheelIcon,
  HikingIcon,
  Hotel01Icon,
  IceCreamConeIcon,
  IslandIcon,
  LanternIcon,
  Location01Icon,
  MountainIcon,
  NoodlesIcon,
  PaletteIcon,
  PineTreeIcon,
  Restaurant01Icon,
  ScooterIcon,
  ShoppingBag01Icon,
  WaterfallDownIcon,
} from '@hugeicons/core-free-icons';
import type { IconSvgElement } from '@hugeicons/react';
import type { Category, Kind } from '../data/placeKinds';

export const CATEGORY_STYLE: Record<Category, { color: string; icon: IconSvgElement }> = {
  food: { color: '#d97a1e', icon: Restaurant01Icon },
  'night-market': { color: '#c73e52', icon: LanternIcon },
  nature: { color: '#3d8b4f', icon: MountainIcon },
  'hot-spring': { color: '#2e78b0', icon: Bathtub01Icon },
  history: { color: '#9a7424', icon: ChinaTempleIcon },
  shopping: { color: '#a04f9e', icon: ShoppingBag01Icon },
  fun: { color: '#6352c4', icon: FerrisWheelIcon },
  stay: { color: '#56616f', icon: Hotel01Icon },
  other: { color: '#86827a', icon: Location01Icon },
};

const KIND_ICONS: Record<Kind, IconSvgElement> = {
  noodles: NoodlesIcon,
  coffee: Coffee01Icon,
  tea: BubbleTea01Icon,
  dessert: IceCreamConeIcon,
  bakery: Bread01Icon,
  waterfall: WaterfallDownIcon,
  beach: BeachIcon,
  hiking: HikingIcon,
  island: IslandIcon,
  forest: PineTreeIcon,
  'cable-car': CableCarIcon,
  gallery: PaletteIcon,
  scooter: ScooterIcon,
  car: Car01Icon,
};

export const placeIcon = (place: { category: Category; kind?: Kind }) =>
  (place.kind && KIND_ICONS[place.kind]) || CATEGORY_STYLE[place.category].icon;

export const placeColor = (place: { category: Category }) => CATEGORY_STYLE[place.category].color;
