// ═══════════════════════════════════════════════════════════════
// ═══════════════════════════════════════════════════════════════
// تصدير JSON — بدون صور / مع صور / للعائلة (مع Gist + Device ID)
// ═══════════════════════════════════════════════════════════════
function showExportJSONModal(){
  let photoCount=people.filter(p=>p.photo).length;
  let sizeEst=photoCount>0?`~${Math.round(photoCount*40)} KB إضافية للصور`:'لا توجد صور';
  // خيار "للعائلة" يظهر فقط لنسخة المالك
  let familyOption=IS_FAMILY_COPY?'':_buildFamilyExportOption();
  let html=`<div class="modal-overlay" onclick="if(event.target===this)closeModal()">
  <div class="modal" style="max-width:420px;">
    <h3>📤 تصدير JSON</h3>
    <p style="font-size:13px;color:var(--text2);margin-bottom:16px;">اختر نوع التصدير:</p>
    <div style="display:flex;flex-direction:column;gap:10px;margin-bottom:16px;">
      <div onclick="doExportJSON(false)" style="cursor:pointer;padding:14px 16px;border:1px solid var(--card-border);border-radius:10px;background:var(--card-bg);" onmouseover="this.style.background='var(--bg-secondary)'" onmouseout="this.style.background='var(--card-bg)'">
        <div style="font-size:14px;font-weight:600;color:var(--text);margin-bottom:4px;">📄 بدون صور <span style="font-size:11px;font-weight:400;color:#22c55e;background:#dcfce7;border:1px solid #86efac;padding:2px 6px;border-radius:6px;margin-right:6px;">موصى به</span></div>
        <div style="font-size:12px;color:var(--text2);">حجم أصغر — مناسب للنسخ الاحتياطية اليومية والمشاركة<br>${photoCount>0?`ستُحذف ${photoCount} صورة (محفوظة في ملف HTML فقط)`:'لا توجد صور لحذفها'}</div>
      </div>
      <div onclick="doExportJSON(true)" style="cursor:pointer;padding:14px 16px;border:1px solid var(--card-border);border-radius:10px;background:var(--card-bg);" onmouseover="this.style.background='var(--bg-secondary)'" onmouseout="this.style.background='var(--card-bg)'">
        <div style="font-size:14px;font-weight:600;color:var(--text);margin-bottom:4px;">🖼️ مع الصور</div>
        <div style="font-size:12px;color:var(--text2);">يتضمن جميع الصور — الحجم أكبر<br>${photoCount>0?`${photoCount} صورة، ${sizeEst}`:'لا توجد صور'}</div>
      </div>
      ${familyOption}
    </div>
    <div class="modal-footer"><button class="btn" onclick="closeModal()">إلغاء</button></div>
  </div></div>`;
  document.getElementById('modalContainer').innerHTML=html;
}

// بناء خيار "للعائلة" ديناميكياً
function _buildFamilyExportOption(){
  let fuGid=FAMILY_UPLOAD_CONFIG.GIST_ID||localStorage.getItem(FAMILY_UPLOAD_GIST_KEY)||localStorage.getItem('ft_fupload_gid')||'';
  let fuPat=FAMILY_UPLOAD_CONFIG.GITHUB_PAT||localStorage.getItem('ft_fupload_pat')||'';
  let photoCount=people.filter(p=>p.photo).length;
  let configured=!!(fuPat&&fuGid);
  let badge=configured
    ?`<span style="font-size:11px;font-weight:400;color:#1d4ed8;background:#dbeafe;border:1px solid #93c5fd;padding:2px 6px;border-radius:6px;margin-right:6px;">\u0645\u064f\u0639\u062f\u064e\u0651\u062f Gist \u2713</span>`
    :`<span style="font-size:11px;font-weight:400;color:#b45309;background:#fef3c7;border:1px solid #fcd34d;padding:2px 6px;border-radius:6px;margin-right:6px;">\u0628\u062f\u0648\u0646 Gist</span>`;
  let gidHint=configured
    ?`Gist: <code style="font-size:10px">${fuGid.slice(0,8)}\u2026</code>`
    :`<a href="#" onclick="closeModal();openFamilyUploadSetup();return false;" style="color:#3b82f6">\u2699\ufe0f \u0625\u0639\u062f\u0627\u062f Gist \u0623\u0648\u0644\u0627\u064b \u0644\u0644\u0631\u0641\u0639 \u0627\u0644\u0635\u0627\u0645\u062a</a>`;
  return `<div style="border:2px solid #3b82f6;border-radius:10px;overflow:hidden">
    <div style="padding:10px 14px;background:#eff6ff;border-bottom:1px solid #bfdbfe">
      <div style="font-size:13px;font-weight:600;color:#1d4ed8;">\ud83d\udce8 \u0644\u0644\u0639\u0627\u0626\u0644\u0629 ${badge}</div>
      <div style="font-size:11px;color:#3b82f6;margin-top:2px">${gidHint} \u00b7 Device ID \u0641\u0631\u064a\u062f \u0644\u0643\u0644 \u0641\u0631\u062f</div>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:0">
      <div onclick="doExportJSONFamily(false)" style="cursor:pointer;padding:12px 14px;background:var(--card-bg);border-left:1px solid #bfdbfe" onmouseover="this.style.background='var(--bg-secondary)'" onmouseout="this.style.background='var(--card-bg)'">
        <div style="font-size:13px;font-weight:600;color:var(--text);margin-bottom:2px;">\ud83d\udcc4 \u0628\u062f\u0648\u0646 \u0635\u0648\u0631</div>
        <div style="font-size:11px;color:var(--text2);">\u062d\u062c\u0645 \u0623\u0635\u063a\u0631 \u2014 \u0645\u0648\u0635\u0649 \u0628\u0647</div>
      </div>
      <div onclick="doExportJSONFamily(true)" style="cursor:pointer;padding:12px 14px;background:var(--card-bg)" onmouseover="this.style.background='var(--bg-secondary)'" onmouseout="this.style.background='var(--card-bg)'">
        <div style="font-size:13px;font-weight:600;color:var(--text);margin-bottom:2px;">\ud83d\uddbc\ufe0f \u0645\u0639 \u0627\u0644\u0635\u0648\u0631</div>
        <div style="font-size:11px;color:var(--text2);">${photoCount} \u0635\u0648\u0631\u0629 \u2014 \u062d\u062c\u0645 \u0623\u0643\u0628\u0631</div>
      </div>
    </div>
  </div>`;
}

function doExportJSON(withPhotos){
  closeModal();
  let data=JSON.parse(JSON.stringify({people,relPairs,nextId}));
  let photoCount=data.people.filter(p=>p.photo).length;
  if(!withPhotos) data.people.forEach(p=>{if(p.photo)delete p.photo;});
  let payload=JSON.stringify(data,null,2);
  let d=new Date();
  let stamp=d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
  let blob=new Blob([payload],{type:'application/json'});
  let url=URL.createObjectURL(blob);
  let a=document.createElement('a');
  a.href=url;a.download='family_tree_'+(withPhotos?'full_':'')+'backup_'+stamp+'.json';
  document.body.appendChild(a);a.click();
  document.body.removeChild(a);URL.revokeObjectURL(url);
  showSaveToast();
  if(!withPhotos&&photoCount>0) setTimeout(()=>alert(`\u2714 \u062a\u0645 \u0627\u0644\u062a\u0635\u062f\u064a\u0631 (${data.people.length} \u0634\u062e\u0635) \u0628\u062f\u0648\u0646 \u0635\u0648\u0631.\n\u0644\u0644\u0627\u062d\u062a\u0641\u0627\u0638 \u0628\u0627\u0644\u0635\u0648\u0631 \u0627\u0633\u062a\u062e\u062f\u0645 \u0632\u0631 "\ud83d\udcbe \u062d\u0641\u0638 \u0646\u0633\u062e\u0629" HTML.`),300);
}

