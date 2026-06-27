'use strict';

const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
const { AsyncLocalStorage } = require('async_hooks');
const { createChunkStore } = require('./chunkStore.cjs');

// ─── Multi-user: AsyncLocalStorage for per-user key prefixing ─────────────────
const userAls = new AsyncLocalStorage();

const SHARED_KEY_PREFIXES = [
    'config/',
    'migration/',
    'migration-backup/',
];

function isSharedKey(key) {
    return SHARED_KEY_PREFIXES.some(p => key.startsWith(p));
}

function getEffectiveKey(key) {
    const store = userAls.getStore();
    const userId = store?.userId;
    if (userId && userId !== 'default' && !isSharedKey(key)) {
        return `user:${userId}:${key}`;
    }
    return key;
}

const saveDir = path.join(process.cwd(), 'save');
if (!fs.existsSync(saveDir)) {
    fs.mkdirSync(saveDir, { recursive: true });
}
const dbPath = path.join(saveDir, 'risuai.db');
const db = new Database(dbPath);

db.pragma('journal_mode = WAL');
db.pragma('synchronous = NORMAL');
db.pragma('cache_size = -64000');
db.pragma('temp_store = MEMORY');
db.pragma('busy_timeout = 5000');
db.pragma('mmap_size = 268435456');
db.pragma('journal_size_limit = 268435456');

// ─── KV table ────────────────────────────────────────────────────
db.exec(`
  CREATE TABLE IF NOT EXISTS kv (
    key        TEXT    PRIMARY KEY,
    value      BLOB    NOT NULL,
    updated_at INTEGER NOT NULL DEFAULT (CAST(strftime('%s','now') AS INTEGER) * 1000)
  )
`);

// ─── Migration: /save/ hex files → kv table ──────────────────────
const savePath = path.join(process.cwd(), 'save');
const migrationMarker = path.join(process.cwd(), 'save', '.migrated_to_sqlite');

function migrateFromSaveDir() {
    if (!fs.existsSync(savePath)) return;
    if (fs.existsSync(migrationMarker)) return;

    const hexRegex = /^[0-9a-fA-F]+$/;
    let files;
    try { files = fs.readdirSync(savePath); } catch { return; }

    const hexFiles = files.filter(f => hexRegex.test(f));
    if (hexFiles.length === 0) return;

    console.log(`[DB] Migrating ${hexFiles.length} file(s) from /save/ to SQLite...`);

    const insert = db.prepare(
        `INSERT OR IGNORE INTO kv (key, value, updated_at) VALUES (?, ?, ?)`
    );
    const now = Date.now();

    const run = db.transaction(() => {
        for (let i = 0; i < hexFiles.length; i++) {
            if (i % 100 === 0 || i === hexFiles.length - 1) {
                console.log(`[DB] Migrating... ${i + 1}/${hexFiles.length}`);
            }
            const key = Buffer.from(hexFiles[i], 'hex').toString('utf-8');
            const value = fs.readFileSync(path.join(savePath, hexFiles[i]));
            if (key === DB_BLOB_KEY) chunkStore.putValue(key, value);
            else insert.run(key, value, now);
        }
    });
    run();

    fs.writeFileSync(migrationMarker, new Date().toISOString(), 'utf-8');
    console.log(`[DB] Migration complete. ${hexFiles.length} files preserved in /save/.`);
}

// ─── Chunk-aware store (SQLite, stays sync) ──────────────────────
const DB_BLOB_KEY = 'database/database.bin';
const CHUNKED_KEY_PREFIXES = ['database/database.bin', 'database/dbbackup-'];

function isChunkedKey(key) {
    return CHUNKED_KEY_PREFIXES.some(p => key === p || key.endsWith(':' + p));
}

const chunkThreshold = process.env.XIAOXIANGUAN_CHUNK_THRESHOLD
    ? Number(process.env.XIAOXIANGUAN_CHUNK_THRESHOLD)
    : undefined;
const chunkStore = createChunkStore(db, { threshold: chunkThreshold });

migrateFromSaveDir();

