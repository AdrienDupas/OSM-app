/**
 * Composant principal de la carte vectorielle OSM.
 *
 * Orchestre l'ensemble des sous-composants :
 *   - Conteneur de carte MapLibre GL
 *   - Contrôles de navigation (zoom, reset)
 *   - Indicateur de zoom
 *   - Panneau de gestion des couches
 *   - Barre de recherche de lieux
 *   - Import de couches externes
 */
import { useRef, useState, useCallback, useEffect } from 'react';
import { useMap } from './hooks/useMap';
import { useZoomLevel } from './hooks/useZoomLevel';
import { useImportedLayers } from './hooks/useImportedLayers';
import { useOverzoomedRoads } from './hooks/useOverzoomedRoads';
import { MapControls } from './MapControls';
import { ZoomIndicator } from './ZoomIndicator';
import { LayerPanel } from './LayerPanel';
import { ExportPanel } from './ExportPanel';
import { SearchBar } from './SearchBar';
import { ImportPanel } from './ImportPanel';
import { LAYER_GROUPS } from './layers';

export function MapViewer() {
  const containerRef = useRef<HTMLDivElement>(null);
  const { map, isLoaded } = useMap(containerRef);
  const zoom = useZoomLevel(map);
  useOverzoomedRoads(map, zoom);
  const importedLayers = useImportedLayers();

  // Lier la carte au hook d'import
  useEffect(() => {
    importedLayers.setMap(map);
  }, [map, importedLayers.setMap]);

  // État de visibilité des groupes de couches
  const [visibleGroups, setVisibleGroups] = useState<Set<string>>(
    () => new Set(LAYER_GROUPS.map((g) => g.id)),
  );

  /** Active ou désactive la visibilité d'un groupe de couches */
  const handleToggleGroup = useCallback(
    (groupId: string) => {
      if (!map) return;

      const group = LAYER_GROUPS.find((g) => g.id === groupId);
      if (!group) return;

      const isCurrentlyVisible = visibleGroups.has(groupId);
      const newVisibility = isCurrentlyVisible ? 'none' : 'visible';

      // Mise à jour des couches MapLibre
      for (const layerId of group.layerIds) {
        if (map.getLayer(layerId)) {
          map.setLayoutProperty(layerId, 'visibility', newVisibility);
        }
      }

      // Mise à jour de l'état React
      setVisibleGroups((prev) => {
        const next = new Set(prev);
        if (isCurrentlyVisible) {
          next.delete(groupId);
        } else {
          next.add(groupId);
        }
        return next;
      });
    },
    [map, visibleGroups],
  );

  return (
    <div className="map-viewer">
      <div ref={containerRef} className="map-container" />

      {isLoaded && (
        <>
          <SearchBar map={map} />
          <MapControls map={map} />
          <ZoomIndicator zoom={zoom} />
          <LayerPanel
            groups={LAYER_GROUPS}
            visibleGroups={visibleGroups}
            onToggleGroup={handleToggleGroup}
          />
          <ExportPanel map={map} importedLayers={importedLayers.layers} />
          <ImportPanel
            map={map}
            layers={importedLayers.layers}
            onAddGeoJSON={importedLayers.addGeoJSON}
            onToggleLayer={importedLayers.toggleLayer}
            onRemoveLayer={importedLayers.removeLayer}
            onZoomToLayer={importedLayers.zoomToLayer}
          />
        </>
      )}
    </div>
  );
}
