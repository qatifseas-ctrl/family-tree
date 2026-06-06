// ╔══════════════════════════════════════════════════════════════════╗
// ║  نظام الحفظ السحابي المشفَّر                                     ║
// ║  ENCRYPTED CLOUD SAVE SYSTEM                                     ║
// ╚══════════════════════════════════════════════════════════════════╝

// ── مساعدات التشفير ──
function _hexToBytes(hex){
  let bytes=new Uint8Array(hex.length/2);
  for(let i=0;i<bytes.length;i++)bytes[i]=parseInt(hex.substr(i*2,2),16);
  return bytes;
}
function _bytesToBase64(bytes){
  let bin='';bytes.forEach(b=>bin+=String.fromCharCode(b));return btoa(bin);
}
function _base64ToBytes(b64){
  let bin=atob(b64),bytes=new Uint8Array(bin.length);
  for(let i=0;i<bin.length;i++)bytes[i]=bin.charCodeAt(i);return bytes;
}
async function _getCryptoKey(){
  if(!CLOUD_CONFIG.KEY_HEX||CLOUD_CONFIG.KEY_HEX.length!==64)throw new Error('مفتاح التشفير غير صالح');
  return crypto.subtle.importKey('raw',_hexToBytes(CLOUD_CONFIG.KEY_HEX),{name:'AES-GCM'},false,['encrypt','decrypt']);
}

// تشفير نص → base64 (IV:12bytes + ciphertext)
async function cloudEncrypt(plainText){
  let key=await _getCryptoKey();
  let iv=crypto.getRandomValues(new Uint8Array(12));
  let encoded=new TextEncoder().encode(plainText);
  let cipher=await crypto.subtle.encrypt({name:'AES-GCM',iv},key,encoded);
  let combined=new Uint8Array(12+cipher.byteLength);
  combined.set(iv,0);combined.set(new Uint8Array(cipher),12);
  return _bytesToBase64(combined);
}

// فك تشفير base64 → نص
async function cloudDecrypt(b64){
  let key=await _getCryptoKey();
  let combined=_base64ToBytes(b64);
  let iv=combined.slice(0,12);
  let cipher=combined.slice(12);
  let plain=await crypto.subtle.decrypt({name:'AES-GCM',iv},key,cipher);
  return new TextDecoder().decode(plain);
}

// ── GitHub Gist API ──
function _gistHeaders(){
  return {'Authorization':'token '+CLOUD_CONFIG.GITHUB_PAT,'Content-Type':'application/json','Accept':'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28'};
}
async function _gistCreate(filesObj){
  let res=await fetch('https://api.github.com/gists',{method:'POST',headers:_gistHeaders(),body:JSON.stringify({description:'Family Tree Encrypted Backup',public:false,files:filesObj})});
  if(!res.ok)throw new Error('GitHub API: '+res.status+' '+res.statusText);
  let j=await res.json();return j.id;
}
async function _gistUpdate(gistId,filesObj){
  // retry على 5xx
  let delay=1500;
  for(let i=0;i<3;i++){
    if(i>0)await new Promise(r=>setTimeout(r,delay*=2));
    try{
      let res=await fetch('https://api.github.com/gists/'+gistId,{method:'PATCH',headers:_gistHeaders(),body:JSON.stringify({files:filesObj})});
      if((res.status>=500||res.status===429)&&i<2){console.warn('[GistUpdate] HTTP',res.status,'retry',i+1);continue;}
      if(!res.ok)throw new Error('GitHub API: '+res.status+' '+res.statusText);
      return;
    }catch(e){if(i>=2)throw e;}
  }
}
async function _ghRetry(fn, tries){
  tries=tries||3;
  let delay=1500;
  for(let i=0;i<tries;i++){
    if(i>0){ await new Promise(r=>setTimeout(r,delay)); delay=Math.min(delay*2,12000); }
    try{
      let res=await fn();
      if(res.status===429){
        let ra=parseInt(res.headers.get('Retry-After')||'15');
        await new Promise(r=>setTimeout(r,Math.min(ra*1000,30000)));
        continue;
      }
      if((res.status>=500||res.status===408)&&i<tries-1){
        console.warn('[IMG-SYNC] HTTP',res.status,'retry',i+1);
        continue;
      }
      return res;
    }catch(e){ if(i===tries-1)throw e; }
  }
}

// ── جلب كامل الـ Gist مرة واحدة وإعادة كائن الملفات ──
// يحفظ نتيجته لـ 30 ثانية لمنع الطلبات المتكررة
let _gistCache={id:'',ts:0,files:{}};
async function _gistFetchAllFiles(gistId){
  let now=Date.now();
  // استخدم الكاش إذا كان حديثاً (أقل من 30 ثانية) وللنفس Gist
  if(_gistCache.id===gistId&&now-_gistCache.ts<30000){
    console.debug('[IMG-SYNC] Using cached gist files');
    return _gistCache.files;
  }
  let res=await _ghRetry(()=>fetch('https://api.github.com/gists/'+gistId,{headers:_gistHeaders()}),3);
  if(!res.ok)throw new Error('GitHub API: '+res.status+' '+res.statusText);
  let j=await res.json();
  let result={};
  for(let fname of Object.keys(j.files||{})){
    let f=j.files[fname];
    if(!f)continue;
    if(f.truncated&&f.raw_url){
      // ملف كبير: جلبه من raw_url
      try{
        let rr=await _ghRetry(()=>fetch(f.raw_url,{headers:_gistHeaders()}),3);
        if(rr.ok){ result[fname]=await rr.text(); continue; }
      }catch(e){ console.warn('[IMG-SYNC] raw_url failed for',fname); }
      // fallback: raw+json
      try{
        let rr2=await _ghRetry(()=>fetch('https://api.github.com/gists/'+gistId,
          {headers:{..._gistHeaders(),'Accept':'application/vnd.github.raw+json'}}),2);
        if(rr2.ok){ let j2=await rr2.json(); if(j2.files?.[fname]?.content)result[fname]=j2.files[fname].content; }
      }catch(e2){ console.warn('[IMG-SYNC] raw+json fallback failed for',fname); }
    } else {
      result[fname]=f.content||'';
    }
  }
  _gistCache={id:gistId,ts:now,files:result};
  return result;
}
function _invalidateGistCache(){ _gistCache={id:'',ts:0,files:{}}; }

