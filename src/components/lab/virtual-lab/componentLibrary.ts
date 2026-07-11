/* ============================================================================
 * componentLibrary — static catalogue of every part the Virtual Lab trainer
 * kit can place: 14-pin gate ICs (with real pinouts + gate logic for the
 * simulator), arithmetic/decoder/mux ICs, sequential logic, registers, and
 * bench tools (wire spool, IC extractor).
 * ========================================================================== */

export type PartShape = "chip" | "mux" | "ff" | "tool-wire" | "tool-extractor";

/** One gate inside a multi-gate IC package: which DIP pins are its inputs/output, and its function. */
export interface GateSpec {
  inputs: number[];
  output: number;
  fn: (inputs: boolean[]) => boolean;
}

/** Simulation metadata for a 14-pin logic-gate IC. */
export interface IcLogic {
  vccPin: number;
  gndPin: number;
  gates: GateSpec[];
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
  /** Footprint size in grid cells (w x h) used when snapping to the breadboard. */
  footprint: { w: number; h: number };
  description: string;
  /** Pinout lines (left column top-to-bottom, right column bottom-to-top), DIP convention. */
  pinout?: { left: string[]; right: string[] };
  /** Present only on 14-pin gate ICs the simulator understands. */
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
        footprint: { w: 6, h: 3 },
        description: "Adds two 4-bit numbers with carry-in / carry-out.",
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
        footprint: { w: 7, h: 4 },
        description: "Decodes a 4-bit binary input into 1-of-16 active-low outputs.",
      },
      {
        id: "ic-7447",
        label: "BCD to 7-Segment",
        code: "7447",
        category: "decoders-mux",
        shape: "chip",
        pins: 16,
        footprint: { w: 6, h: 3 },
        description: "Drives a common-anode 7-segment display from a BCD input.",
      },
      {
        id: "mux-4x1",
        label: "4x1 MUX",
        code: "74153",
        category: "decoders-mux",
        shape: "mux",
        pins: 16,
        footprint: { w: 4, h: 3 },
        description: "Selects 1 of 4 inputs using 2 select lines.",
      },
      {
        id: "mux-8x1",
        label: "8x1 MUX",
        code: "74151",
        category: "decoders-mux",
        shape: "mux",
        pins: 16,
        footprint: { w: 4, h: 4 },
        description: "Selects 1 of 8 inputs using 3 select lines.",
      },
      {
        id: "mux-16x1",
        label: "16x1 MUX",
        code: "74150",
        category: "decoders-mux",
        shape: "mux",
        pins: 24,
        footprint: { w: 5, h: 5 },
        description: "Selects 1 of 16 inputs using 4 select lines.",
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
        footprint: { w: 3, h: 3 },
        description: "No invalid state; toggles when J=K=1.",
      },
      {
        id: "ff-d",
        label: "D Flip-Flop",
        code: "7474",
        category: "sequential",
        shape: "ff",
        pins: 14,
        footprint: { w: 3, h: 3 },
        description: "Captures the D input on the clock edge.",
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
        footprint: { w: 5, h: 3 },
        description: "Serial-in, serial-out 8-bit shift register.",
      },
      {
        id: "ic-74164",
        label: "8-Bit Shift Register",
        code: "74164",
        category: "registers",
        shape: "chip",
        pins: 14,
        footprint: { w: 5, h: 3 },
        description: "Serial-in, parallel-out 8-bit shift register.",
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
        label: "IC Extractor",
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

export const WIRE_COLORS = [
  { id: "cyan", swatch: "var(--lab-cyan)" },
  { id: "mint", swatch: "var(--lab-mint)" },
  { id: "warm", swatch: "var(--lab-warm)" },
  { id: "pink", swatch: "var(--lab-pink)" },
  { id: "purple", swatch: "var(--lab-purple)" },
] as const;

export type WireColorId = (typeof WIRE_COLORS)[number]["id"];
