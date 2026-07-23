const axios = require('axios');
const { tRaw } = require('./i18n');

// Configuration Brevo API
const BREVO_API_URL = 'https://api.brevo.com/v3/smtp/email';
const BREVO_API_KEY = process.env.BREVO_API_KEY;

// Fonction générique pour envoyer un email via Brevo
const sendEmailBrevo = async (to, subject, htmlContent) => {
  try {
    if (!BREVO_API_KEY) {
      throw new Error('BREVO_API_KEY non configurée dans .env');
    }

    const response = await axios.post(BREVO_API_URL, {
      sender: {
        email: process.env.EMAIL_FROM || 'noreply@brevo.com',
        name: 'OJADA BANK'
      },
      to: [{ email: to }],
      subject: subject,
      htmlContent: htmlContent,
      headers: {
        'X-Mailer': 'OJADA-BANK/1.0',
        'X-Priority': '3',
        'Importance': 'Normal'
      }
    }, {
      headers: {
        'api-key': BREVO_API_KEY,
        'Content-Type': 'application/json'
      }
    });

    return { success: true, messageId: response.data.messageId };
  } catch (err) {
    console.error('❌ Erreur Brevo API:', err.response?.data || err.message);
    throw err;
  }
};

// En-tête et pied de page communs à tous les emails (identiques quelle que soit la langue)
const emailHeader = () => `
  <div style="background: #0a1628; padding: 28px 32px;">
    <div style="display: inline-block; background: #c9a84c; border-radius: 8px; padding: 8px 14px; font-size: 18px; font-weight: bold; color: #0a1628; letter-spacing: 1px;">OJ</div>
    <span style="color: #fff; font-size: 20px; margin-left: 12px; letter-spacing: 1px;">OJADA BANK</span>
  </div>
`;
const emailFooter = (lang) => `
  <div style="background: #f8f6f1; padding: 16px 32px; border-top: 1px solid #e8e2d6; font-size: 11px; color: #9ca3af;">
    ${tRaw(lang, 'email_footer')}
  </div>
`;
const emailWrapper = (lang, bodyHtml) => `
  <!DOCTYPE html>
  <html>
  <body style="font-family: Arial, sans-serif; background: #f8f6f1; padding: 20px;">
    <div style="max-width: 520px; margin: 0 auto; background: #fff; border-radius: 12px; overflow: hidden; border: 1px solid #e8e2d6;">
      ${emailHeader()}
      <div style="padding: 32px;">
        ${bodyHtml}
      </div>
      ${emailFooter(lang)}
    </div>
  </body>
  </html>
`;

// Email de bienvenue après inscription
const sendWelcomeEmail = async (user, lang = 'fr') => {
  try {
    const tt = (key, vars) => tRaw(lang, key, vars);
    const bodyHtml = `
      <h2 style="color: #0a1628; margin-top: 0;">${tt('email_welcome_heading', { name: user.first_name })}</h2>
      <p style="color: #64748b; line-height: 1.7;">${tt('email_welcome_intro')}</p>
      <div style="background: #f8f6f1; border-radius: 8px; padding: 16px; margin: 20px 0;">
        <div style="display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid #e8e2d6; font-size: 14px;">
          <span style="color: #64748b;">${tt('email_welcome_account_number')}</span>
          <strong style="color: #0a1628; font-family: monospace;">${user.account_number}</strong>
        </div>
        <div style="display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid #e8e2d6; font-size: 14px;">
          <span style="color: #64748b;">${tt('email_welcome_account_type')}</span>
          <strong style="color: #0a1628;">${tt('email_welcome_account_type_value')}</strong>
        </div>
        <div style="display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid #e8e2d6; font-size: 14px;">
          <span style="color: #64748b;">${tt('email_welcome_phone')}</span>
          <strong style="color: #0a1628;">${user.phone}</strong>
        </div>
        <div style="display: flex; justify-content: space-between; padding: 6px 0; font-size: 14px;">
          <span style="color: #64748b;">${tt('email_welcome_status')}</span>
          <span style="background: #faeeda; color: #854f0b; padding: 2px 10px; border-radius: 10px; font-size: 12px;">${tt('email_welcome_status_pending')}</span>
        </div>
      </div>
      <p style="color: #64748b; font-size: 13px; line-height: 1.7;">${tt('email_welcome_note')}</p>
      <a href="${process.env.FRONTEND_URL}/client" style="display: inline-block; background: #0a1628; color: #fff; padding: 12px 28px; border-radius: 6px; text-decoration: none; font-weight: 500; margin-top: 8px;">${tt('email_cta_account')}</a>
    `;

    await sendEmailBrevo(user.email, tt('email_welcome_subject'), emailWrapper(lang, bodyHtml));
    console.log(`📧 Email de bienvenue envoyé à ${user.email} (${lang})`);
  } catch (err) {
    console.error('❌ Erreur envoi email bienvenue:', err.message);
  }
};

