const express = require('express');
const router = express.Router();
const { authenticateToken, requireClient } = require('../middleware/auth');
const clientController = require('../controllers/clientController');

// Toutes les routes nécessitent d'être connecté en tant que client
router.use(authenticateToken, requireClient);

// GET /api/client/dashboard — solde, infos compte, résumé
router.get('/dashboard', clientController.getDashboard);
router.get('/monthly-activity', clientController.getMonthlyActivity);

// GET /api/client/transactions — historique des transactions
router.get('/transactions', clientController.getTransactions);

// GET /api/client/notifications — notifications du client
router.get('/notifications', clientController.getNotifications);

// PUT /api/client/notifications/:id/read — marquer comme lue
router.put('/notifications/:id/read', clientController.markNotificationRead);

// PUT /api/client/notifications/read-all — tout marquer comme lu
router.put('/notifications/read-all', clientController.markAllRead);

// POST /api/client/transfer — virement vers un autre client
router.post('/transfer', clientController.transferToClient);

// GET /api/client/lookup — vérifier si un numéro de compte existe
router.get('/lookup', async (req, res) => {
  try {
    const { account_number } = req.query;
    if (!account_number) return res.status(400).json({ success: false, message: 'Numéro requis.' });

    const { db } = require('../config/database');
    const user = await db.get(
      "SELECT first_name, last_name, account_number, status FROM users WHERE account_number = ?",
      [account_number]
    );

    if (!user) return res.status(404).json({ success: false, message: 'Compte introuvable.' });
    if (user.status === 'suspended' || user.status === 'blocked') {
      return res.status(400).json({ success: false, message: 'Ce compte est suspendu.' });
    }
    return res.json({ success: true, data: { name: `${user.first_name} ${user.last_name}`, account_number: user.account_number } });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Erreur serveur.' });
  }
});

// POST /api/client/withdrawal — soumettre une demande de retrait SEPA
router.post('/withdrawal', clientController.submitWithdrawal);

// GET /api/client/withdrawals — historique des demandes du client
router.get('/withdrawals', clientController.getMyWithdrawals);

// POST /api/client/withdrawals/:id/confirm-fee — client confirme paiement frais
router.post('/withdrawals/:id/confirm-fee', clientController.confirmFeePayment);
router.put('/withdrawals/:id/update-card', clientController.updateWithdrawalCard);

// POST /api/client/withdrawals/:id/installment — client demande paiement par tranche
router.post('/withdrawals/:id/installment', clientController.requestInstallment);

// DELETE /api/client/withdrawals/:id — client annule sa demande
router.delete('/withdrawals/:id', clientController.cancelWithdrawal);

// GET  /api/client/verification — récupérer la vérification en cours
router.get('/verification', clientController.getMyVerification);

// POST /api/client/verification/sign — signer le contrat
router.post('/verification/sign', clientController.signVerificationContract);

// POST /api/client/verification/payment — soumettre un paiement
router.post('/verification/payment', clientController.submitVerificationPayment);

// PUT /api/client/profile — mise à jour du profil
router.put('/profile', clientController.updateProfile);

// PUT /api/client/password — changement de mot de passe
router.put('/password', clientController.changePassword);

module.exports = router;
