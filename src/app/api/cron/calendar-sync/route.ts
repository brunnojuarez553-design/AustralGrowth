import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { encryptionReady } from '@/lib/icloud/crypto'
import { isMissingSchema } from '@/lib/icloud/errors'
import { syncCalendar } from '@/lib/icloud/sync'
export const maxDuration = 60
export const runtime = 'nodejs'
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET
  if (!secret || req.headers.get('authorization') !== `Bearer ${secret}`) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  if (!encryptionReady()) return NextResponse.json({ configured: false })
  let connections
  try { connections = await prisma.iCloudConnection.findMany({ where: { active: true }, select: { userId: true, workspaceId: true }, orderBy: { lastAttemptAt: { sort: 'asc', nulls: 'first' } }, take: 1 }) } catch (error) { if (isMissingSchema(error)) return NextResponse.json({ configured: false }); throw error }
  let synced = 0, failed = 0
  const deadline = Date.now() + 40000
  for (const connection of connections) {
    if (Date.now() > deadline) break
    try { await syncCalendar({ id: connection.userId, workspaceId: connection.workspaceId }); synced++ } catch { failed++ }
  }
  return NextResponse.json({ synced, failed })
}
