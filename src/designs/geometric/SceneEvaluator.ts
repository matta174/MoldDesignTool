import * as THREE from 'three';
import { Brush } from 'three-bvh-csg';
import { csgEvaluateBrushes, createBrush } from '../../core/csg/CSGOperation';
import { createPrimitiveGeometry } from './PrimitiveFactory';
import type { SceneNode } from '../../ui/state/geometricStore';

/**
 * Converts a SceneNode into a positioned Brush ready for CSG evaluation.
 */
function nodeToBrush(node: SceneNode): Brush {
  const geo = createPrimitiveGeometry(node.type, node.dimensions);
  const brush = createBrush(geo);

  // Apply transforms
  brush.position.set(node.position.x, node.position.y, node.position.z);
  brush.rotation.set(
    (node.rotation.x * Math.PI) / 180,
    (node.rotation.y * Math.PI) / 180,
    (node.rotation.z * Math.PI) / 180
  );
  brush.scale.set(node.scale.x, node.scale.y, node.scale.z);
  brush.updateMatrixWorld(true);

  return brush;
}

/**
 * Evaluates a list of scene nodes into a single combined BufferGeometry
 * by applying CSG operations sequentially.
 *
 * The first node is always the base. Each subsequent node is combined
 * with the running result using its assigned operation.
 *
 * Returns null if the node list is empty.
 */
export function evaluateScene(nodes: SceneNode[]): THREE.BufferGeometry | null {
  if (nodes.length === 0) return null;

  // Start with the first node's geometry
  const firstBrush = nodeToBrush(nodes[0]);

  // Bake the transform into the geometry
  firstBrush.geometry.applyMatrix4(firstBrush.matrixWorld);
  let result = firstBrush.geometry.clone();

  // Combine each subsequent node
  for (let i = 1; i < nodes.length; i++) {
    const node = nodes[i];
    const brush = nodeToBrush(node);

    const resultBrush = createBrush(result);
    // Result brush is already in world space, no transform needed
    resultBrush.updateMatrixWorld(true);

    try {
      result = csgEvaluateBrushes(resultBrush, brush, node.operation);
    } catch (e) {
      console.warn(`CSG operation failed for node ${node.name}:`, e);
      // Skip this node and continue with what we have
      continue;
    }
  }

  result.computeVertexNormals();
  return result;
}

/**
 * Generates individual preview geometries for each node
 * (used for wireframe/ghost rendering before CSG evaluation).
 */
export function generateNodePreviews(
  nodes: SceneNode[]
): { nodeId: string; geometry: THREE.BufferGeometry; matrix: THREE.Matrix4 }[] {
  return nodes.map((node) => {
    const geo = createPrimitiveGeometry(node.type, node.dimensions);
    const matrix = new THREE.Matrix4();
    const euler = new THREE.Euler(
      (node.rotation.x * Math.PI) / 180,
      (node.rotation.y * Math.PI) / 180,
      (node.rotation.z * Math.PI) / 180
    );
    const quat = new THREE.Quaternion().setFromEuler(euler);
    const pos = new THREE.Vector3(node.position.x, node.position.y, node.position.z);
    const scale = new THREE.Vector3(node.scale.x, node.scale.y, node.scale.z);
    matrix.compose(pos, quat, scale);

    return { nodeId: node.id, geometry: geo, matrix };
  });
}
