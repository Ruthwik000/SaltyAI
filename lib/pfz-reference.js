/**
 * Reference material for a PFZ advisory — NOT part of the advisory.
 *
 * INCOIS publishes a PFZ as a line along a thermal front, with a serial number,
 * a length, a sector and an issue date. It does not publish species, depth or a
 * suitability score, so those cannot come from the advisory itself.
 *
 * What follows is sector-level background: the species commonly landed on that
 * stretch of coast and the depth band the shelf edge sits in there. It is
 * shipped with the app, not measured today, and every surface that shows it
 * must say so. It exists so a fisherman opening a zone sees something useful
 * about their coast, not so the screen looks fuller than the data supports.
 *
 * Two rules for anything added here:
 *   1. It is never merged into the advisory's own fields.
 *   2. It is never a number that changes with the weather.
 */

/** Keyed by the sector name /api/pfz derives from INCOIS SECTORBOUN. */
export const SECTOR_REFERENCE = {
  Gujarat: {
    species: ["Bombay Duck", "Indian Mackerel", "Ribbonfish", "Penaeid Prawns"],
    depthBand: "20–70 m",
    shelfNote: "Wide shelf; trawl grounds well offshore.",
  },
  "Daman & Diu": {
    species: ["Bombay Duck", "Ribbonfish", "Croaker"],
    depthBand: "15–50 m",
    shelfNote: "Wide shelf continuing from the Gujarat grounds.",
  },
  Maharashtra: {
    species: ["Indian Mackerel", "Bombay Duck", "Pomfret", "Sardine"],
    depthBand: "20–80 m",
    shelfNote: "Broad shelf; fronts often form well offshore.",
  },
  Goa: {
    species: ["Sardine", "Indian Mackerel", "Seer Fish"],
    depthBand: "20–60 m",
    shelfNote: "Narrowing shelf with seasonal upwelling.",
  },
  Karnataka: {
    species: ["Oil Sardine", "Indian Mackerel", "Seer Fish"],
    depthBand: "20–70 m",
    shelfNote: "Strong monsoon upwelling along this coast.",
  },
  Kerala: {
    species: ["Oil Sardine", "Indian Mackerel", "Anchovy", "Tuna"],
    depthBand: "25–90 m",
    shelfNote: "Narrow shelf; upwelling grounds close inshore.",
  },
  "Tamil Nadu": {
    species: ["Seer Fish", "Tuna", "Carangids", "Sardine"],
    depthBand: "30–100 m",
    shelfNote: "Very narrow shelf; deep water close to the coast.",
  },
  Puducherry: {
    species: ["Seer Fish", "Carangids", "Sardine"],
    depthBand: "30–90 m",
    shelfNote: "Narrow shelf shared with the Tamil Nadu grounds.",
  },
  "Andhra Pradesh (south)": {
    species: ["Seer Fish", "Carangids", "Tuna", "Croaker"],
    depthBand: "30–90 m",
    shelfNote: "Narrow shelf along the southern Andhra coast.",
  },
  "Andhra Pradesh": {
    species: ["Yellowfin Tuna", "Seer Fish", "Indian Mackerel", "Carangids"],
    depthBand: "40–110 m",
    shelfNote: "Shelf edge runs close offshore of Visakhapatnam.",
  },
  Odisha: {
    species: ["Hilsa", "Croaker", "Penaeid Prawns", "Indian Mackerel"],
    depthBand: "20–70 m",
    shelfNote: "Wide shelf with strong river influence.",
  },
  "West Bengal": {
    species: ["Hilsa", "Bombay Duck", "Penaeid Prawns"],
    depthBand: "15–60 m",
    shelfNote: "Very wide, shallow shelf off the delta.",
  },
};

/**
 * Sector background for an advisory, or null when the sector is unknown.
 *
 * Callers must render the result under its own heading with the reference
 * badge — never inside the advisory's fields.
 */
export function referenceForSector(sector) {
  if (!sector) return null;
  const entry = SECTOR_REFERENCE[sector];
  if (!entry) return null;
  return {
    ...entry,
    sector,
    source: "reference",
    note: "Typical for this coast — not part of today's INCOIS advisory.",
  };
}
