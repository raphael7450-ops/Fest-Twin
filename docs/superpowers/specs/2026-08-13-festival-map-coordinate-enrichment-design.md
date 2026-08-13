# Festival Map Coordinate Enrichment Design

## Problem

Festival presets and TourAPI candidates include venue coordinates, but records loaded from the regional festival database contain only a festival name and venue text. `dbRecordToPreset` therefore creates a plan without `venueCoordinates`, and selecting that plan correctly moves `VenueMapPanel` into its `행사장 좌표 확인 필요` state.

## Desired Behavior

- A regional-database festival with no coordinates is enriched only when the user selects it.
- The enrichment request must not load festival images or slow the initial search list.
- Coordinates must come from a matching TourAPI festival result, not a region centroid or stale coordinates from the previous festival.
- If no trustworthy match is available, the plan is still selected and the map keeps the explicit coordinate-confirmation fallback.

## Architecture

Add a validated `keyword` operation to the existing TourAPI server proxy, backed by `searchKeyword2` with `contentTypeId=15`. Add a client resolver that searches by festival title, normalizes year and edition markers, ranks exact title and region matches, and returns only finite Korean longitude/latitude values.

`FestivalSearchModal` calls the resolver only for a selected preset whose plan lacks coordinates. While resolving, the selected button shows a location-checking state and duplicate submissions are disabled. A successful match creates a new preset containing `plan.venueCoordinates` and `basis.mapX/mapY`; a failed or aborted request never reuses the previous festival coordinates.

## Error Handling

- Proxy validation rejects client-supplied service keys, unknown parameters, empty keywords, and invalid numeric values.
- Upstream and malformed-response handling continues to use the existing TourAPI proxy error contract.
- The modal catches lookup failure and applies the original coordinate-less preset, preserving the visible accuracy warning.
- Closing the modal aborts an in-flight coordinate lookup so a dismissed selection cannot be applied later.

## Verification

- Server test: `keyword` forwards to `searchKeyword2` with server-managed authentication and the expected festival parameters.
- Adapter test: exact normalized title and matching region win, malformed or unrelated coordinate results return `null`.
- Modal test: a coordinate-less DB festival is selected with TourAPI coordinates after one on-demand lookup; image elements remain absent.
- Browser test: selecting `2026 서울라이트 광화문` changes the plan and renders VWorld controls plus the new coordinate line instead of `행사장 좌표 확인 필요`.

