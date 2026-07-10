import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";

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
      {/* animated circuit floor */}
      <div className="lab-circuit-bg absolute inset-0 opacity-60" aria-hidden />
      {/* ambient orbs */}
      <div className="pointer-events-none absolute -left-32 top-20 h-96 w-96 rounded-full bg-[oklch(0.55_0.20_305/0.25)] blur-3xl" aria-hidden />
      <div className="pointer-events-none absolute -right-24 bottom-10 h-80 w-80 rounded-full bg-[oklch(0.60_0.18_200/0.22)] blur-3xl" aria-hidden />

      <div className="relative mx-auto max-w-7xl px-6 py-8">
        <Header />
        <div className="mt-6 grid gap-6 lg:grid-cols-[300px_1fr_300px]">
          <div className="flex flex-col gap-6">
            <LogicSimplifier />
            <TruthTable />
          </div>
          <Breadboard />
          <div className="flex flex-col gap-6">
            <KMap />
            <Multimeter />
          </div>
        </div>
        <StartExperimenting />
        <Cactus />
      </div>
    </main>
  );
}

/* ---------------- Header ---------------- */
function Header() {
  return (
    <header className="lab-panel relative flex flex-col gap-4 px-6 py-5 md:flex-row md:items-center md:justify-between">
      <div className="lab-scanline" aria-hidden />
      <div>
        <p className="text-[10px] tracking-[0.35em] text-[var(--lab-muted)]">// MODULE 205/6 · DLD</p>
        <h1 className="lab-title mt-1 text-2xl font-bold md:text-3xl">DIGITAL LOGIC DESIGN</h1>
      </div>
      <nav className="flex flex-wrap gap-2">
        {["BUILD", "SIMULATE", "ANALYSIS", "EXPLORE"].map((label) => (
          <button key={label} className="lab-menu-btn">{label}</button>
        ))}
      </nav>
    </header>
  );
}

/* ---------------- Robot ---------------- */
function Robot({
  color = "cyan",
  expression = "smile",
  wave = false,
  label,
  size = 68,
}: {
  color?: "cyan" | "warm" | "mint" | "purple";
  expression?: "smile" | "wink" | "gears" | "starry" | "meter";
  wave?: boolean;
  label?: string;
  size?: number;
}) {
  const bodyStroke = {
    cyan: "var(--lab-cyan)", warm: "var(--lab-warm)",
    mint: "var(--lab-mint)", purple: "var(--lab-purple)",
  }[color];
  return (
    <div className="flex flex-col items-center" style={{ animation: "lab-bob 3.4s ease-in-out infinite" }}>
      <svg width={size} height={size * 1.15} viewBox="0 0 70 80" aria-label={label ?? "AI robot"}>
        <defs>
          <radialGradient id={`glow-${color}`} cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={bodyStroke} stopOpacity="0.55" />
            <stop offset="100%" stopColor={bodyStroke} stopOpacity="0" />
          </radialGradient>
        </defs>
        {/* halo */}
        <circle cx="35" cy="38" r="34" fill={`url(#glow-${color})`} />
        {/* antenna */}
        <line x1="35" y1="4" x2="35" y2="12" stroke={bodyStroke} strokeWidth="1.5" />
        <circle cx="35" cy="4" r="2" fill={bodyStroke}>
          <animate attributeName="opacity" values="0.4;1;0.4" dur="1.4s" repeatCount="indefinite" />
        </circle>
        {/* head */}
        <rect x="14" y="12" width="42" height="34" rx="10"
              fill="oklch(0.22 0.04 265)" stroke={bodyStroke} strokeWidth="1.5" />
        {/* face screen */}
        <rect x="19" y="18" width="32" height="22" rx="5" fill="oklch(0.10 0.04 260)" />
        <Face expression={expression} color={bodyStroke} />
        {/* neck */}
        <rect x="30" y="46" width="10" height="4" fill={bodyStroke} opacity="0.6" />
        {/* body */}
        <rect x="10" y="50" width="50" height="24" rx="8"
              fill="oklch(0.20 0.04 265)" stroke={bodyStroke} strokeWidth="1.5" />
        {/* chest light */}
        <circle cx="35" cy="62" r="3.5" fill={bodyStroke}>
          <animate attributeName="opacity" values="0.35;1;0.35" dur="2s" repeatCount="indefinite" />
        </circle>
        {/* arms */}
        <rect x="4" y="54" width="6" height="14" rx="3" fill={bodyStroke} opacity="0.75" />
        <g style={wave ? { transformOrigin: "63px 56px", animation: "lab-wave 1.6s ease-in-out infinite" } : undefined}>
          <rect x="60" y="54" width="6" height="14" rx="3" fill={bodyStroke} opacity="0.85" />
          {wave && <circle cx="63" cy="50" r="3" fill={bodyStroke} />}
        </g>
        {/* feet */}
        <rect x="18" y="74" width="12" height="4" rx="2" fill={bodyStroke} opacity="0.7" />
        <rect x="40" y="74" width="12" height="4" rx="2" fill={bodyStroke} opacity="0.7" />
      </svg>
      {label && (
        <span className="mt-1 rounded-full border border-[var(--lab-border)] bg-[oklch(0.20_0.04_265/.7)] px-2 py-[2px] text-[9px] tracking-[0.2em] text-[var(--lab-muted)]">
          {label}
        </span>
      )}
    </div>
  );
}

