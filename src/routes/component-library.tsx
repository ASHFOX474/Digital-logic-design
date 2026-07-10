import { createFileRoute } from "@tanstack/react-router";
import { LabPageShell } from "@/components/lab/LabPageShell";

export const Route = createFileRoute("/component-library")({
  component: ComponentLibraryPage,
});

const CHIPS = [
  { part: "7404", name: "Hex Inverter (NOT)", pins: 14, desc: "Six independent inverters. Output is the logical NOT of the input." },
  { part: "7408", name: "Quad 2-Input AND", pins: 14, desc: "Four independent 2-input AND gates." },
  { part: "7432", name: "Quad 2-Input OR", pins: 14, desc: "Four independent 2-input OR gates." },
  { part: "7400", name: "Quad 2-Input NAND", pins: 14, desc: "Universal gate — any Boolean function can be built using only NAND gates." },
  { part: "7402", name: "Quad 2-Input NOR", pins: 14, desc: "Universal gate — any Boolean function can be built using only NOR gates." },
  { part: "7486", name: "Quad 2-Input XOR", pins: 14, desc: "Four independent 2-input XOR gates, useful for parity and adders." },
] as const;

function ComponentLibraryPage() {
  return (
    <LabPageShell
      eyebrow="REFERENCE"
      title="COMPONENT LIBRARY"
      description="Quick-reference datasheet summaries for the ICs used across the Lab's breadboard."
    >
      <div className="grid gap-4 sm:grid-cols-2">
        {CHIPS.map((chip) => (
          <div key={chip.part} className="rounded-lg border border-[var(--lab-border)] bg-[oklch(0.12_0.03_265/.6)] p-4">
            <div className="flex items-center justify-between">
              <span className="font-mono text-sm font-bold text-[var(--lab-cyan)]">{chip.part}</span>
              <span className="font-mono text-[10px] tracking-[0.15em] text-[var(--lab-muted)]">{chip.pins}-PIN DIP</span>
            </div>
            <p className="mt-1 text-sm font-medium text-[var(--lab-ink)]">{chip.name}</p>
            <p className="mt-1 text-xs text-[var(--lab-muted)]">{chip.desc}</p>
          </div>
        ))}
      </div>
    </LabPageShell>
  );
}