async function _gistReadFile(gistId,filename){
  // جلب الـ Gist مع retry على 5xx/429
  async function _grf_fetch(url,opts,tries){
    let delay=1500;
    for(let i=0;i<(tries||3);i++){
      if(i>0)await new Promise(r=>setTimeout(r,delay*=2));
      try{
        let res=await fetch(url,opts);
        if(res.status===429){let ra=parseInt(res.headers.get('Retry-After')||'10');await new Promise(r=>setTimeout(r,Math.min(ra*1000,20000)));continue;}
        if((res.status>=500||res.status===408)&&i<(tries||3)-1){console.warn('[GistRead] HTTP',res.status,'retry',i+1);continue;}
        return res;
      }catch(e){if(i>=(tries||3)-1)throw e;}
    }
  }
  let res=await _grf_fetch('https://api.github.com/gists/'+gistId,{headers:_gistHeaders()},3);
  if(!res.ok)throw new Error('GitHub API: '+res.status+' '+res.statusText);
  let j=await res.json();
  let f=j.files&&j.files[filename];
  if(!f)return null;
  if(f.truncated){
    // ملف كبير — جرّب raw_url مع retry
    if(f.raw_url){
      try{
        let rr=await _grf_fetch(f.raw_url,{headers:_gistHeaders()},3);
        if(rr&&rr.ok)return await rr.text();
        console.warn('[GistRead] raw_url status:',rr&&rr.status);
      }catch(e){console.warn('[GistRead] raw_url failed:',e.message);}
    }
    // انتظر 3 ثوانٍ وأعد المحاولة (503 GitHub CDN عابر)
    await new Promise(r=>setTimeout(r,3000));
    try{
      let rr2=await _grf_fetch('https://api.github.com/gists/'+gistId,{headers:_gistHeaders()},2);
      if(rr2&&rr2.ok){
        let j2=await rr2.json();
        let f2=j2.files&&j2.files[filename];
        if(f2&&f2.raw_url){
          let rr3=await _grf_fetch(f2.raw_url,{headers:_gistHeaders()},2);
          if(rr3&&rr3.ok)return await rr3.text();
        }
        if(f2&&!f2.truncated&&f2.content)return f2.content;
      }
    }catch(e2){console.warn('[GistRead] Retry also failed:',e2.message);}
    throw new Error('ملف الصور كبير جداً (>1MB) — قلّل حجم الصور ثم أعد الرفع');
  }
  return f.content||null;
}
async function _gistRead(gistId){
  let content=await _gistReadFile(gistId,CLOUD_CONFIG.GIST_FILE);
  if(!content)throw new Error('الملف غير موجود في Gist');
  return content;
}

// ── حالة السحابة ──
let _cloudSyncTimer=null;
let _cloudSyncing=false;
let _cloudEnabled=false;

function _isCloudConfigured(){
  return !!(CLOUD_CONFIG.KEY_HEX&&CLOUD_CONFIG.KEY_HEX.length===64&&CLOUD_CONFIG.GITHUB_PAT&&CLOUD_CONFIG.GITHUB_PAT.trim());
}

// ══════════════════════════════════════════════════════════
//  رفع صامت — نسخة العائلة (لا توست، لا إشعار، لا شيء)
// ══════════════════════════════════════════════════════════
function _isFamilyUploadConfigured(){
  return !!(FAMILY_UPLOAD_CONFIG.GITHUB_PAT&&FAMILY_UPLOAD_CONFIG.GITHUB_PAT.trim());
}
let _familyUploadTimer=null;
let _familyUploading=false;
function triggerFamilyUpload(){
  if(!_isFamilyUploadConfigured())return;
  clearTimeout(_familyUploadTimer);
  _familyUploadTimer=setTimeout(()=>_doSilentFamilyUpload(),5000);
}
async function _doSilentFamilyUpload(){
  if(!_isFamilyUploadConfigured()||_familyUploading)return;
  _familyUploading=true;
  try{
    // التشفير إلزامي — استخدم مفتاح نسخة العائلة أو مفتاح المالك كبديل تلقائي
    let activeKey=(FAMILY_UPLOAD_CONFIG.KEY_HEX&&FAMILY_UPLOAD_CONFIG.KEY_HEX.length===64)
      ? FAMILY_UPLOAD_CONFIG.KEY_HEX
      : (CLOUD_CONFIG.KEY_HEX&&CLOUD_CONFIG.KEY_HEX.length===64 ? CLOUD_CONFIG.KEY_HEX : null);
    if(!activeKey){
      // لا يوجد مفتاح تشفير — لا نرفع أبداً (حماية البيانات)
      console.debug('[FamilyUpload] No encryption key — upload skipped for security');
      _familyUploading=false;
      return;
    }
    // بناء payload (بدون صور)
    let _devName=localStorage.getItem('ft_family_device_name')||FAMILY_DEVICE_ID||'';
    let data=JSON.parse(JSON.stringify({people,relPairs,nextId,myPersonId:myPersonId||null,uploadedAt:new Date().toISOString(),deviceName:_devName,deviceId:_getFamilyGistFileName().replace(/^ft_family_/,'').replace(/\.dat$/,'')}));
    data.people.forEach(p=>{if(p.photo)delete p.photo;});
    let plain=JSON.stringify(data);
    // AES-256-GCM دائماً — بدون بديل
    let keyBytes=_hexToBytes(activeKey);
    let cryptoKey=await crypto.subtle.importKey('raw',keyBytes,{name:'AES-GCM'},false,['encrypt']);
    let iv=crypto.getRandomValues(new Uint8Array(12));
    let cipher=await crypto.subtle.encrypt({name:'AES-GCM',iv},cryptoKey,new TextEncoder().encode(plain));
    let combined=new Uint8Array(12+cipher.byteLength);
    combined.set(iv,0);combined.set(new Uint8Array(cipher),12);
    let content='ENC:'+_bytesToBase64(combined);
    let gistId=FAMILY_UPLOAD_CONFIG.GIST_ID||localStorage.getItem(FAMILY_UPLOAD_GIST_KEY)||'';
    let headers={'Authorization':'token '+FAMILY_UPLOAD_CONFIG.GITHUB_PAT,'Content-Type':'application/json','Accept':'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28'};
    if(gistId){
      let res=await fetch('https://api.github.com/gists/'+gistId,{method:'PATCH',headers,body:JSON.stringify({files:{[_getFamilyGistFileName()]:{content}}})});
      if(!res.ok){
        // Gist ربما محذوف — أنشئ جديداً
        let r2=await fetch('https://api.github.com/gists',{method:'POST',headers,body:JSON.stringify({description:'Family Tree — Auto Update',public:false,files:{[_getFamilyGistFileName()]:{content}}})});
        if(r2.ok){let j=await r2.json();localStorage.setItem(FAMILY_UPLOAD_GIST_KEY,j.id);}
      }
    } else {
      let res=await fetch('https://api.github.com/gists',{method:'POST',headers,body:JSON.stringify({description:'Family Tree — Auto Update',public:false,files:{[_getFamilyGistFileName()]:{content}}})});
      if(res.ok){let j=await res.json();localStorage.setItem(FAMILY_UPLOAD_GIST_KEY,j.id);}
    }
  }catch(e){
    // صامت تماماً — لا نُظهر أي خطأ للمستخدم
    console.debug('[FamilyUpload]',e.message);
  }finally{_familyUploading=false;}
}

