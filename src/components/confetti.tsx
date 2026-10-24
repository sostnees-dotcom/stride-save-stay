import type { CSSProperties } from "react";

/**
 * A one-shot confetti burst. It fills its nearest positioned ancestor, so wrap it
 * in a `relative` or `fixed` container. Positions are deterministic (no randomness).
 */
export function Confetti({ count = 18 }: { count?: number }) {
  return (
    <>
      {Array.from({ length: count }, (_, i) => {
        const angle = (i / count) * Math.PI * 2;
        const dist = 110 + (i % 4) * 36;
        const style = {
          "--x": `${Math.round(Math.cos(angle) * dist)}px`,
          "--y": `${Math.round(Math.sin(angle) * dist - 40)}px`,
          "--r": `${(i % 2 ? 1 : -1) * (120 + i * 25)}deg`,
          background: i % 2 ? "var(--accent)" : "var(--primary)",
          animationDelay: `${(i % 5) * 40}ms`,
        } as CSSProperties;
        return <span key={i} aria-hidden="true" className="confetti" style={style} />;
      })}
    </>
  );
}
