// ─────────────────────────────────────────────────────────────────────────────
// Novara — Static mock data (mirrors DB schema, used while Supabase is empty)
// ─────────────────────────────────────────────────────────────────────────────

// ── Types ────────────────────────────────────────────────────────────────────

export type SchoolType = 'primary' | 'secondary' | 'jc' | 'poly' | 'university' | 'language_school' | 'diploma'
export type Curriculum  = 'IB' | 'A-Level' | 'AP' | 'O-Level' | 'Local' | 'Mixed'

export type MockSchool = {
  id: string
  school_name: string
  slug: string
  school_type: SchoolType
  curriculum: Curriculum | null
  zone: string
  address: string
  description: string
  website: string
  tuition_range?: string          // SGD/year (indicative)
  highlights?: string[]
}

export type AchievementCategory = 'competition' | 'academic' | 'cca' | 'volunteer' | 'award' | 'other'

export type MockAchievement = {
  id: string
  category: AchievementCategory
  title: string
  date: string          // YYYY-MM-DD
  description: string
  xp: number
}

export type MilestoneType = 'exam' | 'competition' | 'cca' | 'application' | 'academic' | 'other'

export type MockMilestone = {
  id: string
  year: number          // 1–4 (relative study year)
  month: number         // 1–12
  type: MilestoneType
  title: string
  description: string
  due_date: string      // YYYY-MM-DD
  completed: boolean
}

export type DocumentFileType =
  | 'transcript' | 'report_card' | 'certificate' | 'passport'
  | 'visa' | 'medical' | 'application' | 'other'

export type MockDocument = {
  id: string
  file_name: string
  file_type: DocumentFileType
  upload_date: string   // YYYY-MM-DD
  size_kb: number
  parent_access: boolean
}

// ── Gamification constants ────────────────────────────────────────────────────

export type GamificationLevel = {
  level: number
  name: string
  emoji: string
  min_xp: number
  max_xp: number
  color: string
}

export const LEVELS: GamificationLevel[] = [
  { level: 1, name: 'Newcomer',  emoji: '🌱', min_xp: 0,    max_xp: 149,  color: '#6B7280' },
  { level: 2, name: 'Explorer',  emoji: '🌍', min_xp: 150,  max_xp: 399,  color: '#1A56DB' },
  { level: 3, name: 'Pioneer',   emoji: '🚀', min_xp: 400,  max_xp: 749,  color: '#7C3AED' },
  { level: 4, name: 'Scholar',   emoji: '📚', min_xp: 750,  max_xp: 1199, color: '#057A55' },
  { level: 5, name: 'Champion',  emoji: '🏆', min_xp: 1200, max_xp: 9999, color: '#B45309' },
]

export function getLevelInfo(xp: number): GamificationLevel & { progress_pct: number } {
  const lvl = LEVELS.slice().reverse().find(l => xp >= l.min_xp) ?? LEVELS[0]
  const range = lvl.max_xp - lvl.min_xp
  const progress_pct = Math.min(100, Math.round(((xp - lvl.min_xp) / range) * 100))
  return { ...lvl, progress_pct }
}

export type Badge = {
  id: string
  name: string
  emoji: string
  description: string
}

export const ALL_BADGES: Badge[] = [
  { id: 'first_step',    emoji: '🏁', name: 'First Step',      description: 'Added your first milestone' },
  { id: 'on_track',     emoji: '🎯', name: 'On Track',         description: 'Completed 3 milestones' },
  { id: 'champion',     emoji: '🏆', name: 'Champion',         description: 'Won a competition' },
  { id: 'scholar',      emoji: '📚', name: 'Scholar',          description: '3 academic achievements' },
  { id: 'all_rounder',  emoji: '🌟', name: 'All-Rounder',      description: 'Achievements in 4+ categories' },
  { id: 'paperwork',    emoji: '📄', name: 'Paperwork Done',   description: 'Uploaded 3+ documents' },
  { id: 'volunteer',    emoji: '🤝', name: 'Helper',           description: 'Added a volunteer achievement' },
  { id: 'on_fire',      emoji: '🔥', name: 'On Fire',          description: 'Completed 5+ milestones' },
]

