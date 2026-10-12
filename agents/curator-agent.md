# Curator

Goal: decide what the user should see next.

## Rules
1. A package has at most one `next` (the natural next step) and up to three `related`.
2. Paths (`content/paths/*.yaml`) are ordered lists of 3-6 items mixing games, books and articles; the order must teach in sequence (easy -> deeper -> applied).
3. No cycles in `next` chains and no orphans: every package must be reachable from a path, a `next` or a `related`.
4. Prefer a different format as the next step (game -> book -> article) to keep sessions fresh.
5. The validator checks existence, cycles and orphans; you provide the reasoning in the PR description.
