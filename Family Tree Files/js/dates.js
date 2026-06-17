/**
 * js/dates.js
 * ═══════════════════════════════════════════════════════════════
 * دعم التواريخ الميلادية والهجرية
 * Gregorian ↔ Hijri Date Conversion Utilities
 * ═══════════════════════════════════════════════════════════════
 *
 * Dependencies: لا تعتمد على أي ملف آخر — Pure Functions
 *
 * Reusable: ✅ يمكن استخدام هذا الملف في أي مشروع آخر بشكل مستقل
 *
 * API العامة:
 *   normalizePersonDates(person)         ← يُطبِّع تواريخ شخص واحد
 *   normalizeAllPersonDates()            ← يُطبِّع جميع الأشخاص (يحتاج people[])
 *   getPersonDateInfo(person, field)     ← يُعيد {type, gregorian, hijri, display}
 *   getPersonDateDisplay(person, field)  ← يُعيد HTML للعرض
 *   getPersonTreeDateYearDisplay(p, f)   ← يُعيد السنة الميلادية فقط (للشجرة)
 *   buildCalendarFieldBlock(prefix, field, label, person) ← يُنشئ حقل إدخال تاريخ
 *   syncCalendarField(prefix, field)     ← sync بين ميلادي ↔ هجري في حقل الإدخال
 *   readCalendarField(prefix, field)     ← يقرأ قيمة حقل التاريخ المُركَّب
 */

'use strict';

// ── أسماء الأشهر الهجرية ──
const HIJRI_MONTH_NAMES = [
  'محرم', 'صفر', 'ربيع الأول', 'ربيع الثاني', 'جمادى الأولى', 'جمادى الآخرة',
  'رجب', 'شعبان', 'رمضان', 'شوال', 'ذو القعدة', 'ذو الحجة'
];

// ══════════════════════════════════════════════════════════
//  دوال مساعدة داخلية (private)
// ══════════════════════════════════════════════════════════

function _pad2(n) { return String(n).padStart(2, '0'); }

/**
 * توحيد الأرقام العربية والفارسية والفواصل لتكون أرقام ASCII عادية
 */
function _normalizeDigits(s) {
  return (s || '')
    .replace(/[٠-٩]/g, ch => '٠١٢٣٤٥٦٧٨٩'.indexOf(ch))
    .replace(/[۰-۹]/g, ch => '۰۱۲۳۴۵۶۷۸۹'.indexOf(ch))
    .replace(/[‐‑‒–—−\/\.]/g, '-')
    .trim();
}

/** يُحلِّل التاريخ بصيغة ISO (YYYY-MM-DD) */
function _parseISODateParts(s) {
  s = _normalizeDigits(s);
  let m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return null;
  let y = +m[1], mo = +m[2], d = +m[3];
  if (!y || mo < 1 || mo > 12 || d < 1 || d > 31) return null;
  return { year: y, month: mo, day: d };
}

/** يُحلِّل التاريخ الهجري بصيغة DD-MM-YYYY */
function _parseHijriDateParts(s) {
  s = _normalizeDigits(s);
  let m = s.match(/^(\d{1,2})-(\d{1,2})-(\d{3,4})$/);
  if (!m) return null;
  let d = +m[1], mo = +m[2], y = +m[3];
  if (!y || mo < 1 || mo > 12 || d < 1 || d > 30) return null;
  return { year: y, month: mo, day: d };
}

/** تنسيق التاريخ الميلادي للعرض: DD-MM-YYYY */
function _formatGregorianDisplay(iso) {
  let p = _parseISODateParts(iso);
  if (!p) return (iso || '').trim();
  return `${_pad2(p.day)}-${_pad2(p.month)}-${p.year}`;
}

/** تنسيق التاريخ الهجري للإدخال: DD-MM-YYYY */
function _formatHijriInput(parts) {
  if (!parts) return '';
  return `${_pad2(parts.day)}-${_pad2(parts.month)}-${parts.year}`;
}

/** تنسيق التاريخ الهجري للعرض: D شهر YYYYهـ */
function _formatHijriDisplayFromParts(parts) {
  if (!parts) return '';
  return `${parts.day} ${HIJRI_MONTH_NAMES[parts.month - 1] || parts.month} ${parts.year}هـ`;
}

function _compareHijriParts(a, b) {
  if (!a || !b) return NaN;
  return (a.year - b.year) || (a.month - b.month) || (a.day - b.day);
}

