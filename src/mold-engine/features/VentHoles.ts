import * as THREE from 'three';

const VENT_DIAMETER = 3; // mm
const VENT_SEGMENTS = 12;

/**
 * Generates vent hole cylinders at strategic positions around the model.
 * Vents allow air to escape during concrete pouring, preventing bubbles.
 *
 * Placement strategy: 4 vents near the corners of the model bounding box,
 * slightly inset from the edges. Each vent extends from model top through
 * the full mold height.
 */
export function generateVentHoles(
  modelBBox: THREE.Box3,
  moldHeight: number,
  moldBottomY: number
): THREE.BufferGeometry[] {
  const radius = VENT_DIAMETER / 2;
  const height = moldHeight + 10; // extend beyond mold top

  const min = modelBBox.min;
  const max = modelBBox.max;
  const center = new THREE.Vector3();
  modelBBox.getCenter(center);

  // Inset from model edges by 30% of model size
  const insetX = (max.x - min.x) * 0.3;
  const insetZ = (max.z - min.z) * 0.3;

  // 4 vent positions: offset from center toward corners
  const positions = [
    new THREE.Vector3(center.x - insetX, 0, center.z - insetZ),
    new THREE.Vector3(center.x + insetX, 0, center.z - insetZ),
    new THREE.Vector3(center.x - insetX, 0, center.z + insetZ),
    new THREE.Vector3(center.x + insetX, 0, center.z + insetZ),
  ];

  return positions.map((pos) => {
    const geo = new THREE.CylinderGeometry(radius, radius, height, VENT_SEGMENTS);
    geo.translate(
      pos.x,
      moldBottomY + height / 2,
      pos.z
    );
    return geo;
  });
}
