import * as base from './engine-v3.js'
import { buildTargetModel } from './target-model.js'

const POOL_KEY='prepare-live-question-pool-v2'
const norm=(value='')=>String(value||'').trim().toLowerCase().replace(/\s+/g,' ')
const listKey=(value='')=>[...new Set(String(value||'').split(/[,;\n]/).map(norm).filter(Boolean))].sort().join('|')

export const daysUntil=base.daysUntil
export const applyRetestResult=base.applyRetestResult
export const scoreDiagnostic=base.scoreDiagnostic
export const buildReadiness=base.buildReadiness
export const buildGapList=base.buildGapList
export const buildPlan=base.buildPlan

function targetKey(profile){
  if(profile.track==='academic')return['academic',profile.country,profile.region,profile.district,profile.school,profile.grade,profile.subject,profile.curriculumTrack,profile.examName,listKey(profile.topics)].map(norm).join('|')
  if(profile.track==='campus')return['campus',profile.degree,profile.branch,profile.semester,profile.graduationYear,listKey(profile.companies),listKey(profile.programmingLanguages),listKey(profile.skills)].map(norm).join('|')
  if(profile.track==='interview')return['interview',profile.company,profile.role,profile.level,listKey(profile.skills)].map(norm).join('|')
  return''
}

function readLivePool(profile){
  if(typeof sessionStorage==='undefined'||!['academic','interview','campus'].includes(profile.track))return null
  try{const value=JSON.parse(sessionStorage.getItem(POOL_KEY)||'null');if(!value||value.targetKey!==targetKey(profile)||Number(value.expiresAt||0)<=Date.now())return null;if(!Array.isArray(value.questions)||!value.questions.length)return null;return value}catch{return null}
}

export function buildDiagnostic(profile,requestedMax=50){
  const live=readLivePool(profile)
  if(live){
    const questions=live.questions.slice(0,50)
    return{model:live.model||buildTargetModel(profile),questions,maxQuestions:questions.length,assessmentMode:profile.track==='academic'?'live-academic-target':'live-company-role',research:live.research||null,evidencePolicy:live.policy||null}
  }
  return base.buildDiagnostic(profile,requestedMax)
}

export function getAdaptiveFollowUp(profile,model,plannedQuestions,answers,currentQuestion,maxQuestions=50){
  if(['live-company-role','live-academic-target'].includes(currentQuestion?.generation))return null
  return base.getAdaptiveFollowUp(profile,model,plannedQuestions,answers,currentQuestion,maxQuestions)
}

export function getMicroAssessment(profile,competency,askedQuestions=[]){return base.getMicroAssessment(profile,competency,askedQuestions)}
