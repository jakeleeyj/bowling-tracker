-- numeric(3,2) rounds fractions like 3/8 (0.375 → 0.38) and 3 3/8" pins
-- (3.375 → 3.38). Widen every inch-measurement column to keep 1/64" exact.
alter table balls
  alter column pin_to_pap type numeric(7,4),
  alter column pin_buffer type numeric(7,4),
  alter column psa_to_pap type numeric(7,4),
  alter column pap_over type numeric(7,4),
  alter column pap_up type numeric(7,4),
  alter column span type numeric(7,4),
  alter column thumb_pitch_forward type numeric(7,4),
  alter column thumb_pitch_lateral type numeric(7,4),
  alter column finger_pitch_forward type numeric(7,4),
  alter column finger_pitch_lateral type numeric(7,4),
  alter column finger_pitch_forward_2 type numeric(7,4),
  alter column finger_pitch_lateral_2 type numeric(7,4);

alter table flight_analyses
  alter column pin_to_pap type numeric(7,4);
