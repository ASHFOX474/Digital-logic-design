import { useState } from "react";
import { tryEval } from "@/lib/logic/parser";

/* ============================================================================
 * Breadboard — the central interactive sandbox stage. Wires are physically
 * fixed to four positions (A, B, C, D); type any expression using those
 * letters (juxtaposition = AND, + = OR, ' = NOT, or word operators) to drive
 * the output LED live.
 * ========================================================================== */

const LETTERS = ["A", "B", "C", "D"] as const;
type Letter = (typeof LETTERS)[number];

const WIRE: Record<Letter, { stroke: string; glow: string }> = {
  A: { stroke: "var(--lab-pink)", glow: "oklch(0.80 0.18 15 / 0.85)" },
  B: { stroke: "var(--lab-cyan)", glow: "oklch(0.86 0.16 200 / 0.85)" },
  C: { stroke: "var(--lab-mint)", glow: "oklch(0.88 0.18 155 / 0.85)" },
  D: { stroke: "oklch(0.90 0.19 95)", glow: "oklch(0.90 0.19 95 / 0.85)" },
};

const IY = [72, 132, 192, 252];
const IC1 = 200, IC2 = 320, IC3 = 440;
const OUT_X = 552, OUT_Y = 160;
// The SVG wiring diagram is drawn on a fixed 600x300 canvas (viewBox below). The diorama's
// outer container is locked to that same 2:1 aspect ratio (see the `aspect-[2/1]` className
// further down), so converting every overlay element's position to a percentage of this canvas
// keeps switches/chips/LED lined up with the wires they connect to at any screen width —
// including narrow phone screens, where the whole diorama simply scales down uniformly.
const CANVAS_W = 600;
const CANVAS_H = 300;

