# CONTEXT — domain language

Shared vocabulary for the Novara codebase. Seeded for the **Portfolio assessment**
area; extend as other areas are grilled. Architecture terms (module, interface,
seam, adapter, depth, leverage, locality) live in the
`improve-codebase-architecture` skill's `LANGUAGE.md` — this file is domain only.

## Portfolio assessment

**Portfolio assessment**
Turning a student's profile + achievements + classified evidence into a
dimension-scored readiness report for a target. The target is one
`(institution, programme, route)`.

**Admission dimension**
One of the five axes a student is scored on: `academic_strength`,
`programme_fit`, `evidence_portfolio`, `communication_storytelling`,
`initiative_impact`. Defined in `src/types/assessment.ts` (`ADMISSION_DIMENSIONS`).

**Level band**
The five qualitative bands a dimension score falls into: missing (0–20) · weak
(21–40) · developing (41–60) · competitive (61–80) · strong (81–100). Overall
readiness has its own bands (`early_stage` … `strong`).

**Rubric** (`AssessmentRubric`)
The refined, per-target scale the assessment scores against: for each admission
dimension, a descriptor of every level band plus the gap criteria that separate
them, grounded in knowledge-base cases for one target. The Rubric is the **seam**
between the maker and the checker — the maker writes it, the checker reads it,
tests hand-author it. `src/types/rubric.ts`.

**Generic baseline standard**
The authored, target-independent description of what each readiness band looks
like for a university applicant. The starting point the maker specialises.

**Rubric maker** (`makeRubric`)
Specialises the generic baseline standard into a Rubric for a target, using
retrieved knowledge-base cases. Owns all knowledge-base retrieval for the
assessment path. `src/lib/rubric-maker.ts`.

**Checker**
Scores a student's portfolio strictly against a given Rubric's bands and lists
the unmet gap criteria. Depends on the Rubric value, not on the maker.
`src/lib/assessor.ts`.

**RubricStore**
Caches a Rubric per target so the maker runs once per target rather than once
per student; knowledge-base refresh invalidates. `src/lib/data/rubrics.ts`.

**Assessment report**
A stored result = the checker's assessment **plus the Rubric it was scored
against**, so history can show the standard that produced the scores.
