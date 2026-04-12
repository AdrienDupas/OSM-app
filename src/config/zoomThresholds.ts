/**
 * Seuils de zoom pour l'affichage des couches et éléments.
 *
 * La logique suit le principe d'OpenStreetMap :
 * - Aux zooms faibles (national), seules les données essentielles sont affichées
 *   pour éviter la surcharge visuelle et les problèmes de performance.
 * - Plus on zoome, plus le niveau de détail augmente progressivement.
 *
 * Chaque constante correspond au zoom minimal (`minzoom`) d'un type d'élément.
 */

// ---------------------------------------------------------------------------
// Plages de zoom nommées (pour référence)
// ---------------------------------------------------------------------------

/** Plages de zoom indicatives */
export const ZOOM_RANGES = {
  /** Zoom 0–3 : Vue monde / continent */
  WORLD: { min: 0, max: 3 },
  /** Zoom 4–6 : Vue nationale */
  NATIONAL: { min: 4, max: 6 },
  /** Zoom 7–9 : Vue régionale */
  REGIONAL: { min: 7, max: 9 },
  /** Zoom 10–12 : Vue agglomération */
  CITY: { min: 10, max: 12 },
  /** Zoom 13–15 : Vue quartier */
  NEIGHBORHOOD: { min: 13, max: 15 },
  /** Zoom 16–19 : Vue rue / détail */
  STREET: { min: 16, max: 19 },
} as const;

// ---------------------------------------------------------------------------
// Seuils de visibilité par type d'élément
// ---------------------------------------------------------------------------

/**
 * Zoom minimal d'apparition de chaque type d'élément.
 * Ajustez ces valeurs pour contrôler la densité visuelle à chaque échelle.
 */
export const VISIBILITY = {
  // --- Routes ---
  MOTORWAY: 4,
  TRUNK: 5,
  PRIMARY: 7,
  SECONDARY: 9,
  TERTIARY: 10,
  MINOR: 10,      // rues résidentielles dès zoom 10
  SERVICE: 11,      // voies de service dès zoom 11
  PATH: 13,       // chemins et pistes dès zoom 13

  // --- Éléments naturels ---
  WATER: 0,
  OCEAN: 0,
  RIVER: 8,
  STREAM: 13,
  PARK: 8,
  FOREST: 6,
  LANDUSE: 10,

  // --- Bâtiments ---
  BUILDING: 14,

  // --- Frontières ---
  COUNTRY_BORDER: 0,
  STATE_BORDER: 4,
  CITY_BORDER: 9,

  // --- Labels ---
  COUNTRY_LABEL: 2,
  STATE_LABEL: 4,
  CITY_LABEL: 6,
  TOWN_LABEL: 9,
  VILLAGE_LABEL: 11,
  SUBURB_LABEL: 10,
  STREET_LABEL: 12, // noms de rues dès zoom 12
  HOUSENUMBER: 17,
} as const;
