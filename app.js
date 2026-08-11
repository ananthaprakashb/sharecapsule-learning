import { buildDiagnostic, buildGapList, buildPlan, buildReadiness, getAdaptiveFollowUp, scoreDiagnostic } from './engine.js'

const app = document.querySelector('#app')
const initialProfile = {
  track: '', targetDate: '', daysPerWeek: 5, minutesPerDay: 60,
  grade: '', subject: '', examName: '', topics: '', currentScore: '', desiredScore: '',
  company: '', role: '', level: '', experience: '', skills: '', jobDescription: '',
}

const state = {
  profile: loadProfile(), stage: 'intake', questions: [], answers: {}, questionIndex: 0,
  result: null, model: null, maxQuestions: 10, startedAt: {}, responseTimes: {},
}

function loadProfile() {
  try { return { ...initialProfile, ...JSON.parse(localStorage.getItem('prepare-profile') || '{}') } }
  catch { return { ...initialProfile } }
}

function saveProfile() { localStorage.setItem('prepare-profile', JSON.stringify(state.profile)) }
const escapeHtml = (value = '') => String(value).replace(/[&<>'"]/g, (char) => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', "'":'&#39;', '"':'&quot;' })[char])
const today = new Date().toISOString().slice(0, 10)

function shell(content, progressStep = 0) {
  return `<div class="app-shell">
    <header class="site-header"><a class="brand" href="#" data-action="home"><span class="brand-mark">S</span><span><b>shareCapsule</b><small>PREPARE</small></span></a><div class="header-note">Adaptive diagnostic-first learning</div></header>
    <main>
      <section class="hero"><div class="hero-copy"><div class="eyebrow">Prepare for the goal, not just the syllabus.</div><h1>Know the gap.<br><em>Master what matters.</em></h1><p>Tell us where you need to be and when. We’ll measure where you are today, probe weak prerequisites, and turn the difference into a focused preparation plan.</p></div>
      <div class="hero-proof"><span>01</span><p><strong>Model the target.</strong> Your role, level, grade and topics shape what gets tested.</p><span>02</span><p><strong>Adapt the diagnostic.</strong> Correct answers get harder; misses trigger deeper checks.</p><span>03</span><p><strong>Explain the gap.</strong> See the evidence behind every priority.</p></div></section>
      ${progress(progressStep)}
      ${content}
    </main>
    <footer><span>ShareCapsule Prepare · Adaptive Phase 1</span><span>Preparation guidance, not an outcome guarantee.</span></footer>
  </div>`
}

function progress(step) {
  return `<div class="progress" aria-label="Preparation progress">${['Goal','Diagnostic','Gap analysis','Plan'].map((label, index) => `<div class="progress-item ${index <= step ? 'active' : ''}"><span>${index + 1}</span><small>${label}</small></div>`).join('')}</div>`
}

function field(label, inputMarkup, hint = '') { return `<label class="field"><span>${label}</span>${inputMarkup}${hint ? `<small>${hint}</small>` : ''}</label>` }
function input(name, value, options = '') { return `<input name="${name}" value="${escapeHtml(value)}" ${options}>` }
function textarea(name, value, rows = 3, placeholder = '') { return `<textarea name="${name}" rows="${rows}" placeholder="${placeholder}">${escapeHtml(value)}</textarea>` }

