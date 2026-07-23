const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { db, generateAccountNumber } = require('../config/database');
const { sendWelcomeEmail, sendPasswordResetEmail } = require('../utils/email');
const { t, detectLang } = require('../utils/i18n');

// ─── INSCRIPTION CLIENT ───────────────────────────────────────────
const register = async (req, res) => {
  try {
    const { email, password, first_name, last_name, phone, address, city, postal_code } = req.body;
    const lang = detectLang(req);

    if (!email.toLowerCase().endsWith('@gmail.com')) {
      return res.status(400).json({ success: false, message: t(req, 'err_email_not_gmail') });
    }

    const existingUser = await db.get('SELECT id FROM users WHERE email = ?', [email.toLowerCase()]);
    if (existingUser) {
      return res.status(409).json({ success: false, message: t(req, 'err_email_exists') });
    }

    const salt = await bcrypt.genSalt(12);
    const hashedPassword = await bcrypt.hash(password, salt);
    const accountNumber = await generateAccountNumber();

    const result = await db.run(
      `INSERT INTO users (email, password, first_name, last_name, phone, address, city, postal_code, account_number, preferred_language)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?) RETURNING id`,
      [
        email.toLowerCase(),
        hashedPassword,
        first_name.trim(),
        last_name.trim(),
        phone ? phone.trim() : null,
        address ? address.trim() : null,
        city ? city.trim() : null,
        postal_code ? postal_code.trim() : null,
        accountNumber,
        lang
      ]
    );

    const newUser = {
      id: result.lastInsertRowid,
      email: email.toLowerCase(),
      first_name: first_name.trim(),
      last_name: last_name.trim(),
      phone,
      address: address.trim(),
      city: city.trim(),
      postal_code: postal_code.trim(),
      account_number: accountNumber,
      preferred_language: lang
    };

    sendWelcomeEmail(newUser, lang);

    // Créer une notification de bienvenue (dans la langue choisie à l'inscription)
    const { createNotification } = require('./clientController');
    await createNotification(
      result.lastInsertRowid,
      'bienvenue',
      t(req, 'welcome_notif_title'),
      t(req, 'welcome_notif_body', { name: first_name.trim(), account: accountNumber })
    );

    const token = jwt.sign(
      { id: newUser.id, email: newUser.email, role: 'client' },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN }
    );

    return res.status(201).json({
      success: true,
      message: t(req, 'register_success'),
      token,
      user: { ...newUser, role: 'client', status: 'pending' }
    });

  } catch (err) {
    console.error('Erreur register:', err);
    return res.status(500).json({ success: false, message: t(req, 'err_server') });
  }
};

// ─── CONNEXION CLIENT ─────────────────────────────────────────────
const loginClient = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await db.get('SELECT * FROM users WHERE email = ?', [email.toLowerCase()]);

    if (!user) {
      await db.run('INSERT INTO login_logs (email, role, ip, success) VALUES (?, ?, ?, ?)', [email, 'client', req.ip, 0]);
      return res.status(401).json({ success: false, message: t(req, 'err_login_invalid') });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      await db.run('INSERT INTO login_logs (user_id, email, role, ip, success) VALUES (?, ?, ?, ?, ?)', [user.id, email, 'client', req.ip, 0]);
      return res.status(401).json({ success: false, message: t(req, 'err_login_invalid') });
    }

    if (['rejected', 'deleted', 'suspended', 'blocked'].includes(user.status)) {
      await db.run('INSERT INTO login_logs (user_id, email, role, ip, success) VALUES (?, ?, ?, ?, ?)', [user.id, email, 'client', req.ip, 0]);
      req.user = user; // pour que detectLang() puisse utiliser la langue préférée du compte
      return res.status(403).json({ success: false, message: t(req, `err_status_${user.status}`) });
    }

    await db.run('INSERT INTO login_logs (user_id, email, role, ip, success) VALUES (?, ?, ?, ?, ?)', [user.id, email, 'client', req.ip, 1]);

    const token = jwt.sign(
      { id: user.id, email: user.email, role: 'client' },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN }
    );

    req.user = user;
    return res.status(200).json({
      success: true,
      message: t(req, 'login_success'),
      token,
      user: {
        id: user.id, email: user.email, first_name: user.first_name,
        last_name: user.last_name, phone: user.phone, address: user.address,
        city: user.city, postal_code: user.postal_code,
        account_number: user.account_number, account_type: user.account_type,
        balance: user.balance, status: user.status, role: 'client',
        preferred_language: user.preferred_language,
        created_at: user.created_at
      }
    });

  } catch (err) {
    console.error('Erreur loginClient:', err);
    return res.status(500).json({ success: false, message: t(req, 'err_server') });
  }
};

