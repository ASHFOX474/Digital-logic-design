# Digital Logic Design

An interactive, in-browser digital logic lab — build circuits on a virtual breadboard, analyze Boolean expressions, and look up IC datasheets, all wrapped in a dark, retro-futuristic "circuit lab" theme.

Built for learning and teaching **Digital Logic Design** (Boolean algebra, Karnaugh maps, combinational/sequential ICs) without needing physical hardware.

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
- **Gate ICs** — 7408 (AND), 7432 (OR), 7404 (NOT), 7400 (NAND), 7402 (NOR), 7486 (XOR)
- **Arithmetic** — 7483 (4-bit adder)
- **Decoders / Multiplexers** — 74154, 7447 (BCD-to-7-segment), 4x1 / 8x1 / 16x1 MUX
- **Sequential Logic** — JK and D flip-flops
- **Registers** — 7491A (shift register), 74164
- **Tools** — wire spool, IC extractor

Tap any part to open its real DIP pin diagram, and for simple gate ICs, flip to a second tab showing an internal schematic of how the gates inside the package wire up to its pins (labeled with both DIP pin numbers and standard datasheet letters like A, B, Y).

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
A calmer landing page combining a simplifier, truth table, K-map, tabulation panel, and an animated breadboard illustration into one "magical" pure-SVG/CSS scene — no external image assets.

## 🛠️ Tech Stack

- **[React 19](https://react.dev/)** + **TypeScript**
- **[TanStack Start](https://tanstack.com/start)** with **TanStack Router** (file-based routing) and **TanStack Query**
- **[Vite](https://vitejs.dev/)** for dev/build tooling
- **[Tailwind CSS v4](https://tailwindcss.com/)** with a custom dark "lab" theme built on `oklch()` color tokens (`--lab-cyan`, `--lab-pink`, `--lab-mint`, etc.)
- **[shadcn/ui](https://ui.shadcn.com/)** components (Radix UI primitives), restyled to match the lab theme
- **[Nitro](https://nitro.build/)** for the server, targeting a **Cloudflare Workers** deployment preset
- Package management via **[Bun](https://bun.sh/)** (npm also works — both lockfiles are present)

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

Then open the printed local URL (typically `http://localhost:3000`) in your browser.

### Other scripts

```bash
npm run build       # Production build (also sets the Cloudflare Worker name)
npm run build:dev    # Development-mode build
npm run preview      # Preview a production build locally
npm run lint         # Run ESLint
npm run format       # Format the codebase with Prettier
```

## 📝 Notes

- Routes are file-based via TanStack Start — see `src/routes/README.md` for the routing conventions used in this project. `src/routeTree.gen.ts` is auto-generated; don't edit it by hand.
- The color system uses CSS custom properties in `oklch()` format rather than a `.dark` class toggle, so shadcn/ui components are restyled directly at their call sites to match the lab theme.
