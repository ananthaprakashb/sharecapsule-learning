# Prepare Live Research Worker

Backend research service for `prepare.sharecapsule.app`.

## API

- `GET /health`
- `POST /v1/research`

The research request contains target fields plus competency and gap summaries. Individual diagnostic answers are not sent to the research service.

## Search providers

Prepare supports three live-search providers behind one interface, in this order:

1. Serper — primary
2. Brave Search — first fallback
3. Tavily — second fallback

Fallback occurs per query when a configured provider returns an error. The provider that actually produced each source is retained in source provenance.

Store provider keys only as Cloudflare Worker secrets:

```bash
cd worker
npm install
npx wrangler login
npx wrangler secret put SERPER_API_KEY
npx wrangler secret put BRAVE_SEARCH_API_KEY
npx wrangler secret put TAVILY_API_KEY
npm test
npm run deploy
```

You may configure only one or two providers, but configuring all three gives the intended fallback chain. No provider key belongs in browser JavaScript, GitHub, or `wrangler.jsonc`.

The production Worker is configured for the custom domain `api.prepare.sharecapsule.app`.

For local development, copy `.dev.vars.example` to `.dev.vars` and insert development API keys. Never commit `.dev.vars`.

## Provider behavior

Serper is used first to keep routine query cost low. Brave Search is attempted when Serper fails, and Tavily is attempted when both earlier configured providers fail. Tavily is explicitly called with `search_depth: basic` so the fallback does not automatically consume higher-cost advanced-search credits.

`GET /health` reports which providers are configured without exposing any key values.

## Caching

Prepare uses two 30-day cache layers with the Workers Cache API:

1. **Per-query cache** — an identical public web search query is reused for 30 days instead of calling Serper/Brave/Tavily again. The cache identity also includes the configured provider set and requested result count.
2. **Research-package cache** — equivalent target + ordered competency names + ordered gap names reuse the assembled research package for 30 days.

Numeric learner scores and gap-priority values are deliberately excluded from the reusable research-package cache identity. This lets learners with the same research need share public-source research while keeping their measured scores personal to their browser/session.

The cache stores public search results and source metadata, not raw diagnostic answers. `POST /v1/research?refresh=1` bypasses both cache layers and performs fresh provider searches.

`GET /health` reports `researchCacheDays` and `queryCacheDays`, currently both `30`.

Note: the Workers Cache API is an edge cache rather than durable database storage. Entries are configured with a 30-day TTL but may be evicted earlier by Cloudflare. If Prepare later needs guaranteed 30-day persistence across regions, move the reusable public research cache to Workers KV or D1 without changing the browser API contract.

The GitHub Pages frontend treats this Worker as progressive enhancement. If the API is unavailable or no provider is configured, Prepare continues with the reviewed static resource catalog.

## Source provenance

The research pipeline scores source authority separately from target relevance. Results keep their actual search provider, query, provider rank, research time, publisher hostname, authority label, target-evidence flag, competency matches, and whether the underlying query came from the 30-day query cache. Exact company/exam evidence is only labeled target-specific when the source classification supports it.
