/**
 * Couches de labels (noms de lieux, rues, plans d'eau).
 *
 * Source layers OpenMapTiles utilisées :
 *   - `place`               → noms de lieux (pays, villes, villages…)
 *   - `transportation_name` → noms de rues
 *   - `water_name`          → noms de plans d'eau
 *
 * Stratégie de zoom :
 *   - Noms de pays dès le zoom mondial (2+)
 *   - Noms de villes au zoom national (6+)
 *   - Noms de rues au zoom quartier (15+)
 *   - Chaque couche a un maxzoom pour disparaître quand un label
 *     plus détaillé prend le relais.
 */
import type { LayerSpecification } from 'maplibre-gl';
import { COLORS, TILE_CONFIG, FONTS } from '../../../config/mapConfig';
import { VISIBILITY } from '../../../config/zoomThresholds';

const SOURCE = TILE_CONFIG.sourceId;

export const labelLayers: LayerSpecification[] = [
  // -----------------------------------------------------------------------
  // Eau
  // -----------------------------------------------------------------------
  {
    id: 'label-water',
    type: 'symbol',
    source: SOURCE,
    'source-layer': 'water_name',
    minzoom: 10,
    layout: {
      'text-field': ['get', 'name'],
      'text-font': FONTS.italic,
      'text-size': ['interpolate', ['linear'], ['zoom'], 10, 10, 16, 14],
      'text-max-width': 8,
    },
    paint: {
      'text-color': '#6d9dc5',
      'text-halo-color': COLORS.labelHalo,
      'text-halo-width': 1.5,
    },
  } as LayerSpecification,

  // -----------------------------------------------------------------------
  // Rues
  // -----------------------------------------------------------------------
  {
    id: 'label-street',
    type: 'symbol',
    source: SOURCE,
    'source-layer': 'transportation_name',
    minzoom: VISIBILITY.STREET_LABEL,
    layout: {
      'text-field': ['get', 'name'],
      'text-font': FONTS.regular,
      'text-size': ['interpolate', ['linear'], ['zoom'], 15, 9, 18, 13],
      'symbol-placement': 'line',
      'text-rotation-alignment': 'map',
      'text-max-angle': 30,
    },
    paint: {
      'text-color': COLORS.labelMedium,
      'text-halo-color': COLORS.labelHalo,
      'text-halo-width': 1.5,
    },
  } as LayerSpecification,

  // -----------------------------------------------------------------------
  // Lieux – du plus petit au plus grand
  // -----------------------------------------------------------------------

  // Villages et hameaux
  {
    id: 'label-village',
    type: 'symbol',
    source: SOURCE,
    'source-layer': 'place',
    minzoom: VISIBILITY.VILLAGE_LABEL,
    maxzoom: 16,
    filter: ['match', ['get', 'class'], ['village', 'hamlet'], true, false],
    layout: {
      'text-field': ['get', 'name'],
      'text-font': FONTS.regular,
      'text-size': ['interpolate', ['linear'], ['zoom'], 11, 9, 14, 12],
      'text-max-width': 8,
    },
    paint: {
      'text-color': COLORS.labelMedium,
      'text-halo-color': COLORS.labelHalo,
      'text-halo-width': 1.5,
    },
  } as LayerSpecification,

  // Quartiers et faubourgs
  {
    id: 'label-suburb',
    type: 'symbol',
    source: SOURCE,
    'source-layer': 'place',
    minzoom: VISIBILITY.SUBURB_LABEL,
    maxzoom: 16,
    filter: ['match', ['get', 'class'], ['suburb', 'quarter', 'neighbourhood'], true, false],
    layout: {
      'text-field': ['get', 'name'],
      'text-font': FONTS.regular,
      'text-size': ['interpolate', ['linear'], ['zoom'], 10, 9, 12, 11, 15, 13],
      'text-max-width': 8,
      'text-transform': 'uppercase',
      'text-letter-spacing': 0.1,
    },
    paint: {
      'text-color': COLORS.labelLight,
      'text-halo-color': COLORS.labelHalo,
      'text-halo-width': 1.5,
    },
  } as LayerSpecification,

  // Villes moyennes (towns)
  {
    id: 'label-town',
    type: 'symbol',
    source: SOURCE,
    'source-layer': 'place',
    minzoom: VISIBILITY.TOWN_LABEL,
    maxzoom: 15,
    filter: ['==', ['get', 'class'], 'town'],
    layout: {
      'text-field': ['get', 'name'],
      'text-font': FONTS.regular,
      'text-size': ['interpolate', ['linear'], ['zoom'], 9, 10, 13, 14],
      'text-max-width': 8,
    },
    paint: {
      'text-color': COLORS.labelDark,
      'text-halo-color': COLORS.labelHalo,
      'text-halo-width': 2,
    },
  } as LayerSpecification,

  // Grandes villes (cities)
  {
    id: 'label-city',
    type: 'symbol',
    source: SOURCE,
    'source-layer': 'place',
    minzoom: VISIBILITY.CITY_LABEL,
    maxzoom: 14,
    filter: ['==', ['get', 'class'], 'city'],
    layout: {
      'text-field': ['get', 'name'],
      'text-font': FONTS.bold,
      'text-size': ['interpolate', ['linear'], ['zoom'], 6, 11, 10, 16, 14, 20],
      'text-max-width': 10,
    },
    paint: {
      'text-color': COLORS.labelDark,
      'text-halo-color': COLORS.labelHalo,
      'text-halo-width': 2,
    },
  } as LayerSpecification,

  // Régions / états
  {
    id: 'label-state',
    type: 'symbol',
    source: SOURCE,
    'source-layer': 'place',
    minzoom: VISIBILITY.STATE_LABEL,
    maxzoom: 8,
    filter: ['==', ['get', 'class'], 'state'],
    layout: {
      'text-field': ['get', 'name'],
      'text-font': FONTS.bold,
      'text-size': ['interpolate', ['linear'], ['zoom'], 4, 9, 7, 13],
      'text-max-width': 10,
      'text-transform': 'uppercase',
      'text-letter-spacing': 0.15,
    },
    paint: {
      'text-color': COLORS.labelLight,
      'text-halo-color': COLORS.labelHalo,
      'text-halo-width': 2,
    },
  } as LayerSpecification,

  // Pays
  {
    id: 'label-country',
    type: 'symbol',
    source: SOURCE,
    'source-layer': 'place',
    minzoom: VISIBILITY.COUNTRY_LABEL,
    maxzoom: 7,
    filter: ['==', ['get', 'class'], 'country'],
    layout: {
      'text-field': ['get', 'name'],
      'text-font': FONTS.bold,
      'text-size': ['interpolate', ['linear'], ['zoom'], 2, 10, 5, 16, 7, 20],
      'text-max-width': 10,
      'text-transform': 'uppercase',
      'text-letter-spacing': 0.2,
    },
    paint: {
      'text-color': COLORS.labelDark,
      'text-halo-color': COLORS.labelHalo,
      'text-halo-width': 2.5,
    },
  } as LayerSpecification,
];
