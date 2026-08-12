const q = (id, competency, difficulty, prompt, options, answer, explanation, keywords = [], prerequisites = []) => ({
  id, track: 'academic', competency, difficulty, prompt, options, answer, explanation, keywords, prerequisites,
})

const c = (name, weight, rationale, keywords = []) => ({ name, weight, rationale, keywords })
const norm = (value = '') => String(value || '').trim().toLowerCase()
const containsAny = (text, values) => values.some((value) => text.includes(value))

export const SRVUSD_DISTRICT = 'San Ramon Valley Unified School District'
export const SRVUSD_MATH_TRACKS = ['Course 2 Math', 'Course 3 Math']

export function isSrvusdGrade7(profile = {}) {
  const grade = norm(profile.grade)
  const district = norm(profile.district || profile.schoolDistrict)
  const school = norm(profile.school)
  const subject = norm(profile.subject)
  const grade7 = /(^|\D)7(th)?(\D|$)/.test(grade) || grade === '7'
  const sanRamon = containsAny(district, ['san ramon valley', 'srvusd']) || containsAny(school, ['san ramon', 'iron horse', 'windemere', 'gale ranch', 'pine valley', 'california high'])
  const supportedSubject = containsAny(subject, ['math', 'mathematics', 'science', 'life science', 'integrated science'])
  return grade7 && sanRamon && supportedSubject
}

function isMath(profile) { return containsAny(norm(profile.subject), ['math', 'mathematics']) }
function mathTrack(profile) {
  const track = norm(profile.curriculumTrack || profile.mathCourse || profile.examName)
  return track.includes('course 3') || track.includes('accelerated') ? 'Course 3 Math' : 'Course 2 Math'
}

const course2Competencies = [
  c('Ratios & proportional relationships', 1.18, 'Unit rates, proportional relationships, and scale drawings are core Course 2 applications.', ['ratio','rate','proportion','scale']),
  c('Percent & rational numbers', 1.16, 'Percent equations, markup/discount, simple interest, integers, and rational-number operations are central Course 2 skills.', ['percent','discount','interest','integer','rational']),
  c('Expressions & equations', 1.2, 'Constructing expressions and solving equations or inequalities connects arithmetic to algebraic reasoning.', ['expression','equation','inequality','linear']),
  c('Geometry & measurement', 1.05, 'Angle relationships, scale factors, area, surface area, and volume require visual and numerical reasoning.', ['geometry','angle','area','surface','volume']),
  c('Statistics & probability', 1.0, 'Sampling, comparing populations, and probability models support evidence-based quantitative reasoning.', ['statistics','population','probability','chance']),
]

const course3Competencies = [
  c('Real numbers & exponents', 1.15, 'Integer exponents, scientific notation, and irrational numbers form the number-system foundation for accelerated work.', ['exponent','scientific notation','irrational','real number']),
  c('Linear functions & systems', 1.25, 'Slope, graphing, equations in one and two variables, and systems are the central algebraic thread of Course 3.', ['linear','slope','graph','system','equation']),
  c('Transformations & similarity', 1.05, 'Transformations, congruence, and similarity connect coordinate reasoning with geometry.', ['transformation','congruence','similarity','dilation']),
  c('Pythagorean theorem', 1.08, 'The Pythagorean theorem supports distance, right-triangle, and geometric problem solving.', ['pythagorean','triangle','distance']),
  c('3D geometry & volume', 0.98, 'Volume of cylinders, cones, and spheres extends measurement into three-dimensional modeling.', ['cylinder','cone','sphere','volume']),
]

