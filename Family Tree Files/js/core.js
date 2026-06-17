/**
 * js/core.js
 * ═══════════════════════════════════════════════════════════════
 * نموذج البيانات الأساسي — CRUD الأشخاص + الفهارس المُحسَّنة
 * Core Data Model — People CRUD + Optimized Indexes
 * ═══════════════════════════════════════════════════════════════
 *
 * Dependencies: config.js, dates.js
 *
 * المتغيرات العامة المُصدَّرة:
 *   people[]       ← مصفوفة جميع الأشخاص
 *   expanded{}     ← حالة فتح/إغلاق عقد الشجرة
 *   nextId         ← عداد الـ ID التلقائي
 *   relPairs[]     ← أزواج القرابة الزوجية (زواج أقارب)
 *   myPersonId     ← ID الشخص "أنا" في الشجرة
 *   navStack[]     ← سجل التنقل بين الشجرات
 *   currentFamilyFilter  ← فلتر الشجرة الحالية
 */

'use strict';

// ══════════════════════════════════════════════════════════
//  المتغيرات العامة للبيانات
// ══════════════════════════════════════════════════════════
let people = [], expanded = {}, nextId = 1, relPairs = [];
let currentAddParentId = null, currentEditId = null;
let editingSpouses = [], editingChildren = [], editingRelatives = [];
let tempPhoto = null;

// Navigation State (Two-layer family system)
let navStack = [];           // [{label, filter, scrollY}]
let currentFamilyFilter = null; // null = show all | {rootId, label} = filter to one family

// my-person state
let myPersonId = null;

function uid() { return nextId++; }

// ── رمز الهلال (للمتوفين) ──
function crescent(c) {
  return `<svg viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg" style="width:13px;height:13px;display:inline-block"><path d="M7 1.5A5.5 5.5 0 1 0 12.5 7 5.508 5.508 0 0 1 7 1.5z" fill="${c || '#2e7d32'}"/></svg>`;
}

// ══════════════════════════════════════════════════════════
//  فهارس البيانات — تُعاد بناؤها عند أي تغيير
//  هدفها: تحويل عمليات O(n) المتكررة إلى O(1)
// ══════════════════════════════════════════════════════════
let _personMap    = new Map(); // id → person
let _childrenMap  = new Map(); // parentId → [children]
let _relNumsMap   = new Map(); // personId → [pairNumbers]
let _migratedMap  = new Map(); // motherId → count (children with motherId ≠ parentId)
let _wrongExtFemMap = new Map(); // externalFemaleId → count (children wrongly under external female)
let _ancestorMapCache = new Map(); // startId → ancestorsMap
let _myKinCache   = new Map(); // targetId → kinship result
let _treeOrderCache = null;   // مخزن مؤقت لترتيب الشجرة

function _rebuildIndexes() {
  _personMap.clear();
  _childrenMap.clear();
  _migratedMap.clear();
  _wrongExtFemMap.clear();
  people.forEach(p => {
    _personMap.set(p.id, p);
    let ch = _childrenMap.get(p.parentId);
    if (!ch) { ch = []; _childrenMap.set(p.parentId, ch); }
    ch.push(p);
    if (p.motherId && p.motherId !== p.parentId) {
      _migratedMap.set(p.motherId, (_migratedMap.get(p.motherId) || 0) + 1);
    }
    if (p.parentId) {
      let par = _personMap.get(p.parentId);
      if (par && par.isExternal && par.gender === 'female') {
        _wrongExtFemMap.set(par.id, (_wrongExtFemMap.get(par.id) || 0) + 1);
      }
    }
  });
  _rebuildRelNums();
  _ancestorMapCache.clear();
  _myKinCache.clear();
  _treeOrderCache = null;
}

function _rebuildRelNums() {
  _relNumsMap.clear();
  relPairs.forEach((pair, i) => {
    pair.forEach(id => {
      let arr = _relNumsMap.get(id);
      if (!arr) { arr = []; _relNumsMap.set(id, arr); }
      arr.push(i + 1);
    });
  });
}

function _invalidateKinCache() { _myKinCache.clear(); _ancestorMapCache.clear(); }
function _invalidateAll() { _rebuildIndexes(); }

