import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { LabPageShell } from "@/components/lab/LabPageShell";
import {
  COMPONENT_LIBRARY,
  type GateSpec,
  type PartDef,
} from "@/components/lab/virtual-lab/componentLibrary";
import { PartIcon } from "@/components/lab/virtual-lab/PartIcon";

/* ============================================================================
 * /component-library — datasheet reference for every part in the Virtual
 * Lab's parts bin (gate ICs, arithmetic, decoders/muxes, sequential logic,
 * registers/counters). Pulls straight from COMPONENT_LIBRARY, the same
 * catalogue that drives the trainer kit and simulator, so this page can never
 * drift out of sync with what's actually on the breadboard. Tapping any part
 * opens a popup with its real DIP pin diagram (built from that part's own
 * `pinout` data) and, for simple gate-ICs, a second tab with a schematic
 * "inner gate diagram" showing how the package's gates wire up to its pins —
 * every pin labeled with both its DIP number and its standard datasheet
 * input/output letter (A, B, Y, …).
 *
 * The library is small enough (a couple dozen parts total) that a search box
 * added more friction than it saved, so parts are just grouped by category
 * and shown in full.
 * ========================================================================== */

export const Route = createFileRoute("/component-library")({
  component: ComponentLibraryPage,
  head: () => ({
    meta: [
      { title: "Component Library · DIGITAL LOGIC DESIGN" },
      {
        name: "description",
        content:
          "Datasheet reference for every IC in the Virtual Lab, with real DIP pin diagrams and internal gate schematics.",
      },
    ],
  }),
});

const REFERENCE_CATEGORIES = COMPONENT_LIBRARY.filter((cat) => cat.id !== "tools");
const TOTAL_PARTS = REFERENCE_CATEGORIES.reduce((n, cat) => n + cat.parts.length, 0);

/** Only these packages are simple enough (uniform 2-input, or single-input,
 *  gates repeated across the DIP) to render as a schematic internal diagram. */
const GATE_TYPE_BY_CODE: Record<string, "AND" | "OR" | "NAND" | "NOR" | "XOR" | "NOT"> = {
  "7400": "NAND",
  "7402": "NOR",
  "7404": "NOT",
  "7408": "AND",
  "7432": "OR",
  "7486": "XOR",
};

