// ══════════════════════════════════════════════════════════════════════════
// نظام مراجعة تحديثات العائلة المحسَّن — مراجعة قبل الدمج الانتقائي
// ══════════════════════════════════════════════════════════════════════════

const _FIELD_LABELS_AR = {
  name: 'الاسم',
  familyName: 'اللقب / العائلة',
  title: 'اللقب الشرفي',
  gender: 'الجنس',
  dob: 'تاريخ الميلاد',
  dod: 'تاريخ الوفاة',
  deceased: 'الحالة (متوفى)',
  parentId: 'الوالد (ID)',
  fatherId: 'الأب (ID)',
  motherId: 'الأم (ID)',
  fatherName: 'اسم الأب',
  motherName: 'اسم الأم',
  notes: 'ملاحظات',
  spouses: 'الأزواج',
  sortOrder: 'الترتيب',
  childrenFamilyName: 'لقب الأبناء',
  isExternal: 'خارجي',
};

function _fvFormatVal(v) {
  if (v === null || v === undefined || v === '') return '—';
  if (typeof v === 'boolean') return v ? 'نعم' : 'لا';
  if (Array.isArray(v)) {
    if (!v.length) return '—';
    return v.map(s => (s && s.name) ? s.name : JSON.stringify(s)).join('، ');
  }
  if (typeof v === 'object') {
    try { return JSON.stringify(v); } catch (e) { return String(v); }
  }
  return String(v);
}

function _fvDiffPerson(local, remote) {
  const IGNORE = new Set(['id', 'photo', 'isExternal', 'sortOrder', '_meta', 'uploadedAt', 'updatedAt', 'createdAt', '__meta']);
  const diffs = [];
  const allKeys = new Set([...(Object.keys(local || {})), ...(Object.keys(remote || {}))]);

  allKeys.forEach(k => {
    if (IGNORE.has(k)) return;

    if (k === 'spouses') {
      const la = (local.spouses || []).map(s => s && s.name ? s.name : '').filter(Boolean).sort().join('، ');
      const ra = (remote.spouses || []).map(s => s && s.name ? s.name : '').filter(Boolean).sort().join('، ');
      if (la !== ra) diffs.push({ field: k, label: 'الأزواج', old: la || '—', new_: ra || '—' });
      return;
    }

    const lv = (local || {})[k];
    const rv = (remote || {})[k];
    if (JSON.stringify(lv) !== JSON.stringify(rv)) {
      diffs.push({
        field: k,
        label: _FIELD_LABELS_AR[k] || k,
        old: _fvFormatVal(lv),
        new_: _fvFormatVal(rv),
      });
    }
  });

  return diffs;
}

function _fvBuildDiffTable(diffs) {
  if (!diffs.length) {
    return '<div style="font-size:12px;color:var(--color-text-secondary);padding:8px 0">لا توجد فروقات محددة</div>';
  }

  const rows = diffs.map(d => `
    <tr>
      <td style="padding:5px 8px;font-size:12px;color:var(--color-text-secondary);white-space:nowrap;border-bottom:0.5px solid var(--color-border-tertiary)">${d.label}</td>
      <td style="padding:5px 8px;font-size:12px;color:var(--color-text-danger);border-bottom:0.5px solid var(--color-border-tertiary);max-width:120px;word-break:break-word">
        <span style="text-decoration:line-through;opacity:0.7">${d.old}</span>
      </td>
      <td style="padding:5px 8px;font-size:13px;font-weight:500;color:var(--color-text-success);border-bottom:0.5px solid var(--color-border-tertiary);max-width:140px;word-break:break-word">${d.new_}</td>
    </tr>`).join('');

  return `<table style="width:100%;border-collapse:collapse">
    <thead>
      <tr>
        <th style="padding:4px 8px;font-size:11px;font-weight:500;color:var(--color-text-secondary);text-align:right;border-bottom:0.5px solid var(--color-border-tertiary)">الحقل</th>
        <th style="padding:4px 8px;font-size:11px;font-weight:500;color:var(--color-text-danger);text-align:right;border-bottom:0.5px solid var(--color-border-tertiary)">قبل</th>
        <th style="padding:4px 8px;font-size:11px;font-weight:500;color:var(--color-text-success);text-align:right;border-bottom:0.5px solid var(--color-border-tertiary)">بعد</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>`;
}

function _fvSwitchTab(tab, idx) {
  const newPanel = document.getElementById('fvpanel_new');
  const updPanel = document.getElementById('fvpanel_upd');
  const tabNew = document.getElementById('fvtab_new');
  const tabUpd = document.getElementById('fvtab_upd');
  if (newPanel) newPanel.style.display = tab === 'new' ? 'block' : 'none';
  if (updPanel) updPanel.style.display = tab === 'upd' ? 'block' : 'none';
  if (tabNew) {
    tabNew.style.color = tab === 'new' ? 'var(--color-text-info)' : 'var(--color-text-secondary)';
    tabNew.style.borderBottom = tab === 'new' ? '2px solid var(--color-border-info)' : 'none';
  }
  if (tabUpd) {
    tabUpd.style.color = tab === 'upd' ? 'var(--color-text-info)' : 'var(--color-text-secondary)';
    tabUpd.style.borderBottom = tab === 'upd' ? '2px solid var(--color-border-info)' : 'none';
  }
}

function _fvSelectAll(idx, val) {
  window._fvSelections = window._fvSelections || {};
  const u = window._familyUpdates && window._familyUpdates[idx];
  if (!u || !u.summary) return;
  const sel = window._fvSelections[idx] || (window._fvSelections[idx] = {});
  (u.summary.newPeople || []).forEach(p => { sel[`new_${p.id}`] = !!val; });
  (u.summary.updatedPeople || []).forEach(x => { sel[`upd_${x.remote.id}`] = !!val; });
  document.querySelectorAll(`[id^="fvsel_${idx}_"]`).forEach(cb => { cb.checked = !!val; });
  _fvUpdateMergeSummary(idx);
}

function _fvSelectNewOnly(idx) {
  window._fvSelections = window._fvSelections || {};
  const u = window._familyUpdates && window._familyUpdates[idx];
  if (!u || !u.summary) return;
  const sel = window._fvSelections[idx] || (window._fvSelections[idx] = {});
  (u.summary.newPeople || []).forEach(p => { sel[`new_${p.id}`] = true; });
  (u.summary.updatedPeople || []).forEach(x => { sel[`upd_${x.remote.id}`] = false; });
  document.querySelectorAll(`[id^="fvsel_${idx}_new_"]`).forEach(cb => { cb.checked = true; });
  document.querySelectorAll(`[id^="fvsel_${idx}_upd_"]`).forEach(cb => { cb.checked = false; });
  _fvUpdateMergeSummary(idx);
}

function _fvSelectUpdOnly(idx) {
  window._fvSelections = window._fvSelections || {};
  const u = window._familyUpdates && window._familyUpdates[idx];
  if (!u || !u.summary) return;
  const sel = window._fvSelections[idx] || (window._fvSelections[idx] = {});
  (u.summary.newPeople || []).forEach(p => { sel[`new_${p.id}`] = false; });
  (u.summary.updatedPeople || []).forEach(x => { sel[`upd_${x.remote.id}`] = true; });
  document.querySelectorAll(`[id^="fvsel_${idx}_new_"]`).forEach(cb => { cb.checked = false; });
  document.querySelectorAll(`[id^="fvsel_${idx}_upd_"]`).forEach(cb => { cb.checked = true; });
  _fvUpdateMergeSummary(idx);
}

function _fvUpdateMergeSummary(idx) {
  const u = window._familyUpdates && window._familyUpdates[idx];
  if (!u || !u.summary) return;

  const sel = (window._fvSelections && window._fvSelections[idx]) || {};
  const acceptedNew = (u.summary.newPeople || []).filter(p => sel[`new_${p.id}`]).length;
  const acceptedUpd = (u.summary.updatedPeople || []).filter(x => sel[`upd_${x.remote.id}`]).length;
  const el = document.getElementById(`fv_merge_summary_${idx}`);
  if (!el) return;

  if (acceptedNew + acceptedUpd === 0) {
    el.innerHTML = '<span style="color:var(--color-text-warning)">⚠️ لم تُحدد أي عناصر للدمج</span>';
    return;
  }

  el.innerHTML = `سيُدمج: <strong style="color:var(--color-text-success)">${acceptedNew} جديد</strong> + <strong style="color:var(--color-text-info)">${acceptedUpd} تحديث</strong>`;
}

function _fvExecuteSelectiveMerge(idx) {
  const u = window._familyUpdates && window._familyUpdates[idx];
  if (!u || !u.data) return;

  window._fvSelections = window._fvSelections || {};
  const sel = window._fvSelections[idx] || (window._fvSelections[idx] = {});
  const summary = u.summary || _familySummarizeUpdate(u.data);

  const newToAdd = (summary.newPeople || []).filter(p => sel[`new_${p.id}`]);
  const updToApply = (summary.updatedPeople || []).filter(x => sel[`upd_${x.remote.id}`]);
  const total = newToAdd.length + updToApply.length;

  if (!total) {
    alert('لم تُحدد أي عناصر للدمج');
    return;
  }

  if (!confirm(
    `تأكيد الدمج الانتقائي:\n` +
    `➕ ${newToAdd.length} شخص جديد سيُضاف\n` +
    `🔄 ${updToApply.length} شخص ستُحدَّث بياناته\n\n` +
    `هل أنت متأكد؟`
  )) return;

  const incoming = Array.isArray(u.data.people) ? u.data.people : [];
  const incomingMap = summary.incomingMap || _familyIncomingMap(u.data);
  const localIds = new Set((people || []).map(p => p && p.id).filter(v => v != null));
  const selectedIds = new Set();
  const selectedPeople = [];

  const addSelected = (p) => {
    if (!p || p.id == null || selectedIds.has(p.id)) return;
    selectedIds.add(p.id);
    selectedPeople.push(p);
  };

  newToAdd.forEach(p => addSelected(p));
  updToApply.forEach(x => addSelected(x.remote));

  let grew = true;
  while (grew) {
    grew = false;
    for (const p of selectedPeople.slice()) {
      const depIds = [];
      const pushDep = (id) => {
        if (id == null) return;
        if (selectedIds.has(id)) return;
        if (localIds.has(id)) return;
        depIds.push(id);
      };

      pushDep(p.parentId);
      pushDep(p.fatherId);
      pushDep(p.motherId);

      if (Array.isArray(p.spouses)) {
        p.spouses.forEach(sp => {
          if (!sp || typeof sp !== 'object') return;
          pushDep(sp.personId);
          pushDep(sp.relativeId);
          pushDep(sp.spouseId);
          pushDep(sp.id);
        });
      }

      depIds.forEach(id => {
        const dep = incomingMap.get(id);
        if (dep) {
          addSelected(dep);
          grew = true;
        }
      });
    }
  }

  const selectedSet = new Set(selectedIds);
  const partialData = {
    people: incoming.filter(p => selectedSet.has(p.id)),
    relPairs: Array.isArray(u.data.relPairs)
      ? u.data.relPairs.filter(pair => Array.isArray(pair) && selectedSet.has(pair[0]) && selectedSet.has(pair[1]))
      : [],
    nextId: u.data.nextId || nextId,
  };

  const backup = _cloneMergeState();
  const result = _cloudSmartMerge(partialData, { mode: 'family' });
  _recordMergeHistory({
    source: 'family-update-selective',
    kind: 'selective',
    devId: u.devId,
    added: result.added || 0,
    updated: result.updated || 0,
    note: `دمج انتقائي: ${newToAdd.length} جديد + ${updToApply.length} تحديث`,
    mergeMode: 'family',
  }, backup);

  try { migrateExternalSpouses(); } catch (e) {}
  try { _invalidateAll(); } catch (e) {}
  try { saveData(); } catch (e) {}
  try { renderAll(); } catch (e) {}
  try { updateMyPersonBtn(); } catch (e) {}

  closeModal();
  _showCloudToast(`✅ ${u.devId}: ➕${result.added || 0} جديد · 🔄${result.updated || 0} تحديث`, 'success', 3500);
}

