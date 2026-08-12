export function formatDurationSecondsKorean(value: number): string {
  const totalSeconds = Math.max(0, Math.round(Number.isFinite(value) ? value : 0));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return minutes > 0 ? `${minutes}분 ${seconds}초` : `${seconds}초`;
}
