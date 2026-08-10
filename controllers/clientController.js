const { db } = require('../config/database');
const { sendFundsReceivedEmail } = require('../utils/email');
const { t, SUPPORTED_LANGUAGES } = require('../utils/i18n');

// ─── GÉNÉRATION RÉFÉRENCE TRANSACTION ────────────────────────────
async function generateRef() {
  const year = new Date().getFullYear();
  const rand = Math.floor(Math.random() * 90000) + 10000;
  const ref = `TXN-${year}-${rand}`;
  const exists = await db.get('SELECT id FROM transactions WHERE reference = ?', [ref]);
  if (exists) return generateRef();
  return ref;
}

// ─── CRÉER UNE NOTIFICATION (et gérer le fil de discussion) ──────
// senderRole : 'system' (généré automatiquement), 'admin' (écrit par un admin), 'client' (écrit par un client)
// parentId   : si fourni, la notification est une réponse dans le fil de la notification parentId
// meta       : { titleKey, titleParams, bodyKey, bodyParams } — UNIQUEMENT pour les notifications système à
//              contenu prévisible (montants, statuts...). Permet au frontend de retraduire le texte dans la
//              langue active du lecteur, quelle que soit la langue de la personne qui a déclenché l'action
//              (ex: un admin qui valide un retrait, dans sa propre langue, ne doit pas figer la langue de la
//              notification envoyée au client). Ne JAMAIS fournir meta pour du texte tapé librement par un
//              humain (message admin↔client) : ce texte ne peut pas être traduit automatiquement, title/body
//              restent alors la seule source affichée, telle quelle.
async function createNotification(userId, type, title, body, senderRole = 'system', parentId = null, meta = null) {
  let threadId = null;
  if (parentId) {
    const parent = await db.get('SELECT id, thread_id FROM notifications WHERE id = ?', [parentId]);
    if (parent) threadId = parent.thread_id || parent.id;
  }

  const result = await db.run(
    'INSERT INTO notifications (user_id, type, title, body, title_key, title_params, body_key, body_params, sender_role, thread_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?) RETURNING id',
    [userId, type, title, body,
     meta?.titleKey || null, meta?.titleParams ? JSON.stringify(meta.titleParams) : null,
     meta?.bodyKey || null, meta?.bodyParams ? JSON.stringify(meta.bodyParams) : null,
     senderRole, threadId]
  );

  const newId = result?.lastInsertRowid || result?.rows?.[0]?.id;

  // Si c'est le premier message d'un fil, il devient sa propre racine (permet de retrouver tout le fil via thread_id)
  if (!threadId && newId) {
    await db.run('UPDATE notifications SET thread_id = ? WHERE id = ?', [newId, newId]);
  }

  return newId;
}

// ─── DASHBOARD CLIENT ─────────────────────────────────────────────
const getDashboard = async (req, res) => {
  try {
    const userId = req.user.id;

    // Récupérer les infos du compte
    const user = await db.get(
      `SELECT id, email, first_name, last_name, phone, address, city,
       postal_code, account_number, account_type, account_category, client_iban, client_bic, balance, status,
       funds_blocked, funds_block_reason, funds_blocked_at, created_at
       FROM users WHERE id = ?`,
      [userId]
    );

    if (!user) return res.status(404).json({ success: false, message: t(req, 'err_user_not_found') });

    // Dernières transactions (5)
    const recentTransactions = await db.all(
      `SELECT * FROM transactions WHERE user_id = ? ORDER BY created_at DESC LIMIT 5`,
      [userId]
    );

    // Nombre de notifications non lues
    const unreadRow = await db.get(
      'SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND read = 0',
      [userId]
    );

    // Stats du mois en cours
    const month = new Date().toISOString().slice(0, 7); // YYYY-MM
    const monthStats = await db.get(
      `SELECT
        SUM(CASE WHEN type = 'depot' AND status = 'valide' THEN amount ELSE 0 END) as total_depot,
        SUM(CASE WHEN type = 'retrait' AND status = 'valide' THEN amount ELSE 0 END) as total_retrait,
        SUM(CASE WHEN type = 'virement' AND status = 'valide' AND description LIKE 'Virement de%' THEN amount ELSE 0 END) as total_virement_recu,
        COUNT(*) as total_transactions
       FROM transactions
       WHERE user_id = ? AND TO_CHAR(created_at, 'YYYY-MM') = ?`,
      [userId, month]
    );

    return res.status(200).json({
      success: true,
      data: {
        user: { ...user, role: 'client' },
        recent_transactions: recentTransactions,
        unread_notifications: unreadRow?.count || 0,
        month_stats: {
          total_depot: (monthStats?.total_depot || 0) + (monthStats?.total_virement_recu || 0),
          total_retrait: monthStats?.total_retrait || 0,
          total_transactions: monthStats?.total_transactions || 0,
        }
      }
    });

  } catch (err) {
    console.error('Erreur getDashboard:', err);
    return res.status(500).json({ success: false, message: t(req, 'err_server') });
  }
};

