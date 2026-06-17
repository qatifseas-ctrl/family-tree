/**
 * js/tree.js
 * ═══════════════════════════════════════════════════════════════
 * رسم الشجرة والقوائم وعرض بيانات الشخص والتنقل
 * Tree Rendering, Person Detail, Navigation, List, Guide
 * ═══════════════════════════════════════════════════════════════
 *
 * Dependencies: core.js, dates.js, kinship.js, mobile.js (theme)
 *
 * Global API (used from other modules):
 *   renderTree()            ← رسم شجرة العائلة
 *   renderList()            ← رسم قائمة الأفراد
 *   renderGuide()           ← رسم دليل الاستخدام
 *   navigateToPerson(id)    ← الانتقال لشخص في الشجرة
 *   navigateToSpouseFamily  ← فتح شجرة عائلة زوج
 *   showPersonDetail(id)    ← عرض بطاقة الشخص
 *   openAddModal(parentId)  ← فتح نافذة إضافة
 *   openEditModal(id)       ← فتح نافذة تعديل
 *   openReorderModal(pId)   ← فتح نافذة ترتيب الأبناء
 *   openAddParentModal(id)  ← إضافة والد لشخص
 */

'use strict';

// ── حالة التحكم ──
let currentAddParentId = null;
let reorderParentId = null;
let reorderList = [];
let dragSrcIdx = null;
let _listPage = 0;
const _LIST_PAGE_SIZE = 40;

// ══════════════════════════════════════════════════════════
//  ─── أدوات مساعدة للرسم ───
// ══════════════════════════════════════════════════════════

function getAvailableMothers() {
  return (editingSpouses || []).filter(s => s.name);
}

function crescent(color) {
  return `<svg width="11" height="11" viewBox="0 0 24 24" fill="none" style="display:inline-block;vertical-align:middle"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" fill="${color || '#2e7d32'}"/></svg>`;
}

function getAncestorLabel(id) {
  let p = getPerson(id);
  if (!p) return '';
  let parts = [p.name];
  let cur = p;
  for (let i = 0; i < 3; i++) {
    let par = getParent(cur);
    if (!par) break;
    parts.push(par.name);
    cur = par;
  }
  return parts.join(' بن ');
}

function _getSpouseTree(person) {
  if (!person || !person.spouses) return [];
  return person.spouses
    .filter(s => s.personId && getPerson(s.personId) && getPerson(s.personId).isExternal)
    .map(s => getPerson(s.personId));
}

function _getChildren(personId, filter) {
  let ch = getChildren(personId);
  if (filter && filter.motherId) ch = ch.filter(c => c.motherId === filter.motherId || c.motherName === filter.motherName);
  return ch;
}

// ══════════════════════════════════════════════════════════
//  ─── رسم الشجرة الرئيسية ───
// ══════════════════════════════════════════════════════════

function renderTree() {
  let container = document.getElementById('treeContainer');
  if (!container) return;

  let roots = getRoots(currentFamilyFilter ? currentFamilyFilter.rootId : false);
  let nav = renderNavBreadcrumb();
  let statsBar = '';
  if (people.length > 0) {
    let males = people.filter(p => p.gender === 'male' && !p.isExternal).length;
    let females = people.filter(p => p.gender === 'female' && !p.isExternal).length;
    let deceased = people.filter(p => p.deceased && !p.isExternal).length;
    let mainCount = people.filter(p => !p.isExternal).length;
    statsBar = `<div class="stats-bar">
      <span>👥 ${mainCount} فرد</span>
      <span style="color:#3b82f6">♂ ${males} ذكر</span>
      <span style="color:var(--clr-pink-border)">♀ ${females} أنثى</span>
      ${deceased ? `<span>${crescent('#2e7d32')} ${deceased} متوفى</span>` : ''}
    </div>`;
  }

  if (!roots.length) {
    container.innerHTML = nav + statsBar + `<div class="empty-state">
      <div style="font-size:48px;margin-bottom:12px">🌱</div>
      <div style="font-size:16px;font-weight:500;color:var(--text);margin-bottom:8px">ابدأ شجرتك</div>
      <div style="font-size:13px;color:var(--text2);margin-bottom:16px">اضغط "+ إضافة فرد" لإضافة أول شخص في الشجرة</div>
    </div>`;
    return;
  }

  let html = nav + statsBar;
  roots.forEach(root => { html += renderNode(root, 0, null); });
  container.innerHTML = html;
  _postRenderTree();
}

function _postRenderTree() {
  // ربط أحداث الصور
  document.querySelectorAll('.node-photo').forEach(img => {
    img.addEventListener('click', e => {
      e.stopPropagation();
      let src = img.src, name = img.dataset.name || '';
      zoomPhoto(src, name);
    });
  });
}

