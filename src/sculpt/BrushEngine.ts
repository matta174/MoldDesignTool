import * as THREE from 'three';
import type { BrushType } from '../ui/state/sculptStore';

/**
 * Applies a sculpt brush stroke to a geometry at the given world-space hit point.
 *
 * All brushes work by modifying the position attribute in-place for performance.
 * After applying, caller must set `pos.needsUpdate = true` and recompute normals.
 *
 * @param geometry The mesh geometry (non-indexed)
 * @param hitPoint World-space point where the brush is applied
 * @param hitNormal Surface normal at the hit point
 * @param brushType Which brush to apply
 * @param radius Brush radius in world units
 * @param strength Brush strength 0–1
 * @param invert Whether to invert the brush direction
 * @param symmetryX Whether to mirror across X=0 plane
 */
export function applyBrush(
  geometry: THREE.BufferGeometry,
  hitPoint: THREE.Vector3,
  hitNormal: THREE.Vector3,
  brushType: BrushType,
  radius: number,
  strength: number,
  invert: boolean,
  symmetryX: boolean
): void {
  // Apply at primary point
  applyBrushAtPoint(geometry, hitPoint, hitNormal, brushType, radius, strength, invert);

  // Mirror across X=0 if symmetry is on
  if (symmetryX) {
    const mirroredPoint = new THREE.Vector3(-hitPoint.x, hitPoint.y, hitPoint.z);
    const mirroredNormal = new THREE.Vector3(-hitNormal.x, hitNormal.y, hitNormal.z);
    applyBrushAtPoint(geometry, mirroredPoint, mirroredNormal, brushType, radius, strength, invert);
  }
}

function applyBrushAtPoint(
  geometry: THREE.BufferGeometry,
  center: THREE.Vector3,
  normal: THREE.Vector3,
  brushType: BrushType,
  radius: number,
  strength: number,
  invert: boolean
): void {
  const positions = geometry.getAttribute('position') as THREE.BufferAttribute;
  const normals = geometry.getAttribute('normal') as THREE.BufferAttribute | null;
  const count = positions.count;

  const radiusSq = radius * radius;
  const direction = invert ? -1 : 1;
  const vertex = new THREE.Vector3();
  const vertexNormal = new THREE.Vector3();

  for (let i = 0; i < count; i++) {
    vertex.set(positions.getX(i), positions.getY(i), positions.getZ(i));

    const distSq = vertex.distanceToSquared(center);
    if (distSq > radiusSq) continue;

    // Falloff: smooth hermite (stronger at center, fades at edges)
    const dist = Math.sqrt(distSq);
    const t = dist / radius;
    const falloff = 1 - t * t * (3 - 2 * t); // smoothstep

    const amount = strength * falloff * direction;

    if (normals) {
      vertexNormal.set(normals.getX(i), normals.getY(i), normals.getZ(i));
    } else {
      vertexNormal.copy(normal);
    }

    switch (brushType) {
      case 'grab':
        applyGrab(positions, i, normal, amount * 2);
        break;
      case 'smooth':
        applySmooth(positions, i, center, radius, count, falloff * strength * 0.3);
        break;
      case 'inflate':
        applyInflate(positions, i, vertexNormal, amount * 1.5);
        break;
      case 'flatten':
        applyFlatten(positions, i, center, normal, falloff * strength);
        break;
      case 'crease':
        applyCrease(positions, i, center, vertexNormal, amount * 1.2);
        break;
      case 'pinch':
        applyPinch(positions, i, center, falloff * strength * 0.8);
        break;
    }
  }
}

/** Move vertices along the hit normal (like pushing/pulling clay) */
function applyGrab(
  positions: THREE.BufferAttribute,
  i: number,
  direction: THREE.Vector3,
  amount: number
): void {
  positions.setX(i, positions.getX(i) + direction.x * amount);
  positions.setY(i, positions.getY(i) + direction.y * amount);
  positions.setZ(i, positions.getZ(i) + direction.z * amount);
}

