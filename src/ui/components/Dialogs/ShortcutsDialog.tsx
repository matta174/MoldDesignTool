import { useEffect } from 'react';
import './ShortcutsDialog.css';

interface ShortcutsDialogProps {
  open: boolean;
  onClose: () => void;
}

const SHORTCUTS = [
  { category: 'Viewport', items: [
    { keys: 'LMB + Drag', action: 'Orbit camera' },
    { keys: 'MMB + Drag', action: 'Pan camera' },
    { keys: 'Scroll', action: 'Zoom' },
    { keys: 'G', action: 'Toggle grid' },
    { keys: 'H', action: 'Toggle draft heatmap' },
  ]},
  { category: 'Design', items: [
    { keys: '1', action: 'Template mode' },
    { keys: '2', action: 'Geometric mode' },
    { keys: '3', action: 'Sculpt mode' },
  ]},
  { category: 'Sculpt', items: [
    { keys: 'LMB + Drag', action: 'Sculpt stroke' },
    { keys: 'Alt + Drag', action: 'Orbit (while sculpting)' },
    { keys: '[  /  ]', action: 'Brush radius ±' },
    { keys: 'X', action: 'Toggle symmetry' },
    { keys: 'I', action: 'Invert brush' },
  ]},
  { category: 'General', items: [
    { keys: 'Ctrl + Z', action: 'Undo' },
    { keys: 'Ctrl + Shift + Z', action: 'Redo' },
    { keys: 'Ctrl + E', action: 'Export dialog' },
    { keys: '?', action: 'Toggle shortcuts' },
    { keys: 'Esc', action: 'Close dialog' },
  ]},
];

export function ShortcutsDialog({ open, onClose }: ShortcutsDialogProps) {
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="shortcuts-overlay" onClick={onClose}>
      <div className="shortcuts-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="shortcuts-header">
          <span>Keyboard Shortcuts</span>
          <button className="shortcuts-close" onClick={onClose}>×</button>
        </div>
        <div className="shortcuts-body">
          {SHORTCUTS.map((section) => (
            <div key={section.category} className="shortcuts-section">
              <div className="shortcuts-category">{section.category}</div>
              {section.items.map((item) => (
                <div key={item.action} className="shortcut-row">
                  <span className="shortcut-keys">{item.keys}</span>
                  <span className="shortcut-action">{item.action}</span>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
