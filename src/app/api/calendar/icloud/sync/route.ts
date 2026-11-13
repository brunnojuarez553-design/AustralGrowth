import { NextRequest, NextResponse } from 'next/server'
import { calendarUser } from '@/lib/calendar/server'
import { syncCalendar } from '@/lib/icloud/sync'
import { cloudResponse, sameOrigin } from '@/lib/icloud/api'
export const maxDuration = 60
export const runtime = 'nodejs'
export async function POST(req: NextRequest) {
  try {
    sameOrigin(req)
    const user = await calendarUser()
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    return NextResponse.json(await syncCalendar(user))
  } catch (error) { return cloudResponse(error) }
}
