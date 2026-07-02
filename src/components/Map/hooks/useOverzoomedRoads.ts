/**
 * Hook pour afficher des classes de routes à des niveaux de zoom où les tuiles
 * vectorielles OpenMapTiles ne les contiennent pas encore.
 *
 * Deux étages parallèles :
 *
 *   1. ÉTAGE BAS — routes `minor` / `service` entre z=10 et z=12.
 *      Les tuiles OMT n'incluent `minor` qu'à partir de z=12 → on télécharge
 *      manuellement les tuiles z=12 couvrant la vue pour afficher ces routes
 *      dès z=10.
 *
 *   2. ÉTAGE HAUT — routes `secondary` entre z=7 et z=8.
 *      OMT n'inclut `secondary` qu'à partir de z=8 → on télécharge les tuiles
 *      z=8 pour afficher les routes secondaires dès z=7.
 *
 * Mécanique commune :
 *   - Calcul des tuiles couvrant la vue au zoom de fetch.
 *   - Téléchargement des PBF, décodage via @mapbox/vector-tile + pbf.
 *   - Cache des tuiles déjà téléchargées.
 *   - Concurrence limitée pour les requêtes.
 *   - Source GeoJSON + couches MapLibre stylées comme les routes natives.
 *   - `maxzoom` sur les couches → disparition dès que la tuile native prend
 *     le relais.
 */
import { useEffect, useRef, useCallback } from 'react';
import type {
  Map as MaplibreMap,
  GeoJSONSource,
  LayerSpecification,
} from 'maplibre-gl';
import { VectorTile } from '@mapbox/vector-tile';
import Protobuf from 'pbf';
import { COLORS, TILE_CONFIG } from '../../../config/mapConfig';
import { BUILTUP_CLASSES } from '../layers/landuse';

// ---------------------------------------------------------------------------
// Utilitaires partagés
// ---------------------------------------------------------------------------

const MAX_CONCURRENT = 12;

function lng2tile(lng: number, zoom: number): number {
  return Math.floor(((lng + 180) / 360) * Math.pow(2, zoom));
}

function lat2tile(lat: number, zoom: number): number {
  const latRad = (lat * Math.PI) / 180;
  return Math.floor(
    ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) *
      Math.pow(2, zoom),
  );
}

async function fetchTileUrlTemplate(): Promise<string> {
  const resp = await fetch(TILE_CONFIG.url);
  if (!resp.ok) throw new Error(`TileJSON fetch failed: ${resp.status}`);
  const json = await resp.json();
  return json.tiles[0] as string;
}

async function decodeTile(
  urlTemplate: string,
  z: number,
  x: number,
  y: number,
  sourceLayer: string,
  classes: string[],
): Promise<GeoJSON.Feature[]> {
  const url = urlTemplate
    .replace('{z}', String(z))
    .replace('{x}', String(x))
    .replace('{y}', String(y));

  const resp = await fetch(url);
  if (!resp.ok) return [];
  const buffer = await resp.arrayBuffer();

  const tile = new VectorTile(new Protobuf(buffer));
  const layer = tile.layers[sourceLayer];
  if (!layer) return [];

  const features: GeoJSON.Feature[] = [];
  for (let i = 0; i < layer.length; i++) {
    const feature = layer.feature(i);
    if (classes.includes(feature.properties.class as string)) {
      features.push(feature.toGeoJSON(x, y, z));
    }
  }
  return features;
}

async function runWithConcurrency<T>(
  tasks: (() => Promise<T>)[],
  concurrency: number,
): Promise<T[]> {
  const results: T[] = [];
  let index = 0;

  async function worker() {
    while (index < tasks.length) {
      const i = index++;
      results[i] = await tasks[i]();
    }
  }

  const workers = Array.from(
    { length: Math.min(concurrency, tasks.length) },
    () => worker(),
  );
  await Promise.all(workers);
  return results;
}

// ---------------------------------------------------------------------------
// Définition d'un étage de routes "underzoomed"
// ---------------------------------------------------------------------------

interface UnderzoomStage {
  /** ID de la source GeoJSON sur la carte */
  sourceId: string;
  /** Zoom à partir duquel cet étage est actif (inclusif) */
  activeMin: number;
  /** Zoom auquel cet étage devient inactif (exclusif) — tuiles natives OK */
  activeMax: number;
  /** Zoom des tuiles vectorielles à télécharger pour récupérer les features */
  fetchZoom: number;
  /** Nom de la source layer OMT à lire dans les tuiles (default: transportation) */
  sourceLayer?: string;
  /** Classes de features (propriété `class`) à extraire */
  classes: string[];
  /** Couche MapLibre avant laquelle insérer (pour ordre de rendu) */
  beforeLayer?: string;
  /** IDs des couches à créer */
  layerIds: string[];
  /** Fabrique de couches MapLibre pour cette source */
  buildLayers: (sourceId: string, maxzoom: number) => LayerSpecification[];
}

