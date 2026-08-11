import { diagnosticBank, difficultyRank, fallbackQuestions } from './diagnostics.js'
import { buildTargetModel } from './target-model.js'

const clamp = (value, min, max) => Math.min(max, Math.max(min, value))
const difficultyWeight = { foundation: 0.85, core: 1, advanced: 1.2 }

export function daysUntil(dateString, now = new Date()) {
  if (!dateString) return 0
  const target = new Date(`${dateString}T23:59:59`)
  const diff = target.getTime() - now.getTime()
  return Math.max(0, Math.ceil(diff / 86400000))
}

function targetLookup(model) {
  return new Map(model.competencies.map((item) => [item.name, item]))
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
  const haystack = [profile.subject, profile.topics, profile.examName, profile.company, profile.role, profile.level, profile.skills, profile.jobDescription]
    .filter(Boolean).join(' ').toLowerCase()
  const targetMap = targetLookup(model)
  const pool = diagnosticBank.filter((item) => item.track === track)
  const chosen = []

  for (const competency of model.competencies.slice(0, 6)) {
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
      if (chosen.length >= Math.min(maxQuestions, 5)) break
      if (!chosen.some((existing) => existing.competency === item.competency)) chosen.push(item)
    }
  }

  if (!chosen.length) chosen.push(...fallbackQuestions[track].slice(0, Math.min(maxQuestions, 5)))
  return { model, questions: chosen.slice(0, maxQuestions), maxQuestions }
}

export function getAdaptiveFollowUp(profile, model, askedQuestions, answers, currentQuestion, maxQuestions = 10) {
  if (!currentQuestion || askedQuestions.length >= maxQuestions) return null
  const askedIds = new Set(askedQuestions.map((item) => item.id))
  const isCorrect = Number(answers[currentQuestion.id]) === currentQuestion.answer
  const currentRank = difficultyRank[currentQuestion.difficulty] || 2
  const sameCompetencyCount = askedQuestions.filter((q) => q.competency === currentQuestion.competency).length
  const trackPool = diagnosticBank.filter((q) => q.track === profile.track && !askedIds.has(q.id))

  if (!isCorrect && currentQuestion.prerequisites?.length) {
    for (const prerequisite of currentQuestion.prerequisites) {
      const candidate = trackPool
        .filter((q) => q.competency === prerequisite)
        .sort((a, b) => (difficultyRank[a.difficulty] || 2) - (difficultyRank[b.difficulty] || 2))[0]
      if (candidate) return { ...candidate, adaptiveReason: `Checking prerequisite: ${prerequisite}` }
    }
  }

  if (sameCompetencyCount < 2) {
    const desiredRank = isCorrect ? Math.min(3, currentRank + 1) : Math.max(1, currentRank - 1)
    const candidate = trackPool
      .filter((q) => q.competency === currentQuestion.competency)
      .sort((a, b) => Math.abs((difficultyRank[a.difficulty] || 2) - desiredRank) - Math.abs((difficultyRank[b.difficulty] || 2) - desiredRank))[0]
    if (candidate) return {
      ...candidate,
      adaptiveReason: isCorrect ? `Increasing difficulty in ${currentQuestion.competency}` : `Rechecking ${currentQuestion.competency} at a more foundational level`,
    }
  }

  return null
}

export function scoreDiagnostic(questions, answers, responseTimes = {}, model = null) {
  const stats = new Map()
  const targetMap = model ? targetLookup(model) : new Map()
  let correct = 0
  let weightedCorrect = 0
  let weightedTotal = 0
  const misses = []

  questions.forEach((question) => {
    const answered = answers[question.id] !== undefined
    if (!answered) return
    const isCorrect = Number(answers[question.id]) === question.answer
    const weight = difficultyWeight[question.difficulty] || 1
    if (isCorrect) { correct += 1; weightedCorrect += weight }
    weightedTotal += weight
    const current = stats.get(question.competency) || { correct: 0, total: 0, weightedCorrect: 0, weightedTotal: 0, totalMs: 0 }
    current.total += 1
    current.weightedTotal += weight
    current.totalMs += Number(responseTimes[question.id] || 0)
    if (isCorrect) { current.correct += 1; current.weightedCorrect += weight }
    stats.set(question.competency, current)
    if (!isCorrect) misses.push({
      id: question.id,
      competency: question.competency,
      difficulty: question.difficulty,
      prompt: question.prompt,
      explanation: question.explanation,
      selected: question.options[Number(answers[question.id])],
      correctAnswer: question.options[question.answer],
    })
  })

  const competencies = Array.from(stats.entries()).map(([name, value]) => {
    const target = targetMap.get(name)
    const score = Math.round((value.weightedCorrect / value.weightedTotal) * 100)
    const avgSeconds = value.totalMs ? Math.round(value.totalMs / value.total / 1000) : null
    const evidence = value.total >= 2 ? 'Moderate evidence' : 'Initial evidence'
    return {
      name, score, correct: value.correct, total: value.total, avgSeconds,
      importance: target?.weight || 0.75,
      rationale: target?.rationale || 'Included to establish a broad preparation baseline.',
      evidence,
    }
  }).sort((a, b) => a.score - b.score)

  return {
    score: weightedTotal ? Math.round((weightedCorrect / weightedTotal) * 100) : 0,
    correct,
    total: Object.keys(answers).length,
    competencies,
    misses,
  }
}

