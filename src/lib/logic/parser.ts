/**
 * General-purpose Boolean expression parser for Project Logic Lab.
 *
 * Supports:
 *  - Any single-letter variable (A-Z, case-insensitive, canonicalized to upper case)
 *  - Constants 0 / 1
 *  - NOT: prefix "!", "~", word "NOT", or textbook postfix apostrophe  A'
 *  - AND: implicit juxtaposition (AB means A AND B), "&", "*", "·", word "AND"
 *  - OR: "+", "|", word "OR"
 *  - XOR: "^", word "XOR"
 *  - NAND / NOR / XNOR as explicit word operators, e.g. "A NAND B"
 *  - Parentheses
 */

export type Op = "AND" | "OR" | "XOR" | "NAND" | "NOR" | "XNOR";

export type AstNode =
  | { kind: "var"; name: string }
  | { kind: "const"; value: 0 | 1 }
  | { kind: "not"; arg: AstNode }
  | { kind: "bin"; op: Op; left: AstNode; right: AstNode };

export class ExprError extends Error {}

type TokenType =
  | "VAR"
  | "CONST"
  | "LPAREN"
  | "RPAREN"
  | "NOT_PREFIX"
  | "NOT_POSTFIX"
  | "AND"
  | "OR"
  | "XOR"
  | "NAND"
  | "NOR"
  | "XNOR"
  | "EOF";

interface Token {
  type: TokenType;
  value?: string;
}

const WORD_OPS: Record<string, TokenType> = {
  AND: "AND",
  OR: "OR",
  NOT: "NOT_PREFIX",
  XOR: "XOR",
  NAND: "NAND",
  NOR: "NOR",
  XNOR: "XNOR",
};

function tokenize(raw: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  const s = raw;
  while (i < s.length) {
    const c = s[i];
    if (/\s/.test(c)) {
      i++;
      continue;
    }
    if (c === "(") {
      tokens.push({ type: "LPAREN" });
      i++;
      continue;
    }
    if (c === ")") {
      tokens.push({ type: "RPAREN" });
      i++;
      continue;
    }
    if (c === "'") {
      tokens.push({ type: "NOT_POSTFIX" });
      i++;
      continue;
    }
    if (c === "!" || c === "~") {
      tokens.push({ type: "NOT_PREFIX" });
      i++;
      continue;
    }
    if (c === "+" || c === "|") {
      tokens.push({ type: "OR" });
      i++;
      continue;
    }
    if (c === "&" || c === "*" || c === "\u00b7") {
      tokens.push({ type: "AND" });
      i++;
      continue;
    }
    if (c === "^") {
      tokens.push({ type: "XOR" });
      i++;
      continue;
    }
    if (c === "0" || c === "1") {
      tokens.push({ type: "CONST", value: c });
      i++;
      continue;
    }
    if (/[A-Za-z]/.test(c)) {
      // Greedily read a word to check against operator keywords; otherwise treat
      // each letter as its own single-letter variable (so "AB" -> A, B).
      let j = i;
      while (j < s.length && /[A-Za-z]/.test(s[j])) j++;
      const word = s.slice(i, j).toUpperCase();
      if (WORD_OPS[word]) {
        tokens.push({ type: WORD_OPS[word] });
        i = j;
        continue;
      }
      // Not a recognized keyword: emit one VAR token per letter (implicit AND).
      for (let k = i; k < j; k++) {
        tokens.push({ type: "VAR", value: s[k].toUpperCase() });
      }
      i = j;
      continue;
    }
    throw new ExprError(`Unexpected character "${c}"`);
  }
  tokens.push({ type: "EOF" });
  return tokens;
}

class Parser {
  private pos = 0;
  constructor(private tokens: Token[]) {}

  private peek(): Token {
    return this.tokens[this.pos];
  }
  private next(): Token {
    return this.tokens[this.pos++];
  }

  parse(): AstNode {
    const node = this.parseOr();
    if (this.peek().type !== "EOF") {
      throw new ExprError("Unexpected token near end of expression");
    }
    return node;
  }

  private parseOr(): AstNode {
    let left = this.parseXor();
    while (this.peek().type === "OR" || this.peek().type === "NOR") {
      const op: Op = this.next().type === "OR" ? "OR" : "NOR";
      const right = this.parseXor();
      left = { kind: "bin", op, left, right };
    }
    return left;
  }

  private parseXor(): AstNode {
    let left = this.parseAnd();
    while (this.peek().type === "XOR" || this.peek().type === "XNOR") {
      const op: Op = this.next().type === "XOR" ? "XOR" : "XNOR";
      const right = this.parseAnd();
      left = { kind: "bin", op, left, right };
    }
    return left;
  }

  private startsUnary(): boolean {
    const t = this.peek().type;
    return t === "VAR" || t === "CONST" || t === "LPAREN" || t === "NOT_PREFIX";
  }

