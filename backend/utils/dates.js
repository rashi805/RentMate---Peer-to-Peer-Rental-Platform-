export function rentalDays(start, end) {
  return Math.max(1, Math.ceil((new Date(end) - new Date(start)) / 86400000));
}

export function overlaps(start, end) {
  return { startDate: { $lt: end }, endDate: { $gt: start } };
}
