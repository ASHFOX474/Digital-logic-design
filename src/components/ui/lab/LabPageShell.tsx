import type { ReactNode } from "react";
import { Header } from "./Header";

/* ============================================================================
 * LabPageShell — shared frame for standalone Analysis Tool / reference pages,
 * so each tool can live at its own dedicated route (per the nav plan) while
 * keeping the same "magical diorama" look as the home Lab page.
 * ========================================================================== */
export function LabPageShell({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: string;
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <main className="lab-desk relative min-h-screen overflow-hidden text-[var(--lab-ink)]">
      <div className="lab-circuit-bg absolute inset-0 opacity-60" aria-hidden />
      <div className="pointer-events-none absolute -left-32 top-20 h-96 w-96 rounded-full bg-[oklch(0.55_0.20_305/0.25)] blur-3xl" aria-hidden />
      <div className="pointer-events-none absolute -right-24 bottom-10 h-80 w-80 rounded-full bg-[oklch(0.60_0.18_200/0.22)] blur-3xl" aria-hidden />
      <div className="relative mx-auto max-w-5xl px-6 py-8">
        <Header />
        <div className="lab-panel relative mt-6 overflow-hidden p-6">
          <div className="lab-scanline" aria-hidden />
          <p className="text-[10px] tracking-[0.35em] text-[var(--lab-muted)]">{eyebrow}</p>
          <h1 className="lab-title mt-1 text-xl font-bold tracking-[0.1em] md:text-2xl">{title}</h1>
          {description && <p className="mt-2 max-w-2xl text-sm text-[var(--lab-muted)]">{description}</p>}
          <div className="mt-6">{children}</div>
        </div>
      </div>
    </main>
  );
}