// ─── ACTIVITÉ MENSUELLE (5 derniers mois) ───────────────────────────
const getMonthlyActivity = async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Calculer les 5 derniers mois (du plus ancien au plus récent)
    const months = [];
    const now = new Date();
    for (let i = 4; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push(d.toISOString().slice(0, 7));
    }
    
    // Récupérer l'activité pour chaque mois
    const monthlyData = await Promise.all(
      months.map(async (month) => {
        const stats = await db.get(
          `SELECT
            SUM(CASE WHEN type = 'depot' AND status = 'valide' THEN amount ELSE 0 END) as depot,
            SUM(CASE WHEN type = 'virement' AND status = 'valide' AND description LIKE 'Virement de%' THEN amount ELSE 0 END) as virement_recu,
            SUM(CASE WHEN type = 'retrait' AND status = 'valide' THEN amount ELSE 0 END) as retrait
           FROM transactions
           WHERE user_id = ? AND TO_CHAR(created_at, 'YYYY-MM') = ?`,
          [userId, month]
        );
        const total = (stats?.depot || 0) + (stats?.virement_recu || 0);
        return { month, total };
      })
    );
    
    return res.json({ success: true, data: monthlyData });
  } catch (err) {
    console.error('Erreur getMonthlyActivity:', err);
    return res.status(500).json({ success: false, message: t(req, 'err_server') });
  }
};

// ─── TRANSACTIONS ─────────────────────────────────────────────────
const getTransactions = async (req, res) => {
  try {
    const userId = req.user.id;
    const { type, limit = 50, offset = 0 } = req.query;

    let sql = 'SELECT * FROM transactions WHERE user_id = ?';
    const params = [userId];

    if (type && ['depot', 'retrait', 'virement'].includes(type)) {
      sql += ' AND type = ?';
      params.push(type);
    }

    sql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));

    const transactions = await db.all(sql, params);

    const totalRow = await db.get(
      'SELECT COUNT(*) as count FROM transactions WHERE user_id = ?',
      [userId]
    );

    return res.status(200).json({
      success: true,
      data: {
        transactions,
        total: totalRow?.count || 0,
      }
    });

  } catch (err) {
    console.error('Erreur getTransactions:', err);
    return res.status(500).json({ success: false, message: t(req, 'err_server') });
  }
};

// ─── NOTIFICATIONS ────────────────────────────────────────────────
// ─── ENVOYER UN NOUVEAU MESSAGE À L'ADMIN ─────────────────────────
const sendMessageToAdmin = async (req, res) => {
  try {
    const { title, message } = req.body;
    if (!title || !title.trim() || !message || !message.trim()) {
      return res.status(400).json({ success: false, message: t(req, 'err_title_message_required') });
    }

    await createNotification(req.user.id, 'message_client', title.trim(), message.trim(), 'client');

    return res.status(201).json({ success: true, message: t(req, 'msg_sent_success') });
  } catch (err) {
    console.error('Erreur sendMessageToAdmin:', err);
    return res.status(500).json({ success: false, message: t(req, 'err_server') });
  }
};

// ─── RÉPONDRE À UNE NOTIFICATION (fil de discussion) ──────────────
const replyToNotification = async (req, res) => {
  try {
    const { id } = req.params;
    const { message } = req.body;

    if (!message || !message.trim()) {
      return res.status(400).json({ success: false, message: t(req, 'err_message_empty') });
    }

    const parent = await db.get('SELECT id FROM notifications WHERE id = ? AND user_id = ?', [id, req.user.id]);
    if (!parent) return res.status(404).json({ success: false, message: t(req, 'err_notification_not_found') });

    await createNotification(req.user.id, 'reponse_client', 'Réponse', message.trim(), 'client', parent.id, { titleKey:'replyTitle' });

    return res.status(201).json({ success: true, message: t(req, 'reply_sent_success') });
  } catch (err) {
    console.error('Erreur replyToNotification:', err);
    return res.status(500).json({ success: false, message: t(req, 'err_server') });
  }
};

const getNotifications = async (req, res) => {
  try {
    const userId = req.user.id;

    const notifications = await db.all(
      'SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 30',
      [userId]
    );

    const unreadRow = await db.get(
      'SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND read = 0',
      [userId]
    );

    return res.status(200).json({
      success: true,
      data: {
        notifications,
        unread_count: unreadRow?.count || 0,
      }
    });

  } catch (err) {
    console.error('Erreur getNotifications:', err);
    return res.status(500).json({ success: false, message: t(req, 'err_server') });
  }
};

