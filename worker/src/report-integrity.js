const enc = new TextEncoder()
const REPORT_FORMAT = 'sharecapsule.prepare.report'
const REPORT_TYPES = new Set(['assessment','progress-bundle-manifest'])
const KEY_ID = 'prepare-report-v1'

function canonicalStringify(value) {
  if (value === null || typeof value !== 'object') return JSON.stringify(value)
  if (Array.isArray(value)) return `[${value.map((item) => canonicalStringify(item)).join(',')}]`
  const keys = Object.keys(value).filter((key) => value[key] !== undefined).sort()
  return `{${keys.map((key) => `${JSON.stringify(key)}:${canonicalStringify(value[key])}`).join(',')}}`
}

async function sha256Hex(value) {
  const digest = await crypto.subtle.digest('SHA-256', enc.encode(value))
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('')
}

function signatureMessage(meta) {
  return [meta.format, meta.schemaVersion, meta.reportType, meta.reportId, meta.createdAt, meta.payloadHash].join('\n')
}

function validateMeta(meta) {
  if (!meta || typeof meta !== 'object') throw new Error('Report metadata is required')
  if (meta.format !== REPORT_FORMAT) throw new Error('Unsupported report format')
  if (meta.schemaVersion !== 1) throw new Error('Unsupported report schema version')
  if (!REPORT_TYPES.has(meta.reportType)) throw new Error('Unsupported report type')
  if (!/^[0-9a-f-]{36}$/i.test(String(meta.reportId || ''))) throw new Error('Invalid report id')
  if (!/^[0-9a-f]{64}$/i.test(String(meta.payloadHash || ''))) throw new Error('Invalid payload hash')
  const created = Date.parse(meta.createdAt)
  if (!Number.isFinite(created)) throw new Error('Invalid report timestamp')
  const skew = Math.abs(Date.now() - created)
  if (skew > 15 * 60 * 1000) throw new Error('Report timestamp is outside the signing window')
  return true
}

async function hmacKey(secret, usages) {
  if (!secret) throw new Error('Report signing is not configured')
  return crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, usages)
}

function base64Url(bytes) {
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '')
}

function fromBase64Url(value) {
  const normalized = String(value || '').replace(/-/g, '+').replace(/_/g, '/')
  const padded = normalized + '='.repeat((4 - normalized.length % 4) % 4)
  const binary = atob(padded)
  return Uint8Array.from(binary, (char) => char.charCodeAt(0))
}

export async function signReportMeta(meta, secret) {
  validateMeta(meta)
  const key = await hmacKey(secret, ['sign'])
  const signature = await crypto.subtle.sign('HMAC', key, enc.encode(signatureMessage(meta)))
  return { signature: base64Url(new Uint8Array(signature)), keyId: KEY_ID }
}

export async function verifyReportEnvelope(report, secret) {
  if (!report || typeof report !== 'object') return { valid: false, reason: 'Report must be an object' }
  const integrity = report.integrity || {}
  const meta = {
    format: report.format,
    schemaVersion: report.schemaVersion,
    reportType: report.reportType,
    reportId: report.reportId,
    createdAt: report.createdAt,
    payloadHash: integrity.payloadHash,
  }
  try {
    if (meta.format !== REPORT_FORMAT || meta.schemaVersion !== 1 || !REPORT_TYPES.has(meta.reportType)) throw new Error('Unsupported report envelope')
    if (!/^[0-9a-f-]{36}$/i.test(String(meta.reportId || ''))) throw new Error('Invalid report id')
    if (!/^[0-9a-f]{64}$/i.test(String(meta.payloadHash || ''))) throw new Error('Invalid payload hash')
    if (integrity.hashAlgorithm !== 'SHA-256' || integrity.signatureAlgorithm !== 'HMAC-SHA256' || integrity.keyId !== KEY_ID) throw new Error('Unsupported integrity metadata')
    if (!report.payload || typeof report.payload !== 'object') throw new Error('Report payload is required')
    const computed = await sha256Hex(canonicalStringify(report.payload))
    if (computed !== meta.payloadHash) return { valid: false, reason: 'Payload hash mismatch' }
    const key = await hmacKey(secret, ['verify'])
    const verified = await crypto.subtle.verify('HMAC', key, fromBase64Url(integrity.signature), enc.encode(signatureMessage(meta)))
    return verified ? { valid: true, reportId: meta.reportId, reportType: meta.reportType, payloadHash: meta.payloadHash } : { valid: false, reason: 'Signature verification failed' }
  } catch (error) {
    return { valid: false, reason: error instanceof Error ? error.message : 'Verification failed' }
  }
}
