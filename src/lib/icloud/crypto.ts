import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto'
import { ICloudError } from './errors'
function key() {
  const value = process.env.CALENDAR_ENCRYPTION_KEY
  if (!value || !/^[a-f0-9]{64}$/i.test(value)) throw new ICloudError('CONFIG', 'La conexión con iCloud todavía no está habilitada en el servidor.', 503)
  return Buffer.from(value, 'hex')
}
export function encryptPassword(secret: string, owner: string) {
  const iv = randomBytes(12), cipher = createCipheriv('aes-256-gcm', key(), iv)
  cipher.setAAD(Buffer.from(owner))
  const encrypted = Buffer.concat([cipher.update(secret, 'utf8'), cipher.final()])
  return ['v1', iv.toString('base64'), cipher.getAuthTag().toString('base64'), encrypted.toString('base64')].join('.')
}
export function decryptPassword(value: string, owner: string) {
  try {
    const [version, iv, tag, encrypted] = value.split('.')
    if (version !== 'v1') throw new Error('version')
    const decipher = createDecipheriv('aes-256-gcm', key(), Buffer.from(iv, 'base64'))
    decipher.setAAD(Buffer.from(owner)); decipher.setAuthTag(Buffer.from(tag, 'base64'))
    return Buffer.concat([decipher.update(Buffer.from(encrypted, 'base64')), decipher.final()]).toString('utf8')
  } catch { throw new ICloudError('CONFIG', 'No se pudo abrir la conexión guardada. Desconectá y volvé a conectar iCloud.', 503) }
}
export function encryptionReady() { try { key(); return true } catch { return false } }