function renderNode(person, depth, parentPerson) {
  if (!person) return '';
  let isExpanded = expanded[person.id] !== false;
  let children = getChildren(person.id);
  let hasChildren = children.length > 0;

  // Children from external father (fatherId system)
  let externalFatherChildren = person.isExternal
    ? people.filter(c => c.fatherId === person.id)
    : [];
  let allChildren = [...children, ...externalFatherChildren.filter(c => !children.find(x => x.id === c.id))];
  hasChildren = allChildren.length > 0;

  let myKin = getMyKinship(person.id);
  let badgeCls = kinBadgeClass(myKin);
  let kinBadge = myKin
    ? `<span class="kin-badge ${badgeCls}" title="${myKin.label}">${myKin.label}</span>`
    : '';

  let gIcon = person.gender === 'female' ? '♀' : '♂';
  let gClass = person.gender === 'female' ? 'female' : 'male';

  let photoHtml = '';
  if (person.photo) {
    let safeName = (person.name || '').replace(/'/g, "\\'");
    photoHtml = `<img class="node-photo" src="${person.photo}" data-name="${safeName}" alt="${person.name}" style="width:32px;height:32px;border-radius:50%;object-fit:cover;flex-shrink:0;cursor:pointer;border:2px solid var(--card-border)">`;
  }

  let dateStr = '';
  if (person.dob || person.dod) {
    let born = person.dob ? formatDisplayDate(person) : '';
    let died = person.deceased && person.dod ? formatDisplayDate(person, 'dod') : '';
    if (born) dateStr += `<span class="node-date">${crescent(person.deceased ? '#2e7d32' : 'transparent')} ${born}</span>`;
    if (died) dateStr += `<span class="node-date" style="color:var(--clr-green-text)">↑ ${died}</span>`;
  }

  let myMarker = myPersonId === person.id
    ? `<span class="my-marker" title="أنا في الشجرة">أنا</span>` : '';

  let titleStr = person.title ? `<span class="node-title">${person.title}</span>` : '';
  let familyStr = person.familyName ? `<span class="node-family">${person.familyName}</span>` : '';

  // Spouses display in node header
  let spousesHtml = '';
  if (person.spouses && person.spouses.length) {
    let spouseItems = person.spouses.map((sp, si) => {
      let linkedPerson = sp.personId ? getPerson(sp.personId) : null;
      let divorcedClass = sp.divorced ? 'divorced' : '';
      let treeBtn = '';
      if (linkedPerson) {
        if (linkedPerson.isExternal) {
          let extKids = people.filter(c => c.fatherId === linkedPerson.id || (c.parentId === linkedPerson.id));
          if (extKids.length || sp.forceTreeBtn) {
            treeBtn = `<button class="spouse-tree-btn" onclick="event.stopPropagation();navigateToSpouseFamily(${linkedPerson.id})" title="فتح شجرة عائلة ${sp.name}">🌳</button>`;
          }
        } else {
          treeBtn = `<button class="spouse-tree-btn" onclick="event.stopPropagation();navigateToPerson(${linkedPerson.id})" title="عرض في الشجرة">🔗</button>`;
        }
      }
      let spDecIcon = sp.deceased ? `<span style="display:inline-flex">${crescent('#2e7d32')}</span>` : '';
      return `<span class="spouse-chip ${divorcedClass}" onclick="event.stopPropagation();showPersonDetail(${person.id})" title="${sp.divorced ? 'مطلق/ة' : 'زوج/ة'}">
        ${sp.divorced ? '💔' : '💍'} ${sp.name || ''}${spDecIcon}
        ${treeBtn}
      </span>`;
    }).join('');
    spousesHtml = `<div class="node-spouses">${spouseItems}</div>`;
  }

  let expandBtn = hasChildren
    ? `<button class="expand-btn" onclick="event.stopPropagation();toggleExpand(${person.id})" title="${isExpanded ? 'طيّ' : 'فتح'}">${isExpanded ? '▼' : '▶'}</button>`
    : '';

  let actionBtns = `<div class="node-actions">
    <button class="action-btn add" onclick="event.stopPropagation();openAddModal(${person.id})" title="إضافة ابن/ابنة">+</button>
    <button class="action-btn edit" onclick="event.stopPropagation();openEditModal(${person.id})" title="تعديل">✏</button>
    ${hasChildren ? `<button class="action-btn reorder" onclick="event.stopPropagation();openReorderModal(${person.id})" title="ترتيب الأبناء">⇅</button>` : ''}
    <button class="action-btn delete" onclick="event.stopPropagation();deletePerson(${person.id})" title="حذف">🗑</button>
  </div>`;

  let decOverlay = '';
  if (person.deceased) {
    decOverlay = `<div class="deceased-overlay" onclick="event.stopPropagation();showFatihaOverlay(${person.id})"></div>`;
  }

  // Mother tag (children of external father)
  let motherTag = '';
  if (person.motherId) {
    let mom = getPerson(person.motherId);
    if (mom) motherTag = `<span class="mother-tag" onclick="event.stopPropagation();navigateToPerson(${mom.id})">الأم: ${mom.name}</span>`;
  } else if (person.motherName) {
    motherTag = `<span class="mother-tag ext">الأم: ${person.motherName}</span>`;
  }

  let nodeClass = `node ${gClass}${person.deceased ? ' deceased' : ''}${person.isExternal ? ' external' : ''}`;
  let searchHighlight = _lastSearchHighlightId === person.id ? ' search-highlight' : '';

  let headerHtml = `<div class="node-header${searchHighlight}" data-person-id="${person.id}" onclick="showPersonDetail(${person.id})">
    ${decOverlay}
    ${photoHtml}
    <div class="node-info" style="flex:1;min-width:0">
      <div class="node-name-row">
        ${expandBtn}
        <span class="node-gender ${gClass}">${gIcon}</span>
        ${titleStr}
        <span class="node-name">${person.name}</span>
        ${familyStr}
        ${myMarker}
        ${person.deceased ? `<span class="deceased-icon">${crescent('#2e7d32')}</span>` : ''}
        ${kinBadge}
      </div>
      ${dateStr ? `<div class="node-dates">${dateStr}</div>` : ''}
      ${motherTag}
      ${spousesHtml}
    </div>
    ${actionBtns}
  </div>`;

  let childrenHtml = '';
  if (isExpanded && allChildren.length) {
    let sorted = [...allChildren].sort((a, b) => (a.sortOrder ?? 9999) - (b.sortOrder ?? 9999));
    childrenHtml = `<div class="node-children">${sorted.map(ch => renderNode(ch, depth + 1, person)).join('')}</div>`;
  }

  return `<div class="${nodeClass}" id="node-${person.id}" data-depth="${depth}">
    ${headerHtml}
    ${childrenHtml}
  </div>`;
}

function toggleExpand(personId) {
  expanded[personId] = !expanded[personId];
  renderTree();
}

function expandAll() {
  people.forEach(p => { expanded[p.id] = true; });
  renderTree();
}

function collapseAll() {
  people.forEach(p => { expanded[p.id] = false; });
  renderTree();
}

// ── Fatiha overlay on deceased click ──
function showFatihaOverlay(personId) {
  let p = getPerson(personId);
  if (!p || !p.deceased) return;
  let name = p.name || '';
  let ov = document.createElement('div');
  ov.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.85);display:flex;flex-direction:column;align-items:center;justify-content:center;z-index:9997;cursor:pointer;gap:12px;padding:24px;text-align:center;';
  ov.innerHTML = `
    <div style="color:#fff;font-size:22px;font-weight:700;text-shadow:0 2px 4px rgba(0,0,0,.5)">${name}</div>
    <div style="font-size:32px">${crescent('#4ade80')}</div>
    <div style="color:rgba(255,255,255,.9);font-size:18px;line-height:2;font-family:'Amiri','Scheherazade New',serif">
      بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ<br>
      الْحَمْدُ لِلَّهِ رَبِّ الْعَالَمِينَ<br>
      الرَّحْمَٰنِ الرَّحِيمِ<br>
      مَالِكِ يَوْمِ الدِّينِ<br>
      إِيَّاكَ نَعْبُدُ وَإِيَّاكَ نَسْتَعِينُ<br>
      اهْدِنَا الصِّرَاطَ الْمُسْتَقِيمَ<br>
      صِرَاطَ الَّذِينَ أَنْعَمْتَ عَلَيْهِمْ<br>
      غَيْرِ الْمَغْضُوبِ عَلَيْهِمْ وَلَا الضَّالِّينَ
    </div>
    <div style="color:rgba(255,255,255,.5);font-size:12px;margin-top:8px">اضغط للإغلاق</div>
  `;
  ov.onclick = () => ov.remove();
  document.body.appendChild(ov);
  setTimeout(() => { if (ov.parentNode) ov.remove(); }, 4000);
}

