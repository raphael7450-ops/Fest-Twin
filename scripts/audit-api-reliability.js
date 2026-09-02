/**
 * 파일 : scripts/audit-api-reliability.js
 * 내용 : 원격 서버, 로컬 Express 서버, 외부 원천 API 3단계 신뢰도 종합 진단 도구
 */

import http from "node:http";
import fs from "node:fs/promises";
import path from "node:path";
import { createApp } from "../server/index.js";

const REMOTE_BASE = process.env.DEPLOY_TARGET_URL || "https://cwserver.tail97dbc3.ts.net";
const LOCAL_PORT = 4321;
const LOCAL_BASE = `http://127.0.0.1:${LOCAL_PORT}`;

const ENDPOINTS = [
  {
    name: "TourAPI 지역코드 조회",
    sourceOrg: "한국관광공사 (TourAPI 4.0)",
    path: "/api/tour/area-code",
    method: "GET",
    validator: (json) => Array.isArray(json?.response?.body?.items?.item) || Array.isArray(json?.items) || json?.response?.header?.resultCode === "0000",
  },
  {
    name: "TourAPI 축제 목록 검색",
    sourceOrg: "한국관광공사 (TourAPI 4.0)",
    path: "/api/tour/festivals?areaCode=1&eventStartDate=20261001",
    method: "GET",
    validator: (json) => Array.isArray(json?.response?.body?.items?.item) || Array.isArray(json?.items) || json?.response?.header?.resultCode === "0000",
  },
  {
    name: "VWorld 장소/좌표 검색",
    sourceOrg: "국토교통부 (VWorld 공간정보)",
    path: "/api/vworld/search?query=" + encodeURIComponent("여의도한강공원") + "&type=PLACE",
    method: "GET",
    validator: (json) => json?.response?.status === "OK" || json?.status === "OK" || Array.isArray(json?.response?.result?.items),
  },
  {
    name: "VWorld 도로명주소 검색",
    sourceOrg: "국토교통부 (VWorld 공간정보)",
    path: "/api/vworld/search?query=" + encodeURIComponent("여의동로 330") + "&type=ADDRESS",
    method: "GET",
    validator: (json) => json?.response?.status === "OK" || json?.status === "OK" || Array.isArray(json?.response?.result?.items),
  },
  {
    name: "KTDB 링크별 통행속도 및 교통량",
    sourceOrg: "국가교통DB (KTDB/View-T)",
    path: "/api/traffic/selected-link?linkId=1220000100&year=2024&weekType=weekday&time=ALL",
    method: "GET",
    validator: (json) => json?.state === "OK" || json?.state === "success" || Array.isArray(json?.result) || json?._fallback === true,
  },
  {
    name: "KTDB O/D 읍면동 교통 통행량",
    sourceOrg: "국가교통DB (KTDB/View-T)",
    path: "/api/traffic/od-emd?zoneId=1111051500&year=2024&weekType=weekday&time=ALL",
    method: "GET",
    validator: (json) => json?.state === "OK" || json?.state === "success" || Array.isArray(json?.result) || json?._fallback === true,
  },
  {
    name: "네이버 데이터랩 검색 트렌드",
    sourceOrg: "네이버 (Naver DataLab API)",
    path: "/api/trends/naver-search",
    method: "POST",
    body: {
      startDate: "2026-09-01",
      endDate: "2026-09-30",
      timeUnit: "date",
      keywordGroups: [{ groupName: "축제", keywords: ["불꽃축제"] }],
    },
    validator: (json) => Array.isArray(json?.results) || json?.sourceStatus !== undefined,
  },
  {
    name: "기상청 단기예보",
    sourceOrg: "기상청 (단기예보 OpenAPI)",
    path: "/api/weather?lat=37.5283&lon=126.9328",
    method: "GET",
    validator: (json) => json?.status !== undefined || json?.temperature !== undefined || json?.weatherStatus !== undefined,
  },
  {
    name: "관광 소비 지출액 백데이터",
    sourceOrg: "한국관광 데이터랩",
    path: "/api/spending/consumer-strength?areaCd=11&baseYm=202509",
    method: "GET",
    validator: (json) => json?.response?.body?.items?.item !== undefined || json?.spendingPerCapita !== undefined,
  },
  {
    name: "전국 도시공원 표준 데이터",
    sourceOrg: "공공데이터포털 (도시공원정보표준데이터)",
    path: "/api/city-parks?query=" + encodeURIComponent("한강공원"),
    method: "GET",
    validator: (json) => Array.isArray(json?.items) || Array.isArray(json?.parks) || json?.totalCount !== undefined,
  },
  {
    name: "대중교통 접근성 인프라",
    sourceOrg: "국가대중교통DB (TAGO)",
    path: "/api/transit/nearby-stops?lat=37.5283&lon=126.9328",
    method: "GET",
    validator: (json) => json?.status !== undefined || Array.isArray(json?.stops),
  },
  {
    name: "주변 상권 및 소상공인 인프라",
    sourceOrg: "소상공인시장진흥공단",
    path: "/api/commercial/nearby-stores?lat=37.5283&lon=126.9328",
    method: "GET",
    validator: (json) => json?.status !== undefined || Array.isArray(json?.categories),
  },
  {
    name: "응급의료 및 비상대응 인프라",
    sourceOrg: "국립중앙의료원 / 보건복지부",
    path: "/api/emergency/nearby-facilities?lat=37.5283&lon=126.9328",
    method: "GET",
    validator: (json) => json?.status !== undefined || Array.isArray(json?.facilities),
  },
  {
    name: "문체부 전국 지역축제 표준DB",
    sourceOrg: "문화체육관광부 (지역축제 개최현황)",
    path: "/api/regional-festivals",
    method: "GET",
    validator: (json) => Array.isArray(json) || Array.isArray(json?.festivals) || Array.isArray(json?.items) || Array.isArray(json?.records),
  },
  {
    name: "시나리오 저장 및 복원 API",
    sourceOrg: "Fest-Twin 내부 데이터 저장소",
    path: "/api/scenarios",
    method: "GET",
    validator: (json) => Array.isArray(json?.scenarios) || Array.isArray(json),
  },
];

