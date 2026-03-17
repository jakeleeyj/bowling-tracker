-- Add pins_remaining_roll2 to track which pins remain after roll 2
-- This enables showing knocked-on-roll-2 vs still-standing in pin diagrams
alter table public.frames add column if not exists pins_remaining_roll2 jsonb;
