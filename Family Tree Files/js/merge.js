/**
 * js/merge.js
 * ═══════════════════════════════════════════════════════════════
 * نظام الدمج والتحديثات — Merge History + Undo + Family Updates
 * ═══════════════════════════════════════════════════════════════
 *
 * Dependencies: core.js, cloud.js, storage.js, export.js
 *
 * API العامة:
 *   openFamilyUpdatesModal()  ← (موجود في cloud.js — هنا: السجل والتراجع)
 *   openMergeLogModal()       ← عرض سجل عمليات الدمج
 *   undoLastMerge()           ← التراجع عن آخر دمج
 *   _autoSilentUpload()       ← رفع صامت تلقائي بعد كل تغيير
 *   _refreshMergeHistoryButtons() ← تحديث أزرار التراجع
 */

'use strict';

// ── ثوابت مفاتيح localStorage ──
const MERGE_HISTORY_KEY = 'ft_merge_history';
const MAX_MERGE_HISTORY = 10;

// ══════════════════════════════════════════════════════════
//  إدارة سجل الدمج
// ══════════════════════════════════════════════════════════

function _getMergeHistory() {
  try {
    let raw = localStorage.getItem(MERGE_HISTORY_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) { return []; }
}

function _saveMergeHistory(history) {
  try {
    localStorage.setItem(MERGE_HISTORY_KEY, JSON.stringify(history.slice(0, MAX_MERGE_HISTORY)));
  } catch (e) {}
}

function _pushMergeSnapshot(label, addedCount) {
  let history = _getMergeHistory();
  history.unshift({
    label: label || 'عملية دمج',
    addedCount: addedCount || 0,
    snapshot: JSON.stringify({ people, nextId, relPairs }),
    time: new Date().toISOString()
  });
  _saveMergeHistory(history);
  _refreshMergeHistoryButtons();
}

function _refreshMergeHistoryButtons() {
  let history = _getMergeHistory();
  let undoBtn = document.getElementById('undoMergeBtn');
  if (undoBtn) {
    undoBtn.disabled = !history.length;
    undoBtn.title = history.length ? `التراجع عن: ${history[0].label}` : 'لا توجد عمليات دمج سابقة';
  }
}

// ══════════════════════════════════════════════════════════
//  التراجع عن آخر دمج
// ══════════════════════════════════════════════════════════

function undoLastMerge() {
  let history = _getMergeHistory();
  if (!history.length) {
    alert('لا توجد عمليات دمج يمكن التراجع عنها');
    return;
  }
  let last = history[0];
  let dt = new Date(last.time).toLocaleString('ar');
  if (!confirm(`التراجع عن:\n${last.label}\nأُضيف ${last.addedCount} فرد\n🕒 ${dt}\n\nهذا سيستعيد بيانات ما قبل الدمج. هل تريد المتابعة؟`)) return;

  try {
    let snap = JSON.parse(last.snapshot);
    people = snap.people;
    nextId = snap.nextId || 1;
    relPairs = snap.relPairs || [];
    expanded = {};
    people.forEach(p => { expanded[p.id] = false; });
    if (people.length) expanded[people[0].id] = true;
    _invalidateAll();
    // حذف هذه العملية من السجل
    history.shift();
    _saveMergeHistory(history);
    _refreshMergeHistoryButtons();
    saveData(); renderAll(); updateMyPersonBtn();
    alert(`✔ تم التراجع عن الدمج\n👥 الشجرة الآن: ${people.length} فرد`);
  } catch (e) {
    alert('خطأ في التراجع: ' + e.message);
  }
}

// ══════════════════════════════════════════════════════════
//  سجل الدمج — نافذة عرض
// ══════════════════════════════════════════════════════════

function openMergeLogModal() {
  let history = _getMergeHistory();

  if (!history.length) {
    document.getElementById('modalContainer').innerHTML = `<div class="modal-overlay" onclick="if(event.target===this)closeModal()">
      <div class="modal" style="max-width:420px">
        <h3>📋 سجل عمليات الدمج</h3>
        <div style="text-align:center;padding:20px;color:var(--text2)">لا توجد عمليات دمج مسجّلة</div>
        <div class="modal-footer"><button class="btn" onclick="closeModal()">إغلاق</button></div>
      </div></div>`;
    _androidBackGuardModalOpen();
    return;
  }

  let rows = history.map((h, i) => {
    let dt = new Date(h.time).toLocaleString('ar');
    return `<div style="padding:10px 12px;border:1px solid var(--card-border);border-radius:8px;margin-bottom:8px;background:var(--card-bg)">
      <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">
        <span style="font-weight:600;font-size:13px">${h.label}</span>
        <span style="font-size:11px;color:var(--text2)">➕ ${h.addedCount} فرد</span>
        <span style="font-size:11px;color:var(--text2)">🕒 ${dt}</span>
      </div>
      ${i === 0 ? `<div style="margin-top:6px"><button class="btn" onclick="undoLastMerge()" style="font-size:11px;padding:4px 10px;color:var(--clr-amber-text);border-color:var(--clr-amber-text)">↩ تراجع عن هذا الدمج</button></div>` : ''}
    </div>`;
  }).join('');

  document.getElementById('modalContainer').innerHTML = `<div class="modal-overlay" onclick="if(event.target===this)closeModal()">
  <div class="modal" style="max-width:460px">
    <h3>📋 سجل عمليات الدمج</h3>
    <p style="font-size:12px;color:var(--text2);margin-bottom:12px">آخر ${history.length} عملية دمج — يمكن التراجع عن آخر عملية فقط</p>
    ${rows}
    <div style="padding:8px 12px;background:var(--clr-amber-bg);border:1px solid #f59e0b;border-radius:8px;font-size:12px;color:var(--clr-amber-text);margin-bottom:8px">
      ⚠️ التراجع يستعيد البيانات كما كانت قبل الدمج مباشرةً — التغييرات اللاحقة ستُفقد
    </div>
    <div class="modal-footer">
      <button class="btn" onclick="closeModal()">إغلاق</button>
      ${history.length ? `<button class="btn" style="color:#ef4444" onclick="if(confirm('حذف كل سجل الدمج؟')){_saveMergeHistory([]);closeModal();}">🗑 مسح السجل</button>` : ''}
    </div>
  </div></div>`;
  _androidBackGuardModalOpen();
}

// ══════════════════════════════════════════════════════════
//  رفع صامت تلقائي بعد كل تغيير
// ══════════════════════════════════════════════════════════

let _autoUploadTimer = null;
let _autoUploading = false;

function _autoSilentUpload() {
  // رفع سحابي صامت إذا كانت السحابة مُعدَّة
  if (_isCloudConfigured && _isCloudConfigured()) {
    clearTimeout(_autoUploadTimer);
    _autoUploadTimer = setTimeout(async () => {
      if (_autoUploading) return;
      _autoUploading = true;
      try {
        // تجاوز _cloudSyncing للرفع الصامت
        let plain = JSON.stringify({
          people: people.map(p => { let c = Object.assign({}, p); delete c.photo; return c; }),
          nextId, relPairs,
          myPersonId: myPersonId || null,
          uploadedAt: new Date().toISOString()
        });
        let encrypted = await cloudEncrypt(plain);
        let filesObj = { [CLOUD_CONFIG.GIST_FILE]: { content: 'ENC:' + encrypted } };
        if (CLOUD_CONFIG.GIST_ID) {
          await _gistUpdate(CLOUD_CONFIG.GIST_ID, filesObj);
          _invalidateGistCache();
        }
      } catch (e) {
        console.debug('[AutoUpload]', e.message);
      } finally {
        _autoUploading = false;
      }
    }, 15000); // 15 ثانية تأخير
  }

  // رفع نسخة العائلة الصامت
  if (typeof triggerFamilyUpload === 'function') {
    triggerFamilyUpload();
  }
}

// ══════════════════════════════════════════════════════════
//  دمج متطوّر: مقارنة تفصيلية بين بيانات العائلة
// ══════════════════════════════════════════════════════════

function _familyPeopleStats(arr) {
  let st = { males: 0, females: 0, deceased: 0, photos: 0, marriages: 0 };
  (arr || []).forEach(p => {
    let g = (p.gender || '').toLowerCase();
    if (g === 'male' || g === 'm') st.males++;
    else if (g === 'female' || g === 'f') st.females++;
    if (p.deceased) st.deceased++;
    if (p.photo) st.photos++;
    if (Array.isArray(p.spouses) && p.spouses.length) st.marriages++;
  });
  return st;
}

// قارن شخصين من شجرتين مختلفتين: أعِد قائمة الحقول المختلفة
const _MERGE_IGNORED_KEYS = new Set([
  'photo', 'uploadedAt', 'updatedAt', 'createdAt', 'timestamp', 'ts',
  'lastModified', 'modifiedAt', 'syncAt', 'syncedAt', '__meta', '_meta',
  'version', 'deviceId', 'device', 'source', 'sourceDevice'
]);

function _comparePeople(localP, remoteP) {
  let diffs = [];
  let allKeys = new Set([...Object.keys(localP), ...Object.keys(remoteP)]);
  for (let k of allKeys) {
    if (_MERGE_IGNORED_KEYS.has(k) || k.startsWith('_')) continue;
    let lv = localP[k], rv = remoteP[k];
    if (JSON.stringify(lv) !== JSON.stringify(rv)) {
      diffs.push({ field: k, local: lv, remote: rv });
    }
  }
  return diffs;
}

// دمج ذكي: تحديث الحقول المختلفة في الشخص المحلي من النسخة البعيدة
function _smartMergePerson(localP, remoteP) {
  let diffs = _comparePeople(localP, remoteP);
  diffs.forEach(d => {
    // الأولوية للبيانات البعيدة في الحقول النصية والتواريخ
    let pref = ['name', 'familyName', 'title', 'dob', 'dod', 'dobType', 'dodType',
      'dobGregorian', 'dodGregorian', 'dobHijri', 'dodHijri', 'notes',
      'deceased', 'gender', 'motherName', 'fatherName'];
    if (pref.includes(d.field)) {
      // استخدم القيمة الأحدث (البعيدة) إذا كانت غير فارغة
      if (d.remote !== null && d.remote !== undefined && d.remote !== '') {
        localP[d.field] = d.remote;
      }
    }
    // الأزواج: دمج بدون تكرار
    if (d.field === 'spouses' && Array.isArray(d.remote)) {
      let merged = [...(localP.spouses || [])];
      d.remote.forEach(rs => {
        let exists = merged.some(ls =>
          normalizeAr(ls.name || '') === normalizeAr(rs.name || '') ||
          (ls.personId && ls.personId === rs.personId)
        );
        if (!exists) merged.push(rs);
      });
      localP.spouses = merged;
    }
  });
  return diffs.length > 0;
}

// دمج تحديثات بيانات شخص واحد من جهاز آخر مع المحلي
function mergePersonUpdate(localId, remoteP) {
  let localP = getPerson(localId);
  if (!localP) return false;
  return _smartMergePerson(localP, remoteP);
}

// ══════════════════════════════════════════════════════════
//  عملية دمج شاملة مع حفظ snapshot للتراجع
// ══════════════════════════════════════════════════════════

function doMergeWithHistory(incomingData, label) {
  // حفظ snapshot قبل الدمج
  let snapBefore = JSON.stringify({ people, nextId, relPairs });

  let incoming = JSON.parse(JSON.stringify(incomingData.people || []));
  let incomingRel = JSON.parse(JSON.stringify(incomingData.relPairs || []));

  function isSamePerson(ip, ep) {
    if (normalizeAr(ip.name) !== normalizeAr(ep.name)) return false;
    if (ip.gender && ep.gender && ip.gender !== ep.gender) return false;
    let ipParent = incoming.find(x => x.id === ip.parentId);
    let epParent = getPerson(ep.parentId);
    if (ipParent && epParent) return normalizeAr(ipParent.name) === normalizeAr(epParent.name);
    if (!ip.parentId && !ep.parentId) return true;
    if (!!ip.parentId !== !!ep.parentId) return false;
    return true;
  }

  let idMap = new Map();
  let trulyNew = [];
  let updated = 0;

  incoming.forEach(p => {
    let dup = people.find(ep => isSamePerson(p, ep));
    if (dup) {
      idMap.set(p.id, dup.id);
      // تحديث ذكي للشخص الموجود
      if (_smartMergePerson(dup, p)) updated++;
    } else {
      let newId = nextId++;
      idMap.set(p.id, newId);
      trulyNew.push(p);
    }
  });

  trulyNew.forEach(p => {
    p.id = idMap.get(p.id);
    if (p.parentId != null) p.parentId = idMap.has(p.parentId) ? idMap.get(p.parentId) : p.parentId;
    if (p.motherId != null) p.motherId = idMap.has(p.motherId) ? idMap.get(p.motherId) : p.motherId;
    if (p.spouses) p.spouses.forEach(s => {
      if (s.relativeId && idMap.has(s.relativeId)) s.relativeId = idMap.get(s.relativeId);
    });
  });

  let newRelPairs = incomingRel.map(pair => pair.map(id => idMap.has(id) ? idMap.get(id) : id));
  newRelPairs.forEach(pair => {
    if (!relPairs.some(rp => (rp[0] === pair[0] && rp[1] === pair[1]) || (rp[0] === pair[1] && rp[1] === pair[0]))) {
      relPairs.push(pair);
    }
  });

  people = people.concat(trulyNew);
  trulyNew.forEach(p => { expanded[p.id] = false; });
  _invalidateAll();

  // حفظ snapshot في السجل
  let history = _getMergeHistory();
  history.unshift({
    label: label || 'دمج تحديثات العائلة',
    addedCount: trulyNew.length,
    updatedCount: updated,
    snapshot: snapBefore,
    time: new Date().toISOString()
  });
  _saveMergeHistory(history);
  _refreshMergeHistoryButtons();

  saveData(); renderAll(); updateMyPersonBtn();

  let msg = `✔ تم الدمج!\n➕ أضيف ${trulyNew.length} فرد جديد`;
  if (updated > 0) msg += `\n✏ تم تحديث ${updated} فرد`;
  msg += `\n👥 إجمالي: ${people.length} فرد`;
  setTimeout(() => alert(msg), 200);

  return { added: trulyNew.length, updated };
}
