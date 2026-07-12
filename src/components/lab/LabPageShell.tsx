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
  actions,
  children,
}: {
  eyebrow: string;
  title: string;
  description?: string;
  /** Optional header-adjacent slot (e.g. a search bar or buttons), rendered to the
   *  right of the title block on wide screens and beneath it on narrow ones. */
  actions?: ReactNode;
  children: ReactNode;
}) {
  return (
    <main className="lab-desk relative min-h-screen overflow-hidden text-[var(--lab-ink)]">
      <div className="lab-circuit-bg absolute inset-0 opacity-60" aria-hidden />
      <div className="pointer-events-none absolute -left-32 top-20 h-96 w-96 rounded-full bg-[oklch(0.55_0.20_305/0.25)] blur-3xl" aria-hidden />
      <div className="pointer-events-none absolute -right-24 bottom-10 h-80 w-80 rounded-full bg-[oklch(0.60_0.18_200/0.22)] blur-3xl" aria-hidden />
      <div className="relative mx-auto max-w-7xl px-3 py-5 sm:px-6 sm:py-8">
        <Header />
        <div className="lab-panel relative mt-6 overflow-hidden p-4 sm:p-6">
          <div className="lab-scanline" aria-hidden />
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <p className="text-[10px] tracking-[0.35em] text-[var(--lab-muted)]">{eyebrow}</p>
              <h1 className="lab-title mt-1 text-xl font-bold tracking-[0.1em] md:text-2xl">{title}</h1>
              {description && <p className="mt-2 max-w-2xl text-sm text-[var(--lab-muted)]">{description}</p>}
            </div>
            {actions && <div className="shrink-0 sm:pt-1">{actions}</div>}
          </div>
          <div className="mt-6">{children}</div>
        </div>
      </div>
    </main>
  );
}