function Face({ expression, color }: { expression: string; color: string }) {
  if (expression === "wink")
    return (
      <g stroke={color} strokeWidth="2" fill="none" strokeLinecap="round">
        <circle cx="27" cy="27" r="2.2" fill={color} style={{ transformOrigin: "27px 27px", animation: "lab-wink 2.8s ease-in-out infinite" }} />
        <circle cx="43" cy="27" r="2.2" fill={color} style={{ transformOrigin: "43px 27px", animation: "lab-blink 3.2s ease-in-out infinite" }} />
        <path d="M26 34 Q35 39 44 34" />
      </g>
    );
  if (expression === "gears")
    return (
      <g stroke={color} strokeWidth="1.4" fill="none">
        <circle cx="27" cy="28" r="4">
          <animateTransform attributeName="transform" type="rotate" from="0 27 28" to="360 27 28" dur="4s" repeatCount="indefinite" />
        </circle>
        <circle cx="27" cy="28" r="1.2" fill={color} />
        <circle cx="43" cy="28" r="3">
          <animateTransform attributeName="transform" type="rotate" from="360 43 28" to="0 43 28" dur="3s" repeatCount="indefinite" />
        </circle>
        <path d="M26 35 Q35 37 44 35" strokeLinecap="round" />
      </g>
    );
  if (expression === "starry")
    return (
      <g fill={color} stroke={color} strokeWidth="1">
        <Star cx={27} cy={27} />
        <Star cx={43} cy={27} />
        <path d="M25 33 Q35 40 45 33" fill="none" strokeWidth="2" strokeLinecap="round">
          <animate attributeName="d" values="M25 33 Q35 40 45 33;M25 34 Q35 42 45 34;M25 33 Q35 40 45 33" dur="2s" repeatCount="indefinite" />
        </path>
      </g>
    );
  if (expression === "meter")
    return (
      <g stroke={color} strokeWidth="1.6" fill="none" fontFamily="ui-monospace, monospace">
        <text x="35" y="30" fill={color} fontSize="7" textAnchor="middle">
          <tspan>4.87V</tspan>
          <animate attributeName="opacity" values="1;0.4;1" dur="1.4s" repeatCount="indefinite" />
        </text>
        <path d="M26 35 Q35 39 44 35" strokeLinecap="round" />
      </g>
    );
  // smile
  return (
    <g stroke={color} strokeWidth="2" fill="none" strokeLinecap="round">
      <circle cx="27" cy="27" r="2.2" fill={color} style={{ transformOrigin: "27px 27px", animation: "lab-blink 3.6s ease-in-out infinite" }} />
      <circle cx="43" cy="27" r="2.2" fill={color} style={{ transformOrigin: "43px 27px", animation: "lab-blink 3.6s ease-in-out infinite .2s" }} />
      <path d="M26 33 Q35 39 44 33" />
    </g>
  );
}

function Star({ cx, cy }: { cx: number; cy: number }) {
  const pts = [0, 72, 144, 216, 288]
    .map((a) => {
      const r = (a * Math.PI) / 180;
      return `${cx + Math.sin(r) * 3},${cy - Math.cos(r) * 3}`;
    })
    .join(" ");
  return <polygon points={pts} />;
}