// ─── SQLite statements (for chunked keys + legacy operations) ────
const stmtKvSet    = db.prepare(`INSERT OR REPLACE INTO kv (key, value, updated_at) VALUES (?, ?, ?)`);
const stmtKvDel    = db.prepare(`DELETE FROM kv WHERE key = ?`);
const stmtKvList   = db.prepare(`SELECT key FROM kv`);
const stmtKvPrefix = db.prepare(`SELECT key FROM kv WHERE key LIKE ? ESCAPE '\\'`);
const stmtKvPrefixSizes = db.prepare(`SELECT key, LENGTH(value) as size FROM kv WHERE key LIKE ? ESCAPE '\\'`);
const stmtKvDelPrefix = db.prepare(`DELETE FROM kv WHERE key LIKE ? ESCAPE '\\'`);
const stmtKvUpdatedAt = db.prepare(`SELECT updated_at FROM kv WHERE key = ?`);

// ─── MySQL helpers (lazy, pool must be ready before first call) ──
let _mysqlPool = null;
function getMysqlPool() {
    if (_mysqlPool) return _mysqlPool;
    try {
        const { getPool } = require('./mysql.cjs');
        _mysqlPool = getPool();
    } catch {}
    return _mysqlPool;
}

function _mysqlEnabled() {
    const pool = getMysqlPool();
    if (!pool) return false;
    try { const { isMysqlEnabled } = require('./mysql.cjs'); return isMysqlEnabled(); }
    catch { return false; }
}

async function kvGetMysql(key) {
    const pool = getMysqlPool();
    if (!pool) return null;
    const [rows] = await pool.execute('SELECT value FROM kv_store WHERE `key` = ?', [key]);
    return rows.length ? rows[0].value : null;
}

async function kvSetMysql(key, value) {
    const pool = getMysqlPool();
    await pool.execute(
        'INSERT INTO kv_store (`key`, value, updated_at) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE value = VALUES(value), updated_at = VALUES(updated_at)',
        [key, value, Date.now()]
    );
}

async function kvDelMysql(key) {
    const pool = getMysqlPool();
    await pool.execute('DELETE FROM kv_store WHERE `key` = ?', [key]);
}

async function kvListMysql(prefix) {
    const pool = getMysqlPool();
    if (prefix) {
        const escaped = prefix.replace(/[\\%_]/g, '\\$&');
        const [rows] = await pool.execute('SELECT `key` FROM kv_store WHERE `key` LIKE ?', [`${escaped}%`]);
        return rows.map(r => r.key);
    }
    const store = userAls.getStore();
    const userId = store?.userId;
    if (userId && userId !== 'default') {
        const [rows] = await pool.execute('SELECT `key` FROM kv_store WHERE `key` LIKE ?', [`user:${userId}:%`]);
        return rows.map(r => r.key);
    }
    const [rows] = await pool.execute('SELECT `key` FROM kv_store');
    return rows.map(r => r.key);
}

async function kvListWithSizesMysql(prefix) {
    const pool = getMysqlPool();
    const escaped = prefix.replace(/[\\%_]/g, '\\$&');
    const [rows] = await pool.execute(
        'SELECT `key`, LENGTH(value) as size FROM kv_store WHERE `key` LIKE ?',
        [`${escaped}%`]
    );
    return rows.map(r => ({ key: r.key, size: r.size }));
}

async function kvDelPrefixMysql(prefix) {
    const pool = getMysqlPool();
    const escaped = prefix.replace(/[\\%_]/g, '\\$&');
    await pool.execute('DELETE FROM kv_store WHERE `key` LIKE ?', [`${escaped}%`]);
}

async function kvGetUpdatedAtMysql(key) {
    const pool = getMysqlPool();
    const [rows] = await pool.execute('SELECT updated_at FROM kv_store WHERE `key` = ?', [key]);
    return rows.length ? rows[0].updated_at : null;
}

// ─── Route: ALL keys → MySQL when enabled ──
// Previously chunked keys (database/database.bin, dbbackup-*) and shared keys
// (config/*, migration/*) were kept in SQLite. Now everything lives in MySQL
// kv_store for unified management. SQLite paths remain as fallback for
// single-user mode (MYSQL_ENABLED=false).

function _useMysql(key) {
    return _mysqlEnabled();
}

async function kvGet(key) {
    const effectiveKey = getEffectiveKey(key);
    if (_useMysql(effectiveKey)) return kvGetMysql(effectiveKey);
    return chunkStore.getValue(effectiveKey);
}

