'use client'

import { useMemo, useState } from 'react'
import { createBrowserClient } from '@/db/client'
import { useToast } from '@/components/ui/toast'
import { sortProgrammeStats, provenanceFor, type ProgrammeStat, type ProgrammeSortKey } from '@/lib/programme-stats'

// 对比 — the programme decision dashboard. Every number answers "says who?":
// cells carry a numbered footnote to the official/third-party source; anything
// without a recorded source renders 暂无数据. Nothing here is AI-generated.

const SORT_OPTIONS: Array<{ key: ProgrammeSortKey; label: string }> = [
  { key: 'salary', label: '按月薪 Salary' },
  { key: 'employment', label: '按就业率 Employment' },
  { key: 'subject_rank', label: '按专业排名 Subject rank' },
  { key: 'university_rank', label: '按学校排名 University rank' },
]

const NO_DATA = <span className="text-[var(--t300)]">暂无数据</span>

export default function CompareTab({ stats, onTargetAdded }: {
  stats: ProgrammeStat[]
  onTargetAdded: (target: { id: string; name: string; programme: string }) => void
}) {
  const supabase = createBrowserClient()
  const toast = useToast()
  const [sortBy, setSortBy] = useState<ProgrammeSortKey>('salary')
  const [adding, setAdding] = useState<string | null>(null)

  const rows = useMemo(() => sortProgrammeStats(stats, sortBy), [stats, sortBy])

  // Collect the distinct sources referenced by visible cells → numbered footnotes.
  const footnotes = useMemo(() => {
    const seen = new Map<string, { name: string; url: string; year: number }>()
    for (const r of rows) {
      for (const field of ['ges', 'qs_rank_university', 'qs_rank_subject', 'the_rank_university'] as const) {
        const p = provenanceFor(r, field)
        if (p && !seen.has(p.url)) seen.set(p.url, p)
      }
    }
    return Array.from(seen.values())
  }, [rows])
  const noteIndex = (url: string | undefined) =>
    url ? footnotes.findIndex(f => f.url === url) + 1 || null : null

  function Cite({ row, field }: { row: ProgrammeStat; field: string }) {
    const p = provenanceFor(row, field)
    const n = noteIndex(p?.url)
    if (!p || !n) return null
    return (
      <sup>
        <a href={p.url} target="_blank" rel="noopener noreferrer" title={`${p.name} (${p.year})`}
          className="text-[var(--blue)] hover:underline ml-0.5">[{n}]</a>
      </sup>
    )
  }

  async function addAsTarget(row: ProgrammeStat) {
    setAdding(row.id)
    const { data, error } = await supabase
      .from('university_targets')
      .insert({
        name: row.university,
        programme: row.programme,
        country: row.country,
        requirements: '',
        notes: '',
        reference_link: row.curriculumUrl ?? '',
        status: 'researching',
      })
      .select('id')
      .single()
    setAdding(null)
    if (error || !data) {
      toast({ title: 'Could not add target', description: error?.message, variant: 'error' })
      return
    }
    toast({ title: '已加入目标', description: `${row.university} · ${row.programme}`, variant: 'success' })
    onTargetAdded({ id: data.id, name: row.university, programme: row.programme })
  }

  if (stats.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="text-[32px] mb-3">📊</div>
        <div className="text-[14px] font-semibold text-[var(--t900)] mb-1">项目数据暂未开放</div>
        <div className="text-[13px] text-[var(--t500)]">官方数据（排名、就业、课程）由 Novara 团队核实后上架，敬请期待。</div>
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div className="text-[12px] text-[var(--t500)]">
          仅收录<strong>官方或权威第三方</strong>数据 — 每个数字都注明来源，缺失即显示「暂无数据」。
        </div>
        <select value={sortBy} onChange={e => setSortBy(e.target.value as ProgrammeSortKey)}
          className="px-3 py-1.5 border-[1.5px] border-[var(--border)] rounded-[8px] text-[12px] bg-white focus:outline-none focus:border-[var(--blue)]">
          {SORT_OPTIONS.map(o => <option key={o.key} value={o.key}>{o.label}</option>)}
        </select>
      </div>

      <div className="bg-white border border-[var(--border)] rounded-[10px] overflow-x-auto">
        <table className="w-full text-[12px]">
          <thead>
            <tr className="border-b border-[var(--border)] text-left text-[11px] uppercase tracking-wider text-[var(--t500)]">
              <th className="px-4 py-3">学校 · 专业</th>
              <th className="px-3 py-3">QS 排名</th>
              <th className="px-3 py-3">QS 专业排名</th>
              <th className="px-3 py-3">THE 排名</th>
              <th className="px-3 py-3">毕业月薪中位数</th>
              <th className="px-3 py-3">就业率</th>
              <th className="px-3 py-3">课程官网</th>
              <th className="px-3 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {rows.map(r => (
              <tr key={r.id} className="border-b border-[var(--border)] last:border-0 hover:bg-[var(--bg)]">
                <td className="px-4 py-3">
                  <div className="font-semibold text-[13px] text-[var(--t900)]">{r.university}</div>
                  <div className="text-[var(--t500)]">{r.programme}</div>
                </td>
                <td className="px-3 py-3">{r.qsRankUniversity !== null ? <>#{r.qsRankUniversity}<Cite row={r} field="qs_rank_university" /></> : NO_DATA}</td>
                <td className="px-3 py-3">{r.qsRankSubject !== null ? <>#{r.qsRankSubject}<Cite row={r} field="qs_rank_subject" /></> : NO_DATA}</td>
                <td className="px-3 py-3">{r.theRankUniversity !== null ? <>#{r.theRankUniversity}<Cite row={r} field="the_rank_university" /></> : NO_DATA}</td>
                <td className="px-3 py-3">
                  {r.gesMedianSalarySgd !== null
                    ? <><span className="font-semibold text-[var(--t900)]">S${r.gesMedianSalarySgd.toLocaleString()}</span><Cite row={r} field="ges" /></>
                    : NO_DATA}
                </td>
                <td className="px-3 py-3">{r.gesEmploymentRate !== null ? <>{r.gesEmploymentRate}%<Cite row={r} field="ges" /></> : NO_DATA}</td>
                <td className="px-3 py-3">
                  {r.curriculumUrl
                    ? <a href={r.curriculumUrl} target="_blank" rel="noopener noreferrer" className="text-[var(--blue)] hover:underline">课程设置 →</a>
                    : NO_DATA}
                  {r.igpUrl && (
                    <><br /><a href={r.igpUrl} target="_blank" rel="noopener noreferrer" className="text-[var(--blue)] hover:underline">录取分数线 →</a></>
                  )}
                </td>
                <td className="px-3 py-3 text-right">
                  <button onClick={() => addAsTarget(r)} disabled={adding === r.id}
                    className="px-3 py-1.5 rounded-[7px] text-[11px] font-semibold border-[1.5px] border-[var(--blue)] text-[var(--blue)] hover:bg-[var(--blue-50)] transition disabled:opacity-50 whitespace-nowrap">
                    {adding === r.id ? '…' : '＋ 设为目标'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {footnotes.length > 0 && (
        <div className="mt-3 text-[11px] text-[var(--t400)] space-y-0.5">
          {footnotes.map((f, i) => (
            <div key={f.url}>
              [{i + 1}] <a href={f.url} target="_blank" rel="noopener noreferrer" className="hover:underline">{f.name}</a> ({f.year})
            </div>
          ))}
          <div className="pt-1">就业率为 GES「已就业」口径（含兼职/临时/自由职业，占劳动人口比例）；月薪为全职受雇毕业生的税前中位数。</div>
        </div>
      )}
    </div>
  )
}