export function computeBadges(
  achievements: MockAchievement[],
  milestones: MockMilestone[],
  documents: MockDocument[],
): Badge[] {
  const earned: Badge[] = []
  const completed = milestones.filter(m => m.completed)
  const categories = new Set(achievements.map(a => a.category))

  if (milestones.length >= 1)    earned.push(ALL_BADGES.find(b => b.id === 'first_step')!)
  if (completed.length >= 3)     earned.push(ALL_BADGES.find(b => b.id === 'on_track')!)
  if (completed.length >= 5)     earned.push(ALL_BADGES.find(b => b.id === 'on_fire')!)
  if (achievements.some(a => a.category === 'competition')) earned.push(ALL_BADGES.find(b => b.id === 'champion')!)
  if (achievements.filter(a => a.category === 'academic').length >= 3) earned.push(ALL_BADGES.find(b => b.id === 'scholar')!)
  if (categories.size >= 4)      earned.push(ALL_BADGES.find(b => b.id === 'all_rounder')!)
  if (achievements.some(a => a.category === 'volunteer'))  earned.push(ALL_BADGES.find(b => b.id === 'volunteer')!)
  if (documents.length >= 3)     earned.push(ALL_BADGES.find(b => b.id === 'paperwork')!)

  return earned.filter(Boolean)
}

export function computeXP(
  achievements: MockAchievement[],
  milestones: MockMilestone[],
  documents: MockDocument[],
): number {
  const achXP  = achievements.reduce((s, a) => s + a.xp, 0)
  const msXP   = milestones.filter(m => m.completed).length * 50
  const docXP  = documents.length * 10
  return achXP + msXP + docXP
}

// ── Singapore Schools ─────────────────────────────────────────────────────────

