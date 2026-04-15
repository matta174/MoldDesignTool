import { useDesignStore, type DesignMode } from '../../state/designStore';
import { TemplateMode } from './TemplateMode';
import { GeometricMode } from './GeometricMode';
import { SculptMode } from './SculptMode';
import './LeftPanel.css';

const MODES: { key: DesignMode; label: string }[] = [
  { key: 'template', label: 'Template' },
  { key: 'geometric', label: 'Geometric' },
  { key: 'sculpt', label: 'Sculpt' },
];

export function LeftPanel() {
  const mode = useDesignStore((s) => s.mode);
  const setMode = useDesignStore((s) => s.setMode);

  return (
    <div className="left-panel">
      <div className="mode-tabs">
        {MODES.map((m) => (
          <button
            key={m.key}
            className={`mode-tab ${mode === m.key ? 'active' : ''}`}
            onClick={() => setMode(m.key)}
          >
            {m.label}
          </button>
        ))}
      </div>

      <div className="panel-scroll">
        {mode === 'template' && <TemplateMode />}
        {mode === 'geometric' && <GeometricMode />}
        {mode === 'sculpt' && <SculptMode />}
      </div>
    </div>
  );
}
