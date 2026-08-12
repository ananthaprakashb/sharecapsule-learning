import { SRVUSD_DISTRICT } from './srvusd-grade7.js'

function profile(){try{return JSON.parse(localStorage.getItem('prepare-profile')||'{}')}catch{return{}}}
function esc(value=''){return String(value).replace(/[&<>"']/g,(c)=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c])}

function setField(form,name,value){
  const field=form.elements.namedItem(name)
  if(!field)return
  field.value=value
  field.dispatchEvent(new Event('input',{bubbles:true}))
}

function addPresetPanel(form){
  if(form.querySelector('[data-srvusd7-presets]'))return
  const p=profile()
  const detailGrids=[...form.querySelectorAll('.form-grid')]
  const detail=detailGrids[detailGrids.length-1]
  if(!detail)return

  const panel=document.createElement('div')
  panel.className='srvusd7-panel'
  panel.dataset.srvusd7Presets=''
  panel.innerHTML=`
    <div>
      <div class="eyebrow">San Ramon Grade 7 presets</div>
      <strong>Use the SRVUSD curriculum profile</strong>
      <p>Starts with the district Grade 7 scope, then the diagnostic adapts to the student's measured gaps.</p>
    </div>
    <div class="srvusd7-actions">
      <button type="button" class="secondary-button compact" data-srvusd7="math2">Course 2 Math</button>
      <button type="button" class="secondary-button compact" data-srvusd7="math3">Course 3 Math</button>
      <button type="button" class="secondary-button compact" data-srvusd7="science">Grade 7 Science</button>
    </div>`
  detail.insertAdjacentElement('beforebegin',panel)

  const extra=document.createElement('div')
  extra.className='form-grid srvusd7-fields'
  extra.innerHTML=`
    <label class="field"><span>School district / system</span><input name="district" value="${esc(p.district||'')}" placeholder="San Ramon Valley Unified School District"><small>Used to select local curriculum models and public district sources.</small></label>
    <label class="field"><span>School (optional)</span><input name="school" value="${esc(p.school||'')}" placeholder="Iron Horse Middle School"><small>Optional. Live research can use the school name to refine public curriculum evidence.</small></label>
    <label class="field"><span>Curriculum / placement</span><input name="curriculumTrack" value="${esc(p.curriculumTrack||'')}" list="srvusd7-tracks" placeholder="Course 2 Math"><datalist id="srvusd7-tracks"><option value="Course 2 Math"><option value="Course 3 Math"><option value="Grade 7 Integrated / Life Science"></datalist><small>Course 2 is the standard Grade 7 math path; Course 3 is the accelerated option.</small></label>`
  detail.insertAdjacentElement('afterend',extra)

  panel.querySelectorAll('[data-srvusd7]').forEach((button)=>button.addEventListener('click',()=>{
    const kind=button.dataset.srvusd7
    setField(form,'grade','Grade 7')
    setField(form,'district',SRVUSD_DISTRICT)
    if(kind==='science'){
      setField(form,'subject','Science')
      setField(form,'curriculumTrack','Grade 7 Integrated / Life Science')
      setField(form,'examName','Grade 7 Science')
    }else{
      const course=kind==='math3'?'Course 3 Math':'Course 2 Math'
      setField(form,'subject','Mathematics')
      setField(form,'curriculumTrack',course)
      setField(form,'examName',course)
    }
    panel.querySelectorAll('[data-srvusd7]').forEach((node)=>node.classList.toggle('selected',node===button))
  }))
}

function enhance(){
  const form=document.querySelector('#intake')
  if(!form)return
  const academic=document.querySelector('[data-track="academic"].selected')
  if(!academic)return
  addPresetPanel(form)
}

let queued=false
const observer=new MutationObserver(()=>{if(queued)return;queued=true;queueMicrotask(()=>{queued=false;enhance()})})
observer.observe(document.body,{childList:true,subtree:true})
enhance()