/* ---------------- Breadboard (central stage) ---------------- */
function Breadboard() {
  // TARGET: A=1, B=1, C=0, D=0
  const [inputs, setInputs] = useState<[boolean, boolean, boolean, boolean]>([true, true, false, false]);
  const toggle = (i: number) =>
    setInputs((prev) => {
      const next = [...prev] as [boolean, boolean, boolean, boolean];
      next[i] = !next[i];
      return next;
    });
  const [A, B, C, D] = inputs;
  const [expr, setExpr] = useState("A AND B AND NOT C AND NOT D");
  const { output, exprError } = evalBoolean(expr, A, B, C, D);

  const LETTERS = ["A", "B", "C", "D"] as const;
  // wire palette per input
  const WIRE = {
    A: { stroke: "var(--lab-pink)",  glow: "oklch(0.80 0.18 15 / 0.85)"  }, // red
    B: { stroke: "var(--lab-cyan)",  glow: "oklch(0.86 0.16 200 / 0.85)" }, // cyan
    C: { stroke: "var(--lab-mint)",  glow: "oklch(0.88 0.18 155 / 0.85)" }, // green
    D: { stroke: "oklch(0.90 0.19 95)", glow: "oklch(0.90 0.19 95 / 0.85)" }, // yellow
  } as const;

  // SVG viewBox 600x300. Inputs vertically centered around y=150 (span 60..240).
  // Y positions for A,B,C,D
  const IY = [72, 132, 192, 252];
  // IC x anchors (chips are 60 wide, y-centered around 160)
  const IC1 = 200, IC2 = 320, IC3 = 440;
  const OUT_X = 552, OUT_Y = 160;

  // per-input wire paths: from input (x=54) -> IC1 pin -> IC2 pin -> IC3 pin -> merge point (500,OUT_Y) -> output
  // Each input takes a different pin on IC1; join through the chain.
  const paths = {
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

      {/* BOOLEAN INPUT container above the circuit */}
      <div className="mt-3 rounded-xl border border-[var(--lab-border)] bg-[oklch(0.15_0.04_265/.7)] px-4 py-3">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-semibold tracking-[0.32em] text-[var(--lab-cyan)]" style={{ textShadow: "0 0 10px oklch(0.86 0.16 200/.6)" }}>
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
            placeholder="e.g. A AND B AND NOT C AND NOT D  ·  A&B&!C&!D  ·  A^B"
            className="flex-1 rounded-md border bg-[oklch(0.11_0.03_260/.8)] px-2.5 py-1.5 font-mono text-xs tracking-wider outline-none transition focus:border-[var(--lab-cyan)]"
            style={{
              borderColor: exprError ? "var(--lab-pink)" : "var(--lab-border)",
              color: exprError ? "var(--lab-pink)" : "var(--lab-cyan)",
              boxShadow: exprError ? "0 0 10px oklch(0.80 0.18 15/.5)" : "inset 0 0 8px oklch(0 0 0/.5)",
            }}
          />
          <span className="font-mono text-[9px] tracking-[0.2em]"
            style={{ color: exprError ? "var(--lab-pink)" : "var(--lab-muted)" }}>
            {exprError ? "SYNTAX" : "OK"}
          </span>
        </div>
        <div className="mt-2 flex items-center gap-2 font-mono text-xs">
          <span className="text-[var(--lab-muted)]">STATE</span>
          {LETTERS.map((L, i) => (
            <span key={L}
              className="rounded-md border px-2 py-0.5"
              style={{
                borderColor: inputs[i] ? WIRE[L].stroke : "var(--lab-border)",
                color: inputs[i] ? WIRE[L].stroke : "var(--lab-muted)",
                boxShadow: inputs[i] ? `0 0 10px ${WIRE[L].glow}` : "none",
              }}>
              {L}={inputs[i] ? 1 : 0}
            </span>
          ))}
          <span className="ml-auto text-[var(--lab-muted)]">OUT</span>
          <span className="rounded-md border px-2 py-0.5"
            style={{
              borderColor: output ? "var(--lab-pink)" : "var(--lab-border)",
              color: output ? "var(--lab-pink)" : "var(--lab-muted)",
              boxShadow: output ? "var(--glow-pink)" : "none",
            }}>
            Y={output ? 1 : 0}
          </span>
        </div>
      </div>

      {/* Board */}
      <div className="relative mt-4 h-[300px] rounded-2xl border border-[var(--lab-border)]"
           style={{
             background:
               "repeating-linear-gradient(0deg, oklch(0.13 0.03 260) 0 22px, oklch(0.16 0.03 260) 22px 24px)," +
               "linear-gradient(180deg, oklch(0.19 0.04 265), oklch(0.11 0.03 260))",
           }}>
        {/* wire traces */}
        <svg className="absolute inset-0 h-full w-full" viewBox="0 0 600 300" preserveAspectRatio="none">
          {LETTERS.map((L, i) => {
            const on = inputs[i];
            return (
              <path key={L} d={paths[L]}
                fill="none"
                stroke={WIRE[L].stroke}
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
                opacity={on ? 1 : 0.25}
                style={{ filter: on ? `drop-shadow(0 0 6px ${WIRE[L].glow})` : "none" }} />
            );
          })}
          {/* merged output wire */}
          <path d={mergePath}
            fill="none"
            stroke="var(--lab-pink)"
            strokeWidth={3}
            strokeLinecap="round"
            opacity={output ? 1 : 0.25}
            style={{ filter: output ? "drop-shadow(0 0 8px oklch(0.80 0.18 15/.9))" : "none" }} />
        </svg>

        {/* Flowing signal particles when active */}
        {LETTERS.map((L, i) =>
          inputs[i] ? (
            <FlowParticle key={L}
              color={L === "A" ? "warm" : L === "B" ? "cyan" : L === "C" ? "mint" : "warm"}
              path={paths[L]} delay={i * 0.35} />
          ) : null
        )}

        {/* LEFT: input circles A,B,C,D vertically centered */}
        {/* LEFT: input circles centered on their wire Y */}
        {LETTERS.map((L, i) => (
          <div key={L} className="absolute flex items-center gap-2"
            style={{ left: 12, top: IY[i], transform: "translateY(-50%)" }}>
            <span className="w-3 font-mono text-sm font-bold" style={{ color: WIRE[L].stroke }}>{L}</span>
            <button onClick={() => toggle(i)}
              aria-label={`Toggle input ${L}`}
              className="h-8 w-8 rounded-full border transition"
              style={{
                borderColor: WIRE[L].stroke,
                background: inputs[i]
                  ? `radial-gradient(circle at 30% 30%, oklch(1 0 0/.6), transparent 55%), radial-gradient(circle, var(--lab-pink), oklch(0.32 0.18 15))`
                  : "radial-gradient(circle, oklch(0.22 0.05 265), oklch(0.14 0.03 260))",
                boxShadow: inputs[i] ? "var(--glow-pink)" : "inset 0 0 6px oklch(0 0 0/.6)",
                animation: inputs[i] ? "lab-pulse 1.5s ease-in-out infinite" : undefined,
              }} />
          </div>
        ))}

        {/* Center: ICs */}
        <div className="absolute left-1/2 top-40 flex -translate-x-1/2 -translate-y-1/2 gap-6">
          <MiniChip label="74LS08" />
          <MiniChip label="74LS32" />
          <MiniChip label="74LS86" />
        </div>

        {/* RIGHT: single OUTPUT indicator centered on merge wire Y */}
        <div className="absolute right-4 flex flex-col items-center gap-2"
          style={{ top: OUT_Y + 10, transform: "translateY(-50%)" }}>
          <div className="h-12 w-12 rounded-full border-2"
            style={{
              borderColor: "var(--lab-pink)",
              background: output
                ? "radial-gradient(circle at 30% 30%, oklch(1 0 0/.7), transparent 55%), radial-gradient(circle, var(--lab-pink), oklch(0.32 0.18 15))"
                : "radial-gradient(circle, oklch(0.22 0.05 265), oklch(0.12 0.03 260))",
              boxShadow: output ? "var(--glow-pink), 0 0 40px oklch(0.80 0.18 15/.7)" : "inset 0 0 10px oklch(0 0 0/.6)",
              animation: output ? "lab-pulse 1.4s ease-in-out infinite" : undefined,
            }} />
          <span className="font-mono text-[10px] tracking-[0.28em]"
            style={{ color: output ? "var(--lab-pink)" : "var(--lab-muted)" }}>
            OUTPUT
          </span>
        </div>
      </div>

      {/* Toggle switch row below the board */}
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
        {Array.from({ length: pins }).map((_, i) => <span key={i} className="h-1.5 w-2 rounded-b-sm bg-[oklch(0.75_0.03_260)]" />)}
      </div>
      <div className="absolute inset-x-1.5 -bottom-1 flex justify-between">
        {Array.from({ length: pins }).map((_, i) => <span key={i} className="h-1.5 w-2 rounded-t-sm bg-[oklch(0.75_0.03_260)]" />)}
      </div>
    </div>
  );
}

