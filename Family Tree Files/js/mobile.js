/**
 * js/mobile.js
 * ═══════════════════════════════════════════════════════════════
 * وضع الجوال — Mobile Mode System + Action Sheet
 * ═══════════════════════════════════════════════════════════════
 *
 * Dependencies: core.js
 *
 * المسؤوليات:
 *   - تفعيل/تعطيل وضع الجوال
 *   - Action Sheet للإجراءات السريعة
 *   - كشف الجهاز تلقائياً
 */

'use strict';

let _mobileMode = false;
let _mobSheetPersonId = null;

function _isMobileDevice() {
  return /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) || window.innerWidth < 640;
}

function initMobileMode() {
  try {
    let saved = localStorage.getItem(MOB_KEY);
    if (saved === '1') _mobileMode = true;
    else if (saved === null && _isMobileDevice()) _mobileMode = true; // تفعيل تلقائي
  } catch (e) {}
  _applyMobileMode();
}

function toggleMobileMode() {
  _mobileMode = !_mobileMode;
  try { localStorage.setItem(MOB_KEY, _mobileMode ? '1' : '0'); } catch (e) {}
  _applyMobileMode();
  renderAll();
}

function _applyMobileMode() {
  document.body.classList.toggle('mobile-mode', _mobileMode);
  let btn = document.getElementById('mobileModeBtn');
  if (!btn) return;
  if (_mobileMode) {
    btn.classList.add('active');
    btn.innerHTML = '🖥️';
    btn.title = 'العودة إلى وضع الديسكتوب';
  } else {
    btn.classList.remove('active');
    btn.innerHTML = '📱';
    btn.title = 'وضع الجوال: شجرة أخف وأسرع';
  }
}

function toggleNodeMobile(id) {
  expanded[id] = !expanded[id];
  renderAll();
}

// ══════════════════════════════════════════════════════════
//  Action Sheet للجوال
// ══════════════════════════════════════════════════════════

function openMobSheet(id) {
  _mobSheetPersonId = id;
  let p = getPerson(id); if (!p) return;
  let sheet = document.getElementById('mob-action-sheet');
  let overlay = document.getElementById('mob-action-sheet-overlay');
  let nameEl = document.getElementById('mob-sheet-name');
  let btnsEl = document.getElementById('mob-sheet-btns');
  if (!sheet || !overlay) return;
  nameEl.textContent = p.name + (p.familyName ? ' ' + p.familyName : '');
  let hasChildren = getChildrenForNode(id).length > 0;
  let isExtFemale = (p.isExternal === true && p.gender === 'female');
  let btns = [
    { icon: '📋', label: 'البيانات', action: `closeMobSheet();showPersonDetail(${id})` },
    { icon: '✏️', label: 'تعديل', action: `closeMobSheet();openEditModal(${id})` },
    ...(isExtFemale ? [] : [{ icon: '➕', label: 'إضافة ابن', action: `closeMobSheet();openAddModal(${id})` }]),
    { icon: '🌳', label: 'انتقال', action: `closeMobSheet();navigateToPerson(${id})` },
  ];
  if (p.parentId) btns.splice(isExtFemale ? 2 : 3, 0, { icon: '👥', label: 'إضافة أخ/أخت', action: `closeMobSheet();openAddModal(${p.parentId})` });
  if (p.isExternal === true && !p.parentId) btns.splice(isExtFemale ? 2 : 3, 0, { icon: '👨‍👩‍👦', label: 'إضافة والد/والدة', action: `closeMobSheet();openAddParentModal(${id})` });
  if (hasChildren) btns.push({ icon: '⇅', label: 'الترتيب', action: `closeMobSheet();openReorderModal(${id})` });
  btns.push({ icon: '🗑', label: 'حذف', action: `closeMobSheet();confirmDeleteFromList(${id})`, cls: 'danger' });
  btnsEl.innerHTML = btns.map(b => `
    <div class="sheet-btn${b.cls ? ' ' + b.cls : ''}" onclick="${b.action}">
      <span class="sh-icon">${b.icon}</span>
      <span class="sh-label">${b.label}</span>
    </div>`).join('');
  overlay.classList.add('open');
  sheet.classList.add('open');
  _mobSheetSwipe(sheet);
}

