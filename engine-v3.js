import { diagnosticBank, difficultyRank } from './diagnostics.js'
import { campusDiagnosticBank } from './campus-diagnostics.js'
import { buildTargetModel as buildBaseTargetModel } from './target-model.js'
import { buildSrvusdGrade7Model, isSrvusdGrade7 } from './srvusd-grade7.js'
import { buildSrvusdGrade7DepthBank } from './srvusd-grade7-depth.js'
import { buildCampusDepthBank } from './campus-depth.js'
import {
  daysUntil,
  applyRetestResult,
  scoreDiagnostic,
  buildReadiness,
  buildGapList,
  buildPlan,
} from '/engine.js?legacy=20260814-2'

export { daysUntil, applyRetestResult, scoreDiagnostic, buildReadiness, buildGapList, buildPlan }

const MAX_QUESTIONS = 50
const INITIAL_SEEDS = 10
const HISTORY_KEY = 'prepare-question-history-v3'
const MAX_HISTORY = 500
const stopWords = new Set(['the','and','for','with','from','into','this','that','these','those','grade','course','topic','topics','unit','chapter','learn','learning','review','test','exam'])

function normalize(value='') {
  return String(value || '').toLowerCase().replace(/[^a-z0-9+#.]+/g,' ').trim()
}
function stem(token='') {
  let value=token.toLowerCase()
  if(value.length>5&&value.endsWith('ing')) value=value.slice(0,-3)
  else if(value.length>4&&value.endsWith('ies')) value=`${value.slice(0,-3)}y`
  else if(value.length>4&&value.endsWith('es')) value=value.slice(0,-2)
  else if(value.length>3&&value.endsWith('s')) value=value.slice(0,-1)
  return value
}
function tokens(value='') {
  return normalize(value).split(/\s+/).map(stem).filter((token)=>token.length>=3&&!stopWords.has(token))
}
function hash(text) {
  let value=2166136261
  for(const char of String(text)){value^=char.charCodeAt(0);value=Math.imul(value,16777619)}
  return value>>>0
}
function isLocalSrvusd(profile) {
  return profile?.track==='academic' && isSrvusdGrade7(profile)
}
function modelFor(profile) {
  return isLocalSrvusd(profile) ? buildSrvusdGrade7Model(profile) : buildBaseTargetModel(profile)
}
function baseQuestionPool(profile) {
  if(profile.track==='campus') return [...campusDiagnosticBank,...buildCampusDepthBank(),...diagnosticBank.filter((item)=>item.track==='interview')]
  if(isLocalSrvusd(profile)) return buildSrvusdGrade7DepthBank(profile)
  return diagnosticBank.filter((item)=>item.track===profile.track)
}
function questionText(question) {
  return normalize([question.competency,question.prompt,...(question.keywords||[])].join(' '))
}
function competencyText(competency) {
  return normalize([competency.name,...(competency.keywords||[])].join(' '))
}
function hasTokenMatch(text,topicTokens) {
  const haystackTokens=new Set(tokens(text))
  return topicTokens.some((token)=>haystackTokens.has(token)||[...haystackTokens].some((candidate)=>candidate.includes(token)||token.includes(candidate)))
}
function relevantPool(profile,model) {
  const targetNames=new Set(model.competencies.map((item)=>item.name))
  const base=baseQuestionPool(profile).filter((question)=>targetNames.has(question.competency))
  if(profile.track!=='academic') return base
  const topicTokens=tokens(profile.topics||'')
  if(!topicTokens.length) return base
  const matchedCompetencies=new Set(model.competencies.filter((item)=>hasTokenMatch(competencyText(item),topicTokens)).map((item)=>item.name))
  return base.filter((question)=>matchedCompetencies.has(question.competency)||hasTokenMatch(questionText(question),topicTokens))
}
function targetKey(profile) {
  if(profile.track==='campus') {
    const companies=Array.isArray(profile.companies)?profile.companies.join(','):profile.companies
    return normalize(['campus',profile.degree,profile.branch,profile.semester,profile.graduationYear,companies,profile.programmingLanguages,profile.skills].filter(Boolean).join('|'))
  }
  if(profile.track==='interview') return normalize(['interview',profile.company,profile.role,profile.level,profile.skills].filter(Boolean).join('|'))
  return normalize(['academic',profile.grade,profile.subject,profile.examName,profile.topics,profile.district,profile.school,profile.curriculumTrack].filter(Boolean).join('|'))
}
function readAllHistory(){
  if(typeof localStorage==='undefined') return {}
  try{return JSON.parse(localStorage.getItem(HISTORY_KEY)||'{}')}catch{return{}}
}
function readHistory(profile){
  const row=readAllHistory()[targetKey(profile)]||{}
  return {attempt:Number(row.attempt||0),cycle:Number(row.cycle||1),recent:Array.isArray(row.recent)?row.recent:[]}
}
function writeHistory(profile,{attempt,cycle,recent}){
  if(typeof localStorage==='undefined') return
  try{
    const all=readAllHistory()
    all[targetKey(profile)]={attempt,cycle,recent:[...new Set(recent)].slice(-MAX_HISTORY),updatedAt:new Date().toISOString()}
    localStorage.setItem(HISTORY_KEY,JSON.stringify(all))
  }catch{}
}
function remember(profile,ids){
  const history=readHistory(profile)
  writeHistory(profile,{...history,recent:[...history.recent,...ids]})
}
function difficultyDistance(question,desired='core') {
  return Math.abs((difficultyRank[question.difficulty]||2)-(difficultyRank[desired]||2))
}
function sortedCandidates(candidates,model,attempt,preferredDifficulty='core') {
  const weights=new Map(model.competencies.map((item)=>[item.name,item.weight||1]))
  return [...candidates].sort((a,b)=>{
    const score=(question)=>{
      const importance=(weights.get(question.competency)||1)*100
      const difficulty=-difficultyDistance(question,preferredDifficulty)*8
      const jitter=(hash(`${attempt}:${question.id}`)%1000)/1000
      return importance+difficulty+jitter
    }
    return score(b)-score(a)
  })
}
function balancedSeeds(pool,model,attempt,count){
  const chosen=[];const chosenIds=new Set();const byCompetency=new Map()
  for(const question of pool){if(!byCompetency.has(question.competency))byCompetency.set(question.competency,[]);byCompetency.get(question.competency).push(question)}
  for(const competency of model.competencies){
    const candidate=sortedCandidates(byCompetency.get(competency.name)||[],model,attempt,model.difficulty).find((item)=>!chosenIds.has(item.id))
    if(candidate){chosen.push(candidate);chosenIds.add(candidate.id)}
    if(chosen.length>=count)return chosen
  }
  for(const candidate of sortedCandidates(pool.filter((item)=>!chosenIds.has(item.id)),model,attempt,model.difficulty)){
    chosen.push(candidate);chosenIds.add(candidate.id);if(chosen.length>=count)break
  }
  return chosen
}
function freshPoolForAttempt(profile,pool){
  let history=readHistory(profile)
  const poolIds=new Set(pool.map((item)=>item.id))
  const recent=history.recent.filter((id)=>poolIds.has(id))
  let fresh=pool.filter((item)=>!recent.includes(item.id))
  if(!fresh.length&&pool.length){
    history={attempt:history.attempt,cycle:history.cycle+1,recent:[]}
    writeHistory(profile,history)
    fresh=[...pool]
  }
  return {history,fresh}
}

export function buildDiagnostic(profile,_requestedMax=MAX_QUESTIONS){
  const model=modelFor(profile)
  const pool=relevantPool(profile,model)
  const {history,fresh}=freshPoolForAttempt(profile,pool)
  const attempt=history.attempt+1
  const maxQuestions=Math.min(MAX_QUESTIONS,fresh.length)
  const seeds=balancedSeeds(fresh,model,attempt,Math.min(INITIAL_SEEDS,maxQuestions))
  writeHistory(profile,{attempt,cycle:history.cycle,recent:[...history.recent,...seeds.map((item)=>item.id)]})
  return {model,questions:seeds,maxQuestions,questionCycle:history.cycle,freshInventory:fresh.length}
}

function chooseFromPool(profile,model,plannedQuestions,completedQuestions,answers,currentQuestion){
  const existingIds=new Set(plannedQuestions.map((item)=>item.id))
  const history=readHistory(profile)
  const candidates=relevantPool(profile,model).filter((question)=>!existingIds.has(question.id)&&!history.recent.includes(question.id))
  if(!candidates.length)return null
  const correct=Number(answers[currentQuestion.id])===currentQuestion.answer
  const currentRank=difficultyRank[currentQuestion.difficulty]||2
  if(!correct&&currentQuestion.prerequisites?.length){
    for(const prerequisite of currentQuestion.prerequisites){
      const candidate=sortedCandidates(candidates.filter((item)=>item.competency===prerequisite),model,history.attempt,'foundation')[0]
      if(candidate)return{...candidate,adaptiveReason:`Checking prerequisite: ${prerequisite}`}
    }
  }
  const sameCompleted=completedQuestions.filter((item)=>item.competency===currentQuestion.competency).length
  if(sameCompleted<4){
    const desiredRank=correct?Math.min(3,currentRank+1):Math.max(1,currentRank-1)
    const same=candidates.filter((item)=>item.competency===currentQuestion.competency).sort((a,b)=>Math.abs((difficultyRank[a.difficulty]||2)-desiredRank)-Math.abs((difficultyRank[b.difficulty]||2)-desiredRank))[0]
    if(same)return{...same,adaptiveReason:correct?`Increasing difficulty in ${currentQuestion.competency}`:`Rechecking ${currentQuestion.competency} at a more foundational level`}
  }
  const counts=new Map(model.competencies.map((item)=>[item.name,0]))
  completedQuestions.forEach((item)=>counts.set(item.competency,(counts.get(item.competency)||0)+1))
  const targetOrder=[...model.competencies].sort((a,b)=>(counts.get(a.name)||0)-(counts.get(b.name)||0)||(b.weight||1)-(a.weight||1))
  for(const competency of targetOrder){
    const next=sortedCandidates(candidates.filter((item)=>item.competency===competency.name),model,history.attempt,model.difficulty)[0]
    if(next)return{...next,adaptiveReason:`Expanding coverage: ${competency.name}`}
  }
  return sortedCandidates(candidates,model,history.attempt,model.difficulty)[0]||null
}

export function getAdaptiveFollowUp(profile,model,plannedQuestions,answers,currentQuestion,maxQuestions=MAX_QUESTIONS){
  if(!currentQuestion||!plannedQuestions.length||maxQuestions<=0)return null
  const currentIndex=plannedQuestions.findIndex((item)=>item.id===currentQuestion.id)
  const completed=currentIndex>=0?plannedQuestions.slice(0,currentIndex+1):[currentQuestion]
  if(completed.length>=Math.min(MAX_QUESTIONS,maxQuestions))return null
  const candidate=chooseFromPool(profile,model,plannedQuestions,completed,answers,currentQuestion)
  if(candidate)remember(profile,[candidate.id])
  return candidate
}

export function getMicroAssessment(profile,competency,askedQuestions=[]){
  const model=modelFor(profile)
  const askedIds=new Set(askedQuestions.map((item)=>typeof item==='string'?item:item.id))
  const history=readHistory(profile)
  const candidates=relevantPool(profile,model).filter((item)=>item.competency===competency&&!askedIds.has(item.id)&&!history.recent.includes(item.id))
  const chosen=sortedCandidates(candidates,model,history.attempt,'advanced')[0]||null
  if(chosen)remember(profile,[chosen.id])
  return chosen?{...chosen,adaptiveReason:`Micro-assessment after learning: ${competency}`}:null
}
