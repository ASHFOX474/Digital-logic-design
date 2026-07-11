import { useEffect, useMemo, useState } from "react";
import { Header } from "./Header";
import { ComponentSidebar, type ToolId } from "./virtual-lab/ComponentSidebar";
import { TrainerKit, type PlacedComponent, type Wire, type WireEndpoint } from "./virtual-lab/TrainerKit";
import type { WireColorId } from "./virtual-lab/componentLibrary";
import { simulate } from "./virtual-lab/simulate";

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

  const outputs = useMemo(
    () => simulate(placedComponents, wires, inputs, clockOn),
    [placedComponents, wires, inputs, clockOn],
  );

  const handleDropPart = (defId: string, x: number, y: number) => {
    setPlacedComponents((prev) => [...prev, { id: crypto.randomUUID(), defId, x, y }]);
  };

  const handleMoveComponent = (id: string, x: number, y: number) => {
    setPlacedComponents((prev) => prev.map((c) => (c.id === id ? { ...c, x, y } : c)));
  };

  const handleRemoveComponent = (id: string) => {
    setPlacedComponents((prev) => prev.filter((c) => c.id !== id));
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
    setWires((prev) => [...prev, { id: crypto.randomUUID(), from: wireDraft, to: { key, x, y }, color: wireColor }]);
    setWireDraft(null);
  };

  const handleSelectTool = (tool: ToolId) => {
    setActiveTool(tool);
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
    setWireColor("cyan");
    setWireDraft(null);
    setSelectedWireId(null);
    setEndpointEdit(null);
    setInputs(Array(8).fill(false));
    setClockOn(false);
  };

  return (
    <main className="lab-desk relative min-h-screen overflow-hidden text-[var(--lab-ink)]">
      <div className="lab-circuit-bg absolute inset-0 opacity-60" aria-hidden />
      <div className="pointer-events-none absolute -left-32 top-20 h-96 w-96 rounded-full bg-[oklch(0.55_0.20_305/0.25)] blur-3xl" aria-hidden />
      <div className="pointer-events-none absolute -right-24 bottom-10 h-80 w-80 rounded-full bg-[oklch(0.60_0.18_200/0.22)] blur-3xl" aria-hidden />

      <div className="relative mx-auto flex min-h-screen max-w-[1800px] flex-col px-6 py-6">
        <Header />

        <div className="mt-6 grid min-h-0 flex-1 grid-cols-1 gap-6 lg:grid-cols-[300px_1fr]">
          <div className="lg:h-[calc(100vh-180px)]">
            <ComponentSidebar
              activeTool={activeTool}
              onSelectTool={handleSelectTool}
              wireColor={wireColor}
              onWireColorChange={setWireColor}
            />
          </div>

          <div className="lg:h-[calc(100vh-180px)]">
            <TrainerKit
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
