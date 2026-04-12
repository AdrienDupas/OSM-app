/**
 * Couche de fond de la carte.
 * Couleur de base visible sous toutes les autres couches.
 */
import type { LayerSpecification } from 'maplibre-gl';
import { COLORS } from '../../../config/mapConfig';

export const backgroundLayers: LayerSpecification[] = [
  {
    id: 'background',
    type: 'background',
    paint: {
      'background-color': COLORS.background,
    },
  },
];
