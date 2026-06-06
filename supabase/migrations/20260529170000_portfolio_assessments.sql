-- Dimension-based Portfolio Assessment results.
-- One row per assessment run; `result` holds the full structured assessment.
-- Idempotent — safe to re-run.

create table if not exists portfolio_assessments (
  id              uuid primary key default gen_random_uuid(),
  student_id      uuid not null references profiles on delete cascade,
  overall_level   text not null,
  overall_summary text not null default '',
  confidence      text not null default 'medium',
  result          jsonb not null,
  created_at      timestamptz default now()
);

create index if not exists portfolio_assessments_student_created_idx
  on portfolio_assessments (student_id, created_at desc);

alter table portfolio_assessments enable row level security;

-- Students fully manage their own assessments
drop policy if exists "students manage own assessments" on portfolio_assessments;
create policy "students manage own assessments"
  on portfolio_assessments for all
  using (auth.uid() = student_id)
  with check (auth.uid() = student_id);

-- Parents can read their linked child's assessments
drop policy if exists "parents read linked assessments" on portfolio_assessments;
create policy "parents read linked assessments"
  on portfolio_assessments for select
  using (exists (
    select 1 from parent_links
    where parent_links.parent_id  = auth.uid()
      and parent_links.student_id = portfolio_assessments.student_id
  ));
