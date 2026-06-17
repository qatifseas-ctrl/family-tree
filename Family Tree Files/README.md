# 🌳 شجرة العائلة — Family Tree

تطبيق PWA لإدارة شجرة العائلة، مُعاد هيكلته من ملف HTML واحد إلى مشروع منظّم.

---

## 📁 هيكل المشروع

```
family-tree/
├── index.html              ← نقطة الدخول الرئيسية (HTML فقط)
├── manifest.json           ← PWA manifest
├── sw.js                   ← Service Worker
├── README.md               ← هذا الملف
│
├── css/
│   ├── base.css            ← CSS Variables (theme system) + reset
│   ├── components.css      ← مكوّنات UI (cards, modals, forms)
│   ├── mobile.css          ← وضع الجوال
│   └── pwa.css             ← PWA banners & toasts
│
└── js/
    ├── config.js           ← الثوابت والإعدادات (CLOUD_CONFIG, FAMILY_UPLOAD_CONFIG)
    ├── core.js             ← نموذج البيانات (CRUD الأشخاص، الفهارس، التواريخ)
    ├── dates.js            ← تحويل التواريخ (ميلادي ↔ هجري)
    ├── search.js           ← محرك البحث والتنقل في النتائج
    ├── kinship.js          ← حساب القرابة (دم + مصاهرة)
    ├── tree.js             ← رسم الشجرة في DOM
    ├── mobile.js           ← وضع الجوال + Action Sheet
    ├── export.js           ← تصدير/استيراد (HTML, JSON)
    ├── cloud.js            ← مزامنة GitHub Gist
    ├── merge.js            ← دمج بيانات العائلة
    ├── storage.js          ← التخزين المحلي + FSA
    ├── pwa.js              ← PWA install prompt + SW registration
    └── app.js              ← نقطة الدخول — init() + renderAll()
```

---

## 🔗 Dependencies بين الوحدات

```
config.js          ← لا تعتمد على أي وحدة أخرى
    ↓
core.js            ← يعتمد على: config.js, dates.js
dates.js           ← مستقلة تماماً (pure functions)
    ↓
search.js          ← يعتمد على: core.js
kinship.js         ← يعتمد على: core.js
tree.js            ← يعتمد على: core.js, search.js, kinship.js, mobile.js
mobile.js          ← يعتمد على: core.js
export.js          ← يعتمد على: core.js, storage.js
cloud.js           ← يعتمد على: core.js, config.js, export.js
merge.js           ← يعتمد على: core.js, cloud.js
storage.js         ← يعتمد على: core.js
pwa.js             ← مستقلة (DOM only)
app.js             ← يجمع كل الوحدات
```

---

## ♻️ الوحدات القابلة لإعادة الاستخدام

| الوحدة | قابلة للاستخدام المستقل | ملاحظات |
|---|---|---|
| `dates.js` | ✅ نعم | Pure functions — لا تعتمد على أي شيء |
| `kinship.js` | ✅ نعم (بعد فصل) | تحتاج `core.js` فقط |
| `search.js` | ✅ نعم (بعد فصل) | تحتاج `core.js` فقط |
| `pwa.js` | ✅ نعم | مستقلة تماماً |
| `cloud.js` | ✅ نعم | تحتاج `config.js` فقط |
| `mobile.js` | ⚠️ جزئياً | مرتبطة بـ DOM التطبيق |
| `tree.js` | ⚠️ جزئياً | مرتبطة بالتطبيق الكامل |

---

## 🚀 ترتيب تحميل الملفات في index.html

```html
<!-- 1. Config & Constants -->
<script src="js/config.js"></script>

<!-- 2. Core Data Layer -->
<script src="js/dates.js"></script>
<script src="js/core.js"></script>

<!-- 3. Features -->
<script src="js/search.js"></script>
<script src="js/kinship.js"></script>
<script src="js/mobile.js"></script>
<script src="js/tree.js"></script>
<script src="js/export.js"></script>
<script src="js/cloud.js"></script>
<script src="js/merge.js"></script>
<script src="js/storage.js"></script>
<script src="js/pwa.js"></script>

<!-- 4. App Entry Point (last) -->
<script src="js/app.js"></script>
```

---

## 🎨 ترتيب تحميل ملفات CSS

```html
<link rel="stylesheet" href="css/pwa.css">
<link rel="stylesheet" href="css/base.css">
<link rel="stylesheet" href="css/components.css">
<link rel="stylesheet" href="css/mobile.css">
```
