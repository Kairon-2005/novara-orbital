-- ============================================================
-- Novara — Database Schema (merged)
-- Combines Kairon's full feature set with teammate's additions:
--   schools table, student_documents, document_access,
--   nationality/age in student_profiles, preferred_language
--   in profiles, zone in homestay_listings
-- Run in Supabase SQL Editor on a fresh project.
-- ============================================================

-- ── USERS & PROFILES ─────────────────────────────────────────

create table profiles (
  id                 uuid primary key references auth.users on delete cascade,
  role               text not null check (role in ('student', 'parent')),
  display_name       text not null,
  preferred_language text default 'en' check (preferred_language in ('en', 'zh')),
  created_at         timestamptz default now()
);

create table student_profiles (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null references profiles on delete cascade,
  -- Background
  nationality         text,
  age                 int,
  current_year        text,
  current_school      text,
  current_curriculum  text check (current_curriculum in ('IB','A-Level','AP','O-Level','Not enrolled')),
  -- Goals
  target_university   text,
  target_programme    text,
  -- Profile
  interests           text,
  budget_range        text check (budget_range in ('<30k','30-50k','50-80k','>80k')),
  english_level       text check (english_level in ('Beginner','Intermediate','Advanced')),
  -- Invite
  invite_code         varchar(6) unique,
  onboarding_done     boolean default false,
  created_at          timestamptz default now(),
  updated_at          timestamptz default now(),
  unique (user_id)
);

create table parent_links (
  id          uuid primary key default gen_random_uuid(),
  parent_id   uuid not null references profiles on delete cascade,
  student_id  uuid not null references profiles on delete cascade,
  linked_at   timestamptz default now(),
  unique (parent_id, student_id)
);

-- ── SCHOOL NAVIGATOR ─────────────────────────────────────────
-- Curated school directory (manually maintained, demo data only)

create table schools (
  id           uuid primary key default gen_random_uuid(),
  school_name  text not null,
  slug         text unique not null,           -- URL-safe identifier e.g. "acs-international"
  school_type  text not null check (school_type in (
                 'primary','secondary','jc','poly','university',
                 'language_school','diploma'
               )),
  curriculum   text check (curriculum in ('IB','A-Level','AP','O-Level','Local','Mixed')),
  zone         text,                            -- Singapore district/area, TBC with teammate
  address      text,
  description  text,
  website      text,
  is_active    boolean default true,
  created_at   timestamptz default now()
);

-- ── ROADMAP ───────────────────────────────────────────────────

create table roadmaps (
  id           uuid primary key default gen_random_uuid(),
  student_id   uuid not null references profiles on delete cascade,
  status       text default 'active' check (status in ('active', 'archived')),
  raw_json     jsonb not null,
  generated_at timestamptz default now()
);

create table milestones (
  id          uuid primary key default gen_random_uuid(),
  roadmap_id  uuid not null references roadmaps on delete cascade,
  year        int  not null,
  month       int,
  type        text not null check (type in ('exam','competition','cca','application','academic','other')),
  title       text not null,
  description text,
  due_date    date,
  completed   boolean default false,
  created_at  timestamptz default now()
);

-- Freemium quota: first generation free + one free per calendar year
create table roadmap_generation_quota (
  user_id                  uuid primary key references profiles on delete cascade,
  first_generation_used    boolean   default false,
  last_free_generation_at  date,
  total_generations        int       default 0
);

-- ── CALENDAR ──────────────────────────────────────────────────

create table calendar_events (
  id                uuid primary key default gen_random_uuid(),
  student_id        uuid not null references profiles on delete cascade,
  title             text not null,
  event_date        date not null,
  type              text not null check (type in ('exam','application','cca','finance','health','personal','system')),
  source            text not null check (source in ('ai','manual','finance','system')),
  notes             text,
  reminder_sent_30d boolean default false,
  reminder_sent_7d  boolean default false,
  reminder_sent_3d  boolean default false,
  reminder_sent_1d  boolean default false,
  created_at        timestamptz default now()
);

-- ── PORTFOLIO ─────────────────────────────────────────────────

create table achievements (
  id          uuid primary key default gen_random_uuid(),
  student_id  uuid not null references profiles on delete cascade,
  category    text not null check (category in ('competition','academic','cca','volunteer','award','other')),
  title       text not null,
  date        date not null,
  description text,
  image_url   text,
  created_at  timestamptz default now()
);

create table readiness_scores (
  id            uuid primary key default gen_random_uuid(),
  student_id    uuid not null references profiles on delete cascade,
  score         int  not null check (score between 0 and 100),
  gap_analysis  text not null,
  calculated_at timestamptz default now(),
  unique (student_id)
);

-- ── DOCUMENTS ─────────────────────────────────────────────────
-- Student uploads stored in Supabase Storage; this table tracks metadata

create table student_documents (
  id          uuid primary key default gen_random_uuid(),
  student_id  uuid not null references profiles on delete cascade,
  file_name   text not null,
  storage_path text not null,              -- path inside Supabase Storage bucket
  file_type   text not null check (file_type in (
                'transcript','report_card','certificate','passport',
                'visa','medical','application','other'
              )),
  upload_date timestamptz default now(),
  created_at  timestamptz default now()
);

