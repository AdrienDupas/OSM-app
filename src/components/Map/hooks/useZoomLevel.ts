/**
 * Hook de suivi du niveau de zoom de la carte.
 *
 * Met à jour l'état à chaque changement de zoom (pendant l'interaction),
 * permettant aux composants de réagir au zoom en temps réel.
 *
 * Usage :
 *   const zoom = useZoomLevel(map);
 */
import { useState, useEffect } from 'react';
import type { Map } from 'maplibre-gl';

export function useZoomLevel(map: Map | null): number {
  const [zoom, setZoom] = useState(0);

  useEffect(() => {
    if (!map) return;

    const handleZoom = () => setZoom(map.getZoom());

    // Initialisation avec le zoom actuel
    setZoom(map.getZoom());

    map.on('zoom', handleZoom);

    return () => {
      map.off('zoom', handleZoom);
    };
  }, [map]);

  return zoom;
}
