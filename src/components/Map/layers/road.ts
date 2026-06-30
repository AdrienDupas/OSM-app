/**
 * Couches des routes, chemins et voies ferrées.
 *
 * Source layer OpenMapTiles : `transportation`
 *   - Propriété `class` : motorway, trunk, primary, secondary, tertiary,
 *     minor, service, track, path, rail, transit
 *
 * Architecture du rendu :
 *   1. Voies ferrées (tirets)
 *   2. Chemins piétons et pistes (tirets fins)
 *   3. Contours (casings) de toutes les routes, du moins au plus important
 *   4. Remplissages (fills) de toutes les routes, du moins au plus important
 *
 *   Cette séparation casing/fill garantit que les routes importantes
 *   passent visuellement au-dessus des routes secondaires.
 *
 * Stratégie de zoom :
 *   - Autoroutes dès le zoom national (4+)
 *   - Routes principales zoom régional (7+)
 *   - Routes résidentielles zoom ville (13+)
 *   - Chemins piétons zoom quartier (15+)
 */
import type { LayerSpecification } from 'maplibre-gl';
import { COLORS, TILE_CONFIG } from '../../../config/mapConfig';
import { VISIBILITY } from '../../../config/zoomThresholds';

const SOURCE = TILE_CONFIG.sourceId;

// ---------------------------------------------------------------------------
// Utilitaires de construction de couches
// ---------------------------------------------------------------------------

/** Définition d'un style de route */
interface RoadStyle {
  id: string;
  classes: string[];
  minzoom: number;
  color: string;
  casingColor: string;
  /** Stops [zoom, largeur en pixels] pour le remplissage */
  width: [number, number][];
  /** Stops [zoom, largeur en pixels] pour le contour */
  casingWidth: [number, number][];
}

/** Construit un filtre MapLibre pour une ou plusieurs classes de route */
function classFilter(classes: string[]): unknown[] {
  if (classes.length === 1) {
    return ['==', ['get', 'class'], classes[0]];
  }
  return ['match', ['get', 'class'], classes, true, false];
}

/** Construit une expression d'interpolation linéaire par niveau de zoom */
function zoomInterpolation(stops: [number, number][]): unknown[] {
  return ['interpolate', ['linear'], ['zoom'], ...stops.flat()];
}

/** Crée la paire de couches [casing, fill] pour un type de route */
function createRoadPair(style: RoadStyle): [LayerSpecification, LayerSpecification] {
  const filter = classFilter(style.classes);

  const casing: LayerSpecification = {
    id: `road-${style.id}-casing`,
    type: 'line',
    source: SOURCE,
    'source-layer': 'transportation',
    minzoom: style.minzoom,
    filter,
    layout: { 'line-cap': 'round', 'line-join': 'round' },
    paint: {
      'line-color': style.casingColor,
      'line-width': zoomInterpolation(style.casingWidth),
    },
  } as LayerSpecification;

  const fill: LayerSpecification = {
    id: `road-${style.id}`,
    type: 'line',
    source: SOURCE,
    'source-layer': 'transportation',
    minzoom: style.minzoom,
    filter,
    layout: { 'line-cap': 'round', 'line-join': 'round' },
    paint: {
      'line-color': style.color,
      'line-width': zoomInterpolation(style.width),
    },
  } as LayerSpecification;

  return [casing, fill];
}

// ---------------------------------------------------------------------------
// Définitions des types de routes (du moins important au plus important)
// ---------------------------------------------------------------------------

