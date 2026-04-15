import * as THREE from 'three';
import type { PrimitiveType, Vec3 } from '../../ui/state/geometricStore';

/**
 * Creates a BufferGeometry for a given primitive type and dimensions.
 * All geometries are centered at origin — positioning is handled by transforms.
 */
export function createPrimitiveGeometry(
  type: PrimitiveType,
  dimensions: Vec3
): THREE.BufferGeometry {
  let geo: THREE.BufferGeometry;

  switch (type) {
    case 'box': {
      // dimensions: width (x), height (y), depth (z)
      geo = new THREE.BoxGeometry(dimensions.x, dimensions.y, dimensions.z);
      break;
    }
    case 'sphere': {
      // dimensions: radius (x), widthSegments (y), heightSegments (z)
      const radius = dimensions.x;
      const wSeg = Math.max(8, Math.round(dimensions.y));
      const hSeg = Math.max(4, Math.round(dimensions.z));
      geo = new THREE.SphereGeometry(radius, wSeg, hSeg);
      break;
    }
    case 'cylinder': {
      // dimensions: radiusTop (x), radiusBottom (y), height (z)
      geo = new THREE.CylinderGeometry(
        dimensions.x,
        dimensions.y,
        dimensions.z,
        32
      );
      break;
    }
    case 'torus': {
      // dimensions: radius (x), tube (y), segments (z)
      const tubeSeg = Math.max(6, Math.round(dimensions.z));
      geo = new THREE.TorusGeometry(dimensions.x, dimensions.y, 16, tubeSeg);
      // Torus is created in XZ plane by default, rotate to stand upright
      geo.rotateX(Math.PI / 2);
      break;
    }
    default:
      geo = new THREE.BoxGeometry(40, 40, 40);
  }

  geo.computeVertexNormals();
  return geo;
}

/**
 * Generates a descriptive size string for a node.
 */
export function getPrimitiveSizeLabel(
  type: PrimitiveType,
  dimensions: Vec3
): string {
  switch (type) {
    case 'box':
      return `${dimensions.x}×${dimensions.y}×${dimensions.z}`;
    case 'sphere':
      return `r=${dimensions.x}`;
    case 'cylinder':
      return `∅${dimensions.x}/${dimensions.y}×${dimensions.z}`;
    case 'torus':
      return `R=${dimensions.x} t=${dimensions.y}`;
    default:
      return '';
  }
}
