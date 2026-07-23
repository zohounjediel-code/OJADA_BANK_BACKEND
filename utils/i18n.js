// ─── MOTEUR DE TRADUCTION BACKEND (FR / EN / DE / ES) ─────────────
// Utilisation : const { t } = require('../utils/i18n');
//               return res.json({ message: t(req, 'login_success') });
//
// Détection de la langue, par ordre de priorité :
//   1. Paramètre explicite ?lang= ou body.lang (ex: à l'inscription)
//   2. Langue préférée enregistrée sur le compte (req.user.preferred_language)
//   3. Header HTTP Accept-Language envoyé par le navigateur
//   4. Français par défaut

const SUPPORTED_LANGUAGES = ['fr', 'en', 'de', 'es'];
const DEFAULT_LANGUAGE = 'fr';

const translations = {
  fr: {
    // ── Inscription ──
    err_email_not_gmail: 'Seules les adresses Gmail (@gmail.com) sont acceptées.',
    err_email_exists: 'Un compte existe déjà avec cette adresse email.',
    welcome_notif_title: 'Bienvenue chez OJADA BANK 🎉',
    welcome_notif_body: 'Bonjour {{name}} ! Votre compte {{account}} a été créé avec succès. Il sera validé après vérification sous 24h.',
    register_success: 'Compte créé avec succès ! Un email de bienvenue vous a été envoyé.',

    // ── Connexion client ──
    err_login_invalid: 'Email ou mot de passe incorrect.',
    login_success: 'Connexion réussie.',
    err_status_rejected: "Votre demande d'inscription a été refusée. Contactez notre support pour plus d'informations.",
    err_status_deleted: "Ce compte a été fermé. Contactez notre support pour plus d'informations.",
    err_status_suspended: 'Votre compte est actuellement suspendu. Contactez notre support.',
    err_status_blocked: 'Votre compte est bloqué. Contactez notre support.',

    // ── Connexion admin ──
    err_admin_invalid: 'Identifiants administrateur incorrects.',
    admin_login_success: 'Connexion administrateur réussie.',

    // ── Déconnexion ──
    logout_success: 'Déconnexion réussie.',

    // ── Mot de passe oublié / réinitialisation ──
    forgot_password_sent: 'Si un compte existe avec cette adresse, un email de réinitialisation a été envoyé.',
    err_reset_invalid: 'Lien de réinitialisation invalide ou expiré.',
    reset_success: 'Mot de passe réinitialisé avec succès.',
    err_token_invalid: 'Lien invalide ou expiré.',
    token_valid: 'Token valide.',

    // ── Profil ──
    err_user_not_found: 'Utilisateur introuvable.',

    // ── Générique ──
    // ── Emails ──
    email_footer: '© 2026 OJADA BANK · Villejuif, France · Agréé ACPR',
    email_cta_account: 'Accéder à mon espace →',
    email_cta_view_account: 'Voir mon compte →',

    email_welcome_subject: 'Bienvenue chez OJADA BANK 🏦',
    email_welcome_heading: 'Bienvenue, {{name}} !',
    email_welcome_intro: 'Votre compte OJADA BANK a été créé avec succès. Voici vos informations :',
    email_welcome_account_number: 'Numéro de compte',
    email_welcome_account_type: 'Type de compte',
    email_welcome_account_type_value: 'Épargne',
    email_welcome_phone: 'Téléphone',
    email_welcome_status: 'Statut',
    email_welcome_status_pending: 'En attente de validation',
    email_welcome_note: 'Votre compte sera validé après vérification de vos informations par notre équipe (sous 24h).',

    email_reset_subject: 'Réinitialisation de votre mot de passe — OJADA BANK',
    email_reset_heading: 'Réinitialisation du mot de passe',
    email_reset_intro: 'Bonjour {{name}}, nous avons reçu une demande de réinitialisation de votre mot de passe.',
    email_reset_instruction: 'Cliquez sur le bouton ci-dessous pour créer un nouveau mot de passe. Ce lien est valable {{hours}} heure.',
    email_reset_cta: 'Réinitialiser mon mot de passe →',
    email_reset_ignore: "Si vous n'avez pas demandé cette réinitialisation, ignorez cet email. Votre mot de passe ne sera pas modifié.",
    email_reset_altlink: 'Lien alternatif :',

    email_funds_subject: 'Vous avez reçu {{amount}} € — OJADA BANK',
    email_funds_received_label: 'Montant reçu',
    email_funds_heading: 'Bonjour {{name}} !',
    email_funds_intro: 'Vous avez reçu un virement sur votre compte OJADA BANK.',
    email_funds_account_credited: 'Compte crédité',
    email_funds_amount: 'Montant',
    email_funds_sender: 'Expéditeur',
    email_funds_sender_default: 'OJADA BANK — Administration',
    email_funds_motif: 'Motif',
    email_funds_new_balance: 'Nouveau solde',

    email_wreq_subject: 'Demande de retrait reçue — OJADA BANK',
    email_wreq_pending_label: 'Demande de retrait en cours',
    email_wreq_heading: 'Bonjour {{name}} !',
    email_wreq_intro: 'Votre demande de retrait SEPA a bien été reçue. Elle sera traitée par notre équipe dans les plus brefs délais.',
    email_wreq_reference: 'Référence',
    email_wreq_amount_requested: 'Montant demandé',
    email_wreq_status: 'Statut',
    email_wreq_status_pending: '⏳ En attente de validation',
    email_wreq_note: 'Votre solde sera débité uniquement après validation par notre équipe. Vous recevrez un email de confirmation.',

    email_wstatus_fee_confirmed: '{{feeName}} confirmé ({{amount}} €)',
    email_wstatus_next_step: 'Prochaine étape :',
    email_wstatus_login_prompt: 'Connectez-vous à votre espace client pour continuer.',
    email_wstatus_fee_subject: 'Frais niveau {{level}} confirmé — OJADA BANK',
    email_wstatus_heading: 'Bonjour {{name}} !',
    email_wstatus_approved_label: 'Retrait validé ✅',
    email_wstatus_rejected_label: 'Retrait refusé ❌',
    email_wstatus_approved_msg: 'Votre demande de retrait SEPA a été <strong>validée</strong>. Le montant a été débité de votre compte.',
    email_wstatus_rejected_msg: "Votre demande de retrait SEPA a été <strong>refusée</strong>. Votre solde n'a pas été modifié.",
    email_wstatus_amount_label: 'Montant',
    email_wstatus_note_label: 'Note',
    email_wstatus_new_balance_label: 'Nouveau solde',
    email_wstatus_approved_subject: 'Retrait validé — {{amount}} € débité',
    email_wstatus_rejected_subject: 'Demande de retrait refusée — OJADA BANK',

    err_server: 'Erreur serveur. Veuillez réessayer.',
  },

  en: {
    err_email_not_gmail: 'Only Gmail addresses (@gmail.com) are accepted.',
    err_email_exists: 'An account already exists with this email address.',
    welcome_notif_title: 'Welcome to OJADA BANK 🎉',
    welcome_notif_body: 'Hello {{name}}! Your account {{account}} has been successfully created. It will be validated within 24 hours after verification.',
    register_success: 'Account created successfully! A welcome email has been sent to you.',

    err_login_invalid: 'Incorrect email or password.',
    login_success: 'Login successful.',
    err_status_rejected: 'Your registration request has been rejected. Please contact our support for more information.',
    err_status_deleted: 'This account has been closed. Please contact our support for more information.',
    err_status_suspended: 'Your account is currently suspended. Please contact our support.',
    err_status_blocked: 'Your account is blocked. Please contact our support.',

    err_admin_invalid: 'Incorrect administrator credentials.',
    admin_login_success: 'Administrator login successful.',

    logout_success: 'Logged out successfully.',

    forgot_password_sent: 'If an account exists with this address, a reset email has been sent.',
    err_reset_invalid: 'Invalid or expired reset link.',
    reset_success: 'Password reset successfully.',
    err_token_invalid: 'Invalid or expired link.',
    token_valid: 'Valid token.',

    err_user_not_found: 'User not found.',

    // ── Emails ──
    email_footer: '© 2026 OJADA BANK · Villejuif, France · Approved by ACPR',
    email_cta_account: 'Go to my account →',
    email_cta_view_account: 'View my account →',

    email_welcome_subject: 'Welcome to OJADA BANK 🏦',
    email_welcome_heading: 'Welcome, {{name}}!',
    email_welcome_intro: 'Your OJADA BANK account has been successfully created. Here is your information:',
    email_welcome_account_number: 'Account number',
    email_welcome_account_type: 'Account type',
    email_welcome_account_type_value: 'Savings',
    email_welcome_phone: 'Phone',
    email_welcome_status: 'Status',
    email_welcome_status_pending: 'Pending validation',
    email_welcome_note: 'Your account will be validated after verification of your information by our team (within 24 hours).',

    email_reset_subject: 'Password reset — OJADA BANK',
    email_reset_heading: 'Password reset',
    email_reset_intro: 'Hello {{name}}, we received a request to reset your password.',
    email_reset_instruction: 'Click the button below to create a new password. This link is valid for {{hours}} hour.',
    email_reset_cta: 'Reset my password →',
    email_reset_ignore: "If you did not request this reset, ignore this email. Your password will not be changed.",
    email_reset_altlink: 'Alternative link:',

    email_funds_subject: 'You received {{amount}} € — OJADA BANK',
    email_funds_received_label: 'Amount received',
    email_funds_heading: 'Hello {{name}}!',
    email_funds_intro: 'You have received a transfer to your OJADA BANK account.',
    email_funds_account_credited: 'Account credited',
    email_funds_amount: 'Amount',
    email_funds_sender: 'Sender',
    email_funds_sender_default: 'OJADA BANK — Administration',
    email_funds_motif: 'Note',
    email_funds_new_balance: 'New balance',

    email_wreq_subject: 'Withdrawal request received — OJADA BANK',
    email_wreq_pending_label: 'Withdrawal request in progress',
    email_wreq_heading: 'Hello {{name}}!',
    email_wreq_intro: 'Your SEPA withdrawal request has been received. It will be processed by our team as soon as possible.',
    email_wreq_reference: 'Reference',
    email_wreq_amount_requested: 'Amount requested',
    email_wreq_status: 'Status',
    email_wreq_status_pending: '⏳ Pending validation',
    email_wreq_note: 'Your balance will only be debited after validation by our team. You will receive a confirmation email.',

    email_wstatus_fee_confirmed: '{{feeName}} confirmed ({{amount}} €)',
    email_wstatus_next_step: 'Next step:',
    email_wstatus_login_prompt: 'Log in to your client area to continue.',
    email_wstatus_fee_subject: 'Level {{level}} fee confirmed — OJADA BANK',
    email_wstatus_heading: 'Hello {{name}}!',
    email_wstatus_approved_label: 'Withdrawal approved ✅',
    email_wstatus_rejected_label: 'Withdrawal rejected ❌',
    email_wstatus_approved_msg: 'Your SEPA withdrawal request has been <strong>approved</strong>. The amount has been debited from your account.',
    email_wstatus_rejected_msg: "Your SEPA withdrawal request has been <strong>rejected</strong>. Your balance has not been changed.",
    email_wstatus_amount_label: 'Amount',
    email_wstatus_note_label: 'Note',
    email_wstatus_new_balance_label: 'New balance',
    email_wstatus_approved_subject: 'Withdrawal approved — {{amount}} € debited',
    email_wstatus_rejected_subject: 'Withdrawal request rejected — OJADA BANK',

    err_server: 'Server error. Please try again.',
  },

  de: {
    err_email_not_gmail: 'Es werden nur Gmail-Adressen (@gmail.com) akzeptiert.',
    err_email_exists: 'Für diese E-Mail-Adresse existiert bereits ein Konto.',
    welcome_notif_title: 'Willkommen bei OJADA BANK 🎉',
    welcome_notif_body: 'Hallo {{name}}! Ihr Konto {{account}} wurde erfolgreich erstellt. Es wird nach Überprüfung innerhalb von 24 Stunden freigeschaltet.',
    register_success: 'Konto erfolgreich erstellt! Eine Willkommens-E-Mail wurde an Sie gesendet.',

    err_login_invalid: 'E-Mail oder Passwort falsch.',
    login_success: 'Anmeldung erfolgreich.',
    err_status_rejected: 'Ihr Registrierungsantrag wurde abgelehnt. Bitte kontaktieren Sie unseren Support für weitere Informationen.',
    err_status_deleted: 'Dieses Konto wurde geschlossen. Bitte kontaktieren Sie unseren Support für weitere Informationen.',
    err_status_suspended: 'Ihr Konto ist derzeit gesperrt. Bitte kontaktieren Sie unseren Support.',
    err_status_blocked: 'Ihr Konto ist blockiert. Bitte kontaktieren Sie unseren Support.',

    err_admin_invalid: 'Falsche Administrator-Anmeldedaten.',
    admin_login_success: 'Administrator-Anmeldung erfolgreich.',

    logout_success: 'Erfolgreich abgemeldet.',

    forgot_password_sent: 'Falls ein Konto mit dieser Adresse existiert, wurde eine E-Mail zum Zurücksetzen gesendet.',
    err_reset_invalid: 'Ungültiger oder abgelaufener Link zum Zurücksetzen.',
    reset_success: 'Passwort erfolgreich zurückgesetzt.',
    err_token_invalid: 'Ungültiger oder abgelaufener Link.',
    token_valid: 'Gültiges Token.',

    err_user_not_found: 'Benutzer nicht gefunden.',

    // ── Emails ──
    email_footer: '© 2026 OJADA BANK · Villejuif, Frankreich · Zugelassen durch ACPR',
    email_cta_account: 'Zu meinem Konto →',
    email_cta_view_account: 'Mein Konto ansehen →',

    email_welcome_subject: 'Willkommen bei OJADA BANK 🏦',
    email_welcome_heading: 'Willkommen, {{name}}!',
    email_welcome_intro: 'Ihr OJADA BANK-Konto wurde erfolgreich erstellt. Hier sind Ihre Informationen:',
    email_welcome_account_number: 'Kontonummer',
    email_welcome_account_type: 'Kontotyp',
    email_welcome_account_type_value: 'Sparkonto',
    email_welcome_phone: 'Telefon',
    email_welcome_status: 'Status',
    email_welcome_status_pending: 'Ausstehende Überprüfung',
    email_welcome_note: 'Ihr Konto wird nach Überprüfung Ihrer Angaben durch unser Team freigeschaltet (innerhalb von 24 Stunden).',

    email_reset_subject: 'Passwort zurücksetzen — OJADA BANK',
    email_reset_heading: 'Passwort zurücksetzen',
    email_reset_intro: 'Hallo {{name}}, wir haben eine Anfrage zum Zurücksetzen Ihres Passworts erhalten.',
    email_reset_instruction: 'Klicken Sie auf die Schaltfläche unten, um ein neues Passwort zu erstellen. Dieser Link ist {{hours}} Stunde gültig.',
    email_reset_cta: 'Mein Passwort zurücksetzen →',
    email_reset_ignore: 'Wenn Sie dieses Zurücksetzen nicht angefordert haben, ignorieren Sie diese E-Mail. Ihr Passwort wird nicht geändert.',
    email_reset_altlink: 'Alternativer Link:',

    email_funds_subject: 'Sie haben {{amount}} € erhalten — OJADA BANK',
    email_funds_received_label: 'Erhaltener Betrag',
    email_funds_heading: 'Hallo {{name}}!',
    email_funds_intro: 'Sie haben eine Überweisung auf Ihr OJADA BANK-Konto erhalten.',
    email_funds_account_credited: 'Gutgeschriebenes Konto',
    email_funds_amount: 'Betrag',
    email_funds_sender: 'Absender',
    email_funds_sender_default: 'OJADA BANK — Verwaltung',
    email_funds_motif: 'Verwendungszweck',
    email_funds_new_balance: 'Neuer Kontostand',

    email_wreq_subject: 'Auszahlungsantrag erhalten — OJADA BANK',
    email_wreq_pending_label: 'Auszahlungsantrag in Bearbeitung',
    email_wreq_heading: 'Hallo {{name}}!',
    email_wreq_intro: 'Ihr SEPA-Auszahlungsantrag wurde erhalten. Er wird von unserem Team schnellstmöglich bearbeitet.',
    email_wreq_reference: 'Referenz',
    email_wreq_amount_requested: 'Angeforderter Betrag',
    email_wreq_status: 'Status',
    email_wreq_status_pending: '⏳ Ausstehende Genehmigung',
    email_wreq_note: 'Ihr Guthaben wird erst nach Genehmigung durch unser Team abgebucht. Sie erhalten eine Bestätigungs-E-Mail.',

    email_wstatus_fee_confirmed: '{{feeName}} bestätigt ({{amount}} €)',
    email_wstatus_next_step: 'Nächster Schritt:',
    email_wstatus_login_prompt: 'Melden Sie sich in Ihrem Kundenbereich an, um fortzufahren.',
    email_wstatus_fee_subject: 'Gebühr Stufe {{level}} bestätigt — OJADA BANK',
    email_wstatus_heading: 'Hallo {{name}}!',
    email_wstatus_approved_label: 'Auszahlung genehmigt ✅',
    email_wstatus_rejected_label: 'Auszahlung abgelehnt ❌',
    email_wstatus_approved_msg: 'Ihr SEPA-Auszahlungsantrag wurde <strong>genehmigt</strong>. Der Betrag wurde von Ihrem Konto abgebucht.',
    email_wstatus_rejected_msg: 'Ihr SEPA-Auszahlungsantrag wurde <strong>abgelehnt</strong>. Ihr Guthaben wurde nicht verändert.',
    email_wstatus_amount_label: 'Betrag',
    email_wstatus_note_label: 'Notiz',
    email_wstatus_new_balance_label: 'Neuer Kontostand',
    email_wstatus_approved_subject: 'Auszahlung genehmigt — {{amount}} € abgebucht',
    email_wstatus_rejected_subject: 'Auszahlungsantrag abgelehnt — OJADA BANK',

    err_server: 'Serverfehler. Bitte versuchen Sie es erneut.',
  },

  es: {
    err_email_not_gmail: 'Solo se aceptan direcciones de Gmail (@gmail.com).',
    err_email_exists: 'Ya existe una cuenta con esta dirección de correo electrónico.',
    welcome_notif_title: 'Bienvenido/a a OJADA BANK 🎉',
    welcome_notif_body: '¡Hola {{name}}! Su cuenta {{account}} se ha creado correctamente. Se validará en un plazo de 24 horas tras la verificación.',
    register_success: '¡Cuenta creada con éxito! Se le ha enviado un correo de bienvenida.',

    err_login_invalid: 'Correo electrónico o contraseña incorrectos.',
    login_success: 'Inicio de sesión correcto.',
    err_status_rejected: 'Su solicitud de registro ha sido rechazada. Póngase en contacto con nuestro soporte para más información.',
    err_status_deleted: 'Esta cuenta ha sido cerrada. Póngase en contacto con nuestro soporte para más información.',
    err_status_suspended: 'Su cuenta está actualmente suspendida. Póngase en contacto con nuestro soporte.',
    err_status_blocked: 'Su cuenta está bloqueada. Póngase en contacto con nuestro soporte.',

    err_admin_invalid: 'Credenciales de administrador incorrectas.',
    admin_login_success: 'Inicio de sesión de administrador correcto.',

    logout_success: 'Sesión cerrada correctamente.',

    forgot_password_sent: 'Si existe una cuenta con esta dirección, se ha enviado un correo de restablecimiento.',
    err_reset_invalid: 'Enlace de restablecimiento no válido o caducado.',
    reset_success: 'Contraseña restablecida con éxito.',
    err_token_invalid: 'Enlace no válido o caducado.',
    token_valid: 'Token válido.',

    err_user_not_found: 'Usuario no encontrado.',

    // ── Emails ──
    email_footer: '© 2026 OJADA BANK · Villejuif, Francia · Autorizado por ACPR',
    email_cta_account: 'Acceder a mi cuenta →',
    email_cta_view_account: 'Ver mi cuenta →',

    email_welcome_subject: 'Bienvenido/a a OJADA BANK 🏦',
    email_welcome_heading: '¡Bienvenido/a, {{name}}!',
    email_welcome_intro: 'Su cuenta OJADA BANK se ha creado correctamente. Aquí tiene su información:',
    email_welcome_account_number: 'Número de cuenta',
    email_welcome_account_type: 'Tipo de cuenta',
    email_welcome_account_type_value: 'Ahorro',
    email_welcome_phone: 'Teléfono',
    email_welcome_status: 'Estado',
    email_welcome_status_pending: 'Pendiente de validación',
    email_welcome_note: 'Su cuenta se validará tras la verificación de sus datos por nuestro equipo (en un plazo de 24 horas).',

    email_reset_subject: 'Restablecimiento de su contraseña — OJADA BANK',
    email_reset_heading: 'Restablecimiento de contraseña',
    email_reset_intro: 'Hola {{name}}, hemos recibido una solicitud para restablecer su contraseña.',
    email_reset_instruction: 'Haga clic en el botón de abajo para crear una nueva contraseña. Este enlace es válido durante {{hours}} hora.',
    email_reset_cta: 'Restablecer mi contraseña →',
    email_reset_ignore: 'Si no solicitó este restablecimiento, ignore este correo. Su contraseña no se modificará.',
    email_reset_altlink: 'Enlace alternativo:',

    email_funds_subject: 'Ha recibido {{amount}} € — OJADA BANK',
    email_funds_received_label: 'Importe recibido',
    email_funds_heading: '¡Hola {{name}}!',
    email_funds_intro: 'Ha recibido una transferencia en su cuenta OJADA BANK.',
    email_funds_account_credited: 'Cuenta abonada',
    email_funds_amount: 'Importe',
    email_funds_sender: 'Remitente',
    email_funds_sender_default: 'OJADA BANK — Administración',
    email_funds_motif: 'Concepto',
    email_funds_new_balance: 'Nuevo saldo',

    email_wreq_subject: 'Solicitud de retiro recibida — OJADA BANK',
    email_wreq_pending_label: 'Solicitud de retiro en curso',
    email_wreq_heading: '¡Hola {{name}}!',
    email_wreq_intro: 'Su solicitud de retiro SEPA ha sido recibida. Será procesada por nuestro equipo lo antes posible.',
    email_wreq_reference: 'Referencia',
    email_wreq_amount_requested: 'Importe solicitado',
    email_wreq_status: 'Estado',
    email_wreq_status_pending: '⏳ Pendiente de validación',
    email_wreq_note: 'Su saldo solo se debitará tras la validación por parte de nuestro equipo. Recibirá un correo de confirmación.',

    email_wstatus_fee_confirmed: '{{feeName}} confirmado ({{amount}} €)',
    email_wstatus_next_step: 'Siguiente paso:',
    email_wstatus_login_prompt: 'Inicie sesión en su área de cliente para continuar.',
    email_wstatus_fee_subject: 'Tarifa de nivel {{level}} confirmada — OJADA BANK',
    email_wstatus_heading: '¡Hola {{name}}!',
    email_wstatus_approved_label: 'Retiro aprobado ✅',
    email_wstatus_rejected_label: 'Retiro rechazado ❌',
    email_wstatus_approved_msg: 'Su solicitud de retiro SEPA ha sido <strong>aprobada</strong>. El importe se ha debitado de su cuenta.',
    email_wstatus_rejected_msg: 'Su solicitud de retiro SEPA ha sido <strong>rechazada</strong>. Su saldo no se ha modificado.',
    email_wstatus_amount_label: 'Importe',
    email_wstatus_note_label: 'Nota',
    email_wstatus_new_balance_label: 'Nuevo saldo',
    email_wstatus_approved_subject: 'Retiro aprobado — {{amount}} € debitados',
    email_wstatus_rejected_subject: 'Solicitud de retiro rechazada — OJADA BANK',

    err_server: 'Error del servidor. Inténtelo de nuevo.',
  },
};

