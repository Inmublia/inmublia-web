// src/lib/server/crypto.js
import { env as privateEnv } from '$env/dynamic/private';

// Helpers nativos para Cloudflare Workers (Web Crypto API)
const hexToUint8Array = (hex) => {
  if (!hex) return new Uint8Array(0);
  const bytes = new Uint8Array(Math.ceil(hex.length / 2));
  for (let i = 0; i < bytes.length; i++) bytes[i] = parseInt(hex.substring(i * 2, i * 2 + 2), 16);
  return bytes;
};

const uint8ArrayToHex = (bytes) => {
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
};

async function getEncryptionKey() {
  if (!privateEnv.ENCRYPTION_KEY) throw new Error('ENCRYPTION_KEY no configurada en las variables de entorno.');
  const keyBuf = hexToUint8Array(privateEnv.ENCRYPTION_KEY);
  return await crypto.subtle.importKey('raw', keyBuf, 'AES-GCM', false, ['encrypt', 'decrypt']);
}

export async function encryptToken(text) {
  if (!text) return null;
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await getEncryptionKey();
  
  const encodedText = new TextEncoder().encode(text);
  const encryptedBuf = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, encodedText);
  
  // Guardamos IV + Ciphertext (el auth tag ya viene incluido al final del buffer por defecto en AES-GCM)
  return `${uint8ArrayToHex(iv)}:${uint8ArrayToHex(new Uint8Array(encryptedBuf))}`;
}

export async function decryptToken(ciphertext) {
  if (!ciphertext || !ciphertext.includes(':')) return ciphertext;
  try {
    const [ivHex, dataHex] = ciphertext.split(':');
    const iv = hexToUint8Array(ivHex);
    const data = hexToUint8Array(dataHex);
    const key = await getEncryptionKey();
    
    const decryptedBuf = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, data);
    return new TextDecoder().decode(decryptedBuf);
  } catch (err) {
    throw new Error('Fallo al descifrar credencial. Llave AES-256-GCM comprometida o inválida.');
  }
}

// Función auxiliar para generar Hashes SHA-256 nativos (Usado en el motor de sincronización)
export async function generarHashSha256(payloadObj) {
  const buffer = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(JSON.stringify(payloadObj)));
  return uint8ArrayToHex(new Uint8Array(buffer));
}
