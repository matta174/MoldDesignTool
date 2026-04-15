import { useCallback, useState } from 'react';
import { TopToolbar } from '../components/Toolbars/TopToolbar';
import { StatusBar } from '../components/Toolbars/StatusBar';
import { LeftPanel } from '../components/Panels/LeftPanel';
import { RightPanel } from '../components/Panels/RightPanel';
import { Viewport } from '../components/Viewport/Viewport';
import { ExportDialog } from '../components/Dialogs/ExportDialog';
import { ShortcutsDialog } from '../components/Dialogs/ShortcutsDialog';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { useGlobalShortcuts } from '../../utils/hooks/useGlobalShortcuts';
import './MainLayout.css';

export function MainLayout() {
  const [shortcutsOpen, setShortcutsOpen] = useState(false);

  const toggleShortcuts = useCallback(() => {
    setShortcutsOpen((prev) => !prev);
  }, []);

  useGlobalShortcuts(toggleShortcuts);

  return (
    <div className="app-layout">
      <TopToolbar />
      <div className="app-main">
        <ErrorBoundary label="Left Panel">
          <LeftPanel />
        </ErrorBoundary>
        <ErrorBoundary label="Viewport">
          <Viewport />
        </ErrorBoundary>
        <ErrorBoundary label="Right Panel">
          <RightPanel />
        </ErrorBoundary>
      </div>
      <StatusBar />
      <ExportDialog />
      <ShortcutsDialog open={shortcutsOpen} onClose={() => setShortcutsOpen(false)} />
    </div>
  );
}
