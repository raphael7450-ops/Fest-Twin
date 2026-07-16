# TourAPI 검색 완화 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 입력 기간에 TourAPI 축제 결과가 없을 때 같은 지역의 연간 축제 데이터를 보조 조회해 대시보드가 실제 TourAPI 근거를 더 자주 표시하게 한다.

**Architecture:** `src/services/tourApiAdapter.ts` 안에서 축제 검색을 `입력 기간 검색 -> 같은 연도 연간 검색` 순서로 확장한다. 연간 검색을 사용한 경우에는 `mapTourApiItemsToTourismContext`에 검색 범위 metadata를 넘겨 `partial-fallback` 근거 문구를 명확히 표시한다.

**Tech Stack:** React 18, TypeScript, Vite, Vitest, Node/Express TourAPI proxy.

## Global Constraints

- TourAPI 인증키는 Git, Docker 이미지, 브라우저 번들, 로그, 오류 응답에 저장하거나 노출하지 않는다.
- 서버는 런타임 환경변수 `TOUR_API_KEY`에서만 인증키를 읽는다.
- 브라우저 요청 URL에는 `serviceKey`가 포함되지 않는다.
- 기존 `live`, `partial-fallback`, `sample-fallback` 의미를 유지한다.
- 키 없음, 네트워크 오류, 응답 구조 오류, 지역 코드 매핑 실패 시 기존 fallback 동작을 유지한다.
- 사용자가 검색 기간을 직접 선택하는 UI, 데이터베이스, 캐시, TourAPI 외 실시간 데이터 연동, 임의 외부 URL 프록시는 추가하지 않는다.

---

## 파일 구조

- 수정 `src/services/tourApiAdapter.ts`: 기간 검색 0건 시 같은 연도 연간 검색을 추가하고, 완화 검색 사용 여부를 provenance에 반영한다.
- 수정 `src/services/dataAdapters.test.ts`: 첫 검색 0건 후 연간 검색을 수행하는지, 연간 검색 결과가 `partial-fallback` 근거로 표시되는지, 연간 검색도 0건이면 기존 fallback으로 가는지 검증한다.
- 수정 `docs/demo-verification.md`: 실제 TourAPI 검증 항목에 입력 기간 0건 시 같은 지역 연간 보조 검색 상태 확인을 추가한다.

## Task 1: 어댑터 검색 완화

**파일:**
- 수정: `src/services/tourApiAdapter.ts`
- 수정: `src/services/dataAdapters.test.ts`

**인터페이스:**
- 유지: `getTourismContext(plan, options): Promise<TourismContext>`
- 추가 내부 타입: `FestivalSearchScope = "exact-period" | "annual-region"`
- 추가 내부 함수: `buildAnnualFestivalSearchParams(plan: FestivalPlan, areaCode: string | number): Record<string, string | number>`
- 변경: `mapTourApiItemsToTourismContext(plan, festivalItems, nearbyItems, retrievedAt, options?)`는 선택 옵션 `{ festivalSearchScope?: FestivalSearchScope }`를 받을 수 있다.

- [ ] **Step 1: 첫 검색 0건 후 연간 검색 테스트 추가**

`src/services/dataAdapters.test.ts`에 새 테스트를 추가한다.

