# راهنمای تولید و ویرایش محتوا

همه‌چیز فایل است (`content/`). بعد از هر تغییر: `npm run validate` و برای دیدن نتیجه `npm run dev`.

## ۱. افزودن بازی/کتاب/آزمون جدید
```bash
npm run new -- game my-game        # یا book / test
```
این دستور `content/packages/my-game/` را می‌سازد: `package.yaml`، `parts/part-1.yaml`، `locales/fa.yaml`.
۱) در `package.yaml`: `emoji`، `accent` (teal|violet|amber|rose|sky)، `category` (از `content/categories.yaml`)، `tags`، `level`، `minutes`، `dims` (از `content/dims/registry.yaml`)، `featured`.
۲) ساختار صحنه‌ها در `parts/*.yaml` (بدون متن)، همه‌ی جمله‌ها در `locales/fa.yaml` با همان `id`ها.
۳) `npm run validate` را بزن؛ اگر چیزی جا افتاده باشد دقیقاً می‌گوید کجا.
۴) پکیج را به یک مسیر (`content/paths/*.yaml`) یا `next/related` یک پکیج دیگر وصل کن، وگرنه «یتیم» می‌ماند.

## ۲. اضافه یا حذف کردن بخش (پارت)
```bash
npm run add-part -- my-game part-2    # فایل پارت + متن خالی در همه‌ی زبان‌ها + ثبت در package.yaml
```
- ترتیب بخش‌ها = ترتیب `parts:` در `package.yaml`.
- حذف: نام را از `parts:` بردار، فایل `parts/<id>.yaml` و بلوک `parts.<id>` در `locales/*.yaml` را پاک کن.
- هر بخش ۵ تا ۸ صحنه و در آخر یک `report` داشته باشد؛ آخرین بخش `scope: package`.

## ۳. صحنه‌ها (هر صحنه یک عنصر در `scenes:`)
| type | چه می‌کند | متن لازم در locales |
|---|---|---|
| `narrative` | توضیح | `body` (و `title`) |
| `choice` | تصمیم (جواب درست ندارد) | `prompt`، `options.<id>.{label,feedback}` |
| `quiz` | آزمون (دقیقاً یک `correct: true`) | مثل choice |
| `sim` | شبیه‌سازی با لغزنده | `prompt`، `inputs.<id>.label` |
| `sort` | مرتب‌سازی | `prompt`، `items.<id>` |
| `match` | وصل‌کردن جفت‌ها (۲ تا ۶) | `prompt`، `pairs.<id>.{left,right}` |
| `reflect` | تأمل؛ در پروفایل ذخیره می‌شود | `prompt`، `placeholder` |
| `report` | گزارش | — |
- **راهنمایی (hint):** در متن هر `choice/quiz` فیلد `hints: [سرنخ۱, سرنخ۲]` بگذار؛ کاربر با دکمه‌ی «راهنمایی» یکی‌یکی می‌بیند.
- **شاخه‌ای شدن:** روی گزینه یا صحنه `goto: <sceneId>`.
- **امتیاز رفتاری:** `dims: {long_term_thinking: 2}` روی گزینه‌ها؛ بهترین گزینه ۲، بدترین ۰.

## ۴. صفحه‌ی هر بازی (توضیحات، تصویر، تایل‌های صحنه)
صفحه‌ی `/fa/p/<slug>/` از همین فایل‌ها ساخته می‌شود:
- **عنوان، زیرعنوان، توضیح کوتاه:** `locales/fa.yaml` → `package.title/subtitle/description`.
- **متن بلند «درباره‌ی این تجربه»** (با تیتر، لیست و تصویر بزرگ): `package.about` به‌صورت Markdown.
- **نوار تصاویر (gallery):** در `package.yaml` فهرست `gallery: [my-game/shot-1.webp, ...]` و در `locales` زیر `package.gallery` کپشن هر فایل.
- **تایل‌های «چه چیزی در انتظار توست»:** خودکارند؛ برای هر صحنه‌ی بخش‌های رایگان نوع + خلاصه‌ی عنوان، و برای بخش‌های **قفل** فقط نوع صحنه با علامت 🔒 (بدون متن) نشان داده می‌شود.
- **نویسنده:** `package.author` (نام و معرفی)؛ صحنه‌ی با id=`author` کارت نویسنده را در پلیر نشان می‌دهد.

### تصاویر
۱) فایل را در `content/media/<slug>/...` بگذار (SVG/WebP/PNG؛ حجم کم).
۲) در Markdown: `![متن جایگزین](media:my-game/shot-1.webp "کپشن")`. تصویر به‌صورت figure تمام‌عرض نمایش داده می‌شود (هم در `about` و هم در مقاله‌ها).
۳) `npm run dev/build` خودش فایل‌ها را کپی می‌کند (`sync:media`)؛ اعتبارسنج مسیرهای ناموجود را خطا می‌دهد.

## ۵. رایگان یا پولی (قفل)
- `access: free|premium` در `package.yaml` (پیش‌فرض کل پکیج) و اختیاری روی هر پارت (`access:` بالای فایل پارت).
- پیشنهاد: پارت اول هر پکیج پولی را `free` بگذار تا کاربر طعم ببیند.
- نسخه‌ی Local (بدون بک‌اند): بخش‌های پولی **قفل** می‌شوند؛ نه صحنه‌ای و نه متنی از آن‌ها در خروجی نیست؛ فقط عنوان، تعداد و نوع صحنه‌ها و علامت 🔒. باز کردن آن‌ها کار نسخه‌ی Cloud (`MODULES.md`) است.
- رایگان کردن موقت یا کد تخفیف برای یک بخش: ماژول `promotions` در نسخه‌ی Cloud؛ الان فقط با عوض کردن `access` و build دوباره.

## ۶. مقاله
`content/articles/<slug>.fa.md` با frontmatter (`title`, `description`, `date`, `tags`, `packages`, `faq`). تصویر بزرگ داخل متن با همان `![..](media:..)`. یک جمله‌ی پاسخ مستقیم در ابتدا و ۳ تا ۵ پرسش FAQ برای AEO.

## ۷. تغییر ظاهر یک پکیج
`emoji`، `accent`، `category` و `featured` در `package.yaml`. کاور فعلی emoji روی گرادیان رنگ `accent` است؛ کاور تصویری در برنامه‌ی فاز ۲ است.

## ۸. زبان جدید
`locales: [fa, en]` در package.yaml، فایل `locales/en.yaml` و برچسب‌های `content/dims/en.yaml` و `content/categories.yaml`. اعتبارسنج کلیدهای جاافتاده را نشان می‌دهد.

## ۹. مهاجرت بازی قدیمی داده‌محور
```bash
npm run migrate -- <پوشه‌ی src بازی قدیمی> <slug-جدید> <category>
```
فقط بازی‌هایی که `scenes.json` دارند. هرچه تبدیل نشود (tangle، radar، ...) در خروجی «warn» می‌شود. عنوان‌ها، توضیح و `rewards` را دستی کامل کن.
