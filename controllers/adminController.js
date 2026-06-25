const { db } = require('../config/database');
const { sendFundsReceivedEmail } = require('../utils/email');

// ─── DASHBOARD ADMIN ─────────────────────────────────────────────
const getDashboard = async (req, res) => {
  try {
    // Total clients
    const totalClients = await db.get('SELECT COUNT(*) as count FROM users');
    const activeClients = await db.get("SELECT COUNT(*) as count FROM users WHERE status = 'active'");
    const pendingClients = await db.get("SELECT COUNT(*) as count FROM users WHERE status = 'pending'");

    // Total dépôts
    const totalBalance = await db.get("SELECT COALESCE(SUM(balance),0) as total FROM users");

    // Transactions
    const totalTransactions = await db.get('SELECT COUNT(*) as count FROM transactions');

    // Transactions du mois
    const month = new Date().toISOString().slice(0, 7);
    const monthStats = await db.get(`
      SELECT
        COALESCE(SUM(CASE WHEN type='depot' THEN amount ELSE 0 END),0) as total_depot,
        COALESCE(SUM(CASE WHEN type='retrait' THEN amount ELSE 0 END),0) as total_retrait,
        COALESCE(SUM(CASE WHEN type='virement' THEN amount ELSE 0 END),0) as total_virement,
        COUNT(*) as count
      FROM transactions
      WHERE TO_CHAR(created_at, 'YYYY-MM') = ? AND status = 'valide'
    `, [month]);

    // Dernières transactions (5)
    const recentTransactions = await db.all(`
      SELECT t.*, u.first_name, u.last_name, u.account_number
      FROM transactions t
      JOIN users u ON t.user_id = u.id
      ORDER BY t.created_at DESC LIMIT 5
    `);

    // Nouveaux clients ce mois
    const newClientsMonth = await db.get(`
      SELECT COUNT(*) as count FROM users
      WHERE TO_CHAR(created_at, 'YYYY-MM') = ?
    `, [month]);

    return res.status(200).json({
      success: true,
      data: {
        kpis: {
          total_balance: totalBalance?.total || 0,
          total_clients: totalClients?.count || 0,
          active_clients: activeClients?.count || 0,
          pending_clients: pendingClients?.count || 0,
          total_transactions: totalTransactions?.count || 0,
          new_clients_month: newClientsMonth?.count || 0,
        },
        month_stats: {
          total_depot: monthStats?.total_depot || 0,
          total_retrait: monthStats?.total_retrait || 0,
          total_virement: monthStats?.total_virement || 0,
          count: monthStats?.count || 0,
        },
        recent_transactions: recentTransactions,
      }
    });
  } catch (err) {
    console.error('Erreur getDashboard admin:', err);
    return res.status(500).json({ success: false, message: 'Erreur serveur.' });
  }
};

// ─── LISTE DES CLIENTS ────────────────────────────────────────────
const getClients = async (req, res) => {
  try {
    const { search = '', status = '', limit = 50, offset = 0 } = req.query;

    let sql = `
      SELECT id, email, first_name, last_name, phone, city,
             account_number, account_type, account_category, client_iban, client_bic,
             balance, status, funds_blocked, created_at
      FROM users WHERE 1=1
    `;
    const params = [];

    if (search) {
      sql += ` AND (first_name LIKE ? OR last_name LIKE ? OR email LIKE ? OR account_number LIKE ?)`;
      const s = `%${search}%`;
      params.push(s, s, s, s);
    }
    if (status) {
      sql += ` AND status = ?`;
      params.push(status);
    }

    sql += ` ORDER BY created_at DESC LIMIT ? OFFSET ?`;
    params.push(parseInt(limit), parseInt(offset));

    const clients = await db.all(sql, params);
    const totalRow = await db.get('SELECT COUNT(*) as count FROM users');

    return res.status(200).json({
      success: true,
      data: { clients, total: totalRow?.count || 0 }
    });
  } catch (err) {
    console.error('Erreur getClients:', err);
    return res.status(500).json({ success: false, message: 'Erreur serveur.' });
  }
};

