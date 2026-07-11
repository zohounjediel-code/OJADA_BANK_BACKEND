const express = require('express');
const router = express.Router();
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const adminController = require('../controllers/adminController');

router.use(authenticateToken, requireAdmin);

router.get('/dashboard', adminController.getDashboard);
router.get('/clients', adminController.getClients);
router.get('/clients/:id', adminController.getClientById);
router.put('/clients/:id/status', adminController.updateClientStatus);
router.get('/transactions', adminController.getTransactions);
router.get('/stats', adminController.getStats);
router.post('/transfer', adminController.transferFunds);

router.get('/withdrawals', adminController.getWithdrawals);
router.put('/withdrawals/:id', adminController.processWithdrawal);

router.post('/clients/:id/block-funds', adminController.blockFunds);
router.put('/clients/:id/category', adminController.updateAccountCategory);
router.put('/clients/:id/iban-bic', adminController.assignIbanBic);
router.post('/clients/:id/notify', adminController.sendClientNotification);
router.get('/messages', adminController.getClientMessages);
router.get('/messages/:id', adminController.getMessageThread);
router.post('/messages/:id/reply', adminController.replyToClientMessage);
router.get('/blocked-accounts', adminController.getBlockedAccounts);
router.get('/verifications', adminController.getVerifications);
router.put('/verifications/:id', adminController.processVerificationPayment);

// Documents clients
router.get('/documents', adminController.getDocuments);

module.exports = router;
