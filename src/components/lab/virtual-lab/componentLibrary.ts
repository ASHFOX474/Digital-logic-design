/* ============================================================================
 * componentLibrary — static catalogue of every part the Virtual Lab trainer
 * kit can place: gate ICs, arithmetic/decoder/mux ICs, sequential logic,
 * registers, and bench tools (wire spool, IC extractor). Every non-tool part
 * carries a real DIP pinout plus enough simulation metadata (`logic`) for the
 * netlist solver in simulate.ts to actually drive it — combinational chips
 * via `gates`/`combinational`, clocked chips via `sequential`.
 * ========================================================================== */

export type PartShape = "chip" | "mux" | "ff" | "tool-wire" | "tool-extractor";

/** One gate inside a multi-gate IC package: which DIP pins are its inputs/output, and its function. */
export interface GateSpec {
  inputs: number[];
  output: number;
  fn: (inputs: boolean[]) => boolean;
}

/** Reads a DIP pin's current electrical value (true = HIGH). */
export type PinReader = (pin: number) => boolean;

/** One independently-clocked storage element inside an IC (e.g. one half of a dual flip-flop,
 *  or the 8-bit shift chain of a register). Its bits persist in the placed component's
 *  `seqState` across renders and only change on a rising edge of `clockPin`. */
export interface SequentialElement {
  /** DIP pin whose rising edge (only counted when wired to the trainer kit's clock generator
   *  tap) advances this element's state. */
  clockPin: number;
  /** How many bits of state this element owns. */
  stateBits: number;
  /** Computes the next state from the current state + live pin values, evaluated once per
   *  rising clock edge. */
  next: (state: boolean[], pin: PinReader) => boolean[];
  /** Derives every pin this element drives from its current state; re-evaluated continuously
   *  (not just on clock edges) so outputs like Q/Q̄ stay live between pulses. */
  outputs: (state: boolean[]) => Record<number, boolean>;
}

/** Simulation metadata for a DIP IC. Combinational chips populate `gates` (simple per-gate
 *  logic, e.g. quad 2-input gate packages) or `combinational` (whole-chip functions like
 *  adders/decoders/muxes that read/drive many pins at once). Clocked chips populate
 *  `sequential` instead. A chip only computes while its VCC/GND pins are actually wired to
 *  the real power rails. */
export interface IcLogic {
  vccPin: number;
  gndPin: number;
  gates?: GateSpec[];
  combinational?: (pin: PinReader) => Record<number, boolean>;
  sequential?: SequentialElement[];
}

export interface PartDef {
  id: string;
  label: string;
  /** Short part / package code shown next to the label, e.g. "7408". */
  code: string;
  category: string;
  shape: PartShape;
  /** DIP pin count. */
  pins: number;
  /** Footprint size in grid cells (w x h) — informational only (shown in the sidebar);
   *  actual on-board size is derived from `pins` for every DIP part. */
  footprint: { w: number; h: number };
  description: string;
  /** Pinout lines (left column top-to-bottom, right column bottom-to-top), DIP convention. */
  pinout?: { left: string[]; right: string[] };
  /** Present on every part the simulator understands (every IC except bench tools). */
  logic?: IcLogic;
}

export interface PartCategory {
  id: string;
  label: string;
  parts: PartDef[];
}

const AND2 = (a: boolean[]) => a[0] && a[1];
const OR2 = (a: boolean[]) => a[0] || a[1];
const NAND2 = (a: boolean[]) => !(a[0] && a[1]);
const NOR2 = (a: boolean[]) => !(a[0] || a[1]);
const XOR2 = (a: boolean[]) => a[0] !== a[1];
const NOT1 = (a: boolean[]) => !a[0];

/** Standard quad 2-input pin layout shared by 7400 / 7408 / 7432 / 7486. */
const QUAD2_GATES = (fn: (a: boolean[]) => boolean): GateSpec[] => [
  { inputs: [1, 2], output: 3, fn },
  { inputs: [4, 5], output: 6, fn },
  { inputs: [9, 10], output: 8, fn },
  { inputs: [12, 13], output: 11, fn },
];

/** a XOR b XOR cin, plus the carry-out — the one full-adder building block every
 *  ripple-carry adder (and the 7483) is made of. */
function fullAdder(a: boolean, b: boolean, cin: boolean) {
  const sum = a !== b !== cin;
  const cout = (a && b) || (cin && (a !== b));
  return { sum, cout };
}

