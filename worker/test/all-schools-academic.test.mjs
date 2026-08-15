import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'
import { sanitizeAcademicAssessmentRequest } from '../src/academic-assessment-generator.js'
import { buildQueries, sanitizeResearchRequest, targetLabel } from '../src/research-school.js'
import { getAssessmentQuestions, questionBankKey } from '../src/question-bank.js'

const academicRequest={
  profile:{track:'academic',country:'United States',region:'California',district:'Example Unified School District',school:'Example Middle School',grade:'Grade 7',subject:'Mathematics',curriculumTrack:'Integrated Math',examName:'Spring assessment',topics:'ratios, equations'},
  competencies:[{name:'Algebraic reasoning',weight:1.1,rationale:'Baseline hint'},{name:'Number sense',weight:1,rationale:'Baseline hint'}],
  gaps:[],count:50,sessionSeed:'academic-bank-test',excludeFingerprints:[],
}

class MemoryKV{
  constructor(){this.values=new Map()}
  async get(key,options={}){const value=this.values.get(key);if(value==null)return null;return options?.type==='json'?JSON.parse(value):value}
  async put(key,value){this.values.set(key,value)}
}

function savedQuestions(count=60){return Array.from({length:count},(_,index)=>({id:`academic-saved-${index+1}`,fingerprint:`academic-fp-${String(index+1).padStart(3,'0')}`,track:'academic',competency:index%2?'Expressions & equations':'Ratios & proportional reasoning',difficulty:'core',prompt:`Saved grade-specific academic practice question ${index+1}?`,options:['A','B','C','D'],answer:index%4,explanation:'Saved explanation',keywords:['grade 7','mathematics'],prerequisites:[],sourceIds:[],evidenceRationale:'Saved standards-grounded question.',generation:'live-academic-target'}))}

async function seedAcademicBank(kv,body=academicRequest){
  const key=await questionBankKey(body)
  kv.values.set(key,JSON.stringify({version:1,target:{label:'Example Middle School · Grade 7 · Mathematics',track:'academic'},model:{track:'academic',label:'Example Middle School · Grade 7 · Mathematics',difficulty:'core',competencies:[{name:'Expressions & equations',weight:1.1,rationale:'Curriculum evidence',keywords:[]},{name:'Ratios & proportional reasoning',weight:1,rationale:'Curriculum evidence',keywords:[]}],source:'Saved evidence-grounded model'},generator:{configured:true,model:'gpt-5-mini',store:false},research:{sources:[]},policy:{originalPracticeQuestions:true},generatedAt:'2026-08-15T00:00:00.000Z',updatedAt:'2026-08-15T00:00:00.000Z',questions:savedQuestions()}))
}

test('academic assessment accepts arbitrary grade/year labels and school systems',()=>{
  for(const grade of ['Grade 2','Grade 12','Class 10','Year 8']){
    const value=sanitizeAcademicAssessmentRequest({...academicRequest,profile:{...academicRequest.profile,grade}})
    assert.equal(value.profile.grade,grade)
    assert.equal(value.profile.school,'Example Middle School')
    assert.equal(value.profile.district,'Example Unified School District')
  }
})

test('generic academic research builds school, system, region and curriculum queries',()=>{
  const request=sanitizeResearchRequest(academicRequest)
  const queries=buildQueries(request).join('\n')
  assert.match(queries,/Example Middle School/i)
  assert.match(queries,/Example Unified School District/i)
  assert.match(queries,/California/i)
  assert.match(queries,/Integrated Math/i)
  assert.doesNotMatch(queries,/SRVUSD|San Ramon/i)
  assert.match(targetLabel(request.profile),/Example Middle School/)
})

test('question-bank identity separates schools and grades',async()=>{
  const base=await questionBankKey(academicRequest)
  const otherSchool=await questionBankKey({...academicRequest,profile:{...academicRequest.profile,school:'Another Middle School'}})
  const otherGrade=await questionBankKey({...academicRequest,profile:{...academicRequest.profile,grade:'Grade 8'}})
  assert.notEqual(base,otherSchool)
  assert.notEqual(base,otherGrade)
})

test('full academic bank serves 50 questions without another OpenAI call',async()=>{
  const kv=new MemoryKV();await seedAcademicBank(kv)
  const result=await getAssessmentQuestions(academicRequest,{QUESTION_BANK:kv,QUESTION_BANK_TTL_DAYS:'180',OPENAI_MODEL:'gpt-5-mini'})
  assert.equal(result.questions.length,50)
  assert.equal(result.bank.fullHit,true)
  assert.equal(result.bank.generatedNow,0)
  assert.equal(result.generator.usedThisRequest,false)
  assert.equal(result.model.track,'academic')
})

test('browser bootstrap uses generic academic resolver instead of SRVUSD-only UI',async()=>{
  const index=await readFile(new URL('../../index.html',import.meta.url),'utf8')
  const ui=await readFile(new URL('../../academic-target-ui.js',import.meta.url),'utf8')
  const assessment=await readFile(new URL('../../target-assessment-ui.js',import.meta.url),'utf8')
  const engine=await readFile(new URL('../../engine-v5.js',import.meta.url),'utf8')
  assert.match(index,/academic-target-ui\.js/)
  assert.match(index,/target-assessment-ui\.js/)
  assert.match(index,/engine-v5\.js/)
  assert.doesNotMatch(index,/srvusd-grade7-ui\.js/)
  assert.match(ui,/Any grade\. Any school or education system\./)
  assert.match(assessment,/track==='academic'/)
  assert.match(engine,/live-academic-target/)
})

test('new academic modules parse cleanly on native platform paths',()=>{
  for(const file of ['../src/academic-assessment-generator.js','../src/research-school.js','../src/question-bank.js','../../academic-target-ui.js','../../target-assessment-ui.js','../../engine-v5.js']){
    const path=fileURLToPath(new URL(file,import.meta.url))
    const result=spawnSync(process.execPath,['--check',path],{encoding:'utf8'})
    assert.equal(result.status,0,`${file}: ${result.stderr}`)
  }
})
