import { useEffect } from 'react';
import { useSculptStore, type BrushType, type BaseMeshType } from '../../state/sculptStore';

const BRUSHES: { type: BrushType; icon: string; name: string }[] = [
  { type: 'grab', icon: '✋', name: 'Grab' },
  { type: 'smooth', icon: '〰', name: 'Smooth' },
  { type: 'inflate', icon: '⊕', name: 'Inflate' },
  { type: 'flatten', icon: '▬', name: 'Flatten' },
  { type: 'crease', icon: '∨', name: 'Crease' },
  { type: 'pinch', icon: '⊖', name: 'Pinch' },
];

const BASE_MESHES: { type: BaseMeshType; icon: string; name: string }[] = [
  { type: 'sphere', icon: '○', name: 'Sphere' },
  { type: 'cube', icon: '□', name: 'Cube' },
  { type: 'cylinder', icon: '△', name: 'Cylinder' },
];

const RESOLUTIONS = [
  { value: 16, label: 'Low (~1.5k)' },
  { value: 32, label: 'Medium (~6k)' },
  { value: 48, label: 'High (~14k)' },
  { value: 64, label: 'Ultra (~24k)' },
];

export function SculptMode() {
  const geometry = useSculptStore((s) => s.geometry);
  const baseMesh = useSculptStore((s) => s.baseMesh);
  const resolution = useSculptStore((s) => s.resolution);
  const brush = useSculptStore((s) => s.brush);
  const brushRadius = useSculptStore((s) => s.brushRadius);
  const brushStrength = useSculptStore((s) => s.brushStrength);
  const brushInvert = useSculptStore((s) => s.brushInvert);
  const symmetryX = useSculptStore((s) => s.symmetryX);
  const undoStack = useSculptStore((s) => s.undoStack);
  const redoStack = useSculptStore((s) => s.redoStack);

  const initMesh = useSculptStore((s) => s.initMesh);
  const setBrush = useSculptStore((s) => s.setBrush);
  const setBrushRadius = useSculptStore((s) => s.setBrushRadius);
  const setBrushStrength = useSculptStore((s) => s.setBrushStrength);
  const setBrushInvert = useSculptStore((s) => s.setBrushInvert);
  const setSymmetryX = useSculptStore((s) => s.setSymmetryX);
  const undo = useSculptStore((s) => s.undo);
  const redo = useSculptStore((s) => s.redo);
  const resetSculpt = useSculptStore((s) => s.resetSculpt);

  // Auto-init mesh if none exists
  useEffect(() => {
    if (!geometry) {
      initMesh('sphere', 32);
    }
  }, [geometry, initMesh]);

  // Keyboard shortcuts for undo/redo
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          redo();
        } else {
          undo();
        }
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [undo, redo]);

  return (
    <>
      {/* Base Mesh */}
      <div className="panel-section">
        <div className="section-header">Base Mesh</div>
        <div className="primitives-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
          {BASE_MESHES.map((m) => (
            <div
              key={m.type}
              className={`primitive-card ${baseMesh === m.type && geometry ? 'active' : ''}`}
              onClick={() => initMesh(m.type, resolution)}
              style={baseMesh === m.type && geometry ? { borderColor: 'var(--form-500)' } : undefined}
            >
              <span className="primitive-card-shape">{m.icon}</span>
              <span className="primitive-card-name">{m.name}</span>
            </div>
          ))}
        </div>
        <div className="mold-param" style={{ marginTop: 'var(--sp-2)' }}>
          <span className="param-label">Resolution</span>
          <select
            className="select-field"
            value={resolution}
            onChange={(e) => initMesh(baseMesh, Number(e.target.value))}
            style={{ width: '120px' }}
          >
            {RESOLUTIONS.map((r) => (
              <option key={r.value} value={r.value}>{r.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Brush Tools */}
      <div className="panel-section">
        <div className="section-header">Brush Tools</div>
        <div className="primitives-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
          {BRUSHES.map((b) => (
            <div
              key={b.type}
              className={`primitive-card ${brush === b.type ? 'active' : ''}`}
              onClick={() => setBrush(b.type)}
              style={brush === b.type ? { borderColor: 'var(--form-500)' } : undefined}
            >
              <span className="primitive-card-shape">{b.icon}</span>
              <span className="primitive-card-name">{b.name}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Brush Settings */}
      <div className="panel-section">
        <div className="section-header">Brush Settings</div>
        <div className="param-row">
          <div className="param-label-row">
            <span className="param-label">Radius</span>
            <span className="param-value">{brushRadius} mm</span>
          </div>
          <input
            type="range"
            className="slider-field"
            min={3}
            max={60}
            value={brushRadius}
            onChange={(e) => setBrushRadius(Number(e.target.value))}
          />
        </div>
        <div className="param-row">
          <div className="param-label-row">
            <span className="param-label">Strength</span>
            <span className="param-value">{(brushStrength * 100).toFixed(0)}%</span>
          </div>
          <input
            type="range"
            className="slider-field"
            min={5}
            max={100}
            value={Math.round(brushStrength * 100)}
            onChange={(e) => setBrushStrength(Number(e.target.value) / 100)}
          />
        </div>

        <div className="mold-param">
          <span className="param-label">Invert (Pull)</span>
          <div
            className={`toggle ${brushInvert ? 'on' : ''}`}
            onClick={() => setBrushInvert(!brushInvert)}
            role="switch"
            aria-checked={brushInvert}
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                setBrushInvert(!brushInvert);
              }
            }}
          >
            <div className="toggle-knob" />
          </div>
        </div>

        <div className="mold-param">
          <span className="param-label">Symmetry X</span>
          <div
            className={`toggle ${symmetryX ? 'on' : ''}`}
            onClick={() => setSymmetryX(!symmetryX)}
            role="switch"
            aria-checked={symmetryX}
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                setSymmetryX(!symmetryX);
              }
            }}
          >
            <div className="toggle-knob" />
          </div>
        </div>
      </div>

      {/* History */}
      <div className="panel-section">
        <div className="section-header">History</div>
        <div className="node-actions">
          <button
            className="btn-secondary btn-small"
            onClick={undo}
            disabled={undoStack.length === 0}
            title="Undo (Ctrl+Z)"
          >
            Undo ({undoStack.length})
          </button>
          <button
            className="btn-secondary btn-small"
            onClick={redo}
            disabled={redoStack.length === 0}
            title="Redo (Ctrl+Shift+Z)"
          >
            Redo ({redoStack.length})
          </button>
          <button
            className="btn-secondary btn-small btn-danger"
            onClick={resetSculpt}
            title="Reset to base mesh"
          >
            Reset
          </button>
        </div>
      </div>

      {/* Sculpt tips */}
      <div className="panel-section">
        <div className="sculpt-tips">
          <div className="sculpt-tip">Click + drag on mesh to sculpt</div>
          <div className="sculpt-tip">Alt + drag to orbit camera</div>
          <div className="sculpt-tip">Ctrl+Z / Ctrl+Shift+Z for undo/redo</div>
        </div>
      </div>
    </>
  );
}
