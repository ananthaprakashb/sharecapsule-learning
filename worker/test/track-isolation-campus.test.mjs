import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { spawnSync } from 'node:child_process'
import test from 'node:test'

const root=path.resolve(process.cwd(),'..')
const campusModule=await import(`${pathToFileURL(path.join(root,'campus-depth.js')).href}?test=${Date.now()}`)

const expectedCompetencies=[
  'Programming fundamentals','Problem solving','Quantitative aptitude','Logical reasoning','Algorithms','Data structures',
  'Object-oriented programming','Data & SQL','Operating systems','Networking','Verbal communication','Behavioral communication',
]

test('campus depth bank supports repeated 50-question attempts',()=>{
  const bank=campusModule.buildCampusDepthBank()
  assert.ok(bank.length>=150,`expected at least 150 campus depth questions, got ${bank.length}`)
  assert.equal(new Set(bank.map((item)=>item.id)).size,bank.length,'campus question ids must be unique')
  for(const competency of expectedCompetencies)assert.ok(bank.some((item)=>item.competency===competency),`missing ${competency}`)
  for(const item of bank){
    assert.equal(item.track,'campus')
    assert.equal(item.options.length,4,`${item.id} should have four options`)
    assert.ok(Number.isInteger(item.answer)&&item.answer>=0&&item.answer<4,`${item.id} has invalid answer index`)
  }
})

test('assessment engine explicitly isolates SRVUSD to academic track',()=>{
  const source=fs.readFileSync(path.join(root,'engine-v3.js'),'utf8')
  assert.match(source,/profile\?\.track==='academic'\s*&&\s*isSrvusdGrade7\(profile\)/)
  assert.match(source,/if\(profile\.track==='campus'\)/)
  assert.match(source,/prepare-question-history-v3/)
  assert.match(source,/!history\.recent\.includes\(question\.id\)/)
})

test('report and research modules use track-specific profile fields',()=>{
  const report=fs.readFileSync(path.join(root,'report-ui-v2.js'),'utf8')
  const research=fs.readFileSync(path.join(root,'research-api-v2.js'),'utf8')
  assert.match(report,/p\.track==='campus'/)
  assert.match(report,/p\.track==='interview'/)
  assert.match(research,/profile\.track==='campus'/)
  assert.match(research,/profile\.track==='interview'/)
})

test('new browser modules parse as JavaScript',()=>{
  for(const file of ['engine-v3.js','campus-depth.js','report-ui-v2.js','research-api-v2.js']){
    const result=spawnSync(process.execPath,['--check',path.join(root,file)],{encoding:'utf8'})
    assert.equal(result.status,0,`${file} syntax failed: ${result.stderr}`)
  }
})
