/**
 * js/kinship.js
 * ═══════════════════════════════════════════════════════════════
 * كاشف القرابة — حساب القرابة الدموية والمصاهرة
 * Kinship Discovery — Blood Kinship + Marriage Kinship
 * ═══════════════════════════════════════════════════════════════
 *
 * Dependencies: core.js
 *
 * Reusable: ✅ مع core.js يمكن استخدامه في أي مشروع شجرة عائلة
 *
 * API العامة:
 *   computeBloodKinship(id1, id2)    ← {label, lca, path1, path2} | null
 *   computeMarriageKinship(id1, id2) ← {label, spouseOfId, ...} | null
 *   isDirectSpouse(id1, id2)         ← boolean
 *   discoverKin()                    ← يعرض النتيجة في #kinResultArea
 *   renderKinPanel()                 ← يرسم لوحة كاشف القرابة
 */

'use strict';

// ── حالة كاشف القرابة ──
let kinPerson1 = null, kinPerson2 = null;

// ══════════════════════════════════════════════════════════
//  التحقق من الزواج المباشر
// ══════════════════════════════════════════════════════════

function isDirectSpouse(id1, id2) {
  let p1 = getPerson(id1), p2 = getPerson(id2);
  if (!p1 || !p2) return false;
  if (p1.spouses && p1.spouses.some(s =>
    (s.personId && s.personId === id2) || (s.relativeId && s.relativeId === id2)
  )) return true;
  if (p2.spouses && p2.spouses.some(s =>
    (s.personId && s.personId === id1) || (s.relativeId && s.relativeId === id1)
  )) return true;
  return false;
}

function getDirectSpouseEntry(fromId, toId) {
  let from = getPerson(fromId);
  if (!from || !from.spouses) return null;
  return from.spouses.find(s =>
    (s.personId && s.personId === toId) || (s.relativeId && s.relativeId === toId)
  ) || null;
}

// ══════════════════════════════════════════════════════════
//  حساب مسار الأسلاف
// ══════════════════════════════════════════════════════════

function getParentIds(personId) {
  let p = getPerson(personId); if (!p) return [];
  let result = [];
  if (p.parentId && getPerson(p.parentId)) {
    let par = getPerson(p.parentId);
    result.push({ id: p.parentId, via: par.gender === 'female' ? 'mother' : 'father' });
  }
  if (p.motherId && getPerson(p.motherId)) {
    if (!result.some(r => r.id === p.motherId)) result.push({ id: p.motherId, via: 'mother' });
  }
  return result;
}

function getAncestorsMap(startId) {
  if (_ancestorMapCache.has(startId)) return _ancestorMapCache.get(startId);
  let map = new Map();
  let queue = [{ id: startId, dist: 0, via: 'self' }];
  while (queue.length) {
    let { id: cur, dist, via } = queue.shift();
    if (cur === null || cur === undefined || map.has(cur)) continue;
    let person = getPerson(cur); if (!person) continue;
    map.set(cur, { dist, via });
    getParentIds(cur).forEach(({ id: pid, via: pv }) => {
      if (!map.has(pid)) queue.push({ id: pid, dist: dist + 1, via: pv });
    });
  }
  _ancestorMapCache.set(startId, map);
  return map;
}

function getPathUp(fromId, toId) {
  let visited = new Map();
  visited.set(fromId, { prev: null, via: 'self' });
  let queue = [fromId];
  while (queue.length) {
    let cur = queue.shift();
    if (cur === toId) {
      let path = [];
      let node = toId;
      while (node !== null) {
        let e = visited.get(node);
        path.unshift({ id: node, via: e.via });
        node = e.prev;
      }
      return path;
    }
    getParentIds(cur).forEach(({ id: pid, via: pv }) => {
      if (!visited.has(pid)) { visited.set(pid, { prev: cur, via: pv }); queue.push(pid); }
    });
  }
  return null;
}

// ══════════════════════════════════════════════════════════
//  وصف القرابة من المسارات
// ══════════════════════════════════════════════════════════

