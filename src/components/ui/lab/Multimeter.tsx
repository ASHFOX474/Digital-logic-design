import { PanelHeader } from "./PanelHeader";

/* ---------------- Multimeter ---------------- */
export function Multimeter() {
  return (
    <section className="lab-panel relative overflow-hidden p-5">
      <div className="lab-scanline" aria-hidden />
      <PanelHeader eyebrow="INSTRUMENT · 04" title="MULTIMETER" accent="var(--lab-warm)" />
      <div className="mt-3 flex items-center gap-3">
        <div className="flex-1 rounded-lg border border-[var(--lab-border)] bg-[oklch(0.10_0.03_260)] p-3">
          <div className="flex items-baseline justify-between font-mono text-[var(--lab-mint)]">
            <span className="text-2xl" style={{ animation: "lab-tick 1.4s ease-in-out infinite" }}>4.87</span>
            <span className="text-xs">V DC</span>
          </div>
          <div className="mt-1 flex items-baseline justify-between font-mono text-[var(--lab-warm)]">
            <span className="text-xl" style={{ animation: "lab-tick 1.9s ease-in-out infinite .3s" }}>1.024</span>
            <span className="text-xs">kHz</span>
          </div>
          <div className="mt-2 h-6 overflow-hidden rounded bg-[oklch(0.14_0.03_265)]">
            <svg viewBox="0 0 100 20" className="h-full w-full" preserveAspectRatio="none">
              <path
                d="M0 10 L 10 10 L 12 2 L 14 18 L 16 10 L 30 10 L 32 2 L 34 18 L 36 10 L 60 10 L 62 2 L 64 18 L 66 10 L 100 10"
                stroke="var(--lab-mint)"
                strokeWidth="1"
                fill="none"
              >
                <animate attributeName="stroke-dashoffset" from="0" to="-40" dur="1.5s" repeatCount="indefinite" />
              </path>
            </svg>
          </div>
        </div>
        <svg width="60" height="60" viewBox="0 0 60 60">
          <circle cx="30" cy="30" r="26" fill="oklch(0.18 0.04 265)" stroke="var(--lab-warm)" strokeWidth="1.5" />
          <circle cx="22" cy="26" r="2" fill="var(--lab-warm)" />
          <circle cx="38" cy="26" r="2" fill="var(--lab-warm)" />
          <path d="M20 35 Q30 43 40 35" stroke="var(--lab-warm)" strokeWidth="2" fill="none" strokeLinecap="round" />
        </svg>
      </div>
    </section>
  );
}
