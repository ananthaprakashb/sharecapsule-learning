import { researchTarget, sanitizeResearchRequest, validateResearchRequest } from './research-multi.js'
import { configuredProviders, searchWithFallback } from './providers/index.js'

const QUERY_CACHE_SECONDS = 30 * 24 * 60 * 60
const DEFAULT_MODEL = 'gpt-5-mini'
const MAX_QUESTIONS = 50
const MAX_EXCLUDES = 400
const BLOCKED_EVIDENCE = /\b(leak(?:ed|s)?|confidential|nda|non[- ]disclosure)\b/i

const safeText = (value, max = 320) => String(value || '')
  .replace(/[\u0000-\u001f]/g, ' ')
  .replace(/\s+/g, ' ')
  .trim()
  .slice(0, max)

function normalize(value = '') {
  return String(value || '').toLowerCase().replace(/[^a-z0-9+#.]+/g, ' ').replace(/\s+/g, ' ').trim()
}

async function sha256(value) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(String(value)))
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('')
}

function host(urlString) {
  try { return new URL(urlString).hostname.toLowerCase().replace(/^www\./, '') } catch { return '' }
}

function profileTarget(profile) {
  if (profile.track === 'campus') {
    return [profile.companies, profile.role || 'Graduate Engineer / Software Trainee', profile.degree, profile.branch].filter(Boolean).join(' · ')
  }
  return [profile.company, profile.role, profile.level].filter(Boolean).join(' · ')
}

function targetCompanies(profile) {
  if (profile.track === 'interview') return [safeText(profile.company, 100)].filter(Boolean)
  return String(profile.companies || '')
    .split(/[,;\n]/)
    .map((item) => safeText(item, 100))
    .filter(Boolean)
    .slice(0, 8)
}

export function validateAssessmentRequest(body) {
  if (!body || typeof body !== 'object') throw new Error('Request body must be an object')
  const profile = body.profile || {}
  if (!['interview', 'campus'].includes(profile.track)) throw new Error('Company-specific assessment supports interview or campus tracks')
  if (profile.track === 'interview' && (!profile.company || !profile.role)) throw new Error('Company and role are required')
  if (profile.track === 'campus' && (!profile.degree || !profile.branch)) throw new Error('Degree and branch are required')
  if (!Array.isArray(body.competencies) || !body.competencies.length) throw new Error('competencies are required')
  if (body.competencies.length > 15) throw new Error('Too many competencies')
  const count = Number(body.count || MAX_QUESTIONS)
  if (!Number.isInteger(count) || count < 5 || count > MAX_QUESTIONS) throw new Error('count must be an integer between 5 and 50')
  if (body.excludeFingerprints && !Array.isArray(body.excludeFingerprints)) throw new Error('excludeFingerprints must be an array')
  if ((body.excludeFingerprints || []).length > MAX_EXCLUDES) throw new Error('Too many excluded questions')
  return true
}

export function sanitizeAssessmentRequest(body) {
  validateAssessmentRequest(body)
  const research = sanitizeResearchRequest({
    profile: body.profile,
    competencies: body.competencies,
    gaps: Array.isArray(body.gaps) ? body.gaps : [],
  })
  return {
    ...research,
    count: Math.min(MAX_QUESTIONS, Math.max(5, Number(body.count || MAX_QUESTIONS))),
    sessionSeed: safeText(body.sessionSeed || crypto.randomUUID(), 120),
    excludeFingerprints: [...new Set((body.excludeFingerprints || []).map((item) => safeText(item, 80)).filter(Boolean))].slice(0, MAX_EXCLUDES),
  }
}

async function cachedSearch(query, env, { count = 8, force = false } = {}) {
  const providers = configuredProviders(env)
  const key = await sha256(JSON.stringify({ version: 1, query, count, providers }))
  const request = new Request(`https://assessment-search-cache.internal/v1/${key}`, { method: 'GET' })
  const cache = caches.default
  if (!force) {
    const hit = await cache.match(request)
    if (hit) return { ...await hit.json(), cacheHit: true }
  }
  const batch = await searchWithFallback(query, env, { count })
  const response = new Response(JSON.stringify(batch), {
    headers: { 'Content-Type': 'application/json', 'Cache-Control': `public, max-age=${QUERY_CACHE_SECONDS}` },
  })
  await cache.put(request, response)
  return { ...batch, cacheHit: false }
}

function evidenceQueries(profile, competencies = []) {
  const role = safeText(profile.role || 'Graduate Engineer / Software Trainee', 120)
  const level = safeText(profile.level, 60)
  const topSkills = competencies.slice(0, 5).map((item) => safeText(item.name, 80)).filter(Boolean).join(' ')
  const queries = []
  for (const company of targetCompanies(profile)) {
    const target = [company, role, level].filter(Boolean).join(' ')
    queries.push(`${target} interview process official careers`)
    queries.push(`${target} interview experience questions candidate`)
    queries.push(`${target} interview rounds skills responsibilities`)
    if (topSkills) queries.push(`${target} ${topSkills} interview`)
  }
  return [...new Set(queries.map((query) => query.replace(/\s+/g, ' ').trim()))].slice(0, profile.track === 'campus' ? 12 : 8)
}

