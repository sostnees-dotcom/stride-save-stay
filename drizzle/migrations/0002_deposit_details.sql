-- Optional per-day details for a marked deposit: a custom amount and/or a short note.
-- The marked days themselves stay in monthly_progress / goal_progress; this table only
-- adds information, so the app keeps working if it is empty or missing.
CREATE TABLE IF NOT EXISTS public.deposit_details (
  user_id uuid NOT NULL,
  -- 'main' for the main goal, otherwise the id of a row in public.goals (as text).
  goal_id text NOT NULL DEFAULT 'main',
  month text NOT NULL CHECK (month ~ '^[0-9]{4}-(0[1-9]|1[0-2])$'),
  day smallint NOT NULL CHECK (day BETWEEN 1 AND 31),
  amount numeric CHECK (amount IS NULL OR (amount >= 0 AND amount <= 10000000)),
  note text CHECK (note IS NULL OR char_length(note) <= 200),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, goal_id, month, day)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.deposit_details TO authenticated;
GRANT ALL ON public.deposit_details TO service_role;
ALTER TABLE public.deposit_details ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own details select" ON public.deposit_details FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "own details insert" ON public.deposit_details FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own details update" ON public.deposit_details FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own details delete" ON public.deposit_details FOR DELETE TO authenticated USING (auth.uid() = user_id);
