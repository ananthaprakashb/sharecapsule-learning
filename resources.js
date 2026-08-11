const r = (id, title, publisher, url, format, competencies, options = {}) => ({
  id, title, publisher, url, format, competencies,
  track: options.track || 'both',
  company: options.company || [],
  examKeywords: options.examKeywords || [],
  keywords: options.keywords || [],
  minutes: options.minutes || 30,
  quality: options.quality || 'Institutional',
  description: options.description || '',
  targetEvidence: Boolean(options.targetEvidence),
})

export const resourceCatalog = [
  r('amazon-sde2-prep','SDE II Interview Prep','Amazon Jobs','https://www.amazon.jobs/content/en/how-we-hire/sde-ii-interview-prep','Official interview guide + videos',['Algorithms','Data structures','System design','Behavioral communication','Problem solving'],{
    track:'interview', company:['amazon'], keywords:['sde ii','software development engineer','sde2'], minutes:45, quality:'Official company source', targetEvidence:true,
    description:'Amazon’s public SDE II preparation page covering the assessment, interview loop, coding, system design, and behavioral preparation.'
  }),
  r('amazon-swe-topics','Software development interview topics','Amazon Jobs','https://www.amazon.jobs/content/en-gb/how-we-hire/interview-prep/software-development-topics','Official interview topics',['Algorithms','Data structures','System design','Problem solving'],{
    track:'interview', company:['amazon'], keywords:['software','developer','engineer','sde'], minutes:30, quality:'Official company source', targetEvidence:true,
    description:'Public Amazon guidance on technical topics and how software-development candidates are evaluated.'
  }),
  r('amazon-interview-faq','Interview Prep FAQ','Amazon Jobs','https://www.amazon.jobs/content/en/faq/interview-prep','Official interview guide',['Behavioral communication','Problem solving'],{
    track:'interview', company:['amazon'], minutes:20, quality:'Official company source', targetEvidence:true,
    description:'Amazon’s public interview preparation FAQ, including behavioral interviewing and STAR-method guidance.'
  }),
  r('google-interview-tips','Interviewing at Google: best practices, advice, and tips','Google Careers','https://www.google.com/about/careers/applications/interview-tips','Official interview guide',['Problem solving','Behavioral communication'],{
    track:'interview', company:['google'], minutes:25, quality:'Official company source', targetEvidence:true,
    description:'Google Careers’ public interview-preparation guidance and best practices.'
  }),
  r('mit-6006','Introduction to Algorithms (6.006)','MIT OpenCourseWare','https://ocw.mit.edu/courses/6-006-introduction-to-algorithms-spring-2020/','Course · lecture videos · notes · problems',['Algorithms','Data structures','Problem solving'],{
    track:'interview', keywords:['algorithm','coding','data structure'], minutes:50, quality:'University course',
    description:'MIT course materials covering data structures, graph search, dynamic programming, sorting, and algorithm analysis.'
  }),
  r('mdn-javascript','JavaScript Guide','MDN Web Docs','https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide','Documentation + guide',['JavaScript','Frontend'],{
    track:'interview', keywords:['javascript','node','frontend'], minutes:35, quality:'Primary technical documentation',
    description:'Structured JavaScript language guide covering core syntax, functions, objects, promises, modules, and advanced topics.'
  }),
  r('react-learn','Learn React','React','https://react.dev/learn','Official documentation + interactive examples',['Frontend','JavaScript'],{
    track:'interview', keywords:['react','frontend'], minutes:40, quality:'Primary technical documentation',
    description:'Official modern React learning material with examples and practice challenges.'
  }),
  r('mdn-http','Overview of HTTP','MDN Web Docs','https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/Overview','Documentation + protocol guide',['API design','Networking'],{
    track:'interview', keywords:['api','http','rest','network'], minutes:25, quality:'Primary technical documentation',
    description:'A concise foundation in HTTP request/response behavior, intermediaries, messages, and web APIs.'
  }),
  r('postgres-indexes','PostgreSQL Index Access Methods','PostgreSQL','https://www.postgresql.org/docs/current/indextypes.html','Official database documentation',['Data & SQL'],{
    track:'interview', keywords:['sql','database','postgres','index'], minutes:30, quality:'Primary technical documentation',
    description:'Official PostgreSQL documentation for understanding index families and when index structures help.'
  }),
  r('google-sre-books','Google SRE Books','Google','https://sre.google/books/','Books · operational case studies',['Reliability','Debugging','System design','Networking'],{
    track:'interview', keywords:['sre','reliability','production','operations','system design'], minutes:45, quality:'Primary engineering source',
    description:'Google’s public SRE books on reliability, production operations, incident response, and scalable systems.'
  }),
  r('aws-well-architected','AWS Well-Architected Framework','Amazon Web Services','https://aws.amazon.com/architecture/well-architected/','Architecture framework + guidance',['System design','Reliability'],{
    track:'interview', keywords:['aws','cloud','architecture','system design','reliability'], minutes:35, quality:'Primary technical documentation',
    description:'AWS architecture guidance across reliability, security, performance, operational excellence, cost, and sustainability.'
  }),
  r('openstax-algebra','Algebra and Trigonometry','OpenStax · Rice University','https://openstax.org/books/algebra-and-trigonometry/pages/1-introduction-to-prerequisites','Open textbook + worked examples',['Number sense','Algebraic reasoning','Functions','Probability'],{
    track:'academic', keywords:['algebra','math','functions','quadratic','logarithm'], minutes:40, quality:'University open textbook',
    description:'OpenStax algebra and trigonometry text with explanations, worked examples, exercises, and prerequisite review.'
  }),
  r('khan-algebra2','Algebra 2','Khan Academy','https://www.khanacademy.org/algebra2','Videos + practice + unit tests',['Algebraic reasoning','Functions','Number sense'],{
    track:'academic', keywords:['algebra 2','algebra ii','quadratic','functions','logarithm'], minutes:35, quality:'Established educational source',
    description:'Video lessons, guided examples, practice, and course challenges across core Algebra 2 topics.'
  }),
  r('openstax-biology','Biology 2e','OpenStax · Rice University','https://openstax.org/details/books/biology-2e','Open textbook + practice',['Biology foundations','Scientific reasoning'],{
    track:'academic', keywords:['biology','cells','genetics','ecology'], minutes:40, quality:'University open textbook',
    description:'OpenStax Biology 2e provides broad introductory biology coverage and practice questions.'
  }),
  r('khan-ap-biology','AP®/College Biology','Khan Academy','https://www.khanacademy.org/science/biology/ap-biology','Videos + AP-aligned practice',['Biology foundations','Scientific reasoning'],{
    track:'academic', examKeywords:['ap biology'], keywords:['biology','ap biology'], minutes:40, quality:'Established educational source',
    description:'Video lessons, articles, practice, and worked AP Biology free-response examples.'
  }),
  r('collegeboard-ap-biology','AP Biology Exam','College Board','https://apstudents.collegeboard.org/courses/ap-biology/assessment','Official exam guide + practice links',['Biology foundations','Scientific reasoning'],{
    track:'academic', examKeywords:['ap biology'], minutes:25, quality:'Official exam provider', targetEvidence:true,
    description:'Official AP Biology exam structure, tested skills, course/exam description, and preparation resources.'
  }),
  r('openstax-chemistry','Chemistry 2e','OpenStax · Rice University','https://openstax.org/details/books/chemistry-2e','Open textbook + exercises',['Chemistry foundations','Scientific reasoning'],{
    track:'academic', keywords:['chemistry','stoichiometry','atoms','moles'], minutes:40, quality:'University open textbook',
    description:'OpenStax Chemistry 2e covers general chemistry concepts with examples and exercises.'
  }),
  r('openstax-physics','Physics','OpenStax · Rice University','https://openstax.org/details/books/physics/','Open textbook + labs + practice',['Physics foundations','Scientific reasoning'],{
    track:'academic', keywords:['physics','motion','force','energy'], minutes:40, quality:'University open textbook',
    description:'High-school-oriented OpenStax physics with worked examples, labs, and multiple assessment formats.'
  }),
  r('khan-highschool-physics','High school physics','Khan Academy','https://www.khanacademy.org/science/highschool-physics','Videos + practice',['Physics foundations','Scientific reasoning'],{
    track:'academic', keywords:['physics','motion','forces','energy'], minutes:35, quality:'Established educational source',
    description:'Video lessons and practice across motion, forces, momentum, energy, electromagnetism, and modern physics.'
  }),
  r('collegeboard-ap-calc','AP Calculus AB Exam','College Board','https://apstudents.collegeboard.org/courses/ap-calculus-ab/assessment','Official exam guide + practice links',['Functions','Algebraic reasoning','Number sense'],{
    track:'academic', examKeywords:['ap calculus ab','ap calculus'], minutes:25, quality:'Official exam provider', targetEvidence:true,
    description:'Official AP Calculus AB exam structure, skills, course/exam description, and preparation links.'
  }),
  r('collegeboard-ap-english','AP English Language and Composition Exam','College Board','https://apstudents.collegeboard.org/courses/ap-english-language-and-composition/assessment','Official exam guide',['Evidence & inference','Writing & argument'],{
    track:'academic', examKeywords:['ap english language','ap lang'], minutes:25, quality:'Official exam provider', targetEvidence:true,
    description:'Official AP English Language exam information for text analysis, evidence, and written argument.'
  }),
]

