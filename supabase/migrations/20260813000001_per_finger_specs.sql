-- Left and right finger holes are often drilled with different sizes and
-- pitches. Existing finger_* columns become the LEFT finger; these hold the
-- RIGHT finger (falls back to the left values when null).
alter table balls add column if not exists finger_size_2 text;
alter table balls add column if not exists finger_pitch_forward_2 numeric(3,2);
alter table balls add column if not exists finger_pitch_lateral_2 numeric(3,2);