// ─── CONNEXION ADMIN ──────────────────────────────────────────────
const loginAdmin = async (req, res) => {
  try {
    const { username, password } = req.body;

    // Identifiants admin — fallback si .env non chargé
    const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'jediel';
    const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'jediel';

    const validUsername = username.trim() === ADMIN_USERNAME;
    const validPassword = password.trim() === ADMIN_PASSWORD;

    if (!validUsername || !validPassword) {
      await db.run('INSERT INTO login_logs (email, role, ip, success) VALUES (?, ?, ?, ?)', [username, 'admin', req.ip, 0]);
      return res.status(401).json({ success: false, message: t(req, 'err_admin_invalid') });
    }

    await db.run('INSERT INTO login_logs (email, role, ip, success) VALUES (?, ?, ?, ?)', [username, 'admin', req.ip, 1]);

    const token = jwt.sign(
      { id: 0, username: ADMIN_USERNAME, role: 'admin' },
      process.env.JWT_SECRET || 'ojada_bank_secret_key',
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    return res.status(200).json({
      success: true,
      message: t(req, 'admin_login_success'),
      token,
      user: { username: ADMIN_USERNAME, role: 'admin' }
    });

  } catch (err) {
    console.error('Erreur loginAdmin:', err);
    return res.status(500).json({ success: false, message: t(req, 'err_server') });
  }
};

// ─── DÉCONNEXION ──────────────────────────────────────────────────
const logout = async (req, res) => {
  try {
    await db.run('INSERT INTO blacklisted_tokens (token) VALUES ($1) ON CONFLICT (token) DO NOTHING', [req.token]);
    return res.status(200).json({ success: true, message: t(req, 'logout_success') });
  } catch (err) {
    console.error('Erreur logout:', err);
    return res.status(500).json({ success: false, message: t(req, 'err_server') });
  }
};

// ─── MOT DE PASSE OUBLIÉ ─────────────────────────────────────────
const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    const user = await db.get('SELECT id, email, first_name, preferred_language FROM users WHERE email = ?', [email.toLowerCase()]);

    if (user) {
      await db.run('UPDATE password_reset_tokens SET used = 1 WHERE user_id = ? AND used = 0', [user.id]);

      const resetToken = crypto.randomBytes(32).toString('hex');
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();

      await db.run(
        'INSERT INTO password_reset_tokens (user_id, token, expires_at) VALUES (?, ?, ?)',
        [user.id, resetToken, expiresAt]
      );

      await sendPasswordResetEmail(user, resetToken, user.preferred_language || detectLang(req));
    }

    return res.status(200).json({
      success: true,
      message: t(req, 'forgot_password_sent')
    });

  } catch (err) {
    console.error('Erreur forgotPassword:', err);
    return res.status(500).json({ success: false, message: t(req, 'err_server') });
  }
};

// ─── RÉINITIALISER MOT DE PASSE ───────────────────────────────────
const resetPassword = async (req, res) => {
  try {
    const { token, new_password } = req.body;

    const resetRecord = await db.get(`
      SELECT prt.*, u.email, u.first_name
      FROM password_reset_tokens prt
      JOIN users u ON prt.user_id = u.id
      WHERE prt.token = ? AND prt.used = 0 AND prt.expires_at > datetime('now')
    `, [token]);

    if (!resetRecord) {
      return res.status(400).json({ success: false, message: t(req, 'err_reset_invalid') });
    }

    const salt = await bcrypt.genSalt(12);
    const hashedPassword = await bcrypt.hash(new_password, salt);

    await db.run('UPDATE users SET password = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [hashedPassword, resetRecord.user_id]);
    await db.run('UPDATE password_reset_tokens SET used = 1 WHERE id = ?', [resetRecord.id]);

    return res.status(200).json({ success: true, message: t(req, 'reset_success') });

  } catch (err) {
    console.error('Erreur resetPassword:', err);
    return res.status(500).json({ success: false, message: t(req, 'err_server') });
  }
};

// ─── VÉRIFIER TOKEN RESET ─────────────────────────────────────────
const verifyResetToken = async (req, res) => {
  try {
    const { token } = req.params;
    const record = await db.get(
      `SELECT id FROM password_reset_tokens WHERE token = ? AND used = 0 AND expires_at > datetime('now')`,
      [token]
    );

    if (!record) return res.status(400).json({ success: false, message: t(req, 'err_token_invalid') });
    return res.status(200).json({ success: true, message: t(req, 'token_valid') });

  } catch (err) {
    return res.status(500).json({ success: false, message: t(req, 'err_server') });
  }
};

// ─── PROFIL CONNECTÉ ──────────────────────────────────────────────
const getMe = async (req, res) => {
  try {
    if (req.user.role === 'admin') {
      return res.status(200).json({ success: true, user: { username: req.user.username, role: 'admin' } });
    }

    const user = await db.get(
      'SELECT id, email, first_name, last_name, phone, address, city, postal_code, account_number, account_type, balance, status, preferred_language, created_at FROM users WHERE id = ?',
      [req.user.id]
    );

    if (!user) return res.status(404).json({ success: false, message: t(req, 'err_user_not_found') });
    return res.status(200).json({ success: true, user: { ...user, role: 'client' } });

  } catch (err) {
    return res.status(500).json({ success: false, message: t(req, 'err_server') });
  }
};

module.exports = { register, loginClient, loginAdmin, logout, forgotPassword, resetPassword, verifyResetToken, getMe };