function describeKinshipFromPaths(path1, path2, p1, p2) {
  let d1 = path1.length - 1;
  let d2 = path2.length - 1;
  let gB = p2.gender;
  let male = gB === 'male';

  if (d2 === 0) {
    if (d1 === 1) return male ? 'أب' : 'أم';
    if (d1 === 2) return male ? 'جد' : 'جدة';
    if (d1 === 3) {
      let via = path1[1] ? getPerson(path1[1].id) : null;
      let suf = via ? (via.gender === 'male' ? 'الأب' : 'الأم') : '';
      return male ? (suf ? `جد ${suf}` : 'جد') : (suf ? `جدة ${suf}` : 'جدة');
    }
    if (d1 === 4) {
      let via = path1[2] ? getPerson(path1[2].id) : null;
      let suf = via ? (via.gender === 'male' ? 'الجد' : 'الجدة') : 'الجد';
      return male ? `جد ${suf}` : `جدة ${suf}`;
    }
    return male ? `جد (جيل ${d1})` : `جدة (جيل ${d1})`;
  }
  if (d1 === 0) {
    if (d2 === 1) return male ? 'ابن' : 'ابنة';
    if (d2 === 2) return male ? 'حفيد' : 'حفيدة';
    if (d2 === 3) return male ? 'ابن حفيد' : 'ابنة حفيد';
    if (d2 === 4) return male ? 'ابن ابن حفيد' : 'ابنة ابن حفيد';
    return male ? `ذرية (جيل ${d2})` : `ذرية (جيل ${d2})`;
  }
  if (d1 === 1 && d2 === 1) return male ? 'أخ' : 'أخت';

  let lcaConnector = d1 >= 1 && path1[d1 - 1] ? getPerson(path1[d1 - 1].id) : null;
  let throughFather = !lcaConnector || (lcaConnector.gender === 'male');
  let p1Parent = d1 >= 1 && path1[1] ? getPerson(path1[1].id) : null;
  let p2LcaConnector = d2 >= 2 && path2[d2 - 1] ? getPerson(path2[d2 - 1].id) : null;
  let connectorIsMale = !p2LcaConnector || (p2LcaConnector.gender === 'male');

  function uncleBase(m) { return throughFather ? (m ? 'عم' : 'عمة') : (m ? 'خال' : 'خالة'); }
  function cousinBase(m) {
    let rel = throughFather ? (connectorIsMale ? 'عم' : 'عمة') : (connectorIsMale ? 'خال' : 'خالة');
    return m ? `ابن ${rel}` : `ابنة ${rel}`;
  }

  if (d1 === 1) {
    let sibIdx = d2 - 1;
    let sibPerson = sibIdx >= 1 && path2[sibIdx] ? getPerson(path2[sibIdx].id) : null;
    let sibMale = !sibPerson || (sibPerson.gender === 'male');
    if (d2 === 2) return male ? (sibMale ? 'ابن أخ' : 'ابن أخت') : (sibMale ? 'ابنة أخ' : 'ابنة أخت');
    if (d2 === 3) return male ? (sibMale ? 'حفيد أخ' : 'حفيد أخت') : (sibMale ? 'حفيدة أخ' : 'حفيدة أخت');
    if (d2 === 4) {
      let midPerson = path2[1] ? getPerson(path2[1].id) : null;
      let midWord = (!midPerson || midPerson.gender === 'male') ? 'حفيد' : 'حفيدة';
      return male ? (sibMale ? `ابن ${midWord} أخ` : `ابن ${midWord} أخت`) : (sibMale ? `ابنة ${midWord} أخ` : `ابنة ${midWord} أخت`);
    }
    return male ? `ذرية ${sibMale ? 'أخ' : 'أخت'} (جيل ${d2 - 1})` : `ذرية ${sibMale ? 'أخ' : 'أخت'} (جيل ${d2 - 1})`;
  }

  if (d2 === 1) {
    let base = uncleBase(male);
    if (d1 === 2) return base;
    let suf1 = p1Parent ? (p1Parent.gender === 'male' ? 'الأب' : 'الأم') : '';
    if (d1 === 3) return suf1 ? `${base} ${suf1}` : base;
    let gpar = path1[2] ? getPerson(path1[2].id) : null;
    let suf2 = gpar ? (gpar.gender === 'male' ? 'الجد' : 'الجدة') : 'الجد';
    if (d1 === 4) return `${base} ${suf2}`;
    if (d1 === 5) {
      let via = path1[1] ? getPerson(path1[1].id) : null;
      let grandPerson = path1[2] ? getPerson(path1[2].id) : null;
      let baseSuf = via ? (via.gender === 'male' ? 'الأب' : 'الأم') : 'الأب';
      let grandWord = (!grandPerson || grandPerson.gender === 'male') ? 'جد' : 'جدة';
      return `${base} ${grandWord} ${baseSuf}`;
    }
    return `${base} (جيل ${d1 - 1})`;
  }

  let minD = Math.min(d1, d2);
  let maxD = Math.max(d1, d2);
  let degree = minD - 1;
  let removed = maxD - minD;
  let cb = cousinBase(male);

  if (degree === 1) {
    if (removed === 0) return cb;
    if (d1 > d2) {
      let suf = p1Parent ? (p1Parent.gender === 'male' ? 'الأب' : 'الأم') : '';
      if (removed === 1) return suf ? `${cb} ${suf}` : `${cb} (جيل أعلى)`;
      let gpar2 = path1[2] ? getPerson(path1[2].id) : null;
      let gsuf = gpar2 ? (gpar2.gender === 'male' ? 'الجد' : 'الجدة') : 'الجد';
      if (removed === 2) return `${cb} ${gsuf}`;
      return `${cb} (${removed} جيل أعلى)`;
    } else {
      if (removed === 1) return `${cb} (جيل أبعد)`;
      if (removed === 2) return `${cb} (جيلان أبعد)`;
      return `${cb} (${removed} أجيال أبعد)`;
    }
  }

  let degreeWord = degree === 2 ? 'الدرجة الثانية' : degree === 3 ? 'الدرجة الثالثة' : `الدرجة ${degree}`;
  if (removed === 0) return `${cb} من ${degreeWord}`;
  if (d1 > d2) return `${cb} من ${degreeWord} (${removed} جيل أعلى)`;
  return `${cb} من ${degreeWord} (${removed} جيل فارق)`;
}

