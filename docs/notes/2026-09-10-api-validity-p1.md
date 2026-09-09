# API validity P1 follow-up

## Changes

- TAGO now uses HTTPS and `getCrdntPrxmtSttnList`, matching the [official operation](https://www.data.go.kr/data/15098534/openapi.do).
- Commercial requests use HTTPS and `/B553077/api/open/sdsc2/storeListInRadius`, following the [official service migration notice](https://www.data.go.kr/bbs/ntc/selectNotice.do?atchFileId=&originId=NOTICE_0000000002194&pageIndex=1&searchCondition2=2&searchKeyword1=sdsc).
- File-based traffic fallback lookup includes the requested year. Legacy records without a year-qualified key are deliberately not served. No historical observation year has been invented for the existing file.
- Traffic responses expose the query year. Adapters reject fallback and missing/mismatched year responses instead of silently incorporating them as observations.
- Example traffic link mappings require explicit `verified: true` before use in the analysis path. Existing mappings remain unverified. The current UI therefore uses explicitly labelled scenario traffic assumptions, not unrelated road observations.
- VWorld requires matching province/city and exact normalized venue identity, or an exact normalized address. Multiple distinct coordinate matches in a result are rejected. Missing addresses remain unverified rather than being invented.

## Remote provider verification

Checked on 2026-09-09 with the existing remote container's configured credentials. Only status codes and credential presence were collected; no credential values were logged.

| Service | Corrected endpoint result | Remaining requirement |
|---|---|---|
| TAGO | HTTP 403 / code 30 | A key approved for this service |
| Commercial | HTTP 403 / code 30 | A key approved for this service |
| Spending | HTTP 403 / code 30 | A key approved for the spending endpoint |
| Emergency | HTTP 403 / code 30 | A key approved for the emergency endpoint |
| City parks, Busan query | HTTP 200 / code 03 | No matching data; not an authentication failure |

Correcting an endpoint is not equivalent to restoring usable observations. The P0 missing-data labels stay in place. No usage-reset coupon was consumed.

## Regression coverage

Tests cover corrected request URLs, legacy yearless fallback rejection in two years, example-link exclusion for Seoul/Busan/Daejeon, a verified test mapping, wrong-year/fallback rejection, cancellation, exact venue preference over a similarly named clinic, wrong-region rejection, absent addresses, and ambiguous coordinates.

## Remaining limitations

- Service applications/approval must be completed through the provider account and approved keys configured securely before live ingestion is available.
- Venue matching is deliberately conservative. It does not validate boundary polygons or prove on-site suitability; ambiguous and addressless results can remain unresolved.
- Verified local traffic links and independently verified OD mappings still need to be populated from authoritative geographic data. Existing sample scores are not real traffic measurements.
- Commercial/transit/emergency quantitative estimators and their full response-to-analysis integration remain separate work. Fixing request URLs must not be used to reintroduce P0's fabricated API evidence.
- Unit validation, observation freshness, and provider-wide data completeness remain open audit items.
