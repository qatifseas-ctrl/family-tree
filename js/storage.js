// ══════════════════════════════════════════════════════════
//  IndexedDB — التخزين الرئيسي (أكثر ثباتاً على الجوال)
// ══════════════════════════════════════════════════════════
const STORAGE_KEY='family_tree_data_v3';
const IDB_NAME='FamilyTreeDB';
const IDB_STORE='data';
const IDB_PHOTOS_STORE='photos';   // مخزن منفصل للصور — بدون حد الحجم
const IDB_KEY='main';
let _idb=null;

function _idbOpen(){
  return new Promise(function(resolve){
    try{
      // version=2 لإضافة مخزن الصور — onupgradeneeded يُنفَّذ مرة واحدة فقط
      var req=indexedDB.open(IDB_NAME,2);
      req.onupgradeneeded=function(e){
        var db=e.target.result;
        if(!db.objectStoreNames.contains(IDB_STORE))
          db.createObjectStore(IDB_STORE);
        if(!db.objectStoreNames.contains(IDB_PHOTOS_STORE))
          db.createObjectStore(IDB_PHOTOS_STORE);
      };
      req.onsuccess=function(e){_idb=e.target.result;resolve(true);};
      req.onerror=function(){resolve(false);};
    }catch(e){resolve(false);}
  });
}

// حفظ قاموس الصور {id: base64} في مخزن منفصل
function _idbSavePhotos(photosMap){
  return new Promise(function(resolve){
    try{
      if(!_idb){resolve(false);return;}
      var tx=_idb.transaction(IDB_PHOTOS_STORE,'readwrite');
      tx.objectStore(IDB_PHOTOS_STORE).put(photosMap,'__photos__');
      tx.oncomplete=function(){resolve(true);};
      tx.onerror=function(){resolve(false);};
    }catch(e){resolve(false);}
  });
}

// تحميل قاموس الصور من مخزنها المنفصل
function _idbLoadPhotos(){
  return new Promise(function(resolve){
    try{
      if(!_idb){resolve({});return;}
      var tx=_idb.transaction(IDB_PHOTOS_STORE,'readonly');
      var req=tx.objectStore(IDB_PHOTOS_STORE).get('__photos__');
      req.onsuccess=function(e){resolve(e.target.result||{});};
      req.onerror=function(){resolve({});};
    }catch(e){resolve({});}
  });
}

// استخراج الصور من people الحالية وحفظها في مخزنها المنفصل
async function _persistPhotosToIDB(){
  try{
    var photosMap={};
    people.forEach(function(p){if(p.photo)photosMap[p.id]=p.photo;});
    if(Object.keys(photosMap).length>0){
      await _idbSavePhotos(photosMap);
      console.log('[IDB] Persisted',Object.keys(photosMap).length,'photos to IDB photos store');
    }
  }catch(e){console.warn('[IDB] _persistPhotosToIDB failed',e);}
}

// دمج الصور المحفوظة في IDB مع people الحالية في الذاكرة
async function _mergePhotosFromIDB(){
  try{
    var photosMap=await _idbLoadPhotos();
    var count=0;
    people.forEach(function(p){
      if(!p.photo&&photosMap[p.id]){
        p.photo=photosMap[p.id];
        count++;
      }
    });
    if(count>0)console.log('[IDB] Restored',count,'photos from IDB photos store');
    return count;
  }catch(e){console.warn('[IDB] _mergePhotosFromIDB failed',e);return 0;}
}
function _idbSave(payload){
  return new Promise(function(resolve){
    try{
      if(!_idb){resolve(false);return;}
      var tx=_idb.transaction(IDB_STORE,'readwrite');
      tx.objectStore(IDB_STORE).put(payload,IDB_KEY);
      tx.oncomplete=function(){resolve(true);};
      tx.onerror=function(){resolve(false);};
    }catch(e){resolve(false);}
  });
}
function _idbLoad(){
  return new Promise(function(resolve){
    try{
      if(!_idb){resolve(null);return;}
      var tx=_idb.transaction(IDB_STORE,'readonly');
      var req=tx.objectStore(IDB_STORE).get(IDB_KEY);
      req.onsuccess=function(e){resolve(e.target.result||null);};
      req.onerror=function(){resolve(null);};
    }catch(e){resolve(null);}
  });
}
function _lsSave(payload){
  try{localStorage.setItem(STORAGE_KEY,JSON.stringify(payload));}catch(e){}
}
function _lsLoad(){
  try{
    var raw=localStorage.getItem(STORAGE_KEY);
    if(!raw)return null;
    var d=JSON.parse(raw);
    return(d&&d.people&&d.people.length)?d:null;
  }catch(e){return null;}
}

function saveData(){
  // ── الصور تُحفظ في مخزن IDB منفصل — لا تُضمَّن في payload الرئيسي ──
  // هذا يحل مشكلة: localStorage يفشل بصمت بسبب حجم الصور (5MB)
  // وIDB الرئيسي يبقى خفيفاً قابلاً للقراءة السريعة
  var peopleNoPhotos=people.map(function(p){
    if(!p.photo)return p;
    var c=Object.assign({},p);delete c.photo;return c;
  });
  var payload={people:peopleNoPhotos,relPairs:relPairs,nextId:nextId};

  // حفظ البيانات (بدون صور) في IDB و localStorage
  _idbSave(payload).catch(function(){});
  _lsSave(payload);

  // حفظ الصور منفصلةً في مخزن __photos__ — بدون قيود الحجم
  _persistPhotosToIDB().catch(function(){});

  showSaveToast();
  triggerFamilyUpload(); // ← الرفع الصامت (نسخة العائلة — لا إشعار)
  _fsaTriggerSave();     // ← كتابة مباشرة في الملف (File System Access API)
  _swInvalidateHtmlCache();
}
// يُزيل index.html من كاش الـ SW — يُشغَّل عند كل حفظ
// الـ SW سيعيد جلبه من الشبكة في المرة القادمة ويُخزّن النسخة الجديدة
function _swInvalidateHtmlCache(){
  try{
    if(!('caches' in window))return;
    caches.keys().then(function(names){
      names.forEach(function(name){
        caches.open(name).then(function(cache){
          // احذف index.html فقط — الأيقونات والـ manifest تبقى
          cache.delete(location.href).catch(function(){});
          cache.delete('./index.html').catch(function(){});
          cache.delete('index.html').catch(function(){});
        });
      });
    });
  }catch(e){}
}
function showSaveToast(){
  var t=document.getElementById('saveToast');
  if(!t)return;
  t.style.opacity='1';
  clearTimeout(window._toastTimer);
  window._toastTimer=setTimeout(function(){t.style.opacity='0';},1800);
}
// ══════════════════════════════════════════════════════════
//  File System Access API — كتابة مباشرة في الملف (الحل الأمثل للجوال)
// ══════════════════════════════════════════════════════════
let _fsaHandle=null;        // FileSystemFileHandle
let _fsaSaveTimer=null;
let _fsaSaving=false;
let _fsaEnabled=false;

