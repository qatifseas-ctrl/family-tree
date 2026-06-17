/**
 * js/cloud.js
 * ═══════════════════════════════════════════════════════════════
 * نظام الحفظ السحابي المشفَّر
 * Encrypted Cloud Save System — GitHub Gist + AES-256-GCM
 * ═══════════════════════════════════════════════════════════════
 *
 * Dependencies: config.js, core.js, storage.js
 *
 * API العامة:
 *   openCloudSetup()      ← نافذة إعداد السحابة
 *   manualCloudSync()     ← مزامنة يدوية (رفع)
 *   cloudRestorePrompt()  ← استعادة من السحابة
 *   closeBannerForever()  ← إخفاء شريط الترقية
 *   openFamilyUploadSetup() ← إعداد رفع نسخة العائلة
 *   openFamilyUpdatesModal() ← عرض تحديثات العائلة
 */

'use strict';

// ── حالة السحابة ──
let _cloudSyncTimer = null;
let _cloudSyncing = false;
let _cloudEnabled = false;

function _isCloudConfigured() {
  return !!(CLOUD_CONFIG.KEY_HEX && CLOUD_CONFIG.KEY_HEX.length === 64 && CLOUD_CONFIG.GITHUB_PAT && CLOUD_CONFIG.GITHUB_PAT.trim());
}

// ══════════════════════════════════════════════════════════
//  مساعدات التشفير AES-256-GCM
// ══════════════════════════════════════════════════════════

function _hexToBytes(hex) {
  let bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) bytes[i] = parseInt(hex.substr(i * 2, 2), 16);
  return bytes;
}
function _bytesToBase64(bytes) {
  let bin = ''; bytes.forEach(b => bin += String.fromCharCode(b)); return btoa(bin);
}
function _base64ToBytes(b64) {
  let bin = atob(b64), bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i); return bytes;
}
async function _getCryptoKey() {
  if (!CLOUD_CONFIG.KEY_HEX || CLOUD_CONFIG.KEY_HEX.length !== 64) throw new Error('مفتاح التشفير غير صالح');
  return crypto.subtle.importKey('raw', _hexToBytes(CLOUD_CONFIG.KEY_HEX), { name: 'AES-GCM' }, false, ['encrypt', 'decrypt']);
}

async function cloudEncrypt(plainText) {
  let key = await _getCryptoKey();
  let iv = crypto.getRandomValues(new Uint8Array(12));
  let encoded = new TextEncoder().encode(plainText);
  let cipher = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, encoded);
  let combined = new Uint8Array(12 + cipher.byteLength);
  combined.set(iv, 0); combined.set(new Uint8Array(cipher), 12);
  return _bytesToBase64(combined);
}

async function cloudDecrypt(b64) {
  let key = await _getCryptoKey();
  let combined = _base64ToBytes(b64);
  let iv = combined.slice(0, 12);
  let cipher = combined.slice(12);
  let plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, cipher);
  return new TextDecoder().decode(plain);
}

// ══════════════════════════════════════════════════════════
//  GitHub Gist API
// ══════════════════════════════════════════════════════════

function _gistHeaders() {
  return {
    'Authorization': 'token ' + CLOUD_CONFIG.GITHUB_PAT,
    'Content-Type': 'application/json',
    'Accept': 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28'
  };
}

async function _gistCreate(filesObj) {
  let res = await fetch('https://api.github.com/gists', {
    method: 'POST', headers: _gistHeaders(),
    body: JSON.stringify({ description: 'Family Tree Encrypted Backup', public: false, files: filesObj })
  });
  if (!res.ok) throw new Error('GitHub API: ' + res.status + ' ' + res.statusText);
  let j = await res.json(); return j.id;
}

async function _gistUpdate(gistId, filesObj) {
  let delay = 1500;
  for (let i = 0; i < 3; i++) {
    if (i > 0) await new Promise(r => setTimeout(r, delay *= 2));
    try {
      let res = await fetch('https://api.github.com/gists/' + gistId, {
        method: 'PATCH', headers: _gistHeaders(),
        body: JSON.stringify({ files: filesObj })
      });
      if ((res.status >= 500 || res.status === 429) && i < 2) { console.warn('[GistUpdate] HTTP', res.status, 'retry', i + 1); continue; }
      if (!res.ok) throw new Error('GitHub API: ' + res.status + ' ' + res.statusText);
      return;
    } catch (e) { if (i >= 2) throw e; }
  }
}

async function _ghRetry(fn, tries) {
  tries = tries || 3;
  let delay = 1500;
  for (let i = 0; i < tries; i++) {
    if (i > 0) { await new Promise(r => setTimeout(r, delay)); delay = Math.min(delay * 2, 12000); }
    try {
      let res = await fn();
      if (res.status === 429) {
        let ra = parseInt(res.headers.get('Retry-After') || '15');
        await new Promise(r => setTimeout(r, Math.min(ra * 1000, 30000)));
        continue;
      }
      if ((res.status >= 500 || res.status === 408) && i < tries - 1) continue;
      return res;
    } catch (e) { if (i === tries - 1) throw e; }
  }
}

