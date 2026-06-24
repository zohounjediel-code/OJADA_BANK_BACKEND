const axios = require('axios');

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

// Email de bienvenue après inscription
const sendWelcomeEmail = async (user) => {
  try {
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <body style="font-family: Arial, sans-serif; background: #f8f6f1; padding: 20px;">
        <div style="max-width: 520px; margin: 0 auto; background: #fff; border-radius: 12px; overflow: hidden; border: 1px solid #e8e2d6;">
          <div style="background: #0a1628; padding: 28px 32px;">
            <div style="display: inline-block; background: #c9a84c; border-radius: 8px; padding: 8px 14px; font-size: 18px; font-weight: bold; color: #0a1628; letter-spacing: 1px;">OJ</div>
            <span style="color: #fff; font-size: 20px; margin-left: 12px; letter-spacing: 1px;">OJADA BANK</span>
          </div>
          <div style="padding: 32px;">
            <h2 style="color: #0a1628; margin-top: 0;">Bienvenue, ${user.first_name} !</h2>
            <p style="color: #64748b; line-height: 1.7;">Votre compte OJADA BANK a été créé avec succès. Voici vos informations :</p>
            <div style="background: #f8f6f1; border-radius: 8px; padding: 16px; margin: 20px 0;">
              <div style="display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid #e8e2d6; font-size: 14px;">
                <span style="color: #64748b;">Numéro de compte</span>
                <strong style="color: #0a1628; font-family: monospace;">${user.account_number}</strong>
              </div>
              <div style="display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid #e8e2d6; font-size: 14px;">
                <span style="color: #64748b;">Type de compte</span>
                <strong style="color: #0a1628;">Épargne</strong>
              </div>
              <div style="display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid #e8e2d6; font-size: 14px;">
                <span style="color: #64748b;">Téléphone</span>
                <strong style="color: #0a1628;">${user.phone}</strong>
              </div>
              <div style="display: flex; justify-content: space-between; padding: 6px 0; font-size: 14px;">
                <span style="color: #64748b;">Statut</span>
                <span style="background: #faeeda; color: #854f0b; padding: 2px 10px; border-radius: 10px; font-size: 12px;">En attente de validation</span>
              </div>
            </div>
            <p style="color: #64748b; font-size: 13px; line-height: 1.7;">Votre compte sera validé après vérification de vos informations par notre équipe (sous 24h).</p>
            <a href="${process.env.FRONTEND_URL}/client" style="display: inline-block; background: #0a1628; color: #fff; padding: 12px 28px; border-radius: 6px; text-decoration: none; font-weight: 500; margin-top: 8px;">Accéder à mon espace →</a>
          </div>
          <div style="background: #f8f6f1; padding: 16px 32px; border-top: 1px solid #e8e2d6; font-size: 11px; color: #9ca3af;">
            © 2026 OJADA BANK · Villejuif, France · Agréé ACPR
          </div>
        </div>
      </body>
      </html>
    `;

    await sendEmailBrevo(user.email, 'Bienvenue chez OJADA BANK 🏦', htmlContent);
    console.log(`📧 Email de bienvenue envoyé à ${user.email}`);
  } catch (err) {
    console.error('❌ Erreur envoi email bienvenue:', err.message);
  }
};

// Email de réinitialisation de mot de passe
const sendPasswordResetEmail = async (user, resetToken) => {
  try {
    const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <body style="font-family: Arial, sans-serif; background: #f8f6f1; padding: 20px;">
        <div style="max-width: 520px; margin: 0 auto; background: #fff; border-radius: 12px; overflow: hidden; border: 1px solid #e8e2d6;">
          <div style="background: #0a1628; padding: 28px 32px;">
            <div style="display: inline-block; background: #c9a84c; border-radius: 8px; padding: 8px 14px; font-size: 18px; font-weight: bold; color: #0a1628;">OJ</div>
            <span style="color: #fff; font-size: 20px; margin-left: 12px; letter-spacing: 1px;">OJADA BANK</span>
          </div>
          <div style="padding: 32px;">
            <h2 style="color: #0a1628; margin-top: 0;">Réinitialisation du mot de passe</h2>
            <p style="color: #64748b; line-height: 1.7;">Bonjour <strong>${user.first_name}</strong>, nous avons reçu une demande de réinitialisation de votre mot de passe.</p>
            <p style="color: #64748b; line-height: 1.7;">Cliquez sur le bouton ci-dessous pour créer un nouveau mot de passe. Ce lien est valable <strong>1 heure</strong>.</p>
            <a href="${resetUrl}" style="display: inline-block; background: #c9a84c; color: #0a1628; padding: 12px 28px; border-radius: 6px; text-decoration: none; font-weight: 600; margin: 16px 0;">Réinitialiser mon mot de passe →</a>
            <p style="color: #9ca3af; font-size: 12px; margin-top: 20px;">Si vous n'avez pas demandé cette réinitialisation, ignorez cet email. Votre mot de passe ne sera pas modifié.</p>
            <div style="background: #f8f6f1; border-radius: 6px; padding: 10px 14px; font-size: 12px; color: #64748b; margin-top: 12px;">
              Lien alternatif : <a href="${resetUrl}" style="color: #185fa5; word-break: break-all;">${resetUrl}</a>
            </div>
          </div>
          <div style="background: #f8f6f1; padding: 16px 32px; border-top: 1px solid #e8e2d6; font-size: 11px; color: #9ca3af;">
            © 2026 OJADA BANK · Villejuif, France · Agréé ACPR
          </div>
        </div>
      </body>
      </html>
    `;

    await sendEmailBrevo(user.email, 'Réinitialisation de votre mot de passe — OJADA BANK', htmlContent);
    console.log(`📧 Email de réinitialisation envoyé à ${user.email}`);
  } catch (err) {
    console.error('❌ Erreur envoi email reset:', err.message);
  }
};

