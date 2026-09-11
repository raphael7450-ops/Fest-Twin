# User-facing data and workflow audit

## Scope

Reviewed the deployed Fest-Twin planning, overview, prediction, field,
evidence and report tabs. Exercised regional/date selection in Busan and
Daejeon and compared KPI summaries with their evidence dialogs.

## Corrections

- Label `expectedVisitors` as modeled daily arrivals, not event-total or
  deduplicated observed visitors. Preserve the forecast calculation.
- Explain that daily estimated spending divided by the whole project budget
  is a reference comparison, not investment return or total festival sales.
- Distinguish peak-time venue-average density from local grid maxima.
  Missing venue area must not appear as 20,000 square meters or zero density.
- Correct million-KRW to hundred-million-KRW conversion and disclose the
  existing 65/35 benchmark blending in the budget reference value.
- Stop presenting arbitrary fractions of the final forecast as recorded
  intermediate calculations or asserting live weather observations.
- Render infrastructure provenance from the committed analysis context.
  Remove fabricated organizer, unqueried 119/telco, gateway-health and
  unconditional budget-quality claims from the affected panels.
- Translate confidence/capacity states and show next-day hours explicitly.
- Report local-only saves and failed server deletion; prevent sharing a
  browser-only plan and preserve unsynchronized plans when fetching a list.
- Clarify browser-cache clearing versus server deletion.
- Back up the stopped container's scenario JSON before deployment and bind
  its preserved copy from host storage so rebuilding does not reset plans.

## Verification

- Vitest: 636 passed, 4 existing skips before final deployment.
- TypeScript and Vite production build passed; existing bundle-size warning.
- Edge mobile viewport 390 x 844: all six tabs, no document horizontal
  overflow and no page errors. Desktop CSV download completed; print-button
  invocation verified with a browser print stub, not a physical printer.
- Added regressions for missing area, currency conversion, unqueried source
  claims, local-only saving/sharing, retained unsynchronized plans and failed
  server deletion.
- Independent review identified draft eviction and server-list disappearance
  after clearing local copies. Both now have passing regression tests.

## Boundaries

This change does not establish forecast accuracy. Sample consumption prices,
heuristic demand calibration, benchmark comparability, safety assumptions and
unverified client-reported forecast archives still require independent data
validation. No prediction values were increased to suggest improvement.
It is not a certification of every provider record or every festival.
