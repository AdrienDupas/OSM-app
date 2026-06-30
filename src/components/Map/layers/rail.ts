/**
 * Couches des voies ferrées.
 *
 * Source layer OpenMapTiles : `transportation`
 *   - `class = rail`     → chemins de fer lourds (TGV, intercités, TER, fret)
 *   - `class = transit`  → transports en commun sur rails (métro, tram…)
 *
 * Distinctions exploitées :
 *   - `subclass` : rail (défaut), narrow_gauge, preserved (historique),
 *                  funicular | subway, tram, light_rail, monorail
 *   - `service`  : yard, siding, spur, crossover → voies de garage
 *
 * Chaque sous-type est exposé comme une couche distincte pour pouvoir être
 * activé/désactivé indépendamment via le panneau de couches.
 *
 * Les voies principales (`rail-main-base` + `rail-main-hatch`) utilisent le
 * rendu classique « rails + traverses » sur deux couches superposées.
 */
import type { LayerSpecification } from 'maplibre-gl';
import { TILE_CONFIG } from '../../../config/mapConfig';

const SOURCE = TILE_CONFIG.sourceId;

// ---------------------------------------------------------------------------
// Filtres
// ---------------------------------------------------------------------------

const railMainFilter: unknown[] = [
  'all',
  ['==', ['get', 'class'], 'rail'],
  ['match', ['get', 'subclass'], ['rail', ''], true, false],
  ['!', ['has', 'service']],
];

const railServiceFilter: unknown[] = [
  'all',
  ['==', ['get', 'class'], 'rail'],
  ['has', 'service'],
];

const railNarrowFilter: unknown[] = [
  'all',
  ['==', ['get', 'class'], 'rail'],
  ['==', ['get', 'subclass'], 'narrow_gauge'],
];

const railPreservedFilter: unknown[] = [
  'all',
  ['==', ['get', 'class'], 'rail'],
  ['==', ['get', 'subclass'], 'preserved'],
];

const railFunicularFilter: unknown[] = [
  'all',
  ['==', ['get', 'class'], 'rail'],
  ['==', ['get', 'subclass'], 'funicular'],
];

const transitFilter = (sub: string): unknown[] => [
  'all',
  ['==', ['get', 'class'], 'transit'],
  ['==', ['get', 'subclass'], sub],
];

// ---------------------------------------------------------------------------
// Couches natives (depuis les tuiles vectorielles, dès z=8)
// ---------------------------------------------------------------------------

const railMainBase: LayerSpecification = {
  id: 'rail-main-base',
  type: 'line',
  source: SOURCE,
  'source-layer': 'transportation',
  minzoom: 7,
  filter: railMainFilter,
  layout: { 'line-cap': 'butt', 'line-join': 'round' },
  paint: {
    'line-color': '#3a3a3a',
    'line-width': ['interpolate', ['linear'], ['zoom'], 7, 0.6, 10, 1.2, 14, 2.2, 19, 4],
  },
} as unknown as LayerSpecification;

const railMainHatch: LayerSpecification = {
  id: 'rail-main-hatch',
  type: 'line',
  source: SOURCE,
  'source-layer': 'transportation',
  minzoom: 10,
  filter: railMainFilter,
  layout: { 'line-cap': 'butt', 'line-join': 'round' },
  paint: {
    'line-color': '#ffffff',
    'line-width': ['interpolate', ['linear'], ['zoom'], 10, 1.2, 14, 2, 18, 3.2],
    'line-dasharray': [0.4, 3],
  },
} as unknown as LayerSpecification;

const railService: LayerSpecification = {
  id: 'rail-service',
  type: 'line',
  source: SOURCE,
  'source-layer': 'transportation',
  minzoom: 12,
  filter: railServiceFilter,
  layout: { 'line-cap': 'butt', 'line-join': 'round' },
  paint: {
    'line-color': '#888888',
    'line-width': ['interpolate', ['linear'], ['zoom'], 12, 0.4, 16, 1, 19, 2],
    'line-dasharray': [3, 2],
  },
} as unknown as LayerSpecification;

const railNarrow: LayerSpecification = {
  id: 'rail-narrow',
  type: 'line',
  source: SOURCE,
  'source-layer': 'transportation',
  minzoom: 9,
  filter: railNarrowFilter,
  layout: { 'line-cap': 'butt', 'line-join': 'round' },
  paint: {
    'line-color': '#8b4513',
    'line-width': ['interpolate', ['linear'], ['zoom'], 9, 0.6, 14, 1.4, 19, 2.5],
    'line-dasharray': [4, 2],
  },
} as unknown as LayerSpecification;

const railPreserved: LayerSpecification = {
  id: 'rail-preserved',
  type: 'line',
  source: SOURCE,
  'source-layer': 'transportation',
  minzoom: 10,
  filter: railPreservedFilter,
  layout: { 'line-cap': 'butt', 'line-join': 'round' },
  paint: {
    'line-color': '#a0522d',
    'line-width': ['interpolate', ['linear'], ['zoom'], 10, 0.6, 14, 1.4, 19, 2.5],
    'line-dasharray': [2, 3],
  },
} as unknown as LayerSpecification;

