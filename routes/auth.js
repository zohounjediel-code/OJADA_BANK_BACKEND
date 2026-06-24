const express = require('express');
const router = express.Router();
const { body, param } = require('express-validator');
const rateLimit = require('express-rate-limit');
const {
  register,
  loginClient,
  loginAdmin,
  logout,
  forgotPassword,
  resetPassword,
  verifyResetToken,
  getMe
} = require('../controllers/authController');
const { authenticateToken } = require('../middleware/auth');
const { handleValidation } = require('../middleware/validation');

// ─── RATE LIMITERS ────────────────────────────────────────────────
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 min
  max: process.env.NODE_ENV === 'production' ? 10 : 200, // Illimité en dev
  message: { success: false, message: 'Trop de tentatives de connexion. Réessayez dans 15 minutes.' }
});

const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 heure
  max: process.env.NODE_ENV === 'production' ? 5 : 200, // Illimité en dev
  message: { success: false, message: 'Trop de créations de compte. Réessayez dans 1 heure.' }
});

const forgotPasswordLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 heure
  max: process.env.NODE_ENV === 'production' ? 3 : 200, // Illimité en dev
  message: { success: false, message: 'Trop de demandes. Réessayez dans 1 heure.' }
});

// ─── VALIDATIONS ──────────────────────────────────────────────────
const registerValidation = [
  body('email')
    .isEmail().withMessage('Email invalide.')
    .normalizeEmail()
    .custom(val => val.endsWith('@gmail.com'))
    .withMessage('Seules les adresses Gmail sont acceptées.'),
  body('password')
    .isLength({ min: 8 }).withMessage('Le mot de passe doit contenir au moins 8 caractères.')
    .matches(/[A-Z]/).withMessage('Le mot de passe doit contenir au moins une majuscule.')
    .matches(/[0-9]/).withMessage('Le mot de passe doit contenir au moins un chiffre.'),
  body('first_name')
    .trim().notEmpty().withMessage('Le prénom est requis.')
    .isLength({ max: 50 }).withMessage('Prénom trop long.'),
  body('last_name')
    .trim().notEmpty().withMessage('Le nom est requis.')
    .isLength({ max: 50 }).withMessage('Nom trop long.'),
  body('phone')
    .optional({ checkFalsy: true })
    .matches(/^(\+33|0)[0-9]{9}$/).withMessage('Numéro invalide (ex: 0612345678).'),
  body('address')
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ min: 5, max: 200 }).withMessage("L'adresse doit contenir entre 5 et 200 caractères."),
  body('city')
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ max: 100 }).withMessage('Ville trop longue.'),
  body('postal_code')
    .optional({ checkFalsy: true })
    .trim()
    .matches(/^[0-9]{5}$/).withMessage('Code postal invalide (5 chiffres attendus).'),
];

const loginClientValidation = [
  body('email').isEmail().withMessage('Email invalide.').normalizeEmail(),
  body('password').notEmpty().withMessage('Mot de passe requis.'),
];

const loginAdminValidation = [
  body('username').trim().notEmpty().withMessage('Nom d\'utilisateur requis.'),
  body('password').notEmpty().withMessage('Mot de passe requis.'),
];

const forgotPasswordValidation = [
  body('email').isEmail().withMessage('Email invalide.').normalizeEmail(),
];

const resetPasswordValidation = [
  body('token').notEmpty().withMessage('Token requis.'),
  body('new_password')
    .isLength({ min: 8 }).withMessage('Le mot de passe doit contenir au moins 8 caractères.')
    .matches(/[A-Z]/).withMessage('Le mot de passe doit contenir au moins une majuscule.')
    .matches(/[0-9]/).withMessage('Le mot de passe doit contenir au moins un chiffre.'),
];

// ─── ROUTES ───────────────────────────────────────────────────────

// POST /api/auth/register — Inscription client
router.post('/register', registerLimiter, registerValidation, handleValidation, register);

// POST /api/auth/login/client — Connexion client
router.post('/login/client', loginLimiter, loginClientValidation, handleValidation, loginClient);

// POST /api/auth/login/admin — Connexion admin
router.post('/login/admin', loginLimiter, loginAdminValidation, handleValidation, loginAdmin);

// POST /api/auth/logout — Déconnexion
router.post('/logout', authenticateToken, logout);

// POST /api/auth/forgot-password — Demande de réinitialisation
router.post('/forgot-password', forgotPasswordLimiter, forgotPasswordValidation, handleValidation, forgotPassword);

// GET /api/auth/reset-password/:token — Vérifier le token
router.get('/reset-password/:token', verifyResetToken);

// POST /api/auth/reset-password — Réinitialiser le mot de passe
router.post('/reset-password', resetPasswordValidation, handleValidation, resetPassword);

// GET /api/auth/me — Profil de l'utilisateur connecté
router.get('/me', authenticateToken, getMe);

module.exports = router;
