import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { LabPageShell } from "@/components/lab/LabPageShell";
import { GateCircuit } from "@/components/lab/GateCircuit";
import { tryEval, parseExpr } from "@/lib/logic/parser";

export const Route = createFileRoute("/analysis/visualizer")({
  component: VisualizerPage,
});

// Color palette cycled across however many variables actually appear in the
// expression — no longer limited to a fixed A–D tuple.
const VAR_PALETTE = [
  "var(--lab-pink)",
  "var(--lab-cyan)",
  "var(--lab-mint)",
  "oklch(0.90 0.19 95)",
  "oklch(0.75 0.15 200)",
  "oklch(0.70 0.20 320)",
  "oklch(0.80 0.18 140)",
  "oklch(0.65 0.20 30)",
];

// Multi-letter operator keywords that must NOT be mistaken for variable
// names when scanning the raw expression string. Longer keywords first so
// e.g. "XNOR" isn't partially consumed by the "XOR" pattern.
const OPERATOR_KEYWORDS = /\b(XNOR|NAND|NOR|XOR|AND|OR|NOT)\b/gi;

/** Extracts the set of single-letter variable names used in an expression,
 * in first-appearance order, ignoring operator keywords. */
function extractVars(expr: string): string[] {
  const withoutKeywords = expr.replace(OPERATOR_KEYWORDS, " ");
  const seen: string[] = [];
  for (const ch of withoutKeywords) {
    if (/[A-Za-z]/.test(ch)) {
      const upper = ch.toUpperCase();
      if (!seen.includes(upper)) seen.push(upper);
    }
  }
  return seen;
}

