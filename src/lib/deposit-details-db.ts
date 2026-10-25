import { supabase } from "@/integrations/supabase/client";
import { rowsToMap, type DayDetail, type DetailRow, type DetailsMap } from "@/lib/deposit-details";

// The table comes from migration 0002 and may not be in the generated client types yet,
// so it is reached through an untyped handle. Every call below fails soft.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const table = () => (supabase as any).from("deposit_details");

/** Loads every detail of the account. Returns null when the table is unavailable. */
export async function fetchDetails(userId: string): Promise<DetailsMap | null> {
  try {
    const { data, error } = await table()
      .select("goal_id, month, day, amount, note")
      .eq("user_id", userId);
    if (error) return null;
    return rowsToMap((data ?? []) as DetailRow[]);
  } catch {
    return null;
  }
}

/**
 * Saves (or clears) the detail of one day and waits for the account to confirm.
 * Returns true only when the change reached the database.
 */
export async function saveDetail(
  userId: string,
  goalId: string,
  month: string,
  day: number,
  detail: DayDetail,
): Promise<boolean> {
  try {
    if (detail.amount === null && detail.note === "") {
      const { error } = await table()
        .delete()
        .eq("user_id", userId)
        .eq("goal_id", goalId)
        .eq("month", month)
        .eq("day", day);
      return !error;
    }
    const { error } = await table().upsert({
      user_id: userId,
      goal_id: goalId,
      month,
      day,
      amount: detail.amount,
      note: detail.note === "" ? null : detail.note,
      updated_at: new Date().toISOString(),
    });
    return !error;
  } catch {
    return false;
  }
}
