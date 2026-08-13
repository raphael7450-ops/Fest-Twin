# City Park Area Reference Design

## Goal

Use the National City Park Information Standard Data API to suggest a public-data area for a festival venue without treating the park's total area as the festival's confirmed operating area.

The feature must preserve the current safety rule: physical crowd density is calculated only after an operator explicitly applies an area value.

## Scope

- Look up city park records from the festival planning form.
- Rank records using the festival venue name, address, region, and coordinates when available.
- Show the source park area and metadata as a reference.
- Require an explicit operator action before updating the festival venue area.
- Record the applied value's provenance for evidence views, exports, reports, and saved scenarios.
- Keep manual entry available for non-park venues and unmatched searches.

This iteration does not infer the occupied festival footprint from maps, cadastral parcels, aerial imagery, or a fixed percentage of park area.

## User Experience

The planning form includes an `행사장 면적` section below the venue address.

1. When a venue address or selected festival changes, the client can request park candidates without blocking the rest of the planning form.
2. The section shows the best matching candidate and allows the operator to inspect alternative candidates when more than one record is plausible.
3. Each candidate shows the park name, address, park type, total park area, management organization, and data reference date when supplied by the API.
4. The total park area is labelled `공원 전체면적 참고값`. It is not used in calculations yet.
5. Selecting `행사장 면적으로 적용` copies the value into the plan and records its public-data provenance.
6. The applied value remains editable. Editing it changes the provenance to `user-adjusted` while retaining the original reference area and source record.
7. A warning states that paths, water, planting, structures, restricted zones, and non-event areas must be excluded during an on-site or drawing-based review.

If lookup fails or no candidate is found, the section explains the reason and leaves manual entry usable. An API failure never clears an existing confirmed area.

## Architecture

### Server proxy

Add a server-only route for the supplied National City Park Information Standard Data endpoint. The browser calls the Fest-Twin server and never receives the service key.

The server:

- reads the key from `CITY_PARK_API_KEY`;
- validates and bounds query parameters;
- requests JSON from the public API;
- normalizes either array or wrapper-shaped public-data responses;
- returns only the fields required by the client;
- maps upstream authentication, timeout, malformed response, and empty-result conditions to stable error responses;
- does not log the key or include it in response payloads.

The client-facing route accepts a bounded venue query and region. Coordinates are accepted for ranking but are not sent upstream unless the public API supports coordinate filtering.

### Client adapter

A focused city park adapter owns request construction, response validation, normalization, and candidate ranking. Ranking favors:

1. normalized exact park-name matches in the venue name or address;
2. matching province and municipality tokens;
3. address token overlap;
4. coordinate distance when both sides provide valid coordinates.

Weak matches are shown as alternatives but are never automatically applied. Duplicate records with the same normalized name, address, and area are collapsed.

### Domain model

Keep `venueAreaSquareMeters` as the only area consumed by safety calculations. Add optional provenance alongside it:

- origin: `user-input`, `public-data`, or `user-adjusted`;
- source dataset and source record identity;
- source park name and total park area;
- management organization and reference date when available;
- application timestamp;
- verification note indicating that the operating footprint still needs field or drawing confirmation.

Older saved scenarios without provenance remain valid and are treated as manual input.

## Data Flow

1. A festival selection updates venue name, address, region, and coordinates.
2. The area section requests candidate records through the server proxy.
3. The adapter validates and ranks normalized candidates.
4. The form displays reference values without changing the plan's calculated area.
5. The operator applies one candidate.
6. `venueAreaSquareMeters` and its provenance are stored together.
7. Existing density calculations rerun from the explicitly applied value.
8. Evidence views and exports describe whether the value was directly applied or adjusted by the operator.

Stale lookup responses are ignored when the venue changes while a request is in flight.

## Evidence And Reporting

The current blanket label `사용자 입력` is replaced by a provenance-aware label:

- manual value: `사용자 입력`;
- unchanged public-data value: `전국도시공원정보표준데이터 참고값 적용`;
- adjusted public-data value: `공공데이터 참고 후 사용자 조정`.

Reports and evidence views include the source park name and reference date where available. They also state that the park total area is not evidence of the final event operating boundary.

## Error Handling

- Missing server key: return a configuration error and keep manual entry available.
- Upstream timeout or non-success response: show a retryable lookup error without modifying the plan.
- Malformed or non-numeric area: discard the candidate.
- No match: show `일치하는 도시공원 정보 없음` and keep manual entry available.
- Ambiguous matches: require the operator to choose a candidate.
- Zero or negative applied area: reject it and preserve the previous valid value.

## Testing

- Server route tests cover key isolation, parameter bounds, upstream failures, wrapper variants, and normalized output.
- Adapter tests cover Korean name normalization, regional matching, coordinate ranking, duplicate removal, malformed areas, and no-match behavior.
- Form tests verify that lookup does not change area, explicit application does, manual adjustment changes provenance, stale responses are ignored, and failures preserve existing values.
- Storage tests verify backward compatibility and provenance persistence.
- Safety and evidence tests verify that only `venueAreaSquareMeters` drives density and that labels match the recorded provenance.
- A production build and focused browser check verify the planning flow on desktop and mobile widths.

## Security And Configuration

- Store the provided key only in the server environment as `CITY_PARK_API_KEY`.
- Do not expose it through `VITE_*`, client bundles, source control, logs, test snapshots, or error messages.
- Add only a placeholder variable name to example environment documentation.
- Keep request size, page count, and timeout bounded to prevent the proxy from becoming an unrestricted relay.

## Acceptance Criteria

- A park-hosted festival can retrieve plausible city park candidates from the supplied public API.
- No candidate changes density calculations until the operator applies it.
- Applied and adjusted values carry accurate provenance through storage, evidence, CSV, print, and PDF output.
- API failures do not block manual planning or erase an existing area.
- The public service key is absent from browser requests, built assets, committed files, and logs.
