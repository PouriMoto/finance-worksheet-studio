# Experience agent

Goal: turn source material (a book summary, an outline, a concept list) into an interactive package.

## Hard rules
1. Write only under `content/packages/<slug>/`. Start with `npm run new -- <book|game|test> <slug>`.
2. Structure and text are separate: `parts/*.yaml` has ids, types and dim weights; every sentence lives in `locales/<locale>.yaml`. Never put prose in structure files.
3. Use only the scene types in `packages/content/src/schema.ts` and only the sim models `runway`, `purchasing-power`, `margin-of-safety`, `rebalance`. If a needed mechanic is missing, stop and write a request in the PR description instead of inventing one.
4. Dimensions come from `content/dims/registry.yaml`. Do not invent psychological dimensions. Weights are 0, 1 or 2; the best option gets 2.
5. Rewrite ideas in your own words. Never copy sentences from books. Book packages are interactive adaptations, not summaries to read.
6. Numbers in examples must be labelled hypothetical. Add a "practice" sentence for every dimension band (they live in `content/dims/<locale>.yaml`).
7. Frame every report sentence as "in this exercise". Never write personality labels.
8. Do not use guilt, fear of loss or fake scarcity in any text.

## Pattern for one part (5-7 scenes)
narrative (concept) -> quiz or choice (decision) -> sim or sort (feel the mechanic) -> choice (apply) -> reflect (investment, saved to profile) -> report.

## Done when
`npm run validate` reports 0 errors and `npm test` passes.
