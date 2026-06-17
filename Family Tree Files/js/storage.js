/**
 * js/storage.js
 * ═══════════════════════════════════════════════════════════════
 * التخزين المحلي + File System Access API
 * Local Storage + FSA (File System Access API)
 * ═══════════════════════════════════════════════════════════════
 *
 * Dependencies: core.js, config.js
 *
 * المسؤوليات:
 *   - حفظ/تحميل بيانات الشجرة من localStorage
 *   - File System Access API للحفظ التلقائي على الجهاز
 *   - ترحيل البيانات القديمة (backward compatibility)
 *   - تاريخ البحث (Search History)
 */

'use strict';

// ══════════════════════════════════════════════════════════
//  مفاتيح localStorage
// ══════════════════════════════════════════════════════════
const DATA_KEY        = 'ft_data_v2';
const FSA_LAST_KEY    = 'ft_fsa_last_path';

// ══════════════════════════════════════════════════════════
//  حفظ وتحميل بيانات الشجرة
// ══════════════════════════════════════════════════════════

/**
 * حفظ بيانات الشجرة في localStorage
 */
function saveData() {
  try {
    let data = JSON.stringify({ people, relPairs, nextId, myPersonId: myPersonId || null });
    localStorage.setItem(DATA_KEY, data);
    // الحفظ التلقائي عبر FSA إذا كان مرتبطاً
    if (_fsaFileHandle) _fsaAutoSave();
  } catch (e) {
    console.warn('[Storage] saveData failed:', e);
  }
}

/**
 * تحميل بيانات الشجرة من localStorage
 * يُعيد true إذا نجح التحميل
 */
function loadData() {
  try {
    // ── 1. حاول تحميل البيانات المضمّنة في الـ HTML (للنسخ المُصدَّرة) ──
    let embedded = document.getElementById('__family_tree_data__');
    if (embedded) {
      let ib = atob(embedded.textContent.replace(/\s/g, ''));
      let iu8 = new Uint8Array(ib.length);
      for (let ii = 0; ii < ib.length; ii++) iu8[ii] = ib.charCodeAt(ii);
      let d = JSON.parse(new TextDecoder().decode(iu8));
      _applyLoadedData(d);
      // انسخ للـ localStorage حتى يستمر بعد إغلاق الملف
      saveData();
      return true;
    }
    // ── 2. حاول تحميل من localStorage ──
    let raw = localStorage.getItem(DATA_KEY);
    if (raw) {
      let d = JSON.parse(raw);
      _applyLoadedData(d);
      return true;
    }
  } catch (e) {
    console.warn('[Storage] loadData failed:', e);
  }
  // لا توجد بيانات — ابدأ بالبيانات التجريبية
  initData();
  return false;
}

function _applyLoadedData(d) {
  if (!d || !Array.isArray(d.people)) return;
  people = d.people || [];
  nextId = d.nextId || 1;
  relPairs = d.relPairs || [];
  if (d.myPersonId) myPersonId = parseInt(d.myPersonId);
  expanded = {};
  people.forEach(p => { expanded[p.id] = false; });
  // ترحيل البيانات القديمة
  migrateExternalSpouses();
  if (typeof normalizeAllPersonDates === 'function') normalizeAllPersonDates();
  _invalidateAll();
  if (people.length) expanded[people[0].id] = true;
}

// ══════════════════════════════════════════════════════════
//  ترحيل البيانات — Backward Compatibility
// ══════════════════════════════════════════════════════════

/**
 * ترحيل الزوجات الخارجيات من نظام النص القديم إلى نظام Person الجديد
 * يُنشئ سجلات خارجية للزوجات إن لم تكن موجودة
 */
function migrateExternalSpouses() {
  let changed = false;
  people.forEach(p => {
    if (!p.spouses) return;
    p.spouses.forEach(s => {
      // إذا كان personId أو relativeId موجود → لا حاجة للترحيل
      if (s.personId || s.relativeId) return;
      // إذا كان هناك أبناء مسجّلون بـ motherName = s.name → أنشئ سجل خارجي
      let children = people.filter(c =>
        c.parentId === p.id && c.motherName === s.name && c.motherId == null
      );
      if (!children.length) return;
      // البحث عن شخص خارجي موجود بنفس الاسم أولاً
      let existing = people.find(ep =>
        ep.isExternal && ep.name === s.name && ep.gender === (s.gender || 'female')
      );
      let extPerson = existing;
      if (!extPerson) {
        extPerson = addPerson({
          name: s.name,
          gender: s.gender || 'female',
          isExternal: true,
          familyName: s.familyName || '',
          deceased: s.deceased || false,
        });
        changed = true;
      }
      // ربط الأبناء بالأم الجديدة
      children.forEach(c => {
        c.motherId = extPerson.id;
      });
      // ربط الزوج بـ personId
      s.personId = extPerson.id;
      changed = true;
    });
  });
  if (changed) _invalidateAll();
}

// ══════════════════════════════════════════════════════════
//  File System Access API (FSA) — Chrome/Edge on Desktop
// ══════════════════════════════════════════════════════════

let _fsaFileHandle = null;
let _fsaSaveTimer = null;

/**
 * ربط ملف HTML بالتطبيق للحفظ التلقائي
 */
