import * as THREE from 'three';

export type STLFormat = 'binary' | 'ascii';
export type STLUnit = 'mm' | 'cm' | 'inches';

export interface STLExportOptions {
  format: STLFormat;
  unit: STLUnit;
  modelName: string;
}

const UNIT_SCALE: Record<STLUnit, number> = {
  mm: 1,
  cm: 0.1,
  inches: 1 / 25.4,
};

/**
 * Exports a THREE.BufferGeometry to STL format.
 * Handles both indexed and non-indexed geometries.
 * Returns an ArrayBuffer (binary) or string (ASCII).
 */
export function exportSTL(
  geometry: THREE.BufferGeometry,
  options: STLExportOptions
): ArrayBuffer | string {
  // Clone and apply unit scaling if needed
  const scale = UNIT_SCALE[options.unit];
  const geo = geometry.clone();

  if (scale !== 1) {
    geo.scale(scale, scale, scale);
  }

  // Ensure we have non-indexed geometry for triangle iteration
  const nonIndexed = geo.index ? geo.toNonIndexed() : geo;
  nonIndexed.computeVertexNormals();

  if (options.format === 'binary') {
    return exportBinarySTL(nonIndexed, options.modelName);
  }
  return exportAsciiSTL(nonIndexed, options.modelName);
}

/**
 * Binary STL format:
 *   80 bytes header
 *   4 bytes uint32 triangle count
 *   For each triangle (50 bytes):
 *     3 floats normal (12 bytes)
 *     3 × 3 floats vertices (36 bytes)
 *     2 bytes attribute byte count (0)
 */
function exportBinarySTL(geometry: THREE.BufferGeometry, name: string): ArrayBuffer {
  const positions = geometry.getAttribute('position');
  const triangleCount = positions.count / 3;

  const bufferLength = 80 + 4 + triangleCount * 50;
  const buffer = new ArrayBuffer(bufferLength);
  const view = new DataView(buffer);

  // Header (80 bytes) — encode model name
  const header = `Exported by CONCRETE Brutalist Design Tool: ${name}`;
  for (let i = 0; i < 80; i++) {
    view.setUint8(i, i < header.length ? header.charCodeAt(i) : 0);
  }

  // Triangle count
  view.setUint32(80, triangleCount, true);

  let offset = 84;
  const vA = new THREE.Vector3();
  const vB = new THREE.Vector3();
  const vC = new THREE.Vector3();
  const faceNormal = new THREE.Vector3();
  // Pre-allocate edge vectors outside the loop to avoid per-triangle GC pressure
  const edge1 = new THREE.Vector3();
  const edge2 = new THREE.Vector3();

  for (let i = 0; i < triangleCount; i++) {
    const idx = i * 3;

    vA.fromBufferAttribute(positions, idx);
    vB.fromBufferAttribute(positions, idx + 1);
    vC.fromBufferAttribute(positions, idx + 2);

    // Compute face normal from vertices (more reliable than vertex normals for STL)
    edge1.subVectors(vB, vA);
    edge2.subVectors(vC, vA);
    faceNormal.crossVectors(edge1, edge2).normalize();

    // Normal
    view.setFloat32(offset, faceNormal.x, true); offset += 4;
    view.setFloat32(offset, faceNormal.y, true); offset += 4;
    view.setFloat32(offset, faceNormal.z, true); offset += 4;

    // Vertex A
    view.setFloat32(offset, vA.x, true); offset += 4;
    view.setFloat32(offset, vA.y, true); offset += 4;
    view.setFloat32(offset, vA.z, true); offset += 4;

    // Vertex B
    view.setFloat32(offset, vB.x, true); offset += 4;
    view.setFloat32(offset, vB.y, true); offset += 4;
    view.setFloat32(offset, vB.z, true); offset += 4;

    // Vertex C
    view.setFloat32(offset, vC.x, true); offset += 4;
    view.setFloat32(offset, vC.y, true); offset += 4;
    view.setFloat32(offset, vC.z, true); offset += 4;

    // Attribute byte count
    view.setUint16(offset, 0, true); offset += 2;
  }

  return buffer;
}

/**
 * ASCII STL format — human-readable, useful for debugging.
 */
function exportAsciiSTL(geometry: THREE.BufferGeometry, name: string): string {
  const positions = geometry.getAttribute('position');
  const triangleCount = positions.count / 3;

  const lines: string[] = [];
  lines.push(`solid ${name}`);

  const vA = new THREE.Vector3();
  const vB = new THREE.Vector3();
  const vC = new THREE.Vector3();
  const faceNormal = new THREE.Vector3();
  // Pre-allocate edge vectors outside the loop to avoid per-triangle GC pressure
  const edge1 = new THREE.Vector3();
  const edge2 = new THREE.Vector3();

  for (let i = 0; i < triangleCount; i++) {
    const idx = i * 3;

    vA.fromBufferAttribute(positions, idx);
    vB.fromBufferAttribute(positions, idx + 1);
    vC.fromBufferAttribute(positions, idx + 2);

    edge1.subVectors(vB, vA);
    edge2.subVectors(vC, vA);
    faceNormal.crossVectors(edge1, edge2).normalize();

    lines.push(`  facet normal ${fmt(faceNormal.x)} ${fmt(faceNormal.y)} ${fmt(faceNormal.z)}`);
    lines.push(`    outer loop`);
    lines.push(`      vertex ${fmt(vA.x)} ${fmt(vA.y)} ${fmt(vA.z)}`);
    lines.push(`      vertex ${fmt(vB.x)} ${fmt(vB.y)} ${fmt(vB.z)}`);
    lines.push(`      vertex ${fmt(vC.x)} ${fmt(vC.y)} ${fmt(vC.z)}`);
    lines.push(`    endloop`);
    lines.push(`  endfacet`);
  }

  lines.push(`endsolid ${name}`);
  return lines.join('\n');
}

/** Format float for ASCII STL — 6 decimal places */
function fmt(n: number): string {
  return n.toFixed(6);
}
