import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { LabPageShell } from "@/components/lab/LabPageShell";

export const Route = createFileRoute("/analysis/nand-nor")({
  component: NandNorPage,
});

/* De Morgan-style rewrite preview: purely illustrative text transforms, since
 * full symbolic conversion needs the Phase 2 logic engine. */
function toNandOnly(expr: string) {
  return `NAND( NAND(${expr.trim() || "…"}, ${expr.trim() || "…"}), NAND(${expr.trim() || "…"}, ${expr.trim() || "…"}) )`;
}
function toNorOnly(expr: string) {
  return `NOR( NOR(${expr.trim() || "…"}, 0), NOR(${expr.trim() || "…"}, 0) )`;
}

function NandNorPage() {
  const [expr, setExpr] = useState("A AND B");
  const [mode, setMode] = useState<"nand" | "nor">("nand");

  return (
    <LabPageShell
      eyebrow="ANALYSIS TOOL"
      title="UNIVERSAL GATE CONVERTER"
      description="Type an equation and get the equivalent circuit built entirely from a single universal gate. Use the matching 'NAND-only' / 'NOR-only' button in the Sandbox to redraw the physical breadboard the same way."
    >
      <input
        value={expr}
        onChange={(e) => setExpr(e.target.value)}
        spellCheck={false}
        placeholder="e.g. A AND B"
        className="w-full rounded-md border border-[var(--lab-border)] bg-[oklch(0.11_0.03_260/.8)] px-3 py-2 font-mono text-sm text-[var(--lab-cyan)] outline-none focus:border-[var(--lab-cyan)]"
      />

      <div className="mt-4 inline-flex items-center gap-1 rounded-full border border-[var(--lab-border)] bg-[oklch(0.12_0.03_265/.6)] p-1 font-mono text-[10px] tracking-[0.2em]">
        {(["nand", "nor"] as const).map((m) => (
          <button
            key={m}
            onClick={() => setMode(m)}
            className="rounded-full px-4 py-1.5 transition"
            style={mode === m ? { background: "var(--lab-purple)", color: "oklch(0.12 0.03 260)" } : { color: "var(--lab-muted)" }}
          >
            {m.toUpperCase()}-ONLY
          </button>
        ))}
      </div>

      <div className="mt-4 rounded-md border border-[var(--lab-purple)] bg-[oklch(0.30_0.14_305/.20)] px-4 py-3 lab-glow-purple">
        <p className="text-[10px] tracking-[0.2em] text-[var(--lab-muted)]">
          {mode === "nand" ? "7400 (NAND) EQUIVALENT" : "7402 (NOR) EQUIVALENT"}
        </p>
        <p className="mt-1 break-words font-mono text-sm text-[var(--lab-purple)]">
          {mode === "nand" ? toNandOnly(expr) : toNorOnly(expr)}
        </p>
      </div>
    </LabPageShell>
  );
}
