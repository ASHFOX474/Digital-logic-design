import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { LabPageShell } from "@/components/lab/LabPageShell";
import { ExprView } from "@/components/lab/ExprView";
import { parseExpr, toTextbook } from "@/lib/logic/parser";
import { simplifyWithSteps } from "@/lib/logic/simplify";

export const Route = createFileRoute("/analysis/simplifier")({
  component: SimplifierPage,
});

function SimplifierPage() {
  const [expr, setExpr] = useState("AB + AB'");

  const result = useMemo(() => {
    try {
      const ast = parseExpr(expr);
      const original = toTextbook(ast);
      const { result: simplified, steps } = simplifyWithSteps(ast);
      return { original, final: toTextbook(simplified), steps, error: null as string | null };
    } catch (e) {
      return { original: "", final: "", steps: [], error: e instanceof Error ? e.message : "Invalid expression" };
    }
  }, [expr]);

  return (
    <LabPageShell
      eyebrow="ANALYSIS TOOL"
      title="EQUATION SIMPLIFIER"
      description="Simplifies your Boolean expression step by step, naming which Boolean algebra law is applied at each stage — just like solving it by hand. For minterm/maxterm expansions, use the dedicated SOP or POS tools."
    >
      <textarea
        value={expr}
        onChange={(e) => setExpr(e.target.value)}
        spellCheck={false}
        rows={2}
        placeholder="e.g. AB + AB'   ·   (A+B)(A+B')   ·   A + A'B"
        className="w-full resize-none rounded-md border border-[var(--lab-border)] bg-[oklch(0.11_0.03_260/.8)] px-3 py-2 font-mono text-sm text-[var(--lab-cyan)] outline-none focus:border-[var(--lab-cyan)]"
      />

      {result.error && <p className="mt-3 font-mono text-xs text-[var(--lab-pink)]">⚠ {result.error}</p>}

      {!result.error && (
        <>
          <div className="mt-5 rounded-md border border-[var(--lab-border)] bg-[oklch(0.12_0.03_265/.7)] px-4 py-3">
            <p className="text-[10px] tracking-[0.2em] text-[var(--lab-muted)]">ORIGINAL EXPRESSION</p>
            <p className="mt-1 text-lg font-mono">
              Y = <ExprView expr={result.original} />
            </p>
          </div>

          {result.steps.length > 0 ? (
            <ol className="mt-4 space-y-2">
              {result.steps.map((s, i) => (
                <li key={i} className="rounded-md border border-[var(--lab-border)] bg-[oklch(0.12_0.03_265/.5)] px-4 py-2.5">
                  <p className="text-[10px] tracking-[0.15em] text-[var(--lab-purple)]">STEP {i + 1} · {s.law}</p>
                  <p className="mt-1 font-mono text-sm text-[var(--lab-muted)]">
                    <ExprView expr={s.before} /> <span className="text-[var(--lab-cyan)]">→</span> <ExprView expr={s.after} className="text-[var(--lab-ink)]" />
                  </p>
                </li>
              ))}
            </ol>
          ) : (
            <p className="mt-4 font-mono text-xs text-[var(--lab-muted)]">Already in simplest form — no algebraic law reduces it further.</p>
          )}

          <div className="mt-4 rounded-md border border-[var(--lab-cyan)] bg-[oklch(0.20_0.10_200/.25)] px-4 py-3 lab-glow-cyan">
            <p className="text-[10px] tracking-[0.2em] text-[var(--lab-muted)]">SIMPLIFIED RESULT</p>
            <p className="mt-1 text-2xl font-bold text-[var(--lab-cyan)]">
              Y = <ExprView expr={result.final} />
            </p>
          </div>
        </>
      )}
    </LabPageShell>
  );
}