function _fvMergeAll(idx) {
  const u = window._familyUpdates && window._familyUpdates[idx];
  if (!u || !u.data) return;
  const res = _applyFamilyMergeWithHistory(u.data, {
    devId: u.devId,
    kind: 'single',
    note: 'دمج كامل نسخة تحديث عائلة',
    mergeMode: 'family',
  });
  _showCloudToast(`✅ ${u.devId}: +${res.added || 0} جديد، تحديث ${res.updated || 0}`, 'success', 3000);
  closeModal();
}

// ══════════════════════════════════════════════════════════════════════════
// openFamilyUpdateDetails — عرض التفاصيل مع المقارنة والدمج الانتقائي
// ══════════════════════════════════════════════════════════════════════════
function openFamilyUpdateDetails(idx) {
  const u = window._familyUpdates && window._familyUpdates[idx];
  if (!u || !u.data) return;

  const summary = u.summary || _familySummarizeUpdate(u.data);
  const incomingMap = summary.incomingMap || _familyIncomingMap(u.data);

  window._fvSelections = window._fvSelections || {};
  window._fvSelections[idx] = window._fvSelections[idx] || {};

  const newPeople = summary.newPeople || [];
  const updatedPeople = summary.updatedPeople || [];
  const unchangedCount = (summary.unchangedPeople || []).length;

  newPeople.forEach(p => {
    const key = `new_${p.id}`;
    if (window._fvSelections[idx][key] === undefined) window._fvSelections[idx][key] = true;
  });
  updatedPeople.forEach(x => {
    const key = `upd_${x.remote.id}`;
    if (window._fvSelections[idx][key] === undefined) window._fvSelections[idx][key] = true;
  });

  const newHtml = newPeople.length ? newPeople.map((p, i) => {
    const father = p.fatherId != null ? incomingMap.get(p.fatherId) : null;
    const mother = p.motherId != null ? incomingMap.get(p.motherId) : null;
    const fatherName = father ? _familyDisplayName(father) : '—';
    const motherName = mother ? _familyDisplayName(mother) : '—';
    const selKey = `new_${p.id}`;

    return `
      <div style="display:flex;align-items:flex-start;gap:10px;padding:10px 12px;border:0.5px solid var(--color-border-tertiary);border-radius:var(--border-radius-md);margin-bottom:6px;background:var(--color-background-success)">
        <input type="checkbox" id="fvsel_${idx}_new_${i}" ${window._fvSelections[idx][selKey] ? 'checked' : ''}
          onchange="window._fvSelections[${idx}]['new_${p.id}']=this.checked;_fvUpdateMergeSummary(${idx})"
          style="margin-top:2px;accent-color:#3b82f6;flex-shrink:0">
        <div style="flex:1;min-width:0">
          <div style="font-size:13px;font-weight:500;color:var(--color-text-primary)">${_familyDisplayName(p)}</div>
          <div style="font-size:11px;color:var(--color-text-secondary);margin-top:2px;line-height:1.7">الأب: ${fatherName} · الأم: ${motherName} · ${p.gender === 'male' ? 'ذكر' : 'أنثى'}${p.deceased ? ' · متوفى' : ''}</div>
        </div>
        <span style="font-size:10px;padding:2px 7px;border-radius:999px;background:var(--color-background-success);color:var(--color-text-success);border:0.5px solid var(--color-border-success);white-space:nowrap">جديد</span>
      </div>`;
  }).join('') : '<div style="padding:12px;text-align:center;color:var(--color-text-secondary);font-size:13px">لا يوجد أفراد جدد</div>';

  const updHtml = updatedPeople.length ? updatedPeople.map((x, i) => {
    const diffs = _fvDiffPerson(x.local, x.remote);
    const selKey = `upd_${x.remote.id}`;
    const riskLevel = diffs.some(d => ['name', 'parentId', 'fatherId', 'motherId', 'gender'].includes(d.field)) ? 'high' : 'low';
    const riskBadge = riskLevel === 'high'
      ? '<span style="font-size:10px;padding:2px 7px;border-radius:999px;background:var(--color-background-warning);color:var(--color-text-warning);border:0.5px solid var(--color-border-warning);white-space:nowrap">راجع بعناية</span>'
      : '<span style="font-size:10px;padding:2px 7px;border-radius:999px;background:var(--color-background-info);color:var(--color-text-info);border:0.5px solid var(--color-border-info);white-space:nowrap">تحديث عادي</span>';

    return `
      <div style="border:0.5px solid var(--color-border-tertiary);border-radius:var(--border-radius-md);margin-bottom:8px;overflow:hidden">
        <div style="display:flex;align-items:center;gap:10px;padding:10px 12px;background:var(--color-background-secondary)">
          <input type="checkbox" id="fvsel_${idx}_upd_${i}" ${window._fvSelections[idx][selKey] ? 'checked' : ''}
            onchange="window._fvSelections[${idx}]['upd_${x.remote.id}']=this.checked;_fvUpdateMergeSummary(${idx})"
            style="margin-top:1px;accent-color:#3b82f6;flex-shrink:0">
          <div style="flex:1;min-width:0">
            <div style="font-size:13px;font-weight:500;color:var(--color-text-primary)">${_familyDisplayName(x.remote)}</div>
            <div style="font-size:11px;color:var(--color-text-secondary);margin-top:2px">${diffs.length} حقل متغير</div>
          </div>
          ${riskBadge}
        </div>
        <div style="padding:8px 12px">
          ${_fvBuildDiffTable(diffs)}
        </div>
      </div>`;
  }).join('') : '<div style="padding:12px;text-align:center;color:var(--color-text-secondary);font-size:13px">لا يوجد تحديثات على أفراد موجودين</div>';

  const totalNew = newPeople.length;
  const totalUpd = updatedPeople.length;

  document.getElementById('modalContainer').innerHTML = `
  <div class="modal-overlay" onclick="if(event.target===this)closeModal()">
  <div class="modal" style="max-width:760px;width:min(760px,96vw)">
    <h3 style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:4px">
      🔍 مراجعة تفاصيل التحديث
      <span style="font-size:12px;font-weight:400;color:var(--color-text-secondary);font-family:monospace">${u.devName || u.devId}</span>
    </h3>

    <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px;padding:10px 12px;background:var(--color-background-secondary);border-radius:var(--border-radius-md)">
      <span style="font-size:12px;padding:2px 8px;border-radius:999px;background:var(--color-background-success);color:var(--color-text-success);border:0.5px solid var(--color-border-success)">➕ ${totalNew} جديد</span>
      <span style="font-size:12px;padding:2px 8px;border-radius:999px;background:var(--color-background-info);color:var(--color-text-info);border:0.5px solid var(--color-border-info)">🔄 ${totalUpd} تحديث</span>
      <span style="font-size:12px;padding:2px 8px;border-radius:999px;background:var(--color-background-secondary);color:var(--color-text-secondary);border:0.5px solid var(--color-border-secondary)">⏭ ${unchangedCount} بدون تغيير</span>
    </div>

    <div style="display:flex;gap:6px;margin-bottom:12px;flex-wrap:wrap">
      <button class="btn" style="font-size:11px;padding:4px 10px" onclick="_fvSelectAll(${idx},true)">✅ قبول الكل</button>
      <button class="btn" style="font-size:11px;padding:4px 10px" onclick="_fvSelectAll(${idx},false)">❌ رفض الكل</button>
      <button class="btn" style="font-size:11px;padding:4px 10px;background:#d1fae5;border-color:#10b981;color:#065f46" onclick="_fvSelectNewOnly(${idx})">➕ الجدد فقط (آمن)</button>
      <button class="btn" style="font-size:11px;padding:4px 10px;background:#dbeafe;border-color:#3b82f6;color:#1e40af" onclick="_fvSelectUpdOnly(${idx})">🔄 التحديثات فقط</button>
    </div>

    <div style="display:flex;gap:0;margin-bottom:10px;border-bottom:0.5px solid var(--color-border-tertiary)">
      <button id="fvtab_new" onclick="_fvSwitchTab('new',${idx})"
        style="padding:7px 16px;font-size:13px;font-weight:500;border:none;background:none;color:var(--color-text-info);border-bottom:2px solid currentColor;cursor:pointer">
        ➕ جدد (${totalNew})
      </button>
      <button id="fvtab_upd" onclick="_fvSwitchTab('upd',${idx})"
        style="padding:7px 16px;font-size:13px;font-weight:500;border:none;background:none;color:var(--color-text-secondary);cursor:pointer">
        🔄 تحديثات (${totalUpd})
      </button>
    </div>

    <div id="fvpanel_new" style="max-height:44vh;overflow-y:auto">${newHtml}</div>
    <div id="fvpanel_upd" style="display:none;max-height:44vh;overflow-y:auto">${updHtml}</div>

    <div id="fv_merge_summary_${idx}" style="margin-top:10px;padding:10px 14px;background:var(--color-background-secondary);border-radius:var(--border-radius-md);border:0.5px solid var(--color-border-tertiary);font-size:13px;color:var(--color-text-primary)">
      سيُدمج: <strong>${totalNew}</strong> جديد + <strong>${totalUpd}</strong> تحديث
    </div>

    <div class="modal-footer" style="flex-wrap:wrap;gap:6px;margin-top:10px">
      <button class="btn" onclick="closeModal();openFamilyUpdatesModal()">◀ رجوع</button>
      <button class="btn primary" style="background:#059669;border-color:#059669" onclick="_fvExecuteSelectiveMerge(${idx})">✔ دمج المحدَّد</button>
    </div>
  </div>
  </div>`;

  _fvSwitchTab('new', idx);
  _fvUpdateMergeSummary(idx);
}