function ToggleSwitch({ label, on, color, onToggle }: { label: string; on: boolean; color: string; onToggle: () => void }) {
  return (
    <button onClick={onToggle}
      className="flex items-center justify-between rounded-lg border border-[var(--lab-border)] bg-[oklch(0.15_0.04_265/.7)] px-3 py-2 transition hover:border-[var(--lab-cyan)]">
      <span className="font-mono text-sm font-bold" style={{ color }}>{label}</span>
      <span className="relative inline-block h-5 w-10 rounded-full transition"
        style={{
          background: on ? color : "oklch(0.22 0.04 265)",
          boxShadow: on ? `0 0 10px ${color}` : "inset 0 0 4px oklch(0 0 0/.7)",
        }}>
        <span className="absolute top-0.5 h-4 w-4 rounded-full bg-[oklch(0.98_0.01_250)] transition-all"
          style={{ left: on ? "22px" : "2px" }} />
      </span>
    </button>
  );
}

/* ---------------- Boolean expression evaluator ---------------- */
function evalBoolean(raw: string, A: boolean, B: boolean, C: boolean, D: boolean): { output: boolean; exprError: boolean } {
  const src = raw.trim();
  if (!src) return { output: false, exprError: false };
  // Normalize word operators / symbols to JS boolean ops.
  let s = ` ${src} `
    .replace(/\bAND\b/gi, "&&")
    .replace(/\bOR\b/gi, "||")
    .replace(/\bXOR\b/gi, "!==")
    .replace(/\bNOT\b/gi, "!")
    .replace(/\+/g, "||")
    .replace(/\*/g, "&&")
    .replace(/~/g, "!")
    .replace(/\^/g, "!==")
    .replace(/(?<![&])&(?!&)/g, "&&")
    .replace(/(?<!\|)\|(?!\|)/g, "||");
  // Whitelist: A-D, !, &, |, (, ), spaces, digits 0/1, =
  if (!/^[\sABCDabcd!&|()01=]+$/.test(s)) return { output: false, exprError: true };
  try {
    // eslint-disable-next-line no-new-func
    const fn = new Function("A", "B", "C", "D", `"use strict"; return (${s});`);
    const r = fn(A, B, C, D);
    return { output: Boolean(r), exprError: false };
  } catch {
    return { output: false, exprError: true };
  }
}

