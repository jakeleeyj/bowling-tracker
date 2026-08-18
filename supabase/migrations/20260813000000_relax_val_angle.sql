-- Storm's strongest 2LS layouts place the pin past the VAL, which is a
-- negative VAL angle in dual-angle terms (e.g. their 3.5 x 4 x 6.5 example).
-- Relax the check so custom layouts entered as 2LS can be saved.
alter table balls drop constraint if exists balls_val_angle_check;
alter table balls add constraint balls_val_angle_check
  check (val_angle between -45 and 110);
