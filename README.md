# Financial City (کپی‌شده از Learning Studio)

> ریپوی جدا برای چک‌آپ‌ها، کاربرگ‌ها و مسیرها. منشأ و تغییرات: `docs/SOURCE.md` · استقرار زیردامنه: `docs/DEPLOY-SUBDOMAIN.md` · پیش‌نویس حریم خصوصی: `docs/PRIVACY-DRAFT.md`

## شروع (فاز ۰: ایجاد خط پایه)
```
npm install
npm test
npm run validate
npm run build
```
هر خطایی را همین‌طور بفرست تا اصلاح شود، پیش از رفتن به فاز ۱.

---

# Learning Studio (Astro + React islands + TypeScript engine)

کتاب‌ها و بازی‌های تعاملی با گزارش رفتاری کوچک بعد از هر بخش. کد و کامنت‌ها انگلیسی‌اند و هیچ متن فارسی در کد نیست؛ همه‌ی متن‌ها در فایل‌های `locales` و `content` هستند.

## اجرا
```bash
npm install
npm run dev          # http://localhost:4321  (فارسی: /fa/  انگلیسی: /en/)
npm test             # ۳۳ تست: مدل‌ها، استریک، پروفایل، اعتبارسنج، و بازی‌کردن خودکار همه‌ی بخش‌ها
npm run add-part -- <slug> <part>   # افزودن بخش
npm run migrate -- <dir> <slug>     # تبدیل بازی قدیمی داده‌محور
npm run validate     # دروازه‌ی محتوا (اسکیما، ترجمه، لینک‌ها، حلقه و یتیم‌ها)
npm run lint:i18n    # شکست می‌خورد اگر در کد متن فارسی/عربی باشد
npm run build        # validate + lint + build استاتیک → apps/web/dist
```
نیاز: Node 22.12 یا بالاتر.

## نسخه‌ها
`PUBLIC_EDITION=local` (پیش‌فرض): بدون بک‌اند؛ داده در مرورگر؛ فقط محتوای رایگان در build؛ پشتیبان JSON در صفحه‌ی «من». نسخه‌ی `cloud` بعداً به‌صورت ماژول (`docs/MODULES.md`) اضافه می‌شود و تا آن موقع عمداً خطا می‌دهد.

## ساختار
```
content/      محتوا (YAML + Markdown) — هر پکیج: package.yaml، parts/، locales/
packages/content   اسکیمای Zod، لودر، اعتبارسنج، CLI
packages/engine    موتور TS/React: ویجت‌ها، مدل‌های شبیه‌سازی، پروفایل، استریک، store، آداپتر
apps/web      سایت Astro (آرشیو، صفحه‌ی پکیج، پلیر، مسیر، مقاله، پروفایل، PWA)
agents/       دستورالعمل agentهای آینده
docs/         BUILD-PLAN، PACKAGING-MAP، CONTENT-SPEC
```

## ساخت بازی یا کتاب جدید
```bash
npm run new -- game my-game     # اسکلت package.yaml + part + locales
# متن‌ها را در locales/fa.yaml بنویس، ساختار را در parts/*.yaml
npm run validate
```
برای زبان جدید: `en` را به `locales` در package.yaml اضافه کن و `locales/en.yaml` بساز؛ اعتبارسنج هر کلید جاافتاده را نشان می‌دهد.

## اولین کارهای تو بعد از باز کردن
1. روی گوشی واقعی (iOS Safari و Chrome اندروید) RTL، فونت، لغزنده‌ها و دکمه‌های مرتب‌سازی را ببین.
2. `docs/AUTHORING.md` (تولید محتوا)، `docs/DEPLOY.md` (انتشار و چک‌لیست تستر) و `docs/BUILD-PLAN.md` را بخوان.
