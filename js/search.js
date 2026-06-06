// ══════════════════════════════════════════════════════════
//  دوال شريط التنقل في نتائج البحث
// ══════════════════════════════════════════════════════════

// ترتيب النتائج بنفس ترتيب الشجرة (BFS من الجذور)
function _sortResultsByTreeOrder(ids){
  let order=[];
  let set=new Set(ids);
  function walk(id){
    if(set.has(id))order.push(id);
    getChildren(id).forEach(c=>walk(c.id));
  }
  getRoots(true).forEach(r=>walk(r.id));
  // أضف أي IDs لم تُغطَّ (خارجيون)
  ids.forEach(id=>{if(!order.includes(id))order.push(id);});
  return order;
}

function _updateSearchNavBar(){
  let bar=document.getElementById('search-nav-bar');
  if(!bar)return;
  if(!_lastSearchQ||!_searchResultIds.length||!_savedExpanded){
    _hideSearchNavBar();
    return;
  }
  let p=getPerson(_searchResultIds[_searchNavIdx]);
  let name=p?p.name:'—';
  let par=p?getParent(p):null;
  let sub=par?`بن/ت ${par.name}`:'';
  let _snbNameEl=document.getElementById('snb-name');
  if(_snbNameEl)_snbNameEl.textContent=name;
  document.getElementById('snb-count').innerHTML=
    `<span style="background:rgba(255,255,255,.18);border-radius:8px;padding:1px 7px;">${_searchNavIdx+1} من ${_searchResultIds.length}</span>`+
    (sub?`<span style="opacity:.75"> · ${sub}</span>`:'')+
    `<span style="font-size:10px;opacity:.65;margin-right:4px">📋</span>`;
  // تعطيل الأسهم عند الحدود
  document.getElementById('snb-prev').style.opacity=_searchNavIdx===0?'0.35':'1';
  document.getElementById('snb-next').style.opacity=_searchNavIdx===_searchResultIds.length-1?'0.35':'1';
  bar.style.display='flex';

  document.body.classList.add('search-active');
}

function _jumpToResult(idx){
  if(!_searchResultIds.length)return;
  idx=Math.max(0,Math.min(idx,_searchResultIds.length-1));
  searchNavigateTo(_searchResultIds[idx]);
}


function searchNavNext(){
  if(_searchNavIdx<_searchResultIds.length-1)_jumpToResult(_searchNavIdx+1);
}
function searchNavPrev(){
  if(_searchNavIdx>0)_jumpToResult(_searchNavIdx-1);
}
function searchNavCurrent(){
  // النقر على المنتصف = فتح قائمة نتائج البحث مع تمييز الشخص الحالي
  let q=_lastSearchQ;
  if(!q||!_searchResultIds.length)return;
  let results=people
    .filter(p=>matchesFullName(p,q))
    .sort((a,b)=>scoreMatch(b,q)-scoreMatch(a,q));
  openMobSearchSheet(results,q);
  // بعد الرسم: مرر للعنصر النشط ومييّزه
  requestAnimationFrame(()=>{
    let activeId=_searchResultIds[_searchNavIdx];
    let el=document.querySelector(`[data-mss-id="${activeId}"]`);
    if(el){el.classList.add('active');el.scrollIntoView({block:'center'});}
  });
}

// ══════════════════════════════════════════════════════════
//  لوحة بحث الجوال المنفصلة
// ══════════════════════════════════════════════════════════
let _mssActiveGroup='all'; // المجموعة المختارة حالياً
let _mssGroupResults=[];   // نتائج المجموعة المختارة