// ══════════════════════════════════════════════════════════
//  حساب القرابة الدموية
// ══════════════════════════════════════════════════════════

function computeBloodKinship(id1, id2) {
  if (!id1 || !id2 || id1 === id2) return null;
  let map1 = getAncestorsMap(id1), map2 = getAncestorsMap(id2);
  let common = [];
  map1.forEach((v1, aid) => {
    if (map2.has(aid)) {
      let v2 = map2.get(aid);
      common.push({ id: aid, d1: v1.dist, d2: v2.dist, total: v1.dist + v2.dist });
    }
  });
  if (!common.length) return null;
  common.sort((a, b) => a.total - b.total || (a.d1 - b.d1));
  let seen = new Set();
  common = common.filter(x => { if (seen.has(x.id)) return false; seen.add(x.id); return true; });
  let lca = common[0];
  let p1 = getPerson(id1), p2 = getPerson(id2); if (!p1 || !p2) return null;
  let path1 = getPathUp(id1, lca.id) || [], path2 = getPathUp(id2, lca.id) || [];
  let label = describeKinshipFromPaths(path1, path2, p1, p2);
  return { label, lca, path1, path2, otherLCAs: common.slice(1, 4) };
}

// ══════════════════════════════════════════════════════════
//  حساب قرابة المصاهرة
// ══════════════════════════════════════════════════════════

