import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowUpRight,
  BarChart3,
  Settings as SettingsIcon,
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  Flame,
  Pencil,
  Loader2,
  LogOut,
  Moon,
  RotateCcw,
  Sun,
  Target,
  Trophy,
  TriangleAlert,
  Wand2,
  Wallet,
} from "lucide-react";

import { Confetti } from "@/components/confetti";
import { InsightsPanel } from "@/components/insights-panel";
import { DayDetailsPanel } from "@/components/day-details-panel";
import { PlannerPanel } from "@/components/planner-panel";
import { QuickDepositForm } from "@/components/quick-deposit-form";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import {
  MAIN_GOAL,
  currencySymbol,
  formatMoney,
  parseProgressKey,
  progressKey,
  type GoalInfo,
} from "@/lib/goals";
import { bonusFor, savedFor, type DayDetail, type DetailsMap } from "@/lib/deposit-details";
import { fetchDetails, saveDetail } from "@/lib/deposit-details-db";
import { useAnimatedNumber } from "@/lib/use-animated-number";

export const Route = createFileRoute("/_authenticated/app")({
  head: () => ({
    meta: [
      { title: "Meu calendário — Minha Meta Mensal" },
      {
        name: "description",
        content:
          "Defina sua meta, marque cada depósito e acompanhe seu progresso mês a mês.",
      },
      { property: "og:title", content: "Meu calendário — Minha Meta Mensal" },
      {
        property: "og:description",
        content: "Desafio mensal para guardar dinheiro e acompanhar seu progresso.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: App,
});

const SETTINGS_KEY = "monthlyGoalSettings";
const LEGACY_KEY = "monthlyGoalTracker";
const MONTH_PREFIX = "monthlyGoalTracker:";
const THEME_KEY = "monthlyGoalTheme";
const pendingKey = (uid: string) => `monthlyGoalPending:${uid}`;

const MONTHS = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];
const MONTHS_SHORT = [
  "Jan",
  "Fev",
  "Mar",
  "Abr",
  "Mai",
  "Jun",
  "Jul",
  "Ago",
  "Set",
  "Out",
  "Nov",
  "Dez",
];

const WEEKDAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const MILESTONES = [25, 50, 75, 100];

type Settings = { goal: number; dailyValue: number };
const initialSettings: Settings = { goal: 600, dailyValue: 20 };
const NOW = new Date();

// Account currency, set once the profile loads.
let CURRENCY = "BRL";
const money = (v: number) => formatMoney(v, CURRENCY);
const pad = (n: number) => String(n).padStart(2, "0");
const monthKey = (y: number, m: number) => `${y}-${pad(m + 1)}`;
const daysIn = (y: number, m: number) => new Date(y, m + 1, 0).getDate();
const emptyDays = (days: number) => new Array<boolean>(days).fill(false);
const normalize = (raw: unknown, days: number) => {
  const arr = Array.isArray(raw) ? raw : [];
  return Array.from({ length: days }, (_, i) => Boolean(arr[i]));
};

function readJSON<T>(raw: string | null): T | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function motivational(progress: number): string {
  if (progress >= 100) return "Meta alcançada. Excelente disciplina.";
  if (progress >= 75) return "Reta final — falta muito pouco.";
  if (progress >= 50) return "Metade do caminho percorrida.";
  if (progress >= 25) return "Bom ritmo. O hábito está se formando.";
  if (progress > 0) return "O primeiro passo já foi dado.";
  return "Comece hoje: marque o primeiro dia.";
}

export function App() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [userId, setUserId] = useState<string | null>(null);
  const [profileName, setProfileName] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [saving, setSaving] = useState(false);
  const saveLock = useRef(false);
  // Day changes are applied instantly, kept in a per-account browser backup and
  // saved to the account in order, retrying until the account confirms them.
  const progressRef = useRef<Record<string, boolean[]>>({});
  const dirty = useRef<Record<string, boolean[]>>({});
  const flushing = useRef(false);
  const retryTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const [pendingCount, setPendingCount] = useState(0);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [year, setYear] = useState(NOW.getFullYear());
  const [month, setMonth] = useState(NOW.getMonth());
  const [mainSettings, setSettings] = useState<Settings>(initialSettings);
  const [goals, setGoals] = useState<GoalInfo[]>([]);
  const [activeGoal, setActiveGoal] = useState<string>(MAIN_GOAL);
  const activeExtra = goals.find((g) => g.id === activeGoal);
  const settings: Settings = activeExtra
    ? { goal: activeExtra.goal, dailyValue: activeExtra.dailyValue }
    : mainSettings;
  const [progressMap, setProgressMap] = useState<Record<string, boolean[]>>({});
  const [goalIn, setGoalIn] = useState("600");
  const [dailyIn, setDailyIn] = useState("20");
  const [milestone, setMilestone] = useState<number | null>(null);
  const [todayDate, setTodayDate] = useState(NOW.getDate());
  const [dark, setDark] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);
  const prevProgress = useRef(0);
  const lastMonth = useRef(monthKey(NOW.getFullYear(), NOW.getMonth()));
  const stripRef = useRef<HTMLDivElement>(null);
  // Per-day details (custom amount and note), declared early because month summaries use them.
  const [detailsMap, setDetailsMap] = useState<DetailsMap>({});
  const [detailsAvailable, setDetailsAvailable] = useState(false);
  // Which day just changed, so only that coin plays the "pop" animation.
  const [popIdx, setPopIdx] = useState<number | null>(null);
  const popTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => () => clearTimeout(popTimer.current), []);

  const days = daysIn(year, month);
  const key = progressKey(activeExtra ? activeGoal : MAIN_GOAL, monthKey(year, month));
  const firstWeekday = new Date(year, month, 1).getDay();
  const isCurrentMonth = year === NOW.getFullYear() && month === NOW.getMonth();

  // Load the user's profile, settings and every saved month — once.
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setLoadFailed(false);
    (async () => {
      try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();
      if (cancelled) return;
      if (authError || !user) throw new Error("Session unavailable");
      setUserId(user.id);
      const now = new Date();
      setYear(now.getFullYear());
      setMonth(now.getMonth());
      setTodayDate(now.getDate());
      setDark(localStorage.getItem(THEME_KEY) === "dark");

      const [profileResult, settingsResult, progressResult, goalsResult, goalProgressResult] = await Promise.all([
        supabase.from("profiles").select("display_name, currency").eq("id", user.id).maybeSingle(),
        supabase
          .from("goal_settings")
          .select("goal, daily_value")
          .eq("user_id", user.id)
          .maybeSingle(),
        supabase.from("monthly_progress").select("month, completed").eq("user_id", user.id),
        supabase.from("goals").select("id, name, goal, daily_value, created_at").eq("user_id", user.id),
        supabase.from("goal_progress").select("goal_id, month, completed").eq("user_id", user.id),
      ]);
      if (cancelled) return;
      if (settingsResult.error || progressResult.error || goalsResult.error || goalProgressResult.error) throw new Error("Unable to load progress");
      const prof = profileResult.data;
      const setRow = settingsResult.data;
      const rows = progressResult.data;
      const storageOwner = localStorage.getItem("monthlyGoalStorageOwner");
      const canImport = !storageOwner || storageOwner === user.id;

      setProfileName(prof?.display_name ?? "");
      CURRENCY = (prof as { currency?: string } | null)?.currency ?? "BRL";
      const extras = [...(goalsResult.data ?? [])]
        .sort((a, b) => a.created_at.localeCompare(b.created_at))
        .map((g) => ({ id: g.id, name: g.name, goal: Number(g.goal), dailyValue: Number(g.daily_value) }));
      setGoals(extras);
      const wanted = localStorage.getItem("monthlyGoalActive");
      setActiveGoal(extras.some((g) => g.id === wanted) ? wanted! : MAIN_GOAL);

      let s = initialSettings;
      if (setRow) {
        s = { goal: Number(setRow.goal), dailyValue: Number(setRow.daily_value) };
      } else if (canImport) {
        const stored = readJSON<Settings>(localStorage.getItem(SETTINGS_KEY));
        const legacy = readJSON<Settings & { completed?: unknown }>(
          localStorage.getItem(LEGACY_KEY),
        );
        const local =
          stored ?? (legacy ? { goal: legacy.goal, dailyValue: legacy.dailyValue } : null);
        if (local && local.goal > 0 && local.dailyValue > 0) {
          s = local;
          const { error: migrationError } = await supabase
            .from("goal_settings")
            .upsert({ user_id: user.id, goal: s.goal, daily_value: s.dailyValue });
          if (migrationError) throw migrationError;
        }
      }
      setSettings(s);
      setGoalIn(String(s.goal));
      setDailyIn(String(s.dailyValue));

      const map: Record<string, boolean[]> = {};
      for (const r of rows ?? []) {
        const [y, m] = r.month.split("-").map(Number);
        if (!y || !m || m < 1 || m > 12) continue;
        map[r.month] = normalize(r.completed, daysIn(y, m - 1));
      }
      for (const r of goalProgressResult.data ?? []) {
        const k = progressKey(r.goal_id, r.month);
        const parsed = parseProgressKey(k);
        if (parsed) map[k] = normalize(r.completed, daysIn(parsed.y, parsed.m));
      }

      // Migrate months that only exist in this browser's storage.
      const pending: { user_id: string; month: string; completed: boolean[] }[] = [];
      for (let i = 0; canImport && i < localStorage.length; i++) {
        const full = localStorage.key(i);
        if (!full || !full.startsWith(MONTH_PREFIX)) continue;
        const mk = full.slice(MONTH_PREFIX.length);
        if (map[mk]) continue;
        const [y, m] = mk.split("-").map(Number);
        if (!/^\d{4}-\d{2}$/.test(mk) || !y || !m || m < 1 || m > 12) continue;
        const data = readJSON<{ completed?: unknown }>(localStorage.getItem(full));
        const arr = normalize(data?.completed, daysIn(y, m - 1));
        if (arr.some(Boolean)) {
          map[mk] = arr;
          pending.push({ user_id: user.id, month: mk, completed: arr });
        }
      }
      const currentKey = monthKey(now.getFullYear(), now.getMonth());
      if (canImport && !map[currentKey]) {
        const legacy = readJSON<{ completed?: unknown }>(localStorage.getItem(LEGACY_KEY));
        if (legacy) {
          const arr = normalize(legacy.completed, daysIn(now.getFullYear(), now.getMonth()));
          if (arr.some(Boolean)) {
            map[currentKey] = arr;
            pending.push({ user_id: user.id, month: currentKey, completed: arr });
          }
        }
      }
      if (pending.length > 0) {
        const { error: migrationError } = await supabase.from("monthly_progress").upsert(pending);
        if (migrationError) throw migrationError;
      }
      if (cancelled) return;
      if (canImport) {
        localStorage.setItem("monthlyGoalStorageOwner", user.id);
        localStorage.removeItem(LEGACY_KEY);
      }
      // Changes this account made on this device that the account never confirmed.
      const backup = readJSON<Record<string, unknown>>(localStorage.getItem(pendingKey(user.id)));
      dirty.current = {};
      for (const [mk, raw] of Object.entries(backup ?? {})) {
        const parsed = parseProgressKey(mk);
        if (!parsed) continue;
        const arr = normalize(raw, daysIn(parsed.y, parsed.m));
        map[mk] = arr;
        dirty.current[mk] = arr;
      }
      progressRef.current = map;
      setProgressMap(map);
      setPendingCount(Object.keys(dirty.current).length);
      setError(null);
      if (Object.keys(dirty.current).length > 0) void flush(user.id);
      } catch {
        if (cancelled) return;
        setLoadFailed(true);
        setError("Não foi possível carregar seus dados. Tente novamente; seus dias salvos não serão alterados.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [loadAttempt]);

  // Show the chosen goal's values in the inputs when switching goals.
  useEffect(() => {
    setGoalIn(String(settings.goal));
    setDailyIn(String(settings.dailyValue));
    setError(null);
    if (!loading) localStorage.setItem("monthlyGoalActive", activeGoal);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeGoal]);

  // Keep the selected month in sight when the strip scrolls sideways.
  useEffect(() => {
    const id = requestAnimationFrame(() => {
      const strip = stripRef.current;
      const chip = strip?.querySelector<HTMLElement>(`[data-month="${month}"]`);
      if (!strip || !chip) return;
      const cr = chip.getBoundingClientRect();
      const sr = strip.getBoundingClientRect();
      if (cr.left < sr.left) strip.scrollLeft -= sr.left - cr.left + 8;
      else if (cr.right > sr.right) strip.scrollLeft += cr.right - sr.right + 8;
    });
    return () => cancelAnimationFrame(id);
  }, [year, month]);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
    localStorage.setItem(THEME_KEY, dark ? "dark" : "light");
    localStorage.setItem("monthlyGoalThemePref", dark ? "dark" : "light");
  }, [dark]);

  const completed = useMemo(
    () => progressMap[key] ?? emptyDays(days),
    [progressMap, key, days],
  );

  const summaries = useMemo(() => {
    const out: Record<string, number> = {};
    const wantedGoal = activeExtra ? activeGoal : MAIN_GOAL;
    for (const [k, arr] of Object.entries(progressMap)) {
      const parsed = parseProgressKey(k);
      if (!parsed || parsed.goalId !== wantedGoal) continue;
      const monthSaved = savedFor(
        normalize(arr, daysIn(parsed.y, parsed.m)),
        detailsMap[k],
        settings.dailyValue,
      );
      out[parsed.month] =
        settings.goal > 0 ? Math.min((monthSaved / settings.goal) * 100, 100) : 0;
    }
    return out;
  }, [progressMap, detailsMap, settings.goal, settings.dailyValue, activeGoal, activeExtra]);

  function storePending(uid: string) {
    const count = Object.keys(dirty.current).length;
    try {
      if (count > 0) localStorage.setItem(pendingKey(uid), JSON.stringify(dirty.current));
      else localStorage.removeItem(pendingKey(uid));
    } catch {
      // Storage full or blocked: the account save below still runs.
    }
    setPendingCount(count);
  }

  async function flush(uid: string) {
    if (flushing.current) return;
    flushing.current = true;
    if (retryTimer.current) clearTimeout(retryTimer.current);
    try {
      for (;;) {
        const entry = Object.entries(dirty.current)[0];
        if (!entry) break;
        const [mk, arr] = entry;
        const parsed = parseProgressKey(mk);
        if (!parsed) {
          delete dirty.current[mk];
          storePending(uid);
          continue;
        }
        const updated_at = new Date().toISOString();
        const { error: upsertError } =
          parsed.goalId === MAIN_GOAL
            ? await supabase.from("monthly_progress").upsert({
                user_id: uid,
                month: parsed.month,
                completed: arr,
                updated_at,
              })
            : await supabase.from("goal_progress").upsert({
                goal_id: parsed.goalId,
                user_id: uid,
                month: parsed.month,
                completed: arr,
                updated_at,
              });
        if (upsertError) throw upsertError;
        // Only clear it if no newer change for this month arrived meanwhile.
        if (dirty.current[mk] === arr) {
          delete dirty.current[mk];
          storePending(uid);
        }
      }
      setSaveError(null);
    } catch {
      setSaveError(
        "Sem conexão com sua conta agora. Seus dias marcados ficam guardados neste aparelho e serão salvos automaticamente.",
      );
      retryTimer.current = setTimeout(() => void flush(uid), 5000);
    } finally {
      flushing.current = false;
    }
  }

  const persist = (next: boolean[]) => {
    if (!userId) return;
    progressRef.current = { ...progressRef.current, [key]: next };
    setProgressMap(progressRef.current);
    dirty.current = { ...dirty.current, [key]: next };
    storePending(userId);
    void flush(userId);
  };

  // Undo for the last change to the days of the month on screen. It restores the previous
  // state through the same `persist` path, so saving and retries behave exactly as before.
  const undoRef = useRef<{ key: string; prev: boolean[] } | null>(null);
  const undoTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const [undoLabel, setUndoLabel] = useState<string | null>(null);
  useEffect(() => () => clearTimeout(undoTimer.current), []);
  useEffect(() => {
    // Switching month or goal makes the pending undo meaningless.
    undoRef.current = null;
    setUndoLabel(null);
  }, [key]);
  const rememberUndo = (prev: boolean[], label: string) => {
    undoRef.current = { key, prev };
    setUndoLabel(label);
    clearTimeout(undoTimer.current);
    undoTimer.current = setTimeout(() => {
      undoRef.current = null;
      setUndoLabel(null);
    }, 6000);
  };
  const undo = () => {
    const last = undoRef.current;
    if (!last || last.key !== key) return;
    clearTimeout(undoTimer.current);
    undoRef.current = null;
    setUndoLabel(null);
    persist(last.prev);
  };

  // Per-day details (custom amount and note). Loaded apart from the days themselves, so a
  // missing table never affects marking or saving days.
  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    void fetchDetails(userId).then((loaded) => {
      if (cancelled) return;
      setDetailsAvailable(loaded !== null);
      if (loaded) setDetailsMap(loaded);
    });
    return () => {
      cancelled = true;
    };
  }, [userId]);
  const saveDayDetail = async (day: number, detail: DayDetail) => {
    if (!userId) return false;
    const ok = await saveDetail(userId, activeExtra ? activeGoal : MAIN_GOAL, monthKey(year, month), day, detail);
    if (ok) {
      setDetailsMap((prev) => {
        const current = { ...(prev[key] ?? {}) };
        if (detail.amount === null && detail.note === "") delete current[day];
        else current[day] = detail;
        return { ...prev, [key]: current };
      });
    }
    return ok;
  };

  // "Guardar com outro valor": inline form next to the Guardar button.
  const [quickOpen, setQuickOpen] = useState(false);
  const [quickNotice, setQuickNotice] = useState<string | null>(null);
  useEffect(() => {
    setQuickOpen(false);
    setQuickNotice(null);
  }, [key]);

  // Retry pending saves when the connection returns or the tab is hidden,
  // and warn before closing the page with unsaved days.
  useEffect(() => {
    if (!userId) return;
    const retry = () => {
      if (Object.keys(dirty.current).length > 0) void flush(userId);
    };
    const onHide = () => {
      if (document.visibilityState === "hidden") retry();
    };
    const onUnload = (e: BeforeUnloadEvent) => {
      if (Object.keys(dirty.current).length > 0) e.preventDefault();
    };
    window.addEventListener("online", retry);
    document.addEventListener("visibilitychange", onHide);
    window.addEventListener("beforeunload", onUnload);
    return () => {
      window.removeEventListener("online", retry);
      document.removeEventListener("visibilitychange", onHide);
      window.removeEventListener("beforeunload", onUnload);
      if (retryTimer.current) clearTimeout(retryTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  const done = completed.filter(Boolean).length;
  const detailsForKey = detailsMap[key];
  const saved = savedFor(completed, detailsForKey, settings.dailyValue);
  const remaining = Math.max(settings.goal - saved, 0);
  const progress =
    settings.goal > 0 ? Math.min((saved / settings.goal) * 100, 100) : 0;
  const daysLeft = days - done;
  const perDayNeeded = daysLeft > 0 ? remaining / daysLeft : 0;
  const nextDay = completed.findIndex((c) => !c);

  // Current streak: in the running month it ends today (or yesterday, so an
  // unmarked today doesn't break it yet); in other months it ends on the last day.
  let streak = 0;
  {
    let i = days - 1;
    if (isCurrentMonth) {
      i = Math.min(todayDate, days) - 1;
      if (!completed[i]) i--;
    }
    for (; i >= 0 && completed[i]; i--) streak++;
  }
  let bestRun = 0;
  for (let i = 0, run = 0; i < days; i++) {
    run = completed[i] ? run + 1 : 0;
    if (run > bestRun) bestRun = run;
  }
  const animatedSaved = useAnimatedNumber(saved);
  // Where the month lands if the pace so far continues (running month only).
  const projectedDays =
    isCurrentMonth && done > 0 ? Math.min(days, Math.round((done / todayDate) * days)) : 0;
  const projected = projectedDays * settings.dailyValue;
  const unmarkedUntilToday = isCurrentMonth && completed.slice(0, todayDate).some((c) => !c);

  useEffect(() => {
    const changed = lastMonth.current !== key;
    lastMonth.current = key;
    if (changed) {
      prevProgress.current = progress;
      setError(null);
      setConfirmReset(false);
      return;
    }
    const hit = MILESTONES.find((m) => progress >= m && prevProgress.current < m);
    let t: ReturnType<typeof setTimeout> | undefined;
    if (hit !== undefined) {
      setMilestone(hit);
      t = setTimeout(() => setMilestone(null), 3500);
    }
    prevProgress.current = progress;
    return () => {
      if (t) clearTimeout(t);
    };
  }, [progress, key]);

  const apply = async () => {
    if (!userId || saveLock.current) return;
    const g = Number(goalIn),
      d = Number(dailyIn);
    if (!goalIn || !dailyIn || g <= 0 || d <= 0) {
      setError("Informe valores maiores que zero para a meta e o valor por dia.");
      return;
    }
    setError(null);
    const next = { goal: g, dailyValue: d };
    saveLock.current = true;
    setSaving(true);
    try {
      const updated_at = new Date().toISOString();
      if (activeExtra) {
        const { error: saveError } = await supabase
          .from("goals")
          .update({ goal: g, daily_value: d, updated_at })
          .eq("id", activeExtra.id);
        if (saveError) throw saveError;
        setGoals((list) => list.map((x) => (x.id === activeExtra.id ? { ...x, goal: g, dailyValue: d } : x)));
      } else {
        const { error: saveError } = await supabase
          .from("goal_settings")
          .upsert({ user_id: userId, goal: g, daily_value: d, updated_at });
        if (saveError) throw saveError;
        setSettings(next);
      }
    } catch {
      setError("Não foi possível salvar os valores. Verifique sua conexão e tente novamente.");
    } finally {
      saveLock.current = false;
      setSaving(false);
    }
  };

  const suggestDaily = () => {
    const g = Number(goalIn);
    if (g > 0) setDailyIn((g / days).toFixed(2));
  };

  const reset = () => {
    persist(emptyDays(days));
    setConfirmReset(false);
  };

  // Read the latest state (not the render snapshot) so quick taps never drop a day.
  const toggle = (i: number) => {
    const current = normalize(progressRef.current[key], days);
    rememberUndo(current, `Dia ${i + 1} ${current[i] ? "desmarcado" : "marcado"}.`);
    persist(current.map((c, j) => (j === i ? !c : c)));
    setPopIdx(i);
    clearTimeout(popTimer.current);
    popTimer.current = setTimeout(() => setPopIdx(null), 450);
    try {
      navigator.vibrate?.(8);
    } catch {
      // Haptics are optional.
    }
  };

  // Catch up: marks every day up to today as deposited (never unmarks anything).
  const markUntilToday = () => {
    const current = normalize(progressRef.current[key], days);
    rememberUndo(current, "Dias até hoje marcados.");
    persist(current.map((c, j) => c || j < todayDate));
  };

  // Marks the next day exactly like the Guardar button, then saves its custom amount / note.
  // The day stays marked even if the detail cannot be saved (a tap is never rolled back).
  const guardWithDetail = async (detail: DayDetail) => {
    if (nextDay < 0) return;
    const day = nextDay + 1;
    toggle(nextDay);
    setQuickOpen(false);
    if (detail.amount === null && detail.note === "") {
      setQuickNotice(null);
      return;
    }
    const ok = await saveDayDetail(day, detail);
    setQuickNotice(
      ok
        ? null
        : `Dia ${day} marcado, mas não foi possível salvar o valor ou a anotação. Tente de novo em "Detalhes dos depósitos".`,
    );
  };

  const signOut = async () => {
    if (saveLock.current) return;
    if (Object.keys(dirty.current).length > 0) {
      setSaveError("Aguarde: ainda estamos salvando seus dias marcados antes de sair.");
      if (userId) void flush(userId);
      return;
    }
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  };

  if (loading) {
    return (
      <div className="bg-page flex min-h-screen items-center justify-center font-sans text-foreground">
        <p className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
          <Loader2 className="size-4 animate-spin" />
          Carregando sua meta…
        </p>
      </div>
    );
  }

  if (loadFailed) {
    return (
      <main className="bg-page flex min-h-screen flex-col items-center justify-center gap-4 px-4 text-foreground">
        <TriangleAlert className="size-6 text-destructive" />
        <p role="alert" className="max-w-md text-center text-sm">{error}</p>
        <Button onClick={() => setLoadAttempt((attempt) => attempt + 1)}>Tentar novamente</Button>
        <Button variant="ghost" onClick={signOut}>Sair da conta</Button>
      </main>
    );
  }

  return (
    <div className="bg-page min-h-screen px-4 py-6 font-sans text-foreground transition-colors duration-300 sm:px-8 sm:py-10">
      <main className="mx-auto w-full max-w-5xl">
        <div className="mb-5 flex items-center justify-between border-b border-border pb-5">
          <div className="flex items-center gap-2 text-primary">
            <Target className="size-5" strokeWidth={2.5} />
            <span className="label-caps">Desafio de {days} dias</span>
          </div>
          <div className="flex items-center gap-2">
            {profileName && (
              <span className="hidden text-sm font-semibold text-muted-foreground sm:block">
                Olá, {profileName}
              </span>
            )}
            <Button asChild variant="outline" size="icon" title="Histórico e conquistas" className="size-10 rounded-full border-border bg-card text-muted-foreground shadow-card hover:text-foreground">
              <Link to="/historico" aria-label="Histórico e conquistas">
                <BarChart3 className="size-4" />
              </Link>
            </Button>
            <Button asChild variant="outline" size="icon" title="Configurações" className="size-10 rounded-full border-border bg-card text-muted-foreground shadow-card hover:text-foreground">
              <Link to="/configuracoes" aria-label="Configurações">
                <SettingsIcon className="size-4" />
              </Link>
            </Button>
            <Button
              variant="outline"
              size="icon"
              title={dark ? "Ativar modo claro" : "Ativar modo escuro"}
              onClick={() => setDark((d) => !d)}
              aria-label={dark ? "Ativar modo claro" : "Ativar modo escuro"}
              className="grid size-10 place-items-center rounded-full border border-border bg-card text-muted-foreground shadow-card transition hover:text-foreground"
            >
              {dark ? <Sun className="size-4" /> : <Moon className="size-4" />}
            </Button>
            <Button
              variant="outline"
              size="icon"
              title="Sair da conta"
              disabled={saving || pendingCount > 0}
              onClick={signOut}
              aria-label="Sair da conta"
              className="grid size-10 place-items-center rounded-full border border-border bg-card text-muted-foreground shadow-card transition hover:text-destructive"
            >
              <LogOut className="size-4" />
            </Button>
          </div>
        </div>

        {goals.length > 0 && (
          <nav aria-label="Metas" className="mb-5 flex flex-wrap gap-2">
            {[{ id: MAIN_GOAL, name: "Meta principal" }, ...goals].map((g) => (
              <button
                key={g.id}
                type="button"
                aria-pressed={(activeExtra ? activeGoal : MAIN_GOAL) === g.id}
                onClick={() => setActiveGoal(g.id)}
                className={`rounded-full border px-4 py-1.5 text-sm font-bold transition-colors ${
                  (activeExtra ? activeGoal : MAIN_GOAL) === g.id
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-card text-muted-foreground hover:text-foreground"
                }`}
              >
                {g.name}
              </button>
            ))}
          </nav>
        )}

        <section aria-label="Meses" className="mb-8 border-b border-border pb-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-baseline gap-3">
              <span className="label-caps text-primary">Meses</span>
              <span className="font-display text-sm font-semibold italic text-muted-foreground">
                {MONTHS[month]} de {year}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="mr-1 text-sm font-extrabold tabular-nums">{year}</span>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setYear((y) => y - 1)}
                aria-label={`Ver o ano ${year - 1}`}
                className="grid size-8 place-items-center rounded-md border-border bg-card text-muted-foreground shadow-none transition hover:text-foreground"
              >
                <ChevronLeft className="size-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setYear((y) => y + 1)}
                aria-label={`Ver o ano ${year + 1}`}
                className="grid size-8 place-items-center rounded-md border-border bg-card text-muted-foreground shadow-none transition hover:text-foreground"
              >
                <ChevronRight className="size-4" />
              </Button>
            </div>
          </div>

          <div
            ref={stripRef}
            className="-mx-1 mt-3 flex gap-1.5 overflow-x-auto px-1 pb-1"
          >
            {MONTHS_SHORT.map((label, m) => {
              const mKey = monthKey(year, m);
              const pct = summaries[mKey] ?? 0;
              const active = m === month;
              return (
                <button
                  key={mKey}
                  type="button"
                  data-month={m}
                  onClick={() => setMonth(m)}
                  aria-pressed={active}
                  title={`${MONTHS[m]} de ${year} · ${Math.round(pct)}% da meta`}
                  className={`min-w-[3.25rem] flex-1 shrink-0 rounded-lg border px-2 pb-2 pt-1.5 text-center transition-colors duration-150 ${
                    active
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-card text-muted-foreground hover:border-primary/40 hover:text-foreground"
                  }`}
                >
                  <span className="block text-xs font-bold">{label}</span>
                  <span
                    className={`mt-1.5 block h-1 w-full overflow-hidden rounded-full ${
                      active ? "bg-primary-foreground/25" : "bg-muted"
                    }`}
                  >
                    <span
                      className={`block h-full rounded-full transition-all duration-500 ${
                        active ? "bg-primary-foreground" : "bg-progress"
                      }`}
                      style={{ width: `${pct}%` }}
                    />
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        <header className="mb-8 flex flex-wrap items-end justify-between gap-5">
          <div>
            <h1 className="font-display text-4xl font-semibold tracking-tight sm:text-5xl">
              {activeExtra ? activeExtra.name : "Minha Meta Mensal"}
            </h1>
            <p className="mt-3 max-w-xl text-muted-foreground">
              Um dia de cada vez. Um objetivo cada vez mais perto.
            </p>
          </div>
          <span className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
            <CalendarDays className="size-4" />
            {daysLeft} dias restantes
          </span>
        </header>

        <section className="transition-colors duration-300">
          <div className="shadow-panel grid gap-4 rounded-xl border border-border bg-card px-4 py-5 sm:grid-cols-[1fr_1fr_auto] sm:items-center sm:px-6">
            <Field id="goal" label="Meta mensal" value={goalIn} onChange={setGoalIn} />
            <div>
              <Field id="daily" label="Valor por dia" value={dailyIn} onChange={setDailyIn} />
              <Button
                variant="link"
                size="sm"
                onClick={suggestDaily}
                className="mt-1 h-auto justify-start gap-1 p-0 text-xs font-semibold"
              >
                <Wand2 className="size-3" />
                Sugerir: meta ÷ {days} dias
              </Button>
            </div>
            <Button
              onClick={apply}
              disabled={saving}
              className="h-11 self-start px-6 font-bold sm:mt-6"
              title="Aplicar os valores da meta"
            >
              Aplicar
            </Button>
          </div>

          {saveError && (
            <p role="alert" className="mt-3 flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm font-semibold text-destructive">
              <TriangleAlert className="size-4 shrink-0" />
              {saveError}
            </p>
          )}

          {error && (
            <p className="mt-3 flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm font-semibold text-destructive">
              <TriangleAlert className="size-4 shrink-0" />
              {error}
            </p>
          )}

          <div className="my-8 grid grid-cols-2 gap-x-5 gap-y-6 lg:grid-cols-4">
            <Stat label="Já guardado" value={money(animatedSaved)} highlight />
            <Stat label="Falta guardar" value={money(remaining)} />
            <Stat label="Dias concluídos" value={`${done} de ${days}`} />
            <Stat
              label={daysLeft > 0 ? "Por dia restante" : "Melhor sequência"}
              value={daysLeft > 0 ? money(perDayNeeded) : `${bestRun} dias`}
              hint={streak > 1 ? `Sequência: ${streak} dias` : undefined}
            />
          </div>

          <div className="border-y border-border py-6">
            <div className="mb-3 flex items-baseline justify-between">
              <span className="label-caps text-muted-foreground">Progresso da meta</span>
              <span className="font-display text-3xl font-semibold tabular-nums text-primary">
                {Math.round(progress)}%
              </span>
            </div>
            <div
              className="relative h-2 overflow-hidden rounded-full bg-muted"
              role="progressbar"
              aria-label="Progresso da meta"
              aria-valuenow={Math.round(progress)}
              aria-valuemin={0}
              aria-valuemax={100}
            >
              <div
                className="bg-progress h-full rounded-full transition-all duration-700 ease-out"
                style={{ width: `${progress}%` }}
              />
              {MILESTONES.slice(0, 3).map((m) => (
                <span
                  key={m}
                  className="absolute top-0 h-full w-px bg-foreground/15"
                  style={{ left: `${m}%` }}
                />
              ))}
            </div>
            <div className="mt-1.5 flex justify-between text-[0.65rem] font-bold text-muted-foreground">
              {MILESTONES.map((m) => (
                <span key={m} className={progress >= m ? "text-primary" : ""}>
                  {m}%
                </span>
              ))}
            </div>
            <p className="mt-4 text-sm font-semibold text-muted-foreground">
              {motivational(progress)}
            </p>
            {projectedDays > 0 && daysLeft > 0 && (
              <p className="mt-1 text-sm text-muted-foreground">
                Mantendo o ritmo até aqui, você fecha o mês com {money(projected)}
                {projected >= settings.goal ? " e bate a meta." : "."}
              </p>
            )}
          </div>

          {isCurrentMonth && (
            <InsightsPanel
              input={{
                completed,
                year,
                month,
                today: todayDate,
                dailyValue: settings.dailyValue,
                goal: settings.goal,
                money,
                savedExtra: bonusFor(completed, detailsForKey, settings.dailyValue),
              }}
            />
          )}

          <PlannerPanel
            today={{ y: NOW.getFullYear(), m: NOW.getMonth() + 1, d: todayDate }}
            daysInMonth={days}
            currentDaily={settings.dailyValue}
            money={money}
            onApply={(g, d) => {
              setGoalIn(String(g));
              setDailyIn(String(d));
              const field = document.getElementById("goal");
              field?.scrollIntoView({ behavior: "smooth", block: "center" });
              (field as HTMLInputElement | null)?.focus({ preventScroll: true });
            }}
          />

          <DayDetailsPanel
            monthLabel={MONTHS[month]!.toLowerCase()}
            completed={completed}
            details={detailsForKey}
            dailyValue={settings.dailyValue}
            money={money}
            available={detailsAvailable}
            onSave={saveDayDetail}
          />

          <div className="mb-5 mt-8 flex flex-wrap items-end justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold">Calendário de depósitos</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {money(settings.dailyValue)} por depósito · {done} de {days} concluídos
              </p>
            </div>
            {confirmReset ? (
              <div className="flex items-center gap-2">
                <Button
                  variant="destructive"
                  onClick={reset}
                  className="rounded-lg bg-destructive px-3 py-2 text-sm font-semibold text-destructive-foreground transition hover:opacity-90"
                >
                  Confirmar
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setConfirmReset(false)}
                  className="rounded-lg border border-border px-3 py-2 text-sm font-semibold text-muted-foreground transition hover:text-foreground"
                >
                  Cancelar
                </Button>
              </div>
            ) : (
              <Button
                variant="ghost"
                onClick={() => setConfirmReset(true)}
                className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-semibold text-muted-foreground transition hover:text-destructive"
              >
                <RotateCcw className="size-4" />
                Reiniciar
              </Button>
            )}
          </div>

          <div className="mb-4 flex flex-wrap gap-2">
            <InfoChip
              icon={<Flame className="size-4" />}
              label="Sequência atual"
              value={`${streak} ${streak === 1 ? "dia" : "dias"}`}
              active={streak > 0}
            />
            <InfoChip
              icon={<Trophy className="size-4" />}
              label="Melhor do mês"
              value={`${bestRun} ${bestRun === 1 ? "dia" : "dias"}`}
              active={bestRun > 0}
            />
          </div>

          <div className="mb-2 grid grid-cols-7 gap-1.5 sm:gap-2">
            {WEEKDAYS.map((w) => (
              <span
                key={w}
                className="label-caps pb-1 text-center text-muted-foreground"
              >
                {w}
              </span>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
            {Array.from({ length: firstWeekday }).map((_, i) => (
              <span key={`offset-${i}`} aria-hidden="true" />
            ))}
            {completed.map((c, i) => {
              const weekday = new Date(year, month, i + 1).getDay();
              const weekend = weekday === 0 || weekday === 6;
              const isToday = isCurrentMonth && i + 1 === todayDate;
              return (
                // Remounting on month/goal change replays the staggered entrance.
                <span
                  key={`${key}-${i}`}
                  className="cell-in grid place-items-center"
                  style={{ animationDelay: `${Math.min(i * 14, 420)}ms` }}
                >
                  <Button
                    variant="outline"
                    type="button"
                    onClick={() => toggle(i)}
                    aria-label={`${i + 1} de ${MONTHS[month]}, ${money(settings.dailyValue)}`}
                    aria-pressed={c}
                    className={`relative flex aspect-square h-auto w-full max-w-[5.5rem] flex-col items-center justify-center gap-0 rounded-full border p-1 shadow-none transition-all duration-150 active:scale-90 ${
                      popIdx === i ? "coin-pop" : ""
                    } ${i === nextDay && !c ? "pulse-ring" : ""} ${
                      c
                        ? "border-primary bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground"
                        : isToday
                          ? "border-accent bg-accent/10 text-foreground"
                          : i === nextDay
                            ? "border-primary bg-background text-foreground ring-2 ring-ring/30"
                            : weekend
                              ? "border-border bg-muted/40 text-muted-foreground hover:border-primary/50 hover:bg-secondary"
                              : "border-border bg-background text-foreground hover:border-primary/50 hover:bg-secondary"
                    }`}
                  >
                    <Check
                      className={`absolute left-1/2 top-[13%] size-3 -translate-x-1/2 transition-all duration-200 ${
                        c ? "scale-100 opacity-100" : "scale-50 opacity-0"
                      }`}
                      strokeWidth={3}
                    />
                    <span className="text-sm font-extrabold sm:text-base">{i + 1}</span>
                    <span className="hidden text-[0.6rem] font-bold opacity-70 sm:block">
                      {money(settings.dailyValue)}
                    </span>
                  </Button>
                </span>
              );
            })}
          </div>

          {nextDay >= 0 && (
            <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-b border-border pb-6">
              <span className="flex items-center gap-2 text-sm text-muted-foreground">
                <Wallet className="size-4" />
                Próximo depósito: dia {nextDay + 1} de {MONTHS[month]}
              </span>
              <div className="flex flex-wrap items-center gap-2">
                {unmarkedUntilToday && (
                  <Button
                    variant="outline"
                    onClick={markUntilToday}
                    title="Marca todos os dias até hoje como depositados"
                    className="h-10 font-semibold"
                  >
                    <Check />
                    Marcar dias até hoje
                  </Button>
                )}
                <Button onClick={() => toggle(nextDay)} className="h-10 font-semibold">
                  Guardar {money(settings.dailyValue)}
                  <ArrowUpRight />
                </Button>
                {detailsAvailable && (
                  <Button
                    type="button"
                    variant="outline"
                    aria-expanded={quickOpen}
                    aria-label="Guardar com outro valor ou anotação"
                    title="Guardar com outro valor ou anotação"
                    onClick={() => {
                      setQuickNotice(null);
                      setQuickOpen((v) => !v);
                    }}
                    className="h-10 gap-2 font-semibold"
                  >
                    <Pencil />
                    Outro valor
                  </Button>
                )}
              </div>
              {quickOpen && (
                <QuickDepositForm
                  key={`${key}-${nextDay}`}
                  day={nextDay + 1}
                  dailyValue={settings.dailyValue}
                  money={money}
                  onSubmit={(detail) => void guardWithDetail(detail)}
                  onCancel={() => setQuickOpen(false)}
                />
              )}
              {quickNotice && (
                <p aria-live="polite" className="w-full text-sm font-semibold text-destructive">
                  {quickNotice}
                </p>
              )}
            </div>
          )}

          {saved >= settings.goal && (
            <div className="mt-8 flex items-center justify-center gap-3 rounded-lg border border-accent bg-accent/15 p-4 font-bold text-foreground">
              <Trophy className="size-5 text-accent" />
              Meta alcançada! Continue construindo esse hábito.
            </div>
          )}

          <p role="status" className="mt-8 text-center text-xs text-muted-foreground">
            {pendingCount > 0
              ? saveError
                ? "Aguardando conexão para salvar na sua conta…"
                : "Salvando na sua conta…"
              : saving
                ? "Salvando na sua conta…"
                : "Progresso salvo na sua conta, com segurança"}
          </p>
        </section>
      </main>

      {undoLabel && (
        <div className="pointer-events-none fixed inset-x-0 bottom-6 z-50 flex justify-center px-4">
          <div
            aria-live="polite"
            className="pointer-events-auto flex items-center gap-3 rounded-full border border-border bg-card py-2 pl-5 pr-2 text-sm font-semibold shadow-card"
          >
            <span>{undoLabel}</span>
            <Button type="button" variant="outline" className="h-8 rounded-full px-4 font-bold" onClick={undo}>
              Desfazer
            </Button>
          </div>
        </div>
      )}
      {milestone === 100 && (
        <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-40">
          <Confetti count={22} />
        </div>
      )}
      {milestone !== null && (
        <div className="pointer-events-none fixed inset-x-0 top-6 z-50 flex justify-center px-4">
          <div className="flex items-center gap-2 rounded-full border border-border bg-card px-5 py-2.5 text-sm font-bold text-primary shadow-card">
            <Trophy className="size-4" />
            {milestone === 100 ? "100% — Meta alcançada!" : `${milestone}% da meta alcançados`}
          </div>
        </div>
      )}
    </div>
  );
}

function Field({
  id,
  label,
  value,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <label htmlFor={id} className="label-caps mb-2 block text-muted-foreground">
        {label}
      </label>
      <div className="flex overflow-hidden rounded-lg border border-input bg-background transition focus-within:ring-2 focus-within:ring-ring">
        <span className="grid place-items-center border-r border-input bg-muted px-3 text-sm font-bold text-muted-foreground">
          {currencySymbol(CURRENCY)}
        </span>
        <input
          id={id}
          type="number"
          min="0.01"
          step="0.01"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full min-w-0 bg-transparent px-3 py-2.5 font-bold outline-none"
        />
      </div>
    </div>
  );
}

function InfoChip({
  icon,
  label,
  value,
  active,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  active: boolean;
}) {
  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-sm transition-colors ${
        active
          ? "border-accent/50 bg-accent/10 text-foreground"
          : "border-border bg-card text-muted-foreground"
      }`}
    >
      <span className={active ? "text-accent" : ""}>{icon}</span>
      <span className="text-muted-foreground">{label}</span>
      <strong className="font-bold tabular-nums">{value}</strong>
    </span>
  );
}

function Stat({
  label,
  value,
  hint,
  highlight = false,
}: {
  label: string;
  value: string;
  hint?: string | undefined;
  highlight?: boolean;
}) {
  return (
    <div className="min-w-0 border-l border-border pl-4">
      <small className="label-caps block text-muted-foreground">{label}</small>
      <strong
        className={`font-display mt-1.5 block text-2xl font-semibold tabular-nums tracking-tight sm:text-3xl ${
          highlight ? "text-primary" : "text-foreground"
        }`}
      >
        {value}
      </strong>
      {hint && <small className="mt-0.5 block text-xs font-semibold text-primary">{hint}</small>}
    </div>
  );
}
