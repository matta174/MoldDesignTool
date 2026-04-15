import * as THREE from 'three';

/**
 * Generates a pour hole cylinder geometry.
 * The cylinder extends vertically from the given top position upward,
 * ensuring it fully penetrates the mold top.
 *
 * @param diameter - Pour hole diameter in mm
 * @param height - Cylinder height (should exceed mold height)
 * @param topCenter - Center position at the model top
 */
export function generatePourHole(
  diameter: number,
  height: number,
  topCenter: THREE.Vector3
): THREE.BufferGeometry {
  const radius = diameter / 2;
  const segments = 32;

  // Create cylinder
  const geo = new THREE.CylinderGeometry(radius, radius, height, segments);

  // Position: centered on topCenter, extending upward from model top
  // Cylinder center is at topCenter.y + height/2 - some overlap to ensure clean subtraction
  geo.translate(
    topCenter.x,
    topCenter.y + height / 2 - 5, // 5mm overlap into model cavity
    topCenter.z
  );

  return geo;
}

/**
 * Generates a funnel-shaped pour hole — wider at top, narrows to diameter.
 * Better for concrete pouring as it guides the mix into the cavity.
 */
export function generateFunnelPourHole(
  diameter: number,
  height: number,
  topCenter: THREE.Vector3,
  funnelRatio: number = 1.5 // top opening is 1.5x the diameter
): THREE.BufferGeometry {
  const bottomRadius = diameter / 2;
  const topRadius = (diameter * funnelRatio) / 2;
  const segments = 32;

  const geo = new THREE.CylinderGeometry(topRadius, bottomRadius, height, segments);
  geo.translate(
    topCenter.x,
    topCenter.y + height / 2 - 5,
    topCenter.z
  );

  return geo;
}