function FlowParticle({ color, path, delay }: { color: "cyan" | "mint" | "warm"; path: string; delay: number }) {
  return (
    <div
      className={`lab-signal ${color}`}
      style={{
        offsetPath: `path("${path}")`,
        animationDelay: `${delay}s`,
        left: 0, top: 0,
      } as React.CSSProperties}
    />
  );
}

function Chip({ label, pins }: { label: string; pins: number }) {
  return (
    <div className="relative">
      <div className="lab-chip flex h-14 w-24 items-center justify-center">
        <span>{label}</span>
      </div>
      <div className="absolute inset-x-2 -top-1.5 flex justify-between">
        {Array.from({ length: pins }).map((_, i) => <span key={i} className="h-1.5 w-2 rounded-b-sm bg-[oklch(0.75_0.03_260)]" />)}
      </div>
      <div className="absolute inset-x-2 -bottom-1.5 flex justify-between">
        {Array.from({ length: pins }).map((_, i) => <span key={i} className="h-1.5 w-2 rounded-t-sm bg-[oklch(0.75_0.03_260)]" />)}
      </div>
    </div>
  );
}

function InputButton({ kind, label, thinking }: { kind: "heart" | "square" | "round"; label: string; thinking?: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <div className="relative">
        {kind === "heart" && <div className="lab-heart-btn" />}
        {kind === "square" && (
          <div className="h-9 w-9 rounded-lg lab-glow-cyan"
               style={{ background: "radial-gradient(circle at 30% 30%, oklch(1 0 0/.35), transparent 60%), radial-gradient(circle, var(--lab-cyan), oklch(0.35 0.14 200))", animation: "lab-pulse 1.7s ease-in-out infinite" }} />
        )}
        {kind === "round" && (
          <div className="h-9 w-9 rounded-full lab-glow-mint"
               style={{ background: "radial-gradient(circle at 30% 30%, oklch(1 0 0/.35), transparent 60%), radial-gradient(circle, var(--lab-mint), oklch(0.35 0.14 155))", animation: "lab-pulse 1.9s ease-in-out infinite" }} />
        )}
        {thinking && (
          <span
            className="absolute -right-3 -top-6 rounded-full bg-[oklch(0.20_0.04_265/.9)] px-1.5 py-0.5 text-[10px] font-bold text-[var(--lab-warm)] shadow"
            style={{ animation: "lab-appear 2.6s ease-in-out infinite" }}
          >?</span>
        )}
      </div>
      <span className="text-[10px] tracking-[0.2em] text-[var(--lab-muted)]">{label}</span>
    </div>
  );
}

