import * as THREE from 'three';
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader.js';

/**
 * Parse an STL file (binary or ASCII) from an ArrayBuffer.
 * Returns a BufferGeometry centered at origin with Y-up orientation.
 */
export function parseSTL(buffer: ArrayBuffer): THREE.BufferGeometry {
  const loader = new STLLoader();
  const geometry = loader.parse(buffer);

  // Ensure we have vertex normals
  geometry.computeVertexNormals();

  return geometry;
}

/**
 * Read a File object into an ArrayBuffer, parse it as STL,
 * then center and optionally scale the result.
 */
export async function loadSTLFile(file: File): Promise<THREE.BufferGeometry> {
  const buffer = await file.arrayBuffer();
  const geometry = parseSTL(buffer);
  return geometry;
}

/**
 * Center geometry at origin and sit it on the ground plane (Y=0).
 * Optionally scale to fit within a target bounding size.
 */
export function centerAndNormalize(
  geometry: THREE.BufferGeometry,
  options: { maxSize?: number } = {}
): THREE.BufferGeometry {
  geometry.computeBoundingBox();
  const box = geometry.boundingBox!;
  const size = new THREE.Vector3();
  const center = new THREE.Vector3();
  box.getSize(size);
  box.getCenter(center);

  // Center X/Z, sit on ground plane (Y min = 0)
  geometry.translate(-center.x, -box.min.y, -center.z);

  // Optionally scale to fit within maxSize
  if (options.maxSize) {
    const maxDim = Math.max(size.x, size.y, size.z);
    if (maxDim > 0 && maxDim > options.maxSize) {
      const scale = options.maxSize / maxDim;
      geometry.scale(scale, scale, scale);
    }
  }

  geometry.computeBoundingBox();
  geometry.computeVertexNormals();
  return geometry;
}
