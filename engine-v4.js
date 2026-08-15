import * as base from './engine-v3.js'
import { buildTargetModel } from './target-model.js'

const POOL_KEY='prepare-company-question-pool-v1'
const norm=(value='')=>String(value||'').trim().toLowerCase().replace(/\s+/g,' ')

export const daysUntil=base.daysUntil
export const applyRetestResult=base.applyRetestResult
export const scoreDiagnostic=base.scoreDiagnostic
export const buildReadiness=base.buildReadiness
export const buildGapList=base.buildGapList
export const buildPlan=base.buildPlan

function companiesKey(value=''){
  return String(value||'').split(/[,;\n]/).map(norm).filter(Boolean).sort().join('|')
}

function targetKey(profile){
  if(profile.track==='campus') return ['campus',profile.degree,profile.branch,profile.semester,profile.graduationYear,companiesKey(profile.companies),profile.programmingLanguages].map(norm).join('|')
  if(profile.track==='interview') return ['interview',profile.company,profile.role,profile.level,profile.skills].map(norm).join('|')
  return ''
}

function readLivePool(profile){
  if(typeof sessionStorage==='undefined'||!['interview','campus'].includes(profile.track))return null
  try{
    const value=JSON.parse(sessionStorage.getItem(POOL_KEY)||'null')
    if(!value||value.targetKey!==targetKey(profile)||Number(value.expiresAt||0)<=Date.now())return null
    if(!Array.isArray(value.questions)||!value.questions.length)return null
    return value
  }catch{return null}
}

export function buildDiagnostic(profile,requestedMax=50){
  const live=readLivePool(profile)
  if(live){
    // app.js still passes the historical 10/14-question cap. Live company-role
    // assessments deliberately ignore that legacy cap and use the prepared pool.
    const questions=live.questions.slice(0,50)
    return{
      model:buildTargetModel(profile),
      questions,
      maxQuestions:questions.length,
      assessmentMode:'live-company-role',
      research:live.research||null,
      evidencePolicy:live.policy||null,
    }
  }
  return base.buildDiagnostic(profile,requestedMax)
}

export function getAdaptiveFollowUp(profile,model,plannedQuestions,answers,currentQuestion,maxQuestions=50){
  if(currentQuestion?.generation==='live-company-role')return null
  return base.getAdaptiveFollowUp(profile,model,plannedQuestions,answers,currentQuestion,maxQuestions)
}

export function getMicroAssessment(profile,competency,askedQuestions=[]){
  return base.getMicroAssessment(profile,competency,askedQuestions)
}
