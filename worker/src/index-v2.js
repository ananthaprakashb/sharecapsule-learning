import baseWorker from './index.js'
import { getAssessmentQuestions, questionBankConfig } from './question-bank.js'

const jsonHeaders = { 'Content-Type':'application/json; charset=utf-8', 'X-Content-Type-Options':'nosniff' }

function allowedOrigins(env) {
  return new Set(String(env.ALLOWED_ORIGINS || 'https://learning.sharecapsule.app,https://prepare.sharecapsule.app,http://localhost:8000,http://localhost:8080')
    .split(',').map((value) => value.trim()).filter(Boolean))
}

function corsHeaders(request, env) {
  const origin = request.headers.get('Origin') || ''
  if (!origin || !allowedOrigins(env).has(origin)) return {}
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
  }
}

function responseJson(value, status, request, env, extra = {}) {
  return new Response(JSON.stringify(value), { status, headers: { ...jsonHeaders, ...corsHeaders(request, env), ...extra } })
}

async function readJson(request, maxBytes = 64 * 1024) {
  const contentLength = Number(request.headers.get('Content-Length') || 0)
  if (contentLength > maxBytes) throw new Error('Request body is too large')
  const text = await request.text()
  if (new TextEncoder().encode(text).length > maxBytes) throw new Error('Request body is too large')
  return JSON.parse(text || '{}')
}

function rejectRequest(request, env) {
  const origin = request.headers.get('Origin') || ''
  if (origin && !allowedOrigins(env).has(origin)) return responseJson({ error:'Origin not allowed' }, 403, request, env)
  if (!String(request.headers.get('Content-Type') || '').toLowerCase().includes('application/json')) {
    return responseJson({ error:'Content-Type must be application/json' }, 415, request, env)
  }
  return null
}

async function augmentedHealth(request, env, ctx) {
  const response = await baseWorker.fetch(request, env, ctx)
  if (!response.ok) return response
  const body = await response.json().catch(() => ({}))
  return responseJson({
    ...body,
    companyRoleQuestionGeneration: {
      configured: Boolean(env.OPENAI_API_KEY),
      model: env.OPENAI_MODEL || 'gpt-5-mini',
      maxQuestionsPerSession: 50,
      evidenceCacheDays: 30,
      originalPracticeQuestionsOnly: true,
      questionBankConfigured: Boolean(env.QUESTION_BANK),
      questionBankTtlDays: Number(env.QUESTION_BANK_TTL_DAYS || questionBankConfig.defaultTtlDays),
      maxSavedQuestionsPerTarget: questionBankConfig.maxQuestionsPerTarget,
    },
  }, 200, request, env, { 'Cache-Control':'no-store' })
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url)

    if (request.method === 'OPTIONS') return baseWorker.fetch(request, env, ctx)
    if (request.method === 'GET' && url.pathname === '/health') return augmentedHealth(request, env, ctx)

    if (request.method === 'POST' && url.pathname === '/v1/assessment/questions') {
      const rejected = rejectRequest(request, env)
      if (rejected) return rejected
      try {
        const body = await readJson(request)
        const result = await getAssessmentQuestions(body, env, { forceResearch:url.searchParams.get('refresh') === '1' })
        return responseJson(result, 200, request, env, { 'Cache-Control':'no-store' })
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Question generation failed'
        const invalid = /required|must be|between|Too many|too large|Request body|supports interview/.test(message)
        const notConfigured = /question generation is not configured/i.test(message)
        return responseJson({
          error:message,
          code:invalid ? 'INVALID_ASSESSMENT_REQUEST' : notConfigured ? 'QUESTION_GENERATOR_NOT_CONFIGURED' : 'QUESTION_GENERATION_FAILED',
        }, invalid ? 400 : notConfigured ? 503 : 502, request, env, { 'Cache-Control':'no-store' })
      }
    }

    return baseWorker.fetch(request, env, ctx)
  },
}
