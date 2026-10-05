const { AppError } = require('./errors');
const cents = value => {
  const result = Math.round(Number(value) * 100);
  if (!Number.isSafeInteger(result)) throw new AppError(400, 'Amount is out of range');
  return result;
};
const dollars = value => value / 100;
const settlement = (rental, mode, now = new Date()) => {
  const start = new Date(rental.startDate).getTime();
  const end = new Date(rental.endDate).getTime();
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) throw new AppError(409, 'Rental dates need repair');
  const total = cents(rental.totalCost);
  const commission = cents(rental.commission);
  if (total <= 0 || commission < 0 || commission > total) throw new AppError(409, 'Rental amounts need repair');
  const fraction = Math.max(0, Math.min(1, (end - now.getTime()) / (end - start)));
  const unused = Math.round(total * fraction);
  const returnedCommission = Math.round(commission * fraction);
  const fee = mode === 'buyer' ? Math.round(unused * 0.10) : 0;
  const penalty = mode === 'seller' ? Math.round(unused * 0.25) : 0;
  const refund = unused - fee;
  // Buyer + seller + platform changes sum to zero, including returned commission.
  const sellerDebit = unused - returnedCommission + penalty;
  return { refund, sellerDebit, returnedCommission, penalty: fee + penalty };
};
module.exports = { cents, dollars, settlement };