async function fsaPickFile() {
  if (!window.showOpenFilePicker) {
    alert('هذه الميزة متاحة فقط في Chrome/Edge على الكمبيوتر.');
    return;
  }
  try {
    let [handle] = await window.showOpenFilePicker({
      types: [{ description: 'HTML Files', accept: { 'text/html': ['.html', '.htm'] } }],
      multiple: false
    });
    _fsaFileHandle = handle;
    let bar = document.getElementById('fsaBar');
    if (bar) {
      let hint = document.getElementById('fsaHint');
      if (hint) hint.textContent = `✔ مرتبط بـ ${handle.name} — الحفظ تلقائي`;
      bar.style.background = 'linear-gradient(135deg,#1e40af,#3b82f6)';
    }
    showSaveToast();
    console.log('[FSA] File linked:', handle.name);
  } catch (e) {
    if (e.name !== 'AbortError') console.warn('[FSA] fsaPickFile error:', e);
  }
}

/**
 * الحفظ التلقائي المُؤخَّر (debounced) عبر FSA
 */
function _fsaAutoSave() {
  if (!_fsaFileHandle) return;
  clearTimeout(_fsaSaveTimer);
  _fsaSaveTimer = setTimeout(async () => {
    try {
      let writable = await _fsaFileHandle.createWritable();
      let content = _buildExportHTML();
      await writable.write(content);
      await writable.close();
      showSaveToast();
    } catch (e) {
      console.warn('[FSA] Auto-save error:', e);
      if (e.name === 'NotAllowedError') _fsaFileHandle = null;
    }
  }, 1500);
}

// دالة بناء HTML للتصدير — مُعرَّفة هنا لتُستخدم بواسطة exportData() و FSA
function _buildExportHTML() {
  let payload = JSON.stringify({ people, relPairs, nextId, myPersonId: myPersonId || null });
  let bytes = new TextEncoder().encode(payload);
  let bin = ''; bytes.forEach(b => { bin += String.fromCharCode(b); });
  let b64 = btoa(bin);
  let dataTag = '<scr' + 'ipt id="__family_tree_data__" type="application/json">' + b64 + '<\/sc' + 'ript>';
  let htmlAttrs = '';
  Array.from(document.documentElement.attributes).forEach(a => {
    htmlAttrs += ' ' + a.name + '="' + a.value.replace(/&/g, '&amp;').replace(/"/g, '&quot;') + '"';
  });
  let mainSrc = document.scripts[document.scripts.length - 1].textContent;
  let cleanAppHTML = '';
  try {
    let liveApp = document.getElementById('app');
    let cloned = liveApp.cloneNode(true);
    let sBar = cloned.querySelector('#statsBar'); if (sBar) sBar.style.display = 'none';
    let iBar = cloned.querySelector('#infoBar'); if (iBar) { iBar.style.display = 'none'; iBar.innerHTML = ''; }
    cleanAppHTML = cloned.outerHTML;
  } catch (ex) { cleanAppHTML = document.getElementById('app').outerHTML; }
  return '<!DOCTYPE html>\n' +
    '<html' + htmlAttrs + '>\n' +
    document.head.outerHTML + '\n' +
    '<body>\n' +
    cleanAppHTML + '\n' +
    '<div id="modalContainer"></div>\n' +
    dataTag + '\n' +
    '<scr' + 'ipt>\n' + mainSrc + '\n<\/sc' + 'ript>\n' +
    '</body>\n</html>';
}

// ══════════════════════════════════════════════════════════
//  تاريخ البحث (Search History)
// ══════════════════════════════════════════════════════════

const SEARCH_HISTORY_MAX = 10;

function _saveSearchHistory(q) {
  if (!q || q.length < 2) return;
  try {
    let history = JSON.parse(localStorage.getItem(SEARCH_HISTORY_KEY) || '[]');
    history = history.filter(x => x !== q);
    history.unshift(q);
    history = history.slice(0, SEARCH_HISTORY_MAX);
    localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(history));
  } catch (e) {}
}

function _getSearchHistory() {
  try { return JSON.parse(localStorage.getItem(SEARCH_HISTORY_KEY) || '[]'); } catch (e) { return []; }
}

// ══════════════════════════════════════════════════════════
//  showSaveToast helper (يُعرَّف هنا أيضاً لتوفير fallback)
// ══════════════════════════════════════════════════════════
if (typeof window.showSaveToast === 'undefined') {
  window.showSaveToast = function () {
    let el = document.getElementById('saveToast');
    if (!el) return;
    el.style.opacity = '1';
    setTimeout(() => { el.style.opacity = '0'; }, 2000);
  };
}

// ══════════════════════════════════════════════════════════
//  فحص إظهار FSA bar
// ══════════════════════════════════════════════════════════

function _checkFsaBar() {
  // عرض شريط FSA على الأجهزة التي تدعمه وليست مثبّتة كـ PWA
  let isStandalone = window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator && window.navigator.standalone);
  if (!isStandalone && window.showOpenFilePicker) {
    let bar = document.getElementById('fsaBar');
    if (bar) bar.style.display = 'flex';
    let btn2 = document.getElementById('fsaSaveBtn2');
    if (btn2) btn2.style.display = '';
  }
}
