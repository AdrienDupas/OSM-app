/**
 * Couche des bâtiments.
 *
 * Source layer OpenMapTiles : `building`
 *
 * Stratégie de zoom :
 *   - Apparaît uniquement au zoom quartier (14+) pour ne pas surcharger la carte.
 *   - L'opacité augmente progressivement pour une transition douce.
 */
import type { LayerSpecification } from 'maplibre-gl';
import { COLORS, TILE_CONFIG } from '../../../config/mapConfig';
import { VISIBILITY } from '../../../config/zoomThresholds';

const SOURCE = TILE_CONFIG.sourceId;

export const buildingLayers: LayerSpecification[] = [
  {
    id: 'building',
    type: 'fill',
    source: SOURCE,
    'source-layer': 'building',
    minzoom: VISIBILITY.BUILDING,
    paint: {
      'fill-color': COLORS.building,
      'fill-opacity': ['interpolate', ['linear'], ['zoom'], 14, 0.3, 16, 0.7],
      'fill-outline-color': COLORS.buildingOutline,
    },
  } as LayerSpecification,
];
