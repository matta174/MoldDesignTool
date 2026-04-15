# Architecture

This document describes the system design, data flow, and key decisions behind the Concrete Brutalist Mold Design Tool.

## Overview

The app is a single-page React application that runs entirely in the browser. There is no backend — all computation (CSG booleans, mold generation, draft analysis) happens client-side, with heavy operations offloaded to Web Workers to keep the UI responsive.

The architecture follows a unidirectional data flow: user input updates Zustand stores, stores drive React component rendering, and 3D geometry is computed on-demand from store state.

```
User Input → Zustand Store → React Components → Three.js Viewport
                  ↓
            Web Worker (CSG)
                  ↓
            Mold Geometry → Store → Viewport
```

## Design Decisions

### Why Zustand over Redux/Context?

Zustand stores are decentralized — each domain (design, mold, geometric, sculpt, viewport, export) gets its own store with no shared reducer boilerplate. Stores can read each other via `getState()` for cross-cutting concerns like invalidation (e.g., changing a template parameter resets the mold). This matches the domain boundaries cleanly without a global action bus.

### Why Web Workers for CSG?

CSG boolean operations (powered by `three-bvh-csg`) are CPU-intensive and can take 100ms-2s depending on geometry complexity. Running them on the main thread freezes the viewport. The worker receives serialized geometry buffers via transferable objects (zero-copy) and returns the result the same way.

### Why LatheGeometry for templates?

Planters, vases, and coasters are rotationally symmetric. `THREE.LatheGeometry` generates them from a 2D profile curve, which is far more intuitive to parameterize (height, radius at various points, wall thickness) than constructing meshes from scratch. Surface patterns (ribs, flutes, facets) are applied as post-processing vertex displacement on the lathe output.

### Why non-indexed geometry for sculpting?

The sculpt engine operates on non-indexed `BufferGeometry` so each vertex can be moved independently without affecting shared vertices. This trades memory for simplicity — no need to maintain a half-edge data structure or adjacency tables. Face-local topology (groups of 3 consecutive vertices) provides enough neighborhood information for the smooth brush.

## State Architecture

Six Zustand stores manage distinct domains:

**`designStore`** — Current design mode (`template` | `geometric` | `sculpt`), selected template type, and template parameters. Changing any parameter invalidates the mold.

**`moldStore`** — Mold settings (type, margins, features), shrinkage material preset, generated mold geometries (1-part or 2-part halves), view mode, and analysis results. The central coordination point — other stores call `resetMold()` when their state changes.

**`geometricStore`** — CSG scene graph: an ordered list of `SceneNode` objects, each with a primitive type, transform, dimensions, and a boolean operation. Nodes are evaluated sequentially to produce a combined geometry.

**`sculptStore`** — Brush settings (type, radius, strength, symmetry), undo/redo history (stored as position buffer `Float32Array` snapshots), and a version counter that triggers re-renders.

**`viewportStore`** — Camera state, grid visibility, draft heatmap toggle, and gizmo preferences.

**`exportStore`** — Export dialog open/close state and export settings (format, unit, model name).

### Invalidation Flow

Stores form an implicit dependency graph:

```
designStore ──→ moldStore.resetMold()
geometricStore ──→ moldStore.resetMold()
sculptStore ──→ moldStore.resetMold()
moldStore.setSetting() ──→ self.reset (clears geometry, resets view)
moldStore.setMaterial() ──→ self.reset (clears geometry)
```

Any change to the model (template params, CSG nodes, sculpt strokes) automatically invalidates the mold so the user must regenerate. This prevents stale mold geometry from persisting after model edits.

## Geometry Pipeline

### Template Mode

```
TemplateParams → generateGeometry(type, params) → LatheGeometry
                                                      ↓
                                              applyPattern() (optional)
                                                      ↓
                                              BufferGeometry (ready for viewport + mold)
```

Each template type (planter, vase, coaster, tile) has its own generator function that builds a 2D profile, creates a `LatheGeometry`, and optionally applies vertex-displacement patterns. The registry (`registry.ts`) maps template types to their generators, default parameters, and UI control definitions.

### Geometric Mode

```
SceneNode[] → evaluateScene()
                  ↓
              nodeToBrush() for each node
                  ↓
              Sequential CSG: result = result OP brush
                  ↓
              Combined BufferGeometry
```