function renderIntake() {
  const p = state.profile
  const trackFields = p.track === 'academic'
    ? `<div class="form-grid">
      ${field('Grade level', input('grade', p.grade, 'required placeholder="e.g. Grade 10"'))}
      ${field('Subject / area', input('subject', p.subject, 'required placeholder="e.g. Algebra II"'))}
      ${field('Exam / course name', input('examName', p.examName, 'placeholder="e.g. Fall final"'))}
      ${field('Current score', input('currentScore', p.currentScore, 'placeholder="e.g. 72% or B-"'))}
      ${field('Desired result', input('desiredScore', p.desiredScore, 'placeholder="e.g. 90% or A"'))}
      ${field('Topics to cover', textarea('topics', p.topics, 3, 'Quadratics, logarithms, sequences…'), 'Specific topics make the competency model more targeted.')}
    </div>`
    : p.track === 'interview'
      ? `<div class="form-grid">
        ${field('Company', input('company', p.company, 'required placeholder="e.g. Amazon"'))}
        ${field('Target role', input('role', p.role, 'required placeholder="e.g. Software Development Engineer"'))}
        ${field('Level', input('level', p.level, 'placeholder="e.g. SDE II / L5"'))}
        ${field('Years of experience', input('experience', p.experience, 'type="number" min="0" step="0.5" placeholder="5"'))}
        ${field('Key skills', input('skills', p.skills, 'placeholder="React, Java, system design…"'))}
        ${field('Job description / known interview focus', textarea('jobDescription', p.jobDescription, 4, 'Paste the important parts of the job description…'), 'Used locally to weight competencies. Public-source company research comes in the next connected-data phase.')}
      </div>` : ''

  app.innerHTML = shell(`<section class="panel intake-panel">
    <div class="eyebrow">Step 1 · Define the target</div><h2>What do you need to be ready for?</h2>
    <p class="lede">We build a target competency model first, then measure your current condition before recommending what to study.</p>
    <div class="track-grid">
      <button type="button" class="track-card ${p.track === 'academic' ? 'selected' : ''}" data-track="academic"><span class="track-icon">A+</span><strong>Academic / Exam</strong><small>Grade-level subjects, finals, certifications and entrance exams.</small></button>
      <button type="button" class="track-card ${p.track === 'interview' ? 'selected' : ''}" data-track="interview"><span class="track-icon">⌘</span><strong>Company / Role Interview</strong><small>Target a company, role, level and interview date.</small></button>
    </div>
    ${p.track ? `<form id="intake-form"><div class="form-grid common-grid">
      ${field(p.track === 'academic' ? 'Target exam date' : 'Interview date', `<input required type="date" min="${today}" name="targetDate" value="${escapeHtml(p.targetDate)}">`)}
      ${field('Study days per week', `<input required min="1" max="7" type="number" name="daysPerWeek" value="${escapeHtml(p.daysPerWeek)}">`)}
      ${field('Minutes available per day', `<input required min="15" step="15" type="number" name="minutesPerDay" value="${escapeHtml(p.minutesPerDay)}">`)}
    </div>${trackFields}<div class="privacy-note">This version still runs entirely in your browser. Target details are used locally to select and adapt questions; they are not uploaded by this static site.</div>
    <button class="primary-button" type="submit">Build target & start diagnostic <span>→</span></button></form>` : ''}
  </section>`, 0)
  bindCommon()
  document.querySelectorAll('[data-track]').forEach((button) => button.addEventListener('click', () => {
    state.profile.track = button.dataset.track; saveProfile(); renderIntake()
  }))
  const form = document.querySelector('#intake-form')
  if (form) {
    form.addEventListener('input', (event) => { if (event.target.name) { state.profile[event.target.name] = event.target.value; saveProfile() } })
    form.addEventListener('submit', (event) => {
      event.preventDefault()
      const data = new FormData(form); for (const [key, value] of data.entries()) state.profile[key] = value
      saveProfile()
      const session = buildDiagnostic(state.profile, 10)
      state.model = session.model; state.questions = session.questions; state.maxQuestions = session.maxQuestions
      state.answers = {}; state.questionIndex = 0; state.stage = 'diagnostic'; state.startedAt = {}; state.responseTimes = {}
      renderDiagnostic(); window.scrollTo({ top: 0, behavior: 'smooth' })
    })
  }
}

