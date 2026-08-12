import test from 'node:test'
import assert from 'node:assert/strict'
import { buildQueries, rankSources, sanitizeResearchRequest, validateResearchRequest } from '../src/research-campus.js'

const campus = {
  profile: {
    track:'campus', degree:'B.Tech', branch:'Information Technology', semester:'Final semester',
    companies:'TCS, Cognizant, Infosys, HCLTech', programmingLanguages:'Java, Python',
  },
  competencies:[
    {name:'Programming fundamentals',weight:1.2},
    {name:'Quantitative aptitude',weight:1.1},
    {name:'Data & SQL',weight:1},
  ],
  gaps:[
    {name:'Programming fundamentals',score:45,priority:80},
    {name:'Quantitative aptitude',score:55,priority:70},
  ],
}

test('builds multi-company campus queries', () => {
  validateResearchRequest(campus)
  const request = sanitizeResearchRequest(campus)
  const queries = buildQueries(request)
  assert.ok(queries.some((q) => /TCS.*campus hiring/i.test(q)))
  assert.ok(queries.some((q) => /Cognizant.*campus hiring/i.test(q)))
  assert.ok(queries.some((q) => /B.Tech.*Information Technology.*campus placement/i.test(q)))
  assert.ok(queries.length <= 5)
})

test('marks selected company official domain as target evidence', () => {
  const request = sanitizeResearchRequest(campus)
  const ranked = rankSources([
    {title:'TCS Launchpad',url:'https://www.tcs.com/careers/india/tcs-launchpad',snippet:'campus graduates programming coding aptitude',providerRank:1,query:'x'},
    {title:'Campus interview tips',url:'https://example.com/tcs-campus',snippet:'programming coding aptitude',providerRank:1,query:'x'},
  ], request)
  assert.equal(ranked[0].publisher, 'tcs.com')
  assert.equal(ranked[0].targetEvidence, true)
  assert.equal(ranked[0].quality, 'Official company source')
})

test('requires degree and branch for campus research', () => {
  assert.throws(() => validateResearchRequest({ profile:{track:'campus'}, competencies:[{name:'Programming fundamentals'}] }), /degree/)
})
