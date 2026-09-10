import { describe, expect, it, vi } from "vitest";
import { sampleFestivalPlan } from "../data/sampleFestivalPlan";
import { getInfrastructureContext } from "./infrastructureAdapter";

const plan = { ...sampleFestivalPlan, venueCoordinates: { latitude: 37.5759, longitude: 126.9768, source: "vworld" as const } };
const payload = {
  status: "live", providerTotalCount: 15,
  observations: [{ name: "실제 조회 시설", address: "서울 종로구", category: "관측 분류", distanceMeters: 100 }],
  provenance: { requestedCoordinates: plan.venueCoordinates, retrievedAt: "2026-09-10T00:00:00.000Z" },
};

describe("infrastructureAdapter", () => {
  it("loads all providers with the selected coordinates and actual evidence", async () => {
    const fetchImpl = vi.fn(async () => Response.json(payload));
    const result = await getInfrastructureContext(plan, { fetchImpl });
    expect(fetchImpl).toHaveBeenCalledTimes(3);
    expect(result.sourceDetails).toHaveLength(3);
    expect(result.sourceDetails.every((detail) => detail.sourceType === "public-data")).toBe(true);
    expect(JSON.stringify(result)).toContain("실제 조회 시설");
    expect(JSON.stringify(result)).not.toContain("골든타임 확보");
  });
  it("does not use defaults when coordinates are missing", async () => {
    const fetchImpl = vi.fn();
    const result = await getInfrastructureContext({ ...plan, venueCoordinates: undefined }, { fetchImpl });
    expect(fetchImpl).not.toHaveBeenCalled();
    expect(result.sourceDetails.every((detail) => detail.statusLabel.includes("미확보"))).toBe(true);
  });
  it("rejects stale-location payloads and fake fallback records", async () => {
    for (const value of [
      { ...payload, status: "sample-fallback" },
      { ...payload, provenance: { ...payload.provenance, requestedCoordinates: { latitude: 35, longitude: 129 } } },
    ]) {
      const result = await getInfrastructureContext(plan, { fetchImpl: async () => Response.json(value) });
      expect(result.sourceDetails.every((detail) => detail.records?.length === 0)).toBe(true);
    }
  });
  it("keeps one provider failure independent of other successful providers", async () => {
    const result = await getInfrastructureContext(plan, { fetchImpl: async (input) => {
      if (String(input).includes("transit")) throw new Error("network failure");
      return Response.json(payload);
    } });
    expect(result.sourceDetails.filter((detail) => detail.sourceType === "public-data")).toHaveLength(2);
  });
});
