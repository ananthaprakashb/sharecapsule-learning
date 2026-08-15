import { researchTarget, sanitizeResearchRequest } from './research-multi.js'
import { configuredProviders } from './providers/index.js'

const DEFAULT_MODEL='gpt-5-mini'
const MAX_QUESTIONS=50
const MAX_EXCLUDES=400
const safeText=(value,max=320)=>String(value||'').replace(/[\u0000-\u001f]/g,' ').replace(/\s+/g,' ').trim().slice(0,max)
const normalize=(value='')=>String(value||'').toLowerCase().replace(/[^a-z0-9+#.]+/g,' ').replace(/\s+/g,' ').trim()

async function sha256(value){const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(String(value)));return[...new Uint8Array(digest)].map((byte)=>byte.toString(16).padStart(2,'0')).join('')}

function fallbackCompetencies(){return[
  {name:'Core subject knowledge',weight:1.15,rationale:'Establish grade-appropriate command of the target subject.'},
  {name:'Reasoning & application',weight:1.05,rationale:'Apply concepts rather than relying only on recall.'},
  {name:'Evidence & communication',weight:.85,rationale:'Interpret evidence and communicate reasoning when the subject requires it.'},
]}

export function validateAcademicAssessmentRequest(body){
  if(!body||typeof body!=='object')throw new Error('Request body must be an object')
  const p=body.profile||{}
  if(p.track!=='academic')throw new Error('Academic assessment requires academic track')
  if(!p.grade)throw new Error('Academic assessment requires grade or year level')
  if(!p.subject)throw new Error('Academic assessment requires subject')
  const count=Number(body.count||MAX_QUESTIONS)
  if(!Number.isInteger(count)||count<5||count>MAX_QUESTIONS)throw new Error('count must be an integer between 5 and 50')
  if(body.excludeFingerprints&&!Array.isArray(body.excludeFingerprints))throw new Error('excludeFingerprints must be an array')
  if((body.excludeFingerprints||[]).length>MAX_EXCLUDES)throw new Error('Too many excluded questions')
  return true
}

export function sanitizeAcademicAssessmentRequest(body){
  validateAcademicAssessmentRequest(body)
  const hints=Array.isArray(body.competencies)&&body.competencies.length?body.competencies:fallbackCompetencies()
  const research=sanitizeResearchRequest({profile:body.profile,competencies:hints,gaps:Array.isArray(body.gaps)?body.gaps:[]})
  return{
    ...research,
    count:Math.min(MAX_QUESTIONS,Math.max(5,Number(body.count||MAX_QUESTIONS))),
    sessionSeed:safeText(body.sessionSeed||crypto.randomUUID(),120),
    excludeFingerprints:[...new Set((body.excludeFingerprints||[]).map((item)=>safeText(item,80)).filter(Boolean))].slice(0,MAX_EXCLUDES),
  }
}

function targetLabel(profile){return[profile.school,profile.district,profile.grade,profile.subject,profile.curriculumTrack,profile.examName].filter(Boolean).join(' · ')||[profile.grade,profile.subject].filter(Boolean).join(' · ')}

function schema(count){return{
  type:'object',additionalProperties:false,required:['competencies','questions'],properties:{
    competencies:{type:'array',minItems:4,maxItems:10,items:{type:'object',additionalProperties:false,required:['name','weight','rationale'],properties:{name:{type:'string'},weight:{type:'number',minimum:.5,maximum:1.5},rationale:{type:'string'}}}},
    questions:{type:'array',minItems:count,maxItems:count,items:{type:'object',additionalProperties:false,required:['competency','difficulty','prompt','options','answer','explanation','sourceIds','evidenceRationale'],properties:{
      competency:{type:'string'},difficulty:{type:'string',enum:['foundation','core','advanced']},prompt:{type:'string'},
      options:{type:'array',minItems:4,maxItems:4,items:{type:'string'}},answer:{type:'integer',minimum:0,maximum:3},explanation:{type:'string'},
      sourceIds:{type:'array',maxItems:3,items:{type:'string'}},evidenceRationale:{type:'string'},
    }}},
  },
}}

function promptEvidence(evidence){return(evidence.sources||[]).map((source)=>({id:source.id,title:safeText(source.title,160),publisher:safeText(source.publisher,120),quality:safeText(source.quality,100),description:safeText(source.description||source.snippet,380),official:Boolean(source.targetEvidence)}))}

function instructions(request,evidence){
  const p=request.profile,excluded=request.excludeFingerprints.slice(-200)
  const schoolEvidence=(evidence.sources||[]).some((source)=>source.targetEvidence&&p.school&&normalize(`${source.title} ${source.publisher} ${source.description}`).includes(normalize(p.school)))
  return[
    'Build an original, evidence-grounded academic diagnostic and competency model.',
    `Target: ${targetLabel(p)}.`,
    `Country/education context: ${[p.country,p.region,p.district].filter(Boolean).join(' · ')||'not specified'}.`,
    `Generate exactly ${request.count} four-option multiple-choice questions appropriate for ${p.grade} ${p.subject}.`,
    'Derive 4 to 10 concrete competencies from the supplied curriculum/standards evidence. Competency names must be concise and useful for a learning plan.',
    'Every question competency must exactly match one of the returned competency names.',
    'Prefer official school, district/board, government, exam-provider, and recognized education-system sources. Use broader regional or national standards when school-specific material is unavailable.',
    schoolEvidence?'School-specific public evidence is present; use it where relevant.':'Do not claim the school itself teaches a topic unless supplied evidence supports that claim. When school-specific evidence is absent, ground the assessment in the best available district/board/region/national curriculum evidence.',
    'Questions must be original. Do not copy distinctive wording from worksheets, textbooks, test-prep sites, or copyrighted question banks.',
    'Match vocabulary, mathematical complexity, reading load, and abstraction to the stated grade/year. Avoid university-level assumptions for younger learners.',
    p.curriculumTrack?`Course/curriculum detail: ${p.curriculumTrack}.`:'No named course/curriculum was supplied; infer scope only from authoritative evidence.',
    p.examName?`Assessment/course target: ${p.examName}.`:'No named exam was supplied.',
    p.topics?`Learner-supplied focus topics: ${p.topics}. Treat these as targeting hints, not proof of the official syllabus.`:'No explicit focus topics were supplied.',
    'Balance foundational knowledge, application, reasoning, interpretation, and multi-step work according to the subject and grade.',
    'sourceIds may reference only supplied evidence IDs. evidenceRationale should briefly state why the question fits the target without overstating certainty.',
    `Session seed: ${request.sessionSeed}. Use it to vary scenarios, values, passages, and examples.`,
    excluded.length?`Avoid recreating questions represented by these opaque prior fingerprints: ${excluded.join(', ')}.`:'This target has no prior learner fingerprints in this request.',
  ].join('\n')
}

function extractText(payload){const out=[];for(const item of payload?.output||[])for(const content of item?.content||[])if(content?.type==='output_text'&&typeof content.text==='string')out.push(content.text);return out.join('\n').trim()}

async function callModel(request,evidence,env){
  if(!env.OPENAI_API_KEY)throw new Error('Academic question generation is not configured')
  const model=safeText(env.OPENAI_MODEL||DEFAULT_MODEL,80)||DEFAULT_MODEL
  const response=await fetch('https://api.openai.com/v1/responses',{method:'POST',headers:{Authorization:`Bearer ${env.OPENAI_API_KEY}`,'Content-Type':'application/json'},body:JSON.stringify({
    model,store:false,max_output_tokens:18000,
    input:[{role:'system',content:[{type:'input_text',text:instructions(request,evidence)}]},{role:'user',content:[{type:'input_text',text:JSON.stringify({evidence:promptEvidence(evidence)})}]}],
    text:{format:{type:'json_schema',name:'sharecapsule_academic_assessment',strict:true,schema:schema(request.count)}},
  })})
  const payload=await response.json().catch(()=>({}))
  if(!response.ok)throw new Error(payload?.error?.message||`Academic question generator failed (${response.status})`)
  const text=extractText(payload);if(!text)throw new Error('Academic question generator returned no structured output')
  let parsed;try{parsed=JSON.parse(text)}catch{throw new Error('Academic question generator returned invalid JSON')}
  return{model,parsed}
}

function finalizeCompetencies(raw=[]){
  const seen=new Set(),items=[]
  for(const item of raw){const name=safeText(item.name,100);const key=normalize(name);if(!key||seen.has(key))continue;seen.add(key);items.push({name,weight:Math.min(1.5,Math.max(.5,Number(item.weight||1))),rationale:safeText(item.rationale,240),keywords:[]})}
  return items.slice(0,10)
}

async function finalizeQuestions(raw,request,evidence,competencies){
  const canonical=new Map(competencies.map((item)=>[normalize(item.name),item.name])),allowedSources=new Set((evidence.sources||[]).map((source)=>source.id)),excluded=new Set(request.excludeFingerprints),seen=new Set(),questions=[]
  for(const item of raw||[]){
    const competency=canonical.get(normalize(item.competency)),prompt=safeText(item.prompt,1800),options=Array.isArray(item.options)?item.options.map((option)=>safeText(option,700)):[],answer=Number(item.answer)
    if(!competency||!prompt||options.length!==4||!Number.isInteger(answer)||answer<0||answer>3)continue
    const fingerprint=await sha256(normalize(`${competency}|${prompt}`));if(excluded.has(fingerprint)||seen.has(fingerprint))continue;seen.add(fingerprint)
    questions.push({id:`academic-${fingerprint.slice(0,20)}`,fingerprint,track:'academic',competency,difficulty:['foundation','core','advanced'].includes(item.difficulty)?item.difficulty:'core',prompt,options,answer,explanation:safeText(item.explanation,1400),keywords:[normalize(request.profile.grade),normalize(request.profile.subject),normalize(request.profile.curriculumTrack),competency.toLowerCase()].filter(Boolean),prerequisites:[],sourceIds:[...new Set((item.sourceIds||[]).filter((id)=>allowedSources.has(id)))].slice(0,3),evidenceRationale:safeText(item.evidenceRationale,600),generation:'live-academic-target'})
  }
  return questions
}

export async function generateAcademicAssessmentQuestions(body,env,{forceResearch=false}={}){
  const request=sanitizeAcademicAssessmentRequest(body)
  if(!configuredProviders(env).length)throw new Error('Live search provider is not configured')
  const evidence=await researchTarget(request,env,{force:forceResearch})
  const generated=await callModel(request,evidence,env)
  const competencies=finalizeCompetencies(generated.parsed.competencies)
  if(competencies.length<4)throw new Error('Too few valid academic competencies were generated')
  const questions=await finalizeQuestions(generated.parsed.questions,request,evidence,competencies)
  if(questions.length<Math.min(10,request.count))throw new Error('Too few valid academic questions were generated')
  const label=evidence.target?.label||targetLabel(request.profile)
  return{
    version:1,target:{label,track:'academic'},generatedAt:new Date().toISOString(),
    generator:{configured:true,model:generated.model,store:false},
    model:{track:'academic',label,difficulty:'core',competencies,source:'Built from current public curriculum/standards evidence for the stated school system, grade, subject and course context.'},
    research:{...evidence,queryCacheDays:30},questions,requestedCount:request.count,generatedCount:questions.length,
    policy:{originalPracticeQuestions:true,verbatimSourceQuestions:false,schoolSpecificClaimsRequireEvidence:true},
  }
}