// ══════════════════════════════════════════════════════════
//  واجهة المالك — إعداد نسخة العائلة
// ══════════════════════════════════════════════════════════
function openFamilyUploadSetup(){
  let pat=FAMILY_UPLOAD_CONFIG.GITHUB_PAT||'';
  let gid=FAMILY_UPLOAD_CONFIG.GIST_ID||'';
  let key=FAMILY_UPLOAD_CONFIG.KEY_HEX||'';
  let html=`<div class="modal-overlay" onclick="if(event.target===this)closeModal()">
  <div class="modal" style="max-width:520px">
    <h3>📡 إعداد رفع نسخة العائلة</h3>
    <div style="font-size:12px;color:var(--text2);background:var(--bg-secondary);border:1px solid var(--card-border);border-radius:8px;padding:10px 12px;margin-bottom:14px;line-height:1.8">
      <strong style="color:var(--text)">كيف يعمل؟</strong><br>
      أنت تضع توكن GitHub يسمح بالكتابة على Gist.<br>
      نسخة العائلة ترفع تلقائياً في الخلفية <strong>بدون أي إشعار</strong> للمستخدم.<br>
      أنت كمالك تضغط <strong>"📡 تحديثات العائلة"</strong> لتطلع على آخر رفع وتنزّله.
    </div>
    <div class="form-row">
      <label>👤 اسم الجهاز / صاحبه (يظهر في قائمة تحديثات العائلة)</label>
      <input id="fu_devname" type="text" value="${localStorage.getItem('ft_family_device_name')||''}" placeholder="مثال: هاتف أحمد، جهاز فاطمة..." style="font-size:13px">
      <div style="font-size:11px;color:var(--text2);margin-top:4px;display:flex;align-items:center;gap:6px;flex-wrap:wrap">💡 معرّف هذا الجهاز: <code style="background:var(--bg-secondary);padding:1px 6px;border-radius:4px;font-family:monospace">${localStorage.getItem('ft_family_device_id')||'(سيُحدَّد عند أول رفع)'}</code></div>
    </div>
    <div class="form-row">
      <label>🐱 GitHub Personal Access Token — خاص بالرفع من العائلة (gist scope)</label>
      <div style="display:flex;gap:6px">
        <input id="fu_pat" type="password" value="${pat}" style="font-family:monospace;font-size:11px;flex:1" placeholder="github_pat_xxxxxxxx...">
        <button class="btn" onclick="let i=document.getElementById('fu_pat');i.type=i.type==='password'?'text':'password'" style="font-size:11px">👁</button>
      </div>
      <div style="margin-top:4px"><a href="https://github.com/settings/tokens/new?scopes=gist&description=FamilyTree-Upload" target="_blank" style="font-size:11px;color:#3b82f6">← إنشاء توكن جديد في GitHub (gist فقط)</a></div>
      <div style="font-size:11px;color:var(--text2);margin-top:3px">💡 يمكنك استخدام نفس التوكن الرئيسي أو إنشاء توكن منفصل</div>
    </div>
    <div class="form-row">
      <label>🔗 معرّف Gist المخصص للعائلة</label>
      <div style="display:flex;gap:6px;align-items:center">
        <input id="fu_gid" type="text" value="${gid}" style="font-family:monospace;font-size:11px;flex:1" placeholder="فارغ → يُنشأ تلقائياً عند أول رفع من العائلة">
        <button class="btn" onclick="createFamilyGistNow()" style="font-size:11px;white-space:nowrap" title="ينشئ Gist الآن ويملأ المعرّف تلقائياً — يُنصح به للتأكد من تطابق Gist بين العائلة والمالك">🧪 إنشاء الآن</button>
      </div>
      <div style="font-size:11px;color:var(--text2);margin-top:3px">💡 اضغط "إنشاء الآن" لإنشاء Gist مخصص ومشاركة معرّفه مع جميع النسخ — هذا يضمن أن تحديثات العائلة تصل إليك بشكل صحيح</div>
    </div>
    <div style="padding:10px 12px;background:#d1fae5;border:1px solid #10b981;border-radius:8px;font-size:12px;color:#065f46;margin-bottom:8px">
      <strong>🔐 التشفير تلقائي وإلزامي:</strong> يُستخدم نفس مفتاح AES-256 الخاص بك — لا يحتاج أي إعداد إضافي.<br>
      حتى لو حصل أحد على رابط الـ Gist لن يتمكن من قراءة البيانات بدون مفتاحك.
    </div>
    <div style="padding:10px 12px;background:#ede9fe;border:1px solid #8b5cf6;border-radius:8px;font-size:12px;color:#5b21b6;margin-bottom:14px">
      <strong>💾 بعد الإعداد:</strong> اضغط <strong>"📤 نسخة للعائلة"</strong> لتصدير نسخة تحتوي هذه الإعدادات مُضمَّنة تلقائياً.<br>
      أفراد العائلة لن يروا أي إشعار رفع — كل شيء يحدث في الخلفية.
    </div>
    <div class="modal-footer">
      <button class="btn" onclick="closeModal()">إلغاء</button>
      <button class="btn primary" onclick="applyFamilyUploadSetup()">✓ حفظ الإعداد</button>
    </div>
  </div></div>`;
  document.getElementById('modalContainer').innerHTML=html;
}
function applyFamilyUploadSetup(){
  let pat=(document.getElementById('fu_pat').value||'').trim();
  let gid=(document.getElementById('fu_gid').value||'').trim();
  let devname=(document.getElementById('fu_devname').value||'').trim();
  if(!pat){alert('الرجاء إدخال GitHub PAT');return;}
  FAMILY_UPLOAD_CONFIG.GITHUB_PAT=pat;
  FAMILY_UPLOAD_CONFIG.GIST_ID=gid;
  if(devname){try{localStorage.setItem('ft_family_device_name',devname);}catch(e){}}
  // ثبّت مفتاح التشفير الخاص بتحديثات العائلة حتى يبقى متاحاً على جميع أجهزة المالك
  if(!FAMILY_UPLOAD_CONFIG.KEY_HEX && CLOUD_CONFIG.KEY_HEX && CLOUD_CONFIG.KEY_HEX.length===64){
    FAMILY_UPLOAD_CONFIG.KEY_HEX = CLOUD_CONFIG.KEY_HEX;
  }
  try{
    localStorage.setItem('ft_fupload_pat',pat);
    localStorage.setItem('ft_fupload_gid',gid);
    if(FAMILY_UPLOAD_CONFIG.KEY_HEX && /^[0-9a-fA-F]{64}$/.test(FAMILY_UPLOAD_CONFIG.KEY_HEX)){
      localStorage.setItem('ft_fupload_key', FAMILY_UPLOAD_CONFIG.KEY_HEX);
    }
  }catch(e){}
  closeModal();
  _showCloudToast('✅ إعداد نسخة العائلة تم حفظه — الآن صدِّر نسخة العائلة','success',3000);
}
async function createFamilyGistNow(){
  let pat=(document.getElementById('fu_pat').value||'').trim();
  if(!pat){alert('أدخل GitHub PAT أولاً');return;}
  let btn=event.target;btn.disabled=true;btn.textContent='⏳ جارٍ الإنشاء...';
  try{
    let headers={'Authorization':'token '+pat,'Content-Type':'application/json','Accept':'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28'};
    let res=await fetch('https://api.github.com/gists',{method:'POST',headers,body:JSON.stringify({description:'Family Tree — Auto Updates',public:false,files:{[_getFamilyGistFileName()]:{content:'{}'}}})}); 
    if(!res.ok)throw new Error('GitHub API: '+res.status);
    let j=await res.json();
    document.getElementById('fu_gid').value=j.id;
    localStorage.setItem(FAMILY_UPLOAD_GIST_KEY,j.id);
    btn.textContent='✅ تم الإنشاء';
    btn.style.background='#d1fae5';btn.style.borderColor='#10b981';btn.style.color='#065f46';
  }catch(e){
    btn.disabled=false;btn.textContent='🧪 إنشاء الآن';
    alert('خطأ: '+e.message);
  }
}
function _loadFamilyUploadSettings(){
  try{
    let pat=localStorage.getItem('ft_fupload_pat')||'';
    // قراءة Gist ID من مفتاحَين مختلفَين (ft_fupload_gid و FAMILY_UPLOAD_GIST_KEY)
    let gid=localStorage.getItem('ft_fupload_gid')
          ||localStorage.getItem(FAMILY_UPLOAD_GIST_KEY)
          ||'';
    let key=localStorage.getItem('ft_fupload_key')||'';
    if(pat&&!FAMILY_UPLOAD_CONFIG.GITHUB_PAT)FAMILY_UPLOAD_CONFIG.GITHUB_PAT=pat;
    if(gid&&!FAMILY_UPLOAD_CONFIG.GIST_ID){
      FAMILY_UPLOAD_CONFIG.GIST_ID=gid;
      // توحيد المفتاحَين حتى لا يختلفا لاحقاً
      try{localStorage.setItem('ft_fupload_gid',gid);localStorage.setItem(FAMILY_UPLOAD_GIST_KEY,gid);}catch(e){}
    }
    if(key&&key.length===64&&!FAMILY_UPLOAD_CONFIG.KEY_HEX)FAMILY_UPLOAD_CONFIG.KEY_HEX=key;
    if(!FAMILY_UPLOAD_CONFIG.KEY_HEX && CLOUD_CONFIG.KEY_HEX && CLOUD_CONFIG.KEY_HEX.length===64){
      FAMILY_UPLOAD_CONFIG.KEY_HEX = CLOUD_CONFIG.KEY_HEX;
    }
  }catch(e){}
}