export function buildReadiness(profile, result) {
  const days = daysUntil(profile.targetDate)
  const weighted = result.competencies.reduce((sum, item) => sum + item.score * item.importance, 0)
  const totalImportance = result.competencies.reduce((sum, item) => sum + item.importance, 0) || 1
  const skillScore = weighted / totalImportance
  const evidenceFactor = clamp(result.total / 10, 0.45, 1)
  const timeFactor = clamp(days / 42, 0, 1) * 5
  const readiness = clamp(Math.round(skillScore * (0.88 + 0.07 * evidenceFactor) + timeFactor), 0, 100)
  return {
    readiness,
    days,
    label: readiness >= 80 ? 'Strong position' : readiness >= 60 ? 'Building readiness' : 'Priority gaps remain',
    confidence: result.total >= 9 ? 'Moderate confidence' : 'Early estimate',
  }
}

export function buildGapList(result) {
  return result.competencies.map((item) => {
    const gap = 100 - item.score
    const priority = clamp(Math.round(gap * item.importance), 1, 100)
    const missCount = result.misses.filter((miss) => miss.competency === item.name).length
    const reason = missCount
      ? `${missCount} miss${missCount === 1 ? '' : 'es'} in ${item.total} measured question${item.total === 1 ? '' : 's'}; target importance ${item.importance.toFixed(2)}×.`
      : `No miss in the current sample; keep validating as the diagnostic expands.`
    return { ...item, gap, priority, reason }
  }).sort((a, b) => b.priority - a.priority)
}

export function buildPlan(profile, result) {
  const gaps = buildGapList(result)
  const days = Math.max(daysUntil(profile.targetDate), 1)
  const daysPerWeek = Number(profile.daysPerWeek || 5)
  const minutesPerDay = Number(profile.minutesPerDay || 60)
  const totalMinutes = Math.max(30, Math.floor((days / 7) * daysPerWeek * minutesPerDay))
  const totalWeight = gaps.reduce((sum, gap) => sum + Math.max(gap.priority, 8), 0) || 1
  const focus = gaps.slice(0, 5).map((gap) => ({
    competency: gap.name,
    current: gap.score,
    priority: gap.priority,
    minutes: Math.max(30, Math.round((totalMinutes * Math.max(gap.priority, 8)) / totalWeight / 15) * 15),
    action: gap.score < 50 ? 'Repair prerequisite knowledge, then use guided practice' : gap.score < 80 ? 'Targeted practice, error review, and retrieval' : 'Maintenance plus timed mixed practice',
  }))
  const phases = days <= 7
    ? [['Today–Day 3', 'Attack the top two gaps with short teaching blocks and immediate practice.'], ['Day 4–5', 'Mixed timed practice; revisit errors and weak prerequisites.'], ['Final 1–2 days', 'Mock conditions, concise review, and confidence-building recall.']]
    : days <= 30
      ? [['Foundation', 'Repair prerequisite gaps and build reliable methods.'], ['Practice', 'Increase question variety and reduce reliance on hints.'], ['Simulation', 'Use timed mixed practice and realistic mock sessions.'], ['Final review', 'Consolidate error patterns and high-value recall.']]
      : [['Foundation', 'Close prerequisite gaps with focused learning.'], ['Depth', 'Build target-level proficiency in the highest-impact competencies.'], ['Fluency', 'Increase speed, transfer, and mixed-problem performance.'], ['Mock cycle', 'Run realistic simulations, analyze errors, and re-plan.'], ['Final review', 'Protect strong areas and rehearse high-value concepts.']]
  return { totalMinutes, focus, phases }
}