function computeMarriageKinship(fromId, targetId) {
  let target = getPerson(targetId); if (!target) return null;
  let spouseWord = target.gender === 'female' ? 'زوجة' : 'زوج';

  // الاتجاه الأول: target هو/هي زوج/ة أحد أقارب fromId
  for (let candidate of people) {
    if (candidate.id === fromId || candidate.id === targetId) continue;
    if (!isDirectSpouse(candidate.id, targetId)) continue;
    let bk = computeBloodKinship(fromId, candidate.id);
    if (!bk) continue;
    return { label: `${spouseWord} ${bk.label}`, spouseOfId: candidate.id, spouseOfBloodLabel: bk.label, bloodKin: bk };
  }

  // الاتجاه الثاني: target هو/هي قريب أحد أزواج fromId
  let fromPerson = getPerson(fromId); if (!fromPerson) return null;
  let linkedSpouseIds = new Set();
  if (fromPerson.spouses) fromPerson.spouses.forEach(s => {
    if (s.personId) linkedSpouseIds.add(s.personId);
    if (s.relativeId) linkedSpouseIds.add(s.relativeId);
  });
  people.forEach(p => {
    if (p.spouses) p.spouses.forEach(s => {
      if ((s.personId === fromId || s.relativeId === fromId) && p.id !== fromId) linkedSpouseIds.add(p.id);
    });
  });

  for (let spId of linkedSpouseIds) {
    if (spId === targetId) continue;
    let sp = getPerson(spId); if (!sp) continue;
    let bk = computeBloodKinship(spId, targetId);
    if (!bk) continue;
    let spLabel = sp.gender === 'female' ? 'الزوجة' : 'الزوج';
    return {
      label: `${target.gender === 'male' ? 'قريب' : 'قريبة'} ${spLabel} (${bk.label} ${spLabel})`,
      spouseOfId: spId, spouseOfBloodLabel: bk.label, bloodKin: bk
    };
  }
  return null;
}

// ══════════════════════════════════════════════════════════
//  رسم شجرة القرابة المرئية
// ══════════════════════════════════════════════════════════

function buildKinTree(path1, path2, lcaId, p1, p2) {
  let rev1 = [...path1].reverse();
  let rev2 = [...path2].reverse();
  rev1.shift(); rev2.shift();

  function viaLabel(via) {
    if (via === 'father') return '<span style="font-size:9px;color:#3b82f6;display:block">▲ أب</span>';
    if (via === 'mother') return '<span style="font-size:9px;color:var(--clr-pink-border);display:block">▲ أم</span>';
    return '';
  }

  function makeBox(entry, cls, genNum) {
    let p = getPerson(entry.id); if (!p) return '';
    let f = getParent(p);
    let gf = f ? getParent(f) : null;
    let mainLabel = p.name.length > 16 ? p.name.slice(0, 15) + '…' : p.name;
    let subLabel = '';
    if (f) subLabel = f.name.length > 14 ? f.name.slice(0, 13) + '…' : f.name;
    if (gf) subLabel += (subLabel ? ' بن ' : '') + (gf.name.length > 14 ? gf.name.slice(0, 13) + '…' : gf.name);
    let gIcon = p.deceased ? `<span style="display:inline-flex;vertical-align:middle">${crescent('#2e7d32')}</span>` : '';
    return `<div class="kin-person-box ${cls}">
      ${viaLabel(entry.via)}
      <span style="font-weight:500">${mainLabel}${gIcon}</span>
      ${subLabel ? `<span class="gen-label">${subLabel}</span>` : ''}
      <span class="gen-label">الجيل ${genNum}</span>
    </div>`;
  }

  let lcaPerson = getPerson(lcaId);
  let lcaName = lcaPerson ? (lcaPerson.name.length > 16 ? lcaPerson.name.slice(0, 15) + '…' : lcaPerson.name) : 'جد/ة مشترك';
  let lcaLineage = '';
  if (lcaPerson) {
    let lf = getParent(lcaPerson); let lgf = lf ? getParent(lf) : null;
    if (lf) lcaLineage = lf.name; if (lgf) lcaLineage += ' بن ' + lgf.name;
  }
  let lcaDec = lcaPerson && lcaPerson.deceased ? `<span style="display:inline-flex;vertical-align:middle">${crescent('#fbbf24')}</span>` : '';

  let leftBoxes = rev1.map((entry, i) => {
    let cls = entry.id === p1.id ? 'highlight-a' : '';
    return `<div class="kin-connector-v"></div>${makeBox(entry, cls, i + 1)}`;
  }).join('');

  let rightBoxes = rev2.map((entry, i) => {
    let cls = entry.id === p2.id ? 'highlight-b' : '';
    return `<div class="kin-connector-v"></div>${makeBox(entry, cls, i + 1)}`;
  }).join('');

  let hasBranches = rev1.length || rev2.length;
  return `<div class="kin-tree">
    <div class="kin-lca">${lcaName} ${lcaDec}${lcaLineage ? `<span style="display:block;font-size:10px;font-weight:400;opacity:.8;margin-top:1px">${lcaLineage}</span>` : ''}
    <span class="gen-label" style="display:block;font-size:10px;opacity:.7;margin-top:2px;">الجد/ة المشترك الأقرب</span></div>
    ${hasBranches ? `
    <div style="display:flex;gap:0;width:100%;justify-content:center;">
      <div style="width:50%;border-bottom:2px solid #d1d5db;border-right:2px solid #d1d5db;height:18px;border-radius:0 0 8px 0;"></div>
      <div style="width:50%;border-bottom:2px solid #d1d5db;border-left:2px solid #d1d5db;height:18px;border-radius:0 0 0 8px;"></div>
    </div>
    <div class="kin-branches">
      <div class="kin-branch">
        <div class="kin-person-box" style="border-color:#3b82f6;background:var(--clr-accent-bg);color:var(--clr-accent-text);font-size:11px;">فرع: ${p1.name.length > 12 ? p1.name.slice(0, 11) + '…' : p1.name}</div>
        ${leftBoxes}
      </div>
      <div class="kin-branch">
        <div class="kin-person-box" style="border-color:var(--clr-pink-border);background:var(--clr-pink-bg);color:var(--clr-pink-text);font-size:11px;">فرع: ${p2.name.length > 12 ? p2.name.slice(0, 11) + '…' : p2.name}</div>
        ${rightBoxes}
      </div>
    </div>` : '<div style="font-size:12px;color:var(--text2);margin-top:8px;">نفس الجيل — لا فارق أجيال</div>'}
    <div style="margin-top:10px;font-size:11px;color:var(--text2);display:flex;gap:12px;justify-content:center;flex-wrap:wrap;">
      <span><span style="color:#3b82f6">▲ أب</span> = انتساب عبر الأب</span>
      <span><span style="color:var(--clr-pink-border)">▲ أم</span> = انتساب عبر الأم</span>
    </div>
  </div>`;
}

