// ─────────────────────────────────────────────────────────────────────────────
// Rubric — normalisation core (pure)
// ─────────────────────────────────────────────────────────────────────────────
// Defends the checker from a sloppy maker: guarantees every admission dimension
// is present, every level band exists and is in canonical order, and provenance
// is well-formed. The maker (rubric-maker.ts) funnels its model output through
// here, mirroring how assessment.ts/normalizeAssessment defends the UI.

import { ADMISSION_DIMENSIONS, type DimensionLevel } from '@/types/assessment'
import type { AssessmentRubric, RubricCitation, RubricTarget } from '@/types/rubric'

/** Canonical low → high order; bands are always emitted in this order. */
export const BAND_ORDER: DimensionLevel[] = ['missing', 'weak', 'developing', 'competitive', 'strong']

/** The 0–100 score range each band spans — mirrors scoreToLevel in assessment.ts. */
export const BAND_RANGE_LABEL: Record<DimensionLevel, string> = {
  missing: '0-20', weak: '21-40', developing: '41-60', competitive: '61-80', strong: '81-100',
}

type RawRubric = { dimensions?: unknown[] }
type RawDimension = { dimensionId?: unknown; bands?: unknown[]; gapCriteria?: unknown }

export function normalizeRubric(raw: unknown, target: RubricTarget, nowIso: string): AssessmentRubric {
  const byId = new Map<string, RawDimension>()
  for (const d of (raw as RawRubric)?.dimensions ?? []) {
    const id = (d as RawDimension)?.dimensionId
    if (typeof id === 'string') byId.set(id, d as RawDimension)
  }

  return {
    target,
    dimensions: ADMISSION_DIMENSIONS.map(dim => {
      const rawDim = byId.get(dim.id)
      const descriptorByLevel = bandDescriptors(rawDim?.bands)
      return {
        dimensionId: dim.id,
        bands: BAND_ORDER.map(level => ({ level, descriptor: descriptorByLevel.get(level) ?? '' })),
        gapCriteria: stringArray(rawDim?.gapCriteria),
      }
    }),
    citations: citations((raw as { citations?: unknown })?.citations),
    generatedAt: nowIso,
  }
}

// ── Local helpers ─────────────────────────────────────────────

function bandDescriptors(bands: unknown): Map<DimensionLevel, string> {
  const out = new Map<DimensionLevel, string>()
  if (!Array.isArray(bands)) return out
  for (const b of bands) {
    const level = (b as { level?: unknown })?.level
    const descriptor = (b as { descriptor?: unknown })?.descriptor
    if (isLevel(level) && typeof descriptor === 'string') out.set(level, descriptor)
  }
  return out
}

function isLevel(value: unknown): value is DimensionLevel {
  return typeof value === 'string' && (BAND_ORDER as string[]).includes(value)
}

function stringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((v): v is string => typeof v === 'string') : []
}

// A citation is only kept if it carries a title and at least one source URL —
// provenance with no link is not auditable, so it is dropped.
function citations(value: unknown): RubricCitation[] {
  if (!Array.isArray(value)) return []
  const out: RubricCitation[] = []
  for (const c of value) {
    const title = (c as { title?: unknown })?.title
    const urls = stringArray((c as { sourceUrls?: unknown })?.sourceUrls)
    const lastVerified = (c as { lastVerified?: unknown })?.lastVerified
    if (typeof title === 'string' && urls.length > 0) {
      out.push({ title, sourceUrls: urls, lastVerified: typeof lastVerified === 'string' ? lastVerified : '' })
    }
  }
  return out
}
