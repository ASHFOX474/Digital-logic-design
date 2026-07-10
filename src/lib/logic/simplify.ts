/**
 * Rule-based Boolean algebra simplifier. Repeatedly rewrites the AST using
 * named laws (Idempotent, Complement, Identity, Domination, Absorption,
 * Double Negation, De Morgan's, Distributive/Factoring) and records each
 * step so the UI can show its work, similar to solving by hand on paper.
 */
import type { AstNode, Op } from "./parser";
import { toTextbook } from "./parser";

export interface SimplifyStep {
  law: string;
  before: string;
  after: string;
}

function eq(a: AstNode, b: AstNode): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}
function isComplementOf(a: AstNode, b: AstNode): boolean {
  return (a.kind === "not" && eq(a.arg, b)) || (b.kind === "not" && eq(b.arg, a));
}
function isConst(n: AstNode, v: 0 | 1): boolean {
  return n.kind === "const" && n.value === v;
}

/** Attempts one rewrite pass; returns the new node + a step description, or null if no rule fired. */
function rewriteOnce(node: AstNode): { node: AstNode; law: string } | null {
  if (node.kind === "not") {
    const inner = rewriteOnce(node.arg);
    if (inner) return { node: { kind: "not", arg: inner.node }, law: inner.law };
    // Double negation: (A')' = A
    if (node.arg.kind === "not") return { node: node.arg.arg, law: "Double Negation (A'' = A)" };
    // De Morgan's: (AB)' = A' + B', (A+B)' = A'B'
    if (node.arg.kind === "bin" && (node.arg.op === "AND" || node.arg.op === "OR")) {
      const { left, right, op } = node.arg;
      const newOp: Op = op === "AND" ? "OR" : "AND";
      return {
        node: { kind: "bin", op: newOp, left: { kind: "not", arg: left }, right: { kind: "not", arg: right } },
        law: "De Morgan's Law",
      };
    }
    // NOT of a constant
    if (node.arg.kind === "const") {
      return { node: { kind: "const", value: node.arg.value === 1 ? 0 : 1 }, law: "Constant Negation" };
    }
    return null;
  }

  if (node.kind === "var" || node.kind === "const") return null;

  // node.kind === "bin"
  const { op, left, right } = node;

  // recurse into children first (innermost simplifications)
  const leftRw = rewriteOnce(left);
  if (leftRw) return { node: { kind: "bin", op, left: leftRw.node, right }, law: leftRw.law };
  const rightRw = rewriteOnce(right);
  if (rightRw) return { node: { kind: "bin", op, left, right: rightRw.node }, law: rightRw.law };

  if (op === "AND") {
    if (eq(left, right)) return { node: left, law: "Idempotent Law (AA = A)" };
    if (isConst(left, 0) || isConst(right, 0)) return { node: { kind: "const", value: 0 }, law: "Domination Law (A\u00b70 = 0)" };
    if (isConst(left, 1)) return { node: right, law: "Identity Law (1\u00b7A = A)" };
    if (isConst(right, 1)) return { node: left, law: "Identity Law (A\u00b71 = A)" };
    if (isComplementOf(left, right)) return { node: { kind: "const", value: 0 }, law: "Complement Law (AA' = 0)" };
    // Absorption: A(A+B) = A
    if (right.kind === "bin" && right.op === "OR" && (eq(right.left, left) || eq(right.right, left))) {
      return { node: left, law: "Absorption Law (A(A+B) = A)" };
    }
    if (left.kind === "bin" && left.op === "OR" && (eq(left.left, right) || eq(left.right, right))) {
      return { node: right, law: "Absorption Law ((A+B)A = A)" };
    }
    // A(A'+B) = AB
    if (right.kind === "bin" && right.op === "OR") {
      if (isComplementOf(right.left, left)) return { node: { kind: "bin", op: "AND", left, right: right.right }, law: "Absorption Law (A(A'+B) = AB)" };
      if (isComplementOf(right.right, left)) return { node: { kind: "bin", op: "AND", left, right: right.left }, law: "Absorption Law (A(A'+B) = AB)" };
    }
  }

  if (op === "OR") {
    if (eq(left, right)) return { node: left, law: "Idempotent Law (A+A = A)" };
    if (isConst(left, 1) || isConst(right, 1)) return { node: { kind: "const", value: 1 }, law: "Domination Law (A+1 = 1)" };
    if (isConst(left, 0)) return { node: right, law: "Identity Law (0+A = A)" };
    if (isConst(right, 0)) return { node: left, law: "Identity Law (A+0 = A)" };
    if (isComplementOf(left, right)) return { node: { kind: "const", value: 1 }, law: "Complement Law (A+A' = 1)" };
    // Absorption: A+AB = A
    if (right.kind === "bin" && right.op === "AND" && (eq(right.left, left) || eq(right.right, left))) {
      return { node: left, law: "Absorption Law (A+AB = A)" };
    }
    if (left.kind === "bin" && left.op === "AND" && (eq(left.left, right) || eq(left.right, right))) {
      return { node: right, law: "Absorption Law (AB+A = A)" };
    }
    // A+A'B = A+B
    if (right.kind === "bin" && right.op === "AND") {
      if (isComplementOf(right.left, left)) return { node: { kind: "bin", op: "OR", left, right: right.right }, law: "Absorption Law (A+A'B = A+B)" };
      if (isComplementOf(right.right, left)) return { node: { kind: "bin", op: "OR", left, right: right.left }, law: "Absorption Law (A+A'B = A+B)" };
    }
    // Distributive factoring: AB + AC = A(B+C)
    if (left.kind === "bin" && left.op === "AND" && right.kind === "bin" && right.op === "AND") {
      const pairs: [AstNode, AstNode, AstNode, AstNode][] = [
        [left.left, left.right, right.left, right.right],
        [left.right, left.left, right.left, right.right],
        [left.left, left.right, right.right, right.left],
        [left.right, left.left, right.right, right.left],
      ];
      for (const [common, restA, commonB, restB] of pairs) {
        if (eq(common, commonB)) {
          return {
            node: { kind: "bin", op: "AND", left: common, right: { kind: "bin", op: "OR", left: restA, right: restB } },
            law: "Distributive Law (AB+AC = A(B+C))",
          };
        }
      }
    }
  }

  return null;
}

export function simplifyWithSteps(node: AstNode, maxSteps = 30): { result: AstNode; steps: SimplifyStep[] } {
  let current = node;
  const steps: SimplifyStep[] = [];
  for (let i = 0; i < maxSteps; i++) {
    const rewrite = rewriteOnce(current);
    if (!rewrite) break;
    const before = toTextbook(current);
    const after = toTextbook(rewrite.node);
    if (before === after) {
      current = rewrite.node;
      continue;
    }
    steps.push({ law: rewrite.law, before, after });
    current = rewrite.node;
  }
  return { result: current, steps };
}
