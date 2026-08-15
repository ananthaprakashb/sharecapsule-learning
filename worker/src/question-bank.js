import { generateAssessmentQuestions, sanitizeAssessmentRequest } from './assessment-generator.js'

const BANK_VERSION = 1
const DEFAULT_TTL_DAYS = 180
const MAX_BANK_QUESTIONS = 400
const MIN_USABLE_QUESTIONS = 10
const MIN_GENERATION_BATCH = 5
const GENERATOR_EXCLUDE_LIMIT = 400

const normalize = (value = '') => String(value || '')
  .toLowerCase()
  .replace(/[^a-z0-9+#.]+/g, ' ')
  .replace(/\s+/g, ' ')
  .trim()

function normalizedList(value = '') {
  return [...new Set(String(value || '')
    .split(/[,;\n]/)
    .map((item) => normalize(item))
    .filter(Boolean))]
    .sort()
}

async function sha256(value) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(String(value)))
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('')
}

function bankBinding(env) {
  const binding = env?.QUESTION_BANK
  return binding && typeof binding.get === 'function' && typeof binding.put === 'function' ? binding : null
}

function ttlDays(env) {
  const value = Number(env?.QUESTION_BANK_TTL_DAYS || DEFAULT_TTL_DAYS)
  return Number.isFinite(value) ? Math.min(365, Math.max(30, Math.round(value))) : DEFAULT_TTL_DAYS
}

function identityFromRequest(request) {
  const competencyNames = [...new Set(request.competencies.map((item) => normalize(item.name)).filter(Boolean))].sort()
  if (request.profile.track === 'campus') {
    return {
      version: BANK_VERSION,
      track: 'campus',
      companies: normalizedList(request.profile.companies),
      role: normalize(request.profile.role || 'Graduate Engineer / Software Trainee'),
      degree: normalize(request.profile.degree),
      branch: normalize(request.profile.branch),
      semester: normalize(request.profile.semester),
      programmingLanguages: normalizedList(request.profile.programmingLanguages),
      skills: normalizedList(request.profile.skills),
      competencies: competencyNames,
    }
  }
  return {
    version: BANK_VERSION,
    track: 'interview',
    company: normalize(request.profile.company),
    role: normalize(request.profile.role),
    level: normalize(request.profile.level),
    skills: normalizedList(request.profile.skills),
    competencies: competencyNames,
  }
}

export async function questionBankKey(body) {
  const request = sanitizeAssessmentRequest(body)
  const digest = await sha256(JSON.stringify(identityFromRequest(request)))
  return `assessment-bank:v${BANK_VERSION}:${digest}`
}

function validQuestion(question) {
  return Boolean(
    question && typeof question.fingerprint === 'string' && typeof question.id === 'string' &&
    typeof question.prompt === 'string' && Array.isArray(question.options) && question.options.length === 4 &&
    Number.isInteger(question.answer) && question.answer >= 0 && question.answer <= 3 &&
    typeof question.competency === 'string'
  )
}

function dedupeQuestions(items = []) {
  const byFingerprint = new Map()
  for (const question of items) {
    if (validQuestion(question)) byFingerprint.set(question.fingerprint, question)
  }
  return [...byFingerprint.values()].slice(-MAX_BANK_QUESTIONS)
}

function stableHash(value = '') {
  let hash = 2166136261
  for (const char of String(value)) {
    hash ^= char.charCodeAt(0)
    hash = Math.imul(hash, 16777619)
  }
  return hash >>> 0
}

function orderForSession(questions, seed) {
  return [...questions].sort((a, b) =>
    stableHash(`${seed}|${a.fingerprint}`) - stableHash(`${seed}|${b.fingerprint}`))
}

async function readBank(env, key) {
  const kv = bankBinding(env)
  if (!kv) return null
  try {
    const value = await kv.get(key, { type: 'json' })
    if (!value || value.version !== BANK_VERSION || !Array.isArray(value.questions)) return null
    return { ...value, questions: dedupeQuestions(value.questions) }
  } catch {
    return null
  }
}

async function writeBank(env, key, value) {
  const kv = bankBinding(env)
  if (!kv) return false
  try {
    await kv.put(key, JSON.stringify(value), { expirationTtl: ttlDays(env) * 24 * 60 * 60 })
    return true
  } catch {
    return false
  }
}

function freshSavedQuestions(bank, request) {
  const excluded = new Set(request.excludeFingerprints)
  return orderForSession(
    (bank?.questions || []).filter((question) => !excluded.has(question.fingerprint)),
    request.sessionSeed,
  )
}

