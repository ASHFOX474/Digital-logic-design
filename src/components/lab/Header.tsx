import { Link } from "@tanstack/react-router";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronDown } from "lucide-react";

/* ============================================================================
 * Header — main navigation for Project Logic Lab.
 * "The Lab" -> the Virtual Lab trainer kit. "Analysis Tools" -> mega-menu of
 * standalone tool pages. "Component Library" -> IC reference page.
 * ========================================================================== */

const ANALYSIS_TOOLS = [
  {
    to: "/analysis/truth-table",
    label: "Truth Table Generator",
    hint: "Rows for every input combo",
  },
  {
    to: "/analysis/kmap",
    label: "K-Map Solver",
    hint: "Group prime implicants, supports don't cares",
  },
  {
    to: "/analysis/simplifier",
    label: "Equation Simplifier",
    hint: "Step-by-step Boolean algebra laws",
  },
  { to: "/analysis/sop", label: "Sum of Products (SOP)", hint: "Minterm expansion" },
  { to: "/analysis/pos", label: "Product of Sums (POS)", hint: "Maxterm expansion" },
  {
    to: "/analysis/nand-nor",
    label: "Universal Gate Converter",
    hint: "Rewrite using NAND/NOR only",
  },
  {
    to: "/analysis/tabulation",
    label: "Tabulation Method",
    hint: "Quine-McCluskey step-by-step table",
  },
  { to: "/analysis/visualizer", label: "Circuit Visualizer", hint: "2D logic gate schematic" },
] as const;

export function Header() {
  return (
    <header className="lab-panel relative flex flex-col gap-4 px-6 py-5 md:flex-row md:items-center md:justify-between">
      <div className="lab-scanline" aria-hidden />
      <Link to="/" className="block">
        <p className="text-[10px] tracking-[0.35em] text-[var(--lab-muted)]">
          // MODULE 205/6 · DLD
        </p>
        <h1 className="lab-title mt-1 text-2xl font-bold md:text-3xl">DIGITAL LOGIC DESIGN</h1>
      </Link>
      <nav className="flex flex-wrap items-center gap-2">
        <Link to="/virtual-lab" className="lab-menu-btn" activeProps={{ "data-active": "true" }}>
          THE LAB
        </Link>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="lab-menu-btn inline-flex items-center gap-1">
              ANALYSIS TOOLS
              <ChevronDown className="h-3 w-3" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="start"
            className="w-72 border-[var(--lab-border)] bg-[oklch(0.13_0.03_265/.97)] text-[var(--lab-ink)] shadow-[0_0_28px_oklch(0_0_0/.55)] backdrop-blur-md"
          >
            <DropdownMenuLabel className="font-mono text-[10px] tracking-[0.25em] text-[var(--lab-muted)]">
              TEXT &amp; MATH TOOLS
            </DropdownMenuLabel>
            <DropdownMenuSeparator className="bg-[var(--lab-border)]" />
            {ANALYSIS_TOOLS.map((tool) => (
              <DropdownMenuItem
                key={tool.to}
                asChild
                className="cursor-pointer rounded-md focus:bg-[oklch(0.22_0.08_265/.7)] focus:text-[var(--lab-cyan)] data-[highlighted]:bg-[oklch(0.22_0.08_265/.7)] data-[highlighted]:text-[var(--lab-cyan)]"
              >
                <Link to={tool.to} className="flex flex-col items-start gap-0.5 py-2">
                  <span className="text-sm font-medium text-[var(--lab-ink)]">{tool.label}</span>
                  <span className="text-xs text-[var(--lab-muted)]">{tool.hint}</span>
                </Link>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <Link
          to="/component-library"
          className="lab-menu-btn"
          activeProps={{ "data-active": "true" }}
        >
          COMPONENT LIBRARY
        </Link>
      </nav>
    </header>
  );
}