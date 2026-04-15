import type { TemplateType, SurfacePattern } from '../../ui/state/designStore';

/** Defines a single slider parameter exposed in the UI */
export interface ParamDef {
  key: string;
  label: string;
  min: number;
  max: number;
  step: number;
  suffix: string;
  defaultValue: number;
}

/** Defines a toggle parameter */
export interface ToggleDef {
  key: string;
  label: string;
  defaultValue: boolean;
}

/** Full template definition */
export interface TemplateDefinition {
  type: TemplateType;
  icon: string;
  label: string;
  description: string;
  sliders: ParamDef[];
  toggles: ToggleDef[];
  patterns: SurfacePattern[];
  defaultPattern: SurfacePattern;
}
