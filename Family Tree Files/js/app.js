/**
 * js/app.js
 * ═══════════════════════════════════════════════════════════════
 * نقطة دخول التطبيق — App Entry Point
 * ═══════════════════════════════════════════════════════════════
 *
 * Dependencies: جميع الملفات الأخرى (يجب تحميله أخيراً)
 *
 * المسؤوليات:
 *   - تهيئة التطبيق عند تحميل الصفحة
 *   - ربط الأحداث الرئيسية
 *   - دوال renderAll() العامة
 *   - إدارة النوافذ المنبثقة (modals)
 *   - إدارة اختصارات لوحة المفاتيح
 */

'use strict';

// ══════════════════════════════════════════════════════════
//  دوال المساعدة العامة
// ══════════════════════════════════════════════════════════

function escapeHtml(str) {
  return String(str == null ? '' : str)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function highlightQueryHTML(text, q) {
  let safe = escapeHtml(text);
  let term = (q || '').trim();
  if (!term) return safe;
  let words = term.split(/\s+/).filter(Boolean).sort((a, b) => b.length - a.length);
  if (!words.length) return safe;
  let normSafe = normalizeAr(safe);
  let out = safe;
  let used = 0;
  for (let w of words) {
    let idx = normSafe.indexOf(normalizeAr(w));
    if (idx >= 0) {
      let before = escapeHtml(text).slice(0, idx);
      let match = escapeHtml(text).slice(idx, idx + w.length);
      let after = escapeHtml(text).slice(idx + w.length);
      out = before + '<span class="search-highlight">' + match + '</span>' + after;
      used++;
      break;
    }
  }
  if (!used) {
    for (let w of words) {
      let idx = safe.toLowerCase().indexOf(escapeHtml(w).toLowerCase());
      if (idx >= 0) {
        out = safe.slice(0, idx) + '<span class="search-highlight">' + safe.slice(idx, idx + w.length) + '</span>' + safe.slice(idx + w.length);
        break;
      }
    }
  }
  return out;
}

// ══════════════════════════════════════════════════════════
//  إدارة النوافذ المنبثقة
// ══════════════════════════════════════════════════════════

function closeModal() {
  let mc = document.getElementById('modalContainer');
  if (mc) mc.innerHTML = '';
  _androidBackGuardModalClose();
}

// Android back button guard
function _androidBackGuardModalOpen() {
  if (!history || !history.pushState) return;
  history.pushState({ modalOpen: true }, '');
}
function _androidBackGuardModalClose() {}

window.addEventListener('popstate', function (e) {
  let mc = document.getElementById('modalContainer');
  if (mc && mc.innerHTML) closeModal();
});

// ══════════════════════════════════════════════════════════
//  دوال renderAll وإدارة العرض
// ══════════════════════════════════════════════════════════

function renderAll() {
  renderStats();
  renderTree();
  let listPanel = document.getElementById('listPanel');
  if (listPanel && listPanel.classList.contains('active')) renderList();
  if (typeof _renderSearchPanel === 'function') _renderSearchPanel();
}

function focusPersonCard(id) {
  setTimeout(() => {
    let el = document.querySelector(`[data-person-id="${id}"]`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      let hdr = el.querySelector('.node-header');
      if (hdr) {
        hdr.style.transition = 'background .12s ease, box-shadow .12s ease';
        hdr.style.background = 'var(--clr-amber-bg)';
        hdr.style.boxShadow = '0 0 0 3px rgba(245,158,11,.18)';
        setTimeout(() => {
          hdr.style.transition = '';
          hdr.style.background = '';
          hdr.style.boxShadow = '';
        }, 900);
      }
    }
  }, 360);
}

// ══════════════════════════════════════════════════════════
//  إحصائيات الشجرة
// ══════════════════════════════════════════════════════════

let _statsVisible = false;
let _infoVisible = false;

function toggleStats() {
  _statsVisible = !_statsVisible;
  let statsBar = document.getElementById('statsBar');
  let btn = document.getElementById('statsToggleBtn');
  if (_statsVisible) {
    renderStats();
    statsBar.style.display = 'grid';
    btn.style.background = '#3b82f6'; btn.style.color = 'white';
    setTimeout(() => document.addEventListener('click', _closeStatsOnOutside, { capture: true }), 0);
  } else {
    statsBar.style.display = 'none';
    btn.style.background = 'var(--card-bg)'; btn.style.color = 'var(--text)';
    document.removeEventListener('click', _closeStatsOnOutside, { capture: true });
  }
}

function _closeStatsOnOutside(e) {
  let statsBar = document.getElementById('statsBar');
  let btn = document.getElementById('statsToggleBtn');
  if (statsBar && btn && !statsBar.contains(e.target) && !btn.contains(e.target)) {
    _statsVisible = true; toggleStats();
    document.removeEventListener('click', _closeStatsOnOutside, { capture: true });
  }
}

function toggleInfo() {
  _infoVisible = !_infoVisible;
  let infoBar = document.getElementById('infoBar');
  let btn = document.getElementById('infoToggleBtn');
  if (_infoVisible) {
    renderInfo();
    infoBar.style.display = 'block';
    btn.style.background = '#3b82f6'; btn.style.color = 'white';
    btn.setAttribute('aria-expanded', 'true');
    setTimeout(() => document.addEventListener('click', _closeInfoOnOutside, { capture: true }), 0);
  } else {
    infoBar.style.display = 'none';
    btn.style.background = 'var(--card-bg)'; btn.style.color = 'var(--text)';
    btn.setAttribute('aria-expanded', 'false');
    document.removeEventListener('click', _closeInfoOnOutside, { capture: true });
  }
}

function _closeInfoOnOutside(e) {
  let infoBar = document.getElementById('infoBar');
  let btn = document.getElementById('infoToggleBtn');
  if (infoBar && btn && !infoBar.contains(e.target) && !btn.contains(e.target)) {
    _infoVisible = true; toggleInfo();
    document.removeEventListener('click', _closeInfoOnOutside, { capture: true });
  }
}

function renderInfo() {
  let crescentSvg = crescent('#2e7d32');
  let infoBar = document.getElementById('infoBar');
  infoBar.innerHTML = `
    <div style="background:var(--card-bg);border:1px solid var(--card-border);border-radius:8px;padding:12px 16px;">
      <div style="font-size:12px;font-weight:600;color:var(--text2);margin-bottom:8px;">دليل الرموز والمؤشرات</div>
      <div style="display:flex;flex-wrap:wrap;gap:8px 20px;">
        <div style="display:flex;align-items:center;gap:7px;font-size:12px;"><div style="width:22px;height:16px;border-radius:4px;background:#3b82f6;"></div><span>ذكر</span></div>
        <div style="display:flex;align-items:center;gap:7px;font-size:12px;"><div style="width:22px;height:16px;border-radius:4px;background:var(--clr-pink-border);"></div><span>أنثى</span></div>
        <div style="display:flex;align-items:center;gap:7px;font-size:12px;"><span>${crescentSvg}</span><span>متوفى</span></div>
        <div style="display:flex;align-items:center;gap:7px;font-size:12px;"><span style="font-size:9px;padding:1px 5px;border-radius:3px;background:var(--clr-divorce-bg);color:var(--clr-divorce-text);border:1px solid #f97316;">م</span><span>مطلق/ة</span></div>
        <div style="display:flex;align-items:center;gap:7px;font-size:12px;"><span>🔗</span><span>متزوج/ة من شخص في الشجرة</span></div>
      </div>
    </div>`;
}

function renderStats() {
  let total = people.length;
  let males = people.filter(p => p.gender === 'male').length;
  let females = people.filter(p => p.gender === 'female').length;
  let deceased = people.filter(p => p.deceased).length;
  let alive = total - deceased;
  function depth(id, cache = {}) {
    if (cache[id] !== undefined) return cache[id];
    let ch = getChildren(id);
    if (!ch.length) { cache[id] = 1; return 1; }
    let d = 1 + Math.max(...ch.map(c => depth(c.id, cache)));
    cache[id] = d; return d;
  }
  let gens = 0;
  getRoots().forEach(r => { let d = depth(r.id); if (d > gens) gens = d; });
  let stats = [
    { label: 'إجمالي الأفراد', val: total, color: '#3b82f6' },
    { label: 'عدد الأجيال', val: gens, color: '#8b5cf6' },
    { label: 'ذكور', val: males, color: '#0ea5e9' },
    { label: 'إناث', val: females, color: 'var(--clr-pink-border)' },
    { label: 'الأحياء', val: alive, color: '#22c55e' },
    { label: 'المتوفين', val: deceased, color: '#6b7280' },
  ];
  document.getElementById('statsBar').innerHTML = stats.map(s => `
    <div style="background:var(--card-bg);border:1px solid var(--card-border);border-radius:8px;padding:10px 12px;display:flex;align-items:center;gap:10px;">
      <div style="width:4px;height:36px;border-radius:4px;background:${s.color};flex-shrink:0;"></div>
      <div>
        <div style="font-size:20px;font-weight:600;color:${s.color};line-height:1.1;">${s.val}</div>
        <div style="font-size:11px;color:var(--text2);margin-top:2px;">${s.label}</div>
      </div>
    </div>`).join('');
}

// ══════════════════════════════════════════════════════════
//  التبديل بين التبويبات
// ══════════════════════════════════════════════════════════

function switchTab(tab, el) {
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  el.classList.add('active');
  document.getElementById('treePanel').classList.toggle('active', tab === 'tree');
  document.getElementById('listPanel').classList.toggle('active', tab === 'list');
  document.getElementById('kinPanel').classList.toggle('active', tab === 'kin');
  document.getElementById('guidePanel').classList.toggle('active', tab === 'guide');
  if (tab === 'guide') renderGuide();
  else if (tab === 'kin') renderKinPanel();
  else if (tab === 'list') renderList();
  else if (tab === 'tree') { renderStats(); renderTree(); }
  else renderAll();
}

// ══════════════════════════════════════════════════════════
//  اختصارات لوحة المفاتيح
// ══════════════════════════════════════════════════════════

function _isTypingField(el) {
  if (!el) return false;
  const tag = (el.tagName || '').toUpperCase();
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || el.isContentEditable;
}

function openShortcutHelpModal() {
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
        </div>
        <div class="modal-footer" style="margin-top:12px">
          <button class="btn" onclick="closeModal()">إغلاق</button>
        </div>
      </div>
    </div>`;
  document.getElementById('modalContainer').innerHTML = html;
}

document.addEventListener('keydown', function (e) {
  const modalOpen = !!document.getElementById('modalContainer').innerHTML;
  const typing = _isTypingField(e.target);
  const noMods = !e.ctrlKey && !e.metaKey && !e.altKey;

  if ((e.ctrlKey || e.metaKey) && e.code === 'KeyK') { e.preventDefault(); openSearchPanel(); return; }
  if (!typing && noMods && e.code === 'Slash' && !e.shiftKey) { e.preventDefault(); openSearchPanel(); return; }
  if (!typing && noMods && ((e.code === 'Slash' && e.shiftKey) || e.key === '?' || e.key === '؟')) { e.preventDefault(); openShortcutHelpModal(); return; }
  if (!typing && e.code === 'Home') { e.preventDefault(); window.scrollTo({ top: 0, behavior: 'smooth' }); return; }
  if (e.key === 'Escape' && modalOpen) { closeModal(); return; }
  if (e.key === 'Escape' && _statsVisible) { toggleStats(); return; }
  if (e.key === 'Escape' && _infoVisible) { toggleInfo(); return; }
  if (e.key === 'Escape' && _lastSearchQ && !modalOpen) {
    let sheet = document.getElementById('mss-sheet');
    if (sheet && sheet.classList.contains('open')) return;
    clearSearch(true);
  }
});

// ══════════════════════════════════════════════════════════
//  نافذة اختيار "أنا في الشجرة"
// ══════════════════════════════════════════════════════════

function openMyPersonPicker() {
  let opts = people.map(p => {
    let par = getParent(p);
    return `<div onclick="setMyPerson(${p.id})" style="cursor:pointer;padding:8px 12px;border-bottom:0.5px solid var(--card-border);display:flex;align-items:center;gap:8px;" onmouseover="this.style.background='var(--bg-secondary)'" onmouseout="this.style.background=''">
      <div class="gender-dot ${p.gender === 'male' ? 'male-dot' : 'female-dot'}" style="flex-shrink:0"></div>
      <div>
        <div style="font-size:13px;font-weight:500">${p.name}${p.familyName ? ' <span style="font-size:11px;color:var(--text2)">' + p.familyName + '</span>' : ''}</div>
        ${par ? `<div style="font-size:11px;color:var(--text2)">بن/ت ${par.name}</div>` : ''}
      </div>
      ${myPersonId === p.id ? '<span style="margin-right:auto;font-size:11px;background:var(--clr-amber-bg);color:var(--clr-amber-text);padding:2px 7px;border-radius:8px;border:1px solid #fbbf24">أنا ✓</span>' : ''}
    </div>`;
  }).join('');
  let html = `<div class="modal-overlay" onclick="if(event.target===this)closeModal()">
    <div class="modal" style="max-width:420px;padding:0">
      <div style="padding:16px 20px;border-bottom:1px solid var(--card-border)"><h3 style="margin:0">👤 من أنت في الشجرة؟</h3></div>
      <div style="max-height:60vh;overflow-y:auto">${opts || '<div style="padding:20px;text-align:center;color:var(--text2)">لا يوجد أفراد</div>'}</div>
      <div class="modal-footer" style="padding:12px 16px;border-top:1px solid var(--card-border)">
        ${myPersonId ? `<button class="btn" onclick="setMyPerson(null)">🚫 إلغاء التحديد</button>` : ''}
        <button class="btn" onclick="closeModal()">إغلاق</button>
      </div>
    </div>
  </div>`;
  document.getElementById('modalContainer').innerHTML = html;
  _androidBackGuardModalOpen();
}

function setMyPerson(id) {
  myPersonId = id ? parseInt(id) : null;
  saveMyPerson();
  _invalidateKinCache();
  closeModal();
  updateMyPersonBtn();
  renderAll();
}

// ══════════════════════════════════════════════════════════
//  دوال مساعدة للشجرة
// ══════════════════════════════════════════════════════════

function toggleAll(open) {
  if (open && document.body.classList.contains('mobile-mode')) {
    let roots = getRoots();
    people.forEach(p => expanded[p.id] = false);
    roots.forEach(r => expanded[r.id] = true);
  } else {
    people.forEach(p => expanded[p.id] = open);
  }
  renderAll();
}

function toggleNode(id) { expanded[id] = !expanded[id]; renderTree(); }
function selectNode(e, id) {
  if (e.target.closest('.node-actions') || e.target.closest('.toggle-btn') || e.target.closest('.node-name')) return;
  expanded[id] = !expanded[id]; renderTree();
}

// ══════════════════════════════════════════════════════════
//  عرض صورة مكبّرة
// ══════════════════════════════════════════════════════════

function zoomPhoto(src, name) {
  let html = `<div class="modal-overlay" onclick="closeModal()" style="background:rgba(0,0,0,.85);cursor:pointer">
    <div style="max-width:min(480px,96vw);text-align:center">
      <img src="${src}" style="width:100%;border-radius:12px;box-shadow:0 8px 32px rgba(0,0,0,.5)">
      <div style="color:#fff;font-size:13px;margin-top:10px;opacity:.8">${escapeHtml(name)}</div>
      <div style="color:#fff;font-size:11px;opacity:.5;margin-top:4px">اضغط في أي مكان للإغلاق</div>
    </div>
  </div>`;
  document.getElementById('modalContainer').innerHTML = html;
}

// ══════════════════════════════════════════════════════════
//  تهيئة التطبيق
// ══════════════════════════════════════════════════════════

function showSaveToast() {
  let el = document.getElementById('saveToast');
  if (!el) return;
  el.style.opacity = '1';
  setTimeout(() => { el.style.opacity = '0'; }, 2000);
}

function init() {
  // 1. تحميل البيانات المحفوظة أو إنشاء بيانات تجريبية
  if (typeof loadData === 'function') {
    loadData();
  } else {
    initData();
  }

  // 2. تهيئة وضع الجوال
  if (typeof initMobileMode === 'function') initMobileMode();

  // 3. تحميل "أنا في الشجرة"
  loadMyPerson();
  updateMyPersonBtn();

  // 4. تهيئة سجل الدمج
  if (typeof _loadMergeHistory === 'function') _loadMergeHistory();

  // 5. الرسم الأولي
  renderAll();

  // 6. إظهار FSA bar إذا لزم
  if (typeof _checkFsaBar === 'function') _checkFsaBar();

  // 7. إنشاء لوحة البحث المتنقل (MSS)
  if (typeof _createMssSheet === 'function') _createMssSheet();

  // 8. تهيئة بحث الصوت
  if (typeof initVoiceSearch === 'function') initVoiceSearch();

  // 9. تحقق من تحديثات العائلة (إن كانت نسخة عائلة)
  if (typeof IS_FAMILY_COPY !== 'undefined' && IS_FAMILY_COPY) {
    setTimeout(() => {
      if (typeof _autoSilentUpload === 'function') _autoSilentUpload();
    }, 2000);
  }

  // 10. Cloud sync init
  if (typeof initCloudSync === 'function') setTimeout(initCloudSync, 500);
}

// تشغيل التطبيق عند اكتمال تحميل الصفحة
document.addEventListener('DOMContentLoaded', init);
