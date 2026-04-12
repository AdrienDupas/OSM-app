/**
 * Indicateur du niveau de zoom actuel.
 * Affiche le niveau numérique et l'échelle correspondante en français.
 */

interface ZoomIndicatorProps {
  zoom: number;
}

/** Renvoie le libellé de l'échelle en fonction du zoom */
function getZoomLabel(z: number): string {
  if (z < 4) return 'Monde';
  if (z < 7) return 'National';
  if (z < 10) return 'Régional';
  if (z < 13) return 'Ville';
  if (z < 16) return 'Quartier';
  return 'Rue';
}

export function ZoomIndicator({ zoom }: ZoomIndicatorProps) {
  return (
    <div className="zoom-indicator">
      <span className="zoom-level">Z{zoom.toFixed(1)}</span>
      <span className="zoom-label">{getZoomLabel(zoom)}</span>
    </div>
  );
}