export const MOCK_SCHOOLS: MockSchool[] = [
  {
    id: 's1',
    school_name: 'ACS International',
    slug: 'acs-international',
    school_type: 'secondary',
    curriculum: 'IB',
    zone: 'Central',
    address: '61 Pemimpin Drive, Singapore 576154',
    description: 'Co-educational international school offering the IB Middle Years Programme (Sec 1–4) and IB Diploma Programme (Sec 5–6). Renowned for its diverse international community and strong arts & sports culture.',
    website: 'https://www.acsinternational.edu.sg',
    tuition_range: 'SGD 30,000–38,000 / yr',
    highlights: ['IB Diploma & MYP', 'Co-ed', '~2,000 students', 'Strong CCA', 'Near Bishan MRT'],
  },
  {
    id: 's2',
    school_name: 'UWC South East Asia (Dover)',
    slug: 'uwc-dover',
    school_type: 'secondary',
    curriculum: 'IB',
    zone: 'West',
    address: '1207 Dover Road, Singapore 139654',
    description: 'Part of the United World Colleges network. Offers IB PYP, MYP, and Diploma with a strong emphasis on international mindedness, peace, and sustainability. Two campuses (Dover & East).',
    website: 'https://www.uwcsea.edu.sg',
    tuition_range: 'SGD 42,000–50,000 / yr',
    highlights: ['IB World School', 'UN-affiliated UWC network', 'Activity-based learning', 'Dual campus', 'Very competitive entry'],
  },
  {
    id: 's3',
    school_name: 'Tanglin Trust School',
    slug: 'tanglin-trust',
    school_type: 'secondary',
    curriculum: 'IB',
    zone: 'West',
    address: '95 Portsdown Road, Singapore 139299',
    description: 'British-curriculum international school offering IGCSE and IB Diploma. Known for academic excellence, pastoral care, and a broad co-curricular programme in a leafy campus near Holland Village.',
    website: 'https://www.tts.edu.sg',
    tuition_range: 'SGD 35,000–45,000 / yr',
    highlights: ['British-style education', 'IGCSE + IB DP', 'Pastoral care focus', 'Strong music & drama', 'Holland Road campus'],
  },
  {
    id: 's4',
    school_name: 'Stamford American International School',
    slug: 'stamford-american',
    school_type: 'secondary',
    curriculum: 'AP',
    zone: 'North-East',
    address: '1 Woodleigh Lane, Singapore 357684',
    description: 'American curriculum school offering both the IB Diploma and Advanced Placement (AP) programmes. Large campus with world-class sports facilities. Strong college counselling for US university admission.',
    website: 'https://www.sais.edu.sg',
    tuition_range: 'SGD 38,000–48,000 / yr',
    highlights: ['IB & AP dual-track', 'US university placement', 'Olympic-sized pool', 'Near Woodleigh MRT', 'College counselling'],
  },
  {
    id: 's5',
    school_name: 'SJI International',
    slug: 'sji-international',
    school_type: 'secondary',
    curriculum: 'IB',
    zone: 'West',
    address: '2 Fort Road, Singapore 439086',
    description: 'Catholic mission school offering IGCSE and IB Diploma in a values-centred environment. Balances academic rigour with character development, service, and leadership. Smaller class sizes.',
    website: 'https://www.sji-international.com.sg',
    tuition_range: 'SGD 26,000–34,000 / yr',
    highlights: ['Values-based education', 'IGCSE + IB', 'Small class sizes', 'Strong service learning', 'Fort Road location'],
  },
  {
    id: 's6',
    school_name: 'Canadian International School',
    slug: 'canadian-international',
    school_type: 'secondary',
    curriculum: 'IB',
    zone: 'West',
    address: '7 Jurong West Street 41, Singapore 649414',
    description: 'Offers the Ontario Secondary School Diploma (OSSD) and IB Diploma. Canadian curriculum with strong STEM and arts programmes. Serves a large North American expat community.',
    website: 'https://www.cis.edu.sg',
    tuition_range: 'SGD 30,000–40,000 / yr',
    highlights: ['OSSD + IB', 'Canadian pathway', 'Strong STEM', 'Lakeside campus', 'Large expat community'],
  },
  {
    id: 's7',
    school_name: 'Raffles Institution (RI)',
    slug: 'raffles-institution',
    school_type: 'jc',
    curriculum: 'A-Level',
    zone: 'Central',
    address: '1 Raffles Institution Lane, Singapore 575987',
    description: 'Singapore\'s premier government junior college offering the Singapore-Cambridge A-Level curriculum. Highly competitive direct school admission. Alumni include presidents and prime ministers of Singapore.',
    website: 'https://www.ri.edu.sg',
    tuition_range: 'SGD 500–600 / yr (PR/SC)',
    highlights: ['Top JC in Singapore', 'Raffles Programme (IP)', 'Extremely competitive entry', 'Strong alumni network', 'Near Bishan MRT'],
  },
  {
    id: 's8',
    school_name: 'Hwa Chong Institution (HCI)',
    slug: 'hwa-chong',
    school_type: 'jc',
    curriculum: 'A-Level',
    zone: 'West',
    address: '661 Bukit Timah Road, Singapore 269734',
    description: 'Prestigious autonomous government school offering the Integrated Programme (IP) from Sec 1–JC2 and A-Levels. Strong in science, mathematics, and Mandarin. Boarding school option available.',
    website: 'https://www.hci.edu.sg',
    tuition_range: 'SGD 500–600 / yr (PR/SC)',
    highlights: ['IP (Sec–JC integrated)', 'Boarding available', 'Strong science & maths', 'Bilingual advantage', 'Near Sixth Avenue MRT'],
  },
  {
    id: 's9',
    school_name: 'National Junior College (NJC)',
    slug: 'national-junior-college',
    school_type: 'jc',
    curriculum: 'A-Level',
    zone: 'North',
    address: '37 Hillcrest Road, Singapore 288913',
    description: 'Government JC offering both Singapore A-Levels and the IB Diploma Programme — one of very few JCs offering both. Strong arts and humanities programme. Near the Rail Corridor and Upper Bukit Timah.',
    website: 'https://www.njc.edu.sg',
    tuition_range: 'SGD 500–700 / yr',
    highlights: ['A-Level & IB dual-track', 'Rare public-school IB', 'Arts-humanities strength', 'Hiking/nature nearby', 'Woodlands area'],
  },
  {
    id: 's10',
    school_name: 'Nanyang Polytechnic (NYP)',
    slug: 'nanyang-polytechnic',
    school_type: 'poly',
    curriculum: 'Local',
    zone: 'Central',
    address: '180 Ang Mo Kio Ave 8, Singapore 569830',
    description: 'One of Singapore\'s five polytechnics. Offers 3-year diploma programmes in Engineering, Business, Design, Health Sciences, and IT. Strong industry partnerships and internship placements.',
    website: 'https://www.nyp.edu.sg',
    tuition_range: 'SGD 3,000–4,500 / yr',
    highlights: ['3-year diploma', 'Strong IT & Engineering', 'Industry internships', 'Near Ang Mo Kio MRT', 'Practical hands-on focus'],
  },
  {
    id: 's11',
    school_name: 'Singapore Polytechnic (SP)',
    slug: 'singapore-polytechnic',
    school_type: 'poly',
    curriculum: 'Local',
    zone: 'South',
    address: '500 Dover Road, Singapore 139651',
    description: 'Singapore\'s oldest polytechnic. Offers diploma programmes in Engineering, Business, Hospitality, Media, and Built Environment. Known for strong alumni network and industry-ready graduates.',
    website: 'https://www.sp.edu.sg',
    tuition_range: 'SGD 3,000–4,500 / yr',
    highlights: ['Oldest poly in SG', 'Wide course range', 'Near Dover MRT', 'Strong alumni', 'Hospitality & media courses'],
  },
  {
    id: 's12',
    school_name: 'National University of Singapore (NUS)',
    slug: 'nus',
    school_type: 'university',
    curriculum: 'Local',
    zone: 'West',
    address: '21 Lower Kent Ridge Rd, Singapore 119077',
    description: 'Singapore\'s flagship university and consistently ranked Asia\'s top university. Offers undergraduate, postgraduate, and research programmes across 17 faculties. Global exchange programme with 300+ partner universities.',
    website: 'https://www.nus.edu.sg',
    tuition_range: 'SGD 17,000–22,000 / yr (international)',
    highlights: ['#1 in Asia (QS 2025)', '300+ global partners', 'Research powerhouse', 'Near Kent Ridge MRT', '37,000+ students'],
  },
  {
    id: 's13',
    school_name: 'Nanyang Technological University (NTU)',
    slug: 'ntu',
    school_type: 'university',
    curriculum: 'Local',
    zone: 'West',
    address: '50 Nanyang Ave, Singapore 639798',
    description: 'World-class research university strong in Engineering, Computer Science, and Business. NBS (business school) and EEE faculty are globally recognised. Large green campus with integrated residential colleges.',
    website: 'https://www.ntu.edu.sg',
    tuition_range: 'SGD 17,000–22,000 / yr (international)',
    highlights: ['Top 20 globally (QS)', 'Strong Engineering & CS', 'Residential colleges', 'Green campus', 'Near Boon Lay MRT'],
  },
  {
    id: 's14',
    school_name: 'EtonHouse International School (Broadrick)',
    slug: 'etonhouse-broadrick',
    school_type: 'secondary',
    curriculum: 'IB',
    zone: 'East',
    address: '72 Broadrick Road, Singapore 439501',
    description: 'International school offering the IB PYP, MYP, and Diploma. Known for inquiry-based learning, small class sizes, and strong community spirit. Located near Mountbatten in the East.',
    website: 'https://www.etonhouse.com.sg',
    tuition_range: 'SGD 24,000–32,000 / yr',
    highlights: ['IB continuum (PYP–DP)', 'Inquiry-based learning', 'Small class sizes', 'East Singapore', 'Community focus'],
  },
  {
    id: 's15',
    school_name: 'Inlingua School of Languages',
    slug: 'inlingua-singapore',
    school_type: 'language_school',
    curriculum: null,
    zone: 'Central',
    address: '583 Orchard Road, #06-03 Forum Galleria, Singapore 238884',
    description: 'International language school offering English, Mandarin, Japanese, Korean, and other language courses. Practical conversation-focused approach with flexible scheduling for international students.',
    website: 'https://www.inlingua.com.sg',
    tuition_range: 'SGD 1,200–4,000 / course',
    highlights: ['20+ languages offered', 'Flexible schedules', 'Near Orchard MRT', 'Practical focus', 'Adult & teen programmes'],
  },
]

