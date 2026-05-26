-- ============================================================
-- Novara — Local Dev Seed Data
-- Run via: supabase db reset  (wipes local DB, re-runs migrations + this file)
--
-- Creates:
--   1 student user  → wei.zhang@demo.com  / password: demo1234
--   1 parent  user  → zhang.ming@demo.com / password: demo1234
--   parent_links row linking them
--   Sample milestones, calendar events, fee items, expense logs,
--   and school_communications for the student
-- ============================================================

-- ── Step 1: Create auth users (local Supabase only) ───────────────────────────
-- supabase/seed.sql can use the raw auth schema on local instancse.
-- On hosted Supabase, create users through the Auth UI or Admin API instead.

INSERT INTO auth.users
  (id, email, encrypted_password, email_confirmed_at, raw_user_meta_data, created_at, updated_at, aud, role)
VALUES
  (
    '00000000-0000-0000-0000-000000000001',
    'wei.zhang@demo.com',
    crypt('demo1234', gen_salt('bf')),
    now(),
    '{"role": "student", "display_name": "Wei Zhang"}'::jsonb,
    now(), now(), 'authenticated', 'authenticated'
  ),
  (
    '00000000-0000-0000-0000-000000000002',
    'zhang.ming@demo.com',
    crypt('demo1234', gen_salt('bf')),
    now(),
    '{"role": "parent", "display_name": "Zhang Ming"}'::jsonb,
    now(), now(), 'authenticated', 'authenticated'
  )
ON CONFLICT (id) DO NOTHING;

-- Trigger handle_new_user fires AFTER INSERT on auth.users, so profiles are
-- auto-created above. But if seeding directly, insert manually as fallback:
INSERT INTO public.profiles (id, role, display_name, preferred_language)
VALUES
  ('00000000-0000-0000-0000-000000000001', 'student', 'Wei Zhang', 'zh'),
  ('00000000-0000-0000-0000-000000000002', 'parent',  'Zhang Ming', 'zh')
ON CONFLICT (id) DO NOTHING;

-- Student profile
INSERT INTO public.student_profiles
  (user_id, nationality, age, current_year, current_school, current_curriculum,
   target_university, target_programme, interests, budget_range, english_level,
   invite_code, onboarding_done)
VALUES
  (
    '00000000-0000-0000-0000-000000000001',
    'Chinese', 17, 'Year 2 (IB)', 'ACS International', 'IB',
    'UCL / NUS', 'Computer Science', 'Math, Programming, Robotics',
    '50-80k', 'Advanced',
    'WZ2026', true
  )
ON CONFLICT (user_id) DO NOTHING;

-- Parent link
INSERT INTO public.parent_links (parent_id, student_id)
VALUES ('00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001')
ON CONFLICT DO NOTHING;

-- ── Step 2: Roadmap + Milestones ──────────────────────────────────────────────

