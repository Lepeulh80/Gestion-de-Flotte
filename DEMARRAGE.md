# 🚀 GUIDE DE DÉMARRAGE - Fleet Manager

## 📋 Prérequis

- Node.js 14+ 
- npm 6+
- SQLite3 (inclus dans better-sqlite3)

## 🔧 Installation

### 1. Installer les dépendances

```bash
cd fleet-manager/backend
npm install
```

### 2. Configuration (optionnel)

Créer un fichier `.env` (copier depuis `.env.example`):

```bash
cp .env.example .env
```

Éditer `.env` si nécessaire (développement = valeurs par défaut OK).

### 3. Démarrer le serveur

```bash
# Mode développement (avec nodemon)
npm run dev

# Mode production
npm start
```

Le serveur démarre sur `http://localhost:3001`

## 🌐 Accéder à l'application

1. Ouvrir `http://localhost:3001` dans le navigateur
2. Se connecter avec:
   - Email: `admin@ncmali.com`
   - Mot de passe: `admin123`

## 🧪 Tester l'API

### Avec le script de test

```bash
# Terminal 1: Démarrer le serveur
npm start

# Terminal 2: Lancer les tests
node test-api.js
```

### Avec curl

```bash
# Login
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@ncmali.com","password":"admin123"}'

# Récupérer le token et l'utiliser
TOKEN="votre_token_ici"

# Get camions
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:3001/api/camions

# Get transactions avec pagination
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:3001/api/transactions?limit=10&offset=0"

# Get stats
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:3001/api/stats
```

### Avec Postman

1. Importer la collection (à créer)
2. Configurer la variable `{{token}}`
3. Exécuter les requêtes

## 📊 Données de test

La base de données est pré-remplie avec:
- 2 camions actifs (CAMION 1, CAMION 2)
- 3 camions inactifs
- 36 transactions (février-mars 2026)
- 6 maintenances
- 7 paies

## 🔐 Comptes de test

| Email | Mot de passe | Rôle |
|-------|-------------|------|
| admin@ncmali.com | admin123 | Admin |
| manager@ncmali.com | manager123 | Manager |

## 📁 Structure du projet

```
fleet-manager/
├── backend/
│   ├── server.js          # API Express
│   ├── auth.js            # JWT middleware
│   ├── db.js              # SQLite setup
│   ├── validators.js      # Validation centralisée
│   ├── package.json       # Dépendances
│   ├── .env.example       # Configuration d'exemple
│   ├── fleet.db           # Base de données SQLite
│   └── test-api.js        # Tests API
├── index.html             # Frontend
├── app.js                 # Logique frontend
├── api.js                 # Client HTTP
├── charts.js              # Graphiques
├── data.js                # État (legacy)
├── styles.css             # Styles
└── ...
```

## 🐛 Dépannage

### Port 3001 déjà utilisé

```bash
# Trouver le processus
lsof -i :3001

# Tuer le processus
kill -9 <PID>

# Ou utiliser un autre port
PORT=3002 npm start
```

### Erreur "JWT_SECRET not defined"

En production, définir la variable d'environnement:

```bash
export JWT_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
npm start
```

### Base de données corrompue

```bash
# Supprimer et recréer
rm fleet.db fleet.db-shm fleet.db-wal
npm start
```

### Erreur "CORS not allowed"

Vérifier que l'origine est dans `ALLOWED_ORIGINS`:

```bash
# .env
ALLOWED_ORIGINS=http://localhost:3001,http://127.0.0.1:3001
```

## 📈 Monitoring

### Logs

```bash
# Voir les logs en temps réel
npm start 2>&1 | tee logs/app.log

# Filtrer les erreurs
npm start 2>&1 | grep ERROR
```

### Performance

```bash
# Utiliser PM2 pour monitoring
npm install -g pm2
pm2 start server.js --name "fleet-manager"
pm2 monit
```

## 🔄 Mise à jour des dépendances

```bash
# Vérifier les vulnérabilités
npm audit

# Mettre à jour
npm update

# Fixer les vulnérabilités
npm audit fix
```

## 📚 Documentation

- [AUDIT_SECURITE_BUGS.md](./AUDIT_SECURITE_BUGS.md) - Rapport d'audit complet
- [CORRECTIONS_APPLIQUEES.md](./CORRECTIONS_APPLIQUEES.md) - Détail des corrections
- [SECURITE_PRODUCTION.md](./SECURITE_PRODUCTION.md) - Guide de sécurité production

## 🆘 Support

Pour les problèmes:
1. Vérifier les logs: `npm start`
2. Consulter la documentation
3. Vérifier les variables d'environnement
4. Tester avec curl/Postman

## ✅ Checklist de démarrage

- [ ] Node.js 14+ installé
- [ ] npm install exécuté
- [ ] .env configuré (optionnel)
- [ ] npm start fonctionne
- [ ] http://localhost:3001 accessible
- [ ] Login OK
- [ ] Tests API passent

