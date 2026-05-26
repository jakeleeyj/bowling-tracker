-- Normalize legacy venue strings on sessions to match the canonical preset
-- list in src/lib/venues.ts.
update public.sessions set venue = 'SuperBowl - Toa Payoh'
where venue in ('Pinenergy', 'Monday TPY');

update public.sessions set venue = 'Forte Bowl'
where venue = 'Forte';
