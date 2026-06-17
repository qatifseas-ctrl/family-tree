/**
 * js/search.js
 * ═══════════════════════════════════════════════════════════════
 * محرك البحث وشريط التنقل في النتائج
 * Search Engine + Navigation Bar
 * ═══════════════════════════════════════════════════════════════
 *
 * Dependencies: core.js
 *
 * Reusable: ✅ يمكن استخدامه مع أي نموذج بيانات يوفر:
 *   - people[]
 *   - matchesFullName(person, query)
 *   - scoreMatch(person, query)
 */

'use strict';

// ── state البحث ──
let _savedExpanded = null;
let _searchDebounceTimer = null;
let _lastSearchQ = '';
let _persistedSearchQ = '';  // يُحفظ بعد ESC/X — يملأ حقل البحث عند إعادة فتحه
let _searchActiveId = null;
let _searchCurrentTerm = '';

// ── متغيرات التنقل في نتائج البحث ──
let _searchResultIds = [];  // قائمة IDs مرتّبة بالتسلسل الشجري
let _searchNavIdx = 0;       // الموضع الحالي

// ══════════════════════════════════════════════════════════
//  إنشاء شريط التنقل في نتائج البحث
// ══════════════════════════════════════════════════════════
(function () {
  let bar = document.createElement('div');
  bar.id = 'search-nav-bar';
  bar.style.cssText = 'display:none;position:fixed;bottom:20px;left:50%;transform:translateX(-50%);z-index:460;background:#1e40af;color:#fff;border-radius:28px;padding:0;box-shadow:0 6px 24px rgba(30,64,175,.55);align-items:center;white-space:nowrap;overflow:hidden;min-width:260px;max-width:calc(100vw - 32px);';
  bar.innerHTML =
    '<div style="display:flex;align-items:stretch;">' +
    '<button id="snb-prev" onclick="searchNavPrev()" style="background:rgba(255,255,255,.15);border:none;color:#fff;font-size:22px;cursor:pointer;padding:13px 18px;line-height:1;flex-shrink:0;" title="السابق">‹</button>' +
    '<div id="snb-info" onclick="searchNavCurrent()" title="اضغط لعرض نتائج البحث" style="flex:1;min-width:0;position:relative;padding:10px 4px;cursor:pointer;user-select:none;">' +
      '<div id="snb-name" style="font-size:13px;font-weight:700;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;text-align:center;padding:0 4px;"></div>' +
      '<div id="snb-count" style="font-size:11px;opacity:.8;margin-top:3px;display:flex;align-items:center;justify-content:center;gap:4px;"></div>' +
    '</div>' +
    '<button id="snb-next" onclick="searchNavNext()" style="background:rgba(255,255,255,.15);border:none;color:#fff;font-size:22px;cursor:pointer;padding:13px 18px;line-height:1;flex-shrink:0;" title="التالي">›</button>' +
    '<button id="snb-clear" onclick="clearSearch()" style="background:rgba(255,255,255,.08);border:none;border-right:1px solid rgba(255,255,255,.2);color:#fff;font-size:17px;cursor:pointer;padding:13px 15px;line-height:1;flex-shrink:0;" title="إلغاء البحث">✕</button>' +
    '</div>';
  document.body.appendChild(bar);
})();

// ══════════════════════════════════════════════════════════
//  دوال شريط التنقل
// ══════════════════════════════════════════════════════════

function _hideSearchNavBar() {
  let bar = document.getElementById('search-nav-bar');
  if (bar) bar.style.display = 'none';
  document.body.classList.remove('search-active');
}

function _sortResultsByTreeOrder(ids) {
  let order = [];
  let set = new Set(ids);
  function walk(id) {
    if (set.has(id)) order.push(id);
    getChildren(id).forEach(c => walk(c.id));
  }
  getRoots(true).forEach(r => walk(r.id));
  ids.forEach(id => { if (!order.includes(id)) order.push(id); });
  return order;
}

function _updateSearchNavBar() {
  let bar = document.getElementById('search-nav-bar');
  if (!bar) return;
  if (!_lastSearchQ || !_searchResultIds.length || !_savedExpanded) {
    _hideSearchNavBar(); return;
  }
  let p = getPerson(_searchResultIds[_searchNavIdx]);
  let name = p ? p.name : '—';
  let par = p ? getParent(p) : null;
  let sub = par ? `بن/ت ${par.name}` : '';
  let snbNameEl = document.getElementById('snb-name');
  if (snbNameEl) snbNameEl.textContent = name;
  document.getElementById('snb-count').innerHTML =
    `<span style="background:rgba(255,255,255,.18);border-radius:8px;padding:1px 7px;">${_searchNavIdx + 1} من ${_searchResultIds.length}</span>` +
    (sub ? `<span style="opacity:.75"> · ${sub}</span>` : '') +
    `<span style="font-size:10px;opacity:.65;margin-right:4px">📋</span>`;
  document.getElementById('snb-prev').style.opacity = _searchNavIdx === 0 ? '0.35' : '1';
  document.getElementById('snb-next').style.opacity = _searchNavIdx === _searchResultIds.length - 1 ? '0.35' : '1';
  bar.style.display = 'flex';
  document.body.classList.add('search-active');
}