let _gistCache = { id: '', ts: 0, files: {} };

async function _gistFetchAllFiles(gistId) {
  let now = Date.now();
  if (_gistCache.id === gistId && now - _gistCache.ts < 30000) return _gistCache.files;
  let res = await _ghRetry(() => fetch('https://api.github.com/gists/' + gistId, { headers: _gistHeaders() }), 3);
  if (!res.ok) throw new Error('GitHub API: ' + res.status + ' ' + res.statusText);
  let j = await res.json();
  let result = {};
  for (let fname of Object.keys(j.files || {})) {
    let f = j.files[fname];
    if (!f) continue;
    if (f.truncated && f.raw_url) {
      try {
        let rr = await _ghRetry(() => fetch(f.raw_url, { headers: _gistHeaders() }), 3);
        if (rr.ok) { result[fname] = await rr.text(); continue; }
      } catch (e) {}
    } else {
      result[fname] = f.content || '';
    }
  }
  _gistCache = { id: gistId, ts: now, files: result };
  return result;
}

function _invalidateGistCache() { _gistCache = { id: '', ts: 0, files: {} }; }

async function _gistReadFile(gistId, filename) {
  let res = await _ghRetry(() => fetch('https://api.github.com/gists/' + gistId, { headers: _gistHeaders() }), 3);
  if (!res.ok) throw new Error('GitHub API: ' + res.status + ' ' + res.statusText);
  let j = await res.json();
  let f = j.files && j.files[filename];
  if (!f) return null;
  if (f.truncated && f.raw_url) {
    try {
      let rr = await _ghRetry(() => fetch(f.raw_url, { headers: _gistHeaders() }), 3);
      if (rr && rr.ok) return await rr.text();
    } catch (e) {}
    await new Promise(r => setTimeout(r, 3000));
    try {
      let rr2 = await _ghRetry(() => fetch('https://api.github.com/gists/' + gistId, { headers: _gistHeaders() }), 2);
      if (rr2 && rr2.ok) {
        let j2 = await rr2.json();
        let f2 = j2.files && j2.files[filename];
        if (f2 && f2.raw_url) {
          let rr3 = await _ghRetry(() => fetch(f2.raw_url, { headers: _gistHeaders() }), 2);
          if (rr3 && rr3.ok) return await rr3.text();
        }
        if (f2 && !f2.truncated && f2.content) return f2.content;
      }
    } catch (e2) {}
    throw new Error('ملف كبير جداً (>1MB) — قلّل حجم الصور ثم أعد الرفع');
  }
  return f.content || null;
}

async function _gistRead(gistId) {
  let content = await _gistReadFile(gistId, CLOUD_CONFIG.GIST_FILE);
  if (!content) throw new Error('الملف غير موجود في Gist');
  return content;
}

// ══════════════════════════════════════════════════════════
//  واجهة إعداد السحابة
// ══════════════════════════════════════════════════════════

