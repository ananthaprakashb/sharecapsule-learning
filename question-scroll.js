const app = document.querySelector('#app')
const prefersReducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches ?? false
let lastQuestionKey = ''
let scheduled = false

function getQuestionCard() {
  return document.querySelector('.diagnostic-panel .question-card')
}

function getQuestionKey(card) {
  if (!card) return ''
  const panel = card.closest('.diagnostic-panel')
  const step = panel?.querySelector('.diagnostic-head .eyebrow')?.textContent?.trim() || ''
  const prompt = card.querySelector('h3')?.textContent?.trim() || ''
  return `${step}|${prompt}`
}

function scrollToCurrentQuestion() {
  const card = getQuestionCard()
  if (!card) {
    lastQuestionKey = ''
    return
  }

  const key = getQuestionKey(card)
  if (!key || key === lastQuestionKey) return
  lastQuestionKey = key

  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      const current = getQuestionCard()
      if (!current || getQuestionKey(current) !== key) return

      const top = current.getBoundingClientRect().top + window.scrollY - 20
      window.scrollTo({
        top: Math.max(0, top),
        behavior: prefersReducedMotion ? 'auto' : 'smooth',
      })
    })
  })
}

function scheduleQuestionScroll() {
  if (scheduled) return
  scheduled = true
  queueMicrotask(() => {
    scheduled = false
    scrollToCurrentQuestion()
  })
}

if (app) {
  const observer = new MutationObserver(scheduleQuestionScroll)
  observer.observe(app, { childList: true, subtree: true })
  scrollToCurrentQuestion()
}
