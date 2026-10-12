# نقشه‌ی بسته‌بندی: هر بخش از چه چیزی استفاده می‌کند

| بخش | انتخاب (reuse) | وضعیت در این بسته | یادداشت |
|---|---|---|---|
| فریمورک وب | Astro 7 + @astrojs/react | ✅ کار می‌کند | جزیره‌ها: `client:only` برای state، `client:load` برای آرشیو |
| UI | Tailwind 4 + شبیه shadcn (cva, clsx, tailwind-merge) | ✅ دست‌نویس | بعداً `shadcn add` |
| فونت | @fontsource-variable/vazirmatn | ✅ | self-host |
| state مشترک | nanostores | ✅ | ذخیره در localStorage |
| اعتبارسنجی | Zod 4 | ✅ | همان اسکیما نوع TS می‌دهد |
| YAML | yaml | ✅ | |
| مارک‌داون مقاله | marked | ✅ | محتوای معتمد (git) |
| بصری‌سازی | SVG/HTML دست‌نویس معنادار | ✅ ۵ نمونه | Runway، Coin، PriceValue، Stack، BandScale |
| انیمیشن | — | ⏳ | Motion فقط برای لحظه‌ی پاداش |
| درگ و مرتب‌سازی | دکمه‌های بالا/پایین | ✅ ساده | dnd-kit اگر لازم شد |
| چارت پیچیده | — | ⏳ | Recharts (هم‌خانواده‌ی shadcn charts) |
| i18n | JSON + `t()` + Intl | ✅ | تاریخ شمسی با `fa-IR-u-ca-persian` |
| جست‌وجو | substring ساده | ⚠️ | MiniSearch + نرمال‌سازی فارسی |
| PWA | manifest + sw.js دست‌نویس | ✅ ساده | `@vite-pwa/astro` اگر precache خواستی |
| اعلان داخلی | store + `buildNotices` | ✅ | بدون push هم کار می‌کند |
| Web Push | VAPID + `web-push` | ⏳ فقط سمت کلاینت | سرور و تست ایران لازم |
| بک‌اند | PocketBase | ⏳ آداپتر آماده | `backend/pocketbase/README.md` |
| CMS | فایل در گیت (+ Keystatic اختیاری) | ✅ فایل | Keystatic فقط برای مقالات |
| SEO/AEO | JSON-LD، hreflang، sitemap، llms.txt | ✅ | |
| تست | node:test + tsx + jsdom + testing-library | ✅ | |
| agentها | Claude Code | ⏳ | `agents/` |

## مکانیزم‌ها (الهام از محصولات مشابه، با ملاحظه‌ی اخلاقی)
| مکانیزم | الهام | پیاده‌سازی |
|---|---|---|
| جلسه‌ی کوتاه و ادامه‌ی مسیر | Duolingo/Brilliant | بخش ۶ تا ۹ دقیقه، resume با cursor |
| استریک + freeze | Duolingo | `streak.ts`، freeze هر ۷ روز، بدون پیام ترساننده |
| پاداش متغیر | Hooked | نکته‌ی بعد از بخش از روی پاسخ‌ها (قطعی)، نشان کمیاب |
| سرمایه‌گذاری | Hooked | صحنه‌ی `reflect` → هدف/یادداشت در پروفایل |
| مسیر و ترتیب مطالعه | متمم | `paths/*.yaml` + `next/related` |
| گزارش کوچک | — | `report` با سه لایه: شواهد، معنا، تمرین؛ با درصد اعتماد |