function ComponentLibraryPage() {
  const [selected, setSelected] = useState<PartDef | null>(null);

  useEffect(() => {
    if (!selected) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSelected(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selected]);

  return (
    <LabPageShell
      eyebrow="REFERENCE"
      title="COMPONENT LIBRARY"
      description="Every part available in the Virtual Lab, with a real DIP pin diagram. Tap a part to see its pinout — and, for gate ICs, the internal gate schematic."
    >
      <div className="flex flex-col gap-8">
        {REFERENCE_CATEGORIES.map((cat) => (
          <section key={cat.id}>
            <div className="mb-3 flex items-center gap-3">
              <h2 className="font-mono text-xs font-semibold tracking-[0.25em] text-[var(--lab-cyan)]">
                {cat.label.toUpperCase()}
              </h2>
              <span className="h-px flex-1 bg-[var(--lab-border)]" />
              <span className="font-mono text-[10px] tracking-[0.15em] text-[var(--lab-muted)]">
                {cat.parts.length}
              </span>
            </div>
            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
              {cat.parts.map((part) => (
                <button
                  key={part.id}
                  type="button"
                  onClick={() => setSelected(part)}
                  className="group flex items-start gap-3 rounded-lg border border-[var(--lab-border)] bg-[oklch(0.15_0.03_265/.5)] px-3 py-3 text-left transition hover:border-[var(--lab-cyan)] hover:shadow-[var(--glow-cyan)]"
                >
                  <span className="flex h-9 w-11 shrink-0 items-center justify-center rounded border border-[var(--lab-border)] bg-[oklch(0.10_0.03_260/.7)] text-[var(--lab-cyan)] transition group-hover:border-[var(--lab-cyan)]">
                    <PartIcon shape={part.shape} className="h-5 w-7" />
                  </span>
                  <span className="flex min-w-0 flex-col">
                    <span className="truncate text-sm font-medium text-[var(--lab-ink)]">
                      {part.label}
                    </span>
                    <span className="font-mono text-[10px] tracking-[0.15em] text-[var(--lab-muted)]">
                      {part.code} · {part.pins}-PIN DIP
                    </span>
                  </span>
                </button>
              ))}
            </div>
          </section>
        ))}
        <p className="font-mono text-[10px] tracking-[0.15em] text-[var(--lab-muted)]">
          {TOTAL_PARTS} PART{TOTAL_PARTS === 1 ? "" : "S"} IN THE LIBRARY
        </p>
      </div>

      {selected && <PinoutModal part={selected} onClose={() => setSelected(null)} />}
    </LabPageShell>
  );
}

/** A pin's role, derived from the part's own simulation metadata rather than
 *  guessed from its label — so the color coding can never drift out of sync
 *  with what the part actually does. Every `logic.gates` / `combinational` /
 *  `sequential` function in the catalogue returns the same fixed set of pin
 *  keys no matter what's fed in, so calling each with dummy (all-false) input
 *  is enough to recover the full set of pins the part drives. */
function computeOutputPins(part: PartDef): Set<number> {
  const out = new Set<number>();
  const logic = part.logic;
  if (!logic) return out;
  logic.gates?.forEach((g) => out.add(g.output));
  if (logic.combinational) {
    try {
      Object.keys(logic.combinational(() => false)).forEach((k) => out.add(Number(k)));
    } catch {
      /* defensive: a future combinational fn that isn't input-independent shouldn't crash the page */
    }
  }
  logic.sequential?.forEach((el) => {
    try {
      Object.keys(el.outputs(Array(el.stateBits).fill(false))).forEach((k) => out.add(Number(k)));
    } catch {
      /* same as above */
    }
  });
  return out;
}

/** Standard datasheet letter for a given DIP pin number, read straight out of
 *  the part's own `pinout.left` / `pinout.right` arrays (e.g. "1A", "2Y",
 *  "VCC"). Falls back to a bare pin number if the part has no pinout data. */
function labelForPin(part: PartDef, pinNum: number): string {
  const half = part.pins / 2;
  if (!part.pinout) return `P${pinNum}`;
  return pinNum <= half
    ? (part.pinout.left[pinNum - 1] ?? `P${pinNum}`)
    : (part.pinout.right[part.pins - pinNum] ?? `P${pinNum}`);
}

function PinoutModal({ part, onClose }: { part: PartDef; onClose: () => void }) {
  const gateType = GATE_TYPE_BY_CODE[part.code];
  const hasInternalDiagram = Boolean(gateType && part.logic?.gates?.length);
  const [view, setView] = useState<"pinout" | "internal">("pinout");

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[oklch(0.05_0.01_260/.75)] p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="lab-panel relative max-h-[90vh] w-full max-w-3xl overflow-y-auto p-5 sm:p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="lab-scanline" aria-hidden />
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute right-4 top-4 rounded-md border border-[var(--lab-border)] px-2 py-1 font-mono text-xs text-[var(--lab-muted)] transition hover:border-[var(--lab-warm)] hover:text-[var(--lab-warm)]"
        >
          ✕ CLOSE
        </button>

        <div className="flex items-start gap-3 pr-16">
          <span className="flex h-10 w-12 shrink-0 items-center justify-center rounded border border-[var(--lab-border)] bg-[oklch(0.10_0.03_260/.7)] text-[var(--lab-cyan)]">
            <PartIcon shape={part.shape} className="h-6 w-8" />
          </span>
          <div className="min-w-0">
            <p className="text-[10px] tracking-[0.3em] text-[var(--lab-muted)]">
              {COMPONENT_LIBRARY.find((c) => c.id === part.category)?.label.toUpperCase() ??
                part.category.toUpperCase()}
            </p>
            <h3 className="lab-title text-lg font-bold tracking-[0.08em]">
              {part.label} <span className="text-[var(--lab-cyan)]">· {part.code}</span>
            </h3>
          </div>
        </div>

        <p className="mt-3 text-sm leading-relaxed text-[var(--lab-muted)]">{part.description}</p>

        {hasInternalDiagram && (
          <div className="mt-4 flex gap-2">
            <button
              type="button"
              onClick={() => setView("pinout")}
              className={`rounded-md border px-3 py-1.5 font-mono text-[10px] tracking-[0.15em] transition ${
                view === "pinout"
                  ? "border-[var(--lab-cyan)] text-[var(--lab-cyan)] shadow-[var(--glow-cyan)]"
                  : "border-[var(--lab-border)] text-[var(--lab-muted)] hover:text-[var(--lab-ink)]"
              }`}
            >
              PIN LAYOUT
            </button>
            <button
              type="button"
              onClick={() => setView("internal")}
              className={`rounded-md border px-3 py-1.5 font-mono text-[10px] tracking-[0.15em] transition ${
                view === "internal"
                  ? "border-[var(--lab-cyan)] text-[var(--lab-cyan)] shadow-[var(--glow-cyan)]"
                  : "border-[var(--lab-border)] text-[var(--lab-muted)] hover:text-[var(--lab-ink)]"
              }`}
            >
              INTERNAL GATE DIAGRAM
            </button>
          </div>
        )}

        <div className="mt-5 flex justify-center overflow-x-auto rounded-lg border border-[var(--lab-border)] bg-[oklch(0.10_0.02_260/.6)] py-6">
          {view === "internal" && hasInternalDiagram && gateType ? (
            <GateInternalDiagram part={part} gateType={gateType} />
          ) : part.pinout ? (
            <PinoutDiagram part={part} />
          ) : (
            <p className="px-6 py-10 text-center font-mono text-xs tracking-[0.1em] text-[var(--lab-muted)]">
              NO PIN DIAGRAM AVAILABLE FOR THIS PART.
            </p>
          )}
        </div>

        {part.logic && (
          <p className="mt-3 font-mono text-[10px] tracking-[0.15em] text-[var(--lab-muted)]">
            VCC = PIN {part.logic.vccPin} · GND = PIN {part.logic.gndPin} · {part.pins}-PIN DIP
          </p>
        )}
      </div>
    </div>
  );
}

