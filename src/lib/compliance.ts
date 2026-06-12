import { distanceMeters } from "./geo";
import type { School, SchoolType, Status, Venue, VenueKind } from "./types";

export const RESTRICTION_RADIUS_M = 500;

export interface ClassifiedVenue {
  venue: Venue;
  status: Status;
  nearestSchool: School | null;
  nearestDistanceM: number | null;
}

// Правило од §2: радиус до најблиското училиште. Во ≤ 500 m:
// betting_shop → restricted, сите останати → must_relocate.
export function classifyVenue(venue: Venue, schools: School[]): ClassifiedVenue {
  let nearest: School | null = null;
  let nearestDist = Infinity;
  for (const school of schools) {
    const d = distanceMeters(venue, school);
    if (d < nearestDist) {
      nearestDist = d;
      nearest = school;
    }
  }

  let status: Status;
  if (!nearest || nearestDist > RESTRICTION_RADIUS_M) {
    status = "compliant";
  } else if (venue.kind === "betting_shop") {
    status = "restricted";
  } else {
    status = "must_relocate";
  }

  return {
    venue,
    status,
    nearestSchool: nearest,
    nearestDistanceM: nearest ? nearestDist : null,
  };
}

export function classifyAll(venues: Venue[], schools: School[]): ClassifiedVenue[] {
  return venues.map((v) => classifyVenue(v, schools));
}

export const STATUS_ORDER: Status[] = ["must_relocate", "restricted", "compliant"];

export const STATUS_LABELS: Record<Status, string> = {
  compliant: "Сообразен",
  restricted: "Со ограничување",
  must_relocate: "Мора да се релоцира",
};

export const STATUS_COLORS: Record<Status, string> = {
  compliant: "#16a34a",
  restricted: "#d97706",
  must_relocate: "#dc2626",
};

// Посветли варијанти за текст врз темниот панел.
export const STATUS_COLORS_DARK: Record<Status, string> = {
  compliant: "#4ade80",
  restricted: "#fbbf24",
  must_relocate: "#f87171",
};

export const KIND_LABELS: Record<VenueKind, string> = {
  casino: "Казино",
  automat_club: "Автомат клуб",
  electronic_games: "Е-игри на среќа",
  betting_shop: "Обложувалница",
};

export const KIND_GLYPHS: Record<VenueKind, string> = {
  casino: "К",
  automat_club: "А",
  electronic_games: "Е",
  betting_shop: "О",
};

export const SCHOOL_TYPE_LABELS: Record<SchoolType, string> = {
  primary: "Основно училиште",
  secondary: "Средно училиште",
};

export const SCHOOL_COLORS: Record<SchoolType, string> = {
  primary: "#4f46e5",
  secondary: "#0891b2",
};