function openMobSearchSheet(results, q){
  let sheet=document.getElementById('mss-sheet');
  let overlay=document.getElementById('mss-overlay');
  if(!sheet||!overlay)return;

  results=results.slice().sort((a,b)=>scoreMatch(b,q)-scoreMatch(a,q));

  let groups={};
  results.forEach(p=>{
    let first=(p.name||'').split(' ')[0]||p.name;
    if(!groups[first])groups[first]=[];
    groups[first].push(p);
  });
  let groupKeys=Object.keys(groups).sort((a,b)=>groups[b].length-groups[a].length);

  sheet._allResults=results;sheet._groups=groups;sheet._q=q;
  sheet._originalResults=results.slice(); // حفظ النسخة الأصلية
  const prevGroupOpen = _mssActiveGroup || 'all';
  _mssActiveGroup = groups[prevGroupOpen] ? prevGroupOpen : 'all';
  const activeItems = _mssActiveGroup==='all'
    ? results
    : (groups[_mssActiveGroup] || results);
  _mssGroupResults=activeItems.slice();
  _mssCurrentResults=activeItems.slice();
  _mssOriginalResults=results.slice();

  let badge=document.getElementById('mss-count-badge');
  if(badge)badge.textContent=activeItems.length+' نتيجة';

  let groupsEl=document.getElementById('mss-groups');
  if(groupsEl){
    if(groupKeys.length>1){
      groupsEl.style.display='flex';
      groupsEl.innerHTML=
        `<div class="mss-group-tab ${_mssActiveGroup==='all'?'active':''}" data-group="all" onclick="mssSelectGroup('all')">الكل (${results.length})</div>`+
        groupKeys.map(k=>`<div class="mss-group-tab ${_mssActiveGroup===k?'active':''}" data-group="${k}" onclick="mssSelectGroup('${k}')">${k} (${groups[k].length})</div>`).join('');
    } else {
      groupsEl.style.display='none';groupsEl.innerHTML='';
    }
  }

  _mssRenderItems(activeItems,q);
  overlay.classList.add('open');
  requestAnimationFrame(()=>{
    sheet.classList.add('open');
    let _mi=document.getElementById('mss-input');
    if(_mi){ _mi.value=q||''; }
    let _xcbi=document.getElementById('mss-input-clear');
    if(_xcbi) _xcbi.style.display = (q&&q.trim()) ? 'block' : 'none';
    // تحديث أزرار الترتيب لتعكس الوضع الحالي
    document.querySelectorAll('.mss-sort-btn').forEach(btn=>btn.classList.toggle('active',btn.dataset.sort===_mssSortMode));
    // تطبيق الترتيب الحالي إذا كان هناك نتائج
    if(results.length && _mssSortMode !== 'smart'){
      _mssApplySort();
    }
  });
}

function _mssRenderItems(items,q){
  let body=document.getElementById('mss-body');
  let footer=document.getElementById('mss-footer');
  let startBtn=document.getElementById('mss-start-btn');
  if(!body)return;

  let nq=normalizeAr(stripTitlesFromQuery(q||'')||normalizeAr(q||''));
  let html=items.map(p=>{
    let par=getParent(p);
    let gf=par?getParent(par):null;
    let lineage=par?(par.name+(gf?' بن '+gf.name:'')):'';
    let kin=myPersonId&&myPersonId!==p.id?getMyKinship(p.id):null;
    let kinHtml=kin
      ?`<span style="font-size:11px;padding:2px 7px;border-radius:8px;background:#ede9fe;color:#5b21b6;border:1px solid #c4b5fd;flex-shrink:0;white-space:nowrap">${kin.label}</span>`
      :(myPersonId===p.id?`<span style="font-size:11px;padding:2px 7px;border-radius:8px;background:#fef9c3;color:#92400e;border:1px solid #fbbf24;flex-shrink:0">أنا</span>`:'');
    let dispName=highlightQueryHTML(p.name,q);
    let gDot=`<div style="width:11px;height:11px;border-radius:50%;background:${p.gender==='male'?'#3b82f6':'#ec4899'};flex-shrink:0"></div>`;
    let decIcon=p.deceased?`<span style="display:inline-flex;vertical-align:middle">${crescent('#2e7d32')}</span>`:'';
    let fn=p.familyName?` <span style="font-size:11px;color:var(--text2)">${p.familyName}</span>`:'';
    let titleHtml=p.title?`<span style="font-size:inherit;font-weight:500;color:var(--text)">${p.title} </span>`:'';
    return `<div class="mss-item${(_searchActiveId===p.id)?' active':''}" onclick="mssSelectPerson(${p.id})" data-mss-id="${p.id}">
      ${gDot}
      <div style="flex:1;min-width:0">
        <div class="mss-item-name">${titleHtml}${dispName}${fn}${decIcon}</div>
        ${lineage?`<div class="mss-item-sub">${lineage}</div>`:''}
      </div>
      ${kinHtml}
    </div>`;
  }).join('');
  body.innerHTML=html||`<div style="padding:28px;text-align:center;color:var(--text2)">لا توجد نتائج</div>`;
  if(footer&&startBtn){
    footer.style.display=items.length?'flex':'none';
    startBtn.textContent=`\uD83D\uDD0D تصفح ${items.length} نتيجة  \u2039 \u203A`;
    startBtn._items=items;
  }
}

