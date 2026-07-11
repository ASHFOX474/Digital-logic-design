/**
 * GateCircuit — renders a Boolean expression as a proper logic gate schematic.
 *
 * Takes a parsed AstNode + current input assignments and builds an SVG
 * circuit diagram with correctly shaped gate symbols, color-coded signal
 * wires, and animated active paths.
 */
import { useMemo } from "react";
import type { AstNode, Op } from "@/lib/logic/parser";
import { evalAst } from "@/lib/logic/parser";

// ─────────────────────── Layout constants ────────────────────────────────────
const VAR_OUT_X = 52;   // world-x of the variable output dot
const COL0_X = 108;     // world-x of depth-1 gate centre
const COL_W = 118;      // horizontal gap between consecutive gate columns
const ROW_H = 52;       // vertical spacing between leaf nodes

// ─────────────────────── Types ───────────────────────────────────────────────
type GType = "AND" | "OR" | "NOT" | "NAND" | "NOR" | "XOR" | "XNOR" | "VAR" | "CONST";

interface GNode {
  id: string;
  gtype: GType;
  label: string;
  depth: number;
  x: number;
  y: number;
  childIds: string[];
  value: boolean;
}

interface GEdge {
  fromId: string;
  toId: string;
  pinIndex: number; // 0 = top/only, 1 = bottom
}

// ─────────────────────── Pin geometry ────────────────────────────────────────
// All offsets are relative to the gate centre (gnode.x, gnode.y).

const OUTPUT_OFFSETS: Record<GType, number> = {
  AND: 16, NAND: 24,
  OR: 14,  NOR: 22,
  XOR: 14, XNOR: 22,
  NOT: 20,
  VAR: 0,  CONST: 0,
};

const INPUT_LEFT: Record<GType, number> = {
  AND: -16, NAND: -16,
  OR: -13,  NOR: -13,
  XOR: -13, XNOR: -13,
  NOT: -12,
  VAR: 0,   CONST: 0,
};

function outputPin(n: GNode) {
  if (n.gtype === "VAR" || n.gtype === "CONST") return { x: VAR_OUT_X, y: n.y };
  return { x: n.x + OUTPUT_OFFSETS[n.gtype], y: n.y };
}

function inputPin(n: GNode, pinIndex: number) {
  const pinYs = n.gtype === "NOT" ? [0] : [-7, 7];
  return { x: n.x + INPUT_LEFT[n.gtype], y: n.y + (pinYs[pinIndex] ?? 0) };
}

// ─────────────────────── Graph construction ───────────────────────────────────
let _seq = 0;
const nextId = () => `g${_seq++}`;

function buildGraph(
  ast: AstNode,
  assign: Record<string, boolean>,
): { nodes: Map<string, GNode>; edges: GEdge[]; rootId: string } {
  _seq = 0;
  const nodes = new Map<string, GNode>();
  const edges: GEdge[] = [];

  function safeEval(node: AstNode): boolean {
    try { return evalAst(node, assign); } catch { return false; }
  }

  function walk(node: AstNode): string {
    const id = nextId();
    if (node.kind === "var") {
      nodes.set(id, { id, gtype: "VAR", label: node.name, depth: 0, x: 0, y: 0, childIds: [], value: assign[node.name] ?? false });
      return id;
    }
    if (node.kind === "const") {
      nodes.set(id, { id, gtype: "CONST", label: String(node.value), depth: 0, x: 0, y: 0, childIds: [], value: node.value === 1 });
      return id;
    }
    if (node.kind === "not") {
      const cId = walk(node.arg);
      const cDepth = nodes.get(cId)!.depth;
      nodes.set(id, { id, gtype: "NOT", label: "NOT", depth: cDepth + 1, x: 0, y: 0, childIds: [cId], value: safeEval(node) });
      edges.push({ fromId: cId, toId: id, pinIndex: 0 });
      return id;
    }
    // binary
    const lId = walk(node.left);
    const rId = walk(node.right);
    const lDepth = nodes.get(lId)!.depth;
    const rDepth = nodes.get(rId)!.depth;
    const opToGType: Record<Op, GType> = { AND: "AND", OR: "OR", NAND: "NAND", NOR: "NOR", XOR: "XOR", XNOR: "XNOR" };
    nodes.set(id, {
      id, gtype: opToGType[node.op], label: node.op,
      depth: Math.max(lDepth, rDepth) + 1,
      x: 0, y: 0, childIds: [lId, rId], value: safeEval(node),
    });
    edges.push({ fromId: lId, toId: id, pinIndex: 0 });
    edges.push({ fromId: rId, toId: id, pinIndex: 1 });
    return id;
  }

  const rootId = walk(ast);
  return { nodes, edges, rootId };
}

