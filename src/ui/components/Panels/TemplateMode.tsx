import { useDesignStore, type TemplateType, type SurfacePattern } from '../../state/designStore';
import { TEMPLATE_REGISTRY } from '../../../designs/templates/registry';

const TEMPLATE_LIST: { key: TemplateType; icon: string; label: string }[] = [
  { key: 'planter', icon: '⬡', label: 'Planter' },
  { key: 'vase', icon: '⏣', label: 'Vase' },
  { key: 'coaster', icon: '⬢', label: 'Coaster' },
  { key: 'tile', icon: '▦', label: 'Tile' },
];

export function TemplateMode() {
  const selectedTemplate = useDesignStore((s) => s.selectedTemplate);
  const setTemplate = useDesignStore((s) => s.setTemplate);
  const params = useDesignStore((s) => s.params);
  const setParam = useDesignStore((s) => s.setParam);

  const templateDef = TEMPLATE_REGISTRY[selectedTemplate];

  return (
    <>
      {/* Template picker */}
      <div className="panel-section">
        <div className="section-header">Template</div>
        <div className="template-grid">
          {TEMPLATE_LIST.map((t) => (
            <div
              key={t.key}
              className={`template-card ${selectedTemplate === t.key ? 'active' : ''}`}
              onClick={() => setTemplate(t.key)}
            >
              <span className="template-card-icon">{t.icon}</span>
              <span className="template-card-name">{t.label}</span>
            </div>
          ))}
        </div>
        {templateDef && (
          <div className="template-description">{templateDef.description}</div>
        )}
      </div>

      {/* Dynamic slider parameters */}
      <div className="panel-section">
        <div className="section-header">Parameters</div>
        {templateDef.sliders.map((s) => {
          const value = (params[s.key] as number) ?? s.defaultValue;
          return (
            <div className="param-row" key={s.key}>
              <div className="param-label-row">
                <span className="param-label">{s.label}</span>
                <span className="param-value">
                  {value}{s.suffix}
                </span>
              </div>
              <input
                type="range"
                min={s.min}
                max={s.max}
                step={s.step}
                value={value}
                onChange={(e) => setParam(s.key, Number(e.target.value))}
              />
            </div>
          );
        })}

        {/* Dynamic toggles */}
        {templateDef.toggles.map((t) => {
          const value = params[t.key] !== undefined ? params[t.key] as boolean : t.defaultValue;
          return (
            <div className="param-row" key={t.key}>
              <div className="param-label-row">
                <span className="param-label">{t.label}</span>
                <div
                  className={`toggle ${value ? 'on' : ''}`}
                  onClick={() => setParam(t.key, !value)}
                  role="switch"
                  aria-checked={value}
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      setParam(t.key, !value);
                    }
                  }}
                >
                  <div className="toggle-knob" />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Surface pattern — only show patterns available for this template */}
      {templateDef.patterns.length > 0 && (
        <div className="panel-section">
          <div className="section-header">Surface Pattern</div>
          <div className="pattern-grid">
            {templateDef.patterns.map((p: SurfacePattern) => (
              <div
                key={p}
                className={`pattern-card ${params.surfacePattern === p ? 'active' : ''}`}
                onClick={() => setParam('surfacePattern', p)}
              >
                {p.charAt(0).toUpperCase() + p.slice(1)}
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
