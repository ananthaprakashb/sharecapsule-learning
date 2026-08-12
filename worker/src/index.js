import { researchTarget, sanitizeResearchRequest, validateResearchRequest } from './research-multi.js'
import { configuredProviders } from './providers/index.js'

const jsonHeaders = { 'Content-Type': 'application/json; charset=utf-8', 'X-Content-Type-Options': 'nosniff' }
const maxBodyBytes = 32 * 1024

function allowedOrigins(env) {
  return new Set(String(env.ALLOWED_ORIGINS || 'https://prepare.sharecapsule.app,http://localhost:8000,http://localhost:8080')
    .split(',').map((x) => x.trim()).filter(Boolean))
}

function corsHeaders(request, env) {
  const origin = request.headers.get('Origin') || ''
  const allowed = allowedOrigins(env)
  if (!origin || !allowed.has(origin)) return {}
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

async function hashPayload(payload) {
  const stable = JSON.stringify(payload)
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(stable))
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

async function readJson(request) {
  const contentLength = Number(request.headers.get('Content-Length') || 0)
  if (contentLength > maxBodyBytes) throw new Error('Request body is too large')
  const text = await request.text()
  if (text.length > maxBodyBytes) throw new Error('Request body is too large')
  return JSON.parse(text || '{}')
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url)
    if (request.method === 'OPTIONS') {
      const origin = request.headers.get('Origin') || ''
      if (origin && !allowedOrigins(env).has(origin)) return responseJson({ error: 'Origin not allowed' }, 403, request, env)
      return new Response(null, { status: 204, headers: corsHeaders(request, env) })
    }

    if (request.method === 'GET' && url.pathname === '/health') {
      const providers = configuredProviders(env)
      return responseJson({
        ok: true,
        service: 'sharecapsule-prepare-research',
        providerConfigured: providers.length > 0,
        providers,
        providerOrder: ['Serper', 'Brave Search', 'Tavily'],
        time: new Date().toISOString(),
      }, 200, request, env, { 'Cache-Control': 'no-store' })
    }

    if (request.method !== 'POST' || url.pathname !== '/v1/research') {
      return responseJson({ error: 'Not found' }, 404, request, env)
    }

    const origin = request.headers.get('Origin') || ''
    if (origin && !allowedOrigins(env).has(origin)) return responseJson({ error: 'Origin not allowed' }, 403, request, env)
    if (!String(request.headers.get('Content-Type') || '').toLowerCase().includes('application/json')) return responseJson({ error: 'Content-Type must be application/json' }, 415, request, env)

    try {
      const body = await readJson(request)
      validateResearchRequest(body)
      const sanitized = sanitizeResearchRequest(body)
      const cacheHash = await hashPayload(sanitized)
      const cacheRequest = new Request(`https://research-cache.internal/v2/${cacheHash}`, { method: 'GET' })
      const cache = caches.default
      const force = url.searchParams.get('refresh') === '1'

      if (!force) {
        const hit = await cache.match(cacheRequest)
        if (hit) {
          const cached = await hit.json()
          return responseJson({ ...cached, cache: { hit: true, key: cacheHash.slice(0, 12) } }, 200, request, env, { 'Cache-Control': 'private, max-age=60' })
        }
      }

      if (!configuredProviders(env).length) return responseJson({ error: 'Live search provider is not configured', code: 'SEARCH_PROVIDER_NOT_CONFIGURED' }, 503, request, env)
      const result = await researchTarget(sanitized, env)
      const cacheable = new Response(JSON.stringify(result), { headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=21600' } })
      ctx.waitUntil(cache.put(cacheRequest, cacheable))
      return responseJson({ ...result, cache: { hit: false, key: cacheHash.slice(0, 12) } }, 200, request, env, { 'Cache-Control': 'private, max-age=60' })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Research failed'
      const status = /required|must be|Too many|too large|JSON/.test(message) ? 400 : 502
      return responseJson({ error: message, code: status === 400 ? 'INVALID_REQUEST' : 'RESEARCH_FAILED' }, status, request, env, { 'Cache-Control': 'no-store' })
    }
  },
}
