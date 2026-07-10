/**
 * Quine-McCluskey minimization used by both the K-Map Solver and the
 * SOP/POS standalone pages. Produces prime implicants, essential prime
 * implicants, and a human-readable grouping trace so the UI can show its
 * work (not just the final minimized answer).
 */

export type Term = {
  /** bits string using '0' | '1' | '-' (don't-care position), MSB first, one char per variable */
  bits: string;
  /** minterms covered by this term */
  covers: number[];
};

function countOnes(bits: string): number {
  let n = 0;
  for (const c of bits) if (c === "1") n++;
  return n;
}

function combine(a: Term, b: Term): Term | null {
  if (a.bits.length !== b.bits.length) return null;
  let diffIndex = -1;
  for (let i = 0; i < a.bits.length; i++) {
    if (a.bits[i] !== b.bits[i]) {
      if (a.bits[i] === "-" || b.bits[i] === "-") return null; // dashes must align
      if (diffIndex !== -1) return null; // more than one difference
      diffIndex = i;
    }
  }
  if (diffIndex === -1) return null;
  const bits = a.bits.slice(0, diffIndex) + "-" + a.bits.slice(diffIndex + 1);
  return { bits, covers: Array.from(new Set([...a.covers, ...b.covers])).sort((x, y) => x - y) };
}

export interface GroupingStep {
  round: number;
  combined: { from: [string, string]; result: string; droppedVarIndex: number }[];
}

export interface QmResult {
  primeImplicants: Term[];
  essentialPrimeImplicants: Term[];
  selectedImplicants: Term[];
  steps: GroupingStep[];
  numVars: number;
}

/**
 * Runs Quine-McCluskey over `minterms` (required 1-outputs) using
 * `dontCares` as optional-coverage terms that may be folded into groups
 * but are never required to be covered by the final result.
 */