// Email de réinitialisation de mot de passe
const sendPasswordResetEmail = async (user, resetToken, lang = 'fr') => {
  try {
    const tt = (key, vars) => tRaw(lang, key, vars);
    const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;
    const bodyHtml = `
      <h2 style="color: #0a1628; margin-top: 0;">${tt('email_reset_heading')}</h2>
      <p style="color: #64748b; line-height: 1.7;">${tt('email_reset_intro', { name: user.first_name })}</p>
      <p style="color: #64748b; line-height: 1.7;">${tt('email_reset_instruction', { hours: 1 })}</p>
      <a href="${resetUrl}" style="display: inline-block; background: #c9a84c; color: #0a1628; padding: 12px 28px; border-radius: 6px; text-decoration: none; font-weight: 600; margin: 16px 0;">${tt('email_reset_cta')}</a>
      <p style="color: #9ca3af; font-size: 12px; margin-top: 20px;">${tt('email_reset_ignore')}</p>
      <div style="background: #f8f6f1; border-radius: 6px; padding: 10px 14px; font-size: 12px; color: #64748b; margin-top: 12px;">
        ${tt('email_reset_altlink')} <a href="${resetUrl}" style="color: #185fa5; word-break: break-all;">${resetUrl}</a>
      </div>
    `;

    await sendEmailBrevo(user.email, tt('email_reset_subject'), emailWrapper(lang, bodyHtml));
    console.log(`📧 Email de réinitialisation envoyé à ${user.email} (${lang})`);
  } catch (err) {
    console.error('❌ Erreur envoi email reset:', err.message);
  }
};

// Email de réception de fonds
const sendFundsReceivedEmail = async (user, amount, senderNote, newBalance, senderName, lang = 'fr') => {
  console.log(`📧 Tentative envoi email réception → ${user?.email}, montant: ${amount}`);
  try {
    const tt = (key, vars) => tRaw(lang, key, vars);
    const bodyHtml = `
      <div style="background: #eaf3de; border-radius: 10px; padding: 20px; text-align: center; margin-bottom: 24px;">
        <div style="font-size: 13px; color: #3b6d11; margin-bottom: 6px;">${tt('email_funds_received_label')}</div>
        <div style="font-size: 36px; font-weight: bold; color: #0a1628;">+${amount.toLocaleString('fr-FR')} €</div>
      </div>
      <h2 style="color: #0a1628; margin-top: 0;">${tt('email_funds_heading', { name: user.first_name })}</h2>
      <p style="color: #64748b; line-height: 1.7;">${tt('email_funds_intro')}</p>
      <div style="background: #f8f6f1; border-radius: 8px; padding: 16px; margin: 20px 0;">
        <div style="display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid #e8e2d6; font-size: 14px;">
          <span style="color: #64748b;">${tt('email_funds_account_credited')}</span>
          <strong style="font-family: monospace;">${user.account_number}</strong>
        </div>
        <div style="display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid #e8e2d6; font-size: 14px;">
          <span style="color: #64748b;">${tt('email_funds_amount')}</span>
          <strong style="color: #3b6d11;">+${amount.toLocaleString('fr-FR')} €</strong>
        </div>
        <div style="display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid #e8e2d6; font-size: 14px;">
          <span style="color: #64748b;">${tt('email_funds_sender')}</span>
          <strong>${senderName || tt('email_funds_sender_default')}</strong>
        </div>
        ${senderNote ? `<div style="display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid #e8e2d6; font-size: 14px;">
          <span style="color: #64748b;">${tt('email_funds_motif')}</span>
          <strong>${senderNote}</strong>
        </div>` : ''}
        <div style="display: flex; justify-content: space-between; padding: 6px 0; font-size: 14px;">
          <span style="color: #64748b;">${tt('email_funds_new_balance')}</span>
          <strong style="color: #0a1628; font-size: 16px;">${newBalance.toLocaleString('fr-FR')} €</strong>
        </div>
      </div>
      <a href="${process.env.FRONTEND_URL}/client" style="display: inline-block; background: #0a1628; color: #fff; padding: 12px 28px; border-radius: 6px; text-decoration: none; font-weight: 500; margin-top: 8px;">${tt('email_cta_view_account')}</a>
    `;

    await sendEmailBrevo(user.email, tt('email_funds_subject', { amount: amount.toLocaleString('fr-FR') }), emailWrapper(lang, bodyHtml));
    console.log(`📧 Email de réception envoyé à ${user.email} (${lang})`);
  } catch (err) {
    console.error('❌ Erreur envoi email réception:', err.message);
  }
};

