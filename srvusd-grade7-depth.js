const norm = (value = '') => String(value || '').trim().toLowerCase()
const containsAny = (text, values) => values.some((value) => text.includes(value))

function rotate(values, amount) {
  if (!values.length) return values
  const n = ((amount % values.length) + values.length) % values.length
  return [...values.slice(n), ...values.slice(0, n)]
}

function hash(text) {
  let value = 2166136261
  for (const char of String(text)) {
    value ^= char.charCodeAt(0)
    value = Math.imul(value, 16777619)
  }
  return value >>> 0
}

function choice(id, competency, difficulty, prompt, correct, distractors, explanation, keywords = [], prerequisites = []) {
  const correctText = String(correct)
  const unique = [correctText, ...distractors.map(String)].filter((value, index, all) => all.indexOf(value) === index)
  const fillers = ['None of these', 'Cannot be determined', 'All of these']
  while (unique.length < 4) unique.push(fillers[unique.length - 1])
  const options = rotate(unique.slice(0, 4), hash(id) % 4)
  return {
    id,
    track: 'academic',
    competency,
    difficulty,
    prompt,
    options,
    answer: options.indexOf(correctText),
    explanation,
    keywords,
    prerequisites,
  }
}

function fixed(id, competency, difficulty, prompt, options, answer, explanation, keywords = [], prerequisites = []) {
  return { id, track:'academic', competency, difficulty, prompt, options, answer, explanation, keywords, prerequisites }
}

