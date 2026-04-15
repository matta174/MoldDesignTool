# Concrete Brutalist Mold Design Tool

A browser-based tool for designing castable concrete objects and generating the mold geometry to produce them. Build a shape with parametric templates, CSG primitives, or freeform sculpting, then generate a 1-part or 2-part casting mold — ready to export as STL for 3D printing or CNC.

## Features

- **Three design modes** — parametric templates (planter, vase, coaster, tile), geometric CSG (boolean operations on primitives), and brush-based sculpting
- **Mold generation** — automatic 1-part or 2-part molds with configurable wall margins, pour holes, vent holes, and registration keys
- **Draft angle analysis** — real-time heatmap overlay showing undercuts and demoldability
- **Material shrinkage compensation** — presets for Portland cement, white cement, GFRC, epoxy, and Jesmonite
- **STL export** — binary or ASCII format with unit scaling (mm, cm, inches)
- **Brutalist UI** — raw monospace typography, formwork orange accent, no rounded corners

## Quick Start

```bash
git clone https://github.com/matta174/MoldDesignTool.git
cd MoldDesignTool
npm install
npm run dev
```

Open `http://localhost:5173` in your browser. The app loads with a default planter template — adjust parameters in the left panel, generate a mold from the right panel, and export when ready.

### Prerequisites

- Node.js 18+
- npm 9+

## Usage

### Design Modes

Switch modes from the top toolbar:

**Template mode** — Select a preset shape (planter, vase, coaster, tile) and adjust parameters like height, diameter, wall thickness, draft angle, and surface pattern (ribs, facets, flutes) with sliders in the left panel.

**Geometric mode** — Build shapes from CSG primitives (box, sphere, cylinder, torus). Each primitive has position, rotation, scale, and dimensions controls. Combine them with union, subtract, or intersect operations — evaluated top-to-bottom in the node list.

**Sculpt mode** — Start from a base mesh and sculpt with brushes: grab, smooth, inflate, flatten, crease, and pinch. Supports adjustable radius and strength, brush inversion, X-axis symmetry, and undo/redo.

### Mold Generation

From the right panel:

1. Choose **1-Part** (open-top box mold) or **2-Part** (split mold with registration keys)
2. Set wall margin, bottom margin, and pour hole diameter
3. Toggle vent holes and (for 2-part) registration keys
4. For 2-part molds, adjust the parting plane height with the slider
5. Select a material preset for shrinkage compensation
6. Click **Generate Mold**

The mold is generated on a Web Worker so the UI stays responsive. Results include wall thickness validation, draft angle analysis, and mold dimensions.

### Draft Analysis

Toggle the heatmap overlay in the right panel to visualize draft angles on your model:

- **Red** — undercuts (negative draft, can't demold)
- **Orange** — marginal (0-3 degrees)
- **Green** — good (3+ degrees)
- **Gray** — flat surfaces (75+ degrees, neutral)

### Export

Export the model or mold as STL files. Use the **Export Options** dialog for format (binary/ASCII), unit selection, and pre-export validation (degenerate triangle detection, NaN checks, size sanity).

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | React 19, TypeScript 6 |
| Build | Vite 8 |
| 3D Rendering | Three.js 0.183, @react-three/fiber, @react-three/drei |
| CSG Engine | three-bvh-csg (BVH-accelerated booleans) |
| State | Zustand 5 |
| Compute | Web Workers (CSG + mold generation off main thread) |

## Project Structure

```
src/
  core/csg/              CSG boolean operation wrappers
  designs/
    templates/           Parametric geometry generators (planter, vase, etc.)
    geometric/           Primitive factory + CSG scene evaluator
  export/stl/            STL exporter and pre-export validator
  mold-engine/
    generator/           1-part and 2-part mold generators
    analysis/            Draft angle analyzer with heatmap
    features/            Pour hole, vent hole, registration key generators
    validation/          Wall thickness validator
  sculpt/                Brush engine (grab, smooth, inflate, flatten, crease, pinch)
  ui/
    components/          React components (Viewport, Panels, Dialogs, Toolbars)
    layout/              Main layout shell
    state/               Zustand stores (design, mold, geometric, sculpt, viewport, export)
  utils/                 Hooks (debounce, geometry disposal, shortcuts) and file I/O
  workers/               Web Worker for CSG operations + geometry serialization
```

See [ARCHITECTURE.md](./ARCHITECTURE.md) for detailed system design and data flow.

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+Z` | Undo (sculpt mode) |
| `Ctrl+Shift+Z` | Redo (sculpt mode) |
| `?` | Toggle shortcuts dialog |

## License

Private project.
