// ══════════════════════════════════════════════════════════
//  Kinship Popup — شجرة قرابة كاملة من بيانات الشخص
// ══════════════════════════════════════════════════════════
function openKinPopup(targetId){
  let me=getPerson(myPersonId);
  let them=getPerson(targetId);
  if(!me||!them)return;

  let blood=computeBloodKinship(myPersonId,targetId);
  let directSpouse=isDirectSpouse(myPersonId,targetId);
  let spouseLabel='';
  if(directSpouse){
    let entry=getDirectSpouseEntry(myPersonId,targetId)||getDirectSpouseEntry(targetId,myPersonId);
    let isDivorced=entry&&entry.divorced;
    if(isDivorced){
      spouseLabel=them.gender==='female'?'مطلقته':'مطلقها';
    } else {
      spouseLabel=them.gender==='female'?'زوجته':'زوجها';
    }
  }
  // لا نحسب المصاهرة إذا كانا متزوجَين مباشرةً لتجنّب الازدواجية
  let marriage=directSpouse?null:computeMarriageKinship(myPersonId,targetId);

  // ── عنوان العلاقة ──
  let relLabelHtml='';
  if(directSpouse){
    let entry=getDirectSpouseEntry(myPersonId,targetId)||getDirectSpouseEntry(targetId,myPersonId);
    let isDivorced=entry&&entry.divorced;
    relLabelHtml+=`<div class="kin-rel-label">${spouseLabel}
      <span style="font-size:11px;font-weight:400;color:${isDivorced?'#c2410c':'#5b21b6'};background:${isDivorced?'#fff7ed':'#ede9fe'};border:1px solid ${isDivorced?'#f97316':'#c4b5fd'};border-radius:5px;padding:1px 6px;margin-right:4px">${isDivorced?'💔 طلاق':'💍 زواج مباشر'}</span>
    </div>`;
  }
  if(blood){
    relLabelHtml+=`<div class="kin-rel-label" style="margin-top:${directSpouse?'8px':'0'}">${blood.label}
      <span style="font-size:11px;font-weight:400;color:#1d4ed8;background:#dbeafe;border:1px solid #93c5fd;border-radius:5px;padding:1px 6px;margin-right:4px">نسب</span>
    </div>`;
  }
  if(marriage){
    relLabelHtml+=`<div class="kin-rel-label" style="margin-top:${(directSpouse||blood)?'8px':'0'}">${marriage.label}
      <span style="font-size:11px;font-weight:400;color:#5b21b6;background:#ede9fe;border:1px solid #c4b5fd;border-radius:5px;padding:1px 6px;margin-right:4px">مصاهرة</span>
    </div>`;
  }
  if(!directSpouse&&!blood&&!marriage){
    relLabelHtml=`<div class="kin-no-rel">
      <div style="font-size:28px;margin-bottom:6px">🔎</div>
      <div style="font-weight:500;margin-bottom:4px">لا توجد صلة قرابة مسجّلة</div>
      <div style="font-size:12px;color:var(--text2)">${me.name} و ${them.name} لا يرتبطان بسلف مشترك أو رابط زواج في الشجرة</div>
    </div>`;
  }

  // ── شجرة القرابة المرئية ──
  let treeHtml='';
  if(directSpouse){
    treeHtml=buildDirectSpouseTree(me,them);
    if(blood){
      let bloodTreeHtml=buildKinTree(blood.path1,blood.path2,blood.lca.id,me,them);
      treeHtml+=`<div style="margin-top:14px;border-top:2px dashed #93c5fd;padding-top:12px">
        <div style="text-align:center;font-size:11px;font-weight:600;color:#1d4ed8;margin-bottom:8px;background:#dbeafe;border-radius:6px;padding:4px 10px;display:inline-block">🩸 شجرة القرابة بالدم</div>
        ${bloodTreeHtml}
      </div>`;
    }
  } else if(blood){
    treeHtml=buildKinTree(blood.path1,blood.path2,blood.lca.id,me,them);
    if(marriage){
      let spPerson=getPerson(marriage.spouseOfId);
      treeHtml+=`<div style="margin-top:10px;padding:8px 12px;background:linear-gradient(135deg,#faf5ff,#ede9fe);border:1px solid #c4b5fd;border-radius:8px;font-size:12px;color:#5b21b6;text-align:center">
        💍 يرتبط/ترتبط أيضاً بـ ${me.name} عبر الزواج من <strong>${spPerson?spPerson.name:'؟'}</strong> (${marriage.spouseOfBloodLabel})
      </div>`;
    }
  } else if(marriage){
    treeHtml=buildMarriageKinTree(me,them,marriage);
  }

  // ── إحصاءات ──
  let statsHtml='';
  if(directSpouse){
    statsHtml+=`<span class="kin-stat">💍 ${me.name} و ${them.name} متزوجان مباشرةً</span>`;
  }
  if(blood){
    let otherLCAs=blood.otherLCAs||[];
    statsHtml+=`
      <span class="kin-stat">⬆ أجيال من ${me.name}: ${blood.lca.d1}</span>
      <span class="kin-stat">⬆ أجيال من ${them.name}: ${blood.lca.d2}</span>
      <span class="kin-stat">📏 مجموع الأجيال: ${blood.lca.total}</span>
      ${otherLCAs.length?`<span class="kin-stat">أجداد مشتركون أبعد: ${otherLCAs.map(x=>{let pp=getPerson(x.id);return pp?pp.name+' ('+x.total+' جيل)':'';}).filter(Boolean).join('، ')}</span>`:''}`;
  }
  if(marriage){
    let spPerson=getPerson(marriage.spouseOfId);
    statsHtml+=`<span class="kin-stat">💍 ${them.name} متزوج/ة من ${spPerson?spPerson.name:'؟'} (${marriage.spouseOfBloodLabel})</span>`;
  }

  let subLine=directSpouse&&!blood
    ? `${me.name} 💍 ${them.name}`
    : `${me.name} ← نقطة الالتقاء → ${them.name}`;

  let resultHtml=(directSpouse||blood||marriage)?`<div class="kin-result-panel">
    <div class="kin-result-header">
      ${relLabelHtml}
      <div class="kin-rel-sub">${subLine}</div>
    </div>
    <div class="kin-tree-wrap">${treeHtml}</div>
    ${statsHtml?`<div class="kin-stats">${statsHtml}</div>`:''}
  </div>`:relLabelHtml;

  let modal=`<div class="modal-overlay" onclick="if(event.target===this)closeModal()">
  <div class="modal" style="max-width:520px;">
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:14px;">
      <span style="font-size:22px;flex-shrink:0">🔗</span>
      <div style="flex:1;min-width:0">
        <h3 style="margin:0;font-size:15px;color:var(--text)">${them.name}</h3>
        <div style="font-size:11px;color:var(--text2);margin-top:2px">صلة القرابة بـ <strong>${me.name}</strong></div>
      </div>
    </div>
    ${resultHtml}
    <div class="modal-footer" style="margin-top:14px">
      <button class="btn" onclick="closeModal()">إغلاق</button>
      <button class="btn" onclick="closeModal();showPersonDetail(${targetId})">↩ رجوع للبيانات</button>
      <button class="btn" style="background:#ede9fe;border-color:#8b5cf6;color:#5b21b6"
        onclick="closeModal();switchTab('kin',document.querySelectorAll('.tab')[2]);setTimeout(()=>{kinPerson1=getPerson(${myPersonId});kinPerson2=getPerson(${targetId});renderKinPanel();},80)"
        title="فتح في كاشف القرابة الكامل">🔍 كاشف القرابة</button>
    </div>
  </div></div>`;
  document.getElementById('modalContainer').innerHTML=modal;
  _androidBackGuardModalOpen();
}

function searchPersonsAdvanced(query){
  return persons
    .map(p => ({p, score: scorePersonAdvanced(p, query)}))
    .filter(x => x.score > 0)
    .sort((a,b)=> b.score - a.score)
    .map(x=>x.p);
}