function secondaryEvidenceSource(result, index, query, provider) {
  const publisher = host(result.url)
  const text = `${result.title || ''} ${result.snippet || ''}`
  if (!publisher || BLOCKED_EVIDENCE.test(text)) return null
  return {
    id: `reported-${index + 1}`,
    title: safeText(result.title, 180),
    url: result.url,
    publisher,
    description: safeText(result.snippet, 420),
    quality: 'Public interview report / web source',
    targetEvidence: false,
    competencies: [],
    provenance: { provider, query: safeText(query, 260), providerRank: result.providerRank || null },
  }
}

async function gatherAssessmentEvidence(request, env, { force = false } = {}) {
  validateResearchRequest(request)
  const baseline = await researchTarget(request, env, { force })
  const queries = evidenceQueries(request.profile, request.competencies)
  const batches = await Promise.all(queries.map(async (query) => {
    const batch = await cachedSearch(query, env, { count: 8, force })
    return { query, provider: batch.provider, cacheHit: batch.cacheHit, results: batch.results || [] }
  }))
  const secondary = []
  for (const batch of batches) {
    for (const result of batch.results) {
      const source = secondaryEvidenceSource(result, secondary.length, batch.query, batch.provider)
      if (source && !secondary.some((item) => item.url === source.url)) secondary.push(source)
      if (secondary.length >= 18) break
    }
    if (secondary.length >= 18) break
  }
  const sources = [...(baseline.sources || []).slice(0, 12), ...secondary]
    .filter((source, index, all) => source?.url && all.findIndex((item) => item.url === source.url) === index)
    .slice(0, 24)
  return {
    baseline,
    queries,
    queryCacheHits: batches.filter((batch) => batch.cacheHit).length,
    sources,
  }
}

function questionSchema(count) {
  return {
    type: 'object',
    additionalProperties: false,
    required: ['questions'],
    properties: {
      questions: {
        type: 'array',
        minItems: count,
        maxItems: count,
        items: {
          type: 'object',
          additionalProperties: false,
          required: ['competency', 'difficulty', 'prompt', 'options', 'answer', 'explanation', 'sourceIds', 'evidenceRationale'],
          properties: {
            competency: { type: 'string' },
            difficulty: { type: 'string', enum: ['foundation', 'core', 'advanced'] },
            prompt: { type: 'string' },
            options: {
              type: 'array',
              minItems: 4,
              maxItems: 4,
              items: { type: 'string' },
            },
            answer: { type: 'integer', minimum: 0, maximum: 3 },
            explanation: { type: 'string' },
            sourceIds: {
              type: 'array',
              maxItems: 3,
              items: { type: 'string' },
            },
            evidenceRationale: { type: 'string' },
          },
        },
      },
    },
  }
}

function evidenceForPrompt(evidence) {
  return evidence.sources.map((source) => ({
    id: source.id,
    title: safeText(source.title, 160),
    publisher: safeText(source.publisher, 120),
    quality: safeText(source.quality, 100),
    description: safeText(source.description || source.snippet, 360),
    competencies: (source.competencies || []).slice(0, 6),
    official: Boolean(source.targetEvidence),
  }))
}

function generationInstructions(request, evidence) {
  const allowedCompetencies = request.competencies.map((item) => item.name)
  const exclude = request.excludeFingerprints.slice(-200)
  return [
    'Create an original interview-practice assessment grounded in the supplied public evidence.',
    `Target: ${profileTarget(request.profile)}.`,
    `Allowed competencies: ${allowedCompetencies.join(', ')}.`,
    `Generate exactly ${request.count} four-option multiple-choice practice questions.`,
    'Questions must reflect the target company/companies, role, level, responsibilities, interview process, and recurring publicly reported themes when evidence supports them.',
    'Do not claim a question was literally asked by the company unless an official source explicitly publishes it.',
    'Do not reproduce distinctive wording from candidate reports, interview sites, books, or other sources. Convert evidence into new equivalent practice scenarios.',
    'Never use leaked, confidential, NDA-protected, private, or illicitly obtained interview material.',
    'Use official company sources as the strongest evidence for role/process/skills. Use public candidate reports only as secondary evidence about recurring themes.',
    'Every question must use exactly one competency from the allowed list.',
    'Balance foundation/core/advanced difficulty according to the role level; avoid trivial repetition.',
    'For software roles, include coding/DSA/system/design/debugging only when relevant to evidence/competencies. For non-software roles, generate role-appropriate knowledge, judgment, scenario, analytical, and communication questions instead.',
    'Behavioral questions should be scenario/judgment MCQs with a clearly best response, not personal-history questions that have no objective answer.',
    'sourceIds must reference only supplied evidence IDs. If a question is grounded primarily in the target role/competency model rather than a specific source, sourceIds may be empty.',
    'evidenceRationale should briefly explain why this question is relevant without asserting certainty about private interview content.',
    `Session seed: ${request.sessionSeed}. Use it to vary scenarios and values.`,
    exclude.length ? `Avoid recreating prior question fingerprints/themes represented by these opaque IDs: ${exclude.join(', ')}.` : 'This is the first generated set for this local target history.',
  ].join('\n')
}

