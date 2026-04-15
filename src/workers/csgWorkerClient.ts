/**
 * Promise-based client for the CSG Web Worker.
 *
 * Usage:
 *   const result = await csgWorkerClient.evaluateScene(nodes);
 *   const mold = await csgWorkerClient.generateMold(geo, settings, ...);
 *
 * The worker is lazily initialized on first call and reused for all requests.
 * Requests are tagged with an auto-incrementing ID so responses are matched
 * to the correct promise, even when multiple calls are in flight.
 */

import * as THREE from 'three';
import {
  serializeGeometry,
  getTransferables,
  type SerializedGeometry,
} from './geometrySerialization';
import type { SceneNode } from '../ui/state/geometricStore';
import type { MoldSettings } from '../ui/state/moldStore';

// --- Response types (matching worker output) ---

interface EvaluateSceneResult {
  geometry: THREE.BufferGeometry | null;
  stats: { vertices: number; faces: number; volume: number; weight: number } | null;
}

interface GenerateMoldResult {
  moldGeometry: THREE.BufferGeometry | null;
  topHalfGeometry: THREE.BufferGeometry | null;
  bottomHalfGeometry: THREE.BufferGeometry | null;
  moldDimensions: { x: number; y: number; z: number };
  partingY: number;
  is2Part: boolean;
}

// --- Internal state ---

let worker: Worker | null = null;
let nextId = 0;
const pendingRequests = new Map<number, {
  resolve: (value: unknown) => void;
  reject: (reason: Error) => void;
}>();

/** Lazily create the worker. Vite handles the URL + bundling. */
function getWorker(): Worker {
  if (!worker) {
    worker = new Worker(
      new URL('./csgWorker.ts', import.meta.url),
      { type: 'module' }
    );

    worker.onmessage = (e: MessageEvent) => {
      const { id, error } = e.data;
      const pending = pendingRequests.get(id);
      if (!pending) return;
      pendingRequests.delete(id);

      if (error) {
        pending.reject(new Error(error));
      } else {
        pending.resolve(e.data);
      }
    };

    worker.onerror = (e) => {
      console.error('[CSG Worker] Uncaught error:', e);
    };
  }
  return worker;
}

/** Rebuild a Three.js BufferGeometry from serialized data. */
function deserialize(sg: SerializedGeometry): THREE.BufferGeometry {
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

// --- Public API ---

export const csgWorkerClient = {
  /**
   * Evaluate a list of geometric scene nodes via CSG on the worker thread.
   * Returns the combined geometry + mesh stats, or null if the scene is empty.
   */
  evaluateScene(nodes: SceneNode[]): Promise<EvaluateSceneResult> {
    return new Promise((resolve, reject) => {
      const id = nextId++;
      pendingRequests.set(id, {
        resolve: (raw: unknown) => {
          const data = raw as { result: SerializedGeometry | null; stats: EvaluateSceneResult['stats'] };
          if (data.result) {
            resolve({
              geometry: deserialize(data.result),
              stats: data.stats,
            });
          } else {
            resolve({ geometry: null, stats: null });
          }
        },
        reject,
      });

      const w = getWorker();
      // SceneNode is plain data (no class instances), safe to postMessage directly
      w.postMessage({ type: 'evaluateScene', id, nodes });
    });
  },

  /**
   * Generate a mold (1-part or 2-part) on the worker thread.
   * The model geometry is serialized and transferred zero-copy.
   */
  generateMold(
    modelGeometry: THREE.BufferGeometry,
    settings: MoldSettings,
    shrinkageScale: number,
    is2Part: boolean,
    partingRatio: number
  ): Promise<GenerateMoldResult> {
    return new Promise((resolve, reject) => {
      const id = nextId++;
      pendingRequests.set(id, {
        resolve: (raw: unknown) => {
          const data = raw as {
            result: {
              moldGeometry: SerializedGeometry | null;
              topHalfGeometry: SerializedGeometry | null;
              bottomHalfGeometry: SerializedGeometry | null;
              moldDimensions: { x: number; y: number; z: number };
              partingY: number;
              is2Part: boolean;
            } | null;
          };

          if (!data.result) {
            reject(new Error('Mold generation returned no result'));
            return;
          }

          resolve({
            moldGeometry: data.result.moldGeometry ? deserialize(data.result.moldGeometry) : null,
            topHalfGeometry: data.result.topHalfGeometry ? deserialize(data.result.topHalfGeometry) : null,
            bottomHalfGeometry: data.result.bottomHalfGeometry ? deserialize(data.result.bottomHalfGeometry) : null,
            moldDimensions: data.result.moldDimensions,
            partingY: data.result.partingY,
            is2Part: data.result.is2Part,
          });
        },
        reject,
      });

      // Serialize the model geometry and transfer the buffers
      const serialized = serializeGeometry(modelGeometry);
      const transferables = getTransferables(serialized);

      const w = getWorker();
      w.postMessage(
        {
          type: 'generateMold',
          id,
          modelGeometry: serialized,
          settings,
          shrinkageScale,
          is2Part,
          partingRatio,
        },
        transferables
      );
    });
  },

  /**
   * Terminate the worker. Call on app teardown if needed.
   */
  terminate() {
    if (worker) {
      worker.terminate();
      worker = null;
      // Reject any pending requests
      for (const [, pending] of pendingRequests) {
        pending.reject(new Error('Worker terminated'));
      }
      pendingRequests.clear();
    }
  },
};
