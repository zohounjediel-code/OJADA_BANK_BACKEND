# OJADA BANK — Backend API

## Installation (Windows)

### 1. Ouvrir PowerShell dans ce dossier
Clic droit dans le dossier `ojada-backend` → "Ouvrir dans le terminal"

### 2. Installer les dépendances
```
npm install
```

### 3. Configurer les variables d'environnement
Copiez `.env.example` et renommez-le `.env` :
```
copy .env.example .env
```
Puis ouvrez `.env` avec VS Code et remplissez vos informations Gmail.

#### Obtenir un "App Password" Gmail (pour les emails) :
1. Allez sur myaccount.google.com
2. Sécurité → Validation en deux étapes (activez-la)
3. Sécurité → Mots de passe des applications
4. Créez un mot de passe pour "Mail"
5. Copiez les 16 caractères dans EMAIL_PASS

### 4. Lancer le serveur
```
npm run dev
```
Le serveur démarre sur http://localhost:5000

---

## Routes de l'API

### Inscription client
```
POST /api/auth/register
Body: { email, password, first_name, last_name, phone }
Règles: email doit être @gmail.com, password min 8 chars + majuscule + chiffre
```

### Connexion client
```
POST /api/auth/login/client
Body: { email, password }
```

### Connexion admin
```
POST /api/auth/login/admin
Body: { username: "jediel", password: "jediel" }
```

### Déconnexion
```
POST /api/auth/logout
Header: Authorization: Bearer <token>
```

### Mot de passe oublié
```
POST /api/auth/forgot-password
Body: { email }
→ Envoie un email avec un lien valable 1 heure
```

### Vérifier le token de reset
```
GET /api/auth/reset-password/:token
```

### Réinitialiser le mot de passe
```
POST /api/auth/reset-password
Body: { token, new_password }
```

### Profil connecté
```
GET /api/auth/me
Header: Authorization: Bearer <token>
```

---

## Structure des fichiers
```
ojada-backend/
├── server.js              → Point d'entrée
├── .env                   → Variables d'environnement (à créer)
├── .env.example           → Template
├── config/
│   └── database.js        → SQLite + initialisation
├── middleware/
│   ├── auth.js            → Vérification JWT
│   └── validation.js      → Gestion des erreurs de validation
├── controllers/
│   └── authController.js  → Toute la logique d'authentification
├── routes/
│   └── auth.js            → Définition des routes
└── utils/
    └── email.js           → Envoi d'emails (bienvenue + reset)
```

## Connecter le frontend React

Dans votre fichier `.env` du frontend React, ajoutez :
```
REACT_APP_API_URL=http://localhost:5000/api
```

Puis dans vos composants React, utilisez :
```javascript
const response = await fetch(`${process.env.REACT_APP_API_URL}/auth/login/client`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email, password })
});
const data = await response.json();
if (data.success) {
  localStorage.setItem('token', data.token);
}
```
