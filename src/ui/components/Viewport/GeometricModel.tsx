import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { useGeometricStore } from '../../state/geometricStore';
import { useViewportStore } from '../../state/viewportStore';
import { useMoldStore } from '../../state/moldStore';
import { generateNodePreviews } from '../../../designs/geometric/SceneEvaluator';
import { createPrimitiveGeometry } from '../../../designs/geometric/PrimitiveFactory';
import { useDisposableGeometry } from '../../../utils/hooks/useDisposableGeometry';
import { csgWorkerClient } from '../../../workers/csgWorkerClient';

/**
 * Renders the combined CSG result of all geometric nodes.
 *
 * Multi-node CSG evaluation runs off the main thread via Web Worker,
 * keeping the viewport responsive during heavy boolean operations.
 * Single-node scenes render directly (no CSG needed).
 */
export function GeometricModel() {
  const nodes = useGeometricStore((s) => s.nodes);
  const selectedNodeId = useGeometricStore((s) => s.selectedNodeId);
  const version = useGeometricStore((s) => s.version);
  const setMeshStats = useViewportStore((s) => s.setMeshStats);
  const viewMode = useMoldStore((s) => s.viewMode);

  const [resultGeometry, setResultGeometry] = useState<THREE.BufferGeometry | null>(null);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const requestIdRef = useRef(0);

  // Dispose geometry when it changes
  useDisposableGeometry(resultGeometry);

  // Evaluate CSG asynchronously via worker (for multi-node scenes)
  // Single-node scenes are rendered directly without CSG
  useEffect(() => {
    if (nodes.length === 0) {
      setResultGeometry(null);
      return;
    }

    if (nodes.length === 1) {
      // Single node — show primitive directly, no worker needed
      const node = nodes[0];
      const geo = createPrimitiveGeometry(node.type, node.dimensions);
      const matrix = new THREE.Matrix4();
      const euler = new THREE.Euler(
        (node.rotation.x * Math.PI) / 180,
        (node.rotation.y * Math.PI) / 180,
        (node.rotation.z * Math.PI) / 180
      );
      const quat = new THREE.Quaternion().setFromEuler(euler);
      const pos = new THREE.Vector3(node.position.x, node.position.y, node.position.z);
      const scale = new THREE.Vector3(node.scale.x, node.scale.y, node.scale.z);
      matrix.compose(pos, quat, scale);
      geo.applyMatrix4(matrix);
      geo.computeVertexNormals();

      // Compute stats for single node
      const posAttr = geo.getAttribute('position');
      const vertices = posAttr ? posAttr.count : 0;
      const indexAttr = geo.getIndex();
      const faces = indexAttr ? indexAttr.count / 3 : vertices / 3;

      setMeshStats({
        vertices,
        faces: Math.round(faces),
        volume: 0,
        weight: 0,
      });

      setResultGeometry(geo);
      return;
    }

    // Multi-node: use worker
    const reqId = ++requestIdRef.current;
    setIsEvaluating(true);

    csgWorkerClient
      .evaluateScene(nodes)
      .then(({ geometry, stats }) => {
        // Only apply if this is still the latest request
        if (reqId !== requestIdRef.current) {
          geometry?.dispose();
          return;
        }
        setResultGeometry(geometry);
        if (stats) setMeshStats(stats);
        setIsEvaluating(false);
      })
      .catch((err) => {
        if (reqId !== requestIdRef.current) return;
        console.warn('Worker CSG evaluation failed:', err);
        setIsEvaluating(false);
      });

    return () => {
      // If a new evaluation starts before this one finishes,
      // the reqId check above will discard the stale result
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nodes, version]);

  // Individual node wireframe previews (cheap, stays on main thread)
  const previews = useMemo(() => {
    if (nodes.length < 2) return [];
    return generateNodePreviews(nodes);
  }, [nodes, version]); // eslint-disable-line react-hooks/exhaustive-deps

  const solidMaterial = useMemo(
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

  const wireframeMaterial = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: '#e85d26',
        wireframe: true,
        transparent: true,
        opacity: 0.3,
      }),
    []
  );

  const selectedWireframeMaterial = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: '#e85d26',
        wireframe: true,
        transparent: true,
        opacity: 0.7,
      }),
    []
  );

  if (viewMode === 'mold') return null;

  // Show nothing while first evaluation is in flight
  if (!resultGeometry && isEvaluating) return null;
  if (!resultGeometry) return null;

  return (
    <group>
      {/* CSG result solid */}
      <mesh
        geometry={resultGeometry}
        material={solidMaterial}
        castShadow
        receiveShadow
      />

      {/* Wireframe previews of individual nodes (when >= 2 nodes) */}
      {previews.map((preview) => (
        <mesh
          key={preview.nodeId}
          geometry={preview.geometry}
          material={
            preview.nodeId === selectedNodeId
              ? selectedWireframeMaterial
              : wireframeMaterial
          }
          matrixAutoUpdate={false}
          matrix={preview.matrix}
        />
      ))}
    </group>
  );
}
