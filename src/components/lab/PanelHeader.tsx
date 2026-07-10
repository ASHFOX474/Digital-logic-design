export function PanelHeader({
  eyebrow,
  title,
  accent,
}: {
  eyebrow: string;
  title: string;
  accent: string;
}) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <p className="text-[9px] tracking-[0.35em] text-[var(--lab-muted)]">{eyebrow}</p>
        <h2 className="mt-0.5 font-mono text-[13px] tracking-[0.3em]" style={{ color: accent }}>
          {title}
        </h2>
      </div>
    </div>
  );
}
