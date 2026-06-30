/**
 * Service d'export SVG des données vectorielles de la carte.
 *
 * Ce module extrait les features visibles de la carte MapLibre,
 * les convertit en éléments SVG et les organise dans des groupes (<g>)
 * correspondant aux couches cartographiques.
 *
 * Couches SVG générées (de bas en haut) :
 *   1. landuse    – Occupation du sol (parcs, forêts, zones urbaines)
 *   2. water      – Masses et cours d'eau
 *   3. roads      – Réseau routier et ferroviaire
 *   4. buildings  – Bâtiments
 *   5. boundaries – Limites administratives
 *   6. labels     – Noms de lieux (texte)
 */
import type { Map, MapGeoJSONFeature } from 'maplibre-gl';
import { LAYER_GROUPS } from '../layers';
import type { ImportedLayer } from '../hooks/useImportedLayers';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface SvgExportOptions {
  /** Inclure les labels texte dans le SVG (défaut: true) */
  includeLabels?: boolean;
  /** Couleur de fond du SVG (défaut: #f8f4f0) */
  backgroundColor?: string;
  /** Couches importées à inclure dans l'export */
  importedLayers?: ImportedLayer[];
}

interface PointCoord {
  x: number;
  y: number;
}

// ---------------------------------------------------------------------------
// Conversion coordonnées géographiques → pixels SVG
// ---------------------------------------------------------------------------

/**
 * Projette une coordonnée [lng, lat] dans l'espace pixel du canvas.
 */
function projectCoord(map: Map, coord: [number, number]): PointCoord {
  const point = map.project(coord);
  return { x: Math.round(point.x * 100) / 100, y: Math.round(point.y * 100) / 100 };
}

/**
 * Projette un anneau de coordonnées (polygon ring) en points SVG.
 */
function projectRing(map: Map, ring: [number, number][]): PointCoord[] {
  return ring.map((coord) => projectCoord(map, coord));
}

/**
 * Convertit un tableau de points en chaîne SVG path "M x y L x y...".
 */
