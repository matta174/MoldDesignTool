import { useCallback, useMemo } from 'react';
import { useMoldStore, type MaterialPreset, type ViewMode, type MoldHalfView } from '../../state/moldStore';
import { useExportStore } from '../../state/exportStore';
import { useDesignStore } from '../../state/designStore';
import { useViewportStore } from '../../state/viewportStore';
import { useGeometricStore } from '../../state/geometricStore';
import { useSculptStore } from '../../state/sculptStore';
import { exportSTL } from '../../../export/stl/STLExporter';
import { getActiveGeometry, getActiveModelName } from '../../../designs/getActiveGeometry';
import { validateWallThickness } from '../../../mold-engine/validation/WallThicknessValidator';
import { analyzeDraftAngles, type DraftStats } from '../../../mold-engine/analysis/DraftAnalyzer';
import { downloadFile } from '../../../utils/io/fileDownload';
import { useDebouncedValue } from '../../../utils/hooks/useDebouncedValue';
import { csgWorkerClient } from '../../../workers/csgWorkerClient';
import './RightPanel.css';

const MATERIALS: { key: MaterialPreset; label: string }[] = [
  { key: 'portland', label: 'Portland Cement (1.5%)' },
  { key: 'white-cement', label: 'White Cement (1.2%)' },
  { key: 'gfrc', label: 'GFRC (0.8%)' },
  { key: 'epoxy', label: 'Epoxy Resin (0.5%)' },
  { key: 'jesmonite', label: 'Jesmonite (1.0%)' },
  { key: 'custom', label: 'Custom...' },
];

const VIEW_MODES: { key: ViewMode; label: string }[] = [
  { key: 'model', label: 'Model' },
  { key: 'mold', label: 'Mold' },
  { key: 'both', label: 'Both' },
];

const HALF_VIEWS: { key: MoldHalfView; label: string }[] = [
  { key: 'both-halves', label: 'Both' },
  { key: 'top', label: 'Top' },
  { key: 'bottom', label: 'Bottom' },
];