function confirmFamilyMerge(idx) {
  const u = window._familyUpdates && window._familyUpdates[idx];
  if (!u || !u.data) return;
  const st = u.summary || _familySummarizeUpdate(u.data);
  const hasUpdates = (st.updatedPeople || []).length > 0;

  const warningHtml = hasUpdates ? `
    <div style="padding:10px 12px;background:var(--color-background-warning);border:0.5px solid var(--color-border-warning);border-radius:var(--border-radius-md);font-size:12px;color:var(--color-text-warning);margin-bottom:12px;line-height:1.7">
      ⚠️ يوجد <strong>${st.updatedPeople.length}</strong> شخص محدَّث — يُنصح بمراجعة التفاصيل قبل الدمج لضمان دقة البيانات.
    </div>` : '';

  document.getElementById('modalContainer').innerHTML = `
  <div class="modal-overlay" onclick="if(event.target===this)closeModal()">
  <div class="modal" style="max-width:480px">
    <h3 style="margin-bottom:4px">تأكيد الدمج</h3>
    <div style="color:var(--color-text-secondary);font-size:12px;margin-bottom:12px">الجهاز: ${u.devName || u.devId}</div>
    ${warningHtml}
    <div style="line-height:2;font-size:14px;color:var(--color-text-primary);margin-bottom:12px">
      ➕ <strong style="color:var(--color-text-success)">${st.newPeople.length}</strong> أشخاص جدد سيُضافون<br>
      🔄 <strong style="color:var(--color-text-info)">${st.updatedPeople.length}</strong> أشخاص ستُحدَّث بياناتهم<br>
      ⏭ <strong>${st.unchangedPeople.length}</strong> أشخاص موجودون بدون تغيير
    </div>
    <div class="modal-footer" style="flex-wrap:wrap;gap:6px">
      <button class="btn" onclick="closeModal();openFamilyUpdatesModal()">إلغاء</button>
      ${hasUpdates ? `<button class="btn" style="background:#dbeafe;border-color:#3b82f6;color:#1e40af" onclick="closeModal();openFamilyUpdateDetails(${idx})">🔍 مراجعة التفاصيل أولاً</button>` : ''}
      <button class="btn primary" onclick="_fvMergeAll(${idx})">✔ دمج كل شيء</button>
    </div>
  </div>
  </div>`;
}

function confirmFamilyMergeAll(){
  let updates=(window._familyUpdates||[]).filter(u=>!u.error&&u.data);
  let sums=updates.map(u=>u.summary||_familySummarizeUpdate(u.data));
  let n=sums.reduce((a,s)=>a+s.newPeople.length,0);
  let up=sums.reduce((a,s)=>a+s.updatedPeople.length,0);
  let un=sums.reduce((a,s)=>a+s.unchangedPeople.length,0);
  document.getElementById('modalContainer').innerHTML=`<div class="modal-overlay" onclick="if(event.target===this)closeModal()"><div class="modal" style="max-width:520px">
    <h3>⚠️ تأكيد دمج الكل</h3>
    <div style="line-height:2;font-size:14px;color:var(--text)">
      ➕ ${n} أشخاص جدد سيُضافون<br>
      🔄 ${up} أشخاص ستُحدَّث بياناتهم<br>
      ⏭ ${un} أشخاص موجودون بدون تغيير
    </div>
    <div class="modal-footer">
      <button class="btn primary" onclick="_familyMergeAll()">✔ تأكيد الدمج</button>
      <button class="btn" onclick="closeModal();openFamilyUpdatesModal()">إلغاء</button>
    </div>
  </div></div>`;
}

function deleteFamilyUpdate(idx){
  let u=window._familyUpdates&&window._familyUpdates[idx];
  if(!u||!u.filename)return;
  if(!confirm('هل تريد حذف هذه النسخة من الـ Gist نهائياً؟\nلن يبقى لها أي أثر على الجهاز المصدر.'))return;
  _deleteFamilyUpdateFile(u);
}

async function _deleteFamilyUpdateFile(u){
  let pat=FAMILY_UPLOAD_CONFIG.GITHUB_PAT||localStorage.getItem('ft_fupload_pat')||'';
  let gistId=FAMILY_UPLOAD_CONFIG.GIST_ID||localStorage.getItem(FAMILY_UPLOAD_GIST_KEY)||localStorage.getItem('ft_fupload_gid')||'';
  if(!pat||!gistId){alert('لا يوجد توكن أو Gist لحذف النسخة');return;}
  try{
    let headers={'Authorization':'token '+pat,'Content-Type':'application/json','Accept':'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28'};
    let body={files:{}};
    body.files[u.filename]=null;
    let res=await fetch('https://api.github.com/gists/'+gistId,{method:'PATCH',headers,body:JSON.stringify(body)});
    if(!res.ok)throw new Error('GitHub API: '+res.status);
    window._familyUpdates=(window._familyUpdates||[]).filter(x=>x.filename!==u.filename);
    openFamilyUpdatesModal();
  }catch(e){
    alert('فشل حذف النسخة: '+e.message);
  }
}

function _familyMergeOne(idx){
  let u=window._familyUpdates&&window._familyUpdates[idx];if(!u||!u.data)return;
  let res=_applyFamilyMergeWithHistory(u.data,{devId:u.devId,kind:'single',note:'دمج نسخة تحديث عائلة',mergeMode:'family'});
  _showCloudToast('✅ '+(u.devName||u.devId)+': +'+(res.added||0)+' جديد، تحديث '+(res.updated||0),'success',3000);
  closeModal();
}
function _familyMergeAll(){
  let updates=window._familyUpdates;if(!updates)return;
  let valid=updates.filter(u=>!u.error&&u.data);
  let backup=_cloneMergeState();
  let tA=0,tU=0;
  valid.forEach(u=>{let r=_cloudSmartMerge(u.data,{mode:'family'});tA+=(r.added||0);tU+=(r.updated||0);});
  _recordMergeHistory({source:'family-update-all',kind:'all',devId:'ALL',added:tA,updated:tU,note:'دمج جميع نسخ تحديث العائلة',mergeMode:'family'},backup);
  try{ migrateExternalSpouses(); }catch(e){}
  try{ _invalidateAll(); }catch(e){}
  try{ saveData(); }catch(e){}
  try{ renderAll(); }catch(e){}
  try{ updateMyPersonBtn(); }catch(e){}
  _showCloudToast('✅ دُمج الكل: +'+tA+' جديد، تحديث '+tU,'success',3500);
  closeModal();
}
function _familyDownloadOne(idx){
  let u=window._familyUpdates&&window._familyUpdates[idx];if(!u||!u.data)return;
  let blob=new Blob([JSON.stringify(u.data,null,2)],{type:'application/json'});
  let url=URL.createObjectURL(blob);
  let a=document.createElement('a');
  a.href=url;a.download='family_'+u.devId+'_'+new Date().toISOString().slice(0,10)+'.json';
  document.body.appendChild(a);a.click();
  setTimeout(()=>{document.body.removeChild(a);URL.revokeObjectURL(url);},1500);
}
function downloadFamilyUpdateJSON(){
  let data=window._familyUpdateData;if(!data)return;
  let blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'});
  let url=URL.createObjectURL(blob);
  let a=document.createElement('a');
  let stamp=new Date().toISOString().slice(0,10);
  a.href=url;a.download='family_update_'+stamp+'.json';
  document.body.appendChild(a);a.click();
  setTimeout(()=>{document.body.removeChild(a);URL.revokeObjectURL(url);},1500);
}
function mergeFamilyUpdate(){
  let data=window._familyUpdateData;if(!data)return;
  if(!confirm('دمج بيانات العائلة مع الشجرة الحالية؟\n(الأشخاص الجدد يُضافون، الموجودون يُحدَّثون، لا شيء يُحذف)'))return;
  let res=_applyFamilyMergeWithHistory(data,{devId:'JSON',kind:'single',note:'دمج يدوي من JSON'});
  closeModal();
  _showCloudToast('✅ دُمج: +'+(res.added||0)+' جديد، تحديث '+(res.updated||0)+' موجود','success',3500);
}
function replaceFamilyUpdate(){
  let data=window._familyUpdateData;if(!data)return;
  if(!confirm('⚠️ استبدال كامل: سيُحذف كل شيء في الشجرة الحالية ويُستبدل ببيانات العائلة.\nهذا لا يمكن التراجع عنه — متأكد؟'))return;
  people=data.people;nextId=data.nextId||1;relPairs=data.relPairs||[];
  if(data.myPersonId){myPersonId=parseInt(data.myPersonId);saveMyPerson();}
  expanded={};people.forEach(p=>{expanded[p.id]=false;});
  migrateExternalSpouses();if(people.length)expanded[people[0].id]=true;
  _invalidateAll();
  saveData();renderAll();updateMyPersonBtn();
  closeModal();
  _showCloudToast('✅ تم الاستبدال الكامل ('+people.length+' فرد)','success',3000);
}

// ══════════════════════════════════════════════════════════
//  بانر الجهاز الجديد + استعادة تلقائية ذكية
// ══════════════════════════════════════════════════════════
function _showNewDeviceBanner(){
  if(document.getElementById('newDeviceBanner'))return;
  var b=document.createElement('div');
  b.id='newDeviceBanner';
  b.style.cssText='position:fixed;bottom:20px;left:50%;transform:translateX(-50%);'
    +'background:linear-gradient(135deg,#1e40af,#3b82f6);color:#fff;'
    +'padding:13px 18px;border-radius:14px;font-size:13px;z-index:9999;'
    +'display:flex;align-items:center;gap:10px;flex-wrap:wrap;'
    +'box-shadow:0 6px 24px rgba(0,0,0,.35);max-width:calc(100vw - 32px);'
    +'text-align:right;direction:rtl;';
  b.innerHTML='<span>☁️ <strong>جهاز جديد</strong> — يوجد بيانات في السحابة</span>'
    +'<button onclick="_autoRestoreFromCloud()" style="background:#fff;color:#1e40af;'
    +'border:none;border-radius:8px;padding:6px 12px;font-size:12px;'
    +'cursor:pointer;font-weight:700;white-space:nowrap">⬇️ تحميل الآن</button>'
    +'<button onclick="document.getElementById(\'newDeviceBanner\').remove()" '
    +'style="background:rgba(255,255,255,.2);color:#fff;border:none;'
    +'border-radius:6px;padding:5px 9px;font-size:12px;cursor:pointer">✕</button>';
  document.body.appendChild(b);
}
async function _autoRestoreFromCloud(){
  var b=document.getElementById('newDeviceBanner');
  if(b)b.remove();
  _imgSyncForcePhotos=true;
  var d=await cloudLoad();
  _imgSyncForcePhotos=false;
  if(!d)return;
  var res=_cloudSmartMerge(d);
  migrateExternalSpouses();_invalidateAll();
  _markDeviceInit();
  saveData();
  // ── تأكيد حفظ الصور في IDB منفصلاً بعد الاستعادة التلقائية ──
  await _persistPhotosToIDB();
  renderAll();updateMyPersonBtn();
  _showCloudToast('✅ تم التحميل: +'+res.added+' شخص، تحديث '+res.updated,'success',4000);
}

function _showCloudToast(msg,type,duration){
  let t=document.getElementById('cloudToast');if(!t)return;
  let colors={info:{bg:'#1e40af',color:'#fff'},success:{bg:'#15803d',color:'#fff'},error:{bg:'#dc2626',color:'#fff'},syncing:{bg:'#7c3aed',color:'#fff'}};
  let c=colors[type]||colors.info;
  t.style.background=c.bg;t.style.color=c.color;t.innerHTML=msg;
  t.style.boxShadow='0 4px 16px rgba(0,0,0,.2)';
  t.style.opacity='1';
  clearTimeout(window._cloudToastTimer);
  if(duration>0)window._cloudToastTimer=setTimeout(()=>{t.style.opacity='0';},duration);
}

