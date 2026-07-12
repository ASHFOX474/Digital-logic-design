import { ALL_PARTS, type PartDef } from "./componentLibrary";
import { icColumn, pinToNode, VCC_NODE, GND_NODE, CLK_NODE, inputTapNode, outputTapNode } from "./breadboardGeometry";
import type { PlacedComponent, Wire } from "./TrainerKit";

/* ============================================================================
 * simulate — a tiny digital netlist solver for the trainer kit.
 *
 * 1. A union-find merges every hole/tap/terminal that a wire connects.
 * 2. Known sources (VCC, GND, the 8 input switches, the clock) seed values.
 * 3. Each placed IC only computes while its VCC/GND pins are actually wired
 *    to the real rails. Combinational ICs (`gates` / `combinational`) then
 *    drive their output pins straight from their inputs. Sequential ICs
 *    (`sequential`) drive their outputs from state that only changes on a
 *    clock edge — that state lives outside this module (see `SeqState`) and
 *    is advanced once per rising edge by `advanceSequential`.
 * 4. A few passes let chained combinational ICs (IC -> wire -> IC) settle.
 * ========================================================================== */

/** Per-placed-component persisted flip-flop / shift-register state, keyed by component id.
 *  Each value is the concatenation of every `SequentialElement`'s bits, in declaration order. */
export type SeqState = Record<string, boolean[]>;

class DSU {
  private parent = new Map<string, string>();
  find(x: string): string {
    if (!this.parent.has(x)) this.parent.set(x, x);
    let root = x;
    while (this.parent.get(root) !== root) root = this.parent.get(root)!;
    let cur = x;
    while (this.parent.get(cur) !== root) {
      const next = this.parent.get(cur)!;
      this.parent.set(cur, root);
      cur = next;
    }
    return root;
  }
  union(a: string, b: string) {
    const ra = this.find(a);
    const rb = this.find(b);
    if (ra !== rb) this.parent.set(ra, rb);
  }
}

function placedIcs(placedComponents: PlacedComponent[]) {
  return placedComponents
    .map((comp) => ({ comp, def: ALL_PARTS[comp.defId] }))
    .filter((x): x is { comp: PlacedComponent; def: PartDef } => !!x.def?.logic);
}

/** Builds the union-find net, seeds known sources, drives every sequential IC's
 *  outputs from its held state, then settles combinational logic over a few passes. */
function resolveNet(
  placedComponents: PlacedComponent[],
  wires: Wire[],
  inputs: boolean[],
  clockOn: boolean,
  seqState: SeqState,
) {
  const dsu = new DSU();
  wires.forEach((w) => dsu.union(w.from.key, w.to.key));

  const values = new Map<string, boolean>();
  const setVal = (key: string, v: boolean) => values.set(dsu.find(key), v);
  const getVal = (key: string): boolean | undefined => values.get(dsu.find(key));
  const isNode = (key: string, nodeKey: string) => dsu.find(key) === dsu.find(nodeKey);

  setVal(GND_NODE, false);
  setVal(VCC_NODE, true);
  inputs.forEach((v, i) => setVal(inputTapNode(i), v));
  setVal(CLK_NODE, clockOn);

  const ics = placedIcs(placedComponents);
  const pinNodeOf = (comp: PlacedComponent, def: PartDef) => {
    const c0 = icColumn(comp.x, def.pins);
    return (pin: number) => pinToNode(pin, c0, def.pins);
  };
  const poweredOf = (pinNode: (pin: number) => string, def: PartDef) =>
    isNode(pinNode(def.logic!.vccPin), VCC_NODE) && isNode(pinNode(def.logic!.gndPin), GND_NODE);

  // Sequential ICs drive their Q-type outputs continuously from stored state, ahead of the
  // combinational settle below, so combinational ICs reading those outputs see them right away.
  for (const { comp, def } of ics) {
    const logic = def.logic!;
    if (!logic.sequential) continue;
    const pinNode = pinNodeOf(comp, def);
    if (!poweredOf(pinNode, def)) continue;
    const state = seqState[comp.id];
    let offset = 0;
    for (const el of logic.sequential) {
      const bits = state ? state.slice(offset, offset + el.stateBits) : Array(el.stateBits).fill(false);
      offset += el.stateBits;
      Object.entries(el.outputs(bits)).forEach(([p, v]) => setVal(pinNode(Number(p)), v));
    }
  }

  for (let pass = 0; pass < 4; pass++) {
    for (const { comp, def } of ics) {
      const logic = def.logic!;
      const pinNode = pinNodeOf(comp, def);
      if (!poweredOf(pinNode, def)) continue;
      if (logic.gates) {
        for (const gate of logic.gates) {
          const ins = gate.inputs.map((p) => getVal(pinNode(p)) ?? false);
          setVal(pinNode(gate.output), gate.fn(ins));
        }
      }
      if (logic.combinational) {
        const pin = (p: number) => getVal(pinNode(p)) ?? false;
        Object.entries(logic.combinational(pin)).forEach(([p, v]) => setVal(pinNode(Number(p)), v));
      }
    }
  }

  return { getVal, isNode };
}

export function simulate(
  placedComponents: PlacedComponent[],
  wires: Wire[],
  inputs: boolean[],
  clockOn: boolean,
  seqState: SeqState = {},
): boolean[] {
  const { getVal } = resolveNet(placedComponents, wires, inputs, clockOn, seqState);
  return Array.from({ length: 8 }, (_, i) => getVal(outputTapNode(i)) ?? false);
}

/**
 * Advances every sequential IC one rising clock edge. Call this exactly once when the clock
 * generator transitions off -> on. Only elements whose clock pin is actually wired to the CLK
 * TAP capture; every other element (and every non-sequential IC) is left untouched. D/J/K/etc.
 * inputs are read from the net resolved *with the pre-edge state still in place*, matching a
 * real edge-triggered flip-flop.
 */
export function advanceSequential(
  placedComponents: PlacedComponent[],
  wires: Wire[],
  inputs: boolean[],
  seqState: SeqState,
): SeqState {
  const { getVal, isNode } = resolveNet(placedComponents, wires, inputs, true, seqState);

  const next: SeqState = { ...seqState };
  for (const comp of placedComponents) {
    const def = ALL_PARTS[comp.defId];
    const logic = def?.logic;
    if (!logic?.sequential) continue;
    const c0 = icColumn(comp.x, def.pins);
    const pinNode = (pin: number) => pinToNode(pin, c0, def.pins);
    if (!(isNode(pinNode(logic.vccPin), VCC_NODE) && isNode(pinNode(logic.gndPin), GND_NODE))) continue;

    const pin = (p: number) => getVal(pinNode(p)) ?? false;
    const totalBits = logic.sequential.reduce((n, el) => n + el.stateBits, 0);
    const prevState = seqState[comp.id] ?? Array(totalBits).fill(false);
    const newState = [...prevState];
    let offset = 0;
    let changed = false;
    for (const el of logic.sequential) {
      const bits = prevState.slice(offset, offset + el.stateBits);
      if (isNode(pinNode(el.clockPin), CLK_NODE)) {
        el.next(bits, pin).forEach((v, i) => (newState[offset + i] = v));
        changed = true;
      }
      offset += el.stateBits;
    }
    if (changed) next[comp.id] = newState;
  }
  return next;
}
