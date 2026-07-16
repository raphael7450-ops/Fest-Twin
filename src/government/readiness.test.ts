import { describe, expect, it } from "vitest";
import { evaluateGovernmentReadiness } from "./readiness";

describe("evaluateGovernmentReadiness", () => {
  it("covers the required government standards", () => {
    const readiness = evaluateGovernmentReadiness();
    const titles = readiness.map((item) => item.title);

    expect(titles).toContain("디지털 정부서비스 UI/UX 가이드라인(KRDS)");
    expect(titles).toContain("전자정부 웹사이트 품질관리 지침");
    expect(titles).toContain("한국형 웹 콘텐츠 접근성 지침 2.2");
    expect(titles).toContain("공공부문 SaaS 이용 가이드라인");
    expect(titles).toContain("클라우드 보안인증제(CSAP) 준비성");
    expect(titles).toContain("개인정보 보호 및 개인정보 영향평가");
    expect(titles).toContain("공공데이터 이용정책");
  });

  it("marks privacy and public data as reflected in the MVP", () => {
    const readiness = evaluateGovernmentReadiness();

    expect(readiness.find((item) => item.standardId === "privacy")?.status).toBe(
      "반영",
    );
    expect(
      readiness.find((item) => item.standardId === "public-data")?.status,
    ).toBe("반영");
  });
});