function _jumpToResult(idx) {
  if (!_searchResultIds.length) return;
  idx = Math.max(0, Math.min(idx, _searchResultIds.length - 1));
  searchNavigateTo(_searchResultIds[idx]);
}

function searchNavNext() { if (_searchNavIdx < _searchResultIds.length - 1) _jumpToResult(_searchNavIdx + 1); }
function searchNavPrev() { if (_searchNavIdx > 0) _jumpToResult(_searchNavIdx - 1); }

function searchNavCurrent() {
  let q = _lastSearchQ;
  if (!q || !_searchResultIds.length) return;
  let results = people.filter(p => matchesFullName(p, q)).sort((a, b) => scoreMatch(b, q) - scoreMatch(a, q));
  openMobSearchSheet(results, q);
  requestAnimationFrame(() => {
    let activeId = _searchResultIds[_searchNavIdx];
    let el = document.querySelector(`[data-mss-id="${activeId}"]`);
    if (el) { el.classList.add('active'); el.scrollIntoView({ block: 'center' }); }
  });
}

// ══════════════════════════════════════════════════════════
//  لوحة البحث الرئيسية (desktop)
// ══════════════════════════════════════════════════════════

function _renderSearchPanel() {
  let q = _lastSearchQ;
  let panel = document.getElementById('searchResultsPanel');
  if (!panel) return;
  if (!q) { panel.style.display = 'none'; return; }
  let strippedQ = stripTitlesFromQuery(q);
  let nq = normalizeAr(strippedQ || q);
  let results = people.filter(p => matchesFullName(p, q)).sort((a, b) => scoreMatch(b, q) - scoreMatch(a, q));
  if (!results.length) { panel.style.display = 'none'; return; }
  let MAX = 12;
  let shown = results.slice(0, MAX);
  let extra = results.length - MAX;
  let itemsHtml = shown.map(p => {
    let fline = getFullFatherLine(p);
    let kin = myPersonId && myPersonId !== p.id ? getMyKinship(p.id) : null;
    let kinHtml = kin ? `<span class="srp-kin">${kin.label}</span>` : (myPersonId === p.id ? `<span class="srp-kin" style="background:var(--clr-amber-bg);color:var(--clr-amber-text);">أنا</span>` : '');
    let gIcon = p.gender === 'male' ? `<div class="gender-dot male-dot" style="width:8px;height:8px;flex-shrink:0"></div>` : `<div class="gender-dot female-dot" style="width:8px;height:8px;flex-shrink:0"></div>`;
    let active = _searchActiveId === p.id ? ' srp-active' : '';
    let dispName = highlightQueryHTML(p.name, nq);
    return `<div class="srp-item${active}" onclick="searchNavigateTo(${p.id})" data-srp-id="${p.id}">
      ${gIcon}
      <div style="flex:1;min-width:0">
        <div class="srp-name">${p.title ? `<span>${escapeHtml(p.title)} </span>` : ''}${dispName}${p.familyName ? ` <span style="font-size:10px;color:var(--text2)">${escapeHtml(p.familyName)}</span>` : ''}</div>
        ${fline ? `<div class="srp-meta">${fline.split(' بن ').slice(0, 3).join(' بن ')}</div>` : ''}
      </div>
      ${kinHtml}
    </div>`;
  }).join('');
  let moreHtml = extra > 0 ? `<div class="srp-more">+${extra} نتيجة أخرى</div>` : '';
  panel.style.display = 'block';
  panel.innerHTML = `<div class="srp-header">
    <span>🔍 ${results.length} نتيجة</span>
    <button onclick="clearSearch(true)">✕ مسح</button>
  </div>
  <div class="srp-list">${itemsHtml}</div>${moreHtml}`;
}

// ══════════════════════════════════════════════════════════
//  فتح لوحة البحث
// ══════════════════════════════════════════════════════════

