(function () {
  'use strict';

  /* ── ثوابت ───────────────────────────────────────────────────────── */
  var FU_TABLE      = 'family_updates';
  var FU_SCHEMA_VER = 1;
  var FU_HASH_KEY   = 'ft_fu_hash_v4';
  var FU_DEBOUNCE   = 90000;   /* 90 ثانية */
  var FU_MIN_INTERVAL = 5*60*1000;
  var FU_LAST_TS_KEY  = 'ft_fu_last_ts_v4';
  var FU_MAX_ROWS   = 500;
  var FU_PAGE_SIZE  = 50;

  /* ── حفظ مرجع السكريبت الرئيسي الآن (قبل أي تعديل) ─────────────── */
  var _mainScriptEl = (function(){
    var all = document.scripts;
    for(var i=0;i<all.length;i++){
      var t=all[i].textContent||'';
      if(!all[i].src && t.length>100000 && t.indexOf('_HTML_TEMPLATE')!==-1)
        return all[i];
    }
    return null;
  })();

  /* ── أدوات ───────────────────────────────────────────────────────── */
  function log(){
    var a=Array.prototype.slice.call(arguments);
    a.unshift('[FU]');
    console.debug.apply(console,a);
  }

  function fuDevId(){
    try{
      var id=localStorage.getItem('ft_family_device_id')||'';
      if(!id){
        id=[].slice.call(crypto.getRandomValues(new Uint8Array(6)))
            .map(function(b){return b.toString(16).padStart(2,'0');}).join('');
        localStorage.setItem('ft_family_device_id',id);
      }
      return id;
    }catch(e){return 'unknown';}
  }

  function fuDevName(){
    try{return localStorage.getItem('ft_family_device_name')||fuDevId();}catch(e){return fuDevId();}
  }

  function fuSettings(){
    try{
      if(typeof window._ftReadSettings==='function') return window._ftReadSettings();
    }catch(e){}
    /* قراءة مباشرة من localStorage كـ fallback */
    function ls(k){try{return localStorage.getItem(k)||'';}catch(e){return '';}}
    return {
      url:     ls('ft_supabase_url_v1'),
      anonKey: ls('ft_supabase_anon_v1'),
      syncId:  ls('ft_supabase_sync_id_v1')||'family-sync',
      bucket:  ls('ft_supabase_bucket_v1')||'family-tree',
      keyHex:  ls('ft_supabase_key_v1')||ls('ft_cloud_key')
    };
  }

  function fuKey(){
    var k=(fuSettings().keyHex||'').trim();
    if(/^[0-9a-fA-F]{64}$/.test(k)) return k.toLowerCase();
    try{
      var ck=(window.CLOUD_CONFIG&&window.CLOUD_CONFIG.KEY_HEX)||'';
      if(/^[0-9a-fA-F]{64}$/.test(ck)) return ck.toLowerCase();
    }catch(e){}
    return '';
  }

  function fuFamilyId(){
    return ((fuSettings().syncId)||'').trim()||'family-sync';
  }

  /* مرن: URL + anonKey كافيان */
  function fuReady(){
    try{
      if(typeof window._ftSettingsReady==='function'&&window._ftSettingsReady()) return true;
      if(typeof window._isCloudConfigured==='function'&&window._isCloudConfigured()) return true;
    }catch(e){}
    try{
      var s=fuSettings();
      if(s.url&&s.url.indexOf('https://')===0&&s.anonKey&&s.anonKey.length>20) return true;
    }catch(e){}
    return false;
  }

  /* ── تشفير AES-GCM ───────────────────────────────────────────────── */
  function sha256(str){
    return crypto.subtle.digest('SHA-256',new TextEncoder().encode(str))
      .then(function(buf){
        return [].slice.call(new Uint8Array(buf))
          .map(function(b){return b.toString(16).padStart(2,'0');}).join('');
      });
  }

  function fuEncrypt(plain,keyHex){
    if(!keyHex) return Promise.reject(new Error('مفتاح التشفير غير موجود'));
    return crypto.subtle.importKey('raw',_hexToBytes(keyHex),{name:'AES-GCM'},false,['encrypt'])
      .then(function(key){
        var iv=crypto.getRandomValues(new Uint8Array(12));
        return crypto.subtle.encrypt({name:'AES-GCM',iv:iv},key,new TextEncoder().encode(plain))
          .then(function(enc){
            return sha256(plain).then(function(cs){
              return {iv:_bytesToBase64(iv),payload_encrypted:_bytesToBase64(new Uint8Array(enc)),checksum:cs};
            });
          });
      });
  }

  function fuDecrypt(ivB64,payB64,keyHex){
    if(!keyHex) return Promise.reject(new Error('مفتاح التشفير غير موجود'));
    return crypto.subtle.importKey('raw',_hexToBytes(keyHex),{name:'AES-GCM'},false,['decrypt'])
      .then(function(key){
        return crypto.subtle.decrypt({name:'AES-GCM',iv:_base64ToBytes(ivB64)},key,_base64ToBytes(payB64))
          .catch(function(){throw new Error('فشل فك التشفير — تحقق من مفتاح التشفير');});
      })
      .then(function(plain){return new TextDecoder().decode(plain);});
  }

  /* ── Supabase client ─────────────────────────────────────────────── */
  function fuClient(){
    if(typeof window._ftGetSupabaseClient==='function')
      return window._ftGetSupabaseClient();
    return Promise.reject(new Error('Supabase غير مُعدَّة — أعد تحميل الصفحة بعد حفظ الإعدادات'));
  }

  function fuInsert(row){
    return fuClient().then(function(c){
      return c.from(FU_TABLE).insert([row]);
    }).then(function(res){
      if(res.error) throw new Error('خطأ في الحفظ: '+(res.error.message||JSON.stringify(res.error)));
    });
  }

  function fuSelect(familyId){
    return fuClient().then(function(c){
      return c.from(FU_TABLE).select('*')
        .eq('family_id',familyId)
        .order('created_at',{ascending:false})
        .limit(FU_MAX_ROWS);
    }).then(function(res){
      if(res.error) throw new Error('خطأ في الجلب: '+(res.error.message||JSON.stringify(res.error)));
      return res.data||[];
    });
  }

  /* ── كشف التغييرات ───────────────────────────────────────────────── */
  function fuContentHash(){
    try{
      var p=(Array.isArray(people)?people:[]).map(function(p){
        if(!p)return null;
        var r=Object.assign({},p); delete r.photo; return r;
      }).filter(Boolean);
      var sig=JSON.stringify({people:p,relPairs:Array.isArray(relPairs)?relPairs:[],nextId:nextId||0});
      return sha256(sig);
    }catch(e){return Promise.resolve('');}
  }

  function fuHasChanges(){
    return fuContentHash().then(function(h){
      if(!h)return false;
      try{return h!==(localStorage.getItem(FU_HASH_KEY)||'');}catch(e){return true;}
    });
  }

  /* ── الرفع الصامت ────────────────────────────────────────────────── */
  var _uploading=false, _timer=null;

  function triggerFamilyUpload(){
    if(!fuReady())return;
    clearTimeout(_timer);
    _timer=setTimeout(_doSilentFamilyUpload,FU_DEBOUNCE);
  }

  function _doSilentFamilyUpload(){
    if(!fuReady()||_uploading)return;
    _uploading=true;
    var keyHex=fuKey();
    if(!keyHex){log('لا مفتاح تشفير');_uploading=false;return;}
    /* فحص الحد الأدنى بين الرفعات (5 دقائق) */
    try{
      var lastTs=parseInt(localStorage.getItem(FU_LAST_TS_KEY)||'0',10);
      if(Date.now()-lastTs < FU_MIN_INTERVAL){log('أقل من 5 دقائق منذ آخر رفع — تم التخطي');_uploading=false;return;}
    }catch(e){}
    fuHasChanges().then(function(changed){
      if(!changed){log('لا تغيير');_uploading=false;return;}
      var arr=Array.isArray(people)?people:[];
      if(!arr.length){log('فارغ');_uploading=false;return;}
      var payload=JSON.parse(JSON.stringify({
        people:arr,relPairs:Array.isArray(relPairs)?relPairs:[],
        nextId:nextId||1,myPersonId:myPersonId||null,
        uploadedAt:new Date().toISOString(),deviceId:fuDevId(),deviceName:fuDevName()
      }));
      payload.people.forEach(function(p){if(p)delete p.photo;});
      var plain=JSON.stringify(payload);
      return fuEncrypt(plain,keyHex).then(function(enc){
        return fuInsert({
          family_id:fuFamilyId(),device_id:fuDevId(),device_name:fuDevName(),
          schema_version:FU_SCHEMA_VER,
          payload_encrypted:enc.payload_encrypted,iv:enc.iv,checksum:enc.checksum,
          update_type:'auto'
        });
      }).then(function(){
        return fuContentHash().then(function(h){
          try{localStorage.setItem(FU_HASH_KEY,h);}catch(e){}
          try{localStorage.setItem(FU_LAST_TS_KEY,String(Date.now()));}catch(e){}
          log('✓ رُفع بنجاح family:',fuFamilyId(),'device:',fuDevId());
        });
      });
    }).catch(function(e){
      log('✗ فشل الرفع:',e.message||e);
    }).then(function(){_uploading=false;});
  }

  /* ── نافذة التحديثات ─────────────────────────────────────────────── */
  function openFamilyUpdatesModal(){
    if(!fuReady()){
      document.getElementById('modalContainer').innerHTML=
        '<div class="modal-overlay" onclick="if(event.target===this)closeModal()">'
        +'<div class="modal" style="max-width:440px"><h3>📡 تحديثات العائلة</h3>'
        +'<div style="padding:12px;background:#fff7ed;border:1px solid #fb923c;border-radius:8px;font-size:13px;color:#9a3412">⚙️ يجب إعداد المزامنة السحابية أولاً</div>'
        +'<div class="modal-footer"><button class="btn" onclick="closeModal()">إغلاق</button>'
        +'<button class="btn primary" onclick="closeModal();openCloudSetup()">⚙️ إعداد Supabase</button></div></div></div>';
      return;
    }
    document.getElementById('modalContainer').innerHTML=
      '<div class="modal-overlay"><div class="modal" style="max-width:400px;text-align:center;padding:32px 24px">'
      +'<div style="font-size:38px;margin-bottom:12px">📡</div>'
      +'<div style="font-size:13px;color:var(--text2)">جارٍ جلب التحديثات…</div></div></div>';

    var keyHex=fuKey();
    var familyId=fuFamilyId();
    fuSelect(familyId).then(function(rows){
      if(!rows.length){_fuModalEmpty(familyId);return;}
      var tasks=rows.map(function(row){
        return fuDecrypt(row.iv,row.payload_encrypted,keyHex)
          .then(function(plain){
            var data=JSON.parse(plain);
            if(!Array.isArray(data&&data.people))throw new Error('بنية غير صالحة');
            var summary=typeof _familySummarizeUpdate==='function'
              ?_familySummarizeUpdate(data):{newPeople:[],updatedPeople:[],unchangedPeople:[],stats:{}};
            return {row:row,data:data,errMsg:'',summary:summary};
          }).catch(function(e){
            return {row:row,data:null,errMsg:e.message||'خطأ',summary:{newPeople:[],updatedPeople:[],unchangedPeople:[],stats:{}}};
          });
      });
      return Promise.all(tasks).then(function(parsed){
        window._familyUpdates=parsed;
        _fuModalList(parsed,familyId);
      });
    }).catch(function(e){
      var msg=String(e.message||e);
      var hint=/relation|does not exist/i.test(msg)
        ?'<div style="margin-top:10px;padding:10px;background:#fef3c7;border:1px solid #fcd34d;border-radius:8px;font-size:12px;color:#92400e">💡 جدول <code>family_updates</code> غير موجود — اضغط "🛠 SQL" لإنشائه</div>':'';
      document.getElementById('modalContainer').innerHTML=
        '<div class="modal-overlay" onclick="if(event.target===this)closeModal()">'
        +'<div class="modal" style="max-width:480px"><h3>📡 تحديثات العائلة</h3>'
        +'<div style="padding:12px;background:#fee2e2;border:1px solid #fca5a5;border-radius:8px;font-size:13px;color:#991b1b">❌ '+escapeHtml(msg)+'</div>'
        +hint
        +'<div class="modal-footer"><button class="btn" onclick="closeModal()">إغلاق</button>'
        +'<button class="btn" onclick="window._fuShowSQL()">🛠 SQL</button></div></div></div>';
    });
  }

  function _fuModalEmpty(familyId){
    document.getElementById('modalContainer').innerHTML=
      '<div class="modal-overlay" onclick="if(event.target===this)closeModal()">'
      +'<div class="modal" style="max-width:440px;text-align:center;padding:30px 20px">'
      +'<div style="font-size:38px;margin-bottom:10px">📭</div>'
      +'<div style="font-size:15px;font-weight:600;margin-bottom:8px">لا توجد تحديثات بعد</div>'
      +'<div style="font-size:12px;color:var(--text2);line-height:1.9;margin-bottom:16px">'
      +'عدّل أي بيانات ← احفظ ← انتظر 5 ثوانٍ.<br>'
      +'<code style="font-size:10px;background:var(--bg-secondary);padding:2px 6px;border-radius:4px">'+escapeHtml(familyId)+'</code></div>'
      +'<div style="display:flex;gap:8px;justify-content:center;flex-wrap:wrap">'
      +'<button class="btn" onclick="closeModal()">إغلاق</button>'
      +'<button class="btn" onclick="window._fuShowSQL()">🛠 تحقق SQL</button></div></div></div>';
  }

  function _fuModalList(list,familyId){
    var valid=list.filter(function(x){return x.data;}).length;
    var invalid=list.filter(function(x){return x.errMsg;}).length;
    var page=0, total=Math.ceil(list.length/FU_PAGE_SIZE);

    function card(u,idx){
      if(u.errMsg){
        return '<div style="padding:10px 14px;border:1px solid #fca5a5;border-radius:10px;background:#fff5f5;margin-bottom:8px;font-size:12px;color:#991b1b">'
          +'⚠️ '+escapeHtml(u.errMsg)+' <span style="color:#aaa;font-size:10px;font-family:monospace">'+escapeHtml(u.row.device_id||'')+'</span></div>';
      }
      var ts=u.row.created_at
        ?new Date(u.row.created_at).toLocaleString('ar-SA',{timeZone:'Asia/Riyadh',month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'}):'—';
      var st=u.summary&&u.summary.stats||{};
      var np=u.summary&&u.summary.newPeople&&u.summary.newPeople.length||0;
      var up2=u.summary&&u.summary.updatedPeople&&u.summary.updatedPeople.length||0;
      var uc=u.summary&&u.summary.unchangedPeople&&u.summary.unchangedPeople.length||0;
      var pc=u.data&&u.data.people&&u.data.people.length||0;
      var isMyDevice=(u.row.device_id===fuDevId());
      var tb=u.row.update_type==='migration'
        ?'<span style="font-size:9px;padding:1px 5px;border-radius:4px;background:#fef3c7;color:#92400e;border:1px solid #fcd34d">مُهاجَر</span>'
        :isMyDevice
          ?'<span style="font-size:9px;padding:1px 5px;border-radius:4px;background:#dbeafe;color:#1e40af;border:1px solid #93c5fd">جهازك الحالي</span>'
          :'';
      return '<div style="padding:12px 14px;border:1px solid var(--card-border);border-radius:10px;background:var(--card-bg);margin-bottom:9px">'
        +'<div style="display:flex;align-items:flex-start;justify-content:space-between;gap:8px;flex-wrap:wrap;margin-bottom:8px">'
        +'<div><div style="display:flex;align-items:center;gap:5px;flex-wrap:wrap"><span style="font-size:13px;font-weight:600">📱 '+escapeHtml(u.row.device_name||u.row.device_id)+'</span>'+tb+'</div>'
        +'<div style="font-size:10px;font-family:monospace;color:var(--text3);margin-top:1px">'+escapeHtml(u.row.device_id||'')+'</div>'
        +'<div style="font-size:11px;color:var(--text2);margin-top:4px">'+pc+' فرد · '+ts+'</div></div>'
        +'<div style="display:flex;gap:5px;flex-wrap:wrap;justify-content:flex-end">'
        +'<button class="btn" style="font-size:11px;padding:3px 9px;background:#dbeafe;border-color:#3b82f6;color:#1d4ed8" onclick="openFamilyUpdateDetails('+idx+')">🔍</button>'
        +'<button class="btn" style="font-size:11px;padding:3px 9px;background:#d1fae5;border-color:#10b981;color:#065f46" onclick="confirmFamilyMerge('+idx+')">➕ دمج</button>'
        +'<button class="btn" style="font-size:11px;padding:3px 9px" onclick="_familyDownloadOne('+idx+')">⬇️</button>'
        +(!isMyDevice?'<button class="btn" style="font-size:11px;padding:3px 9px;background:#fee2e2;border-color:#fca5a5;color:#991b1b" onclick="fuDeleteRecord(\''+u.row.id+'\')">🗑️</button>':'')
        +'</div></div>'
        +'<div style="display:flex;flex-wrap:wrap;gap:4px;padding-top:7px;border-top:1px dashed var(--card-border)">'
        +'<span class="kin-stat">👨 '+(st.males||0)+'</span>'
        +'<span class="kin-stat">👩 '+(st.females||0)+'</span>'
        +'<span class="kin-stat">⚰️ '+(st.deceased||0)+'</span>'
        +'<span class="kin-stat">🖼 '+(st.photos||0)+'</span>'
        +(np?'<span class="kin-stat" style="background:#d1fae5;color:#065f46;border-color:#10b981">➕ '+np+' جديد</span>':'<span class="kin-stat" style="opacity:.4">➕ 0</span>')
        +(up2?'<span class="kin-stat" style="background:#dbeafe;color:#1d4ed8;border-color:#3b82f6">🔄 '+up2+' محدَّث</span>':'<span class="kin-stat" style="opacity:.4">🔄 0</span>')
        +'<span class="kin-stat" style="opacity:.5">⏭ '+uc+'</span>'
        +'</div></div>';
    }

    function pageHtml(p){
      return list.slice(p*FU_PAGE_SIZE,(p+1)*FU_PAGE_SIZE)
        .map(function(u,i){return card(u,p*FU_PAGE_SIZE+i);}).join('');
    }

    var errNote=invalid?'<div style="padding:7px 10px;background:#fff7ed;border:1px solid #fb923c;border-radius:7px;font-size:11px;color:#9a3412;margin-bottom:10px">⚠️ '+invalid+' سجل لم يُفك تشفيره — تحقق من مفتاح التشفير</div>':'';
    var paging=total>1?'<div style="display:flex;gap:6px;align-items:center;justify-content:center;padding:8px 0;border-top:1px solid var(--card-border)">'
      +'<button class="btn" style="font-size:11px;padding:3px 10px" onclick="window._fuPg(-1)">‹</button>'
      +'<span id="fuPgLbl" style="font-size:11px;color:var(--text2)">1 / '+total+'</span>'
      +'<button class="btn" style="font-size:11px;padding:3px 10px" onclick="window._fuPg(1)">›</button></div>':'';
    var mergeAll=valid>1?'<button class="btn primary" style="background:#059669;border-color:#059669" onclick="confirmFamilyMergeAll()">➕ دمج الكل ('+valid+')</button>':'';

    document.getElementById('modalContainer').innerHTML=
      '<div class="modal-overlay" onclick="if(event.target===this)closeModal()">'
      +'<div class="modal" style="max-width:740px;width:min(740px,96vw)">'
      +'<h3 style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">📡 تحديثات العائلة '
      +'<span style="font-size:12px;font-weight:400;color:var(--text2)">'+list.length+' سجل · <code style="font-size:10px">'+escapeHtml(familyId)+'</code></span></h3>'
      +errNote
      +'<div id="fuBody" style="max-height:58vh;overflow-y:auto;padding-left:2px">'+pageHtml(0)+'</div>'
      +paging
      +'<div class="modal-footer" style="flex-wrap:wrap;gap:6px">'
      +'<button class="btn" onclick="closeModal()">إغلاق</button>'+mergeAll+'</div></div></div>';

    window._fuPg=function(d){
      var np=page+d;
      if(np<0||np>=total)return;
      page=np;
      document.getElementById('fuBody').innerHTML=pageHtml(page);
      document.getElementById('fuPgLbl').textContent=(page+1)+' / '+total;
    };
  }

  /* ── SQL helper ──────────────────────────────────────────────────── */
  window._fuShowSQL=function(){
    var sql='-- شغّل في Supabase → SQL Editor → New Query\n'
      +'CREATE TABLE IF NOT EXISTS public.family_updates (\n'
      +'  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),\n'
      +'  family_id         text        NOT NULL,\n'
      +'  device_id         text        NOT NULL,\n'
      +'  device_name       text,\n'
      +'  created_at        timestamptz NOT NULL DEFAULT now(),\n'
      +'  schema_version    integer     NOT NULL DEFAULT 1,\n'
      +'  payload_encrypted text        NOT NULL,\n'
      +'  iv                text        NOT NULL,\n'
      +'  checksum          text,\n'
      +'  update_type       text        NOT NULL DEFAULT \'auto\'\n'
      +');\n'
      +'CREATE INDEX IF NOT EXISTS fu_fam ON public.family_updates(family_id);\n'
      +'CREATE INDEX IF NOT EXISTS fu_ts  ON public.family_updates(created_at DESC);\n'
      +'ALTER TABLE public.family_updates ENABLE ROW LEVEL SECURITY;\n'
      +'CREATE POLICY "ins" ON public.family_updates FOR INSERT TO authenticated WITH CHECK (true);\n'
      +'CREATE POLICY "sel" ON public.family_updates FOR SELECT TO authenticated USING (true);';
    document.getElementById('modalContainer').innerHTML=
      '<div class="modal-overlay" onclick="if(event.target===this)closeModal()">'
      +'<div class="modal" style="max-width:640px;width:min(640px,96vw)">'
      +'<h3>🛠 إنشاء جدول family_updates</h3>'
      +'<p style="font-size:12px;color:var(--text2);margin:0 0 10px">Supabase → SQL Editor → New Query ← الصق وشغّل:</p>'
      +'<pre style="background:var(--bg-secondary);border:1px solid var(--card-border);border-radius:8px;padding:12px;font-size:11px;direction:ltr;text-align:left;overflow-x:auto;max-height:52vh;white-space:pre">'+sql.replace(/</g,'&lt;')+'</pre>'
      +'<div class="modal-footer"><button class="btn" onclick="closeModal()">إغلاق</button>'
      +'<button class="btn primary" id="_fuCpBtn" onclick="navigator.clipboard&&navigator.clipboard.writeText(document.getElementById(\'_fuCpBtn\').getAttribute(\'data-sql\')).then(function(){var b=document.getElementById(\'_fuCpBtn\');b.textContent=\'✅ تم\';setTimeout(function(){b.textContent=\'📋 نسخ\'},2000)});" data-sql="">📋 نسخ</button>'
      +'</div></div></div>';
    /* ضبط الـ data-sql بعد إدراج العنصر */
    try{document.getElementById('_fuCpBtn').setAttribute('data-sql',sql);}catch(e){}
  };

  /* ── تصدير JSON للعائلة — Supabase settings ─────────────────────── */
  function doExportJSONFamily(withPhotos){
    /* قراءة اسم المستلم من الحقل — إلزامي */
    var recipName=(window._fuLastRecipName||'').trim();
    if(!recipName){
      var inp=document.getElementById('_fuRecipName');
      recipName=inp?(inp.value||'').trim():'';
    }
    if(!recipName){
      alert('⚠️ أدخل اسم المستلم أولاً (مثال: هاتف أحمد)\nسيُعرَّف به في تحديثات العائلة تلقائياً.');
      var inp2=document.getElementById('_fuRecipName');
      if(inp2)inp2.focus();
      return;
    }
    closeModal();
    window._fuLastRecipName=''; /* تنظيف */

    var s=fuSettings(), keyHex=fuKey();
    var devId=[].slice.call(crypto.getRandomValues(new Uint8Array(3)))
      .map(function(b){return b.toString(16).padStart(2,'0');}).join('');

    var raw=JSON.parse(JSON.stringify({people:people,relPairs:relPairs,nextId:nextId}));
    var photoCnt=raw.people.filter(function(p){return p&&p.photo;}).length;
    if(!withPhotos) raw.people.forEach(function(p){if(p&&p.photo)delete p.photo;});

    var payload={
      people:raw.people, relPairs:raw.relPairs, nextId:raw.nextId,
      _familyMeta:{
        deviceId:   devId,
        deviceName: recipName,   /* ← الاسم المضمَّن */
        /* Supabase settings */
        sbUrl:     s.url||'',
        sbAnonKey: s.anonKey||'',
        sbSyncId:  s.syncId||fuFamilyId(),
        sbBucket:  s.bucket||'family-tree',
        keyHex:    keyHex,
        gistId:'', pat:'',
        exportedAt:new Date().toISOString(),
        exportedBy:'owner',
        version:'supabase-v4'
      }
    };

    var safeName=recipName.replace(/[^a-zA-Z0-9؀-ۿ_-]/g,'_').slice(0,20);
    var stamp=new Date().toISOString().slice(0,10);
    var blob=new Blob([JSON.stringify(payload,null,2)],{type:'application/json'});
    var url=URL.createObjectURL(blob);
    var a=document.createElement('a');
    a.href=url;
    a.download='family_tree_'+safeName+'_'+stamp+'.json';
    document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
    if(typeof showSaveToast==='function') showSaveToast();
    var sbNote=s.url?'✅ الرفع التلقائي سيعمل فور الاستيراد.':'⚠️ Supabase غير مُعدَّة.';
    setTimeout(function(){
      alert('✅ تم تصدير نسخة: '+recipName+'\n\n'+sbNote+'\n\nأرسل الملف لـ '+recipName+' فقط.');
    },200);
  }

  /* ── تصدير HTML (نسخة العائلة) — إصلاح mainSrc ─────────────────── */
  function exportFamilyCopy(){
    /* استخدم السكريبت الرئيسي المحفوظ مسبقاً */
    if(!_mainScriptEl){
      alert('⚠️ تعذّر العثور على السكريبت الرئيسي — جرّب إعادة تحميل الصفحة.');
      return;
    }
    var mainSrc=_mainScriptEl.textContent;
    var s=fuSettings(), keyHex=fuKey();

    /* 1. تضمين مفتاح التشفير في CLOUD_CONFIG */
    if(keyHex){
      mainSrc=mainSrc.replace(
        /const CLOUD_CONFIG\s*=\s*\{[^}]*\}/,
        "const CLOUD_CONFIG = {\n  KEY_HEX: '"+keyHex+"',\n  GITHUB_PAT: '',\n  GIST_ID: '',\n  GIST_FILE: 'ft_encrypted.dat',\n}"
      );
    }

    /* 2. مسح FAMILY_UPLOAD_CONFIG */
    mainSrc=mainSrc.replace(
      /const FAMILY_UPLOAD_CONFIG\s*=\s*\{[^}]*\}/,
      "const FAMILY_UPLOAD_CONFIG = {\n  GITHUB_PAT: '',\n  GIST_ID: '',\n  KEY_HEX: '"+keyHex+"',\n}"
    );

    /* 3. تمييز النسخة كـ "نسخة عائلة" لتفعيل _applyFamilyMetaIfNeeded */
    mainSrc=mainSrc.replace(
      /const IS_FAMILY_COPY\s*=\s*false/,
      'const IS_FAMILY_COPY = true'
    );

    /* 4. FAMILY_DEVICE_ID='' — كل جهاز يولّد ID فريداً لنفسه */
    mainSrc=mainSrc.replace(
      /const FAMILY_DEVICE_ID\s*=\s*'[^']*'/,
      "const FAMILY_DEVICE_ID = ''"
    );

    /* حقنة Supabase settings تُطبَّق تلقائياً عند أول تشغيل */
    var sbCfg=JSON.stringify({
      url:s.url||'', anonKey:s.anonKey||'', syncId:s.syncId||fuFamilyId(),
      bucket:s.bucket||'family-tree', keyHex:keyHex
    });
    /* ملاحظة: نكسر closing-script-tag لتجنب إغلاق مبكر */
    var sbInject='<scr'+'ipt>/*sb-inject*/(function(){'
      +'var _sb='+sbCfg+';'
      +"try{localStorage.setItem('ft_supabase_url_v1',_sb.url);}catch(e){}"
      +"try{localStorage.setItem('ft_supabase_anon_v1',_sb.anonKey);}catch(e){}"
      +"try{localStorage.setItem('ft_supabase_sync_id_v1',_sb.syncId);}catch(e){}"
      +"try{localStorage.setItem('ft_supabase_bucket_v1',_sb.bucket);}catch(e){}"
      +"try{localStorage.setItem('ft_supabase_key_v1',_sb.keyHex);}catch(e){}"
      +"try{localStorage.setItem('ft_cloud_key',_sb.keyHex);}catch(e){}"
      +"try{localStorage.removeItem('ft_fu_hash_v4');}catch(e){}"
      +"try{localStorage.removeItem('ft_family_device_id');}catch(e){}"
      +'})();<\/scr'+'ipt>';

    /* data tag */
    var jsonData=JSON.stringify({people:people,relPairs:relPairs,nextId:nextId});
    /* encode: URI-encode → unescape → btoa (handles Unicode) */
    var dataB64=btoa(unescape(encodeURIComponent(jsonData)));
    var dataTag='<scr'+'ipt id="__family_tree_data__" type="application/json">'+dataB64+'<\/scr'+'ipt>';

    /* cleanAppHTML */
    var cleanAppHTML='';
    try{
      var tDoc=(new DOMParser()).parseFromString('<!DOCTYPE html>\n'+window._HTML_TEMPLATE,'text/html');
      var tApp=tDoc.getElementById('app');
      if(tApp)cleanAppHTML=tApp.outerHTML;
    }catch(ex){}
    if(!cleanAppHTML)cleanAppHTML=document.getElementById('app').outerHTML;

    var htmlAttrs=document.documentElement.getAttribute('dir')?' dir="'+document.documentElement.getAttribute('dir')+'"':'';

    var src='<!DOCTYPE html>\n'
      +'<html'+htmlAttrs+'>\n'
      +document.head.outerHTML+'\n'
      +'<body>\n'
      +cleanAppHTML+'\n'
      +'<div id="modalContainer"></div>\n'
      +sbInject+'\n'
      +dataTag+'\n'
      +'<scr'+'ipt>\n'+mainSrc+'\n<\/scr'+'ipt>\n'
      +'</body>\n</html>';

    var blob=new Blob([src],{type:'text/html;charset=utf-8'});
    var url=URL.createObjectURL(blob);
    var a=document.createElement('a');
    a.href=url; a.download='family_tree_family_copy_'+new Date().toISOString().slice(0,10)+'.html';
    document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
    if(typeof showSaveToast==='function') showSaveToast();
    setTimeout(function(){
      alert('✅ تم تصدير نسخة العائلة (HTML)\n\n🔐 تشمل إعدادات Supabase مُضمَّنة.\nالرفع التلقائي سيعمل فور فتح الملف.');
    },200);
  }

  /* ── تطبيق meta عند الاستيراد ───────────────────────────────────── */
  var _origApplyMeta=typeof window._applyFamilyMetaIfNeeded==='function'?window._applyFamilyMetaIfNeeded:null;
  function _applyFamilyMetaIfNeeded(data){
    if(!data||!data._familyMeta){
      if(_origApplyMeta)try{_origApplyMeta(data);}catch(e){}
      return;
    }
    var m=data._familyMeta;
    function ls(k,v){if(v)try{localStorage.setItem(k,v);}catch(e){}}
    /* Supabase settings — استخدم _ftSaveSettings الرسمية لضمان الحفظ في المفاتيح الصحيحة */
    if(typeof window._ftSaveSettings==='function'&&(m.sbUrl||m.sbAnonKey)){
      try{
        window._ftSaveSettings({
          url:     m.sbUrl     ||'',
          anonKey: m.sbAnonKey ||'',
          syncId:  m.sbSyncId  ||'',
          bucket:  m.sbBucket  ||'',
          keyHex:  m.keyHex    ||''
        });
      }catch(e){ log('_ftSaveSettings error:',e); }
    } else {
      /* fallback: كتابة مباشرة بالمفاتيح الصحيحة */
      ls('ft_supabase_url_v1',m.sbUrl);
      ls('ft_supabase_anon_v1',m.sbAnonKey);
      ls('ft_supabase_sync_id_v1',m.sbSyncId);
      ls('ft_supabase_bucket_v1',m.sbBucket);
      ls('ft_supabase_key_v1',m.keyHex);
    }
    ls('ft_cloud_key',m.keyHex);
    if(m.keyHex&&window.CLOUD_CONFIG)try{window.CLOUD_CONFIG.KEY_HEX=m.keyHex;}catch(e){}
    /* مسح الهاش لإجبار رفع فوري */
    try{localStorage.removeItem('ft_fu_hash_v4');}catch(e){}
    /* تطبيق اسم الجهاز من meta إذا حدّده المالك */
    if(m.deviceName){
      try{localStorage.setItem('ft_family_device_name',m.deviceName);}catch(e){}
    }
    /* مسح device ID ليحصل المستورِد على معرّف جهاز جديد خاص به */
    try{localStorage.removeItem('ft_family_device_id');}catch(e){}
    /* استدعاء الأصلية للتوافق */
    if(_origApplyMeta)try{_origApplyMeta(data);}catch(e){}
    log('[Import] Supabase meta applied. syncId:',m.sbSyncId||'—');
  }

  /* ── _buildFamilyExportOption — استبدال Gist badge بـ Supabase ──── */
  window._buildFamilyExportOption=function(){
    var ok=fuReady(), fid=fuFamilyId();
    var badge=ok
      ?'<span style="font-size:11px;font-weight:400;color:#065f46;background:#d1fae5;border:1px solid #10b981;padding:2px 6px;border-radius:6px;margin-right:6px">Supabase ✓</span>'
      :'<span style="font-size:11px;font-weight:400;color:#b45309;background:#fef3c7;border:1px solid #fcd34d;padding:2px 6px;border-radius:6px;margin-right:6px">Supabase غير مُعدَّة</span>';
    var hint=ok
      ?'Family ID: <code style="font-size:10px">'+escapeHtml(fid.slice(0,12))+'…</code>'
      :'<a href="#" onclick="closeModal();openCloudSetup();return false;" style="color:#3b82f6">⚙️ إعداد Supabase أولاً</a>';
    var photoCnt=(Array.isArray(people)?people:[]).filter(function(p){return p&&p.photo;}).length;
    /* مسح الاسم السابق */
    window._fuLastRecipName='';
    return '<div style="border:2px solid #3b82f6;border-radius:10px;overflow:hidden">'
      +'<div style="padding:10px 14px;background:#eff6ff;border-bottom:1px solid #bfdbfe">'
      +'<div style="font-size:13px;font-weight:600;color:#1d4ed8">📨 تصدير نسخة لفرد العائلة '+badge+'</div>'
      +'<div style="font-size:11px;color:#3b82f6;margin-top:2px">'+hint+'</div></div>'
      /* ── حقل اسم المستلم ── */
      +'<div style="padding:10px 14px;background:var(--card-bg);border-bottom:1px solid #bfdbfe">'
      +'<label style="font-size:12px;font-weight:600;color:var(--text);display:block;margin-bottom:5px">👤 اسم هذه النسخة <span style="color:#ef4444">*</span></label>'
      +'<input id="_fuRecipName" type="text" placeholder="مثال: هاتف أحمد، جهاز فاطمة…" '
      +'style="width:100%;box-sizing:border-box;padding:7px 10px;border:1px solid #93c5fd;border-radius:7px;font-size:13px;background:var(--bg-input,var(--card-bg));color:var(--text)" '
      +'oninput="window._fuLastRecipName=this.value.trim()" />'
      +'<div style="font-size:10px;color:var(--text3);margin-top:4px">'
      +'💡 يُضمَّن في الملف — يظهر تلقائياً في تحديثات العائلة بدون إعداد من المستلم'
      +'</div></div>'
      +'<div style="display:grid;grid-template-columns:1fr 1fr;gap:0">'
      +'<div onclick="doExportJSONFamily(false)" style="cursor:pointer;padding:12px 14px;background:var(--card-bg);border-left:1px solid #bfdbfe" onmouseover="this.style.background=\'var(--bg-secondary)\'" onmouseout="this.style.background=\'var(--card-bg)\'">'
      +'<div style="font-size:13px;font-weight:600;color:var(--text);margin-bottom:2px">📄 بدون صور</div>'
      +'<div style="font-size:11px;color:var(--text2)">حجم أصغر — مُوصى به</div></div>'
      +'<div onclick="doExportJSONFamily(true)" style="cursor:pointer;padding:12px 14px;background:var(--card-bg)" onmouseover="this.style.background=\'var(--bg-secondary)\'" onmouseout="this.style.background=\'var(--card-bg)\'">'
      +'<div style="font-size:13px;font-weight:600;color:var(--text);margin-bottom:2px">🖼️ مع الصور</div>'
      +'<div style="font-size:11px;color:var(--text2)">'+photoCnt+' صورة — حجم أكبر</div></div>'
      +'</div></div>';
  };

  /* ── نافذة إعداد الجهاز ─────────────────────────────────────────── */
  function openFamilyUploadSetup(){
    var ok=fuReady(), id=fuDevId(), name=fuDevName(), fid=fuFamilyId();
    document.getElementById('modalContainer').innerHTML=
      '<div class="modal-overlay" onclick="if(event.target===this)closeModal()">'
      +'<div class="modal" style="max-width:480px"><h3>📡 إعداد تحديثات العائلة</h3>'
      +'<div style="padding:10px 14px;background:'+(ok?'#d1fae5':'#fff7ed')+';border:1px solid '+(ok?'#10b981':'#fb923c')+';border-radius:8px;font-size:12px;color:'+(ok?'#065f46':'#9a3412')+';margin-bottom:14px;line-height:1.8">'
      +(ok?'✅ Supabase مُعدَّة — الرفع يعمل تلقائياً (5 ثوانٍ بعد الحفظ).<br>Family ID: <code style="background:#c6f6d5;padding:1px 5px;border-radius:4px">'+escapeHtml(fid)+'</code>'
         :'⚙️ Supabase غير مُعدَّة — اضغط "إعداد Supabase" أدناه.')
      +'</div>'
      +'<label style="font-size:12px;font-weight:600;display:block;margin-bottom:6px">👤 اسم هذا الجهاز</label>'
      +'<input id="_fuNm" type="text" value="'+escapeHtml(name)+'" placeholder="مثال: هاتف أحمد، جهاز فاطمة…" style="width:100%;box-sizing:border-box;padding:8px 10px;border:1px solid var(--card-border);border-radius:7px;font-size:13px;background:var(--bg-input,var(--card-bg));color:var(--text);margin-bottom:10px">'
      +'<div style="font-size:10px;color:var(--text3);display:flex;align-items:center;gap:8px;flex-wrap:wrap">'
      +'معرّف الجهاز: <code style="background:var(--bg-secondary);padding:1px 6px;border-radius:4px" id="_fuDidLbl">'+escapeHtml(id)+'</code>'
      +'<button class="btn" style="font-size:10px;padding:1px 7px" onclick="'
        +"try{localStorage.removeItem('ft_family_device_id');}catch(e){}"
        +";var nid=Array.from(crypto.getRandomValues(new Uint8Array(6))).map(function(b){return b.toString(16).padStart(2,'0')}).join('');"
        +"try{localStorage.setItem('ft_family_device_id',nid);}catch(e){}"
        +"try{localStorage.removeItem('ft_fu_hash_v4');}catch(e){}"
        +"try{localStorage.removeItem('ft_fu_last_ts_v4');}catch(e){}"
        +";var el=document.getElementById('_fuDidLbl');if(el)el.textContent=nid;"
        +";if(typeof _showCloudToast==='function')_showCloudToast('✅ معرّف جديد — سيُرفع تحديث خلال 90 ث','success',2800);"
      +'">🔄 معرّف جديد</button></div>'
      +'<div class="modal-footer">'
      +'<button class="btn" onclick="closeModal()">إغلاق</button>'
      +(!ok?'<button class="btn" style="background:#ede9fe;border-color:#8b5cf6;color:#5b21b6" onclick="closeModal();openCloudSetup()">⚙️ إعداد Supabase</button>':'')
      +'<button class="btn primary" onclick="var v=(document.getElementById(\'_fuNm\')||{}).value||\'\';if(v.trim())try{localStorage.setItem(\'ft_family_device_name\',v.trim())}catch(e){}closeModal();if(typeof _showCloudToast===\'function\')_showCloudToast(\'✅ تم حفظ اسم الجهاز\',\'success\',2000);">✓ حفظ</button>'
      +'</div></div></div>';
  }

  /* ── حقن على window ─────────────────────────────────────────────── */

  /* ── حذف سجل (للمالك فقط) ──────────────────────────────────────────── */
  function fuDeleteRecord(rowId) {
    if (!rowId) return;
    var s = fuSettings();
    fvGetToken && fvGetToken().catch && console.debug; // ignore
    // استخدم نفس آلية الـ token
    (function getToken() {
      // إعادة استخدام fvGetToken إن وجدت، وإلا أنشئ token
      if (typeof window._ftGetSupabaseClient === 'function') {
        return window._ftGetSupabaseClient().then(function(client) {
          return client.from(FU_TABLE).delete().eq('id', rowId);
        }).then(function(res) {
          if (res.error) throw new Error(res.error.message);
          return true;
        });
      }
      // fallback: REST API مباشر
      return fuClient().then(function(c) {
        return c.from(FU_TABLE).delete().eq('id', rowId);
      }).then(function(res) {
        if (res.error) throw new Error(res.error.message);
        return true;
      });
    })().then(function() {
      if (typeof _showCloudToast === 'function') _showCloudToast('🗑️ تم حذف السجل', 'success', 2000);
      openFamilyUpdatesModal(); // إعادة تحميل
    }).catch(function(e) {
      alert('❌ فشل الحذف: ' + (e.message || e));
    });
  }
  window.fuDeleteRecord = fuDeleteRecord;

  
  /* ── حذف سجل من Supabase (للمالك فقط) ─────────────────────────────── */
  window.fuDeleteRecord = function(rowId) {
    if (!rowId) return;
    if (!confirm('🗑️ حذف هذا السجل نهائياً من Supabase؟')) return;
    var s = fuSettings();
    /* استخدام REST API مباشرة مع DELETE — أكثر موثوقية من supabase-js */
    var doDelete = function(token) {
      return fetch(s.url + '/rest/v1/' + FU_TABLE + '?id=eq.' + encodeURIComponent(rowId), {
        method: 'DELETE',
        headers: {
          'apikey':        s.anonKey,
          'Authorization': 'Bearer ' + token,
          'Content-Type':  'application/json',
          'Prefer':        'return=representation'
        }
      }).then(function(res) {
        if (!res.ok) {
          return res.json().catch(function(){return{};}).then(function(e){
            throw new Error('HTTP ' + res.status + ': ' + (e.message || e.hint || 'فشل الحذف — تحقق من سياسات RLS'));
          });
        }
        return res.json().catch(function(){return[];});
      }).then(function(deleted) {
        if (!Array.isArray(deleted) || deleted.length === 0) {
          throw new Error('السجل لم يُحذف — ربما سياسة RLS تمنع الحذف. شغّل family_updates_rls_update.sql');
        }
        if (typeof _showCloudToast === 'function') _showCloudToast('🗑️ تم الحذف', 'success', 2000);
        openFamilyUpdatesModal();
      });
    };
    /* الحصول على token ثم الحذف */
    var s2 = fuSettings();
    fetch(s2.url + '/auth/v1/token?grant_type=anonymous', {
      method: 'POST',
      headers: {'apikey': s2.anonKey, 'Content-Type': 'application/json'},
      body: '{}'
    }).then(function(r){return r.ok?r.json():Promise.reject();})
    .then(function(d){ return doDelete(d.access_token || s2.anonKey); })
    .catch(function(){ return doDelete(s2.anonKey); }) /* fallback: anon key مباشرة */
    .catch(function(e) {
      alert('❌ ' + (e.message || 'فشل الحذف'));
    });
  };

    window.openFamilyUpdatesModal    = openFamilyUpdatesModal;
  window.openFamilyUploadSetup     = openFamilyUploadSetup;
  window.triggerFamilyUpload       = triggerFamilyUpload;
  window._doSilentFamilyUpload     = _doSilentFamilyUpload;
  window._isFamilyUploadConfigured = fuReady;
  window.doExportJSONFamily        = doExportJSONFamily;
  window.exportFamilyCopy          = exportFamilyCopy;
  window._applyFamilyMetaIfNeeded  = _applyFamilyMetaIfNeeded;

  /* ── رفع أولي بعد 10 ثوانٍ من تحميل الصفحة ─────────────────────── */
  window.addEventListener('load', function(){
    setTimeout(function(){
      if(fuReady()){log('رفع أولي عند التشغيل…');_doSilentFamilyUpload();}
    }, 10000);
  });

  log('v4 loaded ✓');
})();
