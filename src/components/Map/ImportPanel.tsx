/**
 * Panneau d'import de couches géographiques.
 *
 * Supporte : GeoJSON (.geojson, .json), Shapefile (.zip), GeoPackage (.gpkg)
 */
import { useCallback, useRef, useState } from 'react';
import type { Map } from 'maplibre-gl';
import type { FeatureCollection } from 'geojson';
import type { ImportedLayer } from './hooks/useImportedLayers';


import shp from 'shpjs';

interface ImportPanelProps {
  map: Map | null;
  layers: ImportedLayer[];
  onAddGeoJSON: (name: string, geojson: FeatureCollection) => void;
  onToggleLayer: (id: string) => void;
  onRemoveLayer: (id: string) => void;
  onZoomToLayer: (id: string) => void;
}

export function ImportPanel({
  map,
  layers,
  onAddGeoJSON,
  onToggleLayer,
  onRemoveLayer,
  onZoomToLayer,
}: ImportPanelProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleFile = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file || !map) return;

      setError(null);
      setLoading(true);

      try {
        const ext = file.name.split('.').pop()?.toLowerCase();
        let geojson: FeatureCollection | null = null;
        const baseName = file.name.replace(/\.[^.]+$/, '');

        if (ext === 'geojson' || ext === 'json') {
          const text = await file.text();
          const parsed = JSON.parse(text);

          if (parsed.type === 'FeatureCollection') {
            geojson = parsed as FeatureCollection;
          } else if (parsed.type === 'Feature') {
            geojson = { type: 'FeatureCollection', features: [parsed] };
          } else if (parsed.type && parsed.coordinates) {
            geojson = {
              type: 'FeatureCollection',
              features: [{ type: 'Feature', geometry: parsed, properties: {} }],
            };
          } else {
            throw new Error('Format GeoJSON non reconnu');
          }
        } else if (ext === 'zip') {
          // Shapefile packagé en ZIP
          const buffer = await file.arrayBuffer();
          const result = await shp(buffer);

          if (Array.isArray(result)) {
            // Plusieurs couches dans le zip
            for (let i = 0; i < result.length; i++) {
              onAddGeoJSON(`${baseName}_${i + 1}`, result[i] as FeatureCollection);
            }
            setLoading(false);
            if (fileRef.current) fileRef.current.value = '';
            return;
          } else {
            geojson = result as FeatureCollection;
          }
        } else if (ext === 'gpkg') {
          setError(
            'GeoPackage : format binaire complexe. ' +
            'Convertissez en GeoJSON avec QGIS ou ogr2ogr.',
          );
          setLoading(false);
          if (fileRef.current) fileRef.current.value = '';
          return;
        } else {
          throw new Error(`Format non supporté : .${ext}`);
        }

        if (geojson && geojson.features.length > 0) {
          onAddGeoJSON(baseName, geojson);
        } else {
          setError('Le fichier ne contient aucune entité.');
        }
      } catch (err) {
        console.error('Import error:', err);
        setError(err instanceof Error ? err.message : 'Erreur lors de l\'import');
      } finally {
        setLoading(false);
        if (fileRef.current) fileRef.current.value = '';
      }
    },
    [map, onAddGeoJSON],
  );

  return (
    <div className="import-panel">
      <button
        className="import-toggle"
        onClick={() => setIsOpen(!isOpen)}
        title="Importer une couche"
      >
        Importer des données
      </button>

      {isOpen && (
        <div className="import-content">
          <div className="import-file-section">
            <label className="import-file-label">
              {loading ? 'Chargement…' : 'Choisir un fichier'}
              <input
                ref={fileRef}
                type="file"
                accept=".geojson,.json,.zip,.gpkg"
                onChange={handleFile}
                className="import-file-input"
                disabled={loading}
              />
            </label>
            <span className="import-formats">
              .geojson · .json · .zip (shapefile)
            </span>
          </div>

          {error && <div className="import-error">{error}</div>}

          {layers.length > 0 && (
            <ul className="import-layer-list">
              {layers.map((l) => (
                <li key={l.id} className="import-layer-item">
                  <span
                    className="import-layer-color"
                    style={{ backgroundColor: l.color }}
                  />
                  <button
                    className="import-layer-name"
                    onClick={() => onZoomToLayer(l.id)}
                    title="Zoomer sur la couche"
                  >
                    {l.name}
                  </button>
                  <button
                    className={`import-layer-toggle ${l.visible ? 'active' : ''}`}
                    onClick={() => onToggleLayer(l.id)}
                    title={l.visible ? 'Masquer' : 'Afficher'}
                  >
                    {l.visible ? '👁' : '👁‍🗨'}
                  </button>
                  <button
                    className="import-layer-remove"
                    onClick={() => onRemoveLayer(l.id)}
                    title="Supprimer"
                  >
                    ✕
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
