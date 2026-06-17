/**
 * js/config.js
 * ═══════════════════════════════════════════════════════════════
 * الثوابت والإعدادات العامة للتطبيق
 * Constants & Configuration
 * ═══════════════════════════════════════════════════════════════
 *
 * Dependencies: لا تعتمد على أي ملف آخر
 */

'use strict';

// ╔══════════════════════════════════════════════════════════════════╗
// ║  إعدادات الحفظ السحابي — للمالك فقط                             ║
// ║  CLOUD SAVE CONFIGURATION — OWNER ONLY                           ║
// ╚══════════════════════════════════════════════════════════════════╝
const CLOUD_CONFIG = {
  // مفتاح التشفير AES-256 — 64 حرف hex
  // أنشئه مرة واحدة بـ: [...crypto.getRandomValues(new Uint8Array(32))].map(b=>b.toString(16).padStart(2,'0')).join('')
  KEY_HEX: '',  // ← ضع مفتاحك هنا

  // GitHub Personal Access Token (صلاحية gist فقط)
  GITHUB_PAT: '',  // ← مثلاً: 'github_pat_xxxxxx'

  // معرّف Gist (يُملأ تلقائياً بعد أول مزامنة)
  GIST_ID: '',

  // اسم الملف المشفّر في Gist
  GIST_FILE: 'ft_encrypted.dat',
};

// ╔══════════════════════════════════════════════════════════════════╗
// ║  إعدادات رفع نسخة العائلة الصامت                                 ║
// ╚══════════════════════════════════════════════════════════════════╝
const FAMILY_UPLOAD_CONFIG = {
  GITHUB_PAT: '',  // ← توكن GitHub خاص بالرفع
  GIST_ID:    '',  // ← يُنشأ تلقائياً إذا تُرك فارغاً
  KEY_HEX:    '',  // ← اختياري — لتشفير أقوى
};

// ── ثوابت مفاتيح localStorage / sessionStorage ──
const CLOUD_PHOTOS_FILE      = 'ft_photos.dat';
const CLOUD_GIST_KEY         = 'ft_cloud_gist_id_v1';
const DEVICE_INIT_KEY        = 'ft_device_init_v1';
const FAMILY_UPLOAD_GIST_KEY = 'ft_family_gist_id_v1';
const MERGE_HISTORY_KEY      = 'ft_merge_history_v1';
const MERGE_HISTORY_LIMIT    = 8;
const MOB_KEY                = 'ft_mobile_mode_v1';
const SEARCH_HISTORY_KEY     = 'ft_search_history_v1';
const FT_DEVICE_NAME_MAP_KEY = 'ft_device_name_map';

// ── علامة تُضمَّن في نسخة العائلة تلقائياً عند التصدير ──
const IS_FAMILY_COPY   = false;
// ── معرّف الجهاز — يُنشأ عشوائياً لكل نسخة عائلة مصدَّرة ──
const FAMILY_DEVICE_ID = '';

// ── صورة الفاتحة (base64 مضمّنة) ──
// يمكن استبدالها بـ URL خارجي إذا رُفعت على CDN
const FATIHA_IMG = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAkGBwgHBgkIBwgKCgkLDRYPDQwMDRsUFRAWIB0iIiAdHx8kKDQsJCYxJx8fLT0tMTU3Ojo6Iys/RD84QzQ5Ojf/2wBDAQoKCg0MDRoPDxo3JR8lNzc3Nzc3Nzc3Nzc3Nzc3Nzc3Nzc3Nzc3Nzc3Nzc3Nzc3Nzc3Nzc3Nzc3Nzc3Nzf/wAARCAEYARgDASIAAhEBAxEB/8QAHAAAAQUBAQEAAAAAAAAAAAAAAAECBAUGAwcI/8QASRAAAQMDAwEFBgIGBQoGAwAAAQIDBAAFEQYSITETQVFhcQcUIjKBkVKhFSNCscHRFiQzcpM0Q0RTVWKCkpTwFyVUg7LhdKPT/8QAGQEBAQEBAQEAAAAAAAAAAAAAAAECAwQF/8QAKhEAAgIBBAICAgIBBQAAAAAAAAECEQMSEyExMkEEIlFhcYGRBRRCobH/2gAMAwEAAhEDEQA/...'; // (مقتطعة للإيجاز — الكود الكامل في الملف الأصلي)

// ── Helper Functions للجهاز ──

function _isNewDevice() {
  try { return !localStorage.getItem(DEVICE_INIT_KEY); } catch (e) { return false; }
}

function _markDeviceInit() {
  try { localStorage.setItem(DEVICE_INIT_KEY, '1'); } catch (e) {}
}

/**
 * الحصول على اسم ملف Gist الفريد لهذا الجهاز
 * كل جهاز له ملفه الخاص في Gist لتجنب التصادم
 */
function _getFamilyGistFileName() {
  let id = localStorage.getItem('ft_family_device_id') || '';
  if (!id) {
    id = [...crypto.getRandomValues(new Uint8Array(4))]
      .map(b => b.toString(16).padStart(2, '0')).join('');
    try { localStorage.setItem('ft_family_device_id', id); } catch (e) {}
  }
  return 'ft_family_' + id + '.dat';
}

// ── خريطة أسماء الأجهزة ──

function _getDeviceNameMap() {
  try { return JSON.parse(localStorage.getItem(FT_DEVICE_NAME_MAP_KEY) || '{}'); } catch (e) { return {}; }
}

function _setDeviceName(devId, name) {
  let map = _getDeviceNameMap();
  if (name) map[devId] = name; else delete map[devId];
  try { localStorage.setItem(FT_DEVICE_NAME_MAP_KEY, JSON.stringify(map)); } catch (e) {}
}

function _resolveDeviceName(devId, uploadedName) {
  let map = _getDeviceNameMap();
  return map[devId] || uploadedName || '';
}
