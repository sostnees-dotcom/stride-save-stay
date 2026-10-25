import { useMemo, useState } from "react";
import { CalendarClock, Layers } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  CHALLENGES,
  buildChallenge,
  parseDateInput,
  planDeadline,
  type ChallengeId,
  type YMD,
} from "@/lib/planner";

type Props = {
  today: YMD;
  /** Days in the month shown in the calendar, used to turn a daily amount into a monthly goal. */
  daysInMonth: number;
  /** The daily amount currently set, to compare with what a plan needs. */
  currentDaily: number;
  money: (value: number) => string;
  /** Fills the goal fields of the app (the person still confirms with "Aplicar"). */
  onApply: (goal: number, daily: number) => void;
};

const num = (s: string) => (s.trim() === "" ? Number.NaN : Number(s.replace(",", ".")));
const ceilCents = (v: number) => Math.ceil(v * 100 - 1e-9) / 100;

type Mode = "prazo" | "desafios";

export function PlannerPanel({ today, daysInMonth, currentDaily, money, onApply }: Props) {
  const [mode, setMode] = useState<Mode>("prazo");
  const [notice, setNotice] = useState("");

  const apply = (goal: number, daily: number) => {
    onApply(goal, daily);
    setNotice(
      'Preenchi "Meta mensal" e "Valor por dia" no topo da página. Confira e clique em Aplicar para salvar.',
    );
  };

  return (
    <details className="group mt-8 rounded-3xl border border-border bg-card shadow-card open:border-primary/30">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 rounded-3xl p-5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:p-6 [&::-webkit-details-marker]:hidden">
        <span className="flex items-center gap-3">
          <span className="grid size-9 place-items-center rounded-xl bg-primary/10 text-primary">
            <CalendarClock className="size-5" />
          </span>
          <span>
            <span className="block text-lg font-bold">Planejador</span>
            <span className="block text-sm text-muted-foreground">
              Meta com prazo e desafios prontos
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
        <div role="group" aria-label="Tipo de plano" className="flex flex-wrap gap-2">
          {(
            [
              ["prazo", "Meta com prazo"],
              ["desafios", "Desafios prontos"],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              aria-pressed={mode === id}
              onClick={() => {
                setMode(id);
                setNotice("");
              }}
              className={
                "cursor-pointer rounded-full border px-4 py-1.5 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring " +
                (mode === id
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-secondary text-secondary-foreground hover:bg-primary/15")
              }
            >
              {label}
            </button>
          ))}
        </div>

        {mode === "prazo" ? (
          <DeadlinePlanner
            today={today}
            daysInMonth={daysInMonth}
            currentDaily={currentDaily}
            money={money}
            onApply={apply}
          />
        ) : (
          <ChallengePlanner money={money} onApply={apply} />
        )}

        <p aria-live="polite" className="mt-4 text-sm font-semibold text-primary">
          {notice}
        </p>
      </div>
    </details>
  );
}

function LabeledInput({
  id,
  label,
  hint,
  ...props
}: { id: string; label: string; hint?: string } & React.ComponentProps<"input">) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-semibold">
        {label}
      </label>
      <Input id={id} {...props} />
      {hint ? <p className="mt-1 text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

function DeadlinePlanner({
  today,
  daysInMonth,
  currentDaily,
  money,
  onApply,
}: Pick<Props, "today" | "daysInMonth" | "currentDaily" | "money"> & {
  onApply: (goal: number, daily: number) => void;
}) {
  const [target, setTarget] = useState("");
  const [have, setHave] = useState("");
  const [date, setDate] = useState("");

  const plan = useMemo(
    () =>
      planDeadline({
        target: num(target),
        have: have.trim() === "" ? 0 : num(have),
        today,
        deadline: parseDateInput(date),
      }),
    [target, have, date, today],
  );

  return (
    <div className="mt-5">
      <div className="grid gap-4 sm:grid-cols-3">
        <LabeledInput
          id="plan-alvo"
          label="Quanto você quer juntar"
          inputMode="decimal"
          placeholder="5000"
          value={target}
          onChange={(e) => setTarget(e.target.value)}
        />
        <LabeledInput
          id="plan-tenho"
          label="Quanto já tem"
          hint="Opcional"
          inputMode="decimal"
          placeholder="0"
          value={have}
          onChange={(e) => setHave(e.target.value)}
        />
        <LabeledInput
          id="plan-data"
          label="Até quando"
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />
      </div>

      <div className="mt-5" aria-live="polite">
        {plan.status === "invalid" && (
          <p className="text-sm text-muted-foreground">
            Informe o valor que quer juntar e a data final para ver quanto guardar.
          </p>
        )}
        {plan.status === "done" && (
          <p className="text-sm font-semibold text-primary">Você já tem o valor que queria juntar.</p>
        )}
        {plan.status === "expired" && (
          <p className="text-sm font-semibold text-destructive">
            Essa data já passou. Escolha uma data futura para calcular.
          </p>
        )}
        {plan.status === "ok" && (
          <>
            <dl className="grid grid-cols-3 gap-3">
              {(
                [
                  ["Por dia", plan.perDay],
                  ["Por semana", plan.perWeek],
                  ["Por 30 dias", plan.perMonth],
                ] as const
              ).map(([label, value]) => (
                <div key={label} className="rounded-2xl border border-border bg-background/60 p-3">
                  <dt className="text-xs text-muted-foreground">{label}</dt>
                  <dd className="font-display text-xl font-extrabold tabular-nums sm:text-2xl">
                    {money(value)}
                  </dd>
                </div>
              ))}
            </dl>
            <p className="mt-3 text-sm text-muted-foreground">
              Faltam {money(plan.remaining)} em {plan.daysLeft} {plan.daysLeft === 1 ? "dia" : "dias"}.{" "}
              {currentDaily >= plan.perDay
                ? `Seu valor atual de ${money(currentDaily)} por dia já cobre isso.`
                : `Seu valor atual de ${money(currentDaily)} por dia não chega lá.`}
            </p>
            <Button
              type="button"
              variant="outline"
              className="mt-3 rounded-full font-semibold"
              onClick={() => onApply(ceilCents(plan.perDay * daysInMonth), plan.perDay)}
            >
              Usar {money(plan.perDay)} por dia na minha meta
            </Button>
          </>
        )}
      </div>
    </div>
  );
}

function ChallengePlanner({
  money,
  onApply,
}: Pick<Props, "money"> & { onApply: (goal: number, daily: number) => void }) {
  const [id, setId] = useState<ChallengeId>("semanas52");
  const [base, setBase] = useState("5");

  const baseValue = num(base);
  const challenge = useMemo(() => buildChallenge(id, baseValue), [id, baseValue]);
  const valid = Number.isFinite(baseValue) && baseValue > 0;
  const last = challenge.steps[challenge.steps.length - 1] ?? 0;

  return (
    <div className="mt-5">
      <div role="group" aria-label="Desafio" className="flex flex-wrap gap-2">
        {CHALLENGES.map((c) => (
          <button
            key={c.id}
            type="button"
            aria-pressed={id === c.id}
            onClick={() => setId(c.id)}
            className={
              "inline-flex cursor-pointer items-center gap-1.5 rounded-full border px-3 py-1 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring " +
              (id === c.id
                ? "border-primary bg-primary/10 text-primary"
                : "border-border bg-background text-muted-foreground hover:text-foreground")
            }
          >
            <Layers className="size-3.5" />
            {c.name}
          </button>
        ))}
      </div>

      <p className="mt-3 max-w-2xl text-sm text-muted-foreground">{challenge.description}</p>

      <div className="mt-4 max-w-xs">
        <LabeledInput
          id="plan-base"
          label="Valor base"
          inputMode="decimal"
          value={base}
          onChange={(e) => setBase(e.target.value)}
        />
      </div>

      {valid ? (
        <>
          <dl className="mt-5 grid grid-cols-3 gap-3">
            <div className="rounded-2xl border border-border bg-background/60 p-3">
              <dt className="text-xs text-muted-foreground">Total guardado</dt>
              <dd className="font-display text-xl font-extrabold tabular-nums sm:text-2xl">
                {money(challenge.total)}
              </dd>
            </div>
            <div className="rounded-2xl border border-border bg-background/60 p-3">
              <dt className="text-xs text-muted-foreground">Primeiro {challenge.unit}</dt>
              <dd className="font-display text-xl font-extrabold tabular-nums sm:text-2xl">
                {money(challenge.steps[0] ?? 0)}
              </dd>
            </div>
            <div className="rounded-2xl border border-border bg-background/60 p-3">
              <dt className="text-xs text-muted-foreground">Último {challenge.unit}</dt>
              <dd className="font-display text-xl font-extrabold tabular-nums sm:text-2xl">{money(last)}</dd>
            </div>
          </dl>

          <ol className="mt-4 grid max-h-56 grid-cols-2 gap-1 overflow-y-auto rounded-2xl border border-border bg-background/60 p-3 text-sm sm:grid-cols-3">
            {challenge.steps.map((value, i) => (
              <li key={i} className="flex justify-between gap-2 tabular-nums">
                <span className="text-muted-foreground">
                  {i + 1}º {challenge.unit}
                </span>
                <span className="font-semibold">{money(value)}</span>
              </li>
            ))}
          </ol>

          {id === "fixo30" ? (
            <Button
              type="button"
              variant="outline"
              className="mt-4 rounded-full font-semibold"
              onClick={() => onApply(challenge.total, baseValue)}
            >
              Usar {money(baseValue)} por dia na minha meta
            </Button>
          ) : (
            <p className="mt-4 text-sm text-muted-foreground">
              Este formato muda o valor a cada passo. O calendário do app acompanha o mesmo valor
              todos os dias, então use esta lista como guia para guardar.
            </p>
          )}
        </>
      ) : (
        <p className="mt-4 text-sm text-muted-foreground">Informe um valor base maior que zero.</p>
      )}
    </div>
  );
}
