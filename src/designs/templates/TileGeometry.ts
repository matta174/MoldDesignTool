import * as THREE from 'three';
import type { TemplateParams, SurfacePattern } from '../../ui/state/designStore';

/**
 * Generates a parametric rectangular tile with optional chamfered edges,
 * border frame, surface relief patterns, and mount hole.
 */
export function generateTileGeometry(params: TemplateParams): THREE.BufferGeometry {
  const width = (params.width as number) || 150;
  const tileHeight = (params.tileHeight as number) || 150;
  const thickness = (params.thickness as number) || 12;
  const reliefDepth = (params.reliefDepth as number) || 3;
  const borderWidth = (params.borderWidth as number) || 8;
  const chamfer = (params.chamfer as number) || 1;
  const patternScale = (params.patternScale as number) || 20;
  const patternRotation = ((params.patternRotation as number) || 0) * Math.PI / 180;
  const hasMountHole = params.mountHole === true;
  const pattern = (params.surfacePattern as SurfacePattern) || 'none';

  // Base tile
  const hw = width / 2;
  const hh = tileHeight / 2;

  // Use a more detailed plane so we can displace vertices
  const segW = Math.max(2, Math.ceil(width / 3));
  const segH = Math.max(2, Math.ceil(tileHeight / 3));
  const geometry = new THREE.BoxGeometry(width, thickness, tileHeight, segW, 4, segH);
  geometry.translate(0, thickness / 2, 0);

  const pos = geometry.getAttribute('position');

  // Apply chamfer to edges
  if (chamfer > 0) {
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const y = pos.getY(i);
      const z = pos.getZ(i);

      // Top edges
      if (y > thickness - chamfer - 0.1) {
        const edgeDistX = Math.max(0, Math.abs(x) - (hw - chamfer));
        const edgeDistZ = Math.max(0, Math.abs(z) - (hh - chamfer));
        if (edgeDistX > 0 || edgeDistZ > 0) {
          const maxEdge = Math.max(edgeDistX, edgeDistZ);
          const newY = Math.min(y, thickness - maxEdge);
          pos.setY(i, newY);
        }
      }
    }
  }

  // Apply relief pattern to top surface
  if (reliefDepth > 0 && pattern !== 'none') {
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const y = pos.getY(i);
      const z = pos.getZ(i);

      // Only modify top face vertices
      if (y >= thickness - chamfer - 0.5) {
        // Check if inside border
        const inBorder =
          Math.abs(x) > hw - borderWidth ||
          Math.abs(z) > hh - borderWidth;

        if (!inBorder) {
          // Rotate pattern coordinates
          const rx = x * Math.cos(patternRotation) - z * Math.sin(patternRotation);
          const rz = x * Math.sin(patternRotation) + z * Math.cos(patternRotation);

          let displacement = 0;

          if (pattern === 'ribs') {
            // Parallel ribs
            displacement = Math.pow(Math.sin((rx / patternScale) * Math.PI), 2) * reliefDepth;
          } else if (pattern === 'facets') {
            // Diamond / checkerboard pattern
            const cx = Math.sin((rx / patternScale) * Math.PI);
            const cz = Math.sin((rz / patternScale) * Math.PI);
            displacement = Math.abs(cx * cz) * reliefDepth;
          } else if (pattern === 'flute') {
            // Concentric-ish ripple
            const dist = Math.sqrt(rx * rx + rz * rz);
            displacement = Math.pow(Math.sin((dist / patternScale) * Math.PI), 2) * reliefDepth;
          }

          // Fade near border
          const fadeX = Math.min((hw - borderWidth - Math.abs(x)) / 5, 1);
          const fadeZ = Math.min((hh - borderWidth - Math.abs(z)) / 5, 1);
          const fade = Math.max(0, Math.min(fadeX, fadeZ));

          pos.setY(i, y + displacement * fade);
        }
      }
    }
  }

  // Add raised border frame
  if (borderWidth > 0 && reliefDepth > 0 && pattern !== 'none') {
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const y = pos.getY(i);
      const z = pos.getZ(i);

      if (y >= thickness - chamfer - 0.5) {
        const inBorder =
          Math.abs(x) > hw - borderWidth ||
          Math.abs(z) > hh - borderWidth;
        const onEdge =
          Math.abs(x) > hw - 1 ||
          Math.abs(z) > hh - 1;

        if (inBorder && !onEdge) {
          // Raise border slightly above relief
          pos.setY(i, y + reliefDepth * 0.3);
        }
      }
    }
  }

  // Mount hole — depress vertices in center of back face
  if (hasMountHole) {
    const holeRadius = 8;
    const holeDepth = 4;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const y = pos.getY(i);
      const z = pos.getZ(i);

      // Back face (y near 0) and near center
      if (y < 1) {
        const dist = Math.sqrt(x * x + z * z);
        if (dist < holeRadius) {
          const t = 1 - dist / holeRadius;
          pos.setY(i, y - holeDepth * t * t);
        }
      }
    }
  }

  pos.needsUpdate = true;
  geometry.computeVertexNormals();
  return geometry;
}
