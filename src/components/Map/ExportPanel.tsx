/**
 * Panneau d'export SVG.
 *
 * Permet de télécharger la vue actuelle de la carte sous forme de fichier SVG
 * avec les couches organisées. Offre une option pour inclure ou non les labels.
 * Inclut également les couches importées dans des calques dédiés.
 */
import { useState, useCallback } from 'react';
import type { Map } from 'maplibre-gl';
import { exportMapToSvgAsync, downloadSvg } from './export';
import type { ImportedLayer } from './hooks/useImportedLayers';

interface ExportPanelProps {
  map: Map | null;
  importedLayers?: ImportedLayer[];
}

export function ExportPanel({ map, importedLayers = [] }: ExportPanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [includeLabels, setIncludeLabels] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [lastExportInfo, setLastExportInfo] = useState<string | null>(null);

  const handleExport = useCallback(() => {
    if (!map) return;

    setIsExporting(true);
    setLastExportInfo(null);

    // Utiliser la version async qui attend que toutes les tuiles soient chargées
    exportMapToSvgAsync(map, {
      includeLabels,
      importedLayers: importedLayers.filter((l) => l.visible),
    })
      .then((result) => {
        const sizeKb = Math.round(result.svgContent.length / 1024);
        downloadSvg(result.svgContent);
        setLastExportInfo(`${result.width}×${result.height}px — ${sizeKb} Ko`);
      })
      .catch((err) => {
        console.error('SVG export failed:', err);
        setLastExportInfo('Erreur lors de l\'export');
      })
      .finally(() => {
        setIsExporting(false);
      });
  }, [map, includeLabels, importedLayers]);

  return (
    <div className={`export-panel ${isOpen ? 'open' : ''}`}>
      <button
        className="export-panel-toggle"
        onClick={() => setIsOpen((prev) => !prev)}
        title="Export SVG"
        aria-label="Afficher/masquer le panneau d'export"
      >
        ⬇
      </button>

      {isOpen && (
        <div className="export-panel-content">
          <h3>Export SVG</h3>

          <p className="export-desc">
            Exporte la vue actuelle en SVG avec les couches organisées.
          </p>

          <label className="export-option">
            <input
              type="checkbox"
              checked={includeLabels}
              onChange={(e) => setIncludeLabels(e.target.checked)}
            />
            <span>Inclure les labels</span>
          </label>

          <button
            className="export-button"
            onClick={handleExport}
            disabled={isExporting || !map}
          >
            {isExporting ? 'Export en cours…' : 'Télécharger SVG'}
          </button>

          {lastExportInfo && (
            <p className="export-info">{lastExportInfo}</p>
          )}

          <div className="export-layers-info">
            <p className="export-layers-title">Couches dans le SVG :</p>
            <ul>
              <li><code>layer-landuse</code> — Occupation du sol</li>
              <li><code>layer-water</code> — Eau</li>
              <li><code>layer-roads</code> — Routes</li>
              <li><code>layer-buildings</code> — Bâtiments</li>
              <li><code>layer-boundaries</code> — Limites admin.</li>
              <li><code>layer-labels</code> — Noms de lieux</li>
              {importedLayers.map((l) => (
                <li key={l.id}>
                  <code>layer-import-{l.name}</code> — {l.name}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
