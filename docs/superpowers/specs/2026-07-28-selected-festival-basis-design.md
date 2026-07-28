# Selected Festival Basis Design

## Goal

When an operator selects a festival candidate from TourAPI, Fest-Twin should treat that specific festival as the active public-data basis for dashboard forecasting, map context, evidence, and reports.

## Problem

The current dashboard updates the planning form with the selected candidate title, address, and dates, but it does not preserve the selected TourAPI `contentId` as an explicit evidence basis. This makes the dashboard feel less tied to the selected real festival, especially when explaining why demand, nearby tourism context, traffic context, and report evidence changed.

## Design

- Add a selected festival basis model containing TourAPI `contentId`, title, address, period, coordinates, and source name.
- Use the selected basis whenever a TourAPI candidate is selected.
- Include the selected basis in recalculation keys so changing candidates refreshes real-data-dependent contexts even when region/date values are similar.
- Show the selected basis in the data basis panel and report evidence section.
- Add selected basis source detail to metric evidence so the evidence drawer can show the exact TourAPI content item used.

## Non-Goals

- Do not add new external API endpoints in this task.
- Do not change forecast formulas.
- Do not store selected basis in the scenario database yet.

## Verification

- Unit test selected candidate to basis/plan mapping.
- Unit test metric evidence includes selected TourAPI basis source detail.
- Component tests confirm the dashboard evidence views render the selected basis.
- Run focused tests and production build before commit/push/deploy.
