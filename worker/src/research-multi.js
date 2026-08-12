import { buildQueries, rankSources, sanitizeResearchRequest, validateResearchRequest } from './research.js'
import { configuredProviders, searchWithFallback } from './providers/index.js'

export { sanitizeResearchRequest, validateResearchRequest }

const QUERY_CACHE_SECONDS = 30 * 24 * 60 * 60

async function hashText(value) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value))
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

async function searchCached(query, env, { count = 8, force = false } = {}) {
  const providers = configuredProviders(env)
  const cacheKey = await hashText(JSON.stringify({ version: 1, query, count, providers }))
  const cacheRequest = new Request(`https://search-cache.internal/v1/${cacheKey}`, { method: 'GET' })
  const cache = caches.default

  if (!force) {
    const hit = await cache.match(cacheRequest)
    if (hit) {
      const cached = await hit.json()
      return { ...cached, cacheHit: true }
    }
  }

  const batch = await searchWithFallback(query, env, { count })
  const cacheable = new Response(JSON.stringify(batch), {
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': `public, max-age=${QUERY_CACHE_SECONDS}`,
    },
  })
  await cache.put(cacheRequest, cacheable)
  return { ...batch, cacheHit: false }
}

export async function researchTarget(body, env, { force = false } = {}) {
  validateResearchRequest(body)
  const request = sanitizeResearchRequest(body)
  const queries = buildQueries(request)
  const batches = await Promise.all(queries.map(async (query) => {
    const batch = await searchCached(query, env, { count: 8, force })
    return {
      query,
      provider: batch.provider,
      cacheHit: batch.cacheHit,
      results: batch.results.map((result) => ({ ...result, query, provider: batch.provider, queryCacheHit: batch.cacheHit })),
    }
  }))

  const rawSources = batches.flatMap((batch) => batch.results)
  const providerByUrl = new Map(rawSources.map((source) => [source.url, source.provider]))
  const queryCacheByUrl = new Map(rawSources.map((source) => [source.url, source.queryCacheHit]))
  const sources = rankSources(rawSources, request).map((source) => ({
    ...source,
    provenance: {
      ...source.provenance,
      provider: providerByUrl.get(source.url) || source.provenance?.provider || 'Web search',
      queryCacheHit: Boolean(queryCacheByUrl.get(source.url)),
    },
  }))

  const evidence = {}
  for (const competency of request.competencies) {
    const matches = sources.filter((source) => source.competencies.includes(competency.name)).slice(0, 5)
    evidence[competency.name] = {
      sourceIds: matches.map((source) => source.id),
      confidence: matches.length >= 3 ? 'strong public evidence' : matches.length >= 1 ? 'some public evidence' : 'no direct live evidence found',
    }
  }

  const usedProviders = [...new Set(sources.map((source) => source.provenance?.provider).filter(Boolean))]
  const queryCacheHits = batches.filter((batch) => batch.cacheHit).length
  return {
    version: 3,
    target: {
      label: request.profile.track === 'interview'
        ? [request.profile.company, request.profile.role, request.profile.level].filter(Boolean).join(' · ')
        : [request.profile.grade, request.profile.subject, request.profile.examName].filter(Boolean).join(' · '),
      track: request.profile.track,
    },
    provider: {
      name: usedProviders.join(' + ') || configuredProviders(env).join(' → ') || 'No provider',
      configured: configuredProviders(env),
      order: ['Serper', 'Brave Search', 'Tavily'],
    },
    researchedAt: new Date().toISOString(),
    queries,
    queryCache: {
      ttlDays: 30,
      hits: queryCacheHits,
      misses: batches.length - queryCacheHits,
    },
    sources,
    evidenceByCompetency: evidence,
    warnings: sources.length ? [] : ['No usable public sources were returned. Use the reviewed local catalog and retry later.'],
  }
}
