import type { TemplateDefinition } from './types';
import type { TemplateType } from '../../ui/state/designStore';

const planterTemplate: TemplateDefinition = {
  type: 'planter',
  icon: '⬡',
  label: 'Planter',
  description: 'Cylindrical planter pot with tapered walls and optional drainage',
  sliders: [
    { key: 'height', label: 'Height', min: 40, max: 300, step: 1, suffix: ' mm', defaultValue: 120 },
    { key: 'outerDiameter', label: 'Outer Diameter', min: 30, max: 250, step: 1, suffix: ' mm', defaultValue: 100 },
    { key: 'wallThickness', label: 'Wall Thickness', min: 3, max: 25, step: 1, suffix: ' mm', defaultValue: 8 },
    { key: 'draftAngle', label: 'Draft Angle', min: 0, max: 15, step: 0.5, suffix: '°', defaultValue: 3 },
    { key: 'bottomThickness', label: 'Bottom Thickness', min: 3, max: 30, step: 1, suffix: ' mm', defaultValue: 10 },
    { key: 'lipRadius', label: 'Lip Radius', min: 0, max: 15, step: 0.5, suffix: ' mm', defaultValue: 3 },
    { key: 'lipHeight', label: 'Lip Height', min: 0, max: 20, step: 1, suffix: ' mm', defaultValue: 5 },
    { key: 'drainHoleDiameter', label: 'Drain Hole ∅', min: 0, max: 20, step: 1, suffix: ' mm', defaultValue: 10 },
    { key: 'segments', label: 'Segments', min: 8, max: 128, step: 4, suffix: '', defaultValue: 64 },
  ],
  toggles: [
    { key: 'drainageHole', label: 'Drainage Hole', defaultValue: true },
  ],
  patterns: ['none', 'ribs', 'facets', 'flute'],
  defaultPattern: 'none',
};

const vaseTemplate: TemplateDefinition = {
  type: 'vase',
  icon: '⏣',
  label: 'Vase',
  description: 'Curved vase with spline-controlled profile',
  sliders: [
    { key: 'height', label: 'Height', min: 60, max: 400, step: 1, suffix: ' mm', defaultValue: 180 },
    { key: 'baseRadius', label: 'Base Radius', min: 15, max: 80, step: 1, suffix: ' mm', defaultValue: 35 },
    { key: 'bellyRadius', label: 'Belly Radius', min: 20, max: 120, step: 1, suffix: ' mm', defaultValue: 55 },
    { key: 'bellyHeight', label: 'Belly Position', min: 10, max: 90, step: 1, suffix: '%', defaultValue: 40 },
    { key: 'neckRadius', label: 'Neck Radius', min: 10, max: 80, step: 1, suffix: ' mm', defaultValue: 25 },
    { key: 'neckHeight', label: 'Neck Position', min: 50, max: 95, step: 1, suffix: '%', defaultValue: 75 },
    { key: 'mouthRadius', label: 'Mouth Radius', min: 15, max: 100, step: 1, suffix: ' mm', defaultValue: 35 },
    { key: 'wallThickness', label: 'Wall Thickness', min: 3, max: 20, step: 1, suffix: ' mm', defaultValue: 6 },
    { key: 'bottomThickness', label: 'Bottom Thickness', min: 3, max: 25, step: 1, suffix: ' mm', defaultValue: 8 },
    { key: 'segments', label: 'Segments', min: 8, max: 128, step: 4, suffix: '', defaultValue: 64 },
  ],
  toggles: [],
  patterns: ['none', 'ribs', 'facets', 'flute'],
  defaultPattern: 'none',
};

const coasterTemplate: TemplateDefinition = {
  type: 'coaster',
  icon: '⬢',
  label: 'Coaster',
  description: 'Flat coaster with edge profile and surface patterns',
  sliders: [
    { key: 'outerDiameter', label: 'Diameter', min: 60, max: 150, step: 1, suffix: ' mm', defaultValue: 100 },
    { key: 'thickness', label: 'Thickness', min: 4, max: 20, step: 1, suffix: ' mm', defaultValue: 8 },
    { key: 'chamfer', label: 'Edge Chamfer', min: 0, max: 8, step: 0.5, suffix: ' mm', defaultValue: 2 },
    { key: 'grooveDepth', label: 'Groove Depth', min: 0, max: 5, step: 0.5, suffix: ' mm', defaultValue: 1.5 },
    { key: 'grooveWidth', label: 'Groove Width', min: 1, max: 10, step: 0.5, suffix: ' mm', defaultValue: 3 },
    { key: 'grooveInset', label: 'Groove Inset', min: 3, max: 20, step: 1, suffix: ' mm', defaultValue: 8 },
    { key: 'sides', label: 'Sides (0=circle)', min: 0, max: 8, step: 1, suffix: '', defaultValue: 0 },
    { key: 'segments', label: 'Segments', min: 16, max: 128, step: 4, suffix: '', defaultValue: 64 },
  ],
  toggles: [
    { key: 'corkBase', label: 'Cork Recess', defaultValue: false },
  ],
  patterns: ['none', 'ribs', 'facets'],
  defaultPattern: 'none',
};

const tileTemplate: TemplateDefinition = {
  type: 'tile',
  icon: '▦',
  label: 'Tile',
  description: 'Rectangular relief tile with geometric surface patterns',
  sliders: [
    { key: 'width', label: 'Width', min: 50, max: 300, step: 1, suffix: ' mm', defaultValue: 150 },
    { key: 'tileHeight', label: 'Height', min: 50, max: 300, step: 1, suffix: ' mm', defaultValue: 150 },
    { key: 'thickness', label: 'Thickness', min: 5, max: 30, step: 1, suffix: ' mm', defaultValue: 12 },
    { key: 'reliefDepth', label: 'Relief Depth', min: 0, max: 10, step: 0.5, suffix: ' mm', defaultValue: 3 },
    { key: 'borderWidth', label: 'Border Width', min: 0, max: 20, step: 1, suffix: ' mm', defaultValue: 8 },
    { key: 'chamfer', label: 'Edge Chamfer', min: 0, max: 5, step: 0.5, suffix: ' mm', defaultValue: 1 },
    { key: 'patternScale', label: 'Pattern Scale', min: 5, max: 50, step: 1, suffix: ' mm', defaultValue: 20 },
    { key: 'patternRotation', label: 'Pattern Rotation', min: 0, max: 90, step: 5, suffix: '°', defaultValue: 0 },
  ],
  toggles: [
    { key: 'mountHole', label: 'Mount Hole', defaultValue: false },
  ],
  patterns: ['none', 'ribs', 'facets', 'flute'],
  defaultPattern: 'none',
};

export const TEMPLATE_REGISTRY: Record<TemplateType, TemplateDefinition> = {
  planter: planterTemplate,
  vase: vaseTemplate,
  coaster: coasterTemplate,
  tile: tileTemplate,
};

/** Get default param values for a template as a flat Record */
export function getTemplateDefaults(type: TemplateType): Record<string, number | boolean | string> {
  const def = TEMPLATE_REGISTRY[type];
  const result: Record<string, number | boolean | string> = {};
  for (const s of def.sliders) {
    result[s.key] = s.defaultValue;
  }
  for (const t of def.toggles) {
    result[t.key] = t.defaultValue;
  }
  result.surfacePattern = def.defaultPattern;
  return result;
}
