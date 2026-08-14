import * as legacy from '/engine.js?legacy=20260814-1'
import { diagnosticBank, difficultyRank } from './diagnostics.js'
import { campusDiagnosticBank } from './campus-diagnostics.js'
import { isSrvusdGrade7 } from './srvusd-grade7.js'
import { buildSrvusdGrade7DepthBank } from './srvusd-grade7-depth.js'

export const daysUntil = legacy.daysUntil
export const applyRetestResult = legacy.applyRetestResult
export const scoreDiagnostic = legacy.scoreDiagnostic
export const buildReadiness = legacy.buildReadiness
export const buildGapList = legacy.buildGapList
export const buildPlan = legacy.buildPlan

const MAX_QUESTIONS = 50
const INITIAL_SEEDS = 10
const HISTORY_KEY = 'prepare-question-history-v2'
const stopWords = new Set(['the','and','for','with','from','into','this','that','these','those','grade','course','topic','topics','unit','chapter','learn','learning','review','test','exam'])

function normalize(value='') {
  return String(value || '').toLowerCase().replace(/[^a-z0-9+#.]+/g,' ').trim()
}

function stem(token='') {
  let value = token.toLowerCase()
  if (value.length > 5 && value.endsWith('ing')) value = value.slice(0,-3)
  else if (value.length > 4 && value.endsWith('ies')) value = `${value.slice(0,-3)}y`
  else if (value.length > 4 && value.endsWith('es')) value = value.slice(0,-2)
  else if (value.length > 3 && value.endsWith('s')) value = value.slice(0,-1)
  return value
}

function tokens(value='') {
  return normalize(value).split(/\s+/).map(stem).filter((token) => token.length >= 3 && !stopWords.has(token))
}

function hash(text) {
  let value = 2166136261
  for (const char of String(text)) {
    value ^= char.charCodeAt(0)
    value = Math.imul(value, 16777619)
  }
  return value >>> 0
}

function modelFor(profile) {
  return legacy.buildDiagnostic(profile, 1).model
}

function baseQuestionPool(profile) {
  if (isSrvusdGrade7(profile)) return buildSrvusdGrade7DepthBank(profile)
  if (profile.track === 'campus') return [...campusDiagnosticBank, ...diagnosticBank.filter((item) => item.track === 'interview')]
  return diagnosticBank.filter((item) => item.track === profile.track)
}

function questionText(question) {
  return normalize([question.competency, question.prompt, ...(question.keywords || [])].join(' '))
}

function competencyText(competency) {
  return normalize([competency.name, ...(competency.keywords || [])].join(' '))
}

function hasTokenMatch(text, topicTokens) {
  const haystackTokens = new Set(tokens(text))
  return topicTokens.some((token) => haystackTokens.has(token) || [...haystackTokens].some((candidate) => candidate.includes(token) || token.includes(candidate)))
}

function relevantPool(profile, model) {
  const targetNames = new Set(model.competencies.map((item) => item.name))
  const base = baseQuestionPool(profile).filter((question) => targetNames.has(question.competency))
  if (profile.track !== 'academic') return base

  const topicTokens = tokens(profile.topics || '')
  if (!topicTokens.length) return base

  const matchedCompetencies = new Set(model.competencies.filter((item) => hasTokenMatch(competencyText(item), topicTokens)).map((item) => item.name))
  const narrowed = base.filter((question) => matchedCompetencies.has(question.competency) || hasTokenMatch(questionText(question), topicTokens))
  return narrowed
}

function targetKey(profile) {
  const companies = Array.isArray(profile.companies) ? profile.companies.join(',') : profile.companies
  return normalize([
    profile.track, profile.grade, profile.subject, profile.examName, profile.topics,
    profile.district, profile.school, profile.curriculumTrack,
    profile.company, profile.role, profile.level, profile.skills,
    profile.degree, profile.branch, companies,
  ].filter(Boolean).join('|'))
}

function readHistory(profile) {
  if (typeof localStorage === 'undefined') return { attempt:0, recent:[] }
  try {
    const all = JSON.parse(localStorage.getItem(HISTORY_KEY) || '{}')
    const row = all[targetKey(profile)] || {}
    return { attempt:Number(row.attempt || 0), recent:Array.isArray(row.recent) ? row.recent : [] }
  } catch { return { attempt:0, recent:[] } }
}

function writeHistory(profile, attempt, recent) {
  if (typeof localStorage === 'undefined') return
  try {
    const all = JSON.parse(localStorage.getItem(HISTORY_KEY) || '{}')
    all[targetKey(profile)] = { attempt, recent:[...new Set(recent)].slice(-120), updatedAt:new Date().toISOString() }
    localStorage.setItem(HISTORY_KEY, JSON.stringify(all))
  } catch {}
}

function remember(profile, ids) {
  const history = readHistory(profile)
  writeHistory(profile, history.attempt, [...history.recent, ...ids])
}

function difficultyDistance(question, desired='core') {
  return Math.abs((difficultyRank[question.difficulty] || 2) - (difficultyRank[desired] || 2))
}

function sortedCandidates(candidates, model, profile, attempt, recent, preferredDifficulty='core') {
  const weights = new Map(model.competencies.map((item) => [item.name, item.weight || 1]))
  const recentSet = new Set(recent)
  return [...candidates].sort((a,b) => {
    const score = (question) => {
      const freshness = recentSet.has(question.id) ? -1000 : 0
      const importance = (weights.get(question.competency) || 1) * 100
      const difficulty = -difficultyDistance(question, preferredDifficulty) * 8
      const jitter = (hash(`${attempt}:${question.id}`) % 1000) / 1000
      return freshness + importance + difficulty + jitter
    }
    return score(b) - score(a)
  })
}

function balancedSeeds(pool, model, profile, attempt, recent, count) {
  const chosen=[]
  const chosenIds=new Set()
  const byCompetency=new Map()
  for (const question of pool) {
    if (!byCompetency.has(question.competency)) byCompetency.set(question.competency,[])
    byCompetency.get(question.competency).push(question)
  }
  const competencyOrder = model.competencies.filter((item) => byCompetency.has(item.name))
  for (const competency of competencyOrder) {
    const candidates = sortedCandidates(byCompetency.get(competency.name) || [],model,profile,attempt,recent,model.difficulty)
    const candidate = candidates.find((question) => !chosenIds.has(question.id))
    if (candidate) { chosen.push(candidate); chosenIds.add(candidate.id) }
    if (chosen.length >= count) return chosen
  }
  const remaining = sortedCandidates(pool.filter((question)=>!chosenIds.has(question.id)),model,profile,attempt,recent,model.difficulty)
  for (const candidate of remaining) {
    chosen.push(candidate); chosenIds.add(candidate.id)
    if (chosen.length >= count) break
  }
  return chosen
}

export function buildDiagnostic(profile, _requestedMax = MAX_QUESTIONS) {
  const model = modelFor(profile)
  const pool = relevantPool(profile, model)
  const history = readHistory(profile)
  const attempt = history.attempt + 1
  const maxQuestions = Math.min(MAX_QUESTIONS, pool.length)
  const seeds = balancedSeeds(pool, model, profile, attempt, history.recent, Math.min(INITIAL_SEEDS, maxQuestions))
  writeHistory(profile, attempt, [...history.recent, ...seeds.map((question)=>question.id)])
  return { model, questions:seeds, maxQuestions }
}

function chooseFromPool(profile, model, plannedQuestions, completedQuestions, answers, currentQuestion, maxQuestions) {
  const existingIds = new Set(plannedQuestions.map((item)=>item.id))
  const history = readHistory(profile)
  const all = relevantPool(profile, model).filter((question)=>!existingIds.has(question.id))
  if (!all.length) return null
  const fresh = all.filter((question)=>!history.recent.includes(question.id))
  const candidates = fresh.length ? fresh : all
  const correct = Number(answers[currentQuestion.id]) === currentQuestion.answer
  const currentRank = difficultyRank[currentQuestion.difficulty] || 2

  if (!correct && currentQuestion.prerequisites?.length) {
    for (const prerequisite of currentQuestion.prerequisites) {
      const prereq = sortedCandidates(candidates.filter((q)=>q.competency===prerequisite),model,profile,history.attempt,history.recent,'foundation')[0]
      if (prereq) return { ...prereq, adaptiveReason:`Checking prerequisite: ${prerequisite}` }
    }
  }

  const sameCompleted = completedQuestions.filter((q)=>q.competency===currentQuestion.competency).length
  if (sameCompleted < 3) {
    const desiredRank = correct ? Math.min(3,currentRank+1) : Math.max(1,currentRank-1)
    const same = candidates.filter((q)=>q.competency===currentQuestion.competency)
      .sort((a,b)=>Math.abs((difficultyRank[a.difficulty]||2)-desiredRank)-Math.abs((difficultyRank[b.difficulty]||2)-desiredRank))[0]
    if (same) return { ...same, adaptiveReason:correct ? `Increasing difficulty in ${currentQuestion.competency}` : `Rechecking ${currentQuestion.competency} at a more foundational level` }
  }

  const counts = new Map(model.competencies.map((item)=>[item.name,0]))
  completedQuestions.forEach((question)=>counts.set(question.competency,(counts.get(question.competency)||0)+1))
  const targetOrder = [...model.competencies].sort((a,b)=>(counts.get(a.name)||0)-(counts.get(b.name)||0) || (b.weight||1)-(a.weight||1))
  for (const competency of targetOrder) {
    const next = sortedCandidates(candidates.filter((q)=>q.competency===competency.name),model,profile,history.attempt,history.recent,model.difficulty)[0]
    if (next) return { ...next, adaptiveReason:`Expanding coverage: ${competency.name}` }
  }
  return sortedCandidates(candidates,model,profile,history.attempt,history.recent,model.difficulty)[0] || null
}

export function getAdaptiveFollowUp(profile, model, plannedQuestions, answers, currentQuestion, maxQuestions = MAX_QUESTIONS) {
  if (!currentQuestion || !plannedQuestions.length || maxQuestions <= 0) return null
  const currentIndex = plannedQuestions.findIndex((item)=>item.id===currentQuestion.id)
  const completedQuestions = currentIndex >= 0 ? plannedQuestions.slice(0,currentIndex+1) : [currentQuestion]
  if (completedQuestions.length >= Math.min(MAX_QUESTIONS,maxQuestions)) return null
  const candidate = chooseFromPool(profile,model,plannedQuestions,completedQuestions,answers,currentQuestion,maxQuestions)
  if (candidate) remember(profile,[candidate.id])
  return candidate
}

export function getMicroAssessment(profile, competency, askedQuestions = []) {
  const model = modelFor(profile)
  const askedIds = new Set(askedQuestions.map((item)=>typeof item==='string'?item:item.id))
  const history = readHistory(profile)
  const pool = relevantPool(profile,model).filter((question)=>question.competency===competency && !askedIds.has(question.id))
  const fresh = pool.filter((question)=>!history.recent.includes(question.id))
  const candidates = sortedCandidates(fresh.length?fresh:pool,model,profile,history.attempt,history.recent,'advanced')
  const chosen=candidates[0] || null
  if (chosen) remember(profile,[chosen.id])
  return chosen ? { ...chosen, adaptiveReason:`Micro-assessment after learning: ${competency}` } : null
}