  private parseAnd(): AstNode {
    let left = this.parseUnary();
    for (;;) {
      const t = this.peek().type;
      if (t === "AND" || t === "NAND") {
        const op: Op = this.next().type === "AND" ? "AND" : "NAND";
        const right = this.parseUnary();
        left = { kind: "bin", op, left, right };
      } else if (this.startsUnary()) {
        // Implicit AND via juxtaposition, e.g. "AB" or "A(B+C)".
        const right = this.parseUnary();
        left = { kind: "bin", op: "AND", left, right };
      } else {
        break;
      }
    }
    return left;
  }

  private parseUnary(): AstNode {
    if (this.peek().type === "NOT_PREFIX") {
      this.next();
      const arg = this.parseUnary();
      return this.applyPostfixNot({ kind: "not", arg });
    }
    return this.applyPostfixNot(this.parseAtom());
  }

  private applyPostfixNot(node: AstNode): AstNode {
    let result = node;
    while (this.peek().type === "NOT_POSTFIX") {
      this.next();
      result = { kind: "not", arg: result };
    }
    return result;
  }

  private parseAtom(): AstNode {
    const t = this.peek();
    if (t.type === "VAR") {
      this.next();
      return { kind: "var", name: t.value! };
    }
    if (t.type === "CONST") {
      this.next();
      return { kind: "const", value: t.value === "1" ? 1 : 0 };
    }
    if (t.type === "LPAREN") {
      this.next();
      const inner = this.parseOr();
      if (this.peek().type !== "RPAREN") throw new ExprError("Missing closing parenthesis");
      this.next();
      return inner;
    }
    throw new ExprError("Expected a variable, constant, or parenthesized expression");
  }
}

export function parseExpr(raw: string): AstNode {
  const trimmed = raw.trim();
  if (!trimmed) throw new ExprError("Empty expression");
  const tokens = tokenize(trimmed);
  return new Parser(tokens).parse();
}

/** Collects all distinct variable names in the AST, sorted alphabetically. */
export function collectVars(node: AstNode): string[] {
  const set = new Set<string>();
  (function walk(n: AstNode) {
    if (n.kind === "var") set.add(n.name);
    else if (n.kind === "not") walk(n.arg);
    else if (n.kind === "bin") {
      walk(n.left);
      walk(n.right);
    }
  })(node);
  return Array.from(set).sort();
}

export function evalAst(node: AstNode, assign: Record<string, boolean>): boolean {
  switch (node.kind) {
    case "const":
      return node.value === 1;
    case "var": {
      const v = assign[node.name];
      if (v === undefined) throw new ExprError(`Missing value for variable ${node.name}`);
      return v;
    }
    case "not":
      return !evalAst(node.arg, assign);
    case "bin": {
      const l = evalAst(node.left, assign);
      const r = evalAst(node.right, assign);
      switch (node.op) {
        case "AND":
          return l && r;
        case "OR":
          return l || r;
        case "XOR":
          return l !== r;
        case "NAND":
          return !(l && r);
        case "NOR":
          return !(l || r);
        case "XNOR":
          return l === r;
      }
    }
  }
}

/** Parse + evaluate in one step; never throws — reports errors via `error`. */
export function tryEval(
  raw: string,
  assign: Record<string, boolean>,
): { value: boolean; error: string | null } {
  try {
    const ast = parseExpr(raw);
    return { value: evalAst(ast, assign), error: null };
  } catch (e) {
    return { value: false, error: e instanceof Error ? e.message : "Invalid expression" };
  }
}

/**
 * Renders an AST back into conventional textbook notation:
 * juxtaposition for AND, "+" for OR, and a postfix apostrophe for NOT
 * (e.g. "A'B + AB'C"). NAND/NOR/XOR/XNOR keep their word form since paper
 * notation has no universal symbol for them.
 */
export function toTextbook(node: AstNode): string {
  function needsParens(n: AstNode, parentPrecedence: number): boolean {
    if (n.kind !== "bin") return false;
    return precedence(n.op) < parentPrecedence;
  }
  function precedence(op: Op): number {
    if (op === "OR" || op === "NOR") return 0;
    if (op === "XOR" || op === "XNOR") return 1;
    return 2; // AND / NAND
  }
  function render(n: AstNode): string {
    if (n.kind === "const") return String(n.value);
    if (n.kind === "var") return n.name;
    if (n.kind === "not") {
      const inner = n.arg;
      if (inner.kind === "var" || inner.kind === "const") return `${render(inner)}'`;
      return `(${render(inner)})'`;
    }
    const opSym: Record<Op, string> = { AND: "", OR: " + ", XOR: " \u2295 ", NAND: " NAND ", NOR: " NOR ", XNOR: " XNOR " };
    const lp = precedence(n.op);
    const l = needsParens(n.left, lp) ? `(${render(n.left)})` : render(n.left);
    const r = needsParens(n.right, lp) ? `(${render(n.right)})` : render(n.right);
    return `${l}${opSym[n.op]}${r}`;
  }
  return render(node);
}