// ---------------------------------------------------------------------------
// Définitions des étages
// ---------------------------------------------------------------------------

const MINOR_STAGE: UnderzoomStage = {
  sourceId: 'overzoomed-roads',
  activeMin: 10,
  activeMax: 12,
  fetchZoom: 12,
  classes: ['minor', 'service'],
  beforeLayer: 'road-service-casing',
  layerIds: [
    'oz-road-service-casing',
    'oz-road-minor-casing',
    'oz-road-service',
    'oz-road-minor',
  ],
  buildLayers: (sourceId, maxzoom) => [
    {
      id: 'oz-road-service-casing',
      type: 'line',
      source: sourceId,
      maxzoom,
      filter: ['==', ['get', 'class'], 'service'],
      layout: { 'line-cap': 'round', 'line-join': 'round' },
      paint: {
        'line-color': COLORS.serviceCasing,
        'line-width': ['interpolate', ['linear'], ['zoom'], 10, 0.6, 12, 2],
      },
    } as LayerSpecification,
    {
      id: 'oz-road-minor-casing',
      type: 'line',
      source: sourceId,
      maxzoom,
      filter: ['==', ['get', 'class'], 'minor'],
      layout: { 'line-cap': 'round', 'line-join': 'round' },
      paint: {
        'line-color': COLORS.minorCasing,
        'line-width': ['interpolate', ['linear'], ['zoom'], 10, 0.6, 12, 2],
      },
    } as LayerSpecification,
    {
      id: 'oz-road-service',
      type: 'line',
      source: sourceId,
      maxzoom,
      filter: ['==', ['get', 'class'], 'service'],
      layout: { 'line-cap': 'round', 'line-join': 'round' },
      paint: {
        'line-color': COLORS.service,
        'line-width': ['interpolate', ['linear'], ['zoom'], 10, 0.2, 12, 1],
      },
    } as LayerSpecification,
    {
      id: 'oz-road-minor',
      type: 'line',
      source: sourceId,
      maxzoom,
      filter: ['==', ['get', 'class'], 'minor'],
      layout: { 'line-cap': 'round', 'line-join': 'round' },
      paint: {
        'line-color': COLORS.minor,
        'line-width': ['interpolate', ['linear'], ['zoom'], 10, 0.2, 12, 1],
      },
    } as LayerSpecification,
  ],
};

const SECONDARY_STAGE: UnderzoomStage = {
  sourceId: 'underzoomed-secondary',
  activeMin: 7,
  activeMax: 8,
  fetchZoom: 8,
  classes: ['secondary'],
  // Inséré avant le casing primary pour rester sous les routes primaires/trunk/motorway
  beforeLayer: 'road-primary-casing',
  layerIds: ['uz-road-secondary-casing', 'uz-road-secondary'],
  buildLayers: (sourceId, maxzoom) => [
    {
      id: 'uz-road-secondary-casing',
      type: 'line',
      source: sourceId,
      maxzoom,
      filter: ['==', ['get', 'class'], 'secondary'],
      layout: { 'line-cap': 'round', 'line-join': 'round' },
      paint: {
        'line-color': COLORS.secondaryCasing,
        'line-width': ['interpolate', ['linear'], ['zoom'], 7, 1, 8, 1.5],
      },
    } as LayerSpecification,
    {
      id: 'uz-road-secondary',
      type: 'line',
      source: sourceId,
      maxzoom,
      filter: ['==', ['get', 'class'], 'secondary'],
      layout: { 'line-cap': 'round', 'line-join': 'round' },
      paint: {
        'line-color': COLORS.secondary,
        'line-width': ['interpolate', ['linear'], ['zoom'], 7, 0.3, 8, 0.5],
      },
    } as LayerSpecification,
  ],
};

