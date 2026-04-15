import { create } from 'zustand';

export interface MeshStats {
  vertices: number;
  faces: number;
  volume: number;
  weight: number;
}

export interface ViewportState {
  showGrid: boolean;
  showDimensions: boolean;
  showDraftHeatmap: boolean;
  meshStats: MeshStats;

  toggleGrid: () => void;
  toggleDimensions: () => void;
  toggleDraftHeatmap: () => void;
  setMeshStats: (stats: MeshStats) => void;
}

export const useViewportStore = create<ViewportState>((set) => ({
  showGrid: true,
  showDimensions: true,
  showDraftHeatmap: false,
  meshStats: {
    vertices: 4096,
    faces: 8192,
    volume: 523.4,
    weight: 1.2,
  },

  toggleGrid: () => set((s) => ({ showGrid: !s.showGrid })),
  toggleDimensions: () => set((s) => ({ showDimensions: !s.showDimensions })),
  toggleDraftHeatmap: () => set((s) => ({ showDraftHeatmap: !s.showDraftHeatmap })),
  setMeshStats: (meshStats) => set({ meshStats }),
}));
