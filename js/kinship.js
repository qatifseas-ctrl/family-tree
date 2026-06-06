// ══════════════════════════════════════════════════════════
//  التحقق من الزواج المباشر بين شخصين
// ══════════════════════════════════════════════════════════
function isDirectSpouse(id1, id2){
  let p1=getPerson(id1), p2=getPerson(id2);
  if(!p1||!p2) return false;
  // التحقق من اتجاه p1 → p2
  if(p1.spouses && p1.spouses.some(s=>
    (s.personId && s.personId===id2) ||
    (s.relativeId && s.relativeId===id2)
  )) return true;
  // التحقق من الاتجاه العكسي p2 → p1
  if(p2.spouses && p2.spouses.some(s=>
    (s.personId && s.personId===id1) ||
    (s.relativeId && s.relativeId===id1)
  )) return true;
  return false;
}

// الحصول على بيانات الزواج المباشر (للتحقق من الطلاق وغيره)
function getDirectSpouseEntry(fromId, toId){
  let from=getPerson(fromId);
  if(!from||!from.spouses) return null;
  return from.spouses.find(s=>
    (s.personId && s.personId===toId) ||
    (s.relativeId && s.relativeId===toId)
  ) || null;
}

// بناء شجرة مرئية لعلاقة الزواج المباشر
function buildDirectSpouseTree(p1, p2){
  let icon1=p1.gender==='female'?'👩':'👨';
  let icon2=p2.gender==='female'?'👩':'👨';
  // التحقق من الطلاق
  let entry=getDirectSpouseEntry(p1.id,p2.id)||getDirectSpouseEntry(p2.id,p1.id);
  let isDivorced=entry&&entry.divorced;
  let ringLine=isDivorced
    ? `<div style="display:flex;align-items:center;gap:6px;padding:8px 16px;border:2px dashed #f97316;border-radius:10px;background:#fff7ed;font-size:13px;font-weight:600;color:#c2410c">💔 طُلِّقا</div>`
    : `<div style="display:flex;align-items:center;gap:6px;padding:8px 16px;border:2px solid #7c3aed;border-radius:10px;background:linear-gradient(135deg,#faf5ff,#ede9fe);font-size:13px;font-weight:600;color:#5b21b6">💍 متزوجان</div>`;
  let name1=p1.name.length>16?p1.name.slice(0,15)+'…':p1.name;
  let name2=p2.name.length>16?p2.name.slice(0,15)+'…':p2.name;
  return `<div style="display:flex;flex-direction:column;align-items:center;gap:8px;padding:12px 0">
    <div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap;justify-content:center">
      <div style="display:flex;flex-direction:column;align-items:center;gap:4px;padding:10px 16px;border:2px solid ${p1.gender==='female'?'#ec4899':'#3b82f6'};border-radius:10px;background:var(--card-bg);min-width:90px;text-align:center">
        <span style="font-size:22px">${icon1}</span>
        <span style="font-size:13px;font-weight:600;color:var(--text)">${name1}</span>
      </div>
      <div style="display:flex;flex-direction:column;align-items:center;gap:4px">${ringLine}</div>
      <div style="display:flex;flex-direction:column;align-items:center;gap:4px;padding:10px 16px;border:2px solid ${p2.gender==='female'?'#ec4899':'#3b82f6'};border-radius:10px;background:var(--card-bg);min-width:90px;text-align:center">
        <span style="font-size:22px">${icon2}</span>
        <span style="font-size:13px;font-weight:600;color:var(--text)">${name2}</span>
      </div>
    </div>
  </div>`;
}

function computeBloodKinship(id1,id2){
  if(!id1||!id2||id1===id2)return null;
  let map1=getAncestorsMap(id1),map2=getAncestorsMap(id2);
  let common=[];
  map1.forEach((v1,aid)=>{if(map2.has(aid)){let v2=map2.get(aid);common.push({id:aid,d1:v1.dist,d2:v2.dist,total:v1.dist+v2.dist});}});
  if(!common.length)return null;
  common.sort((a,b)=>a.total-b.total||(a.d1-b.d1));
  let seen=new Set();common=common.filter(x=>{if(seen.has(x.id))return false;seen.add(x.id);return true;});
  let lca=common[0];
  let p1=getPerson(id1),p2=getPerson(id2);if(!p1||!p2)return null;
  let path1=getPathUp(id1,lca.id)||[],path2=getPathUp(id2,lca.id)||[];
  let label=describeKinshipFromPaths(path1,path2,p1,p2);
  return {label,lca,path1,path2,otherLCAs:common.slice(1,4)};
}

// حساب قرابة المصاهرة: هل targetId زوج/زوجة أحد أقارب fromId بالدم؟
// يُعيد {label, spouseOfId, spouseOfBloodLabel, bloodKin} أو null
function computeMarriageKinship(fromId,targetId){
  let target=getPerson(targetId);if(!target)return null;
  let spouseWord=target.gender==='female'?'زوجة':'زوج';

  // ── الاتجاه الأول: target هو/هي زوج/ة أحد أقارب fromId ──
  // نتحقق ثنائياً: هل candidate ↔ target متزوجان (في أي اتجاه من البيانات)
  for(let candidate of people){
    if(candidate.id===fromId||candidate.id===targetId)continue;
    if(!isDirectSpouse(candidate.id,targetId))continue;
    let bk=computeBloodKinship(fromId,candidate.id);
    if(!bk)continue;
    return {label:`${spouseWord} ${bk.label}`,spouseOfId:candidate.id,spouseOfBloodLabel:bk.label,bloodKin:bk};
  }
  // ── الاتجاه الثاني: target هو/هي قريب أحد أزواج fromId ──
  // (أب الزوجة، أخو الزوج، خال الزوجة...)
  let fromPerson=getPerson(fromId);if(!fromPerson)return null;
  // جمع كل الأزواج المرتبطين بـ fromId
  let linkedSpouseIds=new Set();
  // أزواج من بيانات fromId
  if(fromPerson.spouses)fromPerson.spouses.forEach(s=>{
    if(s.personId)linkedSpouseIds.add(s.personId);
    if(s.relativeId)linkedSpouseIds.add(s.relativeId);
  });
  // أزواج يشيرون لـ fromId عبر personId
  people.forEach(p=>{
    if(p.spouses)p.spouses.forEach(s=>{
      if((s.personId===fromId||s.relativeId===fromId)&&p.id!==fromId)linkedSpouseIds.add(p.id);
    });
  });
  for(let spId of linkedSpouseIds){
    if(spId===targetId)continue;
    let sp=getPerson(spId);if(!sp)continue;
    let bk=computeBloodKinship(spId,targetId);
    if(!bk)continue;
    let spLabel=sp.gender==='female'?'الزوجة':'الزوج';
    return {
      label:`${target.gender==='male'?'قريب':'قريبة'} ${spLabel} (${bk.label} ${spLabel})`,
      spouseOfId:spId,spouseOfBloodLabel:bk.label,bloodKin:bk
    };
  }
  return null;
}