function openSearchPanel() {
  let q = _persistedSearchQ || _lastSearchQ || '';
  let results = q
    ? people.filter(p => matchesFullName(p, q)).sort((a, b) => scoreMatch(b, q) - scoreMatch(a, q))
    : people.slice();
  openMobSearchSheet(results, q);
  // تحديث حقل الإدخال الخفي أيضاً
  let sb = document.getElementById('searchBox');
  if (sb) sb.value = q;
  _lastSearchQ = q;
  if (q) {
    let slbl = document.getElementById('searchBtnLabel');
    if (slbl) slbl.textContent = q;
    let xcb = document.getElementById('searchClearBtnTop');
    if (xcb) xcb.style.display = '';
  }
}

// ══════════════════════════════════════════════════════════
//  البحث الرئيسي
// ══════════════════════════════════════════════════════════

function _doSearch() {
  let q = (document.getElementById('searchBox').value || '').trim();
  _lastSearchQ = q;
  if (q) _persistedSearchQ = q;
  _searchCurrentTerm = q;
  _srpFocusIdx = -1;
  if (typeof _saveSearchHistory === 'function') _saveSearchHistory(q);

  let slbl = document.getElementById('searchBtnLabel');
  if (slbl) slbl.textContent = q || 'ابحث عن أي شخص...';
  let xcb = document.getElementById('searchClearBtnTop');
  if (xcb) xcb.style.display = q ? '' : 'none';

  if (!q) {
    document.getElementById('searchResultsPanel').style.display = 'none';
    closeMobSearchSheet();
    _searchResultIds = [];
    _searchNavIdx = 0;
    _searchActiveId = null;
    _savedExpanded = null;
    _hideSearchNavBar();
    renderStats(); renderTree();
    return;
  }

  let results = people.filter(p => matchesFullName(p, q)).sort((a, b) => scoreMatch(b, q) - scoreMatch(a, q));
  _searchResultIds = _sortResultsByTreeOrder(results.map(p => p.id));
  document.getElementById('searchResultsPanel').style.display = 'none';
  openMobSearchSheet(results, q);
}

function triggerSearch() {
  clearTimeout(_searchDebounceTimer);
  let btn = document.getElementById('searchClearBtn');
  let val = document.getElementById('searchBox').value;
  if (btn) { btn.style.opacity = val ? '1' : '0'; btn.style.pointerEvents = val ? 'auto' : 'none'; }
  _searchDebounceTimer = setTimeout(_doSearch, 280);
}

function clearSearch(preserveScroll) {
  let lastId = _searchActiveId;
  document.getElementById('searchBox').value = '';
  let btn = document.getElementById('searchClearBtn');
  if (btn) { btn.style.opacity = '0'; btn.style.pointerEvents = 'none'; }
  document.getElementById('searchResultsPanel').style.display = 'none';
  closeMobSearchSheet();
  _hideSearchNavBar();
  _lastSearchQ = '';
  _searchCurrentTerm = '';
  let clbl = document.getElementById('searchBtnLabel');
  if (clbl) clbl.textContent = 'ابحث عن أي شخص...';
  let xcb2 = document.getElementById('searchClearBtnTop');
  if (xcb2) xcb2.style.display = 'none';
  _searchResultIds = [];
  _searchNavIdx = 0;
  _searchActiveId = null;
  _savedExpanded = null;

  if (lastId) {
    let lp = getPerson(lastId);
    if (lp) {
      let root = lp;
      while (root.parentId && getPerson(root.parentId)) root = getPerson(root.parentId);
      let mainIds = new Set(getRoots(false).map(r => r.id));
      if (!mainIds.has(root.id)) {
        if (!currentFamilyFilter || currentFamilyFilter.rootId !== root.id) {
          navigateToSpouseFamily(lastId);
        } else { renderAll(); focusPersonCard(lastId); }
        return;
      }
    }
  }
  renderAll();
  if (lastId) focusPersonCard(lastId);
}

// ══════════════════════════════════════════════════════════
//  التنقل في نتائج البحث
// ══════════════════════════════════════════════════════════