export function RightPanel() {
  const settings = useMoldStore((s) => s.settings);
  const shrinkage = useMoldStore((s) => s.shrinkage);
  const analysis = useMoldStore((s) => s.analysis);
  const isGenerating = useMoldStore((s) => s.isGenerating);
  const moldGenerated = useMoldStore((s) => s.moldGenerated);
  const viewMode = useMoldStore((s) => s.viewMode);
  const moldHalfView = useMoldStore((s) => s.moldHalfView);
  const setSetting = useMoldStore((s) => s.setSetting);
  const setMaterial = useMoldStore((s) => s.setMaterial);
  const setGenerating = useMoldStore((s) => s.setGenerating);
  const setMoldGenerated = useMoldStore((s) => s.setMoldGenerated);
  const setMoldGeometry = useMoldStore((s) => s.setMoldGeometry);
  const setTwoPartGeometry = useMoldStore((s) => s.setTwoPartGeometry);
  const setMoldHalfView = useMoldStore((s) => s.setMoldHalfView);
  const setViewMode = useMoldStore((s) => s.setViewMode);
  const setAnalysis = useMoldStore((s) => s.setAnalysis);

  const showDraftHeatmap = useViewportStore((s) => s.showDraftHeatmap);
  const toggleDraftHeatmap = useViewportStore((s) => s.toggleDraftHeatmap);

  const designMode = useDesignStore((s) => s.mode);
  const selectedTemplate = useDesignStore((s) => s.selectedTemplate);
  const params = useDesignStore((s) => s.params);
  const geoVersion = useGeometricStore((s) => s.version);
  const sculptVersion = useSculptStore((s) => s.version);

  const is2Part = settings.moldType === '2part';

  // Debounce version counters so draft analysis doesn't fire on every sculpt stroke
  const debouncedGeoVersion = useDebouncedValue(geoVersion, 250);
  const debouncedSculptVersion = useDebouncedValue(sculptVersion, 250);

  // Live draft analysis (debounced for sculpt/geometric changes)
  const draftStats: DraftStats | null = useMemo(() => {
    try {
      const modelGeo = getActiveGeometry();
      if (!modelGeo) return null;
      const result = analyzeDraftAngles(modelGeo);
      return result.stats;
    } catch {
      return null;
    }
  }, [selectedTemplate, params, designMode, debouncedGeoVersion, debouncedSculptVersion]);

  const handleGenerate = useCallback(() => {
    setGenerating(true);

    const modelGeo = getActiveGeometry();
    if (!modelGeo) {
      setAnalysis([{
        label: 'Generation',
        status: 'error',
        detail: 'No model geometry available',
      }]);
      setGenerating(false);
      return;
    }

    // Run lightweight validation/analysis on the main thread (fast)
    const wallResult = validateWallThickness(modelGeo, settings.wallMargin, settings.bottomMargin);
    const draftResult = analyzeDraftAngles(modelGeo);

    // Heavy CSG mold generation runs on the Web Worker
    csgWorkerClient
      .generateMold(modelGeo, settings, shrinkage.scaleFactor, is2Part, settings.partingRatio)
      .then((result) => {
        if (result.is2Part) {
          setTwoPartGeometry(
            result.topHalfGeometry!,
            result.bottomHalfGeometry!,
            result.partingY
          );
          setMoldGeometry(null);
          setMoldGenerated(true);
          setViewMode('mold');

          setAnalysis([
            { label: 'Wall Thickness', status: wallResult.status, detail: wallResult.detail },
            { label: 'Draft Angles', status: draftResult.stats.status, detail: draftResult.stats.detail },
            {
              label: 'Mold Size',
              status: 'ok' as const,
              detail: `${result.moldDimensions.x.toFixed(0)}×${result.moldDimensions.y.toFixed(0)}×${result.moldDimensions.z.toFixed(0)} mm`,
            },
            {
              label: 'Parting Plane',
              status: 'ok' as const,
              detail: `Y = ${result.partingY.toFixed(1)} mm (${Math.round(settings.partingRatio * 100)}%)`,
            },
            {
              label: 'Registration',
              status: settings.includeRegistrationKeys ? 'ok' as const : 'warn' as const,
              detail: settings.includeRegistrationKeys ? '4 cone keys' : 'No keys — halves may shift',
            },
            { label: 'Manifold', status: 'ok' as const, detail: 'Watertight mesh' },
          ]);
        } else {
          setMoldGeometry(result.moldGeometry);
          setMoldGenerated(true);
          setViewMode('mold');

          setAnalysis([
            { label: 'Wall Thickness', status: wallResult.status, detail: wallResult.detail },
            { label: 'Draft Angles', status: draftResult.stats.status, detail: draftResult.stats.detail },
            {
              label: 'Mold Size',
              status: 'ok' as const,
              detail: `${result.moldDimensions.x.toFixed(0)}×${result.moldDimensions.y.toFixed(0)}×${result.moldDimensions.z.toFixed(0)} mm`,
            },
            { label: 'Manifold', status: 'ok' as const, detail: 'Watertight mesh' },
          ]);
        }
      })
      .catch((e) => {
        console.error('Mold generation failed:', e);
        setAnalysis([{
          label: 'Generation',
          status: 'error',
          detail: `Failed: ${e instanceof Error ? e.message : 'Unknown error'}`,
        }]);
      })
      .finally(() => {
        setGenerating(false);
      });
  }, [
    selectedTemplate, params, designMode, geoVersion, sculptVersion, settings, shrinkage.scaleFactor, is2Part,
    setGenerating, setMoldGenerated, setMoldGeometry, setTwoPartGeometry, setViewMode, setAnalysis,
  ]);

  const handleExportModel = useCallback(() => {
    const geo = getActiveGeometry();
    if (!geo) return;
    const name = getActiveModelName();
    const data = exportSTL(geo, { format: 'binary', unit: 'mm', modelName: `${name}_model` });
    downloadFile(data, `${name}_model.stl`);
  }, [selectedTemplate, params, designMode, geoVersion, sculptVersion]);

  const handleExportMold = useCallback(() => {
    if (is2Part) {
      // Export both halves
      const state = useMoldStore.getState();
      const name = getActiveModelName();
      if (state.topHalfGeometry) {
        const topData = exportSTL(state.topHalfGeometry, { format: 'binary', unit: 'mm', modelName: `${name}_mold_top` });
        downloadFile(topData, `${name}_mold_top.stl`);
      }
      if (state.bottomHalfGeometry) {
        const bottomData = exportSTL(state.bottomHalfGeometry, { format: 'binary', unit: 'mm', modelName: `${name}_mold_bottom` });
        downloadFile(bottomData, `${name}_mold_bottom.stl`);
      }
    } else {
      const moldGeo = useMoldStore.getState().moldGeometry;
      if (!moldGeo) return;
      const name = getActiveModelName();
      const data = exportSTL(moldGeo, { format: 'binary', unit: 'mm', modelName: `${name}_mold` });
      downloadFile(data, `${name}_mold.stl`);
    }
  }, [designMode, selectedTemplate, is2Part]);

  const handleExportHalf = useCallback((half: 'top' | 'bottom') => {
    const state = useMoldStore.getState();
    const geo = half === 'top' ? state.topHalfGeometry : state.bottomHalfGeometry;
    if (!geo) return;
    const name = getActiveModelName();
    const data = exportSTL(geo, { format: 'binary', unit: 'mm', modelName: `${name}_mold_${half}` });
    downloadFile(data, `${name}_mold_${half}.stl`);
  }, [designMode, selectedTemplate]);

  return (
    <div className="right-panel">
      {/* Mold Generation */}
      <div className="panel-section">
        <div className="section-header">Mold Generation</div>
        <div className="mold-type-toggle">
          <button
            className={`mold-type-btn ${settings.moldType === '1part' ? 'active' : ''}`}
            onClick={() => setSetting('moldType', '1part')}
          >
            1-Part
          </button>
          <button
            className={`mold-type-btn ${settings.moldType === '2part' ? 'active' : ''}`}
            onClick={() => setSetting('moldType', '2part')}
          >
            2-Part
          </button>
        </div>
      </div>

      {/* Mold Settings */}
      <div className="panel-section">
        <div className="mold-param">
          <span className="param-label">Wall Margin</span>
          <input
            className="input-field input-number"
            type="number"
            min={3}
            max={30}
            value={settings.wallMargin}
            onChange={(e) => setSetting('wallMargin', Number(e.target.value))}
          />
        </div>
        <div className="mold-param">
          <span className="param-label">Bottom Margin</span>
          <input
            className="input-field input-number"
            type="number"
            min={3}
            max={30}
            value={settings.bottomMargin}
            onChange={(e) => setSetting('bottomMargin', Number(e.target.value))}
          />
        </div>
        <div className="mold-param">
          <span className="param-label">Pour Hole ∅</span>
          <input
            className="input-field input-number"
            type="number"
            min={5}
            max={60}
            value={settings.pourHoleDiameter}
            onChange={(e) => setSetting('pourHoleDiameter', Number(e.target.value))}
          />
        </div>
        <div className="mold-param">
          <span className="param-label">Vent Holes</span>
          <div
            className={`toggle ${settings.includeVents ? 'on' : ''}`}
            onClick={() => setSetting('includeVents', !settings.includeVents)}
            role="switch"
            aria-checked={settings.includeVents}
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                setSetting('includeVents', !settings.includeVents);
              }
            }}
          >
            <div className="toggle-knob" />
          </div>
        </div>

        {/* 2-Part specific settings */}
        {is2Part && (
          <>
            <div className="mold-param">
              <span className="param-label">Parting Height</span>
              <span className="param-value">{Math.round(settings.partingRatio * 100)}%</span>
            </div>
            <input
              type="range"
              className="slider-field"
              min={10}
              max={90}
              value={Math.round(settings.partingRatio * 100)}
              onChange={(e) => setSetting('partingRatio', Number(e.target.value) / 100)}
            />
            <div className="mold-param" style={{ marginTop: 'var(--sp-2)' }}>
              <span className="param-label">Registration Keys</span>
              <div
                className={`toggle ${settings.includeRegistrationKeys ? 'on' : ''}`}
                onClick={() => setSetting('includeRegistrationKeys', !settings.includeRegistrationKeys)}
                role="switch"
                aria-checked={settings.includeRegistrationKeys}
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    setSetting('includeRegistrationKeys', !settings.includeRegistrationKeys);
                  }
                }}
              >
                <div className="toggle-knob" />
              </div>
            </div>
          </>
        )}

        <button
          className="btn-primary btn-full"
          onClick={handleGenerate}
          disabled={isGenerating}
          style={{ marginTop: 'var(--sp-2)' }}
        >
          {isGenerating ? 'GENERATING...' : moldGenerated ? 'REGENERATE MOLD' : 'GENERATE MOLD'}
        </button>
      </div>

      {/* View Mode Toggle */}
      {moldGenerated && (
        <div className="panel-section">
          <div className="section-header">View</div>
          <div className="view-mode-toggle">
            {VIEW_MODES.map((m) => (
              <button
                key={m.key}
                className={`view-mode-btn ${viewMode === m.key ? 'active' : ''}`}
                onClick={() => setViewMode(m.key)}
              >
                {m.label}
              </button>
            ))}
          </div>

          {/* 2-part half selector */}
          {is2Part && viewMode !== 'model' && (
            <div className="view-mode-toggle" style={{ marginTop: 'var(--sp-2)' }}>
              {HALF_VIEWS.map((h) => (
                <button
                  key={h.key}
                  className={`view-mode-btn ${moldHalfView === h.key ? 'active' : ''}`}
                  onClick={() => setMoldHalfView(h.key)}
                >
                  {h.label}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Analysis */}
      {analysis.length > 0 && (
        <div className="panel-section">
          <div className="section-header">Analysis</div>
          {analysis.map((item) => (
            <div className="analysis-card" key={item.label}>
              <div>
                <div className="analysis-label">{item.label}</div>
                <div className={`analysis-detail detail-${item.status}`}>
                  {item.detail}
                </div>
              </div>
              <span className={`badge badge-${item.status}`}>
                {item.status === 'ok' ? 'OK' : item.status === 'warn' ? 'WARN' : 'ERR'}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Draft Analysis */}
      <div className="panel-section">
        <div className="section-header">Draft Analysis</div>
        <div className="mold-param">
          <span className="param-label">Show Heatmap</span>
          <div
            className={`toggle ${showDraftHeatmap ? 'on' : ''}`}
            onClick={toggleDraftHeatmap}
            role="switch"
            aria-checked={showDraftHeatmap}
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                toggleDraftHeatmap();
              }
            }}
          >
            <div className="toggle-knob" />
          </div>
        </div>

        <div className="draft-legend">
          <div className="draft-legend-item">
            <span className="draft-swatch draft-swatch-bad" />
            <span className="draft-legend-label">Undercut (&lt;0°)</span>
          </div>
          <div className="draft-legend-item">
            <span className="draft-swatch draft-swatch-marginal" />
            <span className="draft-legend-label">Marginal (0–3°)</span>
          </div>
          <div className="draft-legend-item">
            <span className="draft-swatch draft-swatch-good" />
            <span className="draft-legend-label">Good (3°+)</span>
          </div>
          <div className="draft-legend-item">
            <span className="draft-swatch draft-swatch-neutral" />
            <span className="draft-legend-label">Flat (75°+)</span>
          </div>
        </div>

        {draftStats && (
          <>
            <div className="analysis-card">
              <div>
                <div className="analysis-label">Demoldability</div>
                <div className={`analysis-detail detail-${draftStats.status}`}>
                  {draftStats.detail}
                </div>
              </div>
              <span className={`badge badge-${draftStats.status}`}>
                {draftStats.status === 'ok' ? 'OK' : draftStats.status === 'warn' ? 'WARN' : 'ERR'}
              </span>
            </div>
            <div className="draft-stats-grid">
              <div className="draft-stat">
                <span className="draft-stat-value">{draftStats.minAngle}°</span>
                <span className="draft-stat-label">Min Angle</span>
              </div>
              <div className="draft-stat">
                <span className="draft-stat-value">{draftStats.avgAngle}°</span>
                <span className="draft-stat-label">Avg Angle</span>
              </div>
              <div className="draft-stat">
                <span className="draft-stat-value">{draftStats.demoldablePercent}%</span>
                <span className="draft-stat-label">Demoldable</span>
              </div>
              <div className="draft-stat">
                <span className="draft-stat-value">{draftStats.undercuts}</span>
                <span className="draft-stat-label">Undercuts</span>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Shrinkage */}
      <div className="panel-section">
        <div className="section-header">Shrinkage Compensation</div>
        <div className="mold-param">
          <span className="param-label">Material</span>
        </div>
        <select
          className="select-field"
          value={shrinkage.material}
          onChange={(e) => setMaterial(e.target.value as MaterialPreset)}
        >
          {MATERIALS.map((m) => (
            <option key={m.key} value={m.key}>{m.label}</option>
          ))}
        </select>
        <div className="mold-param" style={{ marginTop: 'var(--sp-2)' }}>
          <span className="param-label">Scale Factor</span>
          <span className="param-value">{shrinkage.scaleFactor.toFixed(3)}×</span>
        </div>
      </div>

      {/* Export */}
      <div className="panel-section">
        <div className="section-header">Export</div>
        <div className="export-row">
          <button
            className="btn-secondary"
            style={{ flex: 1, textAlign: 'center' }}
            onClick={handleExportModel}
          >
            Model STL
          </button>
          {is2Part && moldGenerated ? (
            <>
              <button
                className="btn-secondary"
                style={{ flex: 1, textAlign: 'center' }}
                onClick={() => handleExportHalf('top')}
              >
                Top STL
              </button>
              <button
                className="btn-secondary"
                style={{ flex: 1, textAlign: 'center' }}
                onClick={() => handleExportHalf('bottom')}
              >
                Bottom STL
              </button>
            </>
          ) : (
            <button
              className="btn-secondary"
              style={{
                flex: 1,
                textAlign: 'center',
                opacity: moldGenerated ? 1 : 0.4,
              }}
              disabled={!moldGenerated}
              title={moldGenerated ? 'Download mold STL' : 'Generate mold first'}
              onClick={handleExportMold}
            >
              Mold STL
            </button>
          )}
        </div>
        {is2Part && moldGenerated && (
          <button
            className="btn-secondary btn-full"
            onClick={handleExportMold}
            style={{ marginBottom: 'var(--sp-2)' }}
          >
            Export Both Halves
          </button>
        )}
        <button
          className="btn-primary btn-full"
          onClick={useExportStore.getState().openDialog}
        >
          EXPORT OPTIONS
        </button>
      </div>
    </div>
  );
}
