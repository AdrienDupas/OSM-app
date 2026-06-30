/**
 * Panneau de gestion des couches.
 * Permet d'afficher/masquer chaque groupe (et leurs sous-groupes) via des cases à cocher.
 */
import { useState } from 'react';
import type { LayerGroup } from './layers';

interface LayerPanelProps {
  groups: LayerGroup[];
  /**
   * Ensemble des sélecteurs visibles. Un sélecteur est :
   *   - `groupId` pour un groupe sans sous-groupes (ou pour activer tous les sous-groupes)
   *   - `groupId/subgroupId` pour un sous-groupe spécifique
   */
  visibleSelectors: Set<string>;
  onToggleSelector: (selector: string) => void;
}

export function LayerPanel({ groups, visibleSelectors, onToggleSelector }: LayerPanelProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className={`layer-panel ${isOpen ? 'open' : ''}`}>
      <button
        className="layer-panel-toggle"
        onClick={() => setIsOpen((prev) => !prev)}
        title="Couches"
        aria-label="Afficher/masquer le panneau de couches"
      >
        ☰
      </button>

      {isOpen && (
        <div className="layer-panel-content">
          <h3>Couches</h3>

          {groups.map((group) => {
            if (!group.subgroups || group.subgroups.length === 0) {
              return (
                <label key={group.id} className="layer-toggle">
                  <input
                    type="checkbox"
                    checked={visibleSelectors.has(group.id)}
                    onChange={() => onToggleSelector(group.id)}
                  />
                  <span>{group.label}</span>
                </label>
              );
            }

            // Groupe avec sous-groupes : en-tête + toggles indentés
            return (
              <div key={group.id} className="layer-group-with-subs">
                <div className="layer-group-header">{group.label}</div>
                <div className="layer-subgroups">
                  {group.subgroups.map((sub) => {
                    const selector = `${group.id}/${sub.id}`;
                    return (
                      <label key={selector} className="layer-toggle layer-subgroup-toggle">
                        <input
                          type="checkbox"
                          checked={visibleSelectors.has(selector)}
                          onChange={() => onToggleSelector(selector)}
                        />
                        <span>{sub.label}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
