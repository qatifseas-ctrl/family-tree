/**
 * js/pwa.js
 * ═══════════════════════════════════════════════════════════════
 * Progressive Web App — Service Worker + Install Prompt
 * ═══════════════════════════════════════════════════════════════
 *
 * Dependencies: لا تعتمد على أي ملف آخر — مستقلة تماماً
 *
 * Reusable: ✅ يمكن استخدام هذا الملف في أي مشروع PWA آخر
 *
 * المسؤوليات:
 *   1. تسجيل Service Worker
 *   2. عرض بانر التثبيت (Android/Chrome)
 *   3. تلميح iOS "Add to Home Screen"
 *   4. Toast تحديث التطبيق
 */

'use strict';

(function () {

  // ── 1. تسجيل Service Worker ──
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', function () {
      navigator.serviceWorker.register('./sw.js', { scope: './' })
        .then(function (reg) {
          console.log('[PWA] Service Worker registered. Scope:', reg.scope);

          // الاستماع لـ SW جديد في انتظار التفعيل
          reg.addEventListener('updatefound', function () {
            let newWorker = reg.installing;
            if (!newWorker) return;
            newWorker.addEventListener('statechange', function () {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                _showUpdateToast();
              }
            });
          });
        })
        .catch(function (err) {
          console.warn('[PWA] Service Worker registration failed:', err);
        });

      // إعادة التحميل عند تفعيل SW جديد
      navigator.serviceWorker.addEventListener('controllerchange', function () {
        window.location.reload();
      });
    });
  }

  // ── 2. التقاط حدث التثبيت (Android/Chrome) ──
  let _deferredPrompt = null;

  window.addEventListener('beforeinstallprompt', function (e) {
    e.preventDefault();
    _deferredPrompt = e;
    _showInstallBanner();
  });

  window.addEventListener('appinstalled', function () {
    _hideInstallBanner();
    _deferredPrompt = null;
    console.log('[PWA] App installed successfully.');
  });

  // ── 3. Install Banner UI ──
  function _showInstallBanner() {
    if (document.getElementById('pwa-install-banner')) return;
    let banner = document.createElement('div');
    banner.id = 'pwa-install-banner';
    banner.setAttribute('role', 'banner');
    banner.setAttribute('aria-label', 'تثبيت التطبيق');
    banner.innerHTML =
      '<div id="pwa-banner-inner">' +
        '<div id="pwa-banner-icon">🌳</div>' +
        '<div id="pwa-banner-text">' +
          '<strong>ثبّت شجرة العائلة</strong>' +
          '<span>وصول سريع بدون إنترنت</span>' +
        '</div>' +
        '<button id="pwa-install-btn" onclick="window._pwaTriggerInstall()">تثبيت</button>' +
        '<button id="pwa-dismiss-btn" onclick="window._pwaDismissBanner()" aria-label="إغلاق">✕</button>' +
      '</div>';
    document.body.appendChild(banner);
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        banner.classList.add('pwa-banner-visible');
      });
    });
  }

  function _hideInstallBanner() {
    let banner = document.getElementById('pwa-install-banner');
    if (!banner) return;
    banner.classList.remove('pwa-banner-visible');
    setTimeout(function () { banner && banner.remove(); }, 400);
  }

  // ── 4. API عامة ──
  window._pwaTriggerInstall = function () {
    if (!_deferredPrompt) return;
    _deferredPrompt.prompt();
    _deferredPrompt.userChoice.then(function (choice) {
      if (choice.outcome === 'accepted') console.log('[PWA] User accepted install.');
      _deferredPrompt = null;
      _hideInstallBanner();
    });
  };

  window._pwaDismissBanner = function () {
    _hideInstallBanner();
    try { sessionStorage.setItem('pwa-banner-dismissed', '1'); } catch (e) {}
  };

  // ── 5. تلميح iOS "Add to Home Screen" ──
  let isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
  let isStandalone = ('standalone' in navigator) && navigator.standalone;
  let wasDismissed = false;
  try { wasDismissed = !!sessionStorage.getItem('pwa-ios-tip-dismissed'); } catch (e) {}

  if (isIOS && !isStandalone && !wasDismissed) {
    window.addEventListener('load', function () {
      setTimeout(function () { _showIOSTip(); }, 3000);
    });
  }

  function _showIOSTip() {
    if (document.getElementById('pwa-ios-tip')) return;
    let tip = document.createElement('div');
    tip.id = 'pwa-ios-tip';
    tip.innerHTML =
      '<div id="pwa-ios-tip-inner">' +
        '<span>📱 لتثبيت التطبيق: اضغط</span>' +
        '<span style="font-size:18px;margin:0 4px">⬆️</span>' +
        '<span>ثم "إضافة إلى الشاشة الرئيسية"</span>' +
        '<button onclick="document.getElementById(\'pwa-ios-tip\').remove();try{sessionStorage.setItem(\'pwa-ios-tip-dismissed\',\'1\')}catch(e){}" ' +
          'style="margin-right:10px;background:none;border:none;color:inherit;font-size:18px;cursor:pointer;opacity:.7">✕</button>' +
      '</div>';
    document.body.appendChild(tip);
    setTimeout(function () { tip.classList.add('pwa-ios-tip-visible'); }, 100);
    setTimeout(function () {
      tip.classList.remove('pwa-ios-tip-visible');
      setTimeout(function () { tip && tip.remove(); }, 500);
    }, 12000);
  }

  // ── 6. Update Toast ──
  function _showUpdateToast() {
    let toast = document.createElement('div');
    toast.id = 'pwa-update-toast';
    toast.innerHTML =
      '🔄 يتوفر تحديث جديد &nbsp;' +
      '<button onclick="navigator.serviceWorker.getRegistration().then(r=>r&&r.waiting&&r.waiting.postMessage(\'SKIP_WAITING\'))" ' +
        'style="padding:4px 12px;border-radius:6px;background:#3b82f6;color:#fff;border:none;cursor:pointer;font-size:13px;">تحديث الآن</button>';
    document.body.appendChild(toast);
    setTimeout(function () { toast.classList.add('pwa-toast-visible'); }, 100);
  }

})();
