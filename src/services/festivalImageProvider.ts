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
const REGIONAL_FESTIVAL_IMAGES: FestivalImageMapping[] = [
  {
    keywords: ["0시", "원도심", "시간여행", "대전"],
    regionKeywords: ["대전"],
    imageUrl: "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=800&q=80",
    sourceNote: "대전 0시 축제 도심 야간 라이트 퍼레이드 대표 이미지",
  },
  {
    keywords: ["세종", "호수공원", "수변", "한글", "드론"],
    regionKeywords: ["세종"],
    imageUrl: "https://images.unsplash.com/photo-1531306728370-e2ebd9d7bb99?auto=format&fit=crop&w=800&q=80",
    sourceNote: "세종 호수공원 수변 불꽃 & 친환경 축제 대표 이미지",
  },
  {
    keywords: ["야행", "문화재", "한옥", "경기전", "달빛", "등불"],
    regionKeywords: ["전북", "전주", "경북", "경주", "공주", "부여"],
    imageUrl: "https://images.unsplash.com/photo-1578637387939-43c525550085?auto=format&fit=crop&w=800&q=80",
    sourceNote: "지역 문화재 야행 및 전통 등불 야경 투어 대표 이미지",
  },
  {
    keywords: ["강남", "미디어", "윈터", "겨울", "빛축제", "LED"],
    regionKeywords: ["서울", "강남"],
    imageUrl: "https://images.unsplash.com/photo-1517457373958-b7bdd4587205?auto=format&fit=crop&w=800&q=80",
    sourceNote: "도심 미디어아트 및 겨울 빛축제 대표 이미지",
  },
  {
    keywords: ["불꽃", "해운대", "광안리", "바다", "항구"],
    regionKeywords: ["부산"],
    imageUrl: "https://images.unsplash.com/photo-1498931299472-f7a63a5a1cfa?auto=format&fit=crop&w=800&q=80",
    sourceNote: "해양 및 불꽃 축제 대표 이미지",
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

/**
 * 축제 명칭, 지역, 주소, 키워드를 분석하여 이미지 미기재 항목에 대표 이미지를 자동 공급합니다.
 */
export function getRepresentativeFestivalImage(params: {
  title?: string;
  region?: string;
  address?: string;
  existingImageUrl?: string;
}): string {
  if (params.existingImageUrl && params.existingImageUrl.trim().length > 0) {
    return params.existingImageUrl;
  }

  const combinedText = `${params.title ?? ""} ${params.region ?? ""} ${params.address ?? ""}`.toLowerCase();

  // 1차: 명칭 및 축제 특화 키워드 매칭
  for (const mapping of REGIONAL_FESTIVAL_IMAGES) {
    const hasKeywordMatch = mapping.keywords.some((kw) => combinedText.includes(kw.toLowerCase()));
    if (hasKeywordMatch) {
      return mapping.imageUrl;
    }
  }

  // 2차: 지역명 매칭
  for (const mapping of REGIONAL_FESTIVAL_IMAGES) {
    const hasRegionMatch = mapping.regionKeywords.some((rk) => combinedText.includes(rk.toLowerCase()));
    if (hasRegionMatch) {
      return mapping.imageUrl;
    }
  }

  return DEFAULT_FALLBACK_IMAGE;
}
