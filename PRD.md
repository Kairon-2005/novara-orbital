# Orbital — Product Requirements Document (PRD)
**Team:** Cyber Grape | **Programme:** NUS Orbital 2026 | **Level:** Apollo 11  
**Status:** v1.0 Draft | **Date:** May 2026

---

## 1. Overview

Orbital is a web platform that helps young Chinese international students navigate Singapore's education system — from choosing a school to building a university-ready portfolio — while keeping their parents in China informed in Mandarin.

---

## 2. User Personas

### Persona A — Wei, 15, the Student
- Just arrived in Singapore to attend an international school
- Parents are in Shenzhen; communicates via WeChat
- Wants to get into NUS Engineering but has no idea what the 4-year path looks like
- Misses deadlines because everything is in English and spread across 5 different websites
- Needs: clear school comparison, AI roadmap, deadline calendar

### Persona B — Mei, 45, Wei's Mother
- Speaks minimal English; uses WeChat daily
- Made a significant financial sacrifice to send Wei abroad
- Wants weekly updates on Wei's progress in Chinese
- Cannot attend PTMs; relies entirely on Wei's self-reporting (unreliable)
- Needs: Chinese-language digest, milestone alerts, progress visibility

---

## 3. Feature Requirements

### Feature 1 — School & Curriculum Navigator
**Priority:** P0 (Must have for M1)

**Description:** A structured, searchable knowledge base of Singapore schools and curricula. Allows students to compare options side-by-side and understand which pathway aligns with their goals.

**Requirements:**
- Display at least 15 Singapore schools across 3 types: Government/Government-Aided, Private, International
- Cover 4 curricula: IB (International Baccalaureate), Cambridge A-Level, AP (Advanced Placement), Singapore O/A Level
- Each school card includes: school type, curriculum, annual fees (range), key strengths, admission requirements, notable alumni universities
- Curriculum comparison page: IB vs A-level vs AP vs local — pros, cons, university recognition, difficulty, cost
- Filter by: curriculum, school type, budget range, language of instruction
- Each curriculum page links to related AI roadmap templates

**Acceptance Criteria:**
- Student can filter to ≤3 recommended schools in under 2 minutes
- All fee and admission data accurate as of 2025/2026
- Pages load in < 2 seconds

---

### Feature 2 — AI Academic Roadmap Planner
**Priority:** P0 (Must have for M1/M2)

**Description:** The flagship feature. Student completes a 5-field onboarding form; GPT-4o generates a personalised multi-year academic roadmap with specific annual milestones.

**Onboarding Inputs:**
| Field | Example |
|---|---|
| Current school year | Year 9 (Secondary 3 equivalent) |
| Current school / curriculum | International school, IB track |
| Target university & programme | NUS Medicine |
| Extracurricular interests & strengths | Biology olympiad, piano |
| Annual tuition budget | SGD 40,000–60,000 |
| English proficiency level | Intermediate |

**AI Output — Roadmap Structure:**
```
Year 1 (Age 15):
  Academic:     Focus on IB core subjects, aim for predicted 38+ 
  Exams:        Register for AMC 10/12 (Oct), SAT Subject Bio (if needed)
  Competitions: Singapore Biology Olympiad (Feb registration)
  Activities:   Join school science club, start volunteering at polyclinic
  Milestones:   End-of-year grades ≥ B+ average

Year 2 (Age 16):
  ...
```

**System Prompt Design:**
- Inject: student profile JSON, Singapore education calendar, school-specific advice
- Output format: structured JSON → rendered as visual timeline
- Temperature: 0.3 (consistent, not hallucinating)
- Model: GPT-4o-mini (cost-optimised; ~$0.001/roadmap)
- Regeneration: Student can adjust inputs and regenerate roadmap at any time

**Acceptance Criteria:**
- Roadmap generated in < 10 seconds
- Output contains at least 3 years of milestones
- Milestones are specific to Singapore (real exam names, real competition names)
- Student can edit individual milestones after generation
- Roadmap is saved to student profile and persists across sessions

---

### Feature 3 — Smart Calendar & Deadline Tracker
**Priority:** P0 (Must have for M1)

**Description:** A unified calendar that aggregates AI-populated milestones, student-added events, and Singapore education system deadlines into one view.

**Requirements:**
- Monthly and weekly calendar views
- Events auto-populated from AI roadmap (e.g., "AMC 10 Registration" → added to Oct calendar)
- Manual event creation: title, date, type (exam / application / CCA / personal)
- Colour coding by event type
- Reminder system: 7-day, 3-day, 1-day email reminders (Chinese language option)
- Upload: student can paste text from school timetable → AI parses and populates calendar
- Singapore education system master calendar (hardcoded): DSA application windows, O-level registration, JC1 posting, etc.
- Export to Google Calendar / iCal (.ics file)

**Acceptance Criteria:**
- Calendar displays all AI roadmap milestones correctly
- Email reminders deliver in < 5 minutes of scheduled time
- Student can add/edit/delete events in < 30 seconds

---

### Feature 4 — Portfolio & Achievement Tracker
**Priority:** P1 (Must have for M2)

