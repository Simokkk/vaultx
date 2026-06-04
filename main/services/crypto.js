'use strict';

/**
 * Servizio crittografico VaultX.
 *
 *  - Key derivation: Argon2id (memory 64MB, t=3, p=4)
 *  - Data encryption: AES-256-GCM (IV 12B, tag 16B)
 *  - Formato stored: base64(IV || AUTH_TAG || CIPHERTEXT)
 *  - Verification hash: SHA-256 della chiave derivata
 *
 * Nota: argon2 è caricato lazy per permettere fallback dev con scrypt
 *       se il modulo nativo non è disponibile. In produzione è richiesto argon2.
 */

const crypto = require('node:crypto');

const AES_ALGO = 'aes-256-gcm';
const AES_KEY_LEN = 32;
const IV_LEN = 12;
const TAG_LEN = 16;
const SALT_LEN = 32;

const ARGON2_PARAMS = {
  type: 2, // argon2id
  memoryCost: 65536, // 64 MB (kibibytes)
  timeCost: 3,
  parallelism: 4,
  hashLength: 32
};

/** @type {typeof import('argon2') | null} */
let argon2 = null;
let argon2Unavailable = false;

/** Carica argon2 una sola volta. */
function loadArgon2() {
  if (argon2 || argon2Unavailable) return argon2;
  try {
    // eslint-disable-next-line global-require
    argon2 = require('argon2');
  } catch (_err) {
    argon2Unavailable = true;
    argon2 = null;
  }
  return argon2;
}

/**
 * Deriva la vault_key dalla master password.
 * @param {string} masterPassword
 * @param {Buffer} salt
 * @returns {Promise<Buffer>} chiave 32 bytes
 */
async function deriveKey(masterPassword, salt) {
  if (typeof masterPassword !== 'string' || masterPassword.length === 0) {
    throw new Error('Master password non valida.');
  }
  if (!Buffer.isBuffer(salt) || salt.length < 16) {
    throw new Error('Salt non valido.');
  }
  const mod = loadArgon2();
  if (mod) {
    const key = await mod.hash(masterPassword, {
      ...ARGON2_PARAMS,
      salt,
      raw: true
    });
    return Buffer.from(key);
  }
  // Fallback: scrypt (solo se argon2 non installato). Parametri forti.
  return new Promise((resolve, reject) => {
    crypto.scrypt(
      masterPassword,
      salt,
      AES_KEY_LEN,
      { N: 1 << 15, r: 8, p: 2, maxmem: 128 * 1024 * 1024 },
      (err, derived) => {
        if (err) reject(err);
        else resolve(derived);
      }
    );
  });
}

/**
 * Genera un salt casuale.
 * @returns {Buffer}
 */
function generateSalt() {
  return crypto.randomBytes(SALT_LEN);
}

/**
 * Hash di verifica della chiave derivata (SHA-256).
 * @param {Buffer} key
 * @returns {string} hex
 */
function verificationHash(key) {
  return crypto.createHash('sha256').update(key).digest('hex');
}

/**
 * Confronto costante-tempo tra stringhe hex.
 * @param {string} a
 * @param {string} b
 */
function constantTimeEqualHex(a, b) {
  try {
    const ba = Buffer.from(a, 'hex');
    const bb = Buffer.from(b, 'hex');
    if (ba.length !== bb.length) return false;
    return crypto.timingSafeEqual(ba, bb);
  } catch (_err) {
    return false;
  }
}

/**
 * Cifra una stringa con AES-256-GCM.
 * @param {string|null|undefined} plaintext
 * @param {Buffer} key
 * @returns {string|null} base64(iv||tag||ct) o null se input nullish
 */
function encrypt(plaintext, key) {
  if (plaintext === null || plaintext === undefined || plaintext === '') return null;
  if (!Buffer.isBuffer(key) || key.length !== AES_KEY_LEN) {
    throw new Error('Chiave AES non valida.');
  }
  const iv = crypto.randomBytes(IV_LEN);
  const cipher = crypto.createCipheriv(AES_ALGO, key, iv);
  const ct = Buffer.concat([cipher.update(String(plaintext), 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, ct]).toString('base64');
}

/**
 * Decifra una stringa AES-256-GCM prodotta da {@link encrypt}.
 * @param {string|null|undefined} payload
 * @param {Buffer} key
 * @returns {string|null}
 */
function decrypt(payload, key) {
  if (payload === null || payload === undefined || payload === '') return null;
  if (!Buffer.isBuffer(key) || key.length !== AES_KEY_LEN) {
    throw new Error('Chiave AES non valida.');
  }
  const buf = Buffer.from(String(payload), 'base64');
  if (buf.length < IV_LEN + TAG_LEN + 1) {
    throw new Error('Payload cifrato corrotto.');
  }
  const iv = buf.subarray(0, IV_LEN);
  const tag = buf.subarray(IV_LEN, IV_LEN + TAG_LEN);
  const ct = buf.subarray(IV_LEN + TAG_LEN);
  const decipher = crypto.createDecipheriv(AES_ALGO, key, iv);
  decipher.setAuthTag(tag);
  const pt = Buffer.concat([decipher.update(ct), decipher.final()]);
  return pt.toString('utf8');
}

/**
 * Azzera un Buffer in memoria.
 * @param {Buffer|null|undefined} buf
 */
function zeroBuffer(buf) {
  if (Buffer.isBuffer(buf)) {
    try {
      buf.fill(0);
    } catch (_err) {
      /* swallow */
    }
  }
}

/**
 * Cifra un oggetto (JSON) con AES-256-GCM e una chiave derivata al volo.
 * Usato per export .vaultx.
 * @param {object} data
 * @param {string} password
 * @returns {Promise<object>}
 */
async function encryptJsonWithPassword(data, password) {
  const salt = generateSalt();
  const key = await deriveKey(password, salt);
  try {
    const payload = encrypt(JSON.stringify(data), key);
    return {
      format: 'vaultx-backup',
      version: 1,
      kdf: 'argon2id',
      argon: ARGON2_PARAMS,
      salt: salt.toString('hex'),
      payload
    };
  } finally {
    zeroBuffer(key);
  }
}

/**
 * Decifra un export .vaultx.
 * @param {object} blob
 * @param {string} password
 * @returns {Promise<object>}
 */
async function decryptJsonWithPassword(blob, password) {
  if (!blob || blob.format !== 'vaultx-backup') {
    throw new Error('Formato backup non riconosciuto.');
  }
  const salt = Buffer.from(blob.salt, 'hex');
  const key = await deriveKey(password, salt);
  try {
    const json = decrypt(blob.payload, key);
    if (!json) throw new Error('Payload backup vuoto.');
    return JSON.parse(json);
  } finally {
    zeroBuffer(key);
  }
}

/**
 * @returns {boolean} true se argon2 nativo è disponibile
 */
function argon2Available() {
  return !!loadArgon2();
}

module.exports = {
  deriveKey,
  generateSalt,
  verificationHash,
  constantTimeEqualHex,
  encrypt,
  decrypt,
  zeroBuffer,
  encryptJsonWithPassword,
  decryptJsonWithPassword,
  argon2Available,
  AES_KEY_LEN,
  SALT_LEN
};
