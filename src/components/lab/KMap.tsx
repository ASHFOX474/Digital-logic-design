import { Link } from "@tanstack/react-router";
import { PanelHeader } from "./PanelHeader";

/* ---------------- K-Map (homepage preview panel) ----------------
 * Static teaser; the full solver (don't cares, minterm-sum input, grouping
 * steps) lives on its own page at /analysis/kmap.
 * ========================================================================== */
export function KMap() {
  const cells = [0, 1, 1, 0, 1, 1, 0, 1, 0, 1, 1, 1, 1, 0, 1, 0];
  return (
    <section className="lab-panel relative overflow-hidden p-5">
      <div className="lab-scanline" aria-hidden />
      <PanelHeader eyebrow="TOOL · 03" title="KARNAUGH MAP" accent="var(--lab-purple)" />
      <div className="mt-3 grid grid-cols-[auto_1fr] items-start gap-2 text-[10px] tracking-[0.2em] text-[var(--lab-muted)]">
        <div />
        <div className="grid grid-cols-4 text-center">
          <span>00</span>
          <span>01</span>
          <span>11</span>
          <span>10</span>
        </div>
        <div className="flex flex-col justify-around">
          {["00", "01", "11", "10"].map((l) => (
            <span key={l} className="py-1">{l}</span>
          ))}
        </div>
        <div className="grid grid-cols-4 gap-1">
          {cells.map((v, i) => (
            <div
              key={i}
              className={`lab-kmap-cell flex h-10 items-center justify-center rounded-md border border-[var(--lab-border)] bg-[oklch(0.14_0.03_265/.6)] text-sm font-bold ${
                v ? "on" : "text-[var(--lab-muted)]"
              }`}
              style={v ? { animationDelay: `${i * 0.15}s`, animation: "lab-pulse 2.4s ease-in-out infinite" } : undefined}
            >
              {v}
            </div>
          ))}
        </div>
      </div>
      <div className="mt-4 rounded-md border border-[var(--lab-purple)] bg-[oklch(0.30_0.14_305/.20)] px-3 py-2 text-center font-mono text-sm text-[var(--lab-purple)] lab-glow-purple">
        <span style={{ animation: "lab-glow 3s ease-in-out infinite" }}>Y = A + B + ¬C + ¬D</span>
      </div>
      <Link to="/analysis/kmap" className="lab-menu-btn mt-4 block w-full text-center">
        OPEN FULL K-MAP SOLVER →
      </Link>
    </section>
  );
}