function _updateCloudBtn(state){
  let btn=document.getElementById('cloudSyncBtn');
  if(!btn)return;
  if(state==='syncing'){btn.innerHTML='🔄 جارٍ الرفع...';btn.disabled=true;}
  else if(state==='ok'){btn.innerHTML='☁️ محفوظ ✓';btn.disabled=false;}
  else if(state==='error'){btn.innerHTML='☁️ خطأ — أعد المحاولة';btn.disabled=false;}
  else{btn.innerHTML='☁️ مزامنة';btn.disabled=false;}
}

// ── رفع إلى السحابة ──
async function cloudSave(){
  if(!_isCloudConfigured()||_cloudSyncing)return;
  _cloudSyncing=true;
  _updateCloudBtn('syncing');

  // ── بناء خريطة الصور وتحقق من صحتها ──
  let photosMap=_buildPhotosMap();
  let photoCount=Object.keys(photosMap).length;
  let sizeKB=Math.round(Object.values(photosMap).reduce((s,v)=>s+v.length*0.75/1024,0));
  let sizeLabel=sizeKB>1024?`${(sizeKB/1024).toFixed(1)} MB`:`${sizeKB} KB`;

  // تحذير إذا حجم الصور أكبر من 8MB (قرب حد Gist)
  if(sizeKB>8000){
    let cont=confirm(`⚠️ حجم الصور كبير (${sizeLabel}).
قد يفشل الرفع إذا تجاوز 10MB.
هل تريد المتابعة؟`);
    if(!cont){_cloudSyncing=false;_updateCloudBtn('ok');return;}
  }

  _showCloudToast(`🔄 جارٍ الرفع${photoCount?` (${photoCount} صورة، ${sizeLabel})`:''}...`,'syncing',0);
  try{
    // ── ١. ملف البيانات بدون صور ──
    let dataNoPhotos=JSON.parse(JSON.stringify({people,relPairs,nextId,myPersonId:myPersonId||null}));
    dataNoPhotos.people.forEach(p=>{delete p.photo;});
    let encData=await cloudEncrypt(JSON.stringify(dataNoPhotos));

    // ── ٢. ملف الصور المشفّر ──
    let encPhotos=photoCount>0?await cloudEncrypt(JSON.stringify(photosMap)):null;

    // ── ٣. رفع في طلب واحد ──
    let filesObj={[CLOUD_CONFIG.GIST_FILE]:{content:encData}};
    if(encPhotos)filesObj[CLOUD_PHOTOS_FILE]={content:encPhotos};

    let gistId=localStorage.getItem(CLOUD_GIST_KEY)||CLOUD_CONFIG.GIST_ID||'';
    if(gistId){
      try{ await _gistUpdate(gistId,filesObj); }
      catch(e){
        // Gist محذوف أو خطأ → أنشئ جديداً
        console.warn('[IMG-SYNC] Update failed, creating new gist:',e.message);
        gistId=await _gistCreate(filesObj);
        localStorage.setItem(CLOUD_GIST_KEY,gistId);
        CLOUD_CONFIG.GIST_ID=gistId;
      }
    } else {
      gistId=await _gistCreate(filesObj);
      localStorage.setItem(CLOUD_GIST_KEY,gistId);
      CLOUD_CONFIG.GIST_ID=gistId;
    }

    // ── ٤. تحقق: هل الملفات وصلت فعلاً؟ ──
    try{
      let verifyFiles=await _gistFetchAllFiles(gistId);
      let dataOk=!!verifyFiles[CLOUD_CONFIG.GIST_FILE];
      let photoOk=!encPhotos||!!verifyFiles[CLOUD_PHOTOS_FILE];
      if(!dataOk){ throw new Error('التحقق فشل: ملف البيانات غير موجود بعد الرفع'); }
      if(!photoOk){ throw new Error('التحقق فشل: ملف الصور غير موجود بعد الرفع'); }
      console.debug('[IMG-SYNC] Verification OK — data:'+dataOk+' photos:'+photoOk);
    }catch(ve){
      // فشل التحقق — تحذير لكن لا نعتبره فشلاً كاملاً
      console.warn('[IMG-SYNC] Post-upload verify warning:',ve.message);
    }

    // ── ٥. تحديث hashes ──
    let newHashes=_getSyncedHashes();
    Object.keys(photosMap).forEach(id=>{ newHashes[id]=photosMap[id].length; });
    _saveSyncedHashes(newHashes);

    let doneMsg=`☁️ تم الرفع ✓ · ${people.length} فرد${photoCount?' · '+photoCount+' صورة':''}`;
    _showCloudToast(doneMsg,'success',3000);
    _updateCloudBtn('ok');
    console.debug('[IMG-SYNC] cloudSave complete — photos:'+photoCount+' size:'+sizeLabel);
  }catch(e){
    console.warn('[CloudSave]',e);
    let msg=e.message||'خطأ';
    if(msg.includes('503')||msg.includes('502'))msg='GitHub غير متاح مؤقتاً — أعد المحاولة';
    else if(msg.includes('401')||msg.includes('403'))msg='خطأ مصادقة — تحقق من التوكن';
    else if(msg.includes('413')||msg.includes('too large'))msg='الملف أكبر من حد GitHub — قلّل حجم الصور';
    _showCloudToast('❌ فشل الرفع: '+msg,'error',5000);
    _updateCloudBtn('error');
  }finally{_cloudSyncing=false;}
}

// ── مساعد: قاموس hash الصور المُرفوعة ──
const CLOUD_PHOTO_HASHES_KEY='ft_cloud_photo_hashes_v2';

function _getSyncedHashes(){
  try{
    const parsed = JSON.parse(localStorage.getItem(CLOUD_PHOTO_HASHES_KEY) || '{}');
    if (!parsed || typeof parsed !== 'object') return {};
    return parsed;
  }catch(e){
    return {};
  }
}

function _saveSyncedHashes(h){
  try{
    localStorage.setItem(CLOUD_PHOTO_HASHES_KEY, JSON.stringify(h || {}));
  }catch(e){}
}

function _ftStoredPhotoSize(entry){
  if (entry && typeof entry === 'object') {
    return Number(entry.size || entry.length || 0) || 0;
  }
  return Number(entry || 0) || 0;
}


async function cloudLoad(forcePhotos){
  if(!_isCloudConfigured())return false;
  let gistId=localStorage.getItem(CLOUD_GIST_KEY)||CLOUD_CONFIG.GIST_ID||'';
  if(!gistId)return false;
  if(!localStorage.getItem(CLOUD_GIST_KEY))try{localStorage.setItem(CLOUD_GIST_KEY,gistId);}catch(e){}
  try{
    _showCloudToast('🔄 جارٍ التحميل من السحابة...','syncing',0);
    // ── طلب واحد يجلب كل الملفات (بيانات + صور) ──
    let gistFiles=await _gistFetchAllFiles(gistId);
    let imgLog={loaded:0,updated:0,kept:0,missing:0};

    // ── ١. ملف البيانات الرئيسية ──
    let enc=gistFiles[CLOUD_CONFIG.GIST_FILE];
    if(!enc)throw new Error('ملف البيانات غير موجود في السحابة');
    let d=JSON.parse(await cloudDecrypt(enc.trim()));
    if(!d.people||!Array.isArray(d.people))throw new Error('بيانات غير صالحة');

    // ── ٢. ملف الصور — يدعم chunks الجديدة والملف القديم ──
    try{
      let encP=gistFiles[CLOUD_PHOTOS_FILE];
      let cloudPhotos=null;

      if(encP&&encP.startsWith('CHUNKED_V2')){
        // نظام chunks الجديد: ft_photos.dat يحتوي 'CHUNKED_V2_chunks=N'
        let m=encP.match(/CHUNKED_V2_chunks=([0-9]+)/);
        let n=m?parseInt(m[1]):0;
        if(n>0){
          cloudPhotos={};
          for(let i=0;i<n;i++){
            let chunkKey='ft_photos_'+i+'.dat';
            let chunkEnc=gistFiles[chunkKey];
            if(chunkEnc&&chunkEnc.length>10&&!chunkEnc.startsWith('RESET_')){
              try{
                let chunkData=JSON.parse(await cloudDecrypt(chunkEnc.trim()));
                Object.assign(cloudPhotos,chunkData);
              }catch(ce){console.warn('[IMG] chunk '+i+' decode failed:',ce.message);}
            }
          }
          console.debug('[IMG] Loaded '+Object.keys(cloudPhotos).length+' photos from '+n+' chunks');
        }
      } else if(encP&&encP.length>10&&!encP.startsWith('RESET_')){
        // ملف قديم غير مقسّم (للتوافق مع رفعات سابقة)
        try{cloudPhotos=JSON.parse(await cloudDecrypt(encP.trim()));}
        catch(e){console.warn('[IMG] legacy photo decode:',e.message);}
      }

      if(cloudPhotos&&typeof cloudPhotos==='object'&&Object.keys(cloudPhotos).length>0){
        let newHashes=_getSyncedHashes();
        d.people.forEach(p=>{
          let cPhoto=cloudPhotos[p.id]||cloudPhotos[String(p.id)];
          if(!cPhoto||typeof cPhoto!=='string'||cPhoto.length<100){imgLog.missing++;return;}
          let localP=people.find(lp=>lp.id===p.id);
          let localPhoto=localP?localP.photo:null;
          if(forcePhotos||!localPhoto){
            p.photo=cPhoto; imgLog.loaded++;
          } else if(localPhoto.length!==cPhoto.length){
            // حجم مختلف = صورة محدَّثة من جهاز آخر → السحابة تفوز
            p.photo=cPhoto; imgLog.updated++;
          } else {
            p.photo=localPhoto; imgLog.kept++;
          }
          newHashes[p.id]=p.photo.length;
        });
        _saveSyncedHashes(newHashes);
        let total=imgLog.loaded+imgLog.updated;
        console.debug('[IMG] Photos — loaded:'+imgLog.loaded+' updated:'+imgLog.updated+' kept:'+imgLog.kept);
        if(total>0)_showCloudToast('☁️ '+total+' صورة محمَّلة من السحابة','info',2500);
      } else {
        console.debug('[IMG] No photos found in cloud');
      }
    }catch(pe){
      console.warn('[IMG-SYNC] Photo load failed:',pe.message);
    }
    return d;
  }catch(e){
    console.warn('[CloudLoad]',e);
    let msg=e.message||'خطأ';
    if(msg.includes('503')||msg.includes('502'))msg='GitHub غير متاح مؤقتاً';
    else if(msg.includes('401')||msg.includes('403'))msg='خطأ مصادقة — تحقق من التوكن';
    else if(msg.includes('429'))msg='تجاوزت حد الطلبات — انتظر دقيقة';
    _showCloudToast('❌ فشل التحميل: '+msg,'error',4000);
    return false;
  }
}

// ── مزامنة يدوية ──
async function manualCloudSync(){
  if(!_isCloudConfigured()){openCloudSetup();return;}
  openCloudSyncPanel();
}