// ══════════════════════════════════════════════════════════
//  ─── عرض بيانات الشخص ───
// ══════════════════════════════════════════════════════════

function showPersonDetail(personId) {
  let p = getPerson(personId);
  if (!p) return;

  let parent = getParent(p);
  let mom = p.motherId ? getPerson(p.motherId) : null;
  let siblings = parent ? getChildren(parent.id).filter(c => c.id !== personId) : [];
  let allChildren = getChildren(personId);

  // Also get children where this person is fatherId (external system)
  let fatherKids = people.filter(c => c.fatherId === personId && !allChildren.find(x => x.id === c.id));
  let totalChildren = [...allChildren, ...fatherKids];

  // Kinship with myPerson
  let myKin = getMyKinship(personId);

  // Lineage chain
  let lineage = '';
  let cur = p;
  let chain = [p.name];
  for (let i = 0; i < 5; i++) {
    let par = getParent(cur);
    if (!par) break;
    chain.push(par.name);
    cur = par;
  }
  lineage = chain.join(' بن ');

  // Photo
  let photoHtml = p.photo
    ? `<div style="text-align:center;margin-bottom:12px">
        <img src="${p.photo}" style="width:80px;height:80px;border-radius:50%;object-fit:cover;cursor:pointer;border:3px solid var(--card-border);box-shadow:0 4px 12px rgba(0,0,0,.15)" onclick="zoomPhoto('${p.photo}','${p.name.replace(/'/g, "\\'")}')">
       </div>` : '';

  // Build detail rows
  function row(label, value, cls) {
    if (!value) return '';
    return `<div class="detail-row${cls ? ' ' + cls : ''}"><span class="detail-label">${label}</span><span class="detail-value">${value}</span></div>`;
  }

  let dobStr = p.dob ? formatDisplayDate(p, 'dob') : '';
  let dodStr = p.deceased && p.dod ? formatDisplayDate(p, 'dod') : '';
  let ageStr = dobStr ? computeAge(p) : '';

  let genderLabel = p.gender === 'female' ? '♀ أنثى' : '♂ ذكر';
  let statusLabel = p.deceased
    ? `<span style="color:var(--clr-green-text)">${crescent('#2e7d32')} متوفى/ة</span>` : '🟢 على قيد الحياة';

  // Spouses detail
  let spousesDetail = '';
  if (p.spouses && p.spouses.length) {
    let ordinals = ['الأولى', 'الثانية', 'الثالثة', 'الرابعة'];
    let spouseLabel = p.gender === 'female' ? 'الزوج' : 'الزوجة';
    spousesDetail = p.spouses.map((sp, i) => {
      let linkedPerson = sp.personId ? getPerson(sp.personId) : null;
      let ord = p.spouses.length > 1 ? ` ${ordinals[i] || (i + 1)}` : '';
      let divTag = sp.divorced ? `<span class="divorced-tag">💔 طلاق</span>` : '';
      let decTag = sp.deceased ? `<span class="deceased-tag">${crescent('#2e7d32')}</span>` : '';
      let treeLink = '';
      if (linkedPerson) {
        if (linkedPerson.isExternal) {
          let extKids = people.filter(c => c.fatherId === linkedPerson.id);
          if (extKids.length || sp.forceTreeBtn) {
            treeLink = `<button class="btn" style="font-size:11px;padding:3px 8px;margin-top:4px" onclick="closeModal();navigateToSpouseFamily(${linkedPerson.id})">🌳 فتح شجرته/ا</button>`;
          }
        } else {
          treeLink = `<button class="btn" style="font-size:11px;padding:3px 8px;margin-top:4px" onclick="closeModal();navigateToPerson(${linkedPerson.id})">🔗 عرض في الشجرة</button>`;
        }
      }
      return `<div style="padding:6px 10px;border:1px solid var(--card-border);border-radius:8px;margin-bottom:6px;background:var(--card-bg)">
        <div style="font-weight:500;font-size:13px">${spouseLabel}${ord}: ${sp.name || ''}${decTag}${divTag}</div>
        ${sp.familyName ? `<div style="font-size:11px;color:var(--text2)">${sp.familyName}</div>` : ''}
        ${treeLink}
      </div>`;
    }).join('');
  }

  // Relatives (relPairs)
  let relPairsHtml = '';
  let rels = getRelatives(personId);
  if (rels.length) {
    relPairsHtml = rels.map(r => {
      let rp = getPerson(r);
      if (!rp) return '';
      return `<span class="rel-chip" onclick="closeModal();navigateToPerson(${r})">${rp.name}</span>`;
    }).join('');
  }

  // Children grouped by mother
  let childrenByMother = {};
  totalChildren.forEach(ch => {
    let key = ch.motherName || ch.motherId || '__none__';
    if (!childrenByMother[key]) childrenByMother[key] = [];
    childrenByMother[key].push(ch);
  });

  let childrenHtml = '';
  Object.entries(childrenByMother).forEach(([key, chs]) => {
    let motherLabel = key === '__none__' ? '' : `<div style="font-size:11px;color:var(--text2);margin-bottom:4px">أبناء من: ${key === '__none__' ? '' : (key.startsWith('__') ? '' : key)}</div>`;
    let chHtml = chs.map(ch => {
      let gDot = `<div class="gender-dot ${ch.gender === 'male' ? 'male-dot' : 'female-dot'}" style="width:8px;height:8px;border-radius:50%;flex-shrink:0"></div>`;
      return `<span class="child-chip" onclick="closeModal();navigateToPerson(${ch.id})">${gDot} ${ch.name}${ch.deceased ? crescent('#2e7d32') : ''}</span>`;
    }).join('');
    childrenHtml += `<div>${motherLabel}${chHtml}</div>`;
  });

  // My kinship panel
  let kinPanelHtml = '';
  if (myKin) {
    let miniTree = buildMyKinMiniTree(myKin);
    kinPanelHtml = `<div class="detail-kin-panel" onclick="closeModal();openKinPopup(${personId})">
      <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">
        <span style="font-size:16px">🔗</span>
        <span style="font-weight:600;font-size:13px">صلة القرابة بي:</span>
        <span class="kin-badge ${kinBadgeClass(myKin)}">${myKin.label}</span>
        <span style="font-size:11px;color:var(--clr-accent-text);margin-right:auto">اضغط للتفاصيل ↗</span>
      </div>
      ${miniTree}
    </div>`;
  }

  let modal = `<div class="modal-overlay" onclick="if(event.target===this)closeModal()">
  <div class="modal" style="max-width:500px">
    ${photoHtml}
    <h3 style="margin-bottom:4px">${p.title ? `<span style="font-size:13px;font-weight:400;color:var(--text2);margin-left:6px">${p.title}</span>` : ''}${p.name}${p.familyName ? ` <span style="font-size:14px;font-weight:400;color:var(--text2)">${p.familyName}</span>` : ''}</h3>
    <div style="font-size:12px;color:var(--text2);margin-bottom:12px;word-break:break-all">${lineage}</div>
    ${kinPanelHtml}
    <div class="detail-rows">
      ${row('الجنس', genderLabel)}
      ${row('الحالة', statusLabel)}
      ${row('الوالد', parent ? `<span class="detail-link" onclick="closeModal();navigateToPerson(${parent.id})">${parent.name}</span>` : (p.fatherName || ''))}
      ${row('الأم', mom ? `<span class="detail-link" onclick="closeModal();navigateToPerson(${mom.id})">${mom.name}</span>` : (p.motherName || ''))}
      ${row('تاريخ الميلاد', dobStr)}
      ${ageStr ? row('العمر', ageStr) : ''}
      ${row('تاريخ الوفاة', dodStr)}
      ${p.notes ? row('ملاحظات', p.notes) : ''}
    </div>
    ${spousesDetail ? `<div style="margin-top:10px"><div class="section-title" style="margin-bottom:6px">الأزواج / الزوجات</div>${spousesDetail}</div>` : ''}
    ${totalChildren.length ? `<div style="margin-top:10px"><div class="section-title" style="margin-bottom:6px">الأبناء (${totalChildren.length})</div>${childrenHtml}</div>` : ''}
    ${siblings.length ? `<div style="margin-top:10px"><div class="section-title" style="margin-bottom:6px">الإخوة (${siblings.length})</div><div>${siblings.map(s => `<span class="child-chip" onclick="closeModal();navigateToPerson(${s.id})">${s.name}</span>`).join('')}</div></div>` : ''}
    ${relPairsHtml ? `<div style="margin-top:10px"><div class="section-title" style="margin-bottom:6px">صلات أخرى</div><div>${relPairsHtml}</div></div>` : ''}
    <div class="modal-footer" style="flex-wrap:wrap;gap:6px">
      <button class="btn" onclick="closeModal()">إغلاق</button>
      <button class="btn" onclick="closeModal();openEditModal(${personId})">✏ تعديل</button>
      <button class="btn primary" onclick="closeModal();navigateToPerson(${personId})">🌳 عرض في الشجرة</button>
    </div>
  </div></div>`;

  document.getElementById('modalContainer').innerHTML = modal;
  _androidBackGuardModalOpen();
}

