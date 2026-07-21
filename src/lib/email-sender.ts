// EmailSender seam — used ONLY for the one-time school-mailbox verification
// code (identity check, not a communication channel; no digests/reminders ever).
// Adapter: Resend HTTP API, env-gated. Unconfigured environments keep the
// feature visible but inert (503 from the route) — same precedent as
// READER_ENABLED for the page-fetch layer.

export function isEmailConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY)
}

export async function sendVerificationEmail(to: string, code: string): Promise<void> {
  const key = process.env.RESEND_API_KEY
  if (!key) throw new Error('Email sender not configured (RESEND_API_KEY)')

  const from = process.env.VERIFY_EMAIL_FROM ?? 'Novara <verify@novara.vip>'
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from,
      to: [to],
      subject: `Novara verification code ${code} · 校园邮箱验证码`,
      text:
        `Your Novara school-email verification code is: ${code}\n` +
        `It expires in 15 minutes. If you didn't request this, ignore this email.\n\n` +
        `你的 Novara 学校邮箱验证码：${code}（15分钟内有效）。如非本人操作请忽略。`,
    }),
  })
  if (!res.ok) {
    throw new Error(`Email send failed: ${res.status} ${await res.text().catch(() => '')}`)
  }
}
