/**
 * Hook d'initialisation de la carte MapLibre.
 *
 * Responsabilités :
 *   - Crée l'instance MapLibre GL dans le conteneur DOM fourni.
 *   - Applique le style vectoriel avec toutes les couches.
 *   - Gère le cycle de vie (création / destruction).
 *
 * Usage :
 *   const containerRef = useRef<HTMLDivElement>(null);
 *   const { map, isLoaded } = useMap(containerRef);
 */
import { useEffect, useRef, useState } from 'react';
import type { RefObject } from 'react';
import { Map } from 'maplibre-gl';
import { buildMapStyle } from '../layers';
import { DEFAULT_CENTER, DEFAULT_ZOOM, MIN_ZOOM, MAX_ZOOM } from '../../../config/mapConfig';

export function useMap(containerRef: RefObject<HTMLDivElement | null>) {
  const mapRef = useRef<Map | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || mapRef.current) return;

    const map = new Map({
      container,
      style: buildMapStyle(),
      center: DEFAULT_CENTER,
      zoom: DEFAULT_ZOOM,
      minZoom: MIN_ZOOM,
      maxZoom: MAX_ZOOM,

    });

    map.on('load', () => setIsLoaded(true));
    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
      setIsLoaded(false);
    };
    // Le containerRef ne change jamais, dépendance stable
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { map: mapRef.current, isLoaded };
}
