/**
 * Couches d'eau : océans, lacs, rivières, ruisseaux.
 *
 * Source layers OpenMapTiles utilisées :
 *   - `water`     → polygones (océans, lacs, réservoirs)
 *   - `waterway`  → lignes (rivières, canaux, ruisseaux)
 *
 * Stratégie de zoom :
 *   - Les grandes masses d'eau sont toujours visibles (zoom 0+).
 *   - Les rivières apparaissent au zoom régional (8+).
 *   - Les ruisseaux au zoom quartier (13+).
 */
import type { LayerSpecification } from 'maplibre-gl';
import { COLORS, TILE_CONFIG } from '../../../config/mapConfig';
import { VISIBILITY } from '../../../config/zoomThresholds';

const SOURCE = TILE_CONFIG.sourceId;

export const waterLayers: LayerSpecification[] = [
  // Polygones d'eau (océans, lacs, réservoirs)
  {
    id: 'water-area',
    type: 'fill',
    source: SOURCE,
    'source-layer': 'water',
    minzoom: VISIBILITY.WATER,
    paint: {
      'fill-color': COLORS.water,
    },
  } as LayerSpecification,

  // Rivières et canaux
  {
    id: 'waterway-river',
    type: 'line',
    source: SOURCE,
    'source-layer': 'waterway',
    minzoom: VISIBILITY.RIVER,
    filter: ['match', ['get', 'class'], ['river', 'canal'], true, false],
    layout: {
      'line-cap': 'round',
      'line-join': 'round',
    },
    paint: {
      'line-color': COLORS.waterway,
      'line-width': ['interpolate', ['linear'], ['zoom'], 8, 0.5, 12, 2, 16, 4],
    },
  } as LayerSpecification,

  // Ruisseaux, fossés, drains
  {
    id: 'waterway-stream',
    type: 'line',
    source: SOURCE,
    'source-layer': 'waterway',
    minzoom: VISIBILITY.STREAM,
    filter: ['match', ['get', 'class'], ['stream', 'ditch', 'drain'], true, false],
    layout: {
      'line-cap': 'round',
      'line-join': 'round',
    },
    paint: {
      'line-color': COLORS.waterway,
      'line-width': ['interpolate', ['linear'], ['zoom'], 13, 0.3, 16, 1.5],
    },
  } as LayerSpecification,
];
