/**
 * Hook pour afficher les routes mineures (residential, unclassified, living_street)
 * aux niveaux de zoom 10.5–12, en contournant la limitation des tuiles vectorielles
 * qui n'incluent ces données qu'à partir du zoom 12.
 *
 * Fonctionnement :
 *   1. Lorsque le zoom est entre 10.5 et 12, le hook calcule quelles tuiles zoom-12
 *      couvrent la vue actuelle.
 *   2. Il télécharge ces tuiles PBF, les décode avec @mapbox/vector-tile + pbf,
 *      et extrait les features `class=minor` / `class=service` de la couche
 *      `transportation`.
 *   3. Les features sont converties en GeoJSON et injectées sur la carte via une
 *      source GeoJSON + couches line stylisées comme les routes classiques.
 *   4. Les couches ont un maxzoom de 12, donc elles disparaissent dès que les tuiles
 *      natives prennent le relais.
 *   5. Un cache de tuiles évite les téléchargements redondants.
 */
import { useEffect, useRef, useCallback } from 'react';
import type { Map as MaplibreMap, GeoJSONSource } from 'maplibre-gl';
import { VectorTile } from '@mapbox/vector-tile';
import Protobuf from 'pbf';
import { COLORS, TILE_CONFIG } from '../../../config/mapConfig';

// ---------------------------------------------------------------------------
// Constantes
// ---------------------------------------------------------------------------

/** Zoom auquel les tuiles PBF sont récupérées (premier zoom contenant minor) */
const FETCH_ZOOM = 12;

/** Identifiant de la source GeoJSON sur la carte */
const SOURCE_ID = 'overzoomed-roads';

/** Zoom d'apparition des routes mineures overzoomed */
const OZ_MIN_ZOOM = 10;

/** Zoom de disparition (les tuiles natives prennent le relais) */
const OZ_MAX_ZOOM = 12;

/** Nombre max de requêtes parallèles */
const MAX_CONCURRENT = 12;

/** IDs des couches ajoutées (exportés pour le panneau de couches) */
export const OVERZOOMED_LAYER_IDS = [
  'oz-road-service-casing',
  'oz-road-minor-casing',
  'oz-road-service',
  'oz-road-minor',
];

// ---------------------------------------------------------------------------
// Utilitaires tuiles
// ---------------------------------------------------------------------------

/** Convertit une longitude en coordonnée X de tuile au zoom donné */
function lng2tile(lng: number, zoom: number): number {
  return Math.floor(((lng + 180) / 360) * Math.pow(2, zoom));
}

/** Convertit une latitude en coordonnée Y de tuile au zoom donné */
function lat2tile(lat: number, zoom: number): number {
  const latRad = (lat * Math.PI) / 180;
  return Math.floor(
    ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) *
      Math.pow(2, zoom),
  );
}

/** Récupère l'URL template des tuiles depuis le TileJSON */
async function fetchTileUrlTemplate(): Promise<string> {
  const resp = await fetch(TILE_CONFIG.url);
  if (!resp.ok) throw new Error(`TileJSON fetch failed: ${resp.status}`);
  const json = await resp.json();
  return json.tiles[0] as string;
}

