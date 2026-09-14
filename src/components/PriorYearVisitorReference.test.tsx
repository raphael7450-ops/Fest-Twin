import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, expect, it } from 'vitest';
import { PriorYearVisitorReference } from './PriorYearVisitorReference';
afterEach(cleanup);
it('labels last-year attendance as an unverified reference, not current actuals', () => {
  render(<PriorYearVisitorReference plan={{ name: '2025 푸드앤아트페스티벌', region: '전라남도', startDate: '2025-10-01' }} />);
  expect(screen.getByText('370,000명')).toBeInTheDocument();
  expect(screen.getByText(/2024년 집계/)).toBeInTheDocument();
  expect(screen.getByText(/올해 실측값이 아닌 참고 기준값/)).toBeInTheDocument();
  expect(screen.getByRole('link', { name: '전년도 수치 출처' })).toHaveAttribute('href', 'https://www.data.go.kr/data/15150652/fileData.do');
});
it('does not substitute 2024 attendance when the target year requires 2025', () => {
  render(<PriorYearVisitorReference plan={{ name: '푸드앤아트페스티벌', region: '전남', startDate: '2026-10-01' }} />);
  expect(screen.getByText(/직전 연도 방문객 수를 확인할 수 없습니다/)).toBeInTheDocument();
  expect(screen.queryByText('370,000명')).not.toBeInTheDocument();
});
