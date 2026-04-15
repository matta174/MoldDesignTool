import { useMemo } from 'react';
import * as THREE from 'three';
import { useDesignStore } from '../../state/designStore';
import { useViewportStore } from '../../state/viewportStore';
import { generateGeometry } from '../../../designs/templates/generateGeometry';
import { buildHeatmapGeometry } from '../../../mold-engine/analysis/DraftAnalyzer';
import { useDisposableGeometry } from '../../../utils/hooks/useDisposableGeometry';

/**
 * Renders the model with per-face vertex colors representing draft angles.
 * Red = undercut, Orange = marginal, Green = good, Gray = neutral (flat).
 * Only visible when the draft heatmap toggle is active.
 */
export function DraftHeatmapModel() {
  const params = useDesignStore((s) => s.params);
  const selectedTemplate = useDesignStore((s) => s.selectedTemplate);
  const showDraftHeatmap = useViewportStore((s) => s.showDraftHeatmap);

  const heatmapGeo = useMemo(() => {
    if (!showDraftHeatmap) return null;

    try {
      const modelGeo = generateGeometry(selectedTemplate, params);
      const result = buildHeatmapGeometry(modelGeo);
      return result.geometry;
    } catch (e) {
      console.warn('Heatmap generation failed:', e);
      return null;
    }
  }, [selectedTemplate, params, showDraftHeatmap]);

  // Dispose previous heatmap geometry when it changes
  useDisposableGeometry(heatmapGeo);

  const material = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        vertexColors: true,
        roughness: 0.7,
        metalness: 0.05,
        flatShading: true,
        side: THREE.DoubleSide,
      }),
    []
  );

  if (!showDraftHeatmap || !heatmapGeo) return null;

  return (
    <mesh
      geometry={heatmapGeo}
      material={material}
      castShadow
      receiveShadow
    />
  );
}
