'use strict';

/**
 * TOTP (RFC 6238) con HMAC-SHA1, 6 digit, step 30s.
 * Compatibile con Google Authenticator / Authy.
 */

const crypto = require('node:crypto');

/** Base32 decode (RFC 4648). @param {string} s @returns {Buffer} */
function base32Decode(s) {
  const clean = String(s).toUpperCase().replace(/=+$/, '').replace(/\s+/g, '');
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  let bits = 0;
  let value = 0;
  const out = [];
  for (const ch of clean) {
    const idx = alphabet.indexOf(ch);
    if (idx === -1) throw new Error('Secret TOTP non valido (base32).');
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      bits -= 8;
      out.push((value >>> bits) & 0xff);
    }
  }
  return Buffer.from(out);
}

/**
 * Genera un codice TOTP corrente.
 * @param {string} secret base32
 * @param {object} [opts]
 * @param {number} [opts.digits=6]
 * @param {number} [opts.step=30]
 * @param {number} [opts.timestamp] override per test (ms)
 * @returns {{code:string, remaining:number, step:number}}
 */
function compute(secret, opts = {}) {
  const digits = opts.digits || 6;
  const step = opts.step || 30;
  const now = Math.floor((opts.timestamp || Date.now()) / 1000);
  const counter = Math.floor(now / step);
  const remaining = step - (now % step);

  const key = base32Decode(secret);
  const buf = Buffer.alloc(8);
  buf.writeUInt32BE(Math.floor(counter / 0x100000000), 0);
  buf.writeUInt32BE(counter & 0xffffffff, 4);

  const hmac = crypto.createHmac('sha1', key).update(buf).digest();
  const offset = hmac[hmac.length - 1] & 0x0f;
  const binary =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff);
  const code = String(binary % 10 ** digits).padStart(digits, '0');
  return { code, remaining, step };
}

module.exports = { compute };
