import { useEffect, useMemo, useRef, useState } from "react";
import { Header } from "./Header";
import { ComponentSidebar, type ToolId } from "./virtual-lab/ComponentSidebar";
import { TrainerKit, type PlacedComponent, type Wire, type WireEndpoint } from "./virtual-lab/TrainerKit";
import type { WireColorId } from "./virtual-lab/componentLibrary";
import { simulate, advanceSequential, type SeqState } from "./virtual-lab/simulate";
import { genId } from "@/lib/utils";

/* ============================================================================
 * VirtualLab — "Project Logic Lab" digital trainer kit.
 *
 * Two-column layout: a fixed-width categorized parts bin on the left, and a
 * full-bleed top-down trainer board on the right (power rails, breadboard,
 * switches, clock, LED readouts). Drag-and-drop + wiring state lives here;
 * TrainerKit / ComponentSidebar are presentational. The actual netlist
 * (which hole is electrically connected to which) is resolved by
 * `simulate()`, so wires here really do carry signal from the input
 * switches, through any gate ICs plugged into the breadboard, out to the
 * output LEDs.
 * ========================================================================== */

export function VirtualLab() {
  const [placedComponents, setPlacedComponents] = useState<PlacedComponent[]>([]);
  const [wires, setWires] = useState<Wire[]>([]);

  const [activeTool, setActiveTool] = useState<ToolId>(null);
  const [wireColor, setWireColor] = useState<WireColorId>("cyan");
  const [wireDraft, setWireDraft] = useState<WireEndpoint | null>(null);

  // Wire editing: a selected wire shows drag handles + a mini toolbar (recolor / delete).
  // endpointEdit tracks "pick up this end, click a hole to drop it there" re-routing.
  const [selectedWireId, setSelectedWireId] = useState<string | null>(null);
  const [endpointEdit, setEndpointEdit] = useState<{ wireId: string; end: "from" | "to" } | null>(null);

  const [inputs, setInputs] = useState<boolean[]>(Array(8).fill(false));
  const [clockOn, setClockOn] = useState(false);

  // Persisted flip-flop / shift-register state, keyed by placed-component id. Only changes when
  // `clockOn` rises from false to true (see the effect below) — that's what makes clocked ICs
  // (D/JK flip-flops, shift registers) behave like real edge-triggered parts instead of
  // recomputing from scratch on every render.
  const [seqState, setSeqState] = useState<SeqState>({});
  const wasClockOn = useRef(false);

  // Part armed for tap-to-place — the touch-friendly alternative to native HTML5 drag-and-drop,
  // which doesn't fire reliably on mobile/tablet browsers. Tap a part in the sidebar to arm it,
  // then tap anywhere on the board to place it there.
  const [armedPartId, setArmedPartId] = useState<string | null>(null);

  const outputs = useMemo(
    () => simulate(placedComponents, wires, inputs, clockOn, seqState),
    [placedComponents, wires, inputs, clockOn, seqState],
  );

  // Advance every sequential IC exactly once per clock rising edge.
  useEffect(() => {
    if (clockOn && !wasClockOn.current) {
      setSeqState((prev) => advanceSequential(placedComponents, wires, inputs, prev));
    }
    wasClockOn.current = clockOn;
  }, [clockOn, placedComponents, wires, inputs]);

  const handleDropPart = (defId: string, x: number, y: number) => {
    setPlacedComponents((prev) => [...prev, { id: genId(), defId, x, y }]);
    setArmedPartId(null);
  };

  const handleMoveComponent = (id: string, x: number, y: number) => {
    setPlacedComponents((prev) => prev.map((c) => (c.id === id ? { ...c, x, y } : c)));
  };

  const handleRemoveComponent = (id: string) => {
    setPlacedComponents((prev) => prev.filter((c) => c.id !== id));
    setSeqState((prev) => {
      if (!(id in prev)) return prev;
      const next = { ...prev };
      delete next[id];
      return next;
    });
  };

  const handleRemoveWire = (id: string) => {
    setWires((prev) => prev.filter((w) => w.id !== id));
    setSelectedWireId((prev) => (prev === id ? null : prev));
    setEndpointEdit((prev) => (prev?.wireId === id ? null : prev));
  };

  const handleHoleClick = (key: string, x: number, y: number) => {
    // If the user picked up an existing wire's endpoint, this hole click drops it here
    // instead of starting a brand-new wire.
    if (endpointEdit) {
      setWires((prev) =>
        prev.map((w) => (w.id === endpointEdit.wireId ? { ...w, [endpointEdit.end]: { key, x, y } } : w)),
      );
      setEndpointEdit(null);
      return;
    }
    if (activeTool !== "wire") return;
    if (!wireDraft) {
      setWireDraft({ key, x, y });
      return;
    }
    if (wireDraft.key === key && wireDraft.x === x && wireDraft.y === y) {
      setWireDraft(null);
      return;
    }
    setWires((prev) => [...prev, { id: genId(), from: wireDraft, to: { key, x, y }, color: wireColor }]);
    setWireDraft(null);
  };

  const handleSelectTool = (tool: ToolId) => {
    setActiveTool(tool);
    setArmedPartId(null);
    setWireDraft(null);
    setSelectedWireId(null);
    setEndpointEdit(null);
  };

  const handleSelectWire = (id: string | null) => {
    setSelectedWireId(id);
    setEndpointEdit(null);
  };

  const handleStartEndpointEdit = (wireId: string, end: "from" | "to") => {
    setEndpointEdit({ wireId, end });
  };

  const handleChangeWireColor = (id: string, color: WireColorId) => {
    setWires((prev) => prev.map((w) => (w.id === id ? { ...w, color } : w)));
  };

  // Escape cancels whatever "in progress" wiring action is active, without touching placed wires.
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      setWireDraft(null);
      setSelectedWireId(null);
      setEndpointEdit(null);
      setArmedPartId(null);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const handleToggleInput = (i: number) => {
    setInputs((prev) => prev.map((v, idx) => (idx === i ? !v : v)));
  };

  const handleClearBoard = () => {
    setPlacedComponents([]);
    setWires([]);
    setActiveTool(null);
    setArmedPartId(null);
    setWireColor("cyan");
    setWireDraft(null);
    setSelectedWireId(null);
    setEndpointEdit(null);
    setInputs(Array(8).fill(false));
    setClockOn(false);
    setSeqState({});
    wasClockOn.current = false;
  };

  return (
    <main className="lab-desk relative min-h-screen overflow-hidden text-[var(--lab-ink)]">
      <div className="lab-circuit-bg absolute inset-0 opacity-60" aria-hidden />
      <div className="pointer-events-none absolute -left-32 top-20 h-96 w-96 rounded-full bg-[oklch(0.55_0.20_305/0.25)] blur-3xl" aria-hidden />
      <div className="pointer-events-none absolute -right-24 bottom-10 h-80 w-80 rounded-full bg-[oklch(0.60_0.18_200/0.22)] blur-3xl" aria-hidden />

      <div className="relative mx-auto flex min-h-screen max-w-[1960px] flex-col px-3 py-4 sm:px-6 sm:py-6">
        <Header />

        {/*
          IMPORTANT: the md/lg column templates below use `minmax(0, 1fr)` rather than a bare
          `1fr`. Tailwind's own `grid-cols-N` utilities compile to `repeat(N, minmax(0, 1fr))`,
          but a literal arbitrary-value track like `1fr` has an implicit minimum width equal to
          the min-content size of whatever is placed in it. TrainerKit's breadboard SVG carries
          a hard `min-w-[900px]`, so without `minmax(0, ...)` that 900px floor propagates up into
          this grid track, the row overflows past the viewport at md/lg widths, and — because the
          outer <main> above has `overflow-hidden` — that overflow was silently clipped instead of
          being scrollable. `minmax(0, 1fr)` lets the track shrink to the available space and lets
          TrainerKit's own internal `overflow-auto` wrapper handle horizontal scrolling instead.
        */}
        <div className="mt-4 grid min-h-0 flex-1 grid-cols-1 gap-4 sm:mt-6 sm:gap-6 md:grid-cols-[260px_minmax(0,1fr)] lg:grid-cols-[300px_minmax(0,1fr)]">
          <div className="h-[380px] min-w-0 md:h-[calc(100vh-170px)] lg:h-[calc(100vh-140px)]">
            <ComponentSidebar
              activeTool={activeTool}
              onSelectTool={handleSelectTool}
              wireColor={wireColor}
              onWireColorChange={setWireColor}
              armedPartId={armedPartId}
              onArmPart={setArmedPartId}
            />
          </div>

          <div className="h-[75vh] min-h-[460px] min-w-0 md:h-[calc(100vh-170px)] lg:h-[calc(100vh-140px)]">
            <TrainerKit
              armedPartId={armedPartId}
              placedComponents={placedComponents}
              wires={wires}
              activeTool={activeTool}
              wireColor={wireColor}
              wireDraft={wireDraft}
              selectedWireId={selectedWireId}
              endpointEdit={endpointEdit}
              inputs={inputs}
              outputs={outputs}
              clockOn={clockOn}
              onDropPart={handleDropPart}
              onHoleClick={handleHoleClick}
              onRemoveComponent={handleRemoveComponent}
              onRemoveWire={handleRemoveWire}
              onMoveComponent={handleMoveComponent}
              onSelectWire={handleSelectWire}
              onStartEndpointEdit={handleStartEndpointEdit}
              onChangeWireColor={handleChangeWireColor}
              onToggleInput={handleToggleInput}
              onToggleClock={() => setClockOn((v) => !v)}
              onClearBoard={handleClearBoard}
            />
          </div>
        </div>
      </div>
    </main>
  );
}