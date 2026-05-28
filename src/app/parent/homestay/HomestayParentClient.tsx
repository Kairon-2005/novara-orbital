'use client'

// ── Mock homestay booking (mirrors homestay_bookings table) ───────────────────
// Parent reads child's current confirmed homestay placement.

const CURRENT_HOMESTAY = {
  family_name:        'The Tan Family',
  family_name_zh:     '陈家',
  zone:               'Bishan',
  zone_zh:            '碧山',
  address:            '123 Bishan Street 22, Singapore 570243',
  distance_school_km: 0.4,
  price_sgd:          950,
  room_type:          'single' as const,
  meals_included:     true,
  rating:             4.9,
  reviews:            28,
  emergency_contact:  '+65 9123 4567',
  contact_name:       'Mrs Tan Wei Ling',
  contact_name_zh:    '陈伟玲女士',
  move_in_date:       '2025-08-15',
  contract_end_date:  '2026-08-14',
  highlights:         ['安静学习环境', '每日三餐', '步行5分钟至地铁站', '高速网络', '无宵禁'],
  highlights_en:      ['Quiet study environment', 'Home-cooked meals', 'MRT 5 min walk', 'Fast WiFi', 'No curfew'],
  school_distance_desc: '步行约5分钟（0.4公里）',
  notes:              '陈太太会说普通话，可与家长直接沟通。',
}

const SGD_TO_CNY = 5.28

interface HomestayParentClientProps {
  childSchool: string | null
}

