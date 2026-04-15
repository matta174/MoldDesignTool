import { useMemo, useEffect } from 'react';
import * as THREE from 'three';
import { useImportStore } from '../../state/importStore';
import { useViewportStore } from '../../state/viewportStore';
import { useMoldStore } from '../../state/moldStore';

export function ImportModel() {
  const geometry = useImportStore((s) => s.geometry);
  const setMeshStats = useViewportStore((s) => s.setMeshStats);
  const viewMode = useMoldStore((s) => s.viewMode);

  // Update mesh stats when geometry changes
  useEffect(() => {
    if (!geometry) return;

    const posAttr = geometry.getAttribute('position');
    const vertices = posAttr ? posAttr.count : 0;
    const indexAttr = geometry.getIndex();
    const faces = indexAttr ? indexAttr.count / 3 : vertices / 3;

    // Compute volume using signed tetrahedron method
    let volume = 0;
    if (posAttr) {
      if (indexAttr) {
        const idx = indexAttr.array;
        for (let i = 0; i < idx.length; i += 3) {
          const ax = posAttr.getX(idx[i]), ay = posAttr.getY(idx[i]), az = posAttr.getZ(idx[i]);
          const bx = posAttr.getX(idx[i + 1]), by = posAttr.getY(idx[i + 1]), bz = posAttr.getZ(idx[i + 1]);
          const cx = posAttr.getX(idx[i + 2]), cy = posAttr.getY(idx[i + 2]), cz = posAttr.getZ(idx[i + 2]);
          volume +=
            (ax * (by * cz - bz * cy) +
             bx * (cy * az - cz * ay) +
             cx * (ay * bz - az * by)) / 6;
        }
      } else {
        for (let i = 0; i < posAttr.count; i += 3) {
          const ax = posAttr.getX(i), ay = posAttr.getY(i), az = posAttr.getZ(i);
          const bx = posAttr.getX(i + 1), by = posAttr.getY(i + 1), bz = posAttr.getZ(i + 1);
          const cx = posAttr.getX(i + 2), cy = posAttr.getY(i + 2), cz = posAttr.getZ(i + 2);
          volume +=
            (ax * (by * cz - bz * cy) +
             bx * (cy * az - cz * ay) +
             cx * (ay * bz - az * by)) / 6;
        }
      }
    }

    volume = Math.abs(volume) / 1000; // mm³ to cm³

    setMeshStats({
      vertices,
      faces: Math.round(faces),
      volume: Math.round(volume * 10) / 10,
      weight: Math.round(volume * 2.3) / 1000, // concrete ~2.3 g/cm³ → kg
    });
  }, [geometry, setMeshStats]);

  const material = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#8a8a8a',
        roughness: 0.9,
        metalness: 0.02,
        flatShading: false,
        side: THREE.DoubleSide,
        transparent: viewMode === 'both',
        opacity: viewMode === 'both' ? 0.5 : 1,
      }),
    [viewMode]
  );

  if (!geometry) return null;

  return (
    <mesh
      geometry={geometry}
      material={material}
      castShadow
      receiveShadow
    />
  );
}