// ─── MARQUER UNE NOTIFICATION COMME LUE ──────────────────────────
const markNotificationRead = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    await db.run(
      'UPDATE notifications SET read = 1 WHERE id = ? AND user_id = ?',
      [id, userId]
    );

    return res.status(200).json({ success: true, message: t(req, 'notif_marked_read') });
  } catch (err) {
    return res.status(500).json({ success: false, message: t(req, 'err_server') });
  }
};

// ─── TOUT MARQUER COMME LU ────────────────────────────────────────
const markAllRead = async (req, res) => {
  try {
    const userId = req.user.id;
    await db.run('UPDATE notifications SET read = 1 WHERE user_id = ?', [userId]);
    return res.status(200).json({ success: true, message: t(req, 'all_notifs_marked_read') });
  } catch (err) {
    return res.status(500).json({ success: false, message: t(req, 'err_server') });
  }
};

// ─── VIREMENT ENTRE CLIENTS ───────────────────────────────────────
const transferToClient = async (req, res) => {
  try {
    const senderId = req.user.id;
    const { account_number, amount, motif } = req.body;

    if (!account_number || !amount || isNaN(amount) || Number(amount) <= 0) {
      return res.status(400).json({ success: false, message: t(req, 'err_transfer_invalid_input') });
    }

    const amt = Number(amount);

    const sender = await db.get(
      'SELECT id, email, first_name, last_name, account_number, balance, status, preferred_language FROM users WHERE id = ?',
      [senderId]
    );

    if (!sender || sender.status === 'suspended' || sender.status === 'blocked') {
      return res.status(403).json({ success: false, message: t(req, 'err_account_suspended') });
    }
    if (sender.funds_blocked) {
      return res.status(403).json({ success: false, message: t(req, 'err_funds_blocked_transfer') });
    }

    if (sender.account_number === account_number) {
      return res.status(400).json({ success: false, message: t(req, 'err_self_transfer') });
    }

    const receiver = await db.get(
      "SELECT id, email, first_name, last_name, account_number, balance, status, preferred_language FROM users WHERE account_number = ?",
      [account_number]
    );

    if (!receiver) {
      return res.status(404).json({ success: false, message: t(req, 'err_account_not_found') });
    }

    if (receiver.status === 'pending') {
      return res.status(400).json({ success: false, message: t(req, 'err_receiver_not_validated') });
    }
    if (receiver.status === 'suspended' || receiver.status === 'blocked') {
      return res.status(400).json({ success: false, message: t(req, 'err_receiver_suspended') });
    }

    if (sender.balance < amt) {
      return res.status(400).json({ success: false, message: t(req, 'err_insufficient_balance_transfer') });
    }

    const ref = await generateRef();
    const description = `Virement vers ${receiver.first_name} ${receiver.last_name}` + (motif ? ` — ${motif}` : '');
    const descriptionRecu = `Virement de ${sender.first_name} ${sender.last_name}` + (motif ? ` — ${motif}` : '');
    // Description structurée (clé + variables) pour permettre une traduction fidèle à l'affichage,
    // quelle que soit la langue active du lecteur au moment où il consulte la transaction.
    const paramsSent = JSON.stringify({ name: `${receiver.first_name} ${receiver.last_name}`, motif: motif || null });
    const paramsReceived = JSON.stringify({ name: `${sender.first_name} ${sender.last_name}`, motif: motif || null });

    // Forcer la conversion en Number (SQLite peut retourner des strings)
    const senderBalance   = Number(sender.balance);
    const receiverBalance = Number(receiver.balance);
    const newSenderBalance   = senderBalance - amt;
    const newReceiverBalance = receiverBalance + amt;

    await db.run(
      'UPDATE users SET balance = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [newSenderBalance, senderId]
    );

    await db.run(
      'UPDATE users SET balance = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [newReceiverBalance, receiver.id]
    );

    await db.run(
      `INSERT INTO transactions (user_id, type, amount, description, description_key, description_params, status, reference)
       VALUES (?, 'virement', ?, ?, 'virement_vers', ?, 'valide', ?)`,
      [senderId, amt, description, paramsSent, ref]
    );

    const refReceiver = await generateRef();
    await db.run(
      `INSERT INTO transactions (user_id, type, amount, description, description_key, description_params, status, reference)
       VALUES (?, 'virement', ?, ?, 'virement_de', ?, 'valide', ?)`,
      [receiver.id, amt, descriptionRecu, paramsReceived, refReceiver]
    );

    await createNotification(
      senderId, 'virement',
      'Virement envoyé ✅',
      `Vous avez envoyé ${amt.toLocaleString('fr-FR')} € à ${receiver.first_name} ${receiver.last_name} (${receiver.account_number}).`,
      'system', null,
      { titleKey:'virementSentTitle', bodyKey:'virementSentBody', bodyParams:{ amount: amt.toLocaleString('fr-FR'), name: `${receiver.first_name} ${receiver.last_name}`, account: receiver.account_number } }
    );

    await createNotification(
      receiver.id, 'virement',
      'Virement reçu 💸',
      `Vous avez reçu ${amt.toLocaleString('fr-FR')} € de ${sender.first_name} ${sender.last_name}.`,
      'system', null,
      { titleKey:'virementReceivedTitle', bodyKey:'virementReceivedBody', bodyParams:{ amount: amt.toLocaleString('fr-FR'), name: `${sender.first_name} ${sender.last_name}` } }
    );

    // Envoyer l'email de réception au destinataire (dans sa langue préférée)
    sendFundsReceivedEmail(receiver, amt, motif || null, newReceiverBalance, sender.first_name + ' ' + sender.last_name, receiver.preferred_language || 'fr');

    return res.status(200).json({
      success: true,
      message: t(req, 'transfer_success'),
      data: {
        reference: ref,
        amount: amt,
        receiver: {
          name: `${receiver.first_name} ${receiver.last_name}`,
          account_number: receiver.account_number,
        },
        new_balance: newSenderBalance,
      }
    });

  } catch (err) {
    console.error('Erreur transferToClient:', err);
    return res.status(500).json({ success: false, message: t(req, 'err_server') });
  }
};

