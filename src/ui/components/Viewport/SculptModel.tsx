import { useRef, useCallback, useMemo, useEffect } from 'react';
import * as THREE from 'three';
import { useFrame, useThree } from '@react-three/fiber';
import { useSculptStore } from '../../state/sculptStore';
import { useViewportStore } from '../../state/viewportStore';
import { useMoldStore } from '../../state/moldStore';
import { applyBrush } from '../../../sculpt/BrushEngine';

const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();

/**
 * Interactive sculpt model. Handles raycasting, pointer events, and
 * brush application. Disables orbit controls during sculpting.
 */
export function SculptModel() {
  const meshRef = useRef<THREE.Mesh>(null);
  const brushIndicatorRef = useRef<THREE.Mesh>(null);
  const isPointerDown = useRef(false);
  const lastHitRef = useRef<{ point: THREE.Vector3; normal: THREE.Vector3 } | null>(null);

  const geometry = useSculptStore((s) => s.geometry);
  const brush = useSculptStore((s) => s.brush);
  const brushRadius = useSculptStore((s) => s.brushRadius);
  const brushStrength = useSculptStore((s) => s.brushStrength);
  const brushInvert = useSculptStore((s) => s.brushInvert);
  const symmetryX = useSculptStore((s) => s.symmetryX);
  const version = useSculptStore((s) => s.version);
  const pushUndo = useSculptStore((s) => s.pushUndo);
  const bumpVersion = useSculptStore((s) => s.bumpVersion);
  const setIsSculpting = useSculptStore((s) => s.setIsSculpting);
  const setMeshStats = useViewportStore((s) => s.setMeshStats);
  const viewMode = useMoldStore((s) => s.viewMode);

  const { camera, gl } = useThree();

  // Update mesh stats when geometry changes
  useEffect(() => {
    if (!geometry) return;
    const posAttr = geometry.getAttribute('position');
    const vertices = posAttr ? posAttr.count : 0;
    const faces = Math.floor(vertices / 3);

    let volume = 0;
    if (posAttr) {
      for (let i = 0; i < posAttr.count; i += 3) {
        const ax = posAttr.getX(i), ay = posAttr.getY(i), az = posAttr.getZ(i);
        const bx = posAttr.getX(i + 1), by = posAttr.getY(i + 1), bz = posAttr.getZ(i + 1);
        const cx = posAttr.getX(i + 2), cy = posAttr.getY(i + 2), cz = posAttr.getZ(i + 2);
        volume += (ax * (by * cz - bz * cy) + bx * (cy * az - cz * ay) + cx * (ay * bz - az * by)) / 6;
      }
    }
    volume = Math.abs(volume) / 1000;

    setMeshStats({
      vertices,
      faces,
      volume: Math.round(volume * 10) / 10,
      weight: Math.round(volume * 2.3) / 1000,
    });
  }, [geometry, version, setMeshStats]);

  // Raycast against the sculpt mesh
  const doRaycast = useCallback(
    (event: PointerEvent) => {
      if (!meshRef.current) return null;

      const rect = gl.domElement.getBoundingClientRect();
      pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(pointer, camera);
      const intersects = raycaster.intersectObject(meshRef.current);

      if (intersects.length > 0) {
        const hit = intersects[0];
        return {
          point: hit.point.clone(),
          normal: hit.face ? hit.face.normal.clone().transformDirection(meshRef.current.matrixWorld) : new THREE.Vector3(0, 1, 0),
        };
      }
      return null;
    },
    [camera, gl]
  );

  // Apply brush at current pointer position
  const sculptAtPointer = useCallback(
    (event: PointerEvent) => {
      if (!geometry) return;
      const hit = doRaycast(event);
      if (!hit) return;

      lastHitRef.current = hit;
      applyBrush(
        geometry,
        hit.point,
        hit.normal,
        brush,
        brushRadius,
        brushStrength * 0.15, // scale down for per-frame application
        brushInvert,
        symmetryX
      );

      const pos = geometry.getAttribute('position');
      pos.needsUpdate = true;
      geometry.computeVertexNormals();
      geometry.computeBoundingBox();
      geometry.computeBoundingSphere();
    },
    [geometry, brush, brushRadius, brushStrength, brushInvert, symmetryX, doRaycast]
  );

  // Pointer event handlers
  useEffect(() => {
    const canvas = gl.domElement;

    const onPointerDown = (e: PointerEvent) => {
      if (e.button !== 0) return; // left click only
      if (e.altKey || e.ctrlKey || e.metaKey) return; // let orbit controls handle

      const hit = doRaycast(e);
      if (!hit) return;

      e.stopPropagation();
      isPointerDown.current = true;
      setIsSculpting(true);
      pushUndo();
      sculptAtPointer(e);
    };

    const onPointerMove = (e: PointerEvent) => {
      // Update brush indicator even when not sculpting
      const hit = doRaycast(e);
      if (hit) {
        lastHitRef.current = hit;
      } else {
        lastHitRef.current = null;
      }

      if (!isPointerDown.current) return;
      sculptAtPointer(e);
    };

    const onPointerUp = () => {
      if (isPointerDown.current) {
        isPointerDown.current = false;
        setIsSculpting(false);
        bumpVersion();
      }
    };

    canvas.addEventListener('pointerdown', onPointerDown);
    canvas.addEventListener('pointermove', onPointerMove);
    canvas.addEventListener('pointerup', onPointerUp);
    canvas.addEventListener('pointerleave', onPointerUp);

    return () => {
      canvas.removeEventListener('pointerdown', onPointerDown);
      canvas.removeEventListener('pointermove', onPointerMove);
      canvas.removeEventListener('pointerup', onPointerUp);
      canvas.removeEventListener('pointerleave', onPointerUp);
    };
  }, [gl, doRaycast, sculptAtPointer, pushUndo, bumpVersion, setIsSculpting]);

  // Update brush indicator position each frame
  useFrame(() => {
    if (brushIndicatorRef.current && lastHitRef.current) {
      brushIndicatorRef.current.position.copy(lastHitRef.current.point);
      brushIndicatorRef.current.lookAt(
        lastHitRef.current.point.clone().add(lastHitRef.current.normal)
      );
      brushIndicatorRef.current.visible = true;
    } else if (brushIndicatorRef.current) {
      brushIndicatorRef.current.visible = false;
    }
  });

  const material = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#8a8a8a',
        roughness: 0.9,
        metalness: 0.02,
        flatShading: true,
        side: THREE.DoubleSide,
        transparent: viewMode === 'both',
        opacity: viewMode === 'both' ? 0.5 : 1,
      }),
    [viewMode]
  );

  const brushIndicatorMaterial = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: '#e85d26',
        transparent: true,
        opacity: 0.25,
        side: THREE.DoubleSide,
        depthWrite: false,
      }),
    []
  );

  if (!geometry || viewMode === 'mold') return null;

  return (
    <group>
      <mesh
        ref={meshRef}
        geometry={geometry}
        material={material}
        castShadow
        receiveShadow
      />
      {/* Brush radius indicator */}
      <mesh ref={brushIndicatorRef} material={brushIndicatorMaterial}>
        <circleGeometry args={[brushRadius, 32]} />
      </mesh>
    </group>
  );
}
