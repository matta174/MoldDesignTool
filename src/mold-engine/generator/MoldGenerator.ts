import * as THREE from 'three';
import { csgSubtractMultiple } from '../../core/csg/CSGOperation';
import { generatePourHole } from '../features/PourHole';
import { generateVentHoles } from '../features/VentHoles';
import type { MoldSettings } from '../../ui/state/moldStore';

export interface MoldResult {
  moldGeometry: THREE.BufferGeometry;
  modelGeometry: THREE.BufferGeometry;
  boundingBox: THREE.Box3;
  moldDimensions: THREE.Vector3;
}

/**
 * Generates a 1-part mold: a bounding box with the model subtracted from it.
 * Also subtracts pour hole and optional vent holes.
 *
 * Workflow:
 *   1. Compute model bounding box
 *   2. Create mold box = bbox + wall/bottom margins
 *   3. CSG subtract: moldBox - model
 *   4. CSG subtract: result - pourHole
 *   5. CSG subtract: result - ventHoles[]
 */
export function generateOnePieceMold(
  modelGeometry: THREE.BufferGeometry,
  settings: MoldSettings,
  shrinkageScale: number = 1
): MoldResult {
  // Clone and optionally scale model for shrinkage compensation
  const model = modelGeometry.clone();
  if (shrinkageScale !== 1) {
    model.scale(shrinkageScale, shrinkageScale, shrinkageScale);
  }

  // Compute bounds of the (possibly scaled) model
  model.computeBoundingBox();
  const bbox = model.boundingBox!;
  const modelSize = new THREE.Vector3();
  bbox.getSize(modelSize);
  const modelCenter = new THREE.Vector3();
  bbox.getCenter(modelCenter);

  const {
    wallMargin,
    bottomMargin,
    pourHoleDiameter,
    includeVents,
  } = settings;

  // Mold outer dimensions
  const moldWidth = modelSize.x + wallMargin * 2;
  const moldDepth = modelSize.z + wallMargin * 2;
  const moldHeight = modelSize.y + bottomMargin;
  // No top margin — mold is open at the top

  const moldDimensions = new THREE.Vector3(moldWidth, moldHeight, moldDepth);

  // Create mold box geometry
  // Position it so the model sits inside: bottom of box at (model bottom - bottomMargin)
  const boxGeo = new THREE.BoxGeometry(moldWidth, moldHeight, moldDepth);
  // Center box around model XZ, with bottom at bbox.min.y - bottomMargin
  const moldBottomY = bbox.min.y - bottomMargin;
  boxGeo.translate(
    modelCenter.x,
    moldBottomY + moldHeight / 2,
    modelCenter.z
  );

  // Collect all geometries to subtract from the box
  const subtractions: THREE.BufferGeometry[] = [];

  // 1. Subtract the model itself
  subtractions.push(model);

  // 2. Pour hole — cylinder from top, centered on model
  if (pourHoleDiameter > 0) {
    const pourHole = generatePourHole(
      pourHoleDiameter,
      moldHeight + 10, // extend beyond mold top
      new THREE.Vector3(modelCenter.x, bbox.max.y, modelCenter.z)
    );
    subtractions.push(pourHole);
  }

  // 3. Vent holes — small cylinders at corners of model top
  if (includeVents) {
    const vents = generateVentHoles(
      bbox,
      moldHeight,
      moldBottomY
    );
    subtractions.push(...vents);
  }

  // Perform all CSG subtractions
  const moldGeometry = csgSubtractMultiple(boxGeo, subtractions);

  // Cleanup intermediate geometries
  boxGeo.dispose();

  return {
    moldGeometry,
    modelGeometry: model,
    boundingBox: bbox,
    moldDimensions,
  };
}
