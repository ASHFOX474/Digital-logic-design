import { useMemo, useRef, useState, type DragEvent, type MouseEvent, type PointerEvent } from "react";
import { ALL_PARTS, WIRE_COLORS, type WireColorId } from "./componentLibrary";
import type { ToolId } from "./ComponentSidebar";
import {
  HOLE,
  COLS,
  MATRIX_X,
  MATRIX_RIGHT_X,
  TOPBLOCK_Y,
  BOTBLOCK_Y,
  VCC_BUS_Y,
  VCC_TERMINAL_GAP,
  GND_BUS_Y,
  OUTPUT_TAP_Y,
  INPUT_TAP_Y,
  colX,
  topRowY,
  botRowY,
  tapX,
  topNode,
  botNode,
  icColumn,
  pinToNode,
  VCC_NODE,
  GND_NODE,
  CLK_NODE,
  inputTapNode,
  outputTapNode,
} from "./breadboardGeometry";

/* ============================================================================
 * TrainerKit — the "lab desk" stage: a top-down SVG of a digital trainer
 * board built around one real "half" breadboard (a bus row, a 5-row block,
 * the centre gutter, another 5-row block, one more bus row), with a row of
 * output taps wired down from the LED display above it and a row of input
 * taps wired up from the manual switches below it, plus a pair of +5V
 * terminals and a GND terminal at its left edge — matching a physical
 * trainer kit. Every dot on the board is a real, wireable hole: dropping a
 * 14-pin gate IC snaps it to straddle the gutter the way a real DIP package
 * does, and the wire tool connects specific holes to each other rather than
 * arbitrary points, so the resulting netlist is what actually drives the
 * simulation upstream in VirtualLab.
 * ========================================================================== */

export interface PlacedComponent {
  id: string;
  defId: string;
  x: number;
  y: number;
}

export interface WireEndpoint {
  /** Electrical node key this hole belongs to (e.g. "mt3", "IN2", "VCC"). */
  key: string;
  x: number;
  y: number;
}

export interface Wire {
  id: string;
  from: WireEndpoint;
  to: WireEndpoint;
  color: WireColorId;
}

const GRID = 20;
// Width derives from the matrix's actual right edge (MATRIX_RIGHT_X, which grows with COLS)
// plus the same ~152px margin the board used at COLS=30, so widening the breadboard in
// breadboardGeometry.ts doesn't clip the bus rows/gutter or need a manual resize here.
const VIEW = { w: MATRIX_RIGHT_X + 152, h: 700 };
// Clamp bounds for where a part can be dropped/tapped onto the board. Every part renders as a
// DIP IC straddling the centre gutter, so only the x clamp actually matters for placement — y is
// kept generic in case future non-DIP parts need it.
const DROP_BOUNDS = { x: 20, y: 400, w: VIEW.w - 40, h: 0 };
const HOLE_HIT_R = 12; // generous invisible hit-radius so tiny breadboard holes are easy to tap on touch screens
/** Perpendicular spacing applied between wires whose routed paths would otherwise overlap. */
const OVERLAP_OFFSET = 12;

/** An in-progress "pick this end up, then click a hole to drop it" wire re-route. */
export interface EndpointEdit {
  wireId: string;
  end: "from" | "to";
}

function colorVar(id: WireColorId) {
  return WIRE_COLORS.find((c) => c.id === id)?.swatch ?? "var(--lab-cyan)";
}

function colorLabel(id: WireColorId) {
  return id.charAt(0).toUpperCase() + id.slice(1);
}

function snap(v: number) {
  return Math.round(v / GRID) * GRID;
}

function orthogonalPath(a: { x: number; y: number }, b: { x: number; y: number }, offset = 0) {
  const midY = snap((a.y + b.y) / 2) + offset;
  return `M ${a.x} ${a.y} L ${a.x} ${midY} L ${b.x} ${midY} L ${b.x} ${b.y}`;
}

/** The row (pre-offset) a wire's orthogonal path bends along, plus the horizontal span it
 *  covers on that row — the two pieces of info needed to tell whether two *different* wires
 *  would actually render on top of each other, not just wires sharing the same pair of holes. */
function bendSpan(w: Wire) {
  return {
    row: snap((w.from.y + w.to.y) / 2),
    x0: Math.min(w.from.x, w.to.x),
    x1: Math.max(w.from.x, w.to.x),
  };
}

function spansOverlap(a: { x0: number; x1: number }, b: { x0: number; x1: number }) {
  return a.x0 <= b.x1 && b.x0 <= a.x1;
}

/** Tiny union-find used to cluster wires that visually collide (same bend row, overlapping
 *  horizontal span) so every wire in a colliding cluster gets its own parallel lane. */
