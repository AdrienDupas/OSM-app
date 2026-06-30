/**
 * Point d'entrée des couches cartographiques.
 *
 * Ce fichier :
 *   1. Assemble toutes les couches dans l'ordre de rendu correct.
 *   2. Exporte la fonction `buildMapStyle()` qui produit un style MapLibre complet.
 *   3. Définit les groupes de couches (LAYER_GROUPS) utilisés par le panneau UI.
 *
 * Ordre de rendu (du bas vers le haut) :
 *   background → occupation du sol → eau → routes → bâtiments → frontières → labels
 */
import type { StyleSpecification, LayerSpecification } from 'maplibre-gl';
import { TILE_CONFIG } from '../../../config/mapConfig';

import { backgroundLayers } from './background';
import { waterLayers } from './water';
import { landuseLayers } from './landuse';
import { buildingLayers } from './building';
import { roadLayers, roadLayerIds } from './road';
import { railLayers, RAIL_SUBGROUPS } from './rail';
import { boundaryLayers } from './boundary';
import { labelLayers } from './label';
import { OVERZOOMED_LAYER_IDS } from '../hooks/useOverzoomedRoads';

// ---------------------------------------------------------------------------
// Groupes de couches pour le panneau de contrôle
// ---------------------------------------------------------------------------

/** Sous-groupe optionnel d'un LayerGroup (toggle individuel à l'intérieur) */
export interface LayerSubgroup {
  /** Identifiant unique au sein du groupe parent */
  id: string;
  /** Libellé affiché dans le panneau */
  label: string;
  /** IDs des couches MapLibre composant ce sous-groupe */
  layerIds: string[];
}

/** Représente un groupe de couches affichable/masquable dans l'UI */
export interface LayerGroup {
  /** Identifiant unique du groupe */
  id: string;
  /** Libellé affiché dans le panneau */
  label: string;
  /** IDs des couches MapLibre appartenant à ce groupe */
  layerIds: string[];
  /**
   * Sous-groupes optionnels. Si présent, chaque sous-groupe a son propre
   * toggle dans le panneau et son propre `<g>` dans l'export SVG.
   */
  subgroups?: LayerSubgroup[];
}

/**
 * Groupes de couches disponibles dans le panneau de contrôle.
 * L'ordre suit l'ordre de rendu de la carte (du bas vers le haut),
 * identique à ALL_LAYERS : landuse → water → roads → rails → buildings → boundaries → labels
 */
export const LAYER_GROUPS: LayerGroup[] = [
  {
    id: 'landuse',
    label: 'Occupation du sol',
    layerIds: landuseLayers.map((l) => l.id),
  },
  {
    id: 'water',
    label: 'Eau',
    layerIds: waterLayers.map((l) => l.id),
  },
  {
    id: 'roads',
    label: 'Routes',
    layerIds: [...OVERZOOMED_LAYER_IDS, ...roadLayerIds],
  },
  {
    id: 'rails',
    label: 'Voies ferrées',
    layerIds: RAIL_SUBGROUPS.flatMap((sg) => sg.layerIds),
    subgroups: RAIL_SUBGROUPS,
  },
  {
    id: 'buildings',
    label: 'Bâtiments',
    layerIds: buildingLayers.map((l) => l.id),
  },
  {
    id: 'boundaries',
    label: 'Limites admin.',
    layerIds: boundaryLayers.map((l) => l.id),
  },
  {
    id: 'labels',
    label: 'Noms de lieux',
    layerIds: labelLayers.map((l) => l.id),
  },
];

// ---------------------------------------------------------------------------
// Construction du style MapLibre
// ---------------------------------------------------------------------------

/** Toutes les couches dans l'ordre de rendu */
const ALL_LAYERS: LayerSpecification[] = [
  ...backgroundLayers,
  ...landuseLayers,
  ...waterLayers,
  ...roadLayers,
  ...railLayers,
  ...buildingLayers,
  ...boundaryLayers,
  ...labelLayers,
];

/**
 * Construit le style MapLibre complet avec toutes les couches.
 * À passer à `new maplibregl.Map({ style: buildMapStyle() })`.
 */
export function buildMapStyle(): StyleSpecification {
  return {
    version: 8,
    name: 'OSM City Plan',
    glyphs: TILE_CONFIG.glyphs,
    sources: {
      [TILE_CONFIG.sourceId]: {
        type: 'vector',
        url: TILE_CONFIG.url,
      },
    },
    layers: ALL_LAYERS,
  } as StyleSpecification;
}
