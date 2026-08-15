import { buildTargetModel } from './target-model.js'

const defaultApiBase = location.hostname === 'localhost' || location.hostname === '127.0.0.1'
  ? 'http://localhost:8787'
  : 'https://api.prepare.sharecapsule.app'
const apiBase = String(window.PREPARE_API_BASE || defaultApiBase).replace(/\/$/, '')
const POOL_KEY = 'prepare-company-question-pool-v1'
const HISTORY_KEY = 'prepare-live-question-history-v1'
const MAX_HISTORY = 500

const norm = (value='') => String(value || '').trim().toLowerCase().replace(/\s+/g, ' ')

function readProfile(){
  try{return JSON.parse(localStorage.getItem('prepare-profile')||'{}')}catch{return{}}
}

function activeProfile(form){
  const profile={...readProfile()}
  for(const [key,value] of new FormData(form)) profile[key]=value
  return profile
}

function companiesKey(value=''){
  return String(value||'').split(/[,;\n]/).map(norm).filter(Boolean).sort().join('|')
}

function targetKey(profile){
  if(profile.track==='campus') return ['campus',profile.degree,profile.branch,profile.semester,profile.graduationYear,companiesKey(profile.companies),profile.programmingLanguages].map(norm).join('|')
  return ['interview',profile.company,profile.role,profile.level,profile.skills].map(norm).join('|')
}

function readHistory(key){
  try{
    const all=JSON.parse(localStorage.getItem(HISTORY_KEY)||'{}')
    return Array.isArray(all[key])?all[key]:[]
  }catch{return[]}
}

function remember(key,fingerprints){
  try{
    const all=JSON.parse(localStorage.getItem(HISTORY_KEY)||'{}')
    all[key]=[...new Set([...(Array.isArray(all[key])?all[key]:[]),...fingerprints])].slice(-MAX_HISTORY)
    localStorage.setItem(HISTORY_KEY,JSON.stringify(all))
  }catch{}
}

function activeTrackProfile(profile){
  if(profile.track==='campus') return {
    track:'campus',degree:profile.degree,branch:profile.branch,semester:profile.semester,
    graduationYear:profile.graduationYear,companies:profile.companies,
    role:profile.role||'Graduate Engineer / Software Trainee',programmingLanguages:profile.programmingLanguages,
    cgpa:profile.cgpa,skills:profile.skills,
  }
  return {
    track:'interview',company:profile.company,role:profile.role,level:profile.level,
    experience:profile.experience,skills:profile.skills,
  }
}

function statusNode(form){
  let node=form.querySelector('[data-live-assessment-status]')
  if(node)return node
  node=document.createElement('div')
  node.dataset.liveAssessmentStatus=''
  node.className='live-assessment-status'
  const submit=form.querySelector('button.primary-button')
  if(submit)submit.insertAdjacentElement('beforebegin',node)
  else form.append(node)
  return node
}

function setStatus(form,message,bad=false){
  const node=statusNode(form)
  if(node.textContent!==message)node.textContent=message
  node.classList.toggle('bad',bad)
}

function setBusy(form,busy){
  form.dataset.liveAssessmentLoading=busy?'1':'0'
  const button=form.querySelector('button.primary-button')
  if(button){
    button.disabled=busy
    if(!button.dataset.originalText)button.dataset.originalText=button.innerHTML
    button.innerHTML=busy?'Researching company & role…':button.dataset.originalText
  }
}

function validQuestion(question){
  return question&&typeof question.id==='string'&&typeof question.prompt==='string'&&
    Array.isArray(question.options)&&question.options.length===4&&Number.isInteger(question.answer)&&
    question.answer>=0&&question.answer<4&&typeof question.competency==='string'
}

async function requestQuestions(profile,model,key){
  const response=await fetch(`${apiBase}/v1/assessment/questions`,{
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body:JSON.stringify({
      profile:activeTrackProfile(profile),
      competencies:(model?.competencies||[]).map(({name,weight,rationale})=>({name,weight,rationale})),
      gaps:[],
      count:50,
      sessionSeed:crypto.randomUUID(),
      excludeFingerprints:readHistory(key),
    }),
  })
  const payload=await response.json().catch(()=>({}))
  if(!response.ok)throw new Error(payload.error||`Company-specific assessment failed (${response.status})`)
  const questions=(payload.questions||[]).filter(validQuestion)
  if(questions.length<10)throw new Error('Company-specific assessment returned too few usable questions')
  return {...payload,questions}
}

async function prepare(form,event){
  const profile=activeProfile(form)
  if(!['interview','campus'].includes(profile.track))return false
  if(form.dataset.liveAssessmentReady==='1'){
    delete form.dataset.liveAssessmentReady
    return false
  }

  event.preventDefault()
  event.stopImmediatePropagation()
  localStorage.setItem('prepare-profile',JSON.stringify(profile))
  const key=targetKey(profile)
  setBusy(form,true)
  setStatus(form,'Researching current public interview evidence and preparing role-specific questions…')
  try{
    const model=buildTargetModel(profile)
    const result=await requestQuestions(profile,model,key)
    sessionStorage.setItem(POOL_KEY,JSON.stringify({
      targetKey:key,
      createdAt:new Date().toISOString(),
      expiresAt:Date.now()+2*60*60*1000,
      target:result.target,
      research:result.research,
      policy:result.policy,
      questions:result.questions,
    }))
    remember(key,result.questions.map((question)=>question.fingerprint).filter(Boolean))
    setStatus(form,`${result.questions.length} original questions prepared for ${result.target?.label||'this target'} from current public evidence.`)
    form.dataset.liveAssessmentReady='1'
    setBusy(form,false)
    form.requestSubmit()
  }catch(error){
    setBusy(form,false)
    sessionStorage.removeItem(POOL_KEY)
    setStatus(form,error instanceof Error?error.message:'Could not prepare company-specific questions.',true)
  }
  return true
}

document.addEventListener('submit',(event)=>{
  const form=event.target
  if(!(form instanceof HTMLFormElement)||form.id!=='intake')return
  const profile=activeProfile(form)
  if(!['interview','campus'].includes(profile.track))return
  void prepare(form,event)
},true)
