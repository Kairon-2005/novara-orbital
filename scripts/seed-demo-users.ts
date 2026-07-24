// CLI: npx tsx scripts/seed-demo-users.ts
//
// Creates (or refreshes) TWO fully-populated demo STUDENT accounts on the
// Supabase project pointed to by .env.local, so anyone can sign in with the
// printed email + password and "feel" the product end-to-end.
//
//   1) Li Wei      → demo.cs@novara.vip   — target: NUS Computer Science (Common track)
//   2) Chen Yixin  → demo.biz@novara.vip  — target: NUS Business (BBA)
//
// Each account is seeded with: profile + onboarding, an AI roadmap + milestones,
// calendar events, fees + expenses + insurance, portfolio assessment + readiness,
// achievements, school communications, university targets with a verified
// application plan, a contributed admission case (community library), and REAL
// PDF files uploaded to Supabase Storage (student-documents + admission-proofs).
//
// Idempotent: re-running wipes each demo student's child rows and re-seeds, and
// reuses the existing auth user (resetting its password) if the email exists.
// Uses the SERVICE-ROLE key, so it bypasses RLS — run locally only.

import { readFileSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { randomUUID, createHash } from 'node:crypto'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'

// ── env ───────────────────────────────────────────────────────────────────────
// Load .env.local without a dotenv dependency (same approach as scripts/kb-ingest.ts).
function loadEnvLocal() {
  const path = resolve(process.cwd(), '.env.local')
  if (!existsSync(path)) return
  for (const line of readFileSync(path, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/)
    if (m && process.env[m[1]] === undefined) {
      process.env[m[1]] = m[2].replace(/^["']|["']$/g, '')
    }
  }
}

// ── minimal PDF writer (no deps) ───────────────────────────────────────────────
// Emits a valid single-page A4 PDF (Helvetica) from a title + body lines.
function escapePdf(s: string): string {
  return s.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)')
}

function makePdf(title: string, lines: string[]): Buffer {
  let content = 'BT\n/F1 18 Tf\n60 790 Td\n'
  content += `(${escapePdf(title)}) Tj\n`
  content += '/F1 11 Tf\n0 -30 Td\n'
  for (const raw of lines) {
    // wrap to ~92 chars so text never runs off the page
    const chunks = wrap(raw, 92)
    if (chunks.length === 0) {
      content += '0 -15 Td\n'
      continue
    }
    for (const c of chunks) {
      content += `(${escapePdf(c)}) Tj\n0 -15 Td\n`
    }
  }
  content += 'ET'

  const objs: string[] = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>',
    `<< /Length ${Buffer.byteLength(content, 'latin1')} >>\nstream\n${content}\nendstream`,
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
  ]

  let pdf = '%PDF-1.4\n'
  const offsets: number[] = []
  objs.forEach((body, i) => {
    offsets.push(Buffer.byteLength(pdf, 'latin1'))
    pdf += `${i + 1} 0 obj\n${body}\nendobj\n`
  })
  const xrefStart = Buffer.byteLength(pdf, 'latin1')
  pdf += `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n`
  offsets.forEach((off) => { pdf += `${String(off).padStart(10, '0')} 00000 n \n` })
  pdf += `trailer\n<< /Size ${objs.length + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF`
  return Buffer.from(pdf, 'latin1')
}

function wrap(text: string, width: number): string[] {
  if (text === '') return ['']
  const words = text.split(/\s+/)
  const out: string[] = []
  let line = ''
  for (const w of words) {
    if (line.length + w.length + 1 > width) { out.push(line); line = w }
    else line = line ? `${line} ${w}` : w
  }
  if (line) out.push(line)
  return out
}

// ── seed-data shapes ───────────────────────────────────────────────────────────
type DocSpec = {
  fileName: string
  fileType: 'transcript' | 'report_card' | 'certificate' | 'application' | 'other'
  pdfTitle: string
  pdfLines: string[]
  extractedText: string
}

type ProofSpec = { docKind: 'offer_letter' | 'transcript' | 'test_score' | 'other'; pdfTitle: string; pdfLines: string[] }

// Essay Studio (MS4): a draft + one round of AI critique. The critique shape
// matches EssayFeedback in src/lib/essay-critique.ts — feedback only, no rewrite.
type EssaySpec = {
  title: string
  targetName: string | null   // links to a university_target by name (null = general)
  prompt: string
  content: string
  feedback: {
    overall: string
    structure: string[]
    specificity: string[]
    evidenceAlignment: string[]
    cliches: string[]
    revisionPriorities: string[]
  }
}

type Demo = {
  email: string
  password: string
  displayName: string
  penName: string
  invite: string
  studentProfile: Record<string, unknown>
  readiness: { score: number; gap: string }
  portfolio: Record<string, unknown>
  achievements: Array<{ category: string; title: string; date: string; description: string; xp?: number }>
  milestones: Array<{ year: number; month: number; type: string; title: string; description: string; due_date: string; completed: boolean }>
  events: Array<{ title: string; event_date: string; type: string; source: string; notes?: string | null }>
  fees: Array<{ name: string; amount_sgd: number; due_date: string; category: string; paid: boolean; paid_date?: string | null }>
  expenses: Array<{ amount_sgd: number; category: string; note: string; date: string }>
  insurance: { policy_name: string; insurer: string; policy_number: string; coverage_start: string; coverage_end: string; renewal_date: string; claims_hotline: string }
  comms: Array<{ original_text: string; chinese_translation: string; chinese_summary: string; source_type: 'text' | 'pdf' }>
  targets: Array<Record<string, unknown>>
  documents: DocSpec[]
  admissionCase: {
    institution: string; programme: string; route: string; result: string; apply_year: number
    grades: string; english_test: string; standardized_tests: string; activities: string
    admission_experience: string; interview_experience: string
    proof: ProofSpec
    // MS6 trust tier: 'staff' → 人工复核 (top), 'email' → 邮箱验证 (needs schoolEmail
    // matching this case's institution), else plain ai_verified.
    trust: 'staff' | 'email'
  }
  essays: EssaySpec[]
  // MS6 school-email verification — drives the 邮箱验证 trust tier on cases whose
  // institution matches. Optional; applicants may not have a university mailbox.
  schoolEmail?: { email: string; domain: string; institution: string }
}

// ── Student A — Li Wei — NUS Computer Science (Common track) ─────────────────────
const liWei: Demo = {
  email: 'demo.cs@novara.vip',
  password: 'NovaraDemo2026',
  displayName: 'Li Wei',
  penName: 'CodeWei',
  invite: 'LIWEI26',
  studentProfile: {
    nationality: 'Chinese', age: 18,
    current_year: 'Year 2 (IB)', current_school: 'Hwa Chong International School', current_curriculum: 'IB',
    target_university: 'National University of Singapore', target_programme: 'Computer Science (B.Comp)',
    interests: 'Competitive programming, AI/ML, robotics, open-source contribution',
    budget_range: '50-80k', english_level: 'Advanced',
    target_enrollment_year: 2027,
    application_route: 'IB', target_school: 'National University of Singapore', programme_category: 'Computer Science',
    invite_code: 'LWEI26', onboarding_done: true,
  },
  readiness: {
    score: 78,
    gap: 'Strong academic and competition profile, well-aligned with NUS Computing. Add a capstone software project and a few more community-service hours to lift the initiative and community dimensions. Draft the personal statement early and lock in a strong Computer Science teacher reference before the October window opens.',
  },
  portfolio: {
    overall_level: 'competitive',
    overall_summary: 'A competitive applicant for NUS Computing with excellent academics and informatics-olympiad results. The main growth areas are documented real-world impact and a clear personal narrative.',
    confidence: 'high',
    result: {
      overallLevel: 'competitive',
      overallSummary: 'A competitive applicant for NUS Computing with excellent academics and informatics-olympiad results. The main growth areas are documented real-world impact and a clear personal narrative.',
      dimensionScores: [
        { dimensionId: 'academic_strength', score: 88, level: 'strong', reasoning: 'IB predicted 41/45 with HL Math AA 7 and Physics 7 — rigorous and highly relevant to CS.', strengths: ['Predicted 41/45', 'HL Math AA 7'], gaps: ['Sustain the trend into finals'], suggestedActions: ['Keep HL Math + Physics above 6'] },
        { dimensionId: 'programme_fit', score: 84, level: 'strong', reasoning: 'Competitive programming, AI/ML and robotics map directly onto the NUS Computing common curriculum.', strengths: ['Clear CS focus', 'Olympiad track record'], gaps: ['Articulate why NUS specifically'], suggestedActions: ['Reference NUS Computing modules in the statement'] },
        { dimensionId: 'evidence_portfolio', score: 76, level: 'competitive', reasoning: 'NOI bronze and AMC distinction are credible; needs one shipped software project.', strengths: ['NOI 2025 Bronze', 'AMC 12 distinction'], gaps: ['No deployed project yet'], suggestedActions: ['Publish a GitHub project with a README + demo'] },
        { dimensionId: 'communication_storytelling', score: 68, level: 'developing', reasoning: 'Has the raw material but no drafted narrative connecting the achievements.', strengths: ['Rich material'], gaps: ['No personal-statement draft'], suggestedActions: ['Draft a 650-word statement by September'] },
        { dimensionId: 'initiative_impact', score: 70, level: 'competitive', reasoning: 'Computing Club president shows leadership; impact is mostly internal.', strengths: ['Club President', 'Volunteer tutoring'], gaps: ['Limited external impact'], suggestedActions: ['Run a coding workshop for a community group'] },
      ],
      topStrengths: ['IB predicted 41/45', 'NOI 2025 Bronze', 'Clear CS direction'],
      topGaps: ['No personal-statement draft', 'One shipped project missing'],
      recommendedNextSteps: ['Draft the personal statement by September', 'Ship one open-source project', 'Secure a CS teacher reference'],
      confidence: 'high',
    },
  },
  achievements: [
    { category: 'competition', title: 'NOI 2025 (National Olympiad in Informatics) — Bronze', date: '2025-09-20', description: 'Bronze medal in the national informatics olympiad.', xp: 120 },
    { category: 'competition', title: 'AMC 12 — Distinction (Honor Roll)', date: '2025-11-12', description: 'Top-tier score in the American Mathematics Competition.', xp: 90 },
    { category: 'academic', title: 'IB Year 1 — Predicted 41/45', date: '2026-03-01', description: 'Strong predicted score; HL Math AA 7, Physics 7, CS 6.', xp: 80 },
    { category: 'cca', title: 'Computing Club — President', date: '2026-01-15', description: 'Elected president; runs weekly competitive-programming sessions.', xp: 70 },
    { category: 'volunteer', title: 'Code for Community — Volunteer Tutor (60 hrs)', date: '2025-12-10', description: 'Taught Python basics to secondary-school students.', xp: 60 },
  ],
  milestones: [
    { year: 2026, month: 7,  type: 'application', title: 'Shortlist NUS / NTU CS programmes', description: 'Compare the NUS Computing common curriculum with NTU CS.', due_date: '2026-07-20', completed: true },
    { year: 2026, month: 8,  type: 'competition', title: 'Register for NOI 2026', description: 'Aim to upgrade Bronze → Silver.', due_date: '2026-08-15', completed: false },
    { year: 2026, month: 9,  type: 'application', title: 'Draft NUS personal statement', description: 'First full 650-word draft; ask Mr. Tan to review.', due_date: '2026-09-30', completed: false },
    { year: 2026, month: 10, type: 'application', title: 'NUS application opens — submit early', description: 'International undergraduate application opens mid-October.', due_date: '2026-10-20', completed: false },
    { year: 2026, month: 11, type: 'exam',        title: 'IELTS Academic sitting', description: 'Target overall 7.5. Book via British Council.', due_date: '2026-11-08', completed: false },
    { year: 2026, month: 12, type: 'application', title: 'Secure CS teacher reference letter', description: 'Confirm with HL Computer Science teacher.', due_date: '2026-12-05', completed: false },
    { year: 2027, month: 1,  type: 'application', title: 'Submit NUS Freshmen Scholarship application', description: 'Apply alongside the admission application.', due_date: '2027-01-15', completed: false },
    { year: 2027, month: 2,  type: 'application', title: 'NUS application closes', description: 'Final deadline for international applicants.', due_date: '2027-02-21', completed: false },
    { year: 2027, month: 5,  type: 'exam',        title: 'IB Diploma Final Exams', description: 'All six subjects. The real thing.', due_date: '2027-05-04', completed: false },
  ],
  events: [
    { title: 'NUS Open House (Computing)', event_date: '2026-07-12', type: 'application', source: 'system', notes: 'Register at nus.edu.sg/openhouse' },
    { title: 'Homestay Fee — July', event_date: '2026-07-01', type: 'finance', source: 'system', notes: 'S$1,200 — PayNow to host' },
    { title: 'Computing Club Hackathon', event_date: '2026-08-09', type: 'cca', source: 'manual', notes: null },
    { title: 'NOI 2026 Registration Deadline', event_date: '2026-08-15', type: 'application', source: 'ai', notes: null },
    { title: 'Personal Statement Draft Due', event_date: '2026-09-30', type: 'application', source: 'ai', notes: 'Send to Mr. Tan for review' },
    { title: 'NUS Application Opens', event_date: '2026-10-15', type: 'application', source: 'system', notes: null },
    { title: 'IELTS Academic Test', event_date: '2026-11-08', type: 'exam', source: 'system', notes: 'British Council, Napier Road' },
    { title: 'NUS Freshmen Scholarship Deadline', event_date: '2027-01-15', type: 'application', source: 'system', notes: null },
  ],
  fees: [
    { name: 'Tuition — Term 2 2026', amount_sgd: 11000, due_date: '2026-04-01', category: 'tuition', paid: true, paid_date: '2026-03-28' },
    { name: 'Homestay — June 2026', amount_sgd: 1200, due_date: '2026-06-01', category: 'homestay', paid: true, paid_date: '2026-05-30' },
    { name: 'Homestay — July 2026', amount_sgd: 1200, due_date: '2026-07-01', category: 'homestay', paid: false, paid_date: null },
    { name: 'Tuition — Term 3 2026', amount_sgd: 11000, due_date: '2026-07-01', category: 'tuition', paid: false, paid_date: null },
    { name: 'IELTS Test Fee', amount_sgd: 340, due_date: '2026-10-20', category: 'other', paid: false, paid_date: null },
    { name: 'Student Health Insurance (Annual)', amount_sgd: 1300, due_date: '2026-08-15', category: 'insurance', paid: false, paid_date: null },
    { name: 'IB Examination Fees 2027', amount_sgd: 3000, due_date: '2026-11-15', category: 'tuition', paid: false, paid_date: null },
  ],
  expenses: [
    { amount_sgd: 30, category: 'transport', note: 'EZ-Link top-up', date: '2026-06-24' },
    { amount_sgd: 26, category: 'food', note: 'Hawker lunch × 5', date: '2026-06-23' },
    { amount_sgd: 48, category: 'school_supplies', note: 'Competitive programming book', date: '2026-06-21' },
    { amount_sgd: 22, category: 'food', note: 'Bubble tea + snacks', date: '2026-06-20' },
    { amount_sgd: 18, category: 'activities', note: 'Club movie night', date: '2026-06-18' },
    { amount_sgd: 35, category: 'transport', note: 'Grab rides (week)', date: '2026-06-16' },
  ],
  insurance: {
    policy_name: 'International Student Shield', insurer: 'AXA Singapore', policy_number: 'AXA-STU-552031',
    coverage_start: '2025-08-01', coverage_end: '2026-07-31', renewal_date: '2026-08-15', claims_hotline: '+65 6880 4888',
  },
  comms: [
    { original_text: 'Dear Parents, the NUS International Undergraduate application window for August 2027 intake opens 15 October 2026 and closes 21 February 2027. Please ensure predicted grades and references are ready.', chinese_translation: '尊敬的家长，新加坡国立大学2027年8月入学的国际本科申请将于2026年10月15日开放，2027年2月21日截止。请确保预估成绩和推荐信准备就绪。', chinese_summary: 'NUS本科申请2026年10月15日开放、2027年2月21日截止，请提前备好预估成绩与推荐信。', source_type: 'text' },
    { original_text: 'Dear Parents, Term 3 2026 invoice attached. Total due: SGD 11,000. Payment due by 1 July 2026.', chinese_translation: '尊敬的家长，第三学期账单已附上，应付金额新币11,000元，截止日期2026年7月1日。', chinese_summary: '第三学期学费新币11,000元，7月1日前缴清。', source_type: 'text' },
  ],
  targets: [
    {
      name: 'National University of Singapore', country: 'Singapore', programme: 'Computer Science (B.Comp) — Common track',
      deadline: '2027-02-21', status: 'researching', reference_link: 'https://www.comp.nus.edu.sg/programmes/ug/cs/',
      requirements: 'Strong HL Mathematics; competitive academic profile; English proficiency (IELTS/TOEFL or IB English); holistic review.',
      notes: 'Primary target. Common curriculum — specialisation chosen later. Apply early in the window.',
      gap_score: 78,
      gap_analysis: JSON.stringify({ summary: 'Competitive fit; needs a shipped project and an early personal-statement draft.', strengths: ['IB predicted 41/45', 'NOI 2025 Bronze', 'Clear CS direction'], gaps: ['No personal-statement draft', 'One shipped software project missing'] }),
      application_plan: {
        applicationWindow: { opens: '2026-10-15', closes: '2027-02-21' },
        deadlines: [
          { date: '2026-10-15', title: 'NUS application opens (International qualifications)' },
          { date: '2027-01-15', title: 'NUS Freshmen Scholarships deadline', description: 'Apply alongside the admission application.' },
          { date: '2027-02-21', title: 'NUS application closes' },
          { date: '2027-07-06', title: 'Submit final IB results', description: 'Predicted grades accepted earlier; final results confirm the offer.' },
        ],
        documents: [
          { id: 'doc-0', title: 'Academic transcript (Year 1 + predicted)', required: true, done: true },
          { id: 'doc-1', title: 'IB predicted grades', required: true, done: true },
          { id: 'doc-2', title: 'Personal statement / motivation', required: true, done: false },
          { id: 'doc-3', title: 'English proficiency (IELTS 7.5 / IB English)', required: true, done: false },
          { id: 'doc-4', title: 'Passport bio page', required: true, done: true },
          { id: 'doc-5', title: 'Teacher recommendation', required: false, done: false },
          { id: 'doc-6', title: 'Portfolio of coding projects (optional)', required: false, done: false },
        ],
        sources: [
          { url: 'https://www.nus.edu.sg/oam/apply-to-nus/international-qualifications', title: 'NUS Office of Admissions — International Qualifications', lastVerified: '2026-06-15' },
          { url: 'https://www.comp.nus.edu.sg/programmes/ug/cs/', title: 'NUS Computing — BComp in Computer Science', lastVerified: '2026-06-15' },
          { url: 'https://www.nus.edu.sg/oam/scholarships/nus-undergraduate-scholarships', title: 'NUS Undergraduate Scholarships', lastVerified: '2026-06-15' },
        ],
        verified: true,
        notes: 'NUS Computing follows the Common Curriculum — you choose a specialisation in Year 2. International applicants are assessed holistically; apply early as places fill quickly.',
      },
    },
    {
      name: 'Nanyang Technological University', country: 'Singapore', programme: 'Computer Science',
      deadline: '2027-02-19', status: 'applied', reference_link: 'https://www.ntu.edu.sg/scse',
      requirements: 'Strong mathematics and computing aptitude; holistic admissions.',
      notes: 'Conditional offer already received (see my contributed case in the community library).',
      gap_score: 82, gap_analysis: JSON.stringify({ summary: 'Strong fit; conditional offer in hand.', strengths: ['Olympiad results', 'Predicted 41/45'], gaps: ['Maintain predicted grades'] }),
      application_plan: null,
    },
    {
      name: 'University College London (UCL)', country: 'United Kingdom', programme: 'Computer Science MEng',
      deadline: '2027-01-29', status: 'researching', reference_link: 'https://www.ucl.ac.uk/prospective-students/undergraduate/degrees/computer-science-meng',
      requirements: 'IB 39+ with HL Math; UCAS application; reach school.',
      notes: 'Reach option via UCAS. Needs the personal statement done first.',
      gap_score: 64, gap_analysis: JSON.stringify({ summary: 'Reach; competitive but UK CS is very selective.', strengths: ['HL Math 7'], gaps: ['UCAS statement not started'] }),
      application_plan: null,
    },
  ],
  documents: [
    {
      fileName: 'IB_Transcript_Year1.pdf', fileType: 'transcript',
      pdfTitle: 'Hwa Chong International School — IB Year 1 Transcript',
      pdfLines: [
        'Student: Li Wei        Candidate No: 002841-0017', 'Programme: IB Diploma (Year 1)        Academic Year: 2025-2026', '',
        'Subject                                  Level     Grade (1-7)',
        'Mathematics: Analysis & Approaches       HL        7',
        'Physics                                  HL        7',
        'Computer Science                         HL        6',
        'English A: Language & Literature         SL        6',
        'Chinese A: Literature                    SL        7',
        'Economics                                SL        6', '',
        'Predicted Diploma Total: 41 / 45  (incl. EE + TOK: +2)',
        'Conduct: Excellent        Attendance: 98%',
        'Issued: 1 March 2026        Registrar, Hwa Chong International School',
      ],
      extractedText: 'IB Year 1 transcript for Li Wei. HL Math AA 7, Physics 7, Computer Science 6. Predicted total 41/45.',
    },
    {
      fileName: 'IB_Predicted_Grades.pdf', fileType: 'report_card',
      pdfTitle: 'Official Predicted Grades — IB Diploma 2027',
      pdfLines: [
        'Student: Li Wei        Date of Birth: 14 Mar 2008', 'Curriculum: International Baccalaureate Diploma Programme', '',
        'Predicted Grades (issued for university application):',
        '  Mathematics AA HL .................... 7', '  Physics HL ........................... 7',
        '  Computer Science HL .................. 6', '  English A Lang & Lit SL .............. 6',
        '  Chinese A Literature SL .............. 7', '  Economics SL ......................... 6',
        '  Extended Essay (Computer Science) .... A', '  Theory of Knowledge .................. B', '',
        'Predicted Total: 41 / 45',
        'These predictions are issued by the school for the August 2027 university intake.',
      ],
      extractedText: 'Predicted IB grades: 41/45 total. HL Math 7, Physics 7, CS 6. EE grade A in Computer Science.',
    },
    {
      fileName: 'NOI_2025_Certificate.pdf', fileType: 'certificate',
      pdfTitle: 'National Olympiad in Informatics 2025 — Certificate of Achievement',
      pdfLines: [
        'This is to certify that', '', '            LI  WEI', '',
        'of Hwa Chong International School', 'has been awarded the BRONZE MEDAL', 'at the National Olympiad in Informatics (NOI) 2025.', '',
        'Score: 312 / 400        Rank: 47 of 612 contestants', 'Awarded: 20 September 2025', '',
        'Organised by the School of Computing, National University of Singapore.',
      ],
      extractedText: 'NOI 2025 Bronze Medal certificate for Li Wei. Score 312/400, rank 47 of 612.',
    },
  ],
  admissionCase: {
    institution: 'Nanyang Technological University (NTU)', programme: 'Computer Science', route: 'IB', result: 'offer', apply_year: 2026,
    grades: 'IB predicted 41/45 — HL Math AA 7, Physics 7, Computer Science 6', english_test: 'IELTS Academic 7.5',
    standardized_tests: 'SAT 1520 (Math 800, EBRW 720)', activities: 'NOI 2025 Bronze, Computing Club President, 60h coding-tutor volunteering',
    admission_experience: 'Applied to NTU SCSE in the early window with predicted IB grades. The form was straightforward — transcript, predicted grades, a 300-word statement on why computer science, and one teacher reference. I leaned hard on my NOI experience and a small competitive-programming library I open-sourced. A conditional offer (final IB 38+) came back about six weeks later. My advice: get your predicted grades issued early and have one concrete project you can talk about in depth rather than a long list of activities.',
    interview_experience: 'No formal interview for the CS track — admission was based on the written application and academic record.',
    proof: {
      docKind: 'offer_letter', pdfTitle: 'NTU — Conditional Offer of Admission',
      pdfLines: [
        'NANYANG TECHNOLOGICAL UNIVERSITY', 'School of Computer Science and Engineering', '', 'Date: 12 May 2026', '',
        'Dear Li Wei,', '',
        'We are pleased to offer you a place in the Bachelor of Computing in', 'Computer Science programme for the academic year commencing August 2027,',
        'subject to the following condition:', '', '   - Attain a final IB Diploma score of 38 points or higher.', '',
        'This offer is conditional and will be confirmed upon receipt of your final', 'IB results in July 2027. Please indicate your acceptance by 30 June 2026.', '',
        'Yours sincerely,', 'Office of Admissions', 'Nanyang Technological University',
      ],
    },
    trust: 'email', // matches the verified NTU mailbox below → 邮箱验证 badge
  },
  // Offer-holder with a provisional NTU mailbox → his NTU case earns 邮箱验证.
  schoolEmail: { email: 'liwei.2027@e.ntu.edu.sg', domain: 'e.ntu.edu.sg', institution: 'NTU' },
  essays: [
    {
      title: 'Why Computer Science at NUS',
      targetName: 'National University of Singapore',
      prompt: 'In about 600 words, tell us why you wish to study Computer Science and why NUS Computing is the right place for you.',
      content:
        'I have always loved computers. Ever since I was young I was fascinated by how they work, and I have always been passionate about technology and solving problems. ' +
        'In secondary school I joined the Computing Club and later became its president, where I organised weekly sessions for other students. ' +
        'I also took part in the National Olympiad in Informatics and won a bronze medal, which taught me a lot about algorithms and perseverance. ' +
        'NUS Computing is a world-class school with an excellent common curriculum, and I believe it would be the perfect place for me to grow. ' +
        'I am a hard worker and a fast learner, and I am confident that I would be a great fit for the programme and contribute to the community.',
      feedback: {
        overall: 'A sincere draft with real material behind it, but right now it reads like many other applications — the opening is generic and the strongest evidence is under-used. The NOI experience is your differentiator; build the essay around one concrete moment from it rather than listing achievements.',
        structure: [
          'Opening ("I have always loved computers") is the most common admissions cliché — cut it and open in the middle of a specific scene.',
          'The paragraph on NUS is generic praise; move it after your story and tie it to specific NUS Computing modules or the common curriculum.',
        ],
        specificity: [
          '"passionate about technology and solving problems" — replace with the actual problem you solved at NOI and how you approached it.',
          '"world-class school with an excellent common curriculum" — name the specific module or research area that draws you.',
        ],
        evidenceAlignment: [
          'You mention the NOI bronze in one line, but your records show it was rank 47 of 612 with a 312/400 score — lead with that concrete result and what you learned debugging under time pressure.',
          'Your Computing Club presidency is stated but not shown — describe one session you ran and its effect on a specific student.',
        ],
        cliches: ['"I have always loved computers"', '"hard worker and a fast learner"', '"perfect place for me to grow"'],
        revisionPriorities: [
          'Replace the generic opening with a specific NOI or club moment.',
          'Cut both clichés in the final paragraph and show the trait instead.',
          'Connect your interests to one named NUS Computing offering.',
        ],
      },
    },
  ],
}

// ── Student B — Chen Yixin — NUS Business (BBA) ──────────────────────────────────
const chenYixin: Demo = {
  email: 'demo.biz@novara.vip',
  password: 'NovaraDemo2026',
  displayName: 'Chen Yixin',
  penName: 'YixinC',
  invite: 'YIXIN26',
  studentProfile: {
    nationality: 'Chinese', age: 18,
    current_year: 'Year 2 (A-Level)', current_school: 'Catholic Junior College', current_curriculum: 'A-Level',
    target_university: 'National University of Singapore', target_programme: 'Business Administration (BBA)',
    interests: 'Entrepreneurship, marketing, finance, competitive debate',
    budget_range: '50-80k', english_level: 'Advanced',
    target_enrollment_year: 2027,
    application_route: 'A-Level', target_school: 'National University of Singapore', programme_category: 'Business',
    invite_code: 'CYIN26', onboarding_done: true,
  },
  readiness: {
    score: 74,
    gap: 'Well-rounded business applicant with strong leadership and competition results. Sharpen the quantitative side of your profile and gather measurable outcomes from your business-society projects. Prepare a concise CV of activities — NUS BBA weighs the holistic write-up heavily.',
  },
  portfolio: {
    overall_level: 'competitive',
    overall_summary: 'A competitive BBA applicant with leadership depth and competition wins. Strengthening quantitative evidence and outcome metrics would push the profile higher.',
    confidence: 'high',
    result: {
      overallLevel: 'competitive',
      overallSummary: 'A competitive BBA applicant with leadership depth and competition wins. Strengthening quantitative evidence and outcome metrics would push the profile higher.',
      dimensionScores: [
        { dimensionId: 'academic_strength', score: 80, level: 'strong', reasoning: 'A-Level prelims: 3x H2 A (Economics, Math, Business) and H1 A — strong and relevant.', strengths: ['3x H2 A predicted'], gaps: ['Convert prelims into final A grades'], suggestedActions: ['Maintain H2 Math grade'] },
        { dimensionId: 'programme_fit', score: 82, level: 'strong', reasoning: 'Entrepreneurship, debate and finance interests align tightly with BBA.', strengths: ['Clear business focus'], gaps: ['Name a BBA specialisation interest'], suggestedActions: ['Reference NUS BBA marketing/finance tracks'] },
        { dimensionId: 'evidence_portfolio', score: 72, level: 'competitive', reasoning: 'Business-plan competition 2nd place is strong; quantify the outcomes.', strengths: ['Business-plan award'], gaps: ['Few measurable metrics'], suggestedActions: ['Add revenue/reach numbers to projects'] },
        { dimensionId: 'communication_storytelling', score: 74, level: 'competitive', reasoning: 'Debate background means strong communication; needs a written narrative.', strengths: ['Debater', 'Articulate'], gaps: ['No personal-statement draft'], suggestedActions: ['Draft the statement + activity CV'] },
        { dimensionId: 'initiative_impact', score: 76, level: 'competitive', reasoning: 'Business society VP with real events; impact is school-scale.', strengths: ['Society VP', 'Ran events'], gaps: ['Scale beyond school'], suggestedActions: ['Partner with an external SME or NGO'] },
      ],
      topStrengths: ['Business-plan competition runner-up', 'Society VP leadership', '3x H2 A predicted'],
      topGaps: ['No personal-statement draft', 'Outcome metrics missing'],
      recommendedNextSteps: ['Build an activity CV with metrics', 'Draft personal statement', 'Prepare for a possible BBA interview'],
      confidence: 'high',
    },
  },
  achievements: [
    { category: 'award', title: 'Singapore Youth Business Plan Competition — 2nd Place', date: '2025-10-18', description: 'Runner-up nationally for a campus food-waste startup pitch.', xp: 120 },
    { category: 'cca', title: "Students' Business Society — Vice President", date: '2026-02-10', description: 'Leads sponsorship and the annual entrepreneurship fair.', xp: 80 },
    { category: 'competition', title: 'National Schools Debate Championship — Quarterfinalist', date: '2025-08-22', description: 'Reached the quarterfinals in the national debate league.', xp: 70 },
    { category: 'volunteer', title: 'Junior Achievement — Programme Volunteer (50 hrs)', date: '2025-12-05', description: 'Mentored secondary students in financial literacy.', xp: 60 },
    { category: 'academic', title: 'A-Level Prelim — 3x H2 A, 1x H1 A', date: '2026-03-05', description: 'Economics, Mathematics, Business (H2) and General Paper (H1).', xp: 80 },
  ],
  milestones: [
    { year: 2026, month: 7,  type: 'application', title: 'Shortlist NUS / SMU / NTU business programmes', description: 'Compare BBA vs SMU Business Management vs NTU Business.', due_date: '2026-07-18', completed: true },
    { year: 2026, month: 8,  type: 'cca',         title: 'Run the Entrepreneurship Fair', description: 'Lead sponsorship + logistics as Society VP.', due_date: '2026-08-23', completed: false },
    { year: 2026, month: 9,  type: 'application', title: 'Build activity CV + draft personal statement', description: 'One-page CV with measurable outcomes.', due_date: '2026-09-28', completed: false },
    { year: 2026, month: 10, type: 'application', title: 'NUS application opens — submit early', description: 'International undergraduate application opens mid-October.', due_date: '2026-10-20', completed: false },
    { year: 2026, month: 11, type: 'exam',        title: 'IELTS Academic sitting', description: 'Target overall 7.0.', due_date: '2026-11-15', completed: false },
    { year: 2026, month: 12, type: 'application', title: 'Secure Economics teacher reference', description: 'Confirm with H2 Economics tutor.', due_date: '2026-12-08', completed: false },
    { year: 2027, month: 1,  type: 'application', title: 'Prepare for possible BBA interview', description: 'BBA shortlists some applicants for interview.', due_date: '2027-01-20', completed: false },
    { year: 2027, month: 2,  type: 'application', title: 'NUS application closes', description: 'Final deadline for international applicants.', due_date: '2027-02-21', completed: false },
    { year: 2027, month: 3,  type: 'exam',        title: 'A-Level final exams begin', description: 'H2 Economics, Mathematics, Business.', due_date: '2027-03-08', completed: false },
  ],
  events: [
    { title: 'NUS Business School Info Session', event_date: '2026-07-15', type: 'application', source: 'system', notes: 'Register at bba.nus.edu.sg' },
    { title: 'Homestay Fee — July', event_date: '2026-07-01', type: 'finance', source: 'system', notes: 'S$1,100 — PayNow to host' },
    { title: 'Entrepreneurship Fair (Society VP)', event_date: '2026-08-23', type: 'cca', source: 'manual', notes: null },
    { title: 'Activity CV + Statement Draft Due', event_date: '2026-09-28', type: 'application', source: 'ai', notes: null },
    { title: 'NUS Application Opens', event_date: '2026-10-15', type: 'application', source: 'system', notes: null },
    { title: 'IELTS Academic Test', event_date: '2026-11-15', type: 'exam', source: 'system', notes: 'British Council, Napier Road' },
    { title: 'BBA Interview Prep Session', event_date: '2027-01-20', type: 'application', source: 'ai', notes: null },
    { title: 'NUS Application Closes', event_date: '2027-02-21', type: 'application', source: 'system', notes: null },
  ],
  fees: [
    { name: 'Tuition — Term 2 2026', amount_sgd: 10500, due_date: '2026-04-01', category: 'tuition', paid: true, paid_date: '2026-03-26' },
    { name: 'Homestay — June 2026', amount_sgd: 1100, due_date: '2026-06-01', category: 'homestay', paid: true, paid_date: '2026-05-29' },
    { name: 'Homestay — July 2026', amount_sgd: 1100, due_date: '2026-07-01', category: 'homestay', paid: false, paid_date: null },
    { name: 'Tuition — Term 3 2026', amount_sgd: 10500, due_date: '2026-07-01', category: 'tuition', paid: false, paid_date: null },
    { name: 'IELTS Test Fee', amount_sgd: 340, due_date: '2026-10-25', category: 'other', paid: false, paid_date: null },
    { name: 'Student Health Insurance (Annual)', amount_sgd: 1250, due_date: '2026-08-20', category: 'insurance', paid: false, paid_date: null },
    { name: 'A-Level Examination Fees 2027', amount_sgd: 1400, due_date: '2026-12-01', category: 'tuition', paid: false, paid_date: null },
  ],
  expenses: [
    { amount_sgd: 28, category: 'transport', note: 'EZ-Link top-up', date: '2026-06-25' },
    { amount_sgd: 24, category: 'food', note: 'Hawker lunch × 5', date: '2026-06-23' },
    { amount_sgd: 39, category: 'school_supplies', note: 'Economics revision guides', date: '2026-06-22' },
    { amount_sgd: 16, category: 'food', note: 'Cafe study session', date: '2026-06-20' },
    { amount_sgd: 20, category: 'activities', note: 'Debate club social', date: '2026-06-19' },
    { amount_sgd: 32, category: 'transport', note: 'Grab rides (week)', date: '2026-06-17' },
  ],
  insurance: {
    policy_name: 'Student Care Plus', insurer: 'Great Eastern', policy_number: 'GE-STU-771204',
    coverage_start: '2025-08-01', coverage_end: '2026-07-31', renewal_date: '2026-08-20', claims_hotline: '+65 6248 2888',
  },
  comms: [
    { original_text: 'Dear Parents, NUS BBA shortlisted applicants may be invited to an admissions interview between January and March 2027. Please keep your child available for online interview slots.', chinese_translation: '尊敬的家长，新加坡国立大学工商管理（BBA）入围申请者可能于2027年1月至3月受邀参加招生面试。请确保孩子可参加线上面试时段。', chinese_summary: 'NUS BBA可能于2027年1–3月安排面试，请预留时间。', source_type: 'text' },
    { original_text: 'Dear Parents, Term 3 2026 invoice attached. Total due: SGD 10,500. Payment due by 1 July 2026.', chinese_translation: '尊敬的家长，第三学期账单已附上，应付金额新币10,500元，截止日期2026年7月1日。', chinese_summary: '第三学期学费新币10,500元，7月1日前缴清。', source_type: 'text' },
  ],
  targets: [
    {
      name: 'National University of Singapore', country: 'Singapore', programme: 'Business Administration (BBA)',
      deadline: '2027-02-21', status: 'researching', reference_link: 'https://bba.nus.edu.sg/',
      requirements: 'Strong academic record; holistic review with emphasis on leadership and communication; possible interview; English proficiency.',
      notes: 'Primary target. BBA weighs the holistic write-up and may interview — prepare an activity CV.',
      gap_score: 74,
      gap_analysis: JSON.stringify({ summary: 'Competitive; strengthen quantitative evidence and prep for a possible interview.', strengths: ['Business-plan runner-up', 'Society VP', '3x H2 A predicted'], gaps: ['Outcome metrics missing', 'Personal statement not drafted'] }),
      application_plan: {
        applicationWindow: { opens: '2026-10-15', closes: '2027-02-21' },
        deadlines: [
          { date: '2026-10-15', title: 'NUS application opens (International qualifications)' },
          { date: '2027-02-21', title: 'NUS application closes' },
          { date: '2027-01-31', title: 'BBA interview window opens', description: 'Shortlisted applicants invited Jan–Mar.' },
          { date: '2027-07-10', title: 'Submit final A-Level results' },
        ],
        documents: [
          { id: 'doc-0', title: 'Academic transcript (predicted A-Level)', required: true, done: true },
          { id: 'doc-1', title: 'A-Level prelim / predicted results', required: true, done: true },
          { id: 'doc-2', title: 'Personal statement / motivation', required: true, done: false },
          { id: 'doc-3', title: 'Activity CV / resume', required: true, done: false },
          { id: 'doc-4', title: 'English proficiency (IELTS 7.0)', required: true, done: false },
          { id: 'doc-5', title: 'Passport bio page', required: true, done: true },
          { id: 'doc-6', title: 'Teacher recommendation', required: false, done: false },
        ],
        sources: [
          { url: 'https://www.nus.edu.sg/oam/apply-to-nus/international-qualifications', title: 'NUS Office of Admissions — International Qualifications', lastVerified: '2026-06-15' },
          { url: 'https://bba.nus.edu.sg/admissions/', title: 'NUS Business School — BBA Admissions', lastVerified: '2026-06-15' },
          { url: 'https://bba.nus.edu.sg/', title: 'NUS BBA Programme Overview', lastVerified: '2026-06-15' },
        ],
        verified: true,
        notes: 'NUS BBA is holistic — leadership, communication and a clear activity record matter alongside grades. Shortlisted applicants may be interviewed; prepare a one-page activity CV.',
      },
    },
    {
      name: 'Singapore Management University (SMU)', country: 'Singapore', programme: 'Business Management',
      deadline: '2027-02-15', status: 'applied', reference_link: 'https://admissions.smu.edu.sg/',
      requirements: 'Holistic admissions; strong communication; interview / assessment.',
      notes: 'Conditional offer already received (see my contributed case in the community library).',
      gap_score: 80, gap_analysis: JSON.stringify({ summary: 'Strong fit; conditional offer in hand.', strengths: ['Debate + leadership', 'Business-plan award'], gaps: ['Maintain predicted grades'] }),
      application_plan: null,
    },
    {
      name: 'Nanyang Technological University', country: 'Singapore', programme: 'Business (Accountancy & Business)',
      deadline: '2027-02-19', status: 'researching', reference_link: 'https://www.ntu.edu.sg/business',
      requirements: 'Strong academics; holistic review.',
      notes: 'Backup option; double-degree pathways available.',
      gap_score: 70, gap_analysis: JSON.stringify({ summary: 'Solid fit as a secondary choice.', strengths: ['H2 Math A'], gaps: ['Decide single vs double degree'] }),
      application_plan: null,
    },
  ],
  documents: [
    {
      fileName: 'A-Level_Prelim_Results.pdf', fileType: 'report_card',
      pdfTitle: 'Catholic Junior College — A-Level Preliminary Results',
      pdfLines: [
        'Student: Chen Yixin        Index No: 2026-CJC-0451', 'Examination: GCE A-Level Preliminary (Year 2)        2026', '',
        'Subject                                  Level     Grade',
        'Economics                                H2        A',
        'Mathematics                              H2        A',
        'Management of Business                   H2        A',
        'General Paper                            H1        A',
        'Project Work                             H1        A',
        'Chinese Language                         H1        B', '',
        'Rank Points (estimated): 88.75 / 90',
        'Issued: 5 March 2026        Catholic Junior College',
      ],
      extractedText: 'A-Level prelim results for Chen Yixin: H2 Economics A, Mathematics A, Management of Business A; H1 GP A.',
    },
    {
      fileName: 'Business_Plan_Competition_Certificate.pdf', fileType: 'certificate',
      pdfTitle: 'Singapore Youth Business Plan Competition 2025 — Certificate',
      pdfLines: [
        'This certifies that', '', '          CHEN  YIXIN', '',
        'and team "GreenBite" were awarded', '             2ND PLACE (RUNNER-UP)', '',
        'at the Singapore Youth Business Plan Competition 2025', 'for a campus food-waste reduction venture.', '',
        'Finalists: 8 teams of 64        Award date: 18 October 2025',
        'Organised by the Singapore Youth Entrepreneurship Council.',
      ],
      extractedText: 'Singapore Youth Business Plan Competition 2025 — 2nd place certificate for Chen Yixin, team GreenBite.',
    },
    {
      fileName: 'Activity_Record_CCA.pdf', fileType: 'other',
      pdfTitle: 'Co-Curricular Activity Record',
      pdfLines: [
        'Student: Chen Yixin        2024 - 2026', '',
        "Students' Business Society .......... Vice President (2026), Member (2024-25)",
        '   - Led sponsorship for the annual Entrepreneurship Fair (S$12k raised)',
        '   - Organised 6 industry talks; ~400 total attendees',
        'Debate Society ...................... Core team (2024-2026)',
        '   - National Schools Debate Championship 2025 — Quarterfinalist',
        'Junior Achievement .................. Programme Volunteer (50 hours, 2025)',
        '', 'Leadership grade: Distinction        Conduct: Excellent',
        'Verified by: Head of Student Development, Catholic Junior College',
      ],
      extractedText: 'CCA record for Chen Yixin: Business Society VP, Debate Society core, Junior Achievement volunteer.',
    },
  ],
  admissionCase: {
    institution: 'Singapore Management University (SMU)', programme: 'Business Management', route: 'A-Level', result: 'offer', apply_year: 2026,
    grades: 'A-Level prelim: H2 Economics A, Mathematics A, Management of Business A; H1 GP A', english_test: 'IELTS Academic 7.0',
    standardized_tests: '—', activities: "Business Society VP, debate quarterfinalist, business-plan competition runner-up",
    admission_experience: 'SMU runs a holistic, communication-heavy admissions process. After submitting predicted grades and an activity write-up, I was invited to a group-based assessment and a short individual interview. They cared far more about how I reasoned out loud and worked with strangers than about my grades alone. I prepared by re-running my business-plan pitch and practising structured arguments from debate. A conditional offer for Business Management arrived two weeks after the assessment. My advice for SMU specifically: practise thinking aloud in a group — that is the real test.',
    interview_experience: 'Group assessment (6 applicants, a discussion task) plus a 15-minute individual interview covering my activities and a "why business" question. Friendly but fast-paced.',
    proof: {
      docKind: 'offer_letter', pdfTitle: 'SMU — Conditional Offer of Admission',
      pdfLines: [
        'SINGAPORE MANAGEMENT UNIVERSITY', 'Office of Undergraduate Admissions', '', 'Date: 6 May 2026', '',
        'Dear Chen Yixin,', '',
        'Congratulations! Following your application and admissions assessment, we are', 'pleased to offer you a place in the Bachelor of Business Management programme',
        'for the intake commencing August 2027, subject to the condition below:', '', '   - Attain A-Level grades of AAA/A at H2 or equivalent.', '',
        'This is a conditional offer pending your final A-Level results. Kindly confirm', 'your acceptance via the applicant portal by 30 June 2026.', '',
        'Warm regards,', 'Office of Undergraduate Admissions', 'Singapore Management University',
      ],
    },
    trust: 'staff', // admin-confirmed → 人工复核 (top tier), no school email needed
  },
  essays: [
    {
      title: 'BBA Personal Statement — Leadership',
      targetName: 'National University of Singapore',
      prompt: 'Describe a leadership experience and what it taught you about yourself. (~500 words)',
      content:
        'Leadership has always been a big part of who I am. As captain of my school debate team, I learned that a good leader must lead by example and always put the team first. ' +
        'We faced many challenges throughout the season, but through hard work and determination we overcame them together. ' +
        'I organised extra practice sessions and made sure everyone felt included and motivated. ' +
        'In the end, we won the regional championship, which was a proud moment for all of us. ' +
        'This experience taught me the importance of teamwork, communication, and never giving up, qualities I will bring to the NUS BBA programme.',
      feedback: {
        overall: 'The championship is a strong anchor, but the essay tells rather than shows and stays at the level of generic leadership lessons. Pick the single hardest moment of the season and let one scene carry the reflection — admissions readers have seen "lead by example" thousands of times.',
        structure: [
          'Opening states a conclusion ("leadership has always been a big part of who I am") instead of dropping the reader into a moment — start at the tense pre-final practice.',
          'The reflection is compressed into the last sentence; give it its own paragraph tied to a specific decision you made.',
        ],
        specificity: [
          '"we faced many challenges" — name one: a losing round, a teammate conflict, a motion you were unprepared for.',
          '"made sure everyone felt included" — show the specific thing you did for one specific teammate.',
        ],
        evidenceAlignment: [
          'Your records list the debate captaincy and a regional title — good, but also connect this to the entrepreneurship/finance interests in your profile so the BBA fit is explicit.',
        ],
        cliches: ['"lead by example"', '"put the team first"', '"never giving up"'],
        revisionPriorities: [
          'Open inside one scene from the hardest round of the season.',
          'Replace the three flagged clichés with concrete actions and decisions.',
          'Link the lesson to why BBA specifically, not leadership in general.',
        ],
      },
    },
  ],
}

const DEMOS = [liWei, chenYixin]

// ── seeding engine ─────────────────────────────────────────────────────────────
async function findUserByEmail(admin: SupabaseClient, email: string): Promise<string | null> {
  for (let page = 1; page <= 20; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 })
    if (error) throw error
    const hit = data.users.find((u) => (u.email ?? '').toLowerCase() === email.toLowerCase())
    if (hit) return hit.id
    if (data.users.length < 200) break
  }
  return null
}

