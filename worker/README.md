# Prepare Live Research Worker

Backend research service for `prepare.sharecapsule.app`.

## API

- `GET /health`
- `POST /v1/research`

The research request contains target fields plus competency and gap summaries. Individual diagnostic answers are not sent to the research service.

## Search provider

The first provider is Brave Search API. Its API key is stored only as a Cloudflare Worker secret.

```bash
cd worker
npm install
npx wrangler login
npx wrangler secret put BRAVE_SEARCH_API_KEY
npm test
npm run deploy
```

The production Worker is configured for the custom domain `api.prepare.sharecapsule.app`.

For local development, copy `.dev.vars.example` to `.dev.vars` and insert a development API key. Never commit `.dev.vars`.

## Caching

Research packages are cached with the Workers Cache API using a SHA-256 hash of the sanitized target/competency request. The cache stores research results, not raw diagnostic answers.

The GitHub Pages frontend treats this Worker as progressive enhancement. If the API is unavailable or the provider is not configured, Prepare continues with the reviewed static resource catalog.

## Source provenance

The research pipeline scores source authority separately from target relevance. Results keep their search provider, query, provider rank, research time, publisher hostname, authority label, target-evidence flag, and competency matches. Exact company/exam evidence is only labeled target-specific when the source classification supports it.