// بناء HTML الكامل مع البيانات مضمّنة
function _buildSaveHTML(){
  var payload=JSON.stringify({people:people,relPairs:relPairs,nextId:nextId,myPersonId:myPersonId||null});
  var bytes=new TextEncoder().encode(payload);
  var bin='';bytes.forEach(function(b){bin+=String.fromCharCode(b);});
  var b64=btoa(bin);
  var dataTag='<scr'+'ipt id="__family_tree_data__" type="application/json">'+b64+'<\/sc'+'ript>';
  var htmlAttrs='';
  Array.from(document.documentElement.attributes).forEach(function(a){
    htmlAttrs+=' '+a.name+'="'+a.value.replace(/&/g,'&amp;').replace(/"/g,'&quot;')+'"';
  });
  var cleanAppHTML='';
  try{
    var tDoc=(new DOMParser()).parseFromString('<!DOCTYPE html>\n'+_HTML_TEMPLATE,'text/html');
    var tApp=tDoc.getElementById('app');
    if(tApp)cleanAppHTML=tApp.outerHTML;
  }catch(ex){}
  if(!cleanAppHTML)cleanAppHTML=document.getElementById('app').outerHTML;
  var mainSrc=document.scripts[document.scripts.length-1].textContent;
  // تضمين إعدادات السحابة
  if(CLOUD_CONFIG.KEY_HEX&&CLOUD_CONFIG.GITHUB_PAT){
    mainSrc=mainSrc.replace(/KEY_HEX:\s*'[^']*'/,"KEY_HEX: '"+CLOUD_CONFIG.KEY_HEX+"'")
                   .replace(/GITHUB_PAT:\s*'[^']*'/,"GITHUB_PAT: '"+CLOUD_CONFIG.GITHUB_PAT+"'");
  }
  // تضمين إعدادات رفع العائلة إذا كانت نسخة عائلة
  if(IS_FAMILY_COPY&&FAMILY_UPLOAD_CONFIG.GITHUB_PAT){
    var fek=FAMILY_UPLOAD_CONFIG.KEY_HEX||CLOUD_CONFIG.KEY_HEX||'';
    mainSrc=mainSrc
      .replace(/(FAMILY_UPLOAD_CONFIG[\s\S]*?GITHUB_PAT\s*:\s*')[^']*(')/,'$1'+FAMILY_UPLOAD_CONFIG.GITHUB_PAT+'$2')
      .replace(/(FAMILY_UPLOAD_CONFIG[\s\S]*?GIST_ID\s*:\s*')[^']*(')/,'$1'+(FAMILY_UPLOAD_CONFIG.GIST_ID||'')+'$2')
      .replace(/(FAMILY_UPLOAD_CONFIG[\s\S]*?KEY_HEX\s*:\s*')[^']*(')/,'$1'+fek+'$2');
    mainSrc=mainSrc.replace(/const IS_FAMILY_COPY\s*=\s*false/,'const IS_FAMILY_COPY = true');
  }
  return '<!DOCTYPE html>\n<html'+htmlAttrs+'>\n'+document.head.outerHTML+'\n<body>\n'+
    cleanAppHTML+'\n<div id="modalContainer"></div>\n'+dataTag+'\n'+
    '<scr'+'ipt>\n'+mainSrc+'\n<\/sc'+'ript>\n</body>\n</html>';
}

async function _fsaWriteNow(){
  if(!_fsaHandle||_fsaSaving)return;
  _fsaSaving=true;
  try{
    var html=_buildSaveHTML();
    var writable=await _fsaHandle.createWritable();
    await writable.write(new Blob([html],{type:'text/html;charset=utf-8'}));
    await writable.close();
    _fsaEnabled=true;
    _updateFsaBtn('ok');
    console.log('[FSA] File saved ✓');
  }catch(e){
    console.warn('[FSA] Write failed',e.message);
    if(e.name==='NotAllowedError'){
      // المستخدم رفض الإذن — نوقف المحاولات الصامتة
      _fsaHandle=null;_fsaEnabled=false;
      _updateFsaBtn('idle');
    }
  }finally{_fsaSaving=false;}
}

function _fsaTriggerSave(){
  if(!_fsaHandle)return;
  clearTimeout(_fsaSaveTimer);
  _fsaSaveTimer=setTimeout(_fsaWriteNow,1500);
}

function _updateFsaBtn(state){
  var btn=document.getElementById('fsaSaveBtn');
  var bar=document.getElementById('fsaBar');
  if(!btn)return;
  if(state==='idle'){
    btn.innerHTML='📁 ربط الملف';
    btn.style.background='';btn.style.color='';btn.style.borderColor='';
    if(bar)bar.style.display='none';
  }else if(state==='ok'){
    btn.innerHTML='📁 مرتبط ✓';
    btn.style.background='#d1fae5';btn.style.borderColor='#10b981';btn.style.color='#065f46';
    if(bar)bar.style.display='none';
  }else if(state==='prompt'){
    if(bar){
      bar.style.display='flex';
      var hint=document.getElementById('fsaHint');
      if(hint)hint.textContent='لضمان حفظ بياناتك على الجوال، اربط التطبيق بملف الـ HTML الخاص بك';
    }
  }
}

async function fsaPickFile(){
  if(!('showOpenFilePicker' in window)&&!('showSaveFilePicker' in window)){
    alert('متصفحك لا يدعم File System Access API.\nاستخدم Chrome أو Edge على الجوال، أو ثبّت التطبيق من الشاشة الرئيسية.');
    return;
  }
  try{
    // نحاول showSaveFilePicker أولاً (يفتح نفس الملف للكتابة)
    var opts={suggestedName:'family_tree.html',types:[{description:'HTML File',accept:{'text/html':['.html','.htm']}}]};
    var handle;
    try{
      handle=await window.showSaveFilePicker(opts);
    }catch(e){
      if(e.name==='AbortError')return;
      // Fallback: showOpenFilePicker
      var picks=await window.showOpenFilePicker({multiple:false,types:[{description:'HTML File',accept:{'text/html':['.html','.htm']}}]});
      handle=picks[0];
    }
    _fsaHandle=handle;
    _fsaEnabled=true;
    _updateFsaBtn('ok');
    // حفظ فوري
    await _fsaWriteNow();
    _showCloudToast('📁 تم ربط الملف — التحديثات تُحفظ تلقائياً','success',3000);
    // حفظ Handle في IndexedDB للاستمرارية
    try{await _fsaStoreSaveHandle(handle);}catch(ex){}
  }catch(e){
    if(e.name!=='AbortError')console.warn('[FSA pick]',e.message);
  }
}

// حفظ واسترجاع File Handle من IDB
async function _fsaStoreSaveHandle(handle){
  return new Promise(function(resolve){
    try{
      if(!_idb){resolve();return;}
      var tx=_idb.transaction(IDB_STORE,'readwrite');
      tx.objectStore(IDB_STORE).put(handle,'__fsa_handle__');
      tx.oncomplete=resolve;tx.onerror=resolve;
    }catch(e){resolve();}
  });
}
async function _fsaRestoreHandle(){
  return new Promise(function(resolve){
    try{
      if(!_idb){resolve(null);return;}
      var tx=_idb.transaction(IDB_STORE,'readonly');
      var req=tx.objectStore(IDB_STORE).get('__fsa_handle__');
      req.onsuccess=function(e){resolve(e.target.result||null);};
      req.onerror=function(){resolve(null);};
    }catch(e){resolve(null);}
  });
}
async function _fsaInit(){
  if(!('showSaveFilePicker' in window)&&!('showOpenFilePicker' in window)){
    // المتصفح لا يدعم FSA — نُظهر البار للتذكير
    _fsaShowFallbackBar();
    return;
  }
  // محاولة استعادة الـ Handle المحفوظ
  var handle=await _fsaRestoreHandle();
  if(handle){
    try{
      // التحقق من صلاحية الإذن
      var perm=await handle.queryPermission({mode:'readwrite'});
      if(perm==='granted'){
        _fsaHandle=handle;_fsaEnabled=true;
        _updateFsaBtn('ok');
        return;
      }else if(perm==='prompt'){
        // نخزّن الـ handle وننتظر تفاعل المستخدم لطلب الإذن
        _fsaHandle=handle;
        _updateFsaBtn('prompt');
        return;
      }
    }catch(e){}
  }
  // لا يوجد handle مسبق — نُظهر البار إذا كنا على جوال
  var isMobile=/iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
  if(isMobile&&!window.matchMedia('(display-mode: standalone)').matches){
    _updateFsaBtn('prompt');
  }
}
function _fsaShowFallbackBar(){
  // للمتصفحات التي لا تدعم FSA — نُظهر زر التحميل اليدوي
  var bar=document.getElementById('fsaBar');
  if(bar){
    bar.style.display='flex';
    var hint=document.getElementById('fsaHint');
    if(hint)hint.textContent='متصفحك لا يدعم الحفظ التلقائي — اضغط "💾 حفظ نسخة" بعد كل تعديل';
    var btn=document.getElementById('fsaSaveBtn');
    if(btn){btn.innerHTML='💾 حفظ نسخة';btn.onclick=exportData;}
  }
}
async function fsaRequestPermission(){
  if(!_fsaHandle)return fsaPickFile();
  try{
    var perm=await _fsaHandle.requestPermission({mode:'readwrite'});
    if(perm==='granted'){
      _fsaEnabled=true;_updateFsaBtn('ok');
      await _fsaWriteNow();
      _showCloudToast('📁 تم ربط الملف — التحديثات تُحفظ تلقائياً','success',3000);
    }
  }catch(e){if(e.name!=='AbortError')fsaPickFile();}
}

// Wrap mutations to auto-save
const _origSaveModal=saveModal;
saveModal=function(){_origSaveModal.apply(this,arguments);_invalidateAll();saveData();};
const _origDeletePerson=deletePerson;
deletePerson=function(id){
  if(!confirm('حذف هذا الشخص وجميع أبنائه؟'))return;
  function rem(pid){getChildren(pid).forEach(c=>rem(c.id));people=people.filter(p=>p.id!==pid);delete expanded[pid];removeRelPairsForPerson(pid);}
  rem(id);_invalidateAll();saveData();renderAll();
};

// ── Async init (IDB → localStorage → embedded tag → default) ──
// ⚠️ الترتيب الصحيح: IDB أولاً (بيانات المستخدم المحفوظة)
//    ثم localStorage، ثم الـ tag المضمّن كبيانات أولية فقط
(async function(){
  await _idbOpen();
  loadMyPerson();

  var dataLoaded=false;

  // 1. محاولة IDB — أعلى أولوية (آخر تغيير حفظه المستخدم)
  try{
    var idbData=await _idbLoad();
    if(idbData&&idbData.people&&idbData.people.length){
      people=idbData.people;nextId=idbData.nextId||1;relPairs=idbData.relPairs||[];
      people.forEach(function(p){expanded[p.id]=false;});
      migrateExternalSpouses();
      _markDeviceInit();
      // ── استعادة الصور من مخزنها المنفصل ──
      await _mergePhotosFromIDB();
      dataLoaded=true;
      console.log('[Init] Loaded from IDB:',people.length,'persons');
    }
  }catch(e){console.warn('[Init] IDB load failed',e);}

  // 2. محاولة localStorage — إذا فشل IDB
  if(!dataLoaded){
    try{
      var lsData=_lsLoad();
      if(lsData&&lsData.people&&lsData.people.length){
        people=lsData.people;nextId=lsData.nextId||1;relPairs=lsData.relPairs||[];
        people.forEach(function(p){expanded[p.id]=false;});
        migrateExternalSpouses();
        _markDeviceInit();
        // ترحيل البيانات من localStorage إلى IDB
        _idbSave({people:people,relPairs:relPairs,nextId:nextId}).catch(function(){});
        dataLoaded=true;
        console.log('[Init] Loaded from localStorage:',people.length,'persons');
      }
    }catch(e){console.warn('[Init] localStorage load failed',e);}
  }

  // 3. البيانات المضمّنة في الـ HTML — فقط إذا لا يوجد شيء محفوظ
  //    (البذرة الأولى — لا تُستخدم إذا المستخدم سبق وحفظ تغييرات)
  if(!dataLoaded){
    try{
      var tag=document.getElementById('__family_tree_data__');
      if(tag&&tag.textContent){
        var raw=tag.textContent.replace(/\s/g,'');
        if(raw){
          var bin=atob(raw);
          var bytes=new Uint8Array(bin.length);
          for(var i=0;i<bin.length;i++)bytes[i]=bin.charCodeAt(i);
          var d=JSON.parse(new TextDecoder().decode(bytes));
          if(d.people&&d.people.length){
            people=d.people;nextId=d.nextId||1;relPairs=d.relPairs||[];
            if(d.myPersonId){myPersonId=parseInt(d.myPersonId);saveMyPerson();}
            people.forEach(function(p){expanded[p.id]=false;});
            migrateExternalSpouses();
            // حفظ في IDB وlocalStorage حتى تصبح هي المصدر في الزيارات التالية
            _idbSave({people:people,relPairs:relPairs,nextId:nextId}).catch(function(){});
            _lsSave({people:people,relPairs:relPairs,nextId:nextId});
            dataLoaded=true;
            console.log('[Init] Loaded from embedded tag:',people.length,'persons');
          }
        }
      }
    }catch(e){console.warn('[Init] Embedded tag load failed',e);}
  }

  // 4. لا يوجد بيانات — نسخة العائلة: شاشة ترحيب / نسخة المالك: بيانات نموذجية
  if(!dataLoaded){
    if(IS_FAMILY_COPY){
      people=[];relPairs=[];nextId=1;
      console.log('[Init] Family copy — no data, showing welcome screen');
      setTimeout(_showFamilyWelcome, 700);
    } else {
      initData();
      console.log('[Init] Starting fresh — no data found');
    }
  }

  migrateExternalSpouses();
  expanded[people[0]?people[0].id:1]=true;
  _invalidateAll(); // بناء الفهارس عند أول تحميل
  updateMyPersonBtn();
  _restoreLastSearch();
  // ── تهيئة وضع الجوال ──
  initMobileMode();
  renderAll();
  _initAndroidBackNavigation();
  // تهيئة الحفظ السحابي
  await initCloud();
  // ── إظهار بانر الجهاز الجديد إذا كانت السحابة مُعدَّة ──
  if(_isNewDevice()&&_isCloudConfigured()){
    setTimeout(_showNewDeviceBanner,900);
  }
  // ── تشغيل تلميح التثبيت على الجوال ──
  _checkInstallBanner();
  // ── تهيئة File System Access API ──
  await _fsaInit();
  // إظهار زر الربط في الشريط إذا كنا على جوال/ديسكتوب Chrome
  if('showSaveFilePicker' in window||'showOpenFilePicker' in window){
    var b2=document.getElementById('fsaSaveBtn2');
    if(b2)b2.style.display='';
  }
})();

// ══════════════════════════════════════════════════════════
//  شاشة ترحيب نسخة العائلة — تظهر عند أول تشغيل بلا بيانات
// ══════════════════════════════════════════════════════════
function _showFamilyWelcome(){
  var mc=document.getElementById('modalContainer');
  if(!mc)return;
  mc.innerHTML=`
  <div class="modal-overlay">
  <div class="modal" style="max-width:440px;text-align:center">
    <div style="font-size:52px;margin-bottom:8px">🌳</div>
    <h3 style="margin-bottom:6px">مرحباً بك في شجرة العائلة</h3>
    <p style="font-size:13px;color:var(--text2);margin-bottom:20px;line-height:1.8">
      أرسل لك المالك ملف <strong>JSON</strong> يحتوي بيانات الشجرة.<br>
      استورده لعرض الشجرة كاملةً.
    </p>
    <label style="display:inline-flex;align-items:center;gap:8px;padding:12px 24px;background:#3b82f6;color:#fff;border-radius:12px;cursor:pointer;font-size:15px;font-weight:600;margin-bottom:12px">
      📥 استيراد ملف JSON
      <input type="file" accept=".json" onchange="_familyWelcomeImport(event)" style="display:none">
    </label>
    <div style="font-size:11px;color:var(--text2);line-height:1.8;margin-top:8px;padding:10px 14px;background:var(--bg-secondary);border-radius:8px;text-align:right">
      💡 بعد الاستيراد تُحفظ الشجرة محلياً — لن تحتاج الاستيراد مجدداً<br>
      💡 إذا كان الملف يحتوي إعدادات الرفع، فستُفعَّل تلقائياً عند الاستيراد
    </div>
  </div>
  </div>`;
}
function _familyWelcomeImport(e){
  var file=e.target.files[0];if(!file)return;
  var reader=new FileReader();
  reader.onload=function(ev){
    try{
      var d=JSON.parse(ev.target.result);
      if(!d.people||!Array.isArray(d.people))throw new Error('صيغة الملف غير صالحة');
      _pendingImportData=d;
      closeModal();
      showImportModeModal(d,file.name);
    }catch(ex){alert('خطأ في الملف: '+ex.message);}
    e.target.value='';
  };
  reader.readAsText(file);
}

// ══════════════════════════════════════════════════════════
//  PWA Install prompt
// ══════════════════════════════════════════════════════════
let _deferredInstallPrompt=null;
window.addEventListener('beforeinstallprompt',function(e){
  e.preventDefault();
  _deferredInstallPrompt=e;
  _checkInstallBanner();
});
// تحذير عند إغلاق الصفحة إذا لم يكن الحفظ مضموناً
document.addEventListener('click',function(e){
  let sb=document.getElementById('searchBox');
  let panel=document.getElementById('searchResultsPanel');
  if(sb&&panel&&!sb.closest('div').contains(e.target)){panel.style.display='none';}
});
document.addEventListener('focus',function(e){
  if(e.target&&e.target.id==='searchBox'&&_lastSearchQ){_renderSearchPanel();}
},{capture:true});
window.addEventListener('beforeunload',function(e){
  var isMobile=/iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
  if(!isMobile)return; // الديسكتوب: IDB كافٍ
  if(_fsaEnabled)return; // الملف مرتبط — البيانات محفوظة
  if(_cloudEnabled&&_isCloudConfigured())return; // السحابة مفعّلة — البيانات محفوظة
  if(IS_FAMILY_COPY&&_isFamilyUploadConfigured())return; // نسخة عائلة مع رفع
  e.preventDefault();
  e.returnValue='البيانات قد لا تُحفظ. اضغط "💾 حفظ نسخة" أولاً.';
});
window.addEventListener('appinstalled',function(){
  let b=document.getElementById('installBanner');
  if(b)b.style.display='none';
});
function _checkInstallBanner(){
  try{if(localStorage.getItem('ft_install_dismissed')==='1')return;}catch(e){}
  // هل نحن على جوال؟
  let isMobile=/iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
  if(!isMobile)return;
  // هل نحن داخل التطبيق المثبت بالفعل؟
  let isStandalone=window.matchMedia('(display-mode: standalone)').matches||window.navigator.standalone;
  if(isStandalone)return;
  let banner=document.getElementById('installBanner');
  let hint=document.getElementById('installHint');
  let installBtn=document.getElementById('installBtn');
  if(!banner)return;
  // iOS Safari
  let isIOS=/iPhone|iPad|iPod/i.test(navigator.userAgent)&&!window.MSStream;
  if(isIOS){
    if(hint)hint.textContent='اضغط زر المشاركة (□↑) ثم "أضف إلى الشاشة الرئيسية"';
    banner.style.display='flex';
    return;
  }
  // Android Chrome مع beforeinstallprompt
  if(_deferredInstallPrompt){
    if(hint)hint.textContent='ثبّت التطبيق للحفظ الدائم والعمل بدون انترنت';
    if(installBtn)installBtn.style.display='';
    banner.style.display='flex';
  }
}
function doInstallPWA(){
  if(!_deferredInstallPrompt)return;
  _deferredInstallPrompt.prompt();
  _deferredInstallPrompt.userChoice.then(function(){_deferredInstallPrompt=null;});
}
function dismissInstallBanner(){
  let b=document.getElementById('installBanner');
  if(b)b.style.display='none';
  try{localStorage.setItem('ft_install_dismissed','1');}catch(e){}
}

// ══════════════════════════════════════════════════════════
//  زر "للأعلى" العائم + زر إضافة سريع (للجوال)
// ══════════════════════════════════════════════════════════
(function(){
  let fab=document.createElement('div');
  fab.id='mob-fab';
  fab.innerHTML=`
    <style>
    #mob-fab{
      position:fixed;
      bottom:24px;
      left:16px;
      display:none;
      flex-direction:column;
      gap:10px;
      z-index:400;
      opacity:0;
      pointer-events:none;
      transition:opacity .25s;
    }
    body.mobile-mode #mob-fab{display:flex;}
    #mob-fab.visible{opacity:1;pointer-events:auto;}
    .mob-fab-btn{
      width:46px;height:46px;border-radius:50%;
      display:flex;align-items:center;justify-content:center;
      font-size:20px;cursor:pointer;
      box-shadow:0 4px 16px rgba(0,0,0,.2);
      border:none;transition:transform .15s,box-shadow .15s;
    }
    .mob-fab-btn:active{transform:scale(.92);}
    .mob-fab-top{background:#fff;color:#374151;border:1px solid #e5e7eb;}
    [data-theme="dark"] .mob-fab-top{background:#1f2937;color:#f9fafb;border-color:#374151;}
    .mob-fab-search{background:#1e40af;color:#fff;font-size:18px;}
    </style>
    <button id="mob-fab-search-btn" class="mob-fab-btn mob-fab-search" onclick="openSearchPanel()" title="بحث سريع">🔍</button>
    <button class="mob-fab-btn mob-fab-top" onclick="window._mobFabGoTopInstant()" title="للأعلى">↑</button>
  `;
  document.body.appendChild(fab);

  const TOP_THRESHOLD = 88;
  const UP_THRESHOLD = 14;
  let lastY = window.scrollY || document.documentElement.scrollTop || 0;

  function isMobileMode(){
    return document.body.classList.contains('mobile-mode');
  }

  function hasActiveOverlay(){
    // فحص جميع أنواع الـ overlays والـ modals
    if(document.querySelector(
      '.modal-overlay,[role="dialog"],dialog[open],.modal-window,.popup,.popup-open,.dialog,.swal2-container,.tingle-modal--visible'
    )){
      return true;
    }
    // فحص إضافي: هل يوجد محتوى في modalContainer (لنوافذ البيانات والـ modals الأخرى)
    let modalContainer = document.getElementById('modalContainer');
    if(modalContainer && modalContainer.innerHTML && modalContainer.innerHTML.trim()){
      return true;
    }
    return false;
  }

  function hideFab(){
    fab.classList.remove('visible');
  }

  function showFab(){
    if(!isMobileMode()) return;
    if(hasActiveOverlay()) return;
    if((window.scrollY || document.documentElement.scrollTop || 0) < TOP_THRESHOLD) return;
    fab.classList.add('visible');
  }

  window._mobFabGoTopInstant = function(){
    try{ window.scrollTo({top:0,behavior:'instant'}); }
    catch(e){ window.scrollTo(0,0); }

    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
    hideFab();
  };

  function updateFabVisibility(){
    if(!isMobileMode() || hasActiveOverlay()){
      hideFab();
      lastY = window.scrollY || document.documentElement.scrollTop || 0;
      return;
    }

    const currentY = window.scrollY || document.documentElement.scrollTop || 0;
    const delta = currentY - lastY;

    if(currentY < TOP_THRESHOLD){
      hideFab();
      lastY = currentY;
      return;
    }

    if(delta < -UP_THRESHOLD){
      showFab();
    }else if(delta > UP_THRESHOLD){
      hideFab();
    }

    lastY = currentY;
  }

  window.addEventListener('scroll', updateFabVisibility, { passive:true });

  document.addEventListener('touchstart', function(){
    lastY = window.scrollY || document.documentElement.scrollTop || 0;
  }, { passive:true });

  document.addEventListener('click', function(){
    if(hasActiveOverlay()){
      hideFab();
    }
  }, { passive:true });

  window._updateFabMobileMode = function(){
    lastY = window.scrollY || document.documentElement.scrollTop || 0;
    updateFabVisibility();
  };

  hideFab();
  updateFabVisibility();
})();

(function(){
  // أزرار المكتب الثابتة — تظهر طوال الوقت على سطح المكتب فقط
  let fab=document.createElement('div');
  fab.id='desk-fab';
  fab.innerHTML=`
    <style>
    body:not(.mobile-mode) #desk-fab{
      position:fixed;bottom:24px;left:16px;
      display:flex;flex-direction:column;gap:10px;
      z-index:400;
    }
    body.mobile-mode #desk-fab{display:none!important;}
    .desk-fab-btn{
      width:48px;height:48px;border-radius:50%;
      display:flex;align-items:center;justify-content:center;
      font-size:18px;cursor:pointer;
      box-shadow:0 4px 16px rgba(0,0,0,.2);
      border:none;transition:transform .15s,box-shadow .15s,opacity .15s;
    }
    .desk-fab-btn:hover{transform:translateY(-1px);}
    .desk-fab-search{background:#1e40af;color:#fff;}
    .desk-fab-top{background:#fff;color:#374151;border:1px solid #e5e7eb;}
    [data-theme="dark"] .desk-fab-top{background:#1f2937;color:#f9fafb;border-color:#374151;}
    </style>
    <button class="desk-fab-btn desk-fab-search" onclick="openSearchPanel()" title="بحث سريع (Ctrl/Cmd+K)">🔍</button>
    <button class="desk-fab-btn desk-fab-top" onclick="window.scrollTo({top:0,behavior:'smooth'})" title="للأعلى (Home)">↑</button>
  `;
  document.body.appendChild(fab);
})();

// ══════════════════════════════════════════════════════════
//  مفاتيح حفظ البحث واستعادته
// ══════════════════════════════════════════════════════════
const SEARCH_HISTORY_KEY = 'ft_last_search_v1';
let _mssSortMode = 'smart'; // 'smart'|'kin'|'children'|'alpha'|'gen'
let _mssCurrentResults = []; // النتائج الحالية (المجموعة المختارة أو الكل)
let _mssOriginalResults = []; // النتائج الأصلية غير المرتَّبة (مصدر الحقيقة)

function _saveSearchHistory(q){
  if(!q)return;
  try{localStorage.setItem(SEARCH_HISTORY_KEY, q);}catch(e){}
}
function _restoreLastSearch(){
  try{
    let q = localStorage.getItem(SEARCH_HISTORY_KEY)||'';
    if(q){
      let lbl = document.getElementById('searchBtnLabel');
      if(lbl) lbl.textContent = q;
      let xcb = document.getElementById('searchClearBtnTop');
      if(xcb) xcb.style.display = '';
      // استعادة نتائج البحث في الذاكرة
      _lastSearchQ = q;
      _searchCurrentTerm = q;
    }
  }catch(e){}
}

// ══════════════════════════════════════════════════════════
//  فتح لوحة البحث من أي مكان
// ══════════════════════════════════════════════════════════
function openSearchPanel(){
  // استخدم البحث النشط — أو آخر بحث محفوظ إن كان النشط فارغاً (بعد ESC/X)
  let lastQ = _lastSearchQ || _persistedSearchQ;
  // استعادة _lastSearchQ حتى يتمكن _updateSearchNavBar من إظهار الشريط الأزرق لاحقاً
  if(!_lastSearchQ && lastQ) _lastSearchQ = lastQ;
  let results = lastQ
    ? people.filter(p=>matchesFullName(p,lastQ)).sort((a,b)=>scoreMatch(b,lastQ)-scoreMatch(a,lastQ))
    : [];
  openMobSearchSheet(results, lastQ);
  // بعد الرسم: ضع البحث في حقل المدخلات وضع التركيز
  requestAnimationFrame(()=>{
    let inp = document.getElementById('mss-input');
    if(inp){
      inp.value = lastQ||'';
      inp.focus();
      inp.select();
    }
  });
}

// ══════════════════════════════════════════════════════════
//  بحث داخل لوحة MSS (حقل mss-input)
// ══════════════════════════════════════════════════════════
function mssClearInput(){
  // 1. مسح حقل الإدخال
  let inp = document.getElementById('mss-input');
  if(inp){ inp.value = ''; inp.focus(); }
  // 2. إخفاء زر X داخل الحقل
  let xcb = document.getElementById('mss-input-clear');
  if(xcb) xcb.style.display = 'none';
  // 3. تصفير حالة البحث بالكامل
  _lastSearchQ = '';
  _persistedSearchQ = '';
  _searchCurrentTerm = '';
  _mssCurrentResults = [];
  _mssOriginalResults = [];
  let sheet = document.getElementById('mss-sheet');
  if(sheet){ sheet._allResults = []; sheet._q = ''; }
  // 4. إعادة تعيين الـ groups
  let groupsEl = document.getElementById('mss-groups');
  if(groupsEl){ groupsEl.style.display='none'; groupsEl.innerHTML=''; }
  // 5. عرض شاشة البداية الفارغة
  let body = document.getElementById('mss-body');
  if(body) body.innerHTML = '<div style="padding:36px 20px;text-align:center;color:var(--text2);font-size:14px;"><div style="font-size:36px;margin-bottom:10px">🔍</div><div>اكتب اسماً للبحث...</div></div>';
  let badge = document.getElementById('mss-count-badge');
  if(badge) badge.textContent = '';
  let footer = document.getElementById('mss-footer');
  if(footer) footer.style.display = 'none';
  // 6. تحديث زر البحث في الشريط العلوي
  try{ localStorage.removeItem(SEARCH_HISTORY_KEY); }catch(e){}
  let lbl = document.getElementById('searchBtnLabel');
  if(lbl) lbl.textContent = 'ابحث عن أي شخص...';
  let xcbt = document.getElementById('searchClearBtnTop');
  if(xcbt) xcbt.style.display = 'none';
}

function mssPanelSearch(q){
  // إظهار/إخفاء زر X داخل حقل البحث
  let _xcbIn = document.getElementById('mss-input-clear');
  if(_xcbIn) _xcbIn.style.display = q.trim() ? 'block' : 'none';
  // مزامنة مع searchBox الخفي
  let sb = document.getElementById('searchBox');
  if(sb) sb.value = q;
  _lastSearchQ = q.trim();
  if(q.trim())_persistedSearchQ=q.trim();
  _searchCurrentTerm = q.trim();
  _saveSearchHistory(q.trim());
  // تحديث زر البحث
  let lbl = document.getElementById('searchBtnLabel');
  if(lbl) lbl.textContent = q.trim()||'ابحث عن أي شخص...';
  let _xcb3=document.getElementById('searchClearBtnTop');if(_xcb3)_xcb3.style.display=q.trim()?'':'none';

  if(!q.trim()){
    // المستخدم مسح الكتابة — عرض شاشة فارغة
    _mssCurrentResults = [];
    _mssOriginalResults = [];
    _mssActiveGroup = 'all';
    let _s = document.getElementById('mss-sheet');
    if(_s){ _s._allResults = []; _s._originalResults = []; _s._groups = {}; _s._q = ''; }
    let _b = document.getElementById('mss-body');
    if(_b) _b.innerHTML = '<div style="padding:36px 20px;text-align:center;color:var(--text2);font-size:14px;"><div style="font-size:36px;margin-bottom:10px">🔍</div><div>اكتب اسماً للبحث...</div></div>';
    let _bdg = document.getElementById('mss-count-badge');
    if(_bdg) _bdg.textContent = '';
    let _ft = document.getElementById('mss-footer');
    if(_ft) _ft.style.display = 'none';
    let _grp = document.getElementById('mss-groups');
    if(_grp){ _grp.style.display='none'; _grp.innerHTML=''; }
    _searchResultIds = [];
    return;
  }

  let results = people.filter(p=>matchesFullName(p,q)).sort((a,b)=>scoreMatch(b,q)-scoreMatch(a,q));

  // ── بناء المجموعات ──
  let groups={};
  results.forEach(p=>{
    let first=(p.name||'').split(' ')[0]||p.name;
    if(!groups[first])groups[first]=[];
    groups[first].push(p);
  });
  let groupKeys=Object.keys(groups).sort((a,b)=>groups[b].length-groups[a].length);

  // احتفظ بالمجموعة الحالية إن كانت ما زالت موجودة لهذا الاستعلام
  const prevGroup = _mssActiveGroup || 'all';
  _mssCurrentResults = results;
  _mssOriginalResults = results.slice();
  _mssGroupResults = results.slice();
  _mssActiveGroup = groups[prevGroup] ? prevGroup : 'all';

  // تحديث sheet
  let _sh = document.getElementById('mss-sheet');
  if(_sh){
    _sh._q = q;
    _sh._allResults = results;
    _sh._originalResults = results.slice();
    _sh._groups = groups;
  }

  // ── تحديث شريط المجموعات ──
  let groupsEl = document.getElementById('mss-groups');
  if(groupsEl){
    if(groupKeys.length > 1){
      groupsEl.style.display = 'flex';
      groupsEl.innerHTML =
        `<div class="mss-group-tab ${_mssActiveGroup==='all'?'active':''}" data-group="all" onclick="mssSelectGroup('all')">الكل (${results.length})</div>`+
        groupKeys.map(k=>`<div class="mss-group-tab ${_mssActiveGroup===k?'active':''}" data-group="${escapeHtml(k)}" onclick="mssSelectGroup('${escapeHtml(k)}')">${escapeHtml(k)} (${groups[k].length})</div>`).join('');
    } else {
      groupsEl.style.display = 'none';
      groupsEl.innerHTML = '';
    }
  }

  // ── تحديث badge ──
  let badge = document.getElementById('mss-count-badge');
  if(badge) badge.textContent = results.length + ' نتيجة';

  _mssApplySort();
  _searchResultIds = results.map(p=>p.id); // الترتيب الأولي حسب الذكاء
}

function mssInputKey(e){
  if(e.key === 'Enter'){
    let inp = document.getElementById('mss-input');
    if(inp && inp.value){
      let results = people.filter(p=>matchesFullName(p,inp.value))
        .sort((a,b)=>scoreMatch(b,inp.value)-scoreMatch(a,inp.value));
      if(results.length){ mssSelectPerson(results[0].id); }
    }
  }
  if(e.key === 'Escape'){
    let sheet=document.getElementById('mss-sheet');
    // اعترض ESC فقط إذا كانت اللوحة مفتوحة فعلاً
    // إذا كانت مغلقة (التركيز في الحقل لكن اللوحة مخفية) → اسمح للمعالج العالمي بإلغاء البحث
    if(sheet && sheet.classList.contains('open')){
      e.stopPropagation();
      closeMobSearchSheet();
    }
    // إذا لم تكن مفتوحة: الحدث يصل للمعالج العالمي → clearSearch()
  }
}

// مساعد: قرابة المصاهرة فقط (للترتيب)
function getMyKinship_marriage(targetId){
  if(!myPersonId||myPersonId===targetId) return null;
  return computeMarriageKinship(myPersonId, targetId);
}

function _showKinSortHint(){
  let me = getPerson(myPersonId);
  let badge = document.getElementById('mss-count-badge');
  if(badge && me) badge.textContent = 'مرتّب حسب قرابتك — ' + me.name;
}
function _showKinSortNoPersonHint(){
  let badge = document.getElementById('mss-count-badge');
  if(badge) badge.innerHTML = '<span style="color:#f59e0b">حدد "أنا في الشجرة" أولاً لترتيب القرابة</span>';
}

// ══════════════════════════════════════════════════════════
//  ترتيب النتائج في MSS
// ══════════════════════════════════════════════════════════
function mssSortBy(mode){
  _mssSortMode = mode;
  // تحديث أزرار الترتيب — تأكد من تحديث جميع الأزرار بشكل صحيح
  document.querySelectorAll('.mss-sort-btn').forEach(btn=>{
    btn.classList.toggle('active', btn.dataset.sort === mode);
  });
  _mssApplySort();
}

function _mssApplySort(){
  let sheet = document.getElementById('mss-sheet');
  if(!sheet) return;
  let q = sheet._q || _lastSearchQ || '';

  // مصدر الترتيب: النتائج الأصلية (غير المرتَّبة) للمجموعة الحالية
  // نستخدم _mssCurrentResults (المجموعة) أو _mssOriginalResults (الكل)
  let sourceItems;
  if(_mssActiveGroup && _mssActiveGroup !== 'all' && sheet._groups && sheet._groups[_mssActiveGroup]){
    // مجموعة محددة: ابدأ من بيانات المجموعة الأصلية
    sourceItems = (sheet._groups[_mssActiveGroup] || []).slice();
  } else {
    // الكل: ابدأ من النتائج الأصلية (قبل أي ترتيب سابق)
    sourceItems = (_mssOriginalResults.length ? _mssOriginalResults : (sheet._originalResults || sheet._allResults || [])).slice();
  }

  let sorted = sourceItems.slice();
  switch(_mssSortMode){
    case 'smart':
      sorted.sort((a,b) => scoreMatch(b,q) - scoreMatch(a,q));
      break;
    case 'kin':
      if(myPersonId){
        const _kinCache = new Map();
        sorted.forEach(p => {
          if(_kinCache.has(p.id)) return;
          let k = getMyKinship(p.id);
          let score;
          if(!k){
            let mar = computeMarriageKinship(myPersonId, p.id);
            score = mar ? 8000 : 99999;
          } else if(k.blood && k.blood.lca){
            score = k.blood.lca.total;
          } else if(k.lca){
            score = k.lca.total;
          } else if(k.marriage){
            score = 7000;
          } else {
            score = 99999;
          }
          _kinCache.set(p.id, score);
        });
        sorted.sort((a,b) =>
          (_kinCache.get(a.id)||99999) - (_kinCache.get(b.id)||99999) ||
          scoreMatch(b,q) - scoreMatch(a,q)
        );
        _showKinSortHint();
      } else {
        sorted.sort((a,b) => scoreMatch(b,q) - scoreMatch(a,q));
        _showKinSortNoPersonHint();
      }
      break;
    case 'children':
      sorted.sort((a,b) => getChildrenForNode(b.id).length - getChildrenForNode(a.id).length || scoreMatch(b,q)-scoreMatch(a,q));
      break;
    case 'alpha':
      sorted.sort((a,b) => (a.name||'').localeCompare(b.name||'','ar'));
      break;
    case 'gen':
      function _genDepth(p){
        let d=0,cur=p;
        while(cur&&cur.parentId&&(cur=getPerson(cur.parentId)))d++;
        return d;
      }
      sorted.sort((a,b) => _genDepth(a) - _genDepth(b) || scoreMatch(b,q)-scoreMatch(a,q));
      break;
  }

  // تحديث _mssCurrentResults بالنتائج المرتَّبة (للمجموعة الحالية)
  _mssGroupResults = sorted;
  // تحديث sheet._allResults فقط عند ترتيب "الكل" (لا نُلوِّث بيانات المجموعات)
  if(!_mssActiveGroup || _mssActiveGroup === 'all'){
    sheet._allResults = sorted;
  }
  _mssRenderItems(sorted, q);
}

// ══════════════════════════════════════════════════════════
//  البحث الصوتي (Web Speech API)
// ══════════════════════════════════════════════════════════
let _voiceRecognition = null;
function startVoiceSearch(){
  let SpeechRecog = window.SpeechRecognition || window.webkitSpeechRecognition;
  if(!SpeechRecog){
    alert('متصفحك لا يدعم البحث الصوتي. استخدم Chrome أو Edge.');
    return;
  }
  if(_voiceRecognition){
    _voiceRecognition.stop();
    _voiceRecognition = null;
    _setVoiceActive(false);
    return;
  }
  let r = new SpeechRecog();
  r.lang = 'ar-SA';
  r.continuous = false;
  r.interimResults = true;
  r.maxAlternatives = 3;
  _voiceRecognition = r;
  _setVoiceActive(true);

  r.onresult = e=>{
    let transcript = Array.from(e.results)
      .map(res=>res[0].transcript)
      .join('');
    // إزالة أي علامات ترقيم في نهاية النص (نقطة، فاصلة، إلخ)
    transcript = transcript.replace(/[\u0021-\u002F\u003A-\u0040\u005B-\u0060\u007B-\u007E\u060C\u061B\u061F\u06D4\u002E\u066A-\u066D]+$/u, '').trim();
    // أحدّث حقل البحث مباشرة
    let inp = document.getElementById('mss-input');
    if(inp){ inp.value = transcript; mssPanelSearch(transcript); }
  };
  r.onend = ()=>{ _voiceRecognition=null; _setVoiceActive(false); };
  r.onerror = e=>{ _voiceRecognition=null; _setVoiceActive(false); };

  // ── استدعاء start() مباشرةً داخل user gesture (بدون setTimeout ولا getUserMedia) ──
  // SpeechRecognition تطلب إذن الميكروفون بنفسها عند الحاجة
  if(!document.getElementById('mss-sheet').classList.contains('open')) openSearchPanel();
  try { r.start(); } catch(err){ _voiceRecognition=null; _setVoiceActive(false); }
}
function mssVoiceSearch(){ startVoiceSearch(); }

// ══════════════════════════════════════════════════════════
//  البحث الصوتي العام – لحقول متعددة (kin1 / kin2 / myPerson / list)
// ══════════════════════════════════════════════════════════
let _fieldVoiceRec = {};   // btnId → SpeechRecognition instance
function startFieldVoice(inputId, onResult, btnId){
  let SpeechRecog = window.SpeechRecognition || window.webkitSpeechRecognition;
  if(!SpeechRecog){ alert('متصفحك لا يدعم البحث الصوتي. استخدم Chrome أو Edge.'); return; }
  // toggle off إذا كان نشطاً بالفعل
  if(_fieldVoiceRec[btnId]){
    _fieldVoiceRec[btnId].stop();
    delete _fieldVoiceRec[btnId];
    _setFieldVoiceActive(btnId, false);
    return;
  }
  let r = new SpeechRecog();
  r.lang = 'ar-SA';
  r.continuous = false;
  r.interimResults = true;
  r.maxAlternatives = 3;
  _fieldVoiceRec[btnId] = r;
  _setFieldVoiceActive(btnId, true);
  r.onresult = e=>{
    let transcript = Array.from(e.results).map(res=>res[0].transcript).join('');
    transcript = transcript.replace(/[\u0021-\u002F\u003A-\u0040\u005B-\u0060\u007B-\u007E\u060C\u061B\u061F\u06D4\u002E\u066A-\u066D]+$/u,'').trim();
    let inp = document.getElementById(inputId);
    if(inp){ inp.value = transcript; }
    if(onResult) onResult(transcript);
  };
  r.onend  = ()=>{ delete _fieldVoiceRec[btnId]; _setFieldVoiceActive(btnId, false); };
  r.onerror= ()=>{ delete _fieldVoiceRec[btnId]; _setFieldVoiceActive(btnId, false); };
  try { r.start(); } catch(err){ delete _fieldVoiceRec[btnId]; _setFieldVoiceActive(btnId, false); }
}
function _setFieldVoiceActive(btnId, on){
  let btn = document.getElementById(btnId);
  if(btn) btn.classList.toggle('voice-active', on);
  let t = document.getElementById('saveToast');
  if(on){
    if(t){ t.style.background='#7c3aed'; t.textContent='🎤 استمع...'; t.style.opacity='1';
           clearTimeout(window._toastTimer); }
  } else {
    if(t){ t.style.opacity='0'; setTimeout(()=>{ t.style.background='#22c55e'; t.textContent='✔ تم الحفظ'; },400); }
  }
}

function _setVoiceActive(on){
  let btns = document.querySelectorAll('#mss-mic-btn, [onclick*="startVoiceSearch"]');
  btns.forEach(b=>b.classList.toggle('voice-active', on));
  if(on){
    // Toast صغير
    let t = document.getElementById('saveToast');
    if(t){ t.style.background='#7c3aed'; t.textContent='🎤 استمع...'; t.style.opacity='1'; }
  } else {
    let t = document.getElementById('saveToast');
    if(t){ t.style.opacity='0'; setTimeout(()=>{ t.style.background='#22c55e'; t.textContent='✔ تم الحفظ'; },400); }
  }
}

// ══════════════════════════════════════════════════════════
//  مساعدات شريط التنقل الأزرق (SNB)
// ══════════════════════════════════════════════════════════
// snb search removed per user request — search opens via searchNavCurrent()

// ══════════════════════════════════════════════════════════
//  لوحة البحث الموحّدة (جوال + ديسكتوب) — تُنشأ بـ JS
// ══════════════════════════════════════════════════════════
(function(){
  // ── CSS ──
  let st=document.createElement('style');
  st.textContent=`
  #mss-overlay{display:none;position:fixed;inset:0;background:rgba(0,0,0,.45);z-index:600;}
  #mss-overlay.open{display:block;}
  #mss-sheet{
    position:fixed;z-index:601;background:var(--card-bg);
    display:flex;flex-direction:column;
    box-shadow:0 -8px 40px rgba(0,0,0,.22);
    transition:transform .28s cubic-bezier(.32,.72,0,1);
  }
  /* جوال: يصعد من الأسفل */
  body.mobile-mode #mss-sheet{
    bottom:0;left:0;right:0;border-radius:20px 20px 0 0;
    max-height:82vh;transform:translateY(100%);
  }
  body.mobile-mode #mss-sheet.open{transform:translateY(0);}
  /* ديسكتوب: نافذة وسط */
  body:not(.mobile-mode) #mss-sheet{
    top:50%;left:50%;transform:translate(-50%,-60%);
    width:min(560px,96vw);border-radius:16px;
    max-height:80vh;opacity:0;pointer-events:none;
    transition:transform .22s cubic-bezier(.32,.72,0,1),opacity .2s;
  }
  body:not(.mobile-mode) #mss-sheet.open{
    transform:translate(-50%,-50%);opacity:1;pointer-events:auto;
  }
  .mss-handle{width:40px;height:4px;border-radius:2px;background:var(--card-border);margin:12px auto 0;flex-shrink:0;}
  body:not(.mobile-mode) .mss-handle{display:none;}
  .mss-header{display:flex;align-items:center;gap:10px;padding:12px 16px 10px;flex-shrink:0;border-bottom:1px solid var(--card-border);}
  .mss-title{font-size:14px;font-weight:600;color:var(--text);flex:1;}
  .mss-count-badge{font-size:12px;color:var(--text2);background:var(--bg-secondary);border:1px solid var(--card-border);border-radius:10px;padding:2px 9px;}
  .mss-close-btn{background:var(--bg-secondary);border:1px solid var(--card-border);color:var(--text2);border-radius:8px;padding:6px 12px;font-size:13px;cursor:pointer;}
  .mss-groups{display:flex;gap:6px;padding:10px 14px 0;overflow-x:auto;flex-shrink:0;scrollbar-width:none;}
  .mss-groups::-webkit-scrollbar{display:none;}
  .mss-group-tab{padding:6px 14px;border-radius:20px;font-size:13px;font-weight:600;white-space:nowrap;cursor:pointer;border:1.5px solid var(--card-border);background:var(--bg-secondary);color:var(--text2);flex-shrink:0;transition:all .15s;}
  .mss-group-tab.active{background:#1e40af;color:#fff;border-color:#1e40af;}
  .mss-body{overflow-y:auto;flex:1;}
  .mss-item{display:flex;align-items:center;gap:12px;padding:13px 18px;border-bottom:.5px solid var(--card-border);cursor:pointer;}
  body.mobile-mode .mss-item{min-height:60px;padding:14px 18px;}
  .mss-item:hover,.mss-item:active{background:var(--bg-secondary);}
  .mss-item.active{background:linear-gradient(135deg,var(--clr-accent-bg),#eff6ff);box-shadow:inset 0 0 0 1px rgba(59,130,246,.12);}
  .mss-item-name{font-size:14px;font-weight:500;color:var(--text);}
  body.mobile-mode .mss-item-name{font-size:15px;}
  .mss-item-sub{font-size:11px;color:var(--text2);margin-top:2px;}
  body.mobile-mode .mss-item-sub{font-size:12px;}
  .mss-footer{padding:12px 16px;background:var(--card-bg);border-top:1px solid var(--card-border);flex-shrink:0;display:flex;gap:8px;}
  .mss-footer button.mss-btn-primary{flex:1;padding:12px;background:#1e40af;color:#fff;border:none;border-radius:12px;font-size:14px;font-weight:700;cursor:pointer;}
  .mss-footer button.mss-btn-secondary{padding:12px 16px;background:var(--bg-secondary);color:var(--text2);border:1px solid var(--card-border);border-radius:12px;font-size:13px;cursor:pointer;}
  .mss-sort-btn{padding:5px 12px;border:1.5px solid var(--card-border);border-radius:20px;background:var(--card-bg);color:var(--text2);font-size:11px;font-weight:600;cursor:pointer;white-space:nowrap;flex-shrink:0;transition:all .15s;}
  .mss-sort-btn:hover{background:var(--bg-secondary);color:var(--text);}
  .mss-sort-btn.active{background:#1e40af;color:#fff;border-color:#1e40af;}
  #mss-sort-bar::-webkit-scrollbar{display:none;}
  #mss-input:focus{border-color:#3b82f6;box-shadow:0 0 0 3px rgba(59,130,246,.12);}
  /* صوت نشط */
  .voice-active{animation:voicePulse .7s ease-in-out infinite;}
  @keyframes voicePulse{0%,100%{opacity:.6;}50%{opacity:1;transform:translateY(-50%) scale(1.2);}}
  `;
  document.head.appendChild(st);

  // ── HTML ──
  let overlay=document.createElement('div');
  overlay.id='mss-overlay';
  overlay.onclick=closeMobSearchSheet;
  document.body.appendChild(overlay);

  let sheet=document.createElement('div');
  sheet.id='mss-sheet';
  sheet.innerHTML=
    '<div class="mss-handle"></div>'+
    '<div class="mss-header">'+
      '<span class="mss-title">🔍 البحث</span>'+
      '<span id="mss-count-badge" class="mss-count-badge"></span>'+
      '<button class="mss-close-btn" onclick="closeMobSearchSheet()">✕</button>'+
    '</div>'+
    '<div id="mss-search-row" style="padding:10px 14px 8px;border-bottom:1px solid var(--card-border);background:var(--bg-secondary);">'+
      '<div style="display:flex;gap:8px;align-items:center;">'+
        '<div style="position:relative;flex:1;">'+
          '<input id="mss-input" type="text" placeholder="ابحث بالاسم، الأب، الجد، الأم..." oninput="mssPanelSearch(this.value)" onkeydown="mssInputKey(event)" style="width:100%;padding:10px 38px 10px 70px;border:1.5px solid var(--card-border);border-radius:10px;background:var(--card-bg);color:var(--text);font-size:14px;outline:none;">'+
          '<span style="position:absolute;right:11px;top:50%;transform:translateY(-50%);font-size:16px;opacity:.45;pointer-events:none;">🔍</span>'+
          '<div style="position:absolute;left:4px;top:50%;transform:translateY(-50%);display:flex;align-items:center;gap:0;">'+
            '<button id="mss-input-clear" onclick="mssClearInput()" title="مسح" style="background:none;border:none;cursor:pointer;font-size:15px;color:var(--text2);padding:5px 6px;line-height:1;display:none;border-radius:50%;" onmouseover="this.style.background=\'var(--bg-secondary)\'" onmouseout="this.style.background=\'none\'">✕</button>'+
            '<button id="mss-mic-btn" onclick="startVoiceSearch()" title="بحث صوتي" style="background:none;border:none;cursor:pointer;font-size:16px;opacity:.6;padding:5px 6px;line-height:1;border-radius:50%;" onmouseover="this.style.opacity=1" onmouseout="this.style.opacity=.6">🎤</button>'+
          '</div>'+
        '</div>'+

      '</div>'+
      '<div id="mss-sort-bar" style="display:flex;gap:6px;margin-top:8px;overflow-x:auto;padding-bottom:2px;scrollbar-width:none;">'+
        '<span style="font-size:11px;color:var(--text2);white-space:nowrap;align-self:center;">ترتيب:</span>'+
        '<button class="mss-sort-btn active" data-sort="smart" onclick="mssSortBy(\'smart\')" style="">🎯 الأذكى</button>'+
        '<button class="mss-sort-btn" data-sort="kin" onclick="mssSortBy(\'kin\')">🔗 القرابة</button>'+
        '<button class="mss-sort-btn" data-sort="children" onclick="mssSortBy(\'children\')">👨‍👩‍👧 الأبناء</button>'+
        '<button class="mss-sort-btn" data-sort="alpha" onclick="mssSortBy(\'alpha\')">أ-ي</button>'+
        '<button class="mss-sort-btn" data-sort="gen" onclick="mssSortBy(\'gen\')">📅 الجيل</button>'+
      '</div>'+
    '</div>'+
    '<div id="mss-groups" class="mss-groups"></div>'+
    '<div id="mss-body" class="mss-body"></div>'+
    '<div id="mss-footer" class="mss-footer" style="display:none">'+
      '<button class="mss-btn-secondary" onclick="closeMobSearchSheet()">الشجرة</button>'+
      '<button class="mss-btn-primary" id="mss-start-btn" onclick="mssStartNav()">🔍 تصفح النتائج</button>'+
    '</div>';
  document.body.appendChild(sheet);
})();
// ══════════════════════════════════════════════════════════
//  Photo Chunking — تقسيم الصور لتجنب حد 1MB في GitHub Gist
// ══════════════════════════════════════════════════════════
const _CHUNK_MAX=800000;
async function _buildPhotoChunks(photosMap){
  let entries=Object.entries(photosMap),chunks=[],current={},sz=0;
  for(let [id,photo] of entries){
    let es=id.length+photo.length+10;
    if(sz+es>_CHUNK_MAX&&Object.keys(current).length){chunks.push(await cloudEncrypt(JSON.stringify(current)));current={};sz=0;}
    current[id]=photo;sz+=es;
  }
  if(Object.keys(current).length)chunks.push(await cloudEncrypt(JSON.stringify(current)));
  return chunks;
}
async function _readPhotoChunks(gistId,n){
  let merged={};
  for(let i=0;i<n;i++){
    try{
      let enc=await _gistReadFile(gistId,'ft_photos_'+i+'.dat');
      if(enc&&enc.length>10&&!enc.startsWith('RESET_')){Object.assign(merged,JSON.parse(await cloudDecrypt(enc.trim())));}
    }catch(e){console.warn('[Chunks] chunk',i,'failed:',e.message);}
  }
  return Object.keys(merged).length?merged:null;
}

// ══════════════════════════════════════════════════════════
//  Sync Log + Last Sync Time
// ══════════════════════════════════════════════════════════
var _SYNC_LOG_KEY='ft_sync_log_v1',_LAST_SYNC_KEY='ft_last_sync_v1';
function _syncLog(level,msg,detail){
  try{var logs=JSON.parse(localStorage.getItem(_SYNC_LOG_KEY)||'[]');logs.unshift({ts:new Date().toISOString(),level,msg,detail:detail||''});if(logs.length>60)logs=logs.slice(0,60);localStorage.setItem(_SYNC_LOG_KEY,JSON.stringify(logs));}catch(e){}
  if(level==='error')console.warn('[SYNC]',msg,detail||'');else console.debug('[SYNC]',msg,detail||'');
}
function _getSyncLog(){try{return JSON.parse(localStorage.getItem(_SYNC_LOG_KEY)||'[]');}catch(e){return[];}}
function _clearSyncLog(){try{localStorage.removeItem(_SYNC_LOG_KEY);}catch(e){}}
function _getLastSync(){return localStorage.getItem(_LAST_SYNC_KEY)||'';}
function _setLastSync(){var ts=new Date().toISOString();try{localStorage.setItem(_LAST_SYNC_KEY,ts);}catch(e){}_updateLastSyncUI(ts);}
function _updateLastSyncUI(ts){
  var el=document.getElementById('cloudLastSyncTime');if(!el)return;
  if(!ts){el.textContent='';return;}
  var d=new Date(ts),now=new Date(),diffMin=Math.floor((now-d)/60000);
  var label=diffMin<1?'الآن':diffMin<60?diffMin+' دقيقة':Math.floor(diffMin/60)+' ساعة';
  el.textContent='☁️ آخر مزامنة: '+label+' مضت';
}
function _isValidPhoto(photo){
  if(!photo||typeof photo!=='string'||photo.length<200)return false;
  if(photo.startsWith('blob:')||photo.startsWith('file:')||photo.startsWith('/'))return false;
  return true;
}

// ══════════════════════════════════════════════════════════
//  Upload / Download مع chunking
// ══════════════════════════════════════════════════════════
async function _doUpload(){
  if(!_isCloudConfigured()){openCloudSetup();return;}
  if(_cloudSyncing){_showCloudToast('⏳ عملية رفع جارية بالفعل...','info',2000);return;}
  var validPhotos=people.filter(p=>_isValidPhoto(p.photo));
  var invalidCount=people.filter(p=>p.photo&&!_isValidPhoto(p.photo)).length;
  if(invalidCount>0)_syncLog('warn','صور blob تجاهلها:'+invalidCount);
  var sizeKB=Math.round(validPhotos.reduce((s,p)=>s+p.photo.length*0.75/1024,0));
  if(sizeKB>8000&&!confirm('حجم الصور كبير ('+(sizeKB/1024).toFixed(1)+' MB). متابعة؟'))return;
  _syncLog('info','بدأ الرفع',people.length+' فرد، '+validPhotos.length+' صورة');
  _showCloudToast('🔄 جارٍ الرفع...','syncing',0);
  _cloudSyncing=true; _updateCloudBtn('syncing');
  try{
    var dataNoPhotos=JSON.parse(JSON.stringify({people,relPairs,nextId,myPersonId:myPersonId||null}));
    dataNoPhotos.people.forEach(p=>delete p.photo);
    var encData=await cloudEncrypt(JSON.stringify(dataNoPhotos));
    var photosMap={};validPhotos.forEach(p=>{photosMap[p.id]=p.photo;});
    var filesObj={[CLOUD_CONFIG.GIST_FILE]:{content:encData}};
    if(Object.keys(photosMap).length>0){
      var chunks=await _buildPhotoChunks(photosMap);
      chunks.forEach((enc,i)=>{filesObj['ft_photos_'+i+'.dat']={content:enc};});
      filesObj[CLOUD_PHOTOS_FILE]={content:'CHUNKED_V2_chunks='+chunks.length};
      _syncLog('info','chunks: '+chunks.length);
    }
    var gistId=localStorage.getItem(CLOUD_GIST_KEY)||CLOUD_CONFIG.GIST_ID||'';
    if(gistId){try{await _gistUpdate(gistId,filesObj);}catch(e){gistId=await _gistCreate(filesObj);localStorage.setItem(CLOUD_GIST_KEY,gistId);CLOUD_CONFIG.GIST_ID=gistId;}}
    else{gistId=await _gistCreate(filesObj);localStorage.setItem(CLOUD_GIST_KEY,gistId);CLOUD_CONFIG.GIST_ID=gistId;}
    // تحقق بعد الرفع
    try{
      await new Promise(r=>setTimeout(r,1500));
      var vRes=await fetch('https://api.github.com/gists/'+gistId,{headers:_gistHeaders()});
      if(vRes.ok){var vj=await vRes.json();var dOk=!!(vj.files&&vj.files[CLOUD_CONFIG.GIST_FILE]);_syncLog(dOk?'ok':'error','تحقق: بيانات='+(dOk?'✓':'✗'));}
    }catch(ve){_syncLog('warn','التحقق فشل:'+ve.message);}
    var newH=_getSyncedHashes();Object.keys(photosMap||{}).forEach(id=>{newH[id]=photosMap[id].length;});_saveSyncedHashes(newH);
    _setLastSync();
    _syncLog('ok','اكتمل الرفع',people.length+' فرد، '+(Object.keys(photosMap||{}).length)+' صورة');
    _showCloudToast('☁️ تم الرفع ✓ · '+people.length+' فرد · '+(validPhotos.length)+' صورة','success',3500);
    _updateCloudBtn('ok');
  }catch(e){
    var msg=e.message||'خطأ';
    _syncLog('error','فشل الرفع',msg);
    if(msg.includes('503')||msg.includes('502'))msg='GitHub غير متاح مؤقتاً';
    else if(msg.includes('401')||msg.includes('403'))msg='خطأ مصادقة';
    _showCloudToast('❌ فشل الرفع: '+msg,'error',5000);
    _updateCloudBtn('error');
  }finally{
    _cloudSyncing=false;
    _updateCloudBtn('ok');
  }
}

async function _doDownload(forceReplace){
  if(!_isCloudConfigured()){openCloudSetup();return;}
  if(_cloudSyncing){_showCloudToast('⏳ عملية مزامنة جارية...','info',2000);return;}
  _syncLog('info','بدأ التنزيل',forceReplace?'استبدال':'دمج');
  _showCloudToast('🔄 جارٍ التنزيل...','syncing',0);
  try{
    var gistId=localStorage.getItem(CLOUD_GIST_KEY)||CLOUD_CONFIG.GIST_ID||'';
    if(!gistId)throw new Error('لا يوجد Gist مُعيَّن');
    // قراءة البيانات
    var enc=await _gistReadFile(gistId,CLOUD_CONFIG.GIST_FILE);
    if(!enc)throw new Error('ملف البيانات غير موجود');
    var d=JSON.parse(await cloudDecrypt(enc.trim()));
    if(!d.people||!Array.isArray(d.people))throw new Error('بيانات غير صالحة');
    // قراءة الصور (chunks أو قديم)
    try{
      var encP=await _gistReadFile(gistId,CLOUD_PHOTOS_FILE);
      var cloudPhotos=null;
      if(encP&&encP.startsWith('CHUNKED_V2')){
        var m=encP.match(/CHUNKED_V2_chunks=(\d+)/);
        if(m)cloudPhotos=await _readPhotoChunks(gistId,parseInt(m[1]));
      }else if(encP&&encP.length>10&&!encP.startsWith('RESET_')){
        try{cloudPhotos=JSON.parse(await cloudDecrypt(encP.trim()));}catch(e){}
      }
      if(cloudPhotos){
        var newHashes=_getSyncedHashes();
        d.people.forEach(p=>{
          var cPhoto=cloudPhotos[p.id]||cloudPhotos[String(p.id)];
          if(!cPhoto||cPhoto.length<100)return;
          var localP=people.find(lp=>lp.id===p.id);
          var localPhoto=localP?localP.photo:null;
          if(forceReplace||!localPhoto||localPhoto.length!==cPhoto.length){p.photo=cPhoto;}
          else{p.photo=localPhoto;}
          newHashes[p.id]=p.photo.length;
        });
        _saveSyncedHashes(newHashes);
        _syncLog('info','صور محمَّلة: '+d.people.filter(p=>p.photo).length);
      }
    }catch(pe){_syncLog('warn','خطأ في الصور: '+pe.message);}
    if(forceReplace){
      people=d.people;nextId=d.nextId||1;relPairs=d.relPairs||[];
      if(d.myPersonId){myPersonId=parseInt(d.myPersonId);saveMyPerson();}
      expanded={};people.forEach(p=>{expanded[p.id]=false;});
      migrateExternalSpouses();if(people.length)expanded[people[0].id]=true;
      var newH2={};people.forEach(p=>{if(p.photo)newH2[p.id]=p.photo.length;});_saveSyncedHashes(newH2);
      _markDeviceInit();saveData();_persistPhotosToIDB().catch(()=>{});
      renderAll();updateMyPersonBtn();_setLastSync();
      var photoCnt=d.people.filter(p=>p.photo).length;
      _syncLog('ok','استبدال كامل',d.people.length+' فرد، '+photoCnt+' صورة');
      _showCloudToast('✅ استبدال كامل — '+d.people.length+' فرد · '+photoCnt+' صورة','success',4000);
    }else{
      var{added,updated}=_cloudSmartMerge(d,{mode:'cloud'});
      migrateExternalSpouses();_invalidateAll();_markDeviceInit();
      saveData();_persistPhotosToIDB().catch(()=>{});
      renderAll();updateMyPersonBtn();_setLastSync();
      _syncLog('ok','اكتمل الدمج','+'+added+' جديد، تحديث '+updated);
      _showCloudToast('✅ دُمج: +'+added+' جديد · '+updated+' تحديث','success',3500);
    }
  }catch(e){
    _syncLog('error','فشل التنزيل',e.message);
    _showCloudToast('❌ فشل التنزيل: '+(e.message||''),'error',5000);
  }
}

// ══════════════════════════════════════════════════════════
//  Sync Panel UI
function openCloudSyncPanel(){
  if(!_isCloudConfigured()){openCloudSetup();return;}
  var gistId=localStorage.getItem(CLOUD_GIST_KEY)||CLOUD_CONFIG.GIST_ID||'';
  var validPhotos=people.filter(p=>_isValidPhoto(p.photo));
  var invalidCount=people.filter(p=>p.photo&&!_isValidPhoto(p.photo)).length;
  var sizeKB=Math.round(validPhotos.reduce((s,p)=>s+p.photo.length*0.75/1024,0));
  var sizeLabel=sizeKB>1024?(sizeKB/1024).toFixed(1)+' MB':sizeKB+' KB';
  var lastSync=_getLastSync();
  var lastLabel=lastSync?new Date(lastSync).toLocaleString('ar-SA',{hour:'2-digit',minute:'2-digit',day:'2-digit',month:'2-digit'}):'لم تتم مزامنة بعد';
  var gistShare=gistId?
    '<div style="padding:10px 12px;background:#d1fae5;border:1px solid #6ee7b7;border-radius:10px;margin-bottom:12px">'+
    '<div style="font-size:12px;font-weight:600;color:#065f46;margin-bottom:6px">🔗 معرّف السحابة — شاركه مع أجهزتك الأخرى</div>'+
    '<div style="display:flex;gap:6px;align-items:center">'+
    '<code style="flex:1;font-size:10px;background:#fff;padding:5px 8px;border-radius:6px;border:1px solid #a7f3d0;word-break:break-all;color:#065f46">'+gistId+'</code>'+
    '<button class="btn" id="copyGistBtn" onclick="_copyGistId()" style="font-size:11px;flex-shrink:0">📋</button>'+
    '</div><div style="font-size:10px;color:#065f46;margin-top:4px">على الجهاز الآخر: الإعدادات ← أدخل هذا الـ ID في حقل Gist ID</div></div>'
    :'<div style="padding:8px 12px;background:#fef9c3;border:1px solid #eab308;border-radius:8px;margin-bottom:12px;font-size:12px;color:#713f12">⚠️ ارفع البيانات أولاً للحصول على معرّف السحابة</div>';
  var warnHtml='';
  if(invalidCount>0)warnHtml+='<div style="padding:7px 10px;background:#fff7ed;border:1px solid #fb923c;border-radius:7px;font-size:11px;color:#9a3412;margin-bottom:8px">⚠️ '+invalidCount+' صورة بمسار محلي (blob) — لن تُرفع</div>';
  if(sizeKB>8000)warnHtml+='<div style="padding:7px 10px;background:#fef9c3;border:1px solid #eab308;border-radius:7px;font-size:11px;color:#713f12;margin-bottom:8px">⚠️ حجم كبير ('+sizeLabel+') — قد يستغرق الرفع وقتاً</div>';
  var html='<div class="modal-overlay" onclick="if(event.target===this)closeModal()"><div class="modal" style="max-width:500px">'+
    '<h3 style="display:flex;align-items:center;gap:8px;margin-bottom:12px">☁️ المزامنة السحابية <span id="cloudLastSyncTimePnl" style="font-size:11px;font-weight:400;color:var(--text2);margin-right:auto"></span></h3>'+
    gistShare+
    '<div style="padding:10px 12px;background:var(--bg-secondary);border:1px solid var(--card-border);border-radius:8px;margin-bottom:12px;font-size:12px">'+
    '<div style="display:flex;justify-content:space-between;margin-bottom:4px"><span style="color:var(--text2)">آخر مزامنة</span><span style="font-weight:600">'+lastLabel+'</span></div>'+
    '<div style="display:flex;justify-content:space-between"><span style="color:var(--text2)">البيانات المحلية</span><span>'+people.length+' فرد · '+validPhotos.length+' صورة · '+sizeLabel+'</span></div></div>'+
    warnHtml+
    '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:10px">'+
    '<button class="btn primary" onclick="closeModal();_doUpload()" style="padding:12px;font-size:13px;display:flex;flex-direction:column;align-items:center;gap:3px"><span style="font-size:20px">⬆️</span><span style="font-weight:600">رفع</span><span style="font-size:10px;opacity:.7">'+people.length+' فرد · '+validPhotos.length+' صورة</span></button>'+
    '<button class="btn" onclick="closeModal();_doDownload(false)" style="padding:12px;font-size:13px;display:flex;flex-direction:column;align-items:center;gap:3px;background:#ede9fe;border-color:#8b5cf6;color:#5b21b6"><span style="font-size:20px">⬇️</span><span style="font-weight:600">مزامنة ذكية</span><span style="font-size:10px;opacity:.7">يفحص التعارضات</span></button>'+
    '</div>'+
    '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:10px">'+
    '<button class="btn" onclick="closeModal();cloudRestorePrompt()" style="flex:1;font-size:12px;background:#fff7ed;border-color:#fb923c;color:#c2410c">🔄 استبدال كامل</button>'+
    '<button class="btn" onclick="openSyncDebugPanel()" style="flex:1;font-size:12px">🔍 سجل</button>'+
    '<button class="btn" onclick="openCloudResetPanel()" style="flex:1;font-size:12px;background:#fee2e2;border-color:#fca5a5;color:#b91c1c">🗑 ضبط</button>'+
    '</div>'+
    '<div class="modal-footer" style="margin-top:8px"><button class="btn" onclick="closeModal()">إغلاق</button><button class="btn" onclick="closeModal();openCloudSetup()" style="font-size:11px">⚙️ الإعدادات</button></div>'+
    '</div></div>';
  document.getElementById('modalContainer').innerHTML=html;
  var el=document.getElementById('cloudLastSyncTimePnl');
  if(el&&lastSync){var d2=new Date(lastSync),now=new Date(),dm=Math.floor((now-d2)/60000);el.textContent='☁️ '+( dm<1?'الآن':dm<60?dm+' دقيقة':Math.floor(dm/60)+' ساعة')+' مضت';}
}


async function _restoreFromOtherGist(forceReplace){
  var otherId=(document.getElementById('otherGistInput')?.value||'').trim();
  if(!otherId||otherId.length<16){alert('أدخل Gist ID صالح (20+ حرف)');return;}
  closeModal();
  var prevId=localStorage.getItem(CLOUD_GIST_KEY)||'';
  localStorage.setItem(CLOUD_GIST_KEY,otherId);CLOUD_CONFIG.GIST_ID=otherId;
  _syncLog('info','استعادة من Gist خارجي',otherId);
  try{
    await _doDownload(forceReplace);
    // نجح — احتفظ بالـ Gist الجديد
  }catch(e){
    localStorage.setItem(CLOUD_GIST_KEY,prevId);CLOUD_CONFIG.GIST_ID=prevId;
    _syncLog('error','فشل Gist الخارجي',e.message);
    _showCloudToast('❌ فشل: '+(e.message||''),'error',5000);
  }
}

function openCloudResetPanel(){
  var html='<div class="modal-overlay" onclick="if(event.target===this)closeModal()"><div class="modal" style="max-width:420px">'+
    '<h3 style="color:#dc2626">🗑 إعادة ضبط السحابة</h3>'+
    '<div style="padding:9px 12px;background:#fee2e2;border:1px solid #fca5a5;border-radius:8px;margin-bottom:14px;font-size:12px;color:#991b1b;line-height:1.7">'+
    '⚠️ سيُستبدَل محتوى الـ Gist بعلامة reset. بياناتك المحلية لن تُمَس.</div>'+
    '<div style="margin-bottom:12px">'+
    '<label style="display:flex;align-items:center;gap:8px;margin-bottom:7px;cursor:pointer"><input type="checkbox" id="rst_data" checked><span style="font-size:13px">📄 ملف البيانات</span></label>'+
    '<label style="display:flex;align-items:center;gap:8px;margin-bottom:7px;cursor:pointer"><input type="checkbox" id="rst_photos" checked><span style="font-size:13px">🖼 ملفات الصور (chunks)</span></label>'+
    '<label style="display:flex;align-items:center;gap:8px;cursor:pointer"><input type="checkbox" id="rst_local"><span style="font-size:13px">🗄 مسح سجل المزامنة المحلي</span></label>'+
    '</div>'+
    '<div class="modal-footer"><button class="btn" onclick="closeModal();openCloudSyncPanel()">إلغاء</button><button class="btn" style="background:#dc2626;color:#fff;border-color:#dc2626" onclick="_execReset()">تنفيذ</button></div>'+
    '</div></div>';
  document.getElementById('modalContainer').innerHTML=html;
}

async function _execReset(){
  var delData=document.getElementById('rst_data')?.checked;
  var delPhotos=document.getElementById('rst_photos')?.checked;
  var delLocal=document.getElementById('rst_local')?.checked;
  var gistId=localStorage.getItem(CLOUD_GIST_KEY)||CLOUD_CONFIG.GIST_ID||'';
  closeModal();
  _showCloudToast('🗑 جارٍ إعادة الضبط...','syncing',0);
  try{
    if(gistId&&(delData||delPhotos)){
      var vRes=await fetch('https://api.github.com/gists/'+gistId,{headers:_gistHeaders()});
      var existingFiles={};
      if(vRes.ok){var vj=await vRes.json();existingFiles=vj.files||{};}
      var MARKER='RESET_'+new Date().toISOString();
      var filesObj={};
      if(delData&&existingFiles[CLOUD_CONFIG.GIST_FILE])filesObj[CLOUD_CONFIG.GIST_FILE]={content:MARKER};
      if(delPhotos){
        // احذف كل chunk files
        Object.keys(existingFiles).forEach(fn=>{
          if((fn===CLOUD_PHOTOS_FILE||fn.startsWith('ft_photos_'))&&existingFiles[fn])
            filesObj[fn]={content:MARKER};
        });
      }
      if(Object.keys(filesObj).length>0)await _gistUpdate(gistId,filesObj);
      _syncLog('ok','أُعيد ضبط الـ Gist',Object.keys(filesObj).join(', '));
    }
    if(delLocal){try{localStorage.removeItem(_SYNC_LOG_KEY);localStorage.removeItem(_LAST_SYNC_KEY);localStorage.removeItem(CLOUD_PHOTO_HASHES_KEY);}catch(e){}};
    _showCloudToast('✅ تمت إعادة الضبط — ارفع نسخة نظيفة الآن','success',4000);
  }catch(e){
    var msg=e.message||'';
    if(msg.includes('422'))msg='تعذّر تعديل Gist — تحقق من صلاحيات التوكن';
    _showCloudToast('❌ '+msg,'error',5000);
  }
}

function openSyncDebugPanel(){
  var logs=_getSyncLog();
  var gistId=localStorage.getItem(CLOUD_GIST_KEY)||CLOUD_CONFIG.GIST_ID||'';
  var hashes=_getSyncedHashes();
  var unsynced=people.filter(p=>p.photo&&hashes[p.id]!==p.photo.length).length;
  var invalid=people.filter(p=>p.photo&&!_isValidPhoto(p.photo)).length;
  var logHtml=logs.length?logs.map(l=>{
    var icon=l.level==='ok'?'✅':l.level==='error'?'❌':l.level==='warn'?'⚠️':'ℹ️';
    var t=new Date(l.ts).toLocaleTimeString('ar-SA',{hour:'2-digit',minute:'2-digit',second:'2-digit'});
    return '<div style="display:flex;gap:6px;padding:4px 0;border-bottom:1px solid var(--card-border);font-size:11px"><span style="color:var(--text2);white-space:nowrap">'+t+'</span><span>'+icon+' '+l.msg+(l.detail?' — <span style="color:var(--text2)">'+l.detail+'</span>':'')+'</span></div>';
  }).join(''):'<div style="color:var(--text2);text-align:center;padding:20px;font-size:12px">لا يوجد سجل</div>';
  var html='<div class="modal-overlay" onclick="if(event.target===this)closeModal()"><div class="modal" style="max-width:560px;width:min(560px,96vw)">'+
    '<h3>🔍 تشخيص المزامنة والصور</h3>'+
    '<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:6px;margin-bottom:12px">'+
    [['👥',people.length,'الأفراد',''],['📷',people.filter(p=>_isValidPhoto(p.photo)).length,'صور صالحة',''],
     ['📤',unsynced,'غير مزامنة',unsynced>0?'#dc2626':'#15803d'],['⚠️',invalid,'صور blob',invalid>0?'#92400e':'#15803d'],
     ['🕐',_getLastSync()?new Date(_getLastSync()).toLocaleTimeString('ar-SA',{hour:'2-digit',minute:'2-digit'}):'—','آخر مزامنة','']
    ].map(([ic,v,lbl,col])=>'<div style="background:var(--bg-secondary);border:1px solid var(--card-border);border-radius:7px;padding:7px;text-align:center"><div style="font-size:10px;color:var(--text2)">'+lbl+'</div><div style="font-size:15px;font-weight:700;color:'+(col||'var(--text)')+'">'+v+'</div></div>').join('')+
    '</div>'+
    '<div style="font-size:11px;color:var(--text2);margin-bottom:8px">Gist: '+(gistId?'<a href="https://gist.github.com/'+gistId+'" target="_blank" style="color:#3b82f6;font-family:monospace">'+gistId.slice(0,20)+'...</a>':'غير مُعيَّن')+'</div>'+
    '<div style="font-size:12px;font-weight:600;margin-bottom:5px">سجل العمليات</div>'+
    '<div style="max-height:38vh;overflow-y:auto;border:1px solid var(--card-border);border-radius:8px;padding:6px 10px">'+logHtml+'</div>'+
    '<div class="modal-footer" style="margin-top:10px;position:relative;z-index:1"><button class="btn" onclick="_clearSyncLog();openSyncDebugPanel()" style="font-size:11px">🗑 مسح</button><button class="btn" onclick="closeModal();openCloudSyncPanel()">رجوع</button></div>'+
    '</div></div>';
  document.getElementById('modalContainer').innerHTML=html;
}


function _copyGistId(){
  var gistId=localStorage.getItem(CLOUD_GIST_KEY)||CLOUD_CONFIG.GIST_ID||'';
  if(!gistId)return;
  var btn=document.getElementById('copyGistBtn');
  navigator.clipboard.writeText(gistId).then(function(){
    if(btn)btn.textContent='✅';
    setTimeout(function(){if(btn)btn.textContent='📋';},2000);
  }).catch(function(){
    var r=prompt('انسخ الـ ID:',gistId);
  });
}

document.addEventListener('DOMContentLoaded',function(){setTimeout(_refreshMergeHistoryButtons,0);});
