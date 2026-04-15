import * as THREE from 'three';
import { Brush, Evaluator, ADDITION, SUBTRACTION, INTERSECTION } from 'three-bvh-csg';

export type CSGOp = 'union' | 'subtract' | 'intersect';

const OP_MAP = {
  union: ADDITION,
  subtract: SUBTRACTION,
  intersect: INTERSECTION,
} as const;

let _evaluator: Evaluator | null = null;

function getEvaluator(): Evaluator {
  if (!_evaluator) {
    _evaluator = new Evaluator();
  }
  return _evaluator;
}

/**
 * Creates a Brush (CSG-ready mesh) from a BufferGeometry.
 * Brush extends THREE.Mesh so it carries geometry + material.
 */
export function createBrush(
  geometry: THREE.BufferGeometry,
  material?: THREE.Material
): Brush {
  const mat = material || new THREE.MeshStandardMaterial({
    color: '#6b6b6b',
    roughness: 0.85,
    metalness: 0.05,
  });
  const brush = new Brush(geometry, mat);
  brush.updateMatrixWorld(true);
  return brush;
}

/**
 * Performs a CSG boolean operation between two geometries.
 * Returns the resulting BufferGeometry.
 */
export function csgEvaluate(
  geoA: THREE.BufferGeometry,
  geoB: THREE.BufferGeometry,
  operation: CSGOp
): THREE.BufferGeometry {
  const evaluator = getEvaluator();
  const brushA = createBrush(geoA);
  const brushB = createBrush(geoB);

  const result = evaluator.evaluate(brushA, brushB, OP_MAP[operation]);
  const resultGeo = result.geometry;

  // Clean up
  brushA.geometry.dispose();
  brushB.geometry.dispose();

  resultGeo.computeVertexNormals();
  return resultGeo;
}

/**
 * Performs a CSG operation using positioned brushes (for transforms).
 * Applies the brush's world matrix before evaluation.
 */
export function csgEvaluateBrushes(
  brushA: Brush,
  brushB: Brush,
  operation: CSGOp
): THREE.BufferGeometry {
  const evaluator = getEvaluator();
  brushA.updateMatrixWorld(true);
  brushB.updateMatrixWorld(true);

  const result = evaluator.evaluate(brushA, brushB, OP_MAP[operation]);
  result.geometry.computeVertexNormals();
  return result.geometry;
}

/**
 * Chain multiple CSG subtractions from a base geometry.
 * Useful for subtracting pour holes, vents, etc. from a mold box.
 */
export function csgSubtractMultiple(
  base: THREE.BufferGeometry,
  subtracts: THREE.BufferGeometry[]
): THREE.BufferGeometry {
  let current = base;
  for (const sub of subtracts) {
    current = csgEvaluate(current, sub, 'subtract');
  }
  return current;
}
