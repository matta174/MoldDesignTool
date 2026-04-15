import { create } from 'zustand';
import type { STLFormat, STLUnit } from '../../export/stl/STLExporter';
import type { ValidationResult } from '../../export/stl/STLValidator';

export interface ExportState {
  dialogOpen: boolean;
  format: STLFormat;
  unit: STLUnit;
  validation: ValidationResult | null;
  exporting: boolean;

  openDialog: () => void;
  closeDialog: () => void;
  setFormat: (format: STLFormat) => void;
  setUnit: (unit: STLUnit) => void;
  setValidation: (v: ValidationResult | null) => void;
  setExporting: (e: boolean) => void;
}

export const useExportStore = create<ExportState>((set) => ({
  dialogOpen: false,
  format: 'binary',
  unit: 'mm',
  validation: null,
  exporting: false,

  openDialog: () => set({ dialogOpen: true }),
  closeDialog: () => set({ dialogOpen: false, validation: null }),
  setFormat: (format) => set({ format }),
  setUnit: (unit) => set({ unit }),
  setValidation: (validation) => set({ validation }),
  setExporting: (exporting) => set({ exporting }),
}));
