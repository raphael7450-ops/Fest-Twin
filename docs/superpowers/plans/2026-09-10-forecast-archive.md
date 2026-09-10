# Forecast Archive Implementation Plan

**Goal:** Automatically preserve committed analysis inputs and outputs before an event and expose honest validation readiness without changing forecasts.

**Approved design:** Server-timestamped, non-overwriting forecast archives; persistent remote storage; official outcome review; dashboard counts and exclusion reasons; no calibration before held-out evidence.

**Architecture:** A separate archive API receives the committed browser snapshot. It stores an allowlisted, sanitized payload with a server receipt, content hash and HMAC in a host-mounted directory. A receipt establishes receipt time and detects changes, not authenticity of the browser's computation. Such records remain unverified until an operator validates model provenance and measurement scope. The existing offline evaluator remains the only source of error statistics.

**Constraints:** No prediction coefficient changes. No fabricated historical predictions or counting methods. No public outcome editing API. Browser failures must not block analysis. Missing archive keys fail closed. Bind archive storage outside release directories and back it up independently. HMAC does not prevent privileged deletion or prove external timestamp authenticity.

## Tasks

- [x] Test and implement bounded append-only archive store and API: deduplication, KST event boundary, tampering, bad inputs and quota.
- [x] Add nonblocking committed-snapshot capture and a compact status panel. Test stale responses and failed capture; do not label captured records as validated.
- [x] Expose freshly evaluated trusted local evidence; preserve insufficient-evidence status and source issues. Review a second official outcome report.
- [x] Run full tests/build; update findings and remaining evidence limitations. Full rerun: 627 passed, 4 skipped. A prior run exposed an intermittent pre-existing map timer teardown error; no forecast or map code was changed to conceal it.
- [x] Push scoped changes, deploy with stable host storage/key, verify browser/mobile capture and persistence across restart. Deployment c028ca3: live POST returned 201; 320/390/768px festival switching passed; 10 receipt files retained an identical SHA-256 manifest across container restart, with zero integrity errors.

## Evidence limitations

The existing real ledger has one rounded official announcement with an unknown counting method, no eligible matched predictions, and no error statistics. Capturing new browser snapshots cannot retroactively repair those gaps. Outcome collection and model calibration remain blocked where primary evidence is unavailable.