INSERT INTO public.roadmaps (id, student_id, status, raw_json)
VALUES (
  '10000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000001',
  'active',
  '{}'::jsonb
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.milestones
  (id, roadmap_id, year, month, type, title, description, due_date, completed)
VALUES
  ('m001','10000000-0000-0000-0000-000000000001',1,4,'exam','IB Mock Exams — Mathematics','Sit all IB Math AA HL mock papers under timed conditions.','2026-04-15',true),
  ('m002','10000000-0000-0000-0000-000000000001',1,5,'exam','IB Mock Exams — Physics','Physics HL Paper 1 + 2. Revise lab skills for Paper 3.','2026-05-20',false),
  ('m003','10000000-0000-0000-0000-000000000001',1,5,'competition','AMC 10B Registration Deadline','Register at maa.org/amc. Book a seat at the ACS exam centre.','2026-05-13',false),
  ('m004','10000000-0000-0000-0000-000000000001',1,5,'application','UCAS Personal Statement Draft','Complete first full draft. Ask Mr. Chan to review.','2026-05-28',false),
  ('m005','10000000-0000-0000-0000-000000000001',1,6,'competition','AMC 10B Exam','Mathematics AMC 10B sitting at ACS International.','2026-06-07',false),
  ('m006','10000000-0000-0000-0000-000000000001',2,8,'application','UCAS Application Submission','Submit UCAS form. Needs teacher references confirmed first.','2026-10-15',false),
  ('m007','10000000-0000-0000-0000-000000000001',2,9,'exam','SAT November Sitting','Target 1500+. Book via collegeboard.org.','2026-11-07',false),
  ('m008','10000000-0000-0000-0000-000000000001',3,4,'exam','IB Diploma Final Exams','All subjects. This is the real thing.','2027-04-28',false),
  ('m009','10000000-0000-0000-0000-000000000001',3,7,'academic','IB Results Day','Check results on IBO candidate portal.','2027-07-06',false)
ON CONFLICT (id) DO NOTHING;

-- ── Step 3: Calendar events ───────────────────────────────────────────────────

INSERT INTO public.calendar_events (student_id, title, event_date, type, source, notes)
VALUES
  ('00000000-0000-0000-0000-000000000001','IB Mock Exam — Mathematics','2026-05-07','exam','system','Sports Hall Level 2, 8:00 AM'),
  ('00000000-0000-0000-0000-000000000001','Extended Essay Final Draft Due','2026-05-10','application','ai','Submit to Mr. Chan by 11:59 PM'),
  ('00000000-0000-0000-0000-000000000001','Robotics Club Session','2026-05-12','cca','manual',null),
  ('00000000-0000-0000-0000-000000000001','Homestay Fee Payment','2026-05-13','finance','system','S$950 — PayNow to host'),
  ('00000000-0000-0000-0000-000000000001','AMC Registration Deadline','2026-05-13','application','system',null),
  ('00000000-0000-0000-0000-000000000001','IB Mock Exam — Physics','2026-05-20','exam','system','Sports Hall Level 2'),
  ('00000000-0000-0000-0000-000000000001','Volunteer Day — Geylang CC','2026-05-22','cca','manual',null),
  ('00000000-0000-0000-0000-000000000001','UCAS Personal Statement Draft','2026-05-28','application','ai',null),
  ('00000000-0000-0000-0000-000000000001','SAT Exam (June sitting)','2026-06-07','exam','system',null),
  ('00000000-0000-0000-0000-000000000001','Term 3 Fees Due','2026-06-01','finance','system','S$9500 tuition'),
  ('00000000-0000-0000-0000-000000000001','Science Olympiad Qualifier','2026-06-14','cca','manual',null)
ON CONFLICT DO NOTHING;

-- ── Step 4: Fee items ─────────────────────────────────────────────────────────

INSERT INTO public.fee_items
  (student_id, name, amount_sgd, due_date, category, paid, paid_date)
VALUES
  ('00000000-0000-0000-0000-000000000001','Tuition — Term 2 2026',9500,'2026-04-01','tuition',true,'2026-03-28'),
  ('00000000-0000-0000-0000-000000000001','Homestay — May 2026',950,'2026-05-01','homestay',true,'2026-04-30'),
  ('00000000-0000-0000-0000-000000000001','Homestay — June 2026',950,'2026-06-01','homestay',false,null),
  ('00000000-0000-0000-0000-000000000001','Student Health Insurance (Annual)',1200,'2026-07-15','insurance',false,null),
  ('00000000-0000-0000-0000-000000000001','IB Examination Fees 2026',2800,'2026-03-15','tuition',true,'2026-03-10'),
  ('00000000-0000-0000-0000-000000000001','Tuition — Term 3 2026',9500,'2026-07-01','tuition',false,null),
  ('00000000-0000-0000-0000-000000000001','Materials & Stationery',320,'2026-04-10','other',true,'2026-04-08'),
  ('00000000-0000-0000-0000-000000000001','Science Lab Deposit',150,'2026-04-01','other',false,null)
ON CONFLICT DO NOTHING;

-- ── Step 5: Expense logs ──────────────────────────────────────────────────────

INSERT INTO public.expense_logs (student_id, amount_sgd, category, note, date)
VALUES
  ('00000000-0000-0000-0000-000000000001',30,'transport','EZ-Link top-up','2026-05-20'),
  ('00000000-0000-0000-0000-000000000001',25,'food','Hawker lunch × 5','2026-05-19'),
  ('00000000-0000-0000-0000-000000000001',42,'school_supplies','IB Study Guide — Maths','2026-05-18'),
  ('00000000-0000-0000-0000-000000000001',28,'transport','Grab rides (week)','2026-05-17'),
  ('00000000-0000-0000-0000-000000000001',18,'food','Bubble tea + snacks','2026-05-16'),
  ('00000000-0000-0000-0000-000000000001',15,'activities','Cinema — Orchard','2026-05-15'),
  ('00000000-0000-0000-0000-000000000001',12,'school_supplies','Stationery refill','2026-05-14'),
  ('00000000-0000-0000-0000-000000000001',45,'food','Weekend groceries','2026-05-13'),
  ('00000000-0000-0000-0000-000000000001',20,'other','School uniform alteration','2026-05-12'),
  ('00000000-0000-0000-0000-000000000001',30,'food','Hawker dinner × 5','2026-05-11')
ON CONFLICT DO NOTHING;

-- ── Step 6: School communications ────────────────────────────────────────────

INSERT INTO public.school_communications
  (student_id, original_text, chinese_translation, chinese_summary, source_type)
VALUES
  (
    '00000000-0000-0000-0000-000000000001',
    'Dear Parents, IB Mock Examination timetable for May 2026 is attached. All Year 2 IB students must sit all examinations as scheduled.',
    '尊敬的家长，2026年5月IB模拟考试时间表已附上。所有IB文凭二年级学生须按时参加所有考试。',
    'IB模拟考试将于2026年5月举行，请确保孩子按时参加。',
    'text'
  ),
  (
    '00000000-0000-0000-0000-000000000001',
    'Dear Parents, Term 3 2026 invoice attached. Total due: SGD 9,500. Payment due by 1 July 2026.',
    '尊敬的家长，第三学期账单已附上，应付金额新币9,500元，截止日期2026年7月1日。',
    '第三学期学费新币9,500元，截止7月1日缴清。',
    'text'
  )
ON CONFLICT DO NOTHING;

-- ── Step 7: Achievements (for portfolio + XP) ─────────────────────────────────

INSERT INTO public.achievements (student_id, category, title, date, description)
VALUES
  ('00000000-0000-0000-0000-000000000001','competition','SASMO 2025 — Silver Award','2025-05-15','Achieved Silver in Singapore and Asian Schools Math Olympiad.'),
  ('00000000-0000-0000-0000-000000000001','academic','IB Year 1 — Predicted 38/45','2026-03-01','Strong predicted score from school.'),
  ('00000000-0000-0000-0000-000000000001','cca','Robotics Club — Vice President','2026-01-15','Elected VP for 2026 term.'),
  ('00000000-0000-0000-0000-000000000001','volunteer','Geylang CC Volunteer','2025-11-20','Completed 40-hour community service requirement.')
ON CONFLICT DO NOTHING;
