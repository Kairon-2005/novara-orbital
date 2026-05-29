-- Planned university enrollment year (drives the roadmap timeline length)
-- and persisted per-achievement XP (so the portfolio's gamified totals are
-- stable across reloads). Idempotent — safe to re-run.

alter table student_profiles add column if not exists target_enrollment_year int;

alter table achievements add column if not exists xp int;

-- Backfill XP for achievements created before this column existed.
update achievements
set xp = case category
  when 'competition' then 60
  when 'award'       then 50
  when 'academic'    then 40
  when 'cca'         then 35
  when 'volunteer'   then 30
  else 20
end
where xp is null;
