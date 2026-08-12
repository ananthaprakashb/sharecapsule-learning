const API_URL = 'https://api.search.brave.com/res/v1/web/search'

const clean = (value = '') => String(value).replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()

export async function braveSearch(query, env, { count = 8 } = {}) {
  if (!env.BRAVE_SEARCH_API_KEY) throw new Error('BRAVE_SEARCH_API_KEY is not configured')
  const url = new URL(API_URL)
  url.searchParams.set('q', query)
  url.searchParams.set('count', String(Math.min(Math.max(count, 1), 20)))
  url.searchParams.set('country', 'us')
  url.searchParams.set('search_lang', 'en')
  url.searchParams.set('safesearch', 'moderate')

  const response = await fetch(url, {
    headers: {
      Accept: 'application/json',
      'X-Subscription-Token': env.BRAVE_SEARCH_API_KEY,
    },
  })
  if (!response.ok) {
    const text = await response.text().catch(() => '')
    throw new Error(`Brave Search failed (${response.status}): ${text.slice(0, 180)}`)
  }

  const data = await response.json()
  return (data.web?.results || []).map((item, index) => ({
    title: clean(item.title),
    url: item.url,
    snippet: clean(item.description || item.snippet || ''),
    age: clean(item.age || item.page_age || ''),
    providerRank: index + 1,
  }))
}
