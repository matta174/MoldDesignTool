import { create } from 'zustand';
import * as THREE from 'three';

export type MoldType = '1part' | '2part';
export type MaterialPreset = 'portland' | 'white-cement' | 'gfrc' | 'epoxy' | 'jesmonite' | 'custom';
export type ViewMode = 'model' | 'mold' | 'both';
/** For 2-part molds: which half to display */
export type MoldHalfView = 'both-halves' | 'top' | 'bottom';

export interface MoldSettings {
  moldType: MoldType;
  wallMargin: number;
  bottomMargin: number;
  pourHoleDiameter: number;
  includeVents: boolean;
  includeRegistrationKeys: boolean;
  /** Parting plane position as fraction of model height (0.1–0.9) */
  partingRatio: number;
}

export interface ShrinkageSettings {
  material: MaterialPreset;
  customPercentage: number;
  scaleFactor: number;
}

export interface AnalysisResult {
  label: string;
  status: 'ok' | 'warn' | 'error';
  detail: string;
}

export interface MoldState {
  settings: MoldSettings;
  shrinkage: ShrinkageSettings;
  isGenerating: boolean;
  moldGenerated: boolean;
  /** 1-part mold geometry */
  moldGeometry: THREE.BufferGeometry | null;
  /** 2-part: top half geometry */
  topHalfGeometry: THREE.BufferGeometry | null;
  /** 2-part: bottom half geometry */
  bottomHalfGeometry: THREE.BufferGeometry | null;
  /** 2-part: which halves to show */
  moldHalfView: MoldHalfView;
  /** 2-part: Y coordinate of parting plane */
  partingY: number | null;
  viewMode: ViewMode;
  analysis: AnalysisResult[];

  setSetting: <K extends keyof MoldSettings>(key: K, value: MoldSettings[K]) => void;
  setMaterial: (material: MaterialPreset) => void;
  setGenerating: (generating: boolean) => void;
  setMoldGenerated: (generated: boolean) => void;
  setMoldGeometry: (geo: THREE.BufferGeometry | null) => void;
  setTwoPartGeometry: (top: THREE.BufferGeometry, bottom: THREE.BufferGeometry, partingY: number) => void;
  setMoldHalfView: (view: MoldHalfView) => void;
  setViewMode: (mode: ViewMode) => void;
  setAnalysis: (results: AnalysisResult[]) => void;
  resetMold: () => void;
}

const SHRINKAGE_MAP: Record<MaterialPreset, number> = {
  portland: 1.5,
  'white-cement': 1.2,
  gfrc: 0.8,
  epoxy: 0.5,
  jesmonite: 1.0,
  custom: 1.5,
};

export const useMoldStore = create<MoldState>((set) => ({
  settings: {
    moldType: '1part',
    wallMargin: 10,
    bottomMargin: 10,
    pourHoleDiameter: 25,
    includeVents: false,
    includeRegistrationKeys: true,
    partingRatio: 0.5,
  },
  shrinkage: {
    material: 'portland',
    customPercentage: 1.5,
    scaleFactor: 1.015,
  },
  isGenerating: false,
  moldGenerated: false,
  moldGeometry: null,
  topHalfGeometry: null,
  bottomHalfGeometry: null,
  moldHalfView: 'both-halves',
  partingY: null,
  viewMode: 'model',
  analysis: [],

  setSetting: (key, value) =>
    set((state) => ({
      settings: { ...state.settings, [key]: value },
      moldGenerated: false,
      moldGeometry: null,
      topHalfGeometry: null,
      bottomHalfGeometry: null,
      partingY: null,
      viewMode: 'model',
    })),
  setMaterial: (material) =>
    set(() => {
      const pct = SHRINKAGE_MAP[material];
      return {
        shrinkage: {
          material,
          customPercentage: pct,
          scaleFactor: 1 + pct / 100,
        },
        moldGenerated: false,
        moldGeometry: null,
        topHalfGeometry: null,
        bottomHalfGeometry: null,
      };
    }),
  setGenerating: (isGenerating) => set({ isGenerating }),
  setMoldGenerated: (moldGenerated) => set({ moldGenerated }),
  setMoldGeometry: (moldGeometry) => set({ moldGeometry }),
  setTwoPartGeometry: (topHalfGeometry, bottomHalfGeometry, partingY) =>
    set({ topHalfGeometry, bottomHalfGeometry, partingY }),
  setMoldHalfView: (moldHalfView) => set({ moldHalfView }),
  setViewMode: (viewMode) => set({ viewMode }),
  setAnalysis: (analysis) => set({ analysis }),
  resetMold: () => set({
    moldGenerated: false,
    moldGeometry: null,
    topHalfGeometry: null,
    bottomHalfGeometry: null,
    partingY: null,
    viewMode: 'model',
    analysis: [],
  }),
}));