function renderDiagnostic() {
  const q = state.questions[state.questionIndex]
  if (!q) { state.stage = 'intake'; return renderIntake() }
  if (!state.startedAt[q.id]) state.startedAt[q.id] = Date.now()
  const selected = state.answers[q.id]
  const targetCompetency = state.model?.competencies.find((item) => item.name === q.competency)
  const progressPercent = Math.min(100, ((state.questionIndex + 1) / state.maxQuestions) * 100)
  app.innerHTML = shell(`<section class="panel diagnostic-panel">
    <div class="diagnostic-head"><div><div class="eyebrow">Adaptive diagnostic · Question ${state.questionIndex + 1} · up to ${state.maxQuestions}</div><h2>${escapeHtml(q.competency)}</h2></div><button class="text-button" data-action="edit-goal">Edit goal</button></div>
    <div class="target-strip"><div><span>Target</span><strong>${escapeHtml(state.model?.label || '')}</strong></div><div><span>Why test this</span><strong>${escapeHtml(targetCompetency?.rationale || 'Broad baseline coverage')}</strong></div></div>
    <div class="meter"><span style="width:${progressPercent}%"></span></div>
    <div class="question-card"><div class="question-meta"><span>${escapeHtml(q.difficulty)}</span><span>${escapeHtml(q.competency)}</span>${q.adaptiveReason ? `<span class="adaptive-tag">${escapeHtml(q.adaptiveReason)}</span>` : ''}</div><h3>${escapeHtml(q.prompt)}</h3>
    <div class="option-list">${q.options.map((option, index) => `<button type="button" class="option ${selected === index ? 'chosen' : ''}" data-option="${index}"><span>${String.fromCharCode(65 + index)}</span>${escapeHtml(option)}</button>`).join('')}</div></div>
    <div class="diagnostic-actions"><small>Your next question may change based on this answer. Response time is recorded locally as supporting evidence.</small><button class="primary-button compact" data-action="next" ${selected === undefined ? 'disabled' : ''}>Continue <span>→</span></button></div>
  </section>`, 1)
  bindCommon()
  document.querySelector('[data-action="edit-goal"]').addEventListener('click', renderIntake)
  const nextButton = document.querySelector('[data-action="next"]')
  document.querySelectorAll('[data-option]').forEach((button) => button.addEventListener('click', () => {
    state.answers[q.id] = Number(button.dataset.option)
    document.querySelectorAll('[data-option]').forEach((option) => option.classList.toggle('chosen', option === button))
    nextButton.disabled = false
  }))
  nextButton.addEventListener('click', () => advanceDiagnostic(q))
}

function advanceDiagnostic(q) {
  if (state.answers[q.id] === undefined) return
  if (!state.responseTimes[q.id]) state.responseTimes[q.id] = Math.max(0, Date.now() - state.startedAt[q.id])
  const followUp = getAdaptiveFollowUp(state.profile, state.model, state.questions, state.answers, q, state.maxQuestions)
  if (followUp && state.questions.length < state.maxQuestions && !state.questions.some((item) => item.id === followUp.id)) {
    state.questions.splice(state.questionIndex + 1, 0, followUp)
  }
  if (state.questionIndex < state.questions.length - 1 && state.questionIndex + 1 < state.maxQuestions) {
    state.questionIndex += 1; renderDiagnostic(); window.scrollTo({ top: 0, behavior: 'smooth' })
  } else {
    state.result = scoreDiagnostic(state.questions.slice(0, state.questionIndex + 1), state.answers, state.responseTimes, state.model)
    state.stage = 'results'; renderResults(); window.scrollTo({ top: 0, behavior: 'smooth' })
  }
}

