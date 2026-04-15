import * as THREE from 'three';

export interface DraftAnalysisResult {
  /** Per-face draft angles in degrees (0 = vertical wall, 90 = flat top/bottom) */
  faceAngles: Float32Array;
  /** Per-vertex color attribute for heatmap rendering */
  colorAttribute: THREE.BufferAttribute;
  /** Summary statistics */
  stats: DraftStats;
}

export interface DraftStats {
  /** Number of faces with undercuts (negative draft) */
  undercuts: number;
  /** Number of faces below minimum draft angle */
  belowMinimum: number;
  /** Number of faces with acceptable draft */
  acceptable: number;
  /** Minimum draft angle found (degrees) */
  minAngle: number;
  /** Average draft angle (degrees) */
  avgAngle: number;
  /** Percentage of faces that are demoldable */
  demoldablePercent: number;
  /** Overall status */
  status: 'ok' | 'warn' | 'error';
  /** Human-readable detail string */
  detail: string;
}

/** Minimum draft angle (degrees) for reliable demolding */
const MIN_DRAFT_ANGLE = 3;
/** Threshold below which we consider it an undercut */
const UNDERCUT_THRESHOLD = -0.5;

/**
 * Heatmap color ramp:
 *   - Red:    undercut / negative draft (can't demold)
 *   - Orange: 0–3° marginal draft
 *   - Green:  3°+ good draft
 *   - Gray:   ~90° (flat top/bottom, neutral)
 */
const COLOR_UNDERCUT = new THREE.Color(0xdc2626);   // --draft-bad
const COLOR_MARGINAL = new THREE.Color(0xd97706);   // --draft-marginal
const COLOR_GOOD = new THREE.Color(0x16a34a);       // --draft-good
const COLOR_NEUTRAL = new THREE.Color(0x6b6b6b);    // --draft-neutral

/**
 * Analyze draft angles of a geometry relative to a demold direction.
 *
 * Draft angle = 90° - angle between face normal and demold axis.
 * - 90° → face is perpendicular to demold (flat top) = easy
 * - 0°  → face is parallel to demold (vertical wall) = marginal
 * - <0° → undercut, face points inward = can't demold with 1-part
 *
 * @param geometry The model geometry to analyze
 * @param demoldDir The demolding direction (default: +Y, pulling mold straight up)
 */
export function analyzeDraftAngles(
  geometry: THREE.BufferGeometry,
  demoldDir: THREE.Vector3 = new THREE.Vector3(0, 1, 0)
): DraftAnalysisResult {
  // Ensure we have a non-indexed geometry for per-face coloring
  const geo = geometry.index
    ? geometry.toNonIndexed()
    : geometry.clone();

  geo.computeVertexNormals();

  const positions = geo.getAttribute('position');
  const vertexCount = positions.count;
  const faceCount = Math.floor(vertexCount / 3);

  const faceAngles = new Float32Array(faceCount);
  const colors = new Float32Array(vertexCount * 3);

  const normalVec = new THREE.Vector3();
  const demold = demoldDir.clone().normalize();
  // Reusable color instance to avoid allocating per-face
  const tempColor = new THREE.Color();

  let undercuts = 0;
  let belowMinimum = 0;
  let acceptable = 0;
  let minAngle = 180;
  let totalAngle = 0;

  for (let f = 0; f < faceCount; f++) {
    const i = f * 3;

    // Compute face normal from cross product of edges (more accurate than vertex normals)
    const ax = positions.getX(i), ay = positions.getY(i), az = positions.getZ(i);
    const bx = positions.getX(i + 1), by = positions.getY(i + 1), bz = positions.getZ(i + 1);
    const cx = positions.getX(i + 2), cy = positions.getY(i + 2), cz = positions.getZ(i + 2);

    const e1x = bx - ax, e1y = by - ay, e1z = bz - az;
    const e2x = cx - ax, e2y = cy - ay, e2z = cz - az;

    normalVec.set(
      e1y * e2z - e1z * e2y,
      e1z * e2x - e1x * e2z,
      e1x * e2y - e1y * e2x
    ).normalize();

    // Draft angle: how much the face tilts away from the demold direction
    // dot = cos(angle between normal and demold)
    // draft = 90 - acos(dot) in degrees
    // Positive = face opens toward demold (good)
    // Negative = undercut
    const dot = normalVec.dot(demold);
    const angleFromDemold = Math.acos(Math.max(-1, Math.min(1, dot))) * (180 / Math.PI);
    const draftAngle = 90 - angleFromDemold;

    faceAngles[f] = draftAngle;
    totalAngle += draftAngle;

    if (draftAngle < minAngle) minAngle = draftAngle;

    // Classify and assign color (reuse tempColor to avoid per-face allocation)
    if (draftAngle < UNDERCUT_THRESHOLD) {
      undercuts++;
      tempColor.copy(COLOR_UNDERCUT);
    } else if (draftAngle < MIN_DRAFT_ANGLE) {
      belowMinimum++;
      tempColor.copy(COLOR_MARGINAL);
    } else if (draftAngle > 75) {
      // Nearly flat top/bottom — neutral
      acceptable++;
      tempColor.copy(COLOR_NEUTRAL);
    } else {
      acceptable++;
      // Lerp from good toward neutral as angle increases
      const t = Math.min(1, (draftAngle - MIN_DRAFT_ANGLE) / 60);
      tempColor.copy(COLOR_GOOD).lerp(COLOR_NEUTRAL, t * 0.5);
    }

    // Apply color to all 3 vertices of this face
    for (let v = 0; v < 3; v++) {
      const ci = (i + v) * 3;
      colors[ci] = tempColor.r;
      colors[ci + 1] = tempColor.g;
      colors[ci + 2] = tempColor.b;
    }
  }

  const colorAttribute = new THREE.BufferAttribute(colors, 3);

  const avgAngle = faceCount > 0 ? totalAngle / faceCount : 0;
  const demoldablePercent = faceCount > 0
    ? Math.round(((acceptable + belowMinimum) / faceCount) * 100)
    : 100;

  // Determine overall status
  let status: 'ok' | 'warn' | 'error';
  let detail: string;

  if (undercuts > 0) {
    const pct = Math.round((undercuts / faceCount) * 100);
    status = 'error';
    detail = `${undercuts} undercut faces (${pct}%) — cannot demold`;
  } else if (belowMinimum > 0) {
    const pct = Math.round((belowMinimum / faceCount) * 100);
    status = 'warn';
    detail = `${belowMinimum} faces (${pct}%) below ${MIN_DRAFT_ANGLE}° min draft`;
  } else {
    status = 'ok';
    detail = `All faces ≥ ${MIN_DRAFT_ANGLE}° draft — clean demold ✓`;
  }

  return {
    faceAngles,
    colorAttribute,
    stats: {
      undercuts,
      belowMinimum,
      acceptable,
      minAngle: Math.round(minAngle * 10) / 10,
      avgAngle: Math.round(avgAngle * 10) / 10,
      demoldablePercent,
      status,
      detail,
    },
  };
}

/**
 * Builds a non-indexed geometry clone with vertex colors applied
 * for heatmap rendering.
 */
export function buildHeatmapGeometry(
  geometry: THREE.BufferGeometry,
  demoldDir?: THREE.Vector3
): { geometry: THREE.BufferGeometry; stats: DraftStats } {
  const result = analyzeDraftAngles(geometry, demoldDir);

  const geo = geometry.index
    ? geometry.toNonIndexed()
    : geometry.clone();

  geo.computeVertexNormals();
  geo.setAttribute('color', result.colorAttribute);

  return { geometry: geo, stats: result.stats };
}
