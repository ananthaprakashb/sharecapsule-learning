function applyShareCapsuleBrand() {
  document.querySelectorAll('a.brand').forEach((brand) => {
    const existingLogo = brand.querySelector('.sharecapsule-logo')
    const mark = brand.querySelector('.brand-mark')
    if (!existingLogo && mark) {
      const logo = document.createElement('img')
      logo.src = '/sharecapsule-logo.svg'
      logo.alt = ''
      logo.width = 38
      logo.height = 38
      logo.className = 'brand-mark sharecapsule-logo'
      logo.setAttribute('aria-hidden', 'true')
      mark.replaceWith(logo)
    }

    const wordmark = brand.querySelector('b, strong')
    const currentWordmark = wordmark?.textContent?.trim() || ''
    if (wordmark && currentWordmark !== 'ShareCapsule' && /sharecapsule/i.test(currentWordmark)) {
      wordmark.textContent = 'ShareCapsule'
    }
  })
}

let queued = false
const observer = new MutationObserver(() => {
  if (queued) return
  queued = true
  queueMicrotask(() => {
    queued = false
    applyShareCapsuleBrand()
  })
})

const observedRoot = document.querySelector('#app') || document.body
observer.observe(observedRoot, { childList: true, subtree: true })
applyShareCapsuleBrand()
