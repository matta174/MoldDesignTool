import { create } from 'zustand';
import * as THREE from 'three';
import { useMoldStore } from './moldStore';

export type BrushType = 'grab' | 'smooth' | 'inflate' | 'flatten' | 'crease' | 'pinch';
export type BaseMeshType = 'sphere' | 'cube' | 'cylinder';

export interface SculptState {
  /** The live sculpted geometry (mutated in place for perf) */
  geometry: THREE.BufferGeometry | null;
  /** Which base mesh we started from */
  baseMesh: BaseMeshType;
  /** Subdivision level (higher = more vertices = finer detail) */
  resolution: number;
  /** Active brush */
  brush: BrushType;
  /** Brush radius in world units (mm) */
  brushRadius: number;
  /** Brush strength 0–1 */
  brushStrength: number;
  /** Invert brush direction (push vs pull) */
  brushInvert: boolean;
  /** Mirror sculpting across X axis */
  symmetryX: boolean;
  /** Undo stack: snapshots of position arrays */
  undoStack: Float32Array[];
  /** Redo stack */
  redoStack: Float32Array[];
  /** Version counter — incremented on every stroke to trigger re-renders */
  version: number;
  /** Whether user is actively sculpting (pointer down) */
  isSculpting: boolean;

  initMesh: (type: BaseMeshType, resolution?: number) => void;
  setBrush: (brush: BrushType) => void;
  setBrushRadius: (radius: number) => void;
  setBrushStrength: (strength: number) => void;
  setBrushInvert: (invert: boolean) => void;
  setSymmetryX: (sym: boolean) => void;
  setIsSculpting: (sculpting: boolean) => void;
  /** Push current positions to undo stack (call before a stroke) */
  pushUndo: () => void;
  undo: () => void;
  redo: () => void;
  /** Bump version to trigger viewport re-render */
  bumpVersion: () => void;
  resetSculpt: () => void;
}

function invalidateMold() {
  const { moldGenerated, resetMold } = useMoldStore.getState();
  if (moldGenerated) resetMold();
}

function createBaseMesh(type: BaseMeshType, resolution: number): THREE.BufferGeometry {
  const subdivisions = Math.max(8, resolution);
  let geo: THREE.BufferGeometry;

  switch (type) {
    case 'sphere':
      geo = new THREE.SphereGeometry(40, subdivisions * 2, subdivisions);
      geo.translate(0, 40, 0);
      break;
    case 'cube':
      geo = new THREE.BoxGeometry(70, 70, 70, subdivisions, subdivisions, subdivisions);
      geo.translate(0, 35, 0);
      break;
    case 'cylinder':
      geo = new THREE.CylinderGeometry(30, 35, 80, subdivisions * 2, subdivisions);
      geo.translate(0, 40, 0);
      break;
    default:
      geo = new THREE.SphereGeometry(40, subdivisions * 2, subdivisions);
      geo.translate(0, 40, 0);
  }

  // Convert to non-indexed for per-vertex sculpting
  const nonIndexed = geo.toNonIndexed();
  geo.dispose();

  nonIndexed.computeVertexNormals();
  return nonIndexed;
}

export const useSculptStore = create<SculptState>((set, get) => ({
  geometry: null,
  baseMesh: 'sphere',
  resolution: 32,
  brush: 'grab',
  brushRadius: 15,
  brushStrength: 0.5,
  brushInvert: false,
  symmetryX: true,
  undoStack: [],
  redoStack: [],
  version: 0,
  isSculpting: false,

  initMesh: (type, resolution) => {
    const res = resolution ?? get().resolution;
    const geometry = createBaseMesh(type, res);
    invalidateMold();
    set({
      geometry,
      baseMesh: type,
      resolution: res,
      undoStack: [],
      redoStack: [],
      version: 0,
    });
  },

  setBrush: (brush) => set({ brush }),
  setBrushRadius: (brushRadius) => set({ brushRadius }),
  setBrushStrength: (brushStrength) => set({ brushStrength }),
  setBrushInvert: (brushInvert) => set({ brushInvert }),
  setSymmetryX: (symmetryX) => set({ symmetryX }),
  setIsSculpting: (isSculpting) => set({ isSculpting }),

  pushUndo: () => {
    const geo = get().geometry;
    if (!geo) return;
    const pos = geo.getAttribute('position');
    const snapshot = new Float32Array(pos.array.length);
    snapshot.set(pos.array as Float32Array);
    set((state) => ({
      undoStack: [...state.undoStack.slice(-30), snapshot], // keep last 30
      redoStack: [],
    }));
  },

  undo: () => {
    const { geometry, undoStack } = get();
    if (!geometry || undoStack.length === 0) return;
    const pos = geometry.getAttribute('position');

    // Save current to redo
    const currentSnapshot = new Float32Array(pos.array.length);
    currentSnapshot.set(pos.array as Float32Array);

    // Restore from undo
    const restoreSnapshot = undoStack[undoStack.length - 1];
    (pos.array as Float32Array).set(restoreSnapshot);
    pos.needsUpdate = true;
    geometry.computeVertexNormals();
    geometry.computeBoundingBox();
    geometry.computeBoundingSphere();

    invalidateMold();
    set((state) => ({
      undoStack: state.undoStack.slice(0, -1),
      redoStack: [...state.redoStack, currentSnapshot],
      version: state.version + 1,
    }));
  },

  redo: () => {
    const { geometry, redoStack } = get();
    if (!geometry || redoStack.length === 0) return;
    const pos = geometry.getAttribute('position');

    // Save current to undo
    const currentSnapshot = new Float32Array(pos.array.length);
    currentSnapshot.set(pos.array as Float32Array);

    // Restore from redo
    const restoreSnapshot = redoStack[redoStack.length - 1];
    (pos.array as Float32Array).set(restoreSnapshot);
    pos.needsUpdate = true;
    geometry.computeVertexNormals();
    geometry.computeBoundingBox();
    geometry.computeBoundingSphere();

    invalidateMold();
    set((state) => ({
      redoStack: state.redoStack.slice(0, -1),
      undoStack: [...state.undoStack, currentSnapshot],
      version: state.version + 1,
    }));
  },

  bumpVersion: () => {
    invalidateMold();
    set((state) => ({ version: state.version + 1 }));
  },

  resetSculpt: () => {
    const type = get().baseMesh;
    const res = get().resolution;
    const geometry = createBaseMesh(type, res);
    invalidateMold();
    set({
      geometry,
      undoStack: [],
      redoStack: [],
      version: 0,
    });
  },
}));