/** Télécharge et décode une tuile PBF, en extrayant les features des classes voulues */
async function decodeTile(
  urlTemplate: string,
  z: number,
  x: number,
  y: number,
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
  const layer = tile.layers['transportation'];
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

/**
 * Exécute un tableau de fonctions asynchrones avec un niveau de
 * concurrence maximal.
 */
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

  const workers = Array.from({ length: Math.min(concurrency, tasks.length) }, () =>
    worker(),
  );
  await Promise.all(workers);
  return results;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

/**
 * Active le chargement des routes mineures overzoomed quand le zoom est
 * entre 10.5 et 12.
 */
export function useOverzoomedRoads(map: MaplibreMap | null, zoom: number): void {
  const tileCache = useRef(new Map<string, GeoJSON.Feature[]>());
  const urlTemplate = useRef<string | null>(null);
  const layersAdded = useRef(false);
  const fetchId = useRef(0); // annule les requêtes obsolètes

  const active = zoom >= OZ_MIN_ZOOM && zoom < OZ_MAX_ZOOM;

  /** Ajoute les couches de rendu (une seule fois) */
  const ensureLayers = useCallback(
    (m: MaplibreMap) => {
      if (layersAdded.current) return;
      if (!m.getSource(SOURCE_ID)) return;

      // Trouver la couche avant laquelle insérer (premier casing de route)
      const beforeId = m.getLayer('road-service-casing') ? 'road-service-casing' : undefined;

      // Service — casing
      m.addLayer(
        {
          id: 'oz-road-service-casing',
          type: 'line',
          source: SOURCE_ID,
          maxzoom: OZ_MAX_ZOOM,
          filter: ['==', ['get', 'class'], 'service'],
          layout: { 'line-cap': 'round', 'line-join': 'round' },
          paint: {
            'line-color': COLORS.serviceCasing,
            'line-width': ['interpolate', ['linear'], ['zoom'], 10, 0.6, 12, 2],
          },
        } as maplibregl.LayerSpecification,
        beforeId,
      );

      // Minor — casing
      m.addLayer(
        {
          id: 'oz-road-minor-casing',
          type: 'line',
          source: SOURCE_ID,
          maxzoom: OZ_MAX_ZOOM,
          filter: ['==', ['get', 'class'], 'minor'],
          layout: { 'line-cap': 'round', 'line-join': 'round' },
          paint: {
            'line-color': COLORS.minorCasing,
            'line-width': ['interpolate', ['linear'], ['zoom'], 10, 0.6, 12, 2],
          },
        } as maplibregl.LayerSpecification,
        beforeId,
      );

      // Service — fill
      m.addLayer(
        {
          id: 'oz-road-service',
          type: 'line',
          source: SOURCE_ID,
          maxzoom: OZ_MAX_ZOOM,
          filter: ['==', ['get', 'class'], 'service'],
          layout: { 'line-cap': 'round', 'line-join': 'round' },
          paint: {
            'line-color': COLORS.service,
            'line-width': ['interpolate', ['linear'], ['zoom'], 10, 0.2, 12, 1],
          },
        } as maplibregl.LayerSpecification,
        beforeId,
      );

      // Minor — fill
      m.addLayer(
        {
          id: 'oz-road-minor',
          type: 'line',
          source: SOURCE_ID,
          maxzoom: OZ_MAX_ZOOM,
          filter: ['==', ['get', 'class'], 'minor'],
          layout: { 'line-cap': 'round', 'line-join': 'round' },
          paint: {
            'line-color': COLORS.minor,
            'line-width': ['interpolate', ['linear'], ['zoom'], 10, 0.2, 12, 1],
          },
        } as maplibregl.LayerSpecification,
        beforeId,
      );

      layersAdded.current = true;
    },
    [],
  );

  /** Télécharge les tuiles zoom-12 couvrant la vue et met à jour la source */
  const fetchAndUpdate = useCallback(
    async (m: MaplibreMap) => {
      // Résoudre le template d'URL une seule fois
      if (!urlTemplate.current) {
        try {
          urlTemplate.current = await fetchTileUrlTemplate();
        } catch {
          console.warn('[overzoom] Impossible de récupérer le TileJSON');
          return;
        }
      }

      const currentFetchId = ++fetchId.current;
      const bounds = m.getBounds();

      const xMin = lng2tile(bounds.getWest(), FETCH_ZOOM);
      const xMax = lng2tile(bounds.getEast(), FETCH_ZOOM);
      const yMin = lat2tile(bounds.getNorth(), FETCH_ZOOM);
      const yMax = lat2tile(bounds.getSouth(), FETCH_ZOOM);

      const allFeatures: GeoJSON.Feature[] = [];
      const tasks: (() => Promise<void>)[] = [];

      for (let x = xMin; x <= xMax; x++) {
        for (let y = yMin; y <= yMax; y++) {
          const key = `${FETCH_ZOOM}/${x}/${y}`;
          const cached = tileCache.current.get(key);
          if (cached) {
            allFeatures.push(...cached);
            continue;
          }
          const cx = x,
            cy = y;
          tasks.push(async () => {
            const features = await decodeTile(
              urlTemplate.current!,
              FETCH_ZOOM,
              cx,
              cy,
              ['minor', 'service'],
            );
            tileCache.current.set(`${FETCH_ZOOM}/${cx}/${cy}`, features);
            allFeatures.push(...features);
          });
        }
      }

      // Exécuter les requêtes avec concurrence limitée
      if (tasks.length > 0) {
        await runWithConcurrency(tasks, MAX_CONCURRENT);
      }

      // Ne pas mettre à jour si une requête plus récente a démarré
      if (fetchId.current !== currentFetchId) return;

      const geojson: GeoJSON.FeatureCollection = {
        type: 'FeatureCollection',
        features: allFeatures,
      };

      // Créer ou mettre à jour la source
      const existing = m.getSource(SOURCE_ID) as GeoJSONSource | undefined;
      if (existing) {
        existing.setData(geojson);
      } else {
        m.addSource(SOURCE_ID, { type: 'geojson', data: geojson });
      }

      // Ajouter les couches si pas encore fait
      ensureLayers(m);
    },
    [ensureLayers],
  );

  useEffect(() => {
    if (!map) return;

    if (!active) {
      // Quand inactif, vider la source pour économiser la mémoire
      const src = map.getSource(SOURCE_ID) as GeoJSONSource | undefined;
      if (src) {
        src.setData({ type: 'FeatureCollection', features: [] });
      }
      return;
    }

    // Charger immédiatement
    fetchAndUpdate(map);

    // Recharger au déplacement
    const handler = () => {
      fetchAndUpdate(map);
    };
    map.on('moveend', handler);

    return () => {
      map.off('moveend', handler);
    };
  }, [map, active, fetchAndUpdate]);
}
