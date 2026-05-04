# 🚀 GUIDE D'HÉBERGEMENT - Hostinger

## 📋 Vue d'ensemble

Ce guide explique comment héberger l'application Fleet Manager sur Hostinger pour qu'elle soit accessible partout sur Internet.

---

## 🎯 Options d'hébergement Hostinger

### Option 1: Hosting Partagé (Shared Hosting) - ❌ NON RECOMMANDÉ
- **Avantages**: Pas cher, facile
- **Inconvénients**: Pas de Node.js, limité pour les apps dynamiques
- **Prix**: ~2-3€/mois

### Option 2: Hosting VPS - ✅ RECOMMANDÉ
- **Avantages**: Node.js supporté, contrôle total, scalable
- **Inconvénients**: Nécessite des connaissances techniques
- **Prix**: ~3-5€/mois (débutant)

### Option 3: Hosting Cloud - ✅ MEILLEUR CHOIX
- **Avantages**: Scalable, performant, flexible
- **Inconvénients**: Plus cher
- **Prix**: ~5-10€/mois

---

## 🔧 ÉTAPE 1: Préparer l'application

### 1.1 Créer un fichier `.env` pour production

```bash
cd fleet-manager/backend
cp .env.example .env
```

Éditer `.env`:
```
NODE_ENV=production
PORT=3001
JWT_SECRET=<générer_une_clé_aléatoire>
JWT_EXPIRES=8h
ALLOWED_ORIGINS=https://votre-domaine.com
```

Générer une clé JWT:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 1.2 Créer un fichier `package.json` à la racine (optionnel)

```json
{
  "name": "fleet-manager",
  "version": "1.0.0",
  "description": "Gestion de Flotte NC Mali",
  "main": "fleet-manager/backend/server.js",
  "scripts": {
    "start": "node fleet-manager/backend/server.js",
    "dev": "nodemon fleet-manager/backend/server.js"
  },
  "dependencies": {
    "bcryptjs": "^2.4.3",
    "better-sqlite3": "^12.8.0",
    "cors": "^2.8.5",
    "express": "^4.18.2",
    "express-rate-limit": "^8.3.2",
    "helmet": "^8.1.0",
    "jsonwebtoken": "^9.0.2"
  }
}
```

### 1.3 Créer un fichier `.gitignore`

```
node_modules/
.env
*.db
*.db-shm
*.db-wal
logs/
.DS_Store
```

---

## 🌐 ÉTAPE 2: Acheter un domaine et un hébergement Hostinger

