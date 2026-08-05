/**
 * 파일 : server/cache.js
 * 내용 : TTL(Time-To-Live) 및 LRU(Least Recently Used) 기반 고성능 인메모리 캐시 모듈
 * 수정 : 2026-08-05. O(1) LRU Eviction 메커니즘 및 최대 슬롯 용량 제한 적용
 */

const cacheStore = new Map();
const DEFAULT_TTL_MS = 10 * 60 * 1000; // 기본 캐시 유효시간: 10분
const DEFAULT_MAX_CAPACITY = 1000; // 기본 최대 캐시 용량: 1,000개

let currentMaxCapacity = DEFAULT_MAX_CAPACITY;

/**
 * 캐시 용량을 설정합니다. (테스트 및 튜닝용)
 */
export function setCacheCapacity(maxCapacity) {
  if (typeof maxCapacity === "number" && maxCapacity > 0) {
    currentMaxCapacity = maxCapacity;
    evictExcessEntries();
  }
}

/**
 * 용량 초과 항목을 가장 오래된 항목(LRU)부터 순차 제거합니다.
 */
function evictExcessEntries() {
  while (cacheStore.size > currentMaxCapacity) {
    const oldestKey = cacheStore.keys().next().value;
    if (oldestKey !== undefined) {
      cacheStore.delete(oldestKey);
    } else {
      break;
    }
  }
}

/**
 * 캐시 저장소에서 유효한 캐시 데이터를 조회합니다.
 * 조회 시 해당 항목을 MRU(Most Recently Used)로 순서 이동시킵니다.
 * 만료된 경우 자동으로 삭제하고 null을 반환합니다.
 */
export function getCachedData(key) {
  const item = cacheStore.get(key);
  if (!item) return null;

  if (Date.now() > item.expiresAt) {
    cacheStore.delete(key);
    return null;
  }

  // LRU 순서 갱신: 기존 위치 제거 후 재삽입으로 맨 뒤(MRU) 이동
  cacheStore.delete(key);
  cacheStore.set(key, item);

  return item.data;
}

/**
 * 캐시 저장소에 키-값 및 TTL 만료 시각을 저장합니다.
 * 용량 초과 시 LRU 항목을 비동기/동기 O(1)로 제거합니다.
 */
export function setCachedData(key, data, ttlMs = DEFAULT_TTL_MS) {
  if (cacheStore.has(key)) {
    cacheStore.delete(key);
  } else {
    while (cacheStore.size >= currentMaxCapacity) {
      const oldestKey = cacheStore.keys().next().value;
      if (oldestKey !== undefined) {
        cacheStore.delete(oldestKey);
      } else {
        break;
      }
    }
  }

  cacheStore.set(key, {
    data,
    expiresAt: Date.now() + ttlMs,
  });
}

/**
 * 캐시 통계 정보를 반환합니다.
 */
export function getCacheStats() {
  return {
    size: cacheStore.size,
    maxCapacity: currentMaxCapacity,
  };
}

/**
 * 캐시 저장소의 모든 항목을 초기화합니다. (테스트 및 리셋용)
 */
export function clearCache() {
  cacheStore.clear();
  currentMaxCapacity = DEFAULT_MAX_CAPACITY;
}