const scienceCompetencies = [
  c('Cellular & body systems', 1.18, 'Cells, photosynthesis/respiration, and interacting organism subsystems are foundational life-science systems concepts.', ['cell','respiration','photosynthesis','body','system']),
  c('Weather, climate & Earth systems', 1.05, 'Students reason about interactions among Earth systems, local weather patterns, and regional climate.', ['weather','climate','earth','atmosphere']),
  c('Genetics, adaptation & inheritance', 1.18, 'Trait transmission, genetic variation, natural selection, and population adaptation connect heredity to change over time.', ['genetic','inheritance','trait','adaptation','selection']),
  c('Human impact & ecosystems', 1.08, 'Human activity, greenhouse gases, ecosystem shifts, and resource conservation connect systems thinking to environmental evidence.', ['ecosystem','greenhouse','human impact','resource','conservation']),
  c('Scientific inquiry & evidence', 1.14, 'NGSS-style learning depends on questions, models, investigations, data interpretation, and evidence-based explanations.', ['experiment','evidence','model','data','investigation']),
]

export function buildSrvusdGrade7Model(profile) {
  const math = isMath(profile)
  const course = math ? mathTrack(profile) : 'Grade 7 Integrated / Life Science'
  const competencies = math ? (course === 'Course 3 Math' ? course3Competencies : course2Competencies) : scienceCompetencies
  const school = String(profile.school || '').trim()
  return {
    track: 'academic',
    label: `SRVUSD Grade 7 · ${course}${school ? ` · ${school}` : ''}`,
    difficulty: 'core',
    competencies: competencies.map((item) => ({ ...item })),
    source: 'San Ramon Grade 7 curriculum profile. SRVUSD public materials confirm SpringBoard middle-school math pathways and NGSS/Inspire Science; the detailed unit map is the configured local syllabus for this preparation target.',
    curriculum: { district: SRVUSD_DISTRICT, grade: 'Grade 7', course },
  }
}