// Email confirmation demande de retrait (au client)
const sendWithdrawalRequestEmail = async (user, amount, reference, lang = 'fr') => {
  console.log(`📧 Tentative envoi email retrait → ${user?.email}, montant: ${amount}`);
  try {
    const tt = (key, vars) => tRaw(lang, key, vars);
    const bodyHtml = `
      <div style="background:#FAEEDA;border-radius:10px;padding:20px;text-align:center;margin-bottom:24px;">
        <div style="font-size:13px;color:#854F0B;margin-bottom:6px;">${tt('email_wreq_pending_label')}</div>
        <div style="font-size:36px;font-weight:bold;color:#0a1628;">${amount.toLocaleString('fr-FR')} €</div>
      </div>
      <h2 style="color:#0a1628;margin-top:0;">${tt('email_wreq_heading', { name: user.first_name })}</h2>
      <p style="color:#64748b;line-height:1.7;">${tt('email_wreq_intro')}</p>
      <div style="background:#f8f6f1;border-radius:8px;padding:16px;margin:20px 0;">
        <div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid #e8e2d6;font-size:14px;">
          <span style="color:#64748b;">${tt('email_wreq_reference')}</span>
          <strong style="font-family:monospace;">${reference}</strong>
        </div>
        <div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid #e8e2d6;font-size:14px;">
          <span style="color:#64748b;">${tt('email_wreq_amount_requested')}</span>
          <strong style="color:#854F0B;">${amount.toLocaleString('fr-FR')} €</strong>
        </div>
        <div style="display:flex;justify-content:space-between;padding:6px 0;font-size:14px;">
          <span style="color:#64748b;">${tt('email_wreq_status')}</span>
          <strong style="color:#854F0B;">${tt('email_wreq_status_pending')}</strong>
        </div>
      </div>
      <p style="color:#64748b;font-size:13px;">${tt('email_wreq_note')}</p>
      <a href="${process.env.FRONTEND_URL}/client" style="display:inline-block;background:#0a1628;color:#fff;padding:12px 28px;border-radius:6px;text-decoration:none;font-weight:500;margin-top:8px;">${tt('email_cta_view_account')}</a>
    `;

    await sendEmailBrevo(user.email, tt('email_wreq_subject'), emailWrapper(lang, bodyHtml));
    console.log(`📧 Email demande retrait envoyé à ${user.email} (${lang})`);
  } catch (err) {
    console.error('❌ Erreur email retrait:', err.message);
  }
};