// ══════════════════════════════════════════════════════════
//  واجهة المالك — عرض آخر تحديث من العائلة
// ══════════════════════════════════════════════════════════
async function _decryptFamilyFile(raw,keyHex){
  if(raw.startsWith('ENC:')){
    let ak=keyHex||(CLOUD_CONFIG.KEY_HEX&&CLOUD_CONFIG.KEY_HEX.length===64?CLOUD_CONFIG.KEY_HEX:'');
    if(!ak||ak.length!==64)throw new Error('مفتاح التشفير مفقود');
    let bytes=_base64ToBytes(raw.slice(4));
    let iv=bytes.slice(0,12),cipher=bytes.slice(12);
    let ck=await crypto.subtle.importKey('raw',_hexToBytes(ak),{name:'AES-GCM'},false,['decrypt']);
    let plain=await crypto.subtle.decrypt({name:'AES-GCM',iv},ck,cipher);
    return JSON.parse(new TextDecoder().decode(plain));
  } else if(raw.startsWith('B64:')){
    let bin=atob(raw.slice(4));
    let bytes=new Uint8Array(bin.length);for(let i=0;i<bin.length;i++)bytes[i]=bin.charCodeAt(i);
    return JSON.parse(new TextDecoder().decode(bytes));
  }
  return JSON.parse(raw);
}

function _familyDisplayName(p){
  if(!p)return '—';
  let n=(p.name||'').trim();
  let f=(p.familyName||'').trim();
  return (n+(f?' '+f:'')).trim()||'—';
}

function _familyGenderLabel(g){
  let v=(g||'').toString().toLowerCase();
  if(v==='male'||v==='m'||v==='1'||v==='ذكر')return 'ذكر';
  if(v==='female'||v==='f'||v==='2'||v==='أنثى')return 'أنثى';
  return 'غير محدد';
}

function _familyPeopleStats(arr){
  let st={males:0,females:0,deceased:0,photos:0,marriages:0};
  (arr||[]).forEach(p=>{
    let g=(p.gender||'').toString().toLowerCase();
    if(g==='male'||g==='m'||g==='ذكر')st.males++;
    else if(g==='female'||g==='f'||g==='أنثى')st.females++;
    if(p.deceased||p.isDeceased||p.dead)st.deceased++;
    if(p.photo)st.photos++;
    if(Array.isArray(p.spouses)&&p.spouses.length)st.marriages++;
  });
  return st;
}

const _FAMILY_COMPARE_IGNORED_KEYS = new Set([
  'photo','uploadedAt','updatedAt','createdAt','timestamp','ts',
  'lastModified','modifiedAt','syncAt','syncedAt','_updatedAt','_createdAt',
  '__meta','_meta','version','deviceId','device','source','sourceDevice'
]);

function _familyCloneValue(v){
  if(v===undefined||v===null)return v;
  if(typeof v==='object')return JSON.parse(JSON.stringify(v));
  return v;
}

function _familyIsIgnoredField(k){
  return _FAMILY_COMPARE_IGNORED_KEYS.has(k) || /^_/.test(k);
}

function _familyFieldLabel(k){
  const labels={
    name:'الاسم',familyName:'اللقب/العائلة',gender:'الجنس',
    parentId:'الولي/الأب',fatherId:'الأب',motherId:'الأم',
    deceased:'الحالة',isDeceased:'الحالة',dead:'الحالة',
    dob:'تاريخ الميلاد',dod:'تاريخ الوفاة',notes:'الملاحظات',note:'الملاحظات',
    spouses:'الأزواج',children:'الأبناء',nickName:'اللقب',nickname:'اللقب',
    place:'المكان',occupation:'الوظيفة',city:'المدينة',country:'الدولة'
  };
  return labels[k] || k;
}

function _familyFormatValue(v){
  if(v===null||v===undefined||v==='')return '—';
  if(Array.isArray(v))return v.length?`${v.length} عنصر`:'—';
  if(typeof v==='object'){
    let s=JSON.stringify(v);
    return s.length>90?s.slice(0,87)+'…':s;
  }
  return String(v);
}

function _familySpouseIdentity(sp,ctx){
  let s=sp||{};
  let map=(ctx&&ctx.personMap)||null;
  let resolved=null;
  if(map){
    if(s.personId!=null && map.get(s.personId))resolved=map.get(s.personId);
    else if(s.relativeId!=null && map.get(s.relativeId))resolved=map.get(s.relativeId);
  }
  let display=resolved ? _familyDisplayName(resolved) : _familyDisplayName(s);
  return {
    name:normalizeAr(display),
    familyName:normalizeAr(s.familyName||''),
    gender:(s.gender||'').toString().toLowerCase(),
    deceased:!!(s.deceased||s.isDeceased||s.dead),
    divorced:!!s.divorced,
    dob:(s.dob||'').toString().trim(),
    dod:(s.dod||'').toString().trim(),
    isExternal:s.isExternal!==false,
    relationType:(s.relationType||s.type||'').toString().toLowerCase(),
    note:normalizeAr(s.notes||s.note||'')
  };
}

function _familyCanonicalSpouses(spouses,ctx){
  let list=Array.isArray(spouses)?spouses:[];
  return list.map(sp=>_familySpouseIdentity(sp,ctx)).sort((a,b)=>{
    let sa=JSON.stringify(a), sb=JSON.stringify(b);
    return sa<sb?-1:sa>sb?1:0;
  });
}

function _familyNormalizeForCompare(value,key,ctx){
  if(value===undefined)return undefined;
  if(value===null)return null;
  if(key==='spouses')return _familyCanonicalSpouses(value,ctx);
  if(Array.isArray(value)){
    let arr=value.map(v=>_familyNormalizeForCompare(v,null,ctx)).filter(v=>v!==undefined);
    return arr.map(v=>JSON.stringify(v)).sort().map(s=>JSON.parse(s));
  }
  if(typeof value==='object'){
    let out={};
    Object.keys(value).sort().forEach(k=>{
      if(k==='id' || _familyIsIgnoredField(k))return;
      let nv=_familyNormalizeForCompare(value[k],k,ctx);
      if(nv!==undefined)out[k]=nv;
    });
    return out;
  }
  if(typeof value==='string')return value.trim();
  return value;
}

function _familyComparablePerson(p,ctx){
  return _familyNormalizeForCompare(p,null,ctx) || {};
}