/** Average vertex position with neighbors within radius */
function applySmooth(
  positions: THREE.BufferAttribute,
  i: number,
  center: THREE.Vector3,
  radius: number,
  count: number,
  factor: number
): void {
  // Simple approach: move vertex toward the center of nearby vertices
  const radiusSq = radius * radius * 0.5;
  const vx = positions.getX(i);
  const vy = positions.getY(i);
  const vz = positions.getZ(i);

  let avgX = 0, avgY = 0, avgZ = 0;
  let neighbors = 0;

  // Sample nearby vertices (stride by 3 for face grouping in non-indexed geo)
  const faceBase = Math.floor(i / 3) * 3;
  for (let j = 0; j < 3; j++) {
    const ni = faceBase + j;
    if (ni === i || ni >= count) continue;
    const nx = positions.getX(ni);
    const ny = positions.getY(ni);
    const nz = positions.getZ(ni);
    const dx = nx - vx, dy = ny - vy, dz = nz - vz;
    if (dx * dx + dy * dy + dz * dz < radiusSq) {
      avgX += nx;
      avgY += ny;
      avgZ += nz;
      neighbors++;
    }
  }

  // Also sample some vertices near the center
  const step = Math.max(1, Math.floor(count / 500));
  for (let j = 0; j < count; j += step) {
    if (j === i) continue;
    const nx = positions.getX(j);
    const ny = positions.getY(j);
    const nz = positions.getZ(j);
    const dx = nx - center.x, dy = ny - center.y, dz = nz - center.z;
    if (dx * dx + dy * dy + dz * dz < radiusSq) {
      avgX += nx;
      avgY += ny;
      avgZ += nz;
      neighbors++;
    }
  }

  if (neighbors > 0) {
    avgX /= neighbors;
    avgY /= neighbors;
    avgZ /= neighbors;
    positions.setX(i, vx + (avgX - vx) * factor);
    positions.setY(i, vy + (avgY - vy) * factor);
    positions.setZ(i, vz + (avgZ - vz) * factor);
  }
}

/** Move vertices outward along their own normals */
function applyInflate(
  positions: THREE.BufferAttribute,
  i: number,
  vertexNormal: THREE.Vector3,
  amount: number
): void {
  positions.setX(i, positions.getX(i) + vertexNormal.x * amount);
  positions.setY(i, positions.getY(i) + vertexNormal.y * amount);
  positions.setZ(i, positions.getZ(i) + vertexNormal.z * amount);
}

/** Move vertices toward the plane defined by center + normal */
function applyFlatten(
  positions: THREE.BufferAttribute,
  i: number,
  center: THREE.Vector3,
  normal: THREE.Vector3,
  factor: number
): void {
  const vx = positions.getX(i);
  const vy = positions.getY(i);
  const vz = positions.getZ(i);

  // Distance from vertex to the plane
  const dx = vx - center.x;
  const dy = vy - center.y;
  const dz = vz - center.z;
  const dist = dx * normal.x + dy * normal.y + dz * normal.z;

  positions.setX(i, vx - normal.x * dist * factor);
  positions.setY(i, vy - normal.y * dist * factor);
  positions.setZ(i, vz - normal.z * dist * factor);
}

/** Pull vertices inward toward the stroke center line */
function applyCrease(
  positions: THREE.BufferAttribute,
  i: number,
  center: THREE.Vector3,
  vertexNormal: THREE.Vector3,
  amount: number
): void {
  const vx = positions.getX(i);
  const vy = positions.getY(i);
  const vz = positions.getZ(i);

  // Move toward center laterally (perpendicular to normal)
  const toCenter = new THREE.Vector3(center.x - vx, center.y - vy, center.z - vz);
  // Remove component along normal
  const dot = toCenter.dot(vertexNormal);
  toCenter.x -= vertexNormal.x * dot;
  toCenter.y -= vertexNormal.y * dot;
  toCenter.z -= vertexNormal.z * dot;
  toCenter.normalize();

  // Also push inward along normal
  positions.setX(i, vx + toCenter.x * amount * 0.5 - vertexNormal.x * Math.abs(amount) * 0.5);
  positions.setY(i, vy + toCenter.y * amount * 0.5 - vertexNormal.y * Math.abs(amount) * 0.5);
  positions.setZ(i, vz + toCenter.z * amount * 0.5 - vertexNormal.z * Math.abs(amount) * 0.5);
}

/** Pull vertices toward the brush center point */
function applyPinch(
  positions: THREE.BufferAttribute,
  i: number,
  center: THREE.Vector3,
  factor: number
): void {
  const vx = positions.getX(i);
  const vy = positions.getY(i);
  const vz = positions.getZ(i);

  positions.setX(i, vx + (center.x - vx) * factor);
  positions.setY(i, vy + (center.y - vy) * factor);
  positions.setZ(i, vz + (center.z - vz) * factor);
}
