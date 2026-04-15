import * as THREE from 'three';
import type { TemplateParams, SurfacePattern } from '../../ui/state/designStore';

/**
 * Generates a parametric coaster — circular or polygon disc with
 * chamfered edges, optional ring groove, and cork recess.
 */
export function generateCoasterGeometry(params: TemplateParams): THREE.BufferGeometry {
  const outerDiameter = (params.outerDiameter as number) || 100;
  const thickness = (params.thickness as number) || 8;
  const chamfer = (params.chamfer as number) || 2;
  const grooveDepth = (params.grooveDepth as number) || 1.5;
  const grooveWidth = (params.grooveWidth as number) || 3;
  const grooveInset = (params.grooveInset as number) || 8;
  const sides = (params.sides as number) || 0; // 0 = circle
  const segments = (params.segments as number) || 64;
  const hasCorkRecess = params.corkBase === true;
  const pattern = (params.surfacePattern as SurfacePattern) || 'none';

  const outerR = outerDiameter / 2;

  // Build cross-section profile for lathe
  const profile: THREE.Vector2[] = [];

  // Bottom face
  if (hasCorkRecess) {
    // Cork recess: 1mm deep, inset 5mm from edge
    const corkInset = 5;
    const corkDepth = 1;
    profile.push(new THREE.Vector2(0, 0));
    profile.push(new THREE.Vector2(outerR - corkInset, 0));
    profile.push(new THREE.Vector2(outerR - corkInset, corkDepth));
    profile.push(new THREE.Vector2(outerR - corkInset - 1, corkDepth)); // step
    // ring support
    profile.push(new THREE.Vector2(outerR - corkInset - 1, 0));
    profile.push(new THREE.Vector2(outerR - chamfer, 0));
  } else {
    profile.push(new THREE.Vector2(0, 0));
    if (chamfer > 0) {
      profile.push(new THREE.Vector2(outerR - chamfer, 0));
    }
  }

  // Bottom chamfer
  if (chamfer > 0) {
    profile.push(new THREE.Vector2(outerR, chamfer));
  } else {
    profile.push(new THREE.Vector2(outerR, 0));
  }

  // Outer wall
  profile.push(new THREE.Vector2(outerR, thickness - chamfer));

  // Top chamfer
  if (chamfer > 0) {
    profile.push(new THREE.Vector2(outerR - chamfer, thickness));
  } else {
    profile.push(new THREE.Vector2(outerR, thickness));
  }

  // Top face with groove
  if (grooveDepth > 0 && grooveWidth > 0) {
    const grooveOuterR = outerR - grooveInset;
    const grooveInnerR = grooveOuterR - grooveWidth;
    if (grooveInnerR > 2) {
      profile.push(new THREE.Vector2(grooveOuterR + 0.5, thickness));
      profile.push(new THREE.Vector2(grooveOuterR, thickness - grooveDepth));
      profile.push(new THREE.Vector2(grooveInnerR, thickness - grooveDepth));
      profile.push(new THREE.Vector2(grooveInnerR - 0.5, thickness));
    }
  }

  // Center
  profile.push(new THREE.Vector2(0, thickness));

  // Reverse profile to get correct winding for lathe
  profile.reverse();

  let latheSegments = segments;
  if (sides >= 3 && sides <= 8) {
    latheSegments = sides;
  }
  if (pattern === 'facets' && sides === 0) {
    latheSegments = 8;
  }

  const geometry = new THREE.LatheGeometry(profile, latheSegments);

  // Apply rib pattern to top surface
  if (pattern === 'ribs') {
    applyCoasterRibs(geometry, latheSegments, outerR, thickness);
  }

  geometry.computeVertexNormals();
  return geometry;
}

function applyCoasterRibs(
  geometry: THREE.BufferGeometry,
  segments: number,
  outerR: number,
  thickness: number
) {
  const pos = geometry.getAttribute('position');
  const ribCount = Math.max(4, Math.floor(segments / 4));
  const ribHeight = 0.8;

  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);
    const dist = Math.sqrt(x * x + z * z);

    // Only affect top surface vertices
    if (Math.abs(y - thickness) < 0.5 && dist > 3 && dist < outerR - 3) {
      const angle = Math.atan2(z, x);
      const ribFactor = Math.pow(Math.cos(angle * ribCount), 4);
      pos.setY(i, y + ribFactor * ribHeight);
    }
  }
  pos.needsUpdate = true;
}
