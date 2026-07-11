/**
 * Layout + geometry helpers for the K-Map Solver.
 *
 * A single 4-variable K-Map is one 4x4 (or smaller) Gray-coded grid. Beyond
 * 4 variables there's no single flat grid anymore — the textbook convention
 * is to split the extra variable(s) off into multiple side-by-side 4x4
 * "blocks": 5 variables -> two 4x4 blocks, 6 variables -> four 4x4 blocks
 * (2x2 arrangement). This module computes that block layout, and — for
 * prime-implicant groups that live entirely inside one block — the set of
 * rectangles (possibly more than one, if the group wraps around a block's
 * edge) needed to draw a loop around that group.
 */

export const GRAY2 = [0, 1];
export const GRAY4 = [0, 1, 3, 2];

export interface KMapBlockLayout {
  /** Value (0..2^blockVarCount-1) of the leading "block-select" variables for this block. */
  blockValue: number;
  /** Position of this block within the block grid. */
  blockRow: number;
  blockCol: number;
  /** Human label, e.g. "A=0" or "AB=10". */
  label: string;
}

export interface KMapLayout {
  numVars: number;
  /** How many leading (most-significant) variables select which block a cell is in. 0, 1, or 2. */
  blockVarCount: number;
  /** Variables per block (the ones actually drawn on the 2D grid). Always min(numVars, 4). */
  remaining: number;
  rowVars: number;
  colVars: number;
  rowAxis: number[];
  colAxis: number[];
  blockRows: number;
  blockCols: number;
  blocks: KMapBlockLayout[];
}

/** Picks the row/col axis split for a single block, mirroring the classic 2/3/4-var layouts. */
function axesFor(remaining: number): {
  rowVars: number;
  colVars: number;
  rowAxis: number[];
  colAxis: number[];
} {
  if (remaining >= 4) return { rowVars: 2, colVars: 2, rowAxis: GRAY4, colAxis: GRAY4 };
  if (remaining === 3) return { rowVars: 1, colVars: 2, rowAxis: GRAY2, colAxis: GRAY4 };
  if (remaining === 2) return { rowVars: 1, colVars: 1, rowAxis: GRAY2, colAxis: GRAY2 };
  return { rowVars: 1, colVars: 0, rowAxis: GRAY2, colAxis: [0] };
}

export function computeLayout(numVars: number, varNames: string[]): KMapLayout {
  const remaining = Math.min(numVars, 4);
  const blockVarCount = numVars - remaining;
  const { rowVars, colVars, rowAxis, colAxis } = axesFor(remaining);

  const blockRows = blockVarCount === 2 ? 2 : 1;
  const blockCols = blockVarCount >= 1 ? 2 : 1;

  const blocks: KMapBlockLayout[] = [];
  for (let br = 0; br < blockRows; br++) {
    for (let bc = 0; bc < blockCols; bc++) {
      // blockVarCount===1: single select-bit comes from bc (0/1).
      // blockVarCount===2: two select-bits, MSB from br (varNames[0]), LSB from bc (varNames[1]).
      const blockValue = blockVarCount === 2 ? (br << 1) | bc : blockVarCount === 1 ? bc : 0;
      const label =
        blockVarCount === 0
          ? ""
          : blockVarCount === 1
            ? `${varNames[0]}=${bc}`
            : `${varNames[0]}${varNames[1]}=${br}${bc}`;
      blocks.push({ blockValue, blockRow: br, blockCol: bc, label });
    }
  }

  return {
    numVars,
    blockVarCount,
    remaining,
    rowVars,
    colVars,
    rowAxis,
    colAxis,
    blockRows,
    blockCols,
    blocks,
  };
}

/** Minterm index for a cell at (blockValue, rowGray, colGray) under this layout. */
export function cellIndex(
  layout: KMapLayout,
  blockValue: number,
  rowGray: number,
  colGray: number,
): number {
  const blockBits =
    layout.blockVarCount === 0 ? "" : blockValue.toString(2).padStart(layout.blockVarCount, "0");
  const rowBits = layout.rowVars === 0 ? "" : rowGray.toString(2).padStart(layout.rowVars, "0");
  const colBits = layout.colVars === 0 ? "" : colGray.toString(2).padStart(layout.colVars, "0");
  return parseInt(blockBits + rowBits + colBits || "0", 2);
}

/** Splits a sorted set of axis *positions* (indices into the Gray axis array, not raw values)
 * into one or more non-wrapping consecutive runs, treating the axis as circular. Assumes the
 * input is a valid Quine-McCluskey sub-cube (i.e. it truly forms a circularly-contiguous block —
 * always the case here since we derive it from a term's fixed/don't-care bit pattern). */
function splitCircularRuns(positions: number[], axisLen: number): number[][] {
  if (positions.length === 0) return [];
  const sorted = [...positions].sort((a, b) => a - b);
  if (sorted.length === axisLen) return [sorted];

  const segments: number[][] = [];
  let current: number[] = [sorted[0]];
  for (let i = 1; i < sorted.length; i++) {
    const prev = sorted[i - 1];
    const cur = sorted[i];
    if (cur === prev + 1) {
      current.push(cur);
    } else {
      segments.push(current);
      current = [cur];
    }
  }
  segments.push(current);

  // Each segment here is already a plain (non-wrapping) consecutive run of
  // position-indices — exactly what's needed to draw one rectangle per
  // segment. A group that wraps around the axis edge (e.g. positions {0,3}
  // on a length-4 axis) intentionally stays as two separate single-cell
  // segments rather than being merged, since that's how such a wrap-around
  // loop is conventionally drawn: as two pieces touching opposite edges.
  return segments;
}

export interface LoopRect {
  /** Position-space (0-based index into the axis array), inclusive range. */
  rowStart: number;
  rowEnd: number;
  colStart: number;
  colEnd: number;
}

/**
 * Given a term's bit pattern restricted to a single block (i.e. with the leading
 * blockVarCount characters already stripped), computes the rectangle(s) needed
 * to draw a loop around it. Returns [] if the pattern doesn't collapse to a
 * clean axis-aligned block (shouldn't happen for genuine QM prime implicants).
 */
export function loopRectsForPattern(pattern: string, layout: KMapLayout): LoopRect[] {
  const { rowVars, colVars, rowAxis, colAxis } = layout;
  const rowPattern = pattern.slice(0, rowVars);
  const colPattern = pattern.slice(rowVars, rowVars + colVars);

  const matches = (value: number, pat: string) => {
    const bits = value.toString(2).padStart(pat.length, "0");
    for (let i = 0; i < pat.length; i++) {
      if (pat[i] !== "-" && pat[i] !== bits[i]) return false;
    }
    return true;
  };

  const rowPositions: number[] = [];
  rowAxis.forEach((grayVal, pos) => {
    if (matches(grayVal, rowPattern)) rowPositions.push(pos);
  });
  const colPositions: number[] = [];
  colAxis.forEach((grayVal, pos) => {
    if (matches(grayVal, colPattern)) colPositions.push(pos);
  });

  const rowRuns = splitCircularRuns(rowPositions, rowAxis.length);
  const colRuns = splitCircularRuns(colPositions, colAxis.length);
  if (rowRuns.length === 0 || colRuns.length === 0) return [];

  const rects: LoopRect[] = [];
  for (const rr of rowRuns) {
    for (const cr of colRuns) {
      rects.push({
        rowStart: rr[0],
        rowEnd: rr[rr.length - 1],
        colStart: cr[0],
        colEnd: cr[cr.length - 1],
      });
    }
  }
  return rects;
}