function computeAge(p) {
  if (!p || !p.dob) return '';
  let greg = p.dobGregorian || p.dob;
  if (!greg || typeof greg !== 'string') return '';
  let d = new Date(greg);
  if (isNaN(d)) return '';
  let end = p.deceased && p.dodGregorian ? new Date(p.dodGregorian) : new Date();
  let years = end.getFullYear() - d.getFullYear();
  let m = end.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && end.getDate() < d.getDate())) years--;
  if (years < 0) return '';
  return years + ' سنة' + (p.deceased ? ' (عند الوفاة)' : '');
}

function formatDisplayDate(p, field) {
  field = field || 'dob';
  let original = p[field] || '';
  let type = p[field + 'Type'] || 'gregorian';
  let hijri = p[field + 'Hijri'] || '';
  let gregorian = p[field + 'Gregorian'] || original;
  if (!original && !gregorian && !hijri) return '';
  if (hijri && gregorian) return `${hijri} هـ / ${gregorian} م`;
  if (hijri) return `${hijri} هـ`;
  if (gregorian) return `${gregorian} م`;
  return original;
}

// ══════════════════════════════════════════════════════════
//  ─── التنقل ───
// ══════════════════════════════════════════════════════════

let _lastSearchHighlightId = null;

function navigateToPerson(personId) {
  _lastSearchHighlightId = personId;
  // Ensure person is visible: expand all ancestors
  let p = getPerson(personId);
  if (!p) return;
  let cur = p;
  while (cur) {
    expanded[cur.id] = true;
    cur = getParent(cur);
  }
  // Handle family filter: if person is in another family tree
  if (currentFamilyFilter) {
    let rootId = currentFamilyFilter.rootId;
    let inCurrent = false;
    let walk = p;
    while (walk) {
      if (walk.id === rootId) { inCurrent = true; break; }
      walk = getParent(walk);
    }
    if (!inCurrent) {
      navigateHome();
      // After home, try again
      setTimeout(() => navigateToPerson(personId), 100);
      return;
    }
  }
  renderTree();
  setTimeout(() => {
    let el = document.querySelector(`[data-person-id="${personId}"]`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      el.classList.add('search-highlight');
      setTimeout(() => el.classList.remove('search-highlight'), 2000);
    }
    _lastSearchHighlightId = null;
  }, 100);
}

