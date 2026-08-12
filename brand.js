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
    if (wordmark && /sharecapsule/i.test(wordmark.textContent || '')) wordmark.textContent = 'ShareCapsule'
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

observer.observe(document.body, { childList: true, subtree: true })
applyShareCapsuleBrand()