// ══════════════════════════════════════════════════════════
//  دوال الفهرس العام
// ══════════════════════════════════════════════════════════

function getRelNums(id) { return _relNumsMap.get(id) || []; }
function getRelNum(id) { let r = getRelNums(id); return r.length ? r[0] : null; }

function addRelPairOnce(a, b) {
  if (!relPairs.some(p => (p[0] === a && p[1] === b) || (p[0] === b && p[1] === a))) {
    relPairs.push([a, b]); _rebuildRelNums();
  }
}
function addRelPair(a, b) { addRelPairOnce(a, b); }

function removeRelPairsForPerson(id) {
  relPairs = relPairs.filter(p => !p.includes(id)); _rebuildRelNums();
}
function removeRelPair(id) { removeRelPairsForPerson(id); }

function getRelativesOf(id) {
  return relPairs.filter(p => p.includes(id)).map(p => p.find(x => x !== id));
}

/**
 * يُنشئ تسمية السلالة الكاملة لشخص ما (للعرض في كاشف القرابة)
 */
function getAncestorLabel(id) {
  let p = getPerson(id); if (!p) return '؟';
  let chain = [];
  let cur = getParent(p); let cnt = 0;
  while (cur && cnt < 3) { chain.push(cur.name); cur = getParent(cur); cnt++; }
  let connector = p.gender === 'female' ? 'بنت' : 'بن';
  let result = p.name + (chain.length ? ' ' + connector + ' ' + chain.join(' بن ') : '');
  if (p.familyName) result += ' (' + p.familyName + ')';
  return result;
}

/** عرض صورة الفاتحة عند النقر على متوفى */
function showFatihaOverlay() {
  if (typeof FATIHA_IMG === 'undefined') return;
  let ov = document.createElement('div');
  ov.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.75);display:flex;align-items:center;justify-content:center;z-index:9999;cursor:pointer;';
  ov.innerHTML = `<div style="text-align:center;padding:16px;">
    <img src="${FATIHA_IMG}" style="max-width:280px;max-height:60vh;border-radius:12px;box-shadow:0 8px 32px rgba(0,0,0,.5);" onerror="this.parentElement.parentElement.remove()">
    <p style="color:#fff;font-size:12px;margin-top:8px;opacity:.7;">يُغلق تلقائياً...</p>
  </div>`;
  ov.onclick = () => ov.remove();
  document.body.appendChild(ov);
  setTimeout(() => { if (ov.parentNode) ov.remove(); }, 3000);
}

// ══════════════════════════════════════════════════════════
//  إضافة / تعديل / حذف الأشخاص
// ══════════════════════════════════════════════════════════

/**
 * إضافة شخص جديد للشجرة
 * @param {Object} d - بيانات الشخص
 * @returns {Object} الشخص المُضاف
 */
function addPerson(d) {
  let p = {
    id: uid(),
    name: d.name || '',
    title: d.title || '',
    familyName: d.familyName || '',
    gender: d.gender || 'male',
    dob: d.dob || '',
    dobType: d.dobType || '',
    dobGregorian: d.dobGregorian || '',
    dobHijri: d.dobHijri || '',
    dod: d.dod || '',
    dodType: d.dodType || '',
    dodGregorian: d.dodGregorian || '',
    dodHijri: d.dodHijri || '',
    deceased: d.deceased || false,
    parentId: d.parentId || null,
    fatherId: d.fatherId || null,       // ← يربط الابن بسجل الأب الخارجي
    fatherName: d.fatherName || '',     // ← اسم الأب المحفوظ
    motherId: d.motherId || null,
    motherName: d.motherName || '',
    externalFatherName: d.externalFatherName || '', // للتوافق مع البيانات القديمة
    sortOrder: d.sortOrder != null ? d.sortOrder : 9999,
    childrenFamilyName: d.childrenFamilyName || '',
    spouses: d.spouses || [],
    photo: d.photo || null,
    notes: d.notes || '',
    isExternal: d.isExternal || false
  };
  if (typeof normalizePersonDates === 'function') normalizePersonDates(p);
  people.push(p);
  expanded[p.id] = false;

  // تحديث الفهارس مباشرةً دون إعادة بناء كامل
  _personMap.set(p.id, p);
  let ch = _childrenMap.get(p.parentId);
  if (!ch) { ch = []; _childrenMap.set(p.parentId, ch); }
  ch.push(p);
  if (p.motherId && p.motherId !== p.parentId) {
    _migratedMap.set(p.motherId, (_migratedMap.get(p.motherId) || 0) + 1);
  }
  if (p.parentId) {
    let par = getPerson(p.parentId);
    if (par && par.isExternal && par.gender === 'female') {
      _wrongExtFemMap.set(par.id, (_wrongExtFemMap.get(par.id) || 0) + 1);
    }
  }
  _ancestorMapCache.clear();
  _myKinCache.clear();
  _treeOrderCache = null;
  return p;
}

