import type { CardStyle } from "@/server/types";

export const CARD_THEMES: Record<CardStyle, { label: string; bg: string; ink: string; accent: string; border: string }> = {
  evergreen: { label: "Evergreen", bg: "#123d2a", ink: "#f3ead8", accent: "#d8b46a", border: "#c9a14a" },
  ivory: { label: "Ivory", bg: "#f6f0e2", ink: "#3b2f1e", accent: "#a87a22", border: "#c9a14a" },
  midnight: { label: "Midnight", bg: "#121a33", ink: "#ece6d6", accent: "#d8b46a", border: "#9c8a5a" },
};
