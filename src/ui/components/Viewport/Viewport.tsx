import { Canvas } from '@react-three/fiber';
import { OrbitControls, GizmoHelper, GizmoViewport, Grid } from '@react-three/drei';
import { useViewportStore } from '../../state/viewportStore';
import { useDesignStore } from '../../state/designStore';
import { useMoldStore } from '../../state/moldStore';
import { useSculptStore } from '../../state/sculptStore';
import { PlaceholderModel } from './PlaceholderModel';
import { MoldModel } from './MoldModel';
import { DraftHeatmapModel } from './DraftHeatmapModel';
import { GeometricModel } from './GeometricModel';
import { SculptModel } from './SculptModel';
import './Viewport.css';

export function Viewport() {
  const showGrid = useViewportStore((s) => s.showGrid);
  const showDraftHeatmap = useViewportStore((s) => s.showDraftHeatmap);
  const designMode = useDesignStore((s) => s.mode);
  const viewMode = useMoldStore((s) => s.viewMode);
  const isSculpting = useSculptStore((s) => s.isSculpting);

  const isTemplateMode = designMode === 'template';
  const isGeometricMode = designMode === 'geometric';
  const isSculptMode = designMode === 'sculpt';

  return (
    <div className="viewport">
      <Canvas
        camera={{ position: [150, 120, 150], fov: 50, near: 0.1, far: 10000 }}
        gl={{ antialias: true, alpha: false }}
        style={{ background: '#0a0a0a' }}
      >
        {/* Lighting */}
        <ambientLight intensity={0.4} />
        <directionalLight position={[100, 200, 100]} intensity={0.8} />
        <directionalLight position={[-50, 100, -50]} intensity={0.3} />

        {/* Grid */}
        {showGrid && (
          <Grid
            args={[400, 400]}
            cellSize={10}
            cellThickness={0.5}
            cellColor="#1e1e1e"
            sectionSize={50}
            sectionThickness={1}
            sectionColor="#2a2a2a"
            fadeDistance={500}
            fadeStrength={1}
            infiniteGrid
          />
        )}

        {/* Template mode models */}
        {isTemplateMode && viewMode !== 'mold' && !showDraftHeatmap && (
          <PlaceholderModel />
        )}
        {isTemplateMode && viewMode !== 'mold' && <DraftHeatmapModel />}

        {/* Geometric mode model */}
        {isGeometricMode && <GeometricModel />}

        {/* Sculpt mode model */}
        {isSculptMode && <SculptModel />}

        {/* Mold — shown when generated and view mode includes it */}
        <MoldModel />

        {/* Controls — disabled during active sculpting */}
        <OrbitControls
          makeDefault
          enableDamping
          dampingFactor={0.1}
          minDistance={20}
          maxDistance={800}
          enabled={!isSculpting}
        />

        {/* Gizmo */}
        <GizmoHelper alignment="top-right" margin={[60, 60]}>
          <GizmoViewport
            axisColors={['#dc2626', '#16a34a', '#2563eb']}
            labelColor="#ededed"
          />
        </GizmoHelper>
      </Canvas>

      {/* Viewport overlay info */}
      <div className="viewport-info">
        <span>ORBIT: LMB</span>
        <span>PAN: MMB</span>
        <span>ZOOM: SCROLL</span>
      </div>
    </div>
  );
}
