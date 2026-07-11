import { ALL_PARTS } from "./componentLibrary";
import { icColumn, pinToNode, VCC_NODE, GND_NODE, CLK_NODE, inputTapNode, outputTapNode } from "./breadboardGeometry";
import type { PlacedComponent, Wire } from "./TrainerKit";

/* ============================================================================
 * simulate — a tiny digital netlist solver for the trainer kit.
 *
 * 1. A union-find merges every hole/tap/terminal that a wire connects.
 * 2. Known sources (VCC, GND, the 8 input switches, the clock) seed values.
 * 3. Each placed gate-IC only computes if its VCC/GND pins are actually
 *    wired to the real rails; its gates then drive their output node.
 * 4. A few passes let chained gates (IC -> wire -> IC) settle.
 * ========================================================================== */

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

export function simulate(
  placedComponents: PlacedComponent[],
  wires: Wire[],
  inputs: boolean[],
  clockOn: boolean,
): boolean[] {
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

  const gateIcs = placedComponents
    .map((comp) => ({ comp, def: ALL_PARTS[comp.defId] }))
    .filter((x) => x.def?.logic);

  for (let pass = 0; pass < 4; pass++) {
    for (const { comp, def } of gateIcs) {
      const c0 = icColumn(comp.x);
      const pinNode = (pin: number) => pinToNode(pin, c0);
      const logic = def.logic!;
      const powered = isNode(pinNode(logic.vccPin), VCC_NODE) && isNode(pinNode(logic.gndPin), GND_NODE);
      if (!powered) continue;
      for (const gate of logic.gates) {
        const ins = gate.inputs.map((p) => getVal(pinNode(p)) ?? false);
        setVal(pinNode(gate.output), gate.fn(ins));
      }
    }
  }

  return Array.from({ length: 8 }, (_, i) => getVal(outputTapNode(i)) ?? false);
}
