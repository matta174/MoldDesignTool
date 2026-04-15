import * as THREE from 'three';
import type { TemplateType, TemplateParams } from '../../ui/state/designStore';
import { generatePlanterGeometry } from './PlanterGeometry';
import { generateVaseGeometry } from './VaseGeometry';
import { generateCoasterGeometry } from './CoasterGeometry';
import { generateTileGeometry } from './TileGeometry';

const generators: Record<TemplateType, (params: TemplateParams) => THREE.BufferGeometry> = {
  planter: generatePlanterGeometry,
  vase: generateVaseGeometry,
  coaster: generateCoasterGeometry,
  tile: generateTileGeometry,
};

/**
 * Dispatches to the correct geometry generator based on template type.
 */
export function generateGeometry(
  template: TemplateType,
  params: TemplateParams
): THREE.BufferGeometry {
  const gen = generators[template];
  if (!gen) {
    // Fallback: simple cylinder
    const geo = new THREE.CylinderGeometry(30, 40, 80, 32);
    geo.translate(0, 40, 0);
    geo.computeVertexNormals();
    return geo;
  }
  return gen(params);
}
