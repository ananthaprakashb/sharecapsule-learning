const API_URL = 'https://api.tavily.com/search'

const clean = (value = '') => String(value).replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()

export async function tavilySearch(query, env, { count = 8 } = {}) {
  if (!env.TAVILY_API_KEY) throw new Error('TAVILY_API_KEY is not configured')
  const response = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${env.TAVILY_API_KEY}`,
    },
    body: JSON.stringify({
      query,
      topic: 'general',
      search_depth: 'basic',
      max_results: Math.min(Math.max(count, 1), 20),
      include_answer: false,
      include_raw_content: false,
      include_images: false,
    }),
  })
  if (!response.ok) {
    const text = await response.text().catch(() => '')
    throw new Error(`Tavily failed (${response.status}): ${text.slice(0, 180)}`)
  }

  const data = await response.json()
  return (data.results || []).map((item, index) => ({
    title: clean(item.title),
    url: item.url,
    snippet: clean(item.content || ''),
    age: clean(item.published_date || ''),
    providerRank: index + 1,
  }))
}