class WireDSU {
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

interface TrainerKitProps {
  placedComponents: PlacedComponent[];
  wires: Wire[];
  activeTool: ToolId;
  wireColor: WireColorId;
  wireDraft: WireEndpoint | null;
  selectedWireId: string | null;
  endpointEdit: EndpointEdit | null;
  inputs: boolean[];
  clockOn: boolean;
  outputs: boolean[];
  /** Part id armed for tap-to-place (mobile-friendly alternative to native drag-and-drop). */
  armedPartId?: string | null;
  onDropPart: (defId: string, x: number, y: number) => void;
  onHoleClick: (key: string, x: number, y: number) => void;
  onRemoveComponent: (id: string) => void;
  onRemoveWire: (id: string) => void;
  onMoveComponent: (id: string, x: number, y: number) => void;
  onSelectWire: (id: string | null) => void;
  onStartEndpointEdit: (wireId: string, end: "from" | "to") => void;
  onChangeWireColor: (id: string, color: WireColorId) => void;
  onToggleInput: (i: number) => void;
  onToggleClock: () => void;
  onClearBoard: () => void;
}

export function TrainerKit({
  placedComponents,
  wires,
  activeTool,
  wireColor,
  wireDraft,
  selectedWireId,
  endpointEdit,
  inputs,
  clockOn,
  outputs,
  armedPartId = null,
  onDropPart,
  onHoleClick,
  onRemoveComponent,
  onRemoveWire,
  onMoveComponent,
  onSelectWire,
  onStartEndpointEdit,
  onChangeWireColor,
  onToggleInput,
  onToggleClock,
  onClearBoard,
}: TrainerKitProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const dragState = useRef<{ id: string; dx: number; dy: number } | null>(null);
  const [hoveredWireId, setHoveredWireId] = useState<string | null>(null);
  /** A wire endpoint currently being dragged to a new hole (live cursor-follow position). */
  const [dragEndpoint, setDragEndpoint] = useState<{ wireId: string; end: "from" | "to"; x: number; y: number } | null>(
    null,
  );
  /** How close (px) the cursor needs to be to a hole for it to "catch" the dropped wire end. */
  const SNAP_R = 20;

  const clientToBoard = (clientX: number, clientY: number) => {
    const svg = svgRef.current;
    if (!svg) return { x: 0, y: 0 };
    const pt = svg.createSVGPoint();
    pt.x = clientX;
    pt.y = clientY;
    const ctm = svg.getScreenCTM();
    if (!ctm) return { x: 0, y: 0 };
    const local = pt.matrixTransform(ctm.inverse());
    return { x: local.x, y: local.y };
  };

  const handleDragOver = (e: DragEvent) => e.preventDefault();

  const clampToBoard = (x: number, y: number) => ({
    x: Math.min(Math.max(snap(x), DROP_BOUNDS.x), DROP_BOUNDS.x + DROP_BOUNDS.w),
    y: Math.min(Math.max(snap(y), 40), VIEW.h - 40),
  });

  const handleDrop = (e: DragEvent) => {
    e.preventDefault();
    const defId = e.dataTransfer.getData("application/x-lab-part");
    if (!defId) return;
    const { x, y } = clientToBoard(e.clientX, e.clientY);
    const { x: sx, y: sy } = clampToBoard(x, y);
    onDropPart(defId, sx, sy);
  };

  /** Touch-friendly alternative to HTML5 drag-and-drop (which doesn't fire on most mobile
   *  browsers): tap a part in the sidebar to arm it, then tap anywhere on the board to place it. */
  const handleBoardTap = (e: MouseEvent) => {
    if (armedPartId) {
      const { x, y } = clientToBoard(e.clientX, e.clientY);
      const { x: sx, y: sy } = clampToBoard(x, y);
      onDropPart(armedPartId, sx, sy);
      return;
    }
    onSelectWire(null);
  };

  const startDragComponent = (e: PointerEvent, comp: PlacedComponent) => {
    if (activeTool === "extractor") return;
    e.stopPropagation();
    (e.target as Element).setPointerCapture(e.pointerId);
    const { x, y } = clientToBoard(e.clientX, e.clientY);
    dragState.current = { id: comp.id, dx: x - comp.x, dy: y - comp.y };
  };

  const dragMoveComponent = (e: PointerEvent) => {
    if (dragState.current) {
      const { x, y } = clientToBoard(e.clientX, e.clientY);
      onMoveComponent(dragState.current.id, x - dragState.current.dx, y - dragState.current.dy);
      return;
    }
    if (dragEndpoint) {
      const { x, y } = clientToBoard(e.clientX, e.clientY);
      setDragEndpoint((d) => (d ? { ...d, x, y } : d));
    }
  };

  const findNearestHole = (x: number, y: number) => {
    let best: { key: string; x: number; y: number } | null = null;
    let bestDist = SNAP_R;
    for (const h of allHoles) {
      const dist = Math.hypot(h.x - x, h.y - y);
      if (dist <= bestDist) {
        bestDist = dist;
        best = h;
      }
    }
    return best;
  };

  const endDragComponent = () => {
    if (dragState.current) {
      dragState.current = null;
      return;
    }
    if (dragEndpoint) {
      const target = findNearestHole(dragEndpoint.x, dragEndpoint.y);
      if (target) onHoleClick(target.key, target.x, target.y);
      setDragEndpoint(null);
    }
  };

  // Holes are only "live" (clickable) when actively drawing a new wire, or mid-way through
  // re-routing an existing wire's endpoint. Otherwise clicks pass through to whatever is
  // underneath (dragging components, the extractor tool clicking a wire/IC, etc).
  const holesActive = activeTool === "wire" || endpointEdit !== null;

  const handleHole = (e: MouseEvent, key: string, x: number, y: number) => {
    if (!holesActive) return;
    e.stopPropagation();
    onHoleClick(key, x, y);
  };

  const holeCursor = holesActive ? "crosshair" : "default";

  /** Every wireable hole on the board, used to build one always-on-top invisible hit-layer
   *  so tiny holes stay easy to click and are never blocked by a wire or component drawn
   *  over them. Positions are static (derived from geometry constants only). */
  const allHoles = useMemo(() => {
    const holes: { key: string; x: number; y: number }[] = [];
    for (let c = 0; c < COLS; c++) {
      for (let r = 0; r < 5; r++) holes.push({ key: topNode(c), x: colX(c), y: topRowY(r) });
      for (let r = 0; r < 5; r++) holes.push({ key: botNode(c), x: colX(c), y: botRowY(r) });
    }
    for (let i = 0; i < COLS; i++) {
      const x = MATRIX_X + (i * (MATRIX_RIGHT_X - MATRIX_X)) / (COLS - 1);
      holes.push({ key: VCC_NODE, x, y: VCC_BUS_Y });
      holes.push({ key: GND_NODE, x, y: GND_BUS_Y });
    }
    for (let i = 0; i < 8; i++) {
      holes.push({ key: outputTapNode(i), x: tapX(i), y: OUTPUT_TAP_Y });
      holes.push({ key: inputTapNode(i), x: tapX(i), y: INPUT_TAP_Y });
    }
    holes.push({ key: VCC_NODE, x: 70, y: VCC_BUS_Y - VCC_TERMINAL_GAP });
    holes.push({ key: VCC_NODE, x: 70, y: VCC_BUS_Y + VCC_TERMINAL_GAP });
    holes.push({ key: GND_NODE, x: 70, y: GND_BUS_Y });
    // Matches the CLK TAP dot's actual position: cx=70,cy=-10 inside the
    // clock generator's <g transform="translate(MATRIX_X-200, INPUT_TAP_Y+36)">.
    holes.push({ key: CLK_NODE, x: MATRIX_X - 200 + 70, y: INPUT_TAP_Y + 36 - 10 });
    return holes;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Any wires whose orthogonal routing would bend along the same row and overlap horizontally
  // get clustered together (not just wires sharing the exact same pair of holes), then each
  // member of a cluster gets its own small perpendicular offset so they render as distinct
  // parallel lines instead of an indistinguishable stack — this is what actually causes wires
  // to become hard to tell apart in denser circuits.
  const overlapGroups = useMemo(() => {
    const dsu = new WireDSU();
    const spans = wires.map((w) => ({ id: w.id, ...bendSpan(w) }));
    for (let i = 0; i < spans.length; i++) {
      for (let j = i + 1; j < spans.length; j++) {
        if (spans[i].row === spans[j].row && spansOverlap(spans[i], spans[j])) {
          dsu.union(spans[i].id, spans[j].id);
        }
      }
    }
    const groups = new Map<string, string[]>();
    for (const w of wires) {
      const root = dsu.find(w.id);
      const list = groups.get(root);
      if (list) list.push(w.id);
      else groups.set(root, [w.id]);
    }
    // Stable, deterministic ordering within a cluster (by id) so lane assignment doesn't jitter
    // as unrelated wires elsewhere are added/removed.
    for (const list of groups.values()) list.sort();
    const byWire = new Map<string, string[]>();
    for (const w of wires) byWire.set(w.id, groups.get(dsu.find(w.id))!);
    return byWire;
  }, [wires]);

  const wireOffset = (w: Wire) => {
    const group = overlapGroups.get(w.id) ?? [w.id];
    if (group.length <= 1) return 0;
    const idx = group.indexOf(w.id);
    return (idx - (group.length - 1) / 2) * OVERLAP_OFFSET;
  };

  return (
    <div className="lab-panel relative flex h-full w-full flex-col overflow-hidden">
      <div className="lab-scanline" aria-hidden />
      <div className="flex flex-col gap-2 border-b border-[var(--lab-border)] px-3 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-3 sm:px-5">
        <div>
          <p className="text-[10px] tracking-[0.35em] text-[var(--lab-muted)]">◆ TRAINER KIT</p>
          <h1 className="lab-title mt-0.5 text-lg font-bold tracking-[0.12em]">VIRTUAL LAB</h1>
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <span className="flex min-w-0 items-center gap-1 font-mono text-[10px] tracking-[0.2em] text-[var(--lab-muted)]">
            <span
              className="inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--lab-mint)]"
              style={{ animation: "lab-pulse 1.2s ease-in-out infinite" }}
            />
            <span className="break-words">
              {armedPartId
                ? `TAP THE BOARD TO PLACE ${ALL_PARTS[armedPartId]?.code ?? "PART"}`
                : endpointEdit
                  ? "DROP THIS WIRE END ON A NEW HOLE"
                  : selectedWireId
                    ? "WIRE SELECTED · drag a dot to re-route · use the popup to recolor/delete"
                    : `${placedComponents.length} PARTS · ${wires.length} WIRES`}
            </span>
          </span>
          <button
            type="button"
            onClick={() => {
              if (placedComponents.length === 0 && wires.length === 0) return;
              if (window.confirm("Clear the entire board? This removes every part and wire.")) {
                onSelectWire(null);
                onClearBoard();
              }
            }}
            className="rounded-md border-2 border-[var(--lab-warm)] px-3 py-1.5 font-mono text-xs font-bold tracking-[0.15em] text-[var(--lab-warm)] transition hover:bg-[oklch(0.35_0.15_25/0.25)]"
            style={{ boxShadow: "0 0 8px oklch(0.65 0.2 25 / 0.35)" }}
          >
            ⨯ CLEAR BOARD
          </button>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-auto p-2 sm:p-4" style={{ touchAction: "pan-x pan-y pinch-zoom" }}>
        <svg
          ref={svgRef}
          viewBox={`0 0 ${VIEW.w} ${VIEW.h}`}
          className="h-auto min-w-[900px] w-full select-none"
          style={{ cursor: armedPartId ? "copy" : holesActive ? "crosshair" : "default" }}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          onPointerMove={dragMoveComponent}
          onPointerUp={endDragComponent}
          onClick={handleBoardTap}
        >
          <defs>
            <linearGradient id="vlab-desk" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="oklch(0.16 0.03 260)" />
              <stop offset="100%" stopColor="oklch(0.10 0.02 260)" />
            </linearGradient>
          </defs>

          <rect x={0} y={0} width={VIEW.w} height={VIEW.h} rx={18} fill="url(#vlab-desk)" />

          {/* ---------- Output display: LEDs (top) ---------- */}
          <text x={MATRIX_X - 10} y={103} fontFamily="ui-monospace, monospace" fontSize="10" letterSpacing="2" fill="var(--lab-muted)">
            OUTPUT DISPLAY
          </text>
          {Array.from({ length: 8 }, (_, i) => tapX(i)).map((x, i) => (
            <g key={`led-${i}`} transform={`translate(${x}, 148)`}>
              <circle r="9" fill="oklch(0.12 0.02 260)" stroke="var(--lab-border)" />
              <circle
                r="6"
                fill={outputs[i] ? "var(--lab-mint)" : "oklch(0.20 0.02 260)"}
                style={outputs[i] ? { filter: "drop-shadow(0 0 6px var(--lab-mint))" } : undefined}
              />
              <text y="20" textAnchor="middle" fontFamily="ui-monospace, monospace" fontSize="8" fill="var(--lab-muted)">
                D{i}
              </text>
              <line x1={0} y1={13} x2={0} y2={OUTPUT_TAP_Y - 148} stroke="var(--lab-border)" strokeWidth="1.5" strokeDasharray="2 3" />
            </g>
          ))}

          {/* ---------- Output taps: wire holes feeding down from the LEDs ---------- */}
          {Array.from({ length: 8 }, (_, i) => i).map((i) => {
            const x = tapX(i);
            const key = outputTapNode(i);
            const active = wireDraft?.key === key;
            return (
              <circle
                key={`tapout-${i}`}
                cx={x}
                cy={OUTPUT_TAP_Y}
                r={active ? 6 : 4.5}
                fill={active ? "var(--lab-mint)" : "oklch(0.30 0.02 260)"}
                stroke="var(--lab-mint)"
                strokeWidth="1.2"
              />
            );
          })}

          {/* ---------- VCC bus ---------- */}
          <BusRow y={VCC_BUS_Y} label="VCC BUS · +5V" color="var(--lab-pink)" nodeKey={VCC_NODE} activeKey={wireDraft?.key} count={COLS} />

          {/* ---------- Left-edge power terminals ---------- */}
          <PowerTerminal x={70} y={VCC_BUS_Y - VCC_TERMINAL_GAP} label="+5V" color="var(--lab-pink)" nodeKey={VCC_NODE} activeKey={wireDraft?.key} />
          <PowerTerminal x={70} y={VCC_BUS_Y + VCC_TERMINAL_GAP} label="+5V" color="var(--lab-pink)" nodeKey={VCC_NODE} activeKey={wireDraft?.key} />
          <PowerTerminal x={70} y={GND_BUS_Y} label="GND" color="var(--lab-cyan)" nodeKey={GND_NODE} activeKey={wireDraft?.key} />

          {/* ---------- The breadboard itself (half board): dots sit directly on the dark
             canvas, matching the trainer kit's original look — only the IC gutter gets its
             own grey bar below. ---------- */}
          {/* centre gutter */}
          <rect
            x={MATRIX_X - 26}
            y={TOPBLOCK_Y + 4 * HOLE + 6}
            width={MATRIX_RIGHT_X - MATRIX_X + 52}
            height={BOTBLOCK_Y - (TOPBLOCK_Y + 4 * HOLE + 6) - 6}
            fill="oklch(0.72 0.01 90 / 0.9)"
          />
          <text
            x={MATRIX_X}
            y={(TOPBLOCK_Y + 4 * HOLE + BOTBLOCK_Y) / 2 + 4}
            fontFamily="ui-monospace, monospace"
            fontSize="9"
            letterSpacing="1.5"
            fill="oklch(0.4 0.01 90)"
          >
            IC CHANNEL — straddle the gutter
          </text>

          {/* Top block: rows a-e */}
          {Array.from({ length: COLS }, (_, c) => c).map((c) => (
            <g key={`topcol-${c}`}>
              {Array.from({ length: 5 }, (_, r) => r).map((r) => {
                const x = colX(c);
                const y = topRowY(r);
                const key = topNode(c);
                const active = wireDraft?.key === key;
                return (
                  <circle
                    key={`t-${c}-${r}`}
                    cx={x}
                    cy={y}
                    r={active ? 3.5 : 2.4}
                    fill={active ? "var(--lab-cyan)" : "oklch(0.35 0.02 90)"}
                  />
                );
              })}
            </g>
          ))}

          {/* Bottom block: rows f-j */}
          {Array.from({ length: COLS }, (_, c) => c).map((c) => (
            <g key={`botcol-${c}`}>
              {Array.from({ length: 5 }, (_, r) => r).map((r) => {
                const x = colX(c);
                const y = botRowY(r);
                const key = botNode(c);
                const active = wireDraft?.key === key;
                return (
                  <circle
                    key={`b-${c}-${r}`}
                    cx={x}
                    cy={y}
                    r={active ? 3.5 : 2.4}
                    fill={active ? "var(--lab-cyan)" : "oklch(0.35 0.02 90)"}
                  />
                );
              })}
            </g>
          ))}

          {/* ---------- GND bus ---------- */}
          <BusRow y={GND_BUS_Y} label="GND BUS · 0V" color="var(--lab-cyan)" nodeKey={GND_NODE} activeKey={wireDraft?.key} count={COLS} dim />

          {/* ---------- Input taps: wire holes feeding up from the switches ---------- */}
          {Array.from({ length: 8 }, (_, i) => i).map((i) => {
            const x = tapX(i);
            const key = inputTapNode(i);
            const active = wireDraft?.key === key;
            return (
              <circle
                key={`tapin-${i}`}
                cx={x}
                cy={INPUT_TAP_Y}
                r={active ? 6 : 4.5}
                fill={active ? "var(--lab-pink)" : "oklch(0.30 0.02 260)"}
                stroke="var(--lab-pink)"
                strokeWidth="1.2"
              />
            );
          })}

          {/* ---------- Wires ---------- */}
          {wires.map((w) => {
            const isDraggingFrom = dragEndpoint?.wireId === w.id && dragEndpoint.end === "from";
            const isDraggingTo = dragEndpoint?.wireId === w.id && dragEndpoint.end === "to";
            const fromPt = isDraggingFrom ? { ...w.from, x: dragEndpoint!.x, y: dragEndpoint!.y } : w.from;
            const toPt = isDraggingTo ? { ...w.to, x: dragEndpoint!.x, y: dragEndpoint!.y } : w.to;
            const offset = isDraggingFrom || isDraggingTo ? 0 : wireOffset(w);
            const d = orthogonalPath(fromPt, toPt, offset);
            const isSelected = selectedWireId === w.id;
            const isHovered = hoveredWireId === w.id;
            const isEditingThis = endpointEdit?.wireId === w.id;
            return (
              <g
                key={w.id}
                className="cursor-pointer"
                onMouseEnter={() => setHoveredWireId(w.id)}
                onMouseLeave={() => setHoveredWireId((id) => (id === w.id ? null : id))}
                onClick={(e) => {
                  e.stopPropagation();
                  if (activeTool === "extractor") {
                    onRemoveWire(w.id);
                    return;
                  }
                  if (activeTool === "wire" && wireDraft) return;
                  onSelectWire(isSelected ? null : w.id);
                }}
              >
                <title>{`${colorLabel(w.color)} wire · ${w.from.key} → ${w.to.key}`}</title>
                {/* wide, near-invisible stroke: forgiving click target */}
                <path d={d} fill="none" stroke={colorVar(w.color)} strokeWidth="9" opacity="0" />
                {isSelected && (
                  <path d={d} fill="none" stroke="white" strokeWidth="7" strokeLinecap="round" opacity="0.85">
                    <animate attributeName="stroke-dashoffset" values="0;16" dur="0.6s" repeatCount="indefinite" />
                  </path>
                )}
                {!isSelected && isHovered && (
                  <path d={d} fill="none" stroke="var(--lab-ink)" strokeWidth="6" strokeLinecap="round" opacity="0.35" />
                )}
                <path d={d} fill="none" stroke={colorVar(w.color)} strokeWidth="5" opacity="0.12" />
                {/* Dark casing behind every wire — keeps crossing/overlapping wires readable
                   against each other and against the light breadboard body, the way real
                   metro-map style diagrams outline each line. */}
                <path
                  d={d}
                  fill="none"
                  stroke="oklch(0.08 0.01 260)"
                  strokeWidth={(isHovered || isSelected ? 3.2 : 2.5) + 2.2}
                  strokeLinecap="round"
                  opacity={isEditingThis ? 0.35 : 0.75}
                />
                <path
                  d={d}
                  fill="none"
                  stroke={colorVar(w.color)}
                  strokeWidth={isHovered || isSelected ? 3.2 : 2.5}
                  strokeLinecap="round"
                  opacity={isEditingThis ? 0.45 : 1}
                  style={{ filter: `drop-shadow(0 0 4px ${colorVar(w.color)})` }}
                />

                {/* Endpoint dots — plain markers here; the selected wire's real drag
                   handles are rendered in a separate top-most layer below so they're
                   never shadowed by the hole hit-layer while a tool is armed. */}
                {(["from", "to"] as const).map((end) => {
                  const pt = end === "from" ? fromPt : toPt;
                  return <circle key={end} cx={pt.x} cy={pt.y} r={isSelected ? 6.5 : 3.5} fill={isSelected ? "white" : colorVar(w.color)} stroke={isSelected ? colorVar(w.color) : "none"} strokeWidth={isSelected ? 2.5 : 0} />;
                })}

              </g>
            );
          })}

          {wireDraft && (
            <circle cx={wireDraft.x} cy={wireDraft.y} r="7" fill="none" stroke="var(--lab-ink)" strokeDasharray="3 3">
              <animate attributeName="r" values="6;9;6" dur="1s" repeatCount="indefinite" />
            </circle>
          )}

          {/* ---------- Placed components ---------- */}
          {placedComponents.map((comp) => {
            const def = ALL_PARTS[comp.defId];
            if (!def) return null;
            // Every part the simulator understands (gate ICs, arithmetic/decoder/mux ICs,
            // flip-flops, registers) is a real DIP package: it straddles the centre gutter
            // with pins/2 pins down each side, exactly like a chip on a physical breadboard.
            const half = def.pins / 2;
            const c0 = icColumn(comp.x, def.pins);
            const left = colX(c0) - HOLE / 2;
            const width = (half - 1) * HOLE + HOLE;
            const top = topRowY(4) - HOLE / 2;
            const height = botRowY(0) - topRowY(4) + HOLE;
            return (
              <g
                key={comp.id}
                onPointerDown={(e) => startDragComponent(e, comp)}
                onClick={(e) => {
                  e.stopPropagation();
                  if (activeTool === "extractor") onRemoveComponent(comp.id);
                }}
                style={{ cursor: activeTool === "extractor" ? "not-allowed" : "grab", touchAction: "none" }}
              >
                <title>
                  {def.code} — {def.label}
                  {def.description ? `: ${def.description}` : ""}
                </title>
                <rect
                  x={left}
                  y={top}
                  width={width}
                  height={height}
                  rx="4"
                  fill="oklch(0.16 0.02 260 / 0.96)"
                  stroke="var(--lab-cyan)"
                  strokeWidth="1.2"
                  style={{ filter: "drop-shadow(0 0 6px oklch(0.86 0.16 200 / 0.4))" }}
                />
                <circle cx={left + 8} cy={top + 8} r="2.5" fill="var(--lab-cyan)" />
                <text
                  x={left + width / 2}
                  y={top + height / 2 + 4}
                  textAnchor="middle"
                  fontFamily="ui-monospace, monospace"
                  fontSize="11"
                  fontWeight="bold"
                  fill="var(--lab-ink)"
                >
                  {def.code}
                </text>
                {/* pin bumps — one per physical DIP pin, straddling the gutter */}
                {Array.from({ length: half }, (_, i) => (
                  <rect key={`pt${i}`} x={colX(c0 + i) - 2} y={top - 4} width={4} height={4} fill="oklch(0.75 0.03 260)" />
                ))}
                {Array.from({ length: half }, (_, i) => (
                  <rect key={`pb${i}`} x={colX(c0 + i) - 2} y={top + height} width={4} height={4} fill="oklch(0.75 0.03 260)" />
                ))}
              </g>
            );
          })}

          {/* ---------- Clock generator ---------- */}
          <g transform={`translate(${MATRIX_X - 200}, ${INPUT_TAP_Y + 36})`}>
            <rect width="140" height="90" rx="8" fill="oklch(0.15 0.03 265 / .7)" stroke="var(--lab-border)" />
            <text x="12" y="18" fontFamily="ui-monospace, monospace" fontSize="9" letterSpacing="1.5" fill="var(--lab-muted)">
              CLOCK GEN
            </text>
            <g
              transform="translate(70, 55)"
              onClick={(e) => {
                e.stopPropagation();
                onToggleClock();
              }}
              style={{ cursor: "pointer" }}
            >
              <circle r="24" fill={clockOn ? "var(--lab-warm)" : "oklch(0.20 0.02 260)"} stroke="var(--lab-border)" style={clockOn ? { filter: "drop-shadow(0 0 10px var(--lab-warm))" } : undefined}>
                {clockOn && <animate attributeName="opacity" values="1;0.55;1" dur="0.8s" repeatCount="indefinite" />}
              </circle>
              <path d="M-10 0 L-4 0 L0 -9 L5 9 L9 0 L14 0" fill="none" stroke="oklch(0.1 0.02 260)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </g>
            <circle
              cx={70}
              cy={-10}
              r={wireDraft?.key === CLK_NODE ? 6 : 4.5}
              fill={wireDraft?.key === CLK_NODE ? "var(--lab-warm)" : "oklch(0.30 0.02 260)"}
              stroke="var(--lab-warm)"
              strokeWidth="1.2"
            />
            <text x={70} y={110} textAnchor="middle" fontFamily="ui-monospace, monospace" fontSize="8" fill="var(--lab-muted)">
              CLK TAP
            </text>
          </g>

          {/* ---------- Manual input switches ---------- */}
          <g>
            <text x={tapX(0)} y={INPUT_TAP_Y + 36 - 14} fontFamily="ui-monospace, monospace" fontSize="9" letterSpacing="1.5" fill="var(--lab-muted)">
              MANUAL INPUT SWITCHES
            </text>
            {Array.from({ length: 8 }, (_, i) => i).map((i) => {
              const x = tapX(i);
              return (
                <g
                  key={`sw-${i}`}
                  transform={`translate(${x - 17}, ${INPUT_TAP_Y + 36})`}
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleInput(i);
                  }}
                  style={{ cursor: "pointer" }}
                >
                  <line x1={17} y1={-36} x2={17} y2={0} stroke="var(--lab-border)" strokeWidth="1.5" strokeDasharray="2 3" />
                  <rect width="34" height="60" rx="6" fill="oklch(0.13 0.02 260)" stroke="var(--lab-border)" />
                  <rect
                    x="4"
                    y={inputs[i] ? 4 : 30}
                    width="26"
                    height="26"
                    rx="4"
                    fill={inputs[i] ? "var(--lab-pink)" : "oklch(0.30 0.02 260)"}
                    style={inputs[i] ? { filter: "drop-shadow(0 0 6px var(--lab-pink))" } : undefined}
                  />
                  <text x="17" y="72" textAnchor="middle" fontFamily="ui-monospace, monospace" fontSize="9" fill="var(--lab-muted)">
                    I{i}={inputs[i] ? 1 : 0}
                  </text>
                </g>
              );
            })}
          </g>

          {/* ---------- Hole hit-layer ---------- */}
          {/* Sits on top of everything (wires, ICs) so a hole is always clickable and never
             blocked by whatever's drawn over it. Only intercepts pointer events while a wire
             is actually being drawn or re-routed; otherwise clicks pass straight through to
             components/wires beneath. */}
          <g style={{ pointerEvents: holesActive ? "auto" : "none" }}>
            {allHoles.map((h, i) => (
              <circle
                key={`hit-${i}`}
                cx={h.x}
                cy={h.y}
                r={HOLE_HIT_R}
                fill="transparent"
                style={{ cursor: holeCursor }}
                onClick={(e) => handleHole(e, h.key, h.x, h.y)}
              />
            ))}
          </g>

          {/* ---------- Selected wire's topmost UI: scrim + recolor/delete popup + endpoint drag handles ---------- */}
          {/* Rendered last (topmost) so none of this is ever covered or click-blocked by an IC
             or the hole hit-layer drawn earlier. While the recolor/delete popup is open, an
             invisible full-board scrim sits directly beneath it (but above everything else):
             any click that doesn't land on the popup itself or a drag handle falls through to
             the scrim, which just deselects — so nothing underneath is reachable/selectable
             while the popup is showing, and clicking anywhere outside it closes it. */}
          {selectedWireId &&
            (() => {
              const w = wires.find((wire) => wire.id === selectedWireId);
              if (!w) return null;
              const isDraggingFrom = dragEndpoint?.wireId === w.id && dragEndpoint.end === "from";
              const isDraggingTo = dragEndpoint?.wireId === w.id && dragEndpoint.end === "to";
              const fromPt = isDraggingFrom ? { ...w.from, x: dragEndpoint!.x, y: dragEndpoint!.y } : w.from;
              const toPt = isDraggingTo ? { ...w.to, x: dragEndpoint!.x, y: dragEndpoint!.y } : w.to;
              const offset = isDraggingFrom || isDraggingTo ? 0 : wireOffset(w);
              const midX = (fromPt.x + toPt.x) / 2;
              const midY = snap((fromPt.y + toPt.y) / 2) + offset;
              const showPopup = !endpointEdit;
              return (
                <g>
                  {showPopup && (
                    <rect
                      x={0}
                      y={0}
                      width={VIEW.w}
                      height={VIEW.h}
                      fill="transparent"
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectWire(null);
                      }}
                    />
                  )}

                  {(["from", "to"] as const).map((end) => {
                    const pt = end === "from" ? fromPt : toPt;
                    const beingMoved = dragEndpoint?.wireId === w.id && dragEndpoint.end === end;
                    return (
                      <circle
                        key={end}
                        cx={pt.x}
                        cy={pt.y}
                        r={beingMoved ? 8 : 6.5}
                        fill="white"
                        stroke={colorVar(w.color)}
                        strokeWidth="2.5"
                        style={{ cursor: "grab", touchAction: "none" }}
                        onClick={(e) => e.stopPropagation()}
                        onPointerDown={(e) => {
                          e.stopPropagation();
                          (e.target as Element).setPointerCapture(e.pointerId);
                          const { x, y } = clientToBoard(e.clientX, e.clientY);
                          onStartEndpointEdit(w.id, end);
                          setDragEndpoint({ wireId: w.id, end, x, y });
                        }}
                      >
                        {beingMoved && <animate attributeName="r" values="6;9;6" dur="0.8s" repeatCount="indefinite" />}
                      </circle>
                    );
                  })}

                  {/* Recolor / delete popup for the selected wire. */}
                  {showPopup && (
                    <foreignObject x={midX - 92} y={midY - 44} width="184" height="42" style={{ overflow: "visible" }}>
                      <div
                        className="flex flex-wrap items-center gap-1 rounded-md border border-[var(--lab-border)] bg-[oklch(0.12_0.02_260/0.97)] px-1.5 py-1 shadow-lg"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {WIRE_COLORS.map((c) => (
                          <button
                            key={c.id}
                            type="button"
                            aria-label={`Recolor to ${c.id}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              onChangeWireColor(w.id, c.id);
                            }}
                            className="h-3.5 w-3.5 shrink-0 rounded-full border"
                            style={{
                              background: c.swatch,
                              borderColor: w.color === c.id ? "var(--lab-ink)" : "transparent",
                              boxShadow: w.color === c.id ? `0 0 6px ${c.swatch}` : "none",
                            }}
                          />
                        ))}
                        <button
                          type="button"
                          aria-label="Delete wire"
                          onClick={(e) => {
                            e.stopPropagation();
                            onRemoveWire(w.id);
                          }}
                          className="ml-1 shrink-0 rounded px-1.5 font-mono text-[11px] font-bold leading-4 text-[var(--lab-warm)] hover:bg-[oklch(0.35_0.15_25/0.35)]"
                        >
                          ×
                        </button>
                      </div>
                    </foreignObject>
                  )}
                </g>
              );
            })()}
        </svg>
      </div>
    </div>
  );
}

function BusRow({
  y,
  label,
  color,
  dim,
  nodeKey,
  activeKey,
  count,
}: {
  y: number;
  label: string;
  color: string;
  dim?: boolean;
  nodeKey: string;
  activeKey?: string;
  /** Number of evenly-spaced holes drawn along the bus (aligned to the matrix column pitch). */
  count: number;
}) {
  const active = activeKey === nodeKey;
  return (
    <g>
      <line x1={MATRIX_X - 26} y1={y} x2={MATRIX_RIGHT_X + 26} y2={y} stroke={color} strokeWidth="2.5" opacity={dim ? 0.55 : 0.85} style={{ filter: `drop-shadow(0 0 5px ${color})` }} />
      <text x={MATRIX_X - 26} y={y - 8} fontFamily="ui-monospace, monospace" fontSize="9" letterSpacing="1.5" fill={color}>
        {label}
      </text>
      {Array.from({ length: count }, (_, i) => {
        const x = MATRIX_X + (i * (MATRIX_RIGHT_X - MATRIX_X)) / (count - 1);
        return <circle key={i} cx={x} cy={y} r={active ? 3.4 : 2.6} fill={color} opacity={dim ? 0.5 : 0.8} />;
      })}
    </g>
  );
}

function PowerTerminal({
  x,
  y,
  label,
  color,
  nodeKey,
  activeKey,
}: {
  x: number;
  y: number;
  label: string;
  color: string;
  nodeKey: string;
  activeKey?: string;
}) {
  const active = activeKey === nodeKey;
  return (
    <g>
      <circle
        cx={x}
        cy={y}
        r={active ? 9 : 7}
        fill="oklch(0.15 0.02 260)"
        stroke={color}
        strokeWidth="2"
        style={{ filter: `drop-shadow(0 0 4px ${color})` }}
      />
      <text x={x} y={y + 20} textAnchor="middle" fontFamily="ui-monospace, monospace" fontSize="8" fill={color}>
        {label}
      </text>
    </g>
  );
}