// ── استعادة من السحابة ──
// ════════════════════════════════════════════════════════
// الدمج الذكي
// ════════════════════════════════════════════════════════
function _cloudSmartMerge(cloudData, mergeOptions){
  let opts=mergeOptions||{};
  let mode=(opts.mode||'cloud').toLowerCase(); // cloud | family
  let incoming=(cloudData.people||[]);
  let incomingRel=(cloudData.relPairs||[]);
  let added=0,updated=0;
  let cloudMaxId=incoming.length?Math.max(...incoming.map(p=>p.id)):0;
  if(cloudMaxId>=nextId)nextId=cloudMaxId+1;

  let localMap=new Map((people||[]).map(p=>[p.id,p]));
  let incomingMap=new Map(incoming.map(p=>[p.id,p]));

  function _spouseKey(sp, map){
    return JSON.stringify(_familySpouseIdentity(sp,{personMap:map}));
  }

  function _mergeSpouseEntry(localSp, incomingSp){
    let out=_familyCloneValue(localSp||{});
    let src=incomingSp||{};
    Object.keys(src).forEach(k=>{
      if(k==='photo' || _familyIsIgnoredField(k))return;
      if((k==='personId' || k==='relativeId') && out[k]!=null && out[k]!==undefined)return;
      let v=src[k];
      if(v!==undefined)out[k]=_familyCloneValue(v);
    });
    return out;
  }

  function _mergeSpouseLists(localList,incomingList){
    let store=new Map();
    (Array.isArray(localList)?localList:[]).forEach(sp=>{
      store.set(_spouseKey(sp,localMap), _familyCloneValue(sp));
    });
    (Array.isArray(incomingList)?incomingList:[]).forEach(sp=>{
      let key=_spouseKey(sp,incomingMap);
      if(store.has(key))store.set(key, _mergeSpouseEntry(store.get(key), sp));
      else store.set(key, _familyCloneValue(sp));
    });
    return Array.from(store.values());
  }

  function _mergePersonFields(local, incomingPerson){
    let out=_familyCloneValue(local||{});
    let src=incomingPerson||{};
    Object.keys(src).forEach(k=>{
      if(k==='id' || _familyIsIgnoredField(k))return;
      if(k==='photo'){
        if(mode==='cloud'&&src.photo&&typeof src.photo==='string'&&src.photo.length>100){
          if(!out.photo||out.photo.length!==src.photo.length){out.photo=src.photo;}
        }
        return;
      }
      if(k==='spouses'){
        out.spouses=_mergeSpouseLists(out.spouses||[], src.spouses||[]);
        return;
      }
      let v=src[k];
      if(v!==undefined)out[k]=_familyCloneValue(v);
    });
    if(mode==='family'){
      if(local && local.photo!==undefined)out.photo=local.photo;
      else if(out.photo===undefined)delete out.photo;
    } else {
      if(local && local.photo)out.photo=local.photo;
      else if(src.photo)out.photo=src.photo;
    }
    return out;
  }

  function _findLocal(cp){
    let byId=people.find(lp=>lp.id===cp.id);
    if(byId)return {match:byId,how:'id'};
    let inParent=incoming.find(x=>x.id===cp.parentId);
    let byName=people.find(lp=>{
      if(normalizeAr(lp.name)!==normalizeAr(cp.name))return false;
      if(cp.gender&&lp.gender&&cp.gender!==lp.gender)return false;
      if(inParent){let lp2=getPerson(lp.parentId);return lp2?normalizeAr(lp2.name)===normalizeAr(inParent.name):false;}
      return !cp.parentId&&!lp.parentId;
    });
    if(byName)return {match:byName,how:'name'};
    return null;
  }

  let idMap=new Map();
  let trulyNew=[];
  incoming.forEach(cp=>{
    let found=_findLocal(cp);
    if(found){
      let lp=found.match;
      idMap.set(cp.id, lp.id);
      let merged=_mergePersonFields(lp, cp);
      Object.assign(lp, merged, {id:lp.id});
      updated++;
    } else {
      idMap.set(cp.id, cp.id);
      trulyNew.push(_familyCloneValue(cp));
      added++;
    }
  });

  trulyNew.forEach(cp=>{
    let targetId=cp.id;
    if(people.find(lp=>lp.id===targetId)){
      targetId=nextId++;
      idMap.set(cp.id, targetId);
    }
    if(targetId>=nextId)nextId=targetId+1;
    cp.id=targetId;
    if(mode==='family' && cp.photo!==undefined)delete cp.photo;
    people.push(cp);
    expanded[cp.id]=false;
  });

  trulyNew.forEach(cp=>{
    if(cp.parentId!=null && idMap.has(cp.parentId))cp.parentId=idMap.get(cp.parentId);
    if(cp.motherId!=null && idMap.has(cp.motherId))cp.motherId=idMap.get(cp.motherId);
    if(cp.fatherId!=null && idMap.has(cp.fatherId))cp.fatherId=idMap.get(cp.fatherId);
  });

  incomingRel.forEach(pair=>{
    let a=idMap.has(pair[0])?idMap.get(pair[0]):pair[0];
    let b=idMap.has(pair[1])?idMap.get(pair[1]):pair[1];
    if(!relPairs.some(rp=>(rp[0]===a&&rp[1]===b)||(rp[0]===b&&rp[1]===a)))relPairs.push([a,b]);
  });

  let maxId=Math.max(...people.map(p=>p.id), nextId-1);
  nextId=maxId+1;
  return {added,updated};
}


function _cloneMergeState(){
  return {
    people: JSON.parse(JSON.stringify(people || [])),
    relPairs: JSON.parse(JSON.stringify(relPairs || [])),
    nextId: nextId,
    myPersonId: (typeof myPersonId !== 'undefined' ? myPersonId : null),
    expanded: JSON.parse(JSON.stringify(expanded || {}))
  };
}

function _persistMergeHistory(){
  try{
    sessionStorage.setItem(MERGE_HISTORY_KEY, JSON.stringify(mergeHistory));
  }catch(e1){
    try{
      localStorage.setItem(MERGE_HISTORY_KEY + '_meta', JSON.stringify(
        mergeHistory.map(function(entry){
          let copy = Object.assign({}, entry);
          delete copy.backup;
          return copy;
        })
      ));
    }catch(e2){}
  }
  _refreshMergeHistoryButtons();
}

function _recordMergeHistory(meta, backup){
  let entry = Object.assign({
    id: Date.now() + '_' + Math.random().toString(16).slice(2),
    ts: Date.now(),
    backup: backup
  }, meta || {});
  mergeHistory.unshift(entry);
  if(mergeHistory.length > MERGE_HISTORY_LIMIT) mergeHistory.length = MERGE_HISTORY_LIMIT;
  _persistMergeHistory();
}

function _refreshMergeHistoryButtons(){
  let hasLog = !!(mergeHistory && mergeHistory.length);
  let logBtn = document.getElementById('mergeLogBtn');
  let undoBtn = document.getElementById('undoLastMergeBtn');
  if(logBtn) logBtn.style.display = hasLog ? 'inline-flex' : 'none';
  if(undoBtn) undoBtn.style.display = hasLog ? 'inline-flex' : 'none';
}

function _restoreMergeState(snapshot){
  if(!snapshot) return false;

  people = JSON.parse(JSON.stringify(snapshot.people || []));
  relPairs = JSON.parse(JSON.stringify(snapshot.relPairs || []));
  nextId = snapshot.nextId || 1;
  if(typeof myPersonId !== 'undefined'){
    myPersonId = snapshot.myPersonId || null;
    try{ saveMyPerson(); }catch(e){}
  }
  expanded = JSON.parse(JSON.stringify(snapshot.expanded || {}));

  try{
    migrateExternalSpouses();
  }catch(e){}

  try{ _invalidateAll(); }catch(e){}
  try{ saveData(); }catch(e){}
  try{ renderAll(); }catch(e){}
  try{ updateMyPersonBtn(); }catch(e){}
  return true;
}

function undoLastMerge(){
  if(!mergeHistory.length){
    alert('لا يوجد دمج سابق للاسترجاع');
    return;
  }
  let last = mergeHistory[0];
  if(!last.backup){
    alert('السجل موجود، لكن نسخة الاسترجاع غير متاحة بعد إعادة التحميل.');
    return;
  }
  if(!confirm('سيتم استرجاع الحالة قبل آخر دمج. هل تريد المتابعة؟')) return;

  mergeHistory.shift();
  _restoreMergeState(last.backup);
  _persistMergeHistory();
  if(typeof _showCloudToast === 'function') _showCloudToast('↩ تم استرجاع الحالة قبل آخر دمج','success',2500);
}

function openMergeLogModal(){
  let rows = (mergeHistory || []).map(function(h, idx){
    let ts = h.ts ? new Date(h.ts).toLocaleString('ar-SA', {
      timeZone: 'Asia/Riyadh',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }) : '—';
    let kind = h.kind === 'all' ? 'دمج الكل' : 'دمج نسخة';
    let src = h.devId ? ` · ${h.devId}` : '';
    let counts = `➕ ${h.added || 0} · 🔄 ${h.updated || 0}`;
    let keep = h.backup ? 'قابل للاسترجاع' : 'سجل فقط';
    let color = h.backup ? '#059669' : '#b45309';
    return `
      <div class="sub-item" style="align-items:flex-start;justify-content:space-between;gap:10px">
        <div style="flex:1;min-width:0">
          <div style="font-weight:600;color:var(--text)">${kind}${src}</div>
          <div style="font-size:11px;color:var(--text2);margin-top:3px;line-height:1.7">${ts} · ${counts}</div>
          ${h.note ? `<div style="font-size:11px;color:var(--text2);margin-top:2px">${h.note}</div>` : ''}
        </div>
        <div style="font-size:11px;color:${color};white-space:nowrap">${keep}</div>
      </div>`;
  }).join('');

  if(!rows) rows = '<div class="no-results">لا يوجد سجل دمج بعد</div>';

  document.getElementById('modalContainer').innerHTML = `
    <div class="modal-overlay" onclick="if(event.target===this)closeModal()">
      <div class="modal" style="max-width:760px;width:min(760px,96vw)">
        <h3>📜 سجل الدمج</h3>
        <div style="font-size:12px;color:var(--text2);margin-bottom:10px;line-height:1.7">
          يعرض هذا السجل آخر عمليات الدمج. الاسترجاع يعمل إذا كانت نسخة الدمج ما زالت محفوظة في الجلسة الحالية.
        </div>
        <div style="max-height:58vh;overflow-y:auto;padding-left:2px">${rows}</div>
        <div class="modal-footer" style="flex-wrap:wrap">
          <button class="btn primary" onclick="undoLastMerge()">↩ استرجاع قبل الدمج</button>
          <button class="btn" onclick="closeModal()">إغلاق</button>
        </div>
      </div>
    </div>`;
}

function _applyFamilyMergeWithHistory(dataObj, meta){
  let backup = _cloneMergeState();
  let result = _cloudSmartMerge(dataObj,{mode:(meta&&meta.mergeMode)||'family'});
  _recordMergeHistory(Object.assign({
    source: 'family-update',
    kind: 'single',
    added: result.added || 0,
    updated: result.updated || 0
  }, meta || {}), backup);

  try{ migrateExternalSpouses(); }catch(e){}
  try{ _invalidateAll(); }catch(e){}
  try{ saveData(); }catch(e){}
  try{ renderAll(); }catch(e){}
  try{ updateMyPersonBtn(); }catch(e){}
  return result;
}