function mssSelectGroup(groupName){
  let sheet=document.getElementById('mss-sheet');
  if(!sheet)return;
  _mssActiveGroup=groupName;
  document.querySelectorAll('.mss-group-tab').forEach(t=>t.classList.toggle('active',t.dataset.group===groupName));
  // تحديث _mssCurrentResults بعناصر المجموعة
  let items=groupName==='all'
    ?(_mssOriginalResults.length?_mssOriginalResults:(sheet._originalResults||sheet._allResults||[]))
    :(sheet._groups[groupName]||[]);
  _mssCurrentResults=items.slice();
  _mssGroupResults=items.slice();
  // تطبيق الترتيب الحالي على المجموعة الجديدة
  _mssApplySort();
}

function mssSelectPerson(id){
  let startBtn=document.getElementById('mss-start-btn');
  // استخدم نفس قائمة mssStartNav: النتائج المعروضة بالترتيب المختار
  let groupItems=(startBtn&&startBtn._items)||(_mssGroupResults&&_mssGroupResults.length?_mssGroupResults:null)||_mssOriginalResults||[];
  // احفظ الترتيب كما هو — لا إعادة ترتيب حسب الشجرة
  _searchResultIds = groupItems.map(p=>typeof p==='number'?p:p.id);
  _searchActiveId=id;
  // استعادة _lastSearchQ إذا كان فارغاً (مثلاً بعد غلق الشريط الأزرق)
  if(!_lastSearchQ && _persistedSearchQ) _lastSearchQ = _persistedSearchQ;
  closeMobSearchSheet();
  searchNavigateTo(id);
}

function mssStartNav(){
  let startBtn=document.getElementById('mss-start-btn');
  // استخدم النتائج المعروضة حالياً (حسب المجموعة والترتيب المختار) — بالترتيب الدقيق كما هو
  let items=(startBtn&&startBtn._items)||_mssGroupResults||[];
  if(!items.length) items = _mssOriginalResults||[];
  // احفظ الترتيب كما هو بدون إعادة ترتيب حسب الشجرة
  _searchResultIds = items.map(p=>typeof p==='number'?p:p.id);
  // استعادة _lastSearchQ إذا كان فارغاً (مثلاً بعد غلق الشريط الأزرق)
  if(!_lastSearchQ && _persistedSearchQ) _lastSearchQ = _persistedSearchQ;
  closeMobSearchSheet();
  if(_searchResultIds.length>0) searchNavigateTo(_searchResultIds[0]);
}

function closeMobSearchSheet(){
  let sheet=document.getElementById('mss-sheet');
  let overlay=document.getElementById('mss-overlay');
  if(sheet)sheet.classList.remove('open');
  if(overlay)overlay.classList.remove('open');
  // إزالة التركيز من حقل البحث حتى لا يعترض ESC بعد إغلاق اللوحة
  let inp=document.getElementById('mss-input');
  if(inp)inp.blur();
}