function extractOutputText(payload) {
  const parts = []
  for (const item of payload?.output || []) {
    for (const content of item?.content || []) {
      if (content?.type === 'output_text' && typeof content.text === 'string') parts.push(content.text)
    }
  }
  return parts.join('\n').trim()
}

async function callGenerator(request, evidence, env) {
  if (!env.OPENAI_API_KEY) throw new Error('Company-specific question generation is not configured')
  const model = safeText(env.OPENAI_MODEL || DEFAULT_MODEL, 80) || DEFAULT_MODEL
  const response = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      store: false,
      max_output_tokens: 18000,
      input: [
        {
          role: 'system',
          content: [{ type: 'input_text', text: generationInstructions(request, evidence) }],
        },
        {
          role: 'user',
          content: [{ type: 'input_text', text: JSON.stringify({ evidence: evidenceForPrompt(evidence) }) }],
        },
      ],
      text: {
        format: {
          type: 'json_schema',
          name: 'sharecapsule_company_assessment',
          strict: true,
          schema: questionSchema(request.count),
        },
      },
    }),
  })
  const payload = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(payload?.error?.message || `Question generator failed (${response.status})`)
  const outputText = extractOutputText(payload)
  if (!outputText) throw new Error('Question generator returned no structured output')
  let parsed
  try { parsed = JSON.parse(outputText) } catch { throw new Error('Question generator returned invalid JSON') }
  return { model, parsed }
}

async function finalizeQuestions(rawQuestions, request, evidence) {
  const allowedCompetencies = new Set(request.competencies.map((item) => item.name))
  const allowedSources = new Set(evidence.sources.map((source) => source.id))
  const excluded = new Set(request.excludeFingerprints)
  const seen = new Set()
  const questions = []
  for (const item of rawQuestions || []) {
    const competency = safeText(item.competency, 100)
    const prompt = safeText(item.prompt, 1600)
    const options = Array.isArray(item.options) ? item.options.map((option) => safeText(option, 600)) : []
    const answer = Number(item.answer)
    if (!allowedCompetencies.has(competency) || !prompt || options.length !== 4 || !Number.isInteger(answer) || answer < 0 || answer > 3) continue
    const fingerprint = await sha256(normalize(`${competency}|${prompt}`))
    if (excluded.has(fingerprint) || seen.has(fingerprint)) continue
    seen.add(fingerprint)
    questions.push({
      id: `live-${fingerprint.slice(0, 20)}`,
      fingerprint,
      track: request.profile.track,
      competency,
      difficulty: ['foundation', 'core', 'advanced'].includes(item.difficulty) ? item.difficulty : 'core',
      prompt,
      options,
      answer,
      explanation: safeText(item.explanation, 1200),
      keywords: [normalize(request.profile.company), normalize(request.profile.role), competency.toLowerCase()].filter(Boolean),
      prerequisites: [],
      sourceIds: [...new Set((item.sourceIds || []).filter((id) => allowedSources.has(id)))].slice(0, 3),
      evidenceRationale: safeText(item.evidenceRationale, 500),
      generation: 'live-company-role',
    })
  }
  return questions
}

export async function generateAssessmentQuestions(body, env, { forceResearch = false } = {}) {
  const request = sanitizeAssessmentRequest(body)
  if (!configuredProviders(env).length) throw new Error('Live search provider is not configured')
  const evidence = await gatherAssessmentEvidence(request, env, { force: forceResearch })
  const generated = await callGenerator(request, evidence, env)
  const questions = await finalizeQuestions(generated.parsed.questions, request, evidence)
  if (questions.length < Math.min(10, request.count)) throw new Error('Too few valid company-specific questions were generated')
  return {
    version: 1,
    target: { label: profileTarget(request.profile), track: request.profile.track },
    generatedAt: new Date().toISOString(),
    generator: { configured: true, model: generated.model, store: false },
    research: {
      researchedAt: evidence.baseline.researchedAt,
      provider: evidence.baseline.provider,
      queries: [...new Set([...(evidence.baseline.queries || []), ...evidence.queries])],
      queryCacheDays: 30,
      assessmentQueryCacheHits: evidence.queryCacheHits,
      sources: evidence.sources,
    },
    questions,
    requestedCount: request.count,
    generatedCount: questions.length,
    policy: {
      originalPracticeQuestions: true,
      verbatimCandidateQuestions: false,
      confidentialOrLeakedMaterial: false,
    },
  }
}
