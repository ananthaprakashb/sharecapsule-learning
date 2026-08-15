import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { spawnSync } from 'node:child_process'
import { sanitizeAssessmentRequest, validateAssessmentRequest } from '../src/assessment-generator.js'
import worker from '../src/index-v2.js'

const interviewRequest = {
  profile: {
    track: 'interview',
    company: 'Amazon',
    role: 'Software Development Engineer II',
    level: 'SDE II',
    skills: 'Java, distributed systems',
  },
  competencies: [
    { name: 'Algorithms', weight: 1.2, rationale: 'Coding depth' },
    { name: 'System design', weight: 1.1, rationale: 'Architecture depth' },
  ],
  gaps: [],
  count: 50,
  sessionSeed: 'test-seed',
  excludeFingerprints: ['abc123'],
}

const env = {
  ALLOWED_ORIGINS:'https://learning.sharecapsule.app',
}
const ctx = { waitUntil(){} }

test('company-specific assessment requires company and role for interview track', () => {
  assert.equal(validateAssessmentRequest(interviewRequest), true)
  assert.throws(() => validateAssessmentRequest({ ...interviewRequest, profile:{ track:'interview', company:'Amazon' } }), /role are required/)
})

test('assessment count is capped at 50 and fingerprints stay opaque', () => {
  assert.throws(() => validateAssessmentRequest({ ...interviewRequest, count:51 }), /between 5 and 50/)
  const sanitized = sanitizeAssessmentRequest(interviewRequest)
  assert.equal(sanitized.count, 50)
  assert.deepEqual(sanitized.excludeFingerprints, ['abc123'])
  assert.equal(sanitized.profile.company, 'Amazon')
  assert.equal(sanitized.profile.role, 'Software Development Engineer II')
})

test('campus generation supports a selected employer cohort and role', () => {
  const sanitized = sanitizeAssessmentRequest({
    profile:{ track:'campus', degree:'B.Tech', branch:'Information Technology', companies:'TCS, Infosys', role:'Graduate Engineer Trainee' },
    competencies:[{ name:'Programming fundamentals', weight:1, rationale:'Graduate role baseline' }],
    gaps:[],
    count:20,
  })
  assert.equal(sanitized.profile.track, 'campus')
  assert.match(sanitized.profile.companies, /TCS/)
  assert.match(sanitized.profile.companies, /Infosys/)
})

test('generator source enforces public-evidence and privacy policy', async () => {
  const source = await readFile(new URL('../src/assessment-generator.js', import.meta.url), 'utf8')
  assert.match(source, /store:\s*false/)
  assert.match(source, /interview experience questions candidate/)
  assert.match(source, /Do not reproduce distinctive wording/)
  assert.match(source, /Never use leaked, confidential, NDA-protected/)
  assert.match(source, /Public interview report \/ web source/)
  assert.match(source, /json_schema/)
})

test('frontend uses live company pool rather than relabeling static questions', async () => {
  const ui = await readFile(new URL('../../company-assessment-ui.js', import.meta.url), 'utf8')
  const engine = await readFile(new URL('../../engine-v4.js', import.meta.url), 'utf8')
  const index = await readFile(new URL('../../index.html', import.meta.url), 'utf8')
  assert.match(ui, /\/v1\/assessment\/questions/)
  assert.match(ui, /excludeFingerprints/)
  assert.match(ui, /count:50/)
  assert.match(engine, /generation==='live-company-role'/)
  assert.match(engine, /prepare-company-question-pool-v1/)
  assert.match(engine, /live\.questions\.slice\(0,50\)/)
  assert.match(index, /engine-v4\.js/)
  assert.match(index, /company-assessment-ui\.js/)
})

test('Worker refuses to pretend company-specific generation works without its server secret', async () => {
  const response = await worker.fetch(new Request('https://api.prepare.sharecapsule.app/v1/assessment/questions', {
    method:'POST',
    headers:{ Origin:'https://learning.sharecapsule.app', 'Content-Type':'application/json' },
    body:JSON.stringify(interviewRequest),
  }), env, ctx)
  const body = await response.json()
  assert.equal(response.status, 503)
  assert.equal(body.code, 'QUESTION_GENERATOR_NOT_CONFIGURED')
})

test('health advertises company-role generator configuration safely', async () => {
  const response = await worker.fetch(new Request('https://api.prepare.sharecapsule.app/health', {
    headers:{ Origin:'https://learning.sharecapsule.app' },
  }), env, ctx)
  const body = await response.json()
  assert.equal(response.status, 200)
  assert.equal(body.companyRoleQuestionGeneration.configured, false)
  assert.equal(body.companyRoleQuestionGeneration.maxQuestionsPerSession, 50)
})

test('new browser and Worker modules parse cleanly', () => {
  for (const file of ['../src/assessment-generator.js','../src/index-v2.js','../../company-assessment-ui.js','../../engine-v4.js']) {
    const result = spawnSync(process.execPath, ['--check', new URL(file, import.meta.url).pathname], { encoding:'utf8' })
    assert.equal(result.status, 0, `${file}: ${result.stderr}`)
  }
})