function _familySpouseDiffText(localSpouses,remoteSpouses,ctx){
  let localKeys=_familyCanonicalSpouses(localSpouses,{personMap:ctx&&ctx.localMap}).map(x=>JSON.stringify(x));
  let remoteKeys=_familyCanonicalSpouses(remoteSpouses,{personMap:ctx&&ctx.incomingMap}).map(x=>JSON.stringify(x));
  let localSet=new Set(localKeys), remoteSet=new Set(remoteKeys);
  let added=remoteKeys.filter(x=>!localSet.has(x));
  let removed=localKeys.filter(x=>!remoteSet.has(x));
  if(!added.length && !removed.length)return '';
  let parts=[];
  if(added.length)parts.push(`+${added.length} جديد`);
  if(removed.length)parts.push(`-${removed.length} قديم`);
  return `الأزواج: ${parts.join('، ')}`;
}

function _familyChangeDescription(local,remote,incomingMap){
  let localMap=new Map((people||[]).map(p=>[p.id,p]));
  let ctx={localMap,incomingMap};
  let a=_familyComparablePerson(local,{personMap:localMap});
  let b=_familyComparablePerson(remote,{personMap:incomingMap});
  let diffs=[];
  let keys=new Set([...Object.keys(a),...Object.keys(b)]);
  keys.delete('spouses');
  keys.delete('id');
  keys.delete('photo');
  keys.forEach(k=>{
    let av=a[k], bv=b[k];
    if(JSON.stringify(av)!==JSON.stringify(bv)){
      diffs.push(`${_familyFieldLabel(k)}: ${_familyFormatValue(av)} → ${_familyFormatValue(bv)}`);
    }
  });
  let spouseDiff=_familySpouseDiffText(a.spouses||[],b.spouses||[],ctx);
  if(spouseDiff)diffs.push(spouseDiff);
  return diffs.length?diffs.join('، '):'لا تغيير';
}

function _familySummarizeUpdate(data){
  let incoming=(data&&data.people)||[];
  let incomingMap=_familyIncomingMap(data||{});
  let stats=_familyPeopleStats(incoming);
  let localMap=new Map((people||[]).map(p=>[p.id,p]));
  let newPeople=[],updatedPeople=[],unchangedPeople=[];
  incoming.forEach(p=>{
    let found=_familyMatchLocalPerson(p,incomingMap);
    if(!found){
      newPeople.push(p);
      return;
    }
    let local=found.match;
    let localSig=JSON.stringify(_familyComparablePerson(local,{personMap:localMap}));
    let remoteSig=JSON.stringify(_familyComparablePerson(p,{personMap:incomingMap}));
    if(localSig===remoteSig)unchangedPeople.push(p);
    else updatedPeople.push({local,remote:p,desc:_familyChangeDescription(local,p,incomingMap)});
  });
  return {stats,newPeople,updatedPeople,unchangedPeople,incomingMap};
}

async function _findFamilyUploadsGist(){
  let pat=FAMILY_UPLOAD_CONFIG.GITHUB_PAT||localStorage.getItem('ft_fupload_pat')||'';
  if(!pat)return null;
  try{
    let headers={'Authorization':'token '+pat,'Accept':'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28'};
    for(let page=1;page<=5;page++){
      let res=await fetch('https://api.github.com/gists?per_page=30&page='+page,{headers});
      if(!res.ok)break;
      let list=await res.json();
      if(!Array.isArray(list)||!list.length)break;
      for(let g of list){
        let files=Object.keys(g.files||{});
        if(files.some(n=>/^ft_family_.*\.dat$/i.test(n))){
          localStorage.setItem(FAMILY_UPLOAD_GIST_KEY,g.id);
          FAMILY_UPLOAD_CONFIG.GIST_ID=g.id;
          return g.id;
        }
      }
      if(list.length<30)break;
    }
  }catch(e){}
  return null;
}

function _familyExtractPeoplePayload(node, depth){
  if(!node || typeof node!=='object' || depth>4) return null;
  if(Array.isArray(node.people)) return node;
  if(Array.isArray(node.data) && node.data.every(x=>x && typeof x==='object' && ('id' in x || 'name' in x || 'gender' in x))) {
    return {people: node.data, relPairs: Array.isArray(node.relPairs)?node.relPairs:(Array.isArray(node.relationships)?node.relationships:[]), nextId: node.nextId, myPersonId: node.myPersonId, uploadedAt: node.uploadedAt};
  }
  const nestedKeys=['data','payload','familyData','tree','update','body','content'];
  for(const k of nestedKeys){
    if(node[k] && typeof node[k]==='object'){
      const found=_familyExtractPeoplePayload(node[k], depth+1);
      if(found) return found;
    }
  }
  for(const k of Object.keys(node)){
    const v=node[k];
    if(v && typeof v==='object' && !Array.isArray(v)){
      const found=_familyExtractPeoplePayload(v, depth+1);
      if(found) return found;
    }
  }
  return null;
}

function _familyNormalizeUpdateData(payload){
  if(!payload||typeof payload!=='object')return null;
  let obj=_familyExtractPeoplePayload(payload,0) || payload;
  // بعض النسخ قد تأتي مغلفة داخل data
  if(obj.data && typeof obj.data==='object' && Array.isArray(obj.data.people) && !Array.isArray(obj.people)){
    obj={...obj.data};
    if(obj.uploadedAt==null&&payload.uploadedAt!=null)obj.uploadedAt=payload.uploadedAt;
  }
  // دعم أي صيغة قديمة/بديلة
  if(Array.isArray(obj.people)){
    obj.people=obj.people.filter(Boolean).map(p=>({...(p||{})}));
    if(!Array.isArray(obj.relPairs)) obj.relPairs=Array.isArray(obj.relationships)?obj.relationships:[];
    if(obj.nextId==null) obj.nextId=(obj.people.reduce((m,p)=>Math.max(m,Number(p&&p.id)||0),0)||0)+1;
    return obj;
  }
  if(Array.isArray(obj.data)){
    return {people:obj.data, relPairs:Array.isArray(obj.relPairs)?obj.relPairs:[], nextId:obj.nextId||1, myPersonId:obj.myPersonId||null, uploadedAt:obj.uploadedAt||''};
  }
  return null;
}

function _familyKeyCandidates(extraKey){
  let keys=[
    extraKey,
    FAMILY_UPLOAD_CONFIG.KEY_HEX,
    CLOUD_CONFIG.KEY_HEX,
    localStorage.getItem('ft_fupload_key'),
    localStorage.getItem('ft_cloud_key')
  ].filter(k=>typeof k==='string'&&/^[0-9a-fA-F]{64}$/.test(k));
  return [...new Set(keys)];
}

function _familyIncomingMap(data){
  let arr=(data&&Array.isArray(data.people))?data.people:[];
  return new Map(arr.filter(p=>p&&p.id!=null).map(p=>[p.id,p]));
}