// ── Sample Achievements ───────────────────────────────────────────────────────

export const MOCK_ACHIEVEMENTS: MockAchievement[] = [
  {
    id: 'a1',
    category: 'competition',
    title: 'Silver Medal — Singapore Math Olympiad (SMO)',
    date: '2024-07-15',
    description: 'Achieved Silver in the Senior Division of SMO 2024, placing in top 8% of participants nationwide.',
    xp: 60,
  },
  {
    id: 'a2',
    category: 'academic',
    title: 'IB Predicted Score: 39/45',
    date: '2024-11-01',
    description: 'Received predicted score of 39 points from school, with HL subjects in Math AA, Physics, and Economics.',
    xp: 40,
  },
  {
    id: 'a3',
    category: 'cca',
    title: 'Vice-President — Robotics Club',
    date: '2024-04-01',
    description: 'Elected Vice-President of the school Robotics Club. Led team of 12 to semi-finals of WRO Singapore 2024.',
    xp: 35,
  },
  {
    id: 'a4',
    category: 'volunteer',
    title: 'CAS Project — Digital Literacy for Seniors',
    date: '2024-09-20',
    description: '48 hours of CAS activity. Designed and ran a 6-week digital literacy programme for 25 seniors at Geylang East Community Centre.',
    xp: 30,
  },
  {
    id: 'a5',
    category: 'award',
    title: 'MOE Edusave Award for Achievement, Good Leadership & Service',
    date: '2024-10-05',
    description: 'Received the EAGLES award from Ministry of Education, recognising achievement in non-academic domains and leadership.',
    xp: 50,
  },
  {
    id: 'a6',
    category: 'academic',
    title: 'Extended Essay (EE) — Grade A',
    date: '2025-01-10',
    description: 'Extended Essay in Computer Science titled "Evaluating the Efficiency of Sorting Algorithms on Randomised and Nearly-Sorted Data". Graded A by IB.',
    xp: 40,
  },
]