async function upsertSingle(admin: SupabaseClient, table: string, keyCol: string, keyVal: string, payload: Record<string, unknown>) {
  const { data: existing } = await admin.from(table).select(keyCol).eq(keyCol, keyVal).limit(1)
  if (existing && existing.length > 0) {
    const { error } = await admin.from(table).update(payload).eq(keyCol, keyVal)
    if (error) throw new Error(`${table} update: ${error.message}`)
  } else {
    const { error } = await admin.from(table).insert({ [keyCol]: keyVal, ...payload })
    if (error) throw new Error(`${table} insert: ${error.message}`)
  }
}

async function replaceMany(admin: SupabaseClient, table: string, keyCol: string, keyVal: string, rows: Record<string, unknown>[]) {
  const { error: delErr } = await admin.from(table).delete().eq(keyCol, keyVal)
  if (delErr) throw new Error(`${table} delete: ${delErr.message}`)
  if (rows.length === 0) return
  const { error: insErr } = await admin.from(table).insert(rows)
  if (insErr) throw new Error(`${table} insert: ${insErr.message}`)
}

async function seedDemo(admin: SupabaseClient, d: Demo) {
  console.log(`\n── ${d.displayName}  <${d.email}>  ──────────────────────────────`)

  // 1) auth user (create or reset password)
  let userId = await findUserByEmail(admin, d.email)
  if (userId) {
    const { error } = await admin.auth.admin.updateUserById(userId, {
      password: d.password, email_confirm: true,
      user_metadata: { role: 'student', display_name: d.displayName },
    })
    if (error) throw new Error(`updateUser: ${error.message}`)
    console.log(`  • auth user exists → password reset (${userId})`)
  } else {
    const { data, error } = await admin.auth.admin.createUser({
      email: d.email, password: d.password, email_confirm: true,
      user_metadata: { role: 'student', display_name: d.displayName },
    })
    if (error) throw new Error(`createUser: ${error.message}`)
    userId = data.user!.id
    console.log(`  • auth user created (${userId})`)
    // give the on_auth_user_created trigger a moment to insert profile rows
    await new Promise((r) => setTimeout(r, 400))
  }

  // 2) profile + student_profile
  await upsertSingle(admin, 'profiles', 'id', userId, {
    role: 'student', display_name: d.displayName, pen_name: d.penName, preferred_language: 'en',
  })
  await upsertSingle(admin, 'student_profiles', 'user_id', userId, d.studentProfile)
  console.log('  • profile + student_profile')

  // 3) roadmap quota
  await upsertSingle(admin, 'roadmap_generation_quota', 'user_id', userId, {
    first_generation_used: true, total_generations: 1, free_used_this_year: 1,
  })

  // 4) readiness + portfolio assessment
  await replaceMany(admin, 'readiness_scores', 'student_id', userId, [
    { student_id: userId, score: d.readiness.score, gap_analysis: d.readiness.gap },
  ])
  await replaceMany(admin, 'portfolio_assessments', 'student_id', userId, [
    { student_id: userId, ...d.portfolio },
  ])
  console.log('  • readiness + portfolio assessment')

  // 5) achievements
  await replaceMany(admin, 'achievements', 'student_id', userId,
    d.achievements.map((a) => ({ student_id: userId, ...a })))

  // 6) roadmap + milestones (delete cascades milestones)
  await admin.from('roadmaps').delete().eq('student_id', userId)
  const roadmapId = randomUUID()
  {
    const { error } = await admin.from('roadmaps').insert({
      id: roadmapId, student_id: userId, status: 'active',
      raw_json: { generatedBy: 'demo-seed', curriculum: d.studentProfile.current_curriculum, target: d.studentProfile.target_university },
    })
    if (error) throw new Error(`roadmaps insert: ${error.message}`)
  }
  await replaceMany(admin, 'milestones', 'roadmap_id', roadmapId,
    d.milestones.map((m) => ({ roadmap_id: roadmapId, ...m })))
  console.log(`  • roadmap + ${d.milestones.length} milestones`)

  // 7) calendar / fees / expenses / insurance / comms
  await replaceMany(admin, 'calendar_events', 'student_id', userId,
    d.events.map((e) => ({ student_id: userId, ...e })))
  await replaceMany(admin, 'fee_items', 'student_id', userId,
    d.fees.map((f) => ({ student_id: userId, ...f })))
  await replaceMany(admin, 'expense_logs', 'student_id', userId,
    d.expenses.map((e) => ({ student_id: userId, ...e })))
  await replaceMany(admin, 'insurance_policies', 'student_id', userId, [{ student_id: userId, ...d.insurance }])
  await replaceMany(admin, 'school_communications', 'student_id', userId,
    d.comms.map((c) => ({ student_id: userId, ...c })))
  console.log(`  • ${d.events.length} events, ${d.fees.length} fees, ${d.expenses.length} expenses, insurance, ${d.comms.length} comms`)

  // 8) university targets (incl. the NUS target with verified application plan)
  await replaceMany(admin, 'university_targets', 'student_id', userId,
    d.targets.map((t) => ({ student_id: userId, ...t, plan_updated_at: (t as any).application_plan ? new Date('2026-06-15T09:00:00Z').toISOString() : null, gap_updated_at: new Date('2026-06-15T09:00:00Z').toISOString() })))
  console.log(`  • ${d.targets.length} university targets`)

  // 8b) essays + one AI-critique round (MS4 Essay Studio). Link by target name.
  const { data: targetRows } = await admin
    .from('university_targets').select('id, name').eq('student_id', userId)
  const targetByName = new Map((targetRows ?? []).map((r) => [r.name as string, r.id as string]))
  await admin.from('essays').delete().eq('student_id', userId) // cascades essay_feedback
  for (const es of d.essays) {
    const essayId = randomUUID()
    const { error: eErr } = await admin.from('essays').insert({
      id: essayId, student_id: userId,
      target_id: es.targetName ? targetByName.get(es.targetName) ?? null : null,
      title: es.title, prompt: es.prompt, content: es.content,
    })
    if (eErr) throw new Error(`essays insert: ${eErr.message}`)
    const { error: fErr } = await admin.from('essay_feedback').insert({
      essay_id: essayId, content_snapshot: es.content, feedback: es.feedback,
      created_at: new Date('2026-06-18T10:00:00Z').toISOString(),
    })
    if (fErr) throw new Error(`essay_feedback insert: ${fErr.message}`)
  }
  console.log(`  • ${d.essays.length} essay(s) + critique`)

  // 8c) school-email verification (MS6) — drives the 邮箱验证 trust tier.
  if (d.schoolEmail) {
    await upsertSingle(admin, 'school_email_verifications', 'user_id', userId, {
      email: d.schoolEmail.email, domain: d.schoolEmail.domain, institution: d.schoolEmail.institution,
      code_hash: 'demo-seed', // never checked once verified_at is set
      expires_at: new Date('2026-06-16T00:00:00Z').toISOString(),
      attempts: 0, sends_today: 1, send_day: '2026-06-15',
      verified_at: new Date('2026-06-15T12:00:00Z').toISOString(),
    })
    console.log(`  • school-email verified (${d.schoolEmail.institution})`)
  }

  // 9) documents → upload PDFs to student-documents, insert metadata
  await admin.from('student_documents').delete().eq('student_id', userId)
  for (const doc of d.documents) {
    const path = `${userId}/demo_${doc.fileName}`
    const pdf = makePdf(doc.pdfTitle, doc.pdfLines)
    const { error: upErr } = await admin.storage.from('student-documents')
      .upload(path, pdf, { contentType: 'application/pdf', upsert: true })
    if (upErr) throw new Error(`storage student-documents: ${upErr.message}`)
    const { error: rowErr } = await admin.from('student_documents').insert({
      student_id: userId, file_name: doc.fileName, storage_path: path,
      file_type: doc.fileType, extracted_text: doc.extractedText, upload_date: '2026-06-10',
    })
    if (rowErr) throw new Error(`student_documents insert: ${rowErr.message}`)
  }
  console.log(`  • ${d.documents.length} PDF documents uploaded`)

  // 10) contributed admission case + proof PDF (community library)
  await admin.from('admission_reports').delete().eq('author_id', userId) // cascades proofs/votes/comments
  const reportId = randomUUID()
  const c = d.admissionCase
  {
    const { error } = await admin.from('admission_reports').insert({
      id: reportId, author_id: userId, anonymous: false, level: 'undergraduate',
      institution: c.institution, programme: c.programme, route: c.route, result: c.result, apply_year: c.apply_year,
      grades: c.grades, english_test: c.english_test, standardized_tests: c.standardized_tests, activities: c.activities,
      admission_experience: c.admission_experience, interview_experience: c.interview_experience,
      verification_status: 'verified', verified_at: new Date('2026-06-12T09:00:00Z').toISOString(),
      verification_detail: { method: 'demo-seed', note: 'Seeded demo case with attached offer letter.', forensics: { signals: [], suspicious: false } },
      ingested_at: new Date('2026-06-12T09:05:00Z').toISOString(), visibility: 'public',
      // MS6: 'staff' review is the top trust tier; 'email' relies on the verified mailbox above.
      staff_reviewed_at: c.trust === 'staff' ? new Date('2026-06-13T14:00:00Z').toISOString() : null,
      upvotes: 7, downvotes: 0,
    })
    if (error) throw new Error(`admission_reports insert: ${error.message}`)
  }
  {
    const proofPath = `${userId}/${reportId}/offer_letter.pdf`
    const pdf = makePdf(c.proof.pdfTitle, c.proof.pdfLines)
    const { error: upErr } = await admin.storage.from('admission-proofs')
      .upload(proofPath, pdf, { contentType: 'application/pdf', upsert: true })
    if (upErr) throw new Error(`storage admission-proofs: ${upErr.message}`)
    const { error: rowErr } = await admin.from('report_proofs').insert({
      report_id: reportId, storage_path: proofPath, doc_kind: c.proof.docKind,
      mime: 'application/pdf', bytes: pdf.length, extracted_text: c.proof.pdfLines.join(' '),
      file_hash: createHash('sha256').update(pdf).digest('hex'), // MS6 dedup fingerprint
    })
    if (rowErr) throw new Error(`report_proofs insert: ${rowErr.message}`)
  }
  const tierLabel = c.trust === 'staff' ? 'staff-reviewed 人工复核' : 'email-verified 邮箱验证'
  console.log(`  • contributed admission case (${c.institution}) + offer-letter proof · ${tierLabel}`)

  return userId
}

