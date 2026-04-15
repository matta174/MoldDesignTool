import * as THREE from 'three';
import { csgEvaluate, csgSubtractMultiple } from '../../core/csg/CSGOperation';
import { generatePourHole } from '../features/PourHole';
import { generateRegistrationKeys } from '../features/RegistrationKeys';
import type { MoldSettings } from '../../ui/state/moldStore';

export interface TwoPartMoldResult {
  /** Bottom half of the mold (with registration pins added) */
  bottomGeometry: THREE.BufferGeometry;
  /** Top half of the mold (with registration sockets subtracted) */
  topGeometry: THREE.BufferGeometry;
  /** Original model geometry (possibly scaled for shrinkage) */
  modelGeometry: THREE.BufferGeometry;
  /** Model bounding box */
  boundingBox: THREE.Box3;
  /** Overall mold outer dimensions */
  moldDimensions: THREE.Vector3;
  /** Y-coordinate of the parting plane */
  partingY: number;
}

/**
 * Generates a 2-part mold split at a configurable parting plane.
 *
 * Pipeline:
 *   1. Clone + scale model for shrinkage
 *   2. Compute bbox, create full mold box with margins
 *   3. CSG subtract model from full box
 *   4. Create parting plane cutting box
 *   5. Split: bottom = mold ∩ lowerBox, top = mold ∩ upperBox
 *   6. Add registration pins to bottom, subtract sockets from top
 *   7. Subtract pour hole from top half
 *   8. Optionally subtract vent holes from top half
 *
 * @param modelGeometry The design geometry
 * @param settings Mold configuration
 * @param shrinkageScale Scale factor for shrinkage compensation
 * @param partingRatio Where to split (0–1, fraction of model height from bottom). Default 0.5
 */
export function generateTwoPartMold(
  modelGeometry: THREE.BufferGeometry,
  settings: MoldSettings,
  shrinkageScale: number = 1,
  partingRatio: number = 0.5
): TwoPartMoldResult {
  // 1. Clone and scale model
  const model = modelGeometry.clone();
  if (shrinkageScale !== 1) {
    model.scale(shrinkageScale, shrinkageScale, shrinkageScale);
  }

  model.computeBoundingBox();
  const bbox = model.boundingBox!;
  const modelSize = new THREE.Vector3();
  bbox.getSize(modelSize);
  const modelCenter = new THREE.Vector3();
  bbox.getCenter(modelCenter);

  const { wallMargin, bottomMargin, pourHoleDiameter, includeVents } = settings;

  // 2. Full mold box dimensions (closed on all sides for 2-part)
  const topMargin = bottomMargin; // symmetric top/bottom for 2-part
  const moldWidth = modelSize.x + wallMargin * 2;
  const moldDepth = modelSize.z + wallMargin * 2;
  const moldHeight = modelSize.y + bottomMargin + topMargin;
  const moldDimensions = new THREE.Vector3(moldWidth, moldHeight, moldDepth);

  const moldBottomY = bbox.min.y - bottomMargin;
  const moldTopY = bbox.max.y + topMargin;

  // Create full mold box
  const fullBox = new THREE.BoxGeometry(moldWidth, moldHeight, moldDepth);
  fullBox.translate(modelCenter.x, moldBottomY + moldHeight / 2, modelCenter.z);

  // 3. Subtract model from full box
  const hollowMold = csgEvaluate(fullBox, model, 'subtract');
  fullBox.dispose();

  // 4. Parting plane — split at ratio of model height, clamped to mold bounds
  const rawPartingY = bbox.min.y + modelSize.y * Math.max(0.1, Math.min(0.9, partingRatio));
  // Ensure parting plane stays at least 1mm inside the mold box
  const partingY = Math.max(moldBottomY + 1, Math.min(moldTopY - 1, rawPartingY));

  // Create cutting volumes: large boxes for top and bottom halves
  const cutHeight = moldHeight + 20; // extend beyond mold
  const cutWidth = moldWidth + 20;
  const cutDepth = moldDepth + 20;

  // Lower cutting box: everything below parting plane
  const lowerBox = new THREE.BoxGeometry(cutWidth, cutHeight, cutDepth);
  lowerBox.translate(modelCenter.x, partingY - cutHeight / 2, modelCenter.z);

  // Upper cutting box: everything above parting plane
  const upperBox = new THREE.BoxGeometry(cutWidth, cutHeight, cutDepth);
  upperBox.translate(modelCenter.x, partingY + cutHeight / 2, modelCenter.z);

  // 5. Split the hollow mold
  let bottomHalf = csgEvaluate(hollowMold, lowerBox, 'intersect');
  let topHalf = csgEvaluate(hollowMold, upperBox, 'intersect');

  lowerBox.dispose();
  upperBox.dispose();

  // 6. Registration keys
  if (settings.includeRegistrationKeys) {
    const { pins, sockets } = generateRegistrationKeys(
      moldWidth,
      moldDepth,
      partingY,
      modelCenter.x,
      modelCenter.z
    );

    // Add pins to bottom half (union)
    for (const pin of pins) {
      bottomHalf = csgEvaluate(bottomHalf, pin, 'union');
      pin.dispose();
    }

    // Subtract sockets from top half
    topHalf = csgSubtractMultiple(topHalf, sockets);
    sockets.forEach((s) => s.dispose());
  }

  // 7. Pour hole in top half
  if (pourHoleDiameter > 0) {
    const pourHole = generatePourHole(
      pourHoleDiameter,
      moldHeight,
      new THREE.Vector3(modelCenter.x, moldTopY, modelCenter.z)
    );
    topHalf = csgEvaluate(topHalf, pourHole, 'subtract');
    pourHole.dispose();
  }

  // 8. Vent holes in top half
  if (includeVents) {
    const ventSubtracts = generateVentHolesForTopHalf(
      bbox,
      moldTopY,
      partingY,
      modelCenter
    );
    topHalf = csgSubtractMultiple(topHalf, ventSubtracts);
    ventSubtracts.forEach((v) => v.dispose());
  }

  return {
    bottomGeometry: bottomHalf,
    topGeometry: topHalf,
    modelGeometry: model,
    boundingBox: bbox,
    moldDimensions,
    partingY,
  };
}

/**
 * Vent holes for the top half of a 2-part mold.
 * Positioned at corners, extending from parting plane through top.
 */
function generateVentHolesForTopHalf(
  modelBBox: THREE.Box3,
  moldTopY: number,
  partingY: number,
  center: THREE.Vector3
): THREE.BufferGeometry[] {
  const ventRadius = 1.5;
  const height = (moldTopY - partingY) + 10;
  const segments = 12;

  const min = modelBBox.min;
  const max = modelBBox.max;

  const insetX = (max.x - min.x) * 0.3;
  const insetZ = (max.z - min.z) * 0.3;

  const positions = [
    [center.x - insetX, center.z - insetZ],
    [center.x + insetX, center.z - insetZ],
    [center.x - insetX, center.z + insetZ],
    [center.x + insetX, center.z + insetZ],
  ];

  return positions.map(([px, pz]) => {
    const geo = new THREE.CylinderGeometry(ventRadius, ventRadius, height, segments);
    geo.translate(px, partingY + height / 2, pz);
    return geo;
  });
}
