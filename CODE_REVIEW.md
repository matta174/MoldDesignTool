# Code Review: Concrete Brutalist Mold Design Tool

**Date:** 2026-04-15  
**Scope:** Full codebase  
**Reviewer:** Claude

---

## Summary

The codebase is well-architected with clean separation of concerns — Zustand stores, worker-threaded CSG, and modular geometry generators. The biggest risks are around GPU memory management, numerical edge cases in the sculpt engine, and some geometry correctness issues in the template/mold pipeline.

**Scorecard:**

| Dimension | Rating | Notes |
|-----------|--------|-------|
| Security | **A** | No network calls, no user auth, no injection surfaces. Clean. |
| Performance | **B-** | Excessive object allocation in hot loops; O(n²) sculpt brush |
| Correctness | **C+** | Several real bugs: NaN propagation, broken validation, geometry discontinuities |
| Maintainability | **B+** | Clean architecture, good store separation, but magic numbers everywhere |

---

## Critical & High Findings

### 1. GPU Memory Leak in MoldGenerator (HIGH)

**File:** `src/mold-engine/generator/MoldGenerator.ts` ~line 100  
**Issue:** Only `boxGeo` is disposed after mold generation. The `model` geometry (potentially cloned for shrinkage) and all `subtractions` geometries (pour hole, vents, registration keys) are never cleaned up. In a session where the user regenerates molds repeatedly, this exhausts VRAM.  
**Fix:** After `csgSubtractMultiple()`, dispose each geometry in the subtractions array and the shrinkage-scaled model clone.

### 2. NaN Propagation in BrushEngine (HIGH)

**File:** `src/sculpt/BrushEngine.ts` ~lines 221-227  
**Issue:** `applyCrease()` calls `toCenter.normalize()` without checking for zero-length vectors. When a vertex sits exactly at the brush center, this produces NaN that cascades through `setX/setY/setZ` and corrupts the entire geometry buffer.  
**Fix:** Guard with `if (toCenter.lengthSq() > 1e-6) { toCenter.normalize(); }` before use.

### 3. O(n²) Vertex Lookup in Smooth Brush (HIGH)

**File:** `src/sculpt/BrushEngine.ts` ~lines 148-161  
**Issue:** The smooth brush does nested distance checks across all vertices. The stride-based sampling (`step = Math.max(1, Math.floor(count / 500))`) is a bandaid — on 100k+ vertex meshes this still produces significant per-stroke latency with poor cache locality.  
**Fix:** Build a spatial index (octree or BVH) during geometry setup. Three.js's `MeshBVH` from the existing `three-mesh-bvh` dependency could be repurposed here.

### 4. Parting Plane Can Exceed Mold Bounds (HIGH)

**File:** `src/mold-engine/generator/TwoPartMoldGenerator.ts` ~line 80  
**Issue:** `partingRatio` is clamped to [0.1, 0.9] but `partingY` is computed in model space, not mold space. If the model is small relative to wall margins, the parting plane can land outside the mold block.  
**Fix:** Clamp to actual mold bounds: `Math.max(moldBottomY + 1, Math.min(moldTopY - 1, partingY))`.

### 5. STLExporter Allocates Per-Triangle (HIGH)

**File:** `src/export/stl/STLExporter.ts` ~lines 85-87, 138-139  
**Issue:** `edge1`, `edge2`, and `faceNormal` vectors are `new Vector3()` inside the triangle loop. A 500k-triangle mesh creates 1.5M temporary objects, triggering GC pauses during export.  
**Fix:** Pre-allocate outside the loop and reuse (the same pattern already used correctly in `DraftAnalyzer.ts`).

### 6. Wall Thickness Validation is a No-Op (HIGH)

**File:** `src/mold-engine/validation/WallThicknessValidator.ts` ~lines 78-95  
**Issue:** The radial distance check computes `maxRadialDist` but never uses the result. `thinAreas` always returns 0, so validation always passes regardless of actual wall thickness.  
**Fix:** Compare `maxRadialDist` against expected mold radius and increment `thinAreas` when the model approaches or exceeds the mold wall.

---

## Medium Findings

### 7. Vase Rim Geometry Discontinuity