function closeMobSheet() {
  let sheet = document.getElementById('mob-action-sheet');
  let overlay = document.getElementById('mob-action-sheet-overlay');
  if (sheet) sheet.classList.remove('open');
  if (overlay) overlay.classList.remove('open');
  document.querySelectorAll('.node-header.actions-open').forEach(el => el.classList.remove('actions-open'));
}

function _mobSheetSwipe(el) {
  let startY = 0, dragging = false;
  el.onpointerdown = e => { startY = e.clientY; dragging = true; el.style.transition = 'none'; };
  el.onpointermove = e => {
    if (!dragging) return;
    let dy = Math.max(0, e.clientY - startY);
    el.style.transform = `translateY(${dy}px)`;
  };
  el.onpointerup = e => {
    el.style.transition = ''; el.style.transform = ''; dragging = false;
    if (e.clientY - startY > 80) closeMobSheet();
  };
}

// ══════════════════════════════════════════════════════════
//  نظام الثيم (Light / Dark)
// ══════════════════════════════════════════════════════════
(function () {
  const THEME_KEY = 'ft_theme_v1';
  const ICON_SUN = '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>';
  const ICON_MOON = '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>';
  let _current = 'light';

  function applyTheme(theme) {
    _current = theme;
    let html = document.documentElement;
    html.setAttribute('data-theme', theme);
    html.style.colorScheme = theme;
    let metaTheme = document.querySelector('meta[name="theme-color"]');
    if (metaTheme) metaTheme.setAttribute('content', theme === 'dark' ? '#1f2937' : '#3b82f6');
    try { localStorage.setItem(THEME_KEY, theme); } catch (e) {}
    updateBtn();
  }

  function updateBtn() {
    let btn = document.getElementById('themeToggleBtn');
    let iconEl = document.getElementById('themeToggleIcon');
    if (!btn || !iconEl) return;
    let isDark = _current === 'dark';
    iconEl.innerHTML = isDark ? ICON_SUN : ICON_MOON;
    btn.title = isDark ? 'التبديل إلى الوضع الفاتح' : 'التبديل إلى الوضع الداكن';
    btn.style.background = isDark ? '#374151' : '';
    btn.style.borderColor = isDark ? '#4b5563' : '';
    let svgEl = iconEl.querySelector('svg');
    if (svgEl) svgEl.style.color = isDark ? '#fbbf24' : '#374151';
  }

  window.toggleTheme = function () { applyTheme(_current === 'dark' ? 'light' : 'dark'); };
  window.cycleTheme = window.toggleTheme;

  let saved = null;
  try { saved = localStorage.getItem(THEME_KEY); } catch (e) {}
  if (saved === 'light' || saved === 'dark') {
    applyTheme(saved);
  } else {
    let prefersDark = false;
    try { prefersDark = window.matchMedia('(prefers-color-scheme:dark)').matches; } catch (e) {}
    applyTheme(prefersDark ? 'dark' : 'light');
  }

  document.addEventListener('DOMContentLoaded', updateBtn);
  window.addEventListener('load', updateBtn);
  setTimeout(updateBtn, 200);
})();

// ══════════════════════════════════════════════════════════
//  لوحة البحث المتنقلة (MSS - Mobile Search Sheet)
// ══════════════════════════════════════════════════════════

let _mssActiveGroup = 'all';
let _mssGroupResults = [];
let _mssCurrentResults = [];
let _mssOriginalResults = [];
let _mssSortMode = 'smart'; // 'smart' | 'alpha' | 'tree'

/**
 * إنشاء عناصر DOM للوحة البحث المتنقلة
 * يُستدعى مرة واحدة عند تهيئة التطبيق
 */
