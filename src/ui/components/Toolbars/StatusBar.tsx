import { useViewportStore } from '../../state/viewportStore';
import { useDesignStore } from '../../state/designStore';
import { useMoldStore } from '../../state/moldStore';
import { useSculptStore } from '../../state/sculptStore';
import './StatusBar.css';

const MODE_LABELS = {
  template: 'TEMPLATE',
  geometric: 'GEOMETRIC',
  sculpt: 'SCULPT',
} as const;

export function StatusBar() {
  const stats = useViewportStore((s) => s.meshStats);
  const showGrid = useViewportStore((s) => s.showGrid);
  const showDraftHeatmap = useViewportStore((s) => s.showDraftHeatmap);
  const toggleGrid = useViewportStore((s) => s.toggleGrid);
  const toggleDraftHeatmap = useViewportStore((s) => s.toggleDraftHeatmap);

  const designMode = useDesignStore((s) => s.mode);
  const moldGenerated = useMoldStore((s) => s.moldGenerated);
  const moldType = useMoldStore((s) => s.settings.moldType);
  const viewMode = useMoldStore((s) => s.viewMode);
  const isGenerating = useMoldStore((s) => s.isGenerating);
  const isSculpting = useSculptStore((s) => s.isSculpting);
  const sculptBrush = useSculptStore((s) => s.brush);

  return (
    <div className="status-bar">
      {/* Mode indicator */}
      <span className="status-mode">{MODE_LABELS[designMode]}</span>

      {/* Sculpt active brush */}
      {designMode === 'sculpt' && (
        <span className="status-item status-accent">
          {isSculpting ? 'SCULPTING...' : sculptBrush.toUpperCase()}
        </span>
      )}

      <span className="status-divider" />

      {/* Mesh stats */}
      <span className="status-item">
        VERTS: <strong>{stats.vertices.toLocaleString()}</strong>
      </span>
      <span className="status-item">
        FACES: <strong>{stats.faces.toLocaleString()}</strong>
      </span>
      <span className="status-item">
        VOL: <strong>{stats.volume} cm³</strong>
      </span>
      <span className="status-item">
        WT: <strong>~{stats.weight} kg</strong>
      </span>

      <div className="status-spacer" />

      {/* Mold status */}
      {isGenerating && (
        <span className="status-item status-generating">GENERATING...</span>
      )}
      {moldGenerated && !isGenerating && (
        <span className="status-item status-mold-ready">
          MOLD: {moldType.toUpperCase()} ({viewMode.toUpperCase()})
        </span>
      )}

      <span className="status-divider" />

      {/* Interactive toggles */}
      <span
        className={`status-toggle ${showDraftHeatmap ? 'active' : ''}`}
        onClick={toggleDraftHeatmap}
        title="Toggle draft heatmap (H)"
      >
        HEATMAP
      </span>
      <span
        className={`status-toggle ${showGrid ? 'active' : ''}`}
        onClick={toggleGrid}
        title="Toggle grid (G)"
      >
        GRID
      </span>
      <span className="status-item">UNITS: MM</span>
    </div>
  );
}
