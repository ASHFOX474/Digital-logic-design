/* ============================================================================
 * breadboardGeometry — single source of truth for the trainer-kit breadboard
 * grid (a real "half" breadboard: one row of terminal/bus holes, a 5-row
 * block, the centre gutter, another 5-row block, one more bus row). Both the
 * SVG renderer (TrainerKit) and the netlist simulator (simulate.ts) import
 * these constants/helpers so a hole drawn at a given pixel always resolves
 * to the same electrical node.
 * ========================================================================== */

export const HOLE = 22;
export const COLS = 30; // number of breadboard columns (this is "half" a full-size board) — widened from 22 to give more room to build circuits

export const MATRIX_X = 260;

// Row 'a' (top-most row of the top 5-row block)
export const TOPBLOCK_Y = 258;
// Row 'f' (top-most row of the bottom 5-row block, after the centre gutter)
export const BOTBLOCK_Y = TOPBLOCK_Y + 4 * HOLE + 42;

export const VCC_BUS_Y = TOPBLOCK_Y - 46;
export const OUTPUT_TAP_Y = VCC_BUS_Y - 34;

/** Half-gap (px) between the two +5V edge terminals and VCC_BUS_Y — i.e. the
 * terminals sit at VCC_BUS_Y ± VCC_TERMINAL_GAP. Bumped up to space the two
 * +5V nodes further apart so they're easier to tell apart and wire to. */
export const VCC_TERMINAL_GAP = 26;

export const GND_BUS_Y = BOTBLOCK_Y + 4 * HOLE + 46;
export const INPUT_TAP_Y = GND_BUS_Y + 34;

export const MATRIX_SPAN = (COLS - 1) * HOLE;
export const MATRIX_RIGHT_X = MATRIX_X + MATRIX_SPAN;

export function colX(c: number) {
  return MATRIX_X + c * HOLE;
}

export function topRowY(r: number) {
  return TOPBLOCK_Y + r * HOLE; // r: 0=a .. 4=e
}

export function botRowY(r: number) {
  return BOTBLOCK_Y + r * HOLE; // r: 0=f .. 4=j
}

/** Evenly spaced x positions for the 8 I/O taps, spanning the matrix width. */
export function tapX(i: number, count = 8) {
  return MATRIX_X + (i * MATRIX_SPAN) / (count - 1);
}

/** Node key for a top-block matrix hole in column c (all 5 rows a-e share this node). */
export function topNode(c: number) {
  return `mt${c}`;
}
/** Node key for a bottom-block matrix hole in column c (all 5 rows f-j share this node). */
export function botNode(c: number) {
  return `mb${c}`;
}

/** Given a dropped 14-pin IC's centre x, snap to the left-most straddled column (0..COLS-7). */
export function icColumn(compX: number) {
  const c0 = Math.round((compX - MATRIX_X - (6 * HOLE) / 2) / HOLE);
  return Math.min(Math.max(c0, 0), COLS - 7);
}

/**
 * Maps a 1-14 DIP pin number to the breadboard node it lands on when the IC
 * straddles the gutter at left column c0: pins 1-7 run left-to-right along
 * the bottom block's row nearest the gutter (row 'f'); pins 8-14 run
 * right-to-left back along the top block's row nearest the gutter (row 'e').
 */
export function pinToNode(pin: number, c0: number): string {
  if (pin >= 1 && pin <= 7) return botNode(c0 + (pin - 1));
  const idx = pin - 8; // 0..6
  return topNode(c0 + (6 - idx));
}

export const VCC_NODE = "VCC";
export const GND_NODE = "GND";
export const CLK_NODE = "CLK";
export const inputTapNode = (i: number) => `IN${i}`;
export const outputTapNode = (i: number) => `OUT${i}`;