function _createMssSheet() {
  if (document.getElementById('mss-sheet')) return;

  // الخلفية المظلمة
  let overlay = document.createElement('div');
  overlay.id = 'mss-overlay';
  overlay.onclick = closeMobSearchSheet;
  document.body.appendChild(overlay);

  // اللوحة الرئيسية
  let sheet = document.createElement('div');
  sheet.id = 'mss-sheet';
  sheet.innerHTML = `
    <div class="mss-handle"></div>
    <div class="mss-header">
      <div class="mss-search-wrap">
        <span class="mss-search-icon">🔍</span>
        <input id="mss-input" type="text" placeholder="ابحث عن أي شخص..." autocomplete="off"
          oninput="mssOnInput(this.value)"
          onkeydown="mssInputKey(event)">
        <button id="mss-input-clear" onclick="mssClearInput()" style="display:none">✕</button>
      </div>
      <button class="mss-close-btn" onclick="closeMobSearchSheet()">إغلاق</button>
    </div>
    <div class="mss-sort-bar">
      <button class="mss-sort-btn active" data-sort="smart" onclick="mssSortBy('smart')">🎯 ذكي</button>
      <button class="mss-sort-btn" data-sort="alpha" onclick="mssSortBy('alpha')">أ-ي</button>
      <button class="mss-sort-btn" data-sort="tree" onclick="mssSortBy('tree')">🌳 الشجرة</button>
      <span id="mss-count-badge" style="margin-right:auto;font-size:11px;color:var(--text2)"></span>
    </div>
    <div id="mss-groups" style="display:none;padding:0 12px 8px;display:flex;gap:6px;flex-wrap:nowrap;overflow-x:auto;"></div>
    <div id="mss-body" class="mss-body"></div>
    <div id="mss-footer" style="display:none;padding:10px 14px;border-top:1px solid var(--card-border);background:var(--card-bg);">
      <button id="mss-start-btn" class="btn primary" style="width:100%;padding:12px;" onclick="mssStartNav()">
        🔍 تصفح النتائج
      </button>
    </div>`;

  // CSS مضمّن للوحة
  let style = document.createElement('style');
  style.textContent = `
    #mss-overlay { position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:800;opacity:0;pointer-events:none;transition:opacity .3s; }
    #mss-overlay.open { opacity:1;pointer-events:auto; }
    #mss-sheet { position:fixed;bottom:0;left:0;right:0;max-height:90vh;background:var(--card-bg);border-radius:20px 20px 0 0;z-index:801;transform:translateY(100%);transition:transform .3s cubic-bezier(.32,.72,0,1);display:flex;flex-direction:column;overflow:hidden; }
    #mss-sheet.open { transform:translateY(0); }
    .mss-handle { width:40px;height:4px;border-radius:2px;background:var(--card-border);margin:12px auto 0;flex-shrink:0; }
    .mss-header { display:flex;align-items:center;gap:8px;padding:12px 14px;border-bottom:1px solid var(--card-border);flex-shrink:0; }
    .mss-search-wrap { flex:1;position:relative;display:flex;align-items:center;background:var(--bg-secondary);border:1px solid var(--card-border);border-radius:10px;overflow:hidden; }
    .mss-search-icon { padding:0 8px;font-size:16px;flex-shrink:0; }
    #mss-input { flex:1;padding:10px 8px;background:transparent;border:none;outline:none;color:var(--text);font-size:15px; }
    #mss-input-clear { padding:8px;background:none;border:none;color:var(--text2);cursor:pointer;font-size:14px; }
    .mss-close-btn { padding:8px 12px;border:1px solid var(--card-border);border-radius:8px;background:transparent;color:var(--text);font-size:13px;cursor:pointer;flex-shrink:0; }
    .mss-sort-bar { display:flex;align-items:center;gap:6px;padding:8px 14px;flex-shrink:0;overflow-x:auto; }
    .mss-sort-btn { padding:4px 10px;border:1px solid var(--card-border);border-radius:999px;background:var(--card-bg);color:var(--text2);font-size:11px;cursor:pointer;white-space:nowrap; }
    .mss-sort-btn.active { background:#3b82f6;color:#fff;border-color:#3b82f6; }
    .mss-group-tab { padding:4px 10px;border:1px solid var(--card-border);border-radius:999px;background:var(--card-bg);color:var(--text2);font-size:11px;cursor:pointer;white-space:nowrap;flex-shrink:0; }
    .mss-group-tab.active { background:#7c3aed;color:#fff;border-color:#7c3aed; }
    .mss-body { flex:1;overflow-y:auto;min-height:0; }
    .mss-item { display:flex;align-items:center;gap:10px;padding:12px 14px;border-bottom:0.5px solid var(--card-border);cursor:pointer;transition:background .1s; }
    .mss-item:hover, .mss-item.active { background:var(--bg-secondary); }
    .mss-item-name { font-size:14px;font-weight:500;color:var(--text); }
    .mss-item-sub { font-size:11px;color:var(--text2);margin-top:2px; }
  `;
  document.head.appendChild(style);
  document.body.appendChild(sheet);
}

