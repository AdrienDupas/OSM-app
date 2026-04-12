/**
 * Contrôles de navigation de la carte : zoom avant/arrière, recentrage.
 */
import type { Map } from 'maplibre-gl';
import { DEFAULT_CENTER, DEFAULT_ZOOM } from '../../config/mapConfig';

interface MapControlsProps {
  map: Map | null;
}

export function MapControls({ map }: MapControlsProps) {
  const handleZoomIn = () => map?.zoomIn();
  const handleZoomOut = () => map?.zoomOut();
  const handleReset = () => {
    map?.flyTo({ center: DEFAULT_CENTER, zoom: DEFAULT_ZOOM });
  };

  return (
    <div className="map-controls">
      <button onClick={handleZoomIn} title="Zoom avant" aria-label="Zoom avant">
        +
      </button>
      <button onClick={handleZoomOut} title="Zoom arrière" aria-label="Zoom arrière">
        −
      </button>
      <button onClick={handleReset} title="Recentrer la carte" aria-label="Recentrer la carte">
        ⌂
      </button>
    </div>
  );
}
