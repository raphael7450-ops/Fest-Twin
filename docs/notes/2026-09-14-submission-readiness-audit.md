# 2026-09-14 submission readiness audit

## Scope and evidence

- Reviewed the official web/app implementation notice: https://lowly-polyanthus-1fb.notion.site/2026-3a75dce406e38034a9a8d058a1b55596
- Production homepage rendered in the browser without a login prompt.
- Remote `tailscale funnel status` confirmed public Funnel forwarding to port 18080. An independent cellular-network test remains advisable.
- Production TourAPI proxy returned HTTP 200 / resultCode 0000 for area codes (17) and nearby resources at Gwanghwamun (161). Seoul festival search for 2026-09-14 through 2026-10-31 returned zero items; zero is not an API failure or evidence that no festivals exist.
- Browser selection of Seoul Light Gwanghwamun correctly applied its title, address and 2026-12-11 through 2027-01-03 dates. It also reproduced an incorrect capacity of 623,792.
- Browser date fill automation did not persist reliably. Date/region switching is covered by automated tests, but exact native date editing needs a separate manual check; do not report it as browser-verified.

## Fixed defects

1. Cumulative attendance was multiplied by 0.2 and copied into simultaneous venue capacity. Removed this conversion for direct candidates and similar-festival backdata. Existing operator capacity remains an input assumption, with an explicit revalidation warning after festival changes. Saved historical plans are not silently rewritten.
2. Printed daily estimates were labelled total visitors, and daily spending divided by total budget was labelled ROI. Corrected daily scope and explicitly excluded investment-return/whole-event interpretations.
3. Printed report claimed an official administrative form and hard-coded a consumption agency unrelated to its actual inputs. Replaced these claims with a self-generated reference notice and the snapshot consumption source/basis.
4. TourAPI HTTP-200 business errors were cached for ten minutes. Only successful application codes are now cached; failed responses return 502 and the next request can retry.
5. TourAPI requests had no explicit upstream deadline. Added a ten-second abort deadline covering fetch/body consumption and a 504 timeout response. Raw exception messages are no longer logged because they may contain credential-bearing URLs.
6. Post-deployment browser inspection found the heatmap reporting physical density from a fallback 40,000 square metres while the canonical KPI correctly reported missing area. The heatmap now withholds the grid and physical-density verdict when the plan area is missing, zero, negative or non-finite. The underlying relative simulation is unchanged and is not field-validated safety evidence.

## Verification

- Regression tests failed before each production correction.
- `npm test`: 671 passed, 4 skipped, exit 0 (including the heatmap follow-up).
- `npm run build`: exit 0. Existing bundle-size warning remains.
- `git diff --check`: exit 0.
- Release 21da2a9 was deployed and verified with HTTP 200, TourAPI area codes, mobile 390x844 selection and no page-width overflow. Selecting Seoul Light Gwanghwamun preserved the 45,000 input capacity rather than assigning 623,792. This input is not a certified safe capacity.

## Submission gates not certified by this audit

- Confirm preliminary selection, chosen task number, participant account and team membership with the applicant.
- Complete the official functionality-description template and convert to PDF. The application-generated report is NOT that template.
- Confirm API cache/storage policy and conflicting operating-account guidance with the organizer. No application or inquiry has been submitted by this audit.
- Independently verified attendance/prediction accuracy is not established. Prior-year visitor figures remain references only.
- Existing capacities, budgets, generated programme assumptions and historical saved plans require operator review. Removing attendance-to-capacity conversion does not certify physical capacity.
- Naver interest double influence and broader model calibration remain evaluation work, not a last-minute unvalidated coefficient change.
