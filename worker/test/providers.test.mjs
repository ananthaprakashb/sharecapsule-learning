import test from 'node:test'
import assert from 'node:assert/strict'
import { configuredProviders, searchWithFallback } from '../src/providers/index.js'

const originalFetch = globalThis.fetch

test.afterEach(() => { globalThis.fetch = originalFetch })

test('reports configured providers in preferred order', () => {
  const names = configuredProviders({ TAVILY_API_KEY: 't', SERPER_API_KEY: 's', BRAVE_SEARCH_API_KEY: 'b' })
  assert.deepEqual(names, ['Serper', 'Brave Search', 'Tavily'])
})

test('uses Serper first when it succeeds', async () => {
  globalThis.fetch = async (url) => {
    assert.equal(String(url), 'https://google.serper.dev/search')
    return new Response(JSON.stringify({ organic: [{ title: 'Official page', link: 'https://example.com/official', snippet: 'example', position: 1 }] }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  }
  const result = await searchWithFallback('example query', { SERPER_API_KEY: 's', BRAVE_SEARCH_API_KEY: 'b', TAVILY_API_KEY: 't' })
  assert.equal(result.provider, 'Serper')
  assert.equal(result.results[0].provider, 'Serper')
})

test('falls back from Serper to Brave on provider error', async () => {
  const calls = []
  globalThis.fetch = async (url) => {
    calls.push(String(url))
    if (String(url).includes('google.serper.dev')) return new Response('rate limited', { status: 429 })
    if (String(url).includes('api.search.brave.com')) {
      return new Response(JSON.stringify({ web: { results: [{ title: 'Brave result', url: 'https://example.org/result', description: 'fallback' }] } }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    }
    throw new Error('Unexpected provider call')
  }
  const result = await searchWithFallback('example query', { SERPER_API_KEY: 's', BRAVE_SEARCH_API_KEY: 'b', TAVILY_API_KEY: 't' })
  assert.equal(result.provider, 'Brave Search')
  assert.equal(result.results[0].provider, 'Brave Search')
  assert.equal(calls.length, 2)
})

test('falls through to Tavily when Serper and Brave fail', async () => {
  const calls = []
  globalThis.fetch = async (url) => {
    calls.push(String(url))
    if (String(url).includes('google.serper.dev')) return new Response('unavailable', { status: 503 })
    if (String(url).includes('api.search.brave.com')) return new Response('rate limited', { status: 429 })
    if (String(url).includes('api.tavily.com/search')) {
      return new Response(JSON.stringify({ results: [{ title: 'Tavily result', url: 'https://example.edu/result', content: 'final fallback' }] }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    }
    throw new Error('Unexpected provider call')
  }
  const result = await searchWithFallback('example query', { SERPER_API_KEY: 's', BRAVE_SEARCH_API_KEY: 'b', TAVILY_API_KEY: 't' })
  assert.equal(result.provider, 'Tavily')
  assert.equal(result.results[0].provider, 'Tavily')
  assert.equal(calls.length, 3)
})
