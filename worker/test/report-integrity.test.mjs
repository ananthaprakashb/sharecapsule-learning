import test from 'node:test'
import assert from 'node:assert/strict'
import { signReportMeta, verifyReportEnvelope } from '../src/report-integrity.js'

const secret = 'test-only-report-signing-secret-1234567890'

function canonicalStringify(value) {
  if (value === null || typeof value !== 'object') return JSON.stringify(value)
  if (Array.isArray(value)) return `[${value.map((item) => canonicalStringify(item)).join(',')}]`
  const keys = Object.keys(value).filter((key) => value[key] !== undefined).sort()
  return `{${keys.map((key) => `${JSON.stringify(key)}:${canonicalStringify(value[key])}`).join(',')}}`
}

async function sha256Hex(value) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value))
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('')
}

async function buildReport() {
  const payload = { target:{ label:'B.Tech IT Campus Placement', targetKey:'campus|b.tech|information technology|tcs' }, assessment:{ readiness:72 } }
  const payloadHash = await sha256Hex(canonicalStringify(payload))
  const meta = {
    format:'sharecapsule.prepare.report', schemaVersion:1, reportType:'assessment',
    reportId:crypto.randomUUID(), createdAt:new Date().toISOString(), payloadHash,
  }
  const signed = await signReportMeta(meta, secret)
  return {
    format:meta.format, schemaVersion:1, reportType:'assessment', reportId:meta.reportId, createdAt:meta.createdAt, payload,
    integrity:{ hashAlgorithm:'SHA-256', signatureAlgorithm:'HMAC-SHA256', payloadHash, signature:signed.signature, keyId:signed.keyId },
  }
}

test('verifies an unchanged signed report', async () => {
  const report = await buildReport()
  const result = await verifyReportEnvelope(report, secret)
  assert.equal(result.valid, true)
})

test('rejects a locally modified report', async () => {
  const report = await buildReport()
  report.payload.assessment.readiness = 99
  const result = await verifyReportEnvelope(report, secret)
  assert.equal(result.valid, false)
  assert.match(result.reason, /hash mismatch/i)
})

test('rejects a forged signature', async () => {
  const report = await buildReport()
  report.integrity.signature = report.integrity.signature.replace(/^./, report.integrity.signature[0] === 'A' ? 'B' : 'A')
  const result = await verifyReportEnvelope(report, secret)
  assert.equal(result.valid, false)
})