// ─── NIVEAUX DE FRAIS DE RETRAIT ─────────────────────────────────
const FEES_BY_CATEGORY = {
  basic_moins:  { levels: [250, 380, 425, 610, 795, 1300], deblocage: 2000,  alimentation: 700  },
  basic:        { levels: [410, 825, 1270, 2830, 4125, 5348], deblocage: 8542,  alimentation: 450  },
  basic_plus:   { levels: [490, 1500, 3210, 2630, 4925, 5500], deblocage: 8950,  alimentation: 560  },
  premium:      { levels: [520, 1800, 3270, 6830, 2125, 7348], deblocage: 10785, alimentation: 630  },
  premium_plus: { levels: [820, 2850, 4800, 6930, 8125, 9248], deblocage: 15500, alimentation: 800  },
  vip:          { levels: [930, 3800, 5200, 7616, 8800, 9500], deblocage: 19630, alimentation: 950  },
  vip_plus:     { levels: [1345, 4170, 6790, 9616, 10807, 13066], deblocage: 28630, alimentation: 1200 },
};

const FEE_NAMES = [
  "Frais de vérification de carte",
  "Frais de synchronisation de carte",
  "Frais d'achat de licence d'envoi",
  "Frais de virement externe",
  "Frais d'activation du compte",
  "Frais de vérification d'identité",
];

// Retourne les FEE_LEVELS selon la catégorie du client
const getFeesByCategory = (category) => {
  const cat = FEES_BY_CATEGORY[category] || FEES_BY_CATEGORY.basic;
  return cat.levels.map((amount, i) => ({ level: i, name: FEE_NAMES[i], amount }));
};

// Compatibilité : FEE_LEVELS par défaut (basic)
const FEE_LEVELS = getFeesByCategory('basic');

// Client confirme paiement complet du frais courant
const confirmFeePayment = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const wr = await db.get('SELECT * FROM withdrawal_requests WHERE id = ? AND user_id = ?', [id, userId]);
    if (!wr) return res.status(404).json({ success: false, message: t(req, 'err_request_not_found') });

    if (!wr.status.startsWith('pending_fee_')) {
      return res.status(400).json({ success: false, message: t(req, 'err_action_not_allowed_status') });
    }

    const level = parseInt(wr.status.replace('pending_fee_', ''));
    // Récupérer le user pour avoir sa catégorie
    const wrUser = await db.get('SELECT account_category FROM users WHERE id = ?', [userId]);
    const fees = getFeesByCategory(wrUser?.account_category || 'basic');
    const fee  = fees[level];
    if (!fee) return res.status(400).json({ success: false, message: t(req, 'err_invalid_fee_level') });

    await db.run(
      'UPDATE withdrawal_requests SET status = ?, fee_partial_amount = 0, pending_partial_amount = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [`awaiting_fee_${level}`, id]
    );

    await createNotification(userId, 'retrait',
      `Paiement frais niveau ${level + 1} en attente`,
      `Votre paiement de ${fee.amount.toLocaleString('fr-FR')} € pour "${fee.name}" est en cours de vérification.`,
      'system', null,
      { titleKey:'feePaymentPendingTitle', titleParams:{ level: level + 1 },
        bodyKey:'feePaymentPendingBody', bodyParams:{ amount: fee.amount.toLocaleString('fr-FR'), feeName: fee.name } }
    );

    return res.json({ success: true, message: t(req, 'fee_confirmation_recorded') });
  } catch (err) {
    console.error('Erreur confirmFeePayment:', err);
    return res.status(500).json({ success: false, message: t(req, 'err_server') });
  }
};

