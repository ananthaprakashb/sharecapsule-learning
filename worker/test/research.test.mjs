import test from 'node:test'
import assert from 'node:assert/strict'
import { buildQueries, rankSources, sanitizeResearchRequest, validateResearchRequest } from '../src/research.js'

const interview = {
  profile: { track: 'interview', company: 'Amazon', role: 'Software Development Engineer II', level: 'SDE II', skills: 'Java system design' },
  competencies: [{ name: 'System design', weight: 1.2 }, { name: 'Algorithms', weight: 1 }],
  gaps: [{ name: 'System design', score: 40, priority: 90 }],
}

test('builds target-specific interview queries', () => {
  validateResearchRequest(interview)
  const queries = buildQueries(sanitizeResearchRequest(interview))
  assert.ok(queries.some((q) => /Amazon.*Software Development Engineer II/i.test(q)))
  assert.ok(queries.some((q) => /System design/i.test(q)))
  assert.ok(queries.length <= 5)
})

test('official company result outranks generic article', () => {
  const request = sanitizeResearchRequest(interview)
  const ranked = rankSources([
    { title: 'SDE II Interview Prep', url: 'https://www.amazon.jobs/content/en/how-we-hire/sde-ii-interview-prep', snippet: 'coding system design behavioral', providerRank: 2, query: 'x' },
    { title: 'Amazon interview tips', url: 'https://example-blog.com/amazon-interview', snippet: 'system design coding', providerRank: 1, query: 'x' },
  ], request)
  assert.equal(ranked[0].publisher, 'amazon.jobs')
  assert.equal(ranked[0].targetEvidence, true)
  assert.ok(ranked[0].competencies.includes('System design'))
})

test('rejects incomplete academic request', () => {
  assert.throws(() => validateResearchRequest({ profile: { track: 'academic' }, competencies: [{ name: 'Functions' }] }), /subject/)
})
