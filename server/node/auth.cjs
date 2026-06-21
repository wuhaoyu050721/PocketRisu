/**
 * 小酒馆 — Authentication utilities.
 * Password hashing via Node.js built-in crypto.scryptSync (no native deps).
 * JWT creation/verification with user identity.
 */

const nodeCrypto = require('crypto');

const SCRYPT_KEYLEN = 64;
const SCRYPT_COST = 16384;
const SCRYPT_BLOCK_SIZE = 8;
const SCRYPT_SALT_SIZE = 32;

/**
 * Hash a plaintext password. Returns "salt:hash" as hex.
 */
function hashPassword(plaintext) {
    const salt = nodeCrypto.randomBytes(SCRYPT_SALT_SIZE);
    const hash = nodeCrypto.scryptSync(plaintext, salt, SCRYPT_KEYLEN, {
        N: SCRYPT_COST,
        r: SCRYPT_BLOCK_SIZE,
        p: 1,
    });
    return salt.toString('hex') + ':' + hash.toString('hex');
}

/**
 * Verify a plaintext password against a stored "salt:hash" string.
 */
function verifyPassword(plaintext, stored) {
    const colonIdx = stored.indexOf(':');
    if (colonIdx === -1) return false;
    const salt = Buffer.from(stored.substring(0, colonIdx), 'hex');
    const expectedHash = stored.substring(colonIdx + 1);
    const actualHash = nodeCrypto.scryptSync(plaintext, salt, SCRYPT_KEYLEN, {
        N: SCRYPT_COST,
        r: SCRYPT_BLOCK_SIZE,
        p: 1,
    });
    try {
        return nodeCrypto.timingSafeEqual(Buffer.from(expectedHash, 'hex'), actualHash);
    } catch {
        return false;
    }
}

/**
 * Create a JWT with user identity embedded.
 * Uses the same HMAC-SHA256 algorithm as the existing server JWT.
 */
function createUserJwt(userId, username, jwtSecret) {
    const header = { alg: 'HS256', typ: 'JWT' };
    const now = Math.floor(Date.now() / 1000);
    const payload = {
        iat: now,
        exp: now + 7 * 24 * 60 * 60, // 7 days
        sub: String(userId),
        username: username,
    };

    const headerB64 = Buffer.from(JSON.stringify(header)).toString('base64url');
    const payloadB64 = Buffer.from(JSON.stringify(payload)).toString('base64url');
    const signingInput = headerB64 + '.' + payloadB64;
    const signature = nodeCrypto.createHmac('sha256', jwtSecret).update(signingInput).digest('base64url');

    return headerB64 + '.' + payloadB64 + '.' + signature;
}

module.exports = { hashPassword, verifyPassword, createUserJwt };