export function Breadboard() {
  const [inputs, setInputs] = useState<[boolean, boolean, boolean, boolean]>([true, true, false, false]);
  const [expr, setExpr] = useState("AB'C'D'");
  const toggle = (i: number) =>
    setInputs((prev) => {
      const next = [...prev] as [boolean, boolean, boolean, boolean];
      next[i] = !next[i];
      return next;
    });

  const [A, B, C, D] = inputs;
  const { value: output, error } = tryEval(expr, { A, B, C, D });
  const exprError = !!error;

  const paths: Record<Letter, string> = {
    A: `M54,${IY[0]} L120,${IY[0]} L120,140 L${IC1},140 L${IC2},140 L${IC3},140 L500,${OUT_Y}`,
    B: `M54,${IY[1]} L110,${IY[1]} L110,156 L${IC1},156 L${IC2},156 L${IC3},156 L500,${OUT_Y}`,
    C: `M54,${IY[2]} L110,${IY[2]} L110,172 L${IC1},172 L${IC2},172 L${IC3},172 L500,${OUT_Y}`,
    D: `M54,${IY[3]} L120,${IY[3]} L120,188 L${IC1},188 L${IC2},188 L${IC3},188 L500,${OUT_Y}`,
  };
  const mergePath = `M500,${OUT_Y} L${OUT_X - 18},${OUT_Y}`;

  return (
    <section className="lab-panel relative overflow-hidden p-5">
      <div className="lab-scanline" aria-hidden />
      <div className="flex items-center justify-between text-[10px] tracking-[0.28em] text-[var(--lab-muted)]">
        <span>◆ LOGIC · STAGE 01</span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-[var(--lab-mint)]" style={{ animation: "lab-pulse 1.2s ease-in-out infinite" }} />
          LIVE
        </span>
      </div>

      <div className="mt-3 rounded-xl border border-[var(--lab-border)] bg-[oklch(0.15_0.04_265/.7)] px-4 py-3">
        <div className="flex items-center justify-between">
          <span
            className="text-[10px] font-semibold tracking-[0.32em] text-[var(--lab-cyan)]"
            style={{ textShadow: "0 0 10px oklch(0.86 0.16 200/.6)" }}
          >
            ◇ BOOLEAN INPUT
          </span>
          <span className="font-mono text-[10px] tracking-[0.2em] text-[var(--lab-muted)]">
            TARGET: A=1 · B=1 · C=0 · D=0 → OUTPUT
          </span>
        </div>
        <div className="mt-2 flex items-center gap-2">
          <span className="font-mono text-[10px] tracking-[0.28em] text-[var(--lab-muted)]">Y =</span>
          <input
            value={expr}
            onChange={(e) => setExpr(e.target.value)}
            spellCheck={false}
            placeholder="e.g. AB'C'D'  ·  A AND B AND NOT C AND NOT D"
            className="flex-1 rounded-md border bg-[oklch(0.11_0.03_260/.8)] px-2.5 py-1.5 font-mono text-xs tracking-wider outline-none transition focus:border-[var(--lab-cyan)]"
            style={{
              borderColor: exprError ? "var(--lab-pink)" : "var(--lab-border)",
              color: exprError ? "var(--lab-pink)" : "var(--lab-cyan)",
              boxShadow: exprError ? "0 0 10px oklch(0.80 0.18 15/.5)" : "inset 0 0 8px oklch(0 0 0/.5)",
            }}
          />
          <span className="font-mono text-[9px] tracking-[0.2em]" style={{ color: exprError ? "var(--lab-pink)" : "var(--lab-muted)" }}>
            {exprError ? "SYNTAX" : "OK"}
          </span>
        </div>
        <div className="mt-2 flex items-center gap-2 font-mono text-xs">
          <span className="text-[var(--lab-muted)]">STATE</span>
          {LETTERS.map((L, i) => (
            <span
              key={L}
              className="rounded-md border px-2 py-0.5"
              style={{
                borderColor: inputs[i] ? WIRE[L].stroke : "var(--lab-border)",
                color: inputs[i] ? WIRE[L].stroke : "var(--lab-muted)",
                boxShadow: inputs[i] ? `0 0 10px ${WIRE[L].glow}` : "none",
              }}
            >
              {L}={inputs[i] ? 1 : 0}
            </span>
          ))}
          <span className="ml-auto text-[var(--lab-muted)]">OUT</span>
          <span
            className="rounded-md border px-2 py-0.5"
            style={{
              borderColor: output ? "var(--lab-pink)" : "var(--lab-border)",
              color: output ? "var(--lab-pink)" : "var(--lab-muted)",
              boxShadow: output ? "var(--glow-pink)" : "none",
            }}
          >
            Y={output ? 1 : 0}
          </span>
        </div>
      </div>

      <div
        className="relative mt-4 aspect-[2/1] w-full rounded-2xl border border-[var(--lab-border)]"
        style={{
          background:
            "repeating-linear-gradient(0deg, oklch(0.13 0.03 260) 0 22px, oklch(0.16 0.03 260) 22px 24px)," +
            "linear-gradient(180deg, oklch(0.19 0.04 265), oklch(0.11 0.03 260))",
        }}
      >
        <svg className="absolute inset-0 h-full w-full" viewBox={`0 0 ${CANVAS_W} ${CANVAS_H}`} preserveAspectRatio="none">
          {LETTERS.map((L, i) => {
            const on = inputs[i];
            return (
              <path
                key={L}
                d={paths[L]}
                fill="none"
                stroke={WIRE[L].stroke}
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
                opacity={on ? 1 : 0.25}
                style={{ filter: on ? `drop-shadow(0 0 6px ${WIRE[L].glow})` : "none" }}
              />
            );
          })}
          <path
            d={mergePath}
            fill="none"
            stroke="var(--lab-pink)"
            strokeWidth={3}
            strokeLinecap="round"
            opacity={output ? 1 : 0.25}
            style={{ filter: output ? "drop-shadow(0 0 8px oklch(0.80 0.18 15/.9))" : "none" }}
          />

          {LETTERS.map((L, i) =>
            inputs[i] ? (
              <circle key={L} r={3.5} fill={WIRE[L].stroke} style={{ filter: `drop-shadow(0 0 5px ${WIRE[L].glow})` }}>
                <animateMotion dur="2.6s" begin={`${i * 0.35}s`} repeatCount="indefinite" path={paths[L]} rotate="auto" />
                <animate attributeName="opacity" dur="2.6s" begin={`${i * 0.35}s`} repeatCount="indefinite" values="0;1;1;0" keyTimes="0;0.08;0.92;1" />
              </circle>
            ) : null,
          )}
          {output && (
            <circle r={4} fill="var(--lab-pink)" style={{ filter: "drop-shadow(0 0 6px oklch(0.80 0.18 15/.9))" }}>
              <animateMotion dur="0.9s" repeatCount="indefinite" path={mergePath} rotate="auto" />
              <animate attributeName="opacity" dur="0.9s" repeatCount="indefinite" values="0;1;1;0" keyTimes="0;0.08;0.92;1" />
            </circle>
          )}
        </svg>

        {LETTERS.map((L, i) => (
          <div
            key={L}
            className="absolute flex items-center gap-2"
            style={{ left: `${(12 / CANVAS_W) * 100}%`, top: `${(IY[i] / CANVAS_H) * 100}%`, transform: "translateY(-50%)" }}
          >
            <span className="w-3 font-mono text-sm font-bold" style={{ color: WIRE[L].stroke }}>
              {L}
            </span>
            <button
              onClick={() => toggle(i)}
              aria-label={`Toggle input ${L}`}
              role="switch"
              aria-checked={inputs[i]}
              className="h-8 w-8 rounded-full border transition"
              style={{
                borderColor: WIRE[L].stroke,
                background: inputs[i]
                  ? `radial-gradient(circle at 30% 30%, oklch(1 0 0/.6), transparent 55%), radial-gradient(circle, var(--lab-pink), oklch(0.32 0.18 15))`
                  : "radial-gradient(circle, oklch(0.22 0.05 265), oklch(0.14 0.03 260))",
                boxShadow: inputs[i] ? "var(--glow-pink)" : "inset 0 0 6px oklch(0 0 0/.6)",
                animation: inputs[i] ? "lab-pulse 1.5s ease-in-out infinite" : undefined,
              }}
            />
          </div>
        ))}

        <div
          className="absolute left-1/2 flex -translate-x-1/2 -translate-y-1/2 gap-6"
          style={{ top: `${(160 / CANVAS_H) * 100}%` }}
        >
          <MiniChip label="74LS08" />
          <MiniChip label="74LS32" />
          <MiniChip label="74LS86" />
        </div>

        <div
          className="absolute right-4 flex flex-col items-center gap-2"
          style={{ top: `${((OUT_Y + 10) / CANVAS_H) * 100}%`, transform: "translateY(-50%)" }}
        >
          <div
            className="h-12 w-12 rounded-full border-2"
            style={{
              borderColor: "var(--lab-pink)",
              background: output
                ? "radial-gradient(circle at 30% 30%, oklch(1 0 0/.7), transparent 55%), radial-gradient(circle, var(--lab-pink), oklch(0.32 0.18 15))"
                : "radial-gradient(circle, oklch(0.22 0.05 265), oklch(0.12 0.03 260))",
              boxShadow: output ? "var(--glow-pink), 0 0 40px oklch(0.80 0.18 15/.7)" : "inset 0 0 10px oklch(0 0 0/.6)",
              animation: output ? "lab-pulse 1.4s ease-in-out infinite" : undefined,
            }}
          />
          <span className="font-mono text-[10px] tracking-[0.28em]" style={{ color: output ? "var(--lab-pink)" : "var(--lab-muted)" }}>
            OUTPUT
          </span>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-4 gap-3">
        {LETTERS.map((L, i) => (
          <ToggleSwitch key={L} label={L} on={inputs[i]} color={WIRE[L].stroke} onToggle={() => toggle(i)} />
        ))}
      </div>
    </section>
  );
}

