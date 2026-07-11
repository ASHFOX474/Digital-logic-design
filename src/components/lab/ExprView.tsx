/**
 * Renders a textbook-notation Boolean string (from `toTextbook`, using a
 * postfix apostrophe for NOT, e.g. "A'B + AB'C") with the apostrophe
 * displayed as-is — matching the ' notation convention.
 */
import type { ReactNode } from "react";

export function ExprView({ expr, className }: { expr: string; className?: string }) {
  const nodes: ReactNode[] = [];
  let i = 0;
  let key = 0;
  while (i < expr.length) {
    const c = expr[i];
    if (/[A-Za-z01]/.test(c)) {
      let token = c;
      i++;
      if (expr[i] === "'") {
        i++;
        // Render as A' (apostrophe notation)
        nodes.push(<span key={key++}>{token}'</span>);
        continue;
      }
      nodes.push(<span key={key++}>{token}</span>);
      continue;
    }
    if (c === "(") {
      // Find matching close paren, then check for trailing apostrophe (negated group).
      let depth = 1;
      let j = i + 1;
      while (j < expr.length && depth > 0) {
        if (expr[j] === "(") depth++;
        if (expr[j] === ")") depth--;
        j++;
      }
      const inner = expr.slice(i + 1, j - 1);
      const negated = expr[j] === "'";
      nodes.push(
        negated ? (
          <span key={key++}>
            (<ExprView expr={inner} />)'
          </span>
        ) : (
          <span key={key++}>
            (<ExprView expr={inner} />)
          </span>
        ),
      );
      i = negated ? j + 1 : j;
      continue;
    }
    nodes.push(<span key={key++}>{c}</span>);
    i++;
  }
  return <span className={className}>{nodes}</span>;
}