function LedRow({ color, label, active, onClick }: { color: "mint" | "red" | "warm" | "cyan"; label: string; active?: boolean; onClick?: () => void }) {
  return (
    <button onClick={onClick} className="flex items-center gap-2 text-right transition hover:scale-105">
      <span className="text-[10px] tracking-[0.2em] text-[var(--lab-muted)]">{label}</span>
      <span className={`lab-led ${color}`} style={{ opacity: active ? 1 : 0.25, filter: active ? undefined : "grayscale(1) brightness(0.5)" }} />
    </button>
  );
}

/* ---------------- Logic Simplifier ---------------- */
function LogicSimplifier() {
  return (
    <section className="lab-panel relative overflow-hidden p-5">
      <div className="lab-scanline" aria-hidden />
      <PanelHeader eyebrow="TOOL · 01" title="LOGIC SIMPLIFIER" accent="var(--lab-cyan)" />
      <div className="mt-4 space-y-3 font-mono text-sm">
        <div className="flex items-center justify-between rounded-md border border-[var(--lab-border)] bg-[oklch(0.12_0.03_265/.7)] px-3 py-2">
          <span className="text-[var(--lab-muted)]">(A&amp;B) | (A&amp;B)</span>
          {/* <GateIcon kind="or" /> */}
        </div>
        <div className="flex items-center justify-center text-[var(--lab-cyan)]" style={{ animation: "lab-pulse 2s ease-in-out infinite" }}>
          ▲ SIMPLIFIED ▼
        </div>
        <div className="flex items-center justify-between rounded-md border border-[var(--lab-cyan)] bg-[oklch(0.20_0.10_200/.25)] px-3 py-2 lab-glow-cyan">
          <span className="text-lg font-bold text-[var(--lab-cyan)]">B</span>
          {/* <GateIcon kind="buf" /> */}
        </div>
        <p className="pt-1 text-[10px] tracking-[0.2em] text-[var(--lab-muted)]">
          ✓ 2 GATES · 6 TRANSISTORS SAVED
        </p>
      </div>
    </section>
  );
}

function GateIcon({ kind }: { kind: "or" | "buf" | "and" }) {
  const stroke = "var(--lab-cyan)";
  return (
    <svg width="34" height="22" viewBox="0 0 34 22" fill="none" style={{ animation: "lab-pulse 2s ease-in-out infinite" }}>
      {kind === "or" && <path d="M4 3 Q14 11 4 19 Q18 19 28 11 Q18 3 4 3 Z" stroke={stroke} strokeWidth="1.4" />}
      {kind === "and" && <path d="M4 3 H16 A8 8 0 0 1 16 19 H4 Z" stroke={stroke} strokeWidth="1.4" />}
      {kind === "buf" && <path d="M4 3 L26 11 L4 19 Z" stroke={stroke} strokeWidth="1.4" />}
      <line x1="28" y1="11" x2="34" y2="11" stroke={stroke} strokeWidth="1.4" />
    </svg>
  );
}

