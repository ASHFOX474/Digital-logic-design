import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { LabPageShell } from "@/components/lab/LabPageShell";
import { ExprView } from "@/components/lab/ExprView";
import { buildTruthTable, minterms } from "@/lib/logic/truthtable";
import { parseMintermList, quineMcCluskey, termToProduct } from "@/lib/logic/qm";
import {
  computeLayout,
  cellIndex,
  loopRectsForPattern,
  type KMapLayout,
} from "@/lib/logic/kmapGeometry";

export const Route = createFileRoute("/analysis/kmap")({
  component: KMapPage,
});

type InputMode = "expression" | "minterms";

const STEP_COLORS = [
  "var(--lab-cyan)",
  "var(--lab-pink)",
  "var(--lab-mint)",
  "var(--lab-purple)",
  "var(--lab-warm)",
  "var(--lab-purple-2)",
];

const CELL = 48; // px, matches h-12 w-12
const GAP = 4; // px, matches gap-1

function KMapPage() {
  const [mode, setMode] = useState<InputMode>("expression");
  const [expr, setExpr] = useState("AB'C' + BC");
  const [mintermRaw, setMintermRaw] = useState("sum_of(1,3,5,6,7)");
  const [numVars, setNumVars] = useState(3);
  const [dontCareRaw, setDontCareRaw] = useState("");
  const [varNamesRaw, setVarNamesRaw] = useState("A,B,C");
  const [currentStepIndex, setCurrentStepIndex] = useState(-1);

  const parsed = useMemo(() => {
    try {
      if (mode === "expression") {
        const table = buildTruthTable(expr);
        return {
          vars: table.vars,
          numVars: table.vars.length,
          requiredMinterms: minterms(table),
          dontCares: [] as number[],
          error: null as string | null,
        };
      }
      const vars = varNamesRaw
        .split(",")
        .map((s) => s.trim().toUpperCase())
        .filter(Boolean);
      const n = numVars;
      const names =
        vars.length === n ? vars : Array.from({ length: n }, (_, i) => String.fromCharCode(65 + i));
      const ms = parseMintermList(mintermRaw);
      const dcs = parseMintermList(dontCareRaw || "()");
      const max = 1 << n;
      const invalid = [...ms, ...dcs].find((m) => m >= max || m < 0);
      if (invalid !== undefined)
        throw new Error(`Term ${invalid} is out of range for ${n} variables (0–${max - 1})`);
      return {
        vars: names,
        numVars: n,
        requiredMinterms: ms,
        dontCares: dcs,
        error: null as string | null,
      };
    } catch (e) {
      return {
        vars: [],
        numVars: 0,
        requiredMinterms: [],
        dontCares: [],
        error: e instanceof Error ? e.message : "Invalid input",
      };
    }
  }, [mode, expr, mintermRaw, dontCareRaw, numVars, varNamesRaw]);

  const qm = useMemo(() => {
    if (parsed.error || parsed.numVars === 0) return null;
    if (parsed.numVars > 6) return null;
    return quineMcCluskey(parsed.requiredMinterms, parsed.dontCares, parsed.numVars);
  }, [parsed]);

  const finalExpr = useMemo(() => {
    if (!qm) return "";
    if (qm.selectedImplicants.length === 0) return parsed.requiredMinterms.length === 0 ? "0" : "1";
    return qm.selectedImplicants.map((t) => termToProduct(t.bits, parsed.vars)).join(" + ");
  }, [qm, parsed]);

  const layout = useMemo(() => {
    if (!qm || parsed.numVars < 2 || parsed.numVars > 6) return null;
    return computeLayout(parsed.numVars, parsed.vars);
  }, [qm, parsed]);

  // The interactive grouping steps shown on the map: one per selected (minimal-cover) prime implicant.
  const groupingSteps = useMemo(() => {
    if (!qm || !layout) return [];
    return qm.selectedImplicants.map((t, i) => ({
      bits: t.bits,
      term: termToProduct(t.bits, parsed.vars),
      cells: t.covers,
      color: STEP_COLORS[i % STEP_COLORS.length],
    }));
  }, [qm, layout, parsed]);

  // Reset the walkthrough whenever the underlying problem changes.
  useEffect(() => {
    setCurrentStepIndex(-1);
  }, [qm]);

  function cellValue(
    l: KMapLayout,
    blockValue: number,
    rowGray: number,
    colGray: number,
  ): "1" | "0" | "X" {
    const index = cellIndex(l, blockValue, rowGray, colGray);
    if (parsed.requiredMinterms.includes(index)) return "1";
    if (parsed.dontCares.includes(index)) return "X";
    return "0";
  }

  /** Does this step's term apply (fully, or partially via shared block-select bits) to this block? */
  function blockMatchesTerm(l: KMapLayout, blockValue: number, bits: string): boolean {
    if (l.blockVarCount === 0) return true;
    const blockBits = bits.slice(0, l.blockVarCount);
    const blockBinary = blockValue.toString(2).padStart(l.blockVarCount, "0");
    for (let i = 0; i < l.blockVarCount; i++) {
      if (blockBits[i] !== "-" && blockBits[i] !== blockBinary[i]) return false;
    }
    return true;
  }

  const gridWidth = layout ? layout.colAxis.length * CELL + (layout.colAxis.length - 1) * GAP : 0;
  const gridHeight = layout ? layout.rowAxis.length * CELL + (layout.rowAxis.length - 1) * GAP : 0;

  return (
    <LabPageShell
      eyebrow="ANALYSIS TOOL"
      title="K-MAP SOLVER"
      description="Plots a Karnaugh map (up to 6 variables, split into 4x4 blocks beyond 4) and derives the minimal SOP using Quine-McCluskey grouping — with an interactive step-by-step walkthrough of how each prime-implicant loop is formed."
    >
      <div className="flex flex-wrap items-center gap-2">
        {(["expression", "minterms"] as const).map((m) => (
          <button
            key={m}
            onClick={() => setMode(m)}
            aria-pressed={mode === m}
            className="rounded-full border px-3 py-1 font-mono text-[10px] tracking-[0.15em] transition"
            style={
              mode === m
                ? {
                    borderColor: "var(--lab-purple)",
                    color: "var(--lab-purple)",
                    boxShadow: "0 0 8px var(--lab-purple)",
                  }
                : { borderColor: "var(--lab-border)", color: "var(--lab-muted)" }
            }
          >
            {m === "expression" ? "FROM EQUATION" : "FROM Σ MINTERMS"}
          </button>
        ))}
      </div>

      {mode === "expression" ? (
        <input
          value={expr}
          onChange={(e) => setExpr(e.target.value)}
          spellCheck={false}
          placeholder="e.g. AB'C' + BC"
          className="mt-3 w-full rounded-md border border-[var(--lab-border)] bg-[oklch(0.11_0.03_260/.8)] px-3 py-2 font-mono text-sm text-[var(--lab-cyan)] outline-none focus:border-[var(--lab-cyan)]"
        />
      ) : (
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <label className="text-xs text-[var(--lab-muted)]">
            Minterms — Σ(...)
            <input
              value={mintermRaw}
              onChange={(e) => setMintermRaw(e.target.value)}
              spellCheck={false}
              placeholder="sum_of(1,3,5,6,7)"
              className="mt-1 w-full rounded-md border border-[var(--lab-border)] bg-[oklch(0.11_0.03_260/.8)] px-3 py-2 font-mono text-sm text-[var(--lab-cyan)] outline-none focus:border-[var(--lab-cyan)]"
            />
          </label>
          <label className="text-xs text-[var(--lab-muted)]">
            Don't-care terms
            <input
              value={dontCareRaw}
              onChange={(e) => setDontCareRaw(e.target.value)}
              spellCheck={false}
              placeholder="d(2,4)"
              className="mt-1 w-full rounded-md border border-[var(--lab-border)] bg-[oklch(0.11_0.03_260/.8)] px-3 py-2 font-mono text-sm text-[var(--lab-warm)] outline-none focus:border-[var(--lab-warm)]"
            />
          </label>
          <label className="text-xs text-[var(--lab-muted)]">
            Number of variables
            <input
              type="number"
              min={2}
              max={6}
              value={numVars}
              onChange={(e) => setNumVars(Math.max(2, Math.min(6, Number(e.target.value) || 2)))}
              className="mt-1 w-full rounded-md border border-[var(--lab-border)] bg-[oklch(0.11_0.03_260/.8)] px-3 py-2 font-mono text-sm text-[var(--lab-ink)] outline-none focus:border-[var(--lab-cyan)]"
            />
          </label>
          <label className="text-xs text-[var(--lab-muted)]">
            Variable names (optional)
            <input
              value={varNamesRaw}
              onChange={(e) => setVarNamesRaw(e.target.value)}
              spellCheck={false}
              placeholder="A,B,C"
              className="mt-1 w-full rounded-md border border-[var(--lab-border)] bg-[oklch(0.11_0.03_260/.8)] px-3 py-2 font-mono text-sm text-[var(--lab-ink)] outline-none focus:border-[var(--lab-cyan)]"
            />
          </label>
        </div>
      )}

      {mode === "expression" && parsed.dontCares.length === 0 && (
        <p className="mt-2 font-mono text-[10px] tracking-[0.15em] text-[var(--lab-muted)]">
          Tip: switch to "FROM Σ MINTERMS" to specify don't-care terms directly.
        </p>
      )}

      {parsed.error && (
        <p className="mt-3 font-mono text-xs text-[var(--lab-pink)]">⚠ {parsed.error}</p>
      )}

      {!parsed.error && parsed.numVars > 6 && (
        <p className="mt-3 font-mono text-xs text-[var(--lab-pink)]">
          ⚠ Supports up to 6 variables.
        </p>
      )}

      {!parsed.error && layout && (
        <div className="mt-6 overflow-x-auto">
          <div className="flex flex-wrap gap-8">
            {layout.blocks.map((block) => (
              <div key={`${block.blockRow}-${block.blockCol}`} className="relative">
                {block.label && (
                  <p className="mb-1 font-mono text-[10px] tracking-[0.2em] text-[var(--lab-warm)]">
                    {block.label}
                  </p>
                )}
                <div
                  className="inline-grid gap-1"
                  style={{
                    gridTemplateColumns: `auto repeat(${layout.colAxis.length}, ${CELL}px)`,
                  }}
                >
                  <div />
                  {layout.colAxis.map((c) => (
                    <div
                      key={c}
                      className="text-center font-mono text-[10px] tracking-[0.15em] text-[var(--lab-muted)]"
                    >
                      {c.toString(2).padStart(layout.colVars, "0")}
                    </div>
                  ))}
                  {layout.rowAxis.map((r) => (
                    <div key={`row-${r}`} style={{ display: "contents" }}>
                      <div className="pr-2 text-right font-mono text-[10px] tracking-[0.15em] text-[var(--lab-muted)]">
                        {r.toString(2).padStart(layout.rowVars, "0")}
                      </div>
                      {layout.colAxis.map((c) => {
                        const v = cellValue(layout, block.blockValue, r, c);
                        return (
                          <div
                            key={`${r}-${c}`}
                            className={`flex items-center justify-center rounded-md border border-[var(--lab-border)] bg-[oklch(0.14_0.03_265/.6)] text-sm font-bold ${
                              v === "1"
                                ? "text-[var(--lab-mint)]"
                                : v === "X"
                                  ? "text-[var(--lab-warm)]"
                                  : "text-[var(--lab-muted)]"
                            }`}
                            style={{ height: CELL, width: CELL }}
                          >
                            {v}
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>

                {/* SVG overlay: sits exactly over the cell grid (excludes the row/col label gutters) and
                    draws a loop for every revealed step whose term touches this block. */}
                <svg
                  width={gridWidth}
                  height={gridHeight}
                  viewBox={`0 0 ${gridWidth} ${gridHeight}`}
                  className="pointer-events-none absolute bottom-0 right-0"
                >
                  {groupingSteps.slice(0, currentStepIndex + 1).map((step, stepIdx) => {
                    if (!blockMatchesTerm(layout, block.blockValue, step.bits)) return null;
                    const pattern = step.bits.slice(layout.blockVarCount);
                    const rects = loopRectsForPattern(pattern, layout);
                    const inset = 2 + (stepIdx % 4) * 3;
                    return rects.map((rect, rIdx) => {
                      const x = rect.colStart * (CELL + GAP) + inset;
                      const y = rect.rowStart * (CELL + GAP) + inset;
                      const w =
                        (rect.colEnd - rect.colStart + 1) * CELL +
                        (rect.colEnd - rect.colStart) * GAP -
                        inset * 2;
                      const h =
                        (rect.rowEnd - rect.rowStart + 1) * CELL +
                        (rect.rowEnd - rect.rowStart) * GAP -
                        inset * 2;
                      return (
                        <rect
                          key={`${stepIdx}-${rIdx}`}
                          x={x}
                          y={y}
                          width={Math.max(w, 4)}
                          height={Math.max(h, 4)}
                          rx={8}
                          fill={step.color}
                          fillOpacity={0.2}
                          stroke={step.color}
                          strokeWidth={2}
                          style={{ mixBlendMode: "screen" }}
                        />
                      );
                    });
                  })}
                </svg>
              </div>
            ))}
          </div>
          <p className="mt-2 font-mono text-[10px] tracking-[0.15em] text-[var(--lab-muted)]">
            {layout.blockVarCount === 0
              ? `rows = ${parsed.vars.slice(0, layout.rowVars).join("")} · columns = ${parsed.vars.slice(layout.rowVars).join("")}`
              : `rows/cols per block = ${parsed.vars.slice(layout.blockVarCount).join("")} · blocks split on ${parsed.vars.slice(0, layout.blockVarCount).join("")}`}{" "}
            · <span className="text-[var(--lab-warm)]">X</span> = don't care
          </p>
        </div>
      )}

      {groupingSteps.length > 0 && (
        <div className="mt-6 rounded-md border border-[var(--lab-border)] bg-[oklch(0.12_0.03_265/.5)] p-4">
          <p className="text-[10px] tracking-[0.25em] text-[var(--lab-muted)]">
            STEP-BY-STEP GROUPING
          </p>

          <div className="mt-3 flex items-center gap-3">
            <button
              onClick={() => setCurrentStepIndex((i) => Math.max(-1, i - 1))}
              disabled={currentStepIndex <= -1}
              className="lab-menu-btn px-3 py-1 text-xs disabled:cursor-not-allowed disabled:opacity-30"
            >
              ◀ Previous Step
            </button>
            <button
              onClick={() => setCurrentStepIndex((i) => Math.min(groupingSteps.length - 1, i + 1))}
              disabled={currentStepIndex >= groupingSteps.length - 1}
              className="lab-menu-btn px-3 py-1 text-xs disabled:cursor-not-allowed disabled:opacity-30"
            >
              Next Step ▶
            </button>
            <span className="font-mono text-[10px] tracking-[0.15em] text-[var(--lab-muted)]">
              {currentStepIndex + 1} / {groupingSteps.length}
            </span>
          </div>

          {currentStepIndex >= 0 && (
            <p
              className="mt-2 flex items-center gap-2 font-mono text-xs"
              style={{ color: groupingSteps[currentStepIndex].color }}
            >
              <span
                className="inline-block h-2.5 w-2.5 rounded-full"
                style={{ background: groupingSteps[currentStepIndex].color }}
              />
              Group {currentStepIndex + 1}: <ExprView expr={groupingSteps[currentStepIndex].term} />{" "}
              · covers {groupingSteps[currentStepIndex].cells.join(", ")}
            </p>
          )}

          <div
            key={currentStepIndex}
            className="mt-4 rounded-md border border-[var(--lab-cyan)] bg-[oklch(0.20_0.10_200/.25)] px-4 py-3 lab-glow-cyan"
            style={{ animation: "lab-pulse 1.6s ease-in-out 1" }}
          >
            <p className="text-[10px] tracking-[0.2em] text-[var(--lab-muted)]">EQUATION SO FAR</p>
            <p className="mt-1 break-words text-xl font-bold text-[var(--lab-cyan)]">
              F ={" "}
              {currentStepIndex === -1 ? (
                "0"
              ) : (
                <ExprView
                  expr={groupingSteps
                    .slice(0, currentStepIndex + 1)
                    .map((s) => s.term)
                    .join(" + ")}
                />
              )}
            </p>
          </div>
        </div>
      )}

      {qm && (
        <>
          <h2 className="mt-6 text-xs tracking-[0.25em] text-[var(--lab-muted)]">
            GROUPING STEPS (PAIRWISE COMBINE TRACE)
          </h2>
          {qm.steps.length === 0 ? (
            <p className="mt-2 font-mono text-xs text-[var(--lab-muted)]">
              No adjacent terms could be combined — every minterm is already its own prime
              implicant.
            </p>
          ) : (
            <ol className="mt-2 space-y-2">
              {qm.steps.map((step) => (
                <li
                  key={step.round}
                  className="rounded-md border border-[var(--lab-border)] bg-[oklch(0.12_0.03_265/.5)] px-3 py-2"
                >
                  <p className="text-[10px] tracking-[0.15em] text-[var(--lab-purple)]">
                    ROUND {step.round} — combine terms differing in exactly one bit
                  </p>
                  <ul className="mt-1 space-y-0.5 font-mono text-xs text-[var(--lab-muted)]">
                    {step.combined.map((c, i) => (
                      <li key={i}>
                        {c.from[0]} + {c.from[1]} →{" "}
                        <span className="text-[var(--lab-cyan)]">{c.result}</span>{" "}
                        <span className="text-[var(--lab-muted)]">
                          (drops {parsed.vars[c.droppedVarIndex] ?? "?"})
                        </span>
                      </li>
                    ))}
                  </ul>
                </li>
              ))}
            </ol>
          )}

          <h2 className="mt-6 text-xs tracking-[0.25em] text-[var(--lab-muted)]">
            PRIME IMPLICANTS
          </h2>
          <div className="mt-2 flex flex-wrap gap-2">
            {qm.primeImplicants.map((pi) => (
              <span
                key={pi.bits}
                className={`rounded-md border px-2 py-1 font-mono text-xs ${
                  qm.selectedImplicants.some((s) => s.bits === pi.bits)
                    ? "border-[var(--lab-mint)] text-[var(--lab-mint)]"
                    : "border-[var(--lab-border)] text-[var(--lab-muted)]"
                }`}
              >
                <ExprView expr={termToProduct(pi.bits, parsed.vars)} /> · covers{" "}
                {pi.covers.join(",")}
              </span>
            ))}
          </div>

          <h2 className="mt-6 text-xs tracking-[0.25em] text-[var(--lab-muted)]">
            ESSENTIAL PRIME IMPLICANTS
          </h2>
          <p className="mt-2 font-mono text-xs text-[var(--lab-muted)]">
            {qm.essentialPrimeImplicants.length > 0
              ? qm.essentialPrimeImplicants
                  .map((t) => termToProduct(t.bits, parsed.vars))
                  .join(", ")
              : "None — every minterm is covered by more than one prime implicant, so terms were chosen to cover the rest."}
          </p>

          <div className="mt-4 rounded-md border border-[var(--lab-purple)] bg-[oklch(0.30_0.14_305/.20)] px-4 py-3 lab-glow-purple">
            <p className="text-[10px] tracking-[0.2em] text-[var(--lab-muted)]">MINIMAL SOP</p>
            <p className="mt-1 break-words text-xl font-bold text-[var(--lab-purple)]">
              Y = <ExprView expr={finalExpr} />
            </p>
          </div>
        </>
      )}
    </LabPageShell>
  );
}