function _familyMatchLocalPerson(remote,incomingMap){
  if(!remote||typeof remote!=='object')return null;
  let arr=Array.isArray(people)?people:[];
  if(!arr.length)return null;
  let localById=new Map(arr.filter(p=>p&&p.id!=null).map(p=>[p.id,p]));

  // 1) مطابقة بالمعرّف نفسه
  if(remote.id!=null && localById.has(remote.id)){
    return {match:localById.get(remote.id), reason:'id'};
  }

  // 2) مطابقة بالهوية المنطقية بعد التطبيع
  let remoteSig=JSON.stringify(_familyComparablePerson(remote,{personMap:incomingMap||new Map()}));
  for(let p of arr){
    try{
      let localSig=JSON.stringify(_familyComparablePerson(p,{personMap:localById}));
      if(localSig===remoteSig){
        return {match:p, reason:'signature'};
      }
    }catch(e){}
  }

  // 3) مطابقة مرنة: الاسم + اللقب + الجنس + الأب/الأم + الميلاد/الوفاة
  const norm=v=>normalizeAr(String(v==null?'':v)).toLowerCase().trim();
  const rn=norm(remote.name), rf=norm(remote.familyName), rg=norm(remote.gender);
  const rdob=norm(remote.dob), rdod=norm(remote.dod);
  const rfather=remote.fatherId??null, rmother=remote.motherId??null;

  let best=null;
  let bestScore=0;

  for(let p of arr){
    let score=0;
    if(rn && norm(p.name)===rn) score+=4;
    if(rf && norm(p.familyName)===rf) score+=2;
    if(rg && norm(p.gender)===rg) score+=1;
    if(rdob && norm(p.dob)===rdob) score+=1;
    if(rdod && norm(p.dod)===rdod) score+=1;
    if(rfather!=null && (p.fatherId??null)===rfather) score+=2;
    if(rmother!=null && (p.motherId??null)===rmother) score+=2;

    // للأسماء المتقاربة جدًا
    if(score>bestScore){
      bestScore=score;
      best=p;
    }
  }

  // الحد الأدنى للمطابقة الضبابية المرفوع لتجنب التطابق الخاطئ:
  // يجب أن يكون الاسم متطابقاً (4 نقاط) + اللقب (2) أو أحد الوالدين (2) على الأقل.
  // أي: score >= 7 يعني (اسم + لقب + جنس) أو ما هو أقوى.
  // الاسم + الجنس فقط (5 نقاط) = لا يكفي → يُصنَّف كشخص جديد.
  let hasName = rn && best && (norm(best.name)===rn);
  let hasFamilyName = rf && best && (norm(best.familyName)===rf);
  let hasParent = best && (
    (rfather!=null && (best.fatherId??null)===rfather) ||
    (rmother!=null && (best.motherId??null)===rmother)
  );
  if(best && bestScore>=7 && hasName && (hasFamilyName||hasParent)){
    return {match:best, reason:'fuzzy', score:bestScore};
  }
  return null;
}

async function _familyParseUpdateRaw(raw,keyHex){
  let src=(raw||'').trim();
  if(!src) throw new Error('الملف فارغ');

  function _tryNormalizeAny(value){
    return _familyNormalizeUpdateData(value);
  }

  // 1) JSON مباشر
  if(src.startsWith('{')||src.startsWith('[')){
    let parsed=JSON.parse(src);
    let norm=_tryNormalizeAny(parsed);
    if(norm)return norm;
    throw new Error('صيغة JSON لا تحتوي على people');
  }

  // 2) Base64 مباشر أو قديم
  if(src.startsWith('B64:')){
    let parsed=await _decryptFamilyFile(src,keyHex);
    let norm=_tryNormalizeAny(parsed);
    if(norm)return norm;
    throw new Error('الملف B64 لا يحتوي على people');
  }

  // 3) مشفّر ENC: — جرّب كل مفاتيح المالك/العائلة المتاحة
  if(src.startsWith('ENC:')){
    let lastErr='';
    let keys=_familyKeyCandidates(keyHex);
    if(!keys.length) keys=[keyHex];
    for(let k of keys){
      try{
        let parsed=await _decryptFamilyFile(src,k);
        let norm=_tryNormalizeAny(parsed);
        if(norm)return norm;
        // في بعض النسخ القديمة قد تكون البيانات داخل حقل واحد إضافي أو نص JSON داخل نص
        if(typeof parsed==='string'){
          try{
            let again=JSON.parse(parsed);
            norm=_tryNormalizeAny(again);
            if(norm)return norm;
          }catch(e){}
        }
        lastErr='الملف المفكوك لا يحتوي على people';
      }catch(e){
        lastErr=e&&e.message?e.message:String(e);
      }
    }
    throw new Error(lastErr||'فشل فك التشفير');
  }

  // 4) محاولة أخيرة: ربما نص JSON غير منسّق أو نص مشفّر قديم بدون بادئة
  try{
    let parsed=JSON.parse(src);
    let norm=_tryNormalizeAny(parsed);
    if(norm)return norm;
  }catch(e){
    // لا نرمي فوراً: قد تكون هناك طبقة ترميز أخرى
  }

  // 5) محاولة فك ترميز base64 خام إن كان الملف القديم بدون بادئة
  try{
    let parsed=await _decryptFamilyFile('B64:'+src,keyHex);
    let norm=_tryNormalizeAny(parsed);
    if(norm)return norm;
  }catch(e){}

  throw new Error('صيغة ملف غير مدعومة');
}

