import {
  BedIcon,
  Bread01Icon,
  Location01Icon,
  Restaurant01Icon,
  SparklesIcon,
  Train01Icon,
} from '@hugeicons/core-free-icons';
import type { IconSvgElement } from '@hugeicons/react';
import type { Stop } from '../data/trip';

const LABEL_ICONS: Record<string, IconSvgElement> = {
  Lunch: Restaurant01Icon,
  Dinner: Restaurant01Icon,
  Snack: Bread01Icon,
};

export function stopIcon(stop: Stop) {
  if (stop.stay) return BedIcon;
  if (stop.final) return Train01Icon;
  if (stop.suggested) return SparklesIcon;
  return LABEL_ICONS[stop.label] ?? Location01Icon;
}
