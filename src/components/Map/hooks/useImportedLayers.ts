/**
 * Hook pour gérer les couches importées (GeoJSON, Shapefile, GeoPackage).
 *
 * Chaque fichier importé devient une source GeoJSON + couches auto‑stylées
 * sur la carte MapLibre.
 */
import { useState, useCallback, useRef } from 'react';
import type { Map, GeoJSONSource } from 'maplibre-gl';
import type { FeatureCollection, GeoJsonProperties, Geometry } from 'geojson';

export interface ImportedLayer {
  id: string;
  name: string;
  visible: boolean;
  sourceId: string;
  layerIds: string[];
  geojson: FeatureCollection<Geometry, GeoJsonProperties>;
  color: string;
}

const PALETTE = [
  '#e6194b', '#3cb44b', '#4363d8', '#f58231', '#911eb4',
  '#42d4f4', '#f032e6', '#bfef45', '#fabed4', '#469990',
];

let colorIndex = 0;
function nextColor(): string {
  const c = PALETTE[colorIndex % PALETTE.length];
  colorIndex++;
  return c;
}

/** Génère un id safe à partir d'un nom de fichier */
function safeId(name: string): string {
  return 'import-' + name.replace(/[^a-zA-Z0-9_-]/g, '_').toLowerCase();
}

/**
 * Détecte le type de géométries dans une FeatureCollection.
 * Retourne les types présents : 'point', 'line', 'polygon'.
 */
function detectGeomTypes(fc: FeatureCollection): Set<string> {
  const types = new Set<string>();
  for (const f of fc.features) {
    if (!f.geometry) continue;
    const t = f.geometry.type;
    if (t === 'Point' || t === 'MultiPoint') types.add('point');
    else if (t === 'LineString' || t === 'MultiLineString') types.add('line');
    else if (t === 'Polygon' || t === 'MultiPolygon') types.add('polygon');
  }
  return types;
}

export function useImportedLayers() {
  const [layers, setLayers] = useState<ImportedLayer[]>([]);
  const mapRef = useRef<Map | null>(null);

  /** Attacher la ref map */
  const setMap = useCallback((map: Map | null) => {
    mapRef.current = map;
  }, []);

  /** Ajouter un GeoJSON sur la carte */
  const addGeoJSON = useCallback(
    (name: string, geojson: FeatureCollection<Geometry, GeoJsonProperties>) => {
      const map = mapRef.current;
      if (!map) return;

      const id = safeId(name) + '-' + Date.now();
      const sourceId = id + '-src';
      const color = nextColor();
      const layerIds: string[] = [];

      map.addSource(sourceId, { type: 'geojson', data: geojson });

      const geomTypes = detectGeomTypes(geojson);

      if (geomTypes.has('polygon')) {
        const fillId = id + '-fill';
        const outlineId = id + '-outline';
        map.addLayer({
          id: fillId,
          type: 'fill',
          source: sourceId,
          filter: ['any',
            ['==', '$type', 'Polygon'],
          ],
          paint: {
            'fill-color': color,
            'fill-opacity': 0.25,
          },
        });
        map.addLayer({
          id: outlineId,
          type: 'line',
          source: sourceId,
          filter: ['any',
            ['==', '$type', 'Polygon'],
          ],
          paint: {
            'line-color': color,
            'line-width': 2,
          },
        });
        layerIds.push(fillId, outlineId);
      }

      if (geomTypes.has('line')) {
        const lineId = id + '-line';
        map.addLayer({
          id: lineId,
          type: 'line',
          source: sourceId,
          filter: ['==', '$type', 'LineString'],
          paint: {
            'line-color': color,
            'line-width': 2.5,
          },
        });
        layerIds.push(lineId);
      }

      if (geomTypes.has('point')) {
        const pointId = id + '-point';
        map.addLayer({
          id: pointId,
          type: 'circle',
          source: sourceId,
          filter: ['==', '$type', 'Point'],
          paint: {
            'circle-color': color,
            'circle-radius': 5,
            'circle-stroke-color': '#ffffff',
            'circle-stroke-width': 1.5,
          },
        });
        layerIds.push(pointId);
      }

      const imported: ImportedLayer = {
        id,
        name,
        visible: true,
        sourceId,
        layerIds,
        geojson,
        color,
      };

      setLayers((prev) => [...prev, imported]);
      return imported;
    },
    [],
  );

  /** Toggle visibilité d'une couche importée */
  const toggleLayer = useCallback((layerId: string) => {
    const map = mapRef.current;
    if (!map) return;

    setLayers((prev) =>
      prev.map((l) => {
        if (l.id !== layerId) return l;
        const newVisible = !l.visible;
        const visibility = newVisible ? 'visible' : 'none';
        l.layerIds.forEach((lid) => {
          if (map.getLayer(lid)) {
            map.setLayoutProperty(lid, 'visibility', visibility);
          }
        });
        return { ...l, visible: newVisible };
      }),
    );
  }, []);

  /** Supprimer une couche importée */
  const removeLayer = useCallback((layerId: string) => {
    const map = mapRef.current;
    if (!map) return;

    setLayers((prev) => {
      const layer = prev.find((l) => l.id === layerId);
      if (layer) {
        layer.layerIds.forEach((lid) => {
          if (map.getLayer(lid)) map.removeLayer(lid);
        });
        if (map.getSource(layer.sourceId)) {
          map.removeSource(layer.sourceId);
        }
      }
      return prev.filter((l) => l.id !== layerId);
    });
  }, []);

  /** Zoom sur l'emprise d'une couche importée */
  const zoomToLayer = useCallback((layerId: string) => {
    const map = mapRef.current;
    if (!map) return;

    setLayers((prev) => {
      const layer = prev.find((l) => l.id === layerId);
      if (!layer) return prev;

      const source = map.getSource(layer.sourceId) as GeoJSONSource | undefined;
      if (!source) return prev;

      // Calculer la bbox depuis le GeoJSON
      let minLng = Infinity, minLat = Infinity, maxLng = -Infinity, maxLat = -Infinity;
      for (const f of layer.geojson.features) {
        visitCoords(f.geometry, ([lng, lat]) => {
          if (lng < minLng) minLng = lng;
          if (lat < minLat) minLat = lat;
          if (lng > maxLng) maxLng = lng;
          if (lat > maxLat) maxLat = lat;
        });
      }

      if (isFinite(minLng)) {
        map.fitBounds([[minLng, minLat], [maxLng, maxLat]], {
          padding: 40,
          maxZoom: 16,
          duration: 1000,
        });
      }

      return prev;
    });
  }, []);

  return { layers, setMap, addGeoJSON, toggleLayer, removeLayer, zoomToLayer };
}

/** Parcourt toutes les coordonnées d'une géométrie */
function visitCoords(
  geom: Geometry | null,
  fn: (coord: [number, number]) => void,
) {
  if (!geom) return;
  switch (geom.type) {
    case 'Point':
      fn(geom.coordinates as [number, number]);
      break;
    case 'MultiPoint':
    case 'LineString':
      (geom.coordinates as [number, number][]).forEach(fn);
      break;
    case 'MultiLineString':
    case 'Polygon':
      (geom.coordinates as [number, number][][]).forEach((ring) =>
        ring.forEach(fn),
      );
      break;
    case 'MultiPolygon':
      (geom.coordinates as [number, number][][][]).forEach((poly) =>
        poly.forEach((ring) => ring.forEach(fn)),
      );
      break;
    case 'GeometryCollection':
      geom.geometries.forEach((g) => visitCoords(g, fn));
      break;
  }
}