async function openFamilyUpdatesModal(){
  let gistId=FAMILY_UPLOAD_CONFIG.GIST_ID||localStorage.getItem(FAMILY_UPLOAD_GIST_KEY)||localStorage.getItem('ft_fupload_gid')||'';
  // ⚠️ لا نستخدم CLOUD_CONFIG.GITHUB_PAT كـ fallback — له صلاحية repo وليس gist → 401
  // المصدر الوحيد المسموح به: FAMILY_UPLOAD_CONFIG أو localStorage ft_fupload_pat
  let pat=FAMILY_UPLOAD_CONFIG.GITHUB_PAT
    ||localStorage.getItem('ft_fupload_pat')
    ||'';
  let keyHex=FAMILY_UPLOAD_CONFIG.KEY_HEX||localStorage.getItem('ft_fupload_key')||CLOUD_CONFIG.KEY_HEX||localStorage.getItem('ft_cloud_key')||'';
  let readPat=pat; // بدون fallback للـ CLOUD PAT

  if(!gistId&&readPat){
    gistId=await _findFamilyUploadsGist()||'';
  }

  if(!gistId||!readPat){
    // عرض نموذج الإعداد الأولي مباشرةً
    _showFamilyUpdates401Modal('not_configured', '', readPat);
    return;
  }

  document.getElementById('modalContainer').innerHTML=`<div class="modal-overlay"><div class="modal" style="max-width:480px;text-align:center"><div style="font-size:32px;margin-bottom:12px">📡</div><div style="font-size:14px;color:var(--text)">جارٍ جلب تحديثات العائلة...</div></div></div>`;
  try{
    let headers={'Authorization':'token '+readPat,'Accept':'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28'};
    let res=await fetch('https://api.github.com/gists/'+gistId,{headers});

    // ── معالجة 401 / 403 بذكاء ──
    if(res.status===401||res.status===403){
      _showFamilyUpdates401Modal(res.status===403?'forbidden':'unauthorized', gistId, readPat);
      return;
    }
    if(!res.ok) throw new Error('GitHub API: '+res.status);
    let j=await res.json();

    let familyFiles=Object.values(j.files||{}).filter(f=>f.filename&&/^ft_family_.*\.dat$/i.test(f.filename));
    if(!familyFiles.length){
      throw new Error('لا توجد ملفات تحديثات عائلة داخل الـ Gist');
    }

    let updates=[];
    let errorHints=[];
    for(let ff of familyFiles){
      try{
        let raw=ff.content||'';
        if(ff.truncated&&ff.raw_url){
          let r=await fetch(ff.raw_url,{headers});
          raw=await r.text();
        }
        let data=await _familyParseUpdateRaw(raw,keyHex);
        if(data&&Array.isArray(data.people)){
          let summary=_familySummarizeUpdate(data);
          let devId=ff.filename.replace(/^ft_family_/i,'').replace(/\.dat$/i,'');
          updates.push({
            devId,data,summary,
            devName:_resolveDeviceName(devId, data.deviceName||''),
            uploadedName:data.deviceName||'',
            pCount:(data.people||[]).length,
            ts:data.uploadedAt||'',
            filename:ff.filename,
            newCnt:summary.newPeople.length,
            updatedCnt:summary.updatedPeople.length,
            unchangedCnt:summary.unchangedPeople.length
          });
        } else {
          throw new Error('الملف لا يحتوي على people');
        }
      }catch(ex){
        let msg=String(ex&&ex.message?ex.message:ex||'خطأ غير معروف');
        errorHints.push((ff.filename||'unknown')+': '+msg);
        updates.push({devId:(ff.filename||'unknown').replace(/^ft_family_/i,'').replace(/\.dat$/i,''),error:msg,filename:ff.filename});
      }
    }

    let okUpdates=updates.filter(u=>!u.error&&u.data);
    if(!okUpdates.length){
      let hint=errorHints.length?'<div style="margin-top:10px;font-size:11px;color:var(--text2);line-height:1.8;text-align:right;max-height:120px;overflow:auto">'+errorHints.slice(0,6).map(s=>'• '+s.replace(/</g,'&lt;').replace(/>/g,'&gt;')).join('<br>')+'</div>':'';
      throw new Error('لا يمكن قراءة أي تحديث صالح من النسخ الموجودة'+hint);
    }

    let rowsHtml=okUpdates.map((u,idx)=>{
      let ts=u.ts?new Date(u.ts).toLocaleString('ar-SA',{timeZone:'Asia/Riyadh',month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'}):'—';
      let stats=u.summary.stats;
      let chips=[
        `👨 ${stats.males}`,`👩 ${stats.females}`,`⚰️ ${stats.deceased}`,
        `🖼 ${stats.photos}`
      ].map(t=>`<span class="kin-stat" style="display:inline-flex;align-items:center;gap:4px">${t}</span>`).join('');
      // شرائح التغييرات بألوان مميزة
      let changeChips=[
        u.newCnt>0?`<span class="kin-stat" style="display:inline-flex;align-items:center;gap:4px;background:#d1fae5;color:#065f46;border-color:#10b981">➕ ${u.newCnt} جديد</span>`:`<span class="kin-stat" style="display:inline-flex;align-items:center;gap:4px;color:var(--text3)">➕ 0</span>`,
        u.updatedCnt>0?`<span class="kin-stat" style="display:inline-flex;align-items:center;gap:4px;background:#dbeafe;color:#1d4ed8;border-color:#3b82f6">🔄 ${u.updatedCnt} محدَّث</span>`:`<span class="kin-stat" style="display:inline-flex;align-items:center;gap:4px;color:var(--text3)">🔄 0</span>`,
        `<span class="kin-stat" style="display:inline-flex;align-items:center;gap:4px">⏭ ${u.unchangedCnt}</span>`
      ].join('');
      return `<div style="padding:10px 12px;border:1px solid var(--card-border);border-radius:10px;background:var(--card-bg);margin-bottom:10px">
        <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:8px;flex-wrap:wrap;margin-bottom:8px">
          <div style="min-width:0">
            <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap">
              <span style="font-size:13px;font-weight:600;color:var(--text)">📱 ${u.devName||u.devId}</span>
              <button onclick="renameFamilyDevice(${idx},event)" style="font-size:10px;background:none;border:1px solid var(--card-border);border-radius:4px;padding:1px 6px;cursor:pointer;color:var(--text2)" title="تغيير اسم الجهاز">✏️</button>
            </div>
            <div style="font-size:10px;font-family:monospace;color:var(--text2);margin-top:2px">${u.devId}${u.uploadedName&&u.uploadedName!==u.devName?` · رفع باسم: ${u.uploadedName}`:''}</div>
            <div style="font-size:12px;color:var(--text2);margin-top:5px">${u.pCount} فرد · ${ts}</div>
          </div>
          <div style="display:flex;gap:6px;flex-wrap:wrap;justify-content:flex-end">
            <button class="btn" style="font-size:11px;padding:4px 10px;background:#dbeafe;border-color:#3b82f6;color:#1d4ed8" onclick="openFamilyUpdateDetails(${idx})">🔍 عرض التفاصيل</button>
            <button class="btn" style="font-size:11px;padding:4px 10px;background:#d1fae5;border-color:#10b981;color:#065f46" onclick="confirmFamilyMerge(${idx})">➕ دمج</button>
            <button class="btn" style="font-size:11px;padding:4px 10px" onclick="_familyDownloadOne(${idx})">⬇️ JSON</button>
            <button class="btn" style="font-size:11px;padding:4px 10px;background:#fee2e2;border-color:#fca5a5;color:#b91c1c" onclick="deleteFamilyUpdate(${idx})">🗑 حذف</button>
          </div>
        </div>
        <div class="kin-stats" style="margin:0;padding:8px 0 0;border-top:1px dashed var(--card-border);background:transparent">${chips}${changeChips}</div>
      </div>`;
    }).join('');

    let mergeAllBtn=okUpdates.length>1?`<button class="btn primary" style="background:#059669;border-color:#059669" onclick="confirmFamilyMergeAll()">➕ دمج الكل (${okUpdates.length} نسخة)</button>`:'';
    document.getElementById('modalContainer').innerHTML=`<div class="modal-overlay" onclick="if(event.target===this)closeModal()"><div class="modal" style="max-width:760px;width:min(760px,96vw)">
      <h3 style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">📡 تحديثات العائلة <span style="font-size:12px;font-weight:400;color:var(--text2)">${okUpdates.length} نسخة</span></h3>
      <div style="font-size:12px;color:var(--text2);margin-bottom:10px">🔗 <a href="https://gist.github.com/${gistId}" target="_blank" style="color:#3b82f6">فتح Gist في GitHub</a></div>
      <div style="max-height:62vh;overflow-y:auto;padding-left:2px">${rowsHtml}</div>
      <div class="modal-footer" style="flex-wrap:wrap">
        <button class="btn" onclick="closeModal()">إغلاق</button>
        ${mergeAllBtn}
      </div>
    </div></div>`;

    window._familyUpdates=okUpdates;
  }catch(e){
    document.getElementById('modalContainer').innerHTML=`<div class="modal-overlay" onclick="if(event.target===this)closeModal()"><div class="modal" style="max-width:520px"><h3>📡 تحديثات العائلة</h3><div style="padding:14px;background:#fee2e2;border:1px solid #fca5a5;border-radius:8px;font-size:13px;color:#991b1b;line-height:1.8">❌ ${String(e.message||e)}</div><div class="modal-footer"><button class="btn" onclick="closeModal()">إغلاق</button><button class="btn primary" onclick="closeModal();openFamilyUploadSetup()">⚙️ إعداد</button></div></div></div>`;
  }
}

// ── مودال تشخيص 401 / 403 / not_configured ──
function _showFamilyUpdates401Modal(reason, gistId, usedPat){
  let maskedPat = usedPat ? usedPat.slice(0,8)+'••••••••'+usedPat.slice(-4) : '(فارغ)';
  let title='', body='', hint='';

  if(reason==='not_configured'){
    title='⚙️ لم يتم الإعداد بعد';
    body=`لم يتم إعداد رفع نسخة العائلة على هذا الجهاز.`;
    hint=`يجب ضبط <strong>GitHub PAT</strong> و <strong>Gist ID</strong> لاستقبال تحديثات أفراد العائلة.`;
  } else if(reason==='unauthorized'){
    title='🔑 خطأ في المصادقة (401)';
    body=`التوكن المستخدم: <code style="font-size:11px;background:var(--bg-secondary);padding:2px 6px;border-radius:4px">${maskedPat}</code>`;
    hint=`<strong>الأسباب المحتملة:</strong><br>
    • التوكن منتهي الصلاحية — يجب إنشاء توكن جديد<br>
    • التوكن لا يملك صلاحية <code>gist</code> — يجب التأكد من تفعيلها<br>
    • التوكن تم حذفه من GitHub`;
  } else {
    title='🚫 رفض الوصول (403)';
    body=`التوكن المستخدم: <code style="font-size:11px;background:var(--bg-secondary);padding:2px 6px;border-radius:4px">${maskedPat}</code>`;
    hint=`التوكن لا يملك صلاحية القراءة على هذا الـ Gist.<br>تأكد أن التوكن هو <strong>نفس التوكن</strong> الذي أنشأ الـ Gist.`;
  }

  let savedGistId = gistId||FAMILY_UPLOAD_CONFIG.GIST_ID||localStorage.getItem(FAMILY_UPLOAD_GIST_KEY)||'';

  document.getElementById('modalContainer').innerHTML=`
  <div class="modal-overlay" onclick="if(event.target===this)closeModal()">
  <div class="modal" style="max-width:500px">
    <h3>📡 تحديثات العائلة</h3>

    <div style="padding:12px 14px;background:#fee2e2;border:1px solid #fca5a5;border-radius:10px;margin-bottom:16px">
      <div style="font-size:14px;font-weight:600;color:#991b1b;margin-bottom:6px">${title}</div>
      <div style="font-size:13px;color:#7f1d1d;line-height:1.8">${body}</div>
      <div style="font-size:12px;color:#991b1b;margin-top:8px;line-height:1.8">${hint}</div>
    </div>

    <div style="background:var(--bg-secondary);border:1px solid var(--card-border);border-radius:10px;padding:14px;margin-bottom:16px">
      <div style="font-size:13px;font-weight:600;color:var(--text);margin-bottom:12px">🔧 تصحيح سريع — أدخل التوكن الصحيح</div>

      <div style="margin-bottom:10px">
        <label style="font-size:12px;color:var(--text2);display:block;margin-bottom:4px">🐱 GitHub Personal Access Token (gist scope مطلوب)</label>
        <div style="display:flex;gap:6px">
          <input id="fu401_pat" type="password" placeholder="github_pat_xxxxxxxx..."
            style="flex:1;font-family:monospace;font-size:11px;padding:7px 10px;border:1px solid var(--card-border);border-radius:8px;background:var(--card-bg);color:var(--text)">
          <button class="btn" onclick="var i=document.getElementById('fu401_pat');i.type=i.type==='password'?'text':'password'" style="font-size:11px">👁</button>
        </div>
        <a href="https://github.com/settings/tokens/new?scopes=gist&description=FamilyTree-Read" target="_blank"
          style="font-size:11px;color:#3b82f6;display:inline-block;margin-top:4px">← إنشاء توكن جديد في GitHub (gist scope فقط)</a>
      </div>

      <div style="margin-bottom:10px">
        <label style="font-size:12px;color:var(--text2);display:block;margin-bottom:4px">🔗 Gist ID</label>
        <input id="fu401_gid" type="text" value="${savedGistId}" placeholder="معرّف الـ Gist"
          style="width:100%;font-family:monospace;font-size:11px;padding:7px 10px;border:1px solid var(--card-border);border-radius:8px;background:var(--card-bg);color:var(--text);box-sizing:border-box">
      </div>

      <button class="btn primary" style="width:100%" onclick="_applyFamilyPATFix()">✓ حفظ وإعادة المحاولة</button>
    </div>

    <div style="font-size:11px;color:var(--text2);line-height:1.8;padding:8px 12px;background:var(--bg-secondary);border-radius:8px">
      💡 <strong>نصيحة:</strong> استخدم نفس التوكن الذي أنشأت به الـ Gist — أو أنشئ توكناً جديداً مع تفعيل <code>gist</code> فقط.
    </div>

    <div class="modal-footer">
      <button class="btn" onclick="closeModal()">إغلاق</button>
      <button class="btn" onclick="closeModal();openFamilyUploadSetup()">⚙️ إعداد كامل</button>
    </div>
  </div></div>`;
}

// يحفظ التوكن الجديد ويعيد المحاولة مباشرةً
async function _applyFamilyPATFix(){
  let newPat=(document.getElementById('fu401_pat').value||'').trim();
  let newGid=(document.getElementById('fu401_gid').value||'').trim();
  if(!newPat){alert('الرجاء إدخال GitHub PAT');return;}

  // تحقق من التوكن: نختبر /gists مباشرةً لأن /user يمر حتى بتوكن بلا صلاحية gist
  let btn=event.target;
  btn.disabled=true;btn.textContent='⏳ جارٍ التحقق من صلاحية gist...';
  try{
    let testHeaders={'Authorization':'token '+newPat,'Accept':'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28'};
    // /gists يفشل بـ 401 إذا لم تكن صلاحية gist مُفعَّلة
    let testRes=await fetch('https://api.github.com/gists?per_page=1',{headers:testHeaders});
    if(testRes.status===401){
      btn.disabled=false;btn.textContent='✓ حفظ وإعادة المحاولة';
      alert('❌ التوكن لا يملك صلاحية gist\n\nالحل:\n1. اذهب إلى github.com/settings/tokens\n2. أنشئ توكناً جديداً\n3. فعّل ✅ gist فقط\n4. انسخه والصقه هنا');
      return;
    }
    if(testRes.status===403){
      btn.disabled=false;btn.textContent='✓ حفظ وإعادة المحاولة';
      alert('❌ التوكن صالح لكن محظور من الوصول للـ Gists\nتأكد أن التوكن ليس من نوع Fine-grained مقيّد.');
      return;
    }
    if(!testRes.ok){
      btn.disabled=false;btn.textContent='✓ حفظ وإعادة المحاولة';
      alert('❌ خطأ في التحقق: '+testRes.status+'\nتحقق من اتصالك بالإنترنت وأعد المحاولة.');
      return;
    }
  }catch(e){/* تجاهل أخطاء الشبكة — نكمل الحفظ */}

  // حفظ في الذاكرة وlocalStorage
  FAMILY_UPLOAD_CONFIG.GITHUB_PAT=newPat;
  if(newGid){
    FAMILY_UPLOAD_CONFIG.GIST_ID=newGid;
    // حفظ في كلا المفتاحَين دائماً لتجنب عدم التطابق
    try{localStorage.setItem(FAMILY_UPLOAD_GIST_KEY,newGid);localStorage.setItem('ft_fupload_gid',newGid);}catch(e){}
  }
  try{localStorage.setItem('ft_fupload_pat',newPat);}catch(e){}

  btn.textContent='✅ تم الحفظ — جارٍ إعادة المحاولة...';
  setTimeout(()=>openFamilyUpdatesModal(),600);
}

function renameFamilyDevice(idx, evt){
  evt&&evt.stopPropagation();
  let u=(window._familyUpdates||[])[idx];
  if(!u){alert('خطأ: لم يُعثر على الجهاز');return;}
  let current=_getDeviceNameMap()[u.devId]||u.uploadedName||'';
  let name=prompt('🏷️ اسم مخصص لهذا الجهاز (يُحفظ محلياً فقط عندك):', current);
  if(name===null)return;
  name=name.trim();
  _setDeviceName(u.devId, name);
  // تحديث الكارت فوراً بدون إعادة جلب Gist
  u.devName=_resolveDeviceName(u.devId, u.uploadedName||'');
  openFamilyUpdatesModal();
}


