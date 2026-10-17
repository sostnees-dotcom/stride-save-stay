import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2, LockKeyhole, Mail, Target, TriangleAlert } from "lucide-react";

import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import "@lovable.dev/cloud-auth-js/styles.css";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Entrar — Minha Meta Mensal" },
      {
        name: "description",
        content: "Acesse sua conta para acompanhar sua meta de economia em qualquer dispositivo.",
      },
      { property: "og:title", content: "Entrar — Minha Meta Mensal" },
      { property: "og:description", content: "Acesse sua conta com segurança." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AuthPage,
});

type Mode = "signin" | "signup" | "forgot";

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) void navigate({ to: "/app", replace: true });
    }).catch(() => setError("Não foi possível verificar sua conta. Tente entrar novamente."));
  }, [navigate]);

  const validEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  const submit = async () => {
    setError(null);
    setNotice(null);
    if (!validEmail) {
      setError("Informe um e-mail válido.");
      return;
    }
    if (mode !== "forgot" && password.length < 6) {
      setError("A senha precisa ter pelo menos 6 caracteres.");
      return;
    }
    setBusy(true);
    try {
      if (mode === "signin") {
        const { error: err } = await supabase.auth.signInWithPassword({ email, password });
        if (err) {
          setError("E-mail ou senha incorretos.");
          return;
        }
        navigate({ to: "/app", replace: true });
      } else if (mode === "signup") {
        const { data, error: err } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: window.location.origin,
            data: { full_name: name.trim() || undefined },
          },
        });
        if (err) {
          setError(
            err.message.includes("already registered")
              ? "Este e-mail já tem uma conta. Entre com sua senha."
              : "Não foi possível criar a conta. Tente novamente.",
          );
          return;
        }
        if (!data.session) {
          setNotice("Conta criada! Confirme o e-mail que enviamos para você e depois entre.");
          setMode("signin");
          return;
        }
        navigate({ to: "/app", replace: true });
      } else {
        const { error: err } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/reset-password`,
        });
        if (err) {
          setError("Não foi possível enviar o e-mail de recuperação.");
          return;
        }
        setNotice("Enviamos um link de recuperação para o seu e-mail.");
        setMode("signin");
      }
    } catch {
      setError("Não foi possível conectar. Verifique sua conexão e tente novamente.");
    } finally {
      setBusy(false);
    }
  };

  const oauth = async (provider: "google" | "lovable") => {
    setError(null);
    try {
      const result = await lovable.auth.signInWithOAuth(provider, {
        redirect_uri: window.location.origin,
      });
      if (result.error) setError("Não foi possível entrar agora. Tente novamente.");
      else {
        const { data } = await supabase.auth.getUser();
        if (data.user) void navigate({ to: "/app", replace: true });
      }
    } catch {
      setError("Não foi possível conectar. Verifique sua conexão e tente novamente.");
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
            Minha Meta Mensal
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Entre para acompanhar sua meta em qualquer dispositivo.
          </p>
        </div>

        <form onSubmit={(event) => { event.preventDefault(); void submit(); }} className="shadow-panel rounded-xl border border-border bg-card p-6 sm:p-8">
          <div className="mb-6 grid grid-cols-2 gap-1 rounded-lg border border-border bg-muted p-1">
            {(["signin", "signup"] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => {
                  setMode(m);
                  setError(null);
                  setNotice(null);
                }}
                aria-pressed={mode === m}
                className={`rounded-md px-3 py-2 text-sm font-bold transition ${
                  mode === m
                    ? "bg-card text-foreground shadow-card"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {m === "signin" ? "Entrar" : "Criar conta"}
              </button>
            ))}
          </div>

          {mode === "signup" && (
            <label className="mb-4 block">
              <span className="label-caps mb-2 block text-muted-foreground">Seu nome</span>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={80}
                autoComplete="name"
                placeholder="Como podemos te chamar?"
                className="w-full rounded-lg border border-input bg-background px-3 py-2.5 font-semibold outline-none transition focus:ring-2 focus:ring-ring"
              />
            </label>
          )}

          <label className="mb-4 block">
            <span className="label-caps mb-2 block text-muted-foreground">E-mail</span>
            <div className="flex items-center gap-2 rounded-lg border border-input bg-background px-3 transition focus-within:ring-2 focus-within:ring-ring">
              <Mail className="size-4 shrink-0 text-muted-foreground" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                maxLength={255}
                autoComplete="email"
                placeholder="voce@exemplo.com"
                className="w-full min-w-0 bg-transparent py-2.5 font-semibold outline-none"
              />
            </div>
          </label>

          {mode !== "forgot" && (
            <label className="mb-4 block">
              <span className="label-caps mb-2 block text-muted-foreground">Senha</span>
              <div className="flex items-center gap-2 rounded-lg border border-input bg-background px-3 transition focus-within:ring-2 focus-within:ring-ring">
                <LockKeyhole className="size-4 shrink-0 text-muted-foreground" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  maxLength={72}
                  autoComplete={mode === "signin" ? "current-password" : "new-password"}
                  placeholder="Mínimo de 6 caracteres"
                  className="w-full min-w-0 bg-transparent py-2.5 font-semibold outline-none"
                />
              </div>
            </label>
          )}

          {error && (
            <p className="mb-4 flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm font-semibold text-destructive">
              <TriangleAlert className="size-4 shrink-0" />
              {error}
            </p>
          )}
          {notice && (
            <p className="mb-4 rounded-lg border border-primary/30 bg-primary/10 px-3 py-2 text-sm font-semibold text-primary">
              {notice}
            </p>
          )}

          <Button
            type="submit"
            disabled={busy}
            className="h-11 w-full font-bold"
          >
            {busy && <Loader2 className="size-4 animate-spin" />}
            {mode === "signin"
              ? "Entrar"
              : mode === "signup"
                ? "Criar minha conta"
                : "Enviar link de recuperação"}
          </Button>

          {mode === "signin" && (
            <button
              type="button"
              onClick={() => {
                setMode("forgot");
                setError(null);
                setNotice(null);
              }}
              className="mt-3 w-full text-center text-sm font-semibold text-muted-foreground transition hover:text-foreground"
            >
              Esqueci minha senha
            </button>
          )}
          {mode === "forgot" && (
            <button
              type="button"
              onClick={() => setMode("signin")}
              className="mt-3 w-full text-center text-sm font-semibold text-muted-foreground transition hover:text-foreground"
            >
              Voltar para o login
            </button>
          )}

          <div className="my-6 flex items-center gap-3 text-xs font-bold uppercase tracking-widest text-muted-foreground">
            <span className="h-px flex-1 bg-border" />
            ou continue com
            <span className="h-px flex-1 bg-border" />
          </div>

          <div className="grid gap-2">
            <Button
              variant="outline"
              type="button"
              onClick={() => oauth("google")}
              className="h-11 w-full border-border bg-card font-semibold"
            >
              <svg viewBox="0 0 24 24" className="size-4" aria-hidden="true">
                <path
                  fill="currentColor"
                  d="M21.35 11.1h-9.17v2.73h6.51c-.33 3.81-3.5 5.44-6.5 5.44C8.36 19.27 5 16.25 5 12c0-4.1 3.2-7.27 7.2-7.27 3.09 0 4.9 1.97 4.9 1.97L19 4.72S16.56 2 12.1 2C6.42 2 2.03 6.8 2.03 12c0 5.05 4.13 10 10.22 10 5.35 0 9.25-3.67 9.25-9.09 0-1.15-.15-1.81-.15-1.81Z"
                />
              </svg>
              Entrar com Google
            </Button>
            <button
              type="button"
              className="lovable-auth-button"
              onClick={() => oauth("lovable")}
            >
              Continuar com Lovable
            </button>
          </div>
        </form>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          Seus dados ficam protegidos e só você tem acesso a eles.
        </p>
      </main>
    </div>
  );
}