// Email validation/rejet retrait par l'admin
const sendWithdrawalStatusEmail = async (user, amount, status, adminNote, newBalance, feeLevel, nextLevel, feeLevels, lang = 'fr') => {
  const tt = (key, vars) => tRaw(lang, key, vars);

  // Cas fee_validated : email intermédiaire
  if (status === 'fee_validated' && feeLevels && nextLevel !== undefined) {
    const fee = feeLevels[feeLevel];
    const nextFee = feeLevels[nextLevel];
    try {
      const bodyHtml = `
        <h2 style="color:#0a1628;margin-top:0;">${tt('email_wstatus_heading', { name: user.first_name })}</h2>
        <div style="background:#EAF3DE;border-radius:10px;padding:16px;margin-bottom:16px;">
          <strong style="color:#3B6D11;">✓ ${tt('email_wstatus_fee_confirmed', { feeName: fee.name, amount: fee.amount.toLocaleString('fr-FR') })}</strong>
        </div>
        <p style="color:#64748b;">${tt('email_wstatus_next_step')} <strong>${nextFee.name}</strong> (${nextFee.amount.toLocaleString('fr-FR')} €)</p>
        <p style="color:#64748b;font-size:13px;">${tt('email_wstatus_login_prompt')}</p>
        <a href="${process.env.FRONTEND_URL}/client" style="display:inline-block;background:#0a1628;color:#fff;padding:12px 28px;border-radius:6px;text-decoration:none;font-weight:500;">${tt('email_cta_view_account')}</a>
      `;
      await sendEmailBrevo(user.email, tt('email_wstatus_fee_subject', { level: feeLevel + 1 }), emailWrapper(lang, bodyHtml));
    } catch (err) {
      console.error('Erreur email fee_validated:', err.message);
    }
    return;
  }

  const approved = status === 'approved';
  const amountStr = amount.toLocaleString('fr-FR');
  const balanceStr = newBalance ? newBalance.toLocaleString('fr-FR') : '0';
  const statusLabel = approved ? tt('email_wstatus_approved_label') : tt('email_wstatus_rejected_label');
  const bgColor = approved ? '#EAF3DE' : '#FCEBEB';
  const textColor = approved ? '#3B6D11' : '#A32D2D';
  const msgBody = approved ? tt('email_wstatus_approved_msg') : tt('email_wstatus_rejected_msg');
  const amountColor = approved ? '#A32D2D' : '#64748b';
  const amountSign = approved ? '-' : '';
  const adminNoteRow = adminNote
    ? `<tr><td style="padding:6px 0;color:#64748b;font-size:14px;">${tt('email_wstatus_note_label')}</td><td style="padding:6px 0;font-size:14px;text-align:right;"><strong>${adminNote}</strong></td></tr>`
    : '';
  const balanceRow = approved
    ? `<tr><td style="padding:6px 0;color:#64748b;font-size:14px;">${tt('email_wstatus_new_balance_label')}</td><td style="padding:6px 0;text-align:right;"><strong style="color:#0a1628;font-size:16px;">${balanceStr} €</strong></td></tr>`
    : '';

  try {
    const bodyHtml = `
      <div style="background:${bgColor};border-radius:10px;padding:20px;text-align:center;margin-bottom:24px;">
        <div style="font-size:13px;color:${textColor};margin-bottom:6px;">${statusLabel}</div>
        <div style="font-size:36px;font-weight:bold;color:#0a1628;">${amountStr} €</div>
      </div>
      <h2 style="color:#0a1628;margin-top:0;">${tt('email_wstatus_heading', { name: user.first_name })}</h2>
      <p style="color:#64748b;line-height:1.7;">${msgBody}</p>
      <table style="width:100%;background:#f8f6f1;border-radius:8px;padding:16px;margin:20px 0;border-collapse:collapse;"><tbody>
        <tr><td style="padding:6px 0;color:#64748b;font-size:14px;">${tt('email_wstatus_amount_label')}</td><td style="padding:6px 0;font-size:14px;text-align:right;"><strong style="color:${amountColor};">${amountSign}${amountStr} €</strong></td></tr>
        ${adminNoteRow}
        ${balanceRow}
      </tbody></table>
      <a href="${process.env.FRONTEND_URL}/client" style="display:inline-block;background:#0a1628;color:#fff;padding:12px 28px;border-radius:6px;text-decoration:none;font-weight:500;margin-top:8px;">${tt('email_cta_view_account')}</a>
    `;

    const subject = approved
      ? tt('email_wstatus_approved_subject', { amount: amountStr })
      : tt('email_wstatus_rejected_subject');

    await sendEmailBrevo(user.email, subject, emailWrapper(lang, bodyHtml));
    console.log(`📧 Email statut retrait envoyé à ${user.email} (${lang})`);
  } catch (err) {
    console.error('❌ Erreur email statut retrait:', err.message);
  }
};

module.exports = { sendWelcomeEmail, sendPasswordResetEmail, sendFundsReceivedEmail, sendWithdrawalRequestEmail, sendWithdrawalStatusEmail };
