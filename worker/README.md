# Prepare Live Research Worker

Backend research and report-integrity service for `prepare.sharecapsule.app`.

## API

- `GET /health`
- `POST /v1/research`
- `POST /v1/report/sign`
- `POST /v1/report/verify`

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
npx wrangler secret put REPORT_SIGNING_SECRET
npm test
npm run deploy
```

Generate a strong random value for `REPORT_SIGNING_SECRET`; do not commit it or paste it into browser code. A Node example is:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

The production Worker is configured for the custom domain `api.prepare.sharecapsule.app`.

## Signed local progress reports

Prepare keeps full progress snapshots in the learner's browser/device. A completed assessment creates a report envelope with a canonical JSON payload and SHA-256 payload hash. Only the hash plus minimal envelope metadata are sent to `/v1/report/sign`; the full report is not sent during signing.

The Worker signs the envelope metadata using HMAC-SHA256 with `REPORT_SIGNING_SECRET`. A modified local file changes its payload hash and fails `/v1/report/verify`.

Report format:

- `*.prepare.json` — one signed assessment snapshot
- `*.prepare.zip` — multiple signed reports for the same target plus a signed `manifest.prepare.json`

ZIP contents must be treated as untrusted input. Future upload processing should only accept manifest-listed report files, enforce size/count limits, parse JSON without executing content, recompute each payload hash, and call the same verification logic before storing progress.

This design is **tamper-evident**, not physically uneditable. Anything saved on a user's device can be altered, but altered content is rejected cryptographically when shared back.

`GET /health` reports `reportSigningConfigured` and `reportSchemaVersion` without exposing the signing secret.

## Provider behavior

Serper is used first to keep routine query cost low. Brave Search is attempted when Serper fails, and Tavily is attempted when both earlier configured providers fail. Tavily uses `search_depth: basic`.

## Caching

Prepare uses two 30-day cache layers with the Workers Cache API:

1. **Per-query cache** — an identical public web search query is reused for 30 days instead of calling Serper/Brave/Tavily again.
2. **Research-package cache** — equivalent target + ordered competency names + ordered gap names reuse the assembled research package for 30 days.

Numeric learner scores and gap-priority values are excluded from the reusable research-package cache identity. The cache stores public search results and source metadata, not raw diagnostic answers. `POST /v1/research?refresh=1` bypasses both cache layers.

The Workers Cache API is an edge cache rather than durable database storage, so entries may be evicted before the configured TTL. Workers KV or D1 can replace this layer later without changing the browser API contract.

## Source provenance

The research pipeline scores source authority separately from target relevance. Results keep their actual search provider, query, provider rank, research time, publisher hostname, authority label, target-evidence flag, competency matches, and whether the underlying query came from the 30-day query cache.
