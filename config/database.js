const { Pool } = require('pg');

// ─── CONNEXION POSTGRESQL ─────────────────────────────────────────
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:password@localhost:5432/ojada_bank',
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

pool.on('error', (err) => {
  console.error('❌ Erreur connexion PostgreSQL:', err.message);
});

// ─── WRAPPER API IDENTIQUE À SQLITE ──────────────────────────────
// Même API (db.run / db.get / db.all / db.exec) pour zéro changement
// dans les controllers
const db = {

  // Exécuter SQL sans retour (INSERT, UPDATE, DELETE)
  run: async (sql, params = []) => {
    const converted = convertPlaceholders(sql);
    const res = await pool.query(converted, params);
    // PostgreSQL retourne l'ID dans res.rows[0].id si RETURNING id est utilisé
    const lastId = res.rows[0]?.id || null;
    return { lastInsertRowid: lastId, changes: res.rowCount };
  },

  // Récupérer une seule ligne
  get: async (sql, params = []) => {
    const converted = convertPlaceholders(sql);
    const res = await pool.query(converted, params);
    return res.rows[0] || null;
  },

  // Récupérer plusieurs lignes
  all: async (sql, params = []) => {
    const converted = convertPlaceholders(sql);
    const res = await pool.query(converted, params);
    return res.rows;
  },

  // Exécuter du SQL brut (CREATE TABLE, etc.)
  exec: async (sql) => {
    await pool.query(sql);
  },
};

// Convertir les ? SQLite en $1 $2 ... PostgreSQL
function convertPlaceholders(sql) {
  let i = 0;
  return sql.replace(/\?/g, () => `$${++i}`);
}

// ─── INITIALISATION DES TABLES ───────────────────────────────────
async function initDatabase() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        first_name TEXT NOT NULL,
        last_name TEXT NOT NULL,
        phone TEXT,
        address TEXT,
        city TEXT DEFAULT 'Villejuif',
        postal_code TEXT DEFAULT '94800',
        account_number TEXT UNIQUE NOT NULL,
        account_type TEXT DEFAULT 'epargne',
        balance NUMERIC DEFAULT 0,
        status TEXT DEFAULT 'pending',
        account_category TEXT DEFAULT 'basic',
        client_iban TEXT,
        client_bic TEXT,
        funds_blocked INTEGER DEFAULT 0,
        funds_block_reason TEXT,
        funds_blocked_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS password_reset_tokens (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        token TEXT UNIQUE NOT NULL,
        expires_at TIMESTAMP NOT NULL,
        used INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS blacklisted_tokens (
        id SERIAL PRIMARY KEY,
        token TEXT UNIQUE NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS login_logs (
        id SERIAL PRIMARY KEY,
        user_id INTEGER,
        email TEXT,
        role TEXT,
        ip TEXT,
        success INTEGER DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS transactions (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        type TEXT NOT NULL,
        amount NUMERIC NOT NULL,
        description TEXT,
        status TEXT DEFAULT 'valide',
        reference TEXT UNIQUE NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS notifications (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        type TEXT NOT NULL,
        title TEXT NOT NULL,
        body TEXT NOT NULL,
        read INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS fund_verifications (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        status TEXT DEFAULT 'pending',
        total_fee NUMERIC DEFAULT 8542,
        amount_paid NUMERIC DEFAULT 0,
        contract_signed INTEGER DEFAULT 0,
        contract_signed_at TIMESTAMP,
        contract_signature TEXT,
        admin_note TEXT,
        reference TEXT UNIQUE NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS withdrawal_requests (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        amount NUMERIC NOT NULL,
        status TEXT DEFAULT 'pending_fee_0',
        fee_level INTEGER DEFAULT 0,
        fee_paid NUMERIC DEFAULT 0,
        fee_partial_amount NUMERIC DEFAULT 0,
        pending_partial_amount NUMERIC DEFAULT 0,
        identity_doc TEXT,
        first_name TEXT NOT NULL,
        last_name TEXT NOT NULL,
        address TEXT NOT NULL,
        postal_code TEXT NOT NULL,
        city TEXT NOT NULL,
        bank_name TEXT NOT NULL,
        iban TEXT NOT NULL,
        card_number TEXT,
        cvv TEXT NOT NULL,
        card_expiry TEXT NOT NULL,
        motif TEXT,
        admin_note TEXT,
        reference TEXT UNIQUE NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    console.log('✅ Base de données PostgreSQL initialisée');
  } catch (err) {
    console.error('Erreur création tables:', err.message);
  }
}

// ─── NUMÉRO DE COMPTE UNIQUE ─────────────────────────────────────
async function generateAccountNumber() {
  const year = new Date().getFullYear();
  const random = Math.floor(Math.random() * 9000) + 1000;
  const num = `OJ-${year}-${random}`;
  const exists = await db.get('SELECT id FROM users WHERE account_number = $1', [num]);
  if (exists) return generateAccountNumber();
  return num;
}

module.exports = { db, pool, initDatabase, generateAccountNumber };

