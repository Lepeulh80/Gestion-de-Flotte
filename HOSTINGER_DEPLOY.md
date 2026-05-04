# 🚀 Guide Déploiement Hostinger VPS — Fleet Manager NC Mali

## 📋 Prérequis
- VPS Hostinger (Ubuntu 22.04 LTS recommandé, ~4€/mois)
- Domaine pointant vers l'IP du VPS
- Accès SSH au VPS

---

## ÉTAPE 1 — Connexion SSH au VPS

```bash
ssh root@VOTRE_IP_VPS
```

---

## ÉTAPE 2 — Installation Node.js 20 LTS

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs
node --version   # doit afficher v20.x.x
npm --version
```

---

## ÉTAPE 3 — Installation PM2 + Nginx

```bash
npm install -g pm2
sudo apt install -y nginx
sudo systemctl enable nginx
sudo systemctl start nginx
```

---

## ÉTAPE 4 — Uploader le projet

**Option A — Via Git (recommandé)**
```bash
cd /var/www
git clone https://github.com/VOTRE_COMPTE/fleet-manager.git
```

**Option B — Via SCP depuis votre PC**
```bash
# Sur votre PC Windows (PowerShell) :
scp -r C:\Users\coumi\Documents\GFLT\fleet-manager root@VOTRE_IP:/var/www/
```

---

## ÉTAPE 5 — Installer les dépendances

```bash
cd /var/www/fleet-manager/backend
npm install --production
```

---

## ÉTAPE 6 — Configurer l'environnement

```bash
cp .env.example .env
nano .env
```

Remplir le fichier `.env` :
```env
NODE_ENV=production
PORT=3001
JWT_SECRET=COLLER_ICI_UNE_CLE_ALEATOIRE
JWT_EXPIRES=8h
ALLOWED_ORIGINS=https://votre-domaine.com,https://www.votre-domaine.com
```

Générer une clé JWT sécurisée :
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

## ÉTAPE 7 — Démarrer l'application avec PM2

```bash
cd /var/www/fleet-manager/backend
pm2 start ecosystem.config.js --env production
pm2 save
pm2 startup   # Copier-coller la commande affichée
```

Vérifier que ça tourne :
```bash
pm2 status
pm2 logs fleet-manager
```

---

## ÉTAPE 8 — Configurer Nginx

```bash
sudo cp /var/www/fleet-manager/nginx.conf /etc/nginx/sites-available/fleet-manager

# Remplacer votre-domaine.com par votre vrai domaine
sudo nano /etc/nginx/sites-available/fleet-manager

# Activer le site
sudo ln -s /etc/nginx/sites-available/fleet-manager /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default

# Tester la config
sudo nginx -t

# Recharger Nginx
sudo systemctl reload nginx
```

---

## ÉTAPE 9 — SSL avec Let's Encrypt (HTTPS gratuit)

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d votre-domaine.com -d www.votre-domaine.com
```

Renouvellement automatique (déjà configuré par certbot) :
```bash
sudo certbot renew --dry-run
```

---

## ÉTAPE 10 — Firewall

```bash
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw enable
sudo ufw status
```

---

## ✅ Vérification finale

```bash
# Tester l'API
curl https://votre-domaine.com/api/auth/login \
  -X POST -H "Content-Type: application/json" \
  -d '{"email":"admin@ncmali.com","password":"admin123"}'

# Voir les logs
pm2 logs fleet-manager --lines 50

# Statut
pm2 status
```

Ouvrir **https://votre-domaine.com** dans le navigateur.

---

## 🔐 Sécurité post-déploiement

```bash
# Changer les mots de passe par défaut via l'interface admin
# Aller dans Paramètres → Changer mot de passe

# Permissions base de données
chmod 600 /var/www/fleet-manager/backend/fleet.db
chown www-data:www-data /var/www/fleet-manager/backend/fleet.db
```

---

## 🔄 Mise à jour de l'application

```bash
cd /var/www/fleet-manager
git pull origin main
cd backend
npm install --production
pm2 restart fleet-manager
```

---

## 📊 Monitoring

```bash
pm2 monit          # Dashboard temps réel
pm2 logs           # Logs en direct
pm2 status         # État des processus
```

---

## 🆘 Dépannage

| Problème | Solution |
|----------|----------|
| Port 3001 occupé | `pm2 delete fleet-manager && pm2 start ecosystem.config.js` |
| Nginx 502 Bad Gateway | `pm2 status` — vérifier que l'app tourne |
| SSL expiré | `sudo certbot renew` |
| DB corrompue | Restaurer depuis backup |
| Mémoire insuffisante | Augmenter le plan VPS |

---

## 💾 Backup automatique

```bash
# Ajouter dans crontab (crontab -e)
0 2 * * * cp /var/www/fleet-manager/backend/fleet.db /var/backups/fleet-$(date +\%Y\%m\%d).db
0 3 * * 0 find /var/backups -name "fleet-*.db" -mtime +30 -delete
```