async function kvSet(key, value) {
    const effectiveKey = getEffectiveKey(key);
    if (_useMysql(effectiveKey)) return kvSetMysql(effectiveKey, value);
    if (effectiveKey === DB_BLOB_KEY || effectiveKey.endsWith(':' + DB_BLOB_KEY)) {
        chunkStore.putValue(effectiveKey, value);
    } else {
        stmtKvSet.run(effectiveKey, value, Date.now());
    }
}

async function kvDel(key) {
    const effectiveKey = getEffectiveKey(key);
    if (_useMysql(effectiveKey)) return kvDelMysql(effectiveKey);
    chunkStore.dropValue(effectiveKey);
}

async function kvSize(key) {
    const effectiveKey = getEffectiveKey(key);
    if (_useMysql(effectiveKey)) {
        const pool = getMysqlPool();
        const [rows] = await pool.execute('SELECT LENGTH(value) as size FROM kv_store WHERE `key` = ?', [effectiveKey]);
        return rows.length ? rows[0].size : 0;
    }
    return chunkStore.sizeValue(effectiveKey);
}

async function kvGetUpdatedAt(key) {
    const effectiveKey = getEffectiveKey(key);
    if (_useMysql(effectiveKey)) return kvGetUpdatedAtMysql(effectiveKey);
    const row = stmtKvUpdatedAt.get(effectiveKey);
    return row ? row.updated_at : null;
}

async function kvCopyValue(srcKey, dstKey) {
    const effectiveSrc = getEffectiveKey(srcKey);
    const effectiveDst = getEffectiveKey(dstKey);
    if (_useMysql(effectiveSrc) || _useMysql(effectiveDst)) {
        const pool = getMysqlPool();
        const conn = await pool.getConnection();
        try {
            await conn.beginTransaction();
            const [rows] = await conn.execute('SELECT value FROM kv_store WHERE `key` = ?', [effectiveSrc]);
            if (rows.length) {
                await conn.execute(
                    'INSERT INTO kv_store (`key`, value, updated_at) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE value = VALUES(value), updated_at = VALUES(updated_at)',
                    [effectiveDst, rows[0].value, Date.now()]
                );
            }
            await conn.commit();
        } catch (e) { await conn.rollback(); throw e; }
        finally { conn.release(); }
        return;
    }
    chunkStore.snapshotValue(effectiveSrc, effectiveDst);
}

async function kvDelPrefix(prefix) {
    const effectivePrefix = getEffectiveKey(prefix);
    if (_useMysql(effectivePrefix)) return kvDelPrefixMysql(effectivePrefix);
    const escaped = effectivePrefix.replace(/[\\%_]/g, '\\$&');
    stmtKvDelPrefix.run(`${escaped}%`);
}

async function kvList(prefix) {
    if (_mysqlEnabled()) {
        const effectivePrefix = prefix ? getEffectiveKey(prefix) : null;
        return kvListMysql(effectivePrefix);
    }
    if (prefix) {
        const effectivePrefix = getEffectiveKey(prefix);
        const escaped = effectivePrefix.replace(/[\\%_]/g, '\\$&');
        return stmtKvPrefix.all(`${escaped}%`).map(r => r.key);
    }
    const store = userAls.getStore();
    const userId = store?.userId;
    if (userId && userId !== 'default') {
        const userScope = `user:${userId}:`;
        const escaped = userScope.replace(/[\\%_]/g, '\\$&');
        return stmtKvPrefix.all(`${escaped}%`).map(r => r.key);
    }
    return stmtKvList.all().map(r => r.key);
}

async function kvListWithSizes(prefix) {
    if (_mysqlEnabled()) {
        return kvListWithSizesMysql(getEffectiveKey(prefix));
    }
    const effectivePrefix = getEffectiveKey(prefix);
    const escaped = effectivePrefix.replace(/[\\%_]/g, '\\$&');
    return stmtKvPrefixSizes.all(`${escaped}%`).map(r => ({ key: r.key, size: r.size }));
}

function checkpointWal(mode = 'TRUNCATE') {
    return db.pragma(`wal_checkpoint(${mode})`);
}

function gcChunks() {
    if (_mysqlEnabled()) return { chunks: 0, bytes: 0 };
    return chunkStore.gc();
}
function reclaimableChunkBytes() {
    if (_mysqlEnabled()) return 0;
    return chunkStore.reclaimableBytes();
}

function isDbBlobChunked() {
    if (_mysqlEnabled()) return false;
    return chunkStore.isChunkedKey(getEffectiveKey(DB_BLOB_KEY));
}

