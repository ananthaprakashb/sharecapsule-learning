import { buildLearningPath as buildBaseLearningPath } from './resources.js'
import { buildSrvusdGrade7LearningPath, isSrvusdGrade7 } from './srvusd-grade7.js'

const r = (id, title, publisher, url, format, competencies, options = {}) => ({
  id, title, publisher, url, format, competencies,
  company: options.company || [], keywords: options.keywords || [], minutes: options.minutes || 30,
  quality: options.quality || 'Institutional', description: options.description || '', targetEvidence: Boolean(options.targetEvidence),
})

const campusResources = [
  r('tcs-launchpad','TCS Launchpad','TCS','https://www.tcs.com/careers/india/tcs-launchpad','Official campus preparation portal',['Quantitative aptitude','Logical reasoning','Verbal communication','Programming fundamentals','Algorithms'],{company:['tcs'],quality:'Official company source',targetEvidence:true,minutes:35,description:'TCS campus-to-corporate learning community for entry-level aspirants preparing for TCS hiring.'}),
  r('hcltech-campus','Campus Hiring for Engineering Graduates','HCLTech','https://www.hcltech.com/careers/campus-hiring','Official campus careers page',['Programming fundamentals','Problem solving','Behavioral communication'],{company:['hcltech','hcl'],quality:'Official company source',targetEvidence:true,minutes:20,description:'HCLTech’s official campus-hiring path for engineering graduates and graduate engineer opportunities.'}),
  r('cognizant-newgrads','Students and New Grads – India','Cognizant','https://careers.cognizant.com/india-en/pathways-to-cognizant/students-and-new-grads/','Official graduate careers page',['Programming fundamentals','Problem solving','Behavioral communication'],{company:['cognizant'],quality:'Official company source',targetEvidence:true,minutes:20,description:'Cognizant’s official India pathway for students, emerging talent, and new graduates.'}),
  r('infosys-graduates','Infosys Careers – Graduates','Infosys','https://www.infosys.com/careers/graduates.html','Official graduate careers page',['Programming fundamentals','Problem solving','Behavioral communication'],{company:['infosys'],quality:'Official company source',targetEvidence:true,minutes:20,description:'Infosys graduate-career resources, training pathways, and entry-level opportunities.'}),
  r('wipro-early','Wipro Early Careers','Wipro','https://careers.wipro.com/content/Early-Careers/','Official early-career page',['Programming fundamentals','Problem solving','Behavioral communication'],{company:['wipro'],quality:'Official company source',targetEvidence:true,minutes:20,description:'Wipro’s official early-career page including technical graduate hiring programs.'}),
  r('nptel-python-dsa','Programming, Data Structures and Algorithms Using Python','SWAYAM / NPTEL','https://onlinecourses.nptel.ac.in/noc26_cs109/preview','University course',['Programming fundamentals','Algorithms','Data structures','Problem solving'],{quality:'University course',minutes:45,description:'Programming and problem-solving foundations through searching, sorting, dynamic programming, backtracking, classes, and core data structures.'}),
  r('nptel-java-dsa','Data Structure and Algorithms Using Java','SWAYAM / NPTEL','https://onlinecourses.nptel.ac.in/noc22_cs92/preview','University course',['Programming fundamentals','Object-oriented programming','Algorithms','Data structures'],{quality:'University course',minutes:45,description:'Java-oriented data structures, algorithms, and object-oriented programming for engineering students.'}),
  r('nptel-os','Operating System','SWAYAM / NPTEL','https://onlinecourses.nptel.ac.in/noc21_cs44/preview','University course',['Operating systems'],{quality:'University course',minutes:40,description:'Operating-system foundations including scheduling, virtual memory, file systems, security, and implementation concepts.'}),
  r('nptel-networks','Computer Networks and Internet Protocol','SWAYAM / NPTEL','https://onlinecourses.nptel.ac.in/noc26_cs35/preview','University course',['Networking'],{quality:'University course',minutes:40,description:'TCP/IP architecture and protocols with an undergraduate computer-networking focus.'}),
  r('postgres-campus','PostgreSQL Index Access Methods','PostgreSQL','https://www.postgresql.org/docs/current/indextypes.html','Primary database documentation',['Data & SQL'],{quality:'Primary technical documentation',minutes:25,description:'Primary documentation for database indexes and query-access tradeoffs.'}),
  r('khan-arithmetic-campus','Arithmetic','Khan Academy','https://www.khanacademy.org/math/arithmetic/','Practice + lessons',['Quantitative aptitude'],{quality:'Established educational source',minutes:30,description:'Practice for arithmetic fluency, fractions, decimals, percentages, and numerical foundations used in aptitude work.'}),
  r('khan-reasoning-campus','Logical Reasoning Lessons','Khan Academy','https://www.khanacademy.org/test-prep/lsat-prep','Reasoning lessons + practice',['Logical reasoning','Verbal communication'],{quality:'Established educational source',minutes:30,description:'Structured logical-reasoning practice for arguments, inference, evidence, assumptions, and elimination strategies.'}),
]

const norm = (value='') => String(value).toLowerCase()
const companies = (profile) => String(profile.companies || '').split(/[,;\n]/).map((x)=>norm(x.trim())).filter(Boolean)
function companyMatches(resource, profile) { if (!resource.company.length) return true; const targets=companies(profile); return resource.company.some((alias)=>targets.some((target)=>target.includes(alias)||alias.includes(target))) }
function scoreResource(resource, profile, gap) { if (!companyMatches(resource,profile)) return -1000; let score=resource.competencies.includes(gap.name)?35:0; if(resource.targetEvidence) score+=12; if(resource.quality.startsWith('Official')||resource.quality.startsWith('Primary')||resource.quality.startsWith('University')) score+=4; return score }
function campusPath(profile,gaps,model,maxBlocks){
  const targetSources=campusResources.filter((resource)=>resource.targetEvidence&&companyMatches(resource,profile)).slice(0,5)
  const blocks=gaps.filter((gap)=>gap.score<90).slice(0,maxBlocks).map((gap)=>{
    const resources=campusResources.map((resource)=>({resource,score:scoreResource(resource,profile,gap)})).filter((item)=>item.score>0).sort((a,b)=>b.score-a.score).slice(0,4).map((item)=>item.resource)
    const minutes=Math.min(90,Math.max(30,Math.round((30+gap.gap*0.55)/5)*5))
    return {competency:gap.name,score:gap.score,priority:gap.priority,rationale:gap.rationale,objective:gap.score<50?`Rebuild the foundations of ${gap.name}, then prove recall under placement-style time pressure.`:`Close the measured gap in ${gap.name} through targeted review, timed practice, and retrieval.`,minutes,resources}
  })
  return {label:model?.label||'Campus placement target',targetSources,blocks,catalogMode:'Campus reviewed-source catalog'}
}
export function buildLearningPath(profile,gaps,model,maxBlocks=3){
  if (isSrvusdGrade7(profile)) return buildSrvusdGrade7LearningPath(profile,gaps,model,maxBlocks)
  return profile.track==='campus'?campusPath(profile,gaps,model,maxBlocks):buildBaseLearningPath(profile,gaps,model,maxBlocks)
}
