/**
 * Couches des limites administratives (frontières).
 *
 * Source layer OpenMapTiles : `boundary`
 *   - `admin_level` : 2 = pays, 4 = région/état, 6–8 = commune/ville
 *   - `maritime` : 1 si la frontière est maritime
 *
 * Stratégie de zoom :
 *   - Frontières nationales toujours visibles.
 *   - Frontières régionales dès le zoom national (4+).
 *   - Limites communales dès le zoom régional (9+).
 */
import type { LayerSpecification } from 'maplibre-gl';
import { COLORS, TILE_CONFIG } from '../../../config/mapConfig';
import { VISIBILITY } from '../../../config/zoomThresholds';

const SOURCE = TILE_CONFIG.sourceId;

export const boundaryLayers: LayerSpecification[] = [
  // Frontières nationales
  {
    id: 'boundary-country',
    type: 'line',
    source: SOURCE,
    'source-layer': 'boundary',
    minzoom: VISIBILITY.COUNTRY_BORDER,
    filter: ['all', ['==', ['get', 'admin_level'], 2], ['!=', ['get', 'maritime'], 1]],
    paint: {
      'line-color': COLORS.countryBorder,
      'line-width': ['interpolate', ['linear'], ['zoom'], 0, 0.5, 6, 2, 10, 3],
      'line-dasharray': [5, 3],
    },
  } as LayerSpecification,

  // Frontières régionales / départementales
  {
    id: 'boundary-state',
    type: 'line',
    source: SOURCE,
    'source-layer': 'boundary',
    minzoom: VISIBILITY.STATE_BORDER,
    filter: ['all', ['==', ['get', 'admin_level'], 4], ['!=', ['get', 'maritime'], 1]],
    paint: {
      'line-color': COLORS.stateBorder,
      'line-width': ['interpolate', ['linear'], ['zoom'], 4, 0.3, 8, 1, 12, 1.5],
      'line-dasharray': [4, 3],
    },
  } as LayerSpecification,

  // Limites communales
  {
    id: 'boundary-city',
    type: 'line',
    source: SOURCE,
    'source-layer': 'boundary',
    minzoom: VISIBILITY.CITY_BORDER,
    filter: [
      'all',
      ['match', ['get', 'admin_level'], [6, 7, 8], true, false],
      ['!=', ['get', 'maritime'], 1],
    ],
    paint: {
      'line-color': COLORS.cityBorder,
      'line-width': ['interpolate', ['linear'], ['zoom'], 9, 0.2, 14, 1],
      'line-dasharray': [3, 2],
    },
  } as LayerSpecification,
];