// ══════════════════════════════════════════════════════════
//  خوارزمية التحويل: ميلادي → جوليان → هجري
// ══════════════════════════════════════════════════════════

function _gregorianToJdn(y, m, d) {
  if (m <= 2) { y--; m += 12; }
  let A = Math.floor(y / 100);
  let B = 2 - A + Math.floor(A / 4);
  return Math.floor(365.25 * (y + 4716)) + Math.floor(30.6001 * (m + 1)) + d + B - 1524;
}

function _jdnToGregorianParts(jd) {
  let l = jd + 68569;
  let n = Math.floor((4 * l) / 146097);
  l = l - Math.floor((146097 * n + 3) / 4);
  let i = Math.floor((4000 * (l + 1)) / 1461001);
  l = l - Math.floor((1461 * i) / 4) + 31;
  let j = Math.floor((80 * l) / 2447);
  let day = l - Math.floor((2447 * j) / 80);
  l = Math.floor(j / 11);
  let month = j + 2 - 12 * l;
  let year = 100 * (n - 49) + i + l;
  return { year, month, day };
}

function _jdnToISO(jd) {
  let p = _jdnToGregorianParts(jd);
  return `${p.year}-${_pad2(p.month)}-${_pad2(p.day)}`;
}

/**
 * تحويل تاريخ ميلادي (ISO) إلى هجري
 * @param {string} iso - تاريخ ميلادي بصيغة YYYY-MM-DD
 * @returns {{year, month, day}|null}
 */
function _gregorianToHijriParts(iso) {
  let p = _parseISODateParts(iso);
  if (!p) return null;
  let JD = _gregorianToJdn(p.year, p.month, p.day);

  // التقويم الإسلامي الجدولي المُعايَر
  let l = JD - 1948439 + 10632;
  let n = Math.floor((l - 1) / 10631);
  l = l - 10631 * n + 354;
  let j =
    Math.floor((10985 - l) / 5316) * Math.floor((50 * l) / 17719) +
    Math.floor(l / 5670) * Math.floor((43 * l) / 15238);
  l =
    l
    - Math.floor((30 - j) / 15) * Math.floor((17719 * j) / 50)
    - Math.floor(j / 16) * Math.floor((15238 * j) / 43)
    + 29;
  let month = Math.floor((24 * l) / 709);
  let day = l - Math.floor((709 * month) / 24);
  let year = 30 * n + j - 30;
  return { year, month, day };
}

/**
 * تحويل تاريخ هجري إلى ميلادي بالبحث الثنائي
 * @param {string|{year,month,day}} hijriInput
 * @returns {string} ISO date string or ''
 */
function _hijriToGregorianISO(hijriInput) {
  let target = typeof hijriInput === 'string' ? _parseHijriDateParts(hijriInput) : hijriInput;
  if (!target) return '';

  let loJd = _gregorianToJdn(1700, 1, 1);
  let hiJd = _gregorianToJdn(2400, 12, 31);
  let found = null;

  while (loJd <= hiJd) {
    let midJd = Math.floor((loJd + hiJd) / 2);
    let iso = _jdnToISO(midJd);
    let parts = _gregorianToHijriParts(iso);
    if (!parts) break;
    let cmp = _compareHijriParts(parts, target);
    if (cmp < 0) loJd = midJd + 1;
    else { found = midJd; hiJd = midJd - 1; }
  }

  if (found === null) return '';
  let iso = _jdnToISO(found);
  let chk = _gregorianToHijriParts(iso);
  return chk && _compareHijriParts(chk, target) === 0 ? iso : '';
}

// ══════════════════════════════════════════════════════════
//  API العامة
// ══════════════════════════════════════════════════════════

/**
 * استخراج معلومات التاريخ الكاملة من كائن شخص
 * @param {Object} p - كائن الشخص
 * @param {string} field - 'dob' أو 'dod'
 * @returns {{type, original, gregorian, hijri, display}}
 */
