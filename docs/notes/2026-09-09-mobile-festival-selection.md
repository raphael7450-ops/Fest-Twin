# Mobile Festival Selection Regression

## Root Causes

- The selected festival card put a source badge, title and reset action in non-wrapping flex rows. At 390px the title shrank to about 18px. The information section also required a 260px minimum width.
- Candidate drawer layout rules leaked into the separate festival search modal. Search recommendations overlapped the disclaimer. A mobile full-width action inside a horizontal flex card squeezed its title.
- Checking document overflow alone missed the failure because the page already clips horizontal overflow.

## Fix

- Wrap the selected card heading, separate the source and title, remove fixed minimum widths, and use a container-bounded information grid.
- Scope the three-row candidate layout to its own class. Give the search modal its own scrolling column and retain grid-based candidate cards so mobile actions stack below content.
- Preserve selection, dates, analysis and scenario storage behavior.

## Browser Regression

Install dependencies with `npm ci` and a browser with `npx playwright install chromium`.
Set `FEST_TWIN_LIVE_URL` to the deployment under test and run `npm run test:mobile`.
On Windows with Edge installed, `PLAYWRIGHT_CHANNEL=msedge` can be used instead.

The test exercises candidate selection, expanded planning details, search results and a second selection at 320, 390 and 768px. It asserts title width, card child bounds, non-overlapping search sections and reachability of the last action. It does not save or delete scenarios.

Optional environment variables: `TEST_WIDTHS` (comma-separated widths), `SCREENSHOT_DIR` (existing output directory), and `FEST_TWIN_API_URL` (backend for a local preview).
