// A single historical readiness report — the checker's assessment shown next to
// the Rubric it was scored against, so the student can see the standard behind
// every score (the maker's bands + gap criteria + sources).

import Link from 'next/link'
import { createServerClient } from '@/db/server'
import { getAssessmentById } from '@/lib/data'
import { ADMISSION_DIMENSIONS, type DimensionLevel, type ReadinessLevel } from '@/types/assessment'
import { BAND_ORDER, BAND_RANGE_LABEL } from '@/lib/rubric'

const LEVEL_META: Record<DimensionLevel, { label: string; color: string }> = {
  missing:     { label: 'Missing',     color: '#9CA3AF' },
  weak:        { label: 'Weak',        color: '#E02424' },
  developing:  { label: 'Developing',  color: '#D97706' },
  competitive: { label: 'Competitive', color: '#1A56DB' },
  strong:      { label: 'Strong',      color: '#057A55' },
}

const READINESS_LABEL: Record<ReadinessLevel, string> = {
  early_stage: 'Early stage', developing: 'Developing', on_track: 'On track',
  competitive: 'Competitive', strong: 'Strong',
}

function fmtDate(iso: string): string {
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
}

export default async function ReportPage({ params }: { params: { id: string } }) {
  const supabase = createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return <p className="p-10 text-red-500">Not authenticated.</p>

  const report = await getAssessmentById(supabase, user.id, params.id)
  if (!report) {
    return (
      <div className="page-content max-w-[760px]">
        <p className="text-[14px] text-[var(--t500)] p-10 text-center">This report isn’t available.</p>
        <div className="text-center"><Link href="/portfolio" className="text-[var(--blue)] text-[13px] font-semibold">← Back to portfolio</Link></div>
      </div>
    )
  }

  const { assessment, rubric } = report
  const rubricByDim = new Map((rubric?.dimensions ?? []).map(d => [d.dimensionId, d]))

  return (
    <div className="page-content max-w-[760px]">
      <Link href="/portfolio" className="text-[13px] text-[var(--blue)] font-semibold">← Portfolio</Link>

      {/* Header */}
      <div className="card p-5 mt-3">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold text-white" style={{ background: 'var(--blue)' }}>
            {READINESS_LABEL[assessment.overallLevel]}
          </span>
          <span className="text-[11px] text-[var(--t500)]">Confidence: {assessment.confidence}</span>
          <span className="text-[11px] text-[var(--t300)]">· {fmtDate(report.createdAt)}</span>
        </div>
        <h1 className="font-display font-bold text-[20px] text-[var(--t900)] mt-2">Admission Readiness Report</h1>
        {rubric && (
          <div className="text-[12px] text-[var(--t500)] mt-1">
            Scored against the rubric for {[rubric.target.university, rubric.target.programme, rubric.target.route].filter(Boolean).join(' · ')}
          </div>
        )}
        {assessment.overallSummary && (
          <p className="text-[13px] leading-relaxed text-[var(--t500)] mt-3">{assessment.overallSummary}</p>
        )}

        {/* Overall strengths / gaps / next steps */}
        <div className="grid sm:grid-cols-3 gap-3 mt-4">
          <ReportList title="Strengths" items={assessment.topStrengths} color="var(--green)" mark="✓" />
          <ReportList title="Biggest gaps" items={assessment.topGaps} color="var(--amber)" mark="→" />
          <ReportList title="Next steps" items={assessment.recommendedNextSteps} color="var(--blue)" mark="•" />
        </div>
      </div>

      {/* Per-dimension: score + the rubric standard it was judged against */}
      <div className="flex flex-col gap-4 mt-4">
        {ADMISSION_DIMENSIONS.map(dim => {
          const score = assessment.dimensionScores.find(s => s.dimensionId === dim.id)
          if (!score) return null
          const meta = LEVEL_META[score.level]
          const rubricDim = rubricByDim.get(dim.id)
          return (
            <div key={dim.id} className="card p-5">
              <div className="flex items-center justify-between gap-3 mb-2">
                <h2 className="font-display font-bold text-[15px] text-[var(--t900)]">{dim.name}</h2>
                <div className="flex items-center gap-2">
                  <span className="text-[13px] font-bold" style={{ color: meta.color }}>{score.score}</span>
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold text-white" style={{ background: meta.color }}>{meta.label}</span>
                </div>
              </div>
              {score.reasoning && <p className="text-[12.5px] text-[var(--t500)] leading-relaxed mb-3">{score.reasoning}</p>}

              <div className="grid sm:grid-cols-3 gap-3">
                <ReportList title="Strengths" items={score.strengths} color="var(--green)" mark="✓" />
                <ReportList title="Gaps" items={score.gaps} color="var(--amber)" mark="→" />
                <ReportList title="Actions" items={score.suggestedActions} color="var(--blue)" mark="•" />
              </div>

              {/* The maker's standard for this dimension */}
              {rubricDim && (
                <div className="mt-4 pt-3 border-t border-[var(--border)]">
                  <div className="text-[10px] font-bold text-[var(--t300)] uppercase tracking-wider mb-2">Scoring standard</div>
                  <div className="flex flex-col gap-1">
                    {BAND_ORDER.map(level => {
                      const band = rubricDim.bands.find(b => b.level === level)
                      const here = level === score.level
                      const c = LEVEL_META[level]
                      return (
                        <div key={level} className={`flex gap-2 text-[12px] rounded-[6px] px-2 py-1 ${here ? 'bg-[var(--blue-50)]' : ''}`}>
                          <span className="font-bold flex-shrink-0 w-[92px]" style={{ color: c.color }}>
                            {c.label} <span className="font-normal text-[var(--t300)]">{BAND_RANGE_LABEL[level]}</span>
                          </span>
                          <span className="text-[var(--t700)]">{band?.descriptor || '—'}{here && <span className="ml-1 text-[var(--blue)] font-semibold">← you</span>}</span>
                        </div>
                      )
                    })}
                  </div>
                  {rubricDim.gapCriteria.length > 0 && (
                    <div className="text-[11.5px] text-[var(--t500)] mt-2">
                      <span className="font-semibold">Gap criteria:</span> {rubricDim.gapCriteria.join(' · ')}
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Provenance */}
      {rubric && rubric.citations.length > 0 && (
        <div className="card p-5 mt-4">
          <div className="text-[10px] font-bold text-[var(--t300)] uppercase tracking-wider mb-2">Rubric sources</div>
          <ul className="flex flex-col gap-1">
            {rubric.citations.map((c, i) => (
              <li key={i} className="text-[12px] text-[var(--t500)]">
                {c.sourceUrls[0]
                  ? <a href={c.sourceUrls[0]} target="_blank" rel="noopener noreferrer" className="text-[var(--blue)] hover:underline">{c.title}</a>
                  : c.title}
                {c.lastVerified && <span className="text-[var(--t300)]"> · verified {c.lastVerified}</span>}
              </li>
            ))}
          </ul>
        </div>
      )}

      <p className="text-[11px] text-[var(--t300)] mt-5">
        Readiness assessment, not an admission prediction. The rubric is grounded in curated sources — verify against official requirements.
      </p>
    </div>
  )
}

function ReportList({ title, items, color, mark }: { title: string; items: string[]; color: string; mark: string }) {
  if (items.length === 0) return null
  return (
    <div>
      <div className="text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color }}>{title}</div>
      <ul className="space-y-1">
        {items.map((s, i) => (
          <li key={i} className="text-[12px] text-[var(--t700)] flex gap-1.5"><span style={{ color }}>{mark}</span>{s}</li>
        ))}
      </ul>
    </div>
  )
}