// ── Navigation: Two-layer family system ──

function renderNavBreadcrumb() {
  if (!currentFamilyFilter && navStack.length === 0) return '';
  let rootPerson = currentFamilyFilter ? getPerson(currentFamilyFilter.rootId) : null;
  let connectedVia = '';
  if (currentFamilyFilter && navStack.length > 0) {
    let prevFrame = navStack[navStack.length - 1];
    connectedVia = prevFrame.label || 'الشجرة الرئيسية';
  }
  let banner = currentFamilyFilter ? `
  <div class="ctx-nav-banner">
    <span class="ctx-icon">🌳</span>
    <div class="ctx-body">
      <div class="ctx-title">${currentFamilyFilter.label}</div>
      <div class="ctx-sub">${connectedVia ? `متصلة بـ ${connectedVia} عبر زواج` : 'عائلة منفصلة — انتقلت إليها عبر رابط زواج'}</div>
    </div>
    <button class="ctx-back-btn" onclick="navigateBack()">◀ رجوع</button>
  </div>` : '';

  let mainLabel = people.length > 0 && getRoots(false).length > 0 ? '🏠 ' + getRoots(false)[0].name : '🏠 الرئيسية';
  let crumbs = `<span class="ctx-crumb" onclick="navigateHome()" title="العودة للشجرة الرئيسية">${mainLabel}</span>`;
  navStack.forEach((frame, i) => {
    crumbs += `<span class="ctx-crumb-sep">◀</span>`;
    let isLast = (i === navStack.length - 1) && currentFamilyFilter;
    crumbs += `<span class="ctx-crumb${isLast ? ' active' : ''}" onclick="navigateToBreadcrumb(${i})">${frame.label || '...'}</span>`;
  });
  if (currentFamilyFilter) {
    if (navStack.length > 0) crumbs += `<span class="ctx-crumb-sep">◀</span>`;
    crumbs += `<span class="ctx-crumb active">🌳 ${currentFamilyFilter.label}</span>`;
  }
  let breadcrumb = `<div class="ctx-breadcrumb">${crumbs}</div>`;
  return banner + breadcrumb;
}

function navigateToSpouseFamily(personId) {
  _pushAndroidTreeSnapshot();
  let sp = getPerson(personId); if (!sp) return;
  let cur = sp;
  while (cur.parentId && getPerson(cur.parentId)) cur = getPerson(cur.parentId);
  let rootId = cur.id;
  let currentLabel = currentFamilyFilter ? currentFamilyFilter.label
    : (getRoots(false).length > 0 ? 'عائلة ' + getRoots(false)[0].name : 'الشجرة الرئيسية');
  navStack.push({
    label: currentLabel,
    filter: currentFamilyFilter ? JSON.parse(JSON.stringify(currentFamilyFilter)) : null,
    scrollY: window.scrollY
  });
  currentFamilyFilter = {
    rootId, label: 'عائلة ' + cur.name + (cur.familyName ? ' ' + cur.familyName : ''),
    viaPersonId: personId, fromLabel: currentLabel
  };
  expanded[rootId] = true;
  let wp = sp; while (wp) { expanded[wp.id] = true; wp = getParent(wp); }
  renderAll();
  setTimeout(() => {
    let el = document.querySelector(`[data-person-id="${personId}"]`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      let hdr = el.querySelector('.node-header');
      if (hdr) {
        hdr.style.transition = 'background .1s';
        hdr.style.background = 'var(--clr-purple-bg)';
        setTimeout(() => { hdr.style.transition = 'background .4s'; hdr.style.background = ''; }, 700);
      }
    }
  }, 150);
}

