import { sampleTourismContext } from "../data/sampleTourApi";
import type { FestivalPlan, TourismContext } from "../domain/types";

export function createFallbackTourismContext(
  plan: FestivalPlan,
  reason: string,
): TourismContext {
  return {
    ...sampleTourismContext,
    provenance: {
      ...sampleTourismContext.provenance,
      sourceStatus: "sample-fallback",
      basisText:
        "TourAPI 형태의 샘플 공공데이터를 사용해 수요 예측 근거를 유지합니다.",
      fallbackReason: reason,
      retrievedAt: new Date().toISOString(),
    },
    nearbySpots: sampleTourismContext.nearbySpots.map((spot) => ({
      ...spot,
      category: `${plan.region} ${spot.category}`,
    })),
  };
}

export async function getTourismContext(plan: FestivalPlan): Promise<TourismContext> {
  const hasTourApiKey = Boolean(import.meta.env.VITE_TOUR_API_KEY);

  if (!hasTourApiKey) {
    return createFallbackTourismContext(plan, "TourAPI 인증키가 없어 샘플 데이터를 사용합니다.");
  }

  return createFallbackTourismContext(
    plan,
    "TourAPI 실제 호출은 다음 작업에서 연결합니다.",
  );
}
