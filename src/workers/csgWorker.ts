/**
 * Web Worker for off-main-thread CSG boolean operations and mold generation.
 *
 * Handles two message types:
 *   - 'evaluateScene': CSG-combine a list of geometric scene nodes
 *   - 'generateMold': run 1-part or 2-part mold generation pipeline
 *
 * Geometry data is transferred via zero-copy ArrayBuffer transfer.
 */

import * as THREE from 'three';
import { evaluateScene } from '../designs/geometric/SceneEvaluator';
import { generateOnePieceMold } from '../mold-engine/generator/MoldGenerator';
import { generateTwoPartMold } from '../mold-engine/generator/TwoPartMoldGenerator';
import {
  serializeGeometry,
  getTransferables,
  getMultiTransferables,
  type SerializedGeometry,
} from './geometrySerialization';
import type { SceneNode } from '../ui/state/geometricStore';
import type { MoldSettings } from '../ui/state/moldStore';

// --- Message types ---

interface EvaluateSceneRequest {
  type: 'evaluateScene';
  id: number;
  nodes: SceneNode[];
}

interface GenerateMoldRequest {
  type: 'generateMold';
  id: number;
  /** Serialized model geometry (from the active design mode) */
  modelGeometry: SerializedGeometry;
  settings: MoldSettings;
  shrinkageScale: number;
  is2Part: boolean;
  partingRatio: number;
}

type WorkerRequest = EvaluateSceneRequest | GenerateMoldRequest;

interface EvaluateSceneResponse {
  type: 'evaluateScene';
  id: number;
  result: SerializedGeometry | null;
  /** Mesh stats computed inside the worker */
  stats: { vertices: number; faces: number; volume: number; weight: number } | null;
  error?: string;
}

interface GenerateMoldResponse {
  type: 'generateMold';
  id: number;
  result: {
    moldGeometry: SerializedGeometry | null;
    topHalfGeometry: SerializedGeometry | null;
    bottomHalfGeometry: SerializedGeometry | null;
    moldDimensions: { x: number; y: number; z: number };
    partingY: number;
    is2Part: boolean;
  } | null;
  error?: string;
}

// Exported for potential type-checking of worker responses
export type WorkerResponse = EvaluateSceneResponse | GenerateMoldResponse;

// --- Helpers ---

/** Rebuild a THREE.BufferGeometry from serialized data (inside worker). */
function deserializeGeometry(sg: SerializedGeometry): THREE.BufferGeometry {
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(sg.position, 3));
  if (sg.normal) {
    geo.setAttribute('normal', new THREE.BufferAttribute(sg.normal, 3));
  }
  if (sg.index) {
    geo.setIndex(new THREE.BufferAttribute(sg.index, 1));
  }
  return geo;
}

/** Compute volume via signed tetrahedron method */
function computeVolume(geo: THREE.BufferGeometry): number {
  const posAttr = geo.getAttribute('position');
  if (!posAttr) return 0;

  let volume = 0;
  const indexAttr = geo.getIndex();

  if (indexAttr) {
    const idx = indexAttr.array;
    for (let i = 0; i < idx.length; i += 3) {
      const ax = posAttr.getX(idx[i]), ay = posAttr.getY(idx[i]), az = posAttr.getZ(idx[i]);
      const bx = posAttr.getX(idx[i + 1]), by = posAttr.getY(idx[i + 1]), bz = posAttr.getZ(idx[i + 1]);
      const cx = posAttr.getX(idx[i + 2]), cy = posAttr.getY(idx[i + 2]), cz = posAttr.getZ(idx[i + 2]);
      volume += (ax * (by * cz - bz * cy) + bx * (cy * az - cz * ay) + cx * (ay * bz - az * by)) / 6;
    }
  } else {
    for (let i = 0; i < posAttr.count; i += 3) {
      const ax = posAttr.getX(i), ay = posAttr.getY(i), az = posAttr.getZ(i);
      const bx = posAttr.getX(i + 1), by = posAttr.getY(i + 1), bz = posAttr.getZ(i + 1);
      const cx = posAttr.getX(i + 2), cy = posAttr.getY(i + 2), cz = posAttr.getZ(i + 2);
      volume += (ax * (by * cz - bz * cy) + bx * (cy * az - cz * ay) + cx * (ay * bz - az * by)) / 6;
    }
  }

  return Math.abs(volume) / 1000; // mm³ → cm³
}