// ─────────────────────── Layout computation ───────────────────────────────────
function computeLayout(nodes: Map<string, GNode>, rootId: string): { totalW: number; totalH: number } {
  // 1. Collect leaves in pre-order traversal
  const leaves: string[] = [];
  const seen = new Set<string>();
  function collectLeaves(id: string) {
    if (seen.has(id)) return;
    seen.add(id);
    const n = nodes.get(id)!;
    if (n.childIds.length === 0) { leaves.push(id); return; }
    n.childIds.forEach(collectLeaves);
  }
  collectLeaves(rootId);

  // 2. Assign y to leaves
  leaves.forEach((id, i) => { nodes.get(id)!.y = i * ROW_H + ROW_H / 2; });

  // 3. Assign y to internal nodes
  function assignY(id: string): number {
    const n = nodes.get(id)!;
    if (n.childIds.length === 0) return n.y;
    const ys = n.childIds.map(cId => assignY(cId));
    n.y = (Math.min(...ys) + Math.max(...ys)) / 2;
    return n.y;
  }
  assignY(rootId);

  // 4. Assign x: leaves at VAR_OUT_X area, gates at depth-based columns
  const maxDepth = nodes.get(rootId)!.depth;
  nodes.forEach(n => {
    n.x = n.depth === 0 ? 20 : COL0_X + (n.depth - 1) * COL_W;
  });

  return {
    totalW: Math.max(200, COL0_X + Math.max(0, maxDepth - 1) * COL_W + OUTPUT_OFFSETS[nodes.get(rootId)!.gtype] + 40),
    totalH: Math.max(60, leaves.length * ROW_H + 16),
  };
}

// ─────────────────────── Gate SVG bodies ─────────────────────────────────────
function GateBody({ n }: { n: GNode }) {
  const active = n.value;
  const stroke = active ? "var(--lab-cyan)" : "oklch(0.38 0.04 260)";
  const fill   = active ? "oklch(0.14 0.08 200 / 0.35)" : "oklch(0.12 0.02 260 / 0.5)";
  const ink    = active ? "var(--lab-cyan)" : "oklch(0.48 0.04 260)";
  const glow   = active ? "drop-shadow(0 0 5px var(--lab-cyan))" : undefined;
  const { x: cx, y: cy } = n;

  // VAR / CONST: just a coloured dot + label
  if (n.gtype === "VAR" || n.gtype === "CONST") {
    return (
      <g style={{ filter: glow }}>
        <circle cx={VAR_OUT_X} cy={cy} r={5} fill={active ? "var(--lab-cyan)" : "oklch(0.28 0.04 260)"} stroke={stroke} strokeWidth={1} />
        <text x={VAR_OUT_X - 9} y={cy + 4} textAnchor="end" fontSize={13} fontFamily="monospace" fontWeight="bold" fill={ink}>
          {n.label}
        </text>
      </g>
    );
  }

  const props = { fill, stroke, strokeWidth: 1.5 } as const;

  switch (n.gtype) {
    case "AND":
    case "NAND":
      return (
        <g transform={`translate(${cx},${cy})`} style={{ filter: glow }}>
          <path d="M -16,-12 L 4,-12 A 12,12,0,0,1,4,12 L -16,12 Z" {...props} />
          {n.gtype === "NAND" && <circle cx={20} cy={0} r={4} {...props} />}
          <text x={-5} y={4} textAnchor="middle" fontSize={7} fontFamily="monospace" fill={ink}>{n.gtype}</text>
        </g>
      );
    case "OR":
    case "NOR":
      return (
        <g transform={`translate(${cx},${cy})`} style={{ filter: glow }}>
          <path d="M -16,-12 Q 0,-12 14,0 Q 0,12 -16,12 Q -4,0 -16,-12 Z" {...props} />
          {n.gtype === "NOR" && <circle cx={18} cy={0} r={4} {...props} />}
          <text x={-2} y={4} textAnchor="middle" fontSize={7} fontFamily="monospace" fill={ink}>{n.gtype}</text>
        </g>
      );
    case "NOT":
      return (
        <g transform={`translate(${cx},${cy})`} style={{ filter: glow }}>
          <path d="M -12,-10 L 12,0 L -12,10 Z" {...props} />
          <circle cx={16} cy={0} r={4} {...props} />
          <text x={0} y={3} textAnchor="middle" fontSize={7} fontFamily="monospace" fill={ink}>NOT</text>
        </g>
      );
    case "XOR":
    case "XNOR":
      return (
        <g transform={`translate(${cx},${cy})`} style={{ filter: glow }}>
          <path d="M -20,-12 Q -8,0 -20,12" fill="none" stroke={stroke} strokeWidth={1.5} />
          <path d="M -16,-12 Q 0,-12 14,0 Q 0,12 -16,12 Q -4,0 -16,-12 Z" {...props} />
          {n.gtype === "XNOR" && <circle cx={18} cy={0} r={4} {...props} />}
          <text x={-2} y={4} textAnchor="middle" fontSize={7} fontFamily="monospace" fill={ink}>{n.gtype}</text>
        </g>
      );
    default:
      return null;
  }
}

