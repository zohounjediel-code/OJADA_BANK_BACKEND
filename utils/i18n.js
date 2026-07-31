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

    // ── Client — messages généraux ──
    err_title_message_required: 'Le titre et le message sont obligatoires.',
    msg_sent_success: 'Votre message a été envoyé à notre équipe.',
    err_message_empty: 'Le message ne peut pas être vide.',
    err_notification_not_found: 'Notification introuvable.',
    reply_sent_success: 'Réponse envoyée.',
    notif_marked_read: 'Notification marquée comme lue.',
    all_notifs_marked_read: 'Toutes les notifications marquées comme lues.',

    // ── Virement ──
    err_transfer_invalid_input: 'Numéro de compte et montant valides requis.',
    err_account_suspended: 'Votre compte est suspendu.',
    err_funds_blocked_transfer: 'Vos fonds sont bloqués. Vous ne pouvez pas effectuer de virement.',
    err_self_transfer: 'Vous ne pouvez pas vous virer à vous-même.',
    err_account_not_found: 'Aucun compte trouvé avec ce numéro.',
    err_receiver_not_validated: "Le compte destinataire n'est pas encore validé et ne peut pas recevoir de virement.",
    err_receiver_suspended: 'Le compte destinataire est suspendu.',
    err_insufficient_balance_transfer: 'Solde insuffisant pour effectuer ce virement.',
    transfer_success: 'Virement effectué avec succès.',

    // ── Retrait ──
    err_invalid_installment_amount: 'Montant de tranche invalide.',
    err_request_not_found: 'Demande introuvable.',
    err_action_not_allowed_status: 'Action non autorisée pour ce statut.',
    err_amount_exceeds_remaining: 'Le montant dépasse le reste à payer ({{remaining}} €).',
    err_invalid_fee_level: 'Niveau de frais invalide.',
    err_invalid_language: 'Langue non supportée.',
    language_updated_success: 'Langue mise à jour.',
    fee_confirmation_recorded: "Confirmation enregistrée. L'admin vérifiera votre paiement.",
    installment_request_sent: 'Demande de paiement par tranche envoyée.',
    err_withdrawal_fields_required: 'Tous les champs obligatoires doivent être renseignés.',
    err_invalid_amount: 'Montant invalide.',
    err_funds_blocked_withdrawal: 'Vos fonds sont bloqués. Vous ne pouvez pas effectuer de retrait.',
    err_insufficient_balance: 'Solde insuffisant.',
    withdrawal_submitted_success: 'Demande de retrait soumise avec succès.',
    err_cannot_cancel_processing: "Impossible d'annuler : la demande est déjà en cours de traitement par notre équipe.",
    withdrawal_cancelled_success: 'Demande de retrait annulée avec succès.',
    err_card_fields_required: "IBAN, CVV et date d'expiration sont obligatoires.",
    err_cannot_modify_card_processing: 'Impossible de modifier la carte : la demande est en cours de traitement.',
    card_updated_success: 'Informations de carte mises à jour avec succès.',

    // ── Profil / mot de passe ──
    err_profile_required_fields: 'Prénom, nom et email sont requis.',
    err_email_already_used: 'Cet email est déjà utilisé.',
    profile_updated_success: 'Profil mis à jour avec succès.',
    err_password_fields_required: 'Tous les champs sont requis.',
    err_passwords_mismatch: 'Les mots de passe ne correspondent pas.',
    err_password_too_short: 'Le mot de passe doit contenir au moins 6 caractères.',
    err_current_password_incorrect: 'Mot de passe actuel incorrect.',
    password_changed_success: 'Mot de passe modifié avec succès.',

    // ── Vérification de compte (fonds bloqués) ──
    err_invalid_signature: 'Signature invalide.',
    err_funds_not_blocked: 'Vos fonds ne sont pas bloqués.',
    err_verification_already_in_progress: 'Une vérification est déjà en cours.',
    contract_signed_success: 'Contrat signé. Procédez au paiement.',
    err_no_verification_in_progress: 'Aucune vérification en cours.',
    err_payment_already_pending: 'Un paiement est déjà en attente de validation.',
    err_amount_exceeds_due: 'Montant supérieur au reste dû ({{remaining}} €).',
    payment_submitted_success: 'Paiement soumis. En attente de validation.',

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

    // ── Client — general messages ──
    err_title_message_required: 'Title and message are required.',
    msg_sent_success: 'Your message has been sent to our team.',
    err_message_empty: 'Message cannot be empty.',
    err_notification_not_found: 'Notification not found.',
    reply_sent_success: 'Reply sent.',
    notif_marked_read: 'Notification marked as read.',
    all_notifs_marked_read: 'All notifications marked as read.',

    // ── Transfer ──
    err_transfer_invalid_input: 'Valid account number and amount required.',
    err_account_suspended: 'Your account is suspended.',
    err_funds_blocked_transfer: 'Your funds are blocked. You cannot make a transfer.',
    err_self_transfer: 'You cannot transfer to yourself.',
    err_account_not_found: 'No account found with this number.',
    err_receiver_not_validated: 'The recipient account is not yet validated and cannot receive a transfer.',
    err_receiver_suspended: 'The recipient account is suspended.',
    err_insufficient_balance_transfer: 'Insufficient balance to make this transfer.',
    transfer_success: 'Transfer completed successfully.',

    // ── Withdrawal ──
    err_invalid_installment_amount: 'Invalid instalment amount.',
    err_request_not_found: 'Request not found.',
    err_action_not_allowed_status: 'Action not allowed for this status.',
    err_amount_exceeds_remaining: 'The amount exceeds the remaining balance due ({{remaining}} €).',
    err_invalid_fee_level: 'Invalid fee level.',
    err_invalid_language: 'Unsupported language.',
    language_updated_success: 'Language updated.',
    fee_confirmation_recorded: 'Confirmation recorded. Our admin will verify your payment.',
    installment_request_sent: 'Instalment payment request sent.',
    err_withdrawal_fields_required: 'All required fields must be filled in.',
    err_invalid_amount: 'Invalid amount.',
    err_funds_blocked_withdrawal: 'Your funds are blocked. You cannot make a withdrawal.',
    err_insufficient_balance: 'Insufficient balance.',
    withdrawal_submitted_success: 'Withdrawal request submitted successfully.',
    err_cannot_cancel_processing: 'Cannot cancel: the request is already being processed by our team.',
    withdrawal_cancelled_success: 'Withdrawal request cancelled successfully.',
    err_card_fields_required: 'IBAN, CVV and expiry date are required.',
    err_cannot_modify_card_processing: 'Cannot modify the card: the request is being processed.',
    card_updated_success: 'Card information updated successfully.',

    // ── Profile / password ──
    err_profile_required_fields: 'First name, last name and email are required.',
    err_email_already_used: 'This email is already in use.',
    profile_updated_success: 'Profile updated successfully.',
    err_password_fields_required: 'All fields are required.',
    err_passwords_mismatch: 'Passwords do not match.',
    err_password_too_short: 'Password must be at least 6 characters long.',
    err_current_password_incorrect: 'Current password is incorrect.',
    password_changed_success: 'Password changed successfully.',

    // ── Account verification (blocked funds) ──
    err_invalid_signature: 'Invalid signature.',
    err_funds_not_blocked: 'Your funds are not blocked.',
    err_verification_already_in_progress: 'A verification is already in progress.',
    contract_signed_success: 'Contract signed. Proceed to payment.',
    err_no_verification_in_progress: 'No verification in progress.',
    err_payment_already_pending: 'A payment is already awaiting validation.',
    err_amount_exceeds_due: 'Amount higher than the remaining balance due ({{remaining}} €).',
    payment_submitted_success: 'Payment submitted. Awaiting validation.',

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

    // ── Kunde — allgemeine Meldungen ──
    err_title_message_required: 'Titel und Nachricht sind erforderlich.',
    msg_sent_success: 'Ihre Nachricht wurde an unser Team gesendet.',
    err_message_empty: 'Die Nachricht darf nicht leer sein.',
    err_notification_not_found: 'Benachrichtigung nicht gefunden.',
    reply_sent_success: 'Antwort gesendet.',
    notif_marked_read: 'Benachrichtigung als gelesen markiert.',
    all_notifs_marked_read: 'Alle Benachrichtigungen als gelesen markiert.',

    // ── Überweisung ──
    err_transfer_invalid_input: 'Gültige Kontonummer und Betrag erforderlich.',
    err_account_suspended: 'Ihr Konto ist gesperrt.',
    err_funds_blocked_transfer: 'Ihre Guthaben sind gesperrt. Sie können keine Überweisung durchführen.',
    err_self_transfer: 'Sie können sich nicht selbst Geld überweisen.',
    err_account_not_found: 'Kein Konto mit dieser Nummer gefunden.',
    err_receiver_not_validated: 'Das Empfängerkonto ist noch nicht validiert und kann keine Überweisung empfangen.',
    err_receiver_suspended: 'Das Empfängerkonto ist gesperrt.',
    err_insufficient_balance_transfer: 'Unzureichendes Guthaben für diese Überweisung.',
    transfer_success: 'Überweisung erfolgreich durchgeführt.',

    // ── Auszahlung ──
    err_invalid_installment_amount: 'Ungültiger Ratenbetrag.',
    err_request_not_found: 'Antrag nicht gefunden.',
    err_action_not_allowed_status: 'Aktion für diesen Status nicht erlaubt.',
    err_amount_exceeds_remaining: 'Der Betrag übersteigt den ausstehenden Restbetrag ({{remaining}} €).',
    err_invalid_fee_level: 'Ungültige Gebührenstufe.',
    err_invalid_language: 'Nicht unterstützte Sprache.',
    language_updated_success: 'Sprache aktualisiert.',
    fee_confirmation_recorded: 'Bestätigung gespeichert. Unser Administrator wird Ihre Zahlung überprüfen.',
    installment_request_sent: 'Ratenzahlungsantrag gesendet.',
    err_withdrawal_fields_required: 'Alle Pflichtfelder müssen ausgefüllt werden.',
    err_invalid_amount: 'Ungültiger Betrag.',
    err_funds_blocked_withdrawal: 'Ihre Guthaben sind gesperrt. Sie können keine Auszahlung vornehmen.',
    err_insufficient_balance: 'Unzureichendes Guthaben.',
    withdrawal_submitted_success: 'Auszahlungsantrag erfolgreich eingereicht.',
    err_cannot_cancel_processing: 'Stornierung nicht möglich: Der Antrag wird bereits von unserem Team bearbeitet.',
    withdrawal_cancelled_success: 'Auszahlungsantrag erfolgreich storniert.',
    err_card_fields_required: 'IBAN, CVV und Ablaufdatum sind erforderlich.',
    err_cannot_modify_card_processing: 'Karte kann nicht geändert werden: Der Antrag wird bereits bearbeitet.',
    card_updated_success: 'Kartendaten erfolgreich aktualisiert.',

    // ── Profil / Passwort ──
    err_profile_required_fields: 'Vorname, Nachname und E-Mail sind erforderlich.',
    err_email_already_used: 'Diese E-Mail-Adresse wird bereits verwendet.',
    profile_updated_success: 'Profil erfolgreich aktualisiert.',
    err_password_fields_required: 'Alle Felder sind erforderlich.',
    err_passwords_mismatch: 'Die Passwörter stimmen nicht überein.',
    err_password_too_short: 'Das Passwort muss mindestens 6 Zeichen lang sein.',
    err_current_password_incorrect: 'Das aktuelle Passwort ist falsch.',
    password_changed_success: 'Passwort erfolgreich geändert.',

    // ── Kontoüberprüfung (gesperrte Guthaben) ──
    err_invalid_signature: 'Ungültige Unterschrift.',
    err_funds_not_blocked: 'Ihre Guthaben sind nicht gesperrt.',
    err_verification_already_in_progress: 'Eine Überprüfung läuft bereits.',
    contract_signed_success: 'Vertrag unterschrieben. Fahren Sie mit der Zahlung fort.',
    err_no_verification_in_progress: 'Keine laufende Überprüfung.',
    err_payment_already_pending: 'Eine Zahlung wartet bereits auf Bestätigung.',
    err_amount_exceeds_due: 'Betrag höher als der ausstehende Restbetrag ({{remaining}} €).',
    payment_submitted_success: 'Zahlung eingereicht. Wartet auf Bestätigung.',

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

    // ── Cliente — mensajes generales ──
    err_title_message_required: 'El título y el mensaje son obligatorios.',
    msg_sent_success: 'Su mensaje ha sido enviado a nuestro equipo.',
    err_message_empty: 'El mensaje no puede estar vacío.',
    err_notification_not_found: 'Notificación no encontrada.',
    reply_sent_success: 'Respuesta enviada.',
    notif_marked_read: 'Notificación marcada como leída.',
    all_notifs_marked_read: 'Todas las notificaciones marcadas como leídas.',

    // ── Transferencia ──
    err_transfer_invalid_input: 'Se requiere un número de cuenta y un importe válidos.',
    err_account_suspended: 'Su cuenta está suspendida.',
    err_funds_blocked_transfer: 'Sus fondos están bloqueados. No puede realizar una transferencia.',
    err_self_transfer: 'No puede transferirse dinero a sí mismo.',
    err_account_not_found: 'No se encontró ninguna cuenta con este número.',
    err_receiver_not_validated: 'La cuenta destinataria aún no está validada y no puede recibir una transferencia.',
    err_receiver_suspended: 'La cuenta destinataria está suspendida.',
    err_insufficient_balance_transfer: 'Saldo insuficiente para realizar esta transferencia.',
    transfer_success: 'Transferencia realizada con éxito.',

    // ── Retiro ──
    err_invalid_installment_amount: 'Importe de plazo no válido.',
    err_request_not_found: 'Solicitud no encontrada.',
    err_action_not_allowed_status: 'Acción no permitida para este estado.',
    err_amount_exceeds_remaining: 'El importe supera el saldo restante por pagar ({{remaining}} €).',
    err_invalid_fee_level: 'Nivel de tarifa no válido.',
    err_invalid_language: 'Idioma no compatible.',
    language_updated_success: 'Idioma actualizado.',
    fee_confirmation_recorded: 'Confirmación registrada. Nuestro administrador verificará su pago.',
    installment_request_sent: 'Solicitud de pago por plazos enviada.',
    err_withdrawal_fields_required: 'Todos los campos obligatorios deben completarse.',
    err_invalid_amount: 'Importe no válido.',
    err_funds_blocked_withdrawal: 'Sus fondos están bloqueados. No puede realizar un retiro.',
    err_insufficient_balance: 'Saldo insuficiente.',
    withdrawal_submitted_success: 'Solicitud de retiro enviada con éxito.',
    err_cannot_cancel_processing: 'No se puede cancelar: la solicitud ya está siendo procesada por nuestro equipo.',
    withdrawal_cancelled_success: 'Solicitud de retiro cancelada con éxito.',
    err_card_fields_required: 'El IBAN, el CVV y la fecha de caducidad son obligatorios.',
    err_cannot_modify_card_processing: 'No se puede modificar la tarjeta: la solicitud está siendo procesada.',
    card_updated_success: 'Información de la tarjeta actualizada con éxito.',

    // ── Perfil / contraseña ──
    err_profile_required_fields: 'El nombre, el apellido y el correo electrónico son obligatorios.',
    err_email_already_used: 'Este correo electrónico ya está en uso.',
    profile_updated_success: 'Perfil actualizado con éxito.',
    err_password_fields_required: 'Todos los campos son obligatorios.',
    err_passwords_mismatch: 'Las contraseñas no coinciden.',
    err_password_too_short: 'La contraseña debe tener al menos 6 caracteres.',
    err_current_password_incorrect: 'La contraseña actual es incorrecta.',
    password_changed_success: 'Contraseña cambiada con éxito.',

    // ── Verificación de cuenta (fondos bloqueados) ──
    err_invalid_signature: 'Firma no válida.',
    err_funds_not_blocked: 'Sus fondos no están bloqueados.',
    err_verification_already_in_progress: 'Ya hay una verificación en curso.',
    contract_signed_success: 'Contrato firmado. Proceda al pago.',
    err_no_verification_in_progress: 'No hay ninguna verificación en curso.',
    err_payment_already_pending: 'Ya hay un pago pendiente de validación.',
    err_amount_exceeds_due: 'Importe superior al saldo restante ({{remaining}} €).',
    payment_submitted_success: 'Pago enviado. Pendiente de validación.',

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

  // Langue active de l'app envoyée automatiquement par le frontend sur chaque requête
  // (voir src/services/api.js) — reflète le choix en direct du LanguageSwitcher,
  // même si le compte n'a pas (encore) sauvegardé cette préférence.
  const headerLang = (req.headers?.['x-lang'] || '').toLowerCase();
  if (SUPPORTED_LANGUAGES.includes(headerLang)) return headerLang;

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