// ── بحث تلقائي عن Gist الخاص بالشجرة في حساب GitHub ──
async function _findCloudGist(){
  if(!CLOUD_CONFIG.GITHUB_PAT)return null;
  try{
    _showCloudToast('🔍 جارٍ البحث عن نسخة سحابية...','syncing',0);
    // نجلب صفحات حتى نجد أو ننتهي (max 5 صفحات × 30 = 150 gist)
    for(let page=1;page<=5;page++){
      let res=await fetch('https://api.github.com/gists?per_page=30&page='+page,{headers:_gistHeaders()});
      if(!res.ok)break;
      let list=await res.json();
      if(!list||!list.length)break;
      for(let g of list){
        let files=Object.keys(g.files||{});
        if(files.includes(CLOUD_CONFIG.GIST_FILE)){
          // وجدنا الـ Gist
          localStorage.setItem(CLOUD_GIST_KEY,g.id);
          CLOUD_CONFIG.GIST_ID=g.id;
          _showCloudToast('✅ تم العثور على النسخة السحابية','success',2500);
          return g.id;
        }
      }
      if(list.length<30)break; // آخر صفحة
    }
    _showCloudToast('','info',1);
    return null;
  }catch(e){
    _showCloudToast('❌ فشل البحث: '+e.message,'error',3000);
    return null;
  }
}

async function cloudRestorePrompt(){
  if(!_isCloudConfigured()){openCloudSetup();return;}
  var gistId=localStorage.getItem(CLOUD_GIST_KEY)||CLOUD_CONFIG.GIST_ID||'';
  var html='<div class="modal-overlay" onclick="if(event.target===this)closeModal()"><div class="modal" style="max-width:480px">'+
    '<h3>⬇️ استعادة من السحابة</h3>'+
    '<div style="padding:9px 12px;background:#fef9c3;border:1px solid #eab308;border-radius:8px;margin-bottom:12px;font-size:12px;color:#713f12;line-height:1.7">'+
    '⚠️ <strong>إذا لم تظهر الصور:</strong> الجهازان متصلان بـ Gist مختلفَين.<br>استخدم "استعادة من Gist جهاز آخر" أدناه وأدخل ID الجهاز الذي يحتوي الصور.</div>'+
    '<div style="padding:7px 10px;background:var(--bg-secondary);border:1px solid var(--card-border);border-radius:7px;margin-bottom:12px;font-size:11px">'+
    'Gist هذا الجهاز: <code style="font-size:10px">'+(gistId||'غير مُعيَّن')+'</code></div>'+
    '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:12px">'+
    '<button class="btn" onclick="closeModal();_doDownload(false)" style="padding:10px;font-size:12px;display:flex;flex-direction:column;align-items:center;gap:3px;background:#d1fae5;border-color:#10b981;color:#065f46">'+
    '<span style="font-size:18px">🔀</span><span style="font-weight:600">دمج</span><span style="font-size:10px;opacity:.8">يضيف الجديد ويفحص التعارضات</span></button>'+
    '<button class="btn" onclick="closeModal();_doDownload(true)" style="padding:10px;font-size:12px;display:flex;flex-direction:column;align-items:center;gap:3px;background:#fee2e2;border-color:#fca5a5;color:#b91c1c">'+
    '<span style="font-size:18px">🔄</span><span style="font-weight:600">استبدال كامل</span><span style="font-size:10px;opacity:.8">يمسح المحلي تماماً</span></button>'+
    '</div>'+
    '<div style="padding:10px 12px;background:var(--bg-secondary);border:2px solid #3b82f6;border-radius:8px;margin-bottom:10px">'+
    '<div style="font-size:12px;font-weight:600;color:#1d4ed8;margin-bottom:6px">🔗 استعادة من Gist جهاز آخر (لإصلاح مشكلة الصور)</div>'+
    '<div style="font-size:11px;color:var(--text2);margin-bottom:5px">الصق Gist ID الجهاز الذي رفع الصور:</div>'+
    '<input id="otherGistInput" type="text" placeholder="مثال: 39281f2f65e8ff9a9e28..." style="width:100%;font-family:monospace;font-size:11px;padding:6px 8px;border:1px solid var(--card-border);border-radius:6px;background:var(--card-bg);color:var(--text);margin-bottom:6px;box-sizing:border-box">'+
    '<div style="display:flex;gap:6px">'+
    '<button class="btn" onclick="_restoreFromOtherGist(false)" style="flex:1;font-size:12px;background:#d1fae5;border-color:#10b981;color:#065f46">🔀 دمج منه</button>'+
    '<button class="btn" onclick="_restoreFromOtherGist(true)" style="flex:1;font-size:12px;background:#fee2e2;border-color:#fca5a5;color:#b91c1c">🔄 استبدال منه</button>'+
    '</div></div>'+
    '<div class="modal-footer"><button class="btn" onclick="closeModal()">إلغاء</button></div>'+
    '</div></div>';
  document.getElementById('modalContainer').innerHTML=html;
}


async function doCloudRestore(mode){
  closeModal();
  var _forceP=(mode==='replace');
  _imgSyncForcePhotos=_forceP;
  let d=await cloudLoad();
  _imgSyncForcePhotos=false;
  if(!d)return;
  try{
    if(mode==='replace'){
      if(!confirm('هل أنت متأكد؟ ستُفقد جميع البيانات والصور الحالية.'))return;
      people=d.people;nextId=d.nextId||1;relPairs=d.relPairs||[];
      if(d.myPersonId){myPersonId=parseInt(d.myPersonId);saveMyPerson();}
      expanded={};people.forEach(p=>{expanded[p.id]=false;});
      migrateExternalSpouses();if(people.length)expanded[people[0].id]=true;
      // إعادة ضبط hashes الصور بعد الاستبدال الكامل
      let newH={};people.forEach(p=>{if(p.photo)newH[p.id]=p.photo.length;});_saveSyncedHashes(newH);
      _markDeviceInit();
      saveData();
      // ── تأكيد حفظ الصور في IDB منفصلاً بعد الاستعادة السحابية ──
      await _persistPhotosToIDB();
      renderAll();updateMyPersonBtn();
      _showCloudToast('✅ تم الاستبدال الكامل ('+people.length+' فرد)','success',3000);
    } else {
      let{added,updated}=_cloudSmartMerge(d,{mode:'cloud'});
      migrateExternalSpouses();_invalidateAll();_markDeviceInit();
      saveData();
      // ── تأكيد حفظ الصور في IDB منفصلاً بعد الدمج السحابي ──
      await _persistPhotosToIDB();
      renderAll();updateMyPersonBtn();
      _showCloudToast('✅ دُمج: +'+added+' جديد، تحديث '+updated+' موجود','success',3500);
    }
  }catch(e){_showCloudToast('❌ خطأ: '+e.message,'error',4000);}
}