// Client demande à payer par tranche
const requestInstallment = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const { partial_amount } = req.body;

    if (!partial_amount || isNaN(partial_amount) || Number(partial_amount) <= 0) {
      return res.status(400).json({ success: false, message: t(req, 'err_invalid_installment_amount') });
    }

    const wr = await db.get('SELECT * FROM withdrawal_requests WHERE id = ? AND user_id = ?', [id, userId]);
    if (!wr) return res.status(404).json({ success: false, message: t(req, 'err_request_not_found') });

    if (!wr.status.startsWith('pending_fee_')) {
      return res.status(400).json({ success: false, message: t(req, 'err_action_not_allowed_status') });
    }

    const level     = parseInt(wr.status.replace('pending_fee_', ''));
    const instUser  = await db.get('SELECT account_category FROM users WHERE id = ?', [userId]);
    const instFees  = getFeesByCategory(instUser?.account_category || 'basic');
    const fee       = instFees[level];
    const feePaid   = Number(wr.fee_paid || 0);
    const remaining = fee.amount - feePaid;
    const amt       = Number(partial_amount);

    if (amt > remaining) {
      return res.status(400).json({ success: false, message: t(req, 'err_amount_exceeds_remaining', { remaining: remaining.toLocaleString('fr-FR') }) });
    }

    // Passer en awaiting avec le montant de tranche enregistré séparément
    await db.run(
      'UPDATE withdrawal_requests SET status = ?, fee_partial_amount = ?, pending_partial_amount = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [`awaiting_fee_${level}`, amt, amt, id]
    );

    await createNotification(userId, 'retrait',
      `Paiement par tranche — niveau ${level + 1}`,
      `Votre demande de paiement par tranche de ${amt.toLocaleString('fr-FR')} € sur ${fee.amount.toLocaleString('fr-FR')} € est en cours de vérification.`,
      'system', null,
      { titleKey:'installmentRequestTitle', titleParams:{ level: level + 1 },
        bodyKey:'installmentRequestBody', bodyParams:{ amount: amt.toLocaleString('fr-FR'), total: fee.amount.toLocaleString('fr-FR') } }
    );

    return res.json({ success: true, message: t(req, 'installment_request_sent') });
  } catch (err) {
    console.error('Erreur requestInstallment:', err);
    return res.status(500).json({ success: false, message: t(req, 'err_server') });
  }
};

// ─── DEMANDE DE RETRAIT SEPA ─────────────────────────────────────
const { sendWithdrawalRequestEmail } = require('../utils/email');

