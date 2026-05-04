# 🚛 Gestion de Flotte — NC Mali

Application web complète de gestion de flotte de camions.

[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy?repo=https://github.com/Lepeulh80/Gestion-de-Flotte)

---

## ✨ Fonctionnalités

- 📊 **Dashboard** — KPIs, graphiques, activité récente
- 🚛 **Gestion flotte** — Camions, statuts, chauffeurs
- 💰 **Transactions** — Revenus, dépenses, filtres avancés
- 🏆 **Comparatif** — Classement rentabilité, podium
- 📈 **Analyse financière** — Comparatifs mensuels, tendances
- 🔧 **Maintenance** — Vidanges, pneus, visites techniques, échéances
- 💸 **Paie & Salaires** — Salaires, primes, avances par chauffeur
- 🔔 **Alertes** — Notifications automatiques (maintenance, marge)
- 👥 **Utilisateurs** — Gestion des accès (admin/manager/viewer)
- 📥 **Export** — CSV et Excel

## 🛠️ Stack technique

- **Backend** : Node.js, Express.js, SQLite (better-sqlite3)
- **Frontend** : HTML/CSS/JS vanilla, Chart.js
- **Auth** : JWT + bcrypt
- **Sécurité** : Helmet, rate-limiting, validation des entrées

---

## 🚀 Déploiement sur Render (gratuit)

### Option A — Déploiement automatique (1 clic)

Clique sur le bouton **Deploy to Render** ci-dessus.

### Option B — Manuel

1. Va sur [render.com](https://render.com) → **New Web Service**
2. Connecte ton GitHub → sélectionne `Gestion-de-Flotte`
3. Configure :
   - **Build Command** : `npm install`
   - **Start Command** : `npm start`
   - **Environment** : `Node`
4. Ajoute les variables d'environnement :
   ```
   NODE_ENV=production
   JWT_SECRET=<générer une clé aléatoire>
   RENDER=true
   ```
5. Clique **Create Web Service**

L'app sera disponible sur `https://gestion-de-flotte.onrender.com`

---

## 💻 Lancement en local

```bash
git clone https://github.com/Lepeulh80/Gestion-de-Flotte.git
cd Gestion-de-Flotte
npm install
npm start
```

Ouvrir **http://localhost:3001**

| Compte | Email | Mot de passe |
|--------|-------|-------------|
| Admin | admin@ncmali.com | admin123 |
| Manager | manager@ncmali.com | manager123 |

---

## 📁 Structure

```
├── server.js                    # Point d'entrée
├── package.json                 # Dépendances
├── render.yaml                  # Config Render
├── fleet-manager/
│   ├── index.html               # Frontend
│   ├── app.js                   # Logique frontend
│   ├── api.js                   # Client HTTP
│   ├── styles.css               # Styles
│   ├── charts.js                # Graphiques
│   └── backend/
│       ├── server.js            # API Express
│       ├── db.js                # SQLite + seed
│       ├── auth.js              # JWT
│       ├── validators.js        # Validation
│       └── ecosystem.config.js  # Config PM2 (Hostinger)
├── nginx.conf                   # Config Nginx (Hostinger)
└── HOSTINGER_DEPLOY.md          # Guide Hostinger VPS
```
