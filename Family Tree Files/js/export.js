/**
 * js/export.js
 * ═══════════════════════════════════════════════════════════════
 * التصدير والاستيراد — HTML + JSON + نسخة العائلة
 * Export/Import — HTML save, JSON export/import, family copy
 * ═══════════════════════════════════════════════════════════════
 *
 * Dependencies: core.js, storage.js, config.js
 *
 * API العامة:
 *   exportData()              ← حفظ نسخة HTML كاملة
 *   showExportJSONModal()     ← نافذة تصدير JSON
 *   doExportJSON(withPhotos)  ← تصدير JSON
 *   doExportJSONFamily()      ← تصدير نسخة العائلة JSON
 *   handleImportFile(e)       ← استقبال ملف مستورد
 *   showImportModeModal(data) ← اختيار وضع الاستيراد
 *   doImport(mode)            ← تنفيذ الاستيراد
 *   exportFamilyCopy()        ← إنشاء نسخة العائلة HTML
 */

'use strict';

// ── حالة الاستيراد ──
let _pendingImportData = null;

// ══════════════════════════════════════════════════════════
//  حفظ نسخة HTML كاملة
// ══════════════════════════════════════════════════════════

function exportData() {
  // بناء بيانات _familyMeta للمالك (مشفَّرة في الـ HTML)
  let _meta = '';
  if (!IS_FAMILY_COPY) {
    let _metaObj = {
      pat: FAMILY_UPLOAD_CONFIG.GITHUB_PAT || '',
      gistId: FAMILY_UPLOAD_CONFIG.GIST_ID || localStorage.getItem(FAMILY_UPLOAD_GIST_KEY) || '',
      keyHex: FAMILY_UPLOAD_CONFIG.KEY_HEX || CLOUD_CONFIG.KEY_HEX || '',
      deviceId: _getFamilyGistFileName ? _getFamilyGistFileName().replace(/^ft_family_/, '').replace(/\.dat$/, '') : ''
    };
    _meta = JSON.stringify(_metaObj);
  }

  // جمع إعدادات السحابة الحالية (لتضمينها في الـ HTML للانتقال بين الأجهزة)
  let cloudEmbedded = '';
  if (!IS_FAMILY_COPY && CLOUD_CONFIG.KEY_HEX && CLOUD_CONFIG.GITHUB_PAT) {
    cloudEmbedded = JSON.stringify({
      KEY_HEX: CLOUD_CONFIG.KEY_HEX,
      GITHUB_PAT: CLOUD_CONFIG.GITHUB_PAT,
      GIST_ID: CLOUD_CONFIG.GIST_ID || ''
    });
  }

  let dataStr = JSON.stringify({
    people, nextId, relPairs,
    myPersonId: myPersonId || null,
    _familyMeta: _meta ? JSON.parse(_meta) : undefined,
    _cloudConfig: cloudEmbedded ? JSON.parse(cloudEmbedded) : undefined,
    _exportedAt: new Date().toISOString()
  });

  // قراءة قالب index.html الحالي وحقن البيانات فيه
  let htmlContent = document.documentElement.outerHTML;

  // استبدال بيانات التهيئة بالبيانات الحالية
  let initScript = `<script id="_ft_init_data">
    window._FT_INIT_DATA = ${dataStr};
  </script>`;

  // إدراج script البيانات قبل </body>
  if (htmlContent.includes('</body>')) {
    htmlContent = htmlContent.replace('</body>', initScript + '\n</body>');
  } else {
    htmlContent += initScript;
  }

  let blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
  let url = URL.createObjectURL(blob);
  let a = document.createElement('a');
  a.href = url;
  let dt = new Date().toISOString().slice(0, 10);
  a.download = `family-tree-${dt}.html`;
  a.click();
  URL.revokeObjectURL(url);
  _showSaveToast('✅ تم حفظ النسخة بنجاح', 'success');
}

// ══════════════════════════════════════════════════════════
//  تصدير JSON
// ══════════════════════════════════════════════════════════

