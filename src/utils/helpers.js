// Utility helper functions

export const fmt = (v, digits = 2) => {
  return Math.abs(v) < 1e-6 ? '0' : Number(v).toFixed(digits);
};

export const minMax2D = (z) => {
  let min = Infinity;
  let max = -Infinity;
  for (const row of z) {
    for (const v of row) {
      if (v < min) min = v;
      if (v > max) max = v;
    }
  }
  return { min, max };
};

export const average = (arr) => {
  return arr.reduce((a, b) => a + b, 0) / Math.max(1, arr.length);
};

export const integrate = (t, y) => {
  let A = 0;
  for (let i = 1; i < t.length; i++) {
    A += 0.5 * (y[i - 1] + y[i]) * (t[i] - t[i - 1]);
  }
  return A;
};

// Rectangle intersection for overlap detection
export const checkRectOverlap = (r1, r2) => {
  return !(
    r1.x + r1.l <= r2.x ||
    r2.x + r2.l <= r1.x ||
    r1.y + r1.w <= r2.y ||
    r2.y + r2.w <= r1.y
  );
};

// Find overlapping footprints
export const findOverlaps = (rects) => {
  const overlaps = [];
  for (let i = 0; i < rects.length; i++) {
    for (let j = i + 1; j < rects.length; j++) {
      if (checkRectOverlap(rects[i], rects[j])) {
        overlaps.push({ r1: rects[i], r2: rects[j] });
      }
    }
  }
  return overlaps;
};