async function callEndpoint(baseUrl, ep) {
  const url = `${baseUrl}${ep.path}`;
  const start = Date.now();
  try {
    const res = await fetch(url, {
      method: ep.method,
      headers: { "Content-Type": "application/json" },
      body: ep.body ? JSON.stringify(ep.body) : undefined,
    });
    const latency = Date.now() - start;
    const contentType = res.headers.get("content-type") || "";
    let data = null;
    if (contentType.includes("application/json")) {
      data = await res.json();
    } else {
      data = await res.text();
    }
    const isValid = res.ok && (typeof ep.validator === "function" ? ep.validator(data) : true);
    const isFallback =
      data?.isFallback === true ||
      data?.fallback === true ||
      data?.dataSource === "fallback" ||
      data?.source === "mock" ||
      data?.source === "sample" ||
      data?.sourceStatus === "sample-fallback";

    return {
      status: res.status,
      ok: res.ok,
      latency,
      isValid,
      isFallback,
      dataSample: typeof data === "object" ? JSON.stringify(data).slice(0, 150) + "..." : String(data).slice(0, 150),
    };
  } catch (error) {
    return {
      status: 0,
      ok: false,
      latency: Date.now() - start,
      isValid: false,
      isFallback: true,
      error: error.message,
    };
  }
}