/** Renders a datasheet-style DIP pin diagram from a part's `pinout.left` /
 *  `pinout.right` label arrays: row i pairs left pin (i+1) with right pin
 *  (pins - i) — standard DIP numbering with pin 1 at the top-left (notch),
 *  wrapping counter-clockwise down the left side and back up the right. Every
 *  pin is labeled with its standard datasheet letter (A/B/Y/…) and colored by
 *  its actual role (power, clock, input, output), derived from the part's own
 *  simulation metadata via `computeOutputPins`. */
function PinoutDiagram({ part }: { part: PartDef }) {
  const half = part.pins / 2;
  const rowH = 26;
  const bodyW = 128;
  const padY = 26;
  const legLen = 30;
  const labelW = 76;
  const bodyH = half * rowH;
  const width = labelW * 2 + legLen * 2 + bodyW + 16;
  const height = bodyH + padY * 2 + 14;
  const cx = width / 2;
  const bodyLeft = cx - bodyW / 2;
  const bodyRight = cx + bodyW / 2;
  const bodyTop = padY;

  const outputPins = computeOutputPins(part);

  const pinColor = (pinNum: number, label: string) => {
    if (part.logic?.vccPin === pinNum) return "var(--lab-pink)";
    if (part.logic?.gndPin === pinNum) return "var(--lab-cyan)";
    if (/CLK/i.test(label)) return "var(--lab-warm)";
    if (outputPins.has(pinNum)) return "var(--lab-mint)";
    return "oklch(0.75 0.03 260)";
  };

  const rows = Array.from({ length: half }, (_, i) => {
    const leftPin = i + 1;
    const rightPin = part.pins - i;
    const leftLabel = part.pinout!.left[i] ?? `P${leftPin}`;
    const rightLabel = part.pinout!.right[i] ?? `P${rightPin}`;
    const y = bodyTop + i * rowH + rowH / 2;
    return { y, leftPin, rightPin, leftLabel, rightLabel };
  });

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      width={Math.min(width, 560)}
      role="img"
      aria-label={`${part.code} pin diagram`}
      className="text-[var(--lab-ink)]"
    >
      {/* chip body */}
      <rect
        x={bodyLeft}
        y={bodyTop}
        width={bodyW}
        height={bodyH}
        rx="4"
        fill="oklch(0.16 0.02 260 / 0.96)"
        stroke="var(--lab-cyan)"
        strokeWidth="1.4"
        style={{ filter: "drop-shadow(0 0 8px oklch(0.86 0.16 200 / 0.35))" }}
      />
      {/* notch (pin-1 orientation marker) */}
      <path
        d={`M ${cx - 12} ${bodyTop} A 12 10 0 0 0 ${cx + 12} ${bodyTop}`}
        fill="oklch(0.10 0.02 260)"
        stroke="var(--lab-cyan)"
        strokeWidth="1.2"
      />
      <text
        x={cx}
        y={bodyTop + bodyH / 2 + 4}
        textAnchor="middle"
        fontFamily="ui-monospace, monospace"
        fontSize="12"
        fontWeight="bold"
        fill="var(--lab-ink)"
      >
        {part.code}
      </text>

      {rows.map(({ y, leftPin, rightPin, leftLabel, rightLabel }) => {
        const lColor = pinColor(leftPin, leftLabel);
        const rColor = pinColor(rightPin, rightLabel);
        const legX0 = bodyLeft - legLen;
        const legX1 = bodyRight + legLen;
        return (
          <g key={leftPin}>
            {/* left leg + pad */}
            <line x1={legX0} y1={y} x2={bodyLeft} y2={y} stroke={lColor} strokeWidth="2" />
            <rect x={legX0 - 3} y={y - 3} width="6" height="6" fill={lColor} />
            <text
              x={legX0 - 8}
              y={y + 3.5}
              textAnchor="end"
              fontFamily="ui-monospace, monospace"
              fontSize="10"
              fill={lColor}
            >
              {leftLabel}
            </text>
            <text
              x={bodyLeft + 6}
              y={y - 4}
              textAnchor="start"
              fontFamily="ui-monospace, monospace"
              fontSize="7"
              fill="oklch(0.6 0.02 260)"
            >
              {leftPin}
            </text>

            {/* right leg + pad */}
            <line x1={bodyRight} y1={y} x2={legX1} y2={y} stroke={rColor} strokeWidth="2" />
            <rect x={legX1 - 3} y={y - 3} width="6" height="6" fill={rColor} />
            <text
              x={legX1 + 8}
              y={y + 3.5}
              textAnchor="start"
              fontFamily="ui-monospace, monospace"
              fontSize="10"
              fill={rColor}
            >
              {rightLabel}
            </text>
            <text
              x={bodyRight - 6}
              y={y - 4}
              textAnchor="end"
              fontFamily="ui-monospace, monospace"
              fontSize="7"
              fill="oklch(0.6 0.02 260)"
            >
              {rightPin}
            </text>
          </g>
        );
      })}

      {/* legend */}
      <g
        transform={`translate(${cx - 130}, ${height - 6})`}
        fontFamily="ui-monospace, monospace"
        fontSize="8"
      >
        <rect x="0" y="-7" width="7" height="7" fill="var(--lab-pink)" />
        <text x="10" y="-1" fill="var(--lab-muted)">
          VCC
        </text>
        <rect x="46" y="-7" width="7" height="7" fill="var(--lab-cyan)" />
        <text x="56" y="-1" fill="var(--lab-muted)">
          GND
        </text>
        <rect x="96" y="-7" width="7" height="7" fill="var(--lab-warm)" />
        <text x="106" y="-1" fill="var(--lab-muted)">
          CLK
        </text>
        <rect x="146" y="-7" width="7" height="7" fill="oklch(0.75 0.03 260)" />
        <text x="156" y="-1" fill="var(--lab-muted)">
          IN
        </text>
        <rect x="186" y="-7" width="7" height="7" fill="var(--lab-mint)" />
        <text x="196" y="-1" fill="var(--lab-muted)">
          OUT
        </text>
      </g>
    </svg>
  );
}

