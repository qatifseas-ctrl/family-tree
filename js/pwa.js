(function () {
  'use strict';

  /* ── 1. Register the proper external service worker ── */
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', function () {
      navigator.serviceWorker.register('./sw.js', { scope: './' })
        .then(function (reg) {
          console.log('[PWA] Service Worker registered. Scope:', reg.scope);

          /* Listen for a new SW waiting to activate and prompt user */
          reg.addEventListener('updatefound', function () {
            var newWorker = reg.installing;
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

      /* Reload when a new SW takes control */
      navigator.serviceWorker.addEventListener('controllerchange', function () {
        window.location.reload();
      });
    });
  }

  /* ── 2. Capture the beforeinstallprompt event (Android/Chrome) ── */
  var _deferredPrompt = null;

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

  /* ── 3. Install Banner UI ── */
  function _showInstallBanner() {
    if (document.getElementById('pwa-install-banner')) return;

    var banner = document.createElement('div');
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

    /* Animate in */
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        banner.classList.add('pwa-banner-visible');
      });
    });
  }

  function _hideInstallBanner() {
    var banner = document.getElementById('pwa-install-banner');
    if (!banner) return;
    banner.classList.remove('pwa-banner-visible');
    setTimeout(function () { banner && banner.remove(); }, 400);
  }

  /* ── 4. Public API ── */
  window._pwaTriggerInstall = function () {
    if (!_deferredPrompt) return;
    _deferredPrompt.prompt();
    _deferredPrompt.userChoice.then(function (choice) {
      if (choice.outcome === 'accepted') {
        console.log('[PWA] User accepted install.');
      }
      _deferredPrompt = null;
      _hideInstallBanner();
    });
  };

  window._pwaDismissBanner = function () {
    _hideInstallBanner();
    /* Remember dismissal for 3 days */
    try { sessionStorage.setItem('pwa-banner-dismissed', '1'); } catch (e) {}
  };

  /* ── 5. iOS "Add to Home Screen" tip (Safari) ── */
  var isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
  var isStandalone = ('standalone' in navigator) && navigator.standalone;
  var wasDismissed = false;
  try { wasDismissed = !!sessionStorage.getItem('pwa-ios-tip-dismissed'); } catch(e) {}

  if (isIOS && !isStandalone && !wasDismissed) {
    window.addEventListener('load', function () {
      setTimeout(function () { _showIOSTip(); }, 3000);
    });
  }

  function _showIOSTip() {
    if (document.getElementById('pwa-ios-tip')) return;
    var tip = document.createElement('div');
    tip.id = 'pwa-ios-tip';
    tip.innerHTML =
      '<div id="pwa-ios-tip-inner">' +
        '<span>📱 لتثبيت التطبيق: اضغط</span>' +
        '<span style="font-size:18px;margin:0 4px">⬆️</span>' +
        '<span>ثم "إضافة إلى الشاشة الرئيسية"</span>' +
        '<button onclick="document.getElementById(\'pwa-ios-tip\').remove();try{sessionStorage.setItem(\'pwa-ios-tip-dismissed\',\'1\')}catch(e){}" style="margin-right:10px;background:none;border:none;color:inherit;font-size:18px;cursor:pointer;opacity:.7">✕</button>' +
      '</div>';
    document.body.appendChild(tip);
    setTimeout(function () { tip.classList.add('pwa-ios-tip-visible'); }, 100);
    setTimeout(function () {
      tip.classList.remove('pwa-ios-tip-visible');
      setTimeout(function () { tip && tip.remove(); }, 500);
    }, 12000);
  }

  /* ── 6. Update toast ── */
  function _showUpdateToast() {
    var toast = document.createElement('div');
    toast.id = 'pwa-update-toast';
    toast.innerHTML =
      '🔄 يتوفر تحديث جديد &nbsp;' +
      '<button onclick="navigator.serviceWorker.getRegistration().then(r=>r&&r.waiting&&r.waiting.postMessage(\'SKIP_WAITING\'))" ' +
        'style="padding:4px 12px;border-radius:6px;background:#3b82f6;color:#fff;border:none;cursor:pointer;font-size:13px;">تحديث الآن</button>';
    document.body.appendChild(toast);
    setTimeout(function () { toast.classList.add('pwa-toast-visible'); }, 100);
  }

})();
