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

  // Zones résidentielles
  {
    id: 'landuse-residential',
    type: 'fill',
    source: SOURCE,
    'source-layer': 'landuse',
    minzoom: VISIBILITY.LANDUSE,
    filter: ['==', ['get', 'class'], 'residential'],
    paint: {
      'fill-color': COLORS.residential,
      'fill-opacity': ['interpolate', ['linear'], ['zoom'], 10, 0.3, 14, 0.5],
    },
  } as LayerSpecification,

  // Zones commerciales
  {
    id: 'landuse-commercial',
    type: 'fill',
    source: SOURCE,
    'source-layer': 'landuse',
    minzoom: VISIBILITY.LANDUSE,
    filter: ['match', ['get', 'class'], ['commercial', 'retail'], true, false],
    paint: {
      'fill-color': COLORS.commercial,
      'fill-opacity': ['interpolate', ['linear'], ['zoom'], 10, 0.3, 14, 0.5],
    },
  } as LayerSpecification,

  // Zones industrielles
  {
    id: 'landuse-industrial',
    type: 'fill',
    source: SOURCE,
    'source-layer': 'landuse',
    minzoom: VISIBILITY.LANDUSE,
    filter: ['match', ['get', 'class'], ['industrial', 'railway'], true, false],
    paint: {
      'fill-color': COLORS.industrial,
      'fill-opacity': ['interpolate', ['linear'], ['zoom'], 10, 0.3, 14, 0.5],
    },
  } as LayerSpecification,

  // Cimetières
  {
    id: 'landuse-cemetery',
    type: 'fill',
    source: SOURCE,
    'source-layer': 'landuse',
    minzoom: VISIBILITY.LANDUSE,
    filter: ['==', ['get', 'class'], 'cemetery'],
    paint: {
      'fill-color': COLORS.cemetery,
      'fill-opacity': 0.5,
    },
  } as LayerSpecification,

  // Hôpitaux
  {
    id: 'landuse-hospital',
    type: 'fill',
    source: SOURCE,
    'source-layer': 'landuse',
    minzoom: VISIBILITY.LANDUSE,
    filter: ['==', ['get', 'class'], 'hospital'],
    paint: {
      'fill-color': COLORS.hospital,
      'fill-opacity': 0.5,
    },
  } as LayerSpecification,

  // Établissements scolaires
  {
    id: 'landuse-school',
    type: 'fill',
    source: SOURCE,
    'source-layer': 'landuse',
    minzoom: VISIBILITY.LANDUSE,
    filter: ['match', ['get', 'class'], ['school', 'university', 'college'], true, false],
    paint: {
      'fill-color': COLORS.school,
      'fill-opacity': 0.5,
    },
  } as LayerSpecification,
];