function switchTab(tab,el){
  document.querySelectorAll('.tab').forEach(t=>t.classList.remove('active'));
  el.classList.add('active');
  document.getElementById('treePanel').classList.toggle('active',tab==='tree');
  document.getElementById('listPanel').classList.toggle('active',tab==='list');
  document.getElementById('kinPanel').classList.toggle('active',tab==='kin');
  document.getElementById('guidePanel').classList.toggle('active',tab==='guide');
  if(tab==='guide')renderGuide();
  else if(tab==='kin')renderKinPanel();
  else if(tab==='list')renderList();
  else if(tab==='tree'){renderStats();renderTree();} // لا نُعيد رسم قائمة الأفراد عند التبديل للشجرة
  else renderAll();
}
function renderKinPanel(){
  let p1=kinPerson1,p2=kinPerson2;
  let p1Name=p1?p1.name:'';let p2Name=p2?p2.name:'';
  let html=`<div class="kin-container">
    <div class="kin-row" style="align-items:center;gap:4px;">
      <div class="kin-col">
        <label>الشخص الأول</label>
        <div id="kin1selected" class="kin-selected" style="display:${p1?'flex':'none'}">
          <div class="gender-dot ${p1&&p1.gender==='male'?'male-dot':'female-dot'}" style="flex-shrink:0"></div>
          <span class="name">${p1Name}</span>
          <span class="clear" onclick="clearKin(1)">✕</span>
        </div>
        <div class="kin-search-box" id="kin1box" style="display:${p1?'none':'block'}">
          <input type="text" placeholder="ابحث أو اضغط لعرض الكل..." oninput="kinSearch(this.value,1)" onfocus="kinSearch(this.value,1)" id="kin1input">
          <button id="kin1voice" class="field-mic-btn" title="بحث صوتي" onclick="startFieldVoice('kin1input',v=>{kinSearch(v,1)},'kin1voice')">🎤</button>
          <div class="kin-results" id="kin1results" style="display:none"></div>
        </div>
      </div>
      <div style="flex-shrink:0;display:flex;align-items:center;justify-content:center;padding-top:18px;">
        <button class="btn" onclick="swapKinPersons()" title="قلب الشخصين" style="font-size:18px;padding:5px 10px;border-radius:50%;width:36px;height:36px;display:flex;align-items:center;justify-content:center;" ${(!p1&&!p2)?'disabled':''}>⇄</button>
      </div>
      <div class="kin-col">
        <label>الشخص الثاني</label>
        <div id="kin2selected" class="kin-selected" style="display:${p2?'flex':'none'}">
          <div class="gender-dot ${p2&&p2.gender==='male'?'male-dot':'female-dot'}" style="flex-shrink:0"></div>
          <span class="name">${p2Name}</span>
          <span class="clear" onclick="clearKin(2)">✕</span>
        </div>
        <div class="kin-search-box" id="kin2box" style="display:${p2?'none':'block'}">
          <input type="text" placeholder="ابحث أو اضغط لعرض الكل..." oninput="kinSearch(this.value,2)" onfocus="kinSearch(this.value,2)" id="kin2input">
          <button id="kin2voice" class="field-mic-btn" title="بحث صوتي" onclick="startFieldVoice('kin2input',v=>{kinSearch(v,2)},'kin2voice')">🎤</button>
          <div class="kin-results" id="kin2results" style="display:none"></div>
        </div>
      </div>
    </div>
    <div style="text-align:center;margin-bottom:12px;margin-top:8px;">
      <button class="btn primary" onclick="discoverKin()" style="padding:10px 28px;font-size:14px;">🔍 اكتشف القرابة</button>
    </div>
    <div id="kinResultArea"></div>
  </div>`;
  document.getElementById('kinPanel').innerHTML=html;
}
function swapKinPersons(){
  let tmp=kinPerson1;
  kinPerson1=kinPerson2;
  kinPerson2=tmp;
  renderKinPanel();
  // أعد حساب النتيجة إذا كانت ظاهرة
  let area=document.getElementById('kinResultArea');
  if(area&&area.innerHTML.trim())discoverKin();
}
function kinSearch(q,which){
  let resId='kin'+which+'results';
  let el=document.getElementById(resId);
  if(!el)return;
  q=(q||'').trim().toLowerCase();
  let excludeId=(which===1&&kinPerson2)?kinPerson2.id:(which===2&&kinPerson1)?kinPerson1.id:null;
  let matches=(q
    ? people.filter(p=>matchesFullName(p,q)).sort((a,b)=>scoreMatch(b,q)-scoreMatch(a,q))
    : people.slice()
  ).filter(p=>p.id!==excludeId);
  if(!matches.length){
    el.innerHTML='<div class="kin-result-item" style="color:var(--text2)">لا توجد نتائج</div>';
    el.style.display='block';
    return;
  }
  let html=matches.map(p=>{
    let par=getParent(p);
    let mom=p.motherId?getPerson(p.motherId):null;
    let sub='';
    if(par)sub+=`الأب: ${par.name}`;
    if(mom)sub+=(sub?' · ':'')+`الأم: ${mom.name}`;
    return `<div class="kin-result-item" onclick="selectKin(${p.id},${which})">
      <div style="display:flex;align-items:center;gap:6px;">
        <div class="gender-dot ${p.gender==='male'?'male-dot':'female-dot'}" style="flex-shrink:0;width:8px;height:8px;"></div>
        <span style="font-weight:500;flex:1">${p.name}</span>
        ${p.deceased?`<span style="display:inline-flex">${crescent('#2e7d32')}</span>`:''}
      </div>
      ${sub?`<div style="font-size:11px;color:var(--text2);margin-top:2px;padding-right:14px;">${sub}</div>`:''}
    </div>`;
  }).join('');
  el.innerHTML=html;
  el.style.display='block';
}
function selectKin(id,which){
  let p=getPerson(id);if(!p)return;
  if(which===1)kinPerson1=p;else kinPerson2=p;
  renderKinPanel();
}
function clearKin(which){
  if(which===1)kinPerson1=null;else kinPerson2=null;
  document.getElementById('kinResultArea').innerHTML='';
  renderKinPanel();
}
function getParentIds(personId){
  let p=getPerson(personId);if(!p)return[];
  let result=[];
  if(p.parentId&&getPerson(p.parentId)){
    let par=getPerson(p.parentId);
    result.push({id:p.parentId,via:par.gender==='female'?'mother':'father'});
  }
  if(p.motherId&&getPerson(p.motherId)){
    if(!result.some(r=>r.id===p.motherId))result.push({id:p.motherId,via:'mother'});
  }
  return result;
}
function getAncestorsMap(startId){
  if(_ancestorMapCache.has(startId))return _ancestorMapCache.get(startId);
  let map=new Map(); 
  let queue=[{id:startId,dist:0,via:'self'}];
  while(queue.length){
    let {id:cur,dist,via}=queue.shift();
    if(cur===null||cur===undefined||map.has(cur))continue;
    let person=getPerson(cur);
    if(!person)continue;
    map.set(cur,{dist,via});
    getParentIds(cur).forEach(({id:pid,via:pv})=>{
      if(!map.has(pid))queue.push({id:pid,dist:dist+1,via:pv});
    });
  }
  _ancestorMapCache.set(startId,map);
  return map;
}
function getPathUp(fromId,toId){
  let visited=new Map(); 
  visited.set(fromId,{prev:null,via:'self'});
  let queue=[fromId];
  while(queue.length){
    let cur=queue.shift();
    if(cur===toId){
      let path=[];
      let node=toId;
      while(node!==null){
        let e=visited.get(node);
        path.unshift({id:node,via:e.via});
        node=e.prev;
      }
      return path;
    }
    getParentIds(cur).forEach(({id:pid,via:pv})=>{
      if(!visited.has(pid)){
        visited.set(pid,{prev:cur,via:pv});
        queue.push(pid);
      }
    });
  }
  return null; 
}
function describeKinshipFromPaths(path1,path2,p1,p2){
  let d1=path1.length-1;
  let d2=path2.length-1;
  let gB=p2.gender;
  let male=gB==='male';

  // ── جد / حفيد مباشر ──────────────────────────────────────────
  if(d2===0){
    if(d1===1)return male?'أب':'أم';
    if(d1===2)return male?'جد':'جدة';
    if(d1===3){
      let via=path1[1]?getPerson(path1[1].id):null;
      let suf=via?(via.gender==='male'?'الأب':'الأم'):'';
      return male?(suf?`جد ${suf}`:'جد'):(suf?`جدة ${suf}`:'جدة');
    }
    if(d1===4){
      let via=path1[2]?getPerson(path1[2].id):null;
      let suf=via?(via.gender==='male'?'الجد':'الجدة'):'الجد';
      return male?`جد ${suf}`:`جدة ${suf}`;
    }
    return male?`جد (جيل ${d1})`:`جدة (جيل ${d1})`;
  }
  if(d1===0){
    if(d2===1)return male?'ابن':'ابنة';
    if(d2===2)return male?'حفيد':'حفيدة';
    if(d2===3)return male?'ابن حفيد':'ابنة حفيد';
    if(d2===4)return male?'ابن ابن حفيد':'ابنة ابن حفيد';
    return male?`ذرية (جيل ${d2})`:`ذرية (جيل ${d2})`;
  }

  // ── أشقاء ────────────────────────────────────────────────────
  if(d1===1&&d2===1)return male?'أخ':'أخت';

  // ── تحديد جهة القرابة: عم (أبوي) أم خال (أمومي) ──────────────────────
  // الحلقة الوصل الصحيحة هي path1[d1-1]: الولد المباشر للجد المشترك على فرع p1.
  // جنسها يحدد: ذكر → عم/عمة/ابن عم، أنثى → خال/خالة/ابن خال.
  // (عند d1=2 يساوي path1[1] كما كان — لا تغيير للحالات البسيطة)
  let lcaConnector=d1>=1&&path1[d1-1]?getPerson(path1[d1-1].id):null;
  let throughFather=!lcaConnector||(lcaConnector.gender==='male');

  // الأب/الأم المباشر لـ p1 → يُستخدم في لاحقة "الأب"/"الأم"
  let p1Parent=d1>=1&&path1[1]?getPerson(path1[1].id):null;

  // جنس الوصلة على فرع p2 (الولد المباشر للجد المشترك على مسار p2)
  // يحدد: عم vs عمة / خال vs خالة
  let p2LcaConnector=d2>=2&&path2[d2-1]?getPerson(path2[d2-1].id):null;
  let connectorIsMale=!p2LcaConnector||(p2LcaConnector.gender==='male');

  // دوال بناء الكلمة الأساسية
  function uncleBase(m){return throughFather?(m?'عم':'عمة'):(m?'خال':'خالة');}
  function cousinBase(m){
    let rel=throughFather?(connectorIsMale?'عم':'عمة'):(connectorIsMale?'خال':'خالة');
    return m?`ابن ${rel}`:`ابنة ${rel}`;
  }

  // ── ابن/ابنة أخ أو أخت (d1=1: p1 هو/هي الجد المشترك مباشرةً) ───
  if(d1===1){
    // الأخ/الأخت هو الشخص المباشر تحت LCA على فرع p2 → path2[d2-1]
    // مثال d2=2: path2=[p2, أخ/أخت, LCA] → sibPerson = path2[1]
    // مثال d2=3: path2=[p2, ابن الأخ, أخ/أخت, LCA] → sibPerson = path2[2]
    // مثال d2=4: path2=[p2, path2[1], path2[2], أخ/أخت, LCA] → sibPerson = path2[3]
    let sibIdx=d2-1;
    let sibPerson=sibIdx>=1&&path2[sibIdx]?getPerson(path2[sibIdx].id):null;
    let sibMale=!sibPerson||(sibPerson.gender==='male');
    if(d2===2)return male?(sibMale?'ابن أخ':'ابن أخت'):(sibMale?'ابنة أخ':'ابنة أخت');
    if(d2===3)return male?(sibMale?'حفيد أخ':'حفيد أخت'):(sibMale?'حفيدة أخ':'حفيدة أخت');
    if(d2===4){
      // path2[1] = والد p2 = حفيد/حفيدة الأخ/الأخت
      let midPerson=path2[1]?getPerson(path2[1].id):null;
      let midWord=(!midPerson||midPerson.gender==='male')?'حفيد':'حفيدة';
      return male?(sibMale?`ابن ${midWord} أخ`:`ابن ${midWord} أخت`):(sibMale?`ابنة ${midWord} أخ`:`ابنة ${midWord} أخت`);
    }
    if(d2===5){
      return male?`ذرية ${sibMale?'أخ':'أخت'} (جيل ${d2-1})`:`ذرية ${sibMale?'أخ':'أخت'} (جيل ${d2-1})`;
    }
    return male?`ذرية ${sibMale?'أخ':'أخت'} (جيل ${d2-1})`:`ذرية ${sibMale?'أخ':'أخت'} (جيل ${d2-1})`;
  }

  // ── عم/عمة/خال/خالة مع عمق الأجيال (d2=1) ──────────────────
  if(d2===1){
    let base=uncleBase(male);
    if(d1===2)return base;
    let suf1=p1Parent?(p1Parent.gender==='male'?'الأب':'الأم'):'';
    if(d1===3)return suf1?`${base} ${suf1}`:base;
    let gpar=path1[2]?getPerson(path1[2].id):null;
    let suf2=gpar?(gpar.gender==='male'?'الجد':'الجدة'):'الجد';
    if(d1===4)return `${base} ${suf2}`;
    if(d1===5){
      let via=path1[1]?getPerson(path1[1].id):null;
      let grandPerson=path1[2]?getPerson(path1[2].id):null;
      let baseSuf=via?(via.gender==='male'?'الأب':'الأم'):'الأب';
      let grandWord=(!grandPerson||grandPerson.gender==='male')?'جد':'جدة';
      return `${base} ${grandWord} ${baseSuf}`;
    }
    return `${base} (جيل ${d1-1})`;
  }

  // ── أبناء العم/الخال وما بعد (d1≥2 و d2≥2) ─────────────────
  let minD=Math.min(d1,d2);
  let maxD=Math.max(d1,d2);
  let degree=minD-1;    // 1=أولى، 2=ثانية ...
  let removed=maxD-minD; // فارق الأجيال
  let cb=cousinBase(male);

  if(degree===1){
    if(removed===0)return cb;                  // ابن عم / ابن خال
    if(d1>d2){
      // p2 أقرب للجد → اللاحقة من جنس الجد على مسار p1
      let suf=p1Parent?(p1Parent.gender==='male'?'الأب':'الأم'):'';
      if(removed===1)return suf?`${cb} ${suf}`:`${cb} (جيل أعلى)`;
      let gpar2=path1[2]?getPerson(path1[2].id):null;
      let gsuf=gpar2?(gpar2.gender==='male'?'الجد':'الجدة'):'الجد';
      if(removed===2)return `${cb} ${gsuf}`;
      return `${cb} (${removed} جيل أعلى)`;
    } else {
      // p2 أبعد عن الجد (p2 أصغر جيلاً)
      if(removed===1)return `${cb} (جيل أبعد)`;
      if(removed===2)return `${cb} (جيلان أبعد)`;
      return `${cb} (${removed} أجيال أبعد)`;
    }
  }

  let degreeWord=degree===2?'الدرجة الثانية':degree===3?'الدرجة الثالثة':`الدرجة ${degree}`;
  if(removed===0)return `${cb} من ${degreeWord}`;
  if(d1>d2)return `${cb} من ${degreeWord} (${removed} جيل أعلى)`;
  return `${cb} من ${degreeWord} (${removed} جيل فارق)`;
}
// ══════════════════════════════════════════════════════
//  مساعدات القرابة — دم ومصاهرة
// ══════════════════════════════════════════════════════

// حساب القرابة الدموية بين شخصين، يُعيد null إذا لا توجد صلة
