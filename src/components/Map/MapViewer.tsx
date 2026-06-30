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

  // État de visibilité des groupes/sous-groupes de couches.
  // Selecteur = 'groupId' (groupe entier) OU 'groupId/subgroupId' (sous-groupe).
  const [visibleSelectors, setVisibleSelectors] = useState<Set<string>>(() => {
    const initial = new Set<string>();
    for (const g of LAYER_GROUPS) {
      if (g.subgroups && g.subgroups.length > 0) {
        for (const sg of g.subgroups) {
          initial.add(`${g.id}/${sg.id}`);
        }
      } else {
        initial.add(g.id);
      }
    }
    return initial;
  });

  /** Active ou désactive la visibilité d'un groupe ou sous-groupe de couches */
  const handleToggleSelector = useCallback(
    (selector: string) => {
      if (!map) return;

      // Résoudre les layerIds concernés par ce sélecteur
      const [groupId, subgroupId] = selector.split('/');
      const group = LAYER_GROUPS.find((g) => g.id === groupId);
      if (!group) return;

      let layerIds: string[] = [];
      if (subgroupId) {
        const sg = group.subgroups?.find((s) => s.id === subgroupId);
        if (!sg) return;
        layerIds = sg.layerIds;
      } else {
        layerIds = group.layerIds;
      }

      const isCurrentlyVisible = visibleSelectors.has(selector);
      const newVisibility = isCurrentlyVisible ? 'none' : 'visible';

      // Mise à jour des couches MapLibre
      for (const layerId of layerIds) {
        if (map.getLayer(layerId)) {
          map.setLayoutProperty(layerId, 'visibility', newVisibility);
        }
      }

      // Mise à jour de l'état React
      setVisibleSelectors((prev) => {
        const next = new Set(prev);
        if (isCurrentlyVisible) {
          next.delete(selector);
        } else {
          next.add(selector);
        }
        return next;
      });
    },
    [map, visibleSelectors],
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
            visibleSelectors={visibleSelectors}
            onToggleSelector={handleToggleSelector}
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