/** Top-view "inner gate diagram" for simple quad/hex gate-IC packages — the
 *  same style as a datasheet's internal schematic (see e.g. the 7408's), with
 *  pin-number boxes running left-to-right along the top and bottom edges
 *  (standard DIP top-view numbering: pin 1 at bottom-left, wrapping
 *  counter-clockwise up to pin `pins` at top-left) and each package gate
 *  drawn as its real schematic symbol (AND/OR/NAND/NOR/XOR/NOT), wired to the
 *  pins it actually uses. Every input and output wire is also labeled with
 *  its standard datasheet letter (1A, 1B, 1Y, …), not just its pin number. */
function GateInternalDiagram({
  part,
  gateType,
}: {
  part: PartDef;
  gateType: "AND" | "OR" | "NAND" | "NOR" | "XOR" | "NOT";
}) {
  const pins = part.pins;
  const half = pins / 2;
  const bottomLabels = part.pinout?.left ?? Array.from({ length: half }, (_, i) => `P${i + 1}`);
  const topLabels = part.pinout?.right ?? Array.from({ length: half }, (_, i) => `P${pins - i}`);

  const spacing = 46;
  const padX = 30;
  const bodyW = half * spacing;
  const width = bodyW + padX * 2;
  const bodyTop = 54;
  const bodyH = 150;
  const height = bodyH + bodyTop + 54;
  const edgeTopY = bodyTop;
  const edgeBottomY = bodyTop + bodyH;

  const xOf = (idx: number) => padX + spacing * (idx + 0.5);
  /** Physical position of a DIP pin in this top-view layout: pins 1..half run
   *  left-to-right along the bottom edge; pins half+1..pins run left-to-right
   *  along the top edge (so pin `pins` sits top-left, pin half+1 top-right). */
  const idxOfPin = (pinNum: number) =>
    pinNum <= half
      ? { side: "bottom" as const, idx: pinNum - 1 }
      : { side: "top" as const, idx: pins - pinNum };

  const gates: GateSpec[] = part.logic?.gates ?? [];
  const inverted = gateType === "NAND" || gateType === "NOR" || gateType === "NOT";

  const GATE_FLAT_DEPTH = 22;
  const GATE_TIP_DEPTH = 46;
  const ELBOW_EXTRA = 16;

  const gateElems = gates.map((g, gi) => {
    const outPos = idxOfPin(g.output);
    const side = outPos.side;
    const inXs = g.inputs.map((p) => xOf(idxOfPin(p).idx));
    const outX = xOf(outPos.idx);
    const leftX = Math.min(...inXs);
    const rightX = Math.max(...inXs);
    const cx = (leftX + rightX) / 2;
    const gW = Math.max(rightX - leftX, 26);
    const gLeftX = cx - gW / 2;
    const gRightX = cx + gW / 2;

    const edgeY = side === "bottom" ? edgeBottomY : edgeTopY;
    const inward = side === "bottom" ? -1 : 1;
    const flatY = edgeY + inward * GATE_FLAT_DEPTH;
    const tipY = edgeY + inward * GATE_TIP_DEPTH;
    const elbowY = edgeY + inward * (GATE_TIP_DEPTH + ELBOW_EXTRA);
    const midY = (flatY + tipY) / 2;
    const bubbleR = 4.2;
    const bubbleCy = tipY + inward * (bubbleR + 1);

    let bodyPath: string;
    if (gateType === "NOT") {
      bodyPath = `M ${gLeftX} ${flatY} L ${gRightX} ${flatY} L ${cx} ${tipY} Z`;
    } else if (gateType === "AND" || gateType === "NAND") {
      bodyPath = `M ${gLeftX} ${flatY} L ${gLeftX} ${midY} Q ${cx} ${tipY} ${gRightX} ${midY} L ${gRightX} ${flatY} Z`;
    } else {
      const backCtrlY = flatY - inward * gW * 0.22;
      bodyPath = `M ${gLeftX} ${flatY} Q ${cx} ${backCtrlY} ${gRightX} ${flatY} Q ${gRightX} ${midY} ${cx} ${tipY} Q ${gLeftX} ${midY} ${gLeftX} ${flatY} Z`;
    }

    const xorExtra =
      gateType === "XOR"
        ? `M ${gLeftX} ${flatY - inward * 7} Q ${cx} ${flatY - inward * gW * 0.22 - inward * 7} ${gRightX} ${flatY - inward * 7}`
        : null;

    const inputLinesD = inXs.map((x) => `M ${x} ${edgeY} L ${x} ${flatY}`).join(" ");
    const outputPathD = `M ${cx} ${tipY} L ${cx} ${elbowY} L ${outX} ${elbowY} L ${outX} ${edgeY}`;

    const inLabels = g.inputs.map((p, i) => ({ x: inXs[i], label: labelForPin(part, p) }));
    const outLabel = labelForPin(part, g.output);
    const labelY = edgeY + inward * 10;

    return {
      gi,
      side,
      inward,
      bodyPath,
      inputLinesD,
      outputPathD,
      xorExtra,
      bubbleCy,
      bubbleR,
      cx,
      inLabels,
      outLabel,
      outX,
      labelY,
    };
  });

  const vccPos = part.logic ? idxOfPin(part.logic.vccPin) : null;
  const gndPos = part.logic ? idxOfPin(part.logic.gndPin) : null;

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      width={Math.min(width, 620)}
      role="img"
      aria-label={`${part.code} internal gate diagram`}
      className="text-[var(--lab-ink)]"
    >
      {/* chip body */}
      <rect
        x={padX}
        y={edgeTopY}
        width={bodyW}
        height={bodyH}
        rx="3"
        fill="oklch(0.15 0.02 260 / 0.92)"
        stroke="var(--lab-cyan)"
        strokeWidth="1.4"
        style={{ filter: "drop-shadow(0 0 8px oklch(0.86 0.16 200 / 0.3))" }}
      />
      {/* notch (pin-1 orientation marker), left edge */}
      <path
        d={`M ${padX} ${edgeTopY + bodyH / 2 - 12} A 12 12 0 0 0 ${padX} ${edgeTopY + bodyH / 2 + 12}`}
        fill="oklch(0.10 0.02 260)"
        stroke="var(--lab-cyan)"
        strokeWidth="1.2"
      />
      <text
        x={padX + bodyW / 2}
        y={edgeTopY + bodyH / 2 + 4}
        textAnchor="middle"
        fontFamily="ui-monospace, monospace"
        fontSize="13"
        fontWeight="bold"
        fill="var(--lab-ink)"
      >
        {part.code}
      </text>

      {/* bottom pin row: pins 1..half, left to right */}
      {bottomLabels.slice(0, half).map((label, i) => {
        const pinNum = i + 1;
        const x = xOf(i);
        const isVcc = part.logic?.vccPin === pinNum;
        const isGnd = part.logic?.gndPin === pinNum;
        const color = isVcc
          ? "var(--lab-pink)"
          : isGnd
            ? "var(--lab-cyan)"
            : "oklch(0.72 0.03 260)";
        return (
          <g key={`b${i}`}>
            <rect
              x={x - 14}
              y={edgeBottomY}
              width="28"
              height="20"
              rx="2"
              fill="oklch(0.11 0.02 260)"
              stroke={color}
              strokeWidth="1.1"
            />
            <text
              x={x}
              y={edgeBottomY + 14}
              textAnchor="middle"
              fontFamily="ui-monospace, monospace"
              fontSize="10"
              fontWeight="bold"
              fill={color}
            >
              {pinNum}
            </text>
            <text
              x={x}
              y={edgeBottomY + 33}
              textAnchor="middle"
              fontFamily="ui-monospace, monospace"
              fontSize="8"
              fill="var(--lab-muted)"
            >
              {label}
            </text>
          </g>
        );
      })}

      {/* top pin row: pins `pins`..half+1, left to right */}
      {topLabels.slice(0, half).map((label, i) => {
        const pinNum = pins - i;
        const x = xOf(i);
        const isVcc = part.logic?.vccPin === pinNum;
        const isGnd = part.logic?.gndPin === pinNum;
        const color = isVcc
          ? "var(--lab-pink)"
          : isGnd
            ? "var(--lab-cyan)"
            : "oklch(0.72 0.03 260)";
        return (
          <g key={`t${i}`}>
            <rect
              x={x - 14}
              y={edgeTopY - 20}
              width="28"
              height="20"
              rx="2"
              fill="oklch(0.11 0.02 260)"
              stroke={color}
              strokeWidth="1.1"
            />
            <text
              x={x}
              y={edgeTopY - 6}
              textAnchor="middle"
              fontFamily="ui-monospace, monospace"
              fontSize="10"
              fontWeight="bold"
              fill={color}
            >
              {pinNum}
            </text>
            <text
              x={x}
              y={edgeTopY - 25}
              textAnchor="middle"
              fontFamily="ui-monospace, monospace"
              fontSize="8"
              fill="var(--lab-muted)"
            >
              {label}
            </text>
          </g>
        );
      })}

      {/* gates */}
      {gateElems.map((ge) => (
        <g key={ge.gi}>
          <path d={ge.inputLinesD} stroke="oklch(0.72 0.03 260)" strokeWidth="1.6" fill="none" />
          <path d={ge.outputPathD} stroke="var(--lab-mint)" strokeWidth="1.6" fill="none" />
          {ge.xorExtra && (
            <path d={ge.xorExtra} stroke="var(--lab-ink)" strokeWidth="1.2" fill="none" />
          )}
          <path
            d={ge.bodyPath}
            fill="oklch(0.19 0.03 265 / 0.95)"
            stroke="var(--lab-ink)"
            strokeWidth="1.5"
          />
          {inverted && (
            <circle
              cx={ge.cx}
              cy={ge.bubbleCy}
              r={ge.bubbleR}
              fill="oklch(0.19 0.03 265)"
              stroke="var(--lab-ink)"
              strokeWidth="1.3"
            />
          )}
          {ge.inLabels.map((il, i) => (
            <text
              key={i}
              x={il.x}
              y={ge.labelY}
              textAnchor="middle"
              fontFamily="ui-monospace, monospace"
              fontSize="8"
              fontWeight="bold"
              fill="oklch(0.72 0.03 260)"
            >
              {il.label}
            </text>
          ))}
          <text
            x={ge.outX}
            y={ge.labelY}
            textAnchor="middle"
            fontFamily="ui-monospace, monospace"
            fontSize="8"
            fontWeight="bold"
            fill="var(--lab-mint)"
          >
            {ge.outLabel}
          </text>
        </g>
      ))}

      {/* VCC / GND callouts */}
      {vccPos && (
        <text
          x={xOf(vccPos.idx)}
          y={vccPos.side === "top" ? edgeTopY - 40 : edgeBottomY + 46}
          textAnchor="middle"
          fontFamily="ui-monospace, monospace"
          fontSize="9"
          fontWeight="bold"
          fill="var(--lab-pink)"
        >
          VCC
        </text>
      )}
      {gndPos && (
        <text
          x={xOf(gndPos.idx)}
          y={gndPos.side === "top" ? edgeTopY - 40 : edgeBottomY + 46}
          textAnchor="middle"
          fontFamily="ui-monospace, monospace"
          fontSize="9"
          fontWeight="bold"
          fill="var(--lab-cyan)"
        >
          GND
        </text>
      )}

      {/* legend */}
      <g
        transform={`translate(${padX}, ${height - 4})`}
        fontFamily="ui-monospace, monospace"
        fontSize="8"
      >
        <rect x="0" y="-7" width="7" height="7" fill="oklch(0.72 0.03 260)" />
        <text x="10" y="-1" fill="var(--lab-muted)">
          IN
        </text>
        <rect x="40" y="-7" width="7" height="7" fill="var(--lab-mint)" />
        <text x="50" y="-1" fill="var(--lab-muted)">
          OUT
        </text>
        <rect x="90" y="-7" width="7" height="7" fill="var(--lab-pink)" />
        <text x="100" y="-1" fill="var(--lab-muted)">
          VCC
        </text>
        <rect x="140" y="-7" width="7" height="7" fill="var(--lab-cyan)" />
        <text x="150" y="-1" fill="var(--lab-muted)">
          GND
        </text>
        <text x="200" y="-1" fill="var(--lab-muted)">
          {gates.length}× {gateType} GATE{gates.length === 1 ? "" : "S"}
        </text>
      </g>
    </svg>
  );
}