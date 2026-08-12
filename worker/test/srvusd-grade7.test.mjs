import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { buildQueries, rankSources, sanitizeResearchRequest, targetLabel, validateResearchRequest } from '../src/research-school.js'

const browserSource=await readFile(new URL('../../srvusd-grade7.js',import.meta.url),'utf8')
const browserCurriculum=await import(`data:text/javascript;base64,${Buffer.from(browserSource).toString('base64')}`)

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

test('browser curriculum selects Course 2, Course 3, and science models', () => {
  const base={track:'academic',grade:'Grade 7',district:'San Ramon Valley Unified School District'}
  const c2=browserCurriculum.buildSrvusdGrade7Model({...base,subject:'Mathematics',curriculumTrack:'Course 2 Math'})
  const c3=browserCurriculum.buildSrvusdGrade7Model({...base,subject:'Mathematics',curriculumTrack:'Course 3 Math'})
  const science=browserCurriculum.buildSrvusdGrade7Model({...base,subject:'Science',curriculumTrack:'Grade 7 Integrated / Life Science'})
  assert.ok(c2.competencies.some((x)=>x.name==='Ratios & proportional relationships'))
  assert.ok(c3.competencies.some((x)=>x.name==='Linear functions & systems'))
  assert.ok(science.competencies.some((x)=>x.name==='Genetics, adaptation & inheritance'))
  assert.equal(c2.competencies.length,5)
  assert.equal(c3.competencies.length,5)
  assert.equal(science.competencies.length,5)
})

test('browser curriculum has adaptive coverage for all three Grade 7 paths', () => {
  const bank=browserCurriculum.srvusdGrade7DiagnosticBank
  assert.ok(bank.filter((q)=>q.id.startsWith('sr7-c2-')).length>=10)
  assert.ok(bank.filter((q)=>q.id.startsWith('sr7-c3-')).length>=10)
  assert.ok(bank.filter((q)=>q.id.startsWith('sr7-sci-')).length>=10)
  assert.ok(browserCurriculum.isSrvusdGrade7(course2.profile))
})

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