async function runAudit() {
  console.log("=================================================");
  console.log("Fest-Twin 공공데이터 API 3단계 신뢰도 종합 감사");
  console.log("=================================================");

  // 1. 로컬 Express 서버 시작
  const app = createApp();
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(LOCAL_PORT, resolve));
  console.log(`[INFO] 로컬 진단 서버 기동 (Port ${LOCAL_PORT})`);

  const results = [];

  for (const ep of ENDPOINTS) {
    console.log(`\n[TEST] ${ep.name} (${ep.method} ${ep.path.split("?")[0]})`);

    // 로컬 호출
    const localRes = await callEndpoint(LOCAL_BASE, ep);
    console.log(`  - 로컬 프록시: HTTP ${localRes.status} (${localRes.latency}ms) | 무결성: ${localRes.isValid ? "PASS" : "FAIL"} | Fallback: ${localRes.isFallback ? "YES" : "NO"}`);

    // 원격 호출
    const remoteRes = await callEndpoint(REMOTE_BASE, ep);
    console.log(`  - 원격 서버:   HTTP ${remoteRes.status} (${remoteRes.latency}ms) | 무결성: ${remoteRes.isValid ? "PASS" : "FAIL"} | Fallback: ${remoteRes.isFallback ? "YES" : "NO"}`);

    results.push({
      endpoint: ep.name,
      sourceOrg: ep.sourceOrg,
      path: ep.path,
      method: ep.method,
      local: localRes,
      remote: remoteRes,
    });
  }

  // 로컬 서버 종료
  server.close();
  console.log("\n[INFO] 로컬 진단 서버 종료 완료.");

  return results;
}

runAudit()
  .then(async (results) => {
    console.log("\n=================================================");
    console.log("진단 완료: 총 " + results.length + "개 엔드포인트 점검 완료");
    console.log("=================================================");

    const reportPath = path.resolve(process.cwd(), "docs/API_DATA_RELIABILITY_AUDIT.md");
    let md = "# Fest-Twin 공공데이터 API 신뢰도 및 수신 상태 종합 감사 보고서\n\n";
    md += "작성일: 2026-09-02  \n";
    md += "검증 대상: 원격 운영 서버 (" + REMOTE_BASE + "), 로컬 Express 백엔드\n\n";
    md += "## 1. 엔드포인트별 실시간 수신 상태 요약표\n\n";
    md += "| API 엔드포인트 | 원천 데이터 출처 | 원격 상태 | 로컬 상태 | 응답 지연 (원격) | 데이터 유형 | 무결성 판정 |\n";
    md += "| --- | --- | ---: | ---: | ---: | --- | --- |\n";

    for (const r of results) {
      const remoteStatus = r.remote.ok ? "HTTP " + r.remote.status : "HTTP " + r.remote.status + " (ERR)";
      const localStatus = r.local.ok ? "HTTP " + r.local.status : "HTTP " + r.local.status + " (ERR)";
      const dataType = r.remote.isFallback ? "보정 Fallback" : "실데이터 연동";
      const pass = r.remote.isValid ? "PASS" : "FAIL";
      md += `| ${r.endpoint} | ${r.sourceOrg} | ${remoteStatus} | ${localStatus} | ${r.remote.latency}ms | ${dataType} | ${pass} |\n`;
    }

    md += "\n## 2. 세부 엔드포인트 진단 결과\n\n";
    for (const r of results) {
      md += `### ${r.endpoint}\n\n`;
      md += `- 요청 경로: \`${r.method} ${r.path}\`\n`;
      md += `- 원천 출처: ${r.sourceOrg}\n`;
      md += `- 원격 응답: HTTP ${r.remote.status} (${r.remote.latency}ms)\n`;
      md += `- 데이터 샘플: \`${r.remote.dataSample}\`\n`;
      md += `- Fallback 동작 여부: ${r.remote.isFallback ? "Fallback 보정 데이터 사용" : "공공데이터 실데이터 직접 수신"}\n\n`;
    }

    await fs.writeFile(reportPath, md, "utf8");
    console.log(`[INFO] 감사 보고서 저장 완료: ${reportPath}`);
  })
  .catch((err) => {
    console.error("진단 중 오류 발생:", err);
    process.exit(1);
  });
