import { Link } from "@tanstack/react-router";
import { PanelHeader } from "./PanelHeader";

/* ── Tabulation (homepage preview panel) ──────────────────────────────────────
 * Static teaser showing a Quine-McCluskey round table excerpt.
 * Full interactive tool lives at /analysis/tabulation.
 * Example: F(A,B,C) = AB' + BC  →  minterms: 2,3,5,6,7
 * ──────────────────────────────────────────────────────────────────────────── */

type Row = { group: number; minterms: string; bits: string; checked: boolean };

const ROWS: Row[] = [
  { group: 1, minterms: "2",   bits: "010", checked: true  },
  { group: 2, minterms: "3",   bits: "011", checked: true  },
  { group: 2, minterms: "5",   bits: "101", checked: true  },
  { group: 2, minterms: "6",   bits: "110", checked: true  },
  { group: 3, minterms: "7",   bits: "111", checked: false },
];

const COMBINED: Row[] = [
  { group: 1, minterms: "2,3", bits: "01-", checked: false },
  { group: 1, minterms: "2,6", bits: "-10", checked: false },
  { group: 2, minterms: "3,7", bits: "-11", checked: false },
  { group: 2, minterms: "5,7", bits: "1-1", checked: false },
  { group: 2, minterms: "6,7", bits: "11-", checked: false },
];

function TabRow({ row, animate }: { row: Row; animate?: boolean }) {
  return (
    <div
      className="grid grid-cols-[20px_1fr_auto_14px] items-center gap-x-1.5 rounded px-1 py-0.5 font-mono text-[9px]"
      style={{
        opacity: row.checked ? 0.45 : 1,
        background: animate && !row.checked ? "oklch(0.20 0.06 200 / 0.3)" : undefined,
      }}
    >
      <span className="text-center font-bold" style={{ color: "var(--lab-purple)" }}>{row.group}</span>
      <span style={{ color: "var(--lab-muted)" }}>{row.minterms}</span>
      <span className="tracking-widest">
        {row.bits.split("").map((ch, i) => (
          <span key={i} style={{ color: ch === "-" ? "var(--lab-warm)" : "var(--lab-cyan)" }}>{ch}</span>
        ))}
      </span>
      <span className="text-center" style={{ color: row.checked ? "var(--lab-mint)" : "var(--lab-border)" }}>
        {row.checked ? "✓" : "·"}
      </span>
    </div>
  );
}

export function Tabulation() {
  return (
    <section className="lab-panel relative overflow-hidden p-5">
      <div className="lab-scanline" aria-hidden />
      <PanelHeader eyebrow="TOOL · 04" title="TABULATION METHOD" accent="var(--lab-warm)" />

      {/* Round 0 */}
      <div className="mt-3">
        <p className="mb-1 font-mono text-[8px] tracking-[0.2em] text-[var(--lab-muted)]">TABLE 0 — INITIAL</p>
        <div className="rounded-md border border-[var(--lab-border)] bg-[oklch(0.12_0.03_265/.5)] px-1.5 py-1">
          <div className="grid grid-cols-[20px_1fr_auto_14px] gap-x-1.5 px-1 pb-0.5 font-mono text-[7px] tracking-[0.15em] text-[var(--lab-muted)]">
            <span className="text-center">#</span><span>mint.</span><span>ABC</span><span />
          </div>
          {ROWS.map((row) => <TabRow key={row.minterms} row={row} />)}
        </div>
      </div>

      {/* Round 1 */}
      

      {/* Result */}
      <div className="mt-3 rounded-md border border-[var(--lab-warm)] bg-[oklch(0.25_0.10_60/.25)] px-3 py-2 text-center font-mono text-sm text-[var(--lab-warm)]"
        style={{ boxShadow: "0 0 10px oklch(0.75 0.15 60/.4)" }}>
        <span style={{ animation: "lab-glow 3s ease-in-out infinite" }}>Y = AB' + BC</span>
      </div>

      <Link to="/analysis/tabulation" className="lab-menu-btn mt-4 block w-full text-center">
        OPEN FULL TABULATION →
      </Link>
    </section>
  );
}