// ÉTAGE RAIL — voies ferrées (`class=rail`) à z=[7, 8).
// OMT n'inclut les rails qu'à partir de z=8 → on récupère les tuiles z=8
// pour rendre toutes les variantes (main, service, narrow_gauge, preserved)
// dès le zoom 7. Les funiculaires (z=12+ natif) ne nécessitent pas d'underzoom.
const RAIL_STAGE: UnderzoomStage = {
  sourceId: 'underzoomed-rail',
  activeMin: 7,
  activeMax: 8,
  fetchZoom: 8,
  classes: ['rail'],
  // Inséré avant les bâtiments pour respecter l'ordre roads → rails → buildings
  beforeLayer: 'building',
  layerIds: [
    'uz-rail-narrow',
    'uz-rail-preserved',
    'uz-rail-service',
    'uz-rail-main-base',
    'uz-rail-main-hatch',
  ],
  buildLayers: (sourceId, maxzoom) => [
    {
      id: 'uz-rail-narrow',
      type: 'line',
      source: sourceId,
      maxzoom,
      filter: [
        'all',
        ['==', ['get', 'class'], 'rail'],
        ['==', ['get', 'subclass'], 'narrow_gauge'],
      ],
      layout: { 'line-cap': 'butt', 'line-join': 'round' },
      paint: {
        'line-color': '#8b4513',
        'line-width': ['interpolate', ['linear'], ['zoom'], 7, 0.4, 8, 0.6],
        'line-dasharray': [4, 2],
      },
    } as LayerSpecification,
    {
      id: 'uz-rail-preserved',
      type: 'line',
      source: sourceId,
      maxzoom,
      filter: [
        'all',
        ['==', ['get', 'class'], 'rail'],
        ['==', ['get', 'subclass'], 'preserved'],
      ],
      layout: { 'line-cap': 'butt', 'line-join': 'round' },
      paint: {
        'line-color': '#a0522d',
        'line-width': ['interpolate', ['linear'], ['zoom'], 7, 0.4, 8, 0.6],
        'line-dasharray': [2, 3],
      },
    } as LayerSpecification,
    {
      id: 'uz-rail-service',
      type: 'line',
      source: sourceId,
      maxzoom,
      filter: [
        'all',
        ['==', ['get', 'class'], 'rail'],
        ['has', 'service'],
      ],
      layout: { 'line-cap': 'butt', 'line-join': 'round' },
      paint: {
        'line-color': '#888888',
        'line-width': ['interpolate', ['linear'], ['zoom'], 7, 0.3, 8, 0.5],
        'line-dasharray': [3, 2],
      },
    } as LayerSpecification,
    {
      id: 'uz-rail-main-base',
      type: 'line',
      source: sourceId,
      maxzoom,
      filter: [
        'all',
        ['==', ['get', 'class'], 'rail'],
        ['match', ['get', 'subclass'], ['rail', ''], true, false],
        ['!', ['has', 'service']],
      ],
      layout: { 'line-cap': 'butt', 'line-join': 'round' },
      paint: {
        'line-color': '#3a3a3a',
        'line-width': ['interpolate', ['linear'], ['zoom'], 7, 0.6, 8, 1],
      },
    } as LayerSpecification,
    {
      id: 'uz-rail-main-hatch',
      type: 'line',
      source: sourceId,
      maxzoom,
      filter: [
        'all',
        ['==', ['get', 'class'], 'rail'],
        ['match', ['get', 'subclass'], ['rail', ''], true, false],
        ['!', ['has', 'service']],
      ],
      layout: { 'line-cap': 'butt', 'line-join': 'round' },
      paint: {
        'line-color': '#ffffff',
        // Les hachures n'apparaissent qu'au-delà de z=7.5 (sinon illisible)
        'line-width': ['interpolate', ['linear'], ['zoom'], 7.5, 0.4, 8, 0.8],
        'line-dasharray': [0.4, 3],
      },
    } as LayerSpecification,
  ],
};

// IDs exportés pour le LayerPanel (groupe « Routes »)
export const OVERZOOMED_LAYER_IDS: string[] = [
  ...MINOR_STAGE.layerIds,
  ...SECONDARY_STAGE.layerIds,
];

/** IDs exportés pour le LayerPanel (groupe « Voies ferrées ») */
export const UNDERZOOMED_RAIL_LAYER_IDS: string[] = [...RAIL_STAGE.layerIds];

// ÉTAGE LANDUSE — zones bâties (résidentiel + commercial + industriel +
// ferroviaire + militaire + hôpitaux + campus + stades…) à z=[7, 8).
// OMT n'inclut ces classes du landuse qu'à partir de z=8 → on récupère les
// tuiles z=8 pour visualiser les taches urbaines dès z=7. Rendu unifié avec
// la couleur résidentielle pour former un masque « zones bâties ».
const LANDUSE_STAGE: UnderzoomStage = {
  sourceId: 'underzoomed-landuse',
  activeMin: 7,
  activeMax: 8,
  fetchZoom: 8,
  sourceLayer: 'landuse',
  classes: [...BUILTUP_CLASSES],
  // Inséré juste avant l'eau pour rester en dessous du reste
  beforeLayer: 'water',
  layerIds: ['uz-landuse-builtup'],
  buildLayers: (sourceId, maxzoom) => [
    {
      id: 'uz-landuse-builtup',
      type: 'fill',
      source: sourceId,
      maxzoom,
      filter: [
        'match',
        ['get', 'class'],
        [...BUILTUP_CLASSES],
        true,
        false,
      ],
      paint: {
        'fill-color': COLORS.residential,
        'fill-opacity': ['interpolate', ['linear'], ['zoom'], 7, 0.4, 8, 0.4],
      },
    } as unknown as LayerSpecification,
  ],
};

