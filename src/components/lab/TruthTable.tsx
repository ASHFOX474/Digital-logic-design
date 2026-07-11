import { Link } from "@tanstack/react-router";
import { PanelHeader } from "./PanelHeader";

/* ---------------- Truth Table (homepage preview panel) ----------------
 * Static teaser; the dynamic generator (any variables, NAND/NOR/XOR/XNOR)
 * lives on its own page at /analysis/truth-table.
 * ========================================================================== */
export function TruthTable() {
  const rows = [
    { A: 0, B: 0, Y: 0 },
    { A: 0, B: 1, Y: 1 },
    { A: 1, B: 0, Y: 1 },
    { A: 1, B: 1, Y: 0 },
  ];
  return (
    <section className="lab-panel relative overflow-hidden p-5">
      <div className="lab-scanline" aria-hidden />
      <PanelHeader eyebrow="TOOL · 02" title="TRUTH TABLE" accent="var(--lab-mint)" />
      <table className="mt-3 w-full border-separate border-spacing-y-1 text-center font-mono text-sm">
        <thead>
          <tr className="text-[10px] tracking-[0.3em] text-[var(--lab-muted)]">
            <th>A</th>
            <th>B</th>
            <th>Y</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="lab-truth-row">
              <td className="rounded-l-md py-1.5 text-[var(--lab-ink)]">{r.A}</td>
              <td className="text-[var(--lab-ink)]">{r.B}</td>
              <td className={`rounded-r-md ${r.Y ? "text-[var(--lab-mint)]" : "text-[var(--lab-muted)]"}`}>{r.Y}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <Link to="/analysis/truth-table" className="lab-menu-btn mt-4 block w-full text-center">
        OPEN FULL TRUTH TABLE →
      </Link>
    </section>
  );
}