function openCloudSetup() {
  let key = CLOUD_CONFIG.KEY_HEX || '';
  let pat = CLOUD_CONFIG.GITHUB_PAT || '';
  let gid = CLOUD_CONFIG.GIST_ID || '';

  let html = `<div class="modal-overlay" onclick="if(event.target===this)closeModal()">
  <div class="modal" style="max-width:520px">
    <h3>☁️ إعداد الحفظ السحابي</h3>
    <div style="font-size:12px;color:var(--text2);background:var(--card-bg);border:1px solid var(--card-border);border-radius:8px;padding:10px 12px;margin-bottom:14px;line-height:1.8">
      <strong style="color:var(--text)">كيف يعمل؟</strong><br>
      بياناتك تُشفَّر محلياً بـ AES-256 <strong>قبل</strong> رفعها إلى GitHub Gist.<br>
      بدون مفتاح التشفير لا يستطيع أي طرف قراءة بياناتك — حتى GitHub.
    </div>
    <div class="form-row">
      <label>🔑 مفتاح التشفير AES-256 (64 حرف HEX)</label>
      <div style="display:flex;gap:6px">
        <input id="cloud_key" type="password" value="${key}" style="font-family:monospace;font-size:11px;flex:1" placeholder="أدخل مفتاح HEX 64 حرفاً أو اضغط توليد...">
        <button class="btn" onclick="let i=document.getElementById('cloud_key');i.type=i.type==='password'?'text':'password'" style="font-size:11px">👁</button>
        <button class="btn" onclick="let k=Array.from(crypto.getRandomValues(new Uint8Array(32))).map(b=>b.toString(16).padStart(2,'0')).join('');document.getElementById('cloud_key').value=k;document.getElementById('cloud_key').type='text'" style="font-size:11px">🎲 توليد</button>
      </div>
      <div style="font-size:11px;color:var(--text2);margin-top:4px">⚠️ احتفظ بنسخة من هذا المفتاح في مكان آمن — بدونه لا يمكن استعادة البيانات</div>
    </div>
    <div class="form-row">
      <label>🐱 GitHub Personal Access Token (gist scope)</label>
      <div style="display:flex;gap:6px">
        <input id="cloud_pat" type="password" value="${pat}" style="font-family:monospace;font-size:11px;flex:1" placeholder="github_pat_xxxxxxxx...">
        <button class="btn" onclick="let i=document.getElementById('cloud_pat');i.type=i.type==='password'?'text':'password'" style="font-size:11px">👁</button>
      </div>
      <div style="margin-top:4px"><a href="https://github.com/settings/tokens/new?scopes=gist&description=FamilyTree" target="_blank" style="font-size:11px;color:#3b82f6">← إنشاء توكن جديد في GitHub</a></div>
    </div>
    <div class="form-row">
      <label>🔗 معرّف Gist (اختياري — يُنشأ تلقائياً)</label>
      <input id="cloud_gid" type="text" value="${gid}" style="font-family:monospace;font-size:11px" placeholder="فارغ = يُنشأ تلقائياً عند أول مزامنة">
    </div>
    <div class="modal-footer">
      <button class="btn" onclick="closeModal()">إلغاء</button>
      <button class="btn" style="color:#ef4444" onclick="clearCloudConfig()">🗑 إزالة الإعداد</button>
      <button class="btn primary" onclick="applyCloudSetup()">✓ حفظ الإعداد</button>
    </div>
  </div></div>`;
  document.getElementById('modalContainer').innerHTML = html;
  _androidBackGuardModalOpen();
}

function applyCloudSetup() {
  let key = (document.getElementById('cloud_key').value || '').trim();
  let pat = (document.getElementById('cloud_pat').value || '').trim();
  let gid = (document.getElementById('cloud_gid').value || '').trim();

  if (!key || key.length !== 64 || !/^[0-9a-fA-F]+$/.test(key)) {
    alert('مفتاح التشفير يجب أن يكون 64 حرف HEX صالح');
    return;
  }
  if (!pat) { alert('الرجاء إدخال GitHub PAT'); return; }

  CLOUD_CONFIG.KEY_HEX = key;
  CLOUD_CONFIG.GITHUB_PAT = pat;
  if (gid) CLOUD_CONFIG.GIST_ID = gid;

  try {
    localStorage.setItem('ft_cloud_key', key);
    localStorage.setItem('ft_cloud_pat', pat);
    if (gid) localStorage.setItem('ft_cloud_gid', gid);
  } catch (e) {}

  closeModal();
  _showCloudToast('✅ إعداد السحابة تم حفظه', 'success', 3000);
}

function clearCloudConfig() {
  if (!confirm('إزالة إعداد السحابة؟ (لا تُحذف البيانات من Gist)')) return;
  CLOUD_CONFIG.KEY_HEX = '';
  CLOUD_CONFIG.GITHUB_PAT = '';
  CLOUD_CONFIG.GIST_ID = '';
  try {
    localStorage.removeItem('ft_cloud_key');
    localStorage.removeItem('ft_cloud_pat');
    localStorage.removeItem('ft_cloud_gid');
  } catch (e) {}
  closeModal();
  _showCloudToast('🗑 تم إزالة إعداد السحابة', 'info', 3000);
}

function _loadCloudSettings() {
  try {
    let key = localStorage.getItem('ft_cloud_key') || '';
    let pat = localStorage.getItem('ft_cloud_pat') || '';
    let gid = localStorage.getItem('ft_cloud_gid') || '';
    if (key && !CLOUD_CONFIG.KEY_HEX) CLOUD_CONFIG.KEY_HEX = key;
    if (pat && !CLOUD_CONFIG.GITHUB_PAT) CLOUD_CONFIG.GITHUB_PAT = pat;
    if (gid && !CLOUD_CONFIG.GIST_ID) CLOUD_CONFIG.GIST_ID = gid;
  } catch (e) {}
}

// ══════════════════════════════════════════════════════════
//  المزامنة اليدوية (رفع)
// ══════════════════════════════════════════════════════════