const ROAD_STYLES: RoadStyle[] = [
  {
    id: 'service',
    classes: ['service'],
    minzoom: VISIBILITY.SERVICE,
    color: COLORS.service,
    casingColor: COLORS.serviceCasing,
    width:        [[11, 0.3], [14, 1], [16, 3], [18, 5]],
    casingWidth:  [[11, 1],   [14, 2], [16, 5], [18, 7]],
  },
  {
    id: 'minor',
    classes: ['minor'],
    minzoom: VISIBILITY.MINOR,
    color: COLORS.minor,
    casingColor: COLORS.minorCasing,
    width:        [[10, 0.2], [13, 1], [15, 3], [17, 7], [18, 10]],
    casingWidth:  [[10, 0.8], [13, 2], [15, 5], [17, 9], [18, 12]],
  },
  {
    id: 'tertiary',
    classes: ['tertiary'],
    minzoom: VISIBILITY.TERTIARY,
    color: COLORS.tertiary,
    casingColor: COLORS.tertiaryCasing,
    width:        [[10, 0.5], [12, 1], [14, 3.5], [18, 12]],
    casingWidth:  [[10, 1.5], [12, 2], [14, 5.5], [18, 14]],
  },
  {
    id: 'secondary',
    classes: ['secondary'],
    minzoom: VISIBILITY.SECONDARY,
    color: COLORS.secondary,
    casingColor: COLORS.secondaryCasing,
    width:        [[7, 0.3], [9, 0.5], [12, 1.5], [16, 5], [18, 12]],
    casingWidth:  [[7, 1],   [9, 1.5], [12, 3],   [16, 7], [18, 14]],
  },
  {
    id: 'primary',
    classes: ['primary'],
    minzoom: VISIBILITY.PRIMARY,
    color: COLORS.primary,
    casingColor: COLORS.primaryCasing,
    width:        [[7, 0.4], [10, 1.2], [14, 3.5], [18, 14]],
    casingWidth:  [[7, 1.2], [10, 2.5], [14, 5.5], [18, 16]],
  },
  {
    id: 'trunk',
    classes: ['trunk'],
    minzoom: VISIBILITY.TRUNK,
    color: COLORS.trunk,
    casingColor: COLORS.trunkCasing,
    width:        [[5, 0.4], [8, 1],   [12, 2.5], [16, 7],  [18, 16]],
    casingWidth:  [[5, 1.2], [8, 2],   [12, 4.5], [16, 9],  [18, 18]],
  },
  {
    id: 'motorway',
    classes: ['motorway'],
    minzoom: VISIBILITY.MOTORWAY,
    color: COLORS.motorway,
    casingColor: COLORS.motorwayCasing,
    width:        [[4, 0.4], [6, 0.8], [10, 1.8], [14, 4],  [18, 18]],
    casingWidth:  [[4, 1.2], [6, 2],   [10, 3.5], [14, 6],  [18, 20]],
  },
];

// ---------------------------------------------------------------------------
// Couches spéciales (chemins, rails)
// ---------------------------------------------------------------------------

/** Pistes cyclables (ligne tiretée bleue) */
const cyclewayLayer: LayerSpecification = {
  id: 'road-cycleway',
  type: 'line',
  source: SOURCE,
  'source-layer': 'transportation',
  minzoom: VISIBILITY.PATH,
  filter: [
    'all',
    ['match', ['get', 'class'], ['path'], true, false],
    ['==', ['get', 'subclass'], 'cycleway'],
  ],
  layout: { 'line-cap': 'butt', 'line-join': 'round' },
  paint: {
    'line-color': '#6fa8dc',
    'line-width': ['interpolate', ['linear'], ['zoom'], 14, 0.8, 18, 2.5],
    'line-dasharray': [3, 1.5],
  },
} as LayerSpecification;

/** Chemins et pistes (ligne tiretée) — exclut trottoirs, quais et pistes cyclables */
const pathLayer: LayerSpecification = {
  id: 'road-path',
  type: 'line',
  source: SOURCE,
  'source-layer': 'transportation',
  minzoom: VISIBILITY.PATH,
  filter: [
    'all',
    ['match', ['get', 'class'], ['path', 'track'], true, false],
    // Garder path, bridleway ; exclure footway, pedestrian, steps, corridor
    // (trottoirs), platform (quais de gare) et cycleway (rendu séparément)
    ['match', ['get', 'subclass'], ['footway', 'pedestrian', 'steps', 'corridor', 'platform', 'cycleway'], false, true],
  ],
  layout: {
    'line-cap': 'butt',
    'line-join': 'round',
  },
  paint: {
    'line-color': COLORS.path,
    'line-width': ['interpolate', ['linear'], ['zoom'], 15, 0.5, 18, 2],
    'line-dasharray': [2, 2],
  },
} as unknown as LayerSpecification;

// ---------------------------------------------------------------------------
// Assemblage final
// ---------------------------------------------------------------------------

// Pré-calcul des paires [casing, fill] pour éviter les appels en double
const allPairs = ROAD_STYLES.map((s) => createRoadPair(s));
const allCasings = allPairs.map((pair) => pair[0]);
const allFills = allPairs.map((pair) => pair[1]);

/**
 * Toutes les couches de routes, dans l'ordre de rendu :
 *   1. Chemins / pistes cyclables
 *   2. Contours (casings) du moins au plus important
 *   3. Remplissages (fills) du moins au plus important
 *
 * Les voies ferrées sont dans le fichier `rail.ts` (groupe séparé).
 */
export const roadLayers: LayerSpecification[] = [
  cyclewayLayer,
  pathLayer,
  ...allCasings,
  ...allFills,
];

/** Liste de tous les IDs de couches de routes (utilisée par le panneau de couches) */
export const roadLayerIds: string[] = roadLayers.map((l) => l.id);