/** J/K flip-flop next-state rule shared by both halves of the 7476. */
function jkNext(q: boolean, j: boolean, k: boolean) {
  if (j && k) return !q; // toggle
  if (j) return true;
  if (k) return false;
  return q; // hold
}

export const COMPONENT_LIBRARY: PartCategory[] = [
  {
    id: "gate-ics",
    label: "Logic Gate ICs",
    parts: [
      {
        id: "ic-7408",
        label: "Quad 2-Input AND",
        code: "7408",
        category: "gate-ics",
        shape: "chip",
        pins: 14,
        footprint: { w: 7, h: 2 },
        description: "Four independent 2-input AND gates. Pin 7 = GND, Pin 14 = VCC.",
        pinout: {
          left: ["1A", "1B", "1Y", "2A", "2B", "2Y", "GND"],
          right: ["VCC", "4B", "4A", "4Y", "3B", "3A", "3Y"],
        },
        logic: { vccPin: 14, gndPin: 7, gates: QUAD2_GATES(AND2) },
      },
      {
        id: "ic-7432",
        label: "Quad 2-Input OR",
        code: "7432",
        category: "gate-ics",
        shape: "chip",
        pins: 14,
        footprint: { w: 7, h: 2 },
        description: "Four independent 2-input OR gates. Pin 7 = GND, Pin 14 = VCC.",
        pinout: {
          left: ["1A", "1B", "1Y", "2A", "2B", "2Y", "GND"],
          right: ["VCC", "4B", "4A", "4Y", "3B", "3A", "3Y"],
        },
        logic: { vccPin: 14, gndPin: 7, gates: QUAD2_GATES(OR2) },
      },
      {
        id: "ic-7404",
        label: "Hex Inverter",
        code: "7404",
        category: "gate-ics",
        shape: "chip",
        pins: 14,
        footprint: { w: 7, h: 2 },
        description: "Six independent NOT gates. Pin 7 = GND, Pin 14 = VCC.",
        pinout: {
          left: ["1A", "1Y", "2A", "2Y", "3A", "3Y", "GND"],
          right: ["VCC", "6A", "6Y", "5A", "5Y", "4A", "4Y"],
        },
        logic: {
          vccPin: 14,
          gndPin: 7,
          gates: [
            { inputs: [1], output: 2, fn: NOT1 },
            { inputs: [3], output: 4, fn: NOT1 },
            { inputs: [5], output: 6, fn: NOT1 },
            { inputs: [9], output: 8, fn: NOT1 },
            { inputs: [11], output: 10, fn: NOT1 },
            { inputs: [13], output: 12, fn: NOT1 },
          ],
        },
      },
      {
        id: "ic-7400",
        label: "Quad 2-Input NAND",
        code: "7400",
        category: "gate-ics",
        shape: "chip",
        pins: 14,
        footprint: { w: 7, h: 2 },
        description: "Four independent 2-input NAND gates — universal gate. Pin 7 = GND, Pin 14 = VCC.",
        pinout: {
          left: ["1A", "1B", "1Y", "2A", "2B", "2Y", "GND"],
          right: ["VCC", "4B", "4A", "4Y", "3B", "3A", "3Y"],
        },
        logic: { vccPin: 14, gndPin: 7, gates: QUAD2_GATES(NAND2) },
      },
      {
        id: "ic-7402",
        label: "Quad 2-Input NOR",
        code: "7402",
        category: "gate-ics",
        shape: "chip",
        pins: 14,
        footprint: { w: 7, h: 2 },
        description: "Four independent 2-input NOR gates — universal gate. Pin 7 = GND, Pin 14 = VCC.",
        pinout: {
          left: ["1Y", "1A", "1B", "2Y", "2A", "2B", "GND"],
          right: ["VCC", "4Y", "4B", "4A", "3Y", "3B", "3A"],
        },
        logic: {
          vccPin: 14,
          gndPin: 7,
          gates: [
            { inputs: [2, 3], output: 1, fn: NOR2 },
            { inputs: [5, 6], output: 4, fn: NOR2 },
            { inputs: [8, 9], output: 10, fn: NOR2 },
            { inputs: [11, 12], output: 13, fn: NOR2 },
          ],
        },
      },
      {
        id: "ic-7486",
        label: "Quad 2-Input XOR",
        code: "7486",
        category: "gate-ics",
        shape: "chip",
        pins: 14,
        footprint: { w: 7, h: 2 },
        description: "Four independent 2-input XOR gates. Pin 7 = GND, Pin 14 = VCC.",
        pinout: {
          left: ["1A", "1B", "1Y", "2A", "2B", "2Y", "GND"],
          right: ["VCC", "4B", "4A", "4Y", "3B", "3A", "3Y"],
        },
        logic: { vccPin: 14, gndPin: 7, gates: QUAD2_GATES(XOR2) },
      },
    ],
  },
  {
    id: "arithmetic",
    label: "Arithmetic ICs",
    parts: [
      {
        id: "ic-7483",
        label: "4-Bit Full Adder",
        code: "7483",
        category: "arithmetic",
        shape: "chip",
        pins: 16,
        footprint: { w: 8, h: 2 },
        description: "Adds two 4-bit numbers (A1-A4 + B1-B4) with carry-in (C0) / carry-out (C4). Pin 5 = VCC, Pin 12 = GND.",
        pinout: {
          left: ["A4", "S3", "A3", "B3", "VCC", "S2", "B2", "A2"],
          right: ["B4", "S4", "C4", "C0", "B1", "A1", "S1", "GND"],
        },
        logic: {
          vccPin: 5,
          gndPin: 12,
          combinational: (pin) => {
            const a = [pin(10), pin(8), pin(3), pin(1)]; // A1..A4
            const b = [pin(11), pin(7), pin(4), pin(16)]; // B1..B4
            const sumPins = [9, 6, 2, 15]; // S1..S4
            let carry = pin(13); // C0
            const out: Record<number, boolean> = {};
            for (let i = 0; i < 4; i++) {
              const { sum, cout } = fullAdder(a[i], b[i], carry);
              out[sumPins[i]] = sum;
              carry = cout;
            }
            out[14] = carry; // C4
            return out;
          },
        },
      },
    ],
  },
  {
    id: "decoders-mux",
    label: "Decoders / Multiplexers",
    parts: [
      {
        id: "ic-74154",
        label: "4-to-16 Decoder",
        code: "74154",
        category: "decoders-mux",
        shape: "chip",
        pins: 24,
        footprint: { w: 12, h: 2 },
        description:
          "Decodes a 4-bit binary input (A-D) into 1-of-16 active-low outputs (Y0-Y15) when both strobes (G1, G2) are low. Pin 24 = VCC, Pin 12 = GND.",
        pinout: {
          left: ["Y0", "Y1", "Y2", "Y3", "Y4", "Y5", "Y6", "Y7", "Y8", "Y9", "Y10", "GND"],
          right: ["VCC", "Y15", "Y14", "Y13", "Y12", "Y11", "D", "C", "B", "A", "G2", "G1"],
        },
        logic: {
          vccPin: 24,
          gndPin: 12,
          combinational: (pin) => {
            const A = pin(23), B = pin(22), C = pin(21), D = pin(20);
            const sel = (D ? 8 : 0) + (C ? 4 : 0) + (B ? 2 : 0) + (A ? 1 : 0);
            const enabled = !pin(18) && !pin(19); // G1, G2 active low
            const yPins = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 13, 14, 15, 16, 17];
            const out: Record<number, boolean> = {};
            yPins.forEach((p, i) => (out[p] = !(enabled && i === sel)));
            return out;
          },
        },
      },
      {
        id: "ic-7447",
        label: "BCD to 7-Segment",
        code: "7447",
        category: "decoders-mux",
        shape: "chip",
        pins: 16,
        footprint: { w: 8, h: 2 },
        description:
          "Drives a common-anode 7-segment display (active-low a-g) from a BCD input (A-D). LT (pin 3, lamp test) and BI/RBO (pin 4, blanking) are active-low and read LOW when unwired in this simulator — LT floating forces every segment on, and BI/RBO floating blanks the display — so tie both to the VCC bus for normal decoding. RBI (pin 5, ripple blank) only matters if you want to display a '0'; tie it to VCC too, or leave it low to blank a leading zero. Pin 16 = VCC, Pin 8 = GND.",
        pinout: {
          left: ["B", "C", "LT", "BI/RBO", "RBI", "D", "A", "GND"],
          right: ["VCC", "f", "g", "a", "b", "c", "d", "e"],
        },
        logic: {
          vccPin: 16,
          gndPin: 8,
          combinational: (pin) => {
            const A = pin(7), B = pin(1), C = pin(2), D = pin(6);
            const val = (D ? 8 : 0) + (C ? 4 : 0) + (B ? 2 : 0) + (A ? 1 : 0);
            const LT = pin(3);
            const BI = pin(4);
            const RBI = pin(5);
            // Active-low segment patterns [a,b,c,d,e,f,g] for digits 0-9 (1 = segment off).
            const DIGITS: Record<number, number[]> = {
              0: [0, 0, 0, 0, 0, 0, 1],
              1: [1, 0, 0, 1, 1, 1, 1],
              2: [0, 0, 1, 0, 0, 1, 0],
              3: [0, 0, 0, 0, 1, 1, 0],
              4: [1, 0, 0, 1, 1, 0, 0],
              5: [0, 1, 0, 0, 1, 0, 0],
              6: [0, 1, 0, 0, 0, 0, 0],
              7: [0, 0, 0, 1, 1, 1, 1],
              8: [0, 0, 0, 0, 0, 0, 0],
              9: [0, 0, 0, 0, 1, 0, 0],
            };
            const ALL_OFF = [1, 1, 1, 1, 1, 1, 1];
            const ALL_ON = [0, 0, 0, 0, 0, 0, 0];
            let segs: number[];
            if (!LT) segs = ALL_ON; // lamp test overrides everything
            else if (!BI) segs = ALL_OFF; // unconditional blank
            else if (val === 0 && !RBI) segs = ALL_OFF; // ripple-blank a leading/trailing zero
            else segs = DIGITS[val] ?? ALL_OFF; // 10-15: undefined BCD, blank
            const segPins = [13, 12, 11, 10, 9, 15, 14]; // a,b,c,d,e,f,g
            const out: Record<number, boolean> = {};
            segPins.forEach((p, i) => (out[p] = !!segs[i]));
            return out;
          },
        },
      },
      {
        id: "mux-4x1",
        label: "4x1 MUX",
        code: "74153",
        category: "decoders-mux",
        shape: "mux",
        pins: 16,
        footprint: { w: 8, h: 2 },
        description:
          "Dual 4-to-1 multiplexer sharing select lines A/B; each half has its own active-low strobe (1G, 2G). Pin 16 = VCC, Pin 8 = GND.",
        pinout: {
          left: ["1G", "B", "1C3", "1C2", "1C1", "1C0", "1Y", "GND"],
          right: ["VCC", "A", "2G", "2C3", "2C2", "2C1", "2C0", "2Y"],
        },
        logic: {
          vccPin: 16,
          gndPin: 8,
          combinational: (pin) => {
            const A = pin(14), B = pin(2);
            const sel = (B ? 2 : 0) + (A ? 1 : 0);
            const c1 = [pin(6), pin(5), pin(4), pin(3)]; // 1C0..1C3
            const c2 = [pin(10), pin(11), pin(12), pin(13)]; // 2C0..2C3
            const g1 = !pin(1);
            const g2 = !pin(15);
            return { 7: g1 && c1[sel], 9: g2 && c2[sel] };
          },
        },
      },
      {
        id: "mux-8x1",
        label: "8x1 MUX",
        code: "74151",
        category: "decoders-mux",
        shape: "mux",
        pins: 16,
        footprint: { w: 8, h: 2 },
        description:
          "Selects 1 of 8 inputs (D0-D7) using select lines C/B/A, gated by an active-low strobe. Y = selected input, W = its complement. Pin 16 = VCC, Pin 8 = GND.",
        pinout: {
          left: ["D3", "D2", "D1", "D0", "Y", "W", "STROBE", "GND"],
          right: ["VCC", "D4", "D5", "D6", "D7", "C", "B", "A"],
        },
        logic: {
          vccPin: 16,
          gndPin: 8,
          combinational: (pin) => {
            const sel = (pin(9) ? 4 : 0) + (pin(10) ? 2 : 0) + (pin(11) ? 1 : 0); // C,B,A
            const d = [pin(4), pin(3), pin(2), pin(1), pin(15), pin(14), pin(13), pin(12)]; // D0..D7
            const enabled = !pin(7); // STROBE active low
            const y = enabled && d[sel];
            return { 5: y, 6: !y };
          },
        },
      },
      {
        id: "mux-16x1",
        label: "16x1 MUX",
        code: "74150",
        category: "decoders-mux",
        shape: "mux",
        pins: 24,
        footprint: { w: 12, h: 2 },
        description:
          "Selects 1 of 16 inputs (E0-E15) using select lines D/C/B/A, gated by an active-low strobe. Output W is the complement of the selected input. Pin 24 = VCC, Pin 12 = GND.",
        pinout: {
          left: ["E7", "E6", "E5", "E4", "E3", "E2", "E1", "E0", "STROBE", "W", "D", "GND"],
          right: ["VCC", "E8", "E9", "E10", "E11", "E12", "E13", "E14", "E15", "C", "B", "A"],
        },
        logic: {
          vccPin: 24,
          gndPin: 12,
          combinational: (pin) => {
            const sel = (pin(11) ? 8 : 0) + (pin(13) ? 4 : 0) + (pin(14) ? 2 : 0) + (pin(15) ? 1 : 0); // D,C,B,A
            const ePins = [8, 7, 6, 5, 4, 3, 2, 1, 23, 22, 21, 20, 19, 18, 17, 16]; // E0..E15
            const enabled = !pin(9); // STROBE active low
            const w = enabled ? !pin(ePins[sel]) : true;
            return { 10: w };
          },
        },
      },
    ],
  },
  {
    id: "sequential",
    label: "Sequential Logic",
    parts: [
      {
        id: "ff-jk",
        label: "JK Flip-Flop",
        code: "7476",
        category: "sequential",
        shape: "ff",
        pins: 16,
        footprint: { w: 8, h: 2 },
        description:
          "Dual JK flip-flop. No invalid state; toggles when J=K=1. Wire CLK1/CLK2 to the CLK TAP to clock each half. 1PR (pin 2), 1CLR (pin 3), 2PR (pin 8), 2CLR (pin 9) are active-low — an unwired pin reads LOW in this simulator, which asserts it, so tie all four to the VCC bus for normal operation and only pull one low (e.g. to a switch) to preset/clear that half. Pin 5 = VCC, Pin 13 = GND.",
        pinout: {
          left: ["1CLK", "1PR", "1CLR", "1J", "VCC", "2CLK", "2J", "2PR"],
          right: ["1K", "1Q", "1Q\u0305", "GND", "2CLR", "2K", "2Q", "2Q\u0305"],
        },
        logic: {
          vccPin: 5,
          gndPin: 13,
          sequential: [
            {
              clockPin: 1,
              stateBits: 1,
              next: (state, pin) => {
                const clr = !pin(2);
                const pr = !pin(3);
                if (clr) return [false];
                if (pr) return [true];
                return [jkNext(state[0], pin(4), pin(14))];
              },
              outputs: (state) => ({ 15: state[0], 16: !state[0] }),
            },
            {
              clockPin: 6,
              stateBits: 1,
              next: (state, pin) => {
                const clr = !pin(9);
                const pr = !pin(8);
                if (clr) return [false];
                if (pr) return [true];
                return [jkNext(state[0], pin(7), pin(10))];
              },
              outputs: (state) => ({ 11: state[0], 12: !state[0] }),
            },
          ],
        },
      },
      {
        id: "ff-d",
        label: "D Flip-Flop",
        code: "7474",
        category: "sequential",
        shape: "ff",
        pins: 14,
        footprint: { w: 7, h: 2 },
        description:
          "Dual D flip-flop. Captures D on the clock edge — wire CLK1/CLK2 to the CLK TAP. 1CLR (pin 1), 1PR (pin 4), 2PR (pin 10), 2CLR (pin 13) are active-low — an unwired pin reads LOW in this simulator, which asserts it, so tie all four to the VCC bus for normal operation and only pull one low (e.g. to a switch) to preset/clear that half. Pin 14 = VCC, Pin 7 = GND.",
        pinout: {
          left: ["1CLR", "1D", "1CLK", "1PR", "1Q", "1Q\u0305", "GND"],
          right: ["VCC", "2Q\u0305", "2Q", "2PR", "2CLK", "2D", "2CLR"],
        },
        logic: {
          vccPin: 14,
          gndPin: 7,
          sequential: [
            {
              clockPin: 3,
              stateBits: 1,
              next: (state, pin) => {
                const clr = !pin(1);
                const pr = !pin(4);
                if (clr) return [false];
                if (pr) return [true];
                return [pin(2)];
              },
              outputs: (state) => ({ 5: state[0], 6: !state[0] }),
            },
            {
              clockPin: 11,
              stateBits: 1,
              next: (state, pin) => {
                const clr = !pin(13);
                const pr = !pin(10);
                if (clr) return [false];
                if (pr) return [true];
                return [pin(12)];
              },
              outputs: (state) => ({ 9: state[0], 8: !state[0] }),
            },
          ],
        },
      },
    ],
  },
  {
    id: "registers",
    label: "Registers / Counters",
    parts: [
      {
        id: "ic-7491a",
        label: "8-Bit Shift Register",
        code: "7491A",
        category: "registers",
        shape: "chip",
        pins: 14,
        footprint: { w: 7, h: 2 },
        description:
          "Serial-in, serial-out 8-bit shift register — only the final stage (Q) is exposed. Data in = A AND B, gated shift on each CLK rising edge (wire CLK to the CLK TAP). Pin 5 = VCC, Pin 10 = GND.",
        pinout: {
          left: ["NC", "NC", "NC", "NC", "VCC", "NC", "NC"],
          right: ["NC", "CLK", "GND", "E", "D", "Q", "Q\u0305"],
        },
        logic: {
          vccPin: 5,
          gndPin: 10,
          sequential: [
            {
              clockPin: 9,
              stateBits: 8,
              next: (state, pin) => {
                const din = pin(12) && pin(11); // D AND E
                return [din, ...state.slice(0, 7)];
              },
              outputs: (state) => ({ 13: state[7], 14: !state[7] }),
            },
          ],
        },
      },
      {
        id: "ic-74164",
        label: "8-Bit Shift Register",
        code: "74164",
        category: "registers",
        shape: "chip",
        pins: 14,
        footprint: { w: 7, h: 2 },
        description:
          "Serial-in, parallel-out 8-bit shift register (QA-QH). Data in = A AND B, shifts on each CLK rising edge (wire CLK to the CLK TAP). CLR (/MR, pin 9) is active-low and asynchronous — tie it to the VCC bus for normal operation, or pull it low (wire to GND / a switch) to reset. Pin 14 = VCC, Pin 7 = GND.",
        pinout: {
          left: ["A", "B", "QA", "QB", "QC", "QD", "GND"],
          right: ["VCC", "QH", "QG", "QF", "QE", "CLR", "CLK"],
        },
        logic: {
          vccPin: 14,
          gndPin: 7,
          sequential: [
            {
              clockPin: 8,
              stateBits: 8,
              next: (state, pin) => {
                if (!pin(9)) return Array(8).fill(false); // CLR (/MR), active low, async on real hw
                const din = pin(1) && pin(2); // A AND B
                return [din, ...state.slice(0, 7)];
              },
              outputs: (state) => ({
                3: state[0],
                4: state[1],
                5: state[2],
                6: state[3],
                10: state[4],
                11: state[5],
                12: state[6],
                13: state[7],
              }),
            },
          ],
        },
      },
    ],
  },
  {
    id: "tools",
    label: "Tools",
    parts: [
      {
        id: "tool-wire-spool",
        label: "Wire Spool",
        code: "TOOL",
        category: "tools",
        shape: "tool-wire",
        pins: 0,
        footprint: { w: 1, h: 1 },
        description: "Click two board holes to route a wire between them.",
      },
      {
        id: "tool-ic-extractor",
        label: "IC & wire Extractor",
        code: "TOOL",
        category: "tools",
        shape: "tool-extractor",
        pins: 0,
        footprint: { w: 1, h: 1 },
        description: "Click a placed component or wire to remove it from the board.",
      },
    ],
  },
];