The first node is always the base. Each subsequent node is combined using its assigned CSG operation (`union`, `subtract`, `intersect`). If a CSG operation fails (degenerate geometry), it's skipped with a console warning and the previous result is preserved.

### Sculpt Mode

```
Base mesh (subdivided primitive)
      ↓
  applyBrush() per pointer event
      ↓
  Modify position attribute in-place
      ↓
  Recompute normals, flag needsUpdate
```

The brush engine iterates all vertices, tests distance to the brush center, applies a smoothstep falloff, and dispatches to the appropriate brush function. Undo snapshots are copies of the position `Float32Array` stored in the sculpt store's undo stack — only positions are saved, not full geometry, keeping memory usage manageable.

## Mold Generation Pipeline

```
Model geometry
      ↓
  Clone + scale (shrinkage compensation)
      ↓
  Compute bounding box
      ↓
  Create mold box (bbox + margins)
      ↓
  CSG subtract: box - model
      ↓
  CSG subtract: result - pour hole
      ↓
  CSG subtract: result - vent holes (optional)
      ↓                                          ┐
  1-Part: done                                    │
                                                  ├─ 2-Part path:
  CSG intersect with upper/lower cutting boxes    │
  Union registration pins onto bottom half        │
  Subtract registration sockets from top half     │
  Subtract pour hole from top half                │
  Subtract vents from top half                   ─┘
      ↓
  MoldResult / TwoPartMoldResult
```

The 2-part generator splits the hollow mold at a configurable parting plane using large cutting boxes and CSG intersection. Registration keys (cone-shaped pins/sockets) ensure the halves align when reassembled for casting.

All CSG operations run on the Web Worker via `csgWorkerClient`, which handles geometry serialization (transferable `ArrayBuffer`s) and promise-based request/response matching.

## Analysis Pipeline

### Draft Angle Analysis

For each face in the model geometry, the analyzer computes:

```
face_normal = cross(edge1, edge2).normalize()
dot = face_normal . demold_direction
draft_angle = 90 - acos(dot) in degrees
```

Positive draft means the face opens toward the demold direction (good). Negative draft means an undercut (can't demold with a simple pull). Results are encoded as per-vertex colors for heatmap rendering.

### Wall Thickness Validation

Checks three things: configured margins against printability limits (2mm minimum, 5mm recommended), radial extent of model vertices against the expected mold wall radius, and vertical clearance. Reports thin spots with location counts.

## Worker Communication

```
Main Thread                          Web Worker
     │                                    │
     │── postMessage({id, type, buffers})──→│
     │   (transferable ArrayBuffers)       │
     │                                    │── CSG operations
     │                                    │
     │←── postMessage({id, result, buffers})│
     │    (transferable ArrayBuffers)      │
```

The worker client (`csgWorkerClient.ts`) assigns a unique ID to each request and returns a `Promise` that resolves when the worker posts back a message with a matching ID. Geometry is serialized to raw typed arrays (`Float32Array` for positions/normals, `Uint32Array` for indices) and transferred without copying.

## Rendering

The viewport uses `@react-three/fiber` with `@react-three/drei` helpers:

- `OrbitControls` for camera interaction
- `GizmoHelper` for orientation reference
- `Grid` for the workspace floor
- Conditional model components based on design mode (`PlaceholderModel`, `GeometricModel`, `SculptModel`)
- `MoldModel` for generated mold geometry
- `DraftHeatmapModel` for draft analysis overlay (vertex-colored mesh with `vertexColors: true`)

Components are wrapped in `ErrorBoundary` at the layout level so a Three.js crash in one section doesn't take down the entire app.

## Design System

The UI follows a brutalist aesthetic defined in `design-system.md`:

- **Typography**: JetBrains Mono (monospace), no serif fonts
- **Colors**: Dark concrete grays (`#141414` to `#0a0a0a`), formwork orange accent (`#e85d26`)
- **Borders**: 1px structural borders, no rounded corners, no shadows
- **Spacing**: 4px grid
- **Semantic colors**: Red/orange/green for draft analysis status badges
- **Layout**: Three-panel (left 280px, viewport flex, right 320px) with top toolbar and status bar
- **Minimum viewport**: 1280x720
