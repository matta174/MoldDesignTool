import * as THREE from 'three';
import { useDesignStore } from '../ui/state/designStore';
import { useGeometricStore } from '../ui/state/geometricStore';
import { useSculptStore } from '../ui/state/sculptStore';
import { useImportStore } from '../ui/state/importStore';
import { generateGeometry } from './templates/generateGeometry';
import { evaluateScene } from './geometric/SceneEvaluator';

/**
 * Returns the current model geometry based on the active design mode.
 * - Import mode: returns the imported STL geometry (clone for safety)
 * - Template mode: generates from template + params
 * - Geometric mode: evaluates the CSG scene graph
 * - Sculpt mode: returns the live sculpted geometry (clone for safety)
 *
 * Returns null if no geometry can be produced.
 */
export function getActiveGeometry(): THREE.BufferGeometry | null {
  const { mode, selectedTemplate, params } = useDesignStore.getState();

  switch (mode) {
    case 'import': {
      const { geometry } = useImportStore.getState();
      // Clone to avoid mutating the imported mesh during mold generation
      return geometry ? geometry.clone() : null;
    }

    case 'template':
      return generateGeometry(selectedTemplate, params);

    case 'geometric': {
      const { nodes } = useGeometricStore.getState();
      return evaluateScene(nodes);
    }

    case 'sculpt': {
      const { geometry } = useSculptStore.getState();
      // Clone to avoid mutating the live sculpt mesh during mold generation
      return geometry ? geometry.clone() : null;
    }

    default:
      return null;
  }
}

/**
 * Returns a label for the current model for export naming.
 */
export function getActiveModelName(): string {
  const { mode, selectedTemplate } = useDesignStore.getState();

  switch (mode) {
    case 'import': {
      const { fileName } = useImportStore.getState();
      // Strip extension for clean naming
      return fileName ? fileName.replace(/\.stl$/i, '') : 'imported';
    }
    case 'template':
      return selectedTemplate;
    case 'geometric':
      return 'geometric';
    case 'sculpt':
      return 'sculpted';
    default:
      return 'model';
  }
}