// ─────────────────────── Wire ─────────────────────────────────────────────────
function Wire({ e, nodes }: { e: GEdge; nodes: Map<string, GNode> }) {
  const from = nodes.get(e.fromId)!;
  const to   = nodes.get(e.toId)!;
  const p1   = outputPin(from);
  const p2   = inputPin(to, e.pinIndex);
  const mx   = (p1.x + p2.x) / 2;
  const active = from.value;
  return (
    <path
      d={`M ${p1.x},${p1.y} C ${mx},${p1.y} ${mx},${p2.y} ${p2.x},${p2.y}`}
      fill="none"
      stroke={active ? "var(--lab-cyan)" : "oklch(0.30 0.03 260)"}
      strokeWidth={active ? 1.8 : 1.2}
      strokeLinecap="round"
      style={{ filter: active ? "drop-shadow(0 0 4px var(--lab-cyan))" : undefined }}
    />
  );
}

// ─────────────────────── Public component ────────────────────────────────────
export function GateCircuit({ ast, assign }: { ast: AstNode; assign: Record<string, boolean> }) {
  const { nodes, edges, rootId, totalW, totalH } = useMemo(() => {
    const { nodes, edges, rootId } = buildGraph(ast, assign);
    const { totalW, totalH } = computeLayout(nodes, rootId);
    return { nodes, edges, rootId, totalW, totalH };
  }, [ast, assign]);

  // Guard: if too many nodes, show a warning
  if (nodes.size > 30) {
    return (
      <div className="flex h-full items-center justify-center text-xs font-mono text-[var(--lab-muted)]">
        Expression too complex to visualize (simplify first)
      </div>
    );
  }

  const rootNode = nodes.get(rootId)!;
  const outPin = outputPin(rootNode);
  const active = rootNode.value;

  return (
    <svg
      width="100%"
      height="100%"
      viewBox={`0 0 ${totalW} ${totalH}`}
      preserveAspectRatio="xMinYMid meet"
      style={{ overflow: "visible" }}
    >
      {/* Wires first (behind gate bodies) */}
      {edges.map((e, i) => <Wire key={i} e={e} nodes={nodes} />)}

      {/* Output wire from root gate to Y label */}
      <line
        x1={outPin.x} y1={outPin.y}
        x2={totalW - 14} y2={outPin.y}
        stroke={active ? "var(--lab-cyan)" : "oklch(0.30 0.03 260)"}
        strokeWidth={active ? 2 : 1.2}
        style={{ filter: active ? "drop-shadow(0 0 4px var(--lab-cyan))" : undefined }}
      />
      <text x={totalW - 12} y={outPin.y + 4} fontSize={11} fontFamily="monospace" fontWeight="bold"
        fill={active ? "var(--lab-cyan)" : "oklch(0.40 0.04 260)"}>Y</text>

      {/* Gate bodies on top */}
      {Array.from(nodes.values()).map(n => <GateBody key={n.id} n={n} />)}
    </svg>
  );
}
