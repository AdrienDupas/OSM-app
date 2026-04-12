/**
 * Barre de recherche de lieux (géocodage).
 *
 * Utilise l'API Nominatim (OpenStreetMap) pour chercher des villes/lieux
 * et centrer la carte sur le résultat sélectionné à l'échelle adaptée.
 */
import { useState, useCallback, useRef, useEffect } from 'react';
import type { Map } from 'maplibre-gl';

interface SearchBarProps {
  map: Map | null;
}

interface NominatimResult {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
  boundingbox: [string, string, string, string]; // [south, north, west, east]
  type: string;
  class: string;
}

export function SearchBar({ map }: SearchBarProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<NominatimResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Fermer les résultats au clic extérieur
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowResults(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  /** Recherche Nominatim avec debounce */
  const search = useCallback((q: string) => {
    if (timerRef.current) clearTimeout(timerRef.current);

    if (q.trim().length < 2) {
      setResults([]);
      setShowResults(false);
      return;
    }

    timerRef.current = setTimeout(async () => {
      setIsLoading(true);
      try {
        const url = `https://nominatim.openstreetmap.org/search?format=json&limit=5&q=${encodeURIComponent(q)}`;
        const res = await fetch(url, {
          headers: { 'Accept-Language': 'fr' },
        });
        const data: NominatimResult[] = await res.json();
        setResults(data);
        setShowResults(data.length > 0);
      } catch (err) {
        console.error('Search failed:', err);
        setResults([]);
      } finally {
        setIsLoading(false);
      }
    }, 350);
  }, []);

  /** Centrer la carte sur le résultat sélectionné */
  const handleSelect = useCallback(
    (result: NominatimResult) => {
      if (!map) return;

      const [south, north, west, east] = result.boundingbox.map(Number);

      // Utiliser fitBounds pour s'adapter à la taille du lieu
      map.fitBounds(
        [
          [west, south],
          [east, north],
        ],
        { padding: 40, maxZoom: 16, duration: 1200 },
      );

      setQuery(result.display_name.split(',')[0]);
      setShowResults(false);
      setResults([]);
    },
    [map],
  );

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = e.target.value;
      setQuery(val);
      search(val);
    },
    [search],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowResults(false);
      }
      if (e.key === 'Enter' && results.length > 0) {
        handleSelect(results[0]);
      }
    },
    [results, handleSelect],
  );

  return (
    <div className="search-bar" ref={containerRef}>
      <div className="search-input-wrapper">
        <span className="search-icon"></span>
        <input
          type="text"
          className="search-input"
          placeholder="Rechercher un lieu…"
          value={query}
          onChange={handleInputChange}
          onFocus={() => results.length > 0 && setShowResults(true)}
          onKeyDown={handleKeyDown}
        />
        {isLoading && <span className="search-spinner" />}
        {query && !isLoading && (
          <button
            className="search-clear"
            onClick={() => {
              setQuery('');
              setResults([]);
              setShowResults(false);
            }}
            aria-label="Effacer"
          >
            ×
          </button>
        )}
      </div>

      {showResults && results.length > 0 && (
        <ul className="search-results">
          {results.map((r) => (
            <li key={r.place_id}>
              <button
                className="search-result-item"
                onClick={() => handleSelect(r)}
              >
                <span className="search-result-name">
                  {r.display_name.split(',')[0]}
                </span>
                <span className="search-result-detail">
                  {r.display_name.split(',').slice(1, 3).join(',')}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
