import { createProgressBundle, downloadBlob, downloadReport, ensureSignedReport, getStoredReports } from './reporting.js'

let activeKey = ''
let currentReport = null
let syncing = false

function readProfile() {
  try { return JSON.parse(localStorage.getItem('prepare-profile') || '{}') }
  catch { return {} }
}

function normalized(value = '') {
  return String(value).trim().toLowerCase().replace(/\s+/g, ' ')
}

function targetKey(profile) {
  if (profile.track === 'campus') {
    const companies = String(profile.companies || '').split(/[,;\n]/).map(normalized).filter(Boolean).sort().join('|')
    return ['campus', profile.degree, profile.branch, companies].map(normalized).join('|')
  }
  if (profile.track === 'interview') return ['interview', profile.company, profile.role, profile.level].map(normalized).join('|')
  return ['academic', profile.grade, profile.subject, profile.examName].map(normalized).join('|')
}

function numberFrom(text = '') {
  const value = Number.parseFloat(String(text).replace(/[^0-9.\-]/g, ''))
  return Number.isFinite(value) ? value : null
}

function readTargetModel() {
  return [...document.querySelectorAll('.model-chip-list > span')].map((node) => ({
    name: node.querySelector('b')?.textContent?.trim() || '',
    weight: numberFrom(node.querySelector('small')?.textContent || ''),
  })).filter((item) => item.name)
}

function readCompetencies() {
  return [...document.querySelectorAll('.skill-evidence')].map((node) => {
    const strong = node.querySelector('.skill-row strong')
    const scoreText = node.querySelector('.skill-row > div:first-child span')?.textContent || ''
    return {
      name: strong?.textContent?.trim() || '',
      score: numberFrom(scoreText),
      evidence: scoreText.includes('·') ? scoreText.split('·').slice(1).join('·').trim() : '',
      status: node.querySelector('.skill-row > b')?.textContent?.trim() || '',
      explanation: node.querySelector(':scope > p')?.textContent?.trim() || '',
    }
  }).filter((item) => item.name)
}

function readPlan() {
  return [...document.querySelectorAll('.focus-item')].map((node) => ({
    competency: node.querySelector('strong')?.textContent?.trim() || '',
    action: node.querySelector('small')?.textContent?.trim() || '',
    allocated: node.querySelector(':scope > b')?.textContent?.trim() || '',
  })).filter((item) => item.competency)
}

function readResearch() {
  const panel = document.querySelector('#live-research-panel')
  if (!panel) return null
  const sources = [...panel.querySelectorAll('.source-card')].slice(0, 12).map((node) => ({
    title: node.querySelector('strong')?.textContent?.trim() || '',
    publisher: node.querySelector('a')?.textContent?.replace(/^Open\s+/,'').replace(/\s*↗$/,'').trim() || '',
    url: node.querySelector('a')?.href || '',
  })).filter((item) => item.title && item.url)
  return {
    status: panel.dataset.researchState || '',
    heading: panel.querySelector('h3')?.textContent?.trim() || '',
    sources,
  }
}

function readLearningProgress(label) {
  try {
    const rows = JSON.parse(localStorage.getItem('prepare-learning-progress') || '[]')
    return Array.isArray(rows)
      ? rows.filter((row) => row?.target === label).slice(-30).map((row) => ({
          competency: String(row.competency || '').slice(0, 100),
          passed: Boolean(row.passed),
          before: Number(row.before),
          after: Number(row.after),
          at: row.at,
        }))
      : []
  } catch { return [] }
}

function publicProfile(profile) {
  const fields = [
    'track','targetDate','grade','subject','examName','company','role','level',
    'degree','branch','semester','graduationYear','cgpa','companies','programmingLanguages',
  ]
  return Object.fromEntries(fields.filter((key) => profile[key] !== undefined && profile[key] !== '').map((key) => [key, profile[key]]))
}

function buildPayload() {
  const profile = readProfile()
  const label = document.querySelector('.model-panel h3')?.textContent?.trim() || 'Prepare target'
  const readiness = numberFrom(document.querySelector('.results-hero h2')?.textContent || '')
  const diagnosticText = document.querySelector('.score-ring b')?.textContent?.trim() || ''
  const [correct, total] = diagnosticText.split('/').map((value) => Number.parseInt(value, 10))
  return {
    payloadVersion: 1,
    target: { label, targetKey: targetKey(profile), profile: publicProfile(profile) },
    assessment: {
      readiness,
      readinessLabel: document.querySelector('.results-hero > div:first-child > strong')?.textContent?.trim() || '',
      diagnostic: {
        correct: Number.isFinite(correct) ? correct : null,
        total: Number.isFinite(total) ? total : null,
      },
      targetModel: readTargetModel(),
      competencies: readCompetencies(),
      plan: readPlan(),
    },
    learningProgress: readLearningProgress(label),
    publicResearch: readResearch(),
    privacy: {
      rawDiagnosticAnswersIncluded: false,
      jobDescriptionIncluded: false,
      projectNarrativeIncluded: false,
      generatedLocally: true,
    },
    generatedBy: {
      product: 'ShareCapsule Prepare',
      page: location.origin,
    },
  }
}

