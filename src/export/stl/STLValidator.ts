import * as THREE from 'three';

export interface ValidationResult {
  valid: boolean;
  warnings: string[];
  errors: string[];
  stats: {
    triangles: number;
    vertices: number;
    hasNormals: boolean;
    isIndexed: boolean;
    boundingBox: THREE.Box3;
    estimatedFileSizeMB: number;
  };
}

/**
 * Pre-export validation: checks geometry is suitable for STL export.
 * Catches common issues before the user downloads a broken file.
 */
export function validateForExport(geometry: THREE.BufferGeometry): ValidationResult {
  const warnings: string[] = [];
  const errors: string[] = [];

  const positions = geometry.getAttribute('position');
  if (!positions) {
    errors.push('Geometry has no position attribute');
    return {
      valid: false,
      warnings,
      errors,
      stats: {
        triangles: 0,
        vertices: 0,
        hasNormals: false,
        isIndexed: false,
        boundingBox: new THREE.Box3(),
        estimatedFileSizeMB: 0,
      },
    };
  }

  const index = geometry.getIndex();
  const vertices = positions.count;
  const triangles = index ? index.count / 3 : vertices / 3;
  const hasNormals = !!geometry.getAttribute('normal');

  // Compute bounding box
  geometry.computeBoundingBox();
  const bb = geometry.boundingBox || new THREE.Box3();
  const size = new THREE.Vector3();
  bb.getSize(size);

  // Estimated binary STL size
  const estimatedFileSizeMB = (80 + 4 + triangles * 50) / (1024 * 1024);

  // Validation checks
  if (vertices === 0) {
    errors.push('Geometry is empty (0 vertices)');
  }

  if (vertices % 3 !== 0 && !index) {
    errors.push(`Vertex count (${vertices}) is not a multiple of 3 — geometry may not form valid triangles`);
  }

  if (triangles > 500000) {
    warnings.push(`High triangle count (${triangles.toLocaleString()}) — export may be slow and file large (${estimatedFileSizeMB.toFixed(1)} MB)`);
  }

  // Check for degenerate triangles (zero-area)
  let degenerateCount = 0;
  const vA = new THREE.Vector3();
  const vB = new THREE.Vector3();
  const vC = new THREE.Vector3();
  const edge1 = new THREE.Vector3();
  const edge2 = new THREE.Vector3();
  const cross = new THREE.Vector3();

  const sampleLimit = Math.min(triangles, 10000); // Sample for perf
  const step = Math.max(1, Math.floor(triangles / sampleLimit));

  for (let i = 0; i < triangles; i += step) {
    let idxA: number, idxB: number, idxC: number;
    if (index) {
      // Direct array access for index buffer (stores integer indices, not vector components)
      const arr = index.array;
      idxA = arr[i * 3];
      idxB = arr[i * 3 + 1];
      idxC = arr[i * 3 + 2];
    } else {
      idxA = i * 3;
      idxB = i * 3 + 1;
      idxC = i * 3 + 2;
    }

    vA.fromBufferAttribute(positions, idxA);
    vB.fromBufferAttribute(positions, idxB);
    vC.fromBufferAttribute(positions, idxC);

    edge1.subVectors(vB, vA);
    edge2.subVectors(vC, vA);
    cross.crossVectors(edge1, edge2);

    if (cross.lengthSq() < 1e-10) {
      degenerateCount++;
    }
  }

  if (degenerateCount > 0) {
    const estimated = Math.round(degenerateCount * (triangles / sampleLimit));
    warnings.push(`~${estimated} degenerate (zero-area) triangles detected — may cause slicer issues`);
  }

  // Check for NaN/Infinity in positions
  let nanCount = 0;
  for (let i = 0; i < Math.min(positions.count, 10000); i++) {
    if (!isFinite(positions.getX(i)) || !isFinite(positions.getY(i)) || !isFinite(positions.getZ(i))) {
      nanCount++;
    }
  }
  if (nanCount > 0) {
    errors.push(`${nanCount} vertices contain NaN or Infinity values`);
  }

  // Size sanity check
  if (size.x > 1000 || size.y > 1000 || size.z > 1000) {
    warnings.push(`Model is very large (${size.x.toFixed(0)}×${size.y.toFixed(0)}×${size.z.toFixed(0)}mm) — check units`);
  }

  if (size.x < 1 && size.y < 1 && size.z < 1) {
    warnings.push(`Model is very small (${size.x.toFixed(2)}×${size.y.toFixed(2)}×${size.z.toFixed(2)}mm) — check units`);
  }

  return {
    valid: errors.length === 0,
    warnings,
    errors,
    stats: {
      triangles,
      vertices,
      hasNormals,
      isIndexed: !!index,
      boundingBox: bb,
      estimatedFileSizeMB,
    },
  };
}
