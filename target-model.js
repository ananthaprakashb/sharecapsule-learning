const normalize = (value = '') => String(value).trim().toLowerCase()
const hasAny = (text, words) => words.some((word) => text.includes(word))

const competency = (name, weight, rationale, keywords = []) => ({ name, weight, rationale, keywords })

const interviewFamilies = [
  {
    match: ['frontend', 'front end', 'react', 'ui engineer', 'web engineer'],
    competencies: [
      competency('JavaScript', 1.15, 'Core language fluency is central to frontend implementation and debugging.', ['javascript', 'typescript', 'node']),
      competency('Frontend', 1.2, 'The role calls for browser, rendering, component, and state-management judgment.', ['react', 'frontend', 'css', 'html']),
      competency('API design', 0.8, 'Frontend engineers routinely integrate and reason about service contracts.', ['api', 'rest', 'graphql']),
      competency('Debugging', 1.0, 'Production diagnosis and root-cause reasoning transfer strongly to frontend work.', ['debug', 'performance', 'latency']),
      competency('Problem solving', 0.95, 'Structured reasoning is usually evaluated even when the role is framework-heavy.', ['coding', 'algorithm', 'problem']),
      competency('Behavioral communication', 0.85, 'Clear tradeoff and collaboration stories matter in interview performance.', ['behavioral', 'communication', 'leadership']),
    ],
  },
  {
    match: ['backend', 'back end', 'server', 'java', 'node', 'golang', 'go developer', 'platform engineer'],
    competencies: [
      competency('Algorithms', 1.05, 'Backend interviews commonly require efficient solution design.', ['algorithm', 'coding']),
      competency('Data structures', 1.0, 'Choosing the right data structure affects correctness and complexity.', ['data structure', 'tree', 'hash']),
      competency('System design', 1.2, 'Backend roles require reasoning about scale, storage, consistency, and failure.', ['system design', 'distributed', 'scalability']),
      competency('Data & SQL', 1.0, 'Persistence, indexing, and query tradeoffs are common backend concerns.', ['sql', 'database', 'data']),
      competency('API design', 0.95, 'Service contracts and HTTP semantics are core backend responsibilities.', ['api', 'rest']),
      competency('Debugging', 0.95, 'Operational diagnosis helps validate production engineering maturity.', ['debug', 'incident', 'latency']),
      competency('Behavioral communication', 0.8, 'Interviewers need evidence of ownership, collaboration, and impact.', ['behavioral', 'leadership']),
    ],
  },
  {
    match: ['sre', 'site reliability', 'devops', 'production engineer', 'infrastructure', 'cloud engineer'],
    competencies: [
      competency('Debugging', 1.25, 'Incident isolation and evidence-driven diagnosis are central to reliability work.', ['debug', 'incident', 'observability']),
      competency('System design', 1.15, 'Reliability work depends on architecture, capacity, and failure-mode reasoning.', ['system design', 'scalability', 'distributed']),
      competency('Reliability', 1.25, 'The target role needs SLO, resilience, and operational tradeoff judgment.', ['slo', 'reliability', 'availability']),
      competency('Networking', 0.95, 'Network and protocol fundamentals are frequent root causes in distributed systems.', ['network', 'dns', 'tcp', 'http']),
      competency('Data & SQL', 0.75, 'Operational work often requires querying and understanding service data.', ['sql', 'database']),
      competency('Behavioral communication', 0.9, 'Incident leadership requires concise communication and ownership.', ['behavioral', 'leadership', 'communication']),
    ],
  },
  {
    match: ['software engineer', 'software development engineer', 'swe', 'developer', 'full stack', 'fullstack'],
    competencies: [
      competency('Algorithms', 1.15, 'Efficient problem solving is a common baseline for software-engineering interviews.', ['algorithm', 'coding']),
      competency('Data structures', 1.05, 'Data-structure selection drives complexity and implementation quality.', ['data structure', 'tree', 'hash']),
      competency('Problem solving', 1.0, 'The interview process rewards clear assumptions, tradeoffs, and solution iteration.', ['coding', 'problem']),
      competency('System design', 1.0, 'Architecture depth becomes increasingly important as role seniority rises.', ['system design', 'distributed']),
      competency('Debugging', 0.8, 'Debugging reveals practical engineering judgment beyond textbook answers.', ['debug', 'incident']),
      competency('Behavioral communication', 0.85, 'Strong technical performance still depends on clear communication and examples.', ['behavioral', 'leadership']),
    ],
  },
]

