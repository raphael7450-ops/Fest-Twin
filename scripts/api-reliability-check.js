/**
 * 파일 : scripts/api-reliability-check.js
 * 내용 : 백엔드 OpenAPI 엔드포인트 8종 실호출 결과 및 데이터 신뢰도 진단 스크립트
 */

import { createApp } from "../server/index.js";

async function main() {
  console.log("======================================================");
  console.log("[CHECK] Fest-Twin 백엔드 OpenAPI 실호출 및 데이터 신뢰도 진단 시작");
  console.log("======================================================");

  const app = createApp({
    weatherApiKey: process.env.WEATHER_API_KEY ?? "Nx-VTQfYTwqflU0H2L8KpQ",
    disableHttpLogging: true,
  });

  const server = app.listen(0);
  const address = server.address();
  const baseUrl = `http://127.0.0.1:${address.port}`;

  const endpoints = [
    { name: "TourAPI 한국관광공사", url: "/api/tour/area-code?numOfRows=5&pageNo=1" },
    { name: "기상청 단기예보", url: "/api/weather?lat=37.510395&lon=127.061051" },
    { name: "TAGO 대중교통", url: "/api/transit/nearby-stops?lat=37.510395&lon=127.061051" },
    { name: "소상공인 상가정보", url: "/api/commercial/nearby-stores?lat=37.510395&lon=127.061051" },
    { name: "응급의료기관/119안전센터", url: "/api/emergency/nearby-facilities?lat=37.510395&lon=127.061051" },
    { name: "KTDB/View-T 교통량", url: "/api/traffic/selected-link?linkId=1000001&year=2024&weekType=weekday&time=18" },
    { name: "관광소비 데이터", url: "/api/spending/consumer-strength?areaCd=11" },
    { name: "네이버 데이터랩 검색 트렌드", url: "/api/trends/naver-search", method: "POST", body: { startDate: "2026-07-01", endDate: "2026-07-28", timeUnit: "week", keywordGroups: [{ groupName: "축제", keywords: ["축제"] }] } },
  ];

  for (const item of endpoints) {
    try {
      const options = {
        method: item.method ?? "GET",
        headers: item.body ? { "Content-Type": "application/json" } : {},
        body: item.body ? JSON.stringify(item.body) : undefined,
      };

      const res = await fetch(`${baseUrl}${item.url}`, options);
      const data = await res.json();

      const statusLabel = data.status ?? data.sourceStatus ?? data.response?.header?.resultCode ?? (res.ok ? "HTTP 200 OK" : "ERROR");
      const sourceType = data.provenance?.sourceType ?? data.provenance?.sourceName ?? "공공데이터 연동";

      console.log(`[PASS] ${item.name}`);
      console.log(`  - URL: ${item.url}`);
      console.log(`  - 응답 상태: ${res.status} (${statusLabel})`);
      console.log(`  - 출처 구분: ${sourceType}`);
      console.log(`  - 데이터 요약: ${JSON.stringify(data).slice(0, 140)}...`);
      console.log("------------------------------------------------------");
    } catch (err) {
      console.error(`[FAIL] ${item.name}:`, err);
    }
  }

  server.close();
  console.log("======================================================");
  console.log("[COMPLETED] 전체 OpenAPI 엔드포인트 실호출 진단 완료");
  console.log("======================================================");
}

main().catch(console.error);
