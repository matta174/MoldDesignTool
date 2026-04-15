import { create } from 'zustand';
import type { CSGOp } from '../../core/csg/CSGOperation';
import { useMoldStore } from './moldStore';

export type PrimitiveType = 'box' | 'sphere' | 'cylinder' | 'torus';

export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

export interface SceneNode {
  id: string;
  name: string;
  type: PrimitiveType;
  /** Dimensions vary by type:
   *  box: width/height/depth
   *  sphere: radius (x), segments (y, z ignored)
   *  cylinder: radiusTop (x), radiusBottom (y), height (z)
   *  torus: radius (x), tube (y), z ignored
   */
  dimensions: Vec3;
  position: Vec3;
  rotation: Vec3; // degrees
  scale: Vec3;
  /** CSG operation applied when combining with previous nodes */
  operation: CSGOp;
}

export interface GeometricState {
  nodes: SceneNode[];
  selectedNodeId: string | null;
  /** Counter for unique naming */
  nextId: number;
  /** Cached result geometry version — bumps on any change */
  version: number;

  addNode: (type: PrimitiveType) => void;
  removeNode: (id: string) => void;
  duplicateNode: (id: string) => void;
  selectNode: (id: string | null) => void;
  updateNode: (id: string, updates: Partial<Omit<SceneNode, 'id'>>) => void;
  setNodePosition: (id: string, axis: 'x' | 'y' | 'z', value: number) => void;
  setNodeRotation: (id: string, axis: 'x' | 'y' | 'z', value: number) => void;
  setNodeScale: (id: string, axis: 'x' | 'y' | 'z', value: number) => void;
  setNodeDimension: (id: string, axis: 'x' | 'y' | 'z', value: number) => void;
  setNodeOperation: (id: string, op: CSGOp) => void;
  moveNodeUp: (id: string) => void;
  moveNodeDown: (id: string) => void;
  clearScene: () => void;
}

const PRIMITIVE_DEFAULTS: Record<PrimitiveType, { dimensions: Vec3; position: Vec3 }> = {
  box: {
    dimensions: { x: 60, y: 80, z: 60 },
    position: { x: 0, y: 40, z: 0 },
  },
  sphere: {
    dimensions: { x: 40, y: 32, z: 32 }, // radius, widthSeg, heightSeg
    position: { x: 0, y: 40, z: 0 },
  },
  cylinder: {
    dimensions: { x: 30, y: 30, z: 80 }, // radiusTop, radiusBottom, height
    position: { x: 0, y: 40, z: 0 },
  },
  torus: {
    dimensions: { x: 40, y: 12, z: 32 }, // radius, tube, segments
    position: { x: 0, y: 40, z: 0 },
  },
};

const PRIMITIVE_NAMES: Record<PrimitiveType, string> = {
  box: 'Box',
  sphere: 'Sphere',
  cylinder: 'Cylinder',
  torus: 'Torus',
};

function invalidateMold() {
  const { moldGenerated, resetMold } = useMoldStore.getState();
  if (moldGenerated) resetMold();
}

export const useGeometricStore = create<GeometricState>((set) => ({
  nodes: [],
  selectedNodeId: null,
  nextId: 1,
  version: 0,

  addNode: (type) =>
    set((state) => {
      const defaults = PRIMITIVE_DEFAULTS[type];
      const name = `${PRIMITIVE_NAMES[type]}_${String(state.nextId).padStart(3, '0')}`;
      const node: SceneNode = {
        id: `node_${state.nextId}`,
        name,
        type,
        dimensions: { ...defaults.dimensions },
        position: { ...defaults.position },
        rotation: { x: 0, y: 0, z: 0 },
        scale: { x: 1, y: 1, z: 1 },
        operation: state.nodes.length === 0 ? 'union' : 'union',
      };
      invalidateMold();
      return {
        nodes: [...state.nodes, node],
        selectedNodeId: node.id,
        nextId: state.nextId + 1,
        version: state.version + 1,
      };
    }),

  removeNode: (id) =>
    set((state) => {
      const filtered = state.nodes.filter((n) => n.id !== id);
      invalidateMold();
      return {
        nodes: filtered,
        selectedNodeId:
          state.selectedNodeId === id
            ? (filtered.length > 0 ? filtered[filtered.length - 1].id : null)
            : state.selectedNodeId,
        version: state.version + 1,
      };
    }),

  duplicateNode: (id) =>
    set((state) => {
      const source = state.nodes.find((n) => n.id === id);
      if (!source) return state;
      const name = `${source.name}_copy`;
      const newNode: SceneNode = {
        ...source,
        id: `node_${state.nextId}`,
        name,
        position: { ...source.position, x: source.position.x + 20 },
        dimensions: { ...source.dimensions },
        rotation: { ...source.rotation },
        scale: { ...source.scale },
      };
      invalidateMold();
      return {
        nodes: [...state.nodes, newNode],
        selectedNodeId: newNode.id,
        nextId: state.nextId + 1,
        version: state.version + 1,
      };
    }),

  selectNode: (id) => set({ selectedNodeId: id }),

  updateNode: (id, updates) =>
    set((state) => {
      invalidateMold();
      return {
        nodes: state.nodes.map((n) => (n.id === id ? { ...n, ...updates } : n)),
        version: state.version + 1,
      };
    }),

  setNodePosition: (id, axis, value) =>
    set((state) => {
      invalidateMold();
      return {
        nodes: state.nodes.map((n) =>
          n.id === id ? { ...n, position: { ...n.position, [axis]: value } } : n
        ),
        version: state.version + 1,
      };
    }),

  setNodeRotation: (id, axis, value) =>
    set((state) => {
      invalidateMold();
      return {
        nodes: state.nodes.map((n) =>
          n.id === id ? { ...n, rotation: { ...n.rotation, [axis]: value } } : n
        ),
        version: state.version + 1,
      };
    }),

  setNodeScale: (id, axis, value) =>
    set((state) => {
      invalidateMold();
      return {
        nodes: state.nodes.map((n) =>
          n.id === id ? { ...n, scale: { ...n.scale, [axis]: value } } : n
        ),
        version: state.version + 1,
      };
    }),

  setNodeDimension: (id, axis, value) =>
    set((state) => {
      invalidateMold();
      return {
        nodes: state.nodes.map((n) =>
          n.id === id ? { ...n, dimensions: { ...n.dimensions, [axis]: value } } : n
        ),
        version: state.version + 1,
      };
    }),

  setNodeOperation: (id, op) =>
    set((state) => {
      invalidateMold();
      return {
        nodes: state.nodes.map((n) => (n.id === id ? { ...n, operation: op } : n)),
        version: state.version + 1,
      };
    }),

  moveNodeUp: (id) =>
    set((state) => {
      const idx = state.nodes.findIndex((n) => n.id === id);
      if (idx <= 0) return state;
      const nodes = [...state.nodes];
      [nodes[idx - 1], nodes[idx]] = [nodes[idx], nodes[idx - 1]];
      invalidateMold();
      return { nodes, version: state.version + 1 };
    }),

  moveNodeDown: (id) =>
    set((state) => {
      const idx = state.nodes.findIndex((n) => n.id === id);
      if (idx < 0 || idx >= state.nodes.length - 1) return state;
      const nodes = [...state.nodes];
      [nodes[idx], nodes[idx + 1]] = [nodes[idx + 1], nodes[idx]];
      invalidateMold();
      return { nodes, version: state.version + 1 };
    }),

  clearScene: () => {
    invalidateMold();
    return set({ nodes: [], selectedNodeId: null, version: 0 });
  },
}));