function openAddModal(pid){
  currentAddParentId=pid;
  currentEditId=null;
  let par=getPerson(pid);
  window._editGender=par?par.gender:'male';
  window._inheritedFamilyName=par?(par.childrenFamilyName||par.familyName||''):'';
  showEditModal(null,pid);
}
function openEditModal(id){
  currentAddParentId=null;
  currentEditId=id||null;
  let p=getPerson(id);
  window._editGender=p?p.gender:'male';
  window._inheritedFamilyName=p?(p.childrenFamilyName||p.familyName||''):'';
  showEditModal(id,null);
}
function getAvailableMothers(){
  // الأولوية: إذا كنا نُعدّل شخصاً ذكراً → هو الأب
  // إذا كنا نضيف ابناً → currentAddParentId هو الأب
  let fatherId=null;
  if(currentEditId){
    let ep=getPerson(currentEditId);
    if(ep&&ep.gender==='male')fatherId=currentEditId;
  }
  if(!fatherId)fatherId=currentAddParentId||null;
  if(!fatherId){
    let parentEl=document.getElementById('f_parent');
    if(parentEl&&parentEl.value&&currentAddParentId)fatherId=parseInt(parentEl.value)||null;
  }
  if(fatherId){
    let par=getPerson(fatherId);
    if(par&&par.gender==='male'){
      let fromSpouses=(par.spouses||[]).filter(s=>s.name);
      let fromTree=people.filter(w=>
        w.gender==='female'&&!w.isExternal&&
        w.spouses&&w.spouses.some(s=>(s.personId&&s.personId===fatherId)||(s.relativeId&&s.relativeId===fatherId))
      ).map(w=>({name:w.name,personId:w.id,familyName:w.familyName||''}));
      let merged=[...fromSpouses];
      fromTree.forEach(ft=>{if(!merged.find(x=>x.personId===ft.personId||x.name===ft.name))merged.push(ft);});
      if(merged.length)return merged;
    }
  }
  if(currentAddParentId){let par=getPerson(currentAddParentId);return par?par.spouses:editingSpouses;}
  return editingSpouses;
}
function showEditModal(editId,parentId){
  let p=editId?getPerson(editId):null;
  let par=(!editId&&parentId)?getPerson(parentId):null;
  window._editGender=p?p.gender:(par?par.gender:'male');
  // Always set _inheritedFamilyName so addChildRow picks it up
  if(editId&&p){
    window._inheritedFamilyName=p.childrenFamilyName||p.familyName||'';
  } else if(!editId&&par){
    window._inheritedFamilyName=par.childrenFamilyName||par.familyName||'';
  } else {
    window._inheritedFamilyName='';
  }
  editingSpouses=p?JSON.parse(JSON.stringify(p.spouses)):[];
  // ── للشخص الخارجي الذكر: أضف زوجاته من الشجرة الرئيسية تلقائياً ──
  // البنت (من العائلة) مرتبطة بالأب الخارجي عبر sp.personId في قائمة أزواجها
  if(editId && p && p.isExternal && p.gender==='male'){
    people.forEach(function(person){
      if(person.gender==='female' && !person.isExternal && person.spouses){
        person.spouses.forEach(function(sp){
          if(sp.personId===editId){
            var alreadyIn=editingSpouses.find(function(s){return s.personId===person.id||normalizeAr(s.name||'')===normalizeAr(person.name);});
            if(!alreadyIn){
              editingSpouses.push({
                name:person.name, familyName:person.familyName||'',
                gender:person.gender, deceased:person.deceased||false,
                divorced:sp.divorced||false, dob:person.dob||'',
                personId:person.id, isExternal:false
              });
            }
          }
        });
      }
    });
  }
  editingChildren=(()=>{
    if(!editId)return[];
    let ep=getPerson(editId);
    // للأب الخارجي: استخدم getChildrenForNode لجلب أبناء fatherId أيضاً
    let chs=(ep&&ep.isExternal&&ep.gender==='male')?getChildrenForNode(editId):getChildren(editId);
    return chs.map(ch=>({
      id:ch.id,name:ch.name,familyName:ch.familyName||'',
      gender:ch.gender,motherName:ch.motherName||'',
      motherId:ch.motherId||null,isExisting:true
    }));
  })();
  tempPhoto=null;
  editingRelatives=editId?getRelativesOf(editId).slice():[];
  let effParentId=p?p.parentId:parentId;
  let currentMotherId=p?p.motherId:null;
  let currentMotherName=p?p.motherName:'';
  let motherInTree=currentMotherId?getPerson(currentMotherId):null;
  // الأشخاص الخارجيون لا يحتاجون حقل أم (أمّهم خارج الشجرة)
  let _isExternalPerson=(p&&p.isExternal);
  let motherFieldHtml=_isExternalPerson?`<input type="hidden" id="f_mother_id" value=""><input type="hidden" id="f_mother" value="">`:
  `<div class="form-row">
    <label>الأم</label>
    <div style="display:flex;gap:6px;margin-bottom:4px;align-items:center;">
      <input type="checkbox" id="f_mother_intree" ${currentMotherId?'checked':''} onchange="toggleMotherMode()">
      <label for="f_mother_intree" style="font-size:12px;color:var(--text2)">ربط بشخص في الشجرة</label>
    </div>
    <div id="f_mother_tree_wrap" style="display:${currentMotherId?'block':'none'}">
      <div style="position:relative;">
        <input id="f_mother_search" type="text" placeholder="ابحث بالاسم أو اسم الأب أو الجد..." value="${motherInTree?motherInTree.name:''}" oninput="motherTreeSearch(this.value)" onfocus="motherTreeSearch(this.value)">
        <div id="f_mother_results" class="kin-results" style="display:none;max-height:130px;"></div>
      </div>
      <input type="hidden" id="f_mother_id" value="${currentMotherId||''}">
    </div>
    <div id="f_mother_text_wrap" style="display:${currentMotherId?'none':'block'}">
      <input id="f_mother" value="${currentMotherName}" placeholder="اسم الأم (نص حر)">
    </div>
  </div>`;
  let modal=`<div class="modal-overlay" onclick="if(event.target===this)closeModal()">
  <div class="modal">
    <h3>${p?'تعديل: '+p.name:'إضافة فرد جديد'}</h3>
    <div class="form-row"><label>الاسم</label><input id="f_name" value="${p?p.name:''}" placeholder="الاسم الكامل"></div>
    <div class="form-row">
      <label>اللقب الشرفي <span style="font-size:11px;color:var(--text2);font-weight:400">(يظهر قبل الاسم — لا يؤثر على البحث)</span></label>
      <div style="display:flex;gap:6px;align-items:center;">
        <select id="f_title_select" onchange="(()=>{let v=this.value;let inp=document.getElementById('f_title');inp.value=v;inp.style.display=v==='__custom__'?'':'none';})()" style="flex:1;max-width:160px">
          <option value="">— بدون لقب —</option>
          <option value="السيد">السيد</option>
          <option value="السيدة">السيدة</option>
          <option value="سيد">سيد</option>
          <option value="سيدة">سيدة</option>
          <option value="دكتور">دكتور</option>
          <option value="دكتورة">دكتورة</option>
          <option value="أستاذ">أستاذ</option>
          <option value="أستاذة">أستاذة</option>
          <option value="__custom__">آخر...</option>
        </select>
        <input id="f_title" value="" placeholder="لقب مخصص" style="flex:1;display:none">
      </div>
    </div>
    <div class="form-row"><label>اللقب / اسم العائلة</label>
      <div style="display:flex;gap:6px;align-items:center;">
        <input id="f_familyName" value="${p&&p.familyName?p.familyName:(window._inheritedFamilyName||'')}" placeholder="مثال: آل محمد، السعد... (اختياري)" oninput="syncChildFamilyName(this.value)" style="flex:1">
        ${editId?`<button type="button" class="btn" style="font-size:11px;padding:4px 8px;white-space:nowrap;flex-shrink:0" onclick="applyFamilyNameToBranch(${editId})" title="تطبيق اللقب على جميع الأبناء والأحفاد">تطبيق على الفرع ↓</button>`:''}
      </div>
    </div>
    <div class="form-row"><label>الجنس</label><select id="f_gender"><option value="male" ${(!p||p.gender==='male')?'selected':''}>ذكر</option><option value="female" ${(p&&p.gender==='female')?'selected':''}>أنثى</option></select></div>
    <div class="form-row">
      <label>الوالد${!editId&&parentId!==null?'':' (اختياري)'}</label>
      <div style="position:relative;">
        <input id="f_parent_search" type="text"
          placeholder="ابحث بالاسم أو اسم الأب أو الجد... (أو اتركه فارغاً)"
          value="${(()=>{if(parentId){let pp=getPerson(parentId);return pp?pp.name:'';}if(p&&p.parentId){let pp=getPerson(p.parentId);return pp?pp.name:'';}return '';})()}"
          oninput="parentTreeSearch(this.value)"
          onfocus="parentTreeSearch(this.value)"
          ${parentId?`readonly style="background:var(--color-background-secondary,#f9fafb);color:var(--text2)"`:''}>
        <div id="f_parent_results" class="kin-results" style="display:none;max-height:160px;"></div>
      </div>
      <input type="hidden" id="f_parent" value="${parentId||(p&&p.parentId?p.parentId:'')}">
    </div>
    ${motherFieldHtml}
    <div class="form-row"><label>تاريخ الولادة</label><input type="date" id="f_dob" value="${p?p.dob:''}"></div>
    <div class="form-row"><div class="checkbox-row"><input type="checkbox" id="f_deceased" ${(p&&p.deceased)?'checked':''} onchange="toggleDod()"><label for="f_deceased">متوفى</label><span style="display:inline-flex">${crescent('#2e7d32')}</span></div></div>
    <div class="form-row" id="dodRow" style="display:${(p&&p.deceased)?'block':'none'}"><label>تاريخ الوفاة</label><input type="date" id="f_dod" value="${p?p.dod:''}"></div>
    <div class="form-row"><label>صورة</label><div class="file-input-btn btn" style="width:100%;justify-content:center;">📷 رفع صورة<input type="file" accept="image/*" onchange="handlePhoto(event)"></div><div id="photoPreview" style="margin-top:6px;"></div></div>
    <div class="form-row"><label>ملاحظات</label><textarea id="f_notes" rows="2" style="resize:vertical">${p?p.notes:''}</textarea></div>
    <div class="section-title">الأزواج / الزوجات
      ${(window._editGender==='female')?`<span style="font-size:11px;font-weight:400;color:#5b21b6;background:#ede9fe;padding:2px 7px;border-radius:6px;margin-right:8px;">💡 أضف الأزواج ثم أضف أبناءهم في شجرة كل زوج</span>`:``}
    </div>
    <div id="spousesList"></div>
    <button class="add-sub-btn" onclick="addSpouseRow()">+ إضافة زوج/ة</button>
    <div id="childrenSectionWrap">
    <div class="section-title">الأبناء <span style="font-size:11px;font-weight:400;color:var(--text2)" id="childrenSectionNote"></span></div>
    <div id="childrenList"></div>
    <div id="addChildBtnWrap"></div>
    </div>
    <div class="modal-footer"><button class="btn" onclick="closeModal()">إلغاء</button><button class="btn primary" onclick="saveModal(${editId||'null'},${parentId||'null'})">حفظ</button></div>
  </div></div>`;
  document.getElementById('modalContainer').innerHTML=modal;
  _androidBackGuardModalOpen();
  // تهيئة حقل اللقب
  (function(){
    let existingTitle=p?p.title||'':'';
    let sel=document.getElementById('f_title_select');
    let inp=document.getElementById('f_title');
    if(!sel||!inp)return;
    if(!existingTitle){sel.value='';inp.style.display='none';}
    else {
      // هل هو من القائمة؟
      let opts=Array.from(sel.options).map(o=>o.value);
      if(opts.includes(existingTitle)){sel.value=existingTitle;inp.style.display='none';}
      else{sel.value='__custom__';inp.value=existingTitle;inp.style.display='';}
    }
  })();
  renderSpouseRows();renderChildRows();
  // ── تهيئة قسم الأبناء بناءً على الجنس ──
  _initChildrenSection(p?p.gender:'male', editId, parentId);
  if(p&&p.photo){let _kb=Math.round(p.photo.length*0.75/1024);let _pn=p.name.replace(/'/g,"\\'");document.getElementById('photoPreview').innerHTML=`<div style='display:flex;align-items:center;gap:8px'><img src="${p.photo}" style="width:54px;height:54px;border-radius:50%;object-fit:cover;cursor:pointer;border:2px solid var(--card-border)" onclick="zoomPhoto('${p.photo}','${_pn}')"><div><div style="font-size:11px;color:var(--text2)">${_kb}KB</div><button class='btn' style='font-size:11px;padding:3px 8px;color:#ef4444;margin-top:3px' onclick='clearPhoto()'>🗑 حذف</button></div></div>`;}
}
function addRelativeRow(id){
  let rid=parseInt(id);
  if(editingRelatives.includes(rid)){return;} // silently skip duplicate
  editingRelatives.push(rid);
  renderRelativeRows();
  // Clear search
  let si=document.getElementById('f_rel_search');let sr=document.getElementById('f_rel_results');
  if(si)si.value='';if(sr)sr.style.display='none';
}
function relSearch(q){
  let el=document.getElementById('f_rel_results');if(!el)return;
  q=(q||'').trim().toLowerCase();
  let currentEditId=parseInt((document.querySelector('[id^="f_parent"]')||{}).value||0)||null;
  let matches=q?people.filter(p=>matchesFullName(p,q)).sort((a,b)=>scoreMatch(b,q)-scoreMatch(a,q)):people.slice();
  // Exclude already added relatives and self
  matches=matches.filter(p=>!editingRelatives.includes(p.id));
  if(!matches.length){el.style.display='none';return;}
  el.innerHTML=matches.map(p=>{
    let par=getParent(p);
    let sub=par?`الأب: ${par.name}`:'';
    return `<div class="kin-result-item" onclick="addRelativeRow(${p.id})">
      <div style="display:flex;align-items:center;gap:6px;">
        <div class="gender-dot ${p.gender==='male'?'male-dot':'female-dot'}" style="flex-shrink:0;width:8px;height:8px;"></div>
        <span style="font-weight:500;flex:1">${p.name}</span>
      </div>
      ${sub?`<div style="font-size:11px;color:var(--text2);padding-right:14px">${sub}</div>`:''}
    </div>`;
  }).join('');
  el.style.display='block';
}
function removeRelativeRow(i){editingRelatives.splice(i,1);renderRelativeRows();}
function renderRelativeRows(){
  let c=document.getElementById('relativesList');if(!c)return;
  c.innerHTML=editingRelatives.map((rid,i)=>{
    let rp=getPerson(rid);
    return `<div class="sub-item"><span style="flex:1;font-size:12px;color:var(--text)">${rp?rp.name:'؟'} · ${getAncestorLabel(rid)}</span><button class="remove-btn" onclick="removeRelativeRow(${i})">✕</button></div>`;
  }).join('');
}
function zoomPhoto(src,name){
  let ov=document.createElement('div');
  ov.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,.92);display:flex;flex-direction:column;align-items:center;justify-content:center;z-index:9998;cursor:pointer;gap:14px;padding:20px;';
  let nameHtml=name?`<div style="color:rgba(255,255,255,.9);font-size:15px;font-weight:600">${name}</div>`:'';
  ov.innerHTML=`<img src="${src}" style="max-width:min(480px,90vw);max-height:72vh;border-radius:16px;box-shadow:0 16px 60px rgba(0,0,0,.7);object-fit:contain;cursor:default" onclick="event.stopPropagation()">${nameHtml}<div style="color:rgba(255,255,255,.4);font-size:12px">اضغط خارج الصورة للإغلاق · ESC</div>`;
  ov.onclick=()=>ov.remove();
  let esc=e=>{if(e.key==='Escape'){ov.remove();document.removeEventListener('keydown',esc);}};
  document.addEventListener('keydown',esc);
  document.body.appendChild(ov);
}
function clearPhoto(){
  tempPhoto='__deleted__';
  document.getElementById('photoPreview').innerHTML='<span style="font-size:12px;color:#6b7280">تم حذف الصورة</span>';
}
function handlePhoto(e){
  let f=e.target.files[0];if(!f)return;
  let r=new FileReader();
  r.onload=ev=>{
    let img=new Image();
    img.onload=()=>{
      let MAX=400;
      let sc=Math.min(MAX/img.width,MAX/img.height,1);
      let w=Math.round(img.width*sc),h=Math.round(img.height*sc);
      let canvas=document.createElement('canvas');
      canvas.width=w;canvas.height=h;
      let ctx=canvas.getContext('2d');
      ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';
      ctx.drawImage(img,0,0,w,h);
      let useWebP=canvas.toDataURL('image/webp').startsWith('data:image/webp');
      tempPhoto=canvas.toDataURL(useWebP?'image/webp':'image/jpeg',0.82);
      let kb=Math.round(tempPhoto.length*0.75/1024);
      document.getElementById('photoPreview').innerHTML=
        `<div style='display:flex;align-items:center;gap:10px'>
          <img src="${tempPhoto}" style="width:54px;height:54px;border-radius:50%;object-fit:cover;cursor:pointer;border:2px solid var(--card-border)" onclick="zoomPhoto('${tempPhoto}')">
          <div>
            <div style="font-size:11px;color:var(--text2)">${w}×${h}px · ${kb}KB · ${useWebP?'WebP':'JPEG'}</div>
            <button class='btn' style='font-size:11px;padding:3px 8px;color:#ef4444;margin-top:3px' onclick='clearPhoto()'>🗑 حذف</button>
          </div>
        </div>`;
    };
    img.src=ev.target.result;
  };
  r.readAsDataURL(f);
}
function toggleMotherMode(){
  let cb=document.getElementById('f_mother_intree');
  let treeWrap=document.getElementById('f_mother_tree_wrap');
  let textWrap=document.getElementById('f_mother_text_wrap');
  if(!cb)return;
  if(cb.checked){treeWrap.style.display='block';textWrap.style.display='none';}
  else{treeWrap.style.display='none';textWrap.style.display='block';document.getElementById('f_mother_id').value='';}
}
function motherTreeSearch(q){
  let res=document.getElementById('f_mother_results');if(!res)return;
  q=(q||'').trim().toLowerCase();
  let matches=q?people.filter(p=>matchesFullName(p,q)).sort((a,b)=>scoreMatch(b,q)-scoreMatch(a,q)):people.slice();
  if(!matches.length){
    res.innerHTML='<div class="kin-result-item" style="color:var(--text2)">لا توجد نتائج</div>';
    res.style.display='block';return;
  }
  res.innerHTML=matches.map(p=>{
    let f=getParent(p);
    let gf=f?getParent(f):null;
    let lineage='';
    if(f)lineage+=f.name;
    if(gf)lineage+=' بن '+gf.name;
    return `<div class="kin-result-item" onclick="selectMotherFromTree(${p.id})">
      <div style="display:flex;align-items:center;gap:5px;">
        <div class="gender-dot ${p.gender==='male'?'male-dot':'female-dot'}" style="flex-shrink:0;width:8px;height:8px;"></div>
        <span style="font-weight:500">${p.name}</span>
        ${p.deceased?`<span style="display:inline-flex;vertical-align:middle">${crescent('#2e7d32')}</span>`:''}
      </div>
      ${lineage?`<div style="font-size:11px;color:var(--text2);margin-top:1px;padding-right:13px;">${lineage}</div>`:''}
    </div>`;
  }).join('');
  res.style.display='block';
}
function selectMotherFromTree(id){
  let p=getPerson(id);if(!p)return;
  let searchEl=document.getElementById('f_mother_search');
  let idEl=document.getElementById('f_mother_id');
  let resEl=document.getElementById('f_mother_results');
  if(searchEl)searchEl.value=p.name;
  if(idEl)idEl.value=id;
  if(resEl)resEl.style.display='none';
}
function parentTreeSearch(q){
  let res=document.getElementById('f_parent_results');if(!res)return;
  q=(q||'').trim().toLowerCase();
  // Exclude person being edited
  let editingId=null;
  try{let modal=document.querySelector('#modalContainer .modal h3');
    if(modal){let m=modal.textContent.match(/تعديل:/);if(m){let nameText=modal.textContent.replace('تعديل:','').trim();let found=people.find(p=>p.name===nameText);if(found)editingId=found.id;}}
  }catch(e){}
  let matches=q?people.filter(p=>matchesFullName(p,q)).sort((a,b)=>scoreMatch(b,q)-scoreMatch(a,q)):people.slice();
  if(editingId)matches=matches.filter(p=>p.id!==editingId);
  if(!matches.length){res.style.display='none';return;}
  res.innerHTML=matches.map(p=>{
    let f=getParent(p);let gf=f?getParent(f):null;
    let lineage='';if(f)lineage=f.name;if(gf)lineage+=' بن '+gf.name;
    return `<div class="kin-result-item" onclick="selectParentFromTree(${p.id})">
      <div style="display:flex;align-items:center;gap:6px;">
        <div class="gender-dot ${p.gender==='male'?'male-dot':'female-dot'}" style="flex-shrink:0;width:8px;height:8px;"></div>
        <span style="font-weight:500;flex:1">${p.name}</span>
        ${p.deceased?`<span style="display:inline-flex;vertical-align:middle">${crescent('#2e7d32')}</span>`:''}
      </div>
      ${lineage?`<div style="font-size:11px;color:var(--text2);padding-right:14px">${lineage}</div>`:''}
    </div>`;
  }).join('');
  res.style.display='block';
}

function selectParentFromTree(id){
  let p=getPerson(id);if(!p)return;
  let si=document.getElementById('f_parent_search');
  let hi=document.getElementById('f_parent');
  let ri=document.getElementById('f_parent_results');
  if(si)si.value=p.name;
  if(hi)hi.value=id;
  if(ri)ri.style.display='none';
  // Also refresh mother options if needed
  let par=getPerson(id);
  if(par&&par.spouses&&par.spouses.length>0){
    let motherSel=document.getElementById('f_mother');
    let motherSearch=document.getElementById('f_mother_search');
    if(motherSel||motherSearch){
      let opts=par.spouses.map(s=>`<option value="${s.name}">${s.name}</option>`).join('');
      if(motherSel)motherSel.innerHTML=`<option value="">— غير محدد —</option>${opts}`;
    }
  }
}
function toggleDod(){document.getElementById('dodRow').style.display=document.getElementById('f_deceased').checked?'block':'none';}
function addSpouseRow(){
  // Default: external spouse for females, ask for males too
  let isCurrentlyFemale=(window._editGender==='female');
  editingSpouses.push({
    name:'',familyName:'',
    gender:isCurrentlyFemale?'male':'female',
    deceased:false,divorced:false,dob:'',
    relativeId:null,personId:null,isExternal:true
  });
  renderSpouseRows();renderChildRows();
}
function removeSpouseRow(i){editingSpouses.splice(i,1);renderSpouseRows();renderChildRows();}
function renderSpouseRows(){
  let c=document.getElementById('spousesList');if(!c)return;
  let isEditingFemale=(window._editGender==='female');
  c.innerHTML=editingSpouses.map((s,i)=>{
    let linkedPerson=s.personId?getPerson(s.personId):null;
    // ── Determine if external ──
    let isExt=s.isExternal!==false; // default true (most spouses are external)
    // ── Status chips ──
    let gIcon=s.gender==='male'?'♂':'♀';
    // ── Main fields row ──
    let mainRow=`<div style="display:flex;gap:5px;align-items:center;flex-wrap:wrap;margin-bottom:6px;">
      <input placeholder="الاسم" value="${s.name||''}" oninput="editingSpouses[${i}].name=this.value;renderChildRows()" style="flex:1;min-width:90px;font-weight:500;">
      <input placeholder="اللقب / العائلة" value="${s.familyName||''}" oninput="editingSpouses[${i}].familyName=this.value" style="width:96px;">
      <select onchange="editingSpouses[${i}].gender=this.value;renderSpouseRows()"><option value="female" ${s.gender==='female'?'selected':''}>أنثى ♀</option><option value="male" ${s.gender==='male'?'selected':''}>ذكر ♂</option></select>
      <input type="date" value="${s.dob||''}" oninput="editingSpouses[${i}].dob=this.value" style="max-width:130px;font-size:11px" title="تاريخ الميلاد">
      <label style="font-size:11px;white-space:nowrap;display:flex;align-items:center;gap:3px;" title="مطلق/ة"><input type="checkbox" ${s.divorced?'checked':''} onchange="editingSpouses[${i}].divorced=this.checked"> م</label>
      <label style="font-size:11px;display:flex;align-items:center;gap:3px;" title="متوفى"><input type="checkbox" ${s.deceased?'checked':''} onchange="editingSpouses[${i}].deceased=this.checked"><span style="display:inline-flex">${crescent('#2e7d32')}</span></label>
      <button class="remove-btn" onclick="removeSpouseRow(${i})" title="حذف">✕</button>
    </div>`;
    // ── External spouse toggle section ──
    let extSection=`<div class="${isExt?'ext-spouse-wrap':''}">
      <label class="ext-spouse-label" title="إذا كان هذا الزوج/ة ينتمي لعائلة خارج هذه الشجرة">
        <input type="checkbox" ${isExt?'checked':''} onchange="toggleSpouseExternal(${i},this.checked)">
        <span>${isExt?'🏠 من خارج العائلة':'🔗 من داخل الشجرة'}</span>
        ${isExt?'<span style="font-size:10px;background:#c4b5fd;color:#3b0764;padding:1px 6px;border-radius:8px;font-weight:400;margin-right:2px">خارجي</span>':'<span style="font-size:10px;background:#d1fae5;color:#065f46;padding:1px 6px;border-radius:8px;font-weight:400;margin-right:2px">داخلي</span>'}
      </label>
      ${isExt?`
      <div class="ext-spouse-info">
        <span>ℹ️</span>
        <span>سيُحفظ كشخص في قاعدة البيانات لكن <strong>لا يظهر في الشجرة الرئيسية</strong>. يمكنك فتح شجرة عائلته بالضغط على 🌳 بجانب اسمه.</span>
      </div>
      <div style="margin-bottom:6px">
        <label style="display:flex;align-items:center;gap:6px;font-size:12px;color:#5b21b6;cursor:pointer;" title="يُظهر زر 🌳 بنفسجي بجانب اسم الزوج في الشجرة حتى لو لم تُسجَّل له عائلة بعد">
          <input type="checkbox" ${s.forceTreeBtn?'checked':''} onchange="editingSpouses[${i}].forceTreeBtn=this.checked" style="accent-color:#7c3aed">
          إظهار زر 🌳 للانتقال إلى شجرة عائلته
        </label>
      </div>
      ${linkedPerson?`
        <div class="ext-linked-chip">
          <span>✅</span>
          <span style="font-weight:600">${linkedPerson.name}</span>
          ${getParent(linkedPerson)?`<span style="opacity:.7;font-size:11px">بن/ت ${getParent(linkedPerson).name}</span>`:''}
          <span style="margin-right:auto;font-size:10px;background:#6ee7b7;padding:1px 6px;border-radius:6px">مرتبط بالشجرة</span>
          <button class="ext-action-btn view" onclick="event.stopPropagation();closeModal();navigateToSpouseFamily(${linkedPerson.id})" title="فتح شجرة عائلته">🌳 فتح الشجرة</button>
          <span class="undo" onclick="editingSpouses[${i}].personId=null;renderSpouseRows();" title="إلغاء الربط">✕</span>
        </div>`:
      `<div class="ext-spouse-actions">
        <div style="position:relative;flex:1;min-width:140px;">
          <input class="ext-action-btn" placeholder="🔗 ربط بشخص موجود في الشجرة..." id="spouseLinkSearch${i}"
            oninput="spouseLinkSearch(${i},this.value)" onfocus="spouseLinkSearch(${i},this.value)"
            style="width:100%;text-align:right;border-style:dashed;padding:5px 10px;font-weight:400;" value="">
          <div id="spouseLinkResults${i}" class="kin-results" style="display:none;max-height:140px;"></div>
        </div>
      </div>`}
      `:`<!-- inner family: link to existing person -->
      ${linkedPerson?`
        <div class="ext-linked-chip" style="background:var(--card-bg);border-color:#3b82f6;color:#1d4ed8;">
          <span>🔗</span>
          <span style="font-weight:600">${linkedPerson.name}</span>
          ${getParent(linkedPerson)?`<span style="opacity:.7;font-size:11px">بن/ت ${getParent(linkedPerson).name}</span>`:''}
          <span class="undo" onclick="editingSpouses[${i}].personId=null;renderSpouseRows();" title="إلغاء الربط">✕</span>
        </div>`:
      `<div style="position:relative;">
        <input style="width:100%;padding:5px 10px;border:1px dashed #3b82f6;border-radius:6px;background:var(--card-bg);color:var(--text);font-size:12px;"
          placeholder="🔍 ابحث عن الزوج/ة في الشجرة الحالية..." id="spouseLinkSearch${i}"
          oninput="spouseLinkSearch(${i},this.value)" onfocus="spouseLinkSearch(${i},this.value)" value="">
        <div id="spouseLinkResults${i}" class="kin-results" style="display:none;max-height:130px;"></div>
      </div>`}
      `}
    </div>`;
    return `<div class="sub-item" style="flex-direction:column;align-items:stretch;gap:4px;${isExt?'border-color:#8b5cf6;background:rgba(139,92,246,.04)':''}">
      ${mainRow}${extSection}
    </div>`;
  }).join('');
}
function toggleSpouseExternal(idx,val){
  editingSpouses[idx].isExternal=val;
  // If switching to inner, clear any external person link (it was external before)
  if(!val){
    let sp=editingSpouses[idx];
    // Only clear if the linked person is actually external
    if(sp.personId){let lp=getPerson(sp.personId);if(lp&&lp.isExternal)sp.personId=null;}
  }
  renderSpouseRows();
}
function spouseLinkSearch(idx,q){
  let el=document.getElementById('spouseLinkResults'+idx);if(!el)return;
  q=(q||'').trim();
  let matches=q?people.filter(p=>matchesFullName(p,q)).sort((a,b)=>scoreMatch(b,q)-scoreMatch(a,q)):people.slice().slice(0,20);
  if(!matches.length){el.style.display='none';return;}
  el.innerHTML=matches.map(p=>{
    let par=getParent(p);
    return `<div class="kin-result-item" onclick="linkSpouseToPerson(${idx},${p.id})">
      <div style="display:flex;align-items:center;gap:6px;">
        <div class="gender-dot ${p.gender==='male'?'male-dot':'female-dot'}" style="width:8px;height:8px;flex-shrink:0;border-radius:50%;"></div>
        <span style="font-weight:500;flex:1">${p.name}</span>
      </div>
      ${par?`<div style="font-size:11px;color:var(--text2);padding-right:14px">بن/ت ${par.name}</div>`:''}
    </div>`;
  }).join('');
  el.style.display='block';
}
function linkSpouseToPerson(idx,pid){
  let p=getPerson(pid);if(!p)return;
  editingSpouses[idx].personId=pid;
  editingSpouses[idx].name=editingSpouses[idx].name||p.name;
  editingSpouses[idx].familyName=editingSpouses[idx].familyName||p.familyName||'';
  editingSpouses[idx].gender=p.gender;
  editingSpouses[idx].deceased=p.deceased||false;
  renderSpouseRows();renderChildRows();
}

function ensureExternalSpousePerson(sp){
  if(!sp) return sp;
  // Only create external person if isExternal is true (default true)
  let shouldBeExternal = sp.isExternal !== false;
  if(sp.personId){
    let existing=getPerson(sp.personId);
    if(existing){
      if(shouldBeExternal){ existing.isExternal=true; }
      if(sp.familyName!=null && sp.familyName!=='' ) existing.familyName = sp.familyName;
      if(sp.name) existing.name = sp.name;
      if(sp.gender) existing.gender = sp.gender;
      if(sp.deceased!=null) existing.deceased = !!sp.deceased;
      if(sp.dob) existing.dob = sp.dob;
      return sp;
    }
  }
  let nm=(sp.name||'').trim();
  if(!nm) return sp;
  // Only auto-create person record if external
  if(!shouldBeExternal) return sp;
  let ext=addPerson({
    name:nm,
    familyName:sp.familyName||'',
    gender:sp.gender||'male',
    dob:sp.dob||'',
    dod:sp.dod||'',
    deceased:!!sp.deceased,
    parentId:null,
    spouses:[],
    notes:'',
    isExternal:true
  });
  ext.isExternal=true;
  sp.personId=ext.id;
  return sp;
}
function migrateExternalSpouses(){
  let changed=false;
  // Step 0: إصلاح أي جذر مُعلَّم isExternal بالخطأ
  // (شخص بلا parentId، مُدرج فقط كزوج بـ isExternal:false في قوائم الأزواج)
  people.forEach(p=>{
    if(!p.isExternal || p.parentId) return;
    // هل يُوجد مرجع واحد على الأقل بـ isExternal:false يشير لهذا الشخص؟
    let hasRelativeRef=people.some(w=>Array.isArray(w.spouses)&&w.spouses.some(s=>s.personId===p.id&&s.isExternal===false));
    if(hasRelativeRef){ p.isExternal=false; changed=true; }
  });
  // Step 1: ensure every spouse entry has a person record
  people.forEach(p=>{
    if(Array.isArray(p.spouses)){
      p.spouses.forEach(sp=>{
        if(sp && sp.name && !sp.personId){
          ensureExternalSpousePerson(sp);
          changed=true;
        }else if(sp && sp.personId){
          let ex=getPerson(sp.personId);
          if(ex && !ex.isExternal && (!ex.parentId) && sp.isExternal!==false){
            ex.isExternal=true;
            changed=true;
          }
        }
      });
    }
  });
  // Step 2: link legacy externalFatherName children to fatherId
  // For children stored under a female parent with externalFatherName
  people.forEach(child=>{
    if(child.fatherId||!child.parentId)return; // already linked or root
    if(child.externalFatherName||child.fatherName){
      let fname=(child.externalFatherName||child.fatherName||'').trim();
      if(!fname)return;
      let mother=getPerson(child.parentId);
      if(!mother||mother.gender!=='female')return;
      // Try to find the father in mother's spouse list by name match
      let sp=mother.spouses&&mother.spouses.find(s=>
        s.name&&normalizeAr(s.name)===normalizeAr(fname)&&s.personId
      );
      if(sp&&sp.personId){
        child.fatherId=sp.personId;
        child.fatherName=sp.name;
        if(!child.familyName&&sp.familyName)child.familyName=sp.familyName;
        changed=true;
      }
    }
  });
  return changed;
}

function addChildRow(){
  let defaultFN=window._inheritedFamilyName||'';
  // تعبئة الأم تلقائياً إذا وُجدت زوجة واحدة فقط
  let mothers=getAvailableMothers().filter(s=>s.name);
  let defaultMother=mothers.length===1?mothers[0].name:'';
  let defaultMotherId=mothers.length===1?(mothers[0].personId||null):null;
  editingChildren.push({name:'',gender:'male',motherName:defaultMother,motherId:defaultMotherId,familyName:defaultFN,fatherId:null,fatherName:'',isExisting:false});
  renderChildRows();
}
function removeChildRow(i){editingChildren.splice(i,1);renderChildRows();}

// Called when user picks a father from dropdown in a child row
function selectChildFather(idx,select){
  let opt=select.options[select.selectedIndex];
  let fatherId=select.value?parseInt(select.value):null;
  let fatherName=opt?opt.dataset.name||'':'';
  let familyName=opt?opt.dataset.family||'':'';
  editingChildren[idx].fatherId=fatherId;
  editingChildren[idx].fatherName=fatherName;
  editingChildren[idx].familyName=familyName;
  // Sync family name input in the same row
  let row=document.querySelectorAll('#childrenList .sub-item')[idx];
  if(row){let fn=row.querySelector('.child-fn-input');if(fn)fn.value=familyName;}
}

// ══════════════════════════════════════════════════════════
//  نقل أبناء البنت تلقائياً لشجرة أبيهم
// ══════════════════════════════════════════════════════════
function migrateChildrenToFather(motherId){
  var mother=getPerson(motherId);
  if(!mother){alert('خطأ: لم يُعثر على الشخص');return;}
  var children=people.filter(function(p){return p.parentId===motherId;});
  if(!children.length){alert('لا يوجد أبناء مسجلون تحت هذه البنت');return;}

  // جمع الأطباء المتاحين (أزواج مرتبطون بـ personId)
  var fatherOptions=[];
  people.forEach(function(person){
    if(person.gender==='male'&&person.spouses){
      person.spouses.forEach(function(sp){
        if(sp.personId===motherId){
          if(!fatherOptions.find(function(x){return x.id===person.id;}))
            fatherOptions.push(person);
        }
      });
    }
  });
  // البحث أيضاً في spouses الأم
  if(mother.spouses){
    mother.spouses.forEach(function(sp){
      if(sp.personId){
        var f=getPerson(sp.personId);
        if(f&&f.gender==='male'&&!fatherOptions.find(function(x){return x.id===f.id;}))
          fatherOptions.push(f);
      }
    });
  }

  if(!fatherOptions.length){
    alert('لم يُعثر على أب مرتبط بشجرة\nتأكد من ربط الزوج بـ personId في بيانات الزوجة');
    return;
  }

  // إذا أكثر من أب — نسأل
  var father;
  if(fatherOptions.length===1){
    father=fatherOptions[0];
    if(!confirm('نقل '+children.length+' شخص من تحت "'+mother.name+'" إلى تحت "'+father.name+'"؟\n\nهذا يضبط:\n• الوالد → '+father.name+'\n• الأم → '+mother.name+' (مرتبطة)\n\nلا يمكن التراجع.')){return;}
  } else {
    var opts=fatherOptions.map(function(f,i){return (i+1)+'. '+f.name+(f.familyName?' ('+f.familyName+')':'');}).join('\n');
    var choice=prompt('يوجد أكثر من أب مرتبط. اختر رقم الأب:\n\n'+opts);
    if(!choice)return;
    father=fatherOptions[parseInt(choice)-1];
    if(!father){alert('اختيار غير صالح');return;}
  }

  // تنفيذ النقل
  var moved=0;
  children.forEach(function(child){
    child.parentId=father.id;
    child.motherId=motherId;
    // تنظيف حقول قديمة
    if(child.externalFatherName)delete child.externalFatherName;
    if(child.fatherName)delete child.fatherName;
    // fatherId لم يعد ضرورياً (parentId هو الأب الآن)
    if(child.fatherId===father.id)delete child.fatherId;
    moved++;
  });

  closeModal();
  saveData();renderAll();
  alert('✅ تم نقل '+moved+' شخص لشجرة '+father.name+'\nيمكنك الانتقال لشجرته للتحقق.');
}

// ── تهيئة قسم الأبناء: للذكر عادي، للأنثى → توجيه لشجرة الزوج ──
function _initChildrenSection(gender, editId, parentId){
  var note=document.getElementById('childrenSectionNote');
  var btnWrap=document.getElementById('addChildBtnWrap');
  var childList=document.getElementById('childrenList');
  if(gender==='female'){
    // أنثى: لا نسمح بإضافة أبناء هنا
    if(note)note.textContent='';
    if(btnWrap)btnWrap.innerHTML='';
    if(childList)childList.innerHTML='';
    // إظهار رسالة توجيهية
    var wrap=document.getElementById('childrenSectionWrap');
    if(wrap){
      // أي أبناء موجودون تحتها (نسخ قديمة) — نعرضهم بتحذير
      var existingUnder=editId?people.filter(function(x){return x.parentId===editId;}):[];
      var legacyHtml='';
      if(existingUnder.length){
        legacyHtml='<div style="margin-bottom:8px;padding:8px 12px;background:#fef3c7;border:1px solid #f59e0b;border-radius:8px;font-size:12px;color:#92400e">'
          +'⚠️ يوجد '+existingUnder.length+' شخص مسجّل تحت هذه البنت من نسخة قديمة: '
          +existingUnder.map(function(x){return x.name;}).join('، ')
          +'<br><button class="btn" style="font-size:11px;margin-top:5px;background:#fef3c7;border-color:#f59e0b;color:#92400e" onclick="migrateChildrenToFather('+editId+')">🔄 نقل تلقائي لشجرة الأب</button></div>';
      }
      // أزواج لهم personId — نعرض أزرار الانتقال
      var p=editId?getPerson(editId):null;
      var spouseLinks='';
      if(p&&p.spouses&&p.spouses.length){
        spouseLinks=p.spouses.filter(function(s){return s.personId&&getPerson(s.personId);}).map(function(s){
          var lp=getPerson(s.personId);
          return '<button class="btn" style="font-size:12px;background:#ede9fe;border-color:#8b5cf6;color:#5b21b6;margin-left:6px;margin-bottom:4px" '
            +'onclick="closeModal();navigateToSpouseFamily('+s.personId+')" title="انتقل لشجرة '+s.name+' لإضافة الأبناء هناك">'
            +'🌳 انتقل لشجرة '+s.name+'</button>';
        }).join('');
      }
      var infoBox='<div style="padding:10px 12px;background:#ede9fe;border:1px solid #8b5cf6;border-radius:8px;font-size:12px;color:#5b21b6;line-height:1.8">'
        +'<strong>أبناء البنت ينتمون لعائلة الأب</strong><br>'
        +'أضفهم في شجرة الزوج ← حقل "الأم" اختر البنت ← يظهرون تلقائياً.'
        +(spouseLinks?'<div style="margin-top:8px">'+spouseLinks+'</div>':'')
        +'</div>';
      wrap.querySelector('.section-title').nextElementSibling.innerHTML='';
      var insertPoint=wrap.querySelector('#addChildBtnWrap');
      if(insertPoint)insertPoint.innerHTML=legacyHtml+infoBox;
    }
  } else {
    // ذكر: قسم الأبناء العادي
    if(note)note.textContent='(يظهرون في الشجرة تحت هذا الشخص)';
    if(btnWrap)btnWrap.innerHTML='<button class="add-sub-btn" onclick="addChildRow()">+ إضافة ابن/ابنة</button>';
    // ── تعبئة الأم تلقائياً فقط لغير الخارجيين ──
    var _ep=editId?getPerson(editId):null;
    if(!(_ep&&_ep.isExternal)){
      _autoFillMotherFromSpouse(editId, parentId);
    }
  }
}

// تعبئة حقل الأم تلقائياً عند إضافة ابن لأب لديه زوجة مرتبطة
function _autoFillMotherFromSpouse(editId, parentId){
  // يعمل عند إضافة ابن جديد لأب، أو عند تعديل أب خارجي
  var fatherId=parentId||(editId&&getPerson(editId)&&getPerson(editId).isExternal?editId:null);
  if(!fatherId)return;
  // الوضع القديم: editId بدون parentId ولكن ليس خارجياً
  if(editId&&!getPerson(editId).isExternal)return;
  var father=getPerson(fatherId);
  if(!father||father.gender!=='male')return;

  // ── طريقة البحث ──
  // البنت (الزوجة) محفوظة في spouses الخاصة بها وتشير للزوج عبر personId
  // نبحث عن كل شخص أنثى لديه الزوج في قائمة زوجاته
  var candidates=[];

  // 1. البنت من شجرة رئيسية: تبحث في كل الناس عن من لديها هذا الزوج
  people.forEach(function(person){
    if(person.gender==='female'&&person.spouses){
      person.spouses.forEach(function(sp){
        if(sp.personId===father.id||sp.personId===parentId){
          if(!candidates.find(function(x){return x.id===person.id;}))
            candidates.push(person);
        }
      });
    }
  });

  // 2. احتياطياً: إذا كان للزوج نفسه spouses تشير لزوجة
  if(!candidates.length&&father.spouses){
    father.spouses.forEach(function(sp){
      if(sp.personId){
        var w=getPerson(sp.personId);
        if(w&&w.gender==='female')candidates.push(w);
      }
    });
  }

  // إذا وجدنا زوجة واحدة فقط → اختبرها تلقائياً
  if(candidates.length!==1)return;
  var motherPerson=candidates[0];

  setTimeout(function(){
    var cb=document.getElementById('f_mother_intree');
    var hiddenId=document.getElementById('f_mother_id');
    var searchBox=document.getElementById('f_mother_search');
    var treeWrap=document.getElementById('f_mother_tree_wrap');
    var textWrap=document.getElementById('f_mother_text_wrap');
    if(!cb)return;
    if(!cb.checked){
      cb.checked=true;
      if(treeWrap)treeWrap.style.display='block';
      if(textWrap)textWrap.style.display='none';
    }
    if(hiddenId)hiddenId.value=motherPerson.id;
    if(searchBox)searchBox.value=motherPerson.name;
  },80);
}

function renderChildRows(){
  let c=document.getElementById('childrenList');if(!c)return;
  let isFemaleParent=(window._editGender==='female');
  let mothers=(!isFemaleParent)?getAvailableMothers().filter(s=>s.name):[];

  // Build father options from editingSpouses (for female parent)
  let fatherOpts='<option value="" data-name="" data-family="">— غير محدد —</option>';
  if(isFemaleParent){
    fatherOpts+=editingSpouses.filter(s=>s.name).map(s=>{
      let pid=s.personId||'';
      let fn=s.familyName||(s.personId&&getPerson(s.personId)?getPerson(s.personId).familyName||'':'');
      return `<option value="${pid}" data-name="${s.name}" data-family="${fn}">${s.name}${fn?' ('+fn+')':''}</option>`;
    }).join('');
  }

  c.innerHTML=editingChildren.map((ch,i)=>{
    let existingBadge=ch.isExisting?`<span style="font-size:10px;padding:1px 5px;border-radius:4px;background:#dcfce7;color:#15803d;border:1px solid #86efac;flex-shrink:0">موجود</span>`:'';
    let nameField=ch.isExisting
      ?`<span style="flex:1;font-size:12px;color:var(--text);padding:4px 8px">${ch.name}</span>`
      :`<input placeholder="اسم الابن/ابنة" value="${ch.name}" oninput="editingChildren[${i}].name=this.value" style="flex:1;min-width:70px">`;
    let genderField=ch.isExisting
      ?`<span style="font-size:11px;color:var(--text2);padding:4px 4px">${ch.gender==='male'?'ذكر':'أنثى'}</span>`
      :`<select onchange="editingChildren[${i}].gender=this.value" style="min-width:52px"><option value="male" ${ch.gender==='male'?'selected':''}>ذكر</option><option value="female" ${ch.gender==='female'?'selected':''}>أنثى</option></select>`;
    let extraField='';
    // حقل الأم المشترك: لكل ابن (جديد أو موجود) إذا كانت القائمة متاحة
    let fnVal=ch.familyName||'';
    let fnField=`<input class="child-fn-input" placeholder="اللقب" value="${fnVal}" oninput="editingChildren[${i}].familyName=this.value" style="width:70px;font-size:11px" title="اللقب يُرث تلقائياً من الأب — يمكن تعديله">`;
    if(isFemaleParent){
      if(!ch.isExisting){
        let selectedPid=ch.fatherId?String(ch.fatherId):'';
        let optsWithSelected=fatherOpts.replace(
          new RegExp(`value="${selectedPid}"`),
          `value="${selectedPid}" selected`
        );
        let fatherSelect=`<select onchange="selectChildFather(${i},this)" style="min-width:80px;font-size:12px;background:linear-gradient(135deg,#faf5ff,#ede9fe);border-color:#8b5cf6;color:#5b21b6;" title="اختر الأب من قائمة الأزواج">${optsWithSelected}</select>`;
        extraField=fatherSelect+fnField;
      }
    } else if(mothers.length){
      // اختيار الأم: للجديد والموجود
      let curMother=ch.motherName||(ch.motherId&&getPerson(ch.motherId)?getPerson(ch.motherId).name:'');
      let motherSelect=`<select style="max-width:100px;font-size:12px;border-color:#10b981;color:#065f46;background:#d1fae5" onchange="editingChildren[${i}].motherName=this.options[this.selectedIndex].dataset.name||'';editingChildren[${i}].motherId=this.value?parseInt(this.value)||null:null" title="الأم"><option value="">الأم؟</option>${mothers.map(s=>{let sel=(ch.motherId&&ch.motherId===s.personId)||(!ch.motherId&&curMother===s.name);return `<option value="${s.personId||''}" data-name="${s.name}"${sel?' selected':''}>${s.name}</option>`;}).join('')}</select>`;
      extraField=(ch.isExisting?'':fnField)+motherSelect;
    } else if(!ch.isExisting){
      extraField=fnField;
    }
    return `<div class="sub-item" style="gap:4px">${existingBadge}${nameField}${genderField}${extraField}<button class="remove-btn" onclick="removeChildRow(${i})" title="${ch.isExisting?'إزالة من القائمة فقط':'حذف'}">✕</button></div>`;
  }).join('');
}
function saveModal(editId,parentId){
  let name=document.getElementById('f_name').value.trim();
  if(!name){alert('الرجاء إدخال الاسم');return;}
  // اللقب: من حقل الاختيار أو حقل النص المخصص
  let _titleSel=document.getElementById('f_title_select');
  let _titleInp=document.getElementById('f_title');
  let title='';
  if(_titleSel){
    if(_titleSel.value==='__custom__')title=(_titleInp?_titleInp.value.trim():'');
    else title=_titleSel.value;
  }
  let familyName=(document.getElementById('f_familyName')||{}).value||'';
  familyName=familyName.trim();
  let gender=document.getElementById('f_gender').value;
  let parentEl=document.getElementById('f_parent');
  let pid=parentEl?(parentEl.value||''):'';
  let dob=document.getElementById('f_dob').value;
  let deceased=document.getElementById('f_deceased').checked;
  let dod=document.getElementById('f_dod')?document.getElementById('f_dod').value:'';
  let notes=document.getElementById('f_notes').value.trim();
  let motherIdEl=document.getElementById('f_mother_id');
  let motherTextEl=document.getElementById('f_mother');
  let motherId=motherIdEl&&motherIdEl.value?parseInt(motherIdEl.value):null;
  let motherName=motherTextEl?motherTextEl.value:(motherId&&getPerson(motherId)?getPerson(motherId).name:'');
  if(motherId)motherName=getPerson(motherId)?getPerson(motherId).name:motherName;
  let normalizedSpouses=JSON.parse(JSON.stringify(editingSpouses||[])).map(sp=>ensureExternalSpousePerson(sp));
  // ── مزامنة: عند حفظ البنت، تأكّد من وجودها كزوجة في بيانات الأب الخارجي ──
  var _savedPersonId=editId;
  normalizedSpouses.forEach(function(sp){
    if(!sp||!sp.personId)return;
    var extPerson=getPerson(sp.personId);
    if(!extPerson||!extPerson.isExternal)return;
    if(!extPerson.spouses)extPerson.spouses=[];
    var currentId=_savedPersonId;
    var currentPerson=currentId?getPerson(currentId):null;
    if(!currentPerson)return;
    var already=extPerson.spouses.find(function(s){return s.personId===currentId||normalizeAr(s.name||'')===normalizeAr(currentPerson.name);});
    if(!already){
      extPerson.spouses.push({
        name:currentPerson.name, familyName:currentPerson.familyName||'',
        gender:currentPerson.gender, deceased:currentPerson.deceased||false,
        divorced:sp.divorced||false, dob:currentPerson.dob||'',
        personId:currentId, isExternal:false
      });
    } else {
      // تحديث بيانات الربط إذا تغيّرت
      already.personId=currentId;
      already.name=currentPerson.name;
      already.divorced=sp.divorced||false;
    }
  });

  // ── Helper: build child record from editingChildren item ──
  function buildChildRecord(ch,parentPersonId){
    let parentPerson=getPerson(parentPersonId);
    let rec={
      name:ch.name.trim(),
      gender:ch.gender,
      parentId:parentPersonId,
      // Inherit family name: child's explicit → father/mother's familyName → ''
      familyName:ch.familyName||(parentPerson?parentPerson.familyName||'':''),
      spouses:[]
    };
    // fatherId from dropdown selection (new system — female parent)
    if(ch.fatherId){
      rec.fatherId=ch.fatherId;
      rec.fatherName=ch.fatherName||'';
      // If child's familyName was empty, try to inherit from father record
      if(!rec.familyName){
        let fp=getPerson(ch.fatherId);
        rec.familyName=fp?fp.familyName||'':'';
      }
    } else if(ch.fatherName){
      rec.fatherName=ch.fatherName;
    }
    // motherName + motherId for male parent with selected wife
    if(ch.motherName)rec.motherName=ch.motherName;
    if(ch.motherId){
      rec.motherId=ch.motherId;
    } else if(ch.motherName){
      // محاولة ربط motherId تلقائياً بالاسم
      var mFound=people.find(function(w){return w.gender==='female'&&w.name===ch.motherName&&!w.isExternal;});
      if(mFound)rec.motherId=mFound.id;
    }
    return rec;
  }

  if(editId){
    let p=getPerson(editId);
    Object.assign(p,{name,familyName,title,gender,dob,deceased,dod,notes,motherId,motherName,spouses:normalizedSpouses});
    if(pid!==undefined)p.parentId=pid?parseInt(pid):null;
    if(tempPhoto==='__deleted__')p.photo=null;
    else if(tempPhoto!==null)p.photo=tempPhoto;
    removeRelPairsForPerson(editId);
    editingRelatives.forEach(rid=>{addRelPairOnce(editId,rid);});
    editingChildren.filter(ch=>!ch.isExisting&&ch.name.trim()).forEach(ch=>{
      let rec=buildChildRecord(ch,editId);
      addPerson(rec);
      expanded[editId]=true;
    });
    // تحديث الأم للأبناء الموجودين إذا تم تغيير اختيار الأم
    editingChildren.filter(ch=>ch.isExisting).forEach(ch=>{
      let existChild=getPerson(ch.id);if(!existChild)return;
      if(ch.motherName!==undefined&&ch.motherName!==existChild.motherName){
        existChild.motherName=ch.motherName;
        // ربط motherId إذا كان الاسم يطابق شخصاً في الشجرة
        if(!existChild.motherId&&ch.motherName){
          let mFound=people.find(w=>w.gender==='female'&&w.name===ch.motherName&&!w.isExternal);
          if(mFound)existChild.motherId=mFound.id;
        }
      }
    });
  } else {
    let actualParent=parentId||null;
    if(pid)actualParent=parseInt(pid);
    if(parentId&&!pid)actualParent=parentId;
    let np=addPerson({name,familyName,title,gender,dob,deceased,dod,notes,motherId,motherName,
      parentId:actualParent||null,
      sortOrder:window._insertAtPos!=null?-1:9999,
      spouses:normalizedSpouses,photo:tempPhoto});
    if(window._insertAtPos!=null){
      let siblings=getChildren(actualParent||np.parentId).filter(c=>c.id!==np.id);
      siblings.forEach((s,i)=>{s.sortOrder=i<window._insertAtPos?i:i+1;});
      np.sortOrder=window._insertAtPos;
      window._insertAtPos=null;
    }
    editingChildren.filter(ch=>ch.name.trim()).forEach(ch=>{
      let rec=buildChildRecord(ch,np.id);
      addPerson(rec);
    });
    expanded[np.id]=false;
    if(actualParent)expanded[actualParent]=true;
    editingRelatives.forEach(rid=>{addRelPairOnce(np.id,rid);});
  }
  tempPhoto=null;editingSpouses=[];editingChildren=[];editingRelatives=[];
  closeModal();renderAll();
}
// ══════════════════════════════════════════════════════════
// نظام التنقل بين العائلات (Two-layer navigation)
// ══════════════════════════════════════════════════════════
function renderNavBreadcrumb(){
  if(!currentFamilyFilter&&navStack.length===0)return'';
  // ── Context Banner (top) ──
  let rootPerson=currentFamilyFilter?getPerson(currentFamilyFilter.rootId):null;
  let connectedVia='';
  if(currentFamilyFilter&&navStack.length>0){
    let prevFrame=navStack[navStack.length-1];
    connectedVia=prevFrame.label||'الشجرة الرئيسية';
  }
  let banner=currentFamilyFilter?`
  <div class="ctx-nav-banner">
    <span class="ctx-icon">🌳</span>
    <div class="ctx-body">
      <div class="ctx-title">${currentFamilyFilter.label}</div>
      <div class="ctx-sub">${connectedVia?`متصلة بـ ${connectedVia} عبر زواج`:'عائلة منفصلة — انتقلت إليها عبر رابط زواج'}</div>
    </div>
    <button class="ctx-back-btn" onclick="navigateBack()">◀ رجوع</button>
  </div>`:'';
  // ── Breadcrumb strip ──
  let mainLabel=people.length>0&&getRoots(false).length>0?'🏠 '+getRoots(false)[0].name:'🏠 الرئيسية';
  let crumbs=`<span class="ctx-crumb" onclick="navigateHome()" title="العودة للشجرة الرئيسية">${mainLabel}</span>`;
  navStack.forEach((frame,i)=>{
    crumbs+=`<span class="ctx-crumb-sep">◀</span>`;
    let isLast=(i===navStack.length-1)&&currentFamilyFilter;
    crumbs+=`<span class="ctx-crumb${isLast?' active':''}" onclick="navigateToBreadcrumb(${i})">${frame.label||'...'}</span>`;
  });
  if(currentFamilyFilter){
    if(navStack.length>0)crumbs+=`<span class="ctx-crumb-sep">◀</span>`;
    crumbs+=`<span class="ctx-crumb active">🌳 ${currentFamilyFilter.label}</span>`;
  }
  let breadcrumb=`<div class="ctx-breadcrumb">${crumbs}</div>`;
  return banner+breadcrumb;
}
function navigateToSpouseFamily(personId){
  _pushAndroidTreeSnapshot();
  let sp=getPerson(personId);if(!sp)return;
  // Walk up to find the root of this person's family
  let cur=sp;
  while(cur.parentId&&getPerson(cur.parentId))cur=getPerson(cur.parentId);
  let rootId=cur.id;
  let currentLabel=currentFamilyFilter?currentFamilyFilter.label:
    (getRoots(false).length>0?'عائلة '+getRoots(false)[0].name:'الشجرة الرئيسية');
  navStack.push({
    label:currentLabel,
    filter:currentFamilyFilter?JSON.parse(JSON.stringify(currentFamilyFilter)):null,
    scrollY:window.scrollY
  });
  currentFamilyFilter={
    rootId:rootId,
    label:'عائلة '+(cur.name)+(cur.familyName?' '+cur.familyName:''),
    viaPersonId:personId,
    fromLabel:currentLabel
  };
  // Expand path to target person + also expand root to show children
  expanded[rootId]=true;
  let p=sp;while(p){expanded[p.id]=true;p=getParent(p);}
  // For external persons: also expand to show children (via fatherId)
  if(cur.isExternal){
    let extKids=people.filter(c=>c.fatherId===rootId);
    if(extKids.length)expanded[rootId]=true;
  }
  renderAll();
  setTimeout(()=>{
    let el=document.querySelector(`[data-person-id="${personId}"]`);
    if(el){
      el.scrollIntoView({behavior:'smooth',block:'center'});
      let hdr=el.querySelector('.node-header');
      if(hdr){
        hdr.style.transition='background .1s';
        hdr.style.background='#ede9fe';
        setTimeout(()=>{hdr.style.transition='background .4s';hdr.style.background='';},700);
      }
    }
  },150);
}
function navigateHome(){
  navStack=[];
  currentFamilyFilter=null;
  renderAll();
  window.scrollTo({top:0,behavior:'smooth'});
}
function navigateBack(){
  if(navStack.length===0){navigateHome();return;}
  let prev=navStack.pop();
  currentFamilyFilter=prev.filter;
  renderAll();
  setTimeout(()=>window.scrollTo({top:prev.scrollY||0,behavior:'smooth'}),100);
}
function navigateToBreadcrumb(idx){
  // Pop everything after idx
  let frame=navStack[idx];
  navStack=navStack.slice(0,idx);
  currentFamilyFilter=frame.filter;
  renderAll();
  setTimeout(()=>window.scrollTo({top:frame.scrollY||0,behavior:'smooth'}),100);
}
// ══════════════════════════════════════════════════════════
function closeModal(){
  document.getElementById('modalContainer').innerHTML='';
  tempPhoto=null;
  // إعادة تقييم الأزرار العائمة عند إغلاق النافذة
  if(window._updateFabMobileMode){
    setTimeout(()=>window._updateFabMobileMode(),50);
  }
}

// Android back guard: keep one extra internal step whenever a modal is opened
function _androidBackGuardModalOpen(){
  if(!_androidBackReady) return;
  _pushAndroidHistoryState();
}

// Android / Browser Back Button — smart internal navigation
let _androidBackReady=false;
window._ftTreeBackStack=window._ftTreeBackStack||[];

function _getActiveTabName(){
  let panels=[
    document.getElementById('treePanel'),
    document.getElementById('listPanel'),
    document.getElementById('kinPanel'),
    document.getElementById('guidePanel')
  ];
  let names=['tree','list','kin','guide'];
  for(let i=0;i<panels.length;i++){
    if(panels[i] && panels[i].classList.contains('active')) return names[i];
  }
  return 'tree';
}

function _getTabElementByName(name){
  let tabs=document.querySelectorAll('.tab');
  if(name==='list') return tabs[1]||tabs[0];
  if(name==='kin') return tabs[2]||tabs[0];
  if(name==='guide') return tabs[3]||tabs[0];
  return tabs[0]||null;
}

function _pushAndroidHistoryState(){
  if(!history || !history.pushState) return;
  try{
    history.pushState({_ftBackGuard:true}, '', location.href);
  }catch(e){}
}

function _restoreAndroidTreeSnapshot(){
  let stack=window._ftTreeBackStack||[];
  let snap=stack.pop();
  if(!snap) return false;
  expanded=snap.expanded||{};
  currentFamilyFilter=snap.currentFamilyFilter||null;
  navStack=snap.navStack||[];
  renderAll();
  let tabEl=_getTabElementByName(snap.tab||'tree');
  if((snap.tab||'tree')!=='tree') switchTab(snap.tab,tabEl||_getTabElementByName('tree'));
  setTimeout(function(){
    window.scrollTo({top:snap.scrollY||0,behavior:'smooth'});
  },80);
  return true;
}

function _pushAndroidTreeSnapshot(){
  try{
    window._ftTreeBackStack=window._ftTreeBackStack||[];
    window._ftTreeBackStack.push({
      expanded:JSON.parse(JSON.stringify(expanded||{})),
      currentFamilyFilter:currentFamilyFilter?JSON.parse(JSON.stringify(currentFamilyFilter)):null,
      navStack:JSON.parse(JSON.stringify(navStack||[])),
      scrollY:window.scrollY||0,
      tab:_getActiveTabName()
    });
    if(window._ftTreeBackStack.length>20) window._ftTreeBackStack.shift();
  }catch(e){}
}

function _closeBackTarget(){
  let modalContainer=document.getElementById('modalContainer');
  if(modalContainer && modalContainer.innerHTML){
    closeModal();
    return true;
  }

  let mssSheet=document.getElementById('mss-sheet');
  if(mssSheet && mssSheet.classList.contains('open')){
    closeMobSearchSheet();
    return true;
  }

  if(_lastSearchQ || (document.getElementById('searchBox') && document.getElementById('searchBox').value)){
    if(document.getElementById('searchResultsPanel') && document.getElementById('searchResultsPanel').style.display!=='none'){
      clearSearch();
      return true;
    }
  }

  let actionSheet=document.getElementById('mob-action-sheet');
  if(actionSheet && actionSheet.classList.contains('open')){
    closeMobSheet();
    return true;
  }

  return false;
}

// طابع آخر ضغطة "رجوع" على الجذر — للسماح بالخروج بضغطتين متتاليتين فقط
let _lastBackAtRootTime = 0;

/*
 * قاعدة ثابتة: هذه الدالة لا تستدعي _pushAndroidHistoryState أبداً بداخلها.
 * المسؤول الوحيد عن الـ push هو popstate handler فقط — مرة واحدة بعد كل ضغطة.
 * هذا يمنع "double-push" الذي كان يُفقد طبقات الـ guard وسبّب الخروج المبكر.
 */
function _handleAndroidBack(){
  // 1. أغلق أي طبقة مفتوحة (modal / sheet / بحث)
  if(_closeBackTarget()) return true;

  // 2. إذا كان المستخدم scrolled → ارجع للأعلى أولاً
  if(window.scrollY > 120){
    window.scrollTo({top:0, behavior:'smooth'});
    return true;
  }

  // 3. ارجع للتاب الرئيسي إن كنا في تاب آخر
  if(_getActiveTabName()!=='tree'){
    let treeTab=_getTabElementByName('tree');
    if(treeTab) switchTab('tree',treeTab);
    return true;
  }

  // 4. ارجع خطوة تنقل (navStack / familyFilter)
  if(navStack.length>0 || currentFamilyFilter){
    if(navStack.length>0) navigateBack();
    else navigateHome();
    return true;
  }

  // 5. استعد snapshot محفوظ
  if(window._ftTreeBackStack && window._ftTreeBackStack.length){
    if(_restoreAndroidTreeSnapshot()) return true;
  }

  // 6. نحن في أعلى الشجرة الرئيسية — اخرج فقط بضغطتين متتاليتين خلال 2 ثانية
  var now = Date.now();
  if(now - _lastBackAtRootTime < 2000){
    // الضغطة الثانية → لا نُعيد push → يخرج المتصفح طبيعياً
    return false;
  }
  _lastBackAtRootTime = now;
  // الضغطة الأولى → أظهر تلميح وابقَ (الـ push يحدث في popstate handler فقط)
  (function(){
    var old=document.getElementById('_ftExitToast');
    if(old) old.remove();
    var t=document.createElement('div');
    t.id='_ftExitToast';
    t.textContent='اضغط مرة أخرى للخروج';
    t.style.cssText='position:fixed;bottom:80px;left:50%;transform:translateX(-50%);'
      +'background:#1f2937;color:#f9fafb;padding:10px 22px;border-radius:20px;'
      +'font-size:13px;z-index:99999;pointer-events:none;opacity:1;'
      +'transition:opacity 0.4s;';
    document.body.appendChild(t);
    setTimeout(function(){
      t.style.opacity='0';
      setTimeout(function(){if(t.parentNode)t.remove();},400);
    },1800);
  })();
  return true;
}

function _initAndroidBackNavigation(){
  if(_androidBackReady) return;
  if(!history || !history.pushState) return;
  _androidBackReady=true;

  try{
    history.replaceState({_ftBackGuard:true}, '', location.href);
    history.pushState({_ftBackGuard:true}, '', location.href);
  }catch(e){}

  window.addEventListener('popstate', function(){
    if(_handleAndroidBack()){
      _pushAndroidHistoryState();
    }
  });

  // ── Modal back-guard: أضف طبقة history عند فتح أي Modal ──
  // نعترض innerHTML على modalContainer بحيث يُشغَّل pushState تلقائياً
  // عند أي إسناد غير فارغ، دون لمس بقية منطق الرجوع.
  try{
    var _mc = document.getElementById('modalContainer');
    if(_mc){
      var _mcProto = Object.getOwnPropertyDescriptor(Element.prototype, 'innerHTML');
      var _mcSetter = _mcProto && _mcProto.set;
      if(_mcSetter){
        Object.defineProperty(_mc, 'innerHTML', {
          get: function(){ return _mcProto.get.call(this); },
          set: function(val){
            _mcSetter.call(this, val);
            // فقط عند الفتح (قيمة غير فارغة) نضيف طبقة رجوع
            if(val && val.trim() !== ''){
              _pushAndroidHistoryState();
            }
          },
          configurable: true
        });
      }
    }
  }catch(e){}
}

// ── My Person (منظوري أنا) ──
let myPersonId=null;
const MY_KEY='family_tree_myPerson';

function loadMyPerson(){
  try{let v=localStorage.getItem(MY_KEY);if(v)myPersonId=parseInt(v);}catch(e){}
}
function saveMyPerson(){
  try{if(myPersonId)localStorage.setItem(MY_KEY,myPersonId);else localStorage.removeItem(MY_KEY);}catch(e){}
}

function openMyPersonPicker(){
  let opts=people.map(p=>{
    let par=getParent(p);
    let sub=par?`الأب: ${par.name}`:'';
    return `<div class="kin-result-item${myPersonId===p.id?' selected':''}" data-pid="${p.id}" onclick="setMyPerson(${p.id})" style="${myPersonId===p.id?'background:var(--color-background-secondary)':''}">
      <div style="display:flex;align-items:center;gap:6px">
        <div class="gender-dot ${p.gender==='male'?'male-dot':'female-dot'}" style="width:8px;height:8px;border-radius:50%;flex-shrink:0"></div>
        <span style="font-weight:500;flex:1">${p.name}${myPersonId===p.id?' <span class="my-marker">أنا</span>':''}</span>
      </div>
      ${sub?`<div style="font-size:11px;color:var(--text2);padding-right:14px">${sub}</div>`:''}
    </div>`;
  }).join('');
  let modal=`<div class="modal-overlay" onclick="if(event.target===this)closeModal()">
  <div class="modal" style="max-width:380px">
    <h3>أنا في الشجرة</h3>
    <p style="font-size:12px;color:var(--text2);margin-bottom:10px">اختر اسمك لعرض صلة قرابتك مع كل شخص في الشجرة</p>
    <div style="position:relative;margin-bottom:8px">
      <input type="text" id="mySearchInput" placeholder="ابحث بالاسم..." oninput="filterMyPicker(this.value)" style="width:100%;padding:8px 34px 8px 12px;border:1px solid var(--card-border);border-radius:8px;background:var(--card-bg);color:var(--text);font-size:13px">
      <button id="myPersonVoice" class="field-mic-btn" title="بحث صوتي" onclick="startFieldVoice('mySearchInput',v=>{filterMyPicker(v)},'myPersonVoice')">🎤</button>
    </div>
    <div id="myPickerList" style="max-height:280px;overflow-y:auto;border:1px solid var(--card-border);border-radius:8px">${opts}</div>
    ${myPersonId?`<div style="margin-top:10px;text-align:center"><button class="btn" onclick="setMyPerson(null)" style="color:#ef4444">✕ إلغاء تحديد الاسم</button></div>`:''}
    <div class="modal-footer"><button class="btn" onclick="closeModal()">إغلاق</button></div>
  </div></div>`;
  document.getElementById('modalContainer').innerHTML=modal;
  _androidBackGuardModalOpen();
}

function filterMyPicker(q){
  q=normalizeAr(q||'');
  document.querySelectorAll('#myPickerList .kin-result-item').forEach(el=>{
    let id=parseInt(el.dataset.pid||0);
    let p=getPerson(id);
    el.style.display=(p&&matchesFullName(p,q))?'':'none';
  });
}

function setMyPerson(id){
  myPersonId=id?parseInt(id):null;
  saveMyPerson();
  closeModal();
  updateMyPersonBtn();
  renderAll();
}

function updateMyPersonBtn(){
  let btn=document.getElementById('myPersonBtn');
  if(!btn)return;
  let p=myPersonId?getPerson(myPersonId):null;
  if(p){
    btn.innerHTML=`👤 ${p.name}`;
    btn.style.background='#7c3aed';btn.style.color='#fff';btn.style.borderColor='#7c3aed';
  } else {
    btn.innerHTML='👤 أنا في الشجرة';
    btn.style.background='';btn.style.color='';btn.style.borderColor='';
  }
}

// Compute kinship label between myPerson and target
function getMyKinship(targetId){
  if(!myPersonId||myPersonId===targetId)return null;
  if(_myKinCache.has(targetId))return _myKinCache.get(targetId);
  let blood=computeBloodKinship(myPersonId,targetId);
  let marriage=computeMarriageKinship(myPersonId,targetId);
  let result=null;
  if(blood||marriage){
    let label=blood?blood.label:marriage.label;
    let lca=blood?blood.lca:{id:null,d1:0,d2:0,total:0};
    let path1=blood?blood.path1:[];
    let path2=blood?blood.path2:[];
    let otherLCAs=blood?blood.otherLCAs:[];
    result={label,lca,path1,path2,otherLCAs,blood,marriage,targetId};
  }
  _myKinCache.set(targetId,result);
  return result;
}

// Badge color class based on distance
function kinBadgeClass(kin){
  if(!kin)return '';
  if(kin.marriage&&!kin.blood)return 'close'; // مصاهرة بدون دم
  if(!kin.lca||!kin.lca.id)return '';
  if(kin.lca.d1===0||kin.lca.d2===0)return 'direct'; // parent/child
  if(kin.lca.total<=2)return 'direct'; // sibling
  if(kin.lca.total<=4)return 'close';  // uncle/cousin
  return '';
}

// Mini-tree HTML for detail view
function buildMyKinMiniTree(kin){
  if(!kin)return '';
  function nodeHtml(id,cls,label){
    let p=getPerson(id);let name=p?(p.name.length>14?p.name.slice(0,13)+'…':p.name):label;
    return `<span class="kmt-node ${cls}">${name}</span>`;
  }
  function arrow(via){return `<span class="kmt-arrow" title="${via==='mother'?'عبر الأم':'عبر الأب'}">${via==='mother'?'←♀':'←♂'}</span>`;}
  let html='<div class="kin-mini-tree">';
  // ── قسم القرابة الدموية ──
  if(kin.blood&&kin.path1&&kin.path1.length){
    let leftPath=nodeHtml(myPersonId,'me','أنا');
    kin.path1.slice(1).forEach(s=>{leftPath+=arrow(s.via)+nodeHtml(s.id,'anc','');});
    let them2=kin.path2&&kin.path2[0]?getPerson(kin.path2[0].id):null;
    let rightPath=nodeHtml(them2?them2.id:0,'them',them2?them2.name:'؟');
    kin.path2.slice(1).forEach(s=>{rightPath+=arrow(s.via)+nodeHtml(s.id,'anc','');});
    html+=`<div class="kmt-title">🔗 صلة القرابة بي — <strong style="color:var(--text)">${kin.blood.label} <span style="font-size:10px;color:#1d4ed8;background:#dbeafe;border-radius:4px;padding:0 4px">نسب</span></strong></div>
    <div class="kmt-path">${leftPath}</div>
    <div class="kmt-path">${rightPath}</div>
    ${kin.otherLCAs&&kin.otherLCAs.length?`<div style="font-size:11px;color:var(--text2);margin-top:6px">جد مشترك أبعد: ${kin.otherLCAs.map(x=>{let pp=getPerson(x.id);return pp?pp.name+'('+x.total+' جيل)':'';}).join('، ')}</div>`:''}`;
  } else if(!kin.blood&&!kin.marriage){
    // fallback legacy (بدون .blood/.marriage)
    let them2=kin.path2&&kin.path2[0]?getPerson(kin.path2[0].id):null;
    let leftPath=nodeHtml(myPersonId,'me','أنا');
    (kin.path1||[]).slice(1).forEach(s=>{leftPath+=arrow(s.via)+nodeHtml(s.id,'anc','');});
    let rightPath=nodeHtml(them2?them2.id:0,'them',them2?them2.name:'؟');
    (kin.path2||[]).slice(1).forEach(s=>{rightPath+=arrow(s.via)+nodeHtml(s.id,'anc','');});
    html+=`<div class="kmt-title">🔗 صلة القرابة بي — <strong style="color:var(--text)">${kin.label}</strong></div>
    <div class="kmt-path">${leftPath}</div><div class="kmt-path">${rightPath}</div>`;
  }
  // ── قسم قرابة المصاهرة ──
  if(kin.marriage){
    let spPerson=getPerson(kin.marriage.spouseOfId);
    // الشخص المستهدف: استخدم targetId المخزّن في kin أولاً، وإلا path2
    let targetPerson=(kin.targetId?getPerson(kin.targetId):null)||(kin.path2&&kin.path2[0]?getPerson(kin.path2[0].id):null);
    let divider=kin.blood?'<div style="border-top:1px dashed var(--card-border);margin:8px 0"></div>':'';
    html+=`${divider}<div class="kmt-title" style="color:#5b21b6">💍 ${kin.marriage.label} <span style="font-size:10px;background:#ede9fe;border:1px solid #c4b5fd;border-radius:4px;padding:0 4px">مصاهرة</span></div>
    <div class="kmt-path" style="font-size:11px">
      <span class="kmt-node me">أنا</span>
      <span class="kmt-arrow">←</span>
      <span class="kmt-node anc">${spPerson?spPerson.name:'؟'}</span>
      <span style="font-size:10px;color:#7c3aed;margin:0 2px">${kin.marriage.spouseOfBloodLabel}</span>
      <span class="kmt-arrow">←💍</span>
      <span class="kmt-node them">${targetPerson?targetPerson.name:'؟'}</span>
    </div>`;
  }
  html+='</div>';
  return html;
}

// ── Reorder Children ──
let reorderParentId=null;
let reorderList=[];
let dragSrcIdx=null;

function openReorderModal(parentId){
  reorderParentId=parentId;
  let parent=getPerson(parentId);
  reorderList=getChildren(parentId).map((c,i)=>({id:c.id,name:c.name,familyName:c.familyName||'',gender:c.gender,deceased:c.deceased,sortOrder:c.sortOrder!=null?c.sortOrder:i}));
  // Normalize order
  reorderList.forEach((c,i)=>c.sortOrder=i);
  renderReorderModal(parent);
}

function renderReorderModal(parent){
  let pName=parent?parent.name:'';
  let rows=reorderList.map((ch,i)=>{
    let gDot=`<div class="gender-dot ${ch.gender==='male'?'male-dot':'female-dot'}" style="width:8px;height:8px;border-radius:50%;flex-shrink:0"></div>`;
    let decIcon=ch.deceased?`<span style="display:inline-flex">${crescent('#2e7d32')}</span>`:'';
    let sub=ch.familyName?`<span class="reorder-sub"> (${ch.familyName})</span>`:'';
    return `
    <div class="insert-zone" id="iz-${i}">
      <hr><button class="insert-btn" onclick="insertChildAt(${i})">+ إدراج ابن هنا</button><hr>
    </div>
    <div class="reorder-item" id="ri-${i}" draggable="true"
      ondragstart="dragStart(${i})" ondragover="dragOver(event,${i})" ondrop="dropOn(${i})" ondragleave="dragLeave(${i})" ondragend="dragEnd()">
      <span class="reorder-handle">⠿</span>
      ${gDot}
      <div style="flex:1;min-width:0"><span class="reorder-name">${ch.name}</span>${sub}${decIcon}</div>
      <div class="reorder-arrows">
        <button onclick="moveChild(${i},-1)" ${i===0?'disabled':''}>▲</button>
        <button onclick="moveChild(${i},+1)" ${i===reorderList.length-1?'disabled':''}>▼</button>
      </div>
    </div>`;
  }).join('');
  // Last insert zone
  rows+=`<div class="insert-zone" id="iz-${reorderList.length}">
    <hr><button class="insert-btn" onclick="insertChildAt(${reorderList.length})">+ إدراج ابن في النهاية</button><hr>
  </div>`;

  let modal=`<div class="modal-overlay" onclick="if(event.target===this)closeModal()">
  <div class="modal" style="max-width:460px;">
    <h3 style="margin-bottom:4px;">ترتيب أبناء: ${pName}</h3>
    <p style="font-size:12px;color:var(--text2);margin-bottom:12px;">اسحب ↕ أو استخدم أسهم ▲▼ لإعادة الترتيب. اضغط "+ إدراج" لإضافة ابن في مكان محدد.</p>
    <div id="reorderList">${rows}</div>
    <div class="modal-footer">
      <button class="btn" onclick="closeModal()">إلغاء</button>
      <button class="btn primary" onclick="saveReorder()">✓ حفظ الترتيب</button>
    </div>
  </div></div>`;
  document.getElementById('modalContainer').innerHTML=modal;
  _androidBackGuardModalOpen();
}

function moveChild(idx,dir){
  let newIdx=idx+dir;
  if(newIdx<0||newIdx>=reorderList.length)return;
  [reorderList[idx],reorderList[newIdx]]=[reorderList[newIdx],reorderList[idx]];
  reorderList.forEach((c,i)=>c.sortOrder=i);
  let parent=getPerson(reorderParentId);
  renderReorderModal(parent);
}

function dragStart(idx){dragSrcIdx=idx;setTimeout(()=>{let el=document.getElementById('ri-'+idx);if(el)el.classList.add('dragging');},0);}
function dragOver(e,idx){e.preventDefault();let el=document.getElementById('ri-'+idx);if(el&&dragSrcIdx!==idx)el.classList.add('drag-over');}
function dragLeave(idx){let el=document.getElementById('ri-'+idx);if(el)el.classList.remove('drag-over');}
function dragEnd(){document.querySelectorAll('.reorder-item').forEach(el=>el.classList.remove('dragging','drag-over'));dragSrcIdx=null;}
function dropOn(idx){
  if(dragSrcIdx===null||dragSrcIdx===idx)return;
  let item=reorderList.splice(dragSrcIdx,1)[0];
  let newIdx=dragSrcIdx<idx?idx-1:idx;
  reorderList.splice(newIdx+1,0,item);
  reorderList.forEach((c,i)=>c.sortOrder=i);
  dragSrcIdx=null;
  let parent=getPerson(reorderParentId);
  renderReorderModal(parent);
}

function insertChildAt(pos){
  closeModal();
  currentAddParentId=reorderParentId;
  let par=getPerson(reorderParentId);
  window._editGender=par?par.gender:'male';
  window._inheritedFamilyName=par?(par.childrenFamilyName||par.familyName||''):'';
  window._insertAtPos=pos;
  showEditModal(null,reorderParentId);
}

function saveReorder(){
  reorderList.forEach((ch,i)=>{let p=getPerson(ch.id);if(p)p.sortOrder=i;});
  saveData();renderAll();closeModal();
}
function syncChildFamilyName(val){
  window._inheritedFamilyName=val;
  editingChildren.forEach((ch)=>{if(!ch.isExisting)ch.familyName=val;});
  renderChildRows();
}

function applyFamilyNameToBranch(rootId){
  let fn=document.getElementById('f_familyName');
  let val=fn?fn.value.trim():'';
  if(!val){alert('أدخل اللقب أولاً في الحقل');return;}
  if(!confirm(`تطبيق اللقب "${val}" على جميع أبناء وأحفاد هذا الشخص؟`))return;
  let count=0;
  function applyDown(id){
    getChildren(id).forEach(ch=>{ch.familyName=val;count++;applyDown(ch.id);});
  }
  applyDown(rootId);
  saveData();
  alert(`✔ تم تطبيق اللقب "${val}" على ${count} شخص`);
}

function renderGuide(){
  const sections=[
    {id:'s1',icon:'➕',title:'إضافة الأفراد وتعديلهم',html:`
<p><strong>إضافة جذر (جد كبير):</strong> اضغط "+ إضافة فرد" في الشريط العلوي.</p>
<p><strong>إضافة ابن/ابنة:</strong> اضغط زر <code>+</code> بجانب اسم الوالد — يُملأ حقل الوالد واللقب تلقائياً.</p>
<p><strong>إدراج ابن في مكان محدد:</strong> اضغط <code>⇅</code> لفتح نافذة الترتيب، تظهر أزرار "+ إدراج هنا" بين كل ابن وآخر.</p>
<p><strong>إضافة عدة أبناء دفعة واحدة:</strong> في نافذة التعديل، قسم "الأبناء"، اضغط "+ إضافة" مرات متعددة قبل الحفظ.</p>
<p><strong>الترتيب:</strong> اضغط <code>⇅</code> — سحب أو أسهم ▲▼ لإعادة الترتيب.</p>`},

    {id:'s11',icon:'🏠',title:'الزوج من خارج العائلة',html:`
<p><strong>المبدأ:</strong> كل زوج/ة يُحفظ كشخص حقيقي، لكن "الخارجي" لا يظهر في الشجرة الرئيسية. يمكن فتح شجرة عائلته بضغطة واحدة.</p>
<h4 style="margin:10px 0 5px;font-size:13px">خطوات إضافة زوج خارجي لبنت:</h4>
<ol style="padding-right:18px;margin:0 0 10px;line-height:2">
  <li>افتح تعديل ✏ البنت ← قسم <strong>"الأزواج / الزوجات"</strong></li>
  <li>اضغط <strong>+ إضافة زوج/ة</strong> وأدخل بياناته</li>
  <li>تأكد أن ☑ <strong>"من خارج العائلة"</strong> مفعّل</li>
  <li>احفظ — يظهر اسم الزوج في الشجرة كزر 🌳 بنفسجي</li>
</ol>
<h4 style="margin:10px 0 5px;font-size:13px">إضافة أبناء هذا الزوج:</h4>
<ol style="padding-right:18px;margin:0 0 10px;line-height:2">
  <li>افتح شجرة الزوج بالضغط على 🌳 بجانب اسمه</li>
  <li>اضغط <code>+</code> بجانب اسمه لإضافة ابن</li>
  <li>في حقل <strong>"الأم"</strong> ستجد البنت معبّأة تلقائياً — تأكد منها</li>
</ol>
<p><strong>التنقل (Context Switching):</strong> شريط أرجواني يوضح العائلة الحالية + مسار Breadcrumb + زر ◀ رجوع.</p>`},

    {id:'s2',icon:'🏷️',title:'اللقب / اسم العائلة',html:`
<p><strong>وراثة تلقائية:</strong> عند إضافة ابن، يُملأ اللقب من الوالد — يمكن تعديله.</p>
<p><strong>تطبيق على فرع كامل:</strong> اكتب اللقب ثم اضغط <strong>"تطبيق على الفرع ↓"</strong> ليُطبَّق على جميع الأبناء والأحفاد دفعةً واحدة.</p>`},

    {id:'s3',icon:'👩‍👧',title:'أبناء البنت المتزوجة',html:`
<p>أبناء البنت ينتمون لعائلة الأب — يُضافون في شجرته وليس تحتها مباشرةً.</p>
<ol style="padding-right:18px;margin:6px 0;line-height:2">
  <li>افتح تعديل ✏ البنت ← اضغط <strong>"🌳 انتقل لشجرة [اسم الزوج]"</strong></li>
  <li>في شجرة الزوج اضغط <code>+</code> لإضافة ابن</li>
  <li>في حقل <strong>"الأم"</strong> اختر اسم البنت — يُعبَّأ تلقائياً إن وُجدت زوجة واحدة</li>
</ol>
<p>في بيانات البنت ستجد قسم <strong>"أبناء من [اسم الزوج]"</strong> يعرض جميع أبنائها مع زر انتقال لشجرة أبيهم.</p>`},

    {id:'s4',icon:'👩‍👩‍👦',title:'حقل الوالد والأم',html:`
<p>كلاهما قابل للبحث: اضغط الحقل ← تظهر جميع الأشخاص ← اكتب للبحث ← اضغط للاختيار.</p>
<p><strong>الأم:</strong> يدعم "ربط بشخص في الشجرة" (يُفعّل كاشف القرابة عبر الأم) أو "نص حر" لأم غير مسجّلة.</p>`},

    {id:'s5',icon:'🔗',title:'كاشف القرابة',html:`
<p><strong>الاستخدام:</strong> تبويب "كاشف القرابة" ← اختر شخصَين ← اضغط 🔍 اكتشف القرابة.</p>
<p><strong>من بيانات الشخص:</strong> اضغط على شريط <strong>🔗 صلة القرابة بي</strong> (يظهر إذا حددت "أنا في الشجرة") لتفتح نافذة كاشف القرابة الكاملة مباشرةً، مع زر <strong>"↩ رجوع للبيانات"</strong>.</p>
<p><strong>شرط عمل الخال/الخالة:</strong> يجب تسجيل الأم كشخص في الشجرة وربطها بحقل "الأم من الشجرة".</p>`},

    {id:'s6',icon:'👤',title:'أنا في الشجرة',html:`
<p>اضغط 👤 في الشريط وحدد اسمك. تظهر بادجة ملونة بجانب كل اسم:</p>
<ul style="padding-right:18px;margin:4px 0;line-height:2">
  <li>🟢 <strong>أخضر</strong> = قريب مباشر (أب، ابن، أخ)</li>
  <li>🔵 <strong>أزرق</strong> = قريب قريب (عم، ابن عم)</li>
  <li>🟡 <strong>أصفر</strong> = قريب بعيد</li>
</ul>
<p>اضغط على شريط <strong>🔗 صلة القرابة بي</strong> في بيانات أي شخص لعرض الشجرة الكاملة بينك وبينه.</p>`},

    {id:'s7',icon:'💾',title:'الحفظ والنسخ الاحتياطي',html:`
<p><strong>تلقائي محلياً:</strong> كل تغيير يُحفظ في المتصفح فوراً (إشعار ✔).</p>
<p><strong>💾 حفظ نسخة:</strong> يُنشئ ملف HTML يحتوي كل البيانات — افتحه في أي جهاز مباشرةً. يُضمَّن فيه إعدادات السحابة إن كانت مُفعَّلة.</p>
<p><strong>📤 تصدير JSON:</strong> نسخة احتياطية خفيفة — خياران: بدون صور (موصى به) أو مع الصور.</p>
<p><strong>📥 استيراد:</strong> يقبل HTML و JSON — خياران: استبدال كامل أو دمج آمن.</p>`},

    {id:'s_cloud',icon:'☁️',title:'الحفظ السحابي والمزامنة بين الأجهزة',html:`
<p><strong>الإعداد (مرة واحدة فقط):</strong> اضغط ⚙️ في القائمة ← أدخل مفتاح AES-256 وتوكن GitHub ← احفظ.</p>
<h4 style="margin:10px 0 5px;font-size:13px">المزامنة اليدوية:</h4>
<ul style="padding-right:18px;margin:4px 0;line-height:2">
  <li><strong>☁️ مزامنة:</strong> يرفع بيانات الشجرة + الصور الجديدة فقط إلى السحابة</li>
  <li><strong>⬇️ استعادة:</strong> يُنزّل من السحابة ويدمج مع البيانات المحلية</li>
</ul>
<h4 style="margin:10px 0 5px;font-size:13px">المزامنة بين جهازين:</h4>
<ol style="padding-right:18px;margin:0 0 10px;line-height:2">
  <li>على الجهاز الأول: اضغط <strong>☁️ مزامنة</strong> بعد كل تعديل</li>
  <li>على الجهاز الثاني: اضغط <strong>⬇️ استعادة</strong> للحصول على آخر نسخة</li>
  <li>لنقل الإعدادات للجهاز الثاني: اضغط <strong>💾 حفظ نسخة</strong> على الجهاز الأول — الملف يحتوي الإعدادات مُضمَّنة</li>
</ol>
<h4 style="margin:10px 0 5px;font-size:13px">رفع الصور (delta):</h4>
<p>عند الضغط على ☁️ مزامنة يُرفع فقط الصور <strong>الجديدة أو المعدَّلة</strong> — الصور القديمة لا تُرفع مجدداً. عند الاستعادة تُضاف الصور غير الموجودة محلياً تلقائياً.</p>`},

    {id:'s_family',icon:'📤',title:'نسخة العائلة (للمشاركة)',html:`
<p>اضغط <strong>📤 نسخة للعائلة</strong> لإنشاء نسخة آمنة للمشاركة — لا تحتوي إعدادات السحابة السرية.</p>
<p><strong>كل نسخة لها معرّف جهاز فريد</strong> — كل فرد يرفع تعديلاته في ملف مستقل داخل الـ Gist.</p>
<p><strong>للاطلاع على تحديثات العائلة:</strong> اضغط <strong>📡 تحديثات العائلة</strong> لعرض آخر ما رفعه كل فرد — مع خيار دمج فردي أو دمج الكل.</p>
<p><strong>نقل التحديثات بدون سحابة:</strong> 📤 تصدير JSON ← أرسله يدوياً ← 📥 استيراد + دمج.</p>`},

    {id:'s8',icon:'🔍',title:'البحث',html:`
<p>يبحث في: الاسم، الأب، الجد، الأم، اللقب، الزوج/ة. النتائج مرتّبة بالدقة.</p>
<p><strong>بحث مركّب:</strong> اكتب أكثر من كلمة — مثال: "أحمد سارة" يجد أحمد الذي أمه أو زوجته سارة.</p>
<p><strong>الانتقال:</strong> اضغط على اسم في نتائج البحث للانتقال إليه في الشجرة مباشرةً مع تمييزه بالأصفر.</p>
<p><strong>Esc:</strong> يُغلق نتائج البحث ويُبقي الشجرة مفتوحة عند آخر شخص انتقلت إليه — يعمل من أي مكان في الصفحة.</p>`},

    {id:'s9',icon:'📋',title:'بيانات الشخص',html:`
<p>اضغط على أي اسم في الشجرة أو قائمة الأفراد لعرض بطاقته.</p>
<ul style="padding-right:18px;margin:6px 0;line-height:2">
  <li><strong>الزوجة / الزوج:</strong> يظهر "الزوجة" للذكر و"الزوج" للأنثى. عند تعدد الزوجات: الزوجة الأولى، الثانية... وكذلك للزوج</li>
  <li><strong>🔗 عرض في الشجرة:</strong> يظهر بجانب الزوج/ة إذا كان من داخل العائلة — يُغلق النافذة وينتقل مباشرةً</li>
  <li><strong>🌳 فتح شجرته/ا:</strong> يظهر للزوج/ة الخارجي الذي لديه عائلة مسجّلة</li>
  <li><strong>🔗 صلة القرابة بي:</strong> يظهر إذا حددت "أنا في الشجرة" — اضغط لعرض شجرة القرابة الكاملة</li>
</ul>
<p>زر <strong>🌳 عرض في الشجرة</strong> في أسفل النافذة ينتقل لموقع الشخص مع تمييزه.</p>`},

    {id:'s10',icon:'📸',title:'الصور',html:`
<p>في نموذج التعديل: 📷 لرفع صورة، اضغط عليها لعرضها كاملة، 🗑 لحذفها. الصور تُضغط تلقائياً إلى 400px.</p>
<p>عند الضغط على اسم متوفى تظهر بطاقة الفاتحة 3 ثوانٍ.</p>`},
  ];

  let html=`<div style="max-width:700px;margin:0 auto;padding:4px">`;
  // أقسام السحابة تظهر فقط في نسخة المالك
  let visibleSections=IS_FAMILY_COPY?sections.filter(s=>s.id!=='s_cloud'&&s.id!=='s_family'):sections;
  visibleSections.forEach(s=>{
    html+=`<details style="margin-bottom:6px;border:1px solid var(--card-border);border-radius:8px;overflow:hidden" id="${s.id}">
      <summary style="padding:10px 14px;cursor:pointer;font-size:13px;font-weight:500;color:var(--text);display:flex;align-items:center;gap:8px;background:var(--card-bg)">
        <span>${s.icon}</span>${s.title}<span style="margin-right:auto;font-size:11px;color:var(--text2)">▼</span>
      </summary>
      <div style="padding:10px 14px;font-size:13px;color:var(--text);line-height:1.8;border-top:1px solid var(--card-border);background:var(--color-background-secondary,#f9fafb)">${s.html}</div>
    </details>`;
  });
  html+=`</div>`;
  document.getElementById('guidePanel').innerHTML=html;
  let first=document.getElementById('s1');
  if(first)first.open=true;
}


