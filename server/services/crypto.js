const crypto = require('crypto');

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'a'.repeat(32);

function hashDocument(buffer) {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

function encryptFile(buffer, key = ENCRYPTION_KEY) {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(key), iv);
  let encrypted = cipher.update(buffer);
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  return { iv, encrypted };
}

function decryptFile(encryptedBuffer, key = ENCRYPTION_KEY, iv) {
  const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(key), iv);
  let decrypted = decipher.update(encryptedBuffer);
  decrypted = Buffer.concat([decrypted, decipher.final()]);
  return decrypted;
}

function createSignature(data, userSecret) {
  return crypto.createHmac('sha256', userSecret).update(data).digest('hex');
}

function verifySignature(data, signature, userSecret) {
  const expectedSignature = createSignature(data, userSecret);
  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature));
}

module.exports = {
  hashDocument,
  encryptFile,
  decryptFile,
  createSignature,
  verifySignature,
  ENCRYPTION_KEY
};