function mssOnInput(val) {
  let clearBtn = document.getElementById('mss-input-clear');
  if (clearBtn) clearBtn.style.display = val ? 'block' : 'none';
  let sheet = document.getElementById('mss-sheet');
  if (!sheet) return;
  let q = val.trim();
  let results = q
    ? people.filter(p => matchesFullName(p, q)).sort((a, b) => scoreMatch(b, q) - scoreMatch(a, q))
    : people.slice();
  _mssOriginalResults = results.slice();
  _mssCurrentResults = results.slice();
  _mssRenderItems(results, q);
  let badge = document.getElementById('mss-count-badge');
  if (badge) badge.textContent = results.length + ' نتيجة';
  let footer = document.getElementById('mss-footer');
  if (footer) footer.style.display = results.length ? 'block' : 'none';
  let startBtn = document.getElementById('mss-start-btn');
  if (startBtn) {
    startBtn.textContent = `🔍 تصفح ${results.length} نتيجة  ‹ ›`;
    startBtn._items = results;
  }
}

function mssClearInput() {
  let inp = document.getElementById('mss-input');
  if (inp) { inp.value = ''; inp.focus(); }
  let clearBtn = document.getElementById('mss-input-clear');
  if (clearBtn) clearBtn.style.display = 'none';
  mssOnInput('');
}

function mssSortBy(mode) {
  _mssSortMode = mode;
  document.querySelectorAll('.mss-sort-btn').forEach(btn =>
    btn.classList.toggle('active', btn.dataset.sort === mode));
  _mssApplySort();
}

function _mssApplySort() {
  let items = _mssCurrentResults.slice();
  let q = (document.getElementById('mss-input') || {}).value || '';
  if (_mssSortMode === 'alpha') {
    items.sort((a, b) => (a.name || '').localeCompare(b.name || '', 'ar'));
  } else if (_mssSortMode === 'tree') {
    let treeOrder = getTreeOrderedList();
    let orderMap = new Map(treeOrder.map((p, i) => [p.id, i]));
    items.sort((a, b) => (orderMap.get(a.id) ?? 9999) - (orderMap.get(b.id) ?? 9999));
  } else {
    if (q.trim()) items.sort((a, b) => scoreMatch(b, q) - scoreMatch(a, q));
  }
  _mssCurrentResults = items;
  let startBtn = document.getElementById('mss-start-btn');
  if (startBtn) startBtn._items = items;
  _mssRenderItems(items, q);
}

