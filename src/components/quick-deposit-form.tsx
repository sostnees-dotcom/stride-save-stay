import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NOTE_MAX, validateDetail, type DayDetail } from "@/lib/deposit-details";

type Props = {
  /** Day of the month that will be marked (1-based). */
  day: number;
  dailyValue: number;
  money: (value: number) => string;
  /** Marks the day and saves the detail. The form closes right after calling it. */
  onSubmit: (detail: DayDetail) => void;
  onCancel: () => void;
};

/** Inline form next to the "Guardar" button: save today's deposit with another amount and/or a note. */
export function QuickDepositForm({ day, dailyValue, money, onSubmit, onCancel }: Props) {
  const [amountText, setAmountText] = useState("");
  const [noteText, setNoteText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const amountRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    amountRef.current?.focus();
  }, []);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const result = validateDetail(amountText, noteText);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    onSubmit({ amount: result.amount, note: result.note });
  };

  return (
    <form
      onSubmit={submit}
      onKeyDown={(e) => {
        if (e.key === "Escape") onCancel();
      }}
      aria-label={`Guardar o dia ${day} com outro valor`}
      className="w-full rounded-2xl border border-primary/30 bg-background/60 p-4"
    >
      <div className="grid gap-3 sm:grid-cols-[9rem_1fr_auto] sm:items-end">
        <div>
          <label htmlFor="quick-valor" className="mb-1.5 block text-sm font-semibold">
            Valor do dia {day}
          </label>
          <Input
            id="quick-valor"
            ref={amountRef}
            inputMode="decimal"
            placeholder={String(dailyValue)}
            value={amountText}
            onChange={(e) => {
              setAmountText(e.target.value);
              setError(null);
            }}
          />
        </div>
        <div>
          <label htmlFor="quick-nota" className="mb-1.5 block text-sm font-semibold">
            Anotação <span className="font-normal text-muted-foreground">(opcional)</span>
          </label>
          <Input
            id="quick-nota"
            maxLength={NOTE_MAX}
            placeholder="De onde veio esse dinheiro?"
            value={noteText}
            onChange={(e) => {
              setNoteText(e.target.value);
              setError(null);
            }}
          />
        </div>
        <div className="flex gap-2">
          <Button type="submit" className="h-9 rounded-full px-5 font-bold">
            Guardar dia {day}
          </Button>
          <Button type="button" variant="outline" className="h-9 rounded-full px-4 font-semibold" onClick={onCancel}>
            Cancelar
          </Button>
        </div>
      </div>
      <p className="mt-2 text-xs text-muted-foreground">
        Em branco, usa o valor padrão de {money(dailyValue)}.
      </p>
      {error ? (
        <p aria-live="polite" className="mt-2 text-sm font-semibold text-destructive">
          {error}
        </p>
      ) : null}
    </form>
  );
}