function pointsToPathD(points: PointCoord[], close: boolean): string {
  if (points.length === 0) return '';
  const parts = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x} ${p.y}`);
  if (close) parts.push('Z');
  return parts.join(' ');
}

// ---------------------------------------------------------------------------
// Construction de géométries SVG
// ---------------------------------------------------------------------------

/**
 * Crée le contenu SVG pour une feature, selon son type de géométrie.
 */
function featureToSvgElement(
  map: Map,
  feature: MapGeoJSONFeature,
  style: FeatureStyle,
): string {
  const geom = feature.geometry;

  switch (geom.type) {
    case 'Point':
    case 'MultiPoint': {
      const coords = geom.type === 'Point' ? [geom.coordinates] : geom.coordinates;
      return coords
        .map((c) => {
          const p = projectCoord(map, c as [number, number]);
          return `<circle cx="${p.x}" cy="${p.y}" r="${style.radius ?? 2}" fill="${style.fill ?? '#666'}" opacity="${style.opacity ?? 1}" />`;
        })
        .join('\n');
    }

    case 'LineString':
    case 'MultiLineString': {
      const lines = geom.type === 'LineString' ? [geom.coordinates] : geom.coordinates;
      return lines
        .map((line) => {
          const pts = projectRing(map, line as [number, number][]);
          const d = pointsToPathD(pts, false);
          return `<path d="${d}" fill="none" stroke="${style.stroke ?? '#333'}" stroke-width="${style.strokeWidth ?? 1}" stroke-linecap="round" stroke-linejoin="round" opacity="${style.opacity ?? 1}" ${style.dashArray ? `stroke-dasharray="${style.dashArray}"` : ''} />`;
        })
        .join('\n');
    }

    case 'Polygon':
    case 'MultiPolygon': {
      const polygons = geom.type === 'Polygon' ? [geom.coordinates] : geom.coordinates;
      return polygons
        .map((polygon) => {
          const rings = polygon as [number, number][][];
          const d = rings.map((ring) => pointsToPathD(projectRing(map, ring), true)).join(' ');
          return `<path d="${d}" fill="${style.fill ?? '#ccc'}" stroke="${style.stroke ?? 'none'}" stroke-width="${style.strokeWidth ?? 0}" fill-rule="evenodd" opacity="${style.opacity ?? 1}" />`;
        })
        .join('\n');
    }

    default:
      return '';
  }
}

// ---------------------------------------------------------------------------
// Styles par couche (tirés des propriétés paint MapLibre évaluées)
// ---------------------------------------------------------------------------

interface FeatureStyle {
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
  opacity?: number;
  dashArray?: string;
  radius?: number;
}

/**
 * Essaie de récupérer le style réel d'un layer MapLibre.
 * Tombe sur des valeurs par défaut si les propriétés ne sont pas accessibles.
 */
function getFeatureStyle(map: Map, feature: MapGeoJSONFeature): FeatureStyle {
  const layerId = feature.layer?.id ?? '';
  const layerObj = map.getStyle()?.layers?.find((l) => l.id === layerId);

  if (!layerObj) return {};

  const paint = (layerObj as Record<string, unknown>).paint as Record<string, unknown> | undefined;
  if (!paint) return {};

  const style: FeatureStyle = {};

  // Fill layers
  if ('fill-color' in paint) {
    style.fill = resolveColorValue(paint['fill-color']);
    style.opacity = resolveNumericValue(paint['fill-opacity'], 1);
    if ('fill-outline-color' in paint) {
      style.stroke = resolveColorValue(paint['fill-outline-color']);
      style.strokeWidth = 0.5;
    }
  }

  // Line layers
  if ('line-color' in paint) {
    style.stroke = resolveColorValue(paint['line-color']);
    style.strokeWidth = resolveNumericValue(paint['line-width'], 1);
    style.opacity = resolveNumericValue(paint['line-opacity'], 1);
  }

  return style;
}

/**
 * Résout une valeur de couleur (peut être une expression MapLibre ou une string).
 */
function resolveColorValue(value: unknown): string {
  if (typeof value === 'string') return value;
  // Pour les expressions complexes, on retourne une couleur par défaut
  return '#888888';
}

/**
 * Résout une valeur numérique (peut être une expression MapLibre ou un nombre).
 */
function resolveNumericValue(value: unknown, fallback: number): number {
  if (typeof value === 'number') return value;
  return fallback;
}

// ---------------------------------------------------------------------------
// Mapping layer → SVG group
// ---------------------------------------------------------------------------

/**
 * Table de correspondance : layer ID MapLibre → nom du groupe SVG.
 */
function buildLayerGroupMap(): Record<string, string> {
  const groupMap: Record<string, string> = {};
  for (const group of LAYER_GROUPS) {
    for (const layerId of group.layerIds) {
      groupMap[layerId] = group.id;
    }
  }
  return groupMap;
}

// ---------------------------------------------------------------------------
// Styles hardcodés par groupe pour un rendu SVG plus fidèle
// ---------------------------------------------------------------------------

/**
 * Retourne un style par défaut basé sur le groupe de la couche et le layer id.
 * Utilisé en fallback quand le style évalué dynamiquement est trop complexe.
 */
function getFallbackStyle(groupId: string, layerId: string): FeatureStyle {
  // Routes
  if (groupId === 'roads') {
    if (layerId.includes('motorway') && !layerId.includes('casing')) {
      return { stroke: '#e892a2', strokeWidth: 3, opacity: 1 };
    }
    if (layerId.includes('motorway') && layerId.includes('casing')) {
      return { stroke: '#dc2a67', strokeWidth: 4.5, opacity: 1 };
    }
    if (layerId.includes('trunk') && !layerId.includes('casing')) {
      return { stroke: '#f9b29c', strokeWidth: 2.5, opacity: 1 };
    }
    if (layerId.includes('trunk') && layerId.includes('casing')) {
      return { stroke: '#c84e2f', strokeWidth: 3.5, opacity: 1 };
    }
    if (layerId.includes('primary') && !layerId.includes('casing')) {
      return { stroke: '#fcd6a4', strokeWidth: 2, opacity: 1 };
    }
    if (layerId.includes('primary') && layerId.includes('casing')) {
      return { stroke: '#c89541', strokeWidth: 3, opacity: 1 };
    }
    if (layerId.includes('secondary') && !layerId.includes('casing')) {
      return { stroke: '#f7fabf', strokeWidth: 1.5, opacity: 1 };
    }
    if (layerId.includes('tertiary') && !layerId.includes('casing')) {
      return { stroke: '#ffffff', strokeWidth: 1.2, opacity: 1 };
    }
    if (layerId.includes('minor')) {
      return { stroke: '#ffffff', strokeWidth: 0.8, opacity: 1 };
    }
    if (layerId.includes('service')) {
      return { stroke: '#ffffff', strokeWidth: 0.5, opacity: 1 };
    }
    if (layerId.includes('cycleway')) {
      return { stroke: '#6fa8dc', strokeWidth: 0.8, opacity: 0.9, dashArray: '3 1.5' };
    }
    if (layerId.includes('path')) {
      return { stroke: '#999999', strokeWidth: 0.5, opacity: 0.8, dashArray: '2 2' };
    }
    return { stroke: '#cccccc', strokeWidth: 1, opacity: 1 };
  }

  // Voies ferrées
  if (groupId === 'rails') {
    if (layerId.includes('rail-main-base') || layerId === 'uz-rail-main-base') {
      return { stroke: '#3a3a3a', strokeWidth: 1.2, opacity: 1 };
    }
    if (layerId.includes('rail-main-hatch') || layerId === 'uz-rail-main-hatch') {
      return { stroke: '#ffffff', strokeWidth: 1.6, opacity: 1, dashArray: '0.4 3' };
    }
    if (layerId.includes('rail-narrow')) {
      return { stroke: '#8b4513', strokeWidth: 0.8, opacity: 1, dashArray: '4 2' };
    }
    if (layerId.includes('rail-preserved')) {
      return { stroke: '#a0522d', strokeWidth: 0.8, opacity: 1, dashArray: '2 3' };
    }
    if (layerId.includes('rail-funicular')) {
      return { stroke: '#ff7f00', strokeWidth: 1, opacity: 1, dashArray: '2 1.5' };
    }
    if (layerId.includes('rail-service')) {
      return { stroke: '#888888', strokeWidth: 0.6, opacity: 1, dashArray: '3 2' };
    }
    if (layerId.includes('transit-subway')) {
      return { stroke: '#6633cc', strokeWidth: 1, opacity: 0.9, dashArray: '3 2' };
    }
    if (layerId.includes('transit-tram')) {
      return { stroke: '#2e7d32', strokeWidth: 0.9, opacity: 1 };
    }
    if (layerId.includes('transit-light-rail')) {
      return { stroke: '#00838f', strokeWidth: 0.9, opacity: 1 };
    }
    if (layerId.includes('transit-monorail')) {
      return { stroke: '#5d4037', strokeWidth: 0.9, opacity: 1, dashArray: '1 2' };
    }
    return { stroke: '#555555', strokeWidth: 1, opacity: 1 };
  }

  // Eau
  if (groupId === 'water') {
    if (layerId.includes('waterway')) {
      return { stroke: '#aad3df', strokeWidth: 1.5, opacity: 1 };
    }
    return { fill: '#aad3df', opacity: 1 };
  }

  // Occupation du sol
  if (groupId === 'landuse') {
    if (layerId.includes('forest')) return { fill: '#add19e', opacity: 0.6 };
    if (layerId.includes('grass')) return { fill: '#c8facc', opacity: 0.6 };
    if (layerId.includes('park')) return { fill: '#c8facc', opacity: 0.6 };
    if (layerId.includes('residential')) return { fill: '#e8e0d8', opacity: 0.5 };
    if (layerId.includes('commercial')) return { fill: '#f2dad9', opacity: 0.5 };
    if (layerId.includes('industrial')) return { fill: '#ebdbe8', opacity: 0.5 };
    if (layerId.includes('cemetery')) return { fill: '#aacbaf', opacity: 0.5 };
    if (layerId.includes('hospital')) return { fill: '#f0d8d8', opacity: 0.5 };
    if (layerId.includes('school')) return { fill: '#f0e8d8', opacity: 0.5 };
    return { fill: '#e8e0d8', opacity: 0.4 };
  }

  // Bâtiments
  if (groupId === 'buildings') {
    return { fill: '#d9d0c9', stroke: '#b9b0a9', strokeWidth: 0.3, opacity: 0.7 };
  }

  // Frontières
  if (groupId === 'boundaries') {
    if (layerId.includes('country')) {
      return { stroke: '#9e7bb5', strokeWidth: 1.5, opacity: 1, dashArray: '5 3' };
    }
    if (layerId.includes('state')) {
      return { stroke: '#b5a5c2', strokeWidth: 1, opacity: 0.8, dashArray: '4 3' };
    }
    return { stroke: '#c5b5d2', strokeWidth: 0.5, opacity: 0.6, dashArray: '3 2' };
  }

  return {};
}

// ---------------------------------------------------------------------------
// Export SVG principal
// ---------------------------------------------------------------------------

/** Structure de résultat de l'export SVG */
export interface SvgExportResult {
  /** Contenu SVG complet */
  svgContent: string;
  /** Largeur en pixels */
  width: number;
  /** Hauteur en pixels */
  height: number;
}

/**
 * Exporte la vue actuelle de la carte en SVG avec les features visibles,
 * organisées par couches.
 */
export function exportMapToSvg(
  map: Map,
  options: SvgExportOptions = {},
): SvgExportResult {
  const { includeLabels = true, backgroundColor = '#f8f4f0', importedLayers = [] } = options;

  const canvas = map.getCanvas();
  const width = canvas.width;
  const height = canvas.height;
  const dpr = window.devicePixelRatio || 1;
  const svgWidth = Math.round(width / dpr);
  const svgHeight = Math.round(height / dpr);

  // Mapping layer IDs → groupes SVG
  const layerGroupMap = buildLayerGroupMap();

  // Récupérer toutes les features visibles, groupées par couche et sous-couche
  // Structure : { groupId: { layerId: svgElements[] } }
  const groupedElements: Record<string, Record<string, string[]>> = {};
  for (const g of LAYER_GROUPS) {
    groupedElements[g.id] = {};
  }

  // L'ordre SVG suit LAYER_GROUPS (= ordre de rendu de la carte)
  const groupOrder = LAYER_GROUPS.map((g) => g.id);

  // Collecter les features pour chaque groupe
  for (const group of LAYER_GROUPS) {
    if (group.id === 'labels' && !includeLabels) continue;

    for (const layerId of group.layerIds) {
      // Vérifier que le layer existe et est visible
      const layer = map.getLayer(layerId);
      if (!layer) continue;

      const visibility = map.getLayoutProperty(layerId, 'visibility');
      if (visibility === 'none') continue;

      // Récupérer les features rendues pour cette couche
      let features: MapGeoJSONFeature[];
      try {
        features = map.queryRenderedFeatures(undefined, { layers: [layerId] });
      } catch {
        continue;
      }

      if (features.length === 0) continue;

      // Déterminer le groupe SVG
      const groupId = layerGroupMap[layerId] ?? 'landuse';

      // Initialiser le sous-groupe si nécessaire
      if (!groupedElements[groupId][layerId]) {
        groupedElements[groupId][layerId] = [];
      }

      // Détecter si c'est un layer de polygone (fill) — les polygones
      // sont clippés aux bords de tuiles par MapLibre. Il faut fusionner
      // tous les fragments d'un même polygone plutôt que dédupliquer.
      const layerSpec = map.getStyle()?.layers?.find((l) => l.id === layerId);
      const isFillLayer =
        layerSpec && 'type' in layerSpec && (layerSpec as Record<string, unknown>).type === 'fill';

      if (isFillLayer && group.id !== 'labels') {
        // ── Polygones : rendu individuel de chaque fragment de tuile ──
        // IMPORTANT : on ne fusionne PAS les fragments en un seul <path>.
        // Les tuiles vectorielles clippent les polygones à leurs limites avec
        // un petit buffer. Si on combine tout en un seul <path fill-rule="evenodd">,
        // les zones de chevauchement (buffer overlap) deviennent transparentes
        // car elles sont à l'intérieur d'un nombre pair d'anneaux → bandes blanches.
        //
        // On rend chaque fragment comme un <path> distinct, et on ajoute un
        // stroke de la même couleur que le fill pour masquer les micro-gaps
        // résiduels entre tuiles adjacentes.
        const seenCoords = new Set<string>();

        for (const feature of features) {
          // Dédupliquer les fragments identiques retournés par plusieurs tuiles
          const geomAny = feature.geometry as unknown as { coordinates?: unknown };
          const coordKey = JSON.stringify(geomAny.coordinates ?? '');
          if (seenCoords.has(coordKey)) continue;
          seenCoords.add(coordKey);

          const geom = feature.geometry;
          const polygons =
            geom.type === 'Polygon'
              ? [geom.coordinates]
              : geom.type === 'MultiPolygon'
                ? geom.coordinates
                : [];

          if (polygons.length === 0) continue;

          // Chaque polygone individuel garde son propre fill-rule="evenodd"
          // (correct pour ses propres trous), sans interférence avec les
          // fragments des tuiles voisines.
          const pathParts: string[] = [];
          for (const polygon of polygons) {
            for (const ring of polygon as [number, number][][]) {
              const pts = projectRing(map, ring);
              pathParts.push(pointsToPathD(pts, true));
            }
          }

          if (pathParts.length > 0) {
            const d = pathParts.join(' ');
            const dynamicStyle = getFeatureStyle(map, feature);
            const fallbackStyle = getFallbackStyle(groupId, layerId);
            const style = mergeStyles(fallbackStyle, dynamicStyle);
            const fillColor = style.fill ?? '#ccc';
            // Le stroke de la même couleur que le fill comble les micro-gaps
            // aux jointures de tuiles (quantification des coordonnées).
            groupedElements[groupId][layerId].push(
              `<path d="${d}" fill="${fillColor}" stroke="${fillColor}" stroke-width="0.5" stroke-linejoin="round" fill-rule="evenodd" opacity="${style.opacity ?? 1}" />`,
            );
          }
        }
      } else {
        // ── Lignes, points, labels : dédupliquer par géométrie ──
        // On utilise les coordonnées complètes comme clé de déduplication
        // car feature.id est local à la tuile et peut être différent pour
        // le même segment de route retourné depuis des tuiles différentes.
        const seen = new Set<string>();

        for (const feature of features) {
          const geomAny = feature.geometry as unknown as { coordinates?: unknown };
          const coordKey = JSON.stringify(geomAny.coordinates ?? '');
          const fid = `${feature.layer?.id ?? ''}_${feature.properties?.['class'] ?? ''}_${coordKey}`;
          if (seen.has(fid)) continue;
          seen.add(fid);

          // Labels → texte SVG (Point = ancrage simple, LineString = texte le long de la ligne)
          if (group.id === 'labels') {
            const name = feature.properties?.['name'] as string;
            if (!name) continue;

            const fontSize = getFontSize(layerId);
            const fontWeight = layerId.includes('city') || layerId.includes('country') ? 'bold' : 'normal';
            const fontStyle = layerId.includes('water') ? 'italic' : 'normal';
            const textTransform = layerId.includes('state') || layerId.includes('suburb') ? ' text-transform="uppercase"' : '';
            const labelClass = `label-${layerId.replace('label-', '')}`;

            if (feature.geometry.type === 'Point') {
              const p = projectCoord(map, feature.geometry.coordinates as [number, number]);
              groupedElements.labels[layerId].push(
                `<text x="${p.x}" y="${p.y}" class="${labelClass}" font-family="system-ui, -apple-system, sans-serif" font-size="${fontSize}" font-weight="${fontWeight}" font-style="${fontStyle}" fill="#333" text-anchor="middle" dominant-baseline="central"${textTransform}>` +
                `<tspan stroke="#fff" stroke-width="3" paint-order="stroke">${escapeXml(name)}</tspan>` +
                `</text>`,
              );
            } else if (feature.geometry.type === 'LineString') {
              const coords = feature.geometry.coordinates as [number, number][];
              const midInfo = getLineMidpoint(map, coords);
              if (midInfo) {
                groupedElements.labels[layerId].push(
                  `<text x="${midInfo.x}" y="${midInfo.y}" class="${labelClass}" font-family="system-ui, -apple-system, sans-serif" font-size="${fontSize}" font-weight="${fontWeight}" font-style="${fontStyle}" fill="#333" text-anchor="middle" dominant-baseline="central" transform="rotate(${midInfo.angle}, ${midInfo.x}, ${midInfo.y})"${textTransform}>` +
                  `<tspan stroke="#fff" stroke-width="3" paint-order="stroke">${escapeXml(name)}</tspan>` +
                  `</text>`,
                );
              }
            } else if (feature.geometry.type === 'MultiLineString') {
              const firstLine = (feature.geometry.coordinates as [number, number][][])[0];
              if (firstLine) {
                const midInfo = getLineMidpoint(map, firstLine);
                if (midInfo) {
                  groupedElements.labels[layerId].push(
                    `<text x="${midInfo.x}" y="${midInfo.y}" class="${labelClass}" font-family="system-ui, -apple-system, sans-serif" font-size="${fontSize}" font-weight="${fontWeight}" font-style="${fontStyle}" fill="#333" text-anchor="middle" dominant-baseline="central" transform="rotate(${midInfo.angle}, ${midInfo.x}, ${midInfo.y})"${textTransform}>` +
                    `<tspan stroke="#fff" stroke-width="3" paint-order="stroke">${escapeXml(name)}</tspan>` +
                    `</text>`,
                  );
                }
              }
            }
            continue;
          }

          // Autres géométries (lignes, points)
          const dynamicStyle = getFeatureStyle(map, feature);
          const fallbackStyle = getFallbackStyle(groupId, layerId);
          const style = mergeStyles(fallbackStyle, dynamicStyle);

          const svgEl = featureToSvgElement(map, feature, style);
          if (svgEl) {
            groupedElements[groupId][layerId].push(svgEl);
          }
        }
      }
    }
  }

  // Assembler le SVG final
  const svgParts: string[] = [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${svgWidth} ${svgHeight}" width="${svgWidth}" height="${svgHeight}">`,
    `  <title>OSM Map Export</title>`,
    `  <desc>Export SVG du plan OSM — ${new Date().toLocaleDateString('fr-FR')}</desc>`,
    '',
    `  <!-- Fond -->`,
    `  <rect width="100%" height="100%" fill="${backgroundColor}" />`,
    '',
  ];

  for (const groupId of groupOrder) {
    const group = LAYER_GROUPS.find((g) => g.id === groupId);
    if (!group) continue;

    // Parcourir les layer IDs dans leur ordre de rendu exact (même ordre que la carte)
    const activeLayerIds = group.layerIds.filter(
      (lid) => groupedElements[groupId][lid]?.length > 0,
    );
    if (activeLayerIds.length === 0) continue;

    const groupLabel = group.label;

    svgParts.push(`  <!-- Couche: ${groupLabel} -->`);
    svgParts.push(`  <g id="layer-${groupId}" data-label="${groupLabel}">`);

    if (group.subgroups && group.subgroups.length > 0) {
      // ── Groupe avec sous-groupes : un <g> par sous-groupe ──
      const subgroupForLayer: Record<string, { id: string; label: string }> = {};
      for (const sg of group.subgroups) {
        for (const lid of sg.layerIds) {
          subgroupForLayer[lid] = { id: sg.id, label: sg.label };
        }
      }

      for (const sg of group.subgroups) {
        const subActiveLayers = sg.layerIds.filter(
          (lid) => groupedElements[groupId][lid]?.length > 0,
        );
        if (subActiveLayers.length === 0) continue;

        svgParts.push(
          `    <g id="layer-${groupId}--${sg.id}" data-label="${sg.label}">`,
        );
        for (const layerId of subActiveLayers) {
          const elements = groupedElements[groupId][layerId];
          for (const el of elements) {
            svgParts.push(`      ${el}`);
          }
        }
        svgParts.push(`    </g>`);
      }
    } else {
      // ── Groupe plat : un <g> par layer-id ──
      for (const layerId of activeLayerIds) {
        const elements = groupedElements[groupId][layerId];
        // Nom lisible du sous-calque (ex: "road-motorway-casing" → "motorway-casing")
        const subName = layerId.replace(/^(road|landuse|water|building|boundary|label)-?/, '');
        svgParts.push(`    <g id="layer-${groupId}--${subName || layerId}" data-sublayer="${layerId}">`);
        for (const el of elements) {
          svgParts.push(`      ${el}`);
        }
        svgParts.push(`    </g>`);
      }
    }

    svgParts.push(`  </g>`);
    svgParts.push('');
  }

  // Couches importées — chacune dans son propre calque SVG
  for (const imported of importedLayers) {
    const importElements: string[] = [];

    for (const feature of imported.geojson.features) {
      if (!feature.geometry) continue;

      const geom = feature.geometry;
      const color = imported.color;

      switch (geom.type) {
        case 'Point':
        case 'MultiPoint': {
          const coords = geom.type === 'Point' ? [geom.coordinates] : geom.coordinates;
          for (const c of coords) {
            const p = projectCoord(map, c as [number, number]);
            importElements.push(
              `<circle cx="${p.x}" cy="${p.y}" r="5" fill="${color}" stroke="#fff" stroke-width="1.5" opacity="0.85" />`,
            );
          }
          break;
        }
        case 'LineString':
        case 'MultiLineString': {
          const lines = geom.type === 'LineString' ? [geom.coordinates] : geom.coordinates;
          for (const line of lines) {
            const pts = projectRing(map, line as [number, number][]);
            const d = pointsToPathD(pts, false);
            importElements.push(
              `<path d="${d}" fill="none" stroke="${color}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" opacity="0.85" />`,
            );
          }
          break;
        }
        case 'Polygon':
        case 'MultiPolygon': {
          const polygons = geom.type === 'Polygon' ? [geom.coordinates] : geom.coordinates;
          for (const polygon of polygons) {
            const rings = polygon as [number, number][][];
            const d = rings.map((ring) => pointsToPathD(projectRing(map, ring), true)).join(' ');
            importElements.push(
              `<path d="${d}" fill="${color}" fill-opacity="0.25" stroke="${color}" stroke-width="2" fill-rule="evenodd" opacity="0.85" />`,
            );
          }
          break;
        }
      }
    }

    if (importElements.length > 0) {
      const safeName = imported.name.replace(/[^a-zA-Z0-9_-]/g, '_');
      svgParts.push(`  <!-- Couche importée: ${imported.name} -->`);
      svgParts.push(`  <g id="layer-import--${safeName}" data-label="Import: ${imported.name}">`);
      for (const el of importElements) {
        svgParts.push(`    ${el}`);
      }
      svgParts.push(`  </g>`);
      svgParts.push('');
    }
  }

  svgParts.push('</svg>');

  return {
    svgContent: svgParts.join('\n'),
    width: svgWidth,
    height: svgHeight,
  };
}

