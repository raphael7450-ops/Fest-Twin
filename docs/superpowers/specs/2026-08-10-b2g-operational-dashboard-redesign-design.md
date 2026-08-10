# B2G Operational Dashboard Redesign Design

## Goal

Apply an ATS-style analysis dashboard pattern to Fest-Twin while keeping the product clearly positioned as a B2G festival operations tool.

## Design Direction

The redesigned dashboard adds a compact operational score header above the existing KPI grid. It summarizes the current festival plan through four immediately scannable signals: overall operating score, demand forecast, peak congestion, and administrative action status. The header also keeps the selected festival, region, and operating period visible so users understand which plan the analysis refers to.

The visual system shifts from a decorative purple dashboard toward a restrained public-sector console. The palette uses off-white surfaces, slate text, dark navy accents, teal for ready states, amber for caution, and red for risk. Cards stay compact and data-dense, with clear borders and low shadow.

## Scope

- Add `OperationalScoreHeader` as an independent React component.
- Render the header between `GovernmentHeader` and the selected festival card.
- Keep existing navigation, panel sections, forms, evidence drawer, reports, and print behavior unchanged.
- Refresh screen CSS for shell, rail, panels, KPI cards, and the new operational score header.
- Add tests that prove the new header renders score, forecast, congestion, action status, and selected festival context.

## Data Mapping

- Overall operating score uses `forecast.successScore`.
- Demand forecast uses `forecast.expectedVisitors` and `forecast.peakHour`.
- Peak congestion uses the maximum `visitorsByHour` count for the peak hour and the first high or critical report score as the risk basis.
- Administrative action status counts recommendations and evidence items to show whether follow-up action is required.
- Festival context uses `selectedFestivalBasis` when present, otherwise `plan` values.

## Non-Goals

- Do not copy proprietary Figma assets, icons, wording, or pixel layout.
- Do not add new dependencies.
- Do not change public API behavior or domain calculations.
- Do not redesign print report layout in this pass.