const academicFamilies = [
  {
    match: ['algebra', 'math', 'mathematics', 'precalculus', 'pre-calculus'],
    competencies: [
      competency('Number sense', 0.75, 'Numerical fluency supports later algebraic manipulation.', ['fractions', 'numbers']),
      competency('Algebraic reasoning', 1.2, 'Equation and symbolic reasoning are central to the stated mathematics target.', ['algebra', 'equation']),
      competency('Functions', 1.1, 'Function interpretation is a high-leverage bridge to advanced algebra.', ['function']),
      competency('Probability', 0.65, 'Probability may appear when the course or exam includes statistics topics.', ['probability', 'statistics']),
      competency('Learning strategy', 0.55, 'Retrieval and error review improve exam preparation efficiency.', ['study', 'exam']),
    ],
  },
  {
    match: ['biology', 'life science', 'ap bio'],
    competencies: [
      competency('Biology foundations', 1.2, 'Core cellular and biological concepts support higher-level reasoning.', ['biology', 'cell', 'genetics']),
      competency('Scientific reasoning', 1.1, 'Experiments, variables, and evidence interpretation are essential in science exams.', ['experiment', 'science']),
      competency('Evidence & inference', 0.7, 'Reading and interpreting evidence matters for data-heavy science questions.', ['evidence', 'reading']),
      competency('Learning strategy', 0.55, 'Active recall and spaced review improve retention of terminology and processes.', ['study', 'exam']),
    ],
  },
  {
    match: ['chemistry', 'chem'],
    competencies: [
      competency('Chemistry foundations', 1.2, 'Atomic structure and chemical principles anchor later chemistry topics.', ['chemistry', 'atom']),
      competency('Scientific reasoning', 1.05, 'Chemistry assessment depends on variables, evidence, and quantitative reasoning.', ['experiment', 'science']),
      competency('Number sense', 0.75, 'Quantitative fluency supports stoichiometry and measurement.', ['math', 'number']),
      competency('Learning strategy', 0.5, 'Frequent retrieval helps consolidate equations, patterns, and vocabulary.', ['study', 'exam']),
    ],
  },
  {
    match: ['physics', 'mechanics'],
    competencies: [
      competency('Physics foundations', 1.2, 'Motion, force, and quantitative modeling anchor many physics courses.', ['physics', 'motion']),
      competency('Scientific reasoning', 1.0, 'Physics requires translating evidence and assumptions into models.', ['experiment', 'science']),
      competency('Algebraic reasoning', 0.9, 'Rearranging equations is essential for quantitative physics work.', ['algebra', 'equation']),
      competency('Learning strategy', 0.5, 'Mixed retrieval practice improves transfer across problem types.', ['study', 'exam']),
    ],
  },
  {
    match: ['english', 'language arts', 'reading', 'writing', 'literature'],
    competencies: [
      competency('Evidence & inference', 1.2, 'Analytical reading depends on selecting and explaining relevant evidence.', ['reading', 'evidence']),
      competency('Writing & argument', 1.1, 'The target requires organizing claims, evidence, and reasoning clearly.', ['writing', 'essay']),
      competency('Learning strategy', 0.5, 'Retrieval and deliberate practice help with vocabulary and analysis patterns.', ['study', 'exam']),
    ],
  },
]

function seniorityFactor(level = '', experience = '') {
  const text = normalize(level)
  const years = Number(experience || 0)
  if (hasAny(text, ['staff', 'principal', 'senior', 'l6', 'l7', 'sde iii', 'lead']) || years >= 8) return 1.18
  if (hasAny(text, ['l5', 'sde ii', 'mid']) || years >= 4) return 1.08
  if (hasAny(text, ['intern', 'entry', 'junior', 'l3', 'new grad']) || years < 2) return 0.92
  return 1
}

export function buildTargetModel(profile) {
  const track = profile.track
  const text = [profile.subject, profile.examName, profile.topics, profile.role, profile.level, profile.skills, profile.jobDescription]
    .filter(Boolean).join(' ').toLowerCase()
  const families = track === 'interview' ? interviewFamilies : academicFamilies
  const matches = families.filter((family) => hasAny(text, family.match))
  const selected = matches.length ? matches : [track === 'interview' ? interviewFamilies[3] : academicFamilies[0]]
  const merged = new Map()

  selected.flatMap((family) => family.competencies).forEach((item) => {
    const existing = merged.get(item.name)
    if (!existing || item.weight > existing.weight) merged.set(item.name, { ...item })
  })

  const explicit = normalize(track === 'interview' ? `${profile.skills} ${profile.jobDescription}` : profile.topics)
  const seniority = track === 'interview' ? seniorityFactor(profile.level, profile.experience) : 1
  const competencies = [...merged.values()].map((item) => {
    const explicitBoost = item.keywords.some((keyword) => explicit.includes(keyword)) ? 1.18 : 1
    let weight = item.weight * explicitBoost
    if (track === 'interview' && item.name === 'System design') weight *= seniority
    return { ...item, weight: Number(weight.toFixed(2)) }
  }).sort((a, b) => b.weight - a.weight)

  const label = track === 'interview'
    ? [profile.company, profile.role, profile.level].filter(Boolean).join(' · ')
    : [profile.grade, profile.subject, profile.examName].filter(Boolean).join(' · ')

  const levelText = normalize(profile.level)
  const difficulty = track === 'interview' && (seniority > 1.1 || hasAny(levelText, ['staff', 'principal'])) ? 'advanced' : 'core'

  return {
    track,
    label: label || (track === 'interview' ? 'Interview target' : 'Academic target'),
    difficulty,
    competencies,
    source: 'Built from the target details you provided. Company-specific public-source research is not yet used in this client-only phase.',
  }
}
