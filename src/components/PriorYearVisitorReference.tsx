import { selectPriorYearVisitors } from '../services/priorYearVisitors';

export function PriorYearVisitorReference({ plan }: { plan: { name: string; region: string; startDate: string } }) {
  const result = selectPriorYearVisitors(plan);
  return <section aria-label="전년도 방문객 기준">
    <h3>전년도 방문객 기준</h3>
    <p>{plan.name} · {result.year ? `${result.year}년 집계` : '기준 연도 확인 불가'}</p>
    {result.status === 'reference' && result.record ? <>
      <p><strong>{result.value?.toLocaleString('ko-KR')}명</strong> · 전년도 공식 보고 수치 · 집계 방식 미확인</p>
      <a href={result.record.sourceUrl} target="_blank" rel="noopener noreferrer">전년도 수치 출처</a>
      <p>올해 실측값이 아닌 참고 기준값입니다. 일평균·시간대 인원으로 자동 환산하지 않으며, 현재 모델 입력과 정확도 평가에는 사용하지 않습니다.</p>
    </> : <p>{result.status === 'ambiguous' ? '동일 연도 자료가 여러 건이므로 출처 대조가 필요합니다.' : '해당 축제의 직전 연도 방문객 수를 확인할 수 없습니다.'}</p>}
    <p>대체 검증: 행사 전 예측을 보관한 뒤, 올해 출입 계수·입장권 등의 실측과 비교합니다. 누적 출입과 중복 제거 인원, 계측 구역·기간을 맞춘 자료만 평가합니다.</p>
  </section>;
}
