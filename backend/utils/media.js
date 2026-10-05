const fs = require('fs');
async function matchesMediaHeader(file) {
  const handle = await fs.promises.open(file.path, 'r');
  const buffer = Buffer.alloc(32);
  let size;
  try { size = (await handle.read(buffer, 0, 32, 0)).bytesRead; }
  finally { await handle.close(); }
  const bytes = buffer.subarray(0, size);
  const starts = signature => bytes.length >= signature.length && bytes.subarray(0, signature.length).equals(Buffer.from(signature));
  switch (file.mimetype) {
    case 'image/jpeg': return starts([0xff, 0xd8, 0xff]);
    case 'image/png': return starts([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    case 'image/gif': return bytes.toString('ascii', 0, 6) === 'GIF87a' || bytes.toString('ascii', 0, 6) === 'GIF89a';
    case 'image/webp': return size >= 12 && bytes.toString('ascii', 0, 4) === 'RIFF' && bytes.toString('ascii', 8, 12) === 'WEBP';
    case 'video/mp4': return size >= 12 && bytes.toString('ascii', 4, 8) === 'ftyp';
    case 'video/webm': return starts([0x1a, 0x45, 0xdf, 0xa3]);
    default: return false;
  }
}
module.exports = { matchesMediaHeader };