// ── main ───────────────────────────────────────────────────────────────────────
async function main() {
  loadEnvLocal()
  const URL = process.env.NEXT_PUBLIC_SUPABASE_URL
  const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!URL || !KEY) {
    console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY (.env.local).')
    process.exit(1)
  }
  console.log(`Seeding demo users into: ${URL}`)
  const admin = createClient(URL, KEY, { auth: { persistSession: false, autoRefreshToken: false } })

  const results: Array<{ email: string; password: string; name: string; target: string; id: string }> = []
  for (const d of DEMOS) {
    const id = await seedDemo(admin, d)
    results.push({
      email: d.email, password: d.password, name: d.displayName,
      target: `${d.studentProfile.target_university} — ${d.studentProfile.target_programme}`, id,
    })
  }

  console.log('\n════════════════════════════════════════════════════════════════')
  console.log(' DEMO ACCOUNTS READY — sign in at /login')
  console.log('════════════════════════════════════════════════════════════════')
  for (const r of results) {
    console.log(`  ${r.name}`)
    console.log(`    email:    ${r.email}`)
    console.log(`    password: ${r.password}`)
    console.log(`    target:   ${r.target}`)
    console.log(`    user id:  ${r.id}`)
    console.log('')
  }
}

main().catch((err) => { console.error('\nSEED FAILED:', err); process.exit(1) })
