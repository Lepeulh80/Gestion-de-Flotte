# 🛠️ COMMANDES UTILES - Fleet Manager

## 🚀 Démarrage

```bash
# Installer les dépendances
cd fleet-manager/backend
npm install

# Démarrer en développement (avec nodemon)
npm run dev

# Démarrer en production
npm start

# Démarrer sur un port différent
PORT=3002 npm start
```

## 🧪 Tests

```bash
# Lancer les tests API
node test-api.js

# Vérifier les vulnérabilités
npm audit

# Fixer les vulnérabilités
npm audit fix

# Vérifier la syntaxe
node -c server.js
```

## 🔐 Sécurité

```bash
# Générer une clé JWT aléatoire
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Générer un mot de passe bcrypt
node -e "console.log(require('bcryptjs').hashSync('password', 10))"

# Vérifier les permissions des fichiers
ls -la fleet.db*
chmod 600 fleet.db fleet.db-shm fleet.db-wal
```

## 📊 Base de données

```bash
# Sauvegarder la base de données
cp fleet.db fleet.db.backup

# Restaurer la base de données
cp fleet.db.backup fleet.db

# Supprimer et recréer la base
rm fleet.db fleet.db-shm fleet.db-wal
npm start

# Accéder à SQLite directement
sqlite3 fleet.db

# Requête SQL directe
sqlite3 fleet.db "SELECT COUNT(*) FROM transactions;"
```

## 🔍 Debugging

```bash
# Voir les logs en temps réel
npm start 2>&1 | tee logs/app.log

# Filtrer les erreurs
npm start 2>&1 | grep ERROR

# Filtrer les avertissements
npm start 2>&1 | grep WARN

# Voir les requêtes SQL (si activé)
DEBUG=* npm start
```

## 📡 API - Requêtes curl

```bash
# Login
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@ncmali.com","password":"admin123"}'

# Sauvegarder le token
TOKEN=$(curl -s -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@ncmali.com","password":"admin123"}' | jq -r '.token')

# Utiliser le token
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:3001/api/camions

# GET avec pagination
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:3001/api/transactions?limit=10&offset=0"

# POST transaction
curl -X POST http://localhost:3001/api/transactions \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "camion_id": 1,
    "date": "2026-04-08",
    "categorie": "REVENU",
    "description": "Test",
    "revenu": 1000,
    "depense": 0,
    "paiement": "Espèce"
  }'

# GET stats
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:3001/api/stats

# GET stats par camion
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:3001/api/stats/camions
```

## 📦 Dépendances

```bash
# Lister les dépendances
npm list

# Lister les dépendances outdated
npm outdated

# Mettre à jour les dépendances
npm update

# Installer une dépendance spécifique
npm install express@latest

# Désinstaller une dépendance
npm uninstall package-name
```

## 🔄 Git

```bash
# Voir les changements
git status

# Ajouter les fichiers
git add .

# Commit
git commit -m "Audit sécurité et corrections"

# Push
git push origin main

# Voir l'historique
git log --oneline
```

## 🐳 Docker (optionnel)

```bash
# Créer une image Docker
docker build -t fleet-manager .

# Lancer un conteneur
docker run -p 3001:3001 fleet-manager

# Voir les conteneurs
docker ps

# Arrêter un conteneur
docker stop <container_id>
```

## 📈 Performance

```bash
# Mesurer le temps de démarrage
time npm start

# Profiler la mémoire
node --inspect server.js

# Voir l'utilisation des ressources
top -p $(pgrep -f "node server.js")

# Benchmark des requêtes
ab -n 1000 -c 10 http://localhost:3001/api/camions
```

## 🔧 Configuration

```bash
# Voir les variables d'environnement
env | grep NODE

# Définir une variable d'environnement
export JWT_SECRET="votre_clé_ici"
export NODE_ENV=production

# Voir le fichier .env
cat .env

# Éditer le fichier .env
nano .env
```

## 📝 Logs

```bash
# Créer le dossier logs
mkdir -p logs

# Voir les logs
tail -f logs/app.log

# Voir les dernières 100 lignes
tail -100 logs/app.log

# Voir les erreurs
grep ERROR logs/app.log

# Compter les erreurs
grep ERROR logs/app.log | wc -l

# Archiver les logs
gzip logs/app.log
```

## 🚨 Troubleshooting

```bash
# Port déjà utilisé
lsof -i :3001
kill -9 <PID>

# Erreur de permission
sudo chown -R $USER:$USER fleet-manager/

# Erreur npm
npm cache clean --force
rm -rf node_modules package-lock.json
npm install

# Erreur de base de données
rm fleet.db fleet.db-shm fleet.db-wal
npm start

# Erreur de module
npm install --save-dev @types/node
```

## 📊 Monitoring avec PM2

```bash
# Installer PM2
npm install -g pm2

# Démarrer avec PM2
pm2 start server.js --name "fleet-manager"

# Voir les processus
pm2 list

# Voir les logs
pm2 logs fleet-manager

# Monitorer
pm2 monit

# Arrêter
pm2 stop fleet-manager

# Redémarrer
pm2 restart fleet-manager

# Supprimer
pm2 delete fleet-manager

# Sauvegarder la configuration
pm2 save

# Restaurer au démarrage
pm2 startup
```

## 🔐 Sécurité - Checklist

```bash
# Vérifier les vulnérabilités
npm audit

# Vérifier les permissions
ls -la fleet.db*

# Vérifier les variables d'environnement
echo $JWT_SECRET
echo $NODE_ENV

# Vérifier les certificats SSL
openssl s_client -connect localhost:443

# Vérifier les ports ouverts
netstat -tuln | grep 3001
```

## 📚 Ressources

```bash
# Documentation Node.js
node --help

# Documentation npm
npm help

# Documentation Express
npm info express

# Voir la version
node --version
npm --version
```

## 🎯 Workflow complet

```bash
# 1. Cloner le repo
git clone <repo>
cd fleet-manager/backend

# 2. Installer les dépendances
npm install

# 3. Configurer l'environnement
cp .env.example .env
# Éditer .env si nécessaire

# 4. Vérifier la sécurité
npm audit

# 5. Démarrer le serveur
npm start

# 6. Tester l'API (dans un autre terminal)
node test-api.js

# 7. Accéder à l'application
# Ouvrir http://localhost:3001 dans le navigateur

# 8. Se connecter
# Email: admin@ncmali.com
# Mot de passe: admin123
```

---

## 💡 Tips & Tricks

```bash
# Alias utiles
alias start-fleet="cd fleet-manager/backend && npm start"
alias test-fleet="cd fleet-manager/backend && node test-api.js"
alias audit-fleet="cd fleet-manager/backend && npm audit"

# Fonction pour générer une clé JWT
jwt-key() {
  node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
}

# Fonction pour tester l'API
test-api() {
  curl -H "Authorization: Bearer $1" http://localhost:3001/api/camions
}
```

---

*Dernière mise à jour: 8 avril 2026*
