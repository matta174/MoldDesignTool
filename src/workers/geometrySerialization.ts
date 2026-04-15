/**
 * Serialization utilities for passing BufferGeometry data
 * between the main thread and Web Workers via transferable arrays.
 */

export interface SerializedGeometry {
  position: Float32Array;
  normal: Float32Array | null;
  index: Uint32Array | null;
}

export interface SerializedVec3 {
  x: number;
  y: number;
  z: number;
}

/**
 * Extract raw typed arrays from a Three.js BufferGeometry.
 * Returns copies so the originals remain valid.
 */
export function serializeGeometry(geo: {
  getAttribute(name: string): { array: ArrayLike<number> } | null;
  getIndex(): { array: ArrayLike<number> } | null;
}): SerializedGeometry {
  const posAttr = geo.getAttribute('position');
  if (!posAttr) throw new Error('Geometry has no position attribute');

  const position = new Float32Array(posAttr.array);

  const normAttr = geo.getAttribute('normal');
  const normal = normAttr ? new Float32Array(normAttr.array) : null;

  const idx = geo.getIndex();
  const index = idx ? new Uint32Array(idx.array) : null;

  return { position, normal, index };
}

/**
 * Collect all transferable ArrayBuffers from a SerializedGeometry
 * for efficient postMessage transfer (zero-copy).
 */
export function getTransferables(sg: SerializedGeometry): ArrayBuffer[] {
  const buffers: ArrayBuffer[] = [sg.position.buffer as ArrayBuffer];
  if (sg.normal) buffers.push(sg.normal.buffer as ArrayBuffer);
  if (sg.index) buffers.push(sg.index.buffer as ArrayBuffer);
  return buffers;
}

/**
 * Collect transferables from multiple serialized geometries.
 */
export function getMultiTransferables(...items: (SerializedGeometry | null)[]): ArrayBuffer[] {
  const buffers: ArrayBuffer[] = [];
  for (const sg of items) {
    if (sg) buffers.push(...getTransferables(sg));
  }
  return buffers;
}
