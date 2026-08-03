# View-T Origin-Destination Traffic Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add View-T origin-destination vehicle inflow evidence so Fest-Twin can explain access traffic risk by vehicles entering the festival host area, not only by nearby road-link volume.

**Architecture:** Keep the existing `/api/traffic` proxy pattern and add a validated View-T `basedPathOD_emd2emd` proxy endpoint. Add a focused client adapter that loads destination-area inflow by `ZONEID`, `YEAR`, `WEEKTYPE`, and `TIME`, then merge that context into access traffic evidence and dashboard calculations.

**Tech Stack:** Express proxy, TypeScript service adapters, Vitest, existing `TrafficContext` evidence model.

## Global Constraints

- Do not expose API keys, cookies, or raw credentials in browser code or evidence records.
- View-T data must be described as historical 기준연도 data, not real-time traffic.
- If exact festival-day data is unavailable, label the evidence as weekday/weekend/time 기준연도 inflow, not 행사일 실측.
- Keep changes scoped to traffic proxy, traffic adapter, evidence, tests, and documentation.

---

### Task 1: Add View-T EMD OD Proxy

**Files:**
- Modify: `server/trafficProxy.js`
- Test: `server/trafficProxy.test.ts`

**Interfaces:**
- Produces: `GET /api/traffic/od-emd?zoneId=1101053&year=2024&weekType=weekend&time=20`
- Returns normalized `{ state, msg, count, zoneId, result: [{ ZONEID, ZONENAME, VALUE_IN, VALUE_OUT }] }`

- [ ] **Step 1: Write the failing proxy test**
- [ ] **Step 2: Run `npm test -- --run server/trafficProxy.test.ts` and verify the new test fails**
- [ ] **Step 3: Add query validation and forwarding to `https://viewt.ktdb.go.kr/cong/api/basedPathOD_emd2emd.do`**
- [ ] **Step 4: Run the proxy test and verify it passes**

### Task 2: Add Client OD Inflow Context

**Files:**
- Modify: `src/services/trafficAdapter.ts`
- Test: `src/services/trafficAdapter.test.ts`

**Interfaces:**
- Produces an additional source detail with `sourceId: "ktdb-viewt-emd-od-inflow"`
- Adds OD inflow records to `TrafficContext.sourceDetails`
- Uses local `ZONEID` mapping fallback for demo regions until coordinate-to-행정동 mapping is implemented.

- [ ] **Step 1: Write the failing adapter test for Busan vs Taean OD inflow**
- [ ] **Step 2: Run `npm test -- --run src/services/trafficAdapter.test.ts` and verify it fails**
- [ ] **Step 3: Implement `getOdZoneMapping`, `/api/traffic/od-emd` loading, and OD source detail merge**
- [ ] **Step 4: Run traffic adapter tests and verify they pass**

### Task 3: Evidence And Documentation

**Files:**
- Modify: `docs/specs/kpi-evidence-matrix.md`
- Modify: `docs/specs/data-and-simulation-methodology.md`
- Test: `npm test`, `npm run build`

**Interfaces:**
- Documents that access traffic risk uses View-T OD inflow first, selected-link traffic second, and festival-scale fallback last.

- [ ] **Step 1: Update traffic evidence descriptions**
- [ ] **Step 2: Run full tests and build**
- [ ] **Step 3: Commit, push, and deploy**

## Self-Review

- Spec coverage: proxy, adapter, evidence, tests, docs are covered.
- Placeholder scan: no TBD/TODO placeholders.
- Type consistency: endpoint and evidence IDs are defined in tasks before use.