**File:** `src/designs/templates/VaseGeometry.ts` ~lines 49-54  
**Issue:** Rim interpolation starts at `t = 1/rimSteps` (not 0), and `sin(π) = 0` at the endpoint creates a flat termination rather than smooth closure. This produces a visible seam in the rim profile.  
**Fix:** Adjust the range so the rim profile smoothly rejoins the inner wall.

### 8. CSGOperation Mutates Base Geometry

**File:** `src/core/csg/CSGOperation.ts` ~lines 89-92  
**Issue:** `csgSubtractMultiple()` mutates the `base` geometry across iterations. If a mid-chain CSG operation fails, the partially-mutated base can't be recovered.  
**Fix:** Clone before the loop or document that callers must pass disposable geometry.

### 9. DraftAnalyzer Creates Color Objects Per-Face

**File:** `src/mold-engine/analysis/DraftAnalyzer.ts` ~line 133  
**Issue:** `COLOR_GOOD.clone().lerp()` allocates a new `Color` for every face. On high-poly meshes this is thousands of unnecessary allocations.  
**Fix:** Use a single reusable `Color` instance and call `.copy(COLOR_GOOD).lerp(...)` in the loop.

### 10. Dead Ternary in geometricStore

**File:** `src/ui/state/geometricStore.ts` ~line 103  
**Issue:** `operation: state.nodes.length === 0 ? 'union' : 'union'` — both branches return the same value, suggesting either confused logic or an incomplete implementation where the first node should have a different default.  
**Fix:** Simplify to `operation: 'union'` or implement the intended branching.

### 11. Planter Inner Lip Can Skip Vertices

**File:** `src/designs/templates/PlanterGeometry.ts` ~lines 62-69  
**Issue:** The backward loop for the inner lip checks `if (lr < lipTopR)` which can skip vertices entirely, creating gaps in the lathe profile that produce holes in the mesh.  
**Fix:** Ensure profile continuity by validating the backward loop generates monotonically-descending radii.

### 12. Race Condition in RightPanel Export

**File:** `src/ui/components/Panels/RightPanel.tsx` ~lines 168-174  
**Issue:** `handleExportModel` reads global state via `getActiveGeometry()`, but state could change mid-callback (e.g., user switches templates during export). No re-entrancy guard exists.  
**Fix:** Snapshot the geometry at callback entry or disable the export button while processing.

### 13. Redundant Normal Recomputation in SceneEvaluator

**File:** `src/designs/geometric/SceneEvaluator.ts` ~lines 43-65  
**Issue:** `computeVertexNormals()` is called three times during `evaluateScene()`. Only the final call matters.  
**Fix:** Remove intermediate calls; compute normals once at the end.

---

## Low Findings

### 14. fileDownload Cleanup is Fragile

**File:** `src/utils/io/fileDownload.ts` ~lines 27-30  
A 100ms `setTimeout` removes the download anchor element. If the browser doesn't trigger the click synchronously, the element could be removed before the download starts.

### 15. STLValidator Index Access is Semantically Wrong

**File:** `src/export/stl/STLValidator.ts` ~line 85  
`index.getX(i * 3)` treats the index buffer as if it stores vector components. Should use `index.array[i * 3]` for direct integer access.

### 16. Magic Numbers in Template Generators

**Files:** All `*Geometry.ts` files  
Hard-coded values for chamfers, offsets, cork insets, and rim bulge ratios are scattered without explanation. Extract as named constants for clarity and tuning.

---

## What's Done Well

- **Worker architecture** — CSG computation is cleanly offloaded via ID-matched request/response. The main thread never blocks on heavy geometry operations.
- **useDisposableGeometry hook** — Correctly tracks and disposes previous Three.js geometries, preventing the most common class of WebGL memory leaks.
- **Error boundaries** — Layout sections are wrapped in ErrorBoundary components, isolating Three.js crashes from killing the entire app.
- **Draft angle analysis** — Per-face normal dot product against pull direction is the correct approach, and the heatmap overlay is well-implemented.
- **Template registry pattern** — Clean separation of template metadata from geometry generators makes adding new templates trivial.
- **Store invalidation cascading** — Zustand stores properly invalidate downstream state (mold generation, analysis) when upstream parameters change.
- **Type discipline** — Strong TypeScript interfaces throughout (`Vec3`, `SceneNode`, `TemplateDefinition`, `MoldConfig`) make the domain model explicit.
