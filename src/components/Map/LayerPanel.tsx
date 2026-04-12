/**
 * Panneau de gestion des couches.
 * Permet d'afficher/masquer chaque groupe de couches via des cases à cocher.
 */
import { useState } from 'react';
import type { LayerGroup } from './layers';

interface LayerPanelProps {
  groups: LayerGroup[];
  visibleGroups: Set<string>;
  onToggleGroup: (groupId: string) => void;
}

export function LayerPanel({ groups, visibleGroups, onToggleGroup }: LayerPanelProps) {
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

          {groups.map((group) => (
            <label key={group.id} className="layer-toggle">
              <input
                type="checkbox"
                checked={visibleGroups.has(group.id)}
                onChange={() => onToggleGroup(group.id)}
              />
              <span>{group.label}</span>
            </label>
          ))}
        </div>
      )}
    </div>
  );
}