/** الحصول على شخص بواسطة الـ ID */
function getPerson(id) { return _personMap.get(id) || null; }

/** الحصول على أبناء شخص مرتّبين */
function getChildren(id) {
  return (_childrenMap.get(id) || []).slice().sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
}

/**
 * الأبناء للعرض في الشجرة (يشمل الأبناء عبر fatherId للذكر الخارجي)
 * الأنثى الخارجية: لا تُعرض أبناؤها — يظهرون في شجرة الأب فقط
 */
function getChildrenForNode(id) {
  let p = getPerson(id);
  let direct = (_childrenMap.get(id) || []).slice().sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
  if (p && p.isExternal) {
    if (p.gender === 'female') return [];
    let extra = people.filter(c => c.fatherId === id && c.parentId !== id)
      .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
    return [...direct, ...extra];
  }
  return direct;
}

function getChildrenForDisplay(id) { return getChildren(id); }

/** الحصول على الجذور (بدون أبوين) */
function getRoots(includeExternal = false) {
  return people.filter(p => !p.parentId && (includeExternal || !p.isExternal));
}

function getParent(p) { return p.parentId ? getPerson(p.parentId) : null; }

function getAncestorChain(p) {
  let parts = []; let cur = getParent(p);
  while (cur) { parts.push(cur.name); cur = getParent(cur); }
  return parts;
}

function isChildUnderMother(p) {
  if (!p || !p.parentId) return false;
  let par = getPerson(p.parentId);
  return par && par.gender === 'female';
}

/** بناء سلسلة نسب الأب الكاملة */
function getFullFatherLine(p) {
  if (p.fatherId) {
    let father = getPerson(p.fatherId);
    if (father) {
      let chain = getAncestorChain(father);
      return father.name + (chain.length ? ' بن ' + chain.join(' بن ') : '') +
        (father.familyName ? ' (' + father.familyName + ')' : '');
    }
  }
  if (p.fatherName) return p.fatherName;
  if (isChildUnderMother(p)) {
    if (p.externalFatherName) return p.externalFatherName;
    return '';
  }
  let chain = getAncestorChain(p);
  return chain.length ? chain.join(' بن ') : '';
}

/** الحصول على اسم الأم الكامل */
function getMotherName(p) {
  if (isChildUnderMother(p)) {
    let m = getPerson(p.parentId); if (!m) return '';
    let chain = getAncestorChain(m);
    return m.name + (chain.length ? ' بنت ' + chain.join(' بن ') : '') +
      (m.familyName ? ' (' + m.familyName + ')' : '');
  }
  if (p.motherId) {
    let m = getPerson(p.motherId);
    if (m) {
      let chain = getAncestorChain(m);
      return m.name + (chain.length ? ' بنت ' + chain.join(' بن ') : '') +
        (m.familyName ? ' (' + m.familyName + ')' : '');
    }
  }
  if (p.motherName) return p.motherName;
  let par = getParent(p);
  if (par && par.spouses.length === 1) return par.spouses[0].name;
  return '';
}

function getFullLineageLabel(p) {
  if (isChildUnderMother(p)) {
    let mother = getPerson(p.parentId);
    let motherChain = mother ? getAncestorChain(mother) : [];
    let parts = [];
    if (p.externalFatherName) parts.push('أبوه: ' + p.externalFatherName);
    if (mother) {
      let m = mother.name;
      if (motherChain.length) m += ' بنت ' + motherChain.join(' بن ');
      parts.push('أمه: ' + m);
    }
    return parts.join(' — ');
  }
  let chain = getAncestorChain(p);
  return chain.length ? chain.join(' بن ') : '';
}

