import references from '../../data/prior_year_visitor_references.json';

export interface VisitorReference {
  id: string;
  name: string;
  region: string;
  measuredYear: number;
  value: number;
  sourceUrl: string;
  reviewStatus: string;
  excluded: boolean;
}

const regions: Record<string, string> = {
  전라남도: '전남', 전라북도: '전북', 전북특별자치도: '전북', 경상남도: '경남',
  경상북도: '경북', 경기도: '경기', 충청남도: '충남', 충청북도: '충북',
  강원도: '강원', 강원특별자치도: '강원', 제주특별자치도: '제주',
};
function regionKey(value: string) {
  const first = value.trim().split(/\s+/)[0];
  return regions[first] ?? first;
}
function nameKey(value: string) {
  const key = value.normalize('NFC').replace(/20\d{2}년?/g, '').replace(/제\s*\d+\s*회/g, '').replace(/\s+/g, '');
  return key === '순천푸드앤아트페스티벌' ? '푸드앤아트페스티벌' : key;
}

export function selectPriorYearVisitors(
  plan: { name: string; region: string; startDate: string },
  rows: VisitorReference[] = references.records,
): { status: 'reference' | 'missing' | 'ambiguous' | 'invalid'; year?: number; value?: number; record?: VisitorReference; eligibleForAccuracy: false } {
  const timestamp = Date.parse(`${plan.startDate}T00:00:00Z`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(plan.startDate) || !Number.isFinite(timestamp)
    || new Date(timestamp).toISOString().slice(0, 10) !== plan.startDate) return { status: 'invalid', eligibleForAccuracy: false };
  const year = Number(plan.startDate.slice(0, 4)) - 1;
  const matches = rows.filter(row => !row.excluded && row.measuredYear === year
    && nameKey(row.name) === nameKey(plan.name) && regionKey(row.region) === regionKey(plan.region)
    && Number.isFinite(row.value) && row.value >= 0 && /^https:\/\//.test(row.sourceUrl));
  if (matches.length !== 1) return { status: matches.length ? 'ambiguous' : 'missing', year, eligibleForAccuracy: false };
  return { status: 'reference', year, value: matches[0].value, record: matches[0], eligibleForAccuracy: false };
}
