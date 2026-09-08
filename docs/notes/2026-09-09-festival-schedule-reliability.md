# Festival Schedule Reliability (2026-09-09)

## Scope and Evidence

The September 8 browser audit found annual-edition merging, stale keyword filtering,
hidden lookup errors and first-of-month single-day records. These are separate from
official factual verification: a selectable candidate is not proof that its schedule is current.

The checked-in regional JSON has already lost the original spreadsheet date precision.
Its `periodLabel` frequently repeats normalized dates instead of retaining text such as
"10월 중". The original workbook is not present in the repository. A first-of-month
single-day row from this legacy workbook is therefore marked `needs-review`, not
asserted to be a known month-only event or a confirmed one-day event.

## Implemented Controls

- Annual editions are distinct; duplicate sources no longer expand schedules using minimum/maximum dates.
- Official corrections take precedence over reported dates and uncertain search bounds.
- `confirmed` means an explicit verified correction or confirmation; `reported` means source-reported dates, not independent verification.
- `needs-review` rows have null actual dates and separate month search bounds. The UI displays "일정 확인 필요" and blocks selection; the plan mutation helper also blocks these rows.
- Original period labels are retained as `sourcePeriodLabel`. Invalid and reversed intervals are not repaired by guessing a year.
- Date filtering compares full dates, not month/day across different years. An out-of-range annual result is not substituted for an empty selected period.
- December festivals finishing in January are retained when they overlap the requested period.
- Region/date browsing does not reuse the previous festival's keywords.
- Regional data is paged using stable ordering and offsets; the previous 20-item display truncation is removed.
- Failed regional lookups propagate to an error/retry view instead of silently reporting no candidates.

## Official Corrections

| Festival | Corrected schedule | Official source |
|---|---|---|
| 탐라문화제 | 2026-10-17 to 2026-10-21 | [VisitJEJU](https://www.visitjeju.net/kr/festival/view?contentsid=CNTS_300000000014580) |
| 서울라이트 광화문 | 2026-12-11 to 2027-01-03 | [서울특별시 펀서울](https://festival.seoul.go.kr/festival/main/festivalView.do?festacode=372) |

These sources were checked on September 9. The correction registry exposes the source link in the candidate panel.
Other festivals are not newly labelled officially verified. In particular, ambiguous legacy records such as
광주김치축제 and 부산고등어축제 are review-required until a precise authoritative schedule is supplied.

## Validation and Operational Limits

- `npm test`: deterministic suite; external-server tests require `FEST_TWIN_LIVE_URL`.
- `npm run build`: TypeScript and production bundle. The existing large-bundle warning remains.
- `FEST_TWIN_LIVE_URL=http://192.168.55.223:18080 npm test -- tests/tourApiAdapter.daejeon.test.ts --testTimeout=60000`: explicit live candidate checks (shell environment syntax varies).
- The default test run must not depend on the obsolete hard-coded Tailscale IP.
- Review-required is a conservative quarantine, not a declaration that every flagged row is incorrect.
- The database scan found 1,267 raw 2026 rows. Of 604 ongoing-or-future raw rows on September 9,
  209 require schedule review, 392 have reported dates and 3 have explicit corrections. These are
  raw source-row counts, not deduplicated festival counts. Another 74 rows have no usable search interval.
- TourAPI's upstream page-size limit and external rate limits remain external completeness constraints;
  this change does not claim that every Korean festival has been independently verified.

Deployment must preserve the running container's `scenarios_db.json`, retain the old container for rollback,
and replace only Fest-Twin. AutoChart and other services are outside this change.

## Verified Deployment

- Runtime image: `fest-twin-demo:20260909-6d3eb05`, built from commit `6d3eb05`.
- Source release: `/home/cwuser/fest-twin-releases/20260909-6d3eb05`, with `/home/cwuser/fest-twin-demo` pointing to it.
- Previous container retained as `fest-twin-before-6d3eb05`; stored scenario JSON compared byte-for-byte after deployment and matched.
- Deterministic tests: 545 passed. Four live-only tests were separately run with the current server URL and all four passed.
- TypeScript and production build passed; the pre-existing bundle-size warning remains.
- Browser checks used the region dropdown and date fields, not the top festival-change button:
  Jeju October 17-21 showed and applied the corrected Tamna schedule; Seoul December 1-31 showed
  Seoul Light through January 3; Busan October 1-31 showed the mackerel festival as review-required with selection disabled.
- The map build argument was empty, but the application's existing fallback configuration was confirmed equal to the prior deployment setting. No map credential was changed.
- Follow-up changes to the live test select an enabled candidate instead of trying to apply a quarantined first result.
