import { createFileRoute } from "@tanstack/react-router";
import { Header } from "@/components/lab/Header";
import { Breadboard } from "@/components/lab/Breadboard";
import { LogicSimplifier } from "@/components/lab/LogicSimplifier";
import { TruthTable } from "@/components/lab/TruthTable";
import { KMap } from "@/components/lab/KMap";
import { Tabulation } from "@/components/lab/Tabulation";

export const Route = createFileRoute("/")({
  component: Index,
});

/* ============================================================================
 * PROJECT LOGIC LAB — a magical animated diorama
 * Pure SVG + CSS, no external assets.
 * ========================================================================== */

function Index() {
  return (
    <main className="lab-desk relative min-h-screen overflow-hidden text-[var(--lab-ink)]">
      <div className="lab-circuit-bg absolute inset-0 opacity-60" aria-hidden />
      <div className="pointer-events-none absolute -left-32 top-20 h-96 w-96 rounded-full bg-[oklch(0.55_0.20_305/0.25)] blur-3xl" aria-hidden />
      <div className="pointer-events-none absolute -right-24 bottom-10 h-80 w-80 rounded-full bg-[oklch(0.60_0.18_200/0.22)] blur-3xl" aria-hidden />

      <div className="relative mx-auto max-w-7xl px-3 py-5 sm:px-6 sm:py-8">
        <Header />
        <div className="mt-6 grid gap-6 lg:grid-cols-[300px_1fr_300px]">
          <div className="flex flex-col gap-6">
            <LogicSimplifier />
            <TruthTable />
          </div>
          <Breadboard />
          <div className="flex flex-col gap-6">
            <KMap />
            <Tabulation />
          </div>
        </div>
      </div>
    </main>
  );
}
