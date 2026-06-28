// RubricStore — caches one Rubric per target so the maker runs once per target
// rather than once per student. getOrMakeRubricWith is the pure orchestration
// over injected seams (load / make / save); the Supabase + maker wiring is added
// alongside it once the assessment_rubrics table exists.

import type { AssessmentRubric, RubricTarget } from '@/types/rubric'
import { makeRubric } from '@/lib/rubric-maker'
import type { DB } from './client'

export interface RubricStoreDeps {
  /** Return the cached rubric for this target, or null on a miss. */
  load: (target: RubricTarget) => Promise<AssessmentRubric | null>
  /** Produce a fresh rubric (the maker). */
  make: (target: RubricTarget) => Promise<AssessmentRubric>
  /** Persist a freshly made rubric. */
  save: (rubric: AssessmentRubric) => Promise<void>
}

/** Cache-by-target: a hit returns the stored rubric; a miss makes one and saves it. */
export async function getOrMakeRubricWith(target: RubricTarget, deps: RubricStoreDeps): Promise<AssessmentRubric> {
  const cached = await deps.load(target)
  if (cached) return cached
  const made = await deps.make(target)
  await deps.save(made)
  return made
}

/** Normalised cache key — route is optional, so an empty string stands in for "none". */
function routeKey(route?: string): string {
  return route ?? ''
}

/** Production wiring: Supabase-backed cache, the maker on a miss. */
export async function getOrMakeRubric(supabase: DB, target: RubricTarget): Promise<AssessmentRubric> {
  return getOrMakeRubricWith(target, {
    load: async (t) => {
      const { data } = await supabase
        .from('assessment_rubrics')
        .select('rubric')
        .eq('university', t.university)
        .eq('programme', t.programme)
        .eq('route', routeKey(t.route))
        .maybeSingle()
      return data?.rubric ?? null
    },
    make: makeRubric,
    save: async (rubric) => {
      await supabase.from('assessment_rubrics').insert({
        university:   rubric.target.university,
        programme:    rubric.target.programme,
        route:        routeKey(rubric.target.route),
        rubric,
        generated_at: rubric.generatedAt,
      })
    },
  })
}
