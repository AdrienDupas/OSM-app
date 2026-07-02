/**
 * Couches d'occupation du sol : parcs, forêts, zones résidentielles, etc.
 *
 * Source layers OpenMapTiles utilisées :
 *   - `landuse`   → zones urbaines (résidentiel, commercial, industriel…)
 *   - `landcover` → couverture naturelle (forêts, prairies…)
 *   - `park`      → parcs et espaces verts
 *
 * Stratégie de zoom :
 *   - Les forêts apparaissent dès le zoom régional (6+).
 *   - Les parcs au zoom régional (8+).
 *   - Les zones urbaines détaillées au zoom ville (10+).
 *   - L'opacité augmente progressivement avec le zoom.
 */
import type { LayerSpecification } from 'maplibre-gl';
import { COLORS, TILE_CONFIG } from '../../../config/mapConfig';
import { VISIBILITY } from '../../../config/zoomThresholds';

const SOURCE = TILE_CONFIG.sourceId;

/**
 * Classes OpenMapTiles du source-layer `landuse` représentant du bâti /
 * de l'urbanisation. Utilisé au zoom régional (z=7-9) comme un masque unifié
 * de « taches urbaines » avant que les couches typées ne prennent le relais
 * à z=10+.
 */
export const BUILTUP_CLASSES = [
  'residential',
  'commercial',
  'retail',
  'industrial',
  'railway',
  'military',
  'hospital',
  'school',
  'university',
  'college',
  'kindergarten',
  'stadium',
] as const;

/**
 * Sous-ensemble utilisé par le masque unifié à z=8-9 : uniquement les classes
 * qui n'ont pas de couche typée dédiée à ce niveau de zoom (résidentiel,
 * militaire, kindergarten, stade). Les autres — commercial, industriel,
 * hospital, école, cimetière — sont rendues avec leur couleur propre par
 * leurs couches typées dès z=8, donc on les exclut du masque pour ne pas
 * les recouvrir de la teinte résidentielle.
 */
const BUILTUP_MASK_CLASSES = [
  'residential',
  'military',
  'kindergarten',
  'stadium',
];

export const landuseLayers: LayerSpecification[] = [
  // Forêts (couverture naturelle)
  {
    id: 'landuse-forest',
    type: 'fill',
    source: SOURCE,
    'source-layer': 'landcover',
    minzoom: VISIBILITY.FOREST,
    filter: ['==', ['get', 'class'], 'wood'],
    paint: {
      'fill-color': COLORS.forest,
      'fill-opacity': ['interpolate', ['linear'], ['zoom'], 6, 0.2, 12, 0.6],
    },
  } as LayerSpecification,

  // Espaces verts urbains (landcover class=grass)
  // C'est ici que se trouvent les parcs urbains comme les Buttes Chaumont,
  // squares, jardins, prairies, etc.
  {
    id: 'landuse-grass',
    type: 'fill',
    source: SOURCE,
    'source-layer': 'landcover',
    minzoom: VISIBILITY.PARK,
    filter: ['==', ['get', 'class'], 'grass'],
    paint: {
      'fill-color': COLORS.park,
      'fill-opacity': ['interpolate', ['linear'], ['zoom'], 8, 0.3, 12, 0.6],
    },
  } as LayerSpecification,

  // Parcs protégés et réserves naturelles (national_park, nature_reserve)
  {
    id: 'landuse-park',
    type: 'fill',
    source: SOURCE,
    'source-layer': 'park',
    minzoom: VISIBILITY.PARK,
    paint: {
      'fill-color': COLORS.park,
      'fill-opacity': ['interpolate', ['linear'], ['zoom'], 8, 0.3, 12, 0.6],
    },
  } as LayerSpecification,

  // Masque « taches urbaines » — comble les classes bâties qui n'ont pas de
  // couche typée dédiée (résidentiel, militaire, kindergarten, stade) à
  // partir de z=8 côté natif (z=7 via underzoom). Les autres classes bâties
  // (commercial, industriel, hôpital, école, cimetière) sont rendues avec
  // leurs couleurs propres dès z=8 par leurs couches typées.
  {
    id: 'landuse-builtup',
    type: 'fill',
    source: SOURCE,
    'source-layer': 'landuse',
    minzoom: 8,
    filter: [
      'match',
      ['get', 'class'],
      BUILTUP_MASK_CLASSES,
      true,
      false,
    ],
    paint: {
      'fill-color': COLORS.residential,
      'fill-opacity': ['interpolate', ['linear'], ['zoom'], 8, 0.4, 10, 0.35, 14, 0.5],
    },
  } as LayerSpecification,

  // Zones commerciales
  {
    id: 'landuse-commercial',
    type: 'fill',
    source: SOURCE,
    'source-layer': 'landuse',
    minzoom: 8,
    filter: ['match', ['get', 'class'], ['commercial', 'retail'], true, false],
    paint: {
      'fill-color': COLORS.commercial,
      'fill-opacity': ['interpolate', ['linear'], ['zoom'], 8, 0.35, 10, 0.35, 14, 0.5],
    },
  } as LayerSpecification,

  // Zones industrielles
  {
    id: 'landuse-industrial',
    type: 'fill',
    source: SOURCE,
    'source-layer': 'landuse',
    minzoom: 8,
    filter: ['match', ['get', 'class'], ['industrial', 'railway'], true, false],
    paint: {
      'fill-color': COLORS.industrial,
      'fill-opacity': ['interpolate', ['linear'], ['zoom'], 8, 0.35, 10, 0.35, 14, 0.5],
    },
  } as LayerSpecification,

  // Cimetières
  {
    id: 'landuse-cemetery',
    type: 'fill',
    source: SOURCE,
    'source-layer': 'landuse',
    minzoom: 8,
    filter: ['==', ['get', 'class'], 'cemetery'],
    paint: {
      'fill-color': COLORS.cemetery,
      'fill-opacity': ['interpolate', ['linear'], ['zoom'], 8, 0.4, 10, 0.5],
    },
  } as LayerSpecification,

  // Hôpitaux
  {
    id: 'landuse-hospital',
    type: 'fill',
    source: SOURCE,
    'source-layer': 'landuse',
    minzoom: 8,
    filter: ['==', ['get', 'class'], 'hospital'],
    paint: {
      'fill-color': COLORS.hospital,
      'fill-opacity': ['interpolate', ['linear'], ['zoom'], 8, 0.4, 10, 0.5],
    },
  } as LayerSpecification,

  // Établissements scolaires
  {
    id: 'landuse-school',
    type: 'fill',
    source: SOURCE,
    'source-layer': 'landuse',
    minzoom: 8,
    filter: ['match', ['get', 'class'], ['school', 'university', 'college'], true, false],
    paint: {
      'fill-color': COLORS.school,
      'fill-opacity': ['interpolate', ['linear'], ['zoom'], 8, 0.4, 10, 0.5],
    },
  } as LayerSpecification,
];
