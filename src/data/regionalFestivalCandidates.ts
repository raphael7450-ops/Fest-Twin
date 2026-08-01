export interface RegionalFestivalCandidateRecord {
  id: string;
  title: string;
  region: string;
  address: string;
  startDate: string;
  endDate: string;
  sourceName: string;
  sourceUrl: string;
}

export const regionalFestivalCandidateRecords: RegionalFestivalCandidateRecord[] = [
  {
    id: "regional-nonsan-strawberry-2025",
    title: "논산딸기축제",
    region: "충청남도 논산시",
    address: "충청남도 논산시 시민가족공원 및 시민운동장 일원",
    startDate: "2025-03-27",
    endDate: "2025-03-30",
    sourceName: "논산딸기축제 공식/지역축제 보강 데이터",
    sourceUrl: "https://www.nonsan.go.kr/nsfestival/",
  },
  {
    id: "regional-seocheon-camellia-webfoot-2025",
    title: "서천 동백꽃주꾸미축제",
    region: "충청남도 서천군",
    address: "충청남도 서천군 서면 마량진항 일원",
    startDate: "2025-03-22",
    endDate: "2025-04-06",
    sourceName: "서천군 문화관광/지역축제 보강 데이터",
    sourceUrl: "https://www.seocheon.go.kr/tour.do",
  },
  {
    id: "regional-taean-tulip-2025",
    title: "태안 세계튤립꽃박람회",
    region: "충청남도 태안군",
    address: "충청남도 태안군 안면읍 꽃지해안로 400",
    startDate: "2025-04-08",
    endDate: "2025-05-11",
    sourceName: "태안세계튤립꽃박람회/지역축제 보강 데이터",
    sourceUrl: "https://www.koreaflowerpark.com/",
  },
  {
    id: "regional-gongju-seokjangni-2025",
    title: "공주 석장리 구석기축제",
    region: "충청남도 공주시",
    address: "충청남도 공주시 금벽로 990 석장리박물관 일원",
    startDate: "2025-05-02",
    endDate: "2025-05-05",
    sourceName: "공주시 문화관광/지역축제 보강 데이터",
    sourceUrl: "https://www.gongju.go.kr/",
  },
];
