import { buildQueries as buildBaseQueries, rankSources as rankBaseSources, sanitizeResearchRequest as sanitizeBaseRequest, targetLabel as baseTargetLabel, validateResearchRequest as validateBaseRequest } from './research-campus.js'

const safeText=(value,max=240)=>String(value||'').replace(/[\u0000-\u001f]/g,' ').replace(/\s+/g,' ').trim().slice(0,max)
const norm=(value='')=>String(value||'').toLowerCase().replace(/[^a-z0-9]+/g,' ').replace(/\s+/g,' ').trim()
const tokens=(value='')=>[...new Set(norm(value).split(' ').filter((x)=>x.length>2))]
const acronym=(value='')=>norm(value).split(' ').filter(Boolean).map((word)=>word[0]).join('')

function academicProfile(profile={}){return profile?.track==='academic'}
function systemLabel(profile={}){return profile.district||profile.educationSystem||profile.board||''}
function locationLabel(profile={}){return profile.region||profile.state||profile.country||''}
function academicTarget(profile={}){return [profile.school,systemLabel(profile),profile.grade,profile.subject,profile.curriculumTrack,profile.examName,locationLabel(profile)].filter(Boolean).join(' ')}

function educationHostScore(host=''){
  const value=String(host).toLowerCase().replace(/^www\./,'')
  if(value.endsWith('.gov')||/\.gov\.[a-z]{2,}$/.test(value))return{kind:'government',quality:'Government standards source',authorityScore:97}
  if(value.endsWith('.edu')||/\.edu\.[a-z]{2,}$/.test(value)||/\.ac\.[a-z]{2,}$/.test(value))return{kind:'education',quality:'Education institution source',authorityScore:90}
  if(/\.k12\.[a-z.]+$/.test(value)||value.includes('.school.'))return{kind:'school',quality:'School / district source',authorityScore:91}
  return null
}

function targetMatches(source,profile){
  const haystack=norm(`${source.title||''} ${source.description||source.snippet||''} ${source.publisher||''} ${source.url||''}`)
  const groups=[profile.school,systemLabel(profile),profile.curriculumTrack,profile.examName,profile.subject,profile.grade,locationLabel(profile)]
    .map(tokens).filter((group)=>group.length)
  return groups.reduce((score,group)=>score+(group.some((token)=>haystack.includes(token))?1:0),0)
}

function ownedSystemHost(host,profile){
  const system=systemLabel(profile),school=profile.school||''
  const aliases=[...tokens(system),...tokens(school),acronym(system),acronym(school)].filter((value)=>value.length>=4)
  return aliases.some((value)=>host.includes(value))
}

export function validateResearchRequest(body){
  validateBaseRequest(body)
  if(body?.profile?.track==='academic'&&!body.profile.grade)throw new Error('Academic research requires grade or year level')
  return true
}

export function sanitizeResearchRequest(body){
  const sanitized=sanitizeBaseRequest(body)
  if(body?.profile?.track==='academic'){
    const p=body.profile||{}
    sanitized.profile.country=safeText(p.country,100)
    sanitized.profile.region=safeText(p.region||p.state,120)
    sanitized.profile.district=safeText(p.district||p.educationSystem||p.board,160)
    sanitized.profile.school=safeText(p.school,160)
    sanitized.profile.curriculumTrack=safeText(p.curriculumTrack||p.course,160)
    sanitized.profile.targetDate=safeText(p.targetDate,30)
  }
  return sanitized
}

export function buildQueries(request){
  if(!academicProfile(request?.profile))return buildBaseQueries(request)
  const p=request.profile,queries=[]
  const system=systemLabel(p),location=locationLabel(p)
  const gradeSubject=[p.grade,p.subject].filter(Boolean).join(' ')

  if(p.school)queries.push(`${p.school} ${gradeSubject} ${p.curriculumTrack||''} curriculum syllabus official`)
  if(system)queries.push(`${system} ${gradeSubject} ${p.curriculumTrack||''} curriculum standards official`)
  if(location)queries.push(`${location} ${gradeSubject} curriculum standards department education official`)
  if(p.country)queries.push(`${p.country} ${gradeSubject} national curriculum standards official`)
  if(p.curriculumTrack)queries.push(`${p.curriculumTrack} ${gradeSubject} syllabus framework official`)
  if(p.examName)queries.push(`${p.examName} ${gradeSubject} official exam course framework sample questions`)

  const topGaps=(request.gaps||[]).slice().sort((a,b)=>b.priority-a.priority).slice(0,2)
  for(const gap of topGaps)queries.push(`${academicTarget(p)} ${gap.name} official learning standards`)

  if(queries.length<3)queries.push(`${academicTarget(p)} curriculum standards official education`)
  return[...new Set(queries.map((q)=>q.trim().replace(/\s+/g,' ')))].slice(0,8)
}

export function rankSources(rawSources,request){
  const ranked=rankBaseSources(rawSources,request)
  if(!academicProfile(request?.profile))return ranked
  return ranked.map((source)=>{
    const host=String(source.publisher||'').toLowerCase().replace(/^www\./,'')
    const education=educationHostScore(host)
    const matches=targetMatches(source,request.profile)
    const systemOwned=ownedSystemHost(host,request.profile)
    let authorityScore=source.authorityScore||35
    let quality=source.quality||'Public web source'
    if(education){authorityScore=Math.max(authorityScore,education.authorityScore);quality=education.quality}
    if(systemOwned){authorityScore=Math.max(authorityScore,98);quality='Official district source'}

    const relevanceScore=Math.min(100,Math.max(source.relevanceScore||0,30+matches*15))
    const targetEvidence=Boolean(source.targetEvidence)||
      (systemOwned&&matches>=1)||
      (education?.kind==='government'&&matches>=1)||
      ((education?.kind==='education'||education?.kind==='school')&&matches>=2)
    const score=Math.max(source.score||0,Math.round(authorityScore*.48+relevanceScore*.52))
    return{...source,quality,authorityScore,relevanceScore,score,targetEvidence}
  }).sort((a,b)=>b.score-a.score)
}

export function targetLabel(profile){
  if(!academicProfile(profile))return baseTargetLabel(profile)
  return[profile.school,systemLabel(profile),profile.grade,profile.subject,profile.curriculumTrack,profile.examName]
    .filter(Boolean).join(' · ')||[profile.grade,profile.subject].filter(Boolean).join(' · ')
}
