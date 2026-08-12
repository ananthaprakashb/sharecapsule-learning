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

Research packages are cached with the Workers Cache API using a SHA-256 hash of the sanitized target/competency request. The cache stores research results, not raw diagnostic answers.

The GitHub Pages frontend treats this Worker as progressive enhancement. If the API is unavailable or no provider is configured, Prepare continues with the reviewed static resource catalog.

## Source provenance

The research pipeline scores source authority separately from target relevance. Results keep their actual search provider, query, provider rank, research time, publisher hostname, authority label, target-evidence flag, and competency matches. Exact company/exam evidence is only labeled target-specific when the source classification supports it.
