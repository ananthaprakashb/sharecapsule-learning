import { diagnosticBank, difficultyRank, fallbackQuestions } from './diagnostics.js'
import { campusDiagnosticBank } from './campus-diagnostics.js'
import { buildTargetModel as buildBaseTargetModel } from './target-model.js'
import { buildSrvusdGrade7Model, isSrvusdGrade7, srvusdGrade7DiagnosticBank } from './srvusd-grade7.js'

const clamp = (value, min, max) => Math.min(max, Math.max(min, value))
const difficultyWeight = { foundation: 0.85, core: 1, advanced: 1.2 }

export function daysUntil(dateString, now = new Date()) {
  if (!dateString) return 0
  const target = new Date(`${dateString}T23:59:59`)
  const diff = target.getTime() - now.getTime()
  return Math.max(0, Math.ceil(diff / 86400000))
}

function buildTargetModel(profile) {
  return isSrvusdGrade7(profile) ? buildSrvusdGrade7Model(profile) : buildBaseTargetModel(profile)
}

function targetLookup(model) { return new Map(model.competencies.map((item) => [item.name, item])) }

function questionPool(profile) {
  if (profile.track === 'campus') return [...campusDiagnosticBank, ...diagnosticBank.filter((item) => item.track === 'interview')]
  if (isSrvusdGrade7(profile)) return srvusdGrade7DiagnosticBank
  return diagnosticBank.filter((item) => item.track === profile.track)
}

function relevanceScore(question, haystack, targetMap, desiredDifficulty) {
  const keywordHits = question.keywords.reduce((sum, keyword) => sum + (haystack.includes(keyword) ? 1 : 0), 0)
  const target = targetMap.get(question.competency)
  const targetWeight = target ? target.weight * 12 : 0
  const difficultyDistance = Math.abs((difficultyRank[question.difficulty] || 2) - (difficultyRank[desiredDifficulty] || 2))
  return targetWeight + keywordHits * 3 - difficultyDistance * 1.5
}

export function buildDiagnostic(profile, maxQuestions = 10) {
  const model = buildTargetModel(profile)
  const track = profile.track
  const haystack = [profile.subject, profile.topics, profile.examName, profile.company, profile.role, profile.level, profile.skills, profile.jobDescription,
    profile.degree, profile.branch, profile.semester, profile.companies, profile.programmingLanguages, profile.projects,
    profile.district, profile.school, profile.curriculumTrack]
    .filter(Boolean).join(' ').toLowerCase()
  const targetMap = targetLookup(model)
  const pool = questionPool(profile)
  const chosen = []
  const initialCoverage = track === 'campus' ? 10 : isSrvusdGrade7(profile) ? 5 : 6

  for (const competency of model.competencies.slice(0, initialCoverage)) {
    const candidates = pool
      .filter((q) => q.competency === competency.name && !chosen.some((c) => c.id === q.id))
      .sort((a, b) => relevanceScore(b, haystack, targetMap, model.difficulty) - relevanceScore(a, haystack, targetMap, model.difficulty))
    if (candidates[0]) chosen.push(candidates[0])
  }

  if (chosen.length < 4) {
    const remaining = pool
      .filter((q) => !chosen.some((c) => c.id === q.id))
      .sort((a, b) => relevanceScore(b, haystack, targetMap, model.difficulty) - relevanceScore(a, haystack, targetMap, model.difficulty))
    for (const item of remaining) {
      if (chosen.length >= Math.min(maxQuestions, track === 'campus' ? 8 : 5)) break
      if (!chosen.some((existing) => existing.competency === item.competency)) chosen.push(item)
    }
  }

  if (!chosen.length) {
    const fallback = track === 'campus' ? campusDiagnosticBank : isSrvusdGrade7(profile) ? srvusdGrade7DiagnosticBank : (fallbackQuestions[track] || [])
    chosen.push(...fallback.slice(0, Math.min(maxQuestions, 5)))
  }
  return { model, questions: chosen.slice(0, maxQuestions), maxQuestions }
}