export const srvusdGrade7DiagnosticBank = [
  q('sr7-c2-ratio-1','Ratios & proportional relationships','foundation','A car travels 180 miles in 3 hours at a constant rate. What is the unit rate?',['30 miles/hour','60 miles/hour','90 miles/hour','540 miles/hour'],1,'180 ÷ 3 = 60 miles per hour.',['ratio','rate','proportion']),
  q('sr7-c2-ratio-2','Ratios & proportional relationships','core','On a scale drawing, 1 inch represents 6 feet. A wall is 4.5 inches long on the drawing. How long is the actual wall?',['10.5 ft','24 ft','27 ft','36 ft'],2,'4.5 × 6 = 27 feet.',['scale','proportion','ratio']),
  q('sr7-c2-percent-1','Percent & rational numbers','foundation','A $50 item is discounted by 20%. What is the sale price?',['$10','$30','$40','$45'],2,'20% of $50 is $10, so the sale price is $40.',['percent','discount']),
  q('sr7-c2-percent-2','Percent & rational numbers','core','A savings account earns 4% simple interest per year on $600. How much interest is earned in 2 years?',['$24','$48','$52','$96'],1,'Simple interest = principal × rate × time = 600 × 0.04 × 2 = $48.',['percent','interest','rational']),
  q('sr7-c2-equation-1','Expressions & equations','foundation','Solve 3x + 7 = 25.',['x = 4','x = 6','x = 8','x = 10'],1,'Subtract 7 to get 3x = 18, then divide by 3: x = 6.',['equation','linear']),
  q('sr7-c2-equation-2','Expressions & equations','core','A club can spend at most $120. It already spent $36 and each shirt costs $14. Which inequality represents the number s of additional shirts it can buy?',['36 + 14s ≤ 120','36 + 14s ≥ 120','14 + 36s ≤ 120','36s − 14 ≤ 120'],0,'The existing $36 plus $14 per shirt cannot exceed $120.',['inequality','expression','linear']),
  q('sr7-c2-geometry-1','Geometry & measurement','foundation','A rectangle is 8 cm by 5 cm. What is its area?',['13 cm²','26 cm²','40 cm²','80 cm²'],2,'Area = length × width = 8 × 5 = 40 cm².',['geometry','area']),
  q('sr7-c2-geometry-2','Geometry & measurement','core','A rectangular prism is 4 cm long, 3 cm wide, and 5 cm high. What is its volume?',['12 cm³','20 cm³','47 cm³','60 cm³'],3,'Volume = 4 × 3 × 5 = 60 cm³.',['geometry','volume']),
  q('sr7-c2-stats-1','Statistics & probability','foundation','A random sample of 50 students finds that 30 prefer option A. About what fraction of the population would you predict prefers option A?',['20%','40%','60%','80%'],2,'30 out of 50 is 60%, so 60% is a reasonable estimate from this sample.',['statistics','population']),
  q('sr7-c2-stats-2','Statistics & probability','core','A spinner has 8 equal sections, 3 of which are blue. What is the probability of landing on blue?',['3/5','3/8','5/8','1/8'],1,'There are 3 favorable outcomes out of 8 equally likely outcomes.',['probability','chance']),

  q('sr7-c3-exp-1','Real numbers & exponents','foundation','What is 2³ × 2²?',['2⁵','2⁶','4⁵','4⁶'],0,'When multiplying powers with the same base, add exponents: 2^(3+2) = 2⁵.',['exponent']),
  q('sr7-c3-exp-2','Real numbers & exponents','core','Which is 0.00045 written in scientific notation?',['4.5 × 10⁻⁴','4.5 × 10⁴','45 × 10⁻⁴','0.45 × 10⁻⁴'],0,'Move the decimal four places right to get 4.5, so the exponent is −4.',['scientific notation','exponent']),
  q('sr7-c3-linear-1','Linear functions & systems','foundation','A line rises 6 units while running 3 units to the right. What is its slope?',['1/2','2','3','9'],1,'Slope = rise/run = 6/3 = 2.',['linear','slope','graph']),
  q('sr7-c3-linear-2','Linear functions & systems','core','Solve the system: y = x + 2 and y = 2x − 1.',['(1,3)','(2,4)','(3,5)','(4,6)'],2,'Set x + 2 = 2x − 1, giving x = 3 and y = 5.',['system','linear','equation']),
  q('sr7-c3-transform-1','Transformations & similarity','foundation','Which transformation preserves both shape and size?',['Dilation by factor 2','Translation','Stretching only horizontally','Scaling by factor 3'],1,'A translation is a rigid motion, so it preserves lengths and angles.',['transformation','congruence']),
  q('sr7-c3-transform-2','Transformations & similarity','core','A figure is dilated by scale factor 1.5. A side of length 8 becomes:',['5.3','8','9.5','12'],3,'8 × 1.5 = 12.',['similarity','dilation','scale']),
  q('sr7-c3-pyth-1','Pythagorean theorem','foundation','A right triangle has legs 3 and 4. What is the hypotenuse?',['5','6','7','12'],0,'3² + 4² = 9 + 16 = 25, so the hypotenuse is 5.',['pythagorean','triangle']),
  q('sr7-c3-pyth-2','Pythagorean theorem','core','A square has side length 6. What is the length of its diagonal?',['6','12','6√2','36'],2,'The diagonal is the hypotenuse of a right triangle with legs 6 and 6: √72 = 6√2.',['pythagorean','distance']),
  q('sr7-c3-volume-1','3D geometry & volume','foundation','What is the volume of a cylinder with radius 3 and height 5?',['15π','30π','45π','90π'],2,'V = πr²h = π × 9 × 5 = 45π.',['cylinder','volume']),
  q('sr7-c3-volume-2','3D geometry & volume','core','A cone and cylinder have the same radius and height. How does the cone’s volume compare with the cylinder’s?',['Same volume','Half the volume','One-third the volume','Three times the volume'],2,'A cone has one-third the volume of a cylinder with the same base and height.',['cone','cylinder','volume']),

  q('sr7-sci-cell-1','Cellular & body systems','foundation','Which structure controls what enters and leaves a cell?',['Cell membrane','Chromosome','Ribosome','Cytoplasm'],0,'The cell membrane regulates movement of substances into and out of the cell.',['cell','system']),
  q('sr7-sci-cell-2','Cellular & body systems','core','Why are photosynthesis and cellular respiration connected in many ecosystems?',['Both occur only in animals','Products of one process can serve as reactants for the other','They always happen at the same rate','Neither involves energy transfer'],1,'Photosynthesis produces glucose and oxygen used in respiration; respiration produces carbon dioxide and water used in photosynthesis.',['photosynthesis','respiration','cell']),
  q('sr7-sci-climate-1','Weather, climate & Earth systems','foundation','Which statement best distinguishes weather from climate?',['Weather is long-term; climate is daily','Weather describes short-term conditions; climate describes long-term patterns','They mean exactly the same thing','Climate occurs only in winter'],1,'Weather is short-term atmospheric conditions, while climate describes patterns over longer periods.',['weather','climate']),
  q('sr7-sci-climate-2','Weather, climate & Earth systems','core','Why can coastal areas have milder temperatures than inland areas?',['Ocean water changes temperature more slowly than land','The ocean blocks all sunlight','Coastal air contains no water vapor','Inland areas have no atmosphere'],0,'Large bodies of water heat and cool more slowly than land, moderating nearby temperatures.',['climate','earth','weather']),
  q('sr7-sci-genetics-1','Genetics, adaptation & inheritance','foundation','An inherited trait is best described as a trait that:',['Is learned only at school','Can be passed from parents to offspring through genetic information','Always appears identically in every sibling','Is caused only by weather'],1,'Inherited traits are influenced by genetic information passed from parents to offspring.',['genetics','inheritance','trait']),
  q('sr7-sci-genetics-2','Genetics, adaptation & inheritance','core','A population of insects contains color variation. Birds more easily see and eat the lighter insects on dark bark. Over many generations, what is most likely?',['All insects become identical immediately','Darker-color traits may become more common','The bark stops affecting survival','Genetic variation disappears in one generation'],1,'If darker insects survive and reproduce more often, alleles associated with darker color can become more common over generations.',['adaptation','selection','genetic']),
  q('sr7-sci-ecosystem-1','Human impact & ecosystems','foundation','Which action most directly reduces atmospheric greenhouse-gas emissions?',['Burning more fossil fuel','Improving energy efficiency and using lower-carbon energy','Removing all plants from a city','Increasing landfill waste'],1,'Using less energy and lower-carbon sources can reduce greenhouse-gas emissions.',['greenhouse','human impact','conservation']),
  q('sr7-sci-ecosystem-2','Human impact & ecosystems','core','If a key predator is removed from an ecosystem, why might several other populations change?',['Food webs connect species through feeding relationships','Only predators use energy','Ecosystems have no interactions','Population sizes never respond to species loss'],0,'Changing one population can affect prey, competitors, and resources throughout a food web.',['ecosystem','human impact']),
  q('sr7-sci-inquiry-1','Scientific inquiry & evidence','foundation','Why is a control group useful in an investigation?',['It guarantees the hypothesis is true','It provides a comparison for the tested variable','It removes the need to collect data','It makes every result identical'],1,'A control provides a baseline for comparing the effect of the independent variable.',['experiment','evidence','investigation']),
  q('sr7-sci-inquiry-2','Scientific inquiry & evidence','core','Two groups of plants receive different fertilizer amounts, but they also receive different amounts of sunlight. Why is this a problem?',['Sunlight is a confounding variable','Plants cannot be measured','Fertilizer has no effect on plants','The groups must always contain one plant'],0,'Because sunlight also differs, the experiment cannot isolate fertilizer as the cause of any observed difference.',['experiment','data','evidence']),
]