function navigateHome() {
  navStack = [];
  currentFamilyFilter = null;
  renderAll();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function navigateBack() {
  if (navStack.length === 0) { navigateHome(); return; }
  let prev = navStack.pop();
  currentFamilyFilter = prev.filter;
  renderAll();
  setTimeout(() => window.scrollTo({ top: prev.scrollY || 0, behavior: 'smooth' }), 100);
}

function navigateToBreadcrumb(idx) {
  let frame = navStack[idx];
  navStack = navStack.slice(0, idx);
  currentFamilyFilter = frame.filter;
  renderAll();
  setTimeout(() => window.scrollTo({ top: frame.scrollY || 0, behavior: 'smooth' }), 100);
}

// ══════════════════════════════════════════════════════════
//  ─── رسم القائمة ───
// ══════════════════════════════════════════════════════════

function renderList() {
  let panel = document.getElementById('listPanel');
  if (!panel) return;
  _listPage = 0;

  let visiblePeople = people.filter(p => !p.isExternal);
  let sortedPeople = [...visiblePeople].sort((a, b) => a.name.localeCompare(b.name, 'ar'));

  let controls = `<div class="list-controls">
    <span style="color:var(--text2);font-size:12px">إجمالي: ${visiblePeople.length} فرد</span>
    <div style="display:flex;gap:6px">
      <select id="listSortSel" onchange="renderListSorted(this.value)" style="font-size:12px;padding:4px 8px;border-radius:6px;border:1px solid var(--card-border);background:var(--card-bg);color:var(--text)">
        <option value="name">ترتيب أبجدي</option>
        <option value="dob">تاريخ الميلاد</option>
        <option value="family">العائلة</option>
        <option value="added">الإضافة الأخيرة</option>
      </select>
    </div>
  </div>`;

  let html = controls + `<div id="listContent"></div><div id="listLoadMore" style="text-align:center;padding:10px"></div>`;
  panel.innerHTML = html;
  _renderListPage(sortedPeople, 0);
}

function renderListSorted(sortBy) {
  let visiblePeople = people.filter(p => !p.isExternal);
  let sorted;
  if (sortBy === 'name') sorted = [...visiblePeople].sort((a, b) => a.name.localeCompare(b.name, 'ar'));
  else if (sortBy === 'dob') sorted = [...visiblePeople].sort((a, b) => (a.dobGregorian || a.dob || '').localeCompare(b.dobGregorian || b.dob || ''));
  else if (sortBy === 'family') sorted = [...visiblePeople].sort((a, b) => (a.familyName || '').localeCompare(b.familyName || '', 'ar') || a.name.localeCompare(b.name, 'ar'));
  else sorted = [...visiblePeople].sort((a, b) => b.id - a.id);
  _listPage = 0;
  _renderListPage(sorted, 0);
}

function _renderListPage(sortedPeople, page) {
  let start = page * _LIST_PAGE_SIZE;
  let slice = sortedPeople.slice(start, start + _LIST_PAGE_SIZE);
  let content = document.getElementById('listContent');
  if (!content) return;

  let html = slice.map(p => {
    let par = getParent(p);
    let mom = p.motherId ? getPerson(p.motherId) : null;
    let myKin = getMyKinship(p.id);
    let kinBadgeHtml = myKin ? `<span class="kin-badge ${kinBadgeClass(myKin)}">${myKin.label}</span>` : '';
    let dobStr = p.dob ? formatDisplayDate(p, 'dob') : '';
    let gIcon = p.gender === 'female' ? '♀' : '♂';
    let gClass = p.gender === 'female' ? 'female' : 'male';
    let photoHtml = p.photo
      ? `<img src="${p.photo}" style="width:40px;height:40px;border-radius:50%;object-fit:cover;flex-shrink:0;border:2px solid var(--card-border)" onclick="event.stopPropagation();zoomPhoto('${p.photo}','${p.name.replace(/'/g, "\\'")}')">`
      : `<div class="list-avatar ${gClass}">${gIcon}</div>`;
    let subInfo = '';
    if (par) subInfo += `الأب: ${par.name}`;
    if (mom) subInfo += (subInfo ? ' · ' : '') + `الأم: ${mom.name}`;
    if (dobStr) subInfo += (subInfo ? ' · ' : '') + dobStr;
    return `<div class="list-item" onclick="showPersonDetail(${p.id})">
      ${photoHtml}
      <div style="flex:1;min-width:0">
        <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap">
          <span class="list-name">${p.name}${p.familyName ? ` <span style="font-weight:400;font-size:12px;color:var(--text2)">${p.familyName}</span>` : ''}</span>
          ${p.deceased ? `<span>${crescent('#2e7d32')}</span>` : ''}
          ${kinBadgeHtml}
        </div>
        ${subInfo ? `<div style="font-size:11px;color:var(--text2);margin-top:2px">${subInfo}</div>` : ''}
      </div>
      <div style="display:flex;gap:4px">
        <button class="action-btn edit" onclick="event.stopPropagation();openEditModal(${p.id})" title="تعديل">✏</button>
      </div>
    </div>`;
  }).join('');

  if (page === 0) {
    content.innerHTML = html;
  } else {
    content.innerHTML += html;
  }

  let loadMore = document.getElementById('listLoadMore');
  let total = people.filter(p2 => !p2.isExternal).length;
  if (loadMore) {
    let shown = (page + 1) * _LIST_PAGE_SIZE;
    if (shown < total) {
      loadMore.innerHTML = `<button class="btn" onclick="_listLoadMore()">تحميل المزيد (${total - shown} متبقي)</button>`;
      loadMore.dataset.people = JSON.stringify(sortedPeople.map(p => p.id));
      loadMore.dataset.page = page + 1;
    } else {
      loadMore.innerHTML = `<div style="font-size:12px;color:var(--text2);padding:8px">تم عرض جميع الأفراد (${total})</div>`;
    }
  }
}

function _listLoadMore() {
  let loadMore = document.getElementById('listLoadMore');
  if (!loadMore) return;
  let page = parseInt(loadMore.dataset.page || '0');
  let ids = JSON.parse(loadMore.dataset.people || '[]');
  let sorted = ids.map(id => getPerson(id)).filter(Boolean);
  _renderListPage(sorted, page);
}

// ══════════════════════════════════════════════════════════
//  ─── نوافذ إضافة / تعديل ───
// ══════════════════════════════════════════════════════════

function openAddModal(parentId) {
  currentAddParentId = parentId;
  let par = parentId ? getPerson(parentId) : null;
  window._editGender = par ? par.gender : 'male';
  window._inheritedFamilyName = par ? (par.childrenFamilyName || par.familyName || '') : '';
  showEditModal(null, parentId);
}

function openEditModal(personId) {
  window._editGender = getPerson(personId) ? getPerson(personId).gender : 'male';
  showEditModal(personId, null);
}

function openAddParentModal(personId) {
  let p = getPerson(personId);
  if (!p) return;
  // Show a simplified modal to link/create a parent
  let modal = `<div class="modal-overlay" onclick="if(event.target===this)closeModal()">
  <div class="modal" style="max-width:420px">
    <h3>إضافة والد لـ ${p.name}</h3>
    <div class="form-row">
      <label>بحث عن والد موجود في الشجرة</label>
      <div style="position:relative">
        <input type="text" id="parentPickerInput" placeholder="اكتب اسم الوالد..." oninput="parentPickerSearch(this.value,'${personId}')" style="width:100%">
        <div id="parentPickerResults" class="kin-results" style="display:none;max-height:180px"></div>
      </div>
    </div>
    <div class="modal-footer">
      <button class="btn" onclick="closeModal()">إلغاء</button>
      <button class="btn primary" onclick="addNewParentFor(${personId})">+ إنشاء والد جديد</button>
    </div>
  </div></div>`;
  document.getElementById('modalContainer').innerHTML = modal;
  _androidBackGuardModalOpen();
}

function parentPickerSearch(q, childId) {
  let el = document.getElementById('parentPickerResults');
  if (!el) return;
  q = (q || '').trim().toLowerCase();
  let matches = q ? people.filter(p => matchesFullName(p, q)).sort((a, b) => scoreMatch(b, q) - scoreMatch(a, q)) : people.slice().slice(0, 20);
  matches = matches.filter(p => p.id !== parseInt(childId));
  if (!matches.length) { el.style.display = 'none'; return; }
  el.innerHTML = matches.map(p => {
    let par = getParent(p);
    return `<div class="kin-result-item" onclick="linkParentToPerson(${childId},${p.id})">
      <div class="gender-dot ${p.gender === 'male' ? 'male-dot' : 'female-dot'}" style="width:8px;height:8px;flex-shrink:0;border-radius:50%"></div>
      <span style="font-weight:500;flex:1">${p.name}</span>
      ${par ? `<span style="font-size:11px;color:var(--text2)">بن/ت ${par.name}</span>` : ''}
    </div>`;
  }).join('');
  el.style.display = 'block';
}

function linkParentToPerson(childId, parentId) {
  let child = getPerson(parseInt(childId));
  if (!child) return;
  child.parentId = parseInt(parentId);
  closeModal();
  saveData();
  renderAll();
}

function addNewParentFor(childId) {
  closeModal();
  // Open add modal without parent, then after save link
  window._postAddParentFor = parseInt(childId);
  showEditModal(null, null);
}

// ══════════════════════════════════════════════════════════
//  ─── رسم دليل الاستخدام ───
// ══════════════════════════════════════════════════════════

function renderGuide() {
  const sections = [
    { id: 's1', icon: '➕', title: 'إضافة الأفراد وتعديلهم', html: `
<p><strong>إضافة جذر (جد كبير):</strong> اضغط "+ إضافة فرد" في الشريط العلوي.</p>
<p><strong>إضافة ابن/ابنة:</strong> اضغط زر <code>+</code> بجانب اسم الوالد.</p>
<p><strong>إدراج ابن في مكان محدد:</strong> اضغط <code>⇅</code> لفتح نافذة الترتيب.</p>
<p><strong>إضافة عدة أبناء دفعة واحدة:</strong> في نافذة التعديل، قسم "الأبناء"، اضغط "+ إضافة" مرات متعددة.</p>
<p><strong>الترتيب:</strong> اضغط <code>⇅</code> — سحب أو أسهم ▲▼ لإعادة الترتيب.</p>` },

    { id: 's11', icon: '🏠', title: 'الزوج من خارج العائلة', html: `
<p><strong>المبدأ:</strong> كل زوج/ة يُحفظ كشخص حقيقي، لكن "الخارجي" لا يظهر في الشجرة الرئيسية.</p>
<h4>خطوات إضافة زوج خارجي:</h4>
<ol><li>افتح تعديل ✏ البنت ← قسم <strong>"الأزواج / الزوجات"</strong></li>
<li>اضغط <strong>+ إضافة زوج/ة</strong> وأدخل بياناته</li>
<li>تأكد أن ☑ <strong>"من خارج العائلة"</strong> مفعّل</li></ol>` },

    { id: 's2', icon: '🏷️', title: 'اللقب / اسم العائلة', html: `
<p><strong>وراثة تلقائية:</strong> عند إضافة ابن، يُملأ اللقب من الوالد — يمكن تعديله.</p>
<p><strong>تطبيق على فرع كامل:</strong> اكتب اللقب ثم اضغط <strong>"تطبيق على الفرع ↓"</strong>.</p>` },

    { id: 's5', icon: '🔗', title: 'كاشف القرابة', html: `
<p><strong>الاستخدام:</strong> تبويب "كاشف القرابة" ← اختر شخصَين ← اضغط 🔍 اكتشف القرابة.</p>
<p><strong>شرط عمل الخال/الخالة:</strong> يجب تسجيل الأم كشخص في الشجرة وربطها بحقل "الأم من الشجرة".</p>` },

    { id: 's6', icon: '👤', title: 'أنا في الشجرة', html: `
<p>اضغط 👤 في الشريط وحدد اسمك. تظهر بادجة ملونة بجانب كل اسم:</p>
<ul><li>🟢 أخضر = قريب مباشر</li><li>🔵 أزرق = قريب قريب</li><li>🟡 أصفر = قريب بعيد</li></ul>` },

    { id: 's7', icon: '💾', title: 'الحفظ والنسخ الاحتياطي', html: `
<p><strong>تلقائي محلياً:</strong> كل تغيير يُحفظ في المتصفح فوراً.</p>
<p><strong>💾 حفظ نسخة:</strong> ملف HTML يحتوي كل البيانات — افتحه في أي جهاز.</p>
<p><strong>📤 تصدير JSON:</strong> نسخة احتياطية خفيفة.</p>
<p><strong>📥 استيراد:</strong> يقبل HTML و JSON — استبدال كامل أو دمج آمن.</p>` },

    { id: 's8', icon: '🔍', title: 'البحث', html: `
<p>يبحث في: الاسم، الأب، الجد، الأم، اللقب، الزوج/ة. النتائج مرتّبة بالدقة.</p>
<p><strong>Esc:</strong> يُغلق نتائج البحث ويُبقي الشجرة مفتوحة.</p>` },
  ];

  let html = `<div style="max-width:700px;margin:0 auto;padding:4px">`;
  let visibleSections = IS_FAMILY_COPY ? sections.filter(s => s.id !== 's_cloud' && s.id !== 's_family') : sections;
  visibleSections.forEach(s => {
    html += `<details style="margin-bottom:6px;border:1px solid var(--card-border);border-radius:8px;overflow:hidden" id="${s.id}">
      <summary style="padding:10px 14px;cursor:pointer;font-size:13px;font-weight:500;color:var(--text);display:flex;align-items:center;gap:8px;background:var(--card-bg)">
        <span>${s.icon}</span>${s.title}<span style="margin-right:auto;font-size:11px;color:var(--text2)">▼</span>
      </summary>
      <div style="padding:10px 14px;font-size:13px;color:var(--text);line-height:1.8;border-top:1px solid var(--card-border);background:var(--color-background-secondary,#f9fafb)">${s.html}</div>
    </details>`;
  });
  html += `</div>`;
  document.getElementById('guidePanel').innerHTML = html;
  let first = document.getElementById('s1');
  if (first) first.open = true;
}

// ── Photo zoom utility ──
function zoomPhoto(src, name) {
  let ov = document.createElement('div');
  ov.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.92);display:flex;flex-direction:column;align-items:center;justify-content:center;z-index:9998;cursor:pointer;gap:14px;padding:20px;';
  let nameHtml = name ? `<div style="color:rgba(255,255,255,.9);font-size:15px;font-weight:600">${name}</div>` : '';
  ov.innerHTML = `<img src="${src}" style="max-width:min(480px,90vw);max-height:72vh;border-radius:16px;box-shadow:0 16px 60px rgba(0,0,0,.7);object-fit:contain;cursor:default" onclick="event.stopPropagation()">${nameHtml}<div style="color:rgba(255,255,255,.4);font-size:12px">اضغط خارج الصورة للإغلاق · ESC</div>`;
  ov.onclick = () => ov.remove();
  let esc = e => { if (e.key === 'Escape') { ov.remove(); document.removeEventListener('keydown', esc); } };
  document.addEventListener('keydown', esc);
  document.body.appendChild(ov);
}

