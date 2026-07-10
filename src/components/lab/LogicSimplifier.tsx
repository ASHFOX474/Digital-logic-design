import { Link } from "@tanstack/react-router";
import { PanelHeader } from "./PanelHeader";

/* ---------------- Logic Simplifier (homepage preview panel) ----------------
 * A static teaser card; the fully interactive step-by-step simplifier lives
 * on its own page at /analysis/simplifier.
 * ========================================================================== */
export function LogicSimplifier() {
  return (
    <section className="lab-panel relative overflow-hidden p-5">
      <div className="lab-scanline" aria-hidden />
      <PanelHeader eyebrow="TOOL · 01" title="LOGIC SIMPLIFIER" accent="var(--lab-cyan)" />
      <div className="mt-4 space-y-3 font-mono text-sm">
        <div className="flex items-center justify-between rounded-md border border-[var(--lab-border)] bg-[oklch(0.12_0.03_265/.7)] px-3 py-2">
          <span className="text-[var(--lab-muted)]">AB + AB</span>
        </div>
        <div className="flex items-center justify-center text-[var(--lab-cyan)]" style={{ animation: "lab-pulse 2s ease-in-out infinite" }}>
          ▲ SIMPLIFIED ▼
        </div>
        <div className="flex items-center justify-between rounded-md border border-[var(--lab-cyan)] bg-[oklch(0.20_0.10_200/.25)] px-3 py-2 lab-glow-cyan">
          <span className="text-lg font-bold text-[var(--lab-cyan)]">A</span>
        </div>
        <p className="pt-1 text-[10px] tracking-[0.2em] text-[var(--lab-muted)]">
          ✓ 2 GATES · 6 TRANSISTORS SAVED
        </p>
      </div>
      <Link to="/analysis/simplifier" className="lab-menu-btn mt-4 block w-full text-center">
        OPEN FULL SIMPLIFIER →
      </Link>
    </section>
  );
}