// --- Message handler ---

self.onmessage = (e: MessageEvent<WorkerRequest>) => {
  const msg = e.data;

  if (msg.type === 'evaluateScene') {
    handleEvaluateScene(msg);
  } else if (msg.type === 'generateMold') {
    handleGenerateMold(msg);
  }
};

function handleEvaluateScene(msg: EvaluateSceneRequest) {
  try {
    const geo = evaluateScene(msg.nodes);

    if (!geo) {
      const response: EvaluateSceneResponse = {
        type: 'evaluateScene',
        id: msg.id,
        result: null,
        stats: null,
      };
      (self as unknown as Worker).postMessage(response);
      return;
    }

    // Compute stats inside worker
    const posAttr = geo.getAttribute('position');
    const vertices = posAttr ? posAttr.count : 0;
    const indexAttr = geo.getIndex();
    const faces = indexAttr ? indexAttr.count / 3 : vertices / 3;
    const volume = computeVolume(geo);

    const serialized = serializeGeometry(geo);
    const transferables = getTransferables(serialized);

    const response: EvaluateSceneResponse = {
      type: 'evaluateScene',
      id: msg.id,
      result: serialized,
      stats: {
        vertices,
        faces: Math.round(faces),
        volume: Math.round(volume * 10) / 10,
        weight: Math.round(volume * 2.3) / 1000,
      },
    };

    (self as unknown as Worker).postMessage(response, transferables);

    // Dispose worker-side geometry
    geo.dispose();
  } catch (err) {
    const response: EvaluateSceneResponse = {
      type: 'evaluateScene',
      id: msg.id,
      result: null,
      stats: null,
      error: err instanceof Error ? err.message : String(err),
    };
    (self as unknown as Worker).postMessage(response);
  }
}

function handleGenerateMold(msg: GenerateMoldRequest) {
  try {
    const modelGeo = deserializeGeometry(msg.modelGeometry);

    if (msg.is2Part) {
      const result = generateTwoPartMold(
        modelGeo,
        msg.settings,
        msg.shrinkageScale,
        msg.partingRatio
      );

      const topSerialized = serializeGeometry(result.topGeometry);
      const bottomSerialized = serializeGeometry(result.bottomGeometry);
      const transferables = getMultiTransferables(topSerialized, bottomSerialized);

      const response: GenerateMoldResponse = {
        type: 'generateMold',
        id: msg.id,
        result: {
          moldGeometry: null,
          topHalfGeometry: topSerialized,
          bottomHalfGeometry: bottomSerialized,
          moldDimensions: {
            x: result.moldDimensions.x,
            y: result.moldDimensions.y,
            z: result.moldDimensions.z,
          },
          partingY: result.partingY,
          is2Part: true,
        },
      };

      (self as unknown as Worker).postMessage(response, transferables);

      // Dispose worker-side geometries
      result.topGeometry.dispose();
      result.bottomGeometry.dispose();
      result.modelGeometry.dispose();
    } else {
      const result = generateOnePieceMold(
        modelGeo,
        msg.settings,
        msg.shrinkageScale
      );

      const moldSerialized = serializeGeometry(result.moldGeometry);
      const transferables = getTransferables(moldSerialized);

      const response: GenerateMoldResponse = {
        type: 'generateMold',
        id: msg.id,
        result: {
          moldGeometry: moldSerialized,
          topHalfGeometry: null,
          bottomHalfGeometry: null,
          moldDimensions: {
            x: result.moldDimensions.x,
            y: result.moldDimensions.y,
            z: result.moldDimensions.z,
          },
          partingY: 0,
          is2Part: false,
        },
      };

      (self as unknown as Worker).postMessage(response, transferables);

      result.moldGeometry.dispose();
      result.modelGeometry.dispose();
    }

    modelGeo.dispose();
  } catch (err) {
    const response: GenerateMoldResponse = {
      type: 'generateMold',
      id: msg.id,
      result: null,
      error: err instanceof Error ? err.message : String(err),
    };
    (self as unknown as Worker).postMessage(response);
  }
}