async function _doUpload() {
  if (!_isCloudConfigured()) {
    openCloudSetup();
    return;
  }
  if (_cloudSyncing) return;
  _cloudSyncing = true;

  _showCloudToast('☁️ جارٍ الرفع...', 'info');
  try {
    // بيانات بدون صور للتشفير الأساسي
    let exportPeople = people.map(p => { let c = Object.assign({}, p); delete c.photo; return c; });
    let plain = JSON.stringify({
      people: exportPeople, nextId, relPairs,
      myPersonId: myPersonId || null,
      uploadedAt: new Date().toISOString()
    });

    let encrypted = await cloudEncrypt(plain);
    let filesObj = { [CLOUD_CONFIG.GIST_FILE]: { content: 'ENC:' + encrypted } };

    if (CLOUD_CONFIG.GIST_ID) {
      await _gistUpdate(CLOUD_CONFIG.GIST_ID, filesObj);
    } else {
      let newId = await _gistCreate(filesObj);
      CLOUD_CONFIG.GIST_ID = newId;
      try { localStorage.setItem('ft_cloud_gid', newId); } catch (e) {}
    }

    _invalidateGistCache();

    // رفع الصور (delta — الجديدة فقط)
    let photoCount = await _uploadDeltaPhotos();

    try { localStorage.setItem(LAST_SYNC_KEY, new Date().toISOString()); } catch (e) {}
    _showCloudToast(`✅ تم الرفع بنجاح${photoCount ? ` (${photoCount} صورة)` : ''}`, 'success');
  } catch (err) {
    _showCloudToast('❌ فشل الرفع: ' + err.message, 'error');
    console.error('[Cloud]', err);
  } finally {
    _cloudSyncing = false;
  }
}

async function _uploadDeltaPhotos() {
  let photoPeople = people.filter(p => p.photo);
  if (!photoPeople.length) return 0;

  let existingFiles;
  try {
    existingFiles = await _gistFetchAllFiles(CLOUD_CONFIG.GIST_ID);
  } catch (e) {
    console.warn('[IMG-SYNC] Could not fetch existing files:', e.message);
    return 0;
  }

  let uploaded = 0;
  for (let p of photoPeople) {
    let photoKey = `ft_photo_${p.id}.dat`;
    let photoHash = p.photo.length.toString();
    let existingHash = existingFiles[photoKey + '.hash'];

    if (existingFiles[photoKey] && existingHash === photoHash) continue;

    try {
      let filesObj = {
        [photoKey]: { content: p.photo },
        [photoKey + '.hash']: { content: photoHash }
      };
      await _gistUpdate(CLOUD_CONFIG.GIST_ID, filesObj);
      uploaded++;
      await new Promise(r => setTimeout(r, 500)); // throttle
    } catch (e) {
      console.warn('[IMG-SYNC] Failed to upload photo for', p.name, e.message);
    }
  }
  _invalidateGistCache();
  return uploaded;
}

async function manualCloudSync() {
  await _doUpload();
}

// ══════════════════════════════════════════════════════════
//  الاستعادة من السحابة
// ══════════════════════════════════════════════════════════

async function _doDownload() {
  if (!_isCloudConfigured()) {
    openCloudSetup();
    return;
  }
  _showCloudToast('⬇️ جارٍ التنزيل...', 'info');
  try {
    let content = await _gistRead(CLOUD_CONFIG.GIST_ID);
    if (!content) throw new Error('لا توجد بيانات في السحابة');

    let plain;
    if (content.startsWith('ENC:')) {
      plain = await cloudDecrypt(content.slice(4));
    } else {
      plain = content;
    }

    let data = JSON.parse(plain);

    // دمج الصور
    let allFiles;
    try { allFiles = await _gistFetchAllFiles(CLOUD_CONFIG.GIST_ID); } catch (e) {}
    if (allFiles) {
      data.people.forEach(p => {
        let photoKey = `ft_photo_${p.id}.dat`;
        if (allFiles[photoKey] && !p.photo) {
          p.photo = allFiles[photoKey];
        }
      });
    }

    // عرض نافذة تأكيد قبل الاستبدال
    let dt = data.uploadedAt ? new Date(data.uploadedAt).toLocaleString('ar') : 'غير معروف';
    let msg = `بيانات السحابة:\n👥 ${data.people.length} فرد\n🕒 ${dt}\n\nاستبدال البيانات المحلية؟`;
    if (!confirm(msg)) {
      _showCloudToast('تم الإلغاء', 'info', 2000);
      return;
    }

    people = data.people;
    nextId = data.nextId || 1;
    relPairs = data.relPairs || [];
    if (data.myPersonId) { myPersonId = parseInt(data.myPersonId); saveMyPerson(); }
    expanded = {};
    people.forEach(p => { expanded[p.id] = false; });
    if (typeof migrateExternalSpouses === 'function') migrateExternalSpouses();
    if (typeof normalizeAllPersonDates === 'function') normalizeAllPersonDates();
    _invalidateAll();
    if (people.length) expanded[people[0].id] = true;
    saveData(); renderAll(); updateMyPersonBtn();
    _showCloudToast(`✅ تم الاستعادة (${people.length} فرد)`, 'success');
  } catch (err) {
    _showCloudToast('❌ فشل التنزيل: ' + err.message, 'error');
    console.error('[Cloud]', err);
  }
}

