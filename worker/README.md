# Prepare Live Research Worker

Backend research, company-role assessment generation, and report-integrity service for `learning.sharecapsule.app`.

## API

- `GET /health`
- `POST /v1/research`
- `POST /v1/assessment/questions`
- `POST /v1/report/sign`
- `POST /v1/report/verify`

The research request contains target fields plus competency and gap summaries. Individual diagnostic answers are not sent to the research or question-generation service.

## Search providers

Prepare supports three live-search providers behind one interface, in this order:

1. Serper — primary
2. Brave Search — first fallback
3. Tavily — second fallback

Fallback occurs per query when a configured provider returns an error. The provider that actually produced each source is retained in source provenance.

Store provider/model keys only as Cloudflare Worker secrets:

```bash
cd worker
npm install
npx wrangler login
npx wrangler secret put SERPER_API_KEY
npx wrangler secret put BRAVE_SEARCH_API_KEY
npx wrangler secret put TAVILY_API_KEY
npx wrangler secret put REPORT_SIGNING_SECRET
npx wrangler secret put OPENAI_API_KEY
npm test
npm run deploy
```

`OPENAI_MODEL` defaults to `gpt-5-mini` through `wrangler.jsonc` and can be changed without putting the API key in source control.

Generate a strong random value for `REPORT_SIGNING_SECRET`; do not commit it or paste it into browser code. A Node example is:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

The production Worker is configured for the custom domain `api.prepare.sharecapsule.app`.

## Company + role question generation

`POST /v1/assessment/questions` is used for Interview and Campus Placement targets.

Flow:

1. search current official company/career material and public interview-process/candidate-report sources,
2. reuse public search evidence through the 30-day query cache,
3. send only the target, competency model, and public-source evidence to the question generator,
4. generate original four-option practice questions for the specified company/role,
5. return evidence source IDs and a short relevance rationale with each question,
6. use local question fingerprints to avoid serving the same generated question again while fresh inventory can be created.

The service does **not** copy distinctive wording from candidate reports and does not use leaked, confidential, NDA-protected, private, or illicitly obtained interview material. Public reports are treated as secondary evidence about recurring themes; official company sources are stronger evidence for role requirements and published interview process.

The model request uses `store: false`. The learner's actual diagnostic answers are never included in the generation request.

If `OPENAI_API_KEY` is not configured, the endpoint returns `QUESTION_GENERATOR_NOT_CONFIGURED`; the frontend displays the configuration failure instead of silently pretending the generic static bank is company-specific.

## Signed local progress reports

Prepare keeps full progress snapshots in the learner's browser/device. A completed assessment creates a report envelope with a canonical JSON payload and SHA-256 payload hash. Only the hash plus minimal envelope metadata are sent to `/v1/report/sign`; the full report is not sent during signing.

The Worker signs the envelope metadata using HMAC-SHA256 with `REPORT_SIGNING_SECRET`. A modified local file changes its payload hash and fails `/v1/report/verify`.

Report format:

- `*.prepare.json` — one signed assessment snapshot
- `*.prepare.zip` — multiple signed reports for the same target plus a signed `manifest.prepare.json`

ZIP contents must be treated as untrusted input. Future upload processing should only accept manifest-listed report files, enforce size/count limits, parse JSON without executing content, recompute each payload hash, and call the same verification logic before storing progress.

This design is **tamper-evident**, not physically uneditable. Anything saved on a user's device can be altered, but altered content is rejected cryptographically when shared back.

`GET /health` reports report signing plus company-role question-generation configuration without exposing secrets.

## Provider behavior

Serper is used first to keep routine query cost low. Brave Search is attempted when Serper fails, and Tavily is attempted when both earlier configured providers fail. Tavily uses `search_depth: basic`.

## Caching

Prepare uses 30-day public-evidence cache layers with the Workers Cache API:

1. **Per-query research cache** — an identical public web search query is reused for 30 days instead of calling Serper/Brave/Tavily again.
2. **Research-package cache** — equivalent target + ordered competency names + ordered gap names reuse the assembled research package for 30 days.
3. **Assessment evidence-query cache** — company/role candidate-experience and interview-process searches are also reused for 30 days.

Numeric learner scores and gap-priority values are excluded from the reusable research-package cache identity. The cache stores public search results and source metadata, not raw diagnostic answers. `?refresh=1` bypasses the relevant public-evidence cache when a deliberate refresh is needed.

The Workers Cache API is an edge cache rather than durable database storage, so entries may be evicted before the configured TTL. Workers KV or D1 can replace this layer later without changing the browser API contract.

## Source provenance

The research pipeline scores source authority separately from target relevance. Results keep their actual search provider, query, provider rank, research time, publisher hostname, authority label, target-evidence flag, competency matches, and whether the underlying query came from the 30-day query cache.
