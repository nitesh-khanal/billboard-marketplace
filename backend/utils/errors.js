class AppError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}
const sendError = (res, err) => {
  if (err.status) return res.status(err.status).json({ msg: err.message });
  if (err.name === 'CastError' || err.name === 'ValidationError') return res.status(400).json({ msg: 'Invalid request fields' });
  console.error(err);
  return res.status(500).json({ msg: 'Unable to complete request. No partial payment was made.' });
};
module.exports = { AppError, sendError };
