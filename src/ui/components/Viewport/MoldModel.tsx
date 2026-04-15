import { useMemo } from 'react';
import * as THREE from 'three';
import { useMoldStore } from '../../state/moldStore';

const TOP_COLOR = '#e85d26';    // formwork orange
const BOTTOM_COLOR = '#2563eb'; // blue for bottom half

/**
 * Renders the generated mold geometry in the viewport.
 * Supports both 1-part (single mesh) and 2-part (top/bottom halves).
 * Only visible when viewMode is 'mold' or 'both'.
 */
export function MoldModel() {
  const moldGeometry = useMoldStore((s) => s.moldGeometry);
  const topHalfGeometry = useMoldStore((s) => s.topHalfGeometry);
  const bottomHalfGeometry = useMoldStore((s) => s.bottomHalfGeometry);
  const moldType = useMoldStore((s) => s.settings.moldType);
  const viewMode = useMoldStore((s) => s.viewMode);
  const moldHalfView = useMoldStore((s) => s.moldHalfView);
  const partingY = useMoldStore((s) => s.partingY);

  const transparent = viewMode === 'both';

  // 1-part material
  const onePieceMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: TOP_COLOR,
        roughness: 0.6,
        metalness: 0.1,
        transparent,
        opacity: transparent ? 0.4 : 1,
        side: THREE.DoubleSide,
      }),
    [transparent]
  );

  // 2-part materials
  const topMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: TOP_COLOR,
        roughness: 0.6,
        metalness: 0.1,
        transparent,
        opacity: transparent ? 0.4 : 1,
        side: THREE.DoubleSide,
      }),
    [transparent]
  );

  const bottomMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: BOTTOM_COLOR,
        roughness: 0.6,
        metalness: 0.1,
        transparent,
        opacity: transparent ? 0.4 : 1,
        side: THREE.DoubleSide,
      }),
    [transparent]
  );

  // Parting plane indicator
  const partingPlaneMaterial = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: '#d97706',
        transparent: true,
        opacity: 0.15,
        side: THREE.DoubleSide,
      }),
    []
  );

  if (viewMode === 'model') return null;

  // 2-part mold rendering
  if (moldType === '2part' && (topHalfGeometry || bottomHalfGeometry)) {
    const showTop = moldHalfView === 'both-halves' || moldHalfView === 'top';
    const showBottom = moldHalfView === 'both-halves' || moldHalfView === 'bottom';

    // Separate halves vertically when showing both for clarity
    const separation = moldHalfView === 'both-halves' ? 15 : 0;

    return (
      <group>
        {showTop && topHalfGeometry && (
          <mesh
            geometry={topHalfGeometry}
            material={topMaterial}
            position={[0, separation, 0]}
            castShadow
            receiveShadow
          />
        )}
        {showBottom && bottomHalfGeometry && (
          <mesh
            geometry={bottomHalfGeometry}
            material={bottomMaterial}
            position={[0, -separation, 0]}
            castShadow
            receiveShadow
          />
        )}
        {/* Parting plane indicator */}
        {moldHalfView === 'both-halves' && partingY !== null && (
          <mesh
            rotation={[-Math.PI / 2, 0, 0]}
            position={[0, partingY, 0]}
            material={partingPlaneMaterial}
          >
            <planeGeometry args={[300, 300]} />
          </mesh>
        )}
      </group>
    );
  }

  // 1-part mold rendering
  if (!moldGeometry) return null;

  return (
    <mesh
      geometry={moldGeometry}
      material={onePieceMaterial}
      castShadow
      receiveShadow
    />
  );
}
