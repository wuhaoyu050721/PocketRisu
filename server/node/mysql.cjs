/**
 * 小酒馆 — MySQL connection pool and schema management.
 * Activated by default. Set MYSQL_ENABLED=false to force single-user mode.
 */

const mysql = require('mysql2/promise');

let pool = null;

const MYSQL_CONFIG = {
    host: process.env.MYSQL_HOST || '127.0.0.1',
    port: parseInt(process.env.MYSQL_PORT || '3306', 10),
    user: process.env.MYSQL_USER || 'root',
    password: process.env.MYSQL_PASSWORD || '',
    database: process.env.MYSQL_DATABASE || 'xiaoxianguan',
    waitForConnections: true,
    connectionLimit: 10,
    charset: 'utf8mb4',
};

const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(64) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS characters (
    id VARCHAR(36) PRIMARY KEY,
    user_id INT NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    personality TEXT,
    scenario TEXT,
    first_message TEXT,
    system_prompt TEXT,
    creator_notes TEXT,
    example_message TEXT,
    card_data JSON NOT NULL,
    image_hash VARCHAR(64),
    creator VARCHAR(255),
    character_version VARCHAR(64),
    tags JSON,
    is_utility BOOLEAN DEFAULT FALSE,
    sort_order INT DEFAULT 0,
    is_trashed BOOLEAN DEFAULT FALSE,
    trash_time BIGINT NULL,
    created_at BIGINT NOT NULL,
    updated_at BIGINT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_id (user_id),
    INDEX idx_user_name (user_id, name),
    INDEX idx_user_trash (user_id, is_trashed, trash_time)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS user_settings (
    user_id INT PRIMARY KEY,
    preferences JSON NOT NULL,
    presets JSON NOT NULL,
    plugins JSON NOT NULL,
    modules JSON NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS character_assets (
    id VARCHAR(64) PRIMARY KEY,
    user_id INT NOT NULL,
    character_id VARCHAR(36) NOT NULL,
    asset_type ENUM('icon', 'emotion', 'background', 'additional', 'voice') NOT NULL,
    mime_type VARCHAR(64) NOT NULL,
    data MEDIUMBLOB NOT NULL,
    filename VARCHAR(255),
    file_size INT UNSIGNED,
    created_at BIGINT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_char_assets (character_id, asset_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
`;

async function initMysqlPool() {
    if (pool) return pool;
    pool = mysql.createPool(MYSQL_CONFIG);
    // Run schema
    const statements = SCHEMA_SQL.split(';').filter(s => s.trim());
    for (const stmt of statements) {
        await pool.execute(stmt);
    }
    console.log('[MySQL] Connection pool created, schema ensured.');
    return pool;
}

function getPool() {
    return pool;
}

async function closePool() {
    if (pool) {
        await pool.end();
        pool = null;
        console.log('[MySQL] Connection pool closed.');
    }
}

function isMysqlEnabled() {
    return process.env.MYSQL_ENABLED !== 'false' && pool !== null;
}

module.exports = { initMysqlPool, getPool, closePool, isMysqlEnabled };