// شجرة مرئية لعلاقة المصاهرة (تُبنى على شجرة الدم مع إضافة رابط الزواج)
function buildMarriageKinTree(p1,p2,mr){
  let spousePerson=getPerson(mr.spouseOfId);if(!spousePerson)return '';
  let bk=mr.bloodKin;
  // شجرة الدم بين p1 وزوج/زوجة p2 (أي spousePerson)
  let bloodTreeHtml=buildKinTree(bk.path1,bk.path2,bk.lca.id,p1,spousePerson);
  let spouseWord=p2.gender==='female'?'زوجة':'زوج';
  let p2Name=p2.name.length>16?p2.name.slice(0,15)+'…':p2.name;
  return bloodTreeHtml+`
    <div style="display:flex;flex-direction:column;align-items:center;margin-top:6px">
      <div style="font-size:18px;color:#7c3aed">↓</div>
      <div style="display:flex;align-items:center;gap:6px;padding:7px 14px;border:2px solid #7c3aed;border-radius:10px;background:linear-gradient(135deg,#faf5ff,#ede9fe);font-size:13px;font-weight:600;color:#5b21b6">
        <span>💍</span>
        <span>${p2Name}</span>
        <span style="font-size:10px;font-weight:400;color:#7c3aed;background:#fff;border:1px solid #c4b5fd;border-radius:4px;padding:1px 6px">${spouseWord} عن طريق المصاهرة</span>
      </div>
    </div>`;
}

