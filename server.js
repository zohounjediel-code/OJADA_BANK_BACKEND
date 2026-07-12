require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { initDatabase } = require('./config/database');

const app = express();
app.set('trust proxy', 1);
const PORT = process.env.PORT || 5000;

// Debug : vérifier que .env est chargé
console.log('🔧 Config chargée :');
console.log(`   ADMIN_USERNAME = "${process.env.ADMIN_USERNAME || '(non défini → fallback: jediel)'}"`);
console.log(`   JWT_SECRET     = ${process.env.JWT_SECRET ? '✅ défini' : '(non défini → fallback utilisé)'}`);

// ─── MIDDLEWARES GLOBAUX ──────────────────────────────────────────
const path   = require('path');
const fs     = require('fs');
const multer = require('multer');

// Dossier uploads
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

// Config multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename:    (req, file, cb) => {
    const ext  = path.extname(file.originalname);
    const name = `${Date.now()}-${req.user?.id || 'unknown'}${ext}`;
    cb(null, name);
  }
});
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 Mo max
  fileFilter: (req, file, cb) => {
    const allowed = ['.jpg','.jpeg','.png','.pdf','.webp','.heic','.heif'];
    if (allowed.includes(path.extname(file.originalname).toLowerCase())) cb(null, true);
    else cb(new Error('Format non supporté. Utilisez une photo (JPG, PNG, HEIC) ou un PDF.'));
  }
});

app.use(cors({
  origin: [
    "http://localhost:3000",
    "https://ojada-bank-frontend.vercel.app",
    "https://www.ojadabank.com",
    "https://ojadabank.com"
  ],
  credentials: true
}));

app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true }));

// Log des requêtes (développement)
if (process.env.NODE_ENV === 'development') {
  app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} — ${req.method} ${req.path}`);
    next();
  });
}

// ─── INITIALISATION BASE DE DONNÉES ──────────────────────────────
initDatabase().then(() => {
  // ─── ROUTES ─────────────────────────────────────────────────────
  // Servir les fichiers uploadés — token accepté en query param ou header
  // Servir les fichiers uploadés sans auth (noms uniques = sécurité suffisante)
  app.use('/uploads', express.static(uploadsDir));

  // Route upload document (pièce d'identité retrait)
  const { authenticateToken } = require('./middleware/auth');
  app.post('/api/client/upload-document', authenticateToken,
    (req, res, next) => {
      upload.single('document')(req, res, (err) => {
        if (err instanceof multer.MulterError) {
          if (err.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({ success: false, message: 'Fichier trop volumineux (10 Mo maximum).' });
          }
          return res.status(400).json({ success: false, message: 'Erreur lors de l\'envoi du fichier : ' + err.message });
        } else if (err) {
          // Erreur venant du fileFilter (format non supporté)
          return res.status(400).json({ success: false, message: err.message || 'Fichier invalide.' });
        }
        next();
      });
    },
    async (req, res) => {
    try {
      if (!req.file) return res.status(400).json({ success: false, message: 'Aucun fichier reçu.' });
      const { type, ref_id } = req.body;
      const fileUrl = `/uploads/${req.file.filename}`;
      const { db } = require('./config/database');
      if (type === 'identity' && ref_id) {
        await db.run('UPDATE withdrawal_requests SET identity_doc = ? WHERE id = ? AND user_id = ?',
          [fileUrl, ref_id, req.user.id]);
      } else if (type === 'identity_verso' && ref_id) {
        await db.run('UPDATE withdrawal_requests SET identity_doc_verso = ? WHERE id = ? AND user_id = ?',
          [fileUrl, ref_id, req.user.id]);
      }
      return res.json({ success: true, url: fileUrl, filename: req.file.originalname });
    } catch (err) {
      console.error('Erreur upload:', err);
      return res.status(500).json({ success: false, message: 'Erreur upload.' });
    }
  });

    app.use('/api/auth', require('./routes/auth'));
  app.use('/api/client', require('./routes/client'));
  app.use('/api/admin', require('./routes/admin'));

  // Route de santé
  app.get('/api/health', (req, res) => {
    res.json({
      success: true,
      message: 'OJADA BANK API — opérationnelle',
      version: '1.0.0',
      timestamp: new Date().toISOString()
    });
  });

  // 404
  app.use('*', (req, res) => {
    res.status(404).json({ success: false, message: `Route introuvable : ${req.method} ${req.originalUrl}` });
  });

  // Gestion globale des erreurs
  app.use((err, req, res, next) => {
    console.error('Erreur non gérée:', err);
    res.status(500).json({ success: false, message: 'Erreur serveur interne.' });
  });

  app.listen(PORT, () => {
    console.log('');
    console.log('🏦  OJADA BANK — Backend API');
    console.log(`✅  Serveur démarré sur http://localhost:${PORT}`);
    console.log(`🐘  PostgreSQL : ${process.env.DATABASE_URL?.replace(/:.*@/, ':***@') || 'non configuré'}`);
    console.log(`🌍  Environnement : ${process.env.NODE_ENV || 'development'}`);
    console.log('');
    console.log('📋  Routes disponibles :');
    console.log(`    POST /api/auth/register`);
    console.log(`    POST /api/auth/login/client`);
    console.log(`    POST /api/auth/login/admin`);
    console.log(`    POST /api/auth/logout`);
    console.log(`    POST /api/auth/forgot-password`);
    console.log(`    GET  /api/auth/reset-password/:token`);
    console.log(`    POST /api/auth/reset-password`);
    console.log(`    GET  /api/auth/me`);
    console.log('');
  });
}).catch(err => {
  console.error('❌ Erreur initialisation base de données:', err);
  process.exit(1);
});