export function getAdaptiveFollowUp(profile, model, askedQuestions, answers, currentQuestion, maxQuestions = 10) {
  if (!currentQuestion || askedQuestions.length >= maxQuestions) return null
  const askedIds = new Set(askedQuestions.map((item) => item.id))
  const isCorrect = Number(answers[currentQuestion.id]) === currentQuestion.answer
  const currentRank = difficultyRank[currentQuestion.difficulty] || 2
  const sameCompetencyCount = askedQuestions.filter((q) => q.competency === currentQuestion.competency).length
  const trackPool = questionPool(profile).filter((q) => !askedIds.has(q.id))

  if (!isCorrect && currentQuestion.prerequisites?.length) {
    for (const prerequisite of currentQuestion.prerequisites) {
      const candidate = trackPool.filter((q) => q.competency === prerequisite)
        .sort((a, b) => (difficultyRank[a.difficulty] || 2) - (difficultyRank[b.difficulty] || 2))[0]
      if (candidate) return { ...candidate, adaptiveReason: `Checking prerequisite: ${prerequisite}` }
    }
  }

  if (sameCompetencyCount < 2) {
    const desiredRank = isCorrect ? Math.min(3, currentRank + 1) : Math.max(1, currentRank - 1)
    const candidate = trackPool.filter((q) => q.competency === currentQuestion.competency)
      .sort((a, b) => Math.abs((difficultyRank[a.difficulty] || 2) - desiredRank) - Math.abs((difficultyRank[b.difficulty] || 2) - desiredRank))[0]
    if (candidate) return { ...candidate, adaptiveReason: isCorrect ? `Increasing difficulty in ${currentQuestion.competency}` : `Rechecking ${currentQuestion.competency} at a more foundational level` }
  }
  return null
}

export function getMicroAssessment(profile, competency, askedQuestions = []) {
  const askedIds = new Set(askedQuestions.map((item) => typeof item === 'string' ? item : item.id))
  const candidates = questionPool(profile).filter((q) => q.competency === competency)
    .sort((a, b) => (difficultyRank[b.difficulty] || 2) - (difficultyRank[a.difficulty] || 2))
  const chosen = candidates.find((q) => !askedIds.has(q.id)) || candidates[0] || null
  return chosen ? { ...chosen, adaptiveReason: `Micro-assessment after learning: ${competency}` } : null
}

export function applyRetestResult(result, competency, isCorrect) {
  const item = result.competencies.find((entry) => entry.name === competency)
  if (!item) return result
  const before = item.score
  const priorEvidence = Math.max(1, item.total || 1)
  item.score = Math.round((before * priorEvidence + (isCorrect ? 100 : 0)) / (priorEvidence + 1))
  item.total = priorEvidence + 1
  if (isCorrect) item.correct = (item.correct || 0) + 1
  item.latestRetest = isCorrect ? 'passed' : 'needs more review'
  item.evidence = item.total >= 3 ? 'Growing evidence' : 'Moderate evidence'
  result.retests = (result.retests || 0) + 1
  result.latestRetest = { competency, isCorrect, before, after: item.score }
  return result
}

export function scoreDiagnostic(questions, answers, responseTimes = {}, model = null) {
  const stats = new Map(); const targetMap = model ? targetLookup(model) : new Map()
  let correct = 0, weightedCorrect = 0, weightedTotal = 0
  const misses = []
  questions.forEach((question) => {
    if (answers[question.id] === undefined) return
    const isCorrect = Number(answers[question.id]) === question.answer
    const weight = difficultyWeight[question.difficulty] || 1
    if (isCorrect) { correct += 1; weightedCorrect += weight }
    weightedTotal += weight
    const current = stats.get(question.competency) || { correct: 0, total: 0, weightedCorrect: 0, weightedTotal: 0, totalMs: 0 }
    current.total += 1; current.weightedTotal += weight; current.totalMs += Number(responseTimes[question.id] || 0)
    if (isCorrect) { current.correct += 1; current.weightedCorrect += weight }
    stats.set(question.competency, current)
    if (!isCorrect) misses.push({ id: question.id, competency: question.competency, difficulty: question.difficulty, prompt: question.prompt, explanation: question.explanation, selected: question.options[Number(answers[question.id])], correctAnswer: question.options[question.answer] })
  })
  const competencies = Array.from(stats.entries()).map(([name, value]) => {
    const target = targetMap.get(name)
    return { name, score: Math.round((value.weightedCorrect / value.weightedTotal) * 100), correct: value.correct, total: value.total, avgSeconds: value.totalMs ? Math.round(value.totalMs / value.total / 1000) : null, importance: target?.weight || 0.75, rationale: target?.rationale || 'Included to establish a broad preparation baseline.', evidence: value.total >= 2 ? 'Moderate evidence' : 'Initial evidence' }
  }).sort((a, b) => a.score - b.score)
  return { score: weightedTotal ? Math.round((weightedCorrect / weightedTotal) * 100) : 0, correct, total: Object.keys(answers).length, competencies, misses }
}

export function buildReadiness(profile, result) {
  const days = daysUntil(profile.targetDate)
  const weighted = result.competencies.reduce((sum, item) => sum + item.score * item.importance, 0)
  const totalImportance = result.competencies.reduce((sum, item) => sum + item.importance, 0) || 1
  const skillScore = weighted / totalImportance
  const evidenceCount = result.total + (result.retests || 0)
  const evidenceFactor = clamp(evidenceCount / (profile.track === 'campus' ? 14 : 10), 0.45, 1)
  const timeFactor = clamp(days / 42, 0, 1) * 5
  const readiness = clamp(Math.round(skillScore * (0.88 + 0.07 * evidenceFactor) + timeFactor), 0, 100)
  return { readiness, days, label: readiness >= 80 ? 'Strong position' : readiness >= 60 ? 'Building readiness' : 'Priority gaps remain', confidence: evidenceCount >= (profile.track === 'campus' ? 11 : 9) ? 'Moderate confidence' : 'Early estimate' }
}

