const SESSION_LIMIT_MS = 60 * 60 * 1000
const STORAGE_KEY = 'prepare-active-diagnostic-session-v1'

let intervalId = null
let currentPanel = null

function readSession() {
  try { return JSON.parse(sessionStorage.getItem(STORAGE_KEY) || 'null') } catch { return null }
}

function writeSession(session) {
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(session))
}

function clearTimer() {
  if (intervalId) clearInterval(intervalId)
  intervalId = null
}

function formatRemaining(ms) {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000))
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}

function ensureTimerNode(panel) {
  let node = panel.querySelector('[data-session-timer]')
  if (node) return node
  node = document.createElement('div')
  node.className = 'session-timer'
  node.setAttribute('data-session-timer', '')
  node.setAttribute('role', 'timer')
  node.setAttribute('aria-live', 'polite')
  const head = panel.querySelector('.diagnostic-head')
  if (head) head.append(node)
  else panel.prepend(node)
  return node
}

function expire(panel) {
  clearTimer()
  sessionStorage.removeItem(STORAGE_KEY)
  panel.innerHTML = `
    <div class="session-expired" role="alert">
      <div class="eyebrow">Assessment session closed</div>
      <h2>Time is up.</h2>
      <p>This attempt has been closed after 60 minutes so the diagnostic remains comparable. Partial answers are not scored as a completed assessment.</p>
      <button class="primary-button" data-restart-assessment>Restart diagnostic</button>
    </div>`
  panel.querySelector('[data-restart-assessment]')?.addEventListener('click', () => {
    const edit = document.querySelector('[data-edit]')
    if (edit) edit.click()
    else location.reload()
  })
}

function tick(panel, session) {
  const remaining = session.expiresAt - Date.now()
  if (remaining <= 0) return expire(panel)
  const node = ensureTimerNode(panel)
  const text = `Time remaining ${formatRemaining(remaining)}`
  if (node.textContent !== text) node.textContent = text
  node.classList.toggle('warning', remaining <= 10 * 60 * 1000)
  node.classList.toggle('urgent', remaining <= 5 * 60 * 1000)
}

function startOrResume(panel) {
  if (currentPanel === panel && intervalId) return
  clearTimer()
  currentPanel = panel
  let session = readSession()
  if (!session || !Number.isFinite(session.expiresAt) || session.expiresAt <= Date.now()) {
    session = { startedAt: Date.now(), expiresAt: Date.now() + SESSION_LIMIT_MS }
    writeSession(session)
  }
  tick(panel, session)
  intervalId = setInterval(() => tick(panel, session), 1000)
}

function sync() {
  const panel = document.querySelector('.diagnostic-panel')
  if (panel) {
    startOrResume(panel)
    return
  }
  currentPanel = null
  clearTimer()
  if (document.querySelector('#intake') || document.querySelector('.results-wrap')) {
    sessionStorage.removeItem(STORAGE_KEY)
  }
}

let queued = false
const observer = new MutationObserver(() => {
  if (queued) return
  queued = true
  queueMicrotask(() => {
    queued = false
    sync()
  })
})
observer.observe(document.querySelector('#app') || document.body, { childList: true, subtree: true })
sync()