// ── Reorder Children ──
function openReorderModal(parentId) {
  reorderParentId = parentId;
  let parent = getPerson(parentId);
  reorderList = getChildren(parentId).map((c, i) => ({
    id: c.id, name: c.name, familyName: c.familyName || '', gender: c.gender,
    deceased: c.deceased, sortOrder: c.sortOrder != null ? c.sortOrder : i
  }));
  reorderList.forEach((c, i) => c.sortOrder = i);
  renderReorderModal(parent);
}

function renderReorderModal(parent) {
  let pName = parent ? parent.name : '';
  let rows = reorderList.map((ch, i) => {
    let gDot = `<div class="gender-dot ${ch.gender === 'male' ? 'male-dot' : 'female-dot'}" style="width:8px;height:8px;border-radius:50%;flex-shrink:0"></div>`;
    let decIcon = ch.deceased ? `<span style="display:inline-flex">${crescent('#2e7d32')}</span>` : '';
    let sub = ch.familyName ? `<span class="reorder-sub"> (${ch.familyName})</span>` : '';
    return `
    <div class="insert-zone" id="iz-${i}">
      <hr><button class="insert-btn" onclick="insertChildAt(${i})">+ إدراج ابن هنا</button><hr>
    </div>
    <div class="reorder-item" id="ri-${i}" draggable="true"
      ondragstart="dragStart(${i})" ondragover="dragOver(event,${i})" ondrop="dropOn(${i})" ondragleave="dragLeave(${i})" ondragend="dragEnd()">
      <span class="reorder-handle">⠿</span>
      ${gDot}
      <div style="flex:1;min-width:0"><span class="reorder-name">${ch.name}</span>${sub}${decIcon}</div>
      <div class="reorder-arrows">
        <button onclick="moveChild(${i},-1)" ${i === 0 ? 'disabled' : ''}>▲</button>
        <button onclick="moveChild(${i},+1)" ${i === reorderList.length - 1 ? 'disabled' : ''}>▼</button>
      </div>
    </div>`;
  }).join('');
  rows += `<div class="insert-zone" id="iz-${reorderList.length}">
    <hr><button class="insert-btn" onclick="insertChildAt(${reorderList.length})">+ إدراج ابن في النهاية</button><hr>
  </div>`;

  let modal = `<div class="modal-overlay" onclick="if(event.target===this)closeModal()">
  <div class="modal" style="max-width:460px;">
    <h3>ترتيب أبناء: ${pName}</h3>
    <p style="font-size:12px;color:var(--text2);margin-bottom:12px;">اسحب ↕ أو استخدم أسهم ▲▼. اضغط "+ إدراج" لإضافة ابن في مكان محدد.</p>
    <div id="reorderList">${rows}</div>
    <div class="modal-footer">
      <button class="btn" onclick="closeModal()">إلغاء</button>
      <button class="btn primary" onclick="saveReorder()">✓ حفظ الترتيب</button>
    </div>
  </div></div>`;
  document.getElementById('modalContainer').innerHTML = modal;
  _androidBackGuardModalOpen();
}

