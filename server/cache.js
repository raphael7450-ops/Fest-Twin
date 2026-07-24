/**
 * 파일 : server/cache.js
 * 내용 : TTL(Time-To-Live) 기반 인메모리 캐시 모듈 (API 요청 쿼터 절감 및 초고속 응답)
 * 수정 : 2026-07-24. getCachedData, setCachedData, clearCache 함수 구현
 */

const cacheStore = new Map();
const DEFAULT_TTL_MS = 10 * 60 * 1000; // 기본 캐시 유효시간: 10분

/**
 * 캐시 저장소에서 유효한 캐시 데이터를 조회합니다.
 * 만료된 경우 자동으로 삭제하고 null을 반환합니다.
 */
export function getCachedData(key) {
  const item = cacheStore.get(key);
  if (!item) return null;

  if (Date.now() > item.expiresAt) {
    cacheStore.delete(key);
    return null;
  }

  return item.data;
}

/**
 * 캐시 저장소에 키-값 및 TTL 만료 시각을 저장합니다.
 */
export function setCachedData(key, data, ttlMs = DEFAULT_TTL_MS) {
  cacheStore.set(key, {
    data,
    expiresAt: Date.now() + ttlMs,
  });
}

/**
 * 캐시 저장소의 모든 항목을 초기화합니다. (테스트 및 리셋용)
 */
export function clearCache() {
  cacheStore.clear();
}
