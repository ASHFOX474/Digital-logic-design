import type { ReactElement } from "react";
import type { PartShape } from "./componentLibrary";

/* ============================================================================
 * PartIcon — small pure-SVG glyph for each IC/tool shape. Used both as the
 * 28x22 sidebar thumbnail and (scaled up) as the placed-component footprint
 * on the breadboard itself.
 * ========================================================================== */

const STROKE = "currentColor";

function Chip() {
  return (
    <g stroke={STROKE} strokeWidth="1.4" fill="none">
      <rect x="6" y="3" width="18" height="16" rx="1.5" />
      <path d="M12 3 A2.4 2.4 0 0 1 16.8 3" />
      {[6, 10, 14, 18].map((y) => (
        <path key={`l${y}`} d={`M2 ${y} L6 ${y}`} />
      ))}
      {[6, 10, 14, 18].map((y) => (
        <path key={`r${y}`} d={`M24 ${y} L28 ${y}`} />
      ))}
    </g>
  );
}
function Mux() {
  return (
    <path
      d="M8 2 L20 6 L20 16 L8 20 Z M0 6 L8 6 M0 10 L8 10 M0 14 L8 14 M20 11 L28 11"
      fill="none"
      stroke={STROKE}
      strokeWidth="1.6"
      strokeLinejoin="round"
    />
  );
}
function FlipFlop() {
  return (
    <g stroke={STROKE} strokeWidth="1.4" fill="none">
      <rect x="6" y="2" width="16" height="18" rx="1.5" />
      <path d="M6 8 L10 10 L6 12" />
      <text x="14" y="14" fontSize="7" stroke="none" fill={STROKE} textAnchor="middle" fontFamily="ui-monospace, monospace">
        FF
      </text>
      <path d="M0 6 L6 6 M0 16 L6 16 M22 6 L28 6 M22 16 L28 16" />
    </g>
  );
}
function ToolWire() {
  return (
    <g stroke={STROKE} strokeWidth="1.6" fill="none" strokeLinecap="round">
      <circle cx="14" cy="11" r="9" />
      <path d="M14 11 m-5 0 a5 5 0 1 1 10 0" strokeDasharray="2.5 2.5" />
      <circle cx="14" cy="11" r="2" fill={STROKE} stroke="none" />
    </g>
  );
}
function ToolExtractor() {
  return (
    <g stroke={STROKE} strokeWidth="1.6" fill="none" strokeLinecap="round">
      <path d="M6 4 L22 18 M22 4 L6 18" />
      <rect x="4" y="2" width="20" height="18" rx="3" strokeDasharray="1 3" opacity="0.5" />
    </g>
  );
}

const RENDERERS: Record<PartShape, () => ReactElement> = {
  chip: Chip,
  mux: Mux,
  ff: FlipFlop,
  "tool-wire": ToolWire,
  "tool-extractor": ToolExtractor,
};

export function PartIcon({ shape, className }: { shape: PartShape; className?: string }) {
  const Renderer = RENDERERS[shape];
  return (
    <svg viewBox="0 0 28 22" className={className} aria-hidden>
      <Renderer />
    </svg>
  );
}
