import { useEffect, useState } from "react";
import { NotebookPen } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NOTE_MAX, validateDetail, type DayDetail } from "@/lib/deposit-details";

type Props = {
  monthLabel: string;
  completed: boolean[];
  details: Record<number, DayDetail> | undefined;
  dailyValue: number;
  money: (value: number) => string;
  /** false when the details table is not available in the database yet. */
  available: boolean;
  /** Saves one day and resolves to true only after the account confirmed it. */
  onSave: (day: number, detail: DayDetail) => Promise<boolean>;
};

export function DayDetailsPanel({ monthLabel, completed, details, dailyValue, money, available, onSave }: Props) {
  const markedDays = completed.flatMap((c, i) => (c ? [i + 1] : []));
  const [picked, setPicked] = useState<number | null>(null);
  const selected = picked !== null && markedDays.includes(picked) ? picked : (markedDays.at(-1) ?? null);

  const [amountText, setAmountText] = useState("");
  const [noteText, setNoteText] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  // Fill the form with what is saved for the chosen day.
  const saved = selected !== null ? details?.[selected] : undefined;
  useEffect(() => {
    setAmountText(saved?.amount !== null && saved?.amount !== undefined ? String(saved.amount) : "");
    setNoteText(saved?.note ?? "");
  }, [selected, saved]);

  const withDetails = Object.entries(details ?? {})
    .map(([d, v]) => ({ day: Number(d), ...v }))
    .filter((x) => completed[x.day - 1])
    .sort((a, b) => a.day - b.day);

  const run = async (detail: DayDetail, okText: string) => {
    if (selected === null) return;
    setBusy(true);
    setMessage(null);
    const ok = await onSave(selected, detail);
    setBusy(false);
    setMessage(
      ok
        ? { ok: true, text: okText }
        : { ok: false, text: "Não foi possível salvar agora. Verifique sua conexão e tente de novo." },
    );
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const result = validateDetail(amountText, noteText);
    if (!result.ok) {
      setMessage({ ok: false, text: result.error });
      return;
    }
    void run({ amount: result.amount, note: result.note }, `Detalhes do dia ${selected} salvos.`);
  };

  return (
    <details className="group mt-4 rounded-3xl border border-border bg-card shadow-card open:border-primary/30">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 rounded-3xl p-5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:p-6 [&::-webkit-details-marker]:hidden">
        <span className="flex items-center gap-3">
          <span className="grid size-9 place-items-center rounded-xl bg-primary/10 text-primary">
            <NotebookPen className="size-5" />
          </span>
          <span>
            <span className="block text-lg font-bold">Detalhes dos depósitos</span>
            <span className="block text-sm text-muted-foreground">
              Valor diferente e anotação em cada dia
            </span>
          </span>
        </span>
        <span aria-hidden="true" className="text-sm font-semibold text-primary group-open:hidden">
          Abrir
        </span>
        <span aria-hidden="true" className="hidden text-sm font-semibold text-primary group-open:inline">
          Fechar
        </span>
      </summary>

      <div className="border-t border-border p-5 sm:p-6">
        {!available ? (
          <p className="text-sm text-muted-foreground">
            Este recurso ainda não foi ativado no banco de dados da sua conta. Seus depósitos continuam
            funcionando normalmente.
          </p>
        ) : markedDays.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Marque um dia de {monthLabel} no calendário para adicionar um valor diferente ou uma anotação.
          </p>
        ) : (
          <>
            <form onSubmit={submit} className="grid gap-4 sm:grid-cols-[auto_1fr_1fr]">
              <div>
                <label htmlFor="det-dia" className="mb-1.5 block text-sm font-semibold">
                  Dia
                </label>
                <select
                  id="det-dia"
                  value={selected ?? ""}
                  onChange={(e) => {
                    setPicked(Number(e.target.value));
                    setMessage(null);
                  }}
                  className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  {markedDays.map((d) => (
                    <option key={d} value={d}>
                      {d} de {monthLabel}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="det-valor" className="mb-1.5 block text-sm font-semibold">
                  Valor guardado
                </label>
                <Input
                  id="det-valor"
                  inputMode="decimal"
                  placeholder={String(dailyValue)}
                  value={amountText}
                  onChange={(e) => setAmountText(e.target.value)}
                />
                <p className="mt-1 text-xs text-muted-foreground">
                  Em branco usa o valor padrão ({money(dailyValue)}).
                </p>
              </div>
              <div>
                <label htmlFor="det-nota" className="mb-1.5 block text-sm font-semibold">
                  Anotação
                </label>
                <Input
                  id="det-nota"
                  maxLength={NOTE_MAX}
                  placeholder="De onde veio esse dinheiro?"
                  value={noteText}
                  onChange={(e) => setNoteText(e.target.value)}
                />
              </div>
              <div className="flex flex-wrap items-center gap-2 sm:col-span-3">
                <Button type="submit" disabled={busy} className="rounded-full font-bold">
                  {busy ? "Salvando…" : "Salvar detalhes"}
                </Button>
                {saved ? (
                  <Button
                    type="button"
                    variant="outline"
                    disabled={busy}
                    className="rounded-full font-semibold"
                    onClick={() => void run({ amount: null, note: "" }, `Detalhes do dia ${selected} removidos.`)}
                  >
                    Remover detalhes
                  </Button>
                ) : null}
                <p
                  aria-live="polite"
                  className={`text-sm font-semibold ${message?.ok ? "text-primary" : "text-destructive"}`}
                >
                  {message?.text}
                </p>
              </div>
            </form>

            {withDetails.length > 0 && (
              <ul className="mt-5 grid gap-2 border-t border-border pt-4">
                {withDetails.map((x) => (
                  <li key={x.day}>
                    <button
                      type="button"
                      onClick={() => {
                        setPicked(x.day);
                        setMessage(null);
                      }}
                      className="flex w-full cursor-pointer flex-wrap items-baseline gap-x-3 gap-y-0.5 rounded-xl px-3 py-2 text-left text-sm transition-colors hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <span className="font-bold tabular-nums">Dia {x.day}</span>
                      {x.amount !== null && (
                        <span className="font-semibold tabular-nums text-primary">{money(x.amount)}</span>
                      )}
                      {x.note && <span className="text-muted-foreground">{x.note}</span>}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </div>
    </details>
  );
}