export const ALL_PARTS: Record<string, PartDef> = Object.fromEntries(
  COMPONENT_LIBRARY.flatMap((cat) => cat.parts.map((p) => [p.id, p])),
);

/**
 * Jumper-wire palette. Hues are spread evenly around the wheel (~35-40°
 * apart) at similar lightness/chroma so any two colors stay easy to tell
 * apart even when several wires cross in a dense circuit — that matters more
 * than matching the board's own semantic colors (VCC pink, GND cyan, LED
 * mint, clock warm), which is why those aren't just reused here: a wire that
 * happens to share a rail's own color used to disappear next to it.
 */
export const WIRE_COLORS = [
  { id: "red", swatch: "oklch(0.62 0.23 25)" },
  { id: "orange", swatch: "oklch(0.72 0.19 55)" },
  { id: "yellow", swatch: "oklch(0.86 0.17 95)" },
  { id: "green", swatch: "oklch(0.74 0.19 145)" },
  { id: "cyan", swatch: "oklch(0.78 0.14 200)" },
  { id: "blue", swatch: "oklch(0.62 0.20 255)" },
  { id: "purple", swatch: "oklch(0.62 0.21 300)" },
  { id: "pink", swatch: "oklch(0.70 0.22 340)" },
  { id: "white", swatch: "oklch(0.93 0.01 90)" },
] as const;

export type WireColorId = (typeof WIRE_COLORS)[number]["id"];