// src/lib/server/crypto.js
import { randomBytes, createCipheriv, createDecipheriv } from 'crypto';
import { env as privateEnv } from '$env/dynamic/private';

const ALGO = 'aes-256-gcm';

export function encryptToken(text) {
  if (!text) return null;
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGO, Buffer.from(privateEnv.ENCRYPTION_KEY, 'hex'), iv);
  const encrypted = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  // Formato: iv:authTag:encryptedData
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted.toString('hex')}`;
}

export function decryptToken(ciphertext) {
  if (!ciphertext || !ciphertext.includes(':')) return ciphertext;
  try {
    const [ivHex, authTagHex, encryptedHex] = ciphertext.split(':');
    const decipher = createDecipheriv(ALGO, Buffer.from(privateEnv.ENCRYPTION_KEY, 'hex'), Buffer.from(ivHex, 'hex'));
    decipher.setAuthTag(Buffer.from(authTagHex, 'hex'));
    return Buffer.concat([decipher.update(Buffer.from(encryptedHex, 'hex')), decipher.final()]).toString('utf-8');
  } catch {
    throw new Error('Fallo al descifrar credencial. Llave comprometida o inválida.');
  }
}