async function cloudRestorePrompt() {
  await _doDownload();
}

// ══════════════════════════════════════════════════════════
//  رفع صامت لنسخة العائلة
// ══════════════════════════════════════════════════════════

function _isFamilyUploadConfigured() {
  return !!(FAMILY_UPLOAD_CONFIG.GITHUB_PAT && FAMILY_UPLOAD_CONFIG.GITHUB_PAT.trim());
}

let _familyUploadTimer = null;
let _familyUploading = false;

function triggerFamilyUpload() {
  if (!_isFamilyUploadConfigured()) return;
  clearTimeout(_familyUploadTimer);
  _familyUploadTimer = setTimeout(() => _doSilentFamilyUpload(), 5000);
}

function _getFamilyGistFileName() {
  let deviceId = localStorage.getItem('ft_family_device_id') || '';
  if (!deviceId) {
    deviceId = 'dev_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now().toString(36);
    try { localStorage.setItem('ft_family_device_id', deviceId); } catch (e) {}
  }
  return `ft_family_${deviceId}.dat`;
}

async function _doSilentFamilyUpload() {
  if (!_isFamilyUploadConfigured() || _familyUploading) return;
  _familyUploading = true;
  try {
    let activeKey = (FAMILY_UPLOAD_CONFIG.KEY_HEX && FAMILY_UPLOAD_CONFIG.KEY_HEX.length === 64)
      ? FAMILY_UPLOAD_CONFIG.KEY_HEX
      : (CLOUD_CONFIG.KEY_HEX && CLOUD_CONFIG.KEY_HEX.length === 64 ? CLOUD_CONFIG.KEY_HEX : null);
    if (!activeKey) { _familyUploading = false; return; }

    let _devName = localStorage.getItem('ft_family_device_name') || FAMILY_DEVICE_ID || '';
    let data = JSON.parse(JSON.stringify({
      people, relPairs, nextId,
      myPersonId: myPersonId || null,
      uploadedAt: new Date().toISOString(),
      deviceName: _devName,
      deviceId: _getFamilyGistFileName().replace(/^ft_family_/, '').replace(/\.dat$/, '')
    }));
    data.people.forEach(p => { if (p.photo) delete p.photo; });

    let plain = JSON.stringify(data);
    let keyBytes = _hexToBytes(activeKey);
    let cryptoKey = await crypto.subtle.importKey('raw', keyBytes, { name: 'AES-GCM' }, false, ['encrypt']);
    let iv = crypto.getRandomValues(new Uint8Array(12));
    let cipher = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, cryptoKey, new TextEncoder().encode(plain));
    let combined = new Uint8Array(12 + cipher.byteLength);
    combined.set(iv, 0); combined.set(new Uint8Array(cipher), 12);
    let content = 'ENC:' + _bytesToBase64(combined);

    let gistId = FAMILY_UPLOAD_CONFIG.GIST_ID || localStorage.getItem(FAMILY_UPLOAD_GIST_KEY) || '';
    let headers = {
      'Authorization': 'token ' + FAMILY_UPLOAD_CONFIG.GITHUB_PAT,
      'Content-Type': 'application/json',
      'Accept': 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28'
    };
    let fileName = _getFamilyGistFileName();

    if (gistId) {
      let res = await fetch('https://api.github.com/gists/' + gistId, {
        method: 'PATCH', headers, body: JSON.stringify({ files: { [fileName]: { content } } })
      });
      if (!res.ok) {
        let r2 = await fetch('https://api.github.com/gists', {
          method: 'POST', headers,
          body: JSON.stringify({ description: 'Family Tree — Auto Update', public: false, files: { [fileName]: { content } } })
        });
        if (r2.ok) { let j = await r2.json(); localStorage.setItem(FAMILY_UPLOAD_GIST_KEY, j.id); }
      }
    } else {
      let res = await fetch('https://api.github.com/gists', {
        method: 'POST', headers,
        body: JSON.stringify({ description: 'Family Tree — Auto Update', public: false, files: { [fileName]: { content } } })
      });
      if (res.ok) { let j = await res.json(); localStorage.setItem(FAMILY_UPLOAD_GIST_KEY, j.id); }
    }
  } catch (e) {
    console.debug('[FamilyUpload]', e.message);
  } finally {
    _familyUploading = false;
  }
}

// ══════════════════════════════════════════════════════════
//  إعداد نسخة العائلة (للمالك)
// ══════════════════════════════════════════════════════════

