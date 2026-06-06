-- Per-year free-generation counter, so the yearly free allowance can be > 1.
-- The counter resets in code when the calendar year changes. Idempotent.

alter table roadmap_generation_quota
  add column if not exists free_used_this_year int not null default 0;