// ---------------------------------------------------------------------------
// Utilitaires
// ---------------------------------------------------------------------------

/**
 * Calcule le point milieu (en pixels SVG) et l'angle de rotation pour placer
 * un texte le long d'une ligne. Le texte est toujours orienté pour être lisible
 * (gauche → droite, angle entre -90° et +90°).
 */
function getLineMidpoint(
  map: Map,
  coords: [number, number][],
): { x: number; y: number; angle: number } | null {
  if (coords.length < 2) return null;

  const projected = coords.map((c) => projectCoord(map, c));

  // Calculer la longueur cumulée de chaque segment
  const segLengths: number[] = [];
  let totalLength = 0;
  for (let i = 1; i < projected.length; i++) {
    const dx = projected[i].x - projected[i - 1].x;
    const dy = projected[i].y - projected[i - 1].y;
    const len = Math.sqrt(dx * dx + dy * dy);
    segLengths.push(len);
    totalLength += len;
  }

  if (totalLength === 0) return null;

  // Trouver le point à la moitié de la longueur totale
  const halfLength = totalLength / 2;
  let accumulated = 0;

  for (let i = 0; i < segLengths.length; i++) {
    const segLen = segLengths[i];
    if (accumulated + segLen >= halfLength) {
      const t = (halfLength - accumulated) / segLen;
      const x = Math.round((projected[i].x + t * (projected[i + 1].x - projected[i].x)) * 100) / 100;
      const y = Math.round((projected[i].y + t * (projected[i + 1].y - projected[i].y)) * 100) / 100;

      // Angle du segment en degrés
      const dx = projected[i + 1].x - projected[i].x;
      const dy = projected[i + 1].y - projected[i].y;
      let angle = Math.round((Math.atan2(dy, dx) * 180) / Math.PI * 10) / 10;

      // Garder le texte lisible (pas à l'envers)
      if (angle > 90) angle -= 180;
      if (angle < -90) angle += 180;

      return { x, y, angle };
    }
    accumulated += segLen;
  }

  return null;
}

