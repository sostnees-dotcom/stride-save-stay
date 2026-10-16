import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2, LockKeyhole, Target, TriangleAlert } from "lucide-react";

import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "Redefinir senha — Minha Meta Mensal" },
      { name: "description", content: "Defina uma nova senha para a sua conta." },
      { property: "og:title", content: "Redefinir senha — Minha Meta Mensal" },
      { property: "og:description", content: "Defina uma nova senha para a sua conta." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [invalid, setInvalid] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const hash = window.location.hash;
    if (!hash.includes("type=recovery")) {
      setInvalid(true);
      return;
    }
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") setReady(true);
    });
    return () => subscription.unsubscribe();
  }, []);

  const submit = async () => {
    setError(null);
    if (password.length < 6) {
      setError("A senha precisa ter pelo menos 6 caracteres.");
      return;
    }
    if (password !== confirm) {
      setError("As senhas não coincidem.");
      return;
    }
    setBusy(true);
    try {
      const { error: err } = await supabase.auth.updateUser({ password });
      if (err) {
        setError("Não foi possível redefinir a senha. Peça um novo link.");
        return;
      }
      navigate({ to: "/app", replace: true });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="bg-page flex min-h-screen items-center justify-center px-4 py-10 font-sans text-foreground">
      <main className="w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 grid size-12 place-items-center rounded-full border border-border bg-card text-primary shadow-card">
            <Target className="size-6" strokeWidth={2.5} />
          </div>
          <h1 className="font-display text-3xl font-semibold tracking-tight">
            Redefinir senha
          </h1>
        </div>

        <div className="shadow-panel rounded-xl border border-border bg-card p-6 sm:p-8">
          {invalid ? (
            <div className="text-center">
              <p className="text-sm font-semibold text-muted-foreground">
                Este link de recuperação é inválido ou já expirou.
              </p>
              <Link
                to="/auth"
                className="mt-4 inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-bold text-primary-foreground transition hover:opacity-90"
              >
                Pedir um novo link
              </Link>
            </div>
          ) : !ready ? (
            <p className="flex items-center justify-center gap-2 py-4 text-sm font-semibold text-muted-foreground">
              <Loader2 className="size-4 animate-spin" />
              Validando seu link…
            </p>
          ) : (
            <>
              <label className="mb-4 block">
                <span className="label-caps mb-2 block text-muted-foreground">
                  Nova senha
                </span>
                <div className="flex items-center gap-2 rounded-lg border border-input bg-background px-3 transition focus-within:ring-2 focus-within:ring-ring">
                  <LockKeyhole className="size-4 shrink-0 text-muted-foreground" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    maxLength={72}
                    autoComplete="new-password"
                    placeholder="Mínimo de 6 caracteres"
                    className="w-full min-w-0 bg-transparent py-2.5 font-semibold outline-none"
                  />
                </div>
              </label>
              <label className="mb-4 block">
                <span className="label-caps mb-2 block text-muted-foreground">
                  Confirmar senha
                </span>
                <div className="flex items-center gap-2 rounded-lg border border-input bg-background px-3 transition focus-within:ring-2 focus-within:ring-ring">
                  <LockKeyhole className="size-4 shrink-0 text-muted-foreground" />
                  <input
                    type="password"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    maxLength={72}
                    autoComplete="new-password"
                    placeholder="Repita a nova senha"
                    className="w-full min-w-0 bg-transparent py-2.5 font-semibold outline-none"
                  />
                </div>
              </label>

              {error && (
                <p className="mb-4 flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm font-semibold text-destructive">
                  <TriangleAlert className="size-4 shrink-0" />
                  {error}
                </p>
              )}

              <Button onClick={submit} disabled={busy} className="h-11 w-full font-bold">
                {busy && <Loader2 className="size-4 animate-spin" />}
                Salvar nova senha
              </Button>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
