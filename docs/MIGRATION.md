# وضعیت مهاجرت از studio-core قدیمی

| مورد | وضعیت | روش |
|---|---|---|
| habits-1-habit-loop | ✅ انجام شد → `habit-loop-game` | `npm run migrate` خودکار؛ tangle باتری به روایت تبدیل شد (باید با sim مناسب بازطراحی شود) |
| anchoring-bias | ⏳ | بازنویسی دستی (۲۲۹ خط JS): choice + sim `anchoring`؛ مدل جدید لازم |
| budget-leak | ⏳ | loopy + game: نیاز به ویجت علت‌ومعلول (فاز ۲) |
| compound-gold | ⏳ | chart + loopy: نیاز به ویجت chart (Recharts) |
| confirmation-bias | ⏳ | choice/sort؛ ممکن است با ویجت‌های فعلی ساخته شود |
| demo-new-mechanics | ❌ | دمو؛ منتقل نمی‌شود |
| inflation | ⏳ | بخشی با sim `purchasing-power` پوشش داده شده؛ loopy و chart مانده |
| race | ⏳ | شخصیت‌ها + chart: نیاز به realstory با شخصیت |
| trading | ⏳ | سناریو + معامله: ویجت جدید `trade-sim` |
| trust-square | ⏳ | choice شاخه‌ای؛ احتمالاً با ویجت‌های فعلی |
| ۱۲ درس Kahneman + ۴ درس عادت (HTML) | ⏳ | هر کدام صفحه‌ی جدا با JS اختصاصی؛ خودکار نمی‌شود. با «agent ساخت تجربه» (agents/experience-agent.md) از روی متن درس بازنویسی شود |

اولویت پیشنهادی: confirmation-bias و trust-square (با ویجت‌های موجود)، بعد inflation (ترکیب sim فعلی)، بعد ویجت chart و compound-gold.
قاعده: هر بازی منتقل‌شده باید `npm run validate` و تست autoplay را پاس کند و حداقل یک گزارش رفتاری داشته باشد.
