import * as THREE from 'three';
import type { TemplateParams, SurfacePattern } from '../../ui/state/designStore';

/**
 * Generates a parametric planter pot using LatheGeometry.
 * Features: tapered walls with draft angle, lip/rim detail, drainage hole,
 * and optional surface patterns (ribs, facets, flutes).
 */
export function generatePlanterGeometry(params: TemplateParams): THREE.BufferGeometry {
  const height = (params.height as number) || 120;
  const outerDiameter = (params.outerDiameter as number) || 100;
  const wallThickness = (params.wallThickness as number) || 8;
  const draftAngle = (params.draftAngle as number) || 3;
  const bottomThickness = (params.bottomThickness as number) || 10;
  const lipRadius = (params.lipRadius as number) || 3;
  const lipHeight = (params.lipHeight as number) || 5;
  const drainHoleDiameter = (params.drainHoleDiameter as number) || 10;
  const segments = (params.segments as number) || 64;
  const hasDrainage = params.drainageHole !== false;
  const pattern = (params.surfacePattern as SurfacePattern) || 'none';

  const outerR = outerDiameter / 2;
  const innerR = outerR - wallThickness;
  const draftRad = (draftAngle * Math.PI) / 180;
  const draftOffset = Math.tan(draftRad) * height;

  // Top radii (tapered inward toward top)
  const topOuterR = Math.max(outerR - draftOffset, wallThickness + 2);
  const topInnerR = Math.max(topOuterR - wallThickness, 2);

  const drainR = hasDrainage ? Math.min(drainHoleDiameter / 2, innerR - 2) : 0;

  const profile: THREE.Vector2[] = [];
  const steps = 48;

  // === OUTER WALL: bottom to top ===
  // Start at bottom-outer edge
  profile.push(new THREE.Vector2(outerR, 0));

  // Outer wall with slight curvature
  for (let i = 1; i <= steps; i++) {
    const t = i / steps;
    const y = t * (height - lipHeight);
    const r = THREE.MathUtils.lerp(outerR, topOuterR, t);
    profile.push(new THREE.Vector2(r, y));
  }

  // === LIP / RIM ===
  if (lipRadius > 0 && lipHeight > 0) {
    const lipBase = height - lipHeight;
    const lipSteps = 12;
    for (let i = 1; i <= lipSteps; i++) {
      const t = i / lipSteps;
      // Rounded lip profile using a quarter-circle arc
      const angle = (t * Math.PI) / 2;
      const lr = topOuterR + lipRadius * Math.sin(angle);
      const ly = lipBase + lipHeight * t;
      profile.push(new THREE.Vector2(lr, ly));
    }
    // Lip inner curve back down
    const lipTopR = topOuterR + lipRadius;
    for (let i = lipSteps - 1; i >= 0; i--) {
      const t = i / lipSteps;
      const angle = (t * Math.PI) / 2;
      const lr = topInnerR + (lipRadius * 0.4) * Math.sin(angle);
      const ly = height - lipHeight * (1 - t) * 0.3;
      if (lr < lipTopR) {
        profile.push(new THREE.Vector2(lr, ly));
      }
    }
  }

  // === INNER WALL: top to bottom ===
  profile.push(new THREE.Vector2(topInnerR, height - lipHeight));
  for (let i = steps - 1; i >= 0; i--) {
    const t = i / steps;
    const y = t * (height - lipHeight);
    const r = THREE.MathUtils.lerp(innerR, topInnerR, t);
    if (y >= bottomThickness) {
      profile.push(new THREE.Vector2(r, y));
    }
  }

  // === BOTTOM INNER SURFACE ===
  profile.push(new THREE.Vector2(innerR, bottomThickness));

  // === DRAINAGE HOLE or solid bottom ===
  if (hasDrainage && drainR > 1) {
    profile.push(new THREE.Vector2(drainR + 2, bottomThickness));
    // Small chamfer into drain hole
    profile.push(new THREE.Vector2(drainR, bottomThickness - 1));
    profile.push(new THREE.Vector2(drainR, 0));
  } else {
    profile.push(new THREE.Vector2(0, bottomThickness));
    profile.push(new THREE.Vector2(0, 0));
  }

  // Determine actual segment count based on pattern
  let latheSegments = segments;
  if (pattern === 'facets') {
    latheSegments = Math.min(segments, 12); // Low poly look
  }

  const geometry = new THREE.LatheGeometry(profile, latheSegments);

  // Apply surface pattern modifications
  if (pattern === 'ribs') {
    applyRibPattern(geometry, latheSegments, outerR, height);
  } else if (pattern === 'flute') {
    applyFlutePattern(geometry, latheSegments, height, bottomThickness);
  }

  geometry.computeVertexNormals();
  return geometry;
}

/** Pushes every other column of vertices outward to create vertical ribs */
function applyRibPattern(
  geometry: THREE.BufferGeometry,
  segments: number,
  outerR: number,
  height: number
) {
  const pos = geometry.getAttribute('position');
  const ribDepth = outerR * 0.03; // 3% of radius
  const ribFrequency = Math.max(4, Math.floor(segments / 8));

  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);

    // Only affect outer wall vertices (above bottom, below top)
    const dist = Math.sqrt(x * x + z * z);
    if (y > 5 && y < height - 5 && dist > outerR * 0.6) {
      const angle = Math.atan2(z, x);
      const ribFactor = Math.pow(Math.cos(angle * ribFrequency), 2);
      const scale = 1 + (ribFactor * ribDepth) / dist;
      pos.setX(i, x * scale);
      pos.setZ(i, z * scale);
    }
  }
  pos.needsUpdate = true;
}

/** Creates vertical flute channels by pushing vertices inward */
function applyFlutePattern(
  geometry: THREE.BufferGeometry,
  segments: number,
  height: number,
  bottomThickness: number
) {
  const pos = geometry.getAttribute('position');
  const fluteCount = Math.max(4, Math.floor(segments / 4));
  const fluteDepth = 2.5;

  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);

    const dist = Math.sqrt(x * x + z * z);
    if (y > bottomThickness + 2 && y < height - 8 && dist > 5) {
      const angle = Math.atan2(z, x);
      // Smooth flute: push inward at regular intervals
      const fluteFactor = Math.pow(Math.sin(angle * fluteCount), 2);
      // Fade near top and bottom
      const verticalFade =
        Math.min((y - bottomThickness - 2) / 10, 1) *
        Math.min((height - 8 - y) / 10, 1);
      const offset = fluteFactor * fluteDepth * verticalFade;
      const scale = 1 - offset / dist;
      pos.setX(i, x * scale);
      pos.setZ(i, z * scale);
    }
  }
  pos.needsUpdate = true;
}
