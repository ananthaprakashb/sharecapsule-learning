import { braveSearch } from './providers/brave.js'

const KNOWN_AUTHORITY_DOMAINS = new Map([
  ['amazon.jobs', 'Official company source'],
  ['careers.google.com', 'Official company source'],
  ['google.com', 'Primary/official source'],
  ['microsoft.com', 'Primary/official source'],
  ['metacareers.com', 'Official company source'],
  ['apple.com', 'Primary/official source'],
  ['collegeboard.org', 'Official exam provider'],
  ['act.org', 'Official exam provider'],
  ['ets.org', 'Official exam provider'],
  ['khanacademy.org', 'Established educational source'],
  ['openstax.org', 'Established educational source'],
  ['ocw.mit.edu', 'University source'],
  ['mit.edu', 'University source'],
  ['stanford.edu', 'University source'],
  ['harvard.edu', 'University source'],
  ['developer.mozilla.org', 'Primary technical documentation'],
  ['react.dev', 'Primary technical documentation'],
  ['postgresql.org', 'Primary technical documentation'],
  ['aws.amazon.com', 'Primary technical documentation'],
  ['sre.google', 'Primary technical documentation'],
])

const BLOCKED_HOST_FRAGMENTS = ['pinterest.', 'facebook.', 'instagram.', 'tiktok.', 'quora.']
const stopWords = new Set(['the','and','for','with','from','into','your','this','that','role','level','exam','course','official','guide','interview','preparation'])
const clamp = (value, min, max) => Math.min(max, Math.max(min, value))
const normalize = (value = '') => String(value).toLowerCase().replace(/[^a-z0-9+#. ]/g, ' ').replace(/\s+/g, ' ').trim()
const tokens = (value = '') => [...new Set(normalize(value).split(' ').filter((x) => x.length > 2 && !stopWords.has(x)))]
const safeText = (value, max = 240) => String(value || '').replace(/[\u0000-\u001f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max)

function targetLabel(profile) {
  return profile.track === 'interview'
    ? [profile.company, profile.role, profile.level].filter(Boolean).join(' · ')
    : [profile.grade, profile.subject, profile.examName].filter(Boolean).join(' · ')
}

export function validateResearchRequest(body) {
  if (!body || typeof body !== 'object') throw new Error('Request body must be an object')
  const profile = body.profile || {}
  if (!['interview', 'academic'].includes(profile.track)) throw new Error('profile.track must be interview or academic')
  if (profile.track === 'interview' && (!profile.company || !profile.role)) throw new Error('Interview research requires company and role')
  if (profile.track === 'academic' && !profile.subject) throw new Error('Academic research requires subject')
  if (!Array.isArray(body.competencies) || body.competencies.length === 0) throw new Error('competencies are required')
  if (body.competencies.length > 15) throw new Error('Too many competencies')
  if (Array.isArray(body.gaps) && body.gaps.length > 10) throw new Error('Too many gaps')
  return true
}

export function sanitizeResearchRequest(body) {
  const p = body.profile || {}
  const profile = {
    track: p.track,
    company: safeText(p.company, 80), role: safeText(p.role, 120), level: safeText(p.level, 50),
    grade: safeText(p.grade, 50), subject: safeText(p.subject, 120), examName: safeText(p.examName, 120),
    topics: safeText(p.topics, 300), skills: safeText(p.skills, 300),
  }
  const competencies = (body.competencies || []).slice(0, 15).map((item) => ({
    name: safeText(item.name, 80), weight: clamp(Number(item.weight || 1), 0.1, 2), rationale: safeText(item.rationale, 180),
  })).filter((x) => x.name)
  const gaps = (body.gaps || []).slice(0, 10).map((item) => ({
    name: safeText(item.name || item.competency, 80), score: clamp(Number(item.score || 0), 0, 100), priority: clamp(Number(item.priority || 0), 0, 100),
  })).filter((x) => x.name)
  return { profile, competencies, gaps }
}

export function buildQueries({ profile, competencies, gaps }) {
  const topGaps = gaps.slice().sort((a,b) => b.priority - a.priority).slice(0, 3).map((g) => g.name)
  const topCompetencies = competencies.slice().sort((a,b) => b.weight - a.weight).slice(0, 4).map((c) => c.name)
  const queries = []
  if (profile.track === 'interview') {
    const target = [profile.company, profile.role, profile.level].filter(Boolean).join(' ')
    queries.push(`${target} interview preparation official careers`)
    queries.push(`${target} interview coding system design behavioral official`)
    for (const gap of topGaps) queries.push(`${profile.company} ${profile.role} ${gap} interview preparation`)
  } else {
    const target = [profile.examName, profile.subject, profile.grade].filter(Boolean).join(' ')
    queries.push(`${target} official exam guide syllabus course framework`)
    queries.push(`${target} sample questions official education`)
    for (const gap of topGaps) queries.push(`${profile.subject} ${gap} ${profile.grade} learning official education`)
  }
  if (queries.length < 4 && topCompetencies.length) queries.push(`${targetLabel(profile)} ${topCompetencies.join(' ')} preparation`)
  return [...new Set(queries.map((q) => q.trim().replace(/\s+/g, ' ')))].slice(0, 5)
}

function hostInfo(urlString) {
  try {
    const url = new URL(urlString)
    if (!['http:', 'https:'].includes(url.protocol)) return null
    const hostname = url.hostname.toLowerCase().replace(/^www\./, '')
    if (BLOCKED_HOST_FRAGMENTS.some((x) => hostname.includes(x))) return null
    return { url, hostname }
  } catch { return null }
}

function authorityFor(hostname, profile) {
  let label = 'Public web source', score = 35
  for (const [domain, type] of KNOWN_AUTHORITY_DOMAINS) {
    if (hostname === domain || hostname.endsWith(`.${domain}`)) { label = type; score = 88; break }
  }
  if (hostname.endsWith('.gov')) { label = 'Government source'; score = 92 }
  if (hostname.endsWith('.edu')) { label = 'University source'; score = Math.max(score, 86) }

  if (profile.track === 'interview' && profile.company) {
    const companyTokens = tokens(profile.company).filter((t) => t.length > 3)
    if (companyTokens.some((t) => hostname.includes(t))) {
      label = /career|jobs|job/.test(hostname) ? 'Official company source' : 'Likely company-owned source'
      score = Math.max(score, /career|jobs|job/.test(hostname) ? 96 : 84)
    }
  }
  return { label, score }
}

function competencyMatches(sourceText, competencies) {
  const haystack = normalize(sourceText)
  const matches = []
  for (const competency of competencies) {
    const cTokens = tokens(competency.name)
    const direct = cTokens.filter((t) => haystack.includes(t)).length
    const aliases = {
      'system design':['architecture','distributed','scalability','system design'],
      'algorithms':['algorithm','coding','complexity'],
      'data structures':['data structure','tree','graph','hash'],
      'behavioral communication':['behavioral','leadership','star method','communication'],
      'problem solving':['problem solving','coding','reasoning'],
      'algebraic reasoning':['algebra','equation','polynomial'],
      'functions':['function','quadratic','logarithm'],
      'scientific reasoning':['experiment','hypothesis','scientific'],
      'biology foundations':['biology','cell','genetics','evolution'],
    }[normalize(competency.name)] || []
    const aliasHit = aliases.some((a) => haystack.includes(a))
    if (direct || aliasHit) matches.push(competency.name)
  }
  return matches
}

export function rankSources(rawSources, request) {
  const { profile, competencies } = request
  const targetTokens = tokens(targetLabel(profile))
  const seen = new Set()
  const ranked = []
  for (const source of rawSources) {
    const info = hostInfo(source.url)
    if (!info) continue
    const canonical = `${info.url.origin}${info.url.pathname}`.replace(/\/$/, '')
    if (seen.has(canonical)) continue
    seen.add(canonical)

    const authority = authorityFor(info.hostname, profile)
    const text = `${source.title || ''} ${source.snippet || ''} ${info.hostname} ${info.url.pathname}`
    const haystack = normalize(text)
    const targetHits = targetTokens.filter((t) => haystack.includes(t)).length
    const matchedCompetencies = competencyMatches(text, competencies)
    const relevance = clamp(30 + targetHits * 9 + matchedCompetencies.length * 10 - Math.max(0, (source.providerRank || 1) - 1) * 1.5, 0, 100)
    const total = Math.round(authority.score * 0.48 + relevance * 0.52)
    const targetEvidence = authority.label === 'Official company source' || authority.label === 'Official exam provider'

    ranked.push({
      id: `live-${ranked.length + 1}`,
      title: safeText(source.title, 180), url: source.url, publisher: info.hostname,
      description: safeText(source.snippet, 360), snippet: safeText(source.snippet, 360),
      age: safeText(source.age, 60), format: 'Live web result', quality: authority.label,
      authorityScore: authority.score, relevanceScore: Math.round(relevance), score: total,
      competencies: matchedCompetencies, targetEvidence,
      provenance: { provider: 'Brave Search', query: safeText(source.query, 300), providerRank: source.providerRank || null, researchedAt: new Date().toISOString() },
    })
  }
  return ranked.sort((a,b) => b.score - a.score).slice(0, 18)
}

export async function researchTarget(body, env) {
  validateResearchRequest(body)
  const request = sanitizeResearchRequest(body)
  const queries = buildQueries(request)
  const batches = await Promise.all(queries.map(async (query) => {
    const results = await braveSearch(query, env, { count: 8 })
    return results.map((r) => ({ ...r, query }))
  }))
  const sources = rankSources(batches.flat(), request)
  const evidence = {}
  for (const competency of request.competencies) {
    const matches = sources.filter((s) => s.competencies.includes(competency.name)).slice(0, 5)
    evidence[competency.name] = {
      sourceIds: matches.map((s) => s.id),
      confidence: matches.length >= 3 ? 'strong public evidence' : matches.length >= 1 ? 'some public evidence' : 'no direct live evidence found',
    }
  }
  return {
    version: 1,
    target: { label: targetLabel(request.profile), track: request.profile.track },
    provider: { name: 'Brave Search' },
    researchedAt: new Date().toISOString(),
    queries,
    sources,
    evidenceByCompetency: evidence,
    warnings: sources.length ? [] : ['No usable public sources were returned. Use the reviewed local catalog and retry later.'],
  }
}