function showExportJSONModal() {
  let mainCount = people.filter(p => !p.isExternal).length;
  let extCount = people.filter(p => p.isExternal).length;
  let photoCount = people.filter(p => p.photo).length;
  let totalSizeKB = Math.round(JSON.stringify(people).length * 0.75 / 1024);

  let html = `<div class="modal-overlay" onclick="if(event.target===this)closeModal()">
  <div class="modal" style="max-width:420px">
    <h3>📤 تصدير JSON</h3>
    <div style="font-size:13px;color:var(--text2);margin-bottom:14px;background:var(--card-bg);border:1px solid var(--card-border);border-radius:8px;padding:10px 12px">
      <div>👥 ${mainCount} فرد رئيسي + ${extCount} خارجي</div>
      ${photoCount ? `<div>📸 ${photoCount} صورة (${totalSizeKB}KB تقريباً)</div>` : ''}
    </div>
    <div style="display:flex;flex-direction:column;gap:10px;margin-bottom:14px">
      <div onclick="doExportJSON(false)" style="cursor:pointer;padding:14px 16px;border:1px solid var(--card-border);border-radius:10px;background:var(--card-bg)" onmouseover="this.style.borderColor='#3b82f6'" onmouseout="this.style.borderColor='var(--card-border)'">
        <div style="font-size:14px;font-weight:600;color:var(--text);margin-bottom:4px">📄 بدون صور <span style="font-size:11px;font-weight:400;color:#22c55e;background:#dcfce7;border:1px solid #86efac;padding:2px 6px;border-radius:6px;margin-right:6px">موصى به</span></div>
        <div style="font-size:12px;color:var(--text2)">ملف صغير ← سهل المشاركة والتخزين</div>
      </div>
      ${photoCount ? `<div onclick="doExportJSON(true)" style="cursor:pointer;padding:14px 16px;border:1px solid var(--card-border);border-radius:10px;background:var(--card-bg)" onmouseover="this.style.borderColor='#f59e0b'" onmouseout="this.style.borderColor='var(--card-border)'">
        <div style="font-size:14px;font-weight:600;color:var(--text);margin-bottom:4px">📸 مع الصور</div>
        <div style="font-size:12px;color:var(--text2)">يشمل جميع الصور المضمَّنة — الملف أكبر حجماً</div>
      </div>` : ''}
    </div>
    <div class="modal-footer"><button class="btn" onclick="closeModal()">إلغاء</button></div>
  </div></div>`;
  document.getElementById('modalContainer').innerHTML = html;
  _androidBackGuardModalOpen();
}

function doExportJSON(withPhotos) {
  let exportPeople = withPhotos ? people : people.map(p => {
    let copy = Object.assign({}, p);
    if (!withPhotos) delete copy.photo;
    return copy;
  });

  let data = JSON.stringify({
    people: exportPeople,
    nextId,
    relPairs: relPairs || [],
    myPersonId: myPersonId || null,
    _exportedAt: new Date().toISOString(),
    _version: 2
  }, null, 2);

  let blob = new Blob([data], { type: 'application/json;charset=utf-8' });
  let url = URL.createObjectURL(blob);
  let a = document.createElement('a');
  a.href = url;
  let dt = new Date().toISOString().slice(0, 10);
  a.download = `family-tree-${dt}${withPhotos ? '-with-photos' : ''}.json`;
  a.click();
  URL.revokeObjectURL(url);
  closeModal();
  _showSaveToast('✅ تم التصدير بنجاح', 'success');
}

// ══════════════════════════════════════════════════════════
//  نسخة العائلة (للمشاركة — بدون إعدادات سرية)
// ══════════════════════════════════════════════════════════

function exportFamilyCopy() {
  let htmlContent = document.documentElement.outerHTML;

  // بيانات نسخة العائلة (بدون بيانات المالك السرية)
  let familyData = JSON.stringify({
    people, nextId, relPairs,
    myPersonId: myPersonId || null,
    IS_FAMILY_COPY: true,
    _familyMeta: {
      pat: FAMILY_UPLOAD_CONFIG.GITHUB_PAT || '',
      gistId: FAMILY_UPLOAD_CONFIG.GIST_ID || localStorage.getItem(FAMILY_UPLOAD_GIST_KEY) || '',
      keyHex: FAMILY_UPLOAD_CONFIG.KEY_HEX || CLOUD_CONFIG.KEY_HEX || '',
      deviceId: '' // سيُولَّد تلقائياً عند أول رفع من هذا الجهاز
    },
    _exportedAt: new Date().toISOString()
  });

  let initScript = `<script id="_ft_init_data">
    window._FT_INIT_DATA = ${familyData};
    window._IS_FAMILY_COPY = true;
  </script>`;

  if (htmlContent.includes('</body>')) {
    htmlContent = htmlContent.replace('</body>', initScript + '\n</body>');
  } else {
    htmlContent += initScript;
  }

  let blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
  let url = URL.createObjectURL(blob);
  let a = document.createElement('a');
  a.href = url;
  let dt = new Date().toISOString().slice(0, 10);
  a.download = `family-tree-family-copy-${dt}.html`;
  a.click();
  URL.revokeObjectURL(url);
  _showSaveToast('✅ تم إنشاء نسخة العائلة', 'success');
}

