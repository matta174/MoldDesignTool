import { Undo2, Redo2 } from 'lucide-react';
import { useExportStore } from '../../state/exportStore';
import './TopToolbar.css';

export function TopToolbar() {
  const openDialog = useExportStore((s) => s.openDialog);

  return (
    <div className="toolbar">
      <div className="toolbar-logo">
        <div className="toolbar-logo-block" />
        CONCRETE
      </div>

      <button className="toolbar-btn">File</button>
      <button className="toolbar-btn">View</button>
      <button className="toolbar-btn">Help</button>

      <div className="toolbar-spacer" />

      <button className="toolbar-icon-btn" title="Undo" aria-label="Undo">
        <Undo2 size={16} />
      </button>
      <button className="toolbar-icon-btn" title="Redo" aria-label="Redo">
        <Redo2 size={16} />
      </button>

      <div className="toolbar-divider" />

      <button className="btn-primary" onClick={openDialog}>EXPORT STL</button>
    </div>
  );
}