/* ---------------- Truth Table ---------------- */
function TruthTable() {
  const rows = [
    { A: 0, B: 0, Y: 0 },
    { A: 0, B: 1, Y: 1},
    { A: 1, B: 0, Y: 1},
    { A: 1, B: 1, Y: 0},
  ];
  return (
    <section className="lab-panel relative overflow-hidden p-5">
      <div className="lab-scanline" aria-hidden />
      <PanelHeader eyebrow="DATA · 02" title="TRUTH TABLE" accent="var(--lab-mint)" />
      <table className="mt-3 w-full border-separate border-spacing-y-1 text-center font-mono text-sm">
        <thead>
          <tr className="text-[10px] tracking-[0.3em] text-[var(--lab-muted)]">
            <th>A</th><th>B</th><th>Y</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="lab-truth-row">
              <td className="rounded-l-md py-1.5 text-[var(--lab-ink)]">{r.A}</td>
              <td className="text-[var(--lab-ink)]">{r.B}</td>
              <td className={r.Y ? "text-[var(--lab-mint)]" : "text-[var(--lab-muted)]"}>{r.Y}</td>
              <td className="rounded-r-md">{r.mood}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

/* ---------------- K-Map ---------------- */
function KMap() {
  const cells = [0,1,1,0, 1,1,0,1, 0,1,1,1, 1,0,1,0];
  return (
    <section className="lab-panel relative overflow-hidden p-5">
      <div className="lab-scanline" aria-hidden />
      <PanelHeader eyebrow="TOOL · 03" title="KARNAUGH MAP" accent="var(--lab-purple)" />
      <div className="mt-3 grid grid-cols-[auto_1fr] items-start gap-2 text-[10px] tracking-[0.2em] text-[var(--lab-muted)]">
        <div />
        <div className="grid grid-cols-4 text-center">
          <span>00</span><span>01</span><span>11</span><span>10</span>
        </div>
        <div className="flex flex-col justify-around">
          {["00","01","11","10"].map(l => <span key={l} className="py-1">{l}</span>)}
        </div>
        <div className="grid grid-cols-4 gap-1">
          {cells.map((v, i) => (
            <div key={i}
                 className={`lab-kmap-cell flex h-10 items-center justify-center rounded-md border border-[var(--lab-border)] bg-[oklch(0.14_0.03_265/.6)] text-sm font-bold ${v ? "on" : "text-[var(--lab-muted)]"}`}
                 style={v ? { animationDelay: `${i * 0.15}s`, animation: "lab-pulse 2.4s ease-in-out infinite" } : undefined}>
              {v}
            </div>
          ))}
        </div>
      </div>
      <div className="mt-4 rounded-md border border-[var(--lab-purple)] bg-[oklch(0.30_0.14_305/.20)] px-3 py-2 text-center font-mono text-sm text-[var(--lab-purple)] lab-glow-purple">
        <span style={{ animation: "lab-glow 3s ease-in-out infinite" }}>
          Y = A + B + ¬C + ¬D
        </span>
      </div>
    </section>
  );
}

/* ---------------- Multimeter ---------------- */
function Multimeter() {
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
              <path d="M0 10 L 10 10 L 12 2 L 14 18 L 16 10 L 30 10 L 32 2 L 34 18 L 36 10 L 60 10 L 62 2 L 64 18 L 66 10 L 100 10"
                    stroke="var(--lab-mint)" strokeWidth="1" fill="none">
                <animate attributeName="stroke-dashoffset" from="0" to="-40" dur="1.5s" repeatCount="indefinite" />
              </path>
            </svg>
          </div>
        </div>
        {/* smiling meter face */}
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

/* ---------------- Panel header ---------------- */
function PanelHeader({ eyebrow, title, accent }: { eyebrow: string; title: string; accent: string }) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <p className="text-[9px] tracking-[0.35em] text-[var(--lab-muted)]">{eyebrow}</p>
        <h2 className="mt-0.5 font-mono text-[13px] tracking-[0.3em]" style={{ color: accent }}>{title}</h2>
      </div>
      {/* <span className="h-2 w-2 rounded-full" style={{ background: accent, boxShadow: `0 0 12px ${accent}`, animation: "lab-pulse 1.6s ease-in-out infinite" }} /> */}
    </div>
  );
}

/* ---------------- CTA ---------------- */
function StartExperimenting() {
  return (
    <div className="lab-cta relative mt-6 flex items-center justify-between overflow-hidden rounded-2xl px-6 py-5 text-white">
      <div className="lab-scanline" aria-hidden />
      <div className="flex items-center gap-4">
        <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/15 backdrop-blur">
          <span className="text-lg">✨</span>
        </span>
        <div>
          <p className="text-[10px] tracking-[0.35em] text-white/80">CALL TO ACTION</p>
          <p className="mt-0.5 text-lg font-bold tracking-[0.15em]">START EXPERIMENTING</p>
        </div>
      </div>
      <div className="relative flex items-center gap-4">
        <div className="relative">
          <div className="lab-rocket-exhaust absolute -left-4 top-1/2 h-1 w-6 -translate-y-1/2">
            <span style={{ animationDelay: "0s" }} />
            <span style={{ animationDelay: ".2s" }} />
            <span style={{ animationDelay: ".4s" }} />
          </div>
          <svg width="44" height="44" viewBox="0 0 44 44" style={{ animation: "lab-float 1.6s ease-in-out infinite" }}>
            <path d="M8 26 L 24 8 L 34 12 L 30 24 L 12 32 Z" fill="oklch(0.96 0.02 250)" />
            <circle cx="26" cy="16" r="3" fill="var(--lab-purple)" />
            <path d="M8 26 L 14 34 L 12 32 Z" fill="var(--lab-warm)" />
          </svg>
        </div>
        <button className="rounded-full bg-white px-5 py-2 text-xs font-bold tracking-[0.3em] text-[var(--lab-purple-2,oklch(0.55_0.24_295))] transition hover:scale-105">
          LAUNCH →
        </button>
      </div>
    </div>
  );
}

/* ---------------- Whimsical cactus ---------------- */
function Cactus() {
  const [poked, setPoked] = useState(0);
  return (
    <button
      onClick={() => setPoked(v => v + 1)}
      aria-label="Poke the logic cactus"
      className="group absolute bottom-4 left-4 flex flex-col items-center focus:outline-none"
    >
      <svg width="70" height="90" viewBox="0 0 70 90">
        <ellipse cx="35" cy="86" rx="20" ry="4" fill="oklch(0 0 0 / .35)" />
        {/* pot */}
        <path d="M18 66 L 22 84 L 48 84 L 52 66 Z" fill="oklch(0.35 0.08 40)" stroke="var(--lab-warm)" strokeWidth="1" />
        <rect x="16" y="62" width="38" height="6" rx="2" fill="oklch(0.40 0.09 40)" stroke="var(--lab-warm)" strokeWidth="1" />
        {/* cactus body */}
        <g style={{ transformOrigin: "35px 60px", animation: "lab-bob 2.4s ease-in-out infinite" }}>
          <rect x="27" y="24" width="16" height="42" rx="8" fill="oklch(0.55 0.14 155)" stroke="var(--lab-mint)" strokeWidth="1" />
          <rect x="10" y="40" width="12" height="20" rx="6" fill="oklch(0.55 0.14 155)" stroke="var(--lab-mint)" strokeWidth="1" />
          <rect x="48" y="34" width="12" height="24" rx="6" fill="oklch(0.55 0.14 155)" stroke="var(--lab-mint)" strokeWidth="1" />
          {/* logic pattern */}
          <text x="35" y="42" textAnchor="middle" fontFamily="ui-monospace" fontSize="7" fill="var(--lab-mint)" className="lab-cactus-spike">01</text>
          <text x="35" y="52" textAnchor="middle" fontFamily="ui-monospace" fontSize="7" fill="var(--lab-mint)" className="lab-cactus-spike">10</text>
          <text x="16" y="52" textAnchor="middle" fontFamily="ui-monospace" fontSize="6" fill="var(--lab-mint)" className="lab-cactus-spike">&amp;</text>
          <text x="54" y="48" textAnchor="middle" fontFamily="ui-monospace" fontSize="6" fill="var(--lab-mint)" className="lab-cactus-spike">|</text>
          {/* face */}
          <circle cx="31" cy="30" r="1.4" fill="oklch(0.10 0.02 260)" />
          <circle cx="39" cy="30" r="1.4" fill="oklch(0.10 0.02 260)" />
          <path d="M30 34 Q35 37 40 34" stroke="oklch(0.10 0.02 260)" strokeWidth="1" fill="none" />
          {/* flower */}
          <circle cx="35" cy="22" r="3" fill="var(--lab-pink)">
            <animate attributeName="r" values="3;4;3" dur="1.8s" repeatCount="indefinite" />
          </circle>
        </g>
      </svg>
      {poked > 0 && (
        <span key={poked}
              className="absolute -top-2 rounded-full bg-[oklch(0.20_0.04_265/.9)] px-2 py-0.5 text-[10px] font-bold text-[var(--lab-mint)]"
              style={{ animation: "lab-appear 1.2s ease-out forwards" }}>
          ♪ boop!
        </span>
      )}
    </button>
  );
}