```ts
  it("broadens empty exact-period festival searches to annual same-region TourAPI data", async () => {
    const responses = [
      tourApiPayload([{ code: "1", name: "서울" }]),
      tourApiPayload([], 0),
      tourApiPayload([
        {
          contentid: "300",
          title: "서울라이트 광화문",
          addr1: "서울특별시 종로구",
          eventstartdate: "20251212",
          eventenddate: "20260104",
        },
      ]),
      tourApiPayload([
        {
          contentid: "300",
          title: "서울라이트 광화문",
          addr1: "서울특별시 종로구",
          firstimage: "https://example.com/light.jpg",
          eventstartdate: "20251212",
          eventenddate: "20260104",
          overview: "광화문 일대에서 열리는 빛 축제",
          mapx: "126.9767",
          mapy: "37.5716",
        },
      ]),
      tourApiPayload([
        {
          contentid: "400",
          title: "광화문광장",
          contenttypeid: "12",
          dist: "300",
        },
      ]),
    ];
    const fetchMock = vi.fn(async () => jsonResponse(responses.shift()));

    const tourism = await getTourismContext(sampleFestivalPlan, {
      fetchImpl: fetchMock as unknown as typeof fetch,
    });

    expect(tourism.provenance.sourceStatus).toBe("partial-fallback");
    expect(tourism.provenance.fallbackReason).toContain("입력 기간");
    expect(tourism.provenance.fallbackReason).toContain("연간");
    expect(tourism.similarFestivals[0].name).toBe("서울라이트 광화문");

    const urls = fetchMock.mock.calls.map(([input]) => new URL(String(input), "http://localhost"));
    expect(urls.map((url) => url.pathname)).toEqual([
      "/api/tour/area-code",
      "/api/tour/festivals",
      "/api/tour/festivals",
      "/api/tour/detail",
      "/api/tour/nearby",
    ]);
    expect(urls[1].searchParams.get("eventStartDate")).toBe("20260918");
    expect(urls[1].searchParams.get("eventEndDate")).toBe("20260920");
    expect(urls[2].searchParams.get("eventStartDate")).toBe("20260101");
    expect(urls[2].searchParams.get("eventEndDate")).toBe("20261231");
    expect(urls.every((url) => url.searchParams.has("serviceKey"))).toBe(false);
  });
```

- [ ] **Step 2: 연간 검색도 0건이면 기존 fallback 테스트 보강**

기존 `"rejects unreliable live data and preserves full versus partial fallback semantics"` 테스트의 `emptyFestivalResponses`를 세 응답으로 바꾼다.

```ts
    const emptyFestivalResponses = [
      tourApiPayload([{ code: "1", name: "서울" }]),
      tourApiPayload([], 0),
      tourApiPayload([], 0),
    ];
```

그리고 `emptyFestivalFetch` 호출 수를 확인한다.

```ts
    expect(emptyFestivalFetch).toHaveBeenCalledTimes(3);
```

- [ ] **Step 3: 테스트 실패 확인**

실행:

```powershell
npx vitest run --config vitest.config.ts src/services/dataAdapters.test.ts
```

예상: 새 연간 검색 테스트가 실패한다. 현재 구현은 첫 `festivals` 0건 뒤 바로 sample fallback을 반환한다.

- [ ] **Step 4: 검색 범위 타입과 연간 검색 파라미터 함수 추가**

`src/services/tourApiAdapter.ts`에 내부 타입과 helper를 추가한다.

```ts
type FestivalSearchScope = "exact-period" | "annual-region";

function formatDateForTourApi(date: string) {
  return date.replace(/-/g, "");
}

function buildExactFestivalSearchParams(plan: FestivalPlan, areaCode: string | number) {
  return {
    numOfRows: 10,
    pageNo: 1,
    arrange: "A",
    areaCode,
    eventStartDate: formatDateForTourApi(plan.startDate),
    eventEndDate: formatDateForTourApi(plan.endDate),
  };
}

function buildAnnualFestivalSearchParams(plan: FestivalPlan, areaCode: string | number) {
  const year = plan.startDate.slice(0, 4);

  return {
    numOfRows: 10,
    pageNo: 1,
    arrange: "A",
    areaCode,
    eventStartDate: `${year}0101`,
    eventEndDate: `${year}1231`,
  };
}
```

- [ ] **Step 5: `mapTourApiItemsToTourismContext`에 검색 범위 옵션 추가**

시그니처를 바꾼다.

```ts
export function mapTourApiItemsToTourismContext(
  plan: FestivalPlan,
  festivalItems: TourApiItem[],
  nearbyItems: TourApiItem[],
  retrievedAt: string,
  options: { festivalSearchScope?: FestivalSearchScope } = {},
): TourismContext {
```

`similarFestivals`와 `nearbySpots`가 모두 있는 경우에도 `festivalSearchScope === "annual-region"`이면 `partial-fallback`을 반환한다.

```ts
  if (options.festivalSearchScope === "annual-region") {
    return {
      provenance: {
        sourceName: "한국관광공사 TourAPI + 기간 완화 검색",
        sourceType: "public-data",
        sourceStatus: "partial-fallback",
        basisText:
          "입력 기간 직접 일치 결과가 없어 같은 지역의 연간 TourAPI 축제 데이터를 참고하며 축제 수요는 메타데이터 기반 추정 프록시입니다.",
        fallbackText:
          "입력 기간과 직접 일치하지 않는 항목은 같은 지역의 연간 축제 데이터와 기존 샘플 데이터로 보완합니다.",
        fallbackReason:
          "입력 기간 직접 일치 결과가 없어 같은 지역의 연간 TourAPI 축제 데이터를 참고했습니다.",
        retrievedAt,
        collectedPersonalData: false,
      },
      nearbySpots,
      similarFestivals,
    };
  }
```