// ── Sample Roadmap Milestones ─────────────────────────────────────────────────

export const MOCK_MILESTONES: MockMilestone[] = [
  {
    id: 'm1',
    year: 1,
    month: 9,
    type: 'academic',
    title: 'Register for IB Diploma Programme',
    description: 'Confirm IB DP subject choices with academic advisor. Submit subject selection form.',
    due_date: '2024-09-15',
    completed: true,
  },
  {
    id: 'm2',
    year: 1,
    month: 10,
    type: 'cca',
    title: 'Join Robotics Club & sign up for WRO',
    description: 'Attend CCA fair, join Robotics Club, and register team for World Robot Olympiad Singapore 2024.',
    due_date: '2024-10-01',
    completed: true,
  },
  {
    id: 'm3',
    year: 1,
    month: 11,
    type: 'competition',
    title: 'Singapore Math Olympiad — Senior Division',
    description: 'Sit for SMO Senior paper. Aim for Silver or above.',
    due_date: '2024-11-20',
    completed: true,
  },
  {
    id: 'm4',
    year: 1,
    month: 1,
    type: 'academic',
    title: 'Submit Extended Essay topic proposal',
    description: 'Finalise EE topic in Computer Science. Submit 300-word outline to supervisor.',
    due_date: '2025-01-31',
    completed: true,
  },
  {
    id: 'm5',
    year: 1,
    month: 3,
    type: 'exam',
    title: 'IB Mock Exams (Year 1)',
    description: 'Sit school internal mock exams for all HL/SL subjects. Use results to identify weak areas.',
    due_date: '2025-03-15',
    completed: false,
  },
  {
    id: 'm6',
    year: 1,
    month: 5,
    type: 'exam',
    title: 'Register for SAT (June sitting)',
    description: 'Register on College Board for June SAT. Begin dedicated prep with Khan Academy.',
    due_date: '2025-05-01',
    completed: false,
  },
  {
    id: 'm7',
    year: 2,
    month: 7,
    type: 'academic',
    title: 'Complete CAS Project & documentation',
    description: 'Finish all CAS hours (Creativity, Activity, Service). Submit reflective journal and evidence portfolio.',
    due_date: '2025-07-31',
    completed: false,
  },
  {
    id: 'm8',
    year: 2,
    month: 10,
    type: 'application',
    title: 'Submit UCAS Application (UK universities)',
    description: 'Submit UCAS application for UCL, Imperial, Warwick CS programmes. Deadline: 15 Oct for Oxford/Cambridge, 31 Jan for others.',
    due_date: '2025-10-15',
    completed: false,
  },
]

