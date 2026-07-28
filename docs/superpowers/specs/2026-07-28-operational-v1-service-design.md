# Operational v1 Service Design

## Goal

Build Fest-Twin into a submission-ready operational v1 service by 2026-09-21. The target is not a full commercial SaaS, but a working B2G web service where a local-government planner can open a public URL, select a real TourAPI festival candidate, diagnose demand and crowd risk, inspect evidence, save/share a scenario, and print a public-review report.

## v1 Definition

Operational v1 means the service can be used end-to-end without Codex intervention:

- Public URL is reachable.
- TourAPI festival candidate lookup works or shows a clear fallback reason.
- Selecting a festival candidate updates the dashboard using that candidate's `contentId` and coordinates.
- Forecast, crowd simulation, safety/logistics, ROI, traffic, spending, and trend evidence are visible.
- Every persuasive KPI has a source/evidence explanation.
- Scenario save/share restore works.
- Report print view contains data sources, formulas, limitations, and fallback state.
- Deployment and health checks can be repeated from scripts.

## Non-Goals

- No paid billing, tenant administration, or institution-level account management for v1.
- No claim that forecast output is an actual visitor count.
- No Instagram/X real-time API integration for v1.
- No public exposure of TourAPI, Naver, SSH, or server secrets.

## Workstreams

### 1. Data Credibility

The core product claim is that subjective festival planning can be reduced through traceable data. Therefore the next implementation priority is not a new visual feature, but a stronger evidence matrix.

Required behavior:

- Each KPI shows whether it used live, partial fallback, file-normalized, or sample data.
- Demand evidence separates selected TourAPI festival basis, nearby tourism context, trend correction, and regional backdata.
- ROI evidence separates budget, expected visitors, spending basis, and limitations.
- Parking/traffic evidence separates crowd simulation inputs from KTDB/View-T traffic context.
- DataBasisPanel and ReportView use the same evidence labels.

### 2. Candidate-Driven Synchronization

Festival selection must remain the primary data basis for the dashboard.

Required behavior:

- TourAPI tourism context uses selected `contentId`.
- Map panel uses selected coordinates.
- Trend keywords use selected festival title first.
- Traffic and spending contexts refresh when selected region/date/title changes.
- If a user manually edits festival identity fields after selecting a candidate, selected basis is cleared.

### 3. Public-Review Report

The report should read like a local-government pre-review artifact rather than a generic dashboard export.

Required behavior:

- Report has sections for forecast, crowd safety, budget/ROI, traffic/logistics, data sources, limitations, and recommendations.
- Report identifies selected TourAPI festival `contentId`.
- Report shows fallback state without making the service look broken.
- Print/PDF layout remains readable on desktop and mobile viewport widths.

### 4. Operational Reliability

The service must be stable enough for repeated review and home/office continuation.

Required behavior:

- `npm test`, `npm run build`, `npm run deploy:check`, and `npm run test:load` are final gates.
- Remote Docker deployment remains reproducible.
- Public URL serves current bundle after deployment.
- API errors are logged server-side and summarized user-side without secrets.
- Scenario save/share restore remains compatible with selected festival basis or safely ignores missing basis.

### 5. Submission Package

The final package must be easier for judges to understand than the codebase.

Required behavior:

- Feature description reflects operational v1, not only demo status.
- OpenAPI usage evidence explains the actual TourAPI call sequence.
- Screenshots show selected festival basis, evidence drawer, map, heatmap, and report.
- Final checklist distinguishes complete v1 functionality from v2 extensions.

## Recommended Implementation Order

1. KPI evidence matrix and labels.
2. Candidate-driven refresh coverage for trend, traffic, spending, and report basis.
3. Report structure and print polish.
4. Scenario save/share selected-basis preservation.
5. Health check and deploy verification tightening.
6. Submission package refresh.

This order prioritizes judge confidence first, then operational polish.

## Acceptance Criteria

- A reviewer can select at least two different TourAPI candidates and see basis data change.
- Evidence drawer includes source details for every top-level KPI.
- Report identifies selected festival basis and limitations.
- Public URL works after fresh deployment.
- GitHub contains current docs, source, tests, and deployment scripts.
- Secrets are not present in Git, browser bundle, reports, or docs.

## Verification Commands

- `npm run test -- src/App.test.tsx src/App.selectedBasis.test.tsx src/services/dataAdapters.test.ts src/services/metricEvidence.test.ts`
- `npm run build`
- `npm run deploy:check`
- `npm run test:load`

## Delivery Rhythm

Each implementation slice should end with:

1. Focused tests.
2. Production build when frontend or TypeScript behavior changes.
3. Git commit and push to `main`.
4. Remote Docker deployment when runtime behavior changes.
5. Short document update when submission or operations behavior changes.