const resources = [
  { id:'srvusd-math', title:'Middle School Math', publisher:'SRVUSD', url:'https://www.srvusd.net/Departments/Educational-Services/Math/', format:'Official district curriculum page', competencies:[...course2Competencies,...course3Competencies].map((x)=>x.name), quality:'Official district source', description:'SRVUSD middle-school math pathways, Courses 1–3, SpringBoard access, and placement/advancement information.', targetEvidence:true, minutes:20 },
  { id:'srvusd-science', title:'Science Instructional Materials', publisher:'SRVUSD', url:'https://www.srvusd.net/__catapult_pages/add0e316-210b-4081-a8d6-a9fd94dd0803/Science.html', format:'Official district curriculum page', competencies:scienceCompetencies.map((x)=>x.name), quality:'Official district source', description:'SRVUSD grades 6–8 Inspire Science materials and NGSS/state-framework references.', targetEvidence:true, minutes:20 },
  { id:'ca-ngss', title:'NGSS for California Public Schools', publisher:'California Department of Education', url:'https://www.cde.ca.gov/CI/pl/ngssstandards.asp', format:'Official standards', competencies:scienceCompetencies.map((x)=>x.name), quality:'Government standards source', description:'California NGSS standards and middle-grade models, including Grade 7 resources.', targetEvidence:true, minutes:25 },
  { id:'khan-grade7', title:'7th Grade Math', publisher:'Khan Academy', url:'https://www.khanacademy.org/math/cc-seventh-grade-math', format:'Lessons + practice', competencies:course2Competencies.map((x)=>x.name), quality:'Established educational source', description:'Standards-aligned practice for ratios, rational numbers, equations, geometry, statistics, and probability.', targetEvidence:false, minutes:35 },
  { id:'khan-grade8', title:'8th Grade Math', publisher:'Khan Academy', url:'https://www.khanacademy.org/math/cc-eighth-grade-math', format:'Lessons + practice', competencies:course3Competencies.map((x)=>x.name), quality:'Established educational source', description:'Practice for exponents, linear equations, transformations, Pythagorean theorem, and volume topics aligned with accelerated Course 3 skills.', targetEvidence:false, minutes:35 },
  { id:'khan-ms-biology', title:'Middle School Biology', publisher:'Khan Academy', url:'https://www.khanacademy.org/science/ms-biology', format:'Lessons + practice', competencies:['Cellular & body systems','Genetics, adaptation & inheritance','Human impact & ecosystems','Scientific inquiry & evidence'], quality:'Established educational source', description:'Middle-school biology lessons and practice covering cells and organisms, heredity and variation, evolution, and ecosystems with NGSS-aligned skills.', targetEvidence:false, minutes:35 },
  { id:'khan-ms-earth', title:'Middle School Earth and Space Science', publisher:'Khan Academy', url:'https://www.khanacademy.org/science/middle-school-earth-and-space-science', format:'Lessons + practice', competencies:['Weather, climate & Earth systems','Human impact & ecosystems','Scientific inquiry & evidence'], quality:'Established educational source', description:'Middle-school Earth science lessons and practice covering weather, climate, Earth systems, natural resources, and human impacts.', targetEvidence:false, minutes:35 },
]

