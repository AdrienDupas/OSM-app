/**
 * Configuration centrale de la carte OSM vectorielle.
 *
 * Ce fichier regroupe tous les paramètres modifiables :
 * - Position et zoom par défaut
 * - Source de tuiles vectorielles (OpenFreeMap / OpenMapTiles)
 * - Palette de couleurs cartographiques
 * - Polices pour les labels
 */

// ---------------------------------------------------------------------------
// Position & zoom
// ---------------------------------------------------------------------------

/** Centre par défaut de la carte (longitude, latitude) – Paris, France */
export const DEFAULT_CENTER: [number, number] = [2.3522, 48.8566];

/** Niveau de zoom initial */
export const DEFAULT_ZOOM = 12;

/** Zoom minimal (vue monde) */
export const MIN_ZOOM = 2;

/** Zoom maximal (détail rue) */
export const MAX_ZOOM = 19;

// ---------------------------------------------------------------------------
// Source de tuiles vectorielles
// ---------------------------------------------------------------------------

/**
 * Configuration de la source de tuiles vectorielles.
 * Utilise OpenFreeMap (gratuit, sans clé API, schéma OpenMapTiles v3).
 */
export const TILE_CONFIG = {
  /** Identifiant de la source utilisé dans le style MapLibre */
  sourceId: 'openmaptiles',
  /** URL du TileJSON (contient les URL de tuiles, bounds, zoom max, etc.) */
  url: 'https://tiles.openfreemap.org/planet',
  /** URL du serveur de glyphes pour les labels texte */
  glyphs: 'https://tiles.openfreemap.org/fonts/{fontstack}/{range}.pbf',
};

// ---------------------------------------------------------------------------
// Palette de couleurs
// ---------------------------------------------------------------------------

/**
 * Couleurs du style cartographique, inspirées du rendu OSM Carto.
 * Modifiez ces valeurs pour personnaliser l'apparence de la carte.
 */
export const COLORS = {
  // Fond
  background: '#f8f4f0',

  // Eau
  water: '#aad3df',
  waterway: '#aad3df',

  // Occupation du sol
  park: '#c8facc',
  forest: '#add19e',
  residential: '#e8e0d8',
  commercial: '#f2dad9',
  industrial: '#ebdbe8',
  cemetery: '#aacbaf',
  hospital: '#f0d8d8',
  school: '#f0e8d8',

  // Bâtiments
  building: '#d9d0c9',
  buildingOutline: '#b9b0a9',

  // Routes – remplissage
  motorway: '#e892a2',
  trunk: '#f9b29c',
  primary: '#fcd6a4',
  secondary: '#f7fabf',
  tertiary: '#ffffff',
  minor: '#ffffff',
  service: '#ffffff',
  path: '#999999',

  // Routes – contour (casing)
  motorwayCasing: '#dc2a67',
  trunkCasing: '#c84e2f',
  primaryCasing: '#c89541',
  secondaryCasing: '#a6a639',
  tertiaryCasing: '#b3b3b3',
  minorCasing: '#cccccc',
  serviceCasing: '#dddddd',

  // Frontières administratives
  countryBorder: '#9e7bb5',
  stateBorder: '#b5a5c2',
  cityBorder: '#c5b5d2',

  // Labels
  labelDark: '#333333',
  labelMedium: '#666666',
  labelLight: '#888888',
  labelHalo: '#ffffff',
};

// ---------------------------------------------------------------------------
// Polices
// ---------------------------------------------------------------------------

/**
 * Piles de polices utilisées dans les labels.
 * Doivent correspondre aux glyphes disponibles sur le serveur (TILE_CONFIG.glyphs).
 */
export const FONTS = {
  regular: ['Noto Sans Regular'],
  bold: ['Noto Sans Bold'],
  italic: ['Noto Sans Italic'],
};
