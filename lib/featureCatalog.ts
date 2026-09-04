import type { ComponentType } from "react";
import { ActivityIcon, AlertIcon, WrenchIcon, PlugIcon, HistoryIcon, BoardIcon, GlobeIcon } from "@/components/icons/NavIcons";

export type FeatureSlug = "monitors" | "incidents" | "maintenances" | "integrations" | "history" | "boards" | "statusPages";

export type FeatureEntry = {
  slug: FeatureSlug;
  icon: ComponentType<{ className?: string }>;
};

export const FEATURE_CATALOG: FeatureEntry[] = [
  { slug: "monitors", icon: ActivityIcon },
  { slug: "incidents", icon: AlertIcon },
  { slug: "maintenances", icon: WrenchIcon },
  { slug: "integrations", icon: PlugIcon },
  { slug: "history", icon: HistoryIcon },
  { slug: "boards", icon: BoardIcon },
  { slug: "statusPages", icon: GlobeIcon },
];

export function resolveFeature(slug: string): FeatureEntry | undefined {
  return FEATURE_CATALOG.find((feature) => feature.slug === slug);
}