// ─── DÉTAIL D'UN CLIENT ───────────────────────────────────────────
const getClientById = async (req, res) => {
  try {
    const { id } = req.params;
    const client = await db.get(
      `SELECT id, email, first_name, last_name, phone, address, city,
              postal_code, account_number, account_type, account_category,
              client_iban, client_bic, balance, status,
              funds_blocked, funds_block_reason, funds_blocked_at, created_at
       FROM users WHERE id = ?`, [id]
    );
    if (!client) return res.status(404).json({ success: false, message: 'Client introuvable.' });

    const transactions = await db.all(
      'SELECT * FROM transactions WHERE user_id = ? ORDER BY created_at DESC LIMIT 10', [id]
    );

    return res.status(200).json({ success: true, data: { client, transactions } });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Erreur serveur.' });
  }
};

// ─── MODIFIER STATUT CLIENT ───────────────────────────────────────
const updateClientStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!['active', 'pending', 'inactive'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Statut invalide.' });
    }

    await db.run(
      'UPDATE users SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [status, id]
    );

    // Notifier le client
    const labels = { active: 'validé', pending: 'mis en attente', inactive: 'désactivé' };
    await db.run(
      'INSERT INTO notifications (user_id, type, title, body) VALUES (?, ?, ?, ?)',
      [id, 'info', 'Mise à jour de votre compte',
       `Votre compte OJADA BANK a été ${labels[status]} par l'administration.`]
    );

    return res.status(200).json({ success: true, message: `Statut mis à jour : ${status}` });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Erreur serveur.' });
  }
};

