<p align="center">
  <img src="./banner.svg" alt="Digital Logic Design banner" width="100%" />
</p>

<p align="center">
  <a href="https://digital-logic-design.ashfox.workers.dev/"><img alt="Live Demo" src="https://img.shields.io/badge/live_demo-visit_site-22d3ee?style=for-the-badge&logo=cloudflare&logoColor=white&labelColor=14112a"></a>
</p>

<p align="center">
  <img alt="React" src="https://img.shields.io/badge/React_19-14112a?style=flat-square&logo=react&logoColor=61DAFB">
  <img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-14112a?style=flat-square&logo=typescript&logoColor=3178C6">
  <img alt="TanStack" src="https://img.shields.io/badge/TanStack_Start-14112a?style=flat-square&logo=tanstack&logoColor=FF4154">
  <img alt="Vite" src="https://img.shields.io/badge/Vite-14112a?style=flat-square&logo=vite&logoColor=B73BFE">
  <img alt="Tailwind CSS" src="https://img.shields.io/badge/Tailwind_CSS_v4-14112a?style=flat-square&logo=tailwindcss&logoColor=38BDF8">
  <img alt="Cloudflare Workers" src="https://img.shields.io/badge/Cloudflare_Workers-14112a?style=flat-square&logo=cloudflareworkers&logoColor=F38020">
  <img alt="Bun" src="https://img.shields.io/badge/Bun-14112a?style=flat-square&logo=bun&logoColor=FBF0DF">
</p>

<p align="center">
  An interactive, in-browser digital logic lab — build circuits on a virtual breadboard, analyze Boolean expressions, and look up IC datasheets, all wrapped in a dark, retro-futuristic circuit-lab theme.
</p>

<p align="center">
  <b>🔗 Live app: <a href="https://digital-logic-design.ashfox.workers.dev/">digital-logic-design.ashfox.workers.dev</a></b>
</p>

---

## 📖 Table of Contents