function _dateInfoFromPerson(p, field) {
  if (!p) return { type: 'gregorian', original: '', gregorian: '', hijri: '', display: '' };
  let type = (p[field + 'Type'] || '').toString().toLowerCase();
  let original = (p[field] || '').trim();
  let greg = (p[field + 'Gregorian'] || '').trim();
  let hijri = (p[field + 'Hijri'] || '').trim();

  if (!type) {
    if (greg && !hijri) type = 'gregorian';
    else if (hijri && !greg) type = 'hijri';
    else if (_parseISODateParts(original)) type = 'gregorian';
    else if (_parseHijriDateParts(original)) type = 'hijri';
    else if (greg) type = 'gregorian';
    else if (hijri) type = 'hijri';
    else type = 'gregorian';
  }

  if (type === 'gregorian') {
    if (!greg && _parseISODateParts(original)) greg = original;
    if (!hijri && greg) {
      let hp = _gregorianToHijriParts(greg);
      if (hp) hijri = _formatHijriInput(hp);
    }
    if (!original) original = greg || hijri || '';
  } else {
    if (!hijri && _parseHijriDateParts(original)) hijri = original;
    if (!greg && hijri) greg = _hijriToGregorianISO(hijri);
    if (!original) original = hijri || greg || '';
  }

  let display = '';
  if (greg && hijri) display = `${_formatGregorianDisplay(greg)} (${_formatHijriDisplayFromParts(_parseHijriDateParts(hijri))})`;
  else if (greg) display = _formatGregorianDisplay(greg);
  else if (hijri) display = _formatHijriDisplayFromParts(_parseHijriDateParts(hijri));

  return { type, original, gregorian: greg, hijri, display };
}

/**
 * تطبيع تواريخ شخص واحد (يُحسب الميلادي والهجري ويُخزَّنان معاً)
 * @param {Object} p - كائن الشخص (يُعدَّل في المكان)
 */
function normalizePersonDates(p) {
  if (!p) return p;
  let b = _dateInfoFromPerson(p, 'dob');
  p.dobType = b.type; p.dob = b.original; p.dobGregorian = b.gregorian; p.dobHijri = b.hijri;
  let d = _dateInfoFromPerson(p, 'dod');
  p.dodType = d.type; p.dod = d.original; p.dodGregorian = d.gregorian; p.dodHijri = d.hijri;
  return p;
}

/**
 * تطبيع تواريخ جميع الأشخاص
 * ملاحظة: يعتمد على المتغير العام people[]
 */
function normalizeAllPersonDates() {
  if (typeof people !== 'undefined') people.forEach(normalizePersonDates);
}

/** يُعيد معلومات التاريخ لعرضها */
function getPersonDateInfo(p, field) {
  return _dateInfoFromPerson(p, field);
}

/**
 * يُنشئ HTML لعرض التاريخ بشكل منسّق (ميلادي + هجري)
 */
function getPersonDateDisplay(p, field) {
  let info = _dateInfoFromPerson(p, field);
  if (info.gregorian && info.hijri) {
    return `<div style="display:flex;flex-direction:column;align-items:flex-start;gap:2px;line-height:1.35;width:100%">
      <span style="font-size:13px;text-align:left;width:100%">${_formatGregorianDisplay(info.gregorian)}</span>
      <span style="font-size:13px;color:var(--text2);text-align:left;width:100%">${_formatHijriDisplayFromParts(_parseHijriDateParts(info.hijri))}</span>
    </div>`;
  }
  if (info.gregorian) return `<span style="font-size:13px;display:inline-block;text-align:left">${_formatGregorianDisplay(info.gregorian)}</span>`;
  if (info.hijri) return `<span style="font-size:13px;display:inline-block;text-align:left">${_formatHijriDisplayFromParts(_parseHijriDateParts(info.hijri))}</span>`;
  return '';
}

/**
 * يُعيد السنة الميلادية فقط (للعرض المختصر في الشجرة)
 */
function getPersonTreeDateYearDisplay(p, field) {
  let info = _dateInfoFromPerson(p, field);
  let source = info.gregorian || info.original || '';
  let parts = _parseISODateParts(source);
  return parts ? String(parts.year) : '';
}

/**
 * يُنشئ سطر "الميلاد · الوفاة" للعرض
 */
function getPersonLifeDatesLine(p) {
  let birth = getPersonDateDisplay(p, 'dob');
  let death = getPersonDateDisplay(p, 'dod');
  if (!birth && !death) return '';
  let parts = [];
  if (birth) parts.push(`الميلاد: ${birth}`);
  if (death) parts.push(`الوفاة: ${death}`);
  return parts.join(' · ');
}

// ══════════════════════════════════════════════════════════
//  مكوّنات حقول إدخال التاريخ المُركَّبة (ميلادي/هجري)
// ══════════════════════════════════════════════════════════

/**
 * يُنشئ HTML لحقل إدخال تاريخ يدعم التبديل بين الميلادي والهجري
 * @param {string} prefix - بادئة فريدة لمعرفات العناصر
 * @param {string} field  - 'dob' أو 'dod'
 * @param {string} label  - التسمية المعروضة
 * @param {Object} person - الشخص الحالي (للقيم الافتراضية)
 */