const railFunicular: LayerSpecification = {
  id: 'rail-funicular',
  type: 'line',
  source: SOURCE,
  'source-layer': 'transportation',
  minzoom: 12,
  filter: railFunicularFilter,
  layout: { 'line-cap': 'butt', 'line-join': 'round' },
  paint: {
    'line-color': '#ff7f00',
    'line-width': ['interpolate', ['linear'], ['zoom'], 12, 0.8, 16, 1.6, 19, 2.6],
    'line-dasharray': [2, 1.5],
  },
} as unknown as LayerSpecification;

// Transit (métro, tram, etc.) — OMT les inclut à partir de z=10 à z=14 selon le type.
const transitSubway: LayerSpecification = {
  id: 'transit-subway',
  type: 'line',
  source: SOURCE,
  'source-layer': 'transportation',
  minzoom: 11,
  filter: transitFilter('subway'),
  layout: { 'line-cap': 'butt', 'line-join': 'round' },
  paint: {
    'line-color': '#6633cc',
    'line-width': ['interpolate', ['linear'], ['zoom'], 11, 0.6, 14, 1.4, 19, 2.6],
    'line-dasharray': [3, 2],
    'line-opacity': 0.9,
  },
} as unknown as LayerSpecification;

const transitTram: LayerSpecification = {
  id: 'transit-tram',
  type: 'line',
  source: SOURCE,
  'source-layer': 'transportation',
  minzoom: 12,
  filter: transitFilter('tram'),
  layout: { 'line-cap': 'butt', 'line-join': 'round' },
  paint: {
    'line-color': '#2e7d32',
    'line-width': ['interpolate', ['linear'], ['zoom'], 12, 0.6, 16, 1.4, 19, 2.4],
  },
} as unknown as LayerSpecification;

const transitLightRail: LayerSpecification = {
  id: 'transit-light-rail',
  type: 'line',
  source: SOURCE,
  'source-layer': 'transportation',
  minzoom: 11,
  filter: transitFilter('light_rail'),
  layout: { 'line-cap': 'butt', 'line-join': 'round' },
  paint: {
    'line-color': '#00838f',
    'line-width': ['interpolate', ['linear'], ['zoom'], 11, 0.6, 14, 1.4, 19, 2.4],
  },
} as unknown as LayerSpecification;

const transitMonorail: LayerSpecification = {
  id: 'transit-monorail',
  type: 'line',
  source: SOURCE,
  'source-layer': 'transportation',
  minzoom: 12,
  filter: transitFilter('monorail'),
  layout: { 'line-cap': 'butt', 'line-join': 'round' },
  paint: {
    'line-color': '#5d4037',
    'line-width': ['interpolate', ['linear'], ['zoom'], 12, 0.6, 16, 1.4, 19, 2.4],
    'line-dasharray': [1, 2],
  },
} as unknown as LayerSpecification;

// ---------------------------------------------------------------------------
// Assemblage — ordre de rendu (du moins prioritaire au plus prioritaire)
// ---------------------------------------------------------------------------

export const railLayers: LayerSpecification[] = [
  // Variantes (rendu en premier, sous les voies principales)
  railNarrow,
  railPreserved,
  railFunicular,
  railService,
  // Voies principales : base puis hachures par-dessus
  railMainBase,
  railMainHatch,
  // Transports en commun
  transitMonorail,
  transitLightRail,
  transitTram,
  transitSubway,
];

// ---------------------------------------------------------------------------
// Définition des sous-groupes pour le panneau de couches et l'export SVG
// ---------------------------------------------------------------------------

export interface RailSubgroup {
  id: string;
  label: string;
  /**
   * IDs des couches MapLibre composant ce sous-groupe.
   * Inclut les couches natives ET leurs équivalents underzoom (uz-*),
   * de sorte qu'un toggle agisse aussi sur les couches injectées
   * dynamiquement par useOverzoomedRoads à z=7.
   */
  layerIds: string[];
}

export const RAIL_SUBGROUPS: RailSubgroup[] = [
  {
    id: 'main',
    label: 'Voies principales',
    layerIds: ['rail-main-base', 'rail-main-hatch', 'uz-rail-main-base', 'uz-rail-main-hatch'],
  },
  {
    id: 'service',
    label: 'Voies de garage',
    layerIds: ['rail-service', 'uz-rail-service'],
  },
  {
    id: 'narrow',
    label: 'Voie étroite',
    layerIds: ['rail-narrow', 'uz-rail-narrow'],
  },
  {
    id: 'preserved',
    label: 'Train historique',
    layerIds: ['rail-preserved', 'uz-rail-preserved'],
  },
  {
    id: 'funicular',
    label: 'Funiculaire',
    layerIds: ['rail-funicular'],
  },
  {
    id: 'subway',
    label: 'Métro',
    layerIds: ['transit-subway'],
  },
  {
    id: 'tram',
    label: 'Tramway',
    layerIds: ['transit-tram'],
  },
  {
    id: 'light_rail',
    label: 'Train léger',
    layerIds: ['transit-light-rail'],
  },
  {
    id: 'monorail',
    label: 'Monorail',
    layerIds: ['transit-monorail'],
  },
];
