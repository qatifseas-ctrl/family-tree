# 🌳 شجرة العائلة — دليل التثبيت والاستضافة

## هيكل الملفات

```
family-tree-pwa/
├── index.html              ← التطبيق الرئيسي (مُعدَّل)
├── manifest.json           ← بيانات تعريف التطبيق (جديد)
├── sw.js                   ← Service Worker للعمل بلا إنترنت (جديد)
└── icons/
    ├── apple-touch-icon.png
    ├── icon-72x72.png
    ├── icon-96x96.png
    ├── icon-128x128.png
    ├── icon-144x144.png
    ├── icon-152x152.png
    ├── icon-192x192.png
    ├── icon-384x384.png
    ├── icon-512x512.png
    ├── icon-maskable-192x192.png
    └── icon-maskable-512x512.png
```

---

## ⚡ لماذا يحتاج التطبيق إلى خادم (Server)؟

التطبيقات التقدمية (PWA) **لا تعمل من مجلد محلي** (file://) لأسباب أمنية.
تحتاج إلى **HTTPS** أو **localhost** لتفعيل:
- ✅ Service Worker (للعمل بلا إنترنت)
- ✅ زر "إضافة إلى الشاشة الرئيسية"
- ✅ التخزين المؤقت (Caching)

---

## 🚀 خيارات الاستضافة المجانية

### الخيار 1: GitHub Pages (مُوصى به — مجاني وسهل)

1. **أنشئ حساباً** على [github.com](https://github.com) (إن لم يكن لديك)
2. **أنشئ مستودعاً جديداً** (New repository)
   - اسمه: `family-tree` أو أي اسم تريده
   - اجعله **Public** (عام)
3. **ارفع الملفات** بالسحب والإفلات أو عبر:
   ```
   git init
   git add .
   git commit -m "first commit"
   git branch -M main
   git remote add origin https://github.com/USERNAME/family-tree.git
   git push -u origin main
   ```
4. **فعّل GitHub Pages**:
   - اذهب إلى Settings → Pages
   - Source: **Deploy from a branch** → main → / (root)
   - احفظ
5. **رابطك سيكون**: `https://USERNAME.github.io/family-tree/`

> ⏱ يستغرق التفعيل 1-3 دقائق

---

### الخيار 2: Netlify (سحب وإفلات — أسرع طريقة)

1. اذهب إلى [netlify.com](https://netlify.com)
2. سجّل دخولاً أو أنشئ حساباً
3. في لوحة التحكم: اسحب **مجلد** `family-tree-pwa` كاملاً وأفلته في المنطقة المخصصة
4. **انتهى!** ستحصل على رابط مثل: `https://amazing-name-123.netlify.app`

---

### الخيار 3: Cloudflare Pages

1. اذهب إلى [pages.cloudflare.com](https://pages.cloudflare.com)
2. أنشئ مشروعاً جديداً
3. ارفع المجلد
4. رابطك: `https://your-project.pages.dev`

---

### الخيار 4: تشغيل محلي للاختبار (على جهازك)

إذا كان لديك Python:
```bash
cd family-tree-pwa
python3 -m http.server 8080
```
ثم افتح: `http://localhost:8080`

إذا كان لديك Node.js:
```bash
npx serve family-tree-pwa
```

---

## 📱 كيفية التثبيت على الهاتف

### Android (Chrome/Edge)
1. افتح الرابط في المتصفح
2. سيظهر **بانر التثبيت** تلقائياً في أسفل الشاشة
3. اضغط **"تثبيت"** ✅

### iPhone / iPad (Safari)
1. افتح الرابط في **Safari** (ليس Chrome أو غيره)
2. اضغط زر **المشاركة** ⬆️ في أسفل الشاشة
3. اختر **"إضافة إلى الشاشة الرئيسية"**
4. اضغط **"إضافة"** ✅

### سطح المكتب (Chrome/Edge)
1. افتح الرابط
2. اضغط على أيقونة التثبيت ➕ في شريط العنوان
3. أو: القائمة ⋮ → "تثبيت شجرة العائلة..."

---

## ✅ قائمة التحقق بعد الرفع

- [ ] يفتح الرابط بـ HTTPS
- [ ] تظهر أيقونة التطبيق في شريط المتصفح
- [ ] يعمل بانر التثبيت على Android
- [ ] يعمل التطبيق بعد قطع الإنترنت (offline mode)
- [ ] تظهر الأيقونة بشكل صحيح بعد التثبيت

---

## 🔧 التغييرات التي تم إجراؤها

| ما كان موجوداً | ما تم استبداله بـ |
|---|---|
| Blob-based manifest (لا يعمل على iOS) | `manifest.json` خارجي صحيح |
| Blob-based Service Worker (لا يعمل على iOS/Safari) | `sw.js` خارجي مع Offline-First caching |
| أيقونة SVG مضمّنة | 11 أيقونة PNG بأحجام متعددة |
| لا يوجد install prompt | بانر تثبيت أنيق (Android + دليل iOS) |
| لا يوجد offline fallback | صفحة احتياطية عند انقطاع الإنترنت |
| لا توجد إشعارات تحديث | toast يظهر عند توفر نسخة جديدة |

---

## 📞 الدعم

إذا واجهت أي مشكلة في التثبيت أو الاستضافة، تأكد من:
1. رفع **جميع الملفات** بما فيها مجلد `icons/`
2. أن الخادم يقدّم الملفات عبر **HTTPS**
3. أن `manifest.json` و `sw.js` في **نفس مجلد** `index.html`
