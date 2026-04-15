import { create } from 'zustand';
import * as THREE from 'three';
import { useMoldStore } from './moldStore';

export interface ImportState {
  /** The imported model geometry (centered, normalized) */
  geometry: THREE.BufferGeometry | null;
  /** Original filename */
  fileName: string | null;
  /** Whether an import is in progress */
  isLoading: boolean;
  /** Error message if import failed */
  error: string | null;

  setGeometry: (geo: THREE.BufferGeometry, fileName: string) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clear: () => void;
}

export const useImportStore = create<ImportState>((set) => ({
  geometry: null,
  fileName: null,
  isLoading: false,
  error: null,

  setGeometry: (geo, fileName) => {
    set({ geometry: geo, fileName, isLoading: false, error: null });
    // Invalidate any existing mold when a new model is imported
    const { moldGenerated, resetMold } = useMoldStore.getState();
    if (moldGenerated) resetMold();
  },

  setLoading: (isLoading) => set({ isLoading }),

  setError: (error) => set({ error, isLoading: false }),

  clear: () => {
    const state = useImportStore.getState();
    if (state.geometry) {
      state.geometry.dispose();
    }
    set({ geometry: null, fileName: null, isLoading: false, error: null });
    const { moldGenerated, resetMold } = useMoldStore.getState();
    if (moldGenerated) resetMold();
  },
}));
