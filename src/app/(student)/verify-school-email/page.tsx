// Server Component — 学校邮箱验证. Shows current verification state (RLS
// owner-read) and hands the request/submit flow to the client.
import { createServerClient } from '@/db/server'
import { getLocale } from '@/lib/locale-server'
import { isEmailConfigured } from '@/lib/email-sender'
import VerifyEmailClient from './VerifyEmailClient'

export default async function VerifySchoolEmailPage() {
  const locale = getLocale('en')
  const supabase = createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return <p className="p-10 text-red-500">{locale === 'zh' ? '未登录。' : 'Not authenticated.'}</p>

  const { data } = await supabase
    .from('school_email_verifications')
    .select('email, institution, verified_at')
    .eq('user_id', user.id)
    .maybeSingle()

  return (
    <VerifyEmailClient
      current={data ? { email: data.email, institution: data.institution, verifiedAt: data.verified_at } : null}
      emailConfigured={isEmailConfigured()}
    />
  )
}