function openFamilyUploadSetup() {
  let pat = FAMILY_UPLOAD_CONFIG.GITHUB_PAT || '';
  let gid = FAMILY_UPLOAD_CONFIG.GIST_ID || '';
  let html = `<div class="modal-overlay" onclick="if(event.target===this)closeModal()">
  <div class="modal" style="max-width:520px">
    <h3>📡 إعداد رفع نسخة العائلة</h3>
    <div style="font-size:12px;color:var(--text2);background:var(--bg-secondary);border:1px solid var(--card-border);border-radius:8px;padding:10px 12px;margin-bottom:14px;line-height:1.8">
      <strong>كيف يعمل؟</strong><br>
      نسخة العائلة ترفع تلقائياً في الخلفية. أنت كمالك تضغط <strong>"📡 تحديثات العائلة"</strong> لترى آخر رفع.
    </div>
    <div class="form-row">
      <label>👤 اسم الجهاز</label>
      <input id="fu_devname" type="text" value="${localStorage.getItem('ft_family_device_name') || ''}" placeholder="مثال: هاتف أحمد...">
    </div>
    <div class="form-row">
      <label>🐱 GitHub PAT (gist scope)</label>
      <div style="display:flex;gap:6px">
        <input id="fu_pat" type="password" value="${pat}" style="font-family:monospace;font-size:11px;flex:1">
        <button class="btn" onclick="let i=document.getElementById('fu_pat');i.type=i.type==='password'?'text':'password'" style="font-size:11px">👁</button>
      </div>
    </div>
    <div class="form-row">
      <label>🔗 معرّف Gist</label>
      <div style="display:flex;gap:6px">
        <input id="fu_gid" type="text" value="${gid}" style="font-family:monospace;font-size:11px;flex:1">
        <button class="btn" onclick="createFamilyGistNow()" style="font-size:11px">🧪 إنشاء الآن</button>
      </div>
    </div>
    <div class="modal-footer">
      <button class="btn" onclick="closeModal()">إلغاء</button>
      <button class="btn primary" onclick="applyFamilyUploadSetup()">✓ حفظ</button>
    </div>
  </div></div>`;
  document.getElementById('modalContainer').innerHTML = html;
}

function applyFamilyUploadSetup() {
  let pat = (document.getElementById('fu_pat').value || '').trim();
  let gid = (document.getElementById('fu_gid').value || '').trim();
  let devname = (document.getElementById('fu_devname').value || '').trim();
  if (!pat) { alert('الرجاء إدخال GitHub PAT'); return; }
  FAMILY_UPLOAD_CONFIG.GITHUB_PAT = pat;
  if (gid) FAMILY_UPLOAD_CONFIG.GIST_ID = gid;
  if (devname) { try { localStorage.setItem('ft_family_device_name', devname); } catch (e) {} }
  if (!FAMILY_UPLOAD_CONFIG.KEY_HEX && CLOUD_CONFIG.KEY_HEX && CLOUD_CONFIG.KEY_HEX.length === 64) {
    FAMILY_UPLOAD_CONFIG.KEY_HEX = CLOUD_CONFIG.KEY_HEX;
  }
  try {
    localStorage.setItem('ft_fupload_pat', pat);
    if (gid) localStorage.setItem('ft_fupload_gid', gid);
    if (FAMILY_UPLOAD_CONFIG.KEY_HEX) localStorage.setItem('ft_fupload_key', FAMILY_UPLOAD_CONFIG.KEY_HEX);
  } catch (e) {}
  closeModal();
  _showCloudToast('✅ إعداد نسخة العائلة تم حفظه', 'success', 3000);
}

