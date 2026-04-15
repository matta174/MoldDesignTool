import * as THREE from 'three';
import type { TemplateParams, SurfacePattern } from '../../ui/state/designStore';

/**
 * Generates a parametric vase using Catmull-Rom spline profile + LatheGeometry.
 * User controls base, belly, neck, and mouth radii with height positions.
 */
export function generateVaseGeometry(params: TemplateParams): THREE.BufferGeometry {
  const height = (params.height as number) || 180;
  const baseRadius = (params.baseRadius as number) || 35;
  const bellyRadius = (params.bellyRadius as number) || 55;
  const bellyHeight = ((params.bellyHeight as number) || 40) / 100; // percentage
  const neckRadius = (params.neckRadius as number) || 25;
  const neckHeight = ((params.neckHeight as number) || 75) / 100;
  const mouthRadius = (params.mouthRadius as number) || 35;
  const wallThickness = (params.wallThickness as number) || 6;
  const bottomThickness = (params.bottomThickness as number) || 8;
  const segments = (params.segments as number) || 64;
  const pattern = (params.surfacePattern as SurfacePattern) || 'none';

  // Control points for the outer profile spline
  const outerControlPoints = [
    new THREE.Vector2(baseRadius, 0),
    new THREE.Vector2(baseRadius * 1.05, height * 0.05), // slight flare at base
    new THREE.Vector2(bellyRadius, height * bellyHeight),
    new THREE.Vector2(neckRadius, height * neckHeight),
    new THREE.Vector2(mouthRadius * 0.95, height * 0.95),
    new THREE.Vector2(mouthRadius, height),
  ];

  // Generate smooth outer profile with Catmull-Rom interpolation
  const outerProfile = catmullRomProfile(outerControlPoints, 64);

  // Generate inner profile by offsetting inward
  const innerProfile = offsetProfile(outerProfile, wallThickness, bottomThickness, height);

  // Build the full cross-section profile for lathe
  const profile: THREE.Vector2[] = [];

  // Outer wall: bottom to top
  for (const pt of outerProfile) {
    profile.push(pt.clone());
  }

  // Mouth rim — smooth rounded edge connecting outer wall to inner wall
  const topOuter = outerProfile[outerProfile.length - 1];
  const topInner = innerProfile[innerProfile.length - 1];
  const rimSteps = 8;
  const RIM_BULGE_MM = 1.5;
  for (let i = 1; i <= rimSteps; i++) {
    const t = i / rimSteps;
    // Use a half-arc (0 to π) so the rim bulges up smoothly and returns to
    // the inner wall height without a flat discontinuity at the endpoint.
    const angle = t * Math.PI;
    const rimR = THREE.MathUtils.lerp(topOuter.x, topInner.x, t);
    const rimY = topOuter.y + Math.sin(angle) * RIM_BULGE_MM;
    profile.push(new THREE.Vector2(rimR, rimY));
  }

  // Inner wall: top to bottom
  for (let i = innerProfile.length - 1; i >= 0; i--) {
    profile.push(innerProfile[i].clone());
  }

  // Close at bottom center
  profile.push(new THREE.Vector2(0, bottomThickness));
  profile.push(new THREE.Vector2(0, 0));

  let latheSegments = segments;
  if (pattern === 'facets') {
    latheSegments = Math.min(segments, 10);
  }

  const geometry = new THREE.LatheGeometry(profile, latheSegments);

  if (pattern === 'ribs') {
    applyVaseRibs(geometry, latheSegments, height, bottomThickness);
  } else if (pattern === 'flute') {
    applyVaseFlutes(geometry, latheSegments, height, bottomThickness);
  }

  geometry.computeVertexNormals();
  return geometry;
}

/** Catmull-Rom spline interpolation through control points */
function catmullRomProfile(points: THREE.Vector2[], outputCount: number): THREE.Vector2[] {
  const curve = new THREE.SplineCurve(points);
  const result: THREE.Vector2[] = [];
  for (let i = 0; i <= outputCount; i++) {
    const t = i / outputCount;
    const pt = curve.getPoint(t);
    result.push(new THREE.Vector2(Math.max(pt.x, 1), pt.y));
  }
  return result;
}

/** Offset a profile inward, clamped to minimum radius and bottom thickness */
function offsetProfile(
  outer: THREE.Vector2[],
  wallThickness: number,
  bottomThickness: number,
  _height: number
): THREE.Vector2[] {
  const inner: THREE.Vector2[] = [];
  for (const pt of outer) {
    if (pt.y >= bottomThickness) {
      const r = Math.max(pt.x - wallThickness, 2);
      inner.push(new THREE.Vector2(r, pt.y));
    }
  }
  // Ensure inner profile starts at bottom thickness
  if (inner.length > 0 && inner[0].y > bottomThickness) {
    inner.unshift(new THREE.Vector2(inner[0].x, bottomThickness));
  }
  return inner;
}

function applyVaseRibs(
  geometry: THREE.BufferGeometry,
  segments: number,
  height: number,
  bottomThickness: number
) {
  const pos = geometry.getAttribute('position');
  const ribCount = Math.max(6, Math.floor(segments / 6));
  const ribDepth = 1.8;

  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);
    const dist = Math.sqrt(x * x + z * z);

    if (y > bottomThickness + 3 && y < height - 3 && dist > 5) {
      const angle = Math.atan2(z, x);
      const ribFactor = Math.pow(Math.cos(angle * ribCount), 2);
      const vertFade =
        Math.min((y - bottomThickness - 3) / 8, 1) *
        Math.min((height - 3 - y) / 8, 1);
      const scale = 1 + (ribFactor * ribDepth * vertFade) / dist;
      pos.setX(i, x * scale);
      pos.setZ(i, z * scale);
    }
  }
  pos.needsUpdate = true;
}

function applyVaseFlutes(
  geometry: THREE.BufferGeometry,
  segments: number,
  height: number,
  bottomThickness: number
) {
  const pos = geometry.getAttribute('position');
  const fluteCount = Math.max(6, Math.floor(segments / 4));
  const fluteDepth = 2.0;

  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);
    const dist = Math.sqrt(x * x + z * z);

    if (y > bottomThickness + 4 && y < height - 6 && dist > 5) {
      const angle = Math.atan2(z, x);
      const fluteFactor = Math.pow(Math.sin(angle * fluteCount), 2);
      const vertFade =
        Math.min((y - bottomThickness - 4) / 12, 1) *
        Math.min((height - 6 - y) / 12, 1);
      const offset = fluteFactor * fluteDepth * vertFade;
      const scale = 1 - offset / dist;
      pos.setX(i, x * scale);
      pos.setZ(i, z * scale);
    }
  }
  pos.needsUpdate = true;
}