// \u062a\u0635\u062f\u064a\u0631 JSON \u062e\u0627\u0635 \u0628\u0646\u0633\u062e\u0629 \u0627\u0644\u0639\u0627\u0626\u0644\u0629 \u2014 \u0645\u0639 Gist ID + Device ID \u0641\u0631\u064a\u062f
function doExportJSONFamily(withPhotos){
  closeModal();
  var devId=[...crypto.getRandomValues(new Uint8Array(3))].map(b=>b.toString(16).padStart(2,'0')).join('');
  var fuGid=FAMILY_UPLOAD_CONFIG.GIST_ID||localStorage.getItem(FAMILY_UPLOAD_GIST_KEY)||localStorage.getItem('ft_fupload_gid')||'';
  var fuPat=FAMILY_UPLOAD_CONFIG.GITHUB_PAT||localStorage.getItem('ft_fupload_pat')||'';
  var fuKey=FAMILY_UPLOAD_CONFIG.KEY_HEX||localStorage.getItem('ft_fupload_key')||CLOUD_CONFIG.KEY_HEX||localStorage.getItem('ft_cloud_key')||'';

  var data=JSON.parse(JSON.stringify({people,relPairs,nextId}));
  var photoCount=data.people.filter(p=>p.photo).length;
  if(!withPhotos) data.people.forEach(function(p){if(p.photo)delete p.photo;});

  var payload={
    people:data.people,
    relPairs:data.relPairs,
    nextId:data.nextId,
    _familyMeta:{
      deviceId:devId,
      gistId:fuGid,
      pat:fuPat,
      keyHex:fuKey,
      exportedAt:new Date().toISOString(),
      exportedBy:'owner'
    }
  };

  var d=new Date();
  var stamp=d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
  var suffix=withPhotos?'full_share_':'share_';
  var blob=new Blob([JSON.stringify(payload,null,2)],{type:'application/json'});
  var url=URL.createObjectURL(blob);
  var a=document.createElement('a');
  a.href=url;
  a.download='family_tree_'+suffix+devId+'_'+stamp+'.json';
  document.body.appendChild(a);a.click();
  document.body.removeChild(a);URL.revokeObjectURL(url);
  showSaveToast();

  var gistNote=fuGid?'\u063a\u064a\u0633\u062a \u0645\u064f\u0641\u0639\u064e\u0651\u0644 \u2014 \u0645\u0644\u0641 \u0627\u0644\u0641\u0631\u062f: ft_family_'+devId+'.dat':'\u26a0\ufe0f Gist \u063a\u064a\u0631 \u0645\u064f\u0639\u062f\u064e\u0651\u062f \u2014 \u0627\u0644\u0631\u0641\u0639 \u0627\u0644\u0635\u0627\u0645\u062a \u0644\u0646 \u064a\u0639\u0645\u0644';
  var photosNote=withPhotos&&photoCount>0?'\n\ud83d\uddbc\ufe0f \u064a\u062a\u0636\u0645\u0646 '+photoCount+' \u0635\u0648\u0631\u0629':'';
  setTimeout(function(){
    alert(
      '\u2705 \u062a\u0645 \u062a\u0635\u062f\u064a\u0631 JSON \u0644\u0644\u0639\u0627\u0626\u0644\u0629\n\n'+
      '\ud83d\udcf1 Device ID: '+devId+'\n'+
      '\ud83d\udcc1 '+gistNote+photosNote+'\n\n'+
      '\u062e\u0637\u0648\u0627\u062a \u0627\u0644\u062a\u0648\u0632\u064a\u0639:\n'+
      '1. \u0623\u0631\u0633\u0644 \u0631\u0627\u0628\u0637 \u0627\u0644\u062a\u0637\u0628\u064a\u0642 \u0644\u0641\u0631\u062f \u0627\u0644\u0639\u0627\u0626\u0644\u0629\n'+
      '2. \u0623\u0631\u0633\u0644 \u0647\u0630\u0627 \u0627\u0644\u0645\u0644\u0641 \u0645\u0646\u0641\u0635\u0644\u0627\u064b (\u0644\u0627 \u062a\u0646\u0634\u0631\u0647 \u0639\u0644\u0646\u0627\u064b)\n'+
      '3. \u064a\u0641\u062a\u062d \u0627\u0644\u062a\u0637\u0628\u064a\u0642 \u2192 \u064a\u0636\u063a\u0637 \u0627\u0633\u062a\u064a\u0631\u0627\u062f JSON \u2192 \u062a\u064f\u0641\u0639\u064e\u0651\u0644 \u0627\u0644\u0645\u0641\u0627\u062a\u064a\u062d \u062a\u0644\u0642\u0627\u0626\u064a\u0627\u064b\n'+
      '\u26a0\ufe0f \u0627\u0644\u062a\u0637\u0628\u064a\u0642 \u0646\u0641\u0633\u0647 \u0644\u0627 \u064a\u062d\u0645\u0644 \u0623\u064a \u0645\u0641\u0627\u062a\u064a\u062d'
    );
  },300);
}
// استيراد — مع خيار استبدال أو دمج
// ═══════════════════════════════════════════════════════════════
let _pendingImportData=null;
function handleImportFile(e){
  let file=e.target.files[0];if(!file)return;
  let reader=new FileReader();
  reader.onload=ev=>{
    try{
      let text=ev.target.result;
      let d;
      if(file.name.endsWith('.html')||file.name.endsWith('.htm')){
        let re1=/<script id="__family_tree_data__"[^>]*>([A-Za-z0-9+\/=\s]+)<\/script>/;
        let m1=text.match(re1);
        if(m1){
          let ib=atob(m1[1].replace(/\s/g,''));
          let iu8=new Uint8Array(ib.length);
          for(let ii=0;ii<ib.length;ii++)iu8[ii]=ib.charCodeAt(ii);
          d=JSON.parse(new TextDecoder().decode(iu8));
        } else {
          throw new Error('لم يتم العثور على بيانات مضمّنة في الملف.\nتأكد أن الملف محفوظ بزر "💾 حفظ نسخة" أو تصدير JSON كامل.');
        }
      } else {
        d=JSON.parse(text);
      }
      if(!d.people||!Array.isArray(d.people))throw new Error('صيغة البيانات غير صالحة');
      _pendingImportData=d;
      showImportModeModal(d,file.name);
    }catch(ex){alert('خطأ في الملف: '+ex.message);}
    e.target.value='';
  };
  reader.readAsText(file);
}
function showImportModeModal(d,filename){
  let incoming=d.people.length;
  let existing=people.length;
  let photoCount=d.people.filter(p=>p.photo).length;
  let html=`<div class="modal-overlay" onclick="if(event.target===this)closeModal()">
  <div class="modal" style="max-width:420px;">
    <h3>📥 استيراد البيانات</h3>
    <div style="padding:10px 12px;background:var(--bg-secondary);border:1px solid var(--card-border);border-radius:8px;margin-bottom:16px;font-size:12px;color:var(--text2);">
      <div>📁 الملف: <strong style="color:var(--text)">${filename}</strong></div>
      <div style="margin-top:4px;">👥 عدد الأفراد في الملف: <strong style="color:var(--text)">${incoming}</strong>${photoCount>0?` · 🖼️ ${photoCount} صورة`:''}</div>
      <div style="margin-top:4px;">🌳 الشجرة الحالية: <strong style="color:var(--text)">${existing}</strong> فرد</div>
    </div>
    <p style="font-size:13px;color:var(--text2);margin-bottom:14px;">كيف تريد الاستيراد؟</p>
    <div style="display:flex;flex-direction:column;gap:10px;margin-bottom:16px;">
      <div onclick="doImport('replace')" style="cursor:pointer;padding:14px 16px;border:1px solid var(--card-border);border-radius:10px;background:var(--card-bg);" onmouseover="this.style.borderColor='#ef4444'" onmouseout="this.style.borderColor='var(--card-border)'">
        <div style="font-size:14px;font-weight:600;color:var(--text);margin-bottom:4px;">🔄 استبدال كل البيانات</div>
        <div style="font-size:12px;color:var(--text2);">يحذف الشجرة الحالية ويستبدلها بالبيانات المستوردة<br><span style="color:#ef4444">⚠️ لا يمكن التراجع عن هذا الإجراء</span></div>
      </div>
      <div onclick="doImport('merge')" style="cursor:pointer;padding:14px 16px;border:1px solid var(--card-border);border-radius:10px;background:var(--card-bg);" onmouseover="this.style.borderColor='#22c55e'" onmouseout="this.style.borderColor='var(--card-border)'">
        <div style="font-size:14px;font-weight:600;color:var(--text);margin-bottom:4px;">➕ إضافة إلى الشجرة الحالية <span style="font-size:11px;font-weight:400;color:#22c55e;background:#dcfce7;border:1px solid #86efac;padding:2px 6px;border-radius:6px;margin-right:6px;">آمن</span></div>
        <div style="font-size:12px;color:var(--text2);">يضيف الأفراد <strong>الجدد فقط</strong> ويتجاهل المكررين تلقائياً<br>مفيد إذا شخص عدّل نسخته وأرسلها إليك</div>
      </div>
    </div>
    <div class="modal-footer"><button class="btn" onclick="closeModal();_pendingImportData=null;">إلغاء</button></div>
  </div></div>`;
  document.getElementById('modalContainer').innerHTML=html;
}
function doImport(mode){
  closeModal();
  let d=_pendingImportData;
  _pendingImportData=null;
  if(!d)return;
  try{
    if(mode==='replace'){
      people=d.people;nextId=d.nextId||1;relPairs=d.relPairs||[];
      if(d.myPersonId){myPersonId=parseInt(d.myPersonId);saveMyPerson();}
      expanded={};people.forEach(p=>{expanded[p.id]=false;});
      migrateExternalSpouses();
      _invalidateAll();
      if(people.length)expanded[people[0].id]=true;
      _applyFamilyMetaIfNeeded(d);
      saveData();renderAll();updateMyPersonBtn();
      setTimeout(()=>alert(`✔ تم الاستيراد بنجاح! (${people.length} فرد)`),200);
    } else {
      // وضع الدمج: إعادة ترقيم IDs وتجاهل الأشخاص المكررين
      let incoming=JSON.parse(JSON.stringify(d.people));
      let incomingRel=JSON.parse(JSON.stringify(d.relPairs||[]));

      // دالة مساعدة: هل شخصان متطابقان؟ (الاسم + اسم الوالد)
      function isSamePerson(incomingP, existingP){
        let nameMatch=normalizeAr(incomingP.name)===normalizeAr(existingP.name);
        if(!nameMatch)return false;
        // مطابقة إضافية بالجنس إن أمكن
        if(incomingP.gender&&existingP.gender&&incomingP.gender!==existingP.gender)return false;
        // إذا كان لكلا الشخصين parentId نبحث عن اسم الوالد
        let incomingParent=incoming.find(x=>x.id===incomingP.parentId);
        let existingParent=getPerson(existingP.parentId);
        if(incomingParent&&existingParent){
          return normalizeAr(incomingParent.name)===normalizeAr(existingParent.name);
        }
        // إذا لم يكن لأحدهما أب (جذر) نعتمد على تطابق الاسم فقط
        if(!incomingP.parentId&&!existingP.parentId)return true;
        // إذا كان أحدهما له أب والآخر ليس، ليسا نفس الشخص
        if(!!incomingP.parentId!==!!existingP.parentId)return false;
        return true;
      }

      // بناء خريطة: ID وارد → ID في الشجرة (قديم إن وُجد، جديد إن لم يوجد)
      let idMap=new Map();
      let trulyNew=[]; // الأشخاص الجدد فعلاً الذين سيُضافون

      incoming.forEach(p=>{
        let duplicate=people.find(ep=>isSamePerson(p,ep));
        if(duplicate){
          // هذا الشخص موجود مسبقاً — ربط فقط دون إضافة
          idMap.set(p.id,duplicate.id);
        } else {
          let newId=nextId++;
          idMap.set(p.id,newId);
          trulyNew.push(p);
        }
      });

      // تطبيق الـ IDs الجديدة على الأشخاص الجدد فقط
      trulyNew.forEach(p=>{
        p.id=idMap.get(p.id);
        if(p.parentId!=null)p.parentId=idMap.has(p.parentId)?idMap.get(p.parentId):p.parentId;
        if(p.motherId!=null)p.motherId=idMap.has(p.motherId)?idMap.get(p.motherId):p.motherId;
        if(p.spouses)p.spouses.forEach(s=>{
          if(s.relativeId&&idMap.has(s.relativeId))s.relativeId=idMap.get(s.relativeId);
        });
      });

      // تحديث relPairs — باستخدام الخريطة الكاملة (مكرر أو جديد)
      let newRelPairs=incomingRel.map(pair=>pair.map(id=>idMap.has(id)?idMap.get(id):id));
      // إضافة أزواج القرابة الجديدة فقط (غير مكررة)
      newRelPairs.forEach(pair=>{
        if(!relPairs.some(rp=>(rp[0]===pair[0]&&rp[1]===pair[1])||(rp[0]===pair[1]&&rp[1]===pair[0]))){
          relPairs.push(pair);
        }
      });

      let skipped=incoming.length-trulyNew.length;
      // الدمج: إضافة الجدد فقط
      people=people.concat(trulyNew);
      trulyNew.forEach(p=>{expanded[p.id]=false;});
      _invalidateAll();
      _applyFamilyMetaIfNeeded(d);
      saveData();renderAll();updateMyPersonBtn();
      let msg=`✔ تم الدمج بنجاح!\n➕ أضيف ${trulyNew.length} فرد جديد`;
      if(skipped>0)msg+=`\n⏭️ تجاهل ${skipped} فرد مكرر موجود مسبقاً`;
      msg+=`\n👥 إجمالي الشجرة: ${people.length} فرد`;
      setTimeout(()=>alert(msg),200);
    }
  }catch(ex){alert('خطأ أثناء الاستيراد: '+ex.message);}
}
// ── تطبيق _familyMeta تلقائياً عند الاستيراد في نسخة العائلة ──
function _applyFamilyMetaIfNeeded(data){
  if(!IS_FAMILY_COPY) return; // المالك لا يحتاج هذا
  var meta=data._familyMeta;
  if(!meta) return;
  // Device ID — لا نأخذ deviceId من meta أبداً:
  //   meta.deviceId انتُج على جهاز المُصدِّر ومخصص له.
  //   هذا الجهاز يولّد ID خاص به تلقائياً في _getFamilyGistFileName()
  //   عند أول رفع (إذا كان localStorage فارغاً).
  // (تعمَّدنا حذف localStorage.setItem هنا لمنع تصادم الأجهزة)
  // FAMILY_UPLOAD_CONFIG
  if(meta.pat){
    FAMILY_UPLOAD_CONFIG.GITHUB_PAT = meta.pat;
    try{localStorage.setItem('ft_fupload_pat', meta.pat);}catch(e){}
  }
  if(meta.gistId){
    FAMILY_UPLOAD_CONFIG.GIST_ID = meta.gistId;
    try{localStorage.setItem(FAMILY_UPLOAD_GIST_KEY, meta.gistId);}catch(e){}
    try{localStorage.setItem('ft_fupload_gid', meta.gistId);}catch(e){}
  }
  if(meta.keyHex){
    FAMILY_UPLOAD_CONFIG.KEY_HEX = meta.keyHex;
    try{localStorage.setItem('ft_fupload_key', meta.keyHex);}catch(e){}
  }
  console.log('[Import] Family meta applied — deviceId:', meta.deviceId||'—', 'gistId:', meta.gistId||'—');
}

