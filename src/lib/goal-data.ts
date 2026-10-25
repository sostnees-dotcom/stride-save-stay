import { supabase } from "@/integrations/supabase/client";
import { bonusByKey } from "@/lib/deposit-details";
import { fetchDetails } from "@/lib/deposit-details-db";
import { MAIN_GOAL, daysIn, parseProgressKey, progressKey, type GoalInfo } from "@/lib/goals";

export type AccountData = {
  userId: string;
  displayName: string;
  currency: string;
  theme: string;
  goals: GoalInfo[];
  progress: Record<string, boolean[]>;
  /** Extra money per progress key from custom deposit amounts (empty when none or unavailable). */
  bonus: Record<string, number>;
};

const normalize = (raw: unknown, days: number) => {
  const arr = Array.isArray(raw) ? raw : [];
  return Array.from({ length: days }, (_, i) => Boolean(arr[i]));
};

/** Loads every goal and saved month for the signed-in account (read-only views). */
export async function loadAccountData(): Promise<AccountData> {
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) throw new Error("Session unavailable");
  const [prof, main, extras, mp, gp] = await Promise.all([
    supabase.from("profiles").select("display_name, currency, theme").eq("id", user.id).maybeSingle(),
    supabase.from("goal_settings").select("goal, daily_value").eq("user_id", user.id).maybeSingle(),
    supabase.from("goals").select("id, name, goal, daily_value").eq("user_id", user.id).order("created_at"),
    supabase.from("monthly_progress").select("month, completed").eq("user_id", user.id),
    supabase.from("goal_progress").select("goal_id, month, completed").eq("user_id", user.id),
  ]);
  if (main.error || extras.error || mp.error || gp.error) throw new Error("Unable to load");
  const goals: GoalInfo[] = [
    {
      id: MAIN_GOAL,
      name: "Meta principal",
      goal: Number(main.data?.goal ?? 600),
      dailyValue: Number(main.data?.daily_value ?? 20),
    },
    ...(extras.data ?? []).map((g) => ({
      id: g.id,
      name: g.name,
      goal: Number(g.goal),
      dailyValue: Number(g.daily_value),
    })),
  ];
  const progress: Record<string, boolean[]> = {};
  const add = (k: string, raw: unknown) => {
    const p = parseProgressKey(k);
    if (p) progress[k] = normalize(raw, daysIn(p.y, p.m));
  };
  for (const r of mp.data ?? []) add(r.month, r.completed);
  for (const r of gp.data ?? []) add(progressKey(r.goal_id, r.month), r.completed);
  // Include taps from this device that are still waiting to reach the account.
  try {
    const pending = JSON.parse(localStorage.getItem(`monthlyGoalPending:${user.id}`) ?? "{}");
    for (const [k, v] of Object.entries(pending ?? {})) add(k, v);
  } catch {
    // ignore unreadable backup
  }
  const detailsMap = await fetchDetails(user.id);
  const bonus = detailsMap
    ? bonusByKey(progress, detailsMap, (k) => {
        const p = parseProgressKey(k);
        return p ? goals.find((g) => g.id === p.goalId)?.dailyValue : undefined;
      })
    : {};
  return {
    userId: user.id,
    displayName: prof.data?.display_name ?? "",
    currency: prof.data?.currency ?? "BRL",
    theme: prof.data?.theme ?? "system",
    goals,
    progress,
    bonus,
  };
}

export function applyTheme(theme: string) {
  const dark =
    theme === "dark" ||
    (theme === "system" && window.matchMedia?.("(prefers-color-scheme: dark)").matches);
  document.documentElement.classList.toggle("dark", Boolean(dark));
  localStorage.setItem("monthlyGoalTheme", dark ? "dark" : "light");
  localStorage.setItem("monthlyGoalThemePref", theme);
}