export function buildGapList(result) {
  return result.competencies.map((item) => {
    const gap = 100 - item.score; const priority = clamp(Math.round(gap * item.importance), 1, 100)
    const missCount = result.misses.filter((miss) => miss.competency === item.name).length
    const diagnosticReason = missCount ? `${missCount} diagnostic miss${missCount === 1 ? '' : 'es'}; target importance ${item.importance.toFixed(2)}×.` : 'No diagnostic miss in the current sample; keep validating as evidence grows.'
    const retestReason = item.latestRetest ? ` Latest learning-block re-test: ${item.latestRetest}.` : ''
    return { ...item, gap, priority, reason: diagnosticReason + retestReason }
  }).sort((a, b) => b.priority - a.priority)
}

function campusPhases(days) {
  if (days <= 7) return [['Days 1–2','Prioritize aptitude, reasoning, and programming fundamentals; repair obvious weak spots.'],['Days 3–4','Timed coding plus core-CS revision: OOP, DBMS/SQL, OS, and networking.'],['Days 5–6','Run company-style mixed assessments and rehearse project/HR answers.'],['Final day','Light recall, resume/project review, and concise mock interview practice.']]
  if (days <= 30) return [['Baseline repair','Close gaps in quantitative aptitude, reasoning, verbal ability, and programming fundamentals.'],['Coding fluency','Practice arrays, strings, hashing, data structures, and common algorithm patterns under time limits.'],['Core CS','Review OOP, DBMS/SQL, operating systems, and computer networks with short retrieval checks.'],['Company simulations','Use current public hiring evidence to run TCS/Infosys/Cognizant/HCLTech/Wipro-style mixed practice without assuming leaked questions.'],['Interview finish','Polish projects, resume walkthrough, communication, HR answers, and mock interviews.']]
  return [['Foundation','Build dependable aptitude, reasoning, communication, and programming fundamentals.'],['Technical breadth','Strengthen DSA plus OOP, DBMS/SQL, operating systems, and networking.'],['Timed practice','Increase speed through mixed aptitude and coding sets with systematic error review.'],['Company-specific layer','Use live public-source research to adapt emphasis for the campus employers actually hiring.'],['Mock cycle','Alternate online-assessment simulations, technical interviews, project explanations, and HR practice.'],['Final review','Protect strong areas, revisit recurring mistakes, and keep last-day preparation concise.']]
}

export function buildPlan(profile, result) {
  const gaps = buildGapList(result); const days = Math.max(daysUntil(profile.targetDate), 1)
  const totalMinutes = Math.max(30, Math.floor((days / 7) * Number(profile.daysPerWeek || 5) * Number(profile.minutesPerDay || 60)))
  const totalWeight = gaps.reduce((sum, gap) => sum + Math.max(gap.priority, 8), 0) || 1
  const focus = gaps.slice(0, profile.track === 'campus' ? 6 : 5).map((gap) => ({ competency: gap.name, current: gap.score, priority: gap.priority, minutes: Math.max(30, Math.round((totalMinutes * Math.max(gap.priority, 8)) / totalWeight / 15) * 15), action: gap.score < 50 ? 'Repair prerequisite knowledge, then use guided practice' : gap.score < 80 ? 'Targeted practice, error review, and retrieval' : 'Maintenance plus timed mixed practice' }))
  const phases = profile.track === 'campus' ? campusPhases(days) : days <= 7 ? [['Today–Day 3','Attack the top two gaps with short teaching blocks and immediate practice.'],['Day 4–5','Mixed timed practice; revisit errors and weak prerequisites.'],['Final 1–2 days','Mock conditions, concise review, and confidence-building recall.']] : days <= 30 ? [['Foundation','Repair prerequisite gaps and build reliable methods.'],['Practice','Increase question variety and reduce reliance on hints.'],['Simulation','Use timed mixed practice and realistic mock sessions.'],['Final review','Consolidate error patterns and high-value recall.']] : [['Foundation','Close prerequisite gaps with focused learning.'],['Depth','Build target-level proficiency in the highest-impact competencies.'],['Fluency','Increase speed, transfer, and mixed-problem performance.'],['Mock cycle','Run realistic simulations, analyze errors, and re-plan.'],['Final review','Protect strong areas and rehearse high-value concepts.']]
  return { totalMinutes, focus, phases }
}
