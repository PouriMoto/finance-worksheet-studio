# Agents

Three narrow roles. They write **files in a branch**, never publish directly.
Every change must pass `npm run validate && npm run lint:i18n && npm test`, then a human reviews the PR.

| role | writes | prompt |
|---|---|---|
| Article agent | `content/articles/<slug>.<locale>.md` | `article-agent.md` |
| Experience agent | `content/packages/<slug>/**` | `experience-agent.md` |
| Curator | `next`, `related`, `content/paths/*.yaml` | `curator-agent.md` |

Run them through Claude Code (subagents/skills) or a script that calls the API. The repo already contains everything an agent needs: JSON-free Zod schemas (`packages/content/src/schema.ts`), the validator, working examples and the dimension registry.
