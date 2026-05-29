import { type Journey, TOTAL_STAGES } from '@/lib/progress'

// Visual hero for the gamified "journey to your dream university".
// Pure presentational server component — works in both the student (en)
// and parent (zh) dashboards.

const RADIUS = 52
const CIRC = 2 * Math.PI * RADIUS

const COPY = {
  en: { heading: 'JOURNEY TO', goalFallback: 'your dream university', stage: 'Stage',
        readiness: 'Ready', milestones: 'Milestones', xp: 'XP', achievements: 'Achievements' },
  zh: { heading: '梦校之旅', goalFallback: '理想大学', stage: '阶段',
        readiness: '准备度', milestones: '里程碑', xp: '经验值', achievements: '成就' },
}

export function JourneyCard({
  journey,
  dreamUniversity,
  lang = 'en',
}: {
  journey: Journey
  dreamUniversity?: string | null
  lang?: 'en' | 'zh'
}) {
  const t = COPY[lang]
  const goal = dreamUniversity?.trim() || t.goalFallback
  const cn = lang === 'zh' ? 'font-cn' : ''
  const dashOffset = CIRC * (1 - journey.pct / 100)
  const stageName = lang === 'zh' ? journey.stage.zh : journey.stage.en
  const blurb = lang === 'zh' ? journey.stage.blurbZh : journey.stage.blurbEn

  return (
    <div
      className="rounded-[12px] p-5 sm:p-6 mb-6 text-white shadow-[0_4px_20px_rgba(26,86,219,0.25)]"
      style={{ background: 'linear-gradient(135deg, #1A56DB 0%, #0E327F 100%)' }}
    >
      <div className="flex flex-col sm:flex-row items-center gap-5 sm:gap-7">
        {/* Progress ring */}
        <div className="relative flex-shrink-0" style={{ width: 128, height: 128 }}>
          <svg width="128" height="128" viewBox="0 0 128 128">
            <circle cx="64" cy="64" r={RADIUS} fill="none" stroke="rgba(255,255,255,0.18)" strokeWidth="10" />
            <circle
              cx="64" cy="64" r={RADIUS} fill="none" stroke="#fff" strokeWidth="10" strokeLinecap="round"
              strokeDasharray={CIRC} strokeDashoffset={dashOffset}
              transform="rotate(-90 64 64)"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <div className="font-display font-extrabold text-[32px] leading-none">{journey.pct}%</div>
            <div className={`text-[10px] opacity-80 mt-0.5 ${cn}`}>{t.readiness}</div>
          </div>
        </div>

        {/* Detail */}
        <div className="flex-1 min-w-0 text-center sm:text-left w-full">
          <div className={`text-[11px] tracking-wider opacity-80 ${cn}`}>{t.heading}</div>
          <div className={`font-display font-extrabold text-[20px] sm:text-[23px] leading-tight ${cn}`}>{goal}</div>

          <div className={`inline-flex items-center gap-1.5 mt-2 px-2.5 py-1 rounded-full bg-white/15 text-[12px] font-semibold ${cn}`}>
            🚀 {t.stage} {journey.stage.index + 1}/{TOTAL_STAGES} · {stageName}
          </div>

          <p className={`text-[12.5px] opacity-90 mt-2 max-w-[44ch] mx-auto sm:mx-0 ${cn}`}>{blurb}</p>

          {/* Stat chips */}
          <div className="flex flex-wrap gap-2 mt-3 justify-center sm:justify-start">
            <Chip value={`${journey.milestonesDone}/${journey.milestonesTotal}`} label={t.milestones} cn={cn} />
            <Chip value={String(journey.xp)} label={t.xp} cn={cn} />
            <Chip value={`⭐ ${journey.achievements}`} label={t.achievements} cn={cn} />
          </div>

          {/* Stage track */}
          <div className="flex gap-1.5 mt-4">
            {Array.from({ length: TOTAL_STAGES }).map((_, i) => (
              <div
                key={i}
                className="h-[5px] flex-1 rounded-full"
                style={{ background: i <= journey.stage.index ? '#fff' : 'rgba(255,255,255,0.22)' }}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

function Chip({ value, label, cn }: { value: string; label: string; cn: string }) {
  return (
    <div className="bg-white/10 rounded-lg px-3 py-1.5 min-w-[64px]">
      <div className="text-[15px] font-bold leading-none">{value}</div>
      <div className={`text-[10px] opacity-80 mt-1 ${cn}`}>{label}</div>
    </div>
  )
}
