-- Link a saved ball to its bowwwl.com catalog entry so we can show the real
-- ball photo, and keep the asymmetric core's intermediate differential.
alter table balls add column if not exists catalog_id text;
alter table balls add column if not exists image_url text;
alter table balls add column if not exists intermediate_diff numeric(4,3)
  check (intermediate_diff between 0 and 0.060);