function VisualizerPage() {
  const [expr, setExpr] = useState("AB' + BC'");
  const [valsMap, setValsMap] = useState<Record<string, boolean>>({ A: true, B: false, C: true, D: false });

  const varNames = useMemo(() => extractVars(expr), [expr]);

  const varColor = useMemo(() => {
    const map: Record<string, string> = {};
    varNames.forEach((v, i) => { map[v] = VAR_PALETTE[i % VAR_PALETTE.length]; });
    return map;
  }, [varNames]);

  // Only expose the variables actually present in the current expression to
  // the evaluator/circuit renderer, defaulting freshly-seen ones to false.
  const vals = useMemo(() => {
    const v: Record<string, boolean> = {};
    varNames.forEach((name) => { v[name] = valsMap[name] ?? false; });
    return v;
  }, [varNames, valsMap]);

  const toggle = (v: string) => setValsMap((prev) => ({ ...prev, [v]: !(prev[v] ?? false) }));

  const { value: output, error } = tryEval(expr, vals);
  const exprError = !!error;

  const ast = useMemo(() => {
    if (exprError) return null;
    try { return parseExpr(expr); } catch { return null; }
  }, [expr, exprError]);

  return (
    <LabPageShell
      eyebrow="ANALYSIS TOOL"
      title="CIRCUIT VISUALIZER"
      description="Parses a Boolean expression and renders the logic gate schematic with live signal propagation. Toggle inputs to see how signals flow through gates. Supports AND, OR, NOT, NAND, NOR, XOR, XNOR."
    >
      {/* Expression input */}
      <div className="flex items-center gap-3">
        <span className="font-mono text-sm text-[var(--lab-muted)]">Y =</span>
        <input
          value={expr}
          onChange={(e) => setExpr(e.target.value)}
          spellCheck={false}
          placeholder="e.g. AB' + BC  ·  A NAND (B XOR C)"
          className="flex-1 rounded-md border bg-[oklch(0.11_0.03_260/.8)] px-3 py-2 font-mono text-sm outline-none transition focus:border-[var(--lab-cyan)]"
          style={{
            borderColor: exprError ? "var(--lab-pink)" : "var(--lab-border)",
            color: exprError ? "var(--lab-pink)" : "var(--lab-cyan)",
          }}
        />
        <span
          className="w-14 text-right font-mono text-xs tracking-[0.15em]"
          style={{ color: exprError ? "var(--lab-pink)" : "var(--lab-muted)" }}
        >
          {exprError ? "SYNTAX ERR" : `Y = ${output ? 1 : 0}`}
        </span>
      </div>

      <p className="mt-1 font-mono text-[10px] text-[var(--lab-muted)]">
        Operators: <span className="text-[var(--lab-cyan)]">juxtaposition=AND · + or OR · ' or NOT · NAND · NOR · XOR · XNOR</span>
      </p>

      {/* Input toggles */}
      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {varNames.length === 0 ? (
          <p className="col-span-full font-mono text-[10px] text-[var(--lab-muted)]">
            No variables detected yet — type an expression above.
          </p>
        ) : (
          varNames.map((v) => (
            <button
              key={v}
              onClick={() => toggle(v)}
              role="switch"
              aria-checked={vals[v]}
              className="flex items-center justify-between rounded-lg border border-[var(--lab-border)] bg-[oklch(0.15_0.04_265/.7)] px-4 py-3 transition hover:border-[var(--lab-cyan)]"
            >
              <span className="font-mono text-lg font-bold" style={{ color: varColor[v] }}>{v}</span>
              <div className="flex flex-col items-end gap-0.5">
                <span
                  className="relative inline-block h-6 w-12 rounded-full transition"
                  style={{
                    background: vals[v] ? varColor[v] : "oklch(0.22 0.04 265)",
                    boxShadow: vals[v] ? `0 0 12px ${varColor[v]}` : "inset 0 0 4px oklch(0 0 0/.7)",
                  }}
                >
                  <span
                    className="absolute top-1 h-4 w-4 rounded-full bg-[oklch(0.98_0.01_250)] transition-all"
                    style={{ left: vals[v] ? "28px" : "4px" }}
                  />
                </span>
                <span className="font-mono text-[10px]" style={{ color: vals[v] ? varColor[v] : "var(--lab-muted)" }}>
                  {v} = {vals[v] ? 1 : 0}
                </span>
              </div>
            </button>
          ))
        )}
      </div>

      {/* Circuit diagram */}
      <div
        className="relative mt-6 min-h-[260px] overflow-auto rounded-2xl border border-[var(--lab-border)] p-6"
        style={{
          background:
            "repeating-linear-gradient(0deg, oklch(0.13 0.03 260) 0 22px, oklch(0.16 0.03 260) 22px 24px)," +
            "linear-gradient(180deg, oklch(0.19 0.04 265), oklch(0.11 0.03 260))",
        }}
      >
        {ast ? (
          <GateCircuit ast={ast} assign={vals} />
        ) : (
          <div className="flex h-full min-h-[200px] items-center justify-center">
            <div className="text-center">
              <p className="font-mono text-sm text-[var(--lab-pink)]">⚠ Invalid expression</p>
              <p className="font-mono text-sm text-[var(--lab-pink)]">Or Empty Input Box</p>
              <p className="mt-1 font-mono text-[10px] text-[var(--lab-muted)]">
                Check syntax — variables must be single letters (A–Z)
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Signal summary */}
      <div className="mt-4 flex flex-wrap items-center gap-2 rounded-md border border-[var(--lab-border)] bg-[oklch(0.12_0.03_265/.5)] px-4 py-3 font-mono text-xs">
        <span className="text-[var(--lab-muted)] tracking-[0.15em]">SIGNALS:</span>
        {varNames.map((v) => (
          <span
            key={v}
            className="rounded border px-2 py-0.5"
            style={{
              borderColor: vals[v] ? varColor[v] : "var(--lab-border)",
              color: vals[v] ? varColor[v] : "var(--lab-muted)",
            }}
          >
            {v}={vals[v] ? 1 : 0}
          </span>
        ))}
        <span className="ml-auto">→</span>
        <span
          className="rounded border px-3 py-0.5 font-bold"
          style={{
            borderColor: output ? "var(--lab-mint)" : "var(--lab-border)",
            color: output ? "var(--lab-mint)" : "var(--lab-muted)",
            boxShadow: output ? "0 0 10px var(--lab-mint)" : undefined,
          }}
        >
          Y = {output ? 1 : 0}
        </span>
      </div>
    </LabPageShell>
  );
}