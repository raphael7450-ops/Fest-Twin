function validDate(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

export function normalizeFestivalSchedule(record) {
  const start = record.startDate;
  const end = record.endDate;
  const sourcePeriodLabel = record.sourcePeriodLabel ?? record.periodLabel ?? "";
  const verified = Boolean(record.correction?.officialStartDate && record.correction?.officialEndDate);
  const precise = validDate(start) && validDate(end) && start <= end;
  const monthOnly = /^\s*(?:\d{4}년\s*)?(\d{1,2})월\s*(?:중|예정)?\s*$/.exec(sourcePeriodLabel);
  // The legacy importer discarded source precision. Do not assert that its first-day placeholders are real dates.
  const legacyPlaceholder = record.dateStatus !== "confirmed" &&
    /지역축제.*\.xlsx$/i.test(record.sourceFile ?? "") && start === end && start?.endsWith("-01");
  const uncertain = !verified && (monthOnly || legacyPlaceholder || record.dateStatus === "needs-review");
  if (precise && !uncertain) {
    return { ...record, dateStatus: verified || record.dateStatus === "confirmed" ? "confirmed" : "reported",
      sourcePeriodLabel, periodLabel: `${start} ~ ${end}`, searchStartDate: start, searchEndDate: end };
  }
  const year = Number(record.year ?? start?.slice(0, 4));
  const month = monthOnly ? Number(monthOnly[1]) : Number(start?.slice(5, 7));
  const searchableMonth = uncertain && year >= 2000 && month >= 1 && month <= 12;
  const monthPrefix = searchableMonth ? `${year}-${String(month).padStart(2, "0")}` : undefined;
  return { ...record, startDate: null, endDate: null, dateStatus: "needs-review", sourcePeriodLabel,
    periodLabel: monthPrefix ? `${monthPrefix} 일정 확인 필요` : "일정 확인 필요",
    searchStartDate: monthPrefix ? `${monthPrefix}-01` : undefined,
    searchEndDate: monthPrefix ? `${monthPrefix}-${new Date(Date.UTC(year, month, 0)).getUTCDate()}` : undefined };
}
