import { useCallback } from 'react';
import {
  useGeometricStore,
  type PrimitiveType,
  type SceneNode,
} from '../../state/geometricStore';
import type { CSGOp } from '../../../core/csg/CSGOperation';
import { getPrimitiveSizeLabel } from '../../../designs/geometric/PrimitiveFactory';

const PRIMITIVES: { type: PrimitiveType; icon: string; name: string }[] = [
  { type: 'box', icon: '□', name: 'Box' },
  { type: 'sphere', icon: '○', name: 'Sphere' },
  { type: 'cylinder', icon: '△', name: 'Cylinder' },
  { type: 'torus', icon: '◎', name: 'Torus' },
];

const BOOL_OPS: { key: CSGOp; label: string }[] = [
  { key: 'union', label: 'Union ∪' },
  { key: 'subtract', label: 'Subtract −' },
  { key: 'intersect', label: 'Intersect ∩' },
];

const OP_LABELS: Record<CSGOp, string> = {
  union: '∪',
  subtract: '−',
  intersect: '∩',
};

function XYZInputRow({
  values,
  onChange,
  suffix,
}: {
  values: { x: number; y: number; z: number };
  onChange: (axis: 'x' | 'y' | 'z', value: number) => void;
  suffix?: string;
}) {
  return (
    <div className="xyz-row">
      {(['x', 'y', 'z'] as const).map((axis) => (
        <input
          key={axis}
          className={`xyz-input ${axis}-axis`}
          type="number"
          value={values[axis]}
          onChange={(e) => onChange(axis, Number(e.target.value))}
          title={`${axis.toUpperCase()}${suffix ? ` (${suffix})` : ''}`}
        />
      ))}
    </div>
  );
}

function DimensionInputs({
  node,
  onChangeDimension,
}: {
  node: SceneNode;
  onChangeDimension: (axis: 'x' | 'y' | 'z', value: number) => void;
}) {
  switch (node.type) {
    case 'box':
      return (
        <>
          <div className="param-label" style={{ marginBottom: 'var(--sp-1)' }}>
            Size (W × H × D)
          </div>
          <XYZInputRow values={node.dimensions} onChange={onChangeDimension} suffix="mm" />
        </>
      );
    case 'sphere':
      return (
        <div className="mold-param">
          <span className="param-label">Radius</span>
          <input
            className="input-field input-number"
            type="number"
            min={1}
            max={200}
            value={node.dimensions.x}
            onChange={(e) => onChangeDimension('x', Number(e.target.value))}
          />
        </div>
      );
    case 'cylinder':
      return (
        <>
          <div className="mold-param">
            <span className="param-label">Top Radius</span>
            <input
              className="input-field input-number"
              type="number"
              min={1}
              max={200}
              value={node.dimensions.x}
              onChange={(e) => onChangeDimension('x', Number(e.target.value))}
            />
          </div>
          <div className="mold-param">
            <span className="param-label">Bottom Radius</span>
            <input
              className="input-field input-number"
              type="number"
              min={1}
              max={200}
              value={node.dimensions.y}
              onChange={(e) => onChangeDimension('y', Number(e.target.value))}
            />
          </div>
          <div className="mold-param">
            <span className="param-label">Height</span>
            <input
              className="input-field input-number"
              type="number"
              min={1}
              max={300}
              value={node.dimensions.z}
              onChange={(e) => onChangeDimension('z', Number(e.target.value))}
            />
          </div>
        </>
      );
    case 'torus':
      return (
        <>
          <div className="mold-param">
            <span className="param-label">Radius</span>
            <input
              className="input-field input-number"
              type="number"
              min={5}
              max={200}
              value={node.dimensions.x}
              onChange={(e) => onChangeDimension('x', Number(e.target.value))}
            />
          </div>
          <div className="mold-param">
            <span className="param-label">Tube</span>
            <input
              className="input-field input-number"
              type="number"
              min={1}
              max={100}
              value={node.dimensions.y}
              onChange={(e) => onChangeDimension('y', Number(e.target.value))}
            />
          </div>
        </>
      );
  }
}