let _renderTreeRAF=null;
function renderTree(){
  if(_renderTreeRAF)return; // منع الاستدعاءات المتكررة في نفس الإطار
  _renderTreeRAF=requestAnimationFrame(()=>{
    _renderTreeRAF=null;
    _renderTreeNow();
  });
}
function _renderTreeNow(){
  let q=_lastSearchQ.trim().toLowerCase();
  // عند البحث: الانهيار يتم في _doSearch، هنا فقط تمييز النتائج
  let matchIds=new Set(_searchResultIds);
  let contextIds=new Set(); // لا نحتاج سياق — الشجرة منهارة بالفعل

  let includeExternal=!!q||(currentFamilyFilter&&getPerson(currentFamilyFilter.rootId)&&getPerson(currentFamilyFilter.rootId).isExternal);
  let roots=getRoots(includeExternal);
  if(currentFamilyFilter){roots=roots.filter(r=>r.id===currentFamilyFilter.rootId);}
  let html='';roots.forEach(r=>{html+=renderNode(r,q,matchIds,contextIds);});
  let navHtml=renderNavBreadcrumb();
  document.getElementById('treePanel').innerHTML=navHtml+(html||'<div class="no-results">لا يوجد أفراد.</div>');
}
function renderNode(p,q,matchIds,contextIds){
  let children=getChildrenForNode(p.id),hasChildren=children.length>0,isExp=expanded[p.id];
  // استخدام الفهرس بدلاً من filter O(n)
  let _migratedCount=(p.gender==='female')?(_migratedMap.get(p.id)||0):0;
  // تمييز النتائج: الشخص المطابق = search-match، الشخص النشط = highlighted
  let isMatch=q&&matchesFullName(p,q);
  let isActive=_searchActiveId===p.id;
  let hCls='node-header'+(p.deceased?' deceased':'')+(isMatch?' search-match':'')+(isActive?' search-active-node':'');
  let _pnEsc=p.name.replace(/'/g,"\'");let av=p.photo?`<img src="${p.photo}" class="avatar" alt="${p.name}" style="cursor:pointer" onclick="event.stopPropagation();zoomPhoto('${p.photo}','${_pnEsc}')">`:`<div class="avatar-placeholder" style="background:${p.gender==='male'?'#dbeafe':'#fce7f3'};color:${p.gender==='male'?'#1d4ed8':'#be185d'}">${p.name[0]||'؟'}</div>`;
  let decIcon=p.deceased?`<span class="deceased-icon" title="${p.gender==='female'?'رحمها الله':'رحمه الله'}">${crescent('#2e7d32')}</span>`:'';
  let gDot=`<div class="gender-dot ${p.gender==='male'?'male-dot':'female-dot'}"></div>`;
  let relNums=getRelNums(p.id); // محتفظ به للبيانات — لا يُعرض كرقم منفصل بعد الآن
  let relB=''; // أُزيلت الأرقام — المؤشر أصبح على رقاقة اسم الزوج/ة مباشرةً
  let nameOnClick=p.deceased?`event.stopPropagation();showPersonDetail(${p.id});showFatihaOverlay();`:`event.stopPropagation();showPersonDetail(${p.id});`;
  // Father badge: use fatherId system first, then legacy externalFatherName
  let fatherBadgeLabel=p.fatherId?(getPerson(p.fatherId)||{}).name||p.fatherName||'':p.fatherName||p.externalFatherName||'';
  let extFatherBadge=fatherBadgeLabel?`<span title="الأب: ${fatherBadgeLabel}" style="font-size:10px;padding:1px 5px;border-radius:4px;background:#ede9fe;color:#5b21b6;border:1px solid #8b5cf6;flex-shrink:0">♂ ${fatherBadgeLabel}</span>`:'';
  let kinBadge='';
  if(myPersonId&&myPersonId===p.id){kinBadge=`<span class="my-marker">أنا</span>`;}
  else if(myPersonId&&myPersonId!==p.id){let kin=getMyKinship(p.id);if(kin){let cls=kinBadgeClass(kin);let badgeTip=(kin.blood&&kin.marriage)?`نسب: ${kin.blood.label} | مصاهرة: ${kin.marriage.label}`:'صلة القرابة بك';let badgeLbl=kin.label+(kin.marriage&&kin.blood?' 💍':'');kinBadge=`<span class="kin-badge ${cls}" onclick="event.stopPropagation();showPersonDetail(${p.id})" title="${badgeTip}">${badgeLbl}</span>`;}}
  let spInfo='';
  // For external persons: also show "wife in main tree" chips
  if(p.isExternal){
    let wives=people.filter(w=>Array.isArray(w.spouses)&&w.spouses.some(s=>s.personId===p.id));
    if(wives.length){
      let wifeChips=wives.map(w=>{
      let wFN=w.familyName?(' '+w.familyName):'';
      return `<span class="sp-tree-nav" style="border-color:#ec4899;background:#fdf2f8;color:#be185d;" title="زوجة في الشجرة الرئيسية — اضغط للانتقال" onclick="event.stopPropagation();navigateToMainForPerson(${w.id})">🏠 ${w.name}${wFN}</span>`;
    }).join('');
      spInfo=wifeChips;
    }
  }
  if(p.spouses&&p.spouses.length){
    // إزالة التكرار بالاسم والـ ID معاً (البيانات القديمة قد يكون نفس الشخص مرتين)
    let seenSpouseIds=new Set();
    let deduped=p.spouses.filter(s=>{
      let nameKey=normalizeAr(s.name||'');
      let idKey=s.personId||s.relativeId||null;
      // إذا كان الاسم أو الـ ID موجوداً في المجموعة → تكرار
      if(nameKey&&seenSpouseIds.has('n:'+nameKey))return false;
      if(idKey&&seenSpouseIds.has('i:'+idKey))return false;
      // أضف كليهما للمجموعة
      if(nameKey)seenSpouseIds.add('n:'+nameKey);
      if(idKey)seenSpouseIds.add('i:'+idKey);
      return true;
    });
    let spChips=deduped.map(s=>{
      // بناء تسمية الزوج: الاسم + اللقب إن وُجد
      let lp=(s.personId&&getPerson(s.personId))||(s.relativeId&&getPerson(s.relativeId))||null;
      let spFamilyName=s.familyName||(lp?lp.familyName:'')||'';
      let displayName=s.name+(spFamilyName?' '+spFamilyName:'');
      let badges='';
      if(s.deceased)badges+=`<span class="dot-deceased-spouse" title="${s.gender==='female'?'رحمها الله':'رحمه الله'}">${crescent('#2e7d32')}</span>`;
      if(s.divorced)badges+=`<span class="status-dot dot-divorced" title="مطلق/ة">م</span>`;
      if(lp){
        let hasRealTree=lp.parentId||getChildrenForNode(lp.id).length>0;
        // شخص من داخل العائلة (غير خارجي) → 🔗 مع انتقال مباشر
        if(!lp.isExternal){
          return `<span class="spouse-chip-linked" title="انتقل إلى ${displayName} في الشجرة" onclick="event.stopPropagation();navigateToPerson(${lp.id})">🔗 ${displayName}${badges}</span>`;
        }
        // شخص خارجي لديه شجرة → 🌳
        if(hasRealTree||s.forceTreeBtn){
          return `<span class="sp-tree-nav" title="فتح شجرة عائلة ${displayName}" onclick="event.stopPropagation();navigateToSpouseFamily(${lp.id})">🌳 ${displayName}${badges}</span>`;
        }
        return `<span class="spouse-chip">${displayName}${badges}</span>`;
      }
      return `<span class="spouse-chip">${displayName}${badges}</span>`;
    }).join('<span class="node-meta" style="opacity:.4"> · </span>');
    spInfo=(spInfo?spInfo+'<span class="node-meta" style="opacity:.4"> · </span>':'')+spChips;
  }
  // إشارة صغيرة للأبناء المنقولين لشجرة الأب
  if(_migratedCount>0){
    let migBadge=`<span style="font-size:10px;color:#7c3aed;background:#ede9fe;border:1px solid #c4b5fd;border-radius:4px;padding:1px 5px;flex-shrink:0;cursor:pointer" title="لديها ${_migratedCount} ابن/ابنة في شجرة أزواجها" onclick="event.stopPropagation();showPersonDetail(${p.id})">🌿 ${_migratedCount}</span>`;
    spInfo=(spInfo?spInfo+' ':'')+migBadge;
  }
  let meta='';
  if(p.dob)meta+=`<span class="node-meta">م.${p.dob.split('-')[0]}</span> `;
  if(p.dod)meta+=`<span class="node-meta">و.${p.dod.split('-')[0]}</span>`;

  // ── وضع الجوال: تبسيط الواجهة ──
  let isMob=document.body.classList.contains('mobile-mode');
  let togOnClick=isMob?`toggleNodeMobile(${p.id})`:`toggleNode(${p.id})`;
  let tog=hasChildren?`<button class="toggle-btn" onclick="event.stopPropagation();${togOnClick}">${isExp?'−':'+'}</button>`:'<div style="width:18px"></div>';
  // الجوال: النقر على البطاقة يفتح بيانات الشخص؛ زر ± فقط للتوسيع
  let hdrOnClick=isMob?`showPersonDetail(${p.id})`:`selectNode(event,${p.id})`;

  // ── وضع الجوال: لا أزرار في البطاقة — كل الإجراءات في نافذة البيانات (تفتح بالنقر) ──
  let actionsHtml=isMob
    ?'' // الجوال: بطاقة نظيفة بالكامل
    :`<div class="node-actions" onclick="event.stopPropagation()">
        <button class="act-btn" onclick="openEditModal(${p.id})" title="تعديل">✏</button>
        <button class="act-btn" onclick="openAddModal(${p.id})" title="إضافة ابن">+</button>
        ${hasChildren?`<button class="act-btn" onclick="openReorderModal(${p.id})" title="ترتيب الأبناء">⇅</button>`:''}
        <button class="act-btn" style="color:#ef4444" onclick="deletePerson(${p.id})" title="حذف">✕</button>
      </div>`;

  // الجوال: نقرة = بيانات الشخص | الديسكتوب: نقرة = toggle
  let html=`<div class="node" data-person-id="${p.id}"><div class="${hCls}" onclick="${hdrOnClick}">
    ${tog}${av}${gDot}
    <div style="flex:1;min-width:0;overflow:hidden;">
      <div style="display:flex;align-items:center;gap:5px;flex-wrap:wrap;"><span class="node-name" onclick="${nameOnClick}" style="cursor:pointer;">${p.title?`<span>${escapeHtml(p.title)} </span>`:''}<span>${highlightQueryHTML(p.name,q)}</span></span>${p.familyName?`<span style="font-size:11px;color:var(--text2);background:var(--color-background-secondary,#f9fafb);border:1px solid var(--card-border);border-radius:4px;padding:1px 6px;flex-shrink:0">${highlightQueryHTML(p.familyName,q)}</span>`:''}${isActive?`<span style="font-size:10px;font-weight:700;color:#92400e;background:#fef3c7;border:1px solid #fbbf24;border-radius:999px;padding:1px 6px;flex-shrink:0">الحالي</span>`:''}${extFatherBadge}${decIcon}${relB}${spInfo}${kinBadge}</div>
      <div>${meta}</div>
    </div>
    ${actionsHtml}
  </div>`;
  if(isExp&&hasChildren){html+=`<div class="node-children">`;children.forEach(c=>{html+=renderNode(c,q,matchIds,contextIds||new Set());});html+=`</div>`;}
  html+=`</div>`;return html;
}
function showRelInfo(id,pairNum){
  let pairIdx=pairNum-1;
  if(pairIdx<0||pairIdx>=relPairs.length)return;
  let pair=relPairs[pairIdx];
  let otherId=pair.find(x=>x!==id);
  let op=getPerson(otherId),p=getPerson(id);
  let opChain=getAncestorLabel(otherId);
  let modal=`<div class="modal-overlay" onclick="if(event.target===this)closeModal()">
  <div class="modal" style="max-width:360px;">
    <h3 style="font-size:14px;margin-bottom:12px;">زواج قريب — رقم ${pairNum}</h3>
    ${row('الشخص',p?p.name:'؟')}
    ${row('متزوج من',`<span style="color:#ef4444;font-weight:500">${op?op.name:'؟'}</span>`)}
    ${row('نسب القريب',opChain)}
    <div class="modal-footer" style="margin-top:12px;">
      <button class="btn" onclick="closeModal()">إغلاق</button>
      ${op?`<button class="btn primary" onclick="closeModal();navigateToPerson(${op.id})">الانتقال إليه في الشجرة ↗</button>`:''}
    </div>
  </div></div>`;
  document.getElementById('modalContainer').innerHTML=modal;
  _androidBackGuardModalOpen();
}
function navigateToPerson(id){
  _pushAndroidTreeSnapshot();
  let targetP=getPerson(id);
  if(!targetP)return;

  // ── الأشخاص الخارجيون: انتقل لشجرتهم مباشرة ──
  if(targetP.isExternal){
    navigateToSpouseFamily(id);
    return;
  }

  // ── تحقق هل الشخص ينتمي للشجرة الحالية ──
  // اجمع جذر الشخص (الأعلى في سلسلة parentId)
  let personRoot=targetP;
  while(personRoot.parentId&&getPerson(personRoot.parentId))
    personRoot=getPerson(personRoot.parentId);

  // إذا كان هناك فلتر عائلة وجذر الشخص لا ينتمي إليه → انتقل لشجرته
  if(currentFamilyFilter&&personRoot.id!==currentFamilyFilter.rootId){
    navigateToSpouseFamily(id);
    return;
  }
  // إذا لم يكن هناك فلتر، لكن الشخص جذره خارج الجذور الرئيسية
  if(!currentFamilyFilter){
    let mainRootIds=new Set(getRoots(false).map(r=>r.id));
    if(!mainRootIds.has(personRoot.id)){
      // الشخص ينتمي لشجرة منفصلة — انتقل إليها
      navigateToSpouseFamily(id);
      return;
    }
  }

  // ── اجمع كل الأسلاف (الجذر → الشخص) ──
  let ancestorSet=new Set();
  function collectAncestors(pid){
    let p=getPerson(pid);if(!p)return;
    if(p.parentId){ancestorSet.add(p.parentId);collectAncestors(p.parentId);}
  }
  collectAncestors(id);

  // ── أغلق الجميع أولاً، ثم افتح الأسلاف (السلالة) فقط ──
  people.forEach(p=>expanded[p.id]=false);
  ancestorSet.forEach(pid=>expanded[pid]=true);
  expanded[id]=false; // الشخص نفسه: لا تفتح أبناءه

  document.querySelectorAll('.tab').forEach(t=>t.classList.remove('active'));
  document.querySelectorAll('.tab')[0].classList.add('active');
  document.getElementById('treePanel').classList.add('active');
  document.getElementById('listPanel').classList.remove('active');
  document.getElementById('kinPanel').classList.remove('active');
  renderAll();
  // تمييز سريع بدون وميض مطوّل
  requestAnimationFrame(()=>{
    setTimeout(()=>{
      let el=document.querySelector(`[data-person-id="${id}"]`);
      if(el){
        el.scrollIntoView({behavior:'smooth',block:'center'});
        let hdr=el.querySelector('.node-header');
        if(hdr){
          hdr.style.transition='background .1s';
          hdr.style.background='#fef9c3';
          setTimeout(()=>{hdr.style.transition='background .4s';hdr.style.background='';},600);
        }
      }
    },80);
  });
}
// Navigate back to main tree and highlight a specific person (used by external tree wife-links)
function navigateToMainForPerson(personId){
  _pushAndroidTreeSnapshot();
  navStack=[];currentFamilyFilter=null;
  renderAll();
  setTimeout(()=>{
    // ── أغلق الجميع، ثم افتح الأسلاف فقط ──
    people.forEach(p=>expanded[p.id]=false);
    function expandUp(pid){let p=getPerson(pid);if(!p)return;if(p.parentId){expanded[p.parentId]=true;expandUp(p.parentId);}}
    expandUp(personId);
    expanded[personId]=false; // لا تفتح أبناءه
    renderAll();
    setTimeout(()=>{
      let el=document.querySelector(`[data-person-id="${personId}"]`);
      if(el){
        el.scrollIntoView({behavior:'smooth',block:'center'});
        let hdr=el.querySelector('.node-header');
        if(hdr){
          hdr.style.transition='background .1s';
          hdr.style.background='#fce7f3';
          setTimeout(()=>{hdr.style.transition='background .4s';hdr.style.background='';},700);
        }
      }
    },100);
  },100);
}
// ── ترتيب قائمة الأفراد ──
let listSortMode='tree'; // 'tree' | 'alpha'
let listSearchTerm='';
let listFilterMode='all'; // all | male | female | deceased | married | hasChildren | noChildren
let _listSearchTimer=null;

function _scheduleListRender(delay=120){
  if(_listSearchTimer) clearTimeout(_listSearchTimer);
  _listSearchTimer=setTimeout(()=>{
    _listSearchTimer=null;
    renderList();
  },delay);
}

function setListSearch(val, immediate){
  listSearchTerm=(val||'').trim();
  if(immediate) renderList();
  else _scheduleListRender();
}

function clearListSearch(){
  listSearchTerm='';
  let sb=document.getElementById('listSearchBox');
  if(sb)sb.value='';
  renderList();
}

function setListFilter(mode){
  listFilterMode=mode;
  renderList();
}

function _personHasSpouse(p){
  return !!(p&&((p.spouses&&p.spouses.length)||p.spouseId||p.spouseName));
}

function _personListFilterPass(p){
  switch(listFilterMode){
    case 'male': return p.gender==='male';
    case 'female': return p.gender==='female';
    case 'deceased': return !!p.deceased;
    case 'married': return _personHasSpouse(p);
    case 'hasChildren': return getChildrenForNode(p.id).length>0;
    case 'noChildren': return getChildrenForNode(p.id).length===0;
    default: return true;
  }
}

function _listSearchMatchScore(p,q){
  if(!q) return 0;
  let score=0;
  let fields=[
    p.name||'',
    p.familyName||'',
    p.title||'',
    p.fatherName||'',
    p.motherName||'',
    p.nickName||'',
    p.notes||''
  ];
  let hay=fields.join(' ').toLowerCase();
  if(hay.includes(q)) score+=10;
  if((p.name||'').toLowerCase().startsWith(q)) score+=8;
  if((p.familyName||'').toLowerCase().startsWith(q)) score+=5;
  if((p.title||'').toLowerCase().includes(q)) score+=3;
  return score;
}

function _getListCandidates(){
  let filtered=people.filter(_personListFilterPass);
  let q=listSearchTerm.toLowerCase();
  let treeOrder=getTreeOrderedList();
  let orderMap=new Map(treeOrder.map((p,i)=>[p.id,i]));

  if(q){
    filtered=filtered.filter(p=>matchesFullName(p,q)||((p.familyName||'')+' '+(p.title||'')+' '+(p.notes||'')).toLowerCase().includes(q));
  }

  if(listSortMode==='alpha'){
    filtered.sort((a,b)=>{
      let an=(a.name||'').localeCompare(b.name||'','ar');
      if(an) return an;
      return (a.familyName||'').localeCompare(b.familyName||'','ar');
    });
  }else if(q){
    filtered.sort((a,b)=>{
      let d=_listSearchMatchScore(b,q)-_listSearchMatchScore(a,q);
      if(d) return d;
      return (orderMap.get(a.id)??999999)-(orderMap.get(b.id)??999999);
    });
  }else{
    let idSet=new Set(filtered.map(p=>p.id));
    filtered=treeOrder.filter(p=>idSet.has(p.id));
  }
  return filtered;
}

function getTreeOrderedList(){
  if(_treeOrderCache)return _treeOrderCache;
  let order=[];
  let visited=new Set();
  let roots=people.filter(p=>!p.parentId).sort((a,b)=>(a.sortOrder||0)-(b.sortOrder||0));
  let queue=[...roots];
  while(queue.length){
    let p=queue.shift();
    if(visited.has(p.id))continue;
    visited.add(p.id);
    order.push(p);
    let ch=getChildrenForNode(p.id);
    if(ch&&ch.length) queue.unshift(...ch);
  }
  people.forEach(p=>{if(!visited.has(p.id))order.push(p);});
  _treeOrderCache=order;
  return order;
}

function deletePersonConfirmed(id){
  let p=getPerson(id);if(!p)return;
  people.forEach(ch=>{if(ch.parentId===id)ch.parentId=p.parentId||null;});
  people.forEach(other=>{
    if(other.spouses)other.spouses=other.spouses.filter(s=>s.personId!==id&&s.relativeId!==id);
  });
  removeRelPairsForPerson(id);
  people=people.filter(pp=>pp.id!==id);
  if(myPersonId===id){myPersonId=null;saveMyPerson();}
  _invalidateAll(); // إعادة بناء الفهارس بعد الحذف
  closeModal();saveData();renderAll();
}

function confirmDeleteFromList(id){
  let p=getPerson(id);if(!p)return;
  let childCount=getChildrenForNode(id).length;
  let warn=childCount?`\n⚠️ لديه/ا ${childCount} ابن/ابنة — سيُعاد ربطهم بالجد.`:'';
  if(!confirm(`حذف "${p.name}"؟${warn}\nهذا الإجراء لا يمكن التراجع عنه.`))return;
  deletePersonConfirmed(id);
}

function renderList(){
  let panel=document.getElementById('listPanel');
  if(!panel) return;

  // حفظ حالة الكتابة حتى لا يختفي المؤشر بعد إعادة الرسم
  let prevInput=document.getElementById('listSearchBox');
  let keepFocus=!!(prevInput&&document.activeElement===prevInput);
  let selStart=keepFocus?prevInput.selectionStart:null;
  let selEnd=keepFocus?prevInput.selectionEnd:null;

  let base=_getListCandidates();
  let activeCount=base.length;
  let totalCount=people.filter(_personListFilterPass).length;
  let sortBar=`<div class="list-sort-bar">
    <span style="font-size:12px;color:var(--text2)">ترتيب:</span>
    <button class="btn${listSortMode==='tree'?' primary':''}" onclick="listSortMode='tree';renderList()">🌳 الشجرة</button>
    <button class="btn${listSortMode==='alpha'?' primary':''}" onclick="listSortMode='alpha';renderList()">أ-ي أبجدي</button>
    <button class="btn${listSearchTerm?' primary':''}" onclick="if(listSearchTerm){listSortMode='tree';renderList()}">✨ المطابقة</button>
    <span class="meta">${activeCount} نتيجة</span>
  </div>`;

  let filterBtns=[
    ['all','الكل'],
    ['male','ذكور'],
    ['female','إناث'],
    ['deceased','متوفون'],
    ['married','متزوجون'],
    ['hasChildren','لديهم أبناء'],
    ['noChildren','بلا أبناء']
  ].map(([k,l])=>`<button class="list-filter-btn${listFilterMode===k?' active':''}" onclick="setListFilter('${k}')">${l}</button>`).join('');

  let searchVal=listSearchTerm?listSearchTerm:'';
  let html=`<div class="list-tools">
    <div class="list-title">
      <span class="title-badge">👥 قائمة الأفراد</span>
      <span class="title-text">بحث مستقل داخل القائمة</span>
    </div>
    <div class="list-search-row">
      <div class="list-search-box">
        <input id="listSearchBox" type="text" value="${searchVal.replace(/"/g,'&quot;')}" placeholder="ابحث بالاسم، اللقب، الأب، الأم، أو الملاحظات..." oninput="setListSearch(this.value,false)" />
        <button id="listVoice" class="field-mic-btn" title="بحث صوتي" onclick="startFieldVoice('listSearchBox',v=>{setListSearch(v,true)},'listVoice')">🎤</button>
        ${listSearchTerm?`<button class="list-search-clear" onclick="clearListSearch()" title="مسح البحث">✕</button>`:''}
      </div>
      <button class="btn" onclick="clearListSearch()" style="font-size:11px;padding:8px 12px;white-space:nowrap">مسح</button>
    </div>
    <div class="list-quick-filters">${filterBtns}</div>
    ${sortBar}
  </div>`;

  let bodyHtml='';
  const LIST_CHUNK=60; // عدد الصفوف المرئية المبدئية
  if(!base.length){
    let msg=listSearchTerm||listFilterMode!=='all'
      ?'لا توجد نتائج مطابقة للفلاتر الحالية'
      :'لا توجد نتائج';
    bodyHtml=`<div class="no-results">${msg}</div>`;
  } else {
    let visible=base.slice(0,LIST_CHUNK);
    let remainder=base.length-visible.length;
    let out='<div class="person-list">';
    visible.forEach(p=>{
      let myKin=myPersonId&&myPersonId!==p.id?getMyKinship(p.id):null;
      let myKinLine=myKin?(()=>{
        let parts=[];
        if(myKin.blood)parts.push(`<span style="color:#1d4ed8;font-weight:500">${myKin.blood.label}</span><span style="font-size:9px;color:#1d4ed8;background:#dbeafe;border-radius:3px;padding:0 3px;margin-right:2px">نسب</span>`);
        if(myKin.marriage)parts.push(`<span style="color:#5b21b6;font-weight:500">💍${myKin.marriage.label}</span><span style="font-size:9px;color:#5b21b6;background:#ede9fe;border-radius:3px;padding:0 3px;margin-right:2px">مصاهرة</span>`);
        if(!parts.length)parts.push(`<span style="color:#7c3aed;font-weight:500">${myKin.label}</span>`);
        return `<div style="font-size:11px;margin-top:3px;display:flex;align-items:center;gap:4px;flex-wrap:wrap"><span style="color:#7c3aed">🔗</span>${parts.join('<span style="color:var(--text2);margin:0 2px">·</span>')}</div>`;
      })():(myPersonId===p.id?`<div style="font-size:11px;margin-top:3px"><span class="my-marker">أنا</span></div>`:'');
      let fl=getFullLineageLabel(p);
      out+=`<div class="person-card${p.deceased?' deceased':''}" style="position:relative">
        <div class="list-card-top">
          <div class="list-card-main" onclick="showPersonDetail(${p.id})" style="cursor:pointer">
            <h4 style="display:flex;align-items:center;gap:5px;flex-wrap:wrap;padding-left:28px">${p.title?`<span style="font-weight:500;color:var(--text2)">${p.title}</span> `:''}<span>${p.name}</span>${p.familyName?`<span style="font-size:11px;font-weight:400;color:var(--text2);background:var(--color-background-secondary,#f9fafb);border:1px solid var(--card-border);border-radius:4px;padding:1px 5px">${p.familyName}</span>`:''} ${p.deceased?`<span style="display:inline-flex">${crescent('#2e7d32')}</span>`:''}</h4>
            <p style="padding-left:28px">${p.gender==='male'?'ذكر':'أنثى'}${fl?' · '+fl:''}</p>
            ${myKinLine}
            <div class="list-card-actions">
              <button class="list-go-tree" onclick="event.stopPropagation();switchTab('tree',document.querySelectorAll('.tab')[0]);navigateToPerson(${p.id});" title="الانتقال إلى الشجرة">🌳 عرض في الشجرة</button>
            </div>
          </div>
          <button class="list-card-delete" onclick="event.stopPropagation();confirmDeleteFromList(${p.id})" title="حذف" style="background:none;border:none;cursor:pointer;font-size:14px;color:#ef4444;opacity:0.55;padding:2px 5px;border-radius:4px;line-height:1" onmouseover="this.style.opacity='1'" onmouseout="this.style.opacity='0.55'">🗑</button>
        </div>
      </div>`;
    });
    out+='</div>';
    if(remainder>0){
      out+=`<div id="listLoadMoreWrap" style="text-align:center;padding:14px 0">
        <button class="btn" onclick="_listLoadMore(${LIST_CHUNK})" style="padding:8px 22px;font-size:13px">
          ⬇ تحميل ${Math.min(remainder,LIST_CHUNK)} المزيد (${remainder} متبقٍ)
        </button>
      </div>`;
      // حفظ البيانات الكاملة للتحميل اللاحق
      window._listAllCandidates=base;
    } else {
      window._listAllCandidates=null;
    }
    bodyHtml=out;
  }

  panel.innerHTML=html+bodyHtml;

  if(keepFocus){
    requestAnimationFrame(()=>{
      let sb=document.getElementById('listSearchBox');
      if(sb){
        sb.focus();
        try{
          if(selStart!=null && selEnd!=null) sb.setSelectionRange(selStart,selEnd);
        }catch(e){}
      }
    });
  }
}
// تحميل المزيد من صفوف القائمة (chunked rendering)
function _listLoadMore(offset){
  let all=window._listAllCandidates;
  if(!all)return;
  const CHUNK=60;
  let list=document.querySelector('.person-list');
  let wrap=document.getElementById('listLoadMoreWrap');
  if(!list||!wrap)return;
  let next=all.slice(offset,offset+CHUNK);
  let fragment=document.createDocumentFragment();
  next.forEach(p=>{
    let myKin=myPersonId&&myPersonId!==p.id?getMyKinship(p.id):null;
    let myKinLine=myKin?(()=>{
      let parts=[];
      if(myKin.blood)parts.push(`<span style="color:#1d4ed8;font-weight:500">${myKin.blood.label}</span><span style="font-size:9px;color:#1d4ed8;background:#dbeafe;border-radius:3px;padding:0 3px;margin-right:2px">نسب</span>`);
      if(myKin.marriage)parts.push(`<span style="color:#5b21b6;font-weight:500">💍${myKin.marriage.label}</span><span style="font-size:9px;color:#5b21b6;background:#ede9fe;border-radius:3px;padding:0 3px;margin-right:2px">مصاهرة</span>`);
      if(!parts.length)parts.push(`<span style="color:#7c3aed;font-weight:500">${myKin.label}</span>`);
      return `<div style="font-size:11px;margin-top:3px;display:flex;align-items:center;gap:4px;flex-wrap:wrap"><span style="color:#7c3aed">🔗</span>${parts.join('<span style="color:var(--text2);margin:0 2px">·</span>')}</div>`;
    })():(myPersonId===p.id?`<div style="font-size:11px;margin-top:3px"><span class="my-marker">أنا</span></div>`:'');
    let fl=getFullLineageLabel(p);
    let div=document.createElement('div');
    div.className='person-card'+(p.deceased?' deceased':'');
    div.style.position='relative';
    div.innerHTML=`<div class="list-card-top">
      <div class="list-card-main" onclick="showPersonDetail(${p.id})" style="cursor:pointer">
        <h4 style="display:flex;align-items:center;gap:5px;flex-wrap:wrap;padding-left:28px">${p.title?`<span style="font-weight:500;color:var(--text2)">${p.title}</span> `:''}<span>${p.name}</span>${p.familyName?`<span style="font-size:11px;font-weight:400;color:var(--text2);background:var(--color-background-secondary,#f9fafb);border:1px solid var(--card-border);border-radius:4px;padding:1px 5px">${p.familyName}</span>`:''} ${p.deceased?`<span style="display:inline-flex">${crescent('#2e7d32')}</span>`:''}</h4>
        <p style="padding-left:28px">${p.gender==='male'?'ذكر':'أنثى'}${fl?' · '+fl:''}</p>
        ${myKinLine}
        <div class="list-card-actions">
          <button class="list-go-tree" onclick="event.stopPropagation();switchTab('tree',document.querySelectorAll('.tab')[0]);navigateToPerson(${p.id});" title="الانتقال إلى الشجرة">🌳 عرض في الشجرة</button>
        </div>
      </div>
      <button class="list-card-delete" onclick="event.stopPropagation();confirmDeleteFromList(${p.id})" title="حذف" style="background:none;border:none;cursor:pointer;font-size:14px;color:#ef4444;opacity:0.55;padding:2px 5px;border-radius:4px;line-height:1" onmouseover="this.style.opacity='1'" onmouseout="this.style.opacity='0.55'">🗑</button>
    </div>`;
    fragment.appendChild(div);
  });
  list.appendChild(fragment);
  let newOffset=offset+next.length;
  let remaining=all.length-newOffset;
  if(remaining>0){
    wrap.innerHTML=`<button class="btn" onclick="_listLoadMore(${newOffset})" style="padding:8px 22px;font-size:13px">
      ⬇ تحميل ${Math.min(remaining,CHUNK)} المزيد (${remaining} متبقٍ)
    </button>`;
  } else {
    wrap.remove();
    window._listAllCandidates=null;
  }
}

function toggleNode(id){expanded[id]=!expanded[id];renderTree();}
function selectNode(e,id){if(e.target.closest('.node-actions')||e.target.closest('.toggle-btn')||e.target.closest('.node-name'))return;expanded[id]=!expanded[id];renderTree();}
function deletePerson(id){confirmDeleteFromList(id);}
function row(label,val){return`<div class="detail-row"><span class="detail-label">${label}</span><span class="detail-val">${val}</span></div>`;}
function showPersonDetail(id){
  let p=getPerson(id);if(!p)return;
  let fl=getFullFatherLine(p);
  let mn=getMotherName(p);
  let brothers=getSiblingsMale(p);
  let sisters=getSiblingsFemale(p);
  let sons=getMaleChildren(p.id);
  let daughters=getFemaleChildren(p.id);
  let pu=getPaternalUncles(p);
  let pa=getPaternalAunts(p);
  let mu=getMaternalUncles(p);
  let ma=getMaternalAunts(p);
  let rns=getRelNums(p.id);
  // relHtml أُزيل — المعلومة تظهر الآن على رقاقة اسم الزوج/ة مباشرةً
  let relHtml='';
  let seenDetailIds=new Set();
  // ── جمع قائمة الأزواج الكاملة ──
  // للذكر: من p.spouses مباشرةً
  // للأنثى: من p.spouses + البحث عن أي ذكر يشير إليها عبر personId في spouses
  let spouseEntries=p.spouses.filter(s=>{
    let nameKey=normalizeAr(s.name||'');
    let idKey=s.personId||s.relativeId||null;
    if(nameKey&&seenDetailIds.has('n:'+nameKey))return false;
    if(idKey&&seenDetailIds.has('i:'+idKey))return false;
    if(nameKey)seenDetailIds.add('n:'+nameKey);
    if(idKey)seenDetailIds.add('i:'+idKey);
    return true;
  });
  if(p.gender==='female'){
    // ابحث عن أزواج ذكور يشيرون لهذه البنت عبر personId
    people.forEach(male=>{
      if(male.gender!=='male'||!male.spouses)return;
      male.spouses.forEach(ms=>{
        if(ms.personId!==p.id&&ms.relativeId!==p.id)return;
        let nameKey=normalizeAr(male.name||'');
        let idKey=male.id;
        if(seenDetailIds.has('i:'+idKey)||seenDetailIds.has('n:'+nameKey))return;
        seenDetailIds.add('i:'+idKey);seenDetailIds.add('n:'+nameKey);
        // أنشئ entry بجانب personId الزوج
        spouseEntries.push({
          name:male.name,familyName:male.familyName||'',
          gender:'male',deceased:male.deceased||false,
          divorced:ms.divorced||false,dob:male.dob||'',
          personId:male.id,isExternal:male.isExternal||false,
          forceTreeBtn:true
        });
      });
    });
  }
  let spouseLabel=p.gender==='male'?'الزوجة':'الزوج';
  const ordinals=['الأولى','الثانية','الثالثة','الرابعة','الخامسة'];
  const ordinalsM=['الأول','الثاني','الثالث','الرابع','الخامس'];
  let spHtml=spouseEntries.length?spouseEntries.map((s,i)=>{
    let label=spouseEntries.length>1
      ?(p.gender==='male'
        ?'الزوجة '+(ordinals[i]||'('+(i+1)+')')
        :'الزوج '+(ordinalsM[i]||'('+(i+1)+')'))
      :spouseLabel;
    let lp=(s.personId&&getPerson(s.personId))||(s.relativeId&&getPerson(s.relativeId))||null;
    let spFN=s.familyName||(lp?lp.familyName:'')||'';
    let fullSpName=s.name+(spFN?' '+spFN:'');
    let b='';
    if(s.divorced)b+=`<span class="status-dot dot-divorced" style="margin-right:4px">مطلق/ة</span>`;
    if(s.deceased)b+=`<span style="display:inline-flex;align-items:center">${crescent('#2e7d32')}</span>`;
    let treeBtn='';
    if(lp){
      let hasRealTree=lp.parentId||getChildrenForNode(lp.id).length>0;
      if(!lp.isExternal){
        treeBtn=`<button class="btn" style="font-size:11px;padding:2px 8px;border-color:#8b5cf6;color:#7c3aed;margin-right:6px" onclick="closeModal();navigateToPerson(${lp.id})">🔗 عرض في الشجرة</button>`;
      } else if(hasRealTree||s.forceTreeBtn){
        treeBtn=`<button class="btn" style="font-size:11px;padding:2px 8px;border-color:#8b5cf6;color:#7c3aed;margin-right:6px" onclick="closeModal();navigateToSpouseFamily(${lp.id})">🌳 فتح شجرته/ا</button>`;
      }
    }
    return row(label,`<span style="display:flex;align-items:center;gap:4px;flex-wrap:wrap;">${fullSpName}${b}${treeBtn}</span>`);
  }).join(''):'';
  let sonsHtml='',daughtersHtml='';
  if(p.spouses.length>1){
    p.spouses.forEach(sp=>{let sc=sons.filter(c=>c.motherName===sp.name);if(sc.length)sonsHtml+=row(`أبناء ${sp.name}`,sc.map(c=>c.name).join('، '));});
    let noMother=sons.filter(c=>!c.motherName||!p.spouses.some(s=>s.name===c.motherName));
    if(noMother.length)sonsHtml+=row('أبناء (أم غير محددة)',noMother.map(c=>c.name).join('، '));
    p.spouses.forEach(sp=>{let dc=daughters.filter(c=>c.motherName===sp.name);if(dc.length)daughtersHtml+=row(`بنات ${sp.name}`,dc.map(c=>c.name).join('، '));});
    let noMotherD=daughters.filter(c=>!c.motherName||!p.spouses.some(s=>s.name===c.motherName));
    if(noMotherD.length)daughtersHtml+=row('بنات (أم غير محددة)',noMotherD.map(c=>c.name).join('، '));
  } else {
    if(sons.length)sonsHtml=row(`الأبناء (${sons.length})`,sons.map(c=>c.name).join('، '));
    if(daughters.length)daughtersHtml=row(`البنات (${daughters.length})`,daughters.map(c=>c.name).join('، '));
  }
  let rBadges=''; // أُزيلت أرقام القرابة — لم تعد تُعرض
  // ── قيم محسوبة مسبقاً لتجنب تعارض الـ template ──
  let _detailNameEsc=p.name.replace(/'/g,"&#39;");
  let _detailBorderColor=p.gender==='male'?'#3b82f6':'#ec4899';
  let _detailPhotoHtml=p.photo
    ?`<div style="text-align:center;margin-bottom:14px"><img src="${p.photo}"
        onclick="zoomPhoto('${p.photo}','${_detailNameEsc}')"
        style="width:96px;height:96px;border-radius:50%;object-fit:cover;cursor:pointer;border:3px solid ${_detailBorderColor};box-shadow:0 4px 16px rgba(0,0,0,.15);transition:transform .15s"
        onmouseover="this.style.transform='scale(1.06)'" onmouseout="this.style.transform=''"></div>`
    :'';
  let _detailH3Align=p.photo?'justify-content:center;text-align:center':'';
  let modal=`<div class="modal-overlay" onclick="if(event.target===this)closeModal()">
  <div class="modal detail-modal">
    ${_detailPhotoHtml}
    <h3 style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;${_detailH3Align}">${p.title?`<span style="font-weight:500;color:var(--text2);font-size:inherit">${p.title}</span> `:''}<span>${p.name}</span>${p.deceased?`<span style="display:inline-flex">${crescent('#2e7d32')}</span>`:''}${rBadges}</h3>
    ${p.title?row('اللقب الشرفي',`<span style="font-weight:600;color:#5b21b6;background:#ede9fe;padding:2px 10px;border-radius:8px;border:1px solid #c4b5fd">${p.title}</span>`):''}
    ${row('الجنس',p.gender==='male'?'ذكر':'أنثى')}
    ${p.familyName?row('اللقب / العائلة',`<span style="font-weight:600;color:var(--text)">${p.familyName}</span>`):''}
    ${p.dob?row('تاريخ الولادة',p.dob):''}
    ${p.deceased&&p.dod?row('تاريخ الوفاة',p.dod):''}
    ${p.deceased?row('الحالة',`<span style="color:#2e7d32;display:flex;align-items:center;gap:4px;">${p.gender==='female'?'متوفية — رحمها الله':'متوفى — رحمه الله'} ${crescent('#2e7d32')}</span>`):''}
    ${(()=>{
      // Children under a female parent: show her as mother, father from fatherId or fatherName
      if(isChildUnderMother(p)){
        let motherPerson=getPerson(p.parentId);
        let motherChain=motherPerson?getAncestorChain(motherPerson):[];
        let motherFull=motherPerson?(motherPerson.name+(motherChain.length?' بنت '+motherChain.join(' بن '):'')):'';
        let fatherDisplay='';
        if(p.fatherId){
          let fp=getPerson(p.fatherId);
          if(fp){
            let fc=getAncestorChain(fp);
            fatherDisplay=fp.name+(fc.length?' بن '+fc.join(' بن '):'')+
                          (fp.familyName?' ('+fp.familyName+')':'');
          }
        } else if(p.fatherName){
          fatherDisplay=p.fatherName;
        } else if(p.externalFatherName){
          fatherDisplay=p.externalFatherName;
        }
        return row('الأم', motherFull)
              +(fatherDisplay?row('الأب',`<span style="display:flex;align-items:center;gap:6px;">${fatherDisplay}${p.fatherId?`<button class="btn" style="font-size:10px;padding:1px 6px;border-color:#8b5cf6;color:#7c3aed" onclick="closeModal();navigateToSpouseFamily(${p.fatherId})">🌳 شجرته</button>`:''}</span>`):'');
      } else {
        let fatherFull=fl||'';
        return (fatherFull?row('الأب',fatherFull):'')+(mn?row('الأم',mn):'');
      }
    })()}
    ${(()=>{
      // 1. أبناء مباشرون تحتها (نمط قديم — parentId = p.id وهي أنثى)
      let extChildren=people.filter(x=>x.parentId===p.id&&isChildUnderMother(x));
      // 2. أبناء منقولون لشجرة الأب (motherId = p.id)
      let migratedChildren=people.filter(x=>x.motherId===p.id&&x.parentId!==p.id);
      // دمج + إزالة تكرار
      let allLinked=[...extChildren];
      migratedChildren.forEach(ch=>{if(!allLinked.find(x=>x.id===ch.id))allLinked.push(ch);});
      if(!allLinked.length)return '';
      // تجميع حسب الأب
      let grouped={};
      allLinked.forEach(ch=>{
        let fp=ch.fatherId?getPerson(ch.fatherId):(ch.parentId!==p.id?getPerson(ch.parentId):null);
        let key=fp?fp.name:(ch.fatherName||ch.externalFatherName||'غير محدد');
        let fid=fp?fp.id:(ch.parentId!==p.id?ch.parentId:null);
        if(!grouped[key])grouped[key]={children:[],fatherId:fid};
        grouped[key].children.push(ch);
      });
      return Object.entries(grouped).map(([fname,data])=>{
        let navBtn=data.fatherId?`<button class="btn" style="font-size:10px;padding:1px 6px;border-color:#8b5cf6;color:#7c3aed;margin-right:6px" onclick="closeModal();navigateToSpouseFamily(${data.fatherId})">🌳 شجرة الأب</button>`:'';
        let sons=data.children.filter(x=>x.gender==='male');
        let daus=data.children.filter(x=>x.gender==='female');
        let parts=[];
        if(sons.length)parts.push('أبناء: '+sons.map(x=>x.name).join('، '));
        if(daus.length)parts.push('بنات: '+daus.map(x=>x.name).join('، '));
        return row(`أبناء من ${fname}`,`<span style="display:flex;align-items:center;gap:4px;flex-wrap:wrap;">${parts.join(' — ')} ${navBtn}</span>`);
      }).join('');
    })()}
    ${relHtml}${spHtml}
    ${brothers.length?row(`الإخوة (${brothers.length})`,brothers.map(s=>s.name).join('، ')):''}
    ${sisters.length?row(`الأخوات (${sisters.length})`,sisters.map(s=>s.name).join('، ')):''}
    ${sonsHtml}${daughtersHtml}
    ${pu.length?row(`الأعمام (${pu.length})`,pu.map(u=>u.name).join('، ')):''}
    ${pa.length?row(`العمات (${pa.length})`,pa.map(u=>u.name).join('، ')):''}
    ${mu.length?row(`الأخوال (${mu.length})`,mu.map(u=>u.name).join('، ')):''}
    ${ma.length?row(`الخالات (${ma.length})`,ma.map(u=>u.name).join('، ')):''}
    ${p.notes?row('ملاحظات',p.notes):''}
    ${(()=>{
      if(!myPersonId||myPersonId===p.id)return '';
      let kin=getMyKinship(p.id);
      if(!kin)return '';
      let badgeCls=kinBadgeClass(kin);
      let badgeStyle=badgeCls==='direct'?'background:#d1fae5;border-color:#6ee7b7;color:#065f46':badgeCls==='close'?'background:#ede9fe;border-color:#c4b5fd;color:#5b21b6':'background:#fef3c7;border-color:#f59e0b;color:#92400e';
      let typeTag=kin.blood&&kin.marriage?'نسب + مصاهرة':kin.blood?'نسب':'مصاهرة';
      return `<div style="margin-top:8px;padding:10px 12px;background:linear-gradient(135deg,#ede9fe,#faf5ff);border:1px solid #8b5cf6;border-radius:10px;display:flex;align-items:center;gap:10px;cursor:pointer;transition:all .15s;" onclick="openKinPopup(${p.id})" title="اضغط لعرض شجرة القرابة الكاملة">
        <span style="font-size:20px;flex-shrink:0">🔗</span>
        <div style="flex:1;min-width:0">
          <div style="font-size:12px;font-weight:700;color:#5b21b6">صلة القرابة بي</div>
          <div style="font-size:13px;font-weight:600;color:var(--text);margin-top:2px">${kin.label}</div>
        </div>
        <div style="display:flex;flex-direction:column;align-items:flex-end;gap:4px;flex-shrink:0">
          <span style="font-size:10px;padding:2px 7px;border-radius:8px;border:1px solid;${badgeStyle}">${typeTag}</span>
          <span style="font-size:10px;color:#7c3aed;background:#fff;border:1px solid #c4b5fd;border-radius:6px;padding:1px 7px">↗ عرض الشجرة</span>
        </div>
      </div>`;
    })()}
    ${myPersonId===p.id?`<div class="kin-mini-tree"><div class="kmt-title">👤 هذا أنت في الشجرة</div></div>`:''}
    <div class="modal-footer" style="flex-wrap:wrap;gap:6px;">
      <button class="btn" onclick="closeModal()">إغلاق</button>
      <button class="btn" onclick="closeModal();navigateToPerson(${p.id})">🌳 الشجرة</button>
      <button class="btn primary" onclick="closeModal();openEditModal(${p.id})">✏️ تعديل</button>
      <button class="btn" style="background:#ede9fe;border-color:#8b5cf6;color:#5b21b6" onclick="closeModal();openAddModal(${p.id})">➕ إضافة ابن</button>
      ${getChildrenForNode(p.id).length?`<button class="btn" onclick="closeModal();openReorderModal(${p.id})">⇅ ترتيب</button>`:''}
      <button class="btn" style="color:#ef4444;border-color:#fca5a5" onclick="closeModal();confirmDeleteFromList(${p.id})">🗑 حذف</button>
    </div>
  </div></div>`;
  document.getElementById('modalContainer').innerHTML=modal;
  _androidBackGuardModalOpen();
  // إخفاء الأزرار العائمة فوراً عند فتح نافذة البيانات
  if(window._updateFabMobileMode){
    setTimeout(()=>window._updateFabMobileMode(),50);
  }
}

