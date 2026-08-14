import test from 'node:test'
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { fileURLToPath, pathToFileURL } from 'node:url'
import path from 'node:path'

const here = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(here, '../..')
const depthModule = await import(pathToFileURL(path.join(root, 'srvusd-grade7-depth.js')).href)

const profiles = [
  { name:'Course 2', profile:{ subject:'Mathematics', curriculumTrack:'Course 2 Math' } },
  { name:'Course 3', profile:{ subject:'Mathematics', curriculumTrack:'Course 3 Math' } },
  { name:'Science', profile:{ subject:'Science', curriculumTrack:'Grade 7 Integrated / Life Science' } },
]

for (const { name, profile } of profiles) {
  test(`${name} depth pool supports a 50-question attempt`, () => {
    const questions = depthModule.buildSrvusdGrade7DepthBank(profile)
    assert.ok(questions.length >= 75, `expected at least 75 questions, got ${questions.length}`)
    assert.equal(new Set(questions.map((question)=>question.id)).size, questions.length, 'question IDs must be unique')
    assert.ok(new Set(questions.map((question)=>question.competency)).size >= 5, 'must cover five curriculum competencies')
    questions.forEach((question) => {
      assert.equal(question.track, 'academic')
      assert.ok(['foundation','core','advanced'].includes(question.difficulty))
      assert.equal(question.options.length, 4)
      assert.ok(Number.isInteger(question.answer) && question.answer >= 0 && question.answer < question.options.length)
      assert.ok(question.options[question.answer] !== undefined)
      assert.ok(question.prompt.length > 12)
    })
  })
}

test('assessment browser modules parse', () => {
  for (const file of ['engine-v2.js','assessment-timer.js']) {
    execFileSync(process.execPath, ['--check', path.join(root, file)], { stdio:'pipe' })
  }
})
