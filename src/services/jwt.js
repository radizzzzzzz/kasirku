/**
 * JWT (JSON Web Token) Helper
 * Implementasi standar struktur JWT: Header.Payload.Signature (Base64Url)
 * Kompatibel dengan React Native, Expo, dan Web.
 */

const JWT_SECRET_DEFAULT = 'kasirku_secret_key_sem5_mobile_2026';

const B64_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';

function safeBtoa(input) {
  if (typeof btoa === 'function') {
    return btoa(input);
  }
  if (typeof Buffer !== 'undefined') {
    return Buffer.from(input, 'binary').toString('base64');
  }
  let str = String(input);
  let output = '';
  for (
    let block = 0, charCode, i = 0, map = B64_CHARS;
    str.charAt(i | 0) || ((map = '='), i % 1);
    output += map.charAt(63 & (block >> (8 - (i % 1) * 8)))
  ) {
    charCode = str.charCodeAt((i += 3 / 4));
    block = (block << 8) | charCode;
  }
  return output;
}

function safeAtob(input) {
  if (typeof atob === 'function') {
    return atob(input);
  }
  if (typeof Buffer !== 'undefined') {
    return Buffer.from(input, 'base64').toString('binary');
  }
  let str = String(input).replace(/[=]+$/, '');
  let output = '';
  for (
    let bc = 0, bs = 0, buffer, idx = 0;
    (buffer = str.charAt(idx++));
    ~buffer && ((bs = bc % 4 ? bs * 64 + buffer : buffer), bc++ % 4)
      ? (output += String.fromCharCode(255 & (bs >> ((-2 * bc) & 6))))
      : 0
  ) {
    buffer = B64_CHARS.indexOf(buffer);
  }
  return output;
}

// Helper Base64Url Encode
export function base64UrlEncode(str) {
  try {
    let utf8Bytes = encodeURIComponent(str).replace(/%([0-9A-F]{2})/g, (match, p1) =>
      String.fromCharCode(parseInt(p1, 16))
    );
    let base64 = safeBtoa(utf8Bytes);
    return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  } catch (e) {
    return '';
  }
}

// Helper Base64Url Decode
export function base64UrlDecode(str) {
  try {
    let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
    while (base64.length % 4) {
      base64 += '=';
    }
    let binary = safeAtob(base64);
    let decoded = decodeURIComponent(
      Array.from(binary)
        .map((char) => '%' + ('00' + char.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return decoded;
  } catch (e) {
    return '{}';
  }
}

// Hash sederhana untuk signature HMAC-simulated
function simpleHash(data, secret) {
  let hash = 0;
  const combined = data + ':' + secret;
  for (let i = 0; i < combined.length; i++) {
    const char = combined.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  const hex = Math.abs(hash).toString(16).padStart(8, '0');
  return base64UrlEncode(`sig_${hex}_kasirku_verified`);
}

/**
 * Generate standard JWT Token
 * @param {Object} payload Data pengguna & claims
 * @param {number} expiresInSeconds Masa aktif token (default 3600 detik = 1 jam)
 * @param {string} secret Kunci rahasia server
 * @returns {string} Token JWT (Header.Payload.Signature)
 */
export function generateJWT(payload, expiresInSeconds = 3600, secret = JWT_SECRET_DEFAULT) {
  const header = {
    alg: 'HS256',
    typ: 'JWT',
  };

  const nowSeconds = Math.floor(Date.now() / 1000);
  const fullPayload = {
    ...payload,
    iat: nowSeconds, // Issued At
    exp: nowSeconds + expiresInSeconds, // Expiration Time
  };

  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(fullPayload));
  const signature = simpleHash(`${encodedHeader}.${encodedPayload}`, secret);

  return `${encodedHeader}.${encodedPayload}.${signature}`;
}

/**
 * Verifikasi keabsahan JWT Token
 * @param {string} token String JWT
 * @param {string} secret Kunci rahasia server
 * @returns {{ valid: boolean, payload?: Object, error?: string }}
 */
export function verifyJWT(token, secret = JWT_SECRET_DEFAULT) {
  if (!token || typeof token !== 'string') {
    return { valid: false, error: 'Token kosong atau tidak valid.' };
  }

  const parts = token.split('.');
  if (parts.length !== 3) {
    return { valid: false, error: 'Format token tidak sesuai standar JWT (harus 3 bagian).' };
  }

  const [encodedHeader, encodedPayload, signature] = parts;

  // Verifikasi Signature
  const expectedSig = simpleHash(`${encodedHeader}.${encodedPayload}`, secret);
  if (signature !== expectedSig) {
    return { valid: false, error: 'Signature token tidak sah / token telah dimanipulasi.' };
  }

  // Parse Payload
  try {
    const payloadStr = base64UrlDecode(encodedPayload);
    const payload = JSON.parse(payloadStr);

    // Cek Expired
    const nowSeconds = Math.floor(Date.now() / 1000);
    if (payload.exp && payload.exp < nowSeconds) {
      return { valid: false, error: 'Token telah kedaluwarsa (Expired). Silakan login kembali.' };
    }

    return { valid: true, payload };
  } catch (err) {
    return { valid: false, error: 'Gagal menguraikan (decode) payload token.' };
  }
}

/**
 * Decode JWT Token tanpa verifikasi (berguna untuk inspeksi UI)
 * @param {string} token
 * @returns {Object|null}
 */
export function decodeJWT(token) {
  if (!token || typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;

  try {
    const header = JSON.parse(base64UrlDecode(parts[0]));
    const payload = JSON.parse(base64UrlDecode(parts[1]));
    return {
      header,
      payload,
      signature: parts[2],
    };
  } catch {
    return null;
  }
}
