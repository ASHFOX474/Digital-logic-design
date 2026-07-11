import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { LabPageShell } from "@/components/lab/LabPageShell";
import { ExprView } from "@/components/lab/ExprView";
import { toTextbook } from "@/lib/logic/parser";
import { buildTruthTable, minterms } from "@/lib/logic/truthtable";
import { quineMcCluskey, termToProduct } from "@/lib/logic/qm";

export const Route = createFileRoute("/analysis/simplifier")({
  component: SimplifierPage,
});

/* ----------------------------------------------------------------------
 * Equation Simplifier — minimizes the input expression to its simplest
 * Sum-of-Products form using Quine-McCluskey (truth-table driven, so the
 * result is always a true minimal SOP, not just as far as a handful of
 * algebraic rewrite rules happen to reach). Only the final simplified
 * expression is shown — no intermediate steps.
 * ========================================================================== */
function SimplifierPage() {
  const [expr, setExpr] = useState("AB + AB'");

  const result = useMemo(() => {
    try {
      const table = buildTruthTable(expr);
      const original = toTextbook(table.ast);
      const required = minterms(table);

      const qm = quineMcCluskey(required, [], table.vars.length);
      const final =
        qm.selectedImplicants.length === 0
          ? required.length === 0
            ? "0"
            : "1"
          : qm.selectedImplicants.map((t) => termToProduct(t.bits, table.vars)).join(" + ");

      return { original, final, error: null as string | null };
    } catch (e) {
      return {
        original: "",
        final: "",
        error: e instanceof Error ? e.message : "Invalid expression",
      };
    }
  }, [expr]);

  return (
    <LabPageShell
      eyebrow="ANALYSIS TOOL"
      title="EQUATION SIMPLIFIER"
      description="Minimizes your Boolean expression to its simplest Sum-of-Products form using Quine-McCluskey reduction over the full truth table. For minterm/maxterm expansions, use the dedicated SOP or POS tools."
    >
      <textarea
        value={expr}
        onChange={(e) => setExpr(e.target.value)}
        spellCheck={false}
        rows={2}
        placeholder="e.g. AB + AB'   ·   (A+B)(A+B')   ·   A + A'B"
        className="w-full resize-none rounded-md border border-[var(--lab-border)] bg-[oklch(0.11_0.03_260/.8)] px-3 py-2 font-mono text-sm text-[var(--lab-cyan)] outline-none focus:border-[var(--lab-cyan)]"
      />

      {result.error && (
        <p className="mt-3 font-mono text-xs text-[var(--lab-pink)]">⚠ {result.error}</p>
      )}

      {!result.error && (
        <>
          <div className="mt-5 rounded-md border border-[var(--lab-border)] bg-[oklch(0.12_0.03_265/.7)] px-4 py-3">
            <p className="text-[10px] tracking-[0.2em] text-[var(--lab-muted)]">
              ORIGINAL EXPRESSION
            </p>
            <p className="mt-1 text-lg font-mono">
              Y = <ExprView expr={result.original} />
            </p>
          </div>

          <div className="mt-4 rounded-md border border-[var(--lab-cyan)] bg-[oklch(0.20_0.10_200/.25)] px-4 py-3 lab-glow-cyan">
            <p className="text-[10px] tracking-[0.2em] text-[var(--lab-muted)]">
              SIMPLIFIED RESULT
            </p>
            <p
              className="mt-1 text-2xl font-bold text-[var(--lab-cyan)]"
              style={{ animation: "lab-pulse 2.4s ease-in-out infinite" }}
            >
              Y = <ExprView expr={result.final} />
            </p>
          </div>
        </>
      )}
    </LabPageShell>
  );
}