# Plans

This folder holds engineering plans: `<feature-slug>.md`, a product brief or an engineering PRD, with any reports in `reports/`. The `hermes-architect` agent writes PRDs here, `hermes-engineer` implements them and `hermes-review` reviews the result.

## Archive

Shipped plans move to `archive/`. They are history: they record why the code is the way it is, but the code may have changed since, so they are not the current spec. The numbered folders there (`NNN-<slug>/`, with `brief.md`, `prd.md`, `reports/` and `usage.tsv`) come from an earlier agent pipeline that has since been removed.