const text = (profile) => [profile.subject, profile.topics, profile.examName, profile.company, profile.role, profile.level, profile.skills, profile.jobDescription]
  .filter(Boolean).join(' ').toLowerCase()

function profileMatches(resource, profile) {
  if (resource.track !== 'both' && resource.track !== profile.track) return false
  const haystack = text(profile)
  if (resource.company.length && !resource.company.some((item) => (profile.company || '').toLowerCase().includes(item))) return false
  if (resource.examKeywords.length && !resource.examKeywords.some((item) => haystack.includes(item))) return false
  return true
}

function resourceScore(resource, profile, gap) {
  if (!profileMatches(resource, profile)) return -1000
  const haystack = text(profile)
  let score = 0
  if (resource.competencies.includes(gap.name)) score += 30
  if (resource.targetEvidence) score += 8
  score += resource.keywords.reduce((sum, keyword) => sum + (haystack.includes(keyword) ? 4 : 0), 0)
  if (resource.company.length) score += 15
  if (resource.examKeywords.length) score += 15
  if (resource.quality.startsWith('Official') || resource.quality.startsWith('Primary')) score += 3
  return score
}

function targetSourceScore(resource, profile) {
  if (!profileMatches(resource, profile) || !resource.targetEvidence) return -1000
  const haystack = text(profile)
  let score = 20
  score += resource.keywords.reduce((sum, keyword) => sum + (haystack.includes(keyword) ? 5 : 0), 0)
  if (resource.company.length) score += 20
  if (resource.examKeywords.length) score += 20
  return score
}

export function buildLearningPath(profile, gaps, model, maxBlocks = 3) {
  const targetSources = resourceCatalog
    .map((resource) => ({ resource, score: targetSourceScore(resource, profile) }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map((item) => item.resource)

  const blocks = gaps
    .filter((gap) => gap.score < 90)
    .slice(0, maxBlocks)
    .map((gap) => {
      const resources = resourceCatalog
        .map((resource) => ({ resource, score: resourceScore(resource, profile, gap) }))
        .filter((item) => item.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, 3)
        .map((item) => item.resource)
      const minutes = Math.min(90, Math.max(30, Math.round((30 + gap.gap * 0.55) / 5) * 5))
      return {
        competency: gap.name,
        score: gap.score,
        priority: gap.priority,
        rationale: gap.rationale,
        objective: gap.score < 50
          ? `Rebuild the foundations of ${gap.name}, then prove recall without hints.`
          : `Close the measured gap in ${gap.name} through targeted review and retrieval practice.`,
        minutes,
        resources,
      }
    })

  return {
    label: model?.label || 'Your target',
    targetSources,
    blocks,
    catalogMode: 'Reviewed public-source catalog',
  }
}
