function profile(){try{return JSON.parse(localStorage.getItem('prepare-profile')||'{}')}catch{return{}}}
function esc(value=''){return String(value).replace(/[&<>"']/g,(c)=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c])}
function setField(form,name,value){const field=form.elements.namedItem(name);if(!field)return;field.value=value;field.dispatchEvent(new Event('input',{bubbles:true}))}

function addAcademicContext(form){
  if(form.querySelector('[data-academic-context]'))return
  const p=profile(),grids=[...form.querySelectorAll('.form-grid')],detail=grids[grids.length-1]
  if(!detail)return

  const intro=document.createElement('div')
  intro.className='academic-context-panel'
  intro.dataset.academicContext=''
  intro.innerHTML=`<div><div class="eyebrow">School-aware academic target</div><strong>Any grade. Any school or education system.</strong><p>Prepare resolves public curriculum evidence from the school, district/board, region, exam provider, or national standards instead of assuming one district.</p></div><button type="button" class="secondary-button compact" data-demo-srvusd7>Fill SRVUSD Grade 7 demo</button>`
  detail.insertAdjacentElement('beforebegin',intro)

  const fields=document.createElement('div')
  fields.className='form-grid academic-context-fields'
  fields.innerHTML=`
    <label class="field"><span>Country / education context</span><input name="country" value="${esc(p.country||'')}" placeholder="United States / India / UK"><small>Helps distinguish standards and school systems with similar names.</small></label>
    <label class="field"><span>State / region</span><input name="region" value="${esc(p.region||p.state||'')}" placeholder="California / Tamil Nadu / England"><small>Optional, but useful for state or regional standards.</small></label>
    <label class="field"><span>District / board / school system</span><input name="district" value="${esc(p.district||p.educationSystem||p.board||'')}" placeholder="SRVUSD / CBSE / New York City Public Schools"><small>Use the district, board, academy trust, or other governing school system when known.</small></label>
    <label class="field"><span>School</span><input name="school" value="${esc(p.school||'')}" placeholder="School name (optional)"><small>Prepare uses school-specific public material when available and falls back to the governing system when it is not.</small></label>
    <label class="field"><span>Course / curriculum / placement</span><input name="curriculumTrack" value="${esc(p.curriculumTrack||'')}" placeholder="Course 2 Math / AP Biology / CBSE Mathematics"><small>Optional. Add the named course, level, stream, textbook path, or curriculum if known.</small></label>`
  detail.insertAdjacentElement('afterend',fields)

  intro.querySelector('[data-demo-srvusd7]')?.addEventListener('click',()=>{
    setField(form,'country','United States')
    setField(form,'region','California')
    setField(form,'district','San Ramon Valley Unified School District')
    setField(form,'school','')
    setField(form,'grade','Grade 7')
    setField(form,'subject','Mathematics')
    setField(form,'curriculumTrack','Course 2 Math')
    setField(form,'examName','Course 2 Math')
  })
}

function enhance(){
  const form=document.querySelector('#intake')
  if(!form||!document.querySelector('[data-track="academic"].selected'))return
  addAcademicContext(form)
}

let queued=false
const observer=new MutationObserver(()=>{if(queued)return;queued=true;queueMicrotask(()=>{queued=false;enhance()})})
observer.observe(document.body,{childList:true,subtree:true})
enhance()