function renderResults() {
  const result = state.result
  const readiness = buildReadiness(state.profile, result)
  const gaps = buildGapList(result)
  const plan = buildPlan(state.profile, result)
  const strongest = [...result.competencies].sort((a, b) => b.score - a.score).slice(0, 2)
  const modelItems = state.model?.competencies.slice(0, 6) || []
  app.innerHTML = shell(`<section class="results-wrap">
    <div class="results-hero panel"><div><div class="eyebrow">Initial readiness estimate · ${escapeHtml(readiness.confidence)}</div><h2>${readiness.readiness}%</h2><strong>${readiness.label}</strong><p>${readiness.days} day${readiness.days === 1 ? '' : 's'} until your target date. This score weights measured competencies by their relevance to the target and remains a preparation indicator—not a prediction of an exam or hiring outcome.</p></div>
    <div class="score-ring" style="--score:${readiness.readiness * 3.6}deg"><div><b>${result.correct}/${result.total}</b><span>answered</span></div></div></div>

    <div class="panel model-panel"><div><div class="eyebrow">Target competency model</div><h3>${escapeHtml(state.model?.label || 'Your target')}</h3><p class="support-copy">${escapeHtml(state.model?.source || '')}</p></div><div class="model-chip-list">${modelItems.map((item) => `<span><b>${escapeHtml(item.name)}</b><small>${item.weight.toFixed(2)}× relative weight</small></span>`).join('')}</div></div>

    <div class="results-grid"><div class="panel result-panel"><div class="eyebrow">Measured condition</div><h3>Where to focus first</h3><div class="skill-list">
      ${gaps.map((gap) => `<div class="skill-evidence"><div class="skill-row"><div><strong>${escapeHtml(gap.name)}</strong><span>${gap.score}% · ${gap.evidence}</span></div><div class="skill-bar"><span style="width:${Math.max(gap.score, 4)}%"></span></div><b class="${gap.score < 60 ? 'risk' : 'ok'}">${gap.score < 60 ? 'Priority gap' : gap.score < 80 ? 'Build' : 'Maintain'}</b></div><p>${escapeHtml(gap.reason)} ${escapeHtml(gap.rationale)}</p></div>`).join('')}
      </div>${strongest.length ? `<p class="support-copy">Current strengths: ${strongest.map((item) => escapeHtml(item.name)).join(' · ')}</p>` : ''}</div>
      <div class="panel result-panel plan-panel"><div class="eyebrow">Deadline-aware plan</div><h3>Allocate your available time</h3><p class="support-copy">About <strong>${Math.round(plan.totalMinutes / 60)} hours</strong> of preparation capacity at ${escapeHtml(state.profile.daysPerWeek)} day(s)/week × ${escapeHtml(state.profile.minutesPerDay)} min/day.</p>
      <div class="focus-list">${plan.focus.map((item, index) => `<div class="focus-item"><span>${String(index + 1).padStart(2, '0')}</span><div><strong>${escapeHtml(item.competency)}</strong><small>${escapeHtml(item.action)}</small></div><b>${Math.round(item.minutes / 60 * 10) / 10}h</b></div>`).join('')}</div></div></div>

    ${result.misses.length ? `<div class="panel evidence-panel"><div><div class="eyebrow">Diagnostic evidence</div><h3>What caused the gaps</h3><p class="support-copy">These misses directly contributed to the priorities above. Use them as the first error-review list.</p></div><div class="miss-list">${result.misses.slice(0, 6).map((miss) => `<details><summary><span>${escapeHtml(miss.competency)} · ${escapeHtml(miss.difficulty)}</span>${escapeHtml(miss.prompt)}</summary><p><b>Your answer:</b> ${escapeHtml(miss.selected || 'No answer')}</p><p><b>Correct:</b> ${escapeHtml(miss.correctAnswer)}</p><p>${escapeHtml(miss.explanation)}</p></details>`).join('')}</div></div>` : ''}

    <div class="panel roadmap-panel"><div><div class="eyebrow">Preparation roadmap</div><h3>How the remaining time should change</h3></div><div class="phase-grid">${plan.phases.map(([name, detail], index) => `<div class="phase"><span>${index + 1}</span><strong>${escapeHtml(name)}</strong><p>${escapeHtml(detail)}</p></div>`).join('')}</div></div>
    <div class="panel next-panel"><div><div class="eyebrow">Next intelligence layer</div><h3>Connect evidence-backed learning resources</h3><p>The diagnostic is now target-aware and adaptive. The next implementation can research authoritative public sources for the exact exam/company/role, attach citations to the target model, select videos/documents for each measured gap, and re-test after each learning block.</p></div><button class="secondary-button" data-action="restart">Prepare another goal</button></div>
  </section>`, 3)
  bindCommon()
  document.querySelector('[data-action="restart"]').addEventListener('click', reset)
}

function reset() {
  state.profile = { ...initialProfile }; state.stage = 'intake'; state.questions = []; state.answers = {}; state.questionIndex = 0; state.result = null
  state.model = null; state.startedAt = {}; state.responseTimes = {}
  localStorage.removeItem('prepare-profile'); renderIntake(); window.scrollTo({ top: 0, behavior: 'smooth' })
}

function bindCommon() {
  const home = document.querySelector('[data-action="home"]')
  if (home) home.addEventListener('click', (event) => { event.preventDefault(); renderIntake(); window.scrollTo({ top: 0, behavior: 'smooth' }) })
}

renderIntake()
