import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { ArrowRight, CalendarCheck2, ShieldCheck, Target, TrendingUp } from "lucide-react";

import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Minha Meta Mensal — Desafio de 30 dias" },
      {
        name: "description",
        content:
          "Defina sua meta, marque cada depósito e acompanhe seu progresso mês a mês, com segurança.",
      },
      { property: "og:title", content: "Minha Meta Mensal" },
      {
        property: "og:description",
        content: "Desafio mensal para guardar dinheiro e acompanhar seu progresso.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Landing,
});

function Landing() {
  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) void navigate({ to: "/app", replace: true });
    }).catch(() => {});
  }, [navigate]);

  return (
    <div className="bg-page flex min-h-screen flex-col px-4 py-6 font-sans text-foreground sm:px-8">
      <header className="mx-auto flex w-full max-w-5xl items-center justify-between border-b border-border pb-5">
        <div className="flex items-center gap-2 text-primary">
          <Target className="size-5" strokeWidth={2.5} />
          <span className="label-caps">Minha Meta Mensal</span>
        </div>
        <Link to="/auth">
          <Button variant="outline" className="border-border bg-card font-semibold">
            Entrar
          </Button>
        </Link>
      </header>

      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col justify-center py-16">
        <p className="label-caps text-primary">Desafio de economia mensal</p>
        <h1 className="font-display mt-4 max-w-2xl text-4xl font-semibold tracking-tight sm:text-6xl">
          Um dia de cada vez. Um objetivo cada vez mais perto.
        </h1>
        <p className="mt-5 max-w-xl text-lg text-muted-foreground">
          Defina quanto quer guardar no mês, marque cada depósito no calendário e
          veja seu progresso crescer — com seus dados protegidos na sua conta.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link to="/auth">
            <Button className="h-12 px-7 text-base font-bold">
              Começar agora
              <ArrowRight className="size-4" />
            </Button>
          </Link>
        </div>

        <div className="mt-16 grid gap-6 sm:grid-cols-3">
          <Feature
            icon={<CalendarCheck2 className="size-5" />}
            title="Calendário real"
            text="Cada mês com seus dias certinhos, fins de semana e o dia de hoje em destaque."
          />
          <Feature
            icon={<TrendingUp className="size-5" />}
            title="Progresso visível"
            text="Barra de progresso, marcos de 25% a 100% e quanto falta por dia."
          />
          <Feature
            icon={<ShieldCheck className="size-5" />}
            title="Conta segura"
            text="Login com e-mail, Google ou Lovable. Seus dados ficam só com você."
          />
        </div>
      </main>

      <footer className="mx-auto w-full max-w-5xl border-t border-border pt-5 text-center text-xs text-muted-foreground">
        Minha Meta Mensal — construa o hábito de guardar
      </footer>
    </div>
  );
}

function Feature({
  icon,
  title,
  text,
}: {
  icon: React.ReactNode;
  title: string;
  text: string;
}) {
  return (
    <div className="shadow-panel rounded-xl border border-border bg-card p-5">
      <div className="mb-3 grid size-10 place-items-center rounded-full bg-primary/10 text-primary">
        {icon}
      </div>
      <h2 className="font-display text-lg font-semibold">{title}</h2>
      <p className="mt-1 text-sm text-muted-foreground">{text}</p>
    </div>
  );
}
