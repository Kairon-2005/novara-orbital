// GET /api/cron/classify-documents
// Background sweep: classifies any documents that are still missing their AI
// classification (e.g. if the on-demand call failed). Secured by CRON_SECRET so
// only the scheduler can invoke it. Wire to a Vercel Cron schedule.

import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'
import { classifyDocument } from '@/lib/classify-job'

const admin = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
)

export async function GET(req: Request) {
  const auth = req.headers.get('authorization')
  if (!process.env.CRON_SECRET || auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: pending } = await admin
    .from('student_documents')
    .select('id')
    .is('classification', null)
    .limit(10)

  let processed = 0
  for (const doc of pending ?? []) {
    try {
      await classifyDocument(admin, doc.id)
      processed++
    } catch (err) {
      console.error('[cron/classify-documents]', doc.id, err)
    }
  }

  return NextResponse.json({ processed })
}