function createPanel() {
  let panel = document.querySelector('#report-export-panel')
  if (panel) return panel
  const anchor = document.querySelector('.next-panel') || document.querySelector('.source-learning-panel')
  if (!anchor) return null
  panel = document.createElement('section')
  panel.id = 'report-export-panel'
  panel.className = 'panel report-export-panel'
  panel.innerHTML = `
    <div>
      <div class="eyebrow">Private progress record</div>
      <h3>Signed local report</h3>
      <p class="support-copy">Prepare stores the full progress report on this device. Only a SHA-256 hash and minimal envelope metadata are sent for signing. Any later change makes verification fail.</p>
      <p class="report-status" data-report-status>Preparing signed snapshot…</p>
    </div>
    <div class="report-actions">
      <button class="secondary-button" data-download-report disabled>Download signed report</button>
      <button class="primary-button" data-download-bundle disabled>Download progress ZIP</button>
    </div>`
  anchor.insertAdjacentElement('afterend', panel)
  panel.querySelector('[data-download-report]').addEventListener('click', async () => {
    const report = await ensureCurrentReport(panel)
    if (report) downloadReport(report)
  })
  panel.querySelector('[data-download-bundle]').addEventListener('click', async () => {
    try {
      const report = await ensureCurrentReport(panel)
      if (!report) return
      setStatus(panel, 'Building signed progress bundle…')
      const bundle = await createProgressBundle(report.payload.target.targetKey)
      downloadBlob(bundle.zip, bundle.filename)
      setStatus(panel, `${bundle.count} signed assessment report${bundle.count === 1 ? '' : 's'} included in this ZIP.`)
    } catch (error) {
      setStatus(panel, error instanceof Error ? error.message : 'Could not create progress bundle.', true)
    }
  })
  return panel
}

function setStatus(panel, message, bad = false) {
  const status = panel.querySelector('[data-report-status]')
  if (status) { status.textContent = message; status.classList.toggle('bad', bad) }
}

function enableButtons(panel, targetKeyValue) {
  const count = getStoredReports(targetKeyValue).filter((report) => report.reportType === 'assessment').length
  const single = panel.querySelector('[data-download-report]')
  const bundle = panel.querySelector('[data-download-bundle]')
  if (single) single.disabled = !currentReport
  if (bundle) { bundle.disabled = !currentReport; bundle.textContent = `Download progress ZIP (${count})` }
}

async function ensureCurrentReport(panel) {
  if (currentReport && currentReport.payload?.target?.targetKey === activeKey) return currentReport
  if (syncing) return null
  syncing = true
  try {
    setStatus(panel, 'Creating tamper-evident local snapshot…')
    const payload = buildPayload()
    activeKey = payload.target.targetKey
    currentReport = await ensureSignedReport(payload, 'assessment')
    enableButtons(panel, activeKey)
    const count = getStoredReports(activeKey).filter((report) => report.reportType === 'assessment').length
    setStatus(panel, `Signed snapshot saved locally. ${count} assessment report${count === 1 ? '' : 's'} stored for this target.`)
    return currentReport
  } catch (error) {
    currentReport = null
    enableButtons(panel, activeKey)
    setStatus(panel, error instanceof Error ? error.message : 'Signed report is unavailable.', true)
    return null
  } finally { syncing = false }
}

async function enhance() {
  if (!document.querySelector('.results-wrap')) { activeKey = ''; currentReport = null; return }
  const panel = createPanel()
  if (!panel) return
  const payload = buildPayload()
  const key = payload.target.targetKey
  if (key !== activeKey) { activeKey = key; currentReport = null }
  if (!currentReport && !syncing) await ensureCurrentReport(panel)
  else enableButtons(panel, key)
}

let queued = false
const observer = new MutationObserver(() => {
  if (queued) return
  queued = true
  queueMicrotask(() => { queued = false; enhance() })
})
observer.observe(document.body, { childList: true, subtree: true })
enhance()
