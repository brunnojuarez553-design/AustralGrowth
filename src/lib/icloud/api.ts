import { NextResponse } from 'next/server'
import { ICloudError, isMissingSchema, safeError } from './errors'
import { Prisma } from '@prisma/client'

export function cloudResponse(error: unknown) {
  if (isMissingSchema(error)) return NextResponse.json({ error: 'La conexión con iCloud está preparada, pero falta activar sus tablas. Tu calendario local sigue disponible.' }, { status: 503 })
  return NextResponse.json({ error: safeError(error) }, { status: error instanceof ICloudError ? error.status : 500 })
}
export async function guardConnection(tx: Prisma.TransactionClient, id: string, userId: string, workspaceId: string) {
  const updated = await tx.iCloudConnection.updateMany({ where: { id, userId, workspaceId, OR: [{ lockUntil: null }, { lockUntil: { lt: new Date() } }] }, data: { updatedAt: new Date() } })
  if (!updated.count) throw new ICloudError('BUSY', 'iCloud está sincronizando. Esperá unos segundos y volvé a intentar.', 409)
}
export function sameOrigin(req: Request) {
  const origin = req.headers.get('origin')
  if (origin && new URL(req.url).origin !== origin) throw new ICloudError('ORIGIN', 'Solicitud no autorizada.', 403)
}
