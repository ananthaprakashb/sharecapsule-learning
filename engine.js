import { diagnosticBank, fallbackQuestions } from './diagnostics.js'

const clamp = (value, min, max) => Math.min(max, Math.max(min, value))

export function daysUntil(dateString, now = new Date()) {
  if (!dateString) return 0
  const target = new Date(`${dateString}T23:59:59`)
  const diff = target.getTime() - now.getTime()
  return Math.max(0, Math.ceil(diff / 86400000))
}

export function buildDiagnostic(profile, maxQuestions = 8) {
  const track = profile.track
  const haystack = [profile.subject, profile.topics, profile.examName, profile.company, profile.role, profile.level, profile.skills, profile.jobDescription]
    .filter(Boolean).join(' ').toLowerCase()
  const trackQuestions = diagnosticBank.filter((item) => item.track === track)
  const scored = trackQuestions.map((item, index) => {
    const matches = item.keywords.reduce((sum, keyword) => sum + (haystack.includes(keyword) ? 1 : 0), 0)
    return { item, score: matches * 10 - index / 100 }
  })
  const prioritized = scored.filter(({ score }) => score > 0).sort((a, b) => b.score - a.score).map(({ item }) => item)
  const pool = [...prioritized, ...fallbackQuestions[track].filter((item) => !prioritized.some((p) => p.id === item.id))]
  return pool.slice(0, maxQuestions)
}

export function scoreDiagnostic(questions, answers) {
  const stats = new Map()
  let correct = 0
  questions.forEach((question) => {
    const isCorrect = Number(answers[question.id]) === question.answer
    if (isCorrect) correct += 1
    const current = stats.get(question.competency) || { correct: 0, total: 0 }
    current.total += 1
    if (isCorrect) current.correct += 1
    stats.set(question.competency, current)
  })
  const competencies = Array.from(stats.entries()).map(([name, value]) => ({
    name,
    score: Math.round((value.correct / value.total) * 100),
    correct: value.correct,
    total: value.total,
  })).sort((a, b) => a.score - b.score)
  return { score: questions.length ? Math.round((correct / questions.length) * 100) : 0, correct, total: questions.length, competencies }
}

export function buildReadiness(profile, result) {
  const days = daysUntil(profile.targetDate)
  const timeFactor = clamp(days / 42, 0, 1) * 8
  const readiness = clamp(Math.round(result.score * 0.9 + timeFactor), 0, 100)
  return {
    readiness,
    days,
    label: readiness >= 80 ? 'Strong position' : readiness >= 60 ? 'Building readiness' : 'Priority gaps remain',
  }
}

export function buildGapList(result) {
  return result.competencies.map((item, index) => ({
    ...item,
    gap: 100 - item.score,
    priority: clamp(Math.round((100 - item.score) * (1 - index * 0.03)), 1, 100),
  })).sort((a, b) => b.priority - a.priority)
}

export function buildPlan(profile, result) {
  const gaps = buildGapList(result)
  const days = Math.max(daysUntil(profile.targetDate), 1)
  const daysPerWeek = Number(profile.daysPerWeek || 5)
  const minutesPerDay = Number(profile.minutesPerDay || 60)
  const totalMinutes = Math.max(30, Math.floor((days / 7) * daysPerWeek * minutesPerDay))
  const totalWeight = gaps.reduce((sum, gap) => sum + Math.max(gap.gap, 10), 0) || 1
  const focus = gaps.slice(0, 5).map((gap) => ({
    competency: gap.name,
    current: gap.score,
    minutes: Math.max(30, Math.round((totalMinutes * Math.max(gap.gap, 10)) / totalWeight / 15) * 15),
    action: gap.score < 50 ? 'Rebuild fundamentals + guided practice' : gap.score < 80 ? 'Targeted practice + retrieval' : 'Maintenance + timed practice',
  }))
  const phases = days <= 7
    ? [['Today–Day 3', 'Attack the top two gaps with short teaching blocks and immediate practice.'], ['Day 4–5', 'Mixed timed practice; revisit errors and weak prerequisites.'], ['Final 1–2 days', 'Mock conditions, concise review, and confidence-building recall.']]
    : days <= 30
      ? [['Foundation', 'Repair prerequisite gaps and build reliable methods.'], ['Practice', 'Increase question variety and reduce reliance on hints.'], ['Simulation', 'Use timed mixed practice and realistic mock sessions.'], ['Final review', 'Consolidate error patterns and high-value recall.']]
      : [['Foundation', 'Close prerequisite gaps with focused learning.'], ['Depth', 'Build target-level proficiency in the highest-impact competencies.'], ['Fluency', 'Increase speed, transfer, and mixed-problem performance.'], ['Mock cycle', 'Run realistic simulations, analyze errors, and re-plan.'], ['Final review', 'Protect strong areas and rehearse high-value concepts.']]
  return { totalMinutes, focus, phases }
}
