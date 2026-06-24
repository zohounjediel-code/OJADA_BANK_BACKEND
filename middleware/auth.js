const jwt = require('jsonwebtoken');
const { db } = require('../config/database');

const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ success: false, message: 'Accès refusé. Token manquant.' });
  }

  // Vérifier si le token est blacklisté
  const blacklisted = await db.get('SELECT id FROM blacklisted_tokens WHERE token = ?', [token]);
  if (blacklisted) {
    return res.status(401).json({ success: false, message: 'Session expirée. Veuillez vous reconnecter.' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    req.token = token;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ success: false, message: 'Session expirée. Veuillez vous reconnecter.' });
    }
    return res.status(403).json({ success: false, message: 'Token invalide.' });
  }
};

const requireClient = (req, res, next) => {
  if (req.user.role !== 'client') return res.status(403).json({ success: false, message: 'Accès réservé aux clients.' });
  next();
};

const requireAdmin = (req, res, next) => {
  if (req.user.role !== 'admin') return res.status(403).json({ success: false, message: 'Accès réservé aux administrateurs.' });
  next();
};

module.exports = { authenticateToken, requireClient, requireAdmin };
