-- Pro shops write ball weight as pounds.ounces (15.3 = 15 lb 3 oz) and the
-- VLS → dual-angle conversion yields a VAL angle to one decimal. All three
-- columns were integers, so those saves were rejected by Postgres.
alter table balls
  alter column weight_lbs type numeric(4,1),
  alter column drilling_angle type numeric(5,1),
  alter column val_angle type numeric(5,1);
