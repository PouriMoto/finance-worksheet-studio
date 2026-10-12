# Content spec (v1)

```
content/
  dims/registry.yaml        [{id, emoji}]
  dims/<locale>.yaml        id -> {label, low|mid|high: {meaning, practice}}
  paths/<id>.yaml           ordered items (package | article) with per-locale title
  articles/<slug>.<locale>.md   frontmatter: title, description, date, updated, tags, packages, faq[]
  packages/<slug>/
    package.yaml            slug, type(book|game|test), emoji, accent, locales[], tags, level, minutes, dims[], parts[], next?, related[]
    parts/<part>.yaml       id, emoji, minutes, scenes[]
    locales/<locale>.yaml   package{title,subtitle,description,author?}, parts{<id>:{title,summary,scenes{<sceneId>:text}}}, rewards[]
```

## Scene types
| type | structure fields | text fields |
|---|---|---|
| narrative | emoji | title, body (blank line = paragraph). id `author` shows the author card |
| choice | options[{id, dims?, goto?}] | prompt, options.<id>.{label, feedback}, explain? |
| quiz | options with exactly one `correct: true` | same as choice |
| sim | model, inputs[{id,min,max,step,default,unit}] | prompt, inputs.<id>.label, explain? |
| sort | items[], correctOrder[], dims? | prompt, items.<id>, explain? |
| reflect | mode(pick\|text), options?, saveAs(goal\|note) | prompt, placeholder?, options.<id>.label |
| report | scope(part\|package) | (engine strings + dims/<locale>.yaml) |

Sim models and their required input ids: `runway` (savings, expenses), `purchasing-power` (amount, inflation, years), `margin-of-safety` (value, price), `rebalance` (growth).

## Behaviour profile
Each option/sort carries `dims: {dim: weight}`. Per dimension: ratio = score / max possible over the answered scenes; band = low <0.34 <= mid <0.67 <= high. Confidence by number of scored answers (<3 early, <6 medium, else good). Report text comes from `dims/<locale>.yaml` and always speaks about "this exercise".

## Rules
- No prose in structure files; no Persian/Arabic text in code (`npm run lint:i18n`).
- Every declared locale must be complete; `fa` is mandatory.
- `next` chains have no cycles; every package is reachable from a path, `next` or `related`.