function moveChild(idx, dir) {
  let newIdx = idx + dir;
  if (newIdx < 0 || newIdx >= reorderList.length) return;
  [reorderList[idx], reorderList[newIdx]] = [reorderList[newIdx], reorderList[idx]];
  reorderList.forEach((c, i) => c.sortOrder = i);
  let parent = getPerson(reorderParentId);
  renderReorderModal(parent);
}

function dragStart(idx) { dragSrcIdx = idx; setTimeout(() => { let el = document.getElementById('ri-' + idx); if (el) el.classList.add('dragging'); }, 0); }
function dragOver(e, idx) { e.preventDefault(); let el = document.getElementById('ri-' + idx); if (el && dragSrcIdx !== idx) el.classList.add('drag-over'); }
function dragLeave(idx) { let el = document.getElementById('ri-' + idx); if (el) el.classList.remove('drag-over'); }
function dragEnd() { document.querySelectorAll('.reorder-item').forEach(el => el.classList.remove('dragging', 'drag-over')); dragSrcIdx = null; }
function dropOn(idx) {
  if (dragSrcIdx === null || dragSrcIdx === idx) return;
  let item = reorderList.splice(dragSrcIdx, 1)[0];
  let newIdx = dragSrcIdx < idx ? idx - 1 : idx;
  reorderList.splice(newIdx + 1, 0, item);
  reorderList.forEach((c, i) => c.sortOrder = i);
  dragSrcIdx = null;
  let parent = getPerson(reorderParentId);
  renderReorderModal(parent);
}

function insertChildAt(pos) {
  closeModal();
  currentAddParentId = reorderParentId;
  let par = getPerson(reorderParentId);
  window._editGender = par ? par.gender : 'male';
  window._inheritedFamilyName = par ? (par.childrenFamilyName || par.familyName || '') : '';
  window._insertAtPos = pos;
  showEditModal(null, reorderParentId);
}

function saveReorder() {
  reorderList.forEach((ch, i) => { let p = getPerson(ch.id); if (p) p.sortOrder = i; });
  saveData(); renderAll(); closeModal();
}