function getMaleChildren(id) {
  return people.filter(p => p.parentId === id && p.gender === 'male').sort((a, b) => (a.sortOrder ?? 9999) - (b.sortOrder ?? 9999));
}
function getFemaleChildren(id) {
  return people.filter(p => p.parentId === id && p.gender === 'female').sort((a, b) => (a.sortOrder ?? 9999) - (b.sortOrder ?? 9999));
}
function getSiblingsMale(p) {
  return p.parentId ? people.filter(s => s.parentId === p.parentId && s.id !== p.id && s.gender === 'male' && !s.isExternal).sort((a, b) => (a.sortOrder ?? 9999) - (b.sortOrder ?? 9999)) : [];
}
function getSiblingsFemale(p) {
  return p.parentId ? people.filter(s => s.parentId === p.parentId && s.id !== p.id && s.gender === 'female' && !s.isExternal).sort((a, b) => (a.sortOrder ?? 9999) - (b.sortOrder ?? 9999)) : [];
}
function getPaternalUncles(p) {
  if (isChildUnderMother(p)) {
    if (!p.fatherId) return [];
    let fp = getPerson(p.fatherId); if (!fp || !fp.parentId) return [];
    return people.filter(s => s.parentId === fp.parentId && s.id !== fp.id && s.gender === 'male' && !s.isExternal).sort((a, b) => (a.sortOrder ?? 9999) - (b.sortOrder ?? 9999));
  }
  let par = getParent(p); if (!par) return [];
  if (par.parentId == null) return [];
  return people.filter(s => s.parentId === par.parentId && s.id !== par.id && s.gender === 'male' && !s.isExternal).sort((a, b) => (a.sortOrder ?? 9999) - (b.sortOrder ?? 9999));
}
function getPaternalAunts(p) {
  if (isChildUnderMother(p)) {
    if (!p.fatherId) return [];
    let fp = getPerson(p.fatherId); if (!fp || !fp.parentId) return [];
    return people.filter(s => s.parentId === fp.parentId && s.id !== fp.id && s.gender === 'female' && !s.isExternal).sort((a, b) => (a.sortOrder ?? 9999) - (b.sortOrder ?? 9999));
  }
  let par = getParent(p); if (!par) return [];
  if (par.parentId == null) return [];
  return people.filter(s => s.parentId === par.parentId && s.id !== par.id && s.gender === 'female' && !s.isExternal).sort((a, b) => (a.sortOrder ?? 9999) - (b.sortOrder ?? 9999));
}

function _getMaternalParent(p) {
  if (isChildUnderMother(p)) return getPerson(p.parentId);
  if (p.motherId) return getPerson(p.motherId);
  let par = getParent(p); if (!par) return null;
  let mn = p.motherName || (par.spouses && par.spouses.length === 1 ? par.spouses[0].name : '');
  if (!mn) return null;
  let ms = par.spouses && par.spouses.find(s => s.name === mn);
  if (!ms) return null;
  if (ms.personId && getPerson(ms.personId)) return getPerson(ms.personId);
  if (ms.relativeId && getPerson(ms.relativeId)) return getPerson(ms.relativeId);
  return null;
}
function getMaternalUncles(p) {
  let mp = _getMaternalParent(p); if (!mp || !mp.parentId) return [];
  return people.filter(s => s.parentId === mp.parentId && s.id !== mp.id && s.gender === 'male' && !s.isExternal).sort((a, b) => (a.sortOrder ?? 9999) - (b.sortOrder ?? 9999));
}
function getMaternalAunts(p) {
  let mp = _getMaternalParent(p); if (!mp || !mp.parentId) return [];
  return people.filter(s => s.parentId === mp.parentId && s.id !== mp.id && s.gender === 'female' && !s.isExternal).sort((a, b) => (a.sortOrder ?? 9999) - (b.sortOrder ?? 9999));
}

// ══════════════════════════════════════════════════════════
//  التطبيع العربي والبحث
// ══════════════════════════════════════════════════════════

/**
 * توحيد النص العربي: توحيد الألف، ة→ه، ى→ي، حذف التشكيل
 */
function normalizeAr(s) {
  return (s || '').toLowerCase()
    .replace(/[أإآٱ]/g, 'ا').replace(/[ىئ]/g, 'ي').replace(/ة/g, 'ه')
    .replace(/[\u064B-\u065F\u0670]/g, '');
}

// ── قائمة الألقاب الشرفية المعيارية ──
const KNOWN_TITLES = ['السيد', 'السيدة', 'سيد', 'سيدة', 'دكتور', 'دكتورة', 'أستاذ', 'أستاذة', 'د', 'أ'];

function stripTitlesFromQuery(q) {
  let norm = normalizeAr(q || '').trim();
  for (let t of KNOWN_TITLES) {
    let nt = normalizeAr(t);
    norm = norm.replace(new RegExp('^' + nt + '\\s+'), '')
      .replace(new RegExp('\\s+' + nt + '\\s+'), ' ')
      .replace(new RegExp('\\s+' + nt + '$'), '');
  }
  return norm.trim();
}

function extractTitleFromQuery(q) {
  let norm = normalizeAr(q || '').trim();
  for (let t of KNOWN_TITLES) {
    let nt = normalizeAr(t);
    if (norm.startsWith(nt + ' ') || norm === nt) return t;
    if (norm.includes(' ' + nt + ' ') || norm.endsWith(' ' + nt)) return t;
  }
  return null;
}

function getPersonFullLabel(p) {
  let parts = [p.name];
  if (p.familyName) parts.push(p.familyName);
  if (p.childrenFamilyName) parts.push(p.childrenFamilyName);
  if (p.externalFatherName) parts.push(p.externalFatherName);
  if (p.spouses) p.spouses.forEach(s => { if (s.name) parts.push(s.name); });
  if (p.motherId) {
    let m = getPerson(p.motherId);
    if (m) {
      parts.push(m.name);
      if (m.familyName) parts.push(m.familyName);
      let mf = getParent(m);
      if (mf) { parts.push(mf.name); if (mf.familyName) parts.push(mf.familyName); }
    }
  } else if (p.motherName) { parts.push(p.motherName); }
  if (isChildUnderMother(p)) {
    let mother = getPerson(p.parentId);
    if (mother) {
      parts.push(mother.name);
      if (mother.familyName) parts.push(mother.familyName);
      getAncestorChain(mother).forEach(n => parts.push(n));
    }
  } else {
    let f = getParent(p);
    if (f) {
      parts.push(f.name);
      if (f.familyName) parts.push(f.familyName);
      let gf = getParent(f);
      if (gf) { parts.push(gf.name); if (gf.familyName) parts.push(gf.familyName); }
      let fm = f.motherId ? getPerson(f.motherId) : null;
      if (!fm && f.motherName) fm = { name: f.motherName };
      if (fm && fm.name) parts.push(fm.name);
    }
  }
  return normalizeAr(parts.join(' '));
}

function matchesFullName(p, q) {
  if (!q) return true;
  let label = getPersonFullLabel(p);
  let strippedQ = stripTitlesFromQuery(q);
  let qToUse = strippedQ || normalizeAr(q);
  return qToUse.trim().split(/\s+/).filter(Boolean).every(w => label.includes(w));
}

function scoreMatch(p, q) {
  if (!q) return 0;
  let strippedQ = stripTitlesFromQuery(q);
  let qForScore = strippedQ || normalizeAr(q);
  let words = qForScore.trim().split(/\s+/).filter(Boolean);
  if (!words.length) return 0;
  let fp = getParent(p);
  let gfp = fp ? getParent(fp) : null;
  let ggfp = gfp ? getParent(gfp) : null;
  let mp = p.motherId ? getPerson(p.motherId) : null;
  let mfp = mp ? getParent(mp) : null;
  let chain = [
    { field: 'name', val: normalizeAr(p.name) },
    { field: 'father', val: fp ? normalizeAr(fp.name) : '' },
    { field: 'gf', val: gfp ? normalizeAr(gfp.name) : '' },
    { field: 'ggf', val: ggfp ? normalizeAr(ggfp.name) : '' },
    { field: 'mother', val: mp ? normalizeAr(mp.name) : normalizeAr(p.motherName || '') },
    { field: 'mf', val: mfp ? normalizeAr(mfp.name) : '' },
    { field: 'fam', val: normalizeAr(p.familyName || '') },
  ];
  let score = 0;
  let queryTitle = extractTitleFromQuery(q);
  if (queryTitle && p.title) {
    let qTitleNorm = normalizeAr(queryTitle);
    let pTitleNorm = normalizeAr(p.title);
    if (pTitleNorm === qTitleNorm) score += 800;
    else if (pTitleNorm.startsWith(qTitleNorm) || qTitleNorm.startsWith(pTitleNorm)) score += 400;
  } else if (!queryTitle && !strippedQ && q) { if (p.title) score += 200; }

  let bestChainScore = 0;
  for (let startIdx = 0; startIdx < chain.length; startIdx++) {
    let chainScore = 0; let allMatched = true;
    for (let wi = 0; wi < words.length; wi++) {
      let ci = startIdx + wi;
      if (ci >= chain.length) { allMatched = false; break; }
      let w = words[wi], v = chain[ci].val;
      if (!v) { allMatched = false; break; }
      if (v === w) chainScore += 500 - (wi * 10);
      else if (v.startsWith(w)) chainScore += 350 - (wi * 10);
      else if (v.includes(w)) chainScore += 200 - (wi * 10);
      else { allMatched = false; break; }
    }
    if (allMatched && chainScore > bestChainScore) {
      bestChainScore = chainScore;
      if (startIdx === 0) bestChainScore += words.length * 50;
    }
  }
  score += bestChainScore;
  if (bestChainScore === 0) {
    let name = chain[0].val, father = chain[1].val, gfather = chain[2].val,
      mother = chain[4].val, fam = chain[6].val;
    words.forEach(w => {
      if (name === w) score += 300;
      else if (name.startsWith(w)) score += 200;
      else if (name.includes(w)) score += 100;
      else if (father.includes(w)) score += 50;
      else if (gfather.includes(w) || fam.includes(w) || mother.includes(w)) score += 25;
      else score += 1;
    });
  }
  return score;
}

// ══════════════════════════════════════════════════════════
//  ترتيب الشجرة
// ══════════════════════════════════════════════════════════

function getTreeOrderedList() {
  if (_treeOrderCache) return _treeOrderCache;
  let order = [];
  let visited = new Set();
  let roots = people.filter(p => !p.parentId).sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
  let queue = [...roots];
  while (queue.length) {
    let p = queue.shift();
    if (visited.has(p.id)) continue;
    visited.add(p.id);
    order.push(p);
    let ch = getChildrenForNode(p.id);
    if (ch && ch.length) queue.unshift(...ch);
  }
  people.forEach(p => { if (!visited.has(p.id)) order.push(p); });
  _treeOrderCache = order;
  return order;
}

// ══════════════════════════════════════════════════════════
//  my-person & kinship badge
// ══════════════════════════════════════════════════════════

const MY_PERSON_KEY = 'ft_my_person_v1';

function saveMyPerson() {
  try { localStorage.setItem(MY_PERSON_KEY, myPersonId != null ? String(myPersonId) : ''); } catch (e) {}
}

function loadMyPerson() {
  try {
    let v = localStorage.getItem(MY_PERSON_KEY);
    if (v) myPersonId = parseInt(v);
  } catch (e) {}
}

function getMyKinship(targetId) {
  if (!myPersonId || !targetId || myPersonId === targetId) return null;
  if (_myKinCache.has(targetId)) return _myKinCache.get(targetId);
  let blood = (typeof computeBloodKinship === 'function') ? computeBloodKinship(myPersonId, targetId) : null;
  let directSp = (typeof isDirectSpouse === 'function') ? isDirectSpouse(myPersonId, targetId) : false;
  let marriage = (!directSp && typeof computeMarriageKinship === 'function') ? computeMarriageKinship(myPersonId, targetId) : null;
  let result = null;
  if (blood || directSp || marriage) {
    let label = '';
    if (directSp) label = targetId ? (getPerson(targetId).gender === 'female' ? 'زوجتي' : 'زوجي') : '';
    else if (blood) label = blood.label;
    else if (marriage) label = marriage.label;
    result = { label, blood, directSp, marriage };
  }
  _myKinCache.set(targetId, result);
  return result;
}

function kinBadgeClass(kin) {
  if (!kin) return '';
  if (kin.blood) {
    let d = kin.blood.lca ? kin.blood.lca.total : 99;
    if (d <= 2) return 'direct';
    if (d <= 4) return 'close';
  }
  if (kin.directSp) return 'direct';
  return '';
}

function updateMyPersonBtn() {
  let btn = document.getElementById('myPersonBtn');
  if (!btn) return;
  if (myPersonId) {
    let p = getPerson(myPersonId);
    btn.innerHTML = p ? `👤 ${p.name}` : '👤 أنا في الشجرة';
    btn.style.background = 'var(--clr-amber-bg)';
    btn.style.borderColor = '#fbbf24';
    btn.style.color = 'var(--clr-amber-text)';
  } else {
    btn.innerHTML = '👤 أنا في الشجرة';
    btn.style.background = '';
    btn.style.borderColor = '';
    btn.style.color = '';
  }
}

// ══════════════════════════════════════════════════════════
//  بيانات تجريبية أولية
// ══════════════════════════════════════════════════════════

function initData() {
  let r = addPerson({ name: 'جد العائلة', gender: 'male', dob: '1930-01-01', dod: '2000-01-01', deceased: true, spouses: [{ name: 'جدة العائلة', gender: 'female', deceased: true, divorced: false, dob: '1935-01-01', dod: '2005-01-01', relativeId: null }] });
  let c1 = addPerson({ name: 'الابن الأكبر', gender: 'male', dob: '1955-03-15', parentId: r.id, motherName: 'جدة العائلة', spouses: [{ name: 'زوجة الابن', gender: 'female', deceased: false, divorced: false, dob: '1960-06-20', relativeId: null }] });
  let c2 = addPerson({ name: 'البنت', gender: 'female', dob: '1958-07-10', parentId: r.id, motherName: 'جدة العائلة', spouses: [{ name: 'زوج البنت', gender: 'male', deceased: false, divorced: false, dob: '1955-11-05', relativeId: null }] });
  let g1 = addPerson({ name: 'حفيد 1', gender: 'male', dob: '1980-02-14', parentId: c1.id, motherName: 'زوجة الابن', spouses: [] });
  let g2 = addPerson({ name: 'حفيدة 1', gender: 'female', dob: '1983-09-22', parentId: c1.id, motherName: 'زوجة الابن', spouses: [{ name: 'زوج مطلق', gender: 'male', deceased: false, divorced: true, dob: '1980-01-01', relativeId: null }, { name: 'الزوج الثاني', gender: 'male', deceased: false, divorced: false, dob: '1978-05-10', relativeId: null }] });
  addPerson({ name: 'حفيد 2', gender: 'male', dob: '1988-12-01', parentId: c2.id, motherName: 'زوج البنت', spouses: [] });
  addRelPair(g1.id, g2.id);
}

// ══════════════════════════════════════════════════════════
//  دالة حذف الشخص
// ══════════════════════════════════════════════════════════

function deletePersonConfirmed(id) {
  let p = getPerson(id); if (!p) return;
  people.forEach(ch => { if (ch.parentId === id) ch.parentId = p.parentId || null; });
  people.forEach(other => {
    if (other.spouses) other.spouses = other.spouses.filter(s => s.personId !== id && s.relativeId !== id);
  });
  removeRelPairsForPerson(id);
  people = people.filter(pp => pp.id !== id);
  if (myPersonId === id) { myPersonId = null; saveMyPerson(); }
  _invalidateAll();
  if (typeof closeModal === 'function') closeModal();
  if (typeof saveData === 'function') saveData();
  if (typeof renderAll === 'function') renderAll();
}

function confirmDeleteFromList(id) {
  let p = getPerson(id); if (!p) return;
  let childCount = getChildrenForNode(id).length;
  let warn = childCount ? `\n⚠️ لديه/ا ${childCount} ابن/ابنة — سيُعاد ربطهم بالجد.` : '';
  if (!confirm(`حذف "${p.name}"؟${warn}\nهذا الإجراء لا يمكن التراجع عنه.`)) return;
  deletePersonConfirmed(id);
}

// ── Helper للتوافق مع الكود القديم ──
function deletePerson(id) { confirmDeleteFromList(id); }

// ── دالة row() للعرض ──
function row(label, val) {
  return `<div class="detail-row"><span class="detail-label">${label}</span><span class="detail-val">${val}</span></div>`;
}
