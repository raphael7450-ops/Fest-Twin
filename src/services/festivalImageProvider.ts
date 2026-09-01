/**
 * 파일 : src/services/festivalImageProvider.ts
 * 내용 : 이미지 미기재 축제에 대한 공식 이미지 보존 및 중립 SVG 플레이스홀더 공급 서비스
 */

export interface FestivalImageMapping {
  keywords: string[];
  regionKeywords: string[];
  imageUrl: string;
  sourceNote: string;
}

export function createNeutralPlaceholderSvg(title?: string, region?: string): string {
  const safeTitle = (title ?? "축제 명칭 미상").replace(/[<>&"]/g, "");
  const safeRegion = (region ?? "").replace(/[<>&"]/g, "");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300" viewBox="0 0 400 300">
    <rect width="400" height="300" fill="#1e293b"/>
    <rect x="20" y="20" width="360" height="260" rx="8" fill="#334155" stroke="#475569" stroke-width="2" stroke-dasharray="4 4"/>
    <text x="200" y="115" font-family="sans-serif" font-size="16" fill="#94a3b8" text-anchor="middle">공식 이미지 준비 중</text>
    <text x="200" y="155" font-family="sans-serif" font-size="18" font-weight="bold" fill="#38bdf8" text-anchor="middle">${safeTitle}</text>
    ${safeRegion ? `<text x="200" y="190" font-family="sans-serif" font-size="14" fill="#cbd5e1" text-anchor="middle">[${safeRegion}]</text>` : ""}
  </svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

function extractRegion(params: { region?: string; address?: string }): string | undefined {
  if (params.region && params.region.trim().length > 0) {
    return params.region.trim();
  }
  if (params.address && params.address.trim().length > 0) {
    const parts = params.address.trim().split(/\s+/);
    if (parts.length > 0 && parts[0].length > 0) {
      return parts[0];
    }
  }
  return undefined;
}

/**
 * 축제 명칭, 지역, 주소를 바탕으로 공식 이미지를 보존하거나 중립 SVG 플레이스홀더를 제공합니다.
 */
export function getRepresentativeFestivalImage(params: {
  title?: string;
  region?: string;
  address?: string;
  existingImageUrl?: string;
  candidateKey?: string;
  excludedImageUrls?: ReadonlySet<string>;
}): string {
  if (params.existingImageUrl && params.existingImageUrl.trim().length > 0) {
    return params.existingImageUrl.trim();
  }

  const region = extractRegion(params);
  return createNeutralPlaceholderSvg(params.title, region);
}

