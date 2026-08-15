import { createProgressBundle, downloadBlob, downloadReport, ensureSignedReport, getStoredReports } from './reporting.js'

let activeTargetKey=''
let activeSnapshotKey=''
let currentReport=null
let syncing=false

function readProfile(){try{return JSON.parse(localStorage.getItem('prepare-profile')||'{}')}catch{return{}}}
const norm=(value='')=>String(value).trim().toLowerCase().replace(/\s+/g,' ')
function targetKey(p){
  if(p.track==='campus'){
    const companies=String(p.companies||'').split(/[,;\n]/).map(norm).filter(Boolean).sort().join('|')
    return ['campus',p.degree,p.branch,p.semester,p.graduationYear,companies].map(norm).join('|')
  }
  if(p.track==='interview')return['interview',p.company,p.role,p.level].map(norm).join('|')
  return['academic',p.country,p.region||p.state,p.district,p.school,p.grade,p.subject,p.curriculumTrack,p.examName].map(norm).join('|')
}
function numberFrom(text=''){const value=Number.parseFloat(String(text).replace(/[^0-9.\-]/g,''));return Number.isFinite(value)?value:null}
function model(){return[...document.querySelectorAll('.model-chip-list > span')].map((n)=>({name:n.querySelector('b')?.textContent?.trim()||'',weight:numberFrom(n.querySelector('small')?.textContent||'')})).filter((x)=>x.name)}
function competencies(){return[...document.querySelectorAll('.skill-evidence')].map((n)=>{const scoreText=n.querySelector('.skill-row > div:first-child span')?.textContent||'';return{name:n.querySelector('.skill-row strong')?.textContent?.trim()||'',score:numberFrom(scoreText),evidence:scoreText.includes('·')?scoreText.split('·').slice(1).join('·').trim():'',status:n.querySelector('.skill-row > b')?.textContent?.trim()||'',explanation:n.querySelector(':scope > p')?.textContent?.trim()||''}}).filter((x)=>x.name)}
function plan(){return[...document.querySelectorAll('.focus-item')].map((n)=>({competency:n.querySelector('strong')?.textContent?.trim()||'',action:n.querySelector('small')?.textContent?.trim()||'',allocated:n.querySelector(':scope > b')?.textContent?.trim()||''})).filter((x)=>x.competency)}
function learningProgress(label){try{const rows=JSON.parse(localStorage.getItem('prepare-learning-progress')||'[]');return Array.isArray(rows)?rows.filter((row)=>row?.target===label).slice(-30).map((row)=>({competency:String(row.competency||'').slice(0,100),passed:Boolean(row.passed),before:Number(row.before),after:Number(row.after),at:row.at})):[]}catch{return[]}}
function publicProfile(p){
  const common=['track','targetDate']
  const trackFields=p.track==='campus'
    ? ['degree','branch','semester','graduationYear','cgpa','companies','programmingLanguages']
    : p.track==='interview'
      ? ['company','role','level','experience','skills']
      : ['country','region','grade','subject','examName','topics','currentScore','desiredScore','district','school','curriculumTrack']
  const fields=[...common,...trackFields]
  return Object.fromEntries(fields.filter((key)=>p[key]!==undefined&&p[key]!=='').map((key)=>[key,p[key]]))
}
function buildPayload(){
  const p=readProfile()
  const label=document.querySelector('.model-panel h3')?.textContent?.trim()||'Prepare target'
  const readiness=numberFrom(document.querySelector('.results-hero h2')?.textContent||'')
  const diagnosticText=document.querySelector('.score-ring b')?.textContent?.trim()||''
  const[correct,total]=diagnosticText.split('/').map((v)=>Number.parseInt(v,10))
  return{payloadVersion:1,target:{label,targetKey:targetKey(p),profile:publicProfile(p)},assessment:{readiness,readinessLabel:document.querySelector('.results-hero > div:first-child > strong')?.textContent?.trim()||'',diagnostic:{correct:Number.isFinite(correct)?correct:null,total:Number.isFinite(total)?total:null},targetModel:model(),competencies:competencies(),plan:plan()},learningProgress:learningProgress(label),privacy:{rawDiagnosticAnswersIncluded:false,jobDescriptionIncluded:false,projectNarrativeIncluded:false,generatedLocally:true},generatedBy:{product:'ShareCapsule Prepare',page:location.origin}}
}
function snapshotKey(payload){return JSON.stringify({target:payload.target.targetKey,readiness:payload.assessment.readiness,diagnostic:payload.assessment.diagnostic,competencies:payload.assessment.competencies.map((x)=>[x.name,x.score,x.evidence]),learning:payload.learningProgress.map((x)=>[x.competency,x.passed,x.after,x.at])})}
function setText(node,value){if(node&&node.textContent!==value)node.textContent=value}
function setStatus(panel,message,bad=false){const node=panel.querySelector('[data-report-status]');if(node){setText(node,message);node.classList.toggle('bad',bad)}}
function enable(panel,key){const count=getStoredReports(key).filter((r)=>r.reportType==='assessment').length;const one=panel.querySelector('[data-download-report]'),bundle=panel.querySelector('[data-download-bundle]');if(one&&one.disabled===Boolean(currentReport))one.disabled=!currentReport;if(bundle){if(bundle.disabled===Boolean(currentReport))bundle.disabled=!currentReport;setText(bundle,`Download progress ZIP (${count})`)}}
function createPanel(){
  let panel=document.querySelector('#report-export-panel');if(panel)return panel
  const anchor=document.querySelector('.next-panel')||document.querySelector('.source-learning-panel');if(!anchor)return null
  panel=document.createElement('section');panel.id='report-export-panel';panel.className='panel report-export-panel'
  panel.innerHTML=`<div><div class="eyebrow">Private progress record</div><h3>Signed local report</h3><p class="support-copy">The full report stays on this device. Only a SHA-256 hash and minimal envelope metadata are sent for signing; later edits fail verification.</p><p class="report-status" data-report-status>Preparing signed snapshot…</p></div><div class="report-actions"><button class="secondary-button" data-download-report disabled>Download signed report</button><button class="primary-button" data-download-bundle disabled>Download progress ZIP</button></div>`
  anchor.insertAdjacentElement('afterend',panel)
  panel.querySelector('[data-download-report]').onclick=async()=>{const report=await ensureCurrent(panel);if(report)downloadReport(report)}
  panel.querySelector('[data-download-bundle]').onclick=async()=>{try{const report=await ensureCurrent(panel);if(!report)return;setStatus(panel,'Building signed progress bundle…');const bundle=await createProgressBundle(report.payload.target.targetKey);downloadBlob(bundle.zip,bundle.filename);setStatus(panel,`${bundle.count} signed assessment report${bundle.count===1?'':'s'} included in this ZIP.`)}catch(error){setStatus(panel,error instanceof Error?error.message:'Could not create progress bundle.',true)}}
  return panel
}
async function ensureCurrent(panel,payload=buildPayload()){
  const nextTarget=payload.target.targetKey,nextSnapshot=snapshotKey(payload)
  if(currentReport&&activeTargetKey===nextTarget&&activeSnapshotKey===nextSnapshot)return currentReport
  if(syncing)return null
  syncing=true
  try{setStatus(panel,'Creating tamper-evident local snapshot…');activeTargetKey=nextTarget;activeSnapshotKey=nextSnapshot;currentReport=await ensureSignedReport(payload,'assessment');enable(panel,activeTargetKey);const count=getStoredReports(activeTargetKey).filter((r)=>r.reportType==='assessment').length;setStatus(panel,`Signed snapshot saved locally. ${count} assessment report${count===1?'':'s'} stored for this target.`);return currentReport}catch(error){currentReport=null;enable(panel,activeTargetKey);setStatus(panel,error instanceof Error?error.message:'Signed report is unavailable.',true);return null}finally{syncing=false}
}
async function enhance(){if(!document.querySelector('.results-wrap')){activeTargetKey='';activeSnapshotKey='';currentReport=null;return}const panel=createPanel();if(!panel)return;const payload=buildPayload(),nextTarget=payload.target.targetKey,nextSnapshot=snapshotKey(payload);if(nextTarget!==activeTargetKey||nextSnapshot!==activeSnapshotKey){currentReport=null;await ensureCurrent(panel,payload)}else enable(panel,nextTarget)}
let queued=false
const observer=new MutationObserver(()=>{if(queued)return;queued=true;queueMicrotask(()=>{queued=false;enhance()})})
observer.observe(document.querySelector('#app')||document.body,{childList:true,subtree:true})
enhance()
