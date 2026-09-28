# CI/CD and production releases

## CI

The `CI` workflow runs type-checking, linting, unit tests, and a production build (Node 22, Yarn via Corepack) for pull requests targeting `trunk` and for direct pushes to `trunk`. Configure the repository branch-protection rule for `trunk` to require the `Verify application` check before merging.

## Releasing

Add the `release` label to a pull request only after it includes the desired version bump. When that pull request is merged into `trunk`, `Create release` checks out and validates `trunk`, then creates the annotated `vX.Y.Z` tag and its GitHub Release before dispatching `CD`. The workflow can also be run manually as an emergency fallback. Deployments also run when a maintainer pushes a matching `v*` tag. Both paths require approval from the protected `production` environment.

`CD` fails unless the tag matches the application version: tag `vX.Y.Z` must equal `v` + `version` in `next-client/package.json`, so bump the version (`yarn run version --patch`, `--minor` or `--major` from `next-client/`) before tagging.

Do not dispatch `CD` against `trunk`. For a manual deployment, select the workflow definition from `trunk` and set its required `release_ref` input to an immutable version tag such as `v5.2.2`.

Create the `production` environment with required reviewers and place `NETLIFY_AUTH_TOKEN` and `NETLIFY_SITE_ID` in that environment. The deployment workflows use the pinned Netlify CLI version declared in their workflow files. Netlify's own build settings live in `netlify.toml` (base `next-client`, `corepack yarn install --immutable && corepack yarn build`).

## Rollback

Run `Roll back production`, set `release_ref` to an immutable release tag such as `v5.2.2` (or a full commit SHA), and type `ROLLBACK` as the confirmation. The workflow requires production approval, deploys that exact revision (without the tag/version check that `CD` performs), smoke-tests the result, and records the version, commit, Netlify deploy ID, and URL in the workflow summary.