// ══════════════════════════════════════════════════════════
//  لوحة كاشف القرابة
// ══════════════════════════════════════════════════════════

function renderKinPanel() {
  let p1 = kinPerson1, p2 = kinPerson2;
  let p1Name = p1 ? p1.name : ''; let p2Name = p2 ? p2.name : '';
  let html = `<div class="kin-container">
    <div class="kin-row" style="align-items:center;gap:4px;">
      <div class="kin-col">
        <label>الشخص الأول</label>
        <div id="kin1selected" class="kin-selected" style="display:${p1 ? 'flex' : 'none'}">
          <div class="gender-dot ${p1 && p1.gender === 'male' ? 'male-dot' : 'female-dot'}" style="flex-shrink:0"></div>
          <span class="name">${p1Name}</span>
          <span class="clear" onclick="clearKin(1)">✕</span>
        </div>
        <div class="kin-search-box" id="kin1box" style="display:${p1 ? 'none' : 'block'}">
          <input type="text" placeholder="ابحث أو اضغط لعرض الكل..." oninput="kinSearch(this.value,1)" onfocus="kinSearch(this.value,1)" id="kin1input">
          <button id="kin1voice" class="field-mic-btn" title="بحث صوتي" onclick="startFieldVoice('kin1input',v=>{kinSearch(v,1)},'kin1voice')">🎤</button>
          <div class="kin-results" id="kin1results" style="display:none"></div>
        </div>
      </div>
      <div style="flex-shrink:0;display:flex;align-items:center;justify-content:center;padding-top:18px;">
        <button class="btn" onclick="swapKinPersons()" title="قلب الشخصين" style="font-size:18px;padding:5px 10px;border-radius:50%;width:36px;height:36px;display:flex;align-items:center;justify-content:center;" ${(!p1 && !p2) ? 'disabled' : ''}>⇄</button>
      </div>
      <div class="kin-col">
        <label>الشخص الثاني</label>
        <div id="kin2selected" class="kin-selected" style="display:${p2 ? 'flex' : 'none'}">
          <div class="gender-dot ${p2 && p2.gender === 'male' ? 'male-dot' : 'female-dot'}" style="flex-shrink:0"></div>
          <span class="name">${p2Name}</span>
          <span class="clear" onclick="clearKin(2)">✕</span>
        </div>
        <div class="kin-search-box" id="kin2box" style="display:${p2 ? 'none' : 'block'}">
          <input type="text" placeholder="ابحث أو اضغط لعرض الكل..." oninput="kinSearch(this.value,2)" onfocus="kinSearch(this.value,2)" id="kin2input">
          <button id="kin2voice" class="field-mic-btn" title="بحث صوتي" onclick="startFieldVoice('kin2input',v=>{kinSearch(v,2)},'kin2voice')">🎤</button>
          <div class="kin-results" id="kin2results" style="display:none"></div>
        </div>
      </div>
    </div>
    <div style="text-align:center;margin-bottom:12px;margin-top:8px;">
      <button class="btn primary" onclick="discoverKin()" style="padding:10px 28px;font-size:14px;">🔍 اكتشف القرابة</button>
    </div>
    <div id="kinResultArea"></div>
  </div>`;
  document.getElementById('kinPanel').innerHTML = html;
}

