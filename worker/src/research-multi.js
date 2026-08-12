import { buildQueries, rankSources, sanitizeResearchRequest, validateResearchRequest } from './research.js'
import { configuredProviders, searchWithFallback } from './providers/index.js'

export { sanitizeResearchRequest, validateResearchRequest }

export async function researchTarget(body, env) {
  validateResearchRequest(body)
  const request = sanitizeResearchRequest(body)
  const queries = buildQueries(request)
  const batches = await Promise.all(queries.map(async (query) => {
    const batch = await searchWithFallback(query, env, { count: 8 })
    return batch.results.map((result) => ({ ...result, query, provider: batch.provider }))
  }))

  const rawSources = batches.flat()
  const providerByUrl = new Map(rawSources.map((source) => [source.url, source.provider]))
  const sources = rankSources(rawSources, request).map((source) => ({
    ...source,
    provenance: {
      ...source.provenance,
      provider: providerByUrl.get(source.url) || source.provenance?.provider || 'Web search',
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
  return {
    version: 2,
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
    sources,
    evidenceByCompetency: evidence,
    warnings: sources.length ? [] : ['No usable public sources were returned. Use the reviewed local catalog and retry later.'],
  }
}
