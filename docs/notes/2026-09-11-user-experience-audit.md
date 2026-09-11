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

- Vitest: 637 passed, 4 existing skips, including the follow-up source-badge regression.
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

## Deployed workflow checks (2026-09-12)

- Public HTTPS site: all six tabs at 390px and Daejeon regional/date selection
  had no document overflow or browser page errors.
- Missing-area density displayed unavailable; the 50-million-KRW plan showed
  0.5 hundred-million KRW and explained the blended 7,365-KRW reference.
- Saved a uniquely named QA plan through the UI, reloaded it, opened its share
  token in a separate page, then deleted only that QA record through the UI.
- Original scenario JSON SHA-256 was identical before deployment, after
  migration, and after QA cleanup. Host persistence mount was verified.
- Removed an additional unconditional provider badge discovered in the live
  evidence drawer; provider names must come from the selected evidence.

## Remaining limits

This change does not establish forecast accuracy. Sample consumption prices,
heuristic demand calibration, benchmark comparability, safety assumptions and
unverified client-reported forecast archives still require independent data
validation. No prediction values were increased to suggest improvement.
It is not a certification of every provider record or every festival.