function searchNavigateTo(id) {
  document.getElementById('searchResultsPanel').style.display = 'none';

  if (!_savedExpanded) _savedExpanded = JSON.parse(JSON.stringify(expanded));

  let idx = _searchResultIds.indexOf(id);
  if (idx >= 0) _searchNavIdx = idx;
  else { _searchResultIds = [id]; _searchNavIdx = 0; }
  _searchActiveId = id;

  // ضبط currentFamilyFilter حسب شجرة الشخص المستهدف
  let targetP = getPerson(id);
  if (targetP) {
    let tRoot = targetP;
    while (tRoot.parentId && getPerson(tRoot.parentId)) tRoot = getPerson(tRoot.parentId);
    let mainIds = new Set(getRoots(false).map(r => r.id));
    let isMainTree = mainIds.has(tRoot.id);
    let alreadyCorrect = currentFamilyFilter && currentFamilyFilter.rootId === tRoot.id;
    if (!alreadyCorrect) {
      if (isMainTree) { navStack = []; currentFamilyFilter = null; }
      else {
        let fromLabel = currentFamilyFilter ? currentFamilyFilter.label :
          (getRoots(false).length > 0 ? 'عائلة ' + getRoots(false)[0].name : 'الشجرة الرئيسية');
        navStack.push({ label: fromLabel, filter: currentFamilyFilter ? JSON.parse(JSON.stringify(currentFamilyFilter)) : null, scrollY: window.scrollY });
        currentFamilyFilter = {
          rootId: tRoot.id,
          label: 'عائلة ' + (tRoot.name) + (tRoot.familyName ? ' ' + tRoot.familyName : ''),
          viaPersonId: id, fromLabel
        };
      }
    }
  }

  people.forEach(p => expanded[p.id] = false);
  (function eu(pid) { let p = getPerson(pid); if (!p) return; if (p.parentId) { expanded[p.parentId] = true; eu(p.parentId); } })(id);
  expanded[id] = false;

  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.tab')[0].classList.add('active');
  document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
  document.getElementById('treePanel').classList.add('active');

  renderTree();
  _updateSearchNavBar();
  setTimeout(() => {
    let el = document.querySelector(`[data-person-id="${id}"]`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      let hdr = el.querySelector('.node-header');
      if (hdr) {
        hdr.style.background = 'var(--clr-amber-bg)';
        hdr.style.boxShadow = '0 0 0 3px rgba(245,158,11,.25)';
        setTimeout(() => { hdr.style.background = ''; hdr.style.boxShadow = ''; }, 900);
      }
    }
  }, 360);
}

// ══════════════════════════════════════════════════════════
//  التنقل بلوحة المفاتيح
// ══════════════════════════════════════════════════════════

let _srpFocusIdx = -1;

function searchKeyNav(e) {
  let items = document.querySelectorAll('.srp-item');
  if (!items.length) return;
  if (e.key === 'ArrowDown') { e.preventDefault(); _srpFocusIdx = Math.min(_srpFocusIdx + 1, items.length - 1); _srpHighlight(items); }
  else if (e.key === 'ArrowUp') { e.preventDefault(); _srpFocusIdx = Math.max(_srpFocusIdx - 1, 0); _srpHighlight(items); }
  else if (e.key === 'Enter') {
    e.preventDefault();
    if (_srpFocusIdx >= 0 && items[_srpFocusIdx]) items[_srpFocusIdx].click();
    else if (items[0]) items[0].click();
  }
  else if (e.key === 'Escape') { clearSearch(true); }
}

function _srpHighlight(items) {
  items.forEach((el, i) => {
    el.style.background = i === _srpFocusIdx ? 'var(--bg-secondary)' : '';
    if (i === _srpFocusIdx) el.scrollIntoView({ block: 'nearest' });
  });
}

// ══════════════════════════════════════════════════════════
//  البحث الصوتي
// ══════════════════════════════════════════════════════════

let _voiceRecognition = null;

function startVoiceSearch() {
  if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
    alert('البحث الصوتي غير مدعوم في هذا المتصفح.');
    return;
  }
  let SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  let r = new SR();
  r.lang = 'ar-SA';
  r.interimResults = false;
  r.maxAlternatives = 1;
  r.onresult = function (e) {
    let text = e.results[0][0].transcript;
    let sb = document.getElementById('searchBox');
    if (sb) { sb.value = text; triggerSearch(); }
    let lbl = document.getElementById('searchBtnLabel');
    if (lbl) lbl.textContent = text;
  };
  r.onerror = function (e) { console.warn('[Voice] error:', e.error); };
  r.start();
  _voiceRecognition = r;
}

function startFieldVoice(inputId, callback, btnId) {
  if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
    alert('البحث الصوتي غير مدعوم.'); return;
  }
  let btn = document.getElementById(btnId);
  let SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  let r = new SR();
  r.lang = 'ar-SA'; r.interimResults = false; r.maxAlternatives = 1;
  if (btn) btn.classList.add('voice-active');
  r.onresult = function (e) {
    let text = e.results[0][0].transcript;
    let inp = document.getElementById(inputId);
    if (inp) inp.value = text;
    if (callback) callback(text);
    if (btn) btn.classList.remove('voice-active');
  };
  r.onerror = function () { if (btn) btn.classList.remove('voice-active'); };
  r.onend = function () { if (btn) btn.classList.remove('voice-active'); };
  r.start();
}

function initVoiceSearch() {
  // إعداد أولي للبحث الصوتي (لا يحتاج إجراءات خاصة حالياً)
}