### 2.1 Acheter un domaine
1. Aller sur [hostinger.com](https://www.hostinger.com)
2. Cliquer sur "Domaines"
3. Chercher votre domaine (ex: fleetmanager-ncmali.com)
4. Ajouter au panier et payer

### 2.2 Acheter un VPS
1. Aller sur "VPS" dans Hostinger
2. Choisir le plan "VPS Débutant" (~3€/mois)
3. Sélectionner:
   - **OS**: Ubuntu 22.04 LTS
   - **Localisation**: Europe (France si possible)
   - **Domaine**: Votre domaine acheté
4. Ajouter au panier et payer

### 2.3 Configurer le VPS
Après l'achat, vous recevrez:
- **Adresse IP**: ex: 192.168.1.100
- **Identifiant root**: root
- **Mot de passe root**: [fourni par email]

---

## 💻 ÉTAPE 3: Configurer le serveur VPS

### 3.1 Se connecter au VPS via SSH

```bash
# Sur votre ordinateur
ssh root@192.168.1.100
# Entrer le mot de passe fourni
```

### 3.2 Mettre à jour le système

```bash
apt update
apt upgrade -y
```

### 3.3 Installer Node.js et npm

```bash
# Installer Node.js 18 LTS
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
apt install -y nodejs

# Vérifier l'installation
node --version
npm --version
```

### 3.4 Installer Git

```bash
apt install -y git
```

### 3.5 Créer un utilisateur non-root

```bash
# Créer un utilisateur
adduser fleetmanager
# Ajouter à sudo
usermod -aG sudo fleetmanager
# Changer vers cet utilisateur
su - fleetmanager
```

---

## 📦 ÉTAPE 4: Déployer l'application

### 4.1 Cloner le repository

```bash
cd ~
git clone https://github.com/votre-username/fleet-manager.git
cd fleet-manager
```

### 4.2 Installer les dépendances

```bash
cd backend
npm install
cd ..
```

### 4.3 Configurer l'environnement

```bash
cd backend
cp .env.example .env
nano .env
```

Éditer les variables:
```
NODE_ENV=production
PORT=3001
JWT_SECRET=<votre_clé_générée>
JWT_EXPIRES=8h
ALLOWED_ORIGINS=https://votre-domaine.com
```

Sauvegarder: `Ctrl+X`, `Y`, `Enter`

---

## 🔒 ÉTAPE 5: Configurer HTTPS avec Let's Encrypt

### 5.1 Installer Certbot

```bash
sudo apt install -y certbot python3-certbot-nginx
```

### 5.2 Générer un certificat SSL

```bash
sudo certbot certonly --standalone -d votre-domaine.com -d www.votre-domaine.com
```

Vous recevrez:
- Certificat: `/etc/letsencrypt/live/votre-domaine.com/fullchain.pem`
- Clé privée: `/etc/letsencrypt/live/votre-domaine.com/privkey.pem`

### 5.3 Renouvellement automatique

```bash
sudo systemctl enable certbot.timer
sudo systemctl start certbot.timer
```

---

## 🌐 ÉTAPE 6: Configurer Nginx comme reverse proxy

### 6.1 Installer Nginx

```bash
sudo apt install -y nginx
```

### 6.2 Créer la configuration

```bash
sudo nano /etc/nginx/sites-available/fleet-manager
```

Ajouter:
```nginx
server {
    listen 80;
    server_name votre-domaine.com www.votre-domaine.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name votre-domaine.com www.votre-domaine.com;

    ssl_certificate /etc/letsencrypt/live/votre-domaine.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/votre-domaine.com/privkey.pem;

    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    client_max_body_size 10M;

    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    gzip on;
    gzip_types text/plain text/css text/javascript application/json;
}
```

Sauvegarder: `Ctrl+X`, `Y`, `Enter`

### 6.3 Activer la configuration

```bash
sudo ln -s /etc/nginx/sites-available/fleet-manager /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

---

## 🚀 ÉTAPE 7: Démarrer l'application avec PM2

### 7.1 Installer PM2

```bash
sudo npm install -g pm2
```

### 7.2 Démarrer l'application

```bash
cd ~/fleet-manager/backend
pm2 start server.js --name "fleet-manager"
pm2 startup
pm2 save
```

### 7.3 Vérifier le statut

```bash
pm2 status
pm2 logs fleet-manager
```

---

## 🔐 ÉTAPE 8: Configurer le firewall

### 8.1 Activer UFW

```bash
sudo ufw enable
```

### 8.2 Autoriser les ports

```bash
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 80/tcp    # HTTP
sudo ufw allow 443/tcp   # HTTPS
sudo ufw allow 3001/tcp  # Node.js (optionnel, pour debug)
```

### 8.3 Vérifier

```bash
sudo ufw status
```

---

## 📊 ÉTAPE 9: Configurer les backups

### 9.1 Créer un dossier de backup

```bash
mkdir -p ~/backups
```

### 9.2 Créer un script de backup

```bash
nano ~/backup.sh
```

Ajouter:
```bash
#!/bin/bash
BACKUP_DIR=~/backups
DATE=$(date +%Y%m%d_%H%M%S)
cp ~/fleet-manager/backend/fleet.db $BACKUP_DIR/fleet.db.$DATE
echo "Backup créé: $BACKUP_DIR/fleet.db.$DATE"
```

Rendre exécutable:
```bash
chmod +x ~/backup.sh
```

### 9.3 Planifier les backups (cron)

```bash
crontab -e
```

Ajouter:
```
0 2 * * * ~/backup.sh
```

Cela crée un backup tous les jours à 2h du matin.

---

## 🔍 ÉTAPE 10: Monitoring et logs

### 10.1 Voir les logs de l'application

```bash
pm2 logs fleet-manager
```

### 10.2 Voir les logs Nginx

```bash
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log
```

### 10.3 Monitorer les ressources

```bash
pm2 monit
```

---

## ✅ VÉRIFICATION

### Tester l'application

1. Ouvrir le navigateur
2. Aller à: `https://votre-domaine.com`
3. Vérifier que l'application charge
4. Se connecter avec:
   - Email: `admin@ncmali.com`
   - Mot de passe: `admin123`

### Vérifier HTTPS

```bash
curl -I https://votre-domaine.com
```

Vous devriez voir: `HTTP/2 200`

### Vérifier les certificats

```bash
sudo certbot certificates
```

---

## 🐛 TROUBLESHOOTING

### L'application ne démarre pas

```bash
# Vérifier les logs
pm2 logs fleet-manager

# Redémarrer
pm2 restart fleet-manager

# Vérifier les ports
sudo netstat -tlnp | grep 3001
```

### Erreur CORS

Vérifier `.env`:
```
ALLOWED_ORIGINS=https://votre-domaine.com
```

### Erreur SSL

```bash
# Renouveler le certificat
sudo certbot renew --force-renewal

# Redémarrer Nginx
sudo systemctl restart nginx
```

### Base de données corrompue

```bash
# Sauvegarder l'ancienne
cp fleet.db fleet.db.backup

# Supprimer et recréer
rm fleet.db fleet.db-shm fleet.db-wal

# Redémarrer
pm2 restart fleet-manager
```

---

## 📈 OPTIMISATIONS

### 1. Augmenter les limites de fichiers

```bash
sudo nano /etc/security/limits.conf
```

Ajouter:
```
* soft nofile 65536
* hard nofile 65536
```

### 2. Optimiser Nginx

```bash
sudo nano /etc/nginx/nginx.conf
```

Ajouter dans `http {}`:
```nginx
worker_processes auto;
worker_connections 2048;
keepalive_timeout 65;
```

### 3. Activer la compression

Déjà configurée dans la config Nginx (gzip).

### 4. Ajouter un cache

```nginx
proxy_cache_path /var/cache/nginx levels=1:2 keys_zone=my_cache:10m;

location / {
    proxy_cache my_cache;
    proxy_cache_valid 200 10m;
    ...
}
```

---

## 🔄 MISE À JOUR

### Mettre à jour l'application

```bash
cd ~/fleet-manager
git pull origin main

cd backend
npm install
npm audit fix

pm2 restart fleet-manager
```

### Mettre à jour Node.js

```bash
sudo apt update
sudo apt upgrade nodejs
```

---

## 📞 SUPPORT HOSTINGER

- **Chat en direct**: Disponible 24/7 sur hostinger.com
- **Email**: support@hostinger.com
- **Téléphone**: Numéro fourni dans votre compte
- **Documentation**: https://support.hostinger.com

---

## 🎯 RÉSUMÉ DES ÉTAPES

1. ✅ Préparer l'application (`.env`, `package.json`)
2. ✅ Acheter domaine + VPS Hostinger
3. ✅ Configurer le VPS (Node.js, Git)
4. ✅ Déployer l'application (git clone, npm install)
5. ✅ Configurer HTTPS (Let's Encrypt)
6. ✅ Configurer Nginx (reverse proxy)
7. ✅ Démarrer avec PM2 (process manager)
8. ✅ Configurer firewall (UFW)
9. ✅ Configurer backups (cron)
10. ✅ Tester et monitorer

---

## 💡 CONSEILS

- **Sécurité**: Changer les mots de passe par défaut
- **Performance**: Monitorer les ressources régulièrement
- **Backups**: Faire des backups réguliers
- **Logs**: Vérifier les logs pour les erreurs
- **Certificats**: Renouveler les certificats SSL avant expiration
- **Mises à jour**: Mettre à jour Node.js et les dépendances régulièrement

---

## 📚 RESSOURCES

- [Hostinger VPS Documentation](https://support.hostinger.com/en/articles/360001263033)
- [Node.js Deployment](https://nodejs.org/en/docs/guides/nodejs-docker-webapp/)
- [Nginx Documentation](https://nginx.org/en/docs/)
- [PM2 Documentation](https://pm2.keymetrics.io/docs/usage/quick-start/)
- [Let's Encrypt](https://letsencrypt.org/)

---

*Guide créé le 8 avril 2026*
*Mis à jour pour Hostinger VPS*
