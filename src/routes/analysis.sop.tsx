import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { LabPageShell } from "@/components/lab/LabPageShell";
import { ExprView } from "@/components/lab/ExprView";
import { buildTruthTable, minterms } from "@/lib/logic/truthtable";
import { termToProduct } from "@/lib/logic/qm";

export const Route = createFileRoute("/analysis/sop")({
  component: SopPage,
});

function SopPage() {
  const [expr, setExpr] = useState("AB'C' + BC");

  const result = useMemo(() => {
    try {
      const table = buildTruthTable(expr);
      const ms = minterms(table);
      const n = table.vars.length;
      const canonicalTerms = ms.map((m) => termToProduct(m.toString(2).padStart(n, "0"), table.vars));
      return { table, ms, canonicalTerms, error: null as string | null };
    } catch (e) {
      return { table: null, ms: [], canonicalTerms: [], error: e instanceof Error ? e.message : "Invalid expression" };
    }
  }, [expr]);

  return (
    <LabPageShell
      eyebrow="ANALYSIS TOOL"
      title="SUM OF PRODUCTS (SOP)"
      description="Expands your equation into canonical SOP form — one AND term (minterm) for every row where the output is 1, OR-ed together."
    >
      <input
        value={expr}
        onChange={(e) => setExpr(e.target.value)}
        spellCheck={false}
        placeholder="e.g. AB'C' + BC"
        className="w-full rounded-md border border-[var(--lab-border)] bg-[oklch(0.11_0.03_260/.8)] px-3 py-2 font-mono text-sm text-[var(--lab-cyan)] outline-none focus:border-[var(--lab-cyan)]"
      />

      {result.error && <p className="mt-3 font-mono text-xs text-[var(--lab-pink)]">⚠ {result.error}</p>}

      {result.table && (
        <>
          <p className="mt-4 font-mono text-xs text-[var(--lab-muted)]">
            Minterms (rows where Y=1): m({result.ms.join(", ") || "—"})
          </p>
          <div className="mt-3 rounded-md border border-[var(--lab-mint)] bg-[oklch(0.20_0.12_155/.18)] px-4 py-3">
            <p className="text-[10px] tracking-[0.2em] text-[var(--lab-muted)]">CANONICAL SOP</p>
            <p className="mt-1 break-words text-lg font-bold text-[var(--lab-mint)]">
              Y ={" "}
              {result.canonicalTerms.length > 0 ? (
                result.canonicalTerms.map((t, i) => (
                  <span key={i}>
                    {i > 0 && " + "}
                    <ExprView expr={t} />
                  </span>
                ))
              ) : (
                "0"
              )}
            </p>
          </div>
        </>
      )}
    </LabPageShell>
  );
}
