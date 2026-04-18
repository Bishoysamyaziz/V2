# مستشاري — Mostasharai Platform 🚀

منصة استشارات مهنية عربية متكاملة — Professional Arabic Consulting Platform

## التقنيات المستخدمة

- **Frontend**: Next.js 15, React 19, TypeScript, Tailwind CSS v4
- **الخط**: Tajawal (Arabic/Latin)
- **قاعدة البيانات**: Firebase Firestore (Real-time)
- **المصادقة**: Firebase Auth (Email + Google)
- **التخزين**: Firebase Storage
- **الفيديو المباشر**: Stream Video SDK
- **الذكاء الاصطناعي**: Google Gemini API
- **الأيقونات**: react-icons
- **الحركة**: Framer Motion

## المتطلبات

- Node.js 18+
- مشروع Firebase مُعد مسبقاً
- مفاتيح Stream Video SDK
- مفتاح Gemini AI API

## الإعداد

```bash
# 1. استنسخ المشروع
git clone https://github.com/yourusername/mostasharai
cd mostasharai

# 2. انسخ ملف البيئة
cp .env.example .env.local

# 3. أضف مفاتيحك في .env.local

# 4. ثبّت المكتبات
npm install

# 5. شغّل بيئة التطوير
npm run dev
```

## الصفحات

| المسار | الوصف |
|--------|--------|
| `/` | الصفحة الرئيسية — منشورات + فيديوهات |
| `/experts` | قائمة الخبراء المعتمدين |
| `/expert/[id]` | صفحة خبير بعينه |
| `/sessions` | جلساتي |
| `/consultations/[id]` | غرفة جلسة الاستشارة |
| `/wallet` | المحفظة الرقمية (NEX) |
| `/profile/[id]` | الملف الشخصي |
| `/notifications` | الإشعارات |
| `/settings` | الإعدادات |
| `/admin` | غرفة العمليات (مالك المنصة فقط) |
| `/login` | تسجيل الدخول |
| `/register` | إنشاء حساب |

## نظام الأدوار

- `user` — مستخدم عادي
- `expert` — خبير معتمد
- `admin_owner` — مالك المنصة

## النشر على Vercel

```bash
npm run build   # تأكد من نجاح البناء
vercel deploy   # أو ادفع لـ GitHub المربوط بـ Vercel
```

تأكد من إضافة جميع متغيرات `.env.example` في إعدادات Vercel.

## عملة NEX

عملة رقمية داخلية للمنصة. سعر التحويل: **1 NEX = 15 جنيه مصري**.
- الإيداع: يتم يدوياً عبر تحويل بنكي وموافقة المالك
- السحب: يتم مراجعته خلال 1-3 أيام عمل
- عمولة المنصة: 10% على كل جلسة استشارة

---
Built with ❤️ for the Arab consulting community