function discoverKin(){
  let p1=kinPerson1,p2=kinPerson2;
  let area=document.getElementById('kinResultArea');
  if(!p1||!p2){area.innerHTML='<div class="kin-no-rel">يرجى اختيار شخصين أولاً</div>';return;}
  if(p1.id===p2.id){area.innerHTML='<div class="kin-no-rel">اخترت نفس الشخص!</div>';return;}

  // ── 0. علاقة الزواج المباشر (زوج ↔ زوجة) ──
  let directSpouse=isDirectSpouse(p1.id,p2.id);
  let spouseLabel='';
  if(directSpouse){
    let entry=getDirectSpouseEntry(p1.id,p2.id)||getDirectSpouseEntry(p2.id,p1.id);
    let isDivorced=entry&&entry.divorced;
    if(isDivorced){
      spouseLabel=p2.gender==='female'?'مطلقته':'مطلقها';
    } else {
      spouseLabel=p2.gender==='female'?'زوجته':'زوجها';
    }
  }

  // ── 1. القرابة الدموية ──
  let blood=computeBloodKinship(p1.id,p2.id);

  // ── 2. قرابة المصاهرة: هل p2 زوج/ة أحد أقارب p1 بالدم؟ ──
  // (لا نحسبها إذا كانا متزوجَين مباشرةً لتجنّب الازدواجية)
  let marriage=directSpouse?null:computeMarriageKinship(p1.id,p2.id);

  if(!directSpouse&&!blood&&!marriage){
    area.innerHTML=`<div class="kin-result-panel"><div class="kin-no-rel">
      <div style="font-size:32px;margin-bottom:8px;">🔎</div>
      <div style="font-weight:500;color:var(--text);margin-bottom:4px;">لا توجد صلة قرابة مسجّلة</div>
      <div>${p1.name} و ${p2.name} لا يرتبطان بسلف مشترك أو رابط زواج مسجّل في الشجرة</div>
      <div style="margin-top:8px;font-size:12px;color:var(--text2);">تلميح: تأكد من تسجيل الأمهات كأشخاص في الشجرة وربط الزوجات عبر حقل "من الشجرة"</div>
    </div></div>`;return;
  }

  // ── بناء عنوان العلاقة ──
  let relLabelHtml='';
  if(directSpouse){
    let entry=getDirectSpouseEntry(p1.id,p2.id)||getDirectSpouseEntry(p2.id,p1.id);
    let isDivorced=entry&&entry.divorced;
    relLabelHtml+=`<div class="kin-rel-label">${spouseLabel}
      <span style="font-size:11px;font-weight:400;color:${isDivorced?'#c2410c':'#5b21b6'};background:${isDivorced?'#fff7ed':'#ede9fe'};border:1px solid ${isDivorced?'#f97316':'#c4b5fd'};border-radius:5px;padding:1px 6px;margin-right:4px">${isDivorced?'💔 طلاق':'💍 زواج مباشر'}</span>
    </div>`;
  }
  if(blood){
    relLabelHtml+=`<div class="kin-rel-label" style="margin-top:${directSpouse?'8px':'0'}">${blood.label} <span style="font-size:11px;font-weight:400;color:#1d4ed8;background:#dbeafe;border:1px solid #93c5fd;border-radius:5px;padding:1px 6px;margin-right:4px">نسب</span></div>`;
  }
  if(marriage){
    relLabelHtml+=`<div class="kin-rel-label" style="margin-top:${(directSpouse||blood)?'8px':'0'}">${marriage.label} <span style="font-size:11px;font-weight:400;color:#5b21b6;background:#ede9fe;border:1px solid #c4b5fd;border-radius:5px;padding:1px 6px;margin-right:4px">مصاهرة</span></div>`;
  }

  // ── بناء الشجرة المرئية ──
  let treeHtml='';
  if(directSpouse){
    treeHtml=buildDirectSpouseTree(p1,p2);
    if(blood){
      // عرض شجرة الدم الكاملة أسفل شجرة الزواج
      let bloodTreeHtml=buildKinTree(blood.path1,blood.path2,blood.lca.id,p1,p2);
      treeHtml+=`<div style="margin-top:14px;border-top:2px dashed #93c5fd;padding-top:12px">
        <div style="text-align:center;font-size:11px;font-weight:600;color:#1d4ed8;margin-bottom:8px;background:#dbeafe;border-radius:6px;padding:4px 10px;display:inline-block">🩸 شجرة القرابة بالدم</div>
        ${bloodTreeHtml}
      </div>`;
    }
  } else if(blood){
    treeHtml=buildKinTree(blood.path1,blood.path2,blood.lca.id,p1,p2);
    if(marriage){
      let spPerson=getPerson(marriage.spouseOfId);
      treeHtml+=`<div style="margin-top:10px;padding:8px 12px;background:linear-gradient(135deg,#faf5ff,#ede9fe);border:1px solid #c4b5fd;border-radius:8px;font-size:12px;color:#5b21b6;text-align:center">
        💍 يرتبط/ترتبط أيضاً بـ ${p1.name} عبر الزواج من <strong>${spPerson?spPerson.name:'؟'}</strong> (${marriage.spouseOfBloodLabel})
      </div>`;
    }
  } else if(marriage){
    treeHtml=buildMarriageKinTree(p1,p2,marriage);
  }

  // ── إحصاءات ──
  let statsHtml='';
  if(directSpouse){
    statsHtml+=`<span class="kin-stat">💍 ${p1.name} و ${p2.name} متزوجان مباشرةً</span>`;
  }
  if(blood){
    let otherLCAs=blood.otherLCAs||[];
    statsHtml+=`
      <span class="kin-stat">⬆ أجيال من ${p1.name}: ${blood.lca.d1}</span>
      <span class="kin-stat">⬆ أجيال من ${p2.name}: ${blood.lca.d2}</span>
      <span class="kin-stat">📏 مجموع الأجيال: ${blood.lca.total}</span>
      ${otherLCAs.length?`<span class="kin-stat">أجداد مشتركون أبعد: ${otherLCAs.map(x=>{let pp=getPerson(x.id);let lbl=pp?getAncestorLabel(x.id):'؟';return lbl+'('+x.total+' جيل)';}).join('، ')}</span>`:''}
    `;
  }
  if(marriage){
    let spPerson=getPerson(marriage.spouseOfId);
    statsHtml+=`<span class="kin-stat">💍 ${p2.name} متزوج/ة من ${spPerson?spPerson.name:'؟'} (${marriage.spouseOfBloodLabel})</span>`;
  }

  let subLine=directSpouse&&!blood
    ? `${p1.name} 💍 ${p2.name}`
    : `${p1.name} ← نقطة الالتقاء → ${p2.name}`;

  area.innerHTML=`<div class="kin-result-panel">
    <div class="kin-result-header">
      ${relLabelHtml}
      <div class="kin-rel-sub">${subLine}</div>
    </div>
    <div class="kin-tree-wrap">${treeHtml}</div>
    ${statsHtml?`<div class="kin-stats">${statsHtml}</div>`:''}
  </div>`;
}
function buildKinTree(path1,path2,lcaId,p1,p2){
  let rev1=[...path1].reverse(); 
  let rev2=[...path2].reverse(); 
  rev1.shift();rev2.shift(); 
  function viaLabel(via){
    if(via==='father')return'<span style="font-size:9px;color:#3b82f6;display:block">▲ أب</span>';
    if(via==='mother')return'<span style="font-size:9px;color:#ec4899;display:block">▲ أم</span>';
    return'';
  }
  function makeBox(entry,cls,genNum){
    let p=getPerson(entry.id);if(!p)return'';
    let f=getParent(p);
    let gf=f?getParent(f):null;
    let mainLabel=p.name.length>16?p.name.slice(0,15)+'…':p.name;
    let subLabel='';
    if(f){subLabel=f.name.length>14?f.name.slice(0,13)+'…':f.name;}
    if(gf){subLabel+=(subLabel?' بن ':'')+( gf.name.length>14?gf.name.slice(0,13)+'…':gf.name);}
    let gIcon=p.deceased?`<span style="display:inline-flex;vertical-align:middle">${crescent('#2e7d32')}</span>`:'';
    return `<div class="kin-person-box ${cls}">
      ${viaLabel(entry.via)}
      <span style="font-weight:500">${mainLabel}${gIcon}</span>
      ${subLabel?`<span class="gen-label">${subLabel}</span>`:''}
      <span class="gen-label">الجيل ${genNum}</span>
    </div>`;
  }
  let lcaPerson=getPerson(lcaId);
  let lcaName=lcaPerson?(lcaPerson.name.length>16?lcaPerson.name.slice(0,15)+'…':lcaPerson.name):'جد/ة مشترك';
  let lcaLineage='';
  if(lcaPerson){let lf=getParent(lcaPerson);let lgf=lf?getParent(lf):null;if(lf)lcaLineage=lf.name;if(lgf)lcaLineage+=' بن '+lgf.name;}
  let lcaDec=lcaPerson&&lcaPerson.deceased?`<span style="display:inline-flex;vertical-align:middle">${crescent('#fbbf24')}</span>`:'';
  let leftBoxes=rev1.map((entry,i)=>{
    let cls=entry.id===p1.id?'highlight-a':'';
    return `<div class="kin-connector-v"></div>${makeBox(entry,cls,i+1)}`;
  }).join('');
  let rightBoxes=rev2.map((entry,i)=>{
    let cls=entry.id===p2.id?'highlight-b':'';
    return `<div class="kin-connector-v"></div>${makeBox(entry,cls,i+1)}`;
  }).join('');
  let hasBranches=rev1.length||rev2.length;
  return `<div class="kin-tree">
    <div class="kin-lca">${lcaName} ${lcaDec}${lcaLineage?`<span style="display:block;font-size:10px;font-weight:400;opacity:.8;margin-top:1px">${lcaLineage}</span>`:''}
    <span class="gen-label" style="display:block;font-size:10px;opacity:.7;margin-top:2px;">الجد/ة المشترك الأقرب</span></div>
    ${hasBranches?`
    <div style="display:flex;gap:0;width:100%;justify-content:center;">
      <div style="width:50%;border-bottom:2px solid #d1d5db;border-right:2px solid #d1d5db;height:18px;border-radius:0 0 8px 0;"></div>
      <div style="width:50%;border-bottom:2px solid #d1d5db;border-left:2px solid #d1d5db;height:18px;border-radius:0 0 0 8px;"></div>
    </div>
    <div class="kin-branches">
      <div class="kin-branch">
        <div class="kin-person-box" style="border-color:#3b82f6;background:#eff6ff;color:#1e40af;font-size:11px;">فرع: ${p1.name.length>12?p1.name.slice(0,11)+'…':p1.name}</div>
        ${leftBoxes}
      </div>
      <div class="kin-branch">
        <div class="kin-person-box" style="border-color:#ec4899;background:#fdf2f8;color:#9d174d;font-size:11px;">فرع: ${p2.name.length>12?p2.name.slice(0,11)+'…':p2.name}</div>
        ${rightBoxes}
      </div>
    </div>`:'<div style="font-size:12px;color:var(--text2);margin-top:8px;">نفس الجيل — لا فارق أجيال</div>'}
    <div style="margin-top:10px;font-size:11px;color:var(--text2);display:flex;gap:12px;justify-content:center;flex-wrap:wrap;">
      <span><span style="color:#3b82f6">▲ أب</span> = انتساب عبر الأب</span>
      <span><span style="color:#ec4899">▲ أم</span> = انتساب عبر الأم</span>
    </div>
  </div>`;
}
function toggleAll(open){
  if(open&&document.body.classList.contains('mobile-mode')){
    // وضع الجوال: افتح الجذور فقط (مستوى واحد)
    let roots=getRoots();
    people.forEach(p=>expanded[p.id]=false);
    roots.forEach(r=>expanded[r.id]=true);
  } else {
    people.forEach(p=>expanded[p.id]=open);
  }
  renderAll();
}

