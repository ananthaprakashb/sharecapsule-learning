import { buildTargetModel } from './target-model.js'

const defaultApiBase=location.hostname==='localhost'||location.hostname==='127.0.0.1'?'http://localhost:8787':'https://api.prepare.sharecapsule.app'
const apiBase=String(window.PREPARE_API_BASE||defaultApiBase).replace(/\/$/,'')
const POOL_KEY='prepare-live-question-pool-v2'
const HISTORY_KEY='prepare-live-question-history-v1'
const MAX_HISTORY=400
const norm=(value='')=>String(value||'').trim().toLowerCase().replace(/\s+/g,' ')
const listKey=(value='')=>[...new Set(String(value||'').split(/[,;\n]/).map(norm).filter(Boolean))].sort().join('|')

function readProfile(){try{return JSON.parse(localStorage.getItem('prepare-profile')||'{}')}catch{return{}}}
function selectedTrack(){return document.querySelector('[data-track].selected')?.dataset.track||''}
function activeProfile(form){const profile={...readProfile()};for(const[key,value]of new FormData(form))profile[key]=value;profile.track=selectedTrack()||profile.track;return profile}
function ensureTrackField(form,track){let field=form.querySelector('input[name="track"][data-authoritative-track]');if(!field){field=document.createElement('input');field.type='hidden';field.name='track';field.dataset.authoritativeTrack='';form.prepend(field)}field.value=track}
function targetKey(profile){
  if(profile.track==='academic')return['academic',profile.country,profile.region,profile.district,profile.school,profile.grade,profile.subject,profile.curriculumTrack,profile.examName,listKey(profile.topics)].map(norm).join('|')
  if(profile.track==='campus')return['campus',profile.degree,profile.branch,profile.semester,profile.graduationYear,listKey(profile.companies),listKey(profile.programmingLanguages),listKey(profile.skills)].map(norm).join('|')
  return['interview',profile.company,profile.role,profile.level,listKey(profile.skills)].map(norm).join('|')
}
function readHistory(key){try{const all=JSON.parse(localStorage.getItem(HISTORY_KEY)||'{}');return Array.isArray(all[key])?all[key]:[]}catch{return[]}}
function remember(key,fingerprints){try{const all=JSON.parse(localStorage.getItem(HISTORY_KEY)||'{}');all[key]=[...new Set([...(Array.isArray(all[key])?all[key]:[]),...fingerprints])].slice(-MAX_HISTORY);localStorage.setItem(HISTORY_KEY,JSON.stringify(all))}catch{}}

function activeTrackProfile(profile){
  if(profile.track==='academic')return{track:'academic',country:profile.country,region:profile.region,district:profile.district,school:profile.school,grade:profile.grade,subject:profile.subject,curriculumTrack:profile.curriculumTrack,examName:profile.examName,topics:profile.topics,targetDate:profile.targetDate,currentScore:profile.currentScore,desiredScore:profile.desiredScore}
  if(profile.track==='campus')return{track:'campus',degree:profile.degree,branch:profile.branch,semester:profile.semester,graduationYear:profile.graduationYear,companies:profile.companies,role:profile.role||'Graduate Engineer / Software Trainee',programmingLanguages:profile.programmingLanguages,cgpa:profile.cgpa,skills:profile.skills}
  return{track:'interview',company:profile.company,role:profile.role,level:profile.level,experience:profile.experience,skills:profile.skills}
}

