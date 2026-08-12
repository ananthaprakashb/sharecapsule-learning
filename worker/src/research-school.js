import { buildQueries as buildBaseQueries, rankSources as rankBaseSources, sanitizeResearchRequest as sanitizeBaseRequest, targetLabel as baseTargetLabel, validateResearchRequest as validateBaseRequest } from './research-campus.js'

const safeText=(value,max=240)=>String(value||'').replace(/[\u0000-\u001f]/g,' ').replace(/\s+/g,' ').trim().slice(0,max)
const norm=(value='')=>String(value||'').toLowerCase()
function isSrvusdGrade7(profile={}){const grade=norm(profile.grade),district=norm(profile.district),school=norm(profile.school),subject=norm(profile.subject);return(/(^|\D)7(th)?(\D|$)/.test(grade)||grade==='7')&&(district.includes('san ramon valley')||district.includes('srvusd')||school.includes('san ramon')||school.includes('iron horse')||school.includes('windemere')||school.includes('gale ranch')||school.includes('pine valley'))&&(subject.includes('math')||subject.includes('science'))}

const LOCAL_ALIASES={
  'Ratios & proportional relationships':['ratio','proportion','unit rate','scale drawing'],
  'Percent & rational numbers':['percent','discount','interest','rational number','integer'],
  'Expressions & equations':['expression','equation','inequality','linear'],
  'Geometry & measurement':['geometry','angle','area','surface area','volume'],
  'Statistics & probability':['statistics','population','probability','chance'],
  'Real numbers & exponents':['real number','exponent','scientific notation','irrational'],
  'Linear functions & systems':['linear function','slope','graph','system of equations'],
  'Transformations & similarity':['transformation','congruence','similarity','dilation'],
  'Pythagorean theorem':['pythagorean','right triangle','distance'],
  '3D geometry & volume':['cylinder','cone','sphere','volume'],
  'Cellular & body systems':['cell','body system','photosynthesis','respiration'],
  'Weather, climate & Earth systems':['weather','climate','earth system','atmosphere'],
  'Genetics, adaptation & inheritance':['genetic','inheritance','trait','adaptation','natural selection'],
  'Human impact & ecosystems':['ecosystem','greenhouse','human impact','conservation'],
  'Scientific inquiry & evidence':['investigation','experiment','evidence','model','data'],
}
function localMatches(source,competencies){const haystack=norm(`${source.title||''} ${source.description||source.snippet||''} ${source.url||''}`);return competencies.filter((item)=>(LOCAL_ALIASES[item.name]||[]).some((alias)=>haystack.includes(alias))).map((item)=>item.name)}

export function validateResearchRequest(body){return validateBaseRequest(body)}
export function sanitizeResearchRequest(body){const sanitized=sanitizeBaseRequest(body);if(body?.profile?.track==='academic'){sanitized.profile.district=safeText(body.profile.district,120);sanitized.profile.school=safeText(body.profile.school,120);sanitized.profile.curriculumTrack=safeText(body.profile.curriculumTrack,120)}return sanitized}
export function buildQueries(request){if(!isSrvusdGrade7(request?.profile))return buildBaseQueries(request);const p=request.profile,queries=[],target=[p.district||'SRVUSD',p.grade,p.subject,p.curriculumTrack].filter(Boolean).join(' ');queries.push(`${target} curriculum official`);queries.push(`${target} standards SpringBoard Inspire Science NGSS`);if(p.school)queries.push(`${p.school} ${p.grade} ${p.subject} curriculum official`);const gaps=request.gaps.slice().sort((a,b)=>b.priority-a.priority).slice(0,2);for(const gap of gaps)queries.push(`${p.grade} ${p.subject} ${gap.name} ${p.district||'SRVUSD'} learning`);return[...new Set(queries.map((q)=>q.trim().replace(/\s+/g,' ')))].slice(0,5)}
export function rankSources(rawSources,request){const ranked=rankBaseSources(rawSources,request);if(!isSrvusdGrade7(request?.profile))return ranked;return ranked.map((source)=>{const host=String(source.publisher||'').toLowerCase().replace(/^www\./,''),matches=localMatches(source,request.competencies),competencies=[...new Set([...(source.competencies||[]),...matches])],relevanceScore=Math.min(100,Math.max(source.relevanceScore||0,45+matches.length*12));let enriched={...source,competencies,relevanceScore,score:Math.max(source.score,Math.round((source.authorityScore||35)*.48+relevanceScore*.52))};if(host==='srvusd.net'||host.endsWith('.srvusd.net'))enriched={...enriched,quality:'Official district source',authorityScore:98,relevanceScore:Math.max(relevanceScore,72),score:Math.max(enriched.score,85),targetEvidence:true};if(host==='cde.ca.gov'||host.endsWith('.cde.ca.gov'))enriched={...enriched,quality:'Government standards source',authorityScore:97,relevanceScore:Math.max(relevanceScore,64),score:Math.max(enriched.score,81),targetEvidence:true};return enriched}).sort((a,b)=>b.score-a.score)}
export function targetLabel(profile){if(!isSrvusdGrade7(profile))return baseTargetLabel(profile);return[profile.district||'SRVUSD',profile.grade,profile.subject,profile.curriculumTrack,profile.school].filter(Boolean).join(' · ')}
