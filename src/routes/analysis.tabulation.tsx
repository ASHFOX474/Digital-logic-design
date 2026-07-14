import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState, useEffect } from "react";
import { LabPageShell } from "@/components/lab/LabPageShell";
import { ExprView } from "@/components/lab/ExprView";
import { buildTruthTable, minterms } from "@/lib/logic/truthtable";
import { parseMintermList, quineMcCluskey, termToProduct } from "@/lib/logic/qm";

export const Route = createFileRoute("/analysis/tabulation")({
  component: TabulationPage,
});

/* ─────────────────────── Local tabulation engine ────────────────────────── */
type TabTerm = {
  bits: string;
  covers: number[];
  isDC: boolean; // is a pure don't-care (no required minterm in covers)
  checked: boolean; // was combined in the next round
};

type TabRound = {
  round: number;
  groups: { ones: number; terms: TabTerm[] }[];
};

function countOnes(bits: string) {
  let n = 0;
  for (const c of bits) if (c === "1") n++;
  return n;
}

function combineBits(a: TabTerm, b: TabTerm): TabTerm | null {
  if (a.bits.length !== b.bits.length) return null;
  let diffIdx = -1;
  for (let i = 0; i < a.bits.length; i++) {
    if (a.bits[i] !== b.bits[i]) {
      if (a.bits[i] === "-" || b.bits[i] === "-") return null;
      if (diffIdx !== -1) return null;
      diffIdx = i;
    }
  }
  if (diffIdx === -1) return null;
  const bits = a.bits.slice(0, diffIdx) + "-" + a.bits.slice(diffIdx + 1);
  const covers = Array.from(new Set([...a.covers, ...b.covers])).sort((x, y) => x - y);
  return { bits, covers, isDC: a.isDC && b.isDC, checked: false };
}

function tabulateQM(minterms: number[], dontCares: number[], numVars: number): TabRound[] {
  const allNums = Array.from(new Set([...minterms, ...dontCares])).sort((a, b) => a - b);
  const dcSet = new Set(dontCares);
  const mtSet = new Set(minterms);

  let current: TabTerm[] = allNums.map((m) => ({
    bits: m.toString(2).padStart(numVars, "0"),
    covers: [m],
    isDC: dcSet.has(m) && !mtSet.has(m),
    checked: false,
  }));

  const rounds: TabRound[] = [];

  while (current.length > 0) {
    // Build groups for this round
    const groupMap = new Map<number, TabTerm[]>();
    for (const t of current) {
      const ones = countOnes(t.bits.replace(/-/g, "0"));
      if (!groupMap.has(ones)) groupMap.set(ones, []);
      groupMap.get(ones)!.push(t);
    }
    const groups = Array.from(groupMap.entries())
      .sort(([a], [b]) => a - b)
      .map(([ones, terms]) => ({ ones, terms }));
    rounds.push({ round: rounds.length, groups });

    // Combine for next round
    const nextMap = new Map<string, TabTerm>();
    const usedIdx = new Set<number>();
    const byOnes = new Map<number, { t: TabTerm; i: number }[]>();
    current.forEach((t, i) => {
      const ones = countOnes(t.bits.replace(/-/g, "0"));
      if (!byOnes.has(ones)) byOnes.set(ones, []);
      byOnes.get(ones)!.push({ t, i });
    });

    for (const [k, grpA] of byOnes) {
      const grpB = byOnes.get(k + 1) ?? [];
      for (const a of grpA) {
        for (const b of grpB) {
          const merged = combineBits(a.t, b.t);
          if (merged) {
            usedIdx.add(a.i);
            usedIdx.add(b.i);
            if (!nextMap.has(merged.bits)) nextMap.set(merged.bits, merged);
          }
        }
      }
    }

    current.forEach((t, i) => { if (usedIdx.has(i)) t.checked = true; });
    if (nextMap.size === 0) break;
    current = Array.from(nextMap.values());
  }

  return rounds;
}

