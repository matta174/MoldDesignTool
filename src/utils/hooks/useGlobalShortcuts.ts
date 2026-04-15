import { useEffect } from 'react';
import { useDesignStore } from '../../ui/state/designStore';
import { useViewportStore } from '../../ui/state/viewportStore';
import { useSculptStore } from '../../ui/state/sculptStore';
import { useExportStore } from '../../ui/state/exportStore';

/**
 * Registers global keyboard shortcuts.
 * Should be called once in the root layout component.
 */
export function useGlobalShortcuts(
  onToggleShortcuts: () => void
): void {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Ignore when typing in an input
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'SELECT' || target.tagName === 'TEXTAREA') {
        return;
      }

      // Mode switching
      if (e.key === '1' && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        useDesignStore.getState().setMode('template');
        return;
      }
      if (e.key === '2' && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        useDesignStore.getState().setMode('geometric');
        return;
      }
      if (e.key === '3' && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        useDesignStore.getState().setMode('sculpt');
        return;
      }

      // Viewport toggles
      if (e.key === 'g' || e.key === 'G') {
        e.preventDefault();
        useViewportStore.getState().toggleGrid();
        return;
      }
      if (e.key === 'h' || e.key === 'H') {
        e.preventDefault();
        useViewportStore.getState().toggleDraftHeatmap();
        return;
      }

      // Sculpt shortcuts
      const mode = useDesignStore.getState().mode;
      if (mode === 'sculpt') {
        if (e.key === 'x' || e.key === 'X') {
          e.preventDefault();
          const store = useSculptStore.getState();
          store.setSymmetryX(!store.symmetryX);
          return;
        }
        if (e.key === 'i' && !e.ctrlKey && !e.metaKey) {
          e.preventDefault();
          const store = useSculptStore.getState();
          store.setBrushInvert(!store.brushInvert);
          return;
        }
        if (e.key === '[') {
          e.preventDefault();
          const store = useSculptStore.getState();
          store.setBrushRadius(Math.max(3, store.brushRadius - 3));
          return;
        }
        if (e.key === ']') {
          e.preventDefault();
          const store = useSculptStore.getState();
          store.setBrushRadius(Math.min(60, store.brushRadius + 3));
          return;
        }
      }

      // Export
      if ((e.ctrlKey || e.metaKey) && e.key === 'e') {
        e.preventDefault();
        useExportStore.getState().openDialog();
        return;
      }

      // Shortcuts overlay
      if (e.key === '?') {
        e.preventDefault();
        onToggleShortcuts();
        return;
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onToggleShortcuts]);
}
