# Prepare Live Research Worker

Backend research, company-role assessment generation, persistent question-bank storage, and report-integrity service for `learning.sharecapsule.app`.

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

1. normalize the user's company/role/level/skills and target competency set,
2. check the persistent `QUESTION_BANK` KV namespace for that target need,
3. serve saved questions first, excluding fingerprints already used by that learner,
4. only if there are not enough fresh saved questions, search current official/public evidence and generate the missing amount,
5. append newly generated original questions to the persistent bank for future users and future attempts,
6. return bank metadata showing how many questions were reused versus generated in this request.

The server-side bank identity intentionally contains target needs, not learner answers: company/companies, role, level or campus context, normalized skills/languages, and the competency names. Diagnostic answers and report contents are not stored in this bank.

Each target bank can retain up to 400 deduplicated generated questions. `QUESTION_BANK_TTL_DAYS` defaults to 180 days. When a full fresh set is already stored, the endpoint can serve the assessment without calling OpenAI at all. If generation is temporarily unavailable but at least 10 fresh saved questions remain, Prepare can serve that saved inventory instead of failing the assessment entirely.

The service does **not** copy distinctive wording from candidate reports and does not use leaked, confidential, NDA-protected, private, or illicitly obtained interview material. Public reports are treated as secondary evidence about recurring themes; official company sources are stronger evidence for role requirements and published interview process.

The model request uses `store: false`. The learner's actual diagnostic answers are never included in the generation request.

## Persistent question-bank setup

`wrangler.jsonc` declares:

```json
{
  "kv_namespaces": [
    { "binding": "QUESTION_BANK" }
  ]
}
```

With current Wrangler automatic provisioning, the first `npm run deploy` can provision the KV resource for the binding and write the created namespace ID into the local Wrangler configuration. If the account/environment does not use automatic provisioning, create a namespace explicitly and add its ID to the same `QUESTION_BANK` binding.

After deployment, `GET /health` reports:

- `questionBankConfigured`
- `questionBankTtlDays`
- `maxSavedQuestionsPerTarget`

The assessment response includes a `bank` object with `fullHit`, `storedCount`, `servedFromBank`, and `generatedNow`, which is also surfaced in the frontend status message.

## Signed local progress reports

Prepare keeps full progress snapshots in the learner's browser/device. A completed assessment creates a report envelope with a canonical JSON payload and SHA-256 payload hash. Only the hash plus minimal envelope metadata are sent to `/v1/report/sign`; the full report is not sent during signing.

The Worker signs the envelope metadata using HMAC-SHA256 with `REPORT_SIGNING_SECRET`. A modified local file changes its payload hash and fails `/v1/report/verify`.

Report format:

- `*.prepare.json` — one signed assessment snapshot
- `*.prepare.zip` — multiple signed reports for the same target plus a signed `manifest.prepare.json`

ZIP contents must be treated as untrusted input. Future upload processing should only accept manifest-listed report files, enforce size/count limits, parse JSON without executing content, recompute each payload hash, and call the same verification logic before storing progress.

This design is **tamper-evident**, not physically uneditable. Anything saved on a user's device can be altered, but altered content is rejected cryptographically when shared back.

`GET /health` reports report signing, company-role generation, and persistent question-bank configuration without exposing secrets.

## Provider behavior

Serper is used first to keep routine query cost low. Brave Search is attempted when Serper fails, and Tavily is attempted when both earlier configured providers fail. Tavily uses `search_depth: basic`.

## Caching and persistence

Prepare now has two different kinds of reuse:

1. **30-day public-evidence caches** in the Workers Cache API for research queries, research packages, and assessment-specific evidence searches.
2. **Persistent generated question banks** in Workers KV, keyed by normalized target need and kept for 180 days by default.

The public-evidence cache avoids repeated search-provider charges. The KV question bank avoids repeated model-generation charges. Numeric learner scores and diagnostic answers are excluded from both reusable identities.

`?refresh=1` bypasses the public-evidence cache when new questions actually need to be generated; it does not discard already saved question-bank inventory.

## Source provenance

The research pipeline scores source authority separately from target relevance. Results keep their actual search provider, query, provider rank, research time, publisher hostname, authority label, target-evidence flag, competency matches, and whether the underlying query came from the 30-day query cache.
