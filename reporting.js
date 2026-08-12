const defaultApiBase = location.hostname === 'localhost' || location.hostname === '127.0.0.1'
  ? 'http://localhost:8787'
  : 'https://api.prepare.sharecapsule.app'
const apiBase = String(window.PREPARE_API_BASE || defaultApiBase).replace(/\/$/, '')
const REPORT_STORE_KEY = 'prepare-signed-reports-v1'
const MAX_LOCAL_REPORTS = 40
const enc = new TextEncoder()

export function canonicalStringify(value) {
  if (value === null || typeof value !== 'object') return JSON.stringify(value)
  if (Array.isArray(value)) return `[${value.map((item) => canonicalStringify(item)).join(',')}]`
  const keys = Object.keys(value).filter((key) => value[key] !== undefined).sort()
  return `{${keys.map((key) => `${JSON.stringify(key)}:${canonicalStringify(value[key])}`).join(',')}}`
}

export async function sha256Hex(value) {
  const bytes = typeof value === 'string' ? enc.encode(value) : value
  const digest = await crypto.subtle.digest('SHA-256', bytes)
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('')
}

function readStoredReports() {
  try {
    const parsed = JSON.parse(localStorage.getItem(REPORT_STORE_KEY) || '[]')
    return Array.isArray(parsed) ? parsed.filter((item) => item?.format === 'sharecapsule.prepare.report') : []
  } catch { return [] }
}

export function getStoredReports(targetKey = '') {
  const reports = readStoredReports()
  return targetKey ? reports.filter((item) => item.payload?.target?.targetKey === targetKey) : reports
}

export function saveStoredReport(report) {
  const reports = readStoredReports().filter((item) => item.reportId !== report.reportId && item.integrity?.payloadHash !== report.integrity?.payloadHash)
  reports.push(report)
  localStorage.setItem(REPORT_STORE_KEY, JSON.stringify(reports.slice(-MAX_LOCAL_REPORTS)))
  return report
}

async function requestSignature(meta) {
  const response = await fetch(`${apiBase}/v1/report/sign`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(meta),
  })
  const body = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(body.error || `Report signing failed (${response.status})`)
  return body
}

export async function ensureSignedReport(payload, reportType = 'assessment') {
  const payloadHash = await sha256Hex(canonicalStringify(payload))
  const existing = readStoredReports().find((item) => item.reportType === reportType && item.integrity?.payloadHash === payloadHash)
  if (existing) return existing

  const meta = {
    format: 'sharecapsule.prepare.report',
    schemaVersion: 1,
    reportType,
    reportId: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    payloadHash,
  }
  const signed = await requestSignature(meta)
  const report = {
    format: meta.format,
    schemaVersion: meta.schemaVersion,
    reportType: meta.reportType,
    reportId: meta.reportId,
    createdAt: meta.createdAt,
    payload,
    integrity: {
      hashAlgorithm: 'SHA-256',
      signatureAlgorithm: 'HMAC-SHA256',
      payloadHash,
      signature: signed.signature,
      keyId: signed.keyId || 'prepare-report-v1',
    },
  }
  return saveStoredReport(report)
}

function safeFilePart(value = '') {
  return String(value).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60) || 'prepare'
}

export function reportFileName(report) {
  const target = safeFilePart(report.payload?.target?.label || report.payload?.target?.targetKey || 'prepare')
  const day = String(report.createdAt || new Date().toISOString()).slice(0, 10)
  return `${target}-${day}-${String(report.reportId).slice(0, 8)}.prepare.json`
}

export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.style.display = 'none'
  document.body.append(anchor)
  anchor.click()
  anchor.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export function downloadReport(report) {
  const json = `${JSON.stringify(report, null, 2)}\n`
  downloadBlob(new Blob([json], { type: 'application/json' }), reportFileName(report))
}

const crcTable = (() => {
  const table = new Uint32Array(256)
  for (let n = 0; n < 256; n += 1) {
    let c = n
    for (let k = 0; k < 8; k += 1) c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1)
    table[n] = c >>> 0
  }
  return table
})()

function crc32(bytes) {
  let crc = 0xffffffff
  for (const byte of bytes) crc = crcTable[(crc ^ byte) & 0xff] ^ (crc >>> 8)
  return (crc ^ 0xffffffff) >>> 0
}

function u16(value) {
  return new Uint8Array([value & 0xff, (value >>> 8) & 0xff])
}
function u32(value) {
  return new Uint8Array([value & 0xff, (value >>> 8) & 0xff, (value >>> 16) & 0xff, (value >>> 24) & 0xff])
}
function concat(parts) {
  const size = parts.reduce((sum, part) => sum + part.length, 0)
  const out = new Uint8Array(size)
  let offset = 0
  for (const part of parts) { out.set(part, offset); offset += part.length }
  return out
}

function buildStoreZip(entries) {
  const locals = []
  const centrals = []
  let offset = 0
  for (const entry of entries) {
    const name = enc.encode(entry.name)
    const data = typeof entry.data === 'string' ? enc.encode(entry.data) : entry.data
    const crc = crc32(data)
    const local = concat([
      u32(0x04034b50), u16(20), u16(0x0800), u16(0), u16(0), u16(0x21),
      u32(crc), u32(data.length), u32(data.length), u16(name.length), u16(0), name, data,
    ])
    locals.push(local)
    const central = concat([
      u32(0x02014b50), u16(20), u16(20), u16(0x0800), u16(0), u16(0), u16(0x21),
      u32(crc), u32(data.length), u32(data.length), u16(name.length), u16(0), u16(0), u16(0), u16(0), u32(0), u32(offset), name,
    ])
    centrals.push(central)
    offset += local.length
  }
  const centralSize = centrals.reduce((sum, part) => sum + part.length, 0)
  const end = concat([
    u32(0x06054b50), u16(0), u16(0), u16(entries.length), u16(entries.length), u32(centralSize), u32(offset), u16(0),
  ])
  return new Blob([...locals, ...centrals, end], { type: 'application/zip' })
}

export async function createProgressBundle(targetKey) {
  const reports = getStoredReports(targetKey)
  if (!reports.length) throw new Error('No signed reports are stored for this target yet.')
  const manifestPayload = {
    bundleVersion: 1,
    targetKey,
    createdAt: new Date().toISOString(),
    reportCount: reports.length,
    reports: reports.map((report) => ({
      file: reportFileName(report),
      reportId: report.reportId,
      reportType: report.reportType,
      createdAt: report.createdAt,
      payloadHash: report.integrity?.payloadHash,
      signature: report.integrity?.signature,
      keyId: report.integrity?.keyId,
    })),
  }
  const manifest = await ensureSignedReport(manifestPayload, 'progress-bundle-manifest')
  const entries = reports.map((report) => ({ name: `reports/${reportFileName(report)}`, data: `${JSON.stringify(report, null, 2)}\n` }))
  entries.push({ name: 'manifest.prepare.json', data: `${JSON.stringify(manifest, null, 2)}\n` })
  entries.push({ name: 'README.txt', data: 'ShareCapsule Prepare progress bundle. Each report and this manifest are tamper-evident. Upload processing must verify signatures before trusting report data.\n' })
  const zip = buildStoreZip(entries)
  const target = safeFilePart(reports.at(-1)?.payload?.target?.label || targetKey)
  const day = new Date().toISOString().slice(0, 10)
  return { zip, filename: `${target}-${day}-progress.prepare.zip`, count: reports.length, manifest }
}