/* ─────────────────────── Page component ─────────────────────────────────── */
type InputMode = "expression" | "minterms";

function TabulationPage() {
  const [mode, setMode] = useState<InputMode>("minterms");
  const [expr, setExpr] = useState("AB'C' + BC");
  const [mintermRaw, setMintermRaw] = useState("sum_of(0,1,2,5,8,9,10)");
  const [dontCareRaw, setDontCareRaw] = useState("");
  const [numVars, setNumVars] = useState(4);
  const [varNamesRaw, setVarNamesRaw] = useState("A,B,C,D");
  const [step, setStep] = useState(-1); // -1=nothing shown
  const [showCover, setShowCover] = useState(false);

  const parsed = useMemo(() => {
    try {
      if (mode === "expression") {
        const table = buildTruthTable(expr);
        return {
          vars: table.vars,
          numVars: table.vars.length,
          reqMinterms: minterms(table),
          dontCares: [] as number[],
          error: null as string | null,
        };
      }
      const vars = varNamesRaw.split(",").map((s) => s.trim().toUpperCase()).filter(Boolean);
      const n = numVars;
      const names = vars.length === n ? vars : Array.from({ length: n }, (_, i) => String.fromCharCode(65 + i));
      const ms = parseMintermList(mintermRaw);
      const dcs = parseMintermList(dontCareRaw || "()");
      const max = 1 << n;
      const invalid = [...ms, ...dcs].find((m) => m >= max || m < 0);
      if (invalid !== undefined) throw new Error(`Term ${invalid} out of range for ${n} variables (0–${max - 1})`);
      return { vars: names, numVars: n, reqMinterms: ms, dontCares: dcs, error: null as string | null };
    } catch (e) {
      return { vars: [], numVars: 0, reqMinterms: [], dontCares: [], error: e instanceof Error ? e.message : "Invalid input" };
    }
  }, [mode, expr, mintermRaw, dontCareRaw, numVars, varNamesRaw]);

  const tabRounds = useMemo(() => {
    if (parsed.error || parsed.numVars === 0 || parsed.numVars > 6) return [];
    return tabulateQM(parsed.reqMinterms, parsed.dontCares, parsed.numVars);
  }, [parsed]);

  const qmResult = useMemo(() => {
    if (parsed.error || parsed.numVars === 0 || parsed.numVars > 6) return null;
    return quineMcCluskey(parsed.reqMinterms, parsed.dontCares, parsed.numVars);
  }, [parsed]);

  const finalExpr = useMemo(() => {
    if (!qmResult) return "";
    if (qmResult.selectedImplicants.length === 0)
      return parsed.reqMinterms.length === 0 ? "0" : "1";
    return qmResult.selectedImplicants.map((t) => termToProduct(t.bits, parsed.vars)).join(" + ");
  }, [qmResult, parsed]);

  // Reset step when input changes
  useEffect(() => { setStep(-1); setShowCover(false); }, [tabRounds]);

  const totalRoundSteps = tabRounds.length;
  const allStepsRevealed = step >= totalRoundSteps - 1;

  return (
    <LabPageShell
      eyebrow="ANALYSIS TOOL"
      title="TABULATION METHOD"
      description="Quine-McCluskey tabulation — lists all minterms, systematically combines adjacent groups round-by-round to find prime implicants, then selects the minimal essential cover. Supports don't-care terms and step-by-step walkthrough."
    >
      {/* ── Input ─────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-2">
        {(["expression", "minterms"] as const).map((m) => (
          <button
            key={m}
            onClick={() => setMode(m)}
            aria-pressed={mode === m}
            className="rounded-full border px-3 py-1 font-mono text-[10px] tracking-[0.15em] transition"
            style={
              mode === m
                ? { borderColor: "var(--lab-purple)", color: "var(--lab-purple)", boxShadow: "0 0 8px var(--lab-purple)" }
                : { borderColor: "var(--lab-border)", color: "var(--lab-muted)" }
            }
          >
            {m === "expression" ? "FROM EQUATION" : "FROM Σ MINTERMS"}
          </button>
        ))}
      </div>

      {mode === "expression" ? (
        <input
          value={expr}
          onChange={(e) => setExpr(e.target.value)}
          spellCheck={false}
          placeholder="e.g. AB'C' + BC"
          className="mt-3 w-full rounded-md border border-[var(--lab-border)] bg-[oklch(0.11_0.03_260/.8)] px-3 py-2 font-mono text-sm text-[var(--lab-cyan)] outline-none focus:border-[var(--lab-cyan)]"
        />
      ) : (
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <label className="text-xs text-[var(--lab-muted)]">
            Minterms — Σ(...)
            <input value={mintermRaw} onChange={(e) => setMintermRaw(e.target.value)} spellCheck={false}
              placeholder="sum_of(0,1,2,5,8,9,10)"
              className="mt-1 w-full rounded-md border border-[var(--lab-border)] bg-[oklch(0.11_0.03_260/.8)] px-3 py-2 font-mono text-sm text-[var(--lab-cyan)] outline-none focus:border-[var(--lab-cyan)]" />
          </label>
          <label className="text-xs text-[var(--lab-muted)]">
            Don't-care terms
            <input value={dontCareRaw} onChange={(e) => setDontCareRaw(e.target.value)} spellCheck={false}
              placeholder="d(3,7)"
              className="mt-1 w-full rounded-md border border-[var(--lab-border)] bg-[oklch(0.11_0.03_260/.8)] px-3 py-2 font-mono text-sm text-[var(--lab-warm)] outline-none focus:border-[var(--lab-warm)]" />
          </label>
          <label className="text-xs text-[var(--lab-muted)]">
            Number of variables
            <input type="number" min={2} max={6} value={numVars}
              onChange={(e) => setNumVars(Math.max(2, Math.min(6, Number(e.target.value) || 2)))}
              className="mt-1 w-full rounded-md border border-[var(--lab-border)] bg-[oklch(0.11_0.03_260/.8)] px-3 py-2 font-mono text-sm text-[var(--lab-ink)] outline-none focus:border-[var(--lab-cyan)]" />
          </label>
          <label className="text-xs text-[var(--lab-muted)]">
            Variable names (optional)
            <input value={varNamesRaw} onChange={(e) => setVarNamesRaw(e.target.value)} spellCheck={false}
              placeholder="A,B,C,D"
              className="mt-1 w-full rounded-md border border-[var(--lab-border)] bg-[oklch(0.11_0.03_260/.8)] px-3 py-2 font-mono text-sm text-[var(--lab-ink)] outline-none focus:border-[var(--lab-cyan)]" />
          </label>
        </div>
      )}

      {parsed.error && <p className="mt-3 font-mono text-xs text-[var(--lab-pink)]">⚠ {parsed.error}</p>}
      {!parsed.error && parsed.numVars > 6 && (
        <p className="mt-3 font-mono text-xs text-[var(--lab-pink)]">⚠ Supports up to 6 variables.</p>
      )}

      {/* ── Step-by-step navigation ───────────────────────────────── */}
      {tabRounds.length > 0 && (
        <div className="mt-6 rounded-md border border-[var(--lab-border)] bg-[oklch(0.12_0.03_265/.5)] p-4">
          <p className="text-[10px] tracking-[0.25em] text-[var(--lab-muted)]">STEP-BY-STEP TABULATION</p>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <button
              onClick={() => { setStep((s) => Math.max(-1, s - 1)); setShowCover(false); }}
              disabled={step <= -1}
              className="lab-menu-btn px-3 py-1 text-xs disabled:cursor-not-allowed disabled:opacity-30"
            >
              ◀ Previous
            </button>
            <button
              onClick={() => {
                if (allStepsRevealed) { setShowCover(true); }
                else setStep((s) => Math.min(totalRoundSteps - 1, s + 1));
              }}
              disabled={showCover}
              className="lab-menu-btn px-3 py-1 text-xs disabled:cursor-not-allowed disabled:opacity-30"
            >
              Next ▶
            </button>
            <span className="font-mono text-[10px] tracking-[0.15em] text-[var(--lab-muted)]">
              {step === -1 ? "Press Next to start" : showCover ? "Cover Chart" : `Round ${step}`}
            </span>
          </div>
        </div>
      )}

      {/* ── Tabulation tables ─────────────────────────────────────── */}
      {tabRounds.slice(0, step + 1).map((round) => (
        <div key={round.round} className="mt-6">
          <h2 className="text-xs tracking-[0.25em] text-[var(--lab-muted)]">
            {round.round === 0 ? "TABLE 0 — INITIAL MINTERMS" : `TABLE ${round.round} — ROUND ${round.round} COMBINATIONS`}
          </h2>
          <div className="mt-2 overflow-x-auto rounded-md border border-[var(--lab-border)]">
            <table className="w-full font-mono text-sm">
              <thead>
                <tr className="border-b border-[var(--lab-border)] text-[var(--lab-muted)]">
                  <th className="px-3 py-2.5 text-left text-xs tracking-[0.15em]">GROUP</th>
                  <th className="px-3 py-2.5 text-left text-xs tracking-[0.15em]">MINTERMS</th>
                  <th className="px-3 py-2.5 text-left text-xs tracking-[0.15em]">BINARY ({parsed.vars.join("")})</th>
                  <th className="px-3 py-2.5 text-center text-xs tracking-[0.15em]">USED</th>
                </tr>
              </thead>
              <tbody>
                {round.groups.flatMap((grp) =>
                  grp.terms.map((t, ti) => (
                    <tr
                      key={`${grp.ones}-${ti}`}
                      className="border-b border-[var(--lab-border)/50] transition"
                      style={{ opacity: t.checked ? 0.5 : 1 }}
                    >
                      {ti === 0 && (
                        <td
                          rowSpan={grp.terms.length}
                          className="border-r border-[var(--lab-border)] px-3 py-2.5 text-center font-bold"
                          style={{ color: "var(--lab-purple)" }}
                        >
                          {grp.ones}
                        </td>
                      )}
                      <td className="px-3 py-2.5 text-[var(--lab-muted)]">
                        {t.covers.join(",")}
                        {t.isDC && <span className="ml-1 text-[var(--lab-warm)]">(d)</span>}
                      </td>
                      <td className="px-3 py-2.5 tracking-[0.1em]">
                        <span style={{ color: "var(--lab-cyan)" }}>
                          {t.bits.split("").map((ch, ci) => (
                            <span key={ci} style={{ color: ch === "-" ? "var(--lab-warm)" : "var(--lab-cyan)" }}>
                              {ch}
                            </span>
                          ))}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-center">
                        {t.checked ? (
                          <span style={{ color: "var(--lab-mint)" }}>✓</span>
                        ) : (
                          <span style={{ color: "var(--lab-pink)" }}>✗</span>
                        )}
                      </td>
                    </tr>
                  )),
                )}
              </tbody>
            </table>
          </div>
          {round.round === 0 && (
            <p className="mt-1 font-mono text-[10px] text-[var(--lab-muted)]">
              Group = number of 1-bits · ✗ = prime implicant (not combined further) · (d) = don't-care
            </p>
          )}
        </div>
      ))}

      {/* ── Prime Implicant chart ─────────────────────────────────── */}
      {showCover && qmResult && (
        <>
          <div className="mt-6">
            <h2 className="text-xs tracking-[0.25em] text-[var(--lab-muted)]">PRIME IMPLICANTS</h2>
            <div className="mt-2 flex flex-wrap gap-2">
              {qmResult.primeImplicants.map((pi) => {
                const isEssential = qmResult.essentialPrimeImplicants.some((e) => e.bits === pi.bits);
                const isSelected = qmResult.selectedImplicants.some((s) => s.bits === pi.bits);
                return (
                  <span
                    key={pi.bits}
                    className="rounded-md border px-2.5 py-1.5 font-mono text-sm"
                    style={{
                      borderColor: isEssential
                        ? "var(--lab-mint)"
                        : isSelected
                          ? "var(--lab-cyan)"
                          : "var(--lab-border)",
                      color: isEssential
                        ? "var(--lab-mint)"
                        : isSelected
                          ? "var(--lab-cyan)"
                          : "var(--lab-muted)",
                    }}
                  >
                    <ExprView expr={termToProduct(pi.bits, parsed.vars)} />
                    {isEssential && <span className="ml-1 text-[8px] tracking-[0.1em]">★EPI</span>}
                  </span>
                );
              })}
            </div>
            <p className="mt-1 font-mono text-[10px] text-[var(--lab-muted)]">
              ★EPI = essential prime implicant (covers a minterm no other PI covers)
            </p>
          </div>

          {/* Prime implicant cover table */}
          {parsed.reqMinterms.length > 0 && parsed.reqMinterms.length <= 20 && (
            <div className="mt-6">
              <h2 className="text-xs tracking-[0.25em] text-[var(--lab-muted)]">PRIME IMPLICANT COVER CHART</h2>
              <div className="mt-2 overflow-x-auto rounded-md border border-[var(--lab-border)]">
                <table className="font-mono text-sm">
                  <thead>
                    <tr className="border-b border-[var(--lab-border)]">
                      <th className="px-3 py-2.5 text-left text-xs text-[var(--lab-muted)] tracking-[0.1em]">PI / Minterm →</th>
                      {parsed.reqMinterms.map((m) => (
                        <th key={m} className="px-3 py-2.5 text-center text-[var(--lab-cyan)]">{m}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {qmResult.primeImplicants.map((pi) => {
                      const isEPI = qmResult.essentialPrimeImplicants.some((e) => e.bits === pi.bits);
                      const isSel = qmResult.selectedImplicants.some((s) => s.bits === pi.bits);
                      return (
                        <tr
                          key={pi.bits}
                          className="border-b border-[var(--lab-border)/50]"
                          style={{ color: isEPI ? "var(--lab-mint)" : isSel ? "var(--lab-cyan)" : "var(--lab-muted)" }}
                        >
                          <td className="border-r border-[var(--lab-border)] px-3 py-2 text-left">
                            <ExprView expr={termToProduct(pi.bits, parsed.vars)} />
                            {isEPI && <span className="ml-1 text-[10px]">★</span>}
                          </td>
                          {parsed.reqMinterms.map((m) => (
                            <td key={m} className="px-3 py-2 text-center">
                              {pi.covers.includes(m) ? (
                                <span style={{ color: isEPI ? "var(--lab-mint)" : "var(--lab-cyan)" }}>×</span>
                              ) : (
                                <span className="opacity-20">·</span>
                              )}
                            </td>
                          ))}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Result */}
          <div className="mt-6 rounded-md border border-[var(--lab-purple)] bg-[oklch(0.30_0.14_305/.20)] px-4 py-4 lab-glow-purple">
            <p className="text-[10px] tracking-[0.2em] text-[var(--lab-muted)]">MINIMAL SOP EXPRESSION</p>
            <p className="mt-2 break-words text-xl font-bold text-[var(--lab-purple)]">
              F({parsed.vars.join(",")}) = <ExprView expr={finalExpr} />
            </p>
            <p className="mt-2 font-mono text-[10px] text-[var(--lab-muted)]">
              = Σ({parsed.reqMinterms.join(",")})
              {parsed.dontCares.length > 0 && ` + d(${parsed.dontCares.join(",")})`}
            </p>
          </div>
        </>
      )}
    </LabPageShell>
  );
}