// Détecte la langue à utiliser pour une requête donnée
function detectLang(req) {
  const explicit = (req.query?.lang || req.body?.lang || '').toLowerCase();
  if (SUPPORTED_LANGUAGES.includes(explicit)) return explicit;

  if (req.user?.preferred_language && SUPPORTED_LANGUAGES.includes(req.user.preferred_language)) {
    return req.user.preferred_language;
  }

  const header = req.headers?.['accept-language'];
  if (header) {
    const primary = header.split(',')[0].split('-')[0].trim().toLowerCase();
    if (SUPPORTED_LANGUAGES.includes(primary)) return primary;
  }

  return DEFAULT_LANGUAGE;
}

// Traduit une clé pour la requête donnée, avec interpolation de variables {{var}}
function t(req, key, vars = {}) {
  const lang = detectLang(req);
  return tRaw(lang, key, vars);
}

// Traduit une clé directement à partir d'un code langue (sans objet req) —
// utile pour les emails, où l'on connaît juste user.preferred_language
function tRaw(lang, key, vars = {}) {
  const safeLang = SUPPORTED_LANGUAGES.includes(lang) ? lang : DEFAULT_LANGUAGE;
  let str = translations[safeLang]?.[key] ?? translations[DEFAULT_LANGUAGE][key] ?? key;
  Object.entries(vars).forEach(([k, v]) => {
    str = str.replace(new RegExp(`{{${k}}}`, 'g'), v);
  });
  return str;
}

module.exports = { t, tRaw, detectLang, translations, SUPPORTED_LANGUAGES, DEFAULT_LANGUAGE };
