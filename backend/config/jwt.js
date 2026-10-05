const secret = process.env.JWT_SECRET;
if (!secret || secret.length < 32) {
  throw new Error('Set JWT_SECRET to a random secret of at least 32 characters');
}
module.exports = secret;
