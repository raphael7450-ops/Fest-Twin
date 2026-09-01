/**
 * 파일 : src/services/festivalImageProvider.ts
 * 내용 : 이미지 미기재 축제 및 지역별/테마별 대표 이미지 자동 보완 및 매핑 서비스
 */

export interface FestivalImageMapping {
  keywords: string[];
  regionKeywords: string[];
  imageUrl: string;
  sourceNote: string;
}

// 지역 및 축제 테마별 고품질 대표 축제 이미지 매핑 테이블
// 로컬 생성 이미지를 우선 사용하고, 없으면 Unsplash CDN으로 fallback
const REGIONAL_FESTIVAL_IMAGES: FestivalImageMapping[] = [
  {
    keywords: ["머드", "보령", "대천해수욕장"],
    regionKeywords: ["충남", "보령"],
    imageUrl: "/festival-images/boryeong_mud.png",
    sourceNote: "보령 머드축제 대표 이미지 (AI 생성)",
  },
  {
    keywords: ["불꽃", "광안대교", "광안리", "부산"],
    regionKeywords: ["부산"],
    imageUrl: "/festival-images/busan_fireworks.png",
    sourceNote: "부산 불꽃축제 대표 이미지 (AI 생성)",
  },
  {
    keywords: ["유등", "남강", "진주"],
    regionKeywords: ["경남", "진주"],
    imageUrl: "/festival-images/jinju_yudeung.png",
    sourceNote: "진주 남강유등축제 대표 이미지 (AI 생성)",
  },
  {
    keywords: ["0시", "원도심", "시간여행", "대전"],
    regionKeywords: ["대전"],
    imageUrl: "/festival-images/daejeon_zero.png",
    sourceNote: "대전 0시 축제 대표 이미지 (AI 생성)",
  },
  {
    keywords: ["등빛", "청계천", "광화문", "서울", "미디어아트", "빛초롱"],
    regionKeywords: ["서울"],
    imageUrl: "/festival-images/seoul_lantern.png",
    sourceNote: "서울 등빛 미디어아트 축제 대표 이미지 (AI 생성)",
  },
  {
    keywords: ["세종", "호수공원", "수변", "한글", "드론"],
    regionKeywords: ["세종"],
    imageUrl: "/festival-images/sejong_lake.png",
    sourceNote: "세종 축제 호수공원 대표 이미지 (AI 생성)",
  },
  {
    keywords: ["야행", "문화재", "한옥", "경기전", "달빛", "등불", "전주"],
    regionKeywords: ["전북", "전주", "경북", "경주", "공주", "부여"],
    imageUrl: "/festival-images/jeonju_yahaeng.png",
    sourceNote: "지역 문화재 야행 한옥마을 대표 이미지 (AI 생성)",
  },
  {
    keywords: ["먹거리", "치맥", "시장", "푸드", "야시장"],
    regionKeywords: ["대구", "전남"],
    imageUrl: "https://images.unsplash.com/photo-1555939594-58d7cb561ad1?auto=format&fit=crop&w=800&q=80",
    sourceNote: "지역 먹거리 및 야시장 축제 대표 이미지",
  },
  {
    keywords: ["음악", "콘서트", "버스킹", "국악", "공연"],
    regionKeywords: ["인천", "광주"],
    imageUrl: "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&w=800&q=80",
    sourceNote: "야외 음악 콘서트 및 공연 축제 대표 이미지",
  },
];

const DEFAULT_FALLBACK_IMAGE = "https://images.unsplash.com/photo-1508997449629-303059a039c0?auto=format&fit=crop&w=800&q=80";

const LOCAL_FALLBACK_IMAGES = REGIONAL_FESTIVAL_IMAGES
  .map((mapping) => mapping.imageUrl)
  .filter((imageUrl) => imageUrl.startsWith("/"));

function stableImageIndex(seed: string, imageCount: number) {
  let hash = 2166136261;

  for (let index = 0; index < seed.length; index += 1) {
    hash ^= seed.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return Math.abs(hash) % imageCount;
}

/**
 * 축제 명칭, 지역, 주소, 키워드를 분석하여 이미지 미기재 항목에 대표 이미지를 자동 공급합니다.
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
    return params.existingImageUrl;
  }

  const combinedText = `${params.title ?? ""} ${params.region ?? ""} ${params.address ?? ""}`.toLowerCase();

  // 1차: 넓은 지역명을 제외한 축제 고유 키워드 매칭
  for (const mapping of REGIONAL_FESTIVAL_IMAGES) {
    const regionKeywordSet = new Set(mapping.regionKeywords.map((keyword) => keyword.toLowerCase()));
    const hasKeywordMatch = mapping.keywords.some((keyword) => {
      const normalizedKeyword = keyword.toLowerCase();
      return !regionKeywordSet.has(normalizedKeyword) && combinedText.includes(normalizedKeyword);
    });
    if (hasKeywordMatch && !params.excludedImageUrls?.has(mapping.imageUrl)) {
      return mapping.imageUrl;
    }
  }

  // 2차: 공식 이미지가 없는 후보는 같은 지역에서도 후보별로 다른 로컬 이미지를 안정적으로 배정
  if (LOCAL_FALLBACK_IMAGES.length > 0) {
    const seed = `${params.candidateKey ?? ""}|${params.title ?? ""}|${params.region ?? ""}|${params.address ?? ""}`;
    const startIndex = stableImageIndex(seed, LOCAL_FALLBACK_IMAGES.length);

    for (let offset = 0; offset < LOCAL_FALLBACK_IMAGES.length; offset += 1) {
      const imageUrl = LOCAL_FALLBACK_IMAGES[(startIndex + offset) % LOCAL_FALLBACK_IMAGES.length];
      if (!params.excludedImageUrls?.has(imageUrl)) return imageUrl;
    }

    return LOCAL_FALLBACK_IMAGES[startIndex];
  }

  return DEFAULT_FALLBACK_IMAGE;
}