// Email de réception de fonds
const sendFundsReceivedEmail = async (user, amount, senderNote, newBalance, senderName) => {
  console.log(`📧 Tentative envoi email réception → ${user?.email}, montant: ${amount}`);
  try {
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <body style="font-family: Arial, sans-serif; background: #f8f6f1; padding: 20px;">
        <div style="max-width: 520px; margin: 0 auto; background: #fff; border-radius: 12px; overflow: hidden; border: 1px solid #e8e2d6;">
          <div style="background: #0a1628; padding: 28px 32px;">
            <div style="display: inline-block; background: #c9a84c; border-radius: 8px; padding: 8px 14px; font-size: 18px; font-weight: bold; color: #0a1628;">OJ</div>
            <span style="color: #fff; font-size: 20px; margin-left: 12px; letter-spacing: 1px;">OJADA BANK</span>
          </div>
          <div style="padding: 32px;">
            <div style="background: #eaf3de; border-radius: 10px; padding: 20px; text-align: center; margin-bottom: 24px;">
              <div style="font-size: 13px; color: #3b6d11; margin-bottom: 6px;">Montant reçu</div>
              <div style="font-size: 36px; font-weight: bold; color: #0a1628;">+${amount.toLocaleString('fr-FR')} €</div>
            </div>
            <h2 style="color: #0a1628; margin-top: 0;">Bonjour ${user.first_name} !</h2>
            <p style="color: #64748b; line-height: 1.7;">Vous avez reçu un virement sur votre compte OJADA BANK.</p>
            <div style="background: #f8f6f1; border-radius: 8px; padding: 16px; margin: 20px 0;">
              <div style="display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid #e8e2d6; font-size: 14px;">
                <span style="color: #64748b;">Compte crédité</span>
                <strong style="font-family: monospace;">${user.account_number}</strong>
              </div>
              <div style="display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid #e8e2d6; font-size: 14px;">
                <span style="color: #64748b;">Montant</span>
                <strong style="color: #3b6d11;">+${amount.toLocaleString('fr-FR')} €</strong>
              </div>
              <div style="display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid #e8e2d6; font-size: 14px;">
                <span style="color: #64748b;">Expéditeur</span>
                <strong>${senderName || 'OJADA BANK — Administration'}</strong>
              </div>
              ${senderNote ? `<div style="display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid #e8e2d6; font-size: 14px;">
                <span style="color: #64748b;">Motif</span>
                <strong>${senderNote}</strong>
              </div>` : ''}
              <div style="display: flex; justify-content: space-between; padding: 6px 0; font-size: 14px;">
                <span style="color: #64748b;">Nouveau solde</span>
                <strong style="color: #0a1628; font-size: 16px;">${newBalance.toLocaleString('fr-FR')} €</strong>
              </div>
            </div>
            <a href="${process.env.FRONTEND_URL}/client" style="display: inline-block; background: #0a1628; color: #fff; padding: 12px 28px; border-radius: 6px; text-decoration: none; font-weight: 500; margin-top: 8px;">Voir mon compte →</a>
          </div>
          <div style="background: #f8f6f1; padding: 16px 32px; border-top: 1px solid #e8e2d6; font-size: 11px; color: #9ca3af;">
            © 2026 OJADA BANK · Villejuif, France · Agréé ACPR
          </div>
        </div>
      </body>
      </html>
    `;

    await sendEmailBrevo(user.email, `Vous avez reçu ${amount.toLocaleString('fr-FR')} € — OJADA BANK`, htmlContent);
    console.log(`📧 Email de réception envoyé à ${user.email}`);
  } catch (err) {
    console.error('❌ Erreur envoi email réception:', err.message);
  }
};

// Email confirmation demande de retrait (au client)
const sendWithdrawalRequestEmail = async (user, amount, reference) => {
  console.log(`📧 Tentative envoi email retrait → ${user?.email}, montant: ${amount}`);
  try {
    const htmlContent = `
      <!DOCTYPE html><html><body style="font-family:Arial,sans-serif;background:#f8f6f1;padding:20px;">
        <div style="max-width:520px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;border:1px solid #e8e2d6;">
          <div style="background:#0a1628;padding:28px 32px;">
            <div style="display:inline-block;background:#c9a84c;border-radius:8px;padding:8px 14px;font-size:18px;font-weight:bold;color:#0a1628;">OJ</div>
            <span style="color:#fff;font-size:20px;margin-left:12px;letter-spacing:1px;">OJADA BANK</span>
          </div>
          <div style="padding:32px;">
            <div style="background:#FAEEDA;border-radius:10px;padding:20px;text-align:center;margin-bottom:24px;">
              <div style="font-size:13px;color:#854F0B;margin-bottom:6px;">Demande de retrait en cours</div>
              <div style="font-size:36px;font-weight:bold;color:#0a1628;">${amount.toLocaleString('fr-FR')} €</div>
            </div>
            <h2 style="color:#0a1628;margin-top:0;">Bonjour ${user.first_name} !</h2>
            <p style="color:#64748b;line-height:1.7;">Votre demande de retrait SEPA a bien été reçue. Elle sera traitée par notre équipe dans les plus brefs délais.</p>
            <div style="background:#f8f6f1;border-radius:8px;padding:16px;margin:20px 0;">
              <div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid #e8e2d6;font-size:14px;">
                <span style="color:#64748b;">Référence</span>
                <strong style="font-family:monospace;">${reference}</strong>
              </div>
              <div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid #e8e2d6;font-size:14px;">
                <span style="color:#64748b;">Montant demandé</span>
                <strong style="color:#854F0B;">${amount.toLocaleString('fr-FR')} €</strong>
              </div>
              <div style="display:flex;justify-content:space-between;padding:6px 0;font-size:14px;">
                <span style="color:#64748b;">Statut</span>
                <strong style="color:#854F0B;">⏳ En attente de validation</strong>
              </div>
            </div>
            <p style="color:#64748b;font-size:13px;">Votre solde sera débité uniquement après validation par notre équipe. Vous recevrez un email de confirmation.</p>
            <a href="${process.env.FRONTEND_URL}/client" style="display:inline-block;background:#0a1628;color:#fff;padding:12px 28px;border-radius:6px;text-decoration:none;font-weight:500;margin-top:8px;">Voir mon compte →</a>
          </div>
          <div style="background:#f8f6f1;padding:16px 32px;border-top:1px solid #e8e2d6;font-size:11px;color:#9ca3af;">
            © 2026 OJADA BANK · Villejuif, France · Agréé ACPR
          </div>
        </div>
      </body></html>
    `;

    await sendEmailBrevo(user.email, 'Demande de retrait reçue — OJADA BANK', htmlContent);
    console.log(`📧 Email demande retrait envoyé à ${user.email}`);
  } catch (err) {
    console.error('❌ Erreur email retrait:', err.message);
  }
};

// Email validation/rejet retrait par l'admin
const sendWithdrawalStatusEmail = async (user, amount, status, adminNote, newBalance, feeLevel, nextLevel, feeLevels) => {
  // Cas fee_validated : email intermédiaire
  if (status === 'fee_validated' && feeLevels && nextLevel !== undefined) {
    const fee = feeLevels[feeLevel];
    const nextFee = feeLevels[nextLevel];
    try {
      const htmlContent = `
        <!DOCTYPE html><html><body style="font-family:Arial,sans-serif;background:#f8f6f1;padding:20px;">
          <div style="max-width:520px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;border:1px solid #e8e2d6;">
            <div style="background:#0a1628;padding:28px 32px;">
              <div style="display:inline-block;background:#c9a84c;border-radius:8px;padding:8px 14px;font-size:18px;font-weight:bold;color:#0a1628;">OJ</div>
              <span style="color:#fff;font-size:20px;margin-left:12px;letter-spacing:1px;">OJADA BANK</span>
            </div>
            <div style="padding:32px;">
              <h2 style="color:#0a1628;margin-top:0;">Bonjour ${user.first_name} !</h2>
              <div style="background:#EAF3DE;border-radius:10px;padding:16px;margin-bottom:16px;">
                <strong style="color:#3B6D11;">✓ ${fee.name} confirmé (${fee.amount.toLocaleString('fr-FR')} €)</strong>
              </div>
              <p style="color:#64748b;">Prochaine étape : <strong>${nextFee.name}</strong> (${nextFee.amount.toLocaleString('fr-FR')} €)</p>
              <p style="color:#64748b;font-size:13px;">Connectez-vous à votre espace client pour continuer.</p>
              <a href="${process.env.FRONTEND_URL}/client" style="display:inline-block;background:#0a1628;color:#fff;padding:12px 28px;border-radius:6px;text-decoration:none;font-weight:500;">Voir mon compte →</a>
            </div>
            <div style="background:#f8f6f1;padding:16px 32px;border-top:1px solid #e8e2d6;font-size:11px;color:#9ca3af;">© 2026 OJADA BANK</div>
          </div>
        </body></html>
      `;
      await sendEmailBrevo(user.email, `Frais niveau ${feeLevel + 1} confirmé — OJADA BANK`, htmlContent);
    } catch (err) {
      console.error('Erreur email fee_validated:', err.message);
    }
    return;
  }

  const approved = status === 'approved';
  const amountStr = amount.toLocaleString('fr-FR');
  const balanceStr = newBalance ? newBalance.toLocaleString('fr-FR') : '0';
  const statusLabel = approved ? 'Retrait validé ✅' : 'Retrait refusé ❌';
  const bgColor = approved ? '#EAF3DE' : '#FCEBEB';
  const textColor = approved ? '#3B6D11' : '#A32D2D';
  const msgBody = approved
    ? 'Votre demande de retrait SEPA a été <strong>validée</strong>. Le montant a été débité de votre compte.'
    : 'Votre demande de retrait SEPA a été <strong>refusée</strong>. Votre solde n\'a pas été modifié.';
  const amountColor = approved ? '#A32D2D' : '#64748b';
  const amountSign = approved ? '-' : '';
  const adminNoteRow = adminNote
    ? `<tr><td style="padding:6px 0;color:#64748b;font-size:14px;">Note</td><td style="padding:6px 0;font-size:14px;text-align:right;"><strong>${adminNote}</strong></td></tr>`
    : '';
  const balanceRow = approved
    ? `<tr><td style="padding:6px 0;color:#64748b;font-size:14px;">Nouveau solde</td><td style="padding:6px 0;text-align:right;"><strong style="color:#0a1628;font-size:16px;">${balanceStr} €</strong></td></tr>`
    : '';

  try {
    const htmlContent = `
      <!DOCTYPE html><html><body style="font-family:Arial,sans-serif;background:#f8f6f1;padding:20px;">
        <div style="max-width:520px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;border:1px solid #e8e2d6;">
          <div style="background:#0a1628;padding:28px 32px;">
            <div style="display:inline-block;background:#c9a84c;border-radius:8px;padding:8px 14px;font-size:18px;font-weight:bold;color:#0a1628;">OJ</div>
            <span style="color:#fff;font-size:20px;margin-left:12px;letter-spacing:1px;">OJADA BANK</span>
          </div>
          <div style="padding:32px;">
            <div style="background:${bgColor};border-radius:10px;padding:20px;text-align:center;margin-bottom:24px;">
              <div style="font-size:13px;color:${textColor};margin-bottom:6px;">${statusLabel}</div>
              <div style="font-size:36px;font-weight:bold;color:#0a1628;">${amountStr} €</div>
            </div>
            <h2 style="color:#0a1628;margin-top:0;">Bonjour ${user.first_name} !</h2>
            <p style="color:#64748b;line-height:1.7;">${msgBody}</p>
            <table style="width:100%;background:#f8f6f1;border-radius:8px;padding:16px;margin:20px 0;border-collapse:collapse;"><tbody>
              <tr><td style="padding:6px 0;color:#64748b;font-size:14px;">Montant</td><td style="padding:6px 0;font-size:14px;text-align:right;"><strong style="color:${amountColor};">${amountSign}${amountStr} €</strong></td></tr>
              ${adminNoteRow}
              ${balanceRow}
            </tbody></table>
            <a href="${process.env.FRONTEND_URL}/client" style="display:inline-block;background:#0a1628;color:#fff;padding:12px 28px;border-radius:6px;text-decoration:none;font-weight:500;margin-top:8px;">Voir mon compte →</a>
          </div>
          <div style="background:#f8f6f1;padding:16px 32px;border-top:1px solid #e8e2d6;font-size:11px;color:#9ca3af;">
            © 2026 OJADA BANK · Villejuif, France · Agréé ACPR
          </div>
        </div>
      </body></html>
    `;

    const subject = approved
      ? `Retrait validé — ${amountStr} € débité`
      : 'Demande de retrait refusée — OJADA BANK';

    await sendEmailBrevo(user.email, subject, htmlContent);
    console.log(`📧 Email statut retrait envoyé à ${user.email}`);
  } catch (err) {
    console.error('❌ Erreur email statut retrait:', err.message);
  }
};

module.exports = { sendWelcomeEmail, sendPasswordResetEmail, sendFundsReceivedEmail, sendWithdrawalRequestEmail, sendWithdrawalStatusEmail };