function cachedResponse({ request, bank, key, questions, env, warning = '' }) {
  return {
    version: 2,
    target: bank.target,
    generatedAt: bank.generatedAt || bank.updatedAt || new Date().toISOString(),
    generator: {
      configured: Boolean(env.OPENAI_API_KEY),
      model: bank.generator?.model || env.OPENAI_MODEL || 'gpt-5-mini',
      store: false,
      usedThisRequest: false,
    },
    research: bank.research || null,
    questions,
    requestedCount: request.count,
    generatedCount: questions.length,
    policy: bank.policy || {
      originalPracticeQuestions: true,
      verbatimCandidateQuestions: false,
      confidentialOrLeakedMaterial: false,
    },
    warnings: warning ? [warning] : [],
    bank: {
      configured: Boolean(bankBinding(env)),
      hit: true,
      fullHit: questions.length >= request.count,
      key: key.split(':').pop().slice(0, 12),
      storedCount: bank.questions.length,
      servedFromBank: questions.length,
      generatedNow: 0,
      ttlDays: ttlDays(env),
    },
  }
}

function generationBody(body, request, bankQuestions, count) {
  const prior = bankQuestions.map((question) => question.fingerprint)
  return {
    ...body,
    count,
    sessionSeed: request.sessionSeed,
    excludeFingerprints: [...new Set([...request.excludeFingerprints, ...prior])].slice(-GENERATOR_EXCLUDE_LIMIT),
  }
}

export async function getAssessmentQuestions(body, env, { forceResearch = false } = {}) {
  const request = sanitizeAssessmentRequest(body)
  const key = await questionBankKey(body)
  const existingBank = await readBank(env, key)
  const freshSaved = freshSavedQuestions(existingBank, request)

  if (freshSaved.length >= request.count) {
    return cachedResponse({ request, bank: existingBank, key, questions: freshSaved.slice(0, request.count), env })
  }

  if (!env.OPENAI_API_KEY) {
    if (existingBank && freshSaved.length >= MIN_USABLE_QUESTIONS) {
      return cachedResponse({
        request,
        bank: existingBank,
        key,
        questions: freshSaved.slice(0, request.count),
        env,
        warning: `Used ${Math.min(freshSaved.length, request.count)} saved questions because new question generation is not configured.`,
      })
    }
    throw new Error('Company-specific question generation is not configured')
  }

  const shortage = request.count - freshSaved.length
  const generationCount = Math.min(50, Math.max(MIN_GENERATION_BATCH, shortage))

  let generated
  try {
    generated = await generateAssessmentQuestions(
      generationBody(body, request, existingBank?.questions || [], generationCount),
      env,
      { forceResearch },
    )
  } catch (error) {
    if (existingBank && freshSaved.length >= MIN_USABLE_QUESTIONS) {
      return cachedResponse({
        request,
        bank: existingBank,
        key,
        questions: freshSaved.slice(0, request.count),
        env,
        warning: `Used ${Math.min(freshSaved.length, request.count)} saved questions because new question generation is temporarily unavailable.`,
      })
    }
    throw error
  }

  const generatedQuestions = dedupeQuestions(generated.questions || [])
  const mergedQuestions = dedupeQuestions([...(existingBank?.questions || []), ...generatedQuestions])
  const now = new Date().toISOString()
  const bank = {
    version: BANK_VERSION,
    identity: identityFromRequest(request),
    target: generated.target || existingBank?.target,
    generator: generated.generator || existingBank?.generator,
    research: generated.research || existingBank?.research || null,
    policy: generated.policy || existingBank?.policy || null,
    generatedAt: existingBank?.generatedAt || now,
    updatedAt: now,
    questions: mergedQuestions,
  }

  const saved = await writeBank(env, key, bank)
  const excluded = new Set(request.excludeFingerprints)
  const combined = dedupeQuestions([...freshSaved, ...generatedQuestions])
    .filter((question) => !excluded.has(question.fingerprint))
  const selected = orderForSession(combined, request.sessionSeed).slice(0, request.count)
  const previousFingerprints = new Set((existingBank?.questions || []).map((question) => question.fingerprint))
  const servedFromBank = selected.filter((question) => previousFingerprints.has(question.fingerprint)).length

  return {
    ...generated,
    version: 2,
    questions: selected,
    requestedCount: request.count,
    generatedCount: selected.length,
    bank: {
      configured: Boolean(bankBinding(env)),
      persisted: saved,
      hit: Boolean(existingBank?.questions?.length),
      fullHit: false,
      key: key.split(':').pop().slice(0, 12),
      storedCount: mergedQuestions.length,
      servedFromBank,
      generatedNow: generatedQuestions.length,
      ttlDays: ttlDays(env),
    },
  }
}

export const questionBankConfig = {
  version: BANK_VERSION,
  maxQuestionsPerTarget: MAX_BANK_QUESTIONS,
  defaultTtlDays: DEFAULT_TTL_DAYS,
}
