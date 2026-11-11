import { Link, useRouterState } from "@tanstack/react-router";
import { BarChart3, CalendarDays, SlidersHorizontal, type LucideIcon } from "lucide-react";

const items: {
  to: "/app" | "/historico" | "/configuracoes";
  label: string;
  icon: LucideIcon;
}[] = [
  { to: "/app", label: "Metas", icon: CalendarDays },
  { to: "/historico", label: "Histórico", icon: BarChart3 },
  { to: "/configuracoes", label: "Ajustes", icon: SlidersHorizontal },
];

/** Thumb-friendly navigation for the installed app and narrow browser screens. */
export function AppNavigation() {
  const pathname = useRouterState({ select: (state) => state.location.pathname });

  return (
    <nav
      aria-label="Navegação principal"
      className="app-bottom-nav glass shadow-card fixed inset-x-3 z-50 mx-auto grid max-w-md grid-cols-3 rounded-2xl border border-border p-1.5 md:hidden"
    >
      {items.map(({ to, label, icon: Icon }) => {
        const active = pathname === to;
        return (
          <Link
            key={to}
            to={to}
            aria-current={active ? "page" : undefined}
            className={`flex min-h-14 flex-col items-center justify-center gap-1 rounded-xl px-2 text-[0.6875rem] font-bold transition-colors ${
              active
                ? "bg-secondary text-primary"
                : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground"
            }`}
          >
            <Icon className="size-5" strokeWidth={active ? 2.5 : 2} aria-hidden="true" />
            <span>{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