// Snapshot marginal disk cost. In SQLite/chunkStore mode, snapshots share
// chunks with the live blob — only unique chunks count. In MySQL mode each
// snapshot is a full independent copy, so the marginal cost equals its
// logical size.
async function snapshotFootprint(key) {
    if (_mysqlEnabled()) return (await kvSize(key)) || 0;
    return chunkStore.snapshotCost(getEffectiveKey(key), getEffectiveKey(DB_BLOB_KEY));
}

function clearEntities() {
    try {
        db.exec(`DELETE FROM characters; DELETE FROM chats; DELETE FROM settings; DELETE FROM presets; DELETE FROM modules`);
    } catch {}
}

// ─── Multi-user data migration (v1) ──────────────────────────────
function migrateToMultiUserIfNeeded() {
    const marker = 'migration/v1-multi-user';
    if (kvGetSync(marker) !== null) return; // use sync version at startup

    const allKeys = stmtKvList.all().map(r => r.key);
    const perUserKeys = allKeys.filter(k => !isSharedKey(k));
    const userId = '1';

    if (perUserKeys.length > 0) {
        console.log(`[Migration v1] Moving ${perUserKeys.length} key(s) to user:${userId}: namespace...`);
        const run = db.transaction(() => {
            for (const key of perUserKeys) {
                const value = chunkStore.getValue(key);
                const effectiveKey = `user:${userId}:${key}`;
                if (key === DB_BLOB_KEY || key.startsWith('database/dbbackup-')) {
                    chunkStore.putValue(effectiveKey, value);
                } else {
                    stmtKvSet.run(effectiveKey, value, Date.now());
                }
                stmtKvDel.run(key);
            }
            try { db.exec(`UPDATE manifest_chunks SET manifest_key = 'user:${userId}:' || manifest_key WHERE manifest_key NOT LIKE 'user:%:%'`); } catch {}
            stmtKvSet.run(marker, Buffer.from(JSON.stringify({
                migratedAt: Date.now(), migratedToUserId: parseInt(userId), keyCount: perUserKeys.length,
            })), Date.now());
        });
        run();
        console.log(`[Migration v1] Complete. ${perUserKeys.length} key(s) migrated to user:${userId}.`);
    } else {
        console.log('[Migration v1] No per-user data to migrate — marking done.');
        stmtKvSet.run(marker, Buffer.from(JSON.stringify({
            migratedAt: Date.now(), migratedToUserId: 1, keyCount: 0,
        })), Date.now());
    }
}

// Sync version for startup (before MySQL pool is used by async path)
function kvGetSync(key) {
    return chunkStore.getValue(getEffectiveKey(key));
}

// ─── MySQL migration (v2): SQLite non-chunked keys → MySQL ───────
async function migrateKvToMysql() {
    if (!_mysqlEnabled()) { console.log('[Migration v2] MySQL not enabled — skipping'); return; }
    const marker = 'migration/v2-kv-to-mysql';
    try {
        const existing = await kvGetMysql(marker);
        if (existing !== null) { console.log('[Migration v2] Already migrated'); return; }
    } catch (e) { console.error('[Migration v2] MySQL check failed:', e.message); return; }

    const allKeys = stmtKvList.all().map(r => r.key);
    const toMigrate = allKeys.filter(k => !isChunkedKey(k) && !isSharedKey(k));

    if (toMigrate.length === 0) {
        console.log('[Migration v2] No non-chunked keys to migrate');
        await kvSetMysql(marker, Buffer.from(JSON.stringify({ migratedAt: Date.now(), keyCount: 0 })));
        return;
    }

    console.log(`[Migration v2] Moving ${toMigrate.length} keys from SQLite to MySQL...`);
    const pool = getMysqlPool();
    const BATCH = 100;
    for (let i = 0; i < toMigrate.length; i += BATCH) {
        const batch = toMigrate.slice(i, i + BATCH);
        const conn = await pool.getConnection();
        try {
            await conn.beginTransaction();
            for (const key of batch) {
                const value = chunkStore.getValue(key); // raw bytes, not chunked
                await conn.execute(
                    'INSERT INTO kv_store (`key`, value, updated_at) VALUES (?, ?, ?)',
                    [key, value, Date.now()]
                );
                stmtKvDel.run(key);
            }
            await conn.commit();
        } catch (e) {
            await conn.rollback();
            console.error(`[Migration v2] Batch ${i}-${i + batch.length} failed:`, e.message);
            throw e;
        } finally { conn.release(); }
        console.log(`[Migration v2] ...${Math.min(i + BATCH, toMigrate.length)}/${toMigrate.length}`);
    }

    await kvSetMysql(marker, Buffer.from(JSON.stringify({
        migratedAt: Date.now(), keyCount: toMigrate.length,
    })));
    console.log(`[Migration v2] Complete. ${toMigrate.length} keys now in MySQL.`);
}

