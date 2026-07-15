import { sampleTourismContext } from "../data/sampleTourApi";
import type { FestivalPlan, TourismContext } from "../domain/types";

export async function getTourismContext(plan: FestivalPlan): Promise<TourismContext> {
  const hasTourApiKey = Boolean(import.meta.env.VITE_TOUR_API_KEY);

  if (!hasTourApiKey) {
    return {
      ...sampleTourismContext,
      nearbySpots: sampleTourismContext.nearbySpots.map((spot) => ({
        ...spot,
        category: `${plan.region} ${spot.category}`,
      })),
    };
  }

  return sampleTourismContext;
}