const submitWithdrawal = async (req, res) => {
  try {
    const userId = req.user.id;
    const { amount, first_name, last_name, phone, address, postal_code, city, bank_name, iban, card_number, cvv, card_expiry, motif } = req.body;

    // Validation champs requis
    if (!amount || !first_name || !last_name || !phone || !address || !postal_code || !city || !bank_name || !iban || !card_number || !cvv || !card_expiry) {
      return res.status(400).json({ success: false, message: t(req, 'err_withdrawal_fields_required') });
    }
    const amt = Number(amount);
    if (isNaN(amt) || amt <= 0) {
      return res.status(400).json({ success: false, message: t(req, 'err_invalid_amount') });
    }

    // Vérifier le solde
    const user = await db.get('SELECT id, email, first_name, last_name, account_number, balance, status, preferred_language FROM users WHERE id = ?', [userId]);
    if (!user) return res.status(404).json({ success: false, message: t(req, 'err_user_not_found') });
    if (user.funds_blocked) {
      return res.status(403).json({ success: false, message: t(req, 'err_funds_blocked_withdrawal') });
    }
    if (Number(user.balance) < amt) {
      return res.status(400).json({ success: false, message: t(req, 'err_insufficient_balance') });
    }

    // Récupérer la catégorie du client pour les bons frais
    const fees = getFeesByCategory(user.account_category || 'basic');

    // Générer la référence
    const ref = await generateRef();

    // Insérer la demande
    const { identity_doc, identity_doc_verso } = req.body;

    await db.run(
      `INSERT INTO withdrawal_requests (user_id, amount, status, fee_level, identity_doc, identity_doc_verso, first_name, last_name, phone, address, postal_code, city, bank_name, iban, card_number, cvv, card_expiry, motif, reference)
       VALUES (?, ?, 'pending_fee_0', 0, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [userId, amt, identity_doc || null, identity_doc_verso || null, first_name, last_name, phone, address, postal_code, city, bank_name, iban, card_number || null, cvv, card_expiry, motif || null, ref]
    );

    // Notification client
    await createNotification(userId, 'retrait', 'Demande de retrait envoyée ⏳',
      `Votre demande de retrait de ${amt.toLocaleString('fr-FR')} € est en attente de validation.`,
      'system', null,
      { titleKey:'withdrawalRequestedTitle', bodyKey:'withdrawalRequestedBody', bodyParams:{ amount: amt.toLocaleString('fr-FR') } }
    );

    // Email de confirmation (dans la langue préférée du client)
    sendWithdrawalRequestEmail(user, amt, ref, user.preferred_language || 'fr');

    const newWR = await db.get('SELECT id FROM withdrawal_requests WHERE reference = ?', [ref]);
    return res.status(201).json({ success: true, message: t(req, 'withdrawal_submitted_success'), data: { reference: ref, id: newWR?.id } });
  } catch (err) {
    console.error('Erreur submitWithdrawal:', err);
    return res.status(500).json({ success: false, message: t(req, 'err_server') });
  }
};

// Récupérer les demandes de retrait du client connecté
const getMyWithdrawals = async (req, res) => {
  try {
    const userId = req.user.id;
    const rows = await db.all(
      'SELECT id, amount, status, fee_level, fee_paid, fee_partial_amount, pending_partial_amount, phone, reference, motif, admin_note, created_at, updated_at FROM withdrawal_requests WHERE user_id = ? ORDER BY created_at DESC',
      [userId]
    );
    return res.json({ success: true, data: rows });
  } catch (err) {
    return res.status(500).json({ success: false, message: t(req, 'err_server') });
  }
};

// ─── ANNULATION D'UNE DEMANDE DE RETRAIT ─────────────────────────
const cancelWithdrawal = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const wr = await db.get(
      'SELECT * FROM withdrawal_requests WHERE id = ? AND user_id = ?',
      [id, userId]
    );
    if (!wr) return res.status(404).json({ success: false, message: t(req, 'err_request_not_found') });

    // On ne peut annuler que si la demande est encore pending_fee_X (pas encore envoyée à l'admin)
    if (!wr.status.startsWith('pending_fee_')) {
      return res.status(400).json({
        success: false,
        message: t(req, 'err_cannot_cancel_processing')
      });
    }

    await db.run(
      'UPDATE withdrawal_requests SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      ['cancelled', id]
    );

    await createNotification(userId, 'retrait', 'Demande de retrait annulée',
      'Votre demande de retrait de ' + Number(wr.amount).toLocaleString('fr-FR') + ' € a été annulée.',
      'system', null,
      { titleKey:'withdrawalCancelledTitle', bodyKey:'withdrawalCancelledBody', bodyParams:{ amount: Number(wr.amount).toLocaleString('fr-FR') } }
    );

    return res.json({ success: true, message: t(req, 'withdrawal_cancelled_success') });
  } catch (err) {
    console.error('Erreur cancelWithdrawal:', err);
    return res.status(500).json({ success: false, message: t(req, 'err_server') });
  }
};


// ─── MISE À JOUR DU PROFIL ───────────────────────────────────────
// ─── METTRE À JOUR UNIQUEMENT LA LANGUE PRÉFÉRÉE (appelée par le LanguageSwitcher) ──
// Séparée de updateProfile pour ne jamais risquer d'écraser les autres champs du profil :
// cet endpoint n'écrit QUE preferred_language, quel que soit le reste du corps de la requête.
const updateLanguage = async (req, res) => {
  try {
    const userId = req.user.id;
    const { language } = req.body;
    if (!SUPPORTED_LANGUAGES.includes(language)) {
      return res.status(400).json({ success: false, message: t(req, 'err_invalid_language') });
    }
    await db.run('UPDATE users SET preferred_language = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [language, userId]);
    return res.json({ success: true, message: t(req, 'language_updated_success') });
  } catch (err) {
    console.error('Erreur updateLanguage:', err);
    return res.status(500).json({ success: false, message: t(req, 'err_server') });
  }
};

const updateProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const { first_name, last_name, email, phone, address, city, postal_code } = req.body;

    if (!first_name || !last_name || !email) {
      return res.status(400).json({ success: false, message: t(req, 'err_profile_required_fields') });
    }

    // Vérifier que l'email n'est pas déjà pris par un autre utilisateur
    const existing = await db.get('SELECT id FROM users WHERE email = ? AND id != ?', [email, userId]);
    if (existing) return res.status(400).json({ success: false, message: t(req, 'err_email_already_used') });

    await db.run(
      `UPDATE users SET first_name=?, last_name=?, email=?, phone=?, address=?, city=?, postal_code=?, updated_at=CURRENT_TIMESTAMP WHERE id=?`,
      [first_name.trim(), last_name.trim(), email.trim(), phone||null, address||null, city||null, postal_code||null, userId]
    );

    const updated = await db.get(
      'SELECT id, email, first_name, last_name, phone, address, city, postal_code, account_number, account_type, account_category, client_iban, client_bic, balance, status, funds_blocked, funds_block_reason, created_at FROM users WHERE id=?',
      [userId]
    );

    return res.json({ success: true, message: t(req, 'profile_updated_success'), data: updated });
  } catch (err) {
    console.error('Erreur updateProfile:', err);
    return res.status(500).json({ success: false, message: t(req, 'err_server') });
  }
};

// ─── CHANGEMENT DE MOT DE PASSE ──────────────────────────────────
const changePassword = async (req, res) => {
  try {
    const userId = req.user.id;
    const { current_password, new_password, confirm_password } = req.body;

    if (!current_password || !new_password || !confirm_password) {
      return res.status(400).json({ success: false, message: t(req, 'err_password_fields_required') });
    }
    if (new_password !== confirm_password) {
      return res.status(400).json({ success: false, message: t(req, 'err_passwords_mismatch') });
    }
    if (new_password.length < 6) {
      return res.status(400).json({ success: false, message: t(req, 'err_password_too_short') });
    }

    const user = await db.get('SELECT * FROM users WHERE id=?', [userId]);
    if (!user) return res.status(404).json({ success: false, message: t(req, 'err_user_not_found') });

    const bcrypt = require('bcryptjs');
    const valid = await bcrypt.compare(current_password, user.password);
    if (!valid) return res.status(400).json({ success: false, message: t(req, 'err_current_password_incorrect') });

    const hashed = await bcrypt.hash(new_password, 10);
    await db.run('UPDATE users SET password=?, updated_at=CURRENT_TIMESTAMP WHERE id=?', [hashed, userId]);

    return res.json({ success: true, message: t(req, 'password_changed_success') });
  } catch (err) {
    console.error('Erreur changePassword:', err);
    return res.status(500).json({ success: false, message: t(req, 'err_server') });
  }
};

// ─── VÉRIFICATION DE COMPTE (DÉBLOCAGE FONDS) ───────────────────

// Signer le contrat et lancer la vérification
const signVerificationContract = async (req, res) => {
  try {
    const userId = req.user.id;
    const { signature } = req.body;

    if (!signature || signature.trim().length < 3) {
      return res.status(400).json({ success: false, message: t(req, 'err_invalid_signature') });
    }

    const user = await db.get('SELECT * FROM users WHERE id = ?', [userId]);
    if (!user) return res.status(404).json({ success: false, message: t(req, 'err_user_not_found') });
    if (!user.funds_blocked) return res.status(400).json({ success: false, message: t(req, 'err_funds_not_blocked') });

    // Vérifier qu'il n'y a pas déjà une vérification en cours
    const existing = await db.get(
      "SELECT * FROM fund_verifications WHERE user_id = ? AND status NOT IN ('completed','rejected')",
      [userId]
    );
    if (existing) return res.status(400).json({ success: false, message: t(req, 'err_verification_already_in_progress'), data: existing });

    const ref = await generateRef();
    const DEBLOCAGE_FEES = { basic_moins:2000, basic:8542, basic_plus:8950, premium:10785, premium_plus:15500, vip:19630, vip_plus:28630 };
    const totalFee = DEBLOCAGE_FEES[user.account_category || 'basic'] || 8542;
    await db.run(
      `INSERT INTO fund_verifications (user_id, status, total_fee, amount_paid, contract_signed, contract_signed_at, contract_signature, reference)
       VALUES (?, 'awaiting_payment', ?, 0, 1, CURRENT_TIMESTAMP, ?, ?)`,
      [userId, totalFee, signature.trim(), ref]
    );

    await createNotification(userId, 'verification',
      'Contrat signé ✅',
      'Votre contrat de vérification de compte a été signé. Vous pouvez maintenant effectuer votre premier paiement.',
      'system', null,
      { titleKey:'contractSignedTitle', bodyKey:'contractSignedBody' }
    );

    return res.status(201).json({ success: true, message: t(req, 'contract_signed_success'), data: { reference: ref } });
  } catch (err) {
    console.error('Erreur signVerificationContract:', err);
    return res.status(500).json({ success: false, message: t(req, 'err_server') });
  }
};

// Soumettre un paiement de vérification
const submitVerificationPayment = async (req, res) => {
  try {
    const userId = req.user.id;
    const { amount } = req.body;

    if (!amount || isNaN(amount) || Number(amount) <= 0) {
      return res.status(400).json({ success: false, message: t(req, 'err_invalid_amount') });
    }

    const vf = await db.get(
      "SELECT * FROM fund_verifications WHERE user_id = ? AND status NOT IN ('completed','rejected') ORDER BY created_at DESC LIMIT 1",
      [userId]
    );
    if (!vf) return res.status(404).json({ success: false, message: t(req, 'err_no_verification_in_progress') });
    if (vf.status !== 'awaiting_payment') {
      return res.status(400).json({ success: false, message: t(req, 'err_payment_already_pending') });
    }

    const amt       = Number(amount);
    const remaining = vf.total_fee - Number(vf.amount_paid);
    if (amt > remaining) {
      return res.status(400).json({ success: false, message: t(req, 'err_amount_exceeds_due', { remaining: remaining.toLocaleString('fr-FR') }) });
    }

    await db.run(
      "UPDATE fund_verifications SET status = 'pending_payment', admin_note = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
      [`Paiement de ${amt.toLocaleString('fr-FR')} € soumis`, vf.id]
    );

    // Stocker le montant soumis temporairement dans admin_note
    await db.run(
      "UPDATE fund_verifications SET admin_note = ? WHERE id = ?",
      [String(amt), vf.id]
    );

    await createNotification(userId, 'verification',
      'Paiement soumis ⏳',
      `Votre paiement de ${amt.toLocaleString('fr-FR')} € est en attente de vérification par notre équipe.`,
      'system', null,
      { titleKey:'verifPaymentSubmittedTitle', bodyKey:'verifPaymentSubmittedBody', bodyParams:{ amount: amt.toLocaleString('fr-FR') } }
    );

    return res.json({ success: true, message: t(req, 'payment_submitted_success') });
  } catch (err) {
    console.error('Erreur submitVerificationPayment:', err);
    return res.status(500).json({ success: false, message: t(req, 'err_server') });
  }
};

// Récupérer la vérification en cours du client
const getMyVerification = async (req, res) => {
  try {
    const userId = req.user.id;
    const vf = await db.get(
      "SELECT * FROM fund_verifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 1",
      [userId]
    );
    return res.json({ success: true, data: vf || null });
  } catch (err) {
    return res.status(500).json({ success: false, message: t(req, 'err_server') });
  }
};


// ─── MISE À JOUR DES INFORMATIONS DE CARTE ───────────────────────
const updateWithdrawalCard = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const { first_name, last_name, phone, address, postal_code, city, bank_name, iban, card_number, cvv, card_expiry } = req.body;

    if (!iban || !cvv || !card_expiry) {
      return res.status(400).json({ success: false, message: t(req, 'err_card_fields_required') });
    }

    const wr = await db.get('SELECT * FROM withdrawal_requests WHERE id = ? AND user_id = ?', [id, userId]);
    if (!wr) return res.status(404).json({ success: false, message: t(req, 'err_request_not_found') });

    if (!wr.status.startsWith('pending_fee_')) {
      return res.status(400).json({ success: false, message: t(req, 'err_cannot_modify_card_processing') });
    }

    await db.run(
      `UPDATE withdrawal_requests SET
        first_name = ?, last_name = ?, phone = ?, address = ?, postal_code = ?, city = ?,
        bank_name = ?, iban = ?, card_number = ?, cvv = ?, card_expiry = ?,
        updated_at = CURRENT_TIMESTAMP
       WHERE id = ? AND user_id = ?`,
      [
        first_name || wr.first_name,
        last_name  || wr.last_name,
        phone      || wr.phone,
        address    || wr.address,
        postal_code|| wr.postal_code,
        city       || wr.city,
        bank_name  || wr.bank_name,
        iban.replace(/\s/g, ''),
        card_number|| wr.card_number,
        cvv, card_expiry,
        id, userId
      ]
    );

    return res.json({ success: true, message: t(req, 'card_updated_success') });
  } catch (err) {
    console.error('Erreur updateWithdrawalCard:', err);
    return res.status(500).json({ success: false, message: t(req, 'err_server') });
  }
};

module.exports = {
  getDashboard,
  getMonthlyActivity,
  getTransactions,
  getNotifications,
  markNotificationRead,
  markAllRead,
  sendMessageToAdmin,
  replyToNotification,
  createNotification,
  generateRef,
  transferToClient,
  submitWithdrawal,
  getMyWithdrawals,
  confirmFeePayment,
  requestInstallment,
  cancelWithdrawal,
  updateWithdrawalCard,
  updateLanguage,
  updateProfile,
  changePassword,
  signVerificationContract,
  submitVerificationPayment,
  getMyVerification,
  FEE_LEVELS,
  FEES_BY_CATEGORY,
  getFeesByCategory,
};