- [Live Demo](#-live-demo)
- [Features](#-features)
  - [Virtual Lab (Trainer Kit)](#-virtual-lab-trainer-kit)
  - [Component Library](#-component-library)
  - [Analysis Tools](#-analysis-tools)
  - [Home Diorama](#-home-diorama)
- [Boolean Algebra Reference](#-boolean-algebra-reference)
- [Tech Stack](#️-tech-stack)
- [Project Structure](#-project-structure)
- [Getting Started](#-getting-started)
- [Notes](#-notes)

---

## 🌐 Live Demo

The project is deployed on Cloudflare Workers and publicly available at:

### 👉 **[digital-logic-design.ashfox.workers.dev](https://digital-logic-design.ashfox.workers.dev/)**

No installation needed — open the link and start wiring circuits, generating truth tables, or browsing the IC library right in your browser, on desktop or mobile.

---

## ✨ Features

### 🔧 Virtual Lab (Trainer Kit)

A fully interactive virtual breadboard where you can:

- Drag and drop logic gate ICs, arithmetic chips, decoders/multiplexers, flip-flops, and registers onto a breadboard
- Wire components together by dragging between pins, with animated signal particles that flow along the wires so you can see logic levels propagate
- Re-route existing wires by dragging their endpoints
- Works on both desktop (drag-and-drop) and mobile/touch (tap-to-place, touch-friendly wiring)
- Clear the board and start over with one click

### 📚 Component Library

A datasheet-style reference for every part available in the Virtual Lab, grouped by category:

| Category | Parts |
| --- | --- |
| **Gate ICs** | 7408 (AND), 7432 (OR), 7404 (NOT), 7400 (NAND), 7402 (NOR), 7486 (XOR) |
| **Arithmetic** | 7483 (4-bit adder) |
| **Decoders / Multiplexers** | 74154, 7447 (BCD-to-7-segment), 4×1 / 8×1 / 16×1 MUX |
| **Sequential Logic** | JK and D flip-flops |
| **Registers** | 7491A (shift register), 74164 |
| **Tools** | Wire spool, IC extractor |

Tap any part to open its real DIP pin diagram, and for simple gate ICs, flip to a second tab showing an internal schematic of how the gates inside the package wire up to its pins — labeled with both DIP pin numbers and standard datasheet letters (A, B, Y, …).

### 🧮 Analysis Tools

A suite of standalone Boolean algebra tools, all accepting expressions typed in plain text (e.g. `AB'C' + BC`, `P NAND Q`, `X XOR Y XOR Z`):

| Tool | What it does |
| --- | --- |
| **Truth Table Generator** | Builds the full truth table for any expression |
| **K-Map Solver** | Plots a Karnaugh map for 2–6 variables, groups prime implicants, supports don't-cares, and walks through the grouping step by step |
| **Equation Simplifier** | Minimizes an expression to its simplest Sum-of-Products form using the Quine–McCluskey method |
| **Tabulation Method** | Shows the full Quine–McCluskey tabulation table, round by round |
| **Sum of Products (SOP)** | Expands an expression into canonical SOP (minterms) |
| **Product of Sums (POS)** | Expands an expression into canonical POS (maxterms) |
| **Universal Gate Converter** | Rewrites an expression using only NAND or only NOR gates |
| **Circuit Visualizer** | Renders a 2D logic gate schematic diagram for an expression |

Expressions support letter variables (any letter, not just A–D), `+` for OR, juxtaposition for AND, `'` for NOT, and word operators `AND / OR / NOT / NAND / NOR / XOR / XNOR`.

### 🏠 Home Diorama

A calmer landing page combining a simplifier, truth table, K-map, tabulation panel, and an animated breadboard illustration into one pure-SVG/CSS scene — no external image assets.

---

## 📐 Boolean Algebra Reference

A quick reference for the math behind the Analysis Tools — rendered natively as LaTeX for easy scanning.

**Canonical Sum of Products (SOP)** — one minterm per row where the output is 1:

$$F(A, B, C) = \sum m(1, 3, 5, 6, 7) = A'B'C + A'BC + AB'C + ABC' + ABC$$

**Canonical Product of Sums (POS)** — one maxterm per row where the output is 0:

$$F(A, B, C) = \prod M(0, 2, 4) = (A + B + C)(A + B' + C)(A' + B + C)$$

**De Morgan's Theorems** — the basis for the Universal Gate Converter:

$$\overline{A \cdot B} = \overline{A} + \overline{B} \qquad\qquad \overline{A + B} = \overline{A} \cdot \overline{B}$$

**Quine–McCluskey combining rule** — two minterms differing in exactly one bit position combine into a smaller implicant:

$$AB'C\ (101) \;+\; ABC\ (111) \;=\; AC\ (1{-}1)$$

**XOR / XNOR**, used throughout the Truth Table and Circuit Visualizer tools:

$$A \oplus B = AB' + A'B \qquad\qquad \overline{A \oplus B} = AB + A'B'$$

---

## 🛠️ Tech Stack

- **[React 19](https://react.dev/)** + **TypeScript**
- **[TanStack Start](https://tanstack.com/start)** with **TanStack Router** (file-based routing) and **TanStack Query**
- **[Vite](https://vitejs.dev/)** for dev/build tooling
- **[Tailwind CSS v4](https://tailwindcss.com/)** with a custom dark "lab" theme built on `oklch()` color tokens (`--lab-cyan`, `--lab-pink`, `--lab-mint`, etc.)
- **[shadcn/ui](https://ui.shadcn.com/)** components (Radix UI primitives), restyled to match the lab theme
- **[Nitro](https://nitro.build/)** for the server, deployed to **Cloudflare Workers**
- Package management via **[Bun](https://bun.sh/)** (npm also works — both lockfiles are present)

---

## 📁 Project Structure

```
src/
├── routes/                      # File-based routes (TanStack Router)
│   ├── index.tsx                 # Home diorama
│   ├── virtual-lab.tsx           # Virtual Lab trainer kit page
│   ├── component-library.tsx     # IC datasheet reference
│   └── analysis.*.tsx            # Individual analysis tool pages
├── components/
│   ├── lab/                      # Home-page widgets (Breadboard, KMap, TruthTable, ...)
│   │   └── virtual-lab/          # Trainer Kit: TrainerKit, ComponentSidebar,
│   │                              # componentLibrary (parts catalogue), simulate.ts
│   └── ui/                       # shadcn/ui components
├── lib/
│   └── logic/                    # Core Boolean-logic engine
│       ├── parser.ts              # Expression parser / AST / textbook formatting
│       ├── qm.ts                  # Quine–McCluskey minimization
│       ├── simplify.ts            # Step-by-step algebraic simplification
│       ├── truthtable.ts          # Truth table construction, minterms/maxterms
│       └── kmapGeometry.ts        # K-map cell layout & prime-implicant loop drawing
└── styles.css                    # Tailwind + lab theme tokens
```

---

## 🚀 Getting Started

**Prerequisites:** [Bun](https://bun.sh/) (recommended) or Node.js + npm.

```bash
# Install dependencies
bun install
# or: npm install

# Start the dev server
bun dev
# or: npm run dev
```

Then open the printed local URL (typically `http://localhost:3000`) in your browser — or skip local setup entirely and use the [live deployment](https://digital-logic-design.ashfox.workers.dev/).

### Other scripts

```bash
npm run build       # Production build (also sets the Cloudflare Worker name)
npm run build:dev    # Development-mode build
npm run preview      # Preview a production build locally
npm run lint         # Run ESLint
npm run format       # Format the codebase with Prettier
```

---

## 📝 Notes

- Routes are file-based via TanStack Start — see `src/routes/README.md` for the routing conventions used in this project. `src/routeTree.gen.ts` is auto-generated; don't edit it by hand.
- The color system uses CSS custom properties in `oklch()` format rather than a `.dark` class toggle, so shadcn/ui components are restyled directly at their call sites to match the lab theme.
- The Boolean Algebra Reference above renders as math on platforms that support GitHub-flavored LaTeX (`$$...$$`); if viewed somewhere that doesn't render math, the raw LaTeX source is still readable as plain text.

<p align="center">
  <sub>Built for exploring Digital Logic Design — no breadboard required.</sub>
</p>