function swapKinPersons() {
  let tmp = kinPerson1; kinPerson1 = kinPerson2; kinPerson2 = tmp;
  renderKinPanel();
  let area = document.getElementById('kinResultArea');
  if (area && area.innerHTML.trim()) discoverKin();
}

function kinSearch(q, which) {
  let resId = 'kin' + which + 'results';
  let el = document.getElementById(resId); if (!el) return;
  q = (q || '').trim().toLowerCase();
  let excludeId = (which === 1 && kinPerson2) ? kinPerson2.id : (which === 2 && kinPerson1) ? kinPerson1.id : null;
  let matches = (q
    ? people.filter(p => matchesFullName(p, q)).sort((a, b) => scoreMatch(b, q) - scoreMatch(a, q))
    : people.slice()
  ).filter(p => p.id !== excludeId);
  if (!matches.length) {
    el.innerHTML = '<div class="kin-result-item" style="color:var(--text2)">لا توجد نتائج</div>';
    el.style.display = 'block'; return;
  }
  let html = matches.map(p => {
    let par = getParent(p);
    let mom = p.motherId ? getPerson(p.motherId) : null;
    let sub = '';
    if (par) sub += `الأب: ${par.name}`;
    if (mom) sub += (sub ? ' · ' : '') + `الأم: ${mom.name}`;
    return `<div class="kin-result-item" onclick="selectKin(${p.id},${which})">
      <div style="display:flex;align-items:center;gap:6px;">
        <div class="gender-dot ${p.gender === 'male' ? 'male-dot' : 'female-dot'}" style="flex-shrink:0;width:8px;height:8px;"></div>
        <span style="font-weight:500;flex:1">${p.name}</span>
        ${p.deceased ? `<span style="display:inline-flex">${crescent('#2e7d32')}</span>` : ''}
      </div>
      ${sub ? `<div style="font-size:11px;color:var(--text2);margin-top:2px;padding-right:14px;">${sub}</div>` : ''}
    </div>`;
  }).join('');
  el.innerHTML = html;
  el.style.display = 'block';
}

function selectKin(id, which) {
  let p = getPerson(id); if (!p) return;
  if (which === 1) kinPerson1 = p; else kinPerson2 = p;
  renderKinPanel();
}

function clearKin(which) {
  if (which === 1) kinPerson1 = null; else kinPerson2 = null;
  document.getElementById('kinResultArea').innerHTML = '';
  renderKinPanel();
}

function openKinPopup(id) {
  kinPerson1 = getPerson(myPersonId);
  kinPerson2 = getPerson(id);
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.tab')[2].classList.add('active');
  document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
  document.getElementById('kinPanel').classList.add('active');
  renderKinPanel();
  setTimeout(() => {
    discoverKin();
    let panel = document.getElementById('kinPanel');
    if (panel) panel.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, 100);
}

// ══════════════════════════════════════════════════════════
//  اكتشاف وعرض القرابة
// ══════════════════════════════════════════════════════════

function discoverKin() {
  let p1 = kinPerson1, p2 = kinPerson2;
  let area = document.getElementById('kinResultArea');
  if (!p1 || !p2) { area.innerHTML = '<div class="kin-no-rel">يرجى اختيار شخصين أولاً</div>'; return; }
  if (p1.id === p2.id) { area.innerHTML = '<div class="kin-no-rel">اخترت نفس الشخص!</div>'; return; }

  let directSpouse = isDirectSpouse(p1.id, p2.id);
  let spouseLabel = '';
  if (directSpouse) {
    let entry = getDirectSpouseEntry(p1.id, p2.id) || getDirectSpouseEntry(p2.id, p1.id);
    let isDivorced = entry && entry.divorced;
    spouseLabel = isDivorced ? (p2.gender === 'female' ? 'مطلقته' : 'مطلقها') : (p2.gender === 'female' ? 'زوجته' : 'زوجها');
  }

  let blood = computeBloodKinship(p1.id, p2.id);
  let marriage = directSpouse ? null : computeMarriageKinship(p1.id, p2.id);

  if (!directSpouse && !blood && !marriage) {
    area.innerHTML = `<div class="kin-result-panel"><div class="kin-no-rel">
      <div style="font-size:32px;margin-bottom:8px;">🔎</div>
      <div style="font-weight:500;color:var(--text);margin-bottom:4px;">لا توجد صلة قرابة مسجّلة</div>
      <div>${p1.name} و ${p2.name} لا يرتبطان بسلف مشترك أو رابط زواج مسجّل في الشجرة</div>
    </div></div>`;
    return;
  }

  let relLabelHtml = '';
  if (directSpouse) {
    let entry = getDirectSpouseEntry(p1.id, p2.id) || getDirectSpouseEntry(p2.id, p1.id);
    let isDivorced = entry && entry.divorced;
    relLabelHtml += `<div class="kin-rel-label">${spouseLabel}
      <span style="font-size:11px;font-weight:400;color:${isDivorced ? 'var(--clr-divorce-text)' : 'var(--clr-purple-text)'};background:${isDivorced ? 'var(--clr-divorce-bg)' : 'var(--clr-purple-bg)'};border:1px solid ${isDivorced ? '#f97316' : '#c4b5fd'};border-radius:5px;padding:1px 6px;margin-right:4px">${isDivorced ? '💔 طلاق' : '💍 زواج مباشر'}</span>
    </div>`;
  }
  if (blood) relLabelHtml += `<div class="kin-rel-label" style="margin-top:${directSpouse ? '8px' : '0'}">${blood.label} <span style="font-size:11px;font-weight:400;color:var(--clr-accent-text);background:var(--clr-accent-bg);border:1px solid #93c5fd;border-radius:5px;padding:1px 6px;margin-right:4px">نسب</span></div>`;
  if (marriage) relLabelHtml += `<div class="kin-rel-label" style="margin-top:${(directSpouse || blood) ? '8px' : '0'}">${marriage.label} <span style="font-size:11px;font-weight:400;color:var(--clr-purple-text);background:var(--clr-purple-bg);border:1px solid #c4b5fd;border-radius:5px;padding:1px 6px;margin-right:4px">مصاهرة</span></div>`;

  let treeHtml = '';
  if (directSpouse) {
    let entry = getDirectSpouseEntry(p1.id, p2.id) || getDirectSpouseEntry(p2.id, p1.id);
    let isDivorced = entry && entry.divorced;
    let icon1 = p1.gender === 'female' ? '👩' : '👨';
    let icon2 = p2.gender === 'female' ? '👩' : '👨';
    let name1 = p1.name.length > 16 ? p1.name.slice(0, 15) + '…' : p1.name;
    let name2 = p2.name.length > 16 ? p2.name.slice(0, 15) + '…' : p2.name;
    let ringLine = isDivorced
      ? `<div style="display:flex;align-items:center;gap:6px;padding:8px 16px;border:2px dashed #f97316;border-radius:10px;background:var(--clr-divorce-bg);font-size:13px;font-weight:600;color:var(--clr-divorce-text)">💔 طُلِّقا</div>`
      : `<div style="display:flex;align-items:center;gap:6px;padding:8px 16px;border:2px solid #7c3aed;border-radius:10px;background:linear-gradient(135deg,var(--card-bg),var(--clr-purple-bg));font-size:13px;font-weight:600;color:var(--clr-purple-text)">💍 متزوجان</div>`;
    treeHtml = `<div style="display:flex;flex-direction:column;align-items:center;gap:8px;padding:12px 0">
      <div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap;justify-content:center">
        <div style="display:flex;flex-direction:column;align-items:center;gap:4px;padding:10px 16px;border:2px solid ${p1.gender === 'female' ? 'var(--clr-pink-border)' : '#3b82f6'};border-radius:10px;background:var(--card-bg);min-width:90px;text-align:center">
          <span style="font-size:22px">${icon1}</span><span style="font-size:13px;font-weight:600;color:var(--text)">${name1}</span>
        </div>
        <div style="display:flex;flex-direction:column;align-items:center;gap:4px">${ringLine}</div>
        <div style="display:flex;flex-direction:column;align-items:center;gap:4px;padding:10px 16px;border:2px solid ${p2.gender === 'female' ? 'var(--clr-pink-border)' : '#3b82f6'};border-radius:10px;background:var(--card-bg);min-width:90px;text-align:center">
          <span style="font-size:22px">${icon2}</span><span style="font-size:13px;font-weight:600;color:var(--text)">${name2}</span>
        </div>
      </div>
    </div>`;
    if (blood) treeHtml += `<div style="margin-top:14px;border-top:2px dashed #93c5fd;padding-top:12px"><div style="text-align:center;font-size:11px;font-weight:600;color:var(--clr-accent-text);margin-bottom:8px;">🩸 شجرة القرابة بالدم</div>${buildKinTree(blood.path1, blood.path2, blood.lca.id, p1, p2)}</div>`;
  } else if (blood) {
    treeHtml = buildKinTree(blood.path1, blood.path2, blood.lca.id, p1, p2);
  } else if (marriage) {
    let spousePerson = getPerson(marriage.spouseOfId);
    if (spousePerson && marriage.bloodKin) {
      treeHtml = buildKinTree(marriage.bloodKin.path1, marriage.bloodKin.path2, marriage.bloodKin.lca.id, p1, spousePerson);
    }
  }

  let statsHtml = '';
  if (directSpouse) statsHtml += `<span class="kin-stat">💍 ${p1.name} و ${p2.name} متزوجان مباشرةً</span>`;
  if (blood) {
    let otherLCAs = blood.otherLCAs || [];
    statsHtml += `<span class="kin-stat">⬆ أجيال من ${p1.name}: ${blood.lca.d1}</span>
      <span class="kin-stat">⬆ أجيال من ${p2.name}: ${blood.lca.d2}</span>
      <span class="kin-stat">📏 مجموع الأجيال: ${blood.lca.total}</span>
      ${otherLCAs.length ? `<span class="kin-stat">أجداد مشتركون أبعد: ${otherLCAs.map(x => { let pp = getPerson(x.id); let lbl = pp ? getAncestorLabel(x.id) : '؟'; return lbl + '(' + x.total + ' جيل)'; }).join('، ')}</span>` : ''}`;
  }
  if (marriage) {
    let spPerson = getPerson(marriage.spouseOfId);
    statsHtml += `<span class="kin-stat">💍 ${p2.name} متزوج/ة من ${spPerson ? spPerson.name : '؟'} (${marriage.spouseOfBloodLabel})</span>`;
  }

  let subLine = directSpouse && !blood ? `${p1.name} 💍 ${p2.name}` : `${p1.name} ← نقطة الالتقاء → ${p2.name}`;

  area.innerHTML = `<div class="kin-result-panel">
    <div class="kin-result-header">
      ${relLabelHtml}
      <div class="kin-rel-sub">${subLine}</div>
    </div>
    <div class="kin-tree-wrap">${treeHtml}</div>
    ${statsHtml ? `<div class="kin-stats">${statsHtml}</div>` : ''}
  </div>`;
}
