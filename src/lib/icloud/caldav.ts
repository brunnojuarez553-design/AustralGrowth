import { XMLParser, XMLValidator } from 'fast-xml-parser'
import { ICloudError } from './errors'

export type Credentials = { email: string; password: string }
export type CloudCalendar = { url: string; name: string }
export type RemoteObject = { url: string; etag: string; data?: string }
const parser = new XMLParser({ removeNSPrefix: true, ignoreAttributes: false, parseTagValue: false, trimValues: false })
const array = <T>(v: T | T[] | undefined): T[] => v === undefined ? [] : Array.isArray(v) ? v : [v]
const xml = (s: string) => s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' }[c]!))
export function appleUrl(value: string, base = 'https://caldav.icloud.com/') {
  let url: URL
  try { url = new URL(value, base) } catch { throw new ICloudError('URL', 'iCloud devolvió una dirección no válida.') }
  if (url.protocol !== 'https:' || url.port || url.username || url.password || url.search || url.hash || !/^(?:caldav|p\d+-caldav)\.icloud\.com$/i.test(url.hostname)) throw new ICloudError('URL', 'iCloud devolvió una dirección no permitida.')
  return url.href
}
export function objectUrl(value: string, calendarUrl: string) {
  const collection = new URL(appleUrl(calendarUrl)), candidate = new URL(appleUrl(value, calendarUrl))
  const prefix = collection.pathname.endsWith('/') ? collection.pathname : collection.pathname + '/'
  const decoded = decodeURIComponent(candidate.pathname)
  if (candidate.origin !== collection.origin || !candidate.pathname.startsWith(prefix) || decoded.includes('/../') || decoded.includes('/./') || candidate.pathname === prefix) throw new ICloudError('URL', 'El evento no pertenece al calendario seleccionado.')
  return candidate.href
}
async function boundedText(response: Response, limit: number) {
  if (Number(response.headers.get('content-length')) > limit) throw new ICloudError('LIMIT', 'El calendario supera el tamaño admitido. Elegí un calendario de trabajo más pequeño.')
  const reader = response.body?.getReader(); if (!reader) return ''
  const decoder = new TextDecoder(); let text = '', bytes = 0
  try { while (true) { const part = await reader.read(); if (part.done) break; bytes += part.value.byteLength; if (bytes > limit) throw new ICloudError('LIMIT', 'El calendario supera el tamaño admitido.'); text += decoder.decode(part.value, { stream: true }) } return text + decoder.decode() }
  finally { await reader.cancel().catch(() => {}); reader.releaseLock() }
}
export class AppleCalDAV {
  constructor(private credentials: Credentials, private transport: typeof fetch = fetch) {}
  private async request(url: string, method: string, body?: string, headers: Record<string, string> = {}) {
    let target = appleUrl(url)
    for (let redirects = 0; redirects < 4; redirects++) {
      let response: Response
      try { response = await this.transport(target, { method, body, headers: { Authorization: 'Basic ' + Buffer.from(`${this.credentials.email}:${this.credentials.password}`).toString('base64'), 'Content-Type': 'application/xml; charset=utf-8', ...headers }, redirect: 'manual', signal: AbortSignal.timeout(12000), cache: 'no-store' }) }
      catch { throw new ICloudError('NETWORK', 'No se pudo contactar a iCloud. Volvé a intentar en unos minutos.') }
      if ([301, 302, 307, 308].includes(response.status)) {
        const next = response.headers.get('location'); if (!next) throw new ICloudError('REDIRECT', 'iCloud no pudo completar la conexión.')
        const validated = appleUrl(next, target)
        // Discovery may move between Apple shards. Never redirect a write or object read.
        if (method !== 'PROPFIND') throw new ICloudError('REDIRECT', 'El calendario cambió de dirección. Reconectá iCloud.')
        await response.body?.cancel(); target = validated; continue
      }
      if ([401, 403].includes(response.status)) { await response.body?.cancel(); throw new ICloudError('AUTH', 'iCloud rechazó el acceso. Usá una contraseña específica para AustralGrowth y un calendario editable.', 401) }
      return { response, url: target }
    }
    throw new ICloudError('REDIRECT', 'iCloud devolvió demasiadas redirecciones.')
  }
  private async multi(url: string, method: string, body: string, depth = '0') {
    const result = await this.request(url, method, body, { Depth: depth })
    const text = await boundedText(result.response, 8_000_000)
    if (result.response.status !== 207) throw new ICloudError('CALDAV', 'iCloud no pudo leer el calendario. Volvé a intentarlo.')
    if (/<!DOCTYPE|<!ENTITY/i.test(text) || XMLValidator.validate(text) !== true) throw new ICloudError('XML', 'La respuesta del calendario no es válida.')
    const parsed = parser.parse(text)
    if (!parsed.multistatus) throw new ICloudError('XML', 'iCloud devolvió una respuesta incompleta.')
    // Only use successful propstat entries; a failed collection listing never means deletion.
    const responses = array<any>(parsed.multistatus.response).map(item => {
      const good = array<any>(item.propstat).filter(p => /\s200\s/.test(p.status || ''))
      return { href: String(item.href || ''), prop: Object.assign({}, ...good.map(p => p.prop)), ok: good.length > 0, status: item.status }
    })
    return { responses, url: result.url }
  }
  async discover(): Promise<CloudCalendar[]> {
    const principal = await this.multi('https://caldav.icloud.com/', 'PROPFIND', '<d:propfind xmlns:d="DAV:"><d:prop><d:current-user-principal/></d:prop></d:propfind>')
    const href = principal.responses.find(r => r.ok)?.prop['current-user-principal']?.href
    if (!href) throw new ICloudError('DISCOVERY', 'No se encontró tu cuenta de Calendario de iCloud.')
    const home = await this.multi(appleUrl(href, principal.url), 'PROPFIND', '<d:propfind xmlns:d="DAV:" xmlns:c="urn:ietf:params:xml:ns:caldav"><d:prop><c:calendar-home-set/></d:prop></d:propfind>')
    const homeHref = home.responses.find(r => r.ok)?.prop['calendar-home-set']?.href
    if (!homeHref) throw new ICloudError('DISCOVERY', 'Activá Calendarios en iCloud y volvé a intentar.')
    const calendars = await this.multi(appleUrl(homeHref, home.url), 'PROPFIND', '<d:propfind xmlns:d="DAV:" xmlns:c="urn:ietf:params:xml:ns:caldav"><d:prop><d:displayname/><d:resourcetype/><d:current-user-privilege-set/><c:supported-calendar-component-set/></d:prop></d:propfind>', '1')
    return calendars.responses.filter(r => {
      if (!r.ok || !r.prop.resourcetype || !('calendar' in r.prop.resourcetype)) return false
      const privileges = array<any>(r.prop['current-user-privilege-set']?.privilege)
      const writable = privileges.some(p => 'write' in p || 'all' in p || 'write-content' in p)
      const components = array<any>(r.prop['supported-calendar-component-set']?.comp)
      return writable && components.some(c => c['@_name'] === 'VEVENT')
    }).map(r => ({ url: appleUrl(r.href, calendars.url), name: String(r.prop.displayname || 'Calendario iCloud').slice(0, 200) })).slice(0, 100)
  }
  async inventory(calendar: string): Promise<RemoteObject[]> {
    const { responses } = await this.multi(calendar, 'REPORT', '<c:calendar-query xmlns:d="DAV:" xmlns:c="urn:ietf:params:xml:ns:caldav"><d:prop><d:getetag/></d:prop><c:filter><c:comp-filter name="VCALENDAR"><c:comp-filter name="VEVENT"/></c:comp-filter></c:filter></c:calendar-query>', '1')
    if (responses.length > 2000) throw new ICloudError('LIMIT', 'Elegí un calendario con menos de 2000 eventos o series.')
    return responses.map(r => { if (!r.ok || !r.prop.getetag) throw new ICloudError('INCOMPLETE', 'iCloud devolvió un listado incompleto. No se modificaron eliminaciones.'); return { url: objectUrl(r.href, calendar), etag: String(r.prop.getetag) } })
  }
  async read(calendar: string, urls: string[]): Promise<RemoteObject[]> {
    if (!urls.length) return []
    const hrefs = urls.map(url => `<d:href>${xml(new URL(objectUrl(url, calendar)).pathname)}</d:href>`).join('')
    const { responses } = await this.multi(calendar, 'REPORT', `<c:calendar-multiget xmlns:d="DAV:" xmlns:c="urn:ietf:params:xml:ns:caldav"><d:prop><d:getetag/><c:calendar-data/></d:prop>${hrefs}</c:calendar-multiget>`, '1')
    const values = responses.map(r => { if (!r.ok || !r.prop.getetag || !r.prop['calendar-data']) throw new ICloudError('INCOMPLETE', 'Un evento cambió mientras se sincronizaba. Volvé a intentar.'); return { url: objectUrl(r.href, calendar), etag: String(r.prop.getetag), data: String(r.prop['calendar-data']) } })
    if (values.length !== urls.length || values.some(v => !urls.includes(v.url))) throw new ICloudError('INCOMPLETE', 'La lectura del calendario quedó incompleta.')
    return values
  }
  async put(calendar: string, url: string, data: string, etag: string | null) {
    const { response } = await this.request(objectUrl(url, calendar), 'PUT', data, { 'Content-Type': 'text/calendar; charset=utf-8', ...(etag ? { 'If-Match': etag } : { 'If-None-Match': '*' }) })
    await response.body?.cancel()
    if (response.status === 412) throw new ICloudError('CONFLICT', 'El evento cambió en iCloud. Volvé a sincronizar para conservar ambos cambios.', 409)
    if (![200, 201, 204].includes(response.status)) throw new ICloudError('WRITE', 'iCloud no pudo guardar el evento. El cambio sigue pendiente.')
    return response.headers.get('etag')
  }
  async remove(calendar: string, url: string, etag: string) {
    const { response } = await this.request(objectUrl(url, calendar), 'DELETE', undefined, { 'If-Match': etag })
    await response.body?.cancel()
    if (response.status === 412) throw new ICloudError('CONFLICT', 'El evento cambió en iCloud y no se eliminó. Sincronizá nuevamente.', 409)
    if (![200, 204, 404].includes(response.status)) throw new ICloudError('DELETE', 'iCloud no pudo eliminar el evento. La eliminación sigue pendiente.')
  }
}