**Description:** A personal achievement log where students record competitions, CCAs, academic results, and volunteer work. AI evaluates the portfolio against their target university's typical admit profile.

**Requirements:**
- Achievement entry form: type (competition / CCA / academic / volunteer / award), date, description, evidence (optional file upload)
- Achievement types: Math/Science Olympiad, debate, sports, music grade, community service hours, internship
- AI readiness score: compare student portfolio against benchmark profiles for target school/programme (e.g., "NUS Medicine typical admit")
- Gap analysis: "You are strong in academics but lack community service. Recommend: ..."
- Portfolio view: timeline of achievements, exportable as PDF (for school applications)
- Progress bar toward target programme requirements

**Acceptance Criteria:**
- Student can log an achievement in < 1 minute
- AI gap analysis updates within 5 seconds of adding new achievement
- PDF export renders cleanly

---

### Feature 5 — Parent Dashboard (Chinese Language)
**Priority:** P1 (Must have for M2)

**Description:** A Mandarin-language view of the student's progress, accessible to parents in China. Delivered as both a web dashboard and a periodic email digest.

**Requirements:**

**Parent Web Dashboard (read-only):**
- Separate login with parent account (linked to student)
- Entire UI in Simplified Chinese (zh-CN)
- Displays: current roadmap summary, upcoming deadlines (next 30 days), recent achievements logged, AI readiness score
- No editing capability — read-only

**Automated Chinese Email Digest:**
- Weekly digest every Sunday 8:00 PM CST (China Standard Time)
- Content: week's completed milestones, upcoming week's deadlines, motivational summary
- Language: Simplified Chinese, generated via GPT-4o translation of student's weekly activity
- Delivery: Email (SendGrid) — *Note: WeChat Official Account requires business verification; email is the reliable MVP path. WeChat integration is a post-Orbital extension.*
- Parent can opt for bi-weekly or monthly frequency

**Acceptance Criteria:**
- Parent dashboard is 100% in Simplified Chinese
- Weekly digest email arrives within ±15 minutes of scheduled time
- Parent can view child's roadmap without being able to modify it

---

### Feature 6 — Community Hub (小红书-style)
**Priority:** P2 (Extension for M3)

**Description:** A peer-to-peer sharing platform where students post experience logs (plogs), success stories, school reviews, and advice. Inspired by Xiaohongshu's format to feel familiar to the Chinese student audience.

**Requirements:**
- Post format: photo (optional) + text + tags (school, curriculum, topic)
- Post categories: "My School Journey", "How I Got Into [University]", "Best Resources", "Ask the Community"
- Upvote / save posts
- Anonymous posting option (for sensitive questions)
- AI moderation: flag posts for review (no hate speech, no misleading advice)
- School-specific channels: filter posts by school or curriculum type
- Verified "Alumni" badge for users who have graduated and share results

**Acceptance Criteria:**
- Student can post a plog with photo + text in < 2 minutes
- Posts are categorised and filterable by school type and topic
- Moderation flags inappropriate content within 60 seconds (AI scan)

---

## 4. Non-Functional Requirements

| Requirement | Target |
|---|---|
| Page load time | < 2 seconds (P95) |
| API response time (non-AI) | < 500ms |
| AI roadmap generation | < 10 seconds |
| Uptime (for demo period) | > 99% |
| Mobile responsiveness | Yes — web app must work on phone browser |
| Language support | English (student UI) + Simplified Chinese (parent UI) |
| Authentication | Email/password + Google OAuth |
| Data privacy | Student profile data not shared; PDPA-aware |

---

## 5. Out of Scope

- Native iOS / Android app
- Real-time chat with counselors or tutors
- Academic content (video lessons, practice problems, notes)
- Automated school application submission
- Payment processing or fee collection
- WeChat Official Account API integration (business verification barrier)
- Non-Singapore education systems

---

## 6. Data Model (Key Entities)

```
User
  id, email, role (student | parent), name_en, name_zh, created_at

StudentProfile
  user_id, current_year, current_school, curriculum, target_university,
  target_programme, interests[], english_level, budget_range, language

Roadmap
  id, student_id, generated_at, years[], milestones[] (JSON), status

Milestone
  id, roadmap_id, year, month, type (exam|competition|cca|application),
  title, description, completed, date

CalendarEvent
  id, student_id, title, date, type, reminder_days, source (ai|manual|system)

Achievement
  id, student_id, type, title, date, description, evidence_url, 
  ai_score_impact

ParentAccount
  id, student_id, email, language (zh-CN), digest_frequency, last_sent

Post (Community)
  id, author_id, title, content, image_url, tags[], school, 
  curriculum, anonymous, upvotes, created_at
```

---

## 7. Milestone Delivery Plan

| Milestone | Date | Deliverables |
|---|---|---|
| M1 — Proof of Concept | End of May 2026 | Feature 1 (Navigator) + Feature 3 (Calendar) + Feature 2 (basic AI roadmap) + Auth |
| M2 — Prototype | End of June 2026 | Feature 4 (Portfolio) + Feature 5 (Parent dashboard + email) + AI refinement |
| M3 — Extended System | End of July 2026 | Feature 6 (Community) + polish + user testing + full end-to-end demo |