export function buildSrvusdGrade7LearningPath(profile, gaps, model, maxBlocks = 3) {
  const math = isMath(profile)
  const course = math ? mathTrack(profile) : 'Science'
  const relevant = resources.filter((resource) => {
    if (course === 'Course 2 Math') return ['srvusd-math','khan-grade7'].includes(resource.id)
    if (course === 'Course 3 Math') return ['srvusd-math','khan-grade8'].includes(resource.id)
    return ['srvusd-science','ca-ngss','khan-ms-biology','khan-ms-earth'].includes(resource.id)
  })
  const targetSources = relevant.filter((resource) => resource.targetEvidence)
  const blocks = gaps.filter((gap) => gap.score < 90).slice(0, maxBlocks).map((gap) => {
    const selected = relevant.filter((resource) => resource.competencies.includes(gap.name)).slice(0, 3)
    const minutes = Math.min(75, Math.max(25, Math.round((25 + gap.gap * 0.45) / 5) * 5))
    return {
      competency: gap.name, score: gap.score, priority: gap.priority, rationale: gap.rationale,
      objective: gap.score < 50 ? `Rebuild the Grade 7 foundation for ${gap.name}, then retry without hints.` : `Strengthen ${gap.name} with worked examples, retrieval practice, and mixed problems.`,
      minutes, resources: selected,
    }
  })
  return { label: model?.label || 'SRVUSD Grade 7', targetSources, blocks, catalogMode:'SRVUSD Grade 7 reviewed curriculum sources' }
}