// ── Sample Documents ──────────────────────────────────────────────────────────

// ── Shared linked-pair identity ───────────────────────────────────────────────
// This simulates the parent_links table joining parent ↔ student.
// Both the student pages and parent pages import from here so they always
// display the same underlying data — ready to swap for real DB calls.

export const MOCK_CHILD_PROFILE = {
  user_id:             'student-mock-001',
  display_name:        'Wei Zhang',
  display_name_cn:     '张威',
  email:               'wei.zhang@acsinternational.edu.sg',
  current_school:      'ACS International',
  current_year:        1,                 // Year 1 of IB Diploma
  current_curriculum:  'IB' as const,
  target_university:   'NUS / UCL',
  avatar_letter:       'W',
}

export const MOCK_PARENT_PROFILE = {
  user_id:         'parent-mock-001',
  display_name:    '张明',               // Father
  email:           'zhang.ming@example.com',
  phone:           '+86 138 0000 1234',
  timezone:        'Asia/Shanghai',
  preferred_lang:  'zh' as const,
  avatar_letter:   '张',
}

// ── School communications (mirrors school_communications table) ───────────────
// Parent uploads English school notices; AI translates to Chinese.
// Both comms + their Chinese translations stored here.

export type CommStatus = 'unread' | 'read'

export type MockComm = {
  id: string
  subject: string                   // Original English subject
  body_en: string                   // Original English body
  body_zh: string                   // AI-translated Chinese
  summary_zh: string                // Short Chinese summary (2 sentences)
  category: 'exam' | 'fee' | 'event' | 'policy' | 'welfare' | 'other'
  sent_date: string                 // YYYY-MM-DD
  from_school: string
  status: CommStatus
  urgent: boolean
}

