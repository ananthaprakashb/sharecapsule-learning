import test from 'node:test'
import assert from 'node:assert/strict'
import { buildQueries, rankSources, sanitizeResearchRequest, targetLabel, validateResearchRequest } from '../src/research-school.js'

const course2 = {
  profile: {
    track:'academic', grade:'Grade 7', subject:'Mathematics', examName:'Course 2 Math',
    district:'San Ramon Valley Unified School District', school:'Iron Horse Middle School', curriculumTrack:'Course 2 Math',
  },
  competencies:[
    {name:'Ratios & proportional relationships',weight:1.18},
    {name:'Expressions & equations',weight:1.2},
  ],
  gaps:[{name:'Ratios & proportional relationships',score:45,priority:70}],
}

test('preserves SRVUSD curriculum metadata during sanitization', () => {
  validateResearchRequest(course2)
  const request=sanitizeResearchRequest(course2)
  assert.equal(request.profile.district,'San Ramon Valley Unified School District')
  assert.equal(request.profile.school,'Iron Horse Middle School')
  assert.equal(request.profile.curriculumTrack,'Course 2 Math')
})

test('builds school and district-aware Grade 7 queries', () => {
  const request=sanitizeResearchRequest(course2)
  const queries=buildQueries(request)
  assert.ok(queries.some((q)=>/San Ramon Valley Unified School District.*Grade 7.*Mathematics.*Course 2 Math/i.test(q)))
  assert.ok(queries.some((q)=>/Iron Horse Middle School.*Grade 7.*Mathematics/i.test(q)))
  assert.ok(queries.some((q)=>/Ratios & proportional relationships/i.test(q)))
  assert.ok(queries.length<=5)
})

test('promotes SRVUSD and California standards sources as target evidence', () => {
  const request=sanitizeResearchRequest(course2)
  const ranked=rankSources([
    {title:'Middle School Math',url:'https://www.srvusd.net/Departments/Educational-Services/Math/',snippet:'Course 2 Course 3 SpringBoard Grade 7 mathematics',providerRank:1,query:'x'},
    {title:'California Mathematics Framework',url:'https://www.cde.ca.gov/ci/ma/cf/',snippet:'California mathematics standards',providerRank:2,query:'x'},
    {title:'Generic Grade 7 tips',url:'https://example.com/grade7-math',snippet:'ratios equations',providerRank:1,query:'x'},
  ],request)
  const district=ranked.find((x)=>x.publisher==='srvusd.net')
  const state=ranked.find((x)=>x.publisher==='cde.ca.gov')
  assert.equal(district?.targetEvidence,true)
  assert.equal(district?.quality,'Official district source')
  assert.equal(state?.targetEvidence,true)
  assert.equal(state?.quality,'Government standards source')
})

test('target label includes local course and school context', () => {
  const request=sanitizeResearchRequest(course2)
  const label=targetLabel(request.profile)
  assert.match(label,/SRVUSD|San Ramon Valley/i)
  assert.match(label,/Course 2 Math/i)
  assert.match(label,/Iron Horse Middle School/i)
})