// ── واجهة الإعداد ──
function openCloudSetup(){
  let currentPAT=CLOUD_CONFIG.GITHUB_PAT||'';
  let currentKey=CLOUD_CONFIG.KEY_HEX||'';
  let gistId=localStorage.getItem(CLOUD_GIST_KEY)||'';
  // Generate a random key for the user if none exists
  let generatedKey='';
  if(!currentKey){
    let bytes=crypto.getRandomValues(new Uint8Array(32));
    generatedKey=[...bytes].map(b=>b.toString(16).padStart(2,'0')).join('');
  }
  let html=`<div class="modal-overlay" onclick="if(event.target===this)closeModal()">
  <div class="modal" style="max-width:500px">
    <h3>☁️ إعداد الحفظ السحابي المشفَّر</h3>
    <div style="font-size:12px;color:var(--text2);background:var(--bg-secondary);border:1px solid var(--card-border);border-radius:8px;padding:10px 12px;margin-bottom:14px;line-height:1.7">
      <strong style="color:var(--text)">كيف يعمل؟</strong><br>
      يُشفَّر ملف JSON ببياناتك (بدون صور) بتشفير AES-256 ويُرفع تلقائياً إلى GitHub Gist الخاصة بك.
      <br>فقط أنت تملك المفتاح، ولا أحد غيرك يستطيع فك التشفير — حتى لو وصل للملف في GitHub.
    </div>
    <div class="form-row">
      <label>🔑 مفتاح التشفير AES-256 (احتفظ به في مكان آمن — لا يمكن استرداد البيانات بدونه)</label>
      <div style="display:flex;gap:6px">
        <input id="cs_key" type="password" value="${currentKey||generatedKey}" style="font-family:monospace;font-size:11px;flex:1" placeholder="64 حرف hex...">
        <button class="btn" onclick="document.getElementById('cs_key').type=document.getElementById('cs_key').type==='password'?'text':'password'" style="font-size:11px">👁</button>
        <button class="btn" onclick="let k=[...crypto.getRandomValues(new Uint8Array(32))].map(b=>b.toString(16).padStart(2,'0')).join('');document.getElementById('cs_key').value=k;document.getElementById('cs_key').type='text'" style="font-size:11px" title="توليد مفتاح عشوائي">🎲 جديد</button>
      </div>
      <div style="font-size:11px;color:#ef4444;margin-top:4px">⚠️ إذا غيّرت المفتاح لن تتمكن من فك تشفير النسخ القديمة</div>
    </div>
    <div class="form-row">
      <label>🐱 GitHub Personal Access Token — نطاق: <code>gist</code> فقط</label>
      <div style="display:flex;gap:6px">
        <input id="cs_pat" type="password" value="${currentPAT}" style="font-family:monospace;font-size:11px;flex:1" placeholder="github_pat_xxxxxxxx...">
        <button class="btn" onclick="document.getElementById('cs_pat').type=document.getElementById('cs_pat').type==='password'?'text':'password'" style="font-size:11px">👁</button>
      </div>
      <div style="margin-top:5px"><a href="https://github.com/settings/tokens/new?scopes=gist&description=FamilyTree" target="_blank" style="font-size:11px;color:#3b82f6">← إنشاء توكن جديد في GitHub (نطاق gist فقط)</a></div>
    </div>
    ${gistId?`<div class="form-row"><label>🔗 معرّف Gist الحالي (للقراءة فقط)</label><input type="text" value="${gistId}" readonly style="font-size:11px;font-family:monospace;background:var(--bg-secondary)"><button class="btn" style="font-size:11px;margin-top:4px;color:#ef4444" onclick="if(confirm('هل تريد حذف الربط بـ Gist الحالي؟ لن يُحذف الـ Gist من GitHub.'))localStorage.removeItem('${CLOUD_GIST_KEY.replace("'","\'")}');closeModal();openCloudSetup()">✕ إلغاء الربط</button></div>`
    :`<div class="form-row"><label>🔗 معرّف Gist (اختياري — اتركه فارغاً للبحث التلقائي)</label><input id="cs_gist" type="text" style="font-family:monospace;font-size:11px" placeholder="يُملأ تلقائياً — أو الصق الـ ID يدوياً"></div>`}
    <div style="padding:10px 12px;background:#d1fae5;border:1px solid #10b981;border-radius:8px;font-size:12px;color:#065f46;margin-bottom:8px">
      <strong>✅ الإعدادات تُحفظ تلقائياً</strong> في هذا المتصفح على هذا الجهاز.<br>
      لنقلها لجهاز آخر: بعد الإعداد اضغط <strong>💾 حفظ نسخة</strong> — ستُضمَّن الإعدادات في ملف HTML.
    </div>
    <div style="padding:10px 12px;background:#ede9fe;border:1px solid #8b5cf6;border-radius:8px;font-size:12px;color:#5b21b6;margin-bottom:14px">
      <strong>📐 هيكلية الأمان:</strong><br>
      🔑 <strong>أنت (المالك):</strong> نسختك تحتوي الإعدادات → حفظ وتحميل سحابي تلقائي<br>
      👥 <strong>أفراد العائلة:</strong> نسختهم بلا إعدادات → يعملون محلياً → يُصدّرون JSON ويُرسلونه لك<br>
      📥 <strong>لاستقبال بياناتهم:</strong> اضغط <strong>📥 استيراد</strong> ثم اختر <strong>"إضافة إلى الشجرة"</strong>
    </div>
    <div class="modal-footer">
      <button class="btn" onclick="closeModal()">إلغاء</button>
      <button class="btn primary" onclick="applyCloudSetup()">✓ تطبيق وحفظ</button>
    </div>
  </div></div>`;
  document.getElementById('modalContainer').innerHTML=html;
}

function applyCloudSetup(){
  let key=(document.getElementById('cs_key').value||'').trim();
  let pat=(document.getElementById('cs_pat').value||'').trim();
  if(key.length!==64||!/^[0-9a-fA-F]+$/.test(key)){alert('المفتاح يجب أن يكون 64 حرف hex صالح');return;}
  if(!pat){alert('الرجاء إدخال GitHub PAT');return;}
  CLOUD_CONFIG.KEY_HEX=key;
  CLOUD_CONFIG.GITHUB_PAT=pat;
  // حفظ في localStorage للاستمرارية بين الجلسات
  try{localStorage.setItem('ft_cloud_key_v1',key);localStorage.setItem('ft_cloud_pat_v1',pat);}catch(e){}
  // GIST_ID اليدوي (حقل الجهاز الجديد)
  let manualGist=(document.getElementById('cs_gist')?.value||'').trim();
  if(manualGist){localStorage.setItem(CLOUD_GIST_KEY,manualGist);CLOUD_CONFIG.GIST_ID=manualGist;}
  _cloudEnabled=true;
  _showCloudButtons(true);
  let banner=document.getElementById('cloudSetupBanner');
  if(banner)banner.style.display='none';
  closeModal();
  // ── جهاز جديد: ابحث أولاً عن Gist موجود → اعرض خيار الاستعادة ──
  if(_isNewDevice()){
    _showCloudToast('✅ تم الإعداد — جارٍ البحث عن نسخة سحابية...','success',2000);
    setTimeout(async()=>{
      let found=await _findCloudGist();
      if(found){
        // وُجد Gist → اعرض خيار الاستعادة مباشرة
        setTimeout(()=>cloudRestorePrompt(),400);
      }else{
        // لا يوجد Gist بعد → أول رفع
        _showCloudToast('لم تُعثر على نسخة سابقة — جارٍ إنشاء نسخة جديدة...','info',2500);
        setTimeout(()=>cloudSave(),600);
      }
    },300);
  } else {
    _showCloudToast('✅ تم إعداد الحفظ السحابي — جارٍ أول رفع...','success',2000);
    setTimeout(()=>cloudSave(),500);
  }
}

function closeBannerForever(){
  let b=document.getElementById('cloudSetupBanner');
  if(b)b.style.display='none';
  try{localStorage.setItem('ft_cloud_banner_dismissed','1');}catch(e){}
}

function _showCloudButtons(show){
  let b1=document.getElementById('cloudSyncBtn');
  let b2=document.getElementById('cloudRestoreBtn');
  let b3=document.getElementById('exportFamilyBtn');
  let b4=document.getElementById('familyUploadSetupBtn');
  let b5=document.getElementById('familyUpdatesBtn');
  var bUp=document.getElementById('cloudUploadBtn');
  var bDn=document.getElementById('cloudDownloadBtn');
  var bTime=document.getElementById('cloudLastSyncTime');
  if(bUp)bUp.style.display=show?'':'none';
  if(bDn)bDn.style.display=show?'':'none';
  if(bTime){bTime.style.display=show?'inline':'none';if(show)_updateLastSyncUI(_getLastSync());}
  if(b1)b1.style.display=show?'':'none';
  if(b2)b2.style.display=show?'':'none';
  if(b3)b3.style.display=show?'':'none';
  // أزرار إدارة نسخة العائلة — للمالك فقط (يظهر عند تفعيل السحابة)
  if(b4)b4.style.display=show?'':'none';
  if(b5)b5.style.display=show?'':'none';
}

// ── حفظ نسخة للعائلة (بلا إعدادات سحابية) ──
// ══════════════════════════════════════════════════════════════
//  exportFamilyCopy — يُصدِّر ZIP كامل يعمل كـ PWA مباشرةً
// ══════════════════════════════════════════════════════════════
async function exportFamilyCopy(){
  closeModal();

  // ── تحقق من وجود JSZip ──
  if(typeof JSZip==='undefined'){
    alert('⚠️ مكتبة JSZip غير محملة بعد.\nتأكد من اتصالك بالإنترنت وأعد المحاولة.');
    return;
  }

  // ── مؤشر تحميل ──
  var _toast=document.createElement('div');
  _toast.id='export-progress-toast';
  _toast.innerHTML='⏳ جارٍ تجهيز حزمة الـ PWA...';
  Object.assign(_toast.style,{
    position:'fixed',bottom:'80px',right:'50%',transform:'translateX(50%)',
    background:'var(--card-bg,#fff)',border:'1px solid var(--card-border,#e5e7eb)',
    borderRadius:'12px',padding:'12px 20px',fontSize:'14px',fontWeight:'600',
    color:'var(--text,#111)',boxShadow:'0 4px 20px rgba(0,0,0,.15)',
    zIndex:'99999',whiteSpace:'nowrap'
  });
  document.body.appendChild(_toast);
  var _removeToast=function(){var t=document.getElementById('export-progress-toast');if(t)t.remove();};

  try{
    // ════ 1. بناء الكود الرئيسي لنسخة العائلة ════
    var htmlAttrs='';
    Array.from(document.documentElement.attributes).forEach(function(a){
      htmlAttrs+=' '+a.name+'="'+a.value.replace(/&/g,'&amp;').replace(/"/g,'&quot;')+'"';
    });

    var cleanAppHTML='';
    try{
      var tDoc=(new DOMParser()).parseFromString('<!DOCTYPE html>\n'+_HTML_TEMPLATE,'text/html');
      var tApp=tDoc.getElementById('app');
      if(tApp)cleanAppHTML=tApp.outerHTML;
    }catch(ex){}
    if(!cleanAppHTML)cleanAppHTML=document.getElementById('app').outerHTML;

    // الكود المصدري — تعديل الثوابت
    var mainSrc=document.scripts[document.scripts.length-1].textContent;

    // 1a. حذف CLOUD_CONFIG كاملاً — لا مفاتيح المالك السحابية في نسخة العائلة
    mainSrc=mainSrc.replace(
      /const CLOUD_CONFIG\s*=\s*\{[^}]*\}/,
      "const CLOUD_CONFIG = {\n  KEY_HEX: '',\n  GITHUB_PAT: '',\n  GIST_ID: '',\n  GIST_FILE: 'ft_encrypted.dat',\n}"
    );

    // 1b. FAMILY_UPLOAD_CONFIG فارغ في الـ HTML — المفاتيح تأتي فقط من ملف JSON عند الاستيراد
    // (أكثر أماناً: الـ PWA لا يحمل أي مفاتيح — تُفعَّل فقط بعد استيراد JSON يحتوي _familyMeta)
    mainSrc=mainSrc.replace(
      /const FAMILY_UPLOAD_CONFIG\s*=\s*\{[^}]*\}/,
      "const FAMILY_UPLOAD_CONFIG = {\n  GITHUB_PAT: '',\n  GIST_ID: '',\n  KEY_HEX: '',\n}"
    );

    // 1c. تمييز النسخة كـ "نسخة عائلة"
    mainSrc=mainSrc.replace(/const IS_FAMILY_COPY\s*=\s*false/,'const IS_FAMILY_COPY = true');

    // 1d. Device ID فريد لكل نسخة مصدَّرة
    var _newDid=[...crypto.getRandomValues(new Uint8Array(3))].map(b=>b.toString(16).padStart(2,'0')).join('');
    mainSrc=mainSrc.replace(/const FAMILY_DEVICE_ID\s*=\s*'[^']*'/,"const FAMILY_DEVICE_ID = '"+_newDid+"'");

    // ── بناء head نظيف (بدون JSZip) ──
    var headClone=document.head.cloneNode(true);
    headClone.querySelectorAll('script').forEach(function(s){
      if(s.src&&s.src.includes('jszip'))s.remove();
    });

    // ✅ لا dataTag — الشجرة فارغة، المستخدم يستورد JSON بنفسه
    var familyHTML=
      '<!DOCTYPE html>\n<html'+htmlAttrs+'>\n'+
      headClone.outerHTML+'\n'+
      '<body>\n'+
      cleanAppHTML+'\n'+
      '<div id="modalContainer"></div>\n'+
      '<scr'+'ipt>\n'+mainSrc+'\n<\/sc'+'ript>\n'+
      '</body>\n</html>';

    // ════ 2. manifest.json ════
    var manifestContent=JSON.stringify({
      name:'شجرة العائلة',short_name:'العائلة',
      description:'شجرة عائلية تفاعلية',
      start_url:'./index.html',scope:'./',display:'standalone',orientation:'any',
      background_color:'#f3f4f6',theme_color:'#3b82f6',lang:'ar',dir:'rtl',
      icons:[
        {src:'icons/icon-72x72.png',sizes:'72x72',type:'image/png',purpose:'any'},
        {src:'icons/icon-96x96.png',sizes:'96x96',type:'image/png',purpose:'any'},
        {src:'icons/icon-128x128.png',sizes:'128x128',type:'image/png',purpose:'any'},
        {src:'icons/icon-144x144.png',sizes:'144x144',type:'image/png',purpose:'any'},
        {src:'icons/icon-152x152.png',sizes:'152x152',type:'image/png',purpose:'any'},
        {src:'icons/icon-192x192.png',sizes:'192x192',type:'image/png',purpose:'any'},
        {src:'icons/icon-384x384.png',sizes:'384x384',type:'image/png',purpose:'any'},
        {src:'icons/icon-512x512.png',sizes:'512x512',type:'image/png',purpose:'any'},
        {src:'icons/icon-maskable-192x192.png',sizes:'192x192',type:'image/png',purpose:'maskable'},
        {src:'icons/icon-maskable-512x512.png',sizes:'512x512',type:'image/png',purpose:'maskable'}
      ]
    },null,2);

    // ════ 3. sw.js — Network-First لـ index.html (يمنع تحميل HTML قديم من الكاش) ════
    var swContent=`/* شجرة العائلة — Service Worker */
