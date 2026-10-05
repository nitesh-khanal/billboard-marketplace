const positiveAmount = value => {
  if (!['number', 'string'].includes(typeof value) || (typeof value === 'string' && !value.trim())) return null;
  const number = Number(value);
  if (!Number.isFinite(number) || number <= 0 || number > Number.MAX_SAFE_INTEGER / 100) return null;
  const rounded = Math.round(number * 100) / 100;
  return rounded > 0 ? rounded : null;
};
const validWindow = (start, end) => Number.isFinite(start.getTime()) && Number.isFinite(end.getTime()) && end > start;
module.exports = { positiveAmount, validWindow };