// ─── TOUTES LES TRANSACTIONS ──────────────────────────────────────
const getTransactions = async (req, res) => {
  try {
    const { type = '', status = '', limit = 50, offset = 0 } = req.query;

    let sql = `
      SELECT t.*, u.first_name, u.last_name, u.account_number
      FROM transactions t
      JOIN users u ON t.user_id = u.id
      WHERE 1=1
    `;
    const params = [];

    if (type) { sql += ' AND t.type = ?'; params.push(type); }
    if (status) { sql += ' AND t.status = ?'; params.push(status); }

    sql += ' ORDER BY t.created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));

    const transactions = await db.all(sql, params);
    const totalRow = await db.get('SELECT COUNT(*) as count FROM transactions');

    return res.status(200).json({
      success: true,
      data: { transactions, total: totalRow?.count || 0 }
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Erreur serveur.' });
  }
};

// ─── STATISTIQUES ─────────────────────────────────────────────────
const getStats = async (req, res) => {
  try {
    // Stats des 6 derniers mois
    const months = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      months.push(d.toISOString().slice(0, 7));
    }

    const monthlyData = await Promise.all(months.map(async (m) => {
      const row = await db.get(`
        SELECT
          COALESCE(SUM(CASE WHEN type='depot' THEN amount ELSE 0 END),0) as depot,
          COALESCE(SUM(CASE WHEN type='retrait' THEN amount ELSE 0 END),0) as retrait,
          COUNT(*) as count
        FROM transactions
        WHERE TO_CHAR(created_at, 'YYYY-MM') = ? AND status = 'valide'
      `, [m]);
      const label = new Date(m + '-01').toLocaleDateString('fr-FR', { month: 'short' });
      return { month: m, label, depot: row?.depot || 0, retrait: row?.retrait || 0, count: row?.count || 0 };
    }));

    // Répartition par type de compte
    const accountTypes = await db.all(`
      SELECT account_type, COUNT(*) as count, COALESCE(SUM(balance),0) as total
      FROM users GROUP BY account_type
    `);

    return res.status(200).json({
      success: true,
      data: { monthly: monthlyData, account_types: accountTypes }
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Erreur serveur.' });
  }
};



// ─── VIREMENT ADMIN → CLIENT ──────────────────────────────────────
const transferFunds = async (req, res) => {
  try {
    const { client_id, amount, note } = req.body;

    if (!client_id || !amount || isNaN(amount) || Number(amount) <= 0) {
      return res.status(400).json({ success: false, message: 'Client et montant valides requis.' });
    }

    const amt = Number(amount);

    // Vérifier que le client existe
    const client = await db.get(
      'SELECT id, email, first_name, last_name, account_number, balance FROM users WHERE id = ?',
      [client_id]
    );
    if (!client) {
      return res.status(404).json({ success: false, message: 'Client introuvable.' });
    }

    // Calculer le nouveau solde
    const newBalance = Number(client.balance) + amt;

    // Mettre à jour le solde du client
    await db.run(
      'UPDATE users SET balance = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [newBalance, client_id]
    );

    // Créer la transaction
    const year = new Date().getFullYear();
    const ref = `TXN-${year}-${Math.floor(Math.random() * 90000) + 10000}`;
    await db.run(
      `INSERT INTO transactions (user_id, type, amount, description, status, reference)
       VALUES (?, 'depot', ?, ?, 'valide', ?)`,
      [client_id, amt, note || 'Virement de l\'administration OJADA BANK', ref]
    );

    // Créer une notification pour le client
    await db.run(
      `INSERT INTO notifications (user_id, type, title, body) VALUES (?, 'depot', ?, ?)`,
      [client_id, 'Virement reçu 💰',
       `Vous avez reçu +${amt.toLocaleString('fr-FR')} € de l'administration OJADA BANK.${note ? ` Motif : ${note}` : ''} Votre nouveau solde est de ${newBalance.toLocaleString('fr-FR')} €.`]
    );

    // Envoyer un email au client
    sendFundsReceivedEmail(client, amt, note, newBalance);

    return res.status(200).json({
      success: true,
      message: `${amt.toLocaleString('fr-FR')} € envoyés à ${client.first_name} ${client.last_name}.`,
      data: { new_balance: newBalance, reference: ref }
    });

  } catch (err) {
    console.error('Erreur transferFunds:', err);
    return res.status(500).json({ success: false, message: 'Erreur serveur.' });
  }
};

// ─── GESTION DES RETRAITS ────────────────────────────────────────
const { sendWithdrawalStatusEmail } = require('../utils/email');

const getWithdrawals = async (req, res) => {
  try {
    const { status } = req.query;
    let sql = `
      SELECT wr.id, wr.user_id, wr.amount, wr.status, wr.fee_level, wr.fee_paid, wr.fee_partial_amount, wr.pending_partial_amount, wr.identity_doc, wr.first_name, wr.last_name, wr.bank_name, wr.iban, wr.motif, wr.admin_note, wr.reference, wr.created_at, wr.updated_at, u.email, u.account_number, u.account_category, u.first_name as user_first_name, u.last_name as user_last_name, u.balance
      FROM withdrawal_requests wr
      JOIN users u ON wr.user_id = u.id
    `;
    const params = [];
    
    // Si filtre 'all', exclure les annulés
    if (!status || status === 'all') {
      sql += ' WHERE wr.status != ?';
      params.push('cancelled');
    } else {
      sql += ' WHERE wr.status = ?';
      params.push(status);
    }
    
    // Tri : awaiting_fee_* et awaiting_final en premier (prioritaires), puis par date
    sql += ` ORDER BY 
      CASE 
        WHEN wr.status LIKE 'awaiting_fee_%' THEN 0
        WHEN wr.status = 'awaiting_final' THEN 1
        ELSE 2
      END,
      wr.created_at DESC`;
    
    const rows = await db.all(sql, params);
    return res.json({ success: true, data: rows });
  } catch (err) {
    console.error('Erreur getWithdrawals:', err);
    return res.status(500).json({ success: false, message: 'Erreur serveur.' });
  }
};

const processWithdrawal = async (req, res) => {
  try {
    const { id }                 = req.params;
    const { action, admin_note } = req.body;
    // action: 'validate_fee' | 'validate_partial' | 'payment_failed' | 'reject' | 'approve_final'

    const wr = await db.get('SELECT * FROM withdrawal_requests WHERE id = ?', [id]);
    if (!wr) return res.status(404).json({ success: false, message: 'Demande introuvable.' });

    const user = await db.get('SELECT * FROM users WHERE id = ?', [wr.user_id]);
    if (!user) return res.status(404).json({ success: false, message: 'Client introuvable.' });

    const { getFeesByCategory, createNotification } = require('./clientController');
    const FEE_LEVELS = getFeesByCategory(user.account_category || 'basic');

    // ── Refus total ──
    if (action === 'reject') {
      await db.run(
        'UPDATE withdrawal_requests SET status = ?, admin_note = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        ['rejected', admin_note || null, id]
      );
      await createNotification(user.id, 'retrait', 'Retrait refusé ❌',
        'Votre demande de retrait a été refusée.' + (admin_note ? ' Motif : ' + admin_note : '')
      );
      sendWithdrawalStatusEmail(user, Number(wr.amount), 'rejected', admin_note || null, Number(user.balance));
      return res.json({ success: true, message: 'Demande refusée.' });
    }

    // ── Paiement échoué (client reste au même niveau, fee_paid inchangé) ──
    if (action === 'payment_failed') {
      if (!wr.status.startsWith('awaiting_fee_')) {
        return res.status(400).json({ success: false, message: 'Statut invalide pour cette action.' });
      }
      const level = parseInt(wr.status.replace('awaiting_fee_', ''));
      const fee   = FEE_LEVELS[level];
      const feePaid = Number(wr.fee_paid || 0);
      const remaining = fee.amount - feePaid;

      // Remettre en pending_fee_X (client doit réessayer), fee_partial_amount et pending_partial_amount remis à 0, fee_paid conservé
      await db.run(
        'UPDATE withdrawal_requests SET status = ?, fee_partial_amount = 0, pending_partial_amount = 0, admin_note = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [`pending_fee_${level}`, admin_note || null, id]
      );

      await createNotification(user.id, 'retrait', 'Échec de transaction ❌',
        `Votre paiement de frais (niveau ${level + 1}) a échoué.${feePaid > 0 ? ' Reste à payer : ' + remaining.toLocaleString('fr-FR') + ' €.' : ''}${admin_note ? ' ' + admin_note : ''}`
      );

      return res.json({ success: true, message: 'Échec de paiement signalé. Le client reste au niveau ' + (level + 1) + '.' });
    }

    // ── Valider une tranche partielle ──
    if (action === 'validate_partial') {
      if (!wr.status.startsWith('awaiting_fee_')) {
        return res.status(400).json({ success: false, message: 'Statut invalide pour cette action.' });
      }
      const level        = parseInt(wr.status.replace('awaiting_fee_', ''));
      const fee          = FEE_LEVELS[level];
      // Lire depuis pending_partial_amount (colonne dédiée, non écrasée par admin_note)
      const partialAmt   = Number(wr.pending_partial_amount || wr.fee_partial_amount || 0);
      const feePaid      = Number(wr.fee_paid || 0);
      const newFeePaid   = feePaid + partialAmt;
      const remaining    = fee.amount - newFeePaid;

      if (remaining > 0) {
        // Tranche validée mais pas encore complet → remettre en pending_fee_X avec fee_paid mis à jour
        await db.run(
          'UPDATE withdrawal_requests SET status = ?, fee_paid = ?, fee_partial_amount = 0, pending_partial_amount = 0, admin_note = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
          [`pending_fee_${level}`, newFeePaid, admin_note || null, id]
        );
        await createNotification(user.id, 'retrait',
          `Tranche validée ✅ — niveau ${level + 1}`,
          `Paiement de ${partialAmt.toLocaleString('fr-FR')} € confirmé. Reste à payer : ${remaining.toLocaleString('fr-FR')} € pour "${fee.name}".`
        );
        return res.json({ success: true, message: `Tranche de ${partialAmt.toLocaleString('fr-FR')} € validée. Reste : ${remaining.toLocaleString('fr-FR')} €.` });
      } else {
        // Tranche complète → passer au niveau suivant
        const nextLevel = level + 1;
        if (nextLevel < FEE_LEVELS.length) {
          await db.run(
            'UPDATE withdrawal_requests SET status = ?, fee_level = ?, fee_paid = 0, fee_partial_amount = 0, pending_partial_amount = 0, admin_note = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
            [`pending_fee_${nextLevel}`, nextLevel, admin_note || null, id]
          );
          const nextFee = FEE_LEVELS[nextLevel];
          await createNotification(user.id, 'retrait',
            `Frais niveau ${level + 1} complétés ✅`,
            `Tous les paiements du niveau ${level + 1} ont été validés. Prochaine étape : ${nextFee.name} (${nextFee.amount.toLocaleString('fr-FR')} €).`
          );
          sendWithdrawalStatusEmail(user, Number(wr.amount), 'fee_validated', admin_note || null, Number(user.balance), level, nextLevel, FEE_LEVELS);
        } else {
          await db.run(
            'UPDATE withdrawal_requests SET status = ?, fee_paid = 0, fee_partial_amount = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
            ['awaiting_final', id]
          );
          await createNotification(user.id, 'retrait', 'Tous les frais validés ✅',
            'Tous vos frais ont été confirmés. Votre retrait est en cours de traitement final.'
          );
        }
        return res.json({ success: true, message: 'Frais niveau ' + (level + 1) + ' complétés. Niveau suivant débloqué.' });
      }
    }

    // ── Validation complète d'un niveau (paiement en une fois) ──
    if (action === 'validate_fee') {
      if (!wr.status.startsWith('awaiting_fee_')) {
        return res.status(400).json({ success: false, message: 'Statut invalide pour cette action.' });
      }
      const level     = parseInt(wr.status.replace('awaiting_fee_', ''));
      const nextLevel = level + 1;

      if (nextLevel < FEE_LEVELS.length) {
        await db.run(
          'UPDATE withdrawal_requests SET status = ?, fee_level = ?, fee_paid = 0, fee_partial_amount = 0, admin_note = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
          [`pending_fee_${nextLevel}`, nextLevel, admin_note || null, id]
        );
        const nextFee = FEE_LEVELS[nextLevel];
        await createNotification(user.id, 'retrait',
          `Frais niveau ${level + 1} validé ✅`,
          `Paiement confirmé. Prochaine étape : ${nextFee.name} (${nextFee.amount.toLocaleString('fr-FR')} €).`
        );
        sendWithdrawalStatusEmail(user, Number(wr.amount), 'fee_validated', admin_note || null, Number(user.balance), level, nextLevel, FEE_LEVELS);
      } else {
        await db.run(
          'UPDATE withdrawal_requests SET status = ?, fee_paid = 0, fee_partial_amount = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
          ['awaiting_final', id]
        );
        await createNotification(user.id, 'retrait', 'Tous les frais validés ✅',
          'Tous vos frais ont été confirmés. Votre retrait est en cours de traitement final.'
        );
      }
      return res.json({ success: true, message: 'Frais niveau ' + (level + 1) + ' validé.' });
    }

    // ── Approbation finale ──
    if (action === 'approve_final') {
      if (wr.status !== 'awaiting_final') {
        return res.status(400).json({ success: false, message: 'Le retrait n\'est pas encore à l\'étape finale.' });
      }
      const newBalance = Number(user.balance) - Number(wr.amount);
      if (newBalance < 0) return res.status(400).json({ success: false, message: 'Solde insuffisant.' });

      await db.run('UPDATE users SET balance = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [newBalance, user.id]);

      const { generateRef } = require('./clientController');
      const ref = await generateRef();
      await db.run(
        "INSERT INTO transactions (user_id, type, amount, description, status, reference) VALUES (?, 'retrait', ?, ?, 'valide', ?)",
        [user.id, wr.amount, 'Retrait SEPA — ' + wr.bank_name + ' (···' + wr.iban.slice(-4) + ')', ref]
      );
      await db.run(
        'UPDATE withdrawal_requests SET status = ?, admin_note = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        ['approved', admin_note || null, id]
      );
      await createNotification(user.id, 'retrait', 'Retrait validé ✅',
        'Votre retrait de ' + Number(wr.amount).toLocaleString('fr-FR') + ' € a été effectué. Nouveau solde : ' + newBalance.toLocaleString('fr-FR') + ' €.'
      );
      sendWithdrawalStatusEmail(user, Number(wr.amount), 'approved', admin_note || null, newBalance);
      return res.json({ success: true, message: 'Retrait approuvé et solde débité.' });
    }

    return res.status(400).json({ success: false, message: 'Action invalide.' });
  } catch (err) {
    console.error('Erreur processWithdrawal:', err);
    return res.status(500).json({ success: false, message: 'Erreur serveur.' });
  }
};

// ─── BLOCAGE DE FONDS ────────────────────────────────────────────
const blockFunds = async (req, res) => {
  try {
    const { id }    = req.params;
    const { reason } = req.body;

    if (!reason || !reason.trim()) {
      return res.status(400).json({ success: false, message: 'Le motif de blocage est obligatoire.' });
    }

    const user = await db.get('SELECT * FROM users WHERE id = ?', [id]);
    if (!user) return res.status(404).json({ success: false, message: 'Client introuvable.' });

    // Bloquer les fonds
    await db.run(
      'UPDATE users SET funds_blocked = 1, funds_block_reason = ?, funds_blocked_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [reason.trim(), id]
    );

    // Annuler automatiquement les retraits en cours
    const activeWithdrawals = await db.all(
      "SELECT id FROM withdrawal_requests WHERE user_id = ? AND status NOT IN ('approved','rejected','cancelled')",
      [id]
    );
    for (const wr of activeWithdrawals) {
      await db.run(
        "UPDATE withdrawal_requests SET status = 'cancelled', admin_note = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
        ['Annulé automatiquement suite au blocage des fonds.', wr.id]
      );
    }

    const { createNotification } = require('./clientController');
    await createNotification(id, 'securite',
      'Fonds bloqués 🔒',
      'Vos fonds ont été temporairement bloqués. Motif : ' + reason.trim() + '. Contactez votre conseiller pour plus d\'informations.'
    );

    return res.json({
      success: true,
      message: 'Fonds bloqués.' + (activeWithdrawals.length > 0 ? ` ${activeWithdrawals.length} retrait(s) annulé(s).` : '')
    });
  } catch (err) {
    console.error('Erreur blockFunds:', err);
    return res.status(500).json({ success: false, message: 'Erreur serveur.' });
  }
};

// Récupérer les comptes avec fonds bloqués
const getBlockedAccounts = async (req, res) => {
  try {
    const users = await db.all(
      'SELECT id, email, first_name, last_name, account_number, balance, funds_block_reason, funds_blocked_at FROM users WHERE funds_blocked = 1 ORDER BY funds_blocked_at DESC'
    );
    return res.json({ success: true, data: users });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Erreur serveur.' });
  }
};

// Traiter un paiement de vérification
const processVerificationPayment = async (req, res) => {
  try {
    const { id }                 = req.params;
    const { action, admin_note } = req.body;
    // action: 'validate' | 'failed' | 'reject' | 'unblock'

    const vf = await db.get('SELECT * FROM fund_verifications WHERE id = ?', [id]);
    if (!vf) return res.status(404).json({ success: false, message: 'Vérification introuvable.' });

    const user = await db.get('SELECT * FROM users WHERE id = ?', [vf.user_id]);
    if (!user) return res.status(404).json({ success: false, message: 'Client introuvable.' });

    const { createNotification } = require('./clientController');
    const partialAmt = Number(vf.admin_note) || 0;
    const amtPaid    = Number(vf.amount_paid || 0);

    // ── Déblocage manuel final ──
    if (action === 'unblock') {
      const deblocageFee = Number(vf.total_fee) || 8542;
      if (amtPaid < deblocageFee) {
        return res.status(400).json({ success: false, message: `Paiement incomplet : ${amtPaid.toLocaleString('fr-FR')} € / ${deblocageFee.toLocaleString('fr-FR')} €.` });
      }
      await db.run(
        'UPDATE users SET funds_blocked = 0, funds_block_reason = NULL, funds_blocked_at = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [user.id]
      );
      await db.run(
        "UPDATE fund_verifications SET status = 'completed', admin_note = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
        [admin_note || 'Compte débloqué par l\'administrateur.', id]
      );
      await createNotification(user.id, 'securite', 'Compte débloqué 🔓',
        'Vos fonds ont été débloqués. Vous pouvez à nouveau effectuer des retraits et virements.'
      );
      return res.json({ success: true, message: 'Compte débloqué avec succès.' });
    }

    if (vf.status !== 'pending_payment') {
      return res.status(400).json({ success: false, message: 'Aucun paiement en attente.' });
    }

    // ── Paiement échoué ──
    if (action === 'failed') {
      await db.run(
        "UPDATE fund_verifications SET status = 'awaiting_payment', admin_note = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
        [admin_note || 'Transaction échouée. Veuillez réessayer.', id]
      );
      await createNotification(user.id, 'verification', 'Échec de paiement ❌',
        'Votre transaction a échoué. ' + (admin_note || 'Veuillez réessayer.')
      );
      return res.json({ success: true, message: 'Échec signalé.' });
    }

    // ── Refus ──
    if (action === 'reject') {
      await db.run(
        "UPDATE fund_verifications SET status = 'rejected', admin_note = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
        [admin_note || 'Paiement refusé.', id]
      );
      await createNotification(user.id, 'verification', 'Paiement refusé ❌',
        'Votre paiement a été refusé.' + (admin_note ? ' Motif : ' + admin_note : '')
      );
      return res.json({ success: true, message: 'Paiement refusé.' });
    }

    // ── Validation du paiement ──
    if (action === 'validate') {
      const newAmtPaid  = amtPaid + partialAmt;
      const remaining   = vf.total_fee - newAmtPaid;
      const isComplete  = remaining <= 0;

      await db.run(
        `UPDATE fund_verifications SET amount_paid = ?, status = ?, admin_note = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
        [newAmtPaid, isComplete ? 'completed_pending_unblock' : 'awaiting_payment', admin_note || null, id]
      );

      if (isComplete) {
        await createNotification(user.id, 'verification', 'Paiement complet ✅',
          `Vous avez réglé la totalité des frais de vérification (${vf.total_fee.toLocaleString('fr-FR')} €). Votre dossier est en cours de traitement par notre équipe.`
        );
      } else {
        await createNotification(user.id, 'verification', `Paiement de ${partialAmt.toLocaleString('fr-FR')} € validé ✅`,
          `Reste à payer : ${remaining.toLocaleString('fr-FR')} € / ${vf.total_fee.toLocaleString('fr-FR')} €.`
        );
      }

      return res.json({
        success: true,
        message: isComplete
          ? 'Paiement complet. Le compte peut être débloqué manuellement.'
          : `Tranche de ${partialAmt.toLocaleString('fr-FR')} € validée. Reste : ${remaining.toLocaleString('fr-FR')} €.`
      });
    }

    return res.status(400).json({ success: false, message: 'Action invalide.' });
  } catch (err) {
    console.error('Erreur processVerificationPayment:', err);
    return res.status(500).json({ success: false, message: 'Erreur serveur.' });
  }
};

// Récupérer toutes les vérifications en cours
const getVerifications = async (req, res) => {
  try {
    const { status } = req.query;
    let sql = `
      SELECT fv.*, u.email, u.first_name, u.last_name, u.account_number, u.balance, u.funds_block_reason
      FROM fund_verifications fv
      JOIN users u ON fv.user_id = u.id
    `;
    const params = [];
    if (status && status !== 'all') { sql += ' WHERE fv.status = ?'; params.push(status); }
    sql += ' ORDER BY fv.created_at DESC';
    const rows = await db.all(sql, params);
    return res.json({ success: true, data: rows });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Erreur serveur.' });
  }
};

// ─── DOCUMENTS CLIENTS ───────────────────────────────────────────
const getDocuments = async (req, res) => {
  try {
    // Pièces d'identité des retraits niveau 5
    const identityDocs = await db.all(`
      SELECT wr.id as ref_id, wr.identity_doc as url, wr.reference, wr.status,
             u.first_name, u.last_name, u.email, u.account_number,
             wr.created_at, 'identity' as doc_type
      FROM withdrawal_requests wr
      JOIN users u ON wr.user_id = u.id
      WHERE wr.identity_doc IS NOT NULL AND wr.identity_doc != ''
      ORDER BY wr.created_at DESC
    `);

    // Contrats de vérification signés
    const contracts = await db.all(`
      SELECT fv.id as ref_id, fv.contract_signature as signature,
             fv.contract_signed_at, fv.status, fv.reference, fv.total_fee,
             u.first_name, u.last_name, u.email, u.account_number,
             fv.created_at, 'contract' as doc_type
      FROM fund_verifications fv
      JOIN users u ON fv.user_id = u.id
      WHERE fv.contract_signed = 1
      ORDER BY fv.created_at DESC
    `);

    return res.json({ success: true, data: { identityDocs, contracts } });
  } catch (err) {
    console.error('Erreur getDocuments:', err);
    return res.status(500).json({ success: false, message: 'Erreur serveur.' });
  }
};

// ─── CATÉGORIE DE COMPTE ─────────────────────────────────────────
const ACCOUNT_CATEGORIES = ['basic', 'basic_plus', 'premium', 'premium_plus', 'vip', 'vip_plus'];

const updateAccountCategory = async (req, res) => {
  try {
    const { id }       = req.params;
    const { category } = req.body;

    if (!ACCOUNT_CATEGORIES.includes(category)) {
      return res.status(400).json({ success: false, message: 'Catégorie invalide.' });
    }

    const user = await db.get('SELECT id, first_name, last_name FROM users WHERE id = ?', [id]);
    if (!user) return res.status(404).json({ success: false, message: 'Client introuvable.' });

    await db.run(
      'UPDATE users SET account_category = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [category, id]
    );

    return res.json({ success: true, message: `Catégorie mise à jour : ${category}` });
  } catch (err) {
    console.error('Erreur updateAccountCategory:', err);
    return res.status(500).json({ success: false, message: 'Erreur serveur.' });
  }
};

// ─── ATTRIBUTION IBAN / BIC ──────────────────────────────────────
const assignIbanBic = async (req, res) => {
  try {
    const { id }          = req.params;
    const { client_iban, client_bic } = req.body;

    if (!client_iban || !client_bic) {
      return res.status(400).json({ success: false, message: 'IBAN et BIC sont requis.' });
    }

    const iban = client_iban.replace(/\s/g, '').toUpperCase();
    const bic  = client_bic.trim().toUpperCase();

    if (iban.length < 14 || iban.length > 34 || !/^[A-Z]{2}/.test(iban)) {
      return res.status(400).json({ success: false, message: 'Format IBAN invalide.' });
    }
    if (!/^[A-Z0-9]{4,11}$/.test(bic)) {
      return res.status(400).json({ success: false, message: 'Format BIC invalide (4 à 11 caractères).' });
    }

    const user = await db.get('SELECT id FROM users WHERE id = ?', [id]);
    if (!user) return res.status(404).json({ success: false, message: 'Client introuvable.' });

    await db.run(
      'UPDATE users SET client_iban = ?, client_bic = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [iban, bic, id]
    );

    return res.json({ success: true, message: 'IBAN et BIC attribués avec succès.' });
  } catch (err) {
    console.error('Erreur assignIbanBic:', err);
    return res.status(500).json({ success: false, message: 'Erreur serveur.' });
  }
};

module.exports = { getDashboard, getClients, getClientById, updateClientStatus, getTransactions, getStats, transferFunds, getWithdrawals, processWithdrawal, blockFunds, getBlockedAccounts, getVerifications, processVerificationPayment, getDocuments, updateAccountCategory, ACCOUNT_CATEGORIES, assignIbanBic };
