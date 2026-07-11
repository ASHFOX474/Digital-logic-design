import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { LabPageShell } from "@/components/lab/LabPageShell";
import { GateCircuit } from "@/components/lab/GateCircuit";
import { tryEval, parseExpr } from "@/lib/logic/parser";

export const Route = createFileRoute("/analysis/visualizer")({
  component: VisualizerPage,
});

const VARS = ["A", "B", "C", "D"] as const;
type Var = (typeof VARS)[number];

const VAR_COLOR: Record<Var, string> = {
  A: "var(--lab-pink)",
  B: "var(--lab-cyan)",
  C: "var(--lab-mint)",
  D: "oklch(0.90 0.19 95)",
};

function VisualizerPage() {
  const [expr, setExpr] = useState("AB' + BC'");
  const [vals, setVals] = useState<Record<Var, boolean>>({ A: true, B: false, C: true, D: false });

  const toggle = (v: Var) => setVals((prev) => ({ ...prev, [v]: !prev[v] }));

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
        {VARS.map((v) => (
          <button
            key={v}
            onClick={() => toggle(v)}
            role="switch"
            aria-checked={vals[v]}
            className="flex items-center justify-between rounded-lg border border-[var(--lab-border)] bg-[oklch(0.15_0.04_265/.7)] px-4 py-3 transition hover:border-[var(--lab-cyan)]"
          >
            <span className="font-mono text-lg font-bold" style={{ color: VAR_COLOR[v] }}>{v}</span>
            <div className="flex flex-col items-end gap-0.5">
              <span
                className="relative inline-block h-6 w-12 rounded-full transition"
                style={{
                  background: vals[v] ? VAR_COLOR[v] : "oklch(0.22 0.04 265)",
                  boxShadow: vals[v] ? `0 0 12px ${VAR_COLOR[v]}` : "inset 0 0 4px oklch(0 0 0/.7)",
                }}
              >
                <span
                  className="absolute top-1 h-4 w-4 rounded-full bg-[oklch(0.98_0.01_250)] transition-all"
                  style={{ left: vals[v] ? "28px" : "4px" }}
                />
              </span>
              <span className="font-mono text-[10px]" style={{ color: vals[v] ? VAR_COLOR[v] : "var(--lab-muted)" }}>
                {v} = {vals[v] ? 1 : 0}
              </span>
            </div>
          </button>
        ))}
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
        {VARS.map((v) => (
          <span
            key={v}
            className="rounded border px-2 py-0.5"
            style={{
              borderColor: vals[v] ? VAR_COLOR[v] : "var(--lab-border)",
              color: vals[v] ? VAR_COLOR[v] : "var(--lab-muted)",
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
