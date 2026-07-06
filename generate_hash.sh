#!/bin/bash
# ─── Génère un hash bcrypt compatible avec authController.js (genSalt 12) ───
# Usage : ./generate_hash.sh "email_du_client@gmail.com" "NouveauMotDePasse123"

EMAIL="$1"
NEW_PASSWORD="$2"

if [ -z "$EMAIL" ] || [ -z "$NEW_PASSWORD" ]; then
  echo "Usage : ./generate_hash.sh <email_client> <nouveau_mot_de_passe>"
  exit 1
fi

# Génère le hash avec bcryptjs (déjà installé dans votre projet backend)
HASH=$(node -e "
const bcrypt = require('bcryptjs');
bcrypt.genSalt(12).then(salt => {
  bcrypt.hash(process.argv[1], salt).then(hash => {
    console.log(hash);
  });
});
" "$NEW_PASSWORD")

echo ""
echo "✅ Hash généré pour le mot de passe : $NEW_PASSWORD"
echo ""
echo "────────────────────────────────────────────────────────"
echo "Requête SQL à exécuter dans votre base de données :"
echo "────────────────────────────────────────────────────────"
echo ""
echo "UPDATE users SET password = '$HASH', updated_at = CURRENT_TIMESTAMP WHERE email = '$EMAIL';"
echo ""
