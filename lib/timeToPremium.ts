export function timeToPremium(fromDate?: Date | null, premiumDate?: Date | null) {
  if (!fromDate || !premiumDate) return '—';

  let diff = premiumDate.getTime() - fromDate.getTime();
  if (diff < 0) diff = 0;

  const dayMs = 1000 * 60 * 60 * 24;
  const yearDays = 365;
  const monthDays = 30;

  const totalDays = Math.floor(diff / dayMs);

  const years = Math.floor(totalDays / yearDays);
  const remainingAfterYears = totalDays % yearDays;
  const months = Math.floor(remainingAfterYears / monthDays);
  const days = remainingAfterYears % monthDays;

  return `${years} year ${months} month ${days} days`;
}
