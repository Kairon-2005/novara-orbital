-- Structured admission target fields captured during onboarding, used by the
-- dimension assessment and the roadmap. Kept as free text (validated in the app)
-- to avoid CHECK-constraint mismatches. Idempotent — safe to re-run.

alter table student_profiles add column if not exists application_route  text; -- IB | A_Level | AP | Gaokao | Other | Unknown
alter table student_profiles add column if not exists target_school      text; -- NUS | NTU | Both
alter table student_profiles add column if not exists programme_category text; -- CS_AI_Data | Business_Finance_Econ | Engineering
