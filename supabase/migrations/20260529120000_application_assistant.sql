-- School Application Assistant
-- Extends university_targets with an official-website link and persisted AI
-- gap analysis (current profile vs. this target). Idempotent — safe to re-run.

alter table university_targets add column if not exists reference_link text not null default '';
alter table university_targets add column if not exists gap_analysis   text not null default '';
alter table university_targets add column if not exists gap_score      int;
alter table university_targets add column if not exists gap_updated_at  timestamptz;