export const MOCK_COMMS: MockComm[] = [
  {
    id: 'c1',
    subject: 'IB Mock Examination Schedule — May 2026',
    from_school: 'ACS International',
    sent_date: '2026-05-10',
    category: 'exam',
    urgent: true,
    status: 'unread',
    body_en: 'Dear Parents and Guardians,\n\nPlease find attached the IB Mock Examination timetable for May 2026. All Year 2 IB Diploma students are expected to sit all examinations as scheduled. Absences must be approved by the Head of Senior School at least 5 school days in advance.\n\nExaminations will be held in the Sports Hall (Level 2). Students should arrive 15 minutes before each paper. Calculators and approved materials lists are available on the school portal.\n\nKind regards,\nMs. Cynthia Loh\nHead of IB Diploma Programme',
    body_zh: '尊敬的家长及监护人，\n\n请查阅附件中2026年5月IB模拟考试时间表。所有IB文凭课程二年级学生须按时参加所有考试。如需缺席，须至少提前5个学日向高中部主任申请批准。\n\n考试将在体育馆（2楼）举行。学生须在每场考试开始前15分钟到场。计算器及考试允许材料清单已上传至学校门户网站。\n\n此致\n罗辛西娅女士\nIB文凭课程主任',
    summary_zh: 'IB模拟考试将于2026年5月举行，考场设于体育馆2楼。如需缺席须提前5个学日向主任申请。',
  },
  {
    id: 'c2',
    subject: 'Term 3 2026 Fee Invoice — Payment Due 1 July',
    from_school: 'ACS International',
    sent_date: '2026-05-01',
    category: 'fee',
    urgent: false,
    status: 'unread',
    body_en: 'Dear Parents,\n\nPlease find your Term 3 2026 invoice attached. Total amount due: SGD 9,500. Payment is due by 1 July 2026. Late payments will incur an administrative charge of SGD 50. Please use PayNow (UEN: T08CC1234A) or bank transfer. Receipt will be emailed within 3 business days.\n\nFinance Office\nACS International',
    body_zh: '尊敬的家长，\n\n请查阅附件中的2026年第三学期账单。应付总额：新币9,500元，缴款截止日期为2026年7月1日。逾期付款将收取新币50元行政费用。请通过PayNow（统一实体编号：T08CC1234A）或银行转账付款。收据将在3个工作日内发送至您的邮箱。\n\n财务处\nACS International',
    summary_zh: '第三学期学费账单：新币9,500元，截止日期2026年7月1日。请通过PayNow或银行转账付款。',
  },
  {
    id: 'c3',
    subject: 'Year 1 Parent-Teacher Conference — 28 May 2026',
    from_school: 'ACS International',
    sent_date: '2026-04-22',
    category: 'event',
    urgent: false,
    status: 'read',
    body_en: 'Dear Parents,\n\nWe would like to invite you to the Year 1 IB Diploma Parent-Teacher Conference on Wednesday, 28 May 2026, from 3:00 PM to 7:00 PM at the school campus.\n\nBookings are now open via the SchoolsBuddy portal. Please book appointments with your child\'s subject teachers. Slots are 10 minutes each. Interpreters (Mandarin) are available upon request — please indicate this when booking.\n\nWarm regards,\nMS. Joanne Sim\nYear 1 IB Coordinator',
    body_zh: '尊敬的家长，\n\n诚邀您参加2026年5月28日（星期三）下午3时至晚上7时举行的IB文凭一年级家长教师会议，地点为学校校园。\n\n请通过SchoolsBuddy门户网站预约各科任教师的面谈时段，每个时段为10分钟。如需普通话口译服务，请在预约时注明。\n\n此致\n沈乔安女士\nIB一年级协调员',
    summary_zh: '家长教师会议将于5月28日下午3时至晚7时举行。请通过SchoolsBuddy系统预约，普通话翻译需提前申请。',
  },
  {
    id: 'c4',
    subject: 'Student Wellness Update — Mental Health Week',
    from_school: 'ACS International',
    sent_date: '2026-04-10',
    category: 'welfare',
    urgent: false,
    status: 'read',
    body_en: 'Dear Parents,\n\nThis week (14–18 April) is Mental Health Awareness Week at ACS International. We have arranged a series of activities including mindfulness sessions, a counselling drop-in, and a peer support circle. All Year 1 and Year 2 students are encouraged to participate.\n\nIf you have any concerns about your child\'s wellbeing, please contact our School Counsellor, Ms. Rachel Ng, at counselling@acsinternational.edu.sg.\n\nThe Pastoral Care Team',
    body_zh: '尊敬的家长，\n\n本周（4月14日至18日）是ACS International心理健康意识周。学校安排了一系列活动，包括正念练习、辅导开放日及同伴支持小组。鼓励所有一、二年级学生积极参与。\n\n如您对孩子的身心健康有任何疑虑，请联系学校辅导员黄雷切尔女士：counselling@acsinternational.edu.sg\n\n学生关怀团队',
    summary_zh: '4月14-18日为心理健康意识周，学校安排了正念及辅导活动。如有需要请联系学校辅导员。',
  },
]

export const MOCK_DOCUMENTS: MockDocument[] = [
  {
    id: 'd1',
    file_name: 'Passport_Copy_2024.pdf',
    file_type: 'passport',
    upload_date: '2024-08-10',
    size_kb: 1240,
    parent_access: true,
  },
  {
    id: 'd2',
    file_name: 'ACSI_Year10_ReportCard_Sem2.pdf',
    file_type: 'report_card',
    upload_date: '2024-09-05',
    size_kb: 850,
    parent_access: true,
  },
  {
    id: 'd3',
    file_name: 'SMO2024_Silver_Certificate.pdf',
    file_type: 'certificate',
    upload_date: '2024-10-12',
    size_kb: 620,
    parent_access: false,
  },
  {
    id: 'd4',
    file_name: 'StudentPass_ICA_2024.pdf',
    file_type: 'visa',
    upload_date: '2024-08-01',
    size_kb: 980,
    parent_access: true,
  },
  {
    id: 'd5',
    file_name: 'EAGLES_Award_MOE.pdf',
    file_type: 'certificate',
    upload_date: '2024-11-02',
    size_kb: 530,
    parent_access: false,
  },
  {
    id: 'd6',
    file_name: 'ACSI_Transcript_2024.pdf',
    file_type: 'transcript',
    upload_date: '2024-12-15',
    size_kb: 1100,
    parent_access: true,
  },
]