function buildCalendarFieldBlock(prefix, field, label, person) {
  let info = _dateInfoFromPerson(person || {}, field);
  let type = info.type || 'gregorian';
  let greg = info.gregorian || '';
  let hijri = info.hijri || '';
  let display = info.display || '—';
  let gStyle = type === 'gregorian' ? '' : 'display:none';
  let hStyle = type === 'hijri' ? '' : 'display:none';
  return `
    <div class="form-row">
      <label>${label}</label>
      <div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap">
        <select id="${prefix}_${field}_type" onchange="syncCalendarField('${prefix}','${field}')">
          <option value="gregorian"${type === 'gregorian' ? ' selected' : ''}>ميلادي</option>
          <option value="hijri"${type === 'hijri' ? ' selected' : ''}>هجري</option>
        </select>
        <input type="date" id="${prefix}_${field}_greg" value="${greg}" oninput="syncCalendarField('${prefix}','${field}')" style="min-width:160px;${gStyle}">
        <input type="text" id="${prefix}_${field}_hijri" value="${hijri}" oninput="syncCalendarField('${prefix}','${field}')" placeholder="13-10-1415" inputmode="numeric" style="min-width:160px;${hStyle}">
      </div>
      <div id="${prefix}_${field}_preview" style="margin-top:4px;font-size:11px;color:var(--text2)">المحوّل: ${display}</div>
    </div>`;
}

/**
 * مزامنة حقل التاريخ (ميلادي ↔ هجري) عند التغيير
 */
function syncCalendarField(prefix, field) {
  let typeEl = document.getElementById(`${prefix}_${field}_type`);
  let gEl = document.getElementById(`${prefix}_${field}_greg`);
  let hEl = document.getElementById(`${prefix}_${field}_hijri`);
  let prev = document.getElementById(`${prefix}_${field}_preview`);
  if (!typeEl || !gEl || !hEl || !prev) return;
  let type = typeEl.value || 'gregorian';
  let display = '';
  if (type === 'gregorian') {
    gEl.style.display = ''; hEl.style.display = 'none';
    let original = gEl.value.trim();
    if (original) {
      let hp = _gregorianToHijriParts(original);
      if (hp) { hEl.value = _formatHijriInput(hp); display = `${_formatGregorianDisplay(original)} (${_formatHijriDisplayFromParts(hp)})`; }
      else { display = _formatGregorianDisplay(original); }
    } else { hEl.value = ''; display = '—'; }
  } else {
    gEl.style.display = 'none'; hEl.style.display = '';
    let original = _normalizeDigits(hEl.value.trim());
    if (original !== hEl.value) hEl.value = original;
    if (original) {
      let hp = _parseHijriDateParts(original);
      if (hp) {
        let greg = _hijriToGregorianISO(hp);
        if (greg) gEl.value = greg;
        display = greg ? `${_formatGregorianDisplay(greg)} (${_formatHijriDisplayFromParts(hp)})` : _formatHijriDisplayFromParts(hp);
      } else { display = original; }
    } else { gEl.value = ''; display = '—'; }
  }
  prev.textContent = `المحوّل: ${display}`;
}

/**
 * قراءة قيمة حقل التاريخ المُركَّب
 * @returns {{type, original, gregorian, hijri}}
 */
function readCalendarField(prefix, field) {
  let typeEl = document.getElementById(`${prefix}_${field}_type`);
  let gEl = document.getElementById(`${prefix}_${field}_greg`);
  let hEl = document.getElementById(`${prefix}_${field}_hijri`);
  let type = typeEl ? typeEl.value : 'gregorian';
  let original = '', greg = '', hijri = '';
  if (type === 'hijri') {
    hijri = _normalizeDigits((hEl && hEl.value) || '');
    original = hijri;
    if (hijri) {
      let hp = _parseHijriDateParts(hijri);
      if (hp) greg = _hijriToGregorianISO(hp);
    }
    if (!greg && gEl && gEl.value) greg = gEl.value.trim();
  } else {
    greg = (gEl && gEl.value) || '';
    original = greg;
    if (greg) {
      let hp = _gregorianToHijriParts(greg);
      if (hp) hijri = _formatHijriInput(hp);
    }
    if (!hijri && hEl && hEl.value) hijri = _normalizeDigits(hEl.value);
  }
  return { type, original, gregorian: greg, hijri };
}
