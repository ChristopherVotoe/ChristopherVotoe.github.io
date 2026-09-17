export type Landmark = { x: number; y: number; z: number };

/** Canonical palm coordinates: wrist origin, unit palm, fingers upward, thumb left. */
export function normalizeHand(points: Landmark[], aspect = 1): Landmark[] | null {
  if (points.length !== 21 || !Number.isFinite(aspect) || aspect <= 0 ||
      points.some((p) => ![p.x, p.y, p.z].every(Number.isFinite))) return null;
  const local = points.map((p) => ({ x: (p.x - points[0].x) * aspect, y: p.y - points[0].y, z: (p.z - points[0].z) * aspect }));
  const axis = local[9];
  const scale = Math.hypot(axis.x, axis.y);
  if (scale < 1e-6) return null;
  const ux = axis.x / scale, uy = axis.y / scale;
  const rotated = local.map((p) => ({ x: (-uy * p.x + ux * p.y) / scale, y: -(ux * p.x + uy * p.y) / scale, z: p.z / scale }));
  const sign = rotated[5].x < rotated[17].x ? 1 : -1;
  return rotated.map((p) => ({ ...p, x: p.x * sign }));
}
