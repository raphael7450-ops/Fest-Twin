import { describe, expect, it } from 'vitest';
import { selectPriorYearVisitors, type VisitorReference } from './priorYearVisitors';

const record: VisitorReference = { id: 'r', name: '축제', region: '전남', measuredYear: 2024, value: 100,
  sourceUrl: 'https://www.data.go.kr/data/15150652/fileData.do', reviewStatus: 'method_unverified', excluded: false };
const plan = { name: '2025 제8회 축제', region: '전라남도', startDate: '2025-10-01' };
describe('prior-year reference', () => {
  it('uses measurement year, never the current event year', () => {
    expect(selectPriorYearVisitors(plan, [record, { ...record, id: 'current', measuredYear: 2025 }])).toMatchObject({ status: 'reference', year: 2024, value: 100, eligibleForAccuracy: false });
  });
  it('does not substitute older years or neighbouring regions', () => {
    expect(selectPriorYearVisitors(plan, [{ ...record, measuredYear: 2023 }]).status).toBe('missing');
    expect(selectPriorYearVisitors(plan, [{ ...record, region: '충남' }]).status).toBe('missing');
  });
  it('preserves genuine zero and excludes conflicts', () => {
    expect(selectPriorYearVisitors(plan, [{ ...record, value: 0 }]).value).toBe(0);
    expect(selectPriorYearVisitors(plan, [{ ...record, excluded: true }]).status).toBe('missing');
  });
  it('does not arbitrarily resolve multiple sources', () => {
    expect(selectPriorYearVisitors(plan, [record, { ...record, id: 'other', value: 200 }]).status).toBe('ambiguous');
  });
  it('requires valid dates, finite values and a public source', () => {
    expect(selectPriorYearVisitors({ ...plan, startDate: '2025-02-30' }, [record]).status).toBe('invalid');
    expect(selectPriorYearVisitors(plan, [{ ...record, value: NaN }]).status).toBe('missing');
    expect(selectPriorYearVisitors(plan, [{ ...record, sourceUrl: '' }]).status).toBe('missing');
  });
});