function doExportJSONFamily() {
  // تصدير JSON لنسخة العائلة (بدون صور وبدون إعدادات سرية)
  let exportPeople = people.map(p => {
    let copy = Object.assign({}, p);
    delete copy.photo;
    return copy;
  });

  let data = JSON.stringify({
    people: exportPeople,
    nextId,
    relPairs: relPairs || [],
    myPersonId: myPersonId || null,
    IS_FAMILY_COPY: true,
    _exportedAt: new Date().toISOString(),
    _version: 2
  }, null, 2);

  let blob = new Blob([data], { type: 'application/json;charset=utf-8' });
  let url = URL.createObjectURL(blob);
  let a = document.createElement('a');
  a.href = url;
  let dt = new Date().toISOString().slice(0, 10);
  a.download = `family-tree-family-${dt}.json`;
  a.click();
  URL.revokeObjectURL(url);
  closeModal();
}

// ══════════════════════════════════════════════════════════
//  استيراد ملف
// ══════════════════════════════════════════════════════════

function handleImportFile(e) {
  let file = e.target.files[0];
  if (!file) return;

  let reader = new FileReader();
  reader.onload = function(ev) {
    let content = ev.target.result;
    try {
      let data = null;

      if (file.name.endsWith('.json')) {
        data = JSON.parse(content);
      } else if (file.name.endsWith('.html') || file.name.endsWith('.htm')) {
        // استخراج البيانات من HTML
        let match = content.match(/window\._FT_INIT_DATA\s*=\s*(\{[\s\S]*?\});/);
        if (match) {
          data = JSON.parse(match[1]);
        } else {
          // بحث عن بيانات localStorage قديمة في HTML
          let legacyMatch = content.match(/localStorage\.setItem\(['"]family_tree_data['"],\s*JSON\.stringify\((\{[\s\S]*?\})\)\)/);
          if (legacyMatch) {
            data = JSON.parse(legacyMatch[1]);
          } else {
            throw new Error('لم يُعثر على بيانات صالحة في الملف');
          }
        }
      }

      if (!data || !data.people) {
        throw new Error('تنسيق الملف غير مدعوم أو البيانات فارغة');
      }

      _pendingImportData = data;
      closeModal();
      showImportModeModal(data);

    } catch (ex) {
      alert('خطأ في قراءة الملف:\n' + ex.message);
    }
  };
  reader.readAsText(file, 'utf-8');
}

function showImportModeModal(data) {
  let count = data.people ? data.people.length : 0;
  let dt = data._exportedAt ? new Date(data._exportedAt).toLocaleString('ar') : 'غير معروف';
  let isFamilyCopy = data.IS_FAMILY_COPY ? '<span style="font-size:11px;background:var(--clr-purple-bg);color:var(--clr-purple-text);border:1px solid #c4b5fd;border-radius:6px;padding:2px 6px;margin-right:6px">نسخة عائلة</span>' : '';

  let html = `<div class="modal-overlay" onclick="if(event.target===this){closeModal();_pendingImportData=null;}">
  <div class="modal" style="max-width:420px">
    <h3>📥 استيراد البيانات</h3>
    <div style="font-size:12px;color:var(--text2);background:var(--card-bg);border:1px solid var(--card-border);border-radius:8px;padding:10px 12px;margin-bottom:14px">
      ${isFamilyCopy}
      <div>👥 ${count} فرد</div>
      <div>🕒 ${dt}</div>
    </div>
    <div style="display:flex;flex-direction:column;gap:10px;margin-bottom:14px">
      <div onclick="doImport('replace')" style="cursor:pointer;padding:14px 16px;border:1px solid var(--card-border);border-radius:10px;background:var(--card-bg)" onmouseover="this.style.borderColor='#ef4444'" onmouseout="this.style.borderColor='var(--card-border)'">
        <div style="font-size:14px;font-weight:600;color:var(--text);margin-bottom:4px">🔄 استبدال كل البيانات</div>
        <div style="font-size:12px;color:var(--text2)">يحذف الشجرة الحالية ويستبدلها بالبيانات المستوردة<br><span style="color:#ef4444">⚠️ لا يمكن التراجع عن هذا الإجراء</span></div>
      </div>
      <div onclick="doImport('merge')" style="cursor:pointer;padding:14px 16px;border:1px solid var(--card-border);border-radius:10px;background:var(--card-bg)" onmouseover="this.style.borderColor='#22c55e'" onmouseout="this.style.borderColor='var(--card-border)'">
        <div style="font-size:14px;font-weight:600;color:var(--text);margin-bottom:4px">➕ إضافة إلى الشجرة الحالية <span style="font-size:11px;font-weight:400;color:#22c55e;background:#dcfce7;border:1px solid #86efac;padding:2px 6px;border-radius:6px;margin-right:6px">آمن</span></div>
        <div style="font-size:12px;color:var(--text2)">يضيف الأفراد <strong>الجدد فقط</strong> ويتجاهل المكررين تلقائياً</div>
      </div>
    </div>
    <div class="modal-footer"><button class="btn" onclick="closeModal();_pendingImportData=null;">إلغاء</button></div>
  </div></div>`;
  document.getElementById('modalContainer').innerHTML = html;
}

function doImport(mode) {
  closeModal();
  let d = _pendingImportData;
  _pendingImportData = null;
  if (!d) return;

  try {
    if (mode === 'replace') {
      people = d.people;
      nextId = d.nextId || 1;
      relPairs = d.relPairs || [];
      if (d.myPersonId) { myPersonId = parseInt(d.myPersonId); saveMyPerson(); }
      expanded = {};
      people.forEach(p => { expanded[p.id] = false; });
      if (typeof migrateExternalSpouses === 'function') migrateExternalSpouses();
      if (typeof normalizeAllPersonDates === 'function') normalizeAllPersonDates();
      _invalidateAll();
      if (people.length) expanded[people[0].id] = true;
      _applyFamilyMetaIfNeeded(d);
      saveData(); renderAll(); updateMyPersonBtn();
      setTimeout(() => alert(`✔ تم الاستيراد بنجاح! (${people.length} فرد)`), 200);

    } else {
      // وضع الدمج
      let incoming = JSON.parse(JSON.stringify(d.people));
      let incomingRel = JSON.parse(JSON.stringify(d.relPairs || []));

      function isSamePerson(incomingP, existingP) {
        let nameMatch = normalizeAr(incomingP.name) === normalizeAr(existingP.name);
        if (!nameMatch) return false;
        if (incomingP.gender && existingP.gender && incomingP.gender !== existingP.gender) return false;
        let incomingParent = incoming.find(x => x.id === incomingP.parentId);
        let existingParent = getPerson(existingP.parentId);
        if (incomingParent && existingParent) {
          return normalizeAr(incomingParent.name) === normalizeAr(existingParent.name);
        }
        if (!incomingP.parentId && !existingP.parentId) return true;
        if (!!incomingP.parentId !== !!existingP.parentId) return false;
        return true;
      }

      let idMap = new Map();
      let trulyNew = [];

      incoming.forEach(p => {
        let duplicate = people.find(ep => isSamePerson(p, ep));
        if (duplicate) {
          idMap.set(p.id, duplicate.id);
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

      let skipped = incoming.length - trulyNew.length;
      people = people.concat(trulyNew);
      trulyNew.forEach(p => { expanded[p.id] = false; });
      _invalidateAll();
      _applyFamilyMetaIfNeeded(d);
      saveData(); renderAll(); updateMyPersonBtn();

      let msg = `✔ تم الدمج بنجاح!\n➕ أضيف ${trulyNew.length} فرد جديد`;
      if (skipped > 0) msg += `\n⏭️ تجاهل ${skipped} فرد مكرر موجود مسبقاً`;
      msg += `\n👥 إجمالي الشجرة: ${people.length} فرد`;
      setTimeout(() => alert(msg), 200);
    }
  } catch (ex) {
    alert('خطأ أثناء الاستيراد: ' + ex.message);
  }
}

// تطبيق _familyMeta تلقائياً عند الاستيراد في نسخة العائلة
function _applyFamilyMetaIfNeeded(data) {
  if (!IS_FAMILY_COPY) return;
  let meta = data._familyMeta;
  if (!meta) return;
  if (meta.pat) {
    FAMILY_UPLOAD_CONFIG.GITHUB_PAT = meta.pat;
    try { localStorage.setItem('ft_fupload_pat', meta.pat); } catch (e) {}
  }
  if (meta.gistId) {
    FAMILY_UPLOAD_CONFIG.GIST_ID = meta.gistId;
    try { localStorage.setItem(FAMILY_UPLOAD_GIST_KEY, meta.gistId); } catch (e) {}
    try { localStorage.setItem('ft_fupload_gid', meta.gistId); } catch (e) {}
  }
  if (meta.keyHex) {
    FAMILY_UPLOAD_CONFIG.KEY_HEX = meta.keyHex;
    try { localStorage.setItem('ft_fupload_key', meta.keyHex); } catch (e) {}
  }
}