async function createFamilyGistNow() {
  let pat = (document.getElementById('fu_pat').value || '').trim();
  if (!pat) { alert('أدخل GitHub PAT أولاً'); return; }
  let btn = event.target; btn.disabled = true; btn.textContent = '⏳ جارٍ الإنشاء...';
  try {
    let headers = { 'Authorization': 'token ' + pat, 'Content-Type': 'application/json', 'Accept': 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28' };
    let res = await fetch('https://api.github.com/gists', {
      method: 'POST', headers,
      body: JSON.stringify({ description: 'Family Tree — Auto Updates', public: false, files: { [_getFamilyGistFileName()]: { content: '{}' } } })
    });
    if (!res.ok) throw new Error('GitHub API: ' + res.status);
    let j = await res.json();
    document.getElementById('fu_gid').value = j.id;
    localStorage.setItem(FAMILY_UPLOAD_GIST_KEY, j.id);
    btn.textContent = '✅ تم الإنشاء';
    btn.style.background = 'var(--clr-green-bg)'; btn.style.borderColor = '#10b981'; btn.style.color = 'var(--clr-green-text)';
  } catch (e) {
    btn.disabled = false; btn.textContent = '🧪 إنشاء الآن';
    alert('خطأ: ' + e.message);
  }
}

function _loadFamilyUploadSettings() {
  try {
    let pat = localStorage.getItem('ft_fupload_pat') || '';
    let gid = localStorage.getItem('ft_fupload_gid') || localStorage.getItem(FAMILY_UPLOAD_GIST_KEY) || '';
    let key = localStorage.getItem('ft_fupload_key') || '';
    if (pat && !FAMILY_UPLOAD_CONFIG.GITHUB_PAT) FAMILY_UPLOAD_CONFIG.GITHUB_PAT = pat;
    if (gid && !FAMILY_UPLOAD_CONFIG.GIST_ID) {
      FAMILY_UPLOAD_CONFIG.GIST_ID = gid;
      try { localStorage.setItem('ft_fupload_gid', gid); localStorage.setItem(FAMILY_UPLOAD_GIST_KEY, gid); } catch (e) {}
    }
    if (key && key.length === 64 && !FAMILY_UPLOAD_CONFIG.KEY_HEX) FAMILY_UPLOAD_CONFIG.KEY_HEX = key;
    if (!FAMILY_UPLOAD_CONFIG.KEY_HEX && CLOUD_CONFIG.KEY_HEX && CLOUD_CONFIG.KEY_HEX.length === 64) {
      FAMILY_UPLOAD_CONFIG.KEY_HEX = CLOUD_CONFIG.KEY_HEX;
    }
  } catch (e) {}
}

// ══════════════════════════════════════════════════════════
//  إشعار السحابة (Toast)
// ══════════════════════════════════════════════════════════

function _showCloudToast(msg, type, duration) {
  duration = duration || 4000;
  let colors = {
    success: { bg: '#dcfce7', text: '#15803d', border: '#86efac' },
    error: { bg: '#fee2e2', text: '#dc2626', border: '#fca5a5' },
    info: { bg: '#dbeafe', text: '#1d4ed8', border: '#93c5fd' }
  };
  let c = colors[type] || colors.info;
  let toast = document.createElement('div');
  toast.style.cssText = `position:fixed;bottom:80px;left:50%;transform:translateX(-50%);background:${c.bg};color:${c.text};border:1px solid ${c.border};padding:10px 20px;border-radius:20px;font-size:13px;font-weight:500;z-index:99999;pointer-events:none;opacity:1;transition:opacity 0.4s;max-width:90vw;text-align:center;box-shadow:0 4px 12px rgba(0,0,0,.1)`;
  toast.textContent = msg;
  document.body.appendChild(toast);
  setTimeout(() => { toast.style.opacity = '0'; setTimeout(() => { if (toast.parentNode) toast.remove(); }, 400); }, duration);
}

// استعادة السحابة عند بدء التشغيل (اختياري)
function closeBannerForever() {
  try { localStorage.setItem('ft_banner_dismissed', '1'); } catch (e) {}
  let banner = document.getElementById('cloudBanner');
  if (banner) banner.remove();
}

// ══════════════════════════════════════════════════════════
//  عرض تحديثات العائلة (للمالك)
// ══════════════════════════════════════════════════════════

async function openFamilyUpdatesModal() {
  if (!_isFamilyUploadConfigured()) {
    openFamilyUploadSetup();
    return;
  }

  let modal = document.getElementById('modalContainer');
  modal.innerHTML = `<div class="modal-overlay"><div class="modal" style="max-width:500px"><h3>📡 تحديثات العائلة</h3><div style="text-align:center;padding:20px;color:var(--text2)">⏳ جارٍ التحميل...</div></div></div>`;
  _androidBackGuardModalOpen();

  try {
    let gistId = FAMILY_UPLOAD_CONFIG.GIST_ID || localStorage.getItem(FAMILY_UPLOAD_GIST_KEY) || '';
    if (!gistId) throw new Error('لم يُعيَّن Gist ID — ارجع للإعداد');

    let headers = {
      'Authorization': 'token ' + FAMILY_UPLOAD_CONFIG.GITHUB_PAT,
      'Accept': 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28'
    };
    let res = await fetch('https://api.github.com/gists/' + gistId, { headers });
    if (!res.ok) throw new Error('GitHub API: ' + res.status);
    let j = await res.json();

    let deviceFiles = Object.keys(j.files || {}).filter(f => f.startsWith('ft_family_') && f.endsWith('.dat'));
    if (!deviceFiles.length) {
      modal.innerHTML = `<div class="modal-overlay" onclick="if(event.target===this)closeModal()"><div class="modal" style="max-width:500px"><h3>📡 تحديثات العائلة</h3><div style="padding:20px;text-align:center;color:var(--text2)">لا توجد تحديثات حتى الآن</div><div class="modal-footer"><button class="btn" onclick="closeModal()">إغلاق</button></div></div></div>`;
      return;
    }

    // جلب وفك تشفير كل جهاز
    let devices = [];
    for (let fname of deviceFiles) {
      try {
        let f = j.files[fname];
        let raw = f.content || '';
        if (f.truncated && f.raw_url) {
          let rr = await fetch(f.raw_url, { headers });
          if (rr.ok) raw = await rr.text();
        }
        let data = await _decryptFamilyFile(raw, FAMILY_UPLOAD_CONFIG.KEY_HEX || CLOUD_CONFIG.KEY_HEX);
        devices.push({ fname, data, raw });
      } catch (e) {
        devices.push({ fname, error: e.message });
      }
    }

    let devHtml = devices.map((d, i) => {
      if (d.error) return `<div style="padding:10px 12px;border:1px solid var(--card-border);border-radius:8px;margin-bottom:8px;color:var(--text2)">⚠️ ${d.fname}: ${d.error}</div>`;
      let dd = d.data;
      let dt = dd.uploadedAt ? new Date(dd.uploadedAt).toLocaleString('ar') : '؟';
      let name = dd.deviceName || dd.deviceId || d.fname.replace(/^ft_family_/, '').replace(/\.dat$/, '');
      let count = (dd.people || []).length;
      return `<div style="padding:12px;border:1px solid var(--card-border);border-radius:8px;margin-bottom:8px;background:var(--card-bg)">
        <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">
          <span style="font-weight:600;font-size:13px">📱 ${name}</span>
          <span style="font-size:11px;color:var(--text2)">👥 ${count} · 🕒 ${dt}</span>
        </div>
        <div style="margin-top:8px;display:flex;gap:6px">
          <button class="btn" onclick="importFamilyDevice(${i})" style="font-size:11px;padding:4px 10px">➕ دمج</button>
          <button class="btn" onclick="replaceFamilyDevice(${i})" style="font-size:11px;padding:4px 10px;color:#ef4444">🔄 استبدال</button>
        </div>
      </div>`;
    }).join('');

    // حفظ بيانات الأجهزة للاستخدام عند الدمج
    window._familyDevicesData = devices;

    modal.innerHTML = `<div class="modal-overlay" onclick="if(event.target===this)closeModal()">
      <div class="modal" style="max-width:500px">
        <h3>📡 تحديثات العائلة (${devices.length} جهاز)</h3>
        ${devHtml}
        <div class="modal-footer">
          <button class="btn" onclick="closeModal()">إغلاق</button>
          <button class="btn primary" onclick="mergeAllFamilyDevices()">دمج الكل</button>
        </div>
      </div></div>`;

  } catch (err) {
    modal.innerHTML = `<div class="modal-overlay" onclick="if(event.target===this)closeModal()"><div class="modal" style="max-width:420px"><h3>📡 تحديثات العائلة</h3><div style="color:#ef4444;padding:12px">❌ ${err.message}</div><div class="modal-footer"><button class="btn" onclick="closeModal()">إغلاق</button></div></div></div>`;
  }
}

async function _decryptFamilyFile(raw, keyHex) {
  if (raw.startsWith('ENC:')) {
    let ak = keyHex || (CLOUD_CONFIG.KEY_HEX && CLOUD_CONFIG.KEY_HEX.length === 64 ? CLOUD_CONFIG.KEY_HEX : '');
    if (!ak || ak.length !== 64) throw new Error('مفتاح التشفير مفقود');
    let bytes = _base64ToBytes(raw.slice(4));
    let iv = bytes.slice(0, 12), cipher = bytes.slice(12);
    let ck = await crypto.subtle.importKey('raw', _hexToBytes(ak), { name: 'AES-GCM' }, false, ['decrypt']);
    let plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, ck, cipher);
    return JSON.parse(new TextDecoder().decode(plain));
  }
  return JSON.parse(raw);
}