// ─── MySQL migration (v3): chunked + shared keys → MySQL ──────────
// After v2 moved per-user non-chunked keys, this moves the remaining:
//   - chunked keys (database/database.bin, dbbackup-*) — reassembled from chunks
//   - shared keys (config/*, migration/*, migration-backup/*)
// All land in MySQL kv_store so 100% of user data is in one place.
async function migrateChunkedAndSharedToMysql() {
    if (!_mysqlEnabled()) { console.log('[Migration v3] MySQL not enabled — skipping'); return; }
    const marker = 'migration/v3-all-to-mysql';
    try {
        const existing = await kvGetMysql(marker);
        if (existing !== null) { console.log('[Migration v3] Already migrated'); return; }
    } catch (e) { console.error('[Migration v3] MySQL check failed:', e.message); return; }

    // Collect: chunked keys (from manifest) + shared keys (from SQLite kv)
    const sqliteKeys = stmtKvList.all().map(r => r.key);
    const chunkedKeys = sqliteKeys.filter(k => isChunkedKey(k));
    const sharedKeys = sqliteKeys.filter(k => isSharedKey(k) && !isChunkedKey(k));
    const toMigrate = [...chunkedKeys, ...sharedKeys];

    if (toMigrate.length === 0) {
        console.log('[Migration v3] No chunked/shared keys to migrate');
        await kvSetMysql(marker, Buffer.from(JSON.stringify({ migratedAt: Date.now(), keyCount: 0 })));
        return;
    }

    console.log(`[Migration v3] Moving ${chunkedKeys.length} chunked + ${sharedKeys.length} shared keys from SQLite to MySQL...`);
    const pool = getMysqlPool();
    let moved = 0;
    const BATCH = 50; // smaller batches — chunked keys can be large
    for (let i = 0; i < toMigrate.length; i += BATCH) {
        const batch = toMigrate.slice(i, i + BATCH);
        const conn = await pool.getConnection();
        try {
            await conn.beginTransaction();
            for (const key of batch) {
                // chunkStore.getValue reassembles chunked values transparently;
                // for non-chunked keys it just reads the raw kv row
                const value = chunkStore.getValue(key);
                if (value === null) continue;
                await conn.execute(
                    'INSERT INTO kv_store (`key`, value, updated_at) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE value = VALUES(value), updated_at = VALUES(updated_at)',
                    [key, value, Date.now()]
                );
                // Remove from SQLite: drop chunks → manifest → kv marker
                chunkStore.dropValue(key);
                moved++;
            }
            await conn.commit();
        } catch (e) {
            await conn.rollback();
            console.error(`[Migration v3] Batch ${i}-${i + batch.length} failed:`, e.message);
            throw e;
        } finally { conn.release(); }
        console.log(`[Migration v3] ...${Math.min(i + BATCH, toMigrate.length)}/${toMigrate.length}`);
    }

    await kvSetMysql(marker, Buffer.from(JSON.stringify({
        migratedAt: Date.now(), keyCount: moved, chunkedKeys: chunkedKeys.length, sharedKeys: sharedKeys.length,
    })));
    console.log(`[Migration v3] Complete. ${moved} keys now in MySQL (${chunkedKeys.length} chunked, ${sharedKeys.length} shared).`);
}

module.exports = {
    db,
    userAls,
    // KV (all async now)
    kvGet, kvSet, kvDel, kvList, kvDelPrefix, kvListWithSizes, kvSize, kvGetUpdatedAt, kvCopyValue,
    clearEntities, checkpointWal, gcChunks, reclaimableChunkBytes, isDbBlobChunked, snapshotFootprint,
    // Multi-user
    migrateToMultiUserIfNeeded,
    migrateKvToMysql,
    migrateChunkedAndSharedToMysql,
    isSharedKey,
    isChunkedKey,
    DB_BLOB_KEY,
};