/** IDs exportés pour le LayerPanel (groupe « Occupation du sol ») */
export const UNDERZOOMED_LANDUSE_LAYER_IDS: string[] = [...LANDUSE_STAGE.layerIds];

// ---------------------------------------------------------------------------
// Hook générique pour un étage
// ---------------------------------------------------------------------------

function useUnderzoomStage(
  map: MaplibreMap | null,
  zoom: number,
  stage: UnderzoomStage,
) {
  const tileCache = useRef(new Map<string, GeoJSON.Feature[]>());
  const urlTemplate = useRef<string | null>(null);
  const layersAdded = useRef(false);
  const fetchId = useRef(0);

  const active = zoom >= stage.activeMin && zoom < stage.activeMax;

  const ensureLayers = useCallback(
    (m: MaplibreMap) => {
      if (layersAdded.current) return;
      if (!m.getSource(stage.sourceId)) return;

      const beforeId =
        stage.beforeLayer && m.getLayer(stage.beforeLayer)
          ? stage.beforeLayer
          : undefined;

      for (const spec of stage.buildLayers(stage.sourceId, stage.activeMax)) {
        if (!m.getLayer(spec.id)) {
          m.addLayer(spec, beforeId);
        }
      }
      layersAdded.current = true;
    },
    [stage],
  );

  const fetchAndUpdate = useCallback(
    async (m: MaplibreMap) => {
      if (!urlTemplate.current) {
        try {
          urlTemplate.current = await fetchTileUrlTemplate();
        } catch {
          console.warn('[underzoom] Impossible de récupérer le TileJSON');
          return;
        }
      }

      const currentFetchId = ++fetchId.current;
      const bounds = m.getBounds();

      const xMin = lng2tile(bounds.getWest(), stage.fetchZoom);
      const xMax = lng2tile(bounds.getEast(), stage.fetchZoom);
      const yMin = lat2tile(bounds.getNorth(), stage.fetchZoom);
      const yMax = lat2tile(bounds.getSouth(), stage.fetchZoom);

      const allFeatures: GeoJSON.Feature[] = [];
      const tasks: (() => Promise<void>)[] = [];

      for (let x = xMin; x <= xMax; x++) {
        for (let y = yMin; y <= yMax; y++) {
          const key = `${stage.fetchZoom}/${x}/${y}`;
          const cached = tileCache.current.get(key);
          if (cached) {
            allFeatures.push(...cached);
            continue;
          }
          const cx = x;
          const cy = y;
          tasks.push(async () => {
            const features = await decodeTile(
              urlTemplate.current!,
              stage.fetchZoom,
              cx,
              cy,
              stage.sourceLayer ?? 'transportation',
              stage.classes,
            );
            tileCache.current.set(`${stage.fetchZoom}/${cx}/${cy}`, features);
            allFeatures.push(...features);
          });
        }
      }

      if (tasks.length > 0) {
        await runWithConcurrency(tasks, MAX_CONCURRENT);
      }

      if (fetchId.current !== currentFetchId) return;

      const geojson: GeoJSON.FeatureCollection = {
        type: 'FeatureCollection',
        features: allFeatures,
      };

      const existing = m.getSource(stage.sourceId) as GeoJSONSource | undefined;
      if (existing) {
        existing.setData(geojson);
      } else {
        m.addSource(stage.sourceId, { type: 'geojson', data: geojson });
      }

      ensureLayers(m);
    },
    [stage, ensureLayers],
  );

  useEffect(() => {
    if (!map) return;

    if (!active) {
      const src = map.getSource(stage.sourceId) as GeoJSONSource | undefined;
      if (src) {
        src.setData({ type: 'FeatureCollection', features: [] });
      }
      return;
    }

    fetchAndUpdate(map);

    const handler = () => {
      fetchAndUpdate(map);
    };
    map.on('moveend', handler);

    return () => {
      map.off('moveend', handler);
    };
  }, [map, active, fetchAndUpdate, stage.sourceId]);
}

// ---------------------------------------------------------------------------
// Hook public — orchestre les deux étages
// ---------------------------------------------------------------------------

export function useOverzoomedRoads(
  map: MaplibreMap | null,
  zoom: number,
): void {
  useUnderzoomStage(map, zoom, MINOR_STAGE);
  useUnderzoomStage(map, zoom, SECONDARY_STAGE);
  useUnderzoomStage(map, zoom, RAIL_STAGE);
  useUnderzoomStage(map, zoom, LANDUSE_STAGE);
}