function course2Questions() {
  const out = []
  const ratioUnits = [[180,3],[240,4],[350,5],[420,7],[560,8]]
  ratioUnits.forEach(([distance,hours],i) => {
    const rate = distance / hours
    out.push(choice(`sr7d-c2-r-unit-${i}`,'Ratios & proportional relationships',i < 2 ? 'foundation':'core',`A cyclist travels ${distance} miles in ${hours} hours at a constant rate. What is the unit rate?`,`${rate} miles/hour`,[`${rate/2} miles/hour`,`${rate+hours} miles/hour`,`${distance*hours} miles/hour`],`${distance} ÷ ${hours} = ${rate}.`,['ratio','rate','proportion']))
  })
  const scales = [[4.5,6],[7,4],[3.2,5],[8,2.5],[6.5,8]]
  scales.forEach(([drawing,scale],i) => {
    const actual = drawing * scale
    out.push(choice(`sr7d-c2-r-scale-${i}`,'Ratios & proportional relationships','core',`On a scale drawing, 1 inch represents ${scale} feet. A length measures ${drawing} inches on the drawing. What is the actual length?`,`${actual} ft`,[`${drawing+scale} ft`,`${drawing*2} ft`,`${actual+scale} ft`],`${drawing} × ${scale} = ${actual}.`,['scale','ratio','proportion']))
  })
  const costs = [[3,12,5],[4,18,6],[5,25,8],[6,21,10],[8,36,12]]
  costs.forEach(([count,cost,target],i) => {
    const unit = cost / count
    const total = unit * target
    out.push(choice(`sr7d-c2-r-prop-${i}`,'Ratios & proportional relationships','core',`${count} notebooks cost $${cost}. At the same rate, how much do ${target} notebooks cost?`,`$${total}`,[`$${cost+target}`,`$${unit+target}`,`$${total+unit}`],`The unit price is $${unit}; ${target} × ${unit} = $${total}.`,['ratio','unit rate','proportion']))
  })

  const discounts = [[60,25],[80,15],[120,30],[45,20],[200,12]]
  discounts.forEach(([price,pct],i) => {
    const sale = price * (1 - pct/100)
    out.push(choice(`sr7d-c2-p-discount-${i}`,'Percent & rational numbers','core',`A $${price} item is discounted by ${pct}%. What is the sale price?`,`$${sale}`,[`$${price*pct/100}`,`$${price-pct}`,`$${price*(1+pct/100)}`],`${pct}% of $${price} is $${price*pct/100}; subtract that from the original price.`,['percent','discount','rational']))
  })
  const interests = [[500,4,3],[750,3,2],[900,5,2],[1200,2,4],[650,6,1]]
  interests.forEach(([principal,rate,years],i) => {
    const interest = principal * rate/100 * years
    out.push(choice(`sr7d-c2-p-interest-${i}`,'Percent & rational numbers','core',`How much simple interest is earned on $${principal} at ${rate}% per year for ${years} year${years===1?'':'s'}?`,`$${interest}`,[`$${principal*rate/100}`,`$${principal+interest}`,`$${interest+rate}`],`Simple interest = principal × rate × time = ${principal} × ${rate/100} × ${years} = $${interest}.`,['percent','interest','rational']))
  })
  const rationalOps = [[-8,13],[-15,7],[6,-14],[-9,-5],[18,-23]]
  rationalOps.forEach(([a,b],i) => {
    const sum = a+b
    out.push(choice(`sr7d-c2-p-rational-${i}`,'Percent & rational numbers',i < 2 ? 'foundation':'core',`What is ${a} + (${b})?`,sum,[a-b,b-a,Math.abs(a)+Math.abs(b)],`Adding the signed numbers gives ${sum}.`,['integer','rational','number']))
  })

  const equations = [[3,7,25],[4,5,29],[5,-3,32],[6,8,44],[7,-6,29],[8,4,52],[9,-5,40],[2,11,27],[5,10,45],[4,-7,21]]
  equations.forEach(([a,b,c],i) => {
    const x = (c-b)/a
    out.push(choice(`sr7d-c2-eq-${i}`,'Expressions & equations',i < 3 ? 'foundation':'core',`Solve ${a}x ${b>=0?'+':'−'} ${Math.abs(b)} = ${c}.`,`x = ${x}`,[`x = ${x+1}`,`x = ${x-1}`,`x = ${(c+b)/a}`],`Undo the constant term, then divide by ${a}; x = ${x}.`,['equation','linear','expression']))
  })
  const inequalities = [[30,12,126],[45,15,150],[24,9,96],[50,8,130],[18,14,102]]
  inequalities.forEach(([spent,cost,limit],i) => {
    out.push(fixed(`sr7d-c2-ineq-${i}`,'Expressions & equations','core',`A group can spend at most $${limit}. It already spent $${spent}, and each ticket costs $${cost}. Which inequality represents the number t of additional tickets?`,[`${spent} + ${cost}t ≤ ${limit}`,`${spent} + ${cost}t ≥ ${limit}`,`${cost} + ${spent}t ≤ ${limit}`,`${spent}t − ${cost} ≤ ${limit}`],0,`Existing spending plus ${cost} per ticket cannot exceed ${limit}.`,['inequality','expression','linear']))
  })

  const rectangles = [[8,5],[12,7],[9,6],[14,4],[11,3]]
  rectangles.forEach(([l,w],i) => {
    const area = l*w
    out.push(choice(`sr7d-c2-g-area-${i}`,'Geometry & measurement','foundation',`A rectangle is ${l} cm by ${w} cm. What is its area?`,`${area} cm²`,[`${l+w} cm²`,`${2*(l+w)} cm²`,`${area*2} cm²`],`Area = length × width = ${l} × ${w} = ${area}.`,['geometry','area','measurement']))
  })
  const prisms = [[4,3,5],[6,2,7],[8,5,3],[9,4,2],[7,6,4]]
  prisms.forEach(([l,w,h],i) => {
    const volume=l*w*h
    out.push(choice(`sr7d-c2-g-volume-${i}`,'Geometry & measurement','core',`A rectangular prism measures ${l} cm by ${w} cm by ${h} cm. What is its volume?`,`${volume} cm³`,[`${l*w+h} cm³`,`${l+w+h} cm³`,`${2*(l*w+l*h+w*h)} cm³`],`Volume = ${l} × ${w} × ${h} = ${volume}.`,['geometry','volume','measurement']))
  })
  const angles = [35,48,62,73,95]
  angles.forEach((angle,i) => {
    const supplement=180-angle
    out.push(choice(`sr7d-c2-g-angle-${i}`,'Geometry & measurement','core',`Two angles form a straight line. One angle measures ${angle}°. What is the other angle?`,`${supplement}°`,[`${90-angle}°`,`${180+angle}°`,`${angle}°`],`Angles on a straight line total 180°, so 180 − ${angle} = ${supplement}.`,['geometry','angle']))
  })

  const samples = [[50,30],[80,52],[40,18],[100,63],[60,21]]
  samples.forEach(([sample,yes],i) => {
    const pct = Math.round(yes/sample*100)
    out.push(choice(`sr7d-c2-s-sample-${i}`,'Statistics & probability','core',`In a random sample of ${sample} students, ${yes} chose option A. About what percent of the population would this sample predict chooses A?`,`${pct}%`,[`${100-pct}%`,`${Math.round(yes/sample*10)}%`,`${Math.min(100,pct+10)}%`],`${yes} ÷ ${sample} = ${yes/sample}; convert to about ${pct}%.`,['statistics','population','sample']))
  })
  const spinners = [[8,3],[10,4],[12,5],[6,1],[9,2]]
  spinners.forEach(([total,fav],i) => {
    out.push(choice(`sr7d-c2-s-prob-${i}`,'Statistics & probability','foundation',`A spinner has ${total} equal sections and ${fav} are blue. What is the probability of landing on blue?`,`${fav}/${total}`,[`${total-fav}/${total}`,`${fav}/${total-fav}`,`1/${total}`],`Probability = favorable outcomes ÷ total outcomes = ${fav}/${total}.`,['probability','chance']))
  })
  const dataSets = [[4,6,8,10],[5,7,7,9],[12,14,16,18],[3,5,9,11],[20,22,24,26]]
  dataSets.forEach((values,i) => {
    const mean = values.reduce((a,b)=>a+b,0)/values.length
    out.push(choice(`sr7d-c2-s-mean-${i}`,'Statistics & probability','core',`What is the mean of ${values.join(', ')}?`,mean,[mean+1,mean-1,values[values.length-1]-values[0]],`Add the values and divide by ${values.length}; the mean is ${mean}.`,['statistics','mean','data']))
  })
  return out
}