create table document_access (
  document_id uuid not null references student_documents on delete cascade,
  parent_id   uuid not null references profiles on delete cascade,
  permission  text not null check (permission in ('read', 'edit')),
  granted_at  timestamptz default now(),
  primary key (document_id, parent_id)
);

-- ── PARENT COMMUNICATIONS ─────────────────────────────────────

create table school_communications (
  id                  uuid primary key default gen_random_uuid(),
  student_id          uuid not null references profiles on delete cascade,
  original_text       text not null,
  chinese_translation text not null,
  chinese_summary     text not null,
  source_type         text default 'text' check (source_type in ('text','pdf')),
  submitted_at        timestamptz default now()
);

create table parent_drafts (
  id               uuid primary key default gen_random_uuid(),
  student_id       uuid not null references profiles on delete cascade,
  parent_id        uuid not null references profiles on delete cascade,
  chinese_original text not null,
  english_draft    text not null,
  status           text default 'pending' check (status in ('pending','sent','cancelled')),
  created_at       timestamptz default now(),
  sent_at          timestamptz
);

-- ── FINANCE ───────────────────────────────────────────────────

create table fee_items (
  id           uuid primary key default gen_random_uuid(),
  student_id   uuid not null references profiles on delete cascade,
  name         text not null,
  amount_sgd   numeric(10,2) not null,
  due_date     date not null,
  category     text not null check (category in ('tuition','homestay','insurance','transport','other')),
  paid         boolean default false,
  paid_date    date,
  created_at   timestamptz default now()
);

create table insurance_policies (
  id             uuid primary key default gen_random_uuid(),
  student_id     uuid not null references profiles on delete cascade,
  policy_name    text not null,
  insurer        text not null,
  policy_number  text,
  coverage_start date,
  coverage_end   date,
  renewal_date   date not null,
  claims_hotline text,
  created_at     timestamptz default now()
);

create table expense_logs (
  id          uuid primary key default gen_random_uuid(),
  student_id  uuid not null references profiles on delete cascade,
  amount_sgd  numeric(10,2) not null,
  category    text not null check (category in ('food','transport','school_supplies','activities','healthcare','other')),
  note        text,
  date        date not null default current_date,
  created_at  timestamptz default now()
);

-- ── WELLNESS ──────────────────────────────────────────────────

create table emergency_contacts (
  id          uuid primary key default gen_random_uuid(),
  student_id  uuid not null references profiles on delete cascade,
  type        text not null check (type in ('school_admin','homestay','polyclinic','hospital','doctor','other')),
  name        text not null,
  phone       text not null,
  address     text,
  created_at  timestamptz default now()
);

create table medical_appointments (
  id          uuid primary key default gen_random_uuid(),
  student_id  uuid not null references profiles on delete cascade,
  date        date not null,
  clinic_name text not null,
  reason      text not null,
  notes       text,
  created_at  timestamptz default now()
);

-- ── HOMESTAY ──────────────────────────────────────────────────

create table homestay_listings (
  id               uuid primary key default gen_random_uuid(),
  family_name      text not null,
  description      text,
  address          text not null,
  area             text,
  zone             text,                    -- Singapore district zone (aligned with schools.zone)
  latitude         numeric(9,6),
  longitude        numeric(9,6),
  room_type        text not null check (room_type in ('single','shared','studio')),
  monthly_rate_sgd numeric(8,2) not null,
  family_type      text,
  max_students     int default 1,
  amenities        text[] default '{}',
  host_contact     text,
  image_url        text,
  nearby_schools   text[] default '{}',
  distance_notes   text,
  is_active        boolean default true,
  created_at       timestamptz default now()
);

create table homestay_reviews (
  id           uuid primary key default gen_random_uuid(),
  homestay_id  uuid not null references homestay_listings on delete cascade,
  reviewer_id  uuid not null references profiles on delete cascade,
  rating       int not null check (rating between 1 and 5),
  comment      text,
  created_at   timestamptz default now(),
  unique (homestay_id, reviewer_id)
);

create table homestay_saves (
  user_id      uuid not null references profiles on delete cascade,
  homestay_id  uuid not null references homestay_listings on delete cascade,
  saved_at     timestamptz default now(),
  primary key  (user_id, homestay_id)
);

-- ── COMMUNITY ─────────────────────────────────────────────────

create table community_posts (
  id                uuid primary key default gen_random_uuid(),
  author_id         uuid not null references profiles on delete cascade,
  title             text not null,
  body              text not null,
  image_url         text,
  category          text not null check (category in ('school_journey','how_i_got_in','resources','ask_community')),
  tags              text[] default '{}',
  anonymous         boolean default false,
  upvotes           int default 0,
  moderation_status text default 'approved' check (moderation_status in ('approved','flagged','removed')),
  created_at        timestamptz default now()
);

create table post_saves (
  user_id  uuid not null references profiles on delete cascade,
  post_id  uuid not null references community_posts on delete cascade,
  saved_at timestamptz default now(),
  primary key (user_id, post_id)
);