export function quineMcCluskey(minterms: number[], dontCares: number[], numVars: number): QmResult {
  const allTerms = Array.from(new Set([...minterms, ...dontCares])).sort((a, b) => a - b);
  let currentGroup: Term[] = allTerms.map((m) => ({
    bits: m.toString(2).padStart(numVars, "0"),
    covers: [m],
  }));

  const primeImplicants: Term[] = [];
  const steps: GroupingStep[] = [];
  let round = 0;

  while (currentGroup.length > 0) {
    round++;
    const used = new Set<number>();
    const nextGroupMap = new Map<string, Term>();
    const combinedLog: GroupingStep["combined"] = [];

    // bucket by number of 1-bits for efficient adjacent-pair combining
    const byOnes = new Map<number, { term: Term; idx: number }[]>();
    currentGroup.forEach((term, idx) => {
      const ones = countOnes(term.bits.replace(/-/g, "0"));
      if (!byOnes.has(ones)) byOnes.set(ones, []);
      byOnes.get(ones)!.push({ term, idx });
    });

    const groupKeys = Array.from(byOnes.keys()).sort((a, b) => a - b);
    for (const k of groupKeys) {
      const groupA = byOnes.get(k) ?? [];
      const groupB = byOnes.get(k + 1) ?? [];
      for (const a of groupA) {
        for (const b of groupB) {
          const merged = combine(a.term, b.term);
          if (merged) {
            used.add(a.idx);
            used.add(b.idx);
            if (!nextGroupMap.has(merged.bits)) nextGroupMap.set(merged.bits, merged);
            const diffIdx = [...a.term.bits].findIndex((c, i) => c !== merged.bits[i] && merged.bits[i] === "-");
            combinedLog.push({ from: [a.term.bits, b.term.bits], result: merged.bits, droppedVarIndex: diffIdx });
          }
        }
      }
    }

    currentGroup.forEach((term, idx) => {
      if (!used.has(idx)) primeImplicants.push(term);
    });

    if (combinedLog.length > 0) steps.push({ round, combined: combinedLog });
    currentGroup = Array.from(nextGroupMap.values());
    if (combinedLog.length === 0) break;
  }

  // de-duplicate PIs by bit pattern
  const dedup = new Map<string, Term>();
  for (const pi of primeImplicants) dedup.set(pi.bits, pi);
  const uniquePIs = Array.from(dedup.values());

  // Coverage table restricted to *required* minterms only (don't-cares don't need covering).
  const required = minterms.slice().sort((a, b) => a - b);
  const coverage = new Map<number, Term[]>();
  for (const m of required) {
    coverage.set(
      m,
      uniquePIs.filter((pi) => pi.covers.includes(m)),
    );
  }

  const essential: Term[] = [];
  const essentialBits = new Set<string>();
  for (const m of required) {
    const candidates = coverage.get(m) ?? [];
    if (candidates.length === 1 && !essentialBits.has(candidates[0].bits)) {
      essential.push(candidates[0]);
      essentialBits.add(candidates[0].bits);
    }
  }

  // Cover any remaining minterms exactly (minimum number of terms, then
  // minimum total literal count as a tie-breaker) via bounded search over
  // the candidate PIs — exact rather than greedy, so the result is a true
  // minimal SOP rather than merely "a" cover.
  const covered = new Set<number>();
  essential.forEach((pi) => pi.covers.forEach((c) => required.includes(c) && covered.add(c)));
  const selected = [...essential];
  const remaining = required.filter((m) => !covered.has(m));
  const candidates = uniquePIs.filter((pi) => !selected.some((s) => s.bits === pi.bits));

  if (remaining.length > 0) {
    const literalCount = (bits: string) => [...bits].filter((c) => c !== "-").length;
    // Only consider candidates that cover at least one remaining minterm.
    const relevant = candidates.filter((pi) => pi.covers.some((c) => remaining.includes(c)));

    const holder: { best: Term[] | null } = { best: null };
    const chosen: Term[] = [];
    // Exact search is exponential in the number of relevant PIs; cap it for
    // safety and fall back to the greedy heuristic beyond that (still correct,
    // just not guaranteed minimal for unusually large inputs).
    const EXACT_SEARCH_LIMIT = 22;
    function search(idx: number, coveredSoFar: Set<number>) {
      if (remaining.every((m) => coveredSoFar.has(m))) {
        const best = holder.best;
        if (
          !best ||
          chosen.length < best.length ||
          (chosen.length === best.length &&
            chosen.reduce((s, t) => s + literalCount(t.bits), 0) < best.reduce((s, t) => s + literalCount(t.bits), 0))
        ) {
          holder.best = [...chosen];
        }
        return;
      }
      if (idx >= relevant.length) return;
      // Prune: if remaining branches can't possibly beat the current best term count, stop early.
      if (holder.best && chosen.length >= holder.best.length) return;

      // Branch: take relevant[idx]
      const pi = relevant[idx];
      chosen.push(pi);
      const next = new Set(coveredSoFar);
      pi.covers.forEach((c) => next.add(c));
      search(idx + 1, next);
      chosen.pop();

      // Branch: skip relevant[idx]
      search(idx + 1, coveredSoFar);
    }
    if (relevant.length <= EXACT_SEARCH_LIMIT) search(0, covered);

    if (holder.best) {
      selected.push(...holder.best);
    } else {
      // Fallback (should not happen if PIs fully cover all minterms): greedy cover.
      const localCovered = new Set(covered);
      let localRemaining = remaining;
      while (localRemaining.length > 0) {
        let bestPi: Term | null = null;
        let bestCount = -1;
        for (const pi of relevant) {
          if (selected.some((s) => s.bits === pi.bits)) continue;
          const count = pi.covers.filter((c) => localRemaining.includes(c)).length;
          if (count > bestCount) {
            bestCount = count;
            bestPi = pi;
          }
        }
        if (!bestPi || bestCount <= 0) break;
        selected.push(bestPi);
        bestPi.covers.forEach((c) => localCovered.add(c));
        localRemaining = localRemaining.filter((m) => !localCovered.has(m));
      }
    }
  }

  return {
    primeImplicants: uniquePIs,
    essentialPrimeImplicants: essential,
    selectedImplicants: selected,
    steps,
    numVars,
  };
}

/** Converts a QM bit-pattern term ("1-0-") into a textbook product term using the given variable names. */
export function termToProduct(bits: string, varNames: string[]): string {
  const parts: string[] = [];
  for (let i = 0; i < bits.length; i++) {
    if (bits[i] === "1") parts.push(varNames[i]);
    else if (bits[i] === "0") parts.push(`${varNames[i]}'`);
  }
  return parts.length ? parts.join("") : "1";
}

/** Converts a QM bit-pattern term into a textbook sum term for POS (maxterm) usage. */
export function termToSum(bits: string, varNames: string[]): string {
  const parts: string[] = [];
  for (let i = 0; i < bits.length; i++) {
    if (bits[i] === "0") parts.push(varNames[i]);
    else if (bits[i] === "1") parts.push(`${varNames[i]}'`);
  }
  return parts.length ? `(${parts.join(" + ")})` : "0";
}

/** Parses "sum_of(1,3,4,5)" / "Σ(1,3,4,5)" / "1,3,4,5" style minterm lists. */
export function parseMintermList(raw: string): number[] {
  const match = raw.match(/\(([^)]*)\)/);
  const inner = match ? match[1] : raw;
  return inner
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => Number(s))
    .filter((n) => Number.isFinite(n) && n >= 0);
}
