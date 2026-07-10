import { evalAst, parseExpr, collectVars, type AstNode } from "./parser";

export interface TruthRow {
  bits: boolean[];
  index: number;
  output: boolean;
}

export interface TruthTableResult {
  vars: string[];
  rows: TruthRow[];
  ast: AstNode;
}

const MAX_VARS = 6;

/** Builds a full truth table for `raw`, auto-detecting variables (any letters used). Throws on parse errors. */
export function buildTruthTable(raw: string): TruthTableResult {
  const ast = parseExpr(raw);
  const vars = collectVars(ast);
  if (vars.length === 0) throw new Error("Expression has no variables");
  if (vars.length > MAX_VARS) throw new Error(`Too many variables (max ${MAX_VARS})`);
  const rows: TruthRow[] = [];
  const n = vars.length;
  for (let i = 0; i < 1 << n; i++) {
    const bits: boolean[] = [];
    const assign: Record<string, boolean> = {};
    for (let b = 0; b < n; b++) {
      const bit = !!(i & (1 << (n - 1 - b)));
      bits.push(bit);
      assign[vars[b]] = bit;
    }
    rows.push({ bits, index: i, output: evalAst(ast, assign) });
  }
  return { vars, rows, ast };
}

export function minterms(result: TruthTableResult): number[] {
  return result.rows.filter((r) => r.output).map((r) => r.index);
}

export function maxterms(result: TruthTableResult): number[] {
  return result.rows.filter((r) => !r.output).map((r) => r.index);
}
