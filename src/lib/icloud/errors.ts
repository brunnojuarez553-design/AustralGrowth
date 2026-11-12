export class ICloudError extends Error {
  constructor(public readonly code: string, message: string, public readonly status = 502) { super(message) }
}
export function safeError(error: unknown) {
  return error instanceof ICloudError ? error.message : 'No se pudo completar la sincronización con iCloud. Volvé a intentarlo.'
}
export function isMissingSchema(error: unknown) {
  return !!error && typeof error === 'object' && 'code' in error && ['P2021', 'P2022'].includes(String(error.code))
}
