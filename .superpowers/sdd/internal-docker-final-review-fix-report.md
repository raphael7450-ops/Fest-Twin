# Internal Docker Deploy Final Review Fix Report

Date: 2026-07-16

## Scope

- `docs/internal-docker-deploy.md`
- `docs/superpowers/specs/2026-07-16-internal-docker-deploy-design.md`
- `docs/superpowers/plans/2026-07-16-internal-docker-deploy.md`

## Fixes Applied

1. Reconciled the design and implementation plan with the operational guide: `18080` is fixed, port conflicts block deployment and are escalated, and existing containers remain unchanged unless the managed-demo label and explicit confirmation establish ownership.
2. Replaced PowerShell archive pipelines with `git archive -o fest-twin-demo.tar HEAD`, `scp`, and server-side extraction into a freshly recreated staging directory. The guide states that uncommitted changes are excluded and must be committed first.
3. Changed redeployment to build a uniquely tagged image from staging before any ownership-checked container replacement. It records the previous image ID and restores it when the replacement fails to start or fails the local HTTP check.
4. Added a PowerShell-safe, case-insensitive secret-assignment scan for names containing `KEY`, `PASSWORD`, `PASSWD`, `SECRET`, or `TOKEN`, including `VITE_TOUR_API_KEY`, without embedding or searching for actual secret values.

## Verification Required

- `git diff --check`
- Documentation grep confirms the scoped docs contain no `git pull`, `18081`, `19080`, or PowerShell tar-to-SSH pipeline upload.
- The documented PowerShell secret-assignment scan returns no matches in the documented scope.
