import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { getAssessmentQuestions, questionBankKey } from '../src/question-bank.js'
import worker from '../src/index-v2.js'

const request = {
  profile: {
    track: 'interview',
    company: 'Apple',
    role: 'Software Engineer Technical Architect',
    level: 'Senior',
    skills: 'distributed systems, Java, system design',
  },
  competencies: [
    { name: 'System design', weight: 1.3, rationale: 'Architecture depth' },
    { name: 'Algorithms', weight: 1.0, rationale: 'Software engineering baseline' },
    { name: 'Behavioral communication', weight: 0.9, rationale: 'Technical leadership' },
  ],
  gaps: [],
  count: 50,
  sessionSeed: 'bank-test-session',
  excludeFingerprints: [],
}

class MemoryKV {
  constructor(){ this.values = new Map(); this.puts = [] }
  async get(key, options = {}) {
    const value = this.values.get(key)
    if (value == null) return null
    return options?.type === 'json' ? JSON.parse(value) : value
  }
  async put(key, value, options = {}) {
    this.values.set(key, value)
    this.puts.push({ key, options })
  }
}

function savedQuestions(count = 60) {
  return Array.from({ length: count }, (_, index) => ({
    id: `saved-${index + 1}`,
    fingerprint: `fp-${String(index + 1).padStart(3, '0')}`,
    track: 'interview',
    competency: index % 3 === 0 ? 'System design' : index % 3 === 1 ? 'Algorithms' : 'Behavioral communication',
    difficulty: index % 4 === 0 ? 'advanced' : 'core',
    prompt: `Saved Apple architect practice question ${index + 1}?`,
    options: ['A', 'B', 'C', 'D'],
    answer: index % 4,
    explanation: 'Saved explanation',
    keywords: ['apple', 'technical architect'],
    prerequisites: [],
    sourceIds: [],
    evidenceRationale: 'Saved public-evidence-grounded practice question.',
    generation: 'live-company-role',
  }))
}

async function seedBank(kv, body = request) {
  const key = await questionBankKey(body)
  kv.values.set(key, JSON.stringify({
    version: 1,
    target: { label:'Apple · Software Engineer Technical Architect · Senior', track:'interview' },
    generator: { configured:true, model:'gpt-5-mini', store:false },
    research: { researchedAt:'2026-08-15T00:00:00.000Z', sources:[] },
    policy: { originalPracticeQuestions:true, verbatimCandidateQuestions:false, confidentialOrLeakedMaterial:false },
    generatedAt: '2026-08-15T00:00:00.000Z',
    updatedAt: '2026-08-15T00:00:00.000Z',
    questions: savedQuestions(),
  }))
  return key
}

test('same target need reuses the same normalized question-bank key', async () => {
  const first = await questionBankKey(request)
  const reordered = await questionBankKey({
    ...request,
    profile:{ ...request.profile, skills:'system design; Java; distributed systems' },
    competencies:[...request.competencies].reverse(),
  })
  assert.equal(first, reordered)
})

test('full saved bank serves 50 questions without an OpenAI key', async () => {
  const kv = new MemoryKV()
  await seedBank(kv)
  const result = await getAssessmentQuestions(request, {
    QUESTION_BANK:kv,
    QUESTION_BANK_TTL_DAYS:'180',
    OPENAI_MODEL:'gpt-5-mini',
  })
  assert.equal(result.questions.length, 50)
  assert.equal(result.bank.fullHit, true)
  assert.equal(result.bank.generatedNow, 0)
  assert.equal(result.bank.servedFromBank, 50)
  assert.equal(result.generator.usedThisRequest, false)
})

test('local exclusion fingerprints select different saved questions before generating more', async () => {
  const kv = new MemoryKV()
  await seedBank(kv)
  const excluded = savedQuestions(10).map((question) => question.fingerprint)
  const result = await getAssessmentQuestions({ ...request, excludeFingerprints:excluded }, {
    QUESTION_BANK:kv,
    OPENAI_MODEL:'gpt-5-mini',
  })
  assert.equal(result.questions.length, 50)
  assert.equal(result.bank.generatedNow, 0)
  assert.ok(result.questions.every((question) => !excluded.includes(question.fingerprint)))
})

test('Worker route can serve a saved bank even when generation is not configured', async () => {
  const kv = new MemoryKV()
  await seedBank(kv)
  const env = {
    ALLOWED_ORIGINS:'https://learning.sharecapsule.app',
    QUESTION_BANK:kv,
    QUESTION_BANK_TTL_DAYS:'180',
    OPENAI_MODEL:'gpt-5-mini',
  }
  const response = await worker.fetch(new Request('https://api.prepare.sharecapsule.app/v1/assessment/questions', {
    method:'POST',
    headers:{ Origin:'https://learning.sharecapsule.app', 'Content-Type':'application/json' },
    body:JSON.stringify(request),
  }), env, { waitUntil(){} })
  const body = await response.json()
  assert.equal(response.status, 200)
  assert.equal(body.questions.length, 50)
  assert.equal(body.bank.generatedNow, 0)
})

test('Worker configuration declares persistent QUESTION_BANK storage', async () => {
  const config = JSON.parse(await readFile(new URL('../wrangler.jsonc', import.meta.url), 'utf8'))
  assert.equal(config.kv_namespaces?.[0]?.binding, 'QUESTION_BANK')
  assert.equal(config.vars?.QUESTION_BANK_TTL_DAYS, '180')
})
