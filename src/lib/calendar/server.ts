import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { createServerSupabaseClient } from '@/lib/supabase-server'

export async function calendarUser() {
  const supabase = await createServerSupabaseClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user?.email) return null
  return prisma.user.findUnique({ where: { email: user.email } })
}
export const eventSchema = z.object({
  title: z.string().trim().min(1).max(200), description: z.string().max(10000).default(''),
  location: z.string().max(500).default(''), start: z.string().datetime(), end: z.string().datetime(),
  allDay: z.boolean(), kind: z.enum(['EVENT', 'TASK']), color: z.enum(['#ff7a1a', '#60a5fa', '#34d399', '#c084fc', '#fb7185']),
  completed: z.boolean(), recurrence: z.enum(['NONE', 'DAILY', 'WEEKLY', 'MONTHLY']),
  repeatUntil: z.string().datetime().nullable(), reminderMinutes: z.number().int().min(0).max(10080).nullable(),
}).superRefine((v, ctx) => {
  if (new Date(v.end) <= new Date(v.start)) ctx.addIssue({ code: 'custom', message: 'El final debe ser posterior al inicio', path: ['end'] })
  if (v.repeatUntil && new Date(v.repeatUntil) < new Date(v.start)) ctx.addIssue({ code: 'custom', message: 'La repetición termina antes del inicio', path: ['repeatUntil'] })
})
export function eventData(v: z.infer<typeof eventSchema>) {
  return { ...v, start: new Date(v.start), end: new Date(v.end), repeatUntil: v.repeatUntil ? new Date(v.repeatUntil) : null }
}