export default function HomestayParentClient({ childSchool }: HomestayParentClientProps) {
  const h     = CURRENT_HOMESTAY

  const contractDaysLeft = Math.ceil(
    (new Date(h.contract_end_date).getTime() - Date.now()) / 86_400_000
  )
  const contractMonthsLeft = Math.ceil(contractDaysLeft / 30)

  return (
    <div className="flex flex-col min-h-screen" style={{ fontFamily: "'Noto Sans SC', 'Inter', sans-serif" }}>

      {/* Topbar */}
      <div className="bg-white border-b border-[var(--border)] px-9 h-14 flex items-center justify-between sticky top-0 z-40">
        <div>
          <div className="font-display font-bold text-[17px] text-[var(--t900)]">住家寄宿</div>
          <div className="text-[11px] text-[var(--t500)] mt-0.5">
            {'孩子'} 的寄宿安排 · {h.zone_zh}（{h.zone}）· 合约剩余约{contractMonthsLeft}个月
          </div>
        </div>
        <span className="px-3 py-1.5 rounded-[8px] bg-[var(--green-50)] text-[var(--green)] text-[12px] font-semibold border border-[#D1FAE5]">
          ✓ 当前已确认入住
        </span>
      </div>

      <div className="p-[28px_36px] flex-1">
        <div className="grid gap-5" style={{ gridTemplateColumns: '1fr 300px', alignItems: 'start' }}>

          {/* ── Main info card ─────────────────────────────────────────────── */}
          <div className="space-y-5">

            {/* Family card */}
            <div className="bg-white border border-[var(--border)] rounded-[10px] shadow-[0_1px_3px_rgba(0,0,0,0.05)] overflow-hidden">
              {/* Gradient header */}
              <div className="h-[100px] flex items-center justify-center text-[48px]"
                style={{ background: 'linear-gradient(135deg,#EBF5FF 0%,#F3F6FB 100%)' }}>
                🏠
              </div>
              <div className="p-[18px_20px]">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="font-display font-bold text-[18px] text-[var(--t900)]">{h.family_name_zh}</div>
                    <div className="text-[13px] text-[var(--t500)]">{h.family_name}</div>
                  </div>
                  <div className="flex items-center gap-1 text-[13px]">
                    <span className="text-[#F59E0B]">{'★'.repeat(Math.round(h.rating))}</span>
                    <span className="text-[var(--t500)] text-[12px]">{h.rating} ({h.reviews}条评价)</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 mb-4">
                  {[
                    { label: '地址', value: h.address },
                    { label: '区域', value: `${h.zone_zh}（${h.zone}）` },
                    { label: '距学校', value: h.school_distance_desc },
                    { label: '房型', value: h.room_type === 'single' ? '单人间' : '合住间' },
                    { label: '月租', value: `SGD ${h.price_sgd} (¥${Math.round(h.price_sgd * SGD_TO_CNY).toLocaleString()})` },
                    { label: '餐食', value: h.meals_included ? '含三餐' : '不含餐' },
                  ].map(row => (
                    <div key={row.label}>
                      <div className="text-[11px] text-[var(--t300)] mb-0.5">{row.label}</div>
                      <div className="text-[13px] font-semibold text-[var(--t900)]">{row.value}</div>
                    </div>
                  ))}
                </div>

                {/* Highlights */}
                <div className="flex flex-wrap gap-2 mb-4">
                  {h.highlights.map((hl, i) => (
                    <span key={i} className="px-2.5 py-1 bg-[var(--bg)] rounded-full text-[11px] font-medium text-[var(--t700)]">
                      {hl}
                    </span>
                  ))}
                </div>

                {/* Special note */}
                <div className="px-4 py-3 bg-[var(--green-50)] rounded-[8px] border-l-[3px] border-[var(--green)]">
                  <div className="text-[12px] font-semibold text-[var(--green)] mb-0.5">📝 家长备注</div>
                  <div className="text-[12px] text-[var(--t700)] leading-relaxed">{h.notes}</div>
                </div>
              </div>
            </div>

            {/* Contract details */}
            <div className="bg-white border border-[var(--border)] rounded-[10px] shadow-[0_1px_3px_rgba(0,0,0,0.05)] p-[18px_20px]">
              <div className="font-display font-semibold text-[14px] text-[var(--t900)] mb-4">📋 合约信息</div>
              <div className="grid grid-cols-3 gap-4">
                {[
                  { label: '入住日期', value: new Date(h.move_in_date).toLocaleDateString('zh-CN', { year:'numeric', month:'long', day:'numeric' }) },
                  { label: '合约到期', value: new Date(h.contract_end_date).toLocaleDateString('zh-CN', { year:'numeric', month:'long', day:'numeric' }) },
                  { label: '剩余时间', value: `约${contractMonthsLeft}个月` },
                ].map(row => (
                  <div key={row.label} className="p-3 bg-[var(--bg)] rounded-[8px]">
                    <div className="text-[11px] text-[var(--t300)] mb-1">{row.label}</div>
                    <div className="text-[13px] font-bold text-[var(--t900)]">{row.value}</div>
                  </div>
                ))}
              </div>
              <div className="mt-4 px-4 py-3 bg-[#FFFBEB] rounded-[8px] border border-[#FDE68A]">
                <div className="text-[12px] font-semibold text-[#B45309]">⚠ 续约提醒</div>
                <div className="text-[12px] text-[#78350F] mt-0.5 leading-relaxed">
                  合约将于{new Date(h.contract_end_date).toLocaleDateString('zh-CN', { year:'numeric', month:'long' })}到期，
                  请提前2个月与寄宿家庭确认续约或重新选择住宿安排。
                </div>
              </div>
            </div>
          </div>

          {/* ── Right sidebar ─────────────────────────────────────────────── */}
          <div className="space-y-4">

            {/* Emergency contact */}
            <div className="bg-white border border-[var(--border)] rounded-[10px] p-4 shadow-[0_1px_3px_rgba(0,0,0,0.05)]">
              <div className="font-display font-semibold text-[13px] text-[var(--t900)] mb-3">📞 紧急联系</div>
              <div className="flex items-center gap-3 p-3 bg-[var(--red-50)] rounded-[8px] border border-[#FECACA]">
                <div className="w-9 h-9 rounded-full bg-[#E02424] flex items-center justify-center text-white font-bold text-[14px] flex-shrink-0">
                  陈
                </div>
                <div>
                  <div className="text-[13px] font-bold text-[var(--t900)]">{h.contact_name_zh}</div>
                  <div className="text-[12px] text-[var(--t500)]">{h.contact_name}</div>
                  <div className="text-[13px] font-semibold text-[#E02424] mt-1">{h.emergency_contact}</div>
                </div>
              </div>
              <div className="text-[11px] text-[var(--t300)] mt-2 text-center">24小时紧急联系</div>
            </div>

            {/* Monthly cost breakdown */}
            <div className="bg-white border border-[var(--border)] rounded-[10px] p-4 shadow-[0_1px_3px_rgba(0,0,0,0.05)]">
              <div className="font-display font-semibold text-[13px] text-[var(--t900)] mb-3">💰 月费明细</div>
              {[
                { label: '月租金',   sgd: h.price_sgd },
                { label: '含三餐',   sgd: 0, note: '已含' },
                { label: '水电网费', sgd: 0, note: '已含' },
              ].map((row, i) => (
                <div key={i} className="flex items-center justify-between py-2 border-b border-[var(--border)] last:border-0">
                  <span className="text-[12px] text-[var(--t700)]">{row.label}</span>
                  <span className="text-[12px] font-bold text-[var(--t900)]">
                    {row.note ?? `SGD ${row.sgd}`}
                  </span>
                </div>
              ))}
              <div className="mt-3 pt-2 border-t-2 border-[var(--border)] flex items-center justify-between">
                <span className="text-[13px] font-bold text-[var(--t900)]">月度总计</span>
                <div className="text-right">
                  <div className="text-[14px] font-bold text-[var(--blue)]">SGD {h.price_sgd}</div>
                  <div className="text-[11px] text-[var(--t300)]">¥ {Math.round(h.price_sgd * SGD_TO_CNY).toLocaleString()}</div>
                </div>
              </div>
            </div>

            {/* Location context */}
            <div className="bg-white border border-[var(--border)] rounded-[10px] p-4 shadow-[0_1px_3px_rgba(0,0,0,0.05)]">
              <div className="font-display font-semibold text-[13px] text-[var(--t900)] mb-3">📍 位置信息</div>
              {[
                { label: '至 ACS International', val: '0.4 km（步行5分钟）', color: '#057A55' },
                { label: '至碧山地铁站',          val: '约0.5 km',           color: '#1A56DB' },
                { label: '附近便利设施',           val: '超市、诊所、食阁',    color: '#6B7280' },
              ].map((row, i) => (
                <div key={i} className="flex items-start gap-2 py-2 border-b border-[var(--border)] last:border-0">
                  <div className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0" style={{ background: row.color }} />
                  <div>
                    <div className="text-[11px] text-[var(--t300)]">{row.label}</div>
                    <div className="text-[12px] font-semibold text-[var(--t900)]">{row.val}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
