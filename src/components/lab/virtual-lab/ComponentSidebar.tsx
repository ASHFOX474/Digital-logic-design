import { useState, type DragEvent } from "react";
import { COMPONENT_LIBRARY, WIRE_COLORS, type PartDef, type WireColorId } from "./componentLibrary";
import { PartIcon } from "./PartIcon";

/* ============================================================================
 * ComponentSidebar — categorized, scrollable parts bin for the Virtual Lab.
 * Gates/ICs are HTML5 drag sources (dropped onto <TrainerKit />'s breadboard);
 * the two Tools entries instead just arm a mode ("wire" | "extractor") on the
 * trainer kit, since they act on the board rather than getting placed on it.
 * ========================================================================== */

export type ToolId = "wire" | "extractor" | null;

interface ComponentSidebarProps {
  activeTool: ToolId;
  onSelectTool: (tool: ToolId) => void;
  wireColor: WireColorId;
  onWireColorChange: (c: WireColorId) => void;
  /** Part armed for tap-to-place — the touch-friendly alternative to dragging, since
   *  native HTML5 drag-and-drop doesn't fire on most mobile browsers. */
  armedPartId?: string | null;
  onArmPart?: (partId: string | null) => void;
}

export function ComponentSidebar({
  activeTool,
  onSelectTool,
  wireColor,
  onWireColorChange,
  armedPartId = null,
  onArmPart,
}: ComponentSidebarProps) {
  const [openCategories, setOpenCategories] = useState<string[]>(["gate-ics", "tools"]);

  const toggleCategory = (id: string) =>
    setOpenCategories((prev) => (prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]));

  const handleDragStart = (e: DragEvent, part: PartDef) => {
    e.dataTransfer.setData("application/x-lab-part", part.id);
    e.dataTransfer.effectAllowed = "copy";
  };

  const handleToolClick = (part: PartDef) => {
    onArmPart?.(null);
    if (part.shape === "tool-wire") onSelectTool(activeTool === "wire" ? null : "wire");
    if (part.shape === "tool-extractor") onSelectTool(activeTool === "extractor" ? null : "extractor");
  };

  const handlePartTap = (part: PartDef) => {
    onSelectTool(null);
    onArmPart?.(armedPartId === part.id ? null : part.id);
  };

  return (
    <aside className="lab-panel relative flex h-full w-full flex-col overflow-hidden">
      <div className="lab-scanline" aria-hidden />
      <div className="border-b border-[var(--lab-border)] px-4 py-4">
        <p className="text-[10px] tracking-[0.35em] text-[var(--lab-muted)]">◆ PARTS BIN</p>
        <h2 className="lab-title mt-1 text-base font-bold tracking-[0.12em]">COMPONENT LIBRARY</h2>
        <p className="mt-1 text-[11px] text-[var(--lab-muted)]">Drag a part onto the breadboard, or tap it then tap the board.</p>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3">
        {COMPONENT_LIBRARY.map((cat) => {
          const isOpen = openCategories.includes(cat.id);
          return (
            <div key={cat.id} className="mb-2 rounded-lg border border-[var(--lab-border)] bg-[oklch(0.15_0.04_265/.55)]">
              <button
                type="button"
                onClick={() => toggleCategory(cat.id)}
                className="flex w-full items-center justify-between px-3 py-2.5 text-left"
              >
                <span className="font-mono text-[11px] font-semibold tracking-[0.2em] text-[var(--lab-cyan)]">
                  {cat.label.toUpperCase()}
                </span>
                <span
                  className="font-mono text-[10px] text-[var(--lab-muted)] transition-transform duration-300"
                  style={{ transform: isOpen ? "rotate(180deg)" : "rotate(0deg)" }}
                >
                  ▾
                </span>
              </button>

              {isOpen && (
                <ul className="flex flex-col gap-1 px-2 pb-2">
                  {cat.parts.map((part) => {
                    const isTool = part.shape === "tool-wire" || part.shape === "tool-extractor";
                    const isActiveTool =
                      (part.shape === "tool-wire" && activeTool === "wire") ||
                      (part.shape === "tool-extractor" && activeTool === "extractor");
                    const isArmed = !isTool && armedPartId === part.id;
                    return (
                      <li key={part.id} className="relative">
                        <div
                          draggable={!isTool}
                          onDragStart={(e) => handleDragStart(e, part)}
                          onClick={() => (isTool ? handleToolClick(part) : handlePartTap(part))}
                          className="group flex cursor-grab items-center gap-2.5 rounded-md border px-2 py-1.5 transition active:cursor-grabbing"
                          style={{
                            borderColor: isActiveTool || isArmed ? "var(--lab-cyan)" : "transparent",
                            background: isActiveTool || isArmed ? "oklch(0.86 0.16 200 / 0.14)" : "transparent",
                            boxShadow: isActiveTool || isArmed ? "var(--glow-cyan)" : "none",
                          }}
                        >
                          <span
                            className="flex h-7 w-9 shrink-0 items-center justify-center rounded border border-[var(--lab-border)] bg-[oklch(0.10_0.03_260/.7)] text-[var(--lab-cyan)] transition group-hover:border-[var(--lab-cyan)] group-hover:shadow-[var(--glow-cyan)]"
                          >
                            <PartIcon shape={part.shape} className="h-4 w-6" />
                          </span>
                          <span className="flex min-w-0 flex-col">
                            <span className="truncate text-xs font-medium text-[var(--lab-ink)]">{part.label}</span>
                            <span className="truncate font-mono text-[9px] tracking-[0.15em] text-[var(--lab-muted)]">
                              {part.code}
                              {part.pins > 0 ? ` · ${part.pins}-PIN` : ""}
                            </span>
                          </span>
                        </div>

                        {/* Wire spool color swatches, shown inline once armed */}
                        {part.shape === "tool-wire" && isActiveTool && (
                          <div className="mt-1 flex flex-wrap items-center gap-2 px-2 pb-1.5">
                            {WIRE_COLORS.map((c) => (
                              <button
                                key={c.id}
                                type="button"
                                onClick={() => onWireColorChange(c.id)}
                                aria-label={`${c.id} wire`}
                                title={c.id}
                                className="h-4 w-4 rounded-full border transition"
                                style={{
                                  background: c.swatch,
                                  borderColor: wireColor === c.id ? "var(--lab-ink)" : "transparent",
                                  boxShadow: wireColor === c.id ? `0 0 8px ${c.swatch}` : "none",
                                }}
                              />
                            ))}
                          </div>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          );
        })}
      </div>

      <div className="border-t border-[var(--lab-border)] px-4 py-3">
        <p className="font-mono text-[9px] tracking-[0.2em] text-[var(--lab-muted)]">
          {activeTool === "wire" && "WIRE SPOOL ARMED · click two holes"}
          {activeTool === "extractor" && "EXTRACTOR ARMED · click a part or wire"}
          {!activeTool && armedPartId && "PART ARMED · tap the board to place it"}
          {!activeTool && !armedPartId && "DRAG A PART, OR TAP IT THEN TAP THE BOARD"}
        </p>
      </div>
    </aside>
  );
}