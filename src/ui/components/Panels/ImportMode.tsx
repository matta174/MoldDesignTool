import { useCallback, useRef, useState, useMemo } from 'react';
import * as THREE from 'three';
import { Upload, FileBox, Trash2, RotateCw } from 'lucide-react';
import { useImportStore } from '../../state/importStore';
import { loadSTLFile, centerAndNormalize } from '../../../import/STLImporter';

export function ImportMode() {
  const geometry = useImportStore((s) => s.geometry);
  const fileName = useImportStore((s) => s.fileName);
  const isLoading = useImportStore((s) => s.isLoading);
  const error = useImportStore((s) => s.error);
  const setGeometry = useImportStore((s) => s.setGeometry);
  const setLoading = useImportStore((s) => s.setLoading);
  const setError = useImportStore((s) => s.setError);
  const clear = useImportStore((s) => s.clear);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleFile = useCallback(async (file: File) => {
    const ext = file.name.toLowerCase().split('.').pop();
    if (ext !== 'stl') {
      setError('Only .stl files are supported');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const geo = await loadSTLFile(file);
      centerAndNormalize(geo);
      setGeometry(geo, file.name);
    } catch (e) {
      console.error('STL import failed:', e);
      setError(e instanceof Error ? e.message : 'Failed to parse STL file');
    }
  }, [setGeometry, setLoading, setError]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    // Reset input so the same file can be re-selected
    e.target.value = '';
  }, [handleFile]);

  // Compute stats for display
  const stats = useMemo(() => {
    if (!geometry) return null;

    const posAttr = geometry.getAttribute('position');
    const vertices = posAttr ? posAttr.count : 0;
    const indexAttr = geometry.getIndex();
    const faces = indexAttr ? indexAttr.count / 3 : vertices / 3;

    geometry.computeBoundingBox();
    const box = geometry.boundingBox!;
    const size = box.getSize(new THREE.Vector3());

    return {
      vertices,
      faces: Math.round(faces),
      sizeX: size.x.toFixed(1),
      sizeY: size.y.toFixed(1),
      sizeZ: size.z.toFixed(1),
    };
  }, [geometry]);

  return (
    <div>
      <div className="panel-section">
        <div className="section-header">Import STL</div>

        {!geometry ? (
          <>
            {/* Drop zone */}
            <div
              className={`import-dropzone ${isDragging ? 'dragging' : ''}`}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onClick={handleClick}
            >
              <Upload size={28} style={{ color: 'var(--concrete-400)', marginBottom: 8 }} />
              <div className="import-dropzone-text">
                Drop .stl file here
              </div>
              <div className="import-dropzone-hint">
                or click to browse
              </div>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept=".stl"
              style={{ display: 'none' }}
              onChange={handleInputChange}
            />
          </>
        ) : (
          <>
            {/* Loaded file info */}
            <div className="import-file-info">
              <FileBox size={16} style={{ color: 'var(--form-500)', flexShrink: 0 }} />
              <span className="import-file-name">{fileName}</span>
            </div>

            {stats && (
              <div className="import-stats">
                <div className="import-stat">
                  <span className="param-label">Vertices</span>
                  <span className="param-value">{stats.vertices.toLocaleString()}</span>
                </div>
                <div className="import-stat">
                  <span className="param-label">Faces</span>
                  <span className="param-value">{stats.faces.toLocaleString()}</span>
                </div>
                <div className="import-stat">
                  <span className="param-label">Size (mm)</span>
                  <span className="param-value">{stats.sizeX} × {stats.sizeY} × {stats.sizeZ}</span>
                </div>
              </div>
            )}

            <div className="import-actions">
              <button
                className="btn-secondary btn-small"
                onClick={() => { clear(); }}
                title="Remove imported model"
              >
                <Trash2 size={12} /> Remove
              </button>
              <button
                className="btn-secondary btn-small"
                onClick={handleClick}
                title="Replace with different file"
              >
                <RotateCw size={12} /> Replace
              </button>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept=".stl"
              style={{ display: 'none' }}
              onChange={handleInputChange}
            />
          </>
        )}

        {isLoading && (
          <div className="import-status">Loading...</div>
        )}

        {error && (
          <div className="import-error">{error}</div>
        )}
      </div>

      <div className="panel-section">
        <div className="section-header">How It Works</div>
        <div className="sculpt-tips">
          <div className="sculpt-tip">1. Import any .stl file of the object you want to mold</div>
          <div className="sculpt-tip">2. The model is auto-centered and placed on the ground plane</div>
          <div className="sculpt-tip">3. Configure mold settings in the right panel</div>
          <div className="sculpt-tip">4. Click "Generate Mold" to create a cast-ready mold</div>
          <div className="sculpt-tip">5. Export the mold as STL for 3D printing</div>
        </div>
      </div>
    </div>
  );
}