export function GeometricMode() {
  const nodes = useGeometricStore((s) => s.nodes);
  const selectedNodeId = useGeometricStore((s) => s.selectedNodeId);
  const addNode = useGeometricStore((s) => s.addNode);
  const removeNode = useGeometricStore((s) => s.removeNode);
  const duplicateNode = useGeometricStore((s) => s.duplicateNode);
  const selectNode = useGeometricStore((s) => s.selectNode);
  const setNodePosition = useGeometricStore((s) => s.setNodePosition);
  const setNodeRotation = useGeometricStore((s) => s.setNodeRotation);
  const setNodeScale = useGeometricStore((s) => s.setNodeScale);
  const setNodeDimension = useGeometricStore((s) => s.setNodeDimension);
  const setNodeOperation = useGeometricStore((s) => s.setNodeOperation);
  const moveNodeUp = useGeometricStore((s) => s.moveNodeUp);
  const moveNodeDown = useGeometricStore((s) => s.moveNodeDown);
  const clearScene = useGeometricStore((s) => s.clearScene);

  const selectedNode = nodes.find((n) => n.id === selectedNodeId) ?? null;

  const handlePositionChange = useCallback(
    (axis: 'x' | 'y' | 'z', value: number) => {
      if (selectedNodeId) setNodePosition(selectedNodeId, axis, value);
    },
    [selectedNodeId, setNodePosition]
  );

  const handleRotationChange = useCallback(
    (axis: 'x' | 'y' | 'z', value: number) => {
      if (selectedNodeId) setNodeRotation(selectedNodeId, axis, value);
    },
    [selectedNodeId, setNodeRotation]
  );

  const handleScaleChange = useCallback(
    (axis: 'x' | 'y' | 'z', value: number) => {
      if (selectedNodeId) setNodeScale(selectedNodeId, axis, value);
    },
    [selectedNodeId, setNodeScale]
  );

  const handleDimensionChange = useCallback(
    (axis: 'x' | 'y' | 'z', value: number) => {
      if (selectedNodeId) setNodeDimension(selectedNodeId, axis, value);
    },
    [selectedNodeId, setNodeDimension]
  );

  return (
    <>
      {/* Primitives */}
      <div className="panel-section">
        <div className="section-header">Add Primitive</div>
        <div className="primitives-grid">
          {PRIMITIVES.map((p) => (
            <div
              key={p.type}
              className="primitive-card"
              onClick={() => addNode(p.type)}
            >
              <span className="primitive-card-shape">{p.icon}</span>
              <span className="primitive-card-name">{p.name}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Scene hierarchy */}
      <div className="panel-section">
        <div className="section-header">
          Scene ({nodes.length} object{nodes.length !== 1 ? 's' : ''})
        </div>
        {nodes.length === 0 && (
          <div className="scene-empty">
            Click a primitive above to start building
          </div>
        )}
        {nodes.map((node, idx) => (
          <div
            key={node.id}
            className={`tree-item ${selectedNodeId === node.id ? 'selected' : ''}`}
            onClick={() => selectNode(node.id)}
          >
            <span className="tree-node-op">
              {idx === 0 ? '▸' : OP_LABELS[node.operation]}
            </span>
            <span className="tree-node-name">{node.name}</span>
            <span className="tree-node-size">
              ({getPrimitiveSizeLabel(node.type, node.dimensions)})
            </span>
          </div>
        ))}
        {nodes.length > 0 && (
          <div className="scene-actions">
            <button className="btn-secondary btn-small" onClick={clearScene}>
              Clear All
            </button>
          </div>
        )}
      </div>

      {/* Selected node controls */}
      {selectedNode && (
        <>
          {/* Boolean operation (not for first node) */}
          {nodes.indexOf(selectedNode) > 0 && (
            <div className="panel-section">
              <div className="section-header">Boolean Operation</div>
              <div className="bool-ops">
                {BOOL_OPS.map((op) => (
                  <button
                    key={op.key}
                    className={`bool-op-btn ${selectedNode.operation === op.key ? 'active' : ''}`}
                    onClick={() => setNodeOperation(selectedNode.id, op.key)}
                  >
                    {op.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Dimensions */}
          <div className="panel-section">
            <div className="section-header">{selectedNode.name}</div>
            <DimensionInputs
              node={selectedNode}
              onChangeDimension={handleDimensionChange}
            />
          </div>

          {/* Transform */}
          <div className="panel-section">
            <div className="section-header">Transform</div>
            <div className="param-label" style={{ marginBottom: 'var(--sp-1)' }}>
              Position (mm)
            </div>
            <XYZInputRow values={selectedNode.position} onChange={handlePositionChange} />

            <div className="param-label" style={{ marginBottom: 'var(--sp-1)' }}>
              Rotation (°)
            </div>
            <XYZInputRow values={selectedNode.rotation} onChange={handleRotationChange} />

            <div className="param-label" style={{ marginBottom: 'var(--sp-1)' }}>
              Scale
            </div>
            <XYZInputRow values={selectedNode.scale} onChange={handleScaleChange} />
          </div>

          {/* Node actions */}
          <div className="panel-section">
            <div className="node-actions">
              <button
                className="btn-secondary btn-small"
                onClick={() => duplicateNode(selectedNode.id)}
                title="Duplicate node"
              >
                Duplicate
              </button>
              <button
                className="btn-secondary btn-small"
                onClick={() => moveNodeUp(selectedNode.id)}
                title="Move up in evaluation order"
                disabled={nodes.indexOf(selectedNode) === 0}
              >
                ↑
              </button>
              <button
                className="btn-secondary btn-small"
                onClick={() => moveNodeDown(selectedNode.id)}
                title="Move down in evaluation order"
                disabled={nodes.indexOf(selectedNode) === nodes.length - 1}
              >
                ↓
              </button>
              <button
                className="btn-secondary btn-small btn-danger"
                onClick={() => removeNode(selectedNode.id)}
                title="Delete node"
              >
                Delete
              </button>
            </div>
          </div>
        </>
      )}
    </>
  );
}