function importFamilyDevice(idx) {
  let devices = window._familyDevicesData || [];
  let d = devices[idx]; if (!d || !d.data) return;
  let _pending = { people: d.data.people, relPairs: d.data.relPairs || [], nextId: d.data.nextId || nextId };
  closeModal();
  _pendingImportData = _pending;
  showImportModeModal(_pending);
}

function replaceFamilyDevice(idx) {
  let devices = window._familyDevicesData || [];
  let d = devices[idx]; if (!d || !d.data) return;
  if (!confirm(`استبدال كل البيانات ببيانات ${d.data.deviceName || 'هذا الجهاز'}؟`)) return;
  _pendingImportData = { people: d.data.people, relPairs: d.data.relPairs || [], nextId: d.data.nextId || nextId };
  doImport('replace');
}

function mergeAllFamilyDevices() {
  let devices = window._familyDevicesData || [];
  if (!devices.length) return;
  if (!confirm(`دمج بيانات ${devices.length} جهاز مع الشجرة الحالية؟`)) return;
  closeModal();
  let allPeople = [];
  let allRelPairs = [];
  let maxId = nextId;
  devices.forEach(d => {
    if (!d.data) return;
    allPeople = allPeople.concat(d.data.people || []);
    allRelPairs = allRelPairs.concat(d.data.relPairs || []);
    if (d.data.nextId > maxId) maxId = d.data.nextId;
  });
  _pendingImportData = { people: allPeople, relPairs: allRelPairs, nextId: maxId };
  doImport('merge');
}