function levenshtein(a,b){
  const matrix = Array.from({length: b.length+1}, (_,i)=>[i]);
  for(let j=0;j<=a.length;j++) matrix[0][j]=j;
  for(let i=1;i<=b.length;i++){
    for(let j=1;j<=a.length;j++){
      if(b.charAt(i-1)==a.charAt(j-1)){
        matrix[i][j]=matrix[i-1][j-1];
      }else{
        matrix[i][j]=Math.min(
          matrix[i-1][j-1]+1,
          matrix[i][j-1]+1,
          matrix[i-1][j]+1
        );
      }
    }
  }
  return matrix[b.length][a.length];
}

function fuzzyMatch(text, query){
  if(!text) return false;
  text = text.toLowerCase();
  query = query.toLowerCase();
  return text.includes(query) || levenshtein(text,query) <= 2;
}

function scorePersonAdvanced(person, query){
  if(!query) return 0;
  let score = 0;

  if(fuzzyMatch(person.name, query)) score += 300;
  if(fuzzyMatch(person.fatherName, query)) score += 50;
  if(fuzzyMatch(person.motherName, query) || fuzzyMatch(person.grandName, query)) score += 25;

  return score;
}

// ── state لاسترجاع الحالة عند مسح البحث ──
let _savedExpanded=null;
let _searchDebounceTimer=null;
let _lastSearchQ='';
let _persistedSearchQ=''; // يُحفظ بعد ESC/X — يملأ حقل البحث عند إعادة فتحه
let _searchActiveId=null;
let _searchCurrentTerm='';

function renderAll(){
  renderStats();
  renderTree();
  // قائمة الأفراد: أعد الرسم فقط إن كانت اللوحة نشطة
  let listPanel=document.getElementById('listPanel');
  if(listPanel&&listPanel.classList.contains('active')) renderList();
  // لوحة البحث: خفيفة دائماً
  _renderSearchPanel();
}

