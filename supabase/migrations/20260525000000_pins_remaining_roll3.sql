-- Add pins_remaining_roll3 to track which pins remain after roll 3 of frame 10.
-- Enables precise per-shot pin visualization for the 10th frame instead of
-- inferring R3 state from roll counts.
alter table public.frames add column if not exists pins_remaining_roll3 jsonb;
