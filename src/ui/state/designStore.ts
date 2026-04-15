import { create } from 'zustand';
import { getTemplateDefaults } from '../../designs/templates/registry';
import { useMoldStore } from './moldStore';

export type DesignMode = 'template' | 'geometric' | 'sculpt' | 'import';
export type TemplateType = 'planter' | 'vase' | 'coaster' | 'tile';
export type SurfacePattern = 'none' | 'ribs' | 'facets' | 'flute';

/** Dynamic params — each template defines its own keys */
export type TemplateParams = Record<string, number | boolean | string>;

export interface DesignState {
  mode: DesignMode;
  selectedTemplate: TemplateType;
  params: TemplateParams;

  setMode: (mode: DesignMode) => void;
  setTemplate: (template: TemplateType) => void;
  setParam: (key: string, value: number | boolean | string) => void;
  setParams: (params: Partial<TemplateParams>) => void;
}

/** Reset mold whenever model changes */
function invalidateMold() {
  const { moldGenerated, resetMold } = useMoldStore.getState();
  if (moldGenerated) resetMold();
}

export const useDesignStore = create<DesignState>((set) => ({
  mode: 'import',
  selectedTemplate: 'planter',
  params: getTemplateDefaults('planter'),

  setMode: (mode) => set({ mode }),
  setTemplate: (template) => {
    set({
      selectedTemplate: template,
      params: getTemplateDefaults(template),
    });
    invalidateMold();
  },
  setParam: (key, value) => {
    set((state) => ({
      params: { ...state.params, [key]: value },
    }));
    invalidateMold();
  },
  setParams: (newParams) => {
    set((state) => {
      const merged: TemplateParams = { ...state.params };
      for (const [k, v] of Object.entries(newParams)) {
        if (v !== undefined) merged[k] = v;
      }
      return { params: merged };
    });
    invalidateMold();
  },
}));