function course3Questions() {
  const out=[]
  const exponentPairs=[[2,3,2],[3,2,4],[5,1,3],[2,5,2],[7,2,1]]
  exponentPairs.forEach(([base,a,b],i)=>{
    out.push(choice(`sr7d-c3-e-prod-${i}`,'Real numbers & exponents','foundation',`Simplify ${base}^${a} × ${base}^${b}.`,`${base}^${a+b}`,[`${base}^${a*b}`,`${base*2}^${a+b}`,`${base}^${Math.abs(a-b)}`],`With the same base, add exponents: ${a}+${b}=${a+b}.`,['exponent','real number']))
  })
  const decimals=[[0.00045,'4.5 × 10⁻⁴'],[0.0062,'6.2 × 10⁻³'],[0.000081,'8.1 × 10⁻⁵'],[0.045,'4.5 × 10⁻²'],[0.0000073,'7.3 × 10⁻⁶']]
  decimals.forEach(([value,correct],i)=>{
    out.push(choice(`sr7d-c3-e-sci-${i}`,'Real numbers & exponents','core',`Write ${value} in scientific notation.`,correct,[correct.replace('⁻',''),`0.${String(correct).split(' ')[0]} × 10⁻¹`,`45 × 10⁻⁴`],`Scientific notation has one nonzero digit before the decimal and a power of ten matching the decimal shift.`,['scientific notation','exponent']))
  })
  const irrationalSets=[['√2','0.5','3/4','2'],['√5','1.25','9/3','0.125'],['√7','2.75','11/4','6'],['√10','0.2','4/5','9'],['π','0.333','1/3','12']]
  irrationalSets.forEach((values,i)=>{
    out.push(fixed(`sr7d-c3-e-irr-${i}`,'Real numbers & exponents','core','Which value is irrational?',values,0,`${values[0]} is irrational; the other listed values are rational.`,['irrational','real number']))
  })

  const slopes=[[6,3],[10,5],[9,3],[-8,4],[12,-3]]
  slopes.forEach(([rise,run],i)=>{
    const slope=rise/run
    out.push(choice(`sr7d-c3-l-slope-${i}`,'Linear functions & systems','foundation',`A line changes ${rise} units vertically for every ${run} units horizontally. What is its slope?`,slope,[run/rise,slope+1,slope-1],`Slope = rise/run = ${rise}/${run} = ${slope}.`,['linear','slope','graph']))
  })
  const lines=[[2,1,4],[-1,5,3],[3,-2,2],[4,1,-1],[-2,6,5]]
  lines.forEach(([m,b,x],i)=>{
    const y=m*x+b
    out.push(choice(`sr7d-c3-l-eval-${i}`,'Linear functions & systems','core',`For y = ${m}x ${b>=0?'+':'−'} ${Math.abs(b)}, what is y when x = ${x}?`,y,[y+2,y-2,m+b+x],`Substitute x=${x}: y=${m}(${x}) ${b>=0?'+':'−'} ${Math.abs(b)} = ${y}.`,['linear','function','equation']))
  })
  const systems=[[3,5,2],[2,4,3],[4,7,2],[1,6,4],[5,3,2]]
  systems.forEach(([x,y,m],i)=>{
    const b1=y-x, b2=y-m*x
    out.push(choice(`sr7d-c3-l-system-${i}`,'Linear functions & systems','core',`Solve the system y = x ${b1>=0?'+':'−'} ${Math.abs(b1)} and y = ${m}x ${b2>=0?'+':'−'} ${Math.abs(b2)}.`,`(${x}, ${y})`,[`(${x+1}, ${y})`,`(${x}, ${y+1})`,`(${y}, ${x})`],`Both equations are satisfied by x=${x}, y=${y}.`,['system','linear','equation']))
  })

  const translations=[[[2,3],4,-1],[[1,-2],-3,5],[[0,4],2,2],[[-3,1],5,3],[[6,-1],-2,-4]]
  translations.forEach(([[x,y],dx,dy],i)=>{
    out.push(choice(`sr7d-c3-t-trans-${i}`,'Transformations & similarity','foundation',`Point (${x}, ${y}) is translated ${dx>=0?dx+' units right':Math.abs(dx)+' units left'} and ${dy>=0?dy+' units up':Math.abs(dy)+' units down'}. What is the image?`,`(${x+dx}, ${y+dy})`,[`(${x-dx}, ${y+dy})`,`(${x+dx}, ${y-dy})`,`(${x+dy}, ${y+dx})`],`Add the translation vector (${dx}, ${dy}) to the coordinates.`,['transformation','translation','congruence']))
  })
  const dilations=[[6,1.5],[8,0.5],[10,2],[12,0.75],[14,1.25]]
  dilations.forEach(([side,k],i)=>{
    const image=side*k
    out.push(choice(`sr7d-c3-t-dilate-${i}`,'Transformations & similarity','core',`A side of length ${side} is dilated by scale factor ${k}. What is the image length?`,image,[side+k,side/k,image+k],`Multiply the original length by the scale factor: ${side} × ${k} = ${image}.`,['similarity','dilation','scale']))
  })
  const reflections=[[3,5],[-4,2],[6,-1],[-2,-7],[1,8]]
  reflections.forEach(([x,y],i)=>{
    out.push(choice(`sr7d-c3-t-reflect-${i}`,'Transformations & similarity','foundation',`What is the reflection of (${x}, ${y}) across the y-axis?`,`(${-x}, ${y})`,[`(${x}, ${-y})`,`(${-x}, ${-y})`,`(${y}, ${x})`],`Reflecting across the y-axis changes the sign of x but keeps y.`,['transformation','reflection','congruence']))
  })

  const triples=[[3,4,1],[5,12,1],[6,8,1],[9,12,1],[8,15,1],[7,24,1],[10,24,1],[12,16,1],[15,20,1],[18,24,1]]
  triples.forEach(([a,b],i)=>{
    const c=Math.sqrt(a*a+b*b)
    out.push(choice(`sr7d-c3-p-triple-${i}`,'Pythagorean theorem',i<3?'foundation':'core',`A right triangle has legs ${a} and ${b}. What is the hypotenuse?`,c,[a+b,Math.abs(b-a),c+1],`${a}² + ${b}² = ${c*c}, so the hypotenuse is ${c}.`,['pythagorean','triangle','distance']))
  })
  const squareSides=[4,5,6,8,10]
  squareSides.forEach((s,i)=>{
    out.push(fixed(`sr7d-c3-p-diag-${i}`,'Pythagorean theorem','core',`A square has side length ${s}. What is its diagonal length?`,[`${s}√2`,`${2*s}`,`${s*s}`,`${s+2}`],0,`The diagonal is the hypotenuse of a right triangle with legs ${s} and ${s}, so d=${s}√2.`,['pythagorean','distance','triangle']))
  })

  const cylinders=[[2,5],[3,4],[4,6],[5,3],[6,2]]
  cylinders.forEach(([r,h],i)=>{
    const coeff=r*r*h
    out.push(choice(`sr7d-c3-v-cyl-${i}`,'3D geometry & volume','core',`What is the volume of a cylinder with radius ${r} and height ${h}?`,`${coeff}π`,[`${r*h}π`,`${2*r*h}π`,`${coeff*2}π`],`V = πr²h = π(${r}²)(${h}) = ${coeff}π.`,['cylinder','volume']))
  })
  const cones=[[3,6],[4,9],[5,6],[6,3],[2,12]]
  cones.forEach(([r,h],i)=>{
    const coeff=r*r*h/3
    out.push(choice(`sr7d-c3-v-cone-${i}`,'3D geometry & volume','core',`What is the volume of a cone with radius ${r} and height ${h}?`,`${coeff}π`,[`${r*r*h}π`,`${r*h}π`,`${coeff*2}π`],`V = (1/3)πr²h = ${coeff}π.`,['cone','volume']))
  })
  const spheres=[3,6,9,12,15]
  spheres.forEach((r,i)=>{
    const coeff=4*r*r*r/3
    out.push(choice(`sr7d-c3-v-sphere-${i}`,'3D geometry & volume','advanced',`What is the volume of a sphere with radius ${r}?`,`${coeff}π`,[`${r*r*r}π`,`${4*r*r}π`,`${2*r*r*r}π`],`V = (4/3)πr³ = ${coeff}π.`,['sphere','volume']))
  })
  return out
}

