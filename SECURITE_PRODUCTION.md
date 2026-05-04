# 🔒 GUIDE DE SÉCURITÉ - PRODUCTION

## ⚠️ AVANT DE DÉPLOYER EN PRODUCTION

### 1. Variables d'environnement OBLIGATOIRES

```bash
# Générer une clé JWT aléatoire (32 bytes)
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Créer un fichier .env avec:
NODE_ENV=production
JWT_SECRET=<votre_clé_aléatoire_ici>
JWT_EXPIRES=8h
ALLOWED_ORIGINS=https://votre-domaine.com
PORT=3001
```

### 2. Certificat SSL/TLS

- Obtenir un certificat SSL valide (Let's Encrypt gratuit)
- Configurer HTTPS sur le serveur
- Redirection HTTP → HTTPS automatique

### 3. Base de données

```bash
# Sauvegarder la base de données
cp fleet.db fleet.db.backup

# Vérifier les permissions
chmod 600 fleet.db
chmod 600 fleet.db-shm
chmod 600 fleet.db-wal
```

### 4. Authentification

- Changer les mots de passe par défaut:
  - admin@ncmali.com / admin123 → **CHANGER**
  - manager@ncmali.com / manager123 → **CHANGER**

### 5. Firewall

```bash
# Autoriser uniquement les ports nécessaires
- Port 80 (HTTP → HTTPS redirect)
- Port 443 (HTTPS)
- Port 3001 (API interne, si applicable)

# Bloquer les autres ports
```

### 6. Rate Limiting

- Activé par défaut (20 tentatives login/15min)
- Ajuster selon vos besoins

### 7. CORS

- Configurer `ALLOWED_ORIGINS` avec votre domaine uniquement
- Ne pas utiliser `*` en production

### 8. Logs et monitoring

```bash
# Activer les logs
NODE_ENV=production npm start 2>&1 | tee logs/app.log

# Monitorer les erreurs
tail -f logs/app.log | grep ERROR
```

### 9. Backups automatiques

```bash
# Cron job (tous les jours à 2h du matin)
0 2 * * * cp /path/to/fleet.db /backups/fleet.db.$(date +\%Y\%m\%d)
```

### 10. Mises à jour de sécurité

```bash
# Vérifier les vulnérabilités
npm audit

# Mettre à jour les dépendances
npm update
npm audit fix
```

---

## 🔐 CHECKLIST DE SÉCURITÉ

- [ ] JWT_SECRET défini et aléatoire
- [ ] HTTPS activé avec certificat valide
- [ ] Mots de passe par défaut changés
- [ ] CORS configuré correctement
- [ ] Firewall configuré
- [ ] Backups automatiques en place
- [ ] Logs activés et monitored
- [ ] npm audit passé sans vulnérabilités critiques
- [ ] NODE_ENV=production
- [ ] Permissions fichiers correctes (600 pour DB)

---

## 📊 MONITORING

### Métriques à surveiller

1. **Performance**
   - Temps de réponse API (< 200ms)
   - Utilisation CPU (< 80%)
   - Utilisation mémoire (< 500MB)

2. **Sécurité**
   - Tentatives de login échouées
   - Erreurs d'authentification
   - Requêtes rate-limitées

3. **Disponibilité**
   - Uptime (> 99.9%)
   - Erreurs 5xx
   - Connexions DB

### Outils recommandés

- PM2 (process manager)
- New Relic / DataDog (monitoring)
- Sentry (error tracking)
- ELK Stack (logs)

---

## 🚨 INCIDENT RESPONSE

### Si compromission suspectée

1. Arrêter le serveur
2. Vérifier les logs pour activité suspecte
3. Changer tous les mots de passe
4. Régénérer JWT_SECRET
5. Restaurer depuis backup
6. Redémarrer le serveur

### Contacts d'urgence

- Administrateur système: [contact]
- Équipe sécurité: [contact]

---

## 📚 RESSOURCES

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Node.js Security Best Practices](https://nodejs.org/en/docs/guides/security/)
- [Express Security](https://expressjs.com/en/advanced/best-practice-security.html)
- [SQLite Security](https://www.sqlite.org/security.html)