function escapeHtml(str){
  return String(str==null?'':str)
    .replace(/&/g,'&amp;')
    .replace(/</g,'&lt;')
    .replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;')
    .replace(/'/g,'&#39;');
}

function highlightQueryHTML(text,q){
  let safe=escapeHtml(text);
  let term=(q||'').trim();
  if(!term)return safe;
  let words=term.split(/\s+/).filter(Boolean).sort((a,b)=>b.length-a.length);
  if(!words.length)return safe;
  let normSafe=normalizeAr(safe);
  let out=safe;
  let used=0;
  for(let w of words){
    let idx=normSafe.indexOf(normalizeAr(w));
    if(idx>=0){
      // preserve current output for the first good match only
      let before=escapeHtml(text).slice(0,idx);
      let match=escapeHtml(text).slice(idx,idx+w.length);
      let after=escapeHtml(text).slice(idx+w.length);
      out=before+'<span class="search-highlight">'+match+'</span>'+after;
      used++;
      break;
    }
  }
  if(!used){
    // fallback: highlight any exact visible substring without breaking HTML
    for(let w of words){
      let idx=safe.toLowerCase().indexOf(escapeHtml(w).toLowerCase());
      if(idx>=0){
        out=safe.slice(0,idx)+'<span class="search-highlight">'+safe.slice(idx,idx+w.length)+'</span>'+safe.slice(idx+w.length);
        break;
      }
    }
  }
  return out;
}

function focusPersonCard(id){
  setTimeout(()=>{
    let el=document.querySelector(`[data-person-id="${id}"]`);
    if(el){
      el.scrollIntoView({behavior:'smooth',block:'center'});
      let hdr=el.querySelector('.node-header');
      if(hdr){
        hdr.style.transition='background .12s ease, box-shadow .12s ease';
        hdr.style.background='#fef9c3';
        hdr.style.boxShadow='0 0 0 3px rgba(245,158,11,.18)';
        setTimeout(()=>{
          hdr.style.transition='';
          hdr.style.background='';
          hdr.style.boxShadow='';
        },900);
      }
    }
  },360);
}

function _doSearch(){
  let q=(document.getElementById('searchBox').value||'').trim();
  _lastSearchQ=q;
  if(q)_persistedSearchQ=q;
  _searchCurrentTerm=q;
  _srpFocusIdx=-1;
  _saveSearchHistory(q);
  // تحديث زر البحث
  let _slbl=document.getElementById('searchBtnLabel');
  if(_slbl)_slbl.textContent=q||'ابحث عن أي شخص...';
  let _xcb=document.getElementById('searchClearBtnTop');if(_xcb)_xcb.style.display=q?'':'none';

  if(!q){
    document.getElementById('searchResultsPanel').style.display='none';
    closeMobSearchSheet();
    _searchResultIds=[];
    _searchNavIdx=0;
    _searchActiveId=null;
    _savedExpanded=null;
    _hideSearchNavBar();
    renderStats();renderTree(); // لا نُعيد رسم القائمة عند مسح البحث
    return;
  }

  // نتائج مرتّبة حسب الدقة (الأقرب أولاً)
  let results=people
    .filter(p=>matchesFullName(p,q))
    .sort((a,b)=>scoreMatch(b,q)-scoreMatch(a,q));
  _searchResultIds=_sortResultsByTreeOrder(results.map(p=>p.id));

  if(document.body.classList.contains('mobile-mode')){
    // ── الجوال: لوحة تصعد من الأسفل ──
    document.getElementById('searchResultsPanel').style.display='none';
    openMobSearchSheet(results,q);
  } else {
    // ── الديسكتوب: نافذة وسط الشاشة ──
    document.getElementById('searchResultsPanel').style.display='none';
    openMobSearchSheet(results,q);
  }
}

function triggerSearch(){
  clearTimeout(_searchDebounceTimer);
  let btn=document.getElementById('searchClearBtn');
  let val=document.getElementById('searchBox').value;
  if(btn){btn.style.opacity=val?'1':'0';btn.style.pointerEvents=val?'auto':'none';}
  _searchDebounceTimer=setTimeout(_doSearch,280);
}

function clearSearch(preserveScroll){
  let lastId=_searchActiveId;
  document.getElementById('searchBox').value='';
  let btn=document.getElementById('searchClearBtn');
  if(btn){btn.style.opacity='0';btn.style.pointerEvents='none';}
  document.getElementById('searchResultsPanel').style.display='none';
  closeMobSearchSheet();
  _hideSearchNavBar();
  _lastSearchQ='';
  _searchCurrentTerm='';
  try{localStorage.removeItem(SEARCH_HISTORY_KEY);}catch(e){}
  let _clbl=document.getElementById('searchBtnLabel');if(_clbl)_clbl.textContent='ابحث عن أي شخص...';
  let _xcb2=document.getElementById('searchClearBtnTop');if(_xcb2)_xcb2.style.display='none';
  _searchResultIds=[];
  _searchNavIdx=0;
  _searchActiveId=null;
  _savedExpanded=null;

  // ── هل الشخص الأخير ينتمي لشجرة خارجية؟ ──
  // إذا كان كذلك: ابقَ في تلك الشجرة بدلاً من الرجوع للشجرة الرئيسية
  if(lastId){
    let _lp=getPerson(lastId);
    if(_lp){
      let _root=_lp;
      while(_root.parentId&&getPerson(_root.parentId))_root=getPerson(_root.parentId);
      let _mainIds=new Set(getRoots(false).map(r=>r.id));
      if(!_mainIds.has(_root.id)){
        // الشخص ينتمي لشجرة خارجية
        if(!currentFamilyFilter||currentFamilyFilter.rootId!==_root.id){
          // انتقل إلى تلك الشجرة (يضبط currentFamilyFilter ويرسم)
          navigateToSpouseFamily(lastId);
        } else {
          // كنا بالفعل في تلك الشجرة — أعد الرسم فقط
          renderAll();
          focusPersonCard(lastId);
        }
        return;
      }
    }
  }

  renderAll();
  // البقاء عند الشخص الأخير
  if(lastId){
    focusPersonCard(lastId);
  }
}

function _renderSearchPanel(){
  let q=_lastSearchQ;
  let panel=document.getElementById('searchResultsPanel');
  if(!panel)return;
  if(!q){panel.style.display='none';return;}
  // استخدام الاستعلام المجرد من الألقاب للتمييز والبحث
  let strippedQ=stripTitlesFromQuery(q);
  let nq=normalizeAr(strippedQ||q);
  let results=people
    .filter(p=>matchesFullName(p,q))
    .sort((a,b)=>scoreMatch(b,q)-scoreMatch(a,q));
  if(!results.length){panel.style.display='none';return;}
  let MAX=12;
  let shown=results.slice(0,MAX);
  let extra=results.length-MAX;
  let itemsHtml=shown.map(p=>{
    let fline=getFullFatherLine(p);
    let kin=myPersonId&&myPersonId!==p.id?getMyKinship(p.id):null;
    let kinHtml=kin?`<span class="srp-kin">${kin.label}</span>`:(myPersonId===p.id?`<span class="srp-kin" style="background:#fef9c3;color:#92400e;border:1px solid #fbbf24">أنا</span>`:'');
    let gIcon=p.gender==='male'?`<div class="gender-dot male-dot" style="width:8px;height:8px;flex-shrink:0"></div>`:`<div class="gender-dot female-dot" style="width:8px;height:8px;flex-shrink:0"></div>`;
    let active=_searchActiveId===p.id?' srp-active':'';
    // تمييز الجزء المطابق في الاسم (بعد تجريد الألقاب)
    let dispName=highlightQueryHTML(p.name,nq);
    let activeLabel=_searchActiveId===p.id?` <span style="font-size:10px;font-weight:700;color:#92400e;background:#fef3c7;border:1px solid #fbbf24;border-radius:999px;padding:1px 6px;white-space:nowrap">الحالية</span>`:'';
    return `<div class="srp-item${active}" onclick="searchNavigateTo(${p.id})" data-srp-id="${p.id}">
      ${gIcon}
      <div style="flex:1;min-width:0">
        <div class="srp-name">${p.title?`<span>${escapeHtml(p.title)} </span>`:''}${dispName}${p.familyName?` <span style="font-size:10px;color:var(--text2)">${escapeHtml(p.familyName)}</span>`:''}${activeLabel}</div>
        ${fline?`<div class="srp-meta">${fline.split(' بن ').slice(0,3).join(' بن ')}</div>`:''}
      </div>
      ${kinHtml}
    </div>`;
  }).join('');
  let moreHtml=extra>0?`<div class="srp-more">+${extra} نتيجة أخرى — دقّق البحث للتضييق</div>`:'';
  let isMob=document.body.classList.contains('mobile-mode');
  // زر "ابدأ التنقل" في وضع الجوال
  let navStartHtml=isMob&&results.length>0?`
    <div style="padding:10px 14px;background:var(--card-bg);border-top:1px solid var(--card-border);display:flex;gap:8px;align-items:center;">
      <button onclick="searchNavigateTo(${results[0].id})" style="flex:1;padding:11px;background:#1e40af;color:#fff;border:none;border-radius:12px;font-size:14px;font-weight:600;cursor:pointer;">
        🔍 تصفح ${results.length} نتيجة
      </button>
      <button onclick="document.getElementById('searchResultsPanel').style.display='none';_hideSrpOverlay()" style="padding:11px 14px;background:var(--bg-secondary);color:var(--text2);border:1px solid var(--card-border);border-radius:12px;font-size:13px;cursor:pointer;">إلغاء</button>
    </div>`:'';
  // رأس لوحة البحث في الجوال: مقبض للسحب
  let mobHandle=isMob?`<div style="width:40px;height:4px;border-radius:2px;background:var(--card-border);margin:10px auto 0;"></div>`:'';
  panel.style.display='block';
  panel.innerHTML=`${mobHandle}<div class="srp-header">
    <span>🔍 ${results.length} نتيجة${results.length===1?' واحدة':''}${_searchActiveId?` — الحالية مميزة` : ''}</span>
    <button onclick="clearSearch(true)">✕ مسح</button>
  </div>
  <div class="srp-list">${itemsHtml}</div>${moreHtml}${navStartHtml}`;
}

let _srpFocusIdx=-1;
function searchKeyNav(e){
  let items=document.querySelectorAll('.srp-item');
  if(!items.length)return;
  if(e.key==='ArrowDown'){e.preventDefault();_srpFocusIdx=Math.min(_srpFocusIdx+1,items.length-1);_srpHighlight(items);}
  else if(e.key==='ArrowUp'){e.preventDefault();_srpFocusIdx=Math.max(_srpFocusIdx-1,0);_srpHighlight(items);}
  else if(e.key==='Enter'){
    e.preventDefault();
    if(_srpFocusIdx>=0&&items[_srpFocusIdx])items[_srpFocusIdx].click();
    else if(items[0])items[0].click();
  }
  else if(e.key==='Escape'){clearSearch(true);}
}
function _isTypingField(el){
  if(!el) return false;
  const tag=(el.tagName||'').toUpperCase();
  return tag==='INPUT'||tag==='TEXTAREA'||tag==='SELECT'||el.isContentEditable;
}

function openShortcutHelpModal(){
  const html = `
    <div class="modal-overlay" onclick="if(event.target===this)closeModal()">
      <div class="modal" style="max-width:460px">
        <h3>⌨️ اختصارات سريعة</h3>
        <div style="display:grid;gap:8px;font-size:13px;line-height:1.7">
          <div><code>Ctrl / Cmd + K</code> — فتح البحث السريع</div>
          <div><code>/</code> — فتح البحث السريع من أي مكان غير حقل إدخال</div>
          <div><code>Esc</code> — إغلاق البحث أو النافذة الحالية</div>
          <div><code>Home</code> — الانتقال إلى أعلى الصفحة</div>
          <div><code>?</code> أو <code>؟</code> — عرض هذه النافذة</div>
          <div style="color:var(--text2);font-size:12px">تعمل الاختصارات أيضًا مع لوحة المفاتيح العربية لأننا نستخدم المفاتيح الفيزيائية نفسها.</div>
        </div>
        <div class="modal-footer" style="margin-top:12px">
          <button class="btn" onclick="closeModal()">إغلاق</button>
        </div>
      </div>
    </div>`;
  document.getElementById('modalContainer').innerHTML = html;
}

document.addEventListener('keydown',function(e){
  const modalOpen = !!document.getElementById('modalContainer').innerHTML;
  const typing = _isTypingField(e.target);
  const noMods = !e.ctrlKey && !e.metaKey && !e.altKey;

  // اختصارات تعتمد على المفتاح الفيزيائي حتى تعمل على لوحات عربية/إنجليزية
  if((e.ctrlKey||e.metaKey) && e.code==='KeyK'){
    e.preventDefault();
    openSearchPanel();
    return;
  }
  if(!typing && noMods && e.code==='Slash' && !e.shiftKey){
    e.preventDefault();
    openSearchPanel();
    return;
  }
  if(!typing && noMods && ((e.code==='Slash' && e.shiftKey) || e.key==='?' || e.key==='؟')){
    e.preventDefault();
    openShortcutHelpModal();
    return;
  }
  if(!typing && e.code==='Home'){
    e.preventDefault();
    window.scrollTo({top:0,behavior:'smooth'});
    return;
  }
  if(e.key==='Escape' && modalOpen){
    closeModal();
    return;
  }
  if(e.key==='Escape'&&_lastSearchQ&&!modalOpen){
    // لا تمسح إذا كانت لوحة MSS مفتوحة (mssInputKey تتولى ذلك بـ stopPropagation)
    let sheet=document.getElementById('mss-sheet');
    if(sheet&&sheet.classList.contains('open'))return;
    clearSearch(true);
  }
});
function _srpHighlight(items){
  items.forEach((el,i)=>{
    el.style.background=i===_srpFocusIdx?'var(--bg-secondary)':'';
    if(i===_srpFocusIdx)el.scrollIntoView({block:'nearest'});
  });
}
function searchNavigateTo(id){
  // أغلق القائمة والخلفية
  document.getElementById('searchResultsPanel').style.display='none';
  _hideSrpOverlay();

  // حفظ حالة الشجرة قبل أول انتقال
  if(!_savedExpanded){
    _savedExpanded=JSON.parse(JSON.stringify(expanded));
  }

  // تحديث الموضع في قائمة النتائج
  let idx=_searchResultIds.indexOf(id);
  if(idx>=0)_searchNavIdx=idx;
  else{_searchResultIds=[id];_searchNavIdx=0;}
  _searchActiveId=id;

  // ── ضبط currentFamilyFilter حسب شجرة الشخص المستهدف ──
  let _targetP=getPerson(id);
  if(_targetP){
    // جد الجذر الأعلى للشخص
    let _tRoot=_targetP;
    while(_tRoot.parentId&&getPerson(_tRoot.parentId))_tRoot=getPerson(_tRoot.parentId);
    let _mainIds=new Set(getRoots(false).map(r=>r.id));
    let _isMainTree=_mainIds.has(_tRoot.id);
    let _alreadyCorrect=currentFamilyFilter&&currentFamilyFilter.rootId===_tRoot.id;
    if(!_alreadyCorrect){
      if(_isMainTree){
        // الشخص في الشجرة الرئيسية — ألغِ الفلتر الخارجي
        navStack=[];
        currentFamilyFilter=null;
      } else {
        // الشخص في شجرة خارجية مختلفة — انتقل إليها
        let _fromLabel=currentFamilyFilter?currentFamilyFilter.label:
          (getRoots(false).length>0?'عائلة '+getRoots(false)[0].name:'الشجرة الرئيسية');
        navStack.push({label:_fromLabel,filter:currentFamilyFilter?JSON.parse(JSON.stringify(currentFamilyFilter)):null,scrollY:window.scrollY});
        currentFamilyFilter={
          rootId:_tRoot.id,
          label:'عائلة '+(_tRoot.name)+(_tRoot.familyName?' '+_tRoot.familyName:''),
          viaPersonId:id,fromLabel:_fromLabel
        };
      }
    }
  }

  // انهيار الشجرة + فتح مسار الشخص فقط
  people.forEach(p=>expanded[p.id]=false);
  (function eu(pid){let p=getPerson(pid);if(!p)return;if(p.parentId){expanded[p.parentId]=true;eu(p.parentId);}})(id);
  expanded[id]=false;

  // التأكد من فتح تبويب الشجرة
  document.querySelectorAll('.tab').forEach(t=>t.classList.remove('active'));
  document.querySelectorAll('.tab')[0].classList.add('active');
  document.querySelectorAll('.panel').forEach(p=>p.classList.remove('active'));
  document.getElementById('treePanel').classList.add('active');

  renderTree();
  _updateSearchNavBar();
  setTimeout(()=>{
    let el=document.querySelector(`[data-person-id="${id}"]`);
    if(el){
      el.scrollIntoView({behavior:'smooth',block:'center'});
      let hdr=el.querySelector('.node-header');
      if(hdr){hdr.style.background='#fef9c3';hdr.style.boxShadow='0 0 0 3px rgba(245,158,11,.25)';setTimeout(()=>{hdr.style.background='';hdr.style.boxShadow='';},900);}
    }
  },360);
}
let _statsVisible = false; // حالة ظهور الإحصائيات

function toggleStats(){
  _statsVisible = !_statsVisible;
  let statsBar = document.getElementById('statsBar');
  let btn = document.getElementById('statsToggleBtn');
  
  if(_statsVisible){
    statsBar.style.display = 'grid';
    btn.style.background = 'var(--primary-color)';
    btn.style.color = 'white';
  } else {
    statsBar.style.display = 'none';
    btn.style.background = 'var(--card-bg)';
    btn.style.color = 'var(--text)';
  }
}
function renderStats(){
  let total=people.length;
  let males=people.filter(p=>p.gender==='male').length;
  let females=people.filter(p=>p.gender==='female').length;
  let deceased=people.filter(p=>p.deceased).length;
  let alive=total-deceased;
  function depth(id,cache={}){if(cache[id]!==undefined)return cache[id];let ch=getChildren(id);if(!ch.length){cache[id]=1;return 1;}let d=1+Math.max(...ch.map(c=>depth(c.id,cache)));cache[id]=d;return d;}
  let gens=0;getRoots().forEach(r=>{let d=depth(r.id);if(d>gens)gens=d;});
  let stats=[
    {label:'إجمالي الأفراد',val:total,color:'#3b82f6'},
    {label:'عدد الأجيال',val:gens,color:'#8b5cf6'},
    {label:'ذكور',val:males,color:'#0ea5e9'},
    {label:'إناث',val:females,color:'#ec4899'},
    {label:'الأحياء',val:alive,color:'#22c55e'},
    {label:'المتوفين',val:deceased,color:'#6b7280'},
  ];
  document.getElementById('statsBar').innerHTML=stats.map(s=>`
    <div style="background:var(--card-bg);border:1px solid var(--card-border);border-radius:8px;padding:10px 12px;display:flex;align-items:center;gap:10px;">
      <div style="width:4px;height:36px;border-radius:4px;background:${s.color};flex-shrink:0;"></div>
      <div>
        <div style="font-size:20px;font-weight:600;color:${s.color};line-height:1.1;">${s.val}</div>
        <div style="font-size:11px;color:var(--text2);margin-top:2px;">${s.label}</div>
      </div>
    </div>`).join('');
}
function exportData(){
  closeModal();
  setTimeout(function(){
    try{
      // ── 1. Build data payload ──
      var payload=JSON.stringify({people:people,relPairs:relPairs,nextId:nextId,myPersonId:myPersonId||null});
      var bytes=new TextEncoder().encode(payload);
      var bin='';bytes.forEach(function(b){bin+=String.fromCharCode(b);});
      var b64=btoa(bin);
      var dataTag='<scr'+'ipt id="__family_tree_data__" type="application/json">'+b64+'<\/sc'+'ript>';

      // ── 2. Build <html> tag with original attributes ──
      var htmlAttrs='';
      Array.from(document.documentElement.attributes).forEach(function(a){
        htmlAttrs+=' '+a.name+'="'+a.value.replace(/&/g,'&amp;').replace(/"/g,'&quot;')+'"';
      });

      // ── 3. Get clean #app (pre-render, from _HTML_TEMPLATE via DOMParser) ──
      var cleanAppHTML='';
      try{
        var tDoc=(new DOMParser()).parseFromString('<!DOCTYPE html>\n'+_HTML_TEMPLATE,'text/html');
        var tApp=tDoc.getElementById('app');
        if(tApp)cleanAppHTML=tApp.outerHTML;
      }catch(ex){}
      if(!cleanAppHTML)cleanAppHTML=document.getElementById('app').outerHTML;

      // ── 4. Get exact main script source (last script element = main app) ──
      var mainSrc=document.scripts[document.scripts.length-1].textContent;

      // ── تضمين CLOUD_CONFIG في الملف المحفوظ ──
      if(CLOUD_CONFIG.KEY_HEX&&CLOUD_CONFIG.GITHUB_PAT){
        let gistIdToEmbed=CLOUD_CONFIG.GIST_ID||localStorage.getItem(CLOUD_GIST_KEY)||'';
        // استبدال الكتلة كاملةً بدلاً من حقل بحقل لتفادي الخلط مع FAMILY_UPLOAD_CONFIG
        mainSrc=mainSrc.replace(
          /const CLOUD_CONFIG\s*=\s*\{[^}]*\}/,
          "const CLOUD_CONFIG = {\n" +
          "  KEY_HEX: '"+CLOUD_CONFIG.KEY_HEX+"',\n" +
          "  GITHUB_PAT: '"+CLOUD_CONFIG.GITHUB_PAT+"',\n" +
          "  GIST_ID: '"+gistIdToEmbed+"',  // ← يُملأ تلقائياً\n" +
          "  GIST_FILE: '"+(CLOUD_CONFIG.GIST_FILE||'ft_encrypted.dat')+"',\n" +
          "}"
        );
      }

      // ── تضمين FAMILY_UPLOAD_CONFIG في نسخة المالك أيضاً ──
      {
        let fuPat=FAMILY_UPLOAD_CONFIG.GITHUB_PAT||localStorage.getItem('ft_fupload_pat')||'';
        let fuGid=FAMILY_UPLOAD_CONFIG.GIST_ID||localStorage.getItem(FAMILY_UPLOAD_GIST_KEY)||localStorage.getItem('ft_fupload_gid')||'';
        let fuKey=FAMILY_UPLOAD_CONFIG.KEY_HEX||localStorage.getItem('ft_fupload_key')||'';
        if(fuPat||fuGid){
          mainSrc=mainSrc.replace(
            /const FAMILY_UPLOAD_CONFIG\s*=\s*\{[^}]*\}/,
            "const FAMILY_UPLOAD_CONFIG = {\n" +
            "  GITHUB_PAT: '"+fuPat+"',\n" +
            "  GIST_ID: '"+fuGid+"',\n" +
            "  KEY_HEX: '"+fuKey+"',\n" +
            "}"
          );
        }
      }

      // ── 5. Assemble complete, valid HTML ──
      var src='<!DOCTYPE html>\n'+
        '<html'+htmlAttrs+'>\n'+
        document.head.outerHTML+'\n'+
        '<body>\n'+
        cleanAppHTML+'\n'+
        '<div id="modalContainer"></div>\n'+
        dataTag+'\n'+
        '<scr'+'ipt>\n'+mainSrc+'\n<\/sc'+'ript>\n'+
        '</body>\n</html>';

      // ── 6. Download ──
      var d=new Date();
      var stamp=d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
      var blob=new Blob([src],{type:'text/html;charset=utf-8'});
      var url=URL.createObjectURL(blob);
      var lnk=document.createElement('a');
      lnk.href=url;lnk.download='family_tree_'+stamp+'.html';
      document.body.appendChild(lnk);lnk.click();
      setTimeout(function(){document.body.removeChild(lnk);URL.revokeObjectURL(url);},1500);
      showSaveToast();
    }catch(err){
      alert('خطأ في الحفظ: '+err.message);
    }
  },100);
}

