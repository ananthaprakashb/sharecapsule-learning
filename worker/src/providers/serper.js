const API_URL = 'https://google.serper.dev/search'

const clean = (value = '') => String(value).replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()

export async function serperSearch(query, env, { count = 8 } = {}) {
  if (!env.SERPER_API_KEY) throw new Error('SERPER_API_KEY is not configured')
  const response = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-KEY': env.SERPER_API_KEY,
    },
    body: JSON.stringify({
      q: query,
      gl: 'us',
      hl: 'en',
      num: Math.min(Math.max(count, 1), 20),
    }),
  })
  if (!response.ok) {
    const text = await response.text().catch(() => '')
    throw new Error(`Serper failed (${response.status}): ${text.slice(0, 180)}`)
  }

  const data = await response.json()
  return (data.organic || []).map((item, index) => ({
    title: clean(item.title),
    url: item.link,
    snippet: clean(item.snippet || ''),
    age: clean(item.date || ''),
    providerRank: Number(item.position) || index + 1,
  }))
}
