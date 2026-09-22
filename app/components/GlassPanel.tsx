import type { ReactNode } from "react";

export function GlassPanel({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`group relative rounded-2xl border border-white/15 bg-white/5 shadow-lg shadow-black/10 transition-all duration-300 ease-out hover:-translate-y-0.5 hover:border-white/25 hover:shadow-[0_0_50px_-12px_var(--accent)] ${className}`}
    >
      {/* Top sheen — sells the glass, stays fixed regardless of hover */}
      <div className="pointer-events-none absolute inset-0 rounded-2xl bg-gradient-to-b from-white/10 via-transparent to-transparent" />

      {/* Glow ring, hidden until hover */}
      <div className="pointer-events-none absolute inset-0 rounded-2xl opacity-0 ring-1 ring-inset ring-(--accent)/50 transition-opacity duration-300 group-hover:opacity-100" />

      <div className="relative">{children}</div>
    </div>
  );
}
