import {
  Construction,
  Lightbulb,
  Waves,
  Droplets,
  Trash2,
  TreePine,
  ShieldAlert,
  CircleHelp,
  type LucideIcon,
} from "lucide-react";
import { CATEGORIES, type CategorySlug } from "@bantay/shared";

const ICONS: Record<CategorySlug, LucideIcon> = {
  road_damage: Construction,
  streetlight: Lightbulb,
  flooding: Waves,
  blocked_drainage: Droplets,
  garbage: Trash2,
  fallen_trees: TreePine,
  public_safety: ShieldAlert,
  other: CircleHelp,
};

export function categoryIcon(slug: string): LucideIcon {
  return ICONS[slug as CategorySlug] ?? CircleHelp;
}

export function categoryLabel(slug: string): string {
  return CATEGORIES.find((c) => c.slug === slug)?.label ?? slug;
}
