export type SmilePoint = { x: number; y: number; z: number };
export type SmileShape = { center: [number, number]; axis: [number, number]; width: number; strength: number };

/** Return no deformation for a missing face, an existing smile, or an open mouth. */
export function smileShape(points: SmilePoint[] | undefined, categories: { categoryName: string; score: number }[], width: number, height: number): SmileShape | null {
  if (!points || points.length < 292 || !width || !height) return null;
  const scores = new Map(categories.map((c) => [c.categoryName, c.score]));
  const leftSmile = scores.get("mouthSmileLeft"), rightSmile = scores.get("mouthSmileRight"), jaw = scores.get("jawOpen");
  if (leftSmile === undefined || rightSmile === undefined || jaw === undefined) return null;
  const smile = Math.max(leftSmile, rightSmile);
  if (smile >= .45 || jaw > .35) return null;
  const corners = [points[61], points[291]].sort((a, b) => a.x - b.x);
  if (corners.some((p) => ![p.x, p.y, p.z].every(Number.isFinite))) return null;
  const dx = (corners[1].x - corners[0].x) * width;
  const dy = (corners[1].y - corners[0].y) * height;
  const span = Math.hypot(dx, dy);
  if (span < 24 || span > width * .5 || Math.abs(dy / span) > .6 || Math.abs(corners[1].z - corners[0].z) * width / span > .65) return null;
  return {
    center: [(corners[0].x + corners[1].x) * width / 2, (corners[0].y + corners[1].y) * height / 2],
    axis: [dx / span, dy / span], width: span,
    strength: Math.max(0, Math.min(1, (.45 - smile) / .35)),
  };
}
