import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, Download, Loader2, Plus, Smartphone, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { applyTheme, loadAccountData, type AccountData } from "@/lib/goal-data";
import { CURRENCIES, MAIN_GOAL, formatMoney, type GoalInfo } from "@/lib/goals";

export const Route = createFileRoute("/_authenticated/configuracoes")({
  head: () => ({
    meta: [
      { title: "Configurações — Minha Meta Mensal" },
      { name: "description", content: "Ajuste seu perfil, moeda, tema e gerencie suas metas." },
      { property: "og:title", content: "Configurações — Minha Meta Mensal" },
      { property: "og:description", content: "Personalize sua experiência e organize várias metas." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: SettingsPage,
});

type InstallPrompt = Event & { prompt: () => Promise<void> };

function SettingsPage() {
  const [data, setData] = useState<AccountData | null>(null);
  const [failed, setFailed] = useState(false);
  const [name, setName] = useState("");
  const [currency, setCurrency] = useState("BRL");
  const [theme, setTheme] = useState("system");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [goals, setGoals] = useState<GoalInfo[]>([]);
  const [newName, setNewName] = useState("");
  const [newGoal, setNewGoal] = useState("1000");
  const [newDaily, setNewDaily] = useState("35");
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [install, setInstall] = useState<InstallPrompt | null>(null);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    loadAccountData()
      .then((d) => {
        setData(d);
        setName(d.displayName);
        setCurrency(d.currency);
        setTheme(d.theme);
        setGoals(d.goals.filter((g) => g.id !== MAIN_GOAL));
      })
      .catch(() => setFailed(true));
    setInstalled(window.matchMedia?.("(display-mode: standalone)").matches ?? false);
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setInstall(e as InstallPrompt);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    return () => window.removeEventListener("beforeinstallprompt", onPrompt);
  }, []);

  const saveProfile = async () => {
    if (!data) return;
    setBusy(true);
    setMsg(null);
    const { error } = await supabase
      .from("profiles")
      .update({ display_name: name.trim() || null, currency, theme })
      .eq("id", data.userId);
    setBusy(false);
    if (error) return setMsg({ ok: false, text: "Não foi possível salvar. Tente novamente." });
    applyTheme(theme);
    setMsg({ ok: true, text: "Preferências salvas na sua conta." });
  };

  const addGoal = async () => {
    if (!data) return;
    const g = Number(newGoal);
    const d = Number(newDaily);
    if (!newName.trim() || g <= 0 || d <= 0) {
      return setMsg({ ok: false, text: "Dê um nome à meta e use valores maiores que zero." });
    }
    setBusy(true);
    const { data: row, error } = await supabase
      .from("goals")
      .insert({ user_id: data.userId, name: newName.trim().slice(0, 40), goal: g, daily_value: d })
      .select("id, name, goal, daily_value")
      .single();
    setBusy(false);
    if (error || !row) return setMsg({ ok: false, text: "Não foi possível criar a meta." });
    setGoals((l) => [...l, { id: row.id, name: row.name, goal: Number(row.goal), dailyValue: Number(row.daily_value) }]);
    setNewName("");
    setMsg({ ok: true, text: `Meta "${row.name}" criada. Escolha-a no calendário.` });
  };

  const renameGoal = async (id: string, value: string) => {
    const trimmed = value.trim().slice(0, 40);
    if (!trimmed) return;
    const { error } = await supabase.from("goals").update({ name: trimmed }).eq("id", id);
    if (error) return setMsg({ ok: false, text: "Não foi possível renomear a meta." });
    setGoals((l) => l.map((g) => (g.id === id ? { ...g, name: trimmed } : g)));
  };

  const deleteGoal = async (id: string) => {
    const { error } = await supabase.from("goals").delete().eq("id", id);
    setConfirmDelete(null);
    if (error) return setMsg({ ok: false, text: "Não foi possível excluir a meta." });
    setGoals((l) => l.filter((g) => g.id !== id));
    setMsg({ ok: true, text: "Meta excluída." });
  };

  if (failed) {
    return (
      <main className="bg-page flex min-h-screen flex-col items-center justify-center gap-4 text-foreground">
        <p role="alert">Não foi possível carregar suas configurações.</p>
        <Button onClick={() => location.reload()}>Tentar novamente</Button>
      </main>
    );
  }
  if (!data) {
    return (
      <div className="bg-page flex min-h-screen items-center justify-center text-muted-foreground">
        <Loader2 className="mr-2 size-4 animate-spin" /> Carregando…
      </div>
    );
  }

  const inputCls =
    "w-full rounded-lg border border-input bg-background px-3 py-2.5 font-semibold outline-none focus:ring-2 focus:ring-ring";

  return (
    <div className="bg-page min-h-screen px-4 py-6 font-sans text-foreground sm:px-8 sm:py-10">
      <main className="mx-auto w-full max-w-3xl">
        <div className="mb-8 border-b border-border pb-5">
          <Button asChild variant="ghost" className="gap-2 px-2">
            <Link to="/app"><ArrowLeft className="size-4" /> Voltar ao calendário</Link>
          </Button>
        </div>
        <h1 className="font-display text-4xl font-semibold tracking-tight sm:text-5xl">Configurações</h1>

        {msg && (
          <p role="status" className={`mt-6 rounded-lg border px-3 py-2 text-sm font-semibold ${msg.ok ? "border-primary/30 bg-primary/10 text-primary" : "border-destructive/30 bg-destructive/10 text-destructive"}`}>
            {msg.text}
          </p>
        )}

        <Panel title="Perfil e aparência">
          <label className="label-caps mb-2 block text-muted-foreground" htmlFor="name">Seu nome</label>
          <input id="name" className={inputCls} value={name} maxLength={60} onChange={(e) => setName(e.target.value)} />
          <div className="mt-5 grid gap-5 sm:grid-cols-2">
            <div>
              <label className="label-caps mb-2 block text-muted-foreground" htmlFor="currency">Moeda</label>
              <select id="currency" className={inputCls} value={currency} onChange={(e) => setCurrency(e.target.value)}>
                {CURRENCIES.map((c) => <option key={c.code} value={c.code}>{c.label}</option>)}
              </select>
            </div>
            <div>
              <span className="label-caps mb-2 block text-muted-foreground">Tema</span>
              <div className="flex overflow-hidden rounded-lg border border-input">
                {[["system", "Automático"], ["light", "Claro"], ["dark", "Escuro"]].map(([v, l]) => (
                  <button key={v} type="button" aria-pressed={theme === v} onClick={() => setTheme(v!)} className={`flex-1 px-2 py-2.5 text-sm font-bold transition-colors ${theme === v ? "bg-primary text-primary-foreground" : "bg-background text-muted-foreground hover:text-foreground"}`}>
                    {l}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <Button className="mt-6" disabled={busy} onClick={saveProfile}>Salvar preferências</Button>
        </Panel>

        <Panel title="Minhas metas">
          <p className="mb-4 text-sm text-muted-foreground">
            A meta principal continua no calendário. Crie metas extras — viagem, reserva, presente — cada uma com seus próprios dias.
          </p>
          <ul className="space-y-2">
            {goals.map((g) => (
              <li key={g.id} className="flex flex-wrap items-center gap-3 rounded-lg border border-border bg-background p-3">
                <input aria-label="Nome da meta" defaultValue={g.name} maxLength={40} onBlur={(e) => e.target.value !== g.name && void renameGoal(g.id, e.target.value)} className="min-w-0 flex-1 bg-transparent font-bold outline-none" />
                <span className="text-xs text-muted-foreground">{formatMoney(g.goal, currency)} · {formatMoney(g.dailyValue, currency)}/dia</span>
                {confirmDelete === g.id ? (
                  <span className="flex gap-1">
                    <Button size="sm" variant="destructive" onClick={() => deleteGoal(g.id)}>Excluir</Button>
                    <Button size="sm" variant="ghost" onClick={() => setConfirmDelete(null)}>Cancelar</Button>
                  </span>
                ) : (
                  <Button size="icon" variant="ghost" aria-label={`Excluir ${g.name}`} onClick={() => setConfirmDelete(g.id)}>
                    <Trash2 className="size-4" />
                  </Button>
                )}
              </li>
            ))}
            {goals.length === 0 && <li className="text-sm text-muted-foreground">Nenhuma meta extra ainda.</li>}
          </ul>
          <div className="mt-5 grid gap-3 sm:grid-cols-[2fr_1fr_1fr_auto] sm:items-end">
            <div>
              <label className="label-caps mb-2 block text-muted-foreground" htmlFor="ng">Nova meta</label>
              <input id="ng" placeholder="Ex.: Viagem" className={inputCls} value={newName} maxLength={40} onChange={(e) => setNewName(e.target.value)} />
            </div>
            <div>
              <label className="label-caps mb-2 block text-muted-foreground" htmlFor="ngv">Valor mensal</label>
              <input id="ngv" type="number" min="0.01" step="0.01" className={inputCls} value={newGoal} onChange={(e) => setNewGoal(e.target.value)} />
            </div>
            <div>
              <label className="label-caps mb-2 block text-muted-foreground" htmlFor="ngd">Por dia</label>
              <input id="ngd" type="number" min="0.01" step="0.01" className={inputCls} value={newDaily} onChange={(e) => setNewDaily(e.target.value)} />
            </div>
            <Button disabled={busy} onClick={addGoal} className="h-11"><Plus /> Criar</Button>
          </div>
        </Panel>

        <Panel title="Instalar no celular">
          {installed ? (
            <p className="text-sm text-muted-foreground">O app já está instalado neste aparelho.</p>
          ) : install ? (
            <Button onClick={() => void install.prompt()}><Download /> Instalar aplicativo</Button>
          ) : (
            <div className="flex gap-3 text-sm text-muted-foreground">
              <Smartphone className="size-5 shrink-0 text-primary" />
              <p>
                No iPhone: toque em <strong>Compartilhar</strong> e depois em <strong>Adicionar à Tela de Início</strong>.
                No Android: abra o menu do navegador e toque em <strong>Instalar app</strong>.
              </p>
            </div>
          )}
        </Panel>
      </main>
    </div>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="shadow-panel mt-8 rounded-xl border border-border bg-card p-5 sm:p-6">
      <h2 className="label-caps mb-5 text-primary">{title}</h2>
      {children}
    </section>
  );
}