/** Taille de police par type de label */
function getFontSize(layerId: string): number {
  if (layerId.includes('country')) return 16;
  if (layerId.includes('state')) return 13;
  if (layerId.includes('city')) return 14;
  if (layerId.includes('town')) return 12;
  if (layerId.includes('village')) return 10;
  if (layerId.includes('suburb')) return 9;
  if (layerId.includes('street')) return 8;
  return 10;
}

/** Échappe les caractères spéciaux XML */
function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/** Fusionne deux styles, les valeurs non-undefined du second écrasent le premier */
function mergeStyles(base: FeatureStyle, override: FeatureStyle): FeatureStyle {
  return {
    fill: override.fill ?? base.fill,
    stroke: override.stroke ?? base.stroke,
    strokeWidth: override.strokeWidth ?? base.strokeWidth,
    opacity: override.opacity ?? base.opacity,
    dashArray: override.dashArray ?? base.dashArray,
    radius: override.radius ?? base.radius,
  };
}

/**
 * Attend que la carte soit dans l'état "idle" (toutes les tuiles chargées
 * et rendues) avant de lancer l'export. Ceci évite les bandes blanches dues
 * à des tuiles pas encore chargées au moment de l'export.
 */
export async function exportMapToSvgAsync(
  map: Map,
  options: SvgExportOptions = {},
): Promise<SvgExportResult> {
  // Si la carte n'est pas encore idle, attendre qu'elle le soit
  if (!map.isSourceLoaded(map.getStyle()?.sources ? Object.keys(map.getStyle().sources!)[0] : '')) {
    await new Promise<void>((resolve) => {
      const onIdle = () => { resolve(); };
      map.once('idle', onIdle);
      // Sécurité : ne pas attendre plus de 5 secondes
      setTimeout(() => { map.off('idle', onIdle); resolve(); }, 5000);
    });
  }
  return exportMapToSvg(map, options);
}

/**
 * Déclenche le téléchargement d'un fichier SVG dans le navigateur.
 */
export function downloadSvg(svgContent: string, filename = 'osm-map-export.svg'): void {
  const blob = new Blob([svgContent], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
