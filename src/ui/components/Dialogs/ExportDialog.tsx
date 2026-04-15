import { useEffect, useCallback } from 'react';
import { useExportStore } from '../../state/exportStore';
import { useDesignStore } from '../../state/designStore';
import { exportSTL, type STLFormat, type STLUnit } from '../../../export/stl/STLExporter';
import { validateForExport } from '../../../export/stl/STLValidator';
import { generateGeometry } from '../../../designs/templates/generateGeometry';
import { downloadFile } from '../../../utils/io/fileDownload';
import './ExportDialog.css';

const FORMATS: { key: STLFormat; label: string; desc: string }[] = [
  { key: 'binary', label: 'Binary', desc: 'Smaller file, standard for slicers' },
  { key: 'ascii', label: 'ASCII', desc: 'Human-readable, good for debugging' },
];

const UNITS: { key: STLUnit; label: string }[] = [
  { key: 'mm', label: 'Millimeters (mm)' },
  { key: 'cm', label: 'Centimeters (cm)' },
  { key: 'inches', label: 'Inches (in)' },
];

export function ExportDialog() {
  const dialogOpen = useExportStore((s) => s.dialogOpen);
  const format = useExportStore((s) => s.format);
  const unit = useExportStore((s) => s.unit);
  const validation = useExportStore((s) => s.validation);
  const exporting = useExportStore((s) => s.exporting);
  const closeDialog = useExportStore((s) => s.closeDialog);
  const setFormat = useExportStore((s) => s.setFormat);
  const setUnit = useExportStore((s) => s.setUnit);
  const setValidation = useExportStore((s) => s.setValidation);
  const setExporting = useExportStore((s) => s.setExporting);

  const selectedTemplate = useDesignStore((s) => s.selectedTemplate);
  const params = useDesignStore((s) => s.params);

  // Run validation when dialog opens
  useEffect(() => {
    if (dialogOpen) {
      const geo = generateGeometry(selectedTemplate, params);
      const result = validateForExport(geo);
      setValidation(result);
    }
  }, [dialogOpen, selectedTemplate, params, setValidation]);

  const handleExport = useCallback(() => {
    setExporting(true);

    // Use setTimeout to allow UI to update
    setTimeout(() => {
      try {
        const geo = generateGeometry(selectedTemplate, params);
        const result = exportSTL(geo, {
          format,
          unit,
          modelName: `${selectedTemplate}_model`,
        });

        const ext = 'stl';
        const filename = `${selectedTemplate}_model.${ext}`;
        const mime = format === 'binary' ? 'application/octet-stream' : 'text/plain';

        downloadFile(result, filename, mime);
      } catch (e) {
        console.error('Export failed:', e);
      } finally {
        setExporting(false);
      }
    }, 50);
  }, [selectedTemplate, params, format, unit, setExporting]);

  // Close on Escape
  useEffect(() => {
    if (!dialogOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeDialog();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [dialogOpen, closeDialog]);

  if (!dialogOpen) return null;

  return (
    <div className="dialog-overlay" onClick={closeDialog}>
      <div className="dialog" onClick={(e) => e.stopPropagation()}>
        <div className="dialog-header">
          <span className="dialog-title">EXPORT STL</span>
          <button className="dialog-close" onClick={closeDialog} aria-label="Close">
            ✕
          </button>
        </div>

        <div className="dialog-body">
          {/* Format */}
          <div className="dialog-section">
            <div className="section-header">Format</div>
            <div className="format-toggle">
              {FORMATS.map((f) => (
                <button
                  key={f.key}
                  className={`format-btn ${format === f.key ? 'active' : ''}`}
                  onClick={() => setFormat(f.key)}
                >
                  <span className="format-label">{f.label}</span>
                  <span className="format-desc">{f.desc}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Units */}
          <div className="dialog-section">
            <div className="section-header">Units</div>
            <select
              className="select-field"
              value={unit}
              onChange={(e) => setUnit(e.target.value as STLUnit)}
            >
              {UNITS.map((u) => (
                <option key={u.key} value={u.key}>{u.label}</option>
              ))}
            </select>
          </div>

          {/* Validation results */}
          {validation && (
            <div className="dialog-section">
              <div className="section-header">Validation</div>
              <div className="validation-stats">
                <span className="stat">
                  Triangles: <strong>{validation.stats.triangles.toLocaleString()}</strong>
                </span>
                <span className="stat">
                  File size: <strong>~{validation.stats.estimatedFileSizeMB.toFixed(1)} MB</strong>
                </span>
              </div>

              {validation.errors.length > 0 && (
                <div className="validation-errors">
                  {validation.errors.map((e, i) => (
                    <div key={i} className="validation-item error">
                      <span className="validation-icon">✕</span> {e}
                    </div>
                  ))}
                </div>
              )}

              {validation.warnings.length > 0 && (
                <div className="validation-warnings">
                  {validation.warnings.map((w, i) => (
                    <div key={i} className="validation-item warning">
                      <span className="validation-icon">⚠</span> {w}
                    </div>
                  ))}
                </div>
              )}

              {validation.errors.length === 0 && validation.warnings.length === 0 && (
                <div className="validation-item ok">
                  <span className="validation-icon">✓</span> Geometry looks good for export
                </div>
              )}
            </div>
          )}
        </div>

        <div className="dialog-footer">
          <button className="btn-secondary" onClick={closeDialog}>
            Cancel
          </button>
          <button
            className="btn-primary"
            onClick={handleExport}
            disabled={exporting || (validation !== null && !validation.valid)}
          >
            {exporting ? 'EXPORTING...' : 'DOWNLOAD STL'}
          </button>
        </div>
      </div>
    </div>
  );
}
