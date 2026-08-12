import { serperSearch } from './serper.js'
import { braveSearch } from './brave.js'
import { tavilySearch } from './tavily.js'

const PROVIDERS = [
  { name: 'Serper', key: 'SERPER_API_KEY', search: serperSearch },
  { name: 'Brave Search', key: 'BRAVE_SEARCH_API_KEY', search: braveSearch },
  { name: 'Tavily', key: 'TAVILY_API_KEY', search: tavilySearch },
]

export function configuredProviders(env) {
  return PROVIDERS.filter((provider) => Boolean(env[provider.key])).map((provider) => provider.name)
}

export async function searchWithFallback(query, env, options = {}) {
  const configured = PROVIDERS.filter((provider) => Boolean(env[provider.key]))
  if (!configured.length) throw new Error('No live search provider is configured')

  const failures = []
  for (const provider of configured) {
    try {
      const results = await provider.search(query, env, options)
      return {
        provider: provider.name,
        results: results.map((item) => ({ ...item, provider: provider.name })),
      }
    } catch (error) {
      failures.push(`${provider.name}: ${error instanceof Error ? error.message : 'failed'}`)
    }
  }
  throw new Error(`All configured search providers failed. ${failures.join(' | ')}`)
}