const CACHE_NAME='family-tree-v1';
const SHELL_CACHE='family-tree-shell-v1';
const STATIC_ASSETS=['./manifest.json','./icons/icon-192x192.png','./icons/icon-512x512.png','./icons/apple-touch-icon.png'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(SHELL_CACHE).then(c=>c.addAll(STATIC_ASSETS)).then(()=>self.skipWaiting()).catch(()=>self.skipWaiting()));});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE_NAME&&k!==SHELL_CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));});
self.addEventListener('fetch',e=>{
  if(e.request.method!=='GET'||!e.request.url.startsWith('http'))return;
  var u=new URL(e.request.url);
  if(u.origin!==self.location.origin){e.respondWith(fetch(e.request).catch(()=>new Response('',{status:503})));return;}
  var isPage=e.request.mode==='navigate'||e.request.url.endsWith('index.html')||e.request.url.endsWith('/');
  e.respondWith(isPage?networkFirst(e.request):cacheFirst(e.request));
});
async function networkFirst(req){
  var cache=await caches.open(SHELL_CACHE);
  try{var r=await fetch(req);if(r&&r.status===200)cache.put(req,r.clone());return r;}
  catch{var c=await cache.match(req);return c||new Response(\`<!DOCTYPE html><html lang="ar" dir="rtl"><head><meta charset="UTF-8"><title>غير متصل</title><style>body{font-family:system-ui;text-align:center;padding:60px;color:#374151}h1{font-size:3rem}</style></head><body><h1>🌳</h1><h2>أنت غير متصل</h2><p>تحقق من اتصالك وأعد المحاولة</p></body></html>\`,{headers:{'Content-Type':'text/html;charset=utf-8'}});}
}
async function cacheFirst(req){
  var c=await caches.match(req);if(c)return c;
  try{var r=await fetch(req);if(r&&r.status===200){var cache=await caches.open(SHELL_CACHE);cache.put(req,r.clone());}return r;}
  catch{return new Response('',{status:503});}
}
self.addEventListener('message',e=>{if(e.data==='SKIP_WAITING')self.skipWaiting();});`;

    // ════ 4. جلب الأيقونات ════
    _toast.innerHTML='⏳ جارٍ تحميل الأيقونات...';
    var iconFiles=[
      'icons/apple-touch-icon.png','icons/icon-72x72.png','icons/icon-96x96.png',
      'icons/icon-128x128.png','icons/icon-144x144.png','icons/icon-152x152.png',
      'icons/icon-192x192.png','icons/icon-384x384.png','icons/icon-512x512.png',
      'icons/icon-maskable-192x192.png','icons/icon-maskable-512x512.png'
    ];
    var iconData={};
    await Promise.all(iconFiles.map(async function(path){
      try{var resp=await fetch('./'+path);if(resp.ok)iconData[path]=await resp.arrayBuffer();}
      catch(e){console.warn('Could not fetch icon:',path);}
    }));

    // ════ 5. دليل الاستضافة ════
    var guide=`# 🌳 شجرة العائلة — دليل رفع نسخة العائلة

## هيكل الملفات
\`\`\`
family-tree-pwa/
├── index.html       ← التطبيق (بدون بيانات — يطلب استيراد JSON)
├── manifest.json
├── sw.js
└── icons/  (11 أيقونة PNG)
\`\`\`

## رفع على GitHub Pages (مجاني — مُوصى به)
1. github.com/new ← اسم المستودع: family-tree ← Public ← Create
2. ارفع جميع الملفات (بما فيها مجلد icons/)
3. Settings → Pages → Source: main / (root) → Save
4. انتظر دقيقتين ← رابطك: https://USERNAME.github.io/family-tree/

## رفع على Netlify (أسرع — سحب وإفلات)
1. netlify.com ← سجّل دخول
2. اسحب مجلد family-tree-pwa وأفلته في لوحة التحكم
3. رابطك جاهز فوراً: https://xxxx.netlify.app

## التثبيت كـ PWA
- Android/Chrome: بانر التثبيت يظهر تلقائياً
- iPhone/Safari: زر المشاركة ⬆️ ← "إضافة إلى الشاشة الرئيسية"
- كمبيوتر: أيقونة ➕ في شريط العنوان

## تدفق الاستخدام
1. المالك يرسل الرابط + ملف JSON للبيانات
2. فرد العائلة يفتح الرابط → يضغط "استيراد ملف JSON"
3. البيانات تُحفظ محلياً — يعمل التطبيق بدون إنترنت
`;

    // ════ 6. تجميع ZIP ════
    _toast.innerHTML='⏳ جارٍ ضغط الملفات...';
    var zip=new JSZip();
    var folder=zip.folder('family-tree-pwa');
    folder.file('index.html',familyHTML);
    folder.file('manifest.json',manifestContent);
    folder.file('sw.js',swContent);
    folder.file('INSTALL.md',guide);
    var iconsFolder=folder.folder('icons');
    Object.entries(iconData).forEach(function(entry){
      iconsFolder.file(entry[0].replace('icons/',''),entry[1]);
    });
    var zipBlob=await zip.generateAsync({type:'blob',compression:'DEFLATE',compressionOptions:{level:6}});

    // ════ 7. تنزيل ZIP ════
    _removeToast();
    var d=new Date();
    var stamp=d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
    var url=URL.createObjectURL(zipBlob);
    var lnk=document.createElement('a');
    lnk.href=url;lnk.download='family-tree-pwa-'+stamp+'.zip';
    document.body.appendChild(lnk);lnk.click();
    setTimeout(function(){document.body.removeChild(lnk);URL.revokeObjectURL(url);},2000);

    showSaveToast();
    setTimeout(function(){
      alert(
        '✅ تم تصدير حزمة الـ PWA\n\n'+
        '📦 الملف: family-tree-pwa-'+stamp+'.zip\n\n'+
        'خطوات التوزيع:\n'+
        '1. ارفع المجلد على GitHub Pages أو Netlify\n'+
        '2. أرسل الرابط + ملف JSON للبيانات لأفراد العائلة\n'+
        '3. كل فرد يستورد الـ JSON من داخل التطبيق\n\n'+
        '📄 راجع INSTALL.md داخل الحزمة للتفاصيل'
      );
    },300);

  }catch(err){
    _removeToast();
    alert('خطأ في التصدير: '+err.message);
    console.error('[exportFamilyCopy]',err);
  }
}

// ── تهيئة السحابة عند بدء التطبيق ──
async function initCloud(){
  // تحميل الإعدادات من localStorage إذا لم تكن محدَّدة في الكود
  if(!CLOUD_CONFIG.KEY_HEX||!CLOUD_CONFIG.GITHUB_PAT){
    try{
      let sk=localStorage.getItem('ft_cloud_key_v1');
      let sp=localStorage.getItem('ft_cloud_pat_v1');
      if(sk&&sk.length===64)CLOUD_CONFIG.KEY_HEX=sk;
      if(sp&&sp.trim())CLOUD_CONFIG.GITHUB_PAT=sp.trim();
    }catch(e){}
  }
  // تحميل GIST_ID من localStorage إذا لم يكن مُضمَّناً في الكود
  if(!CLOUD_CONFIG.GIST_ID){
    try{
      let sg=localStorage.getItem(CLOUD_GIST_KEY);
      if(sg&&sg.trim())CLOUD_CONFIG.GIST_ID=sg.trim();
    }catch(e){}
  } else {
    // إذا كان GIST_ID مُضمَّناً في الكود → ضعه في localStorage أيضاً
    try{localStorage.setItem(CLOUD_GIST_KEY,CLOUD_CONFIG.GIST_ID);}catch(e){}
  }
  // تحميل إعدادات رفع العائلة
  _loadFamilyUploadSettings();
  // ── نسخة العائلة: إخفاء كل شيء متعلق بالسحابة، لا تحميل من السحابة أبداً ──
  if(IS_FAMILY_COPY){
    let banner=document.getElementById('cloudSetupBanner');
    if(banner)banner.style.display='none';
    ['familyUploadSetupBtn','familyUpdatesBtn','cloudSyncBtn','cloudRestoreBtn'].forEach(function(id){
      let b=document.getElementById(id);if(b)b.style.display='none';
    });
    try{localStorage.setItem('ft_cloud_banner_dismissed','1');}catch(e){}
    // نسخة العائلة: الرفع الصامت سيعمل عبر triggerFamilyUpload() في saveData
    // ولا نحمّل من السحابة أبداً
    return;
  }
  // ── نسخة المالك: تحميل وتزامن كاملان ──
  if(_isCloudConfigured()){
    _cloudEnabled=true;
    _showCloudButtons(true);
    let banner=document.getElementById('cloudSetupBanner');
    if(banner)banner.style.display='none';
    // تحميل من السحابة عند كل فتح — مع fallback لـ CLOUD_CONFIG.GIST_ID
    let gistId=localStorage.getItem(CLOUD_GIST_KEY)||CLOUD_CONFIG.GIST_ID||'';
    if(gistId){
      _imgSyncForcePhotos=false; // diff-based: cloud wins only when size differs
      let cloudData=await cloudLoad();
      if(cloudData&&cloudData.people&&cloudData.people.length){
        let localCount=people.length;
        if(localCount===0){
          people=cloudData.people;nextId=cloudData.nextId||1;relPairs=cloudData.relPairs||[];
          if(cloudData.myPersonId){myPersonId=parseInt(cloudData.myPersonId);saveMyPerson();}
          expanded={};people.forEach(p=>{expanded[p.id]=false;});
          migrateExternalSpouses();
          if(people.length)expanded[people[0].id]=true;
          _invalidateAll();
          _markDeviceInit(); // ✅ إصلاح 1: تسجيل الجهاز كمُهيَّأ بعد التحميل البكر
          saveData();renderAll();updateMyPersonBtn();
          _showCloudToast('☁️ تم تحميل البيانات من السحابة ('+people.length+' فرد)','success',3000);
        } else {
          // دمج ذكي — السحابة هي المرجع، تُضاف الفوارق للمحلية
          let{added,updated}=_cloudSmartMerge(cloudData,{mode:'cloud'});
          migrateExternalSpouses();_invalidateAll();
          _markDeviceInit(); // ✅ إصلاح 1: تسجيل الجهاز كمُهيَّأ بعد الدمج
          saveData();renderAll();updateMyPersonBtn();
          if(added>0||updated>0){
            let msg=added>0?'☁️ دُمج '+added+' شخص جديد من السحابة':'☁️ الحفظ السحابي مفعّل ✓';
            _showCloudToast(msg,'success',3000);
            // ✅ إصلاح 3: رفع الفوارق للسحابة حتى يراها الجهاز الثاني
            // لا رفع تلقائي — المزامنة يدوية فقط
          } else {
            _showCloudToast('☁️ الحفظ السحابي مفعّل ✓','success',2000);
          }
        }
      } else {
        _showCloudToast('☁️ الحفظ السحابي مفعّل ✓','success',2000);
      }
    }
    setTimeout(()=>_updateLastSyncUI(_getLastSync()),600);
  } else {
    let banner=document.getElementById('cloudSetupBanner');
    let dismissed=false;try{dismissed=localStorage.getItem('ft_cloud_banner_dismissed')==='1';}catch(e){}
    if(banner&&!dismissed)banner.style.display='flex';
  }
}

// المزامنة يدوية فقط
function triggerCloudSync(){ /* manual only */ }
let _imgSyncForcePhotos=false; // يُضبط مؤقتاً قبل cloudLoad

