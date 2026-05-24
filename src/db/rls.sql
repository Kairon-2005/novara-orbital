-- ============================================================
-- Novara — Row-Level Security Policies
-- Run AFTER schema.sql
-- ============================================================

-- Helper: returns the student_id linked to the current parent session
create or replace function get_linked_student_id()
returns uuid language sql security definer as $$
  select student_id from parent_links
  where parent_id = auth.uid()
  limit 1;
$$;

-- ── AUTO-CREATE PROFILE ON SIGNUP ────────────────────────────
-- Runs server-side (SECURITY DEFINER) so RLS is bypassed.
-- signup/join pages pass display_name + role in signUp options.data.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, role, display_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'role', 'student'),
    coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1))
  );

  -- Create empty student_profile row for students
  if coalesce(new.raw_user_meta_data->>'role', 'student') = 'student' then
    insert into public.student_profiles (user_id) values (new.id);
  end if;

  return new;
end;
$$;

create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ── PROFILES ─────────────────────────────────────────────────

alter table profiles enable row level security;
create policy "users read own profile"    on profiles for select using (id = auth.uid());
create policy "users update own profile"  on profiles for update using (id = auth.uid());
-- No INSERT policy needed — trigger handles creation via SECURITY DEFINER

alter table student_profiles enable row level security;
create policy "student owns profile"       on student_profiles for all    using (user_id = auth.uid());
create policy "parent reads child profile" on student_profiles for select using (user_id = get_linked_student_id());

alter table parent_links enable row level security;
create policy "parent reads own link"      on parent_links for select using (parent_id = auth.uid());
create policy "student reads own link"     on parent_links for select using (student_id = auth.uid());
create policy "parent inserts own link"    on parent_links for insert with check (parent_id = auth.uid());

-- ── ROADMAP ───────────────────────────────────────────────────

alter table roadmaps enable row level security;
create policy "student owns roadmaps"     on roadmaps for all    using (student_id = auth.uid());
create policy "parent reads child roadmap" on roadmaps for select using (student_id = get_linked_student_id());

alter table milestones enable row level security;
create policy "student owns milestones"   on milestones for all    using (
  roadmap_id in (select id from roadmaps where student_id = auth.uid())
);
create policy "parent reads child milestones" on milestones for select using (
  roadmap_id in (select id from roadmaps where student_id = get_linked_student_id())
);

alter table roadmap_generation_quota enable row level security;
create policy "student owns quota"        on roadmap_generation_quota for all using (user_id = auth.uid());

-- ── CALENDAR ──────────────────────────────────────────────────

alter table calendar_events enable row level security;
create policy "student owns events"       on calendar_events for all    using (student_id = auth.uid());
create policy "parent reads child events" on calendar_events for select using (student_id = get_linked_student_id());

-- ── PORTFOLIO ─────────────────────────────────────────────────

alter table achievements enable row level security;
create policy "student owns achievements"       on achievements for all    using (student_id = auth.uid());
create policy "parent reads child achievements" on achievements for select using (student_id = get_linked_student_id());

alter table readiness_scores enable row level security;
create policy "student owns score"              on readiness_scores for all    using (student_id = auth.uid());
create policy "parent reads child score"        on readiness_scores for select using (student_id = get_linked_student_id());

-- ── COMMUNICATIONS ────────────────────────────────────────────

alter table school_communications enable row level security;
create policy "student owns comms"              on school_communications for all    using (student_id = auth.uid());
create policy "parent reads child comms"        on school_communications for select using (student_id = get_linked_student_id());

alter table parent_drafts enable row level security;
create policy "student sees own drafts"         on parent_drafts for all    using (student_id = auth.uid());
create policy "parent sees own drafts"          on parent_drafts for all    using (parent_id  = auth.uid());

-- ── FINANCE ───────────────────────────────────────────────────

alter table fee_items enable row level security;
create policy "student owns fees"               on fee_items for all    using (student_id = auth.uid());
create policy "parent reads child fees"         on fee_items for select using (student_id = get_linked_student_id());

alter table insurance_policies enable row level security;
create policy "student owns insurance"          on insurance_policies for all    using (student_id = auth.uid());
create policy "parent reads child insurance"    on insurance_policies for select using (student_id = get_linked_student_id());

alter table expense_logs enable row level security;
create policy "student owns expenses"           on expense_logs for all    using (student_id = auth.uid());
create policy "parent reads child expenses"     on expense_logs for select using (student_id = get_linked_student_id());

-- ── WELLNESS ──────────────────────────────────────────────────

alter table emergency_contacts enable row level security;
create policy "student owns contacts"           on emergency_contacts for all    using (student_id = auth.uid());
create policy "parent reads child contacts"     on emergency_contacts for select using (student_id = get_linked_student_id());

alter table medical_appointments enable row level security;
create policy "student owns appointments"       on medical_appointments for all    using (student_id = auth.uid());
create policy "parent reads child appointments" on medical_appointments for select using (student_id = get_linked_student_id());

-- ── HOMESTAY ──────────────────────────────────────────────────

alter table homestay_listings enable row level security;
create policy "anyone can read listings"        on homestay_listings for select using (is_active = true);

alter table homestay_reviews enable row level security;
create policy "anyone reads reviews"            on homestay_reviews for select using (true);
create policy "student writes own review"       on homestay_reviews for insert with check (reviewer_id = auth.uid());

alter table homestay_saves enable row level security;
create policy "user owns saves"                 on homestay_saves for all using (user_id = auth.uid());

-- ── COMMUNITY ─────────────────────────────────────────────────

alter table community_posts enable row level security;
create policy "anyone reads approved posts"     on community_posts for select using (moderation_status = 'approved');
create policy "student creates post"            on community_posts for insert with check (author_id = auth.uid());
create policy "student updates own post"        on community_posts for update using (author_id = auth.uid());

alter table post_saves enable row level security;
create policy "user owns post saves"            on post_saves for all using (user_id = auth.uid());