const scienceGroups = {
  'Cellular & body systems': [
    ['Which cell structure regulates what enters and leaves the cell?',['Cell membrane','Nucleus','Ribosome','Chromosome'],0,'The cell membrane controls movement of substances into and out of a cell.',['cell','membrane']],
    ['Which organelle releases usable energy from food during cellular respiration?',['Mitochondrion','Golgi apparatus','Cell wall','Vacuole'],0,'Mitochondria are major sites of cellular respiration.',['cell','respiration']],
    ['Which organelle captures light energy for photosynthesis in plant cells?',['Chloroplast','Lysosome','Nucleus','Ribosome'],0,'Chloroplasts contain chlorophyll and carry out photosynthesis.',['photosynthesis','cell']],
    ['Why are the respiratory and circulatory systems interdependent?',['One brings in oxygen and the other transports it to cells','Both digest food','Both produce bones','Neither moves materials'],0,'The respiratory system exchanges gases and the circulatory system transports them.',['body','system','respiration']],
    ['Which level of organization is made of several tissues working together?',['Organ','Cell','Organelle','Molecule'],0,'An organ contains multiple tissue types working together.',['body','system']],
    ['During exercise, muscle cells need more oxygen mainly because:',['Cellular respiration speeds up to release more energy','Photosynthesis begins in muscles','DNA replication stops','Cells stop using glucose'],0,'More activity increases energy demand and cellular respiration.',['respiration','body','energy']],
    ['Which substance is a reactant of photosynthesis?',['Carbon dioxide','Oxygen only','Glucose only','ATP only'],0,'Plants use carbon dioxide and water, with light energy, to build glucose.',['photosynthesis','cell']],
    ['Which product of photosynthesis can be used in cellular respiration?',['Glucose','Nitrogen gas','Salt','DNA'],0,'Glucose stores chemical energy that cells can release during respiration.',['photosynthesis','respiration']],
    ['Why do specialized cells in a multicellular organism have different structures?',['Their structures support different functions','Each cell has a different species','They do not contain DNA','They never interact'],0,'Cell structure is related to the job a specialized cell performs.',['cell','system']],
    ['If the small intestine absorbs fewer nutrients, which system is affected most directly first?',['Digestive system','Skeletal system','Integumentary system','Reproductive system'],0,'The small intestine is part of the digestive system and absorbs nutrients.',['body','system']],
    ['Homeostasis refers to an organism’s ability to:',['Maintain relatively stable internal conditions','Stop all chemical reactions','Keep body temperature identical to the environment','Avoid using energy'],0,'Homeostasis keeps internal conditions within workable ranges.',['body','system']],
    ['A unicellular organism differs from a multicellular organism because it:',['Carries out all life functions within one cell','Has no genetic material','Cannot use energy','Cannot respond to its environment'],0,'A single cell must perform all essential life functions.',['cell','system']],
    ['Ribosomes are directly involved in making:',['Proteins','Glucose by photosynthesis','Chromosomes only','Oxygen'],0,'Ribosomes assemble proteins from amino acids.',['cell','protein']],
    ['If mitochondria in a cell stop functioning effectively, the cell will most directly have trouble:',['Releasing usable energy from food','Storing hereditary information','Controlling what enters through the membrane','Producing cell walls'],0,'Mitochondria support ATP production through cellular respiration.',['cell','respiration','energy']],
    ['Which statement best shows systems thinking in the human body?',['A change in one organ system can affect other systems','Each organ system works completely alone','Only the nervous system uses energy','All organs have the same function'],0,'Body systems exchange materials and signals and therefore influence one another.',['body','system']],
  ],
  'Weather, climate & Earth systems': [
    ['Which statement best distinguishes weather from climate?',['Weather is short-term conditions; climate is long-term patterns','Weather is long-term; climate is hourly','They are identical','Climate occurs only in winter'],0,'Weather describes short-term atmospheric conditions; climate summarizes longer-term patterns.',['weather','climate']],
    ['Why are many coastal locations milder than inland locations?',['Water heats and cools more slowly than land','Ocean water blocks all sunlight','Coastal air has no humidity','Land cannot store heat'],0,'Large bodies of water moderate nearby temperature changes.',['climate','earth']],
    ['Warm air usually rises because it is:',['Less dense than cooler air','More dense than cooler air','Unable to contain water vapor','Always moving north'],0,'Heating expands air and lowers its density relative to cooler air.',['weather','atmosphere']],
    ['A drop in air pressure often signals:',['Changing or stormy weather may be approaching','The climate permanently changed','Humidity must be zero','The Sun stopped heating Earth'],0,'Falling pressure is often associated with approaching weather systems.',['weather','atmosphere']],
    ['Evaporation transfers water mainly from:',['Earth’s surface to the atmosphere','The atmosphere to groundwater only','Clouds to oceans as rain','Rocks to the mantle'],0,'Evaporation changes liquid water to vapor and moves it into the atmosphere.',['earth','water cycle']],
    ['Increasing greenhouse gases tends to affect Earth’s energy balance by:',['Trapping more outgoing infrared energy','Blocking all visible sunlight','Stopping convection','Removing all water vapor'],0,'Greenhouse gases absorb and re-emit infrared energy.',['climate','greenhouse','atmosphere']],
    ['Ocean currents can influence regional climate because they:',['Move thermal energy from one place to another','Create Earth’s magnetic field','Stop evaporation','Eliminate wind'],0,'Currents redistribute heat and influence nearby air temperatures.',['climate','earth','ocean']],
    ['Why can one side of a mountain be wetter than the other?',['Rising air cools and condenses before descending drier on the other side','Mountains create sunlight','Air cannot cross mountains','Rain only falls eastward'],0,'Orographic lifting can create wet and dry sides of a mountain range.',['weather','climate']],
    ['A cold front forms when:',['Cold air advances into warmer air','Warm air disappears from Earth','Two oceans meet','Humidity becomes exactly 50%'],0,'A cold front is the boundary where advancing colder air meets warmer air.',['weather','front']],
    ['High humidity means the air contains:',['A relatively large amount of water vapor','No water molecules','Only oxygen','Very low pressure by definition'],0,'Humidity describes water vapor in the air.',['weather','atmosphere']],
    ['Fresh snow can cool a surface partly because it:',['Reflects a large fraction of incoming sunlight','Generates wind','Absorbs all sunlight','Removes the atmosphere'],0,'High albedo means more incoming solar energy is reflected.',['climate','earth','albedo']],
    ['Which data set is best for describing climate?',['Temperature and precipitation patterns collected over many years','One afternoon’s temperature','A single thunderstorm','One wind-speed measurement'],0,'Climate is based on long-term patterns, not one event.',['climate','data']],
    ['Cloud formation most directly involves water vapor:',['Cooling and condensing','Heating until it becomes rock','Turning into oxygen','Leaving Earth’s gravity'],0,'Cooling air can cause water vapor to condense into droplets.',['weather','water cycle']],
    ['An interaction between the hydrosphere and atmosphere occurs when:',['Ocean water evaporates into the air','Rock crystallizes underground','A seed germinates','A metal rusts indoors'],0,'Evaporation moves water from the hydrosphere to the atmosphere.',['earth','system']],
    ['The main external energy source driving most weather is:',['The Sun','Earth’s core only','The Moon only','Ocean salt'],0,'Uneven solar heating powers atmospheric circulation and much weather.',['weather','climate','energy']],
  ],
  'Genetics, adaptation & inheritance': [
    ['An inherited trait is one that:',['Can be passed through genetic information from parents to offspring','Is learned only at school','Appears identically in every sibling','Is caused only by weather'],0,'Inherited traits are influenced by genetic information passed between generations.',['genetic','inheritance','trait']],
    ['Genes are segments of:',['DNA','Protein only','Glucose','Cell membrane'],0,'Genes are regions of DNA that contain hereditary information.',['genetic','inheritance']],
    ['Chromosomes are important because they:',['Carry many genes','Carry only water','Are found only outside cells','Do not contain DNA'],0,'Chromosomes are DNA-containing structures with many genes.',['genetic','chromosome']],
    ['Variation within a population is important for natural selection because:',['Individuals may differ in traits that affect survival or reproduction','All individuals must be identical','Variation prevents inheritance','Only acquired traits can vary'],0,'Natural selection acts on heritable variation among individuals.',['variation','selection','adaptation']],
    ['A mutation can contribute to evolution when it:',['Creates heritable genetic variation','Always harms every organism','Changes weather','Occurs only in body cells and is never inherited'],0,'Heritable mutations can introduce new genetic variants.',['mutation','genetic','variation']],
    ['Natural selection is most likely when:',['Some heritable traits lead to greater reproductive success','Every individual has identical traits and success','No traits are inherited','The environment never affects survival'],0,'Differences in survival or reproduction can change trait frequencies over generations.',['selection','adaptation']],
    ['An adaptation is best described as:',['A heritable trait that improves success in a particular environment','Any temporary behavior','A trait chosen because an organism wants it','A change that occurs in one day in all members'],0,'Adaptations become common over generations when they improve reproductive success.',['adaptation','selection']],
    ['Which trait is most clearly influenced by both genes and environment?',['Adult height','Blood type only','Chromosome number only','DNA sequence at one fixed site only'],0,'Height is influenced by inherited factors and environmental conditions such as nutrition.',['trait','genetic','environment']],
    ['Why are siblings from the same parents often not genetically identical?',['They can inherit different combinations of alleles','They have no genes in common','Only environment determines traits','Chromosomes are not inherited'],0,'Sexual reproduction creates different allele combinations in offspring.',['inheritance','variation']],
    ['If dark-colored insects survive better on dark bark, over generations dark coloration may:',['Become more common if it is heritable','Disappear immediately','Change because individuals choose it','Never affect reproduction'],0,'A heritable trait linked to greater survival can increase in frequency.',['selection','adaptation']],
    ['Evolution by natural selection is measured primarily as change in:',['Populations across generations','One individual during a day','Weather during a season','A single learned behavior'],0,'Evolution involves changes in populations over generations.',['selection','population']],
    ['Sexual reproduction generally increases genetic variation because it:',['Combines genetic material from two parents','Copies one genome without change','Eliminates all mutations','Makes every offspring identical'],0,'Mixing parental alleles creates new combinations.',['genetic','variation','inheritance']],
    ['Phenotype refers to:',['Observable characteristics of an organism','Only its DNA sequence','Only its parents','A type of ecosystem'],0,'Phenotype describes observable traits resulting from genotype and environment.',['trait','genetic']],
    ['Which evidence would best support that a trait is heritable?',['The trait consistently appears across related generations more than expected by chance','One individual changes behavior','The weather changes','A population moves location once'],0,'Patterns across related generations can support inheritance.',['inheritance','evidence']],
    ['A population faces a new pesticide. A few individuals survive because of a heritable variant. What is most likely after many generations of pesticide use?',['The survival variant becomes more common','Every individual changes its DNA by choice','All variation disappears instantly','The pesticide becomes a gene'],0,'Individuals with the advantageous heritable variant leave more descendants.',['selection','adaptation','genetic']],
  ],
  'Human impact & ecosystems': [
    ['A food web shows that ecosystems are connected because:',['Species exchange energy through feeding relationships','Every species eats the same food','Predators never affect prey','Energy is created at each trophic level'],0,'Food webs represent linked feeding relationships and energy transfer.',['ecosystem','food web']],
    ['Removing a key predator may change several populations because:',['Food-web relationships connect predator, prey, and competitors','Only predators use resources','Prey never respond','Ecosystems have no feedbacks'],0,'Changing one population can cascade through connected relationships.',['ecosystem','population']],
    ['An invasive species can disrupt an ecosystem by:',['Competing with native species for resources','Increasing biodiversity in every case','Removing all limiting factors','Stopping energy flow'],0,'Introduced species can alter competition, predation, and resource use.',['ecosystem','human impact']],
    ['Which action most directly reduces greenhouse-gas emissions?',['Using energy more efficiently and shifting toward lower-carbon sources','Burning more fossil fuel','Removing urban trees','Increasing landfill waste'],0,'Reducing fossil-fuel use lowers major greenhouse-gas emissions.',['greenhouse','human impact','conservation']],
    ['Protecting habitat can support biodiversity because it:',['Preserves resources and living space for multiple species','Guarantees no species will ever decline','Stops all natural disturbances','Eliminates competition'],0,'Habitat protection maintains conditions species need to survive and reproduce.',['ecosystem','conservation']],
    ['Carrying capacity is the:',['Largest population an environment can sustain over time with available resources','Fastest possible growth rate','Number of predators only','Temperature of an ecosystem'],0,'Resource limits constrain how many individuals can be supported.',['ecosystem','population','resource']],
    ['Which is a limiting resource for many populations?',['Food availability','Unlimited sunlight in every habitat','A species name','A map scale'],0,'Food, water, space, and similar resources can limit population growth.',['ecosystem','resource']],
    ['Excess fertilizer entering a lake can cause algal blooms because it:',['Adds nutrients that can stimulate rapid algae growth','Removes all nutrients','Stops photosynthesis','Eliminates water'],0,'Nutrient pollution can trigger eutrophication and oxygen problems.',['human impact','ecosystem','resource']],
    ['Habitat fragmentation can harm wildlife by:',['Separating populations and reducing access to resources or mates','Increasing continuous habitat','Removing roads','Guaranteeing more biodiversity'],0,'Fragmentation breaks habitat into smaller isolated patches.',['human impact','ecosystem']],
    ['Which resource is renewable on human time scales when managed well?',['Solar energy','Coal','Petroleum','Natural gas'],0,'Solar energy is continuously replenished by the Sun.',['resource','conservation']],
    ['Plants affect the carbon cycle by:',['Taking in carbon dioxide during photosynthesis','Creating carbon from nothing','Stopping respiration','Removing all carbon from ecosystems'],0,'Photosynthesis transfers carbon from atmospheric CO₂ into organic molecules.',['ecosystem','carbon','greenhouse']],
    ['Why is less energy available at higher trophic levels?',['Organisms use much of the energy for life processes and release heat','Energy is destroyed by predators','Plants contain no energy','Consumers create new energy'],0,'Only part of consumed energy becomes biomass available to the next level.',['ecosystem','energy']],
    ['Which evidence best supports a claim that a human activity changed an ecosystem?',['Before-and-after population and habitat data with a suitable comparison','One opinion with no measurements','A single unrelated weather report','A drawing without labels'],0,'Measured changes with comparison provide stronger evidence for impact.',['human impact','evidence','ecosystem']],
    ['Restoring native vegetation along a stream can help by:',['Reducing erosion and providing habitat','Increasing bare soil','Removing all insects','Preventing water from flowing'],0,'Roots stabilize soil and native plants can improve habitat.',['conservation','ecosystem']],
    ['If a drought reduces available water, what is a likely population response?',['Some populations may decline or compete more strongly for water','All populations must increase','Water stops being a limiting factor','Food webs become disconnected from resources'],0,'Reduced water can lower carrying capacity and intensify competition.',['ecosystem','resource','population']],
  ],
  'Scientific inquiry & evidence': [
    ['Why is a control group useful in an investigation?',['It provides a comparison for the tested variable','It guarantees the hypothesis is correct','It removes the need to collect data','It makes all results identical'],0,'A control provides a baseline for judging the effect of the independent variable.',['experiment','evidence','investigation']],
    ['The independent variable is the factor that researchers:',['Intentionally change','Measure as the outcome','Always keep constant','Never record'],0,'The independent variable is manipulated to test its effect.',['experiment','variable']],
    ['The dependent variable is the factor that researchers:',['Measure as the response','Intentionally keep unknown','Always manipulate','Use only as a title'],0,'The dependent variable is the measured outcome.',['experiment','variable','data']],
    ['Two plant groups receive different fertilizer amounts and different sunlight. Why is this a problem?',['Sunlight is a confounding variable','Plants cannot be measured','Fertilizer is never a variable','A control is always unnecessary'],0,'Changing two factors makes it difficult to isolate the effect of fertilizer.',['experiment','evidence','variable']],
    ['Repeating trials improves an investigation mainly because it:',['Shows whether results are consistent','Guarantees a preferred result','Eliminates all error','Changes the hypothesis'],0,'Repeated trials help estimate variability and reliability.',['experiment','data','evidence']],
    ['Increasing sample size can strengthen evidence because it often:',['Reduces the influence of unusual individual cases','Makes every result identical','Removes the need for controls','Guarantees causation'],0,'Larger samples can better represent the population and reduce random fluctuation.',['data','sample','evidence']],
    ['A graph shows both variables increasing together. What can be concluded immediately?',['They are associated, but causation is not established','One definitely causes the other','They are unrelated','The experiment is invalid'],0,'Correlation alone does not prove a causal relationship.',['data','evidence','correlation']],
    ['In claim-evidence-reasoning, evidence should:',['Directly support the claim with relevant observations or data','Repeat the claim without data','Be unrelated background information','Always be a personal opinion'],0,'Evidence must be relevant to the claim being evaluated.',['evidence','data','reasoning']],
    ['A scientific model is useful even if it is not a perfect copy of reality because it can:',['Represent important relationships and support predictions','Include every detail in the universe','Guarantee every prediction','Replace all observations'],0,'Models simplify systems to focus on important features and relationships.',['model','evidence']],
    ['Which practice improves measurement precision?',['Using an appropriate instrument consistently and recording units','Changing instruments every trial without calibration','Rounding before measuring','Ignoring repeated measurements'],0,'Consistent, suitable measurement methods improve precision and interpretability.',['measurement','data','investigation']],
    ['A fair test should keep which factors constant?',['Variables other than the one being intentionally tested, when possible','The dependent variable only','The hypothesis wording only','Nothing'],0,'Controlling other factors helps isolate the independent variable.',['experiment','variable']],
    ['A hypothesis should be:',['Testable with evidence','Guaranteed to be true','A personal preference only','Impossible to revise'],0,'A scientific hypothesis must make a claim that evidence can test.',['hypothesis','evidence','investigation']],
    ['Why is reproducibility valuable?',['Independent repetition can test whether a result is dependable','It proves a claim without data','It prevents all disagreement','It replaces peer review'],0,'Reproducibility checks whether findings persist under repeated methods.',['evidence','investigation','data']],
    ['One data point is far from all others. What is the best first response?',['Check for measurement or recording error before deciding whether to exclude it','Delete it automatically','Change it to match the average','Ignore all other data'],0,'Outliers should be investigated rather than automatically discarded.',['data','evidence','measurement']],
    ['Which conclusion is strongest?',['One that matches the collected evidence and acknowledges limitations','One that goes far beyond the data','One based only on the expected result','One that ignores conflicting observations'],0,'Scientific conclusions should stay within what the evidence supports.',['evidence','reasoning','data']],
  ],
}

function scienceQuestions() {
  const out=[]
  for (const [competency,items] of Object.entries(scienceGroups)) {
    items.forEach(([prompt,options,answer,explanation,keywords],i)=>{
      out.push(fixed(`sr7d-sci-${competency.toLowerCase().replace(/[^a-z]+/g,'-').replace(/^-|-$/g,'')}-${i}`,competency,i < 5 ? 'foundation' : i < 12 ? 'core' : 'advanced',prompt,options,answer,explanation,keywords))
    })
  }
  return out
}

export function buildSrvusdGrade7DepthBank(profile = {}) {
  const subject = norm(profile.subject)
  if (!containsAny(subject,['math','mathematics'])) return scienceQuestions()
  const track = norm(profile.curriculumTrack || profile.mathCourse || profile.examName)
  return track.includes('course 3') || track.includes('accelerated') ? course3Questions() : course2Questions()
}