이 블록은 full `live` 반환 블록보다 앞에 둔다. 기존 partial fallback 블록은 그대로 유지한다.

- [ ] **Step 6: `getTourismContext`에서 두 단계 축제 검색 구현**

기존 `festivalItems` 생성 부분을 다음 구조로 바꾼다.

```ts
    let festivalSearchScope: FestivalSearchScope = "exact-period";
    let festivalItems = await fetchTourApiItems(
      "festivals",
      buildExactFestivalSearchParams(plan, areaCode),
      fetchImpl,
      options.signal,
    );

    if (festivalItems.length === 0) {
      festivalSearchScope = "annual-region";
      festivalItems = await fetchTourApiItems(
        "festivals",
        buildAnnualFestivalSearchParams(plan, areaCode),
        fetchImpl,
        options.signal,
      );
    }
```

마지막 mapping 호출에 옵션을 넘긴다.

```ts
    return mapTourApiItemsToTourismContext(
      plan,
      detailItems,
      nearbyItems,
      new Date().toISOString(),
      { festivalSearchScope },
    );
```

- [ ] **Step 7: 어댑터 테스트 실행**

실행:

```powershell
npx vitest run --config vitest.config.ts src/services/dataAdapters.test.ts
```

예상: 통과한다.

- [ ] **Step 8: 커밋**

실행:

```powershell
git add src/services/tourApiAdapter.ts src/services/dataAdapters.test.ts
git commit -m "feat: broaden empty TourAPI festival searches"
```

예상: 커밋이 성공한다.

## Task 2: 검증, 문서, 서버 재배포

**파일:**
- 수정: `docs/demo-verification.md`

**인터페이스:**
- 사용: Task 1의 broadened search behavior
- 제공: 최신 서버 배포와 검증 evidence

- [ ] **Step 1: 데모 검증 문서 갱신**

`docs/demo-verification.md`의 "TourAPI 실제 연동 확인" 섹션에 다음 항목을 추가한다.

```markdown
- [ ] 입력 기간 직접 일치 결과가 0건이면 같은 지역의 연간 TourAPI 축제 데이터를 참고하고, 데이터 근거 패널에 기간 완화 검색 사유가 표시된다.
```

- [ ] **Step 2: 전체 테스트 실행**

실행:

```powershell
npm run test
```

예상: 모든 Vitest 테스트가 통과한다.

- [ ] **Step 3: production build 실행**

실행:

```powershell
npm run build
```

예상: TypeScript와 Vite build가 통과한다.

- [ ] **Step 4: diff check 실행**

실행:

```powershell
git diff --check
```

예상: 출력이 없다.

- [ ] **Step 5: 서버 재배포**

최신 `HEAD`를 archive로 업로드하고 `docs/internal-docker-deploy.md`의 재배포 절차를 따른다. 서버에는 이미 `fest-twin-demo.env`가 있으므로 실제 TourAPI 모드로 컨테이너가 실행되어야 한다.

검증:

```powershell
curl.exe -I --max-time 15 http://192.168.55.223:18080/
ssh -o BatchMode=yes cwuser@192.168.55.223 'curl -sS --max-time 20 "http://127.0.0.1:18080/api/tour/festivals?numOfRows=5&pageNo=1&arrange=A&areaCode=1&eventStartDate=20260101&eventEndDate=20261231"'
```

예상:

- 외부 `/`가 `200 OK`를 반환한다.
- 연간 서울 축제 검색이 `resultCode: "0000"`과 하나 이상의 `item`을 반환한다.
- 컨테이너에 `TOUR_API_KEY`가 present 상태지만 값은 출력하지 않는다.

- [ ] **Step 6: 커밋**

실행:

```powershell
git add docs/demo-verification.md
git commit -m "docs: document TourAPI broadened search verification"
```

예상: 문서 변경이 있을 때만 커밋한다.
