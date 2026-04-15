import * as THREE from 'three';

export interface WallThicknessResult {
  status: 'ok' | 'warn' | 'error';
  minThickness: number;
  maxThickness: number;
  thinAreas: number;
  detail: string;
}

const MIN_PRINTABLE_WALL = 2; // mm — absolute minimum for FDM printing
const MIN_RECOMMENDED_WALL = 5; // mm — recommended for mold durability

/**
 * Validates wall thickness of a mold by ray-casting from the model surface
 * outward to find the nearest mold wall.
 *
 * Simplified approach: checks the margin between model bounding box and
 * mold bounding box, plus samples key cross-sections.
 */
export function validateWallThickness(
  modelGeometry: THREE.BufferGeometry,
  moldWallMargin: number,
  moldBottomMargin: number
): WallThicknessResult {
  // The thinnest walls are the configured margins
  const minThickness = Math.min(moldWallMargin, moldBottomMargin);
  const maxThickness = Math.max(moldWallMargin, moldBottomMargin);

  // Check against printability limits
  if (minThickness < MIN_PRINTABLE_WALL) {
    return {
      status: 'error',
      minThickness,
      maxThickness,
      thinAreas: 4, // all walls
      detail: `Min wall ${minThickness}mm < ${MIN_PRINTABLE_WALL}mm (unprintable)`,
    };
  }

  if (minThickness < MIN_RECOMMENDED_WALL) {
    return {
      status: 'warn',
      minThickness,
      maxThickness,
      thinAreas: minThickness === moldWallMargin ? 4 : 1,
      detail: `Min wall ${minThickness}mm < ${MIN_RECOMMENDED_WALL}mm (fragile)`,
    };
  }

  // Check for geometric features that might create thin spots
  // Sample model vertices that are closest to the bounding box edges
  modelGeometry.computeBoundingBox();
  const bbox = modelGeometry.boundingBox;
  if (!bbox) {
    return {
      status: 'ok',
      minThickness,
      maxThickness,
      thinAreas: 0,
      detail: `Min: ${minThickness}mm (≥ ${MIN_RECOMMENDED_WALL}mm) ✓`,
    };
  }

  const positions = modelGeometry.getAttribute('position');
  if (!positions) {
    return {
      status: 'ok',
      minThickness,
      maxThickness,
      thinAreas: 0,
      detail: `Min: ${minThickness}mm (≥ ${MIN_RECOMMENDED_WALL}mm) ✓`,
    };
  }

  // Check if any vertices extend close to the mold wall boundary,
  // which would create thin spots even if margins look adequate on paper.
  let thinAreas = 0;
  const modelSize = new THREE.Vector3();
  bbox.getSize(modelSize);

  // For lathe-based geometry, check radial extent against the mold wall radius
  let maxRadialDist = 0;
  const center = new THREE.Vector3();
  bbox.getCenter(center);

  // Expected mold inner wall radius = half the larger XZ extent + wall margin
  const expectedMoldRadius = Math.max(modelSize.x, modelSize.z) / 2 + moldWallMargin;

  const sampleStep = Math.max(1, Math.floor(positions.count / 2000));
  for (let i = 0; i < positions.count; i += sampleStep) {
    const x = positions.getX(i) - center.x;
    const z = positions.getZ(i) - center.z;
    const radial = Math.sqrt(x * x + z * z);
    if (radial > maxRadialDist) {
      maxRadialDist = radial;
    }
  }

  // Check if model geometry approaches the mold wall (thin wall condition)
  const actualMinWall = expectedMoldRadius - maxRadialDist;
  const effectiveMinThickness = Math.min(minThickness, actualMinWall);

  if (actualMinWall < MIN_PRINTABLE_WALL) {
    thinAreas++;
  }

  // Also check vertical: model top vs mold top (no top margin in 1-part)
  const modelHeight = modelSize.y;
  const verticalClearance = moldBottomMargin; // bottom is the only closed side
  if (verticalClearance < MIN_PRINTABLE_WALL) {
    thinAreas++;
  }

  if (effectiveMinThickness < MIN_PRINTABLE_WALL) {
    return {
      status: 'error',
      minThickness: Math.round(effectiveMinThickness * 10) / 10,
      maxThickness,
      thinAreas,
      detail: `Effective min wall ${effectiveMinThickness.toFixed(1)}mm < ${MIN_PRINTABLE_WALL}mm (model protrudes near mold wall)`,
    };
  }

  if (effectiveMinThickness < MIN_RECOMMENDED_WALL) {
    return {
      status: 'warn',
      minThickness: Math.round(effectiveMinThickness * 10) / 10,
      maxThickness,
      thinAreas,
      detail: `Effective min wall ${effectiveMinThickness.toFixed(1)}mm < ${MIN_RECOMMENDED_WALL}mm (fragile spots)`,
    };
  }

  return {
    status: 'ok',
    minThickness: Math.round(effectiveMinThickness * 10) / 10,
    maxThickness,
    thinAreas,
    detail: `Min: ${effectiveMinThickness.toFixed(1)}mm (≥ ${MIN_RECOMMENDED_WALL}mm) ✓`,
  };
}
