-- ============================================================
-- Novara — Demo Seed Data
-- Run AFTER schema.sql + rls.sql
-- Minimal data for testing/demo — not production-complete
-- ============================================================

-- ── SCHOOLS (5 demo entries) ──────────────────────────────────
-- Note: schools are stored as JSON in public/data/schools.json
-- and served statically. No DB table needed for schools.

-- ── HOMESTAY LISTINGS (6 demo entries) ───────────────────────

insert into homestay_listings
  (family_name, description, address, area, latitude, longitude,
   room_type, monthly_rate_sgd, family_type, max_students,
   amenities, host_contact, nearby_schools, distance_notes)
values
  (
    'Tan Family',
    'Warm Chinese family near ACS International. Meals included, quiet study environment.',
    '12 Barker Road, Singapore 309922', 'Novena',
    1.3211, 103.8350,
    'single', 1200.00, 'Chinese Family', 1,
    ARRAY['WiFi', 'Meals included', 'Laundry', 'AC'],
    '+65 9123 4567',
    ARRAY['ACS International', 'Anglo-Chinese School (Barker)'],
    '0.4 km from ACS International'
  ),
  (
    'Lee Residence',
    'Singaporean family with experience hosting international students. Halal-friendly meals available.',
    '45 Mount Sinai Drive, Singapore 277120', 'Clementi',
    1.3050, 103.7840,
    'single', 950.00, 'Singaporean Family', 2,
    ARRAY['WiFi', 'Breakfast only', 'Laundry'],
    '+65 9234 5678',
    ARRAY['Hwa Chong Institution', 'National Junior College'],
    '0.7 km from Hwa Chong Institution'
  ),
  (
    'Wong Family',
    'IB-experienced family. Parent is a former MOE teacher. Great for IB students.',
    '88 Holland Road, Singapore 278737', 'Holland Village',
    1.3110, 103.7960,
    'single', 1400.00, 'Chinese Family', 1,
    ARRAY['WiFi', 'Meals included', 'Laundry', 'AC', 'Study desk'],
    '+65 9345 6789',
    ARRAY['UWCSEA East', 'Anglo-Chinese School (International)'],
    '1.1 km from UWCSEA'
  ),
  (
    'Chen House',
    'Budget-friendly option near Bishan MRT. Shared room available for two students.',
    '22 Bishan Street 11, Singapore 579744', 'Bishan',
    1.3510, 103.8480,
    'shared', 750.00, 'Chinese Family', 2,
    ARRAY['WiFi', 'Dinner included', 'Laundry'],
    '+65 9456 7890',
    ARRAY['Raffles Institution', 'Catholic High School'],
    '1.5 km from Raffles Institution'
  ),
  (
    'Lim Family',
    'Quiet family in East Singapore. Near Nexus International School. Studio room available.',
    '10 Siglap Road, Singapore 455859', 'Siglap',
    1.3120, 103.9270,
    'studio', 1600.00, 'Singaporean Family', 1,
    ARRAY['WiFi', 'Private bathroom', 'Kitchenette', 'AC', 'Laundry'],
    '+65 9567 8901',
    ARRAY['Nexus International School', 'Victoria School'],
    '0.8 km from Nexus International School'
  ),
  (
    'Kumar Family',
    'Multicultural family near Orchard. Good public transport access to most schools.',
    '5 Grange Road, Singapore 239693', 'Orchard',
    1.3050, 103.8320,
    'single', 1100.00, 'Indian Family', 1,
    ARRAY['WiFi', 'Breakfast included', 'Laundry', 'AC'],
    '+65 9678 9012',
    ARRAY['Anglo-Chinese School (International)', 'Singapore Chinese Girls School'],
    '1.2 km from ACS International'
  );

-- ── SINGAPORE MASTER CALENDAR (system events) ────────────────
-- These are seeded as calendar_events with source='system' for a placeholder student.
-- In production, insert for each new student on signup via trigger or onboarding API.
-- For demo: insert manually for test student after creating account.

-- Example SQL to run after creating test student (replace <STUDENT_UUID>):
-- insert into calendar_events (student_id, title, event_date, type, source, notes) values
--   ('<STUDENT_UUID>', 'DSA Application Opens', '2025-05-01', 'application', 'system', 'Direct School Admission window opens'),
--   ('<STUDENT_UUID>', 'DSA Application Closes', '2025-09-12', 'application', 'system', 'Direct School Admission deadline'),
--   ('<STUDENT_UUID>', 'O-Level Registration', '2025-03-01', 'exam', 'system', 'Register for Singapore-Cambridge O-Level'),
--   ('<STUDENT_UUID>', 'IB Exam Period', '2025-04-28', 'exam', 'system', 'IB May session exams begin'),
--   ('<STUDENT_UUID>', 'JC1 Posting Results', '2026-02-26', 'application', 'system', 'JAE posting results released');
