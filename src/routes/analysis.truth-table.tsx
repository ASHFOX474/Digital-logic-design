import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { LabPageShell } from "@/components/lab/LabPageShell";
import { buildTruthTable } from "@/lib/logic/truthtable";

export const Route = createFileRoute("/analysis/truth-table")({
  component: TruthTablePage,
});

function TruthTablePage() {
  const [expr, setExpr] = useState("AB'C' + BC");

  const result = useMemo(() => {
    try {
      return { table: buildTruthTable(expr), error: null as string | null };
    } catch (e) {
      return { table: null, error: e instanceof Error ? e.message : "Invalid expression" };
    }
  }, [expr]);

  return (
    <LabPageShell
      eyebrow="ANALYSIS TOOL"
      title="TRUTH TABLE GENERATOR"
      description="Generates every input combination for your equation. Any letter can be a variable, and juxtaposition (AB), + (OR), and ' (NOT) work just like on paper. NAND / NOR / XOR / XNOR are supported as word operators, e.g. A NAND B."
    >
      <input
        value={expr}
        onChange={(e) => setExpr(e.target.value)}
        spellCheck={false}
        placeholder="e.g. AB'C' + BC   ·   P NAND Q   ·   X XOR Y XOR Z"
        className="w-full rounded-md border border-[var(--lab-border)] bg-[oklch(0.11_0.03_260/.8)] px-3 py-2 font-mono text-sm text-[var(--lab-cyan)] outline-none focus:border-[var(--lab-cyan)]"
      />

      {result.error && (
        <p className="mt-3 font-mono text-xs text-[var(--lab-pink)]">⚠ {result.error}</p>
      )}

      {result.table && (
        <div className="mt-5 overflow-x-auto">
          <table className="w-full min-w-[320px] border-separate border-spacing-y-1 text-center font-mono text-sm">
            <thead>
              <tr className="text-[10px] tracking-[0.3em] text-[var(--lab-muted)]">
                {result.table.vars.map((v) => (
                  <th key={v}>{v}</th>
                ))}
                <th>Y</th>
              </tr>
            </thead>
            <tbody>
              {result.table.rows.map((row) => (
                <tr key={row.index} className="lab-truth-row">
                  {row.bits.map((b, i) => (
                    <td key={i} className={i === 0 ? "rounded-l-md py-1.5" : "py-1.5"}>
                      {b ? 1 : 0}
                    </td>
                  ))}
                  <td className={`rounded-r-md font-bold ${row.output ? "text-[var(--lab-mint)]" : "text-[var(--lab-muted)]"}`}>
                    {row.output ? 1 : 0}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </LabPageShell>
  );
}
