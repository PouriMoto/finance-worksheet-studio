# استقرار روی زیردامنه (GitHub Pages، هر ریپو یک زیردامنه)
1. ریپو را بساز و push کن. Settings ← Pages ← Source: **GitHub Actions**.
2. Settings ← Secrets and variables ← Actions ← Variables: متغیر `SITE_URL` = `https://checkup.دامنه‌ی-تو` (بدون اسلش آخر).
3. در Settings ← Pages ← Custom domain همان زیردامنه را بنویس و Save کن. (با Actions فایل CNAME ساخته نمی‌شود و لازم هم نیست.)
4. در DNS دامنه یک رکورد **CNAME** بساز: نام = `checkup` ، مقدار = `<username>.github.io` (بدون نام ریپو).
5. صبر کن DNS برسد، بعد «Enforce HTTPS» را بزن.
6. برای ریپوی دیگر (مثلاً Studio) زیردامنه‌ی دیگری (`studio`) با CNAME به همان `<username>.github.io` بگذار. هر سایت Pages فقط یک دامنه‌ی اختصاصی دارد.
نکات: رکورد قدیمی یا پروکسی/CDN روی همان نام ممکن است تداخل کند. اگر دامنه‌ی اصلی‌ات روی سایت کاربری (`<username>.github.io`) تنظیم است، ریپوهای بدون دامنه‌ی اختصاصی زیر مسیر آن (`دامنه/نام-ریپو`) سرو می‌شوند.