function _mssRenderItems(items, q) {
  let body = document.getElementById('mss-body');
  if (!body) return;
  let html = items.map(p => {
    let par = getParent(p);
    let lineage = par ? par.name : '';
    let gDot = `<div style="width:11px;height:11px;border-radius:50%;background:${p.gender === 'male' ? '#3b82f6' : 'var(--clr-pink-border)'};flex-shrink:0"></div>`;
    let decIcon = p.deceased ? `<span style="display:inline-flex;vertical-align:middle">${crescent('#2e7d32')}</span>` : '';
    return `<div class="mss-item${(_searchActiveId === p.id) ? ' active' : ''}" onclick="mssSelectPerson(${p.id})" data-mss-id="${p.id}">
      ${gDot}
      <div style="flex:1;min-width:0">
        <div class="mss-item-name">${p.title ? `<span>${escapeHtml(p.title)} </span>` : ''}${highlightQueryHTML(p.name, q)}${p.familyName ? ` <span style="font-size:11px;color:var(--text2)">${p.familyName}</span>` : ''}${decIcon}</div>
        ${lineage ? `<div class="mss-item-sub">${lineage}</div>` : ''}
      </div>
    </div>`;
  }).join('');
  body.innerHTML = html || `<div style="padding:28px;text-align:center;color:var(--text2)">لا توجد نتائج</div>`;
}

function mssSelectPerson(id) {
  let startBtn = document.getElementById('mss-start-btn');
  let groupItems = (startBtn && startBtn._items) || _mssCurrentResults || [];
  _searchResultIds = groupItems.map(p => typeof p === 'number' ? p : p.id);
  _searchActiveId = id;
  if (!_lastSearchQ && _persistedSearchQ) _lastSearchQ = _persistedSearchQ;
  closeMobSearchSheet();
  searchNavigateTo(id);
}

function mssStartNav() {
  let startBtn = document.getElementById('mss-start-btn');
  let items = (startBtn && startBtn._items) || _mssCurrentResults || [];
  _searchResultIds = items.map(p => typeof p === 'number' ? p : p.id);
  if (!_lastSearchQ && _persistedSearchQ) _lastSearchQ = _persistedSearchQ;
  closeMobSearchSheet();
  if (_searchResultIds.length > 0) searchNavigateTo(_searchResultIds[0]);
}

function openMobSearchSheet(results, q) {
  let sheet = document.getElementById('mss-sheet');
  let overlay = document.getElementById('mss-overlay');
  if (!sheet || !overlay) { _createMssSheet(); sheet = document.getElementById('mss-sheet'); overlay = document.getElementById('mss-overlay'); }
  if (!sheet) return;
  _mssOriginalResults = results.slice();
  _mssCurrentResults = results.slice();
  _mssRenderItems(results, q);
  let badge = document.getElementById('mss-count-badge');
  if (badge) badge.textContent = results.length + ' نتيجة';
  let footer = document.getElementById('mss-footer');
  if (footer) footer.style.display = results.length ? 'block' : 'none';
  let startBtn = document.getElementById('mss-start-btn');
  if (startBtn) { startBtn.textContent = `🔍 تصفح ${results.length} نتيجة  ‹ ›`; startBtn._items = results; }
  overlay.classList.add('open');
  requestAnimationFrame(() => {
    sheet.classList.add('open');
    let inp = document.getElementById('mss-input');
    if (inp) { inp.value = q || ''; }
    let xcb = document.getElementById('mss-input-clear');
    if (xcb) xcb.style.display = (q && q.trim()) ? 'block' : 'none';
  });
}

function closeMobSearchSheet() {
  let sheet = document.getElementById('mss-sheet');
  let overlay = document.getElementById('mss-overlay');
  if (sheet) sheet.classList.remove('open');
  if (overlay) overlay.classList.remove('open');
  let inp = document.getElementById('mss-input');
  if (inp) inp.blur();
}

function mssInputKey(e) {
  if (e.key === 'Escape') { e.stopPropagation(); closeMobSearchSheet(); }
  if (e.key === 'Enter') { mssStartNav(); }
}

function mssSelectGroup(groupName) {
  _mssActiveGroup = groupName;
  document.querySelectorAll('.mss-group-tab').forEach(t => t.classList.toggle('active', t.dataset.group === groupName));
  _mssApplySort();
}