function MiniChip({ label }: { label: string }) {
  const pins = 7;
  return (
    <div className="relative">
      <div className="lab-chip flex h-16 w-24 items-center justify-center" style={{ fontSize: 11 }}>
        <span>{label}</span>
      </div>
      <div className="absolute inset-x-1.5 -top-1 flex justify-between">
        {Array.from({ length: pins }).map((_, i) => (
          <span key={i} className="h-1.5 w-2 rounded-b-sm bg-[oklch(0.75_0.03_260)]" />
        ))}
      </div>
      <div className="absolute inset-x-1.5 -bottom-1 flex justify-between">
        {Array.from({ length: pins }).map((_, i) => (
          <span key={i} className="h-1.5 w-2 rounded-t-sm bg-[oklch(0.75_0.03_260)]" />
        ))}
      </div>
    </div>
  );
}

function ToggleSwitch({ label, on, color, onToggle }: { label: string; on: boolean; color: string; onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      role="switch"
      aria-checked={on}
      aria-label={`Toggle input ${label}`}
      className="flex items-center justify-between rounded-lg border border-[var(--lab-border)] bg-[oklch(0.15_0.04_265/.7)] px-3 py-2 transition hover:border-[var(--lab-cyan)]"
    >
      <span className="font-mono text-sm font-bold" style={{ color }}>{label}</span>
      <span
        className="relative inline-block h-5 w-10 rounded-full transition"
        style={{ background: on ? color : "oklch(0.22 0.04 265)", boxShadow: on ? `0 0 10px ${color}` : "inset 0 0 4px oklch(0 0 0/.7)" }}
      >
        <span className="absolute top-0.5 h-4 w-4 rounded-full bg-[oklch(0.98_0.01_250)] transition-all" style={{ left: on ? "22px" : "2px" }} />
      </span>
    </button>
  );
}