function statusNode(form){let node=form.querySelector('[data-live-assessment-status]');if(node)return node;node=document.createElement('div');node.dataset.liveAssessmentStatus='';node.className='live-assessment-status';const submit=form.querySelector('button.primary-button');if(submit)submit.insertAdjacentElement('beforebegin',node);else form.append(node);return node}
function setStatus(form,message,bad=false){const node=statusNode(form);if(node.textContent!==message)node.textContent=message;node.classList.toggle('bad',bad)}
function setBusy(form,busy,track){form.dataset.liveAssessmentLoading=busy?'1':'0';const button=form.querySelector('button.primary-button');if(button){button.disabled=busy;if(!button.dataset.originalText)button.dataset.originalText=button.innerHTML;button.innerHTML=busy?(track==='academic'?'Resolving curriculum & questions…':'Loading target-specific questions…'):button.dataset.originalText}}
function validQuestion(question){return question&&typeof question.id==='string'&&typeof question.prompt==='string'&&Array.isArray(question.options)&&question.options.length===4&&Number.isInteger(question.answer)&&question.answer>=0&&question.answer<4&&typeof question.competency==='string'}
function assertTrackIsolation(profile,payload,questions){
  const returnedTrack=String(payload?.target?.track||payload?.model?.track||'').trim()
  if(returnedTrack&&returnedTrack!==profile.track)throw new Error(`Assessment target mismatch: expected ${profile.track}, received ${returnedTrack}`)
  const mismatched=questions.find((question)=>question.track&&question.track!==profile.track)
  if(mismatched)throw new Error(`Assessment question mismatch: ${profile.track} target received ${mismatched.track} content`)
  if(profile.track==='interview'&&(payload?.model?.label||payload?.target?.label||'').toLowerCase().includes('grade 7'))throw new Error('Interview assessment received stale academic target data. Please retry the role target.')
}

async function requestQuestions(profile,model,key){
  const response=await fetch(`${apiBase}/v1/assessment/questions`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({profile:activeTrackProfile(profile),competencies:(model?.competencies||[]).map(({name,weight,rationale})=>({name,weight,rationale})),gaps:[],count:50,sessionSeed:crypto.randomUUID(),excludeFingerprints:readHistory(key).slice(-MAX_HISTORY)})})
  const payload=await response.json().catch(()=>({}))
  if(!response.ok)throw new Error(payload.error||`Target-specific assessment failed (${response.status})`)
  const questions=(payload.questions||[]).filter(validQuestion)
  if(questions.length<10)throw new Error('Target-specific assessment returned too few usable questions')
  assertTrackIsolation(profile,payload,questions)
  return{...payload,questions}
}

function preparedStatus(result){
  const count=result.questions.length,target=result.target?.label||'this target',bank=result.bank
  if(!bank)return `${count} original questions prepared for ${target} from current public evidence.`
  if(bank.configured&&bank.generatedNow===0)return `${count} questions loaded from the saved ${target} question bank — no new AI question generation used.`
  if(bank.configured&&bank.servedFromBank>0)return `${count} questions ready for ${target}: ${bank.servedFromBank} reused from the saved bank and ${bank.generatedNow} newly generated and saved.`
  if(bank.configured&&bank.persisted)return `${count} new questions prepared for ${target} and saved to the reusable question bank.`
  return `${count} questions prepared for ${target}. Persistent question-bank storage is not available yet.`
}

async function prepare(form,event){
  const profile=activeProfile(form)
  if(!['academic','interview','campus'].includes(profile.track))return false
  if(form.dataset.liveAssessmentReady==='1'){delete form.dataset.liveAssessmentReady;return false}
  event.preventDefault();event.stopImmediatePropagation();ensureTrackField(form,profile.track);sessionStorage.removeItem(POOL_KEY);localStorage.setItem('prepare-profile',JSON.stringify(profile))
  const key=targetKey(profile);setBusy(form,true,profile.track)
  setStatus(form,profile.track==='academic'?'Checking the saved question bank, resolving current curriculum/standards evidence, and generating only missing questions…':'Checking the saved question bank, then researching/generating only if more questions are needed…')
  try{
    const baseline=buildTargetModel(profile),result=await requestQuestions(profile,baseline,key)
    sessionStorage.setItem(POOL_KEY,JSON.stringify({targetKey:key,createdAt:new Date().toISOString(),expiresAt:Date.now()+2*60*60*1000,target:result.target,model:result.model||baseline,research:result.research,policy:result.policy,bank:result.bank,questions:result.questions}))
    remember(key,result.questions.map((question)=>question.fingerprint).filter(Boolean));setStatus(form,preparedStatus(result));form.dataset.liveAssessmentReady='1';setBusy(form,false,profile.track);form.requestSubmit()
  }catch(error){setBusy(form,false,profile.track);sessionStorage.removeItem(POOL_KEY);setStatus(form,error instanceof Error?error.message:'Could not prepare target-specific questions.',true)}
  return true
}

document.addEventListener('submit',(event)=>{const form=event.target;if(!(form instanceof HTMLFormElement)||form.id!=='intake')return;const profile=activeProfile(form);if(!['academic','interview','campus'].includes(profile.track))return;void prepare(form,event)},true)
