# 🔍 AUDIT SÉCURITÉ & BUGS - Fleet Manager NC Mali

## 🚨 PROBLÈMES CRITIQUES IDENTIFIÉS

### 1. **SÉCURITÉ - JWT Secret en dur** ⚠️ CRITIQUE
- **Fichier**: `backend/auth.js`
- **Problème**: `JWT_SECRET = 'fleet_nc_mali_secret_change_in_prod'` exposé en clair
- **Impact**: Toute personne ayant accès au code peut forger des tokens
- **Solution**: Utiliser une variable d'environnement avec valeur aléatoire

### 2. **SÉCURITÉ - Pas de validation des montants** ⚠️ CRITIQUE
- **Fichier**: `backend/server.js`
- **Problème**: Les montants (revenu/depense) ne sont pas validés (peuvent être négatifs, très grands, NaN)
- **Impact**: Données corrompues, calculs erronés
- **Solution**: Valider que montants >= 0 et <= limite raisonnable

### 3. **SÉCURITÉ - Injection SQL potentielle** ⚠️ HAUTE
- **Fichier**: `backend/server.js` (ligne stats)
- **Problème**: `substr(date,1,7)` dans les requêtes SQL sans validation stricte
- **Impact**: Bien que prepared statements soient utilisés, la validation des dates est faible
- **Solution**: Valider format ISO 8601 avant traitement

### 4. **SÉCURITÉ - Pas de validation des dates** ⚠️ HAUTE
- **Fichier**: `backend/server.js` (POST transactions, maintenance, paie)
- **Problème**: Les dates ne sont pas validées (format, plage valide)
- **Impact**: Données incohérentes, calculs mensuels cassés
- **Solution**: Valider format ISO 8601 et plage raisonnable

### 5. **SÉCURITÉ - Pas de limite de résultats** ⚠️ MOYENNE
- **Fichier**: `backend/server.js` (GET transactions, maintenance, paie)
- **Problème**: Pas de pagination, peut retourner des milliers de lignes
- **Impact**: Surcharge mémoire, lenteur réseau
- **Solution**: Ajouter pagination avec LIMIT/OFFSET

### 6. **SÉCURITÉ - Pas de validation des IDs** ⚠️ MOYENNE
- **Fichier**: `backend/server.js` (partout)
- **Problème**: `parseInt(req.params.id)` sans vérifier si > 0
- **Impact**: Requêtes avec ID=0 ou négatifs peuvent causer des bugs
- **Solution**: Valider que ID > 0

### 7. **SÉCURITÉ - Pas de HTTPS en production** ⚠️ HAUTE
- **Fichier**: `backend/server.js`
- **Problème**: Pas de redirection HTTPS, pas de HSTS
- **Impact**: Tokens JWT peuvent être interceptés
- **Solution**: Ajouter middleware HTTPS en production

### 8. **SÉCURITÉ - Pas de validation des rôles** ⚠️ MOYENNE
- **Fichier**: `backend/server.js`
- **Problème**: Les rôles ne sont pas validés lors de la création d'utilisateur
- **Impact**: Création de rôles invalides
- **Solution**: Whitelist des rôles valides

### 9. **BUG - Alias paiement/mode_paiement incohérent** 🐛 MOYENNE
- **Fichier**: `backend/server.js` + `frontend/app.js`
- **Problème**: Colonne DB = `paiement`, frontend utilise `mode_paiement`
- **Impact**: Confusion, risque de perte de données
- **Solution**: Standardiser sur `mode_paiement` partout

### 10. **BUG - Pas de gestion des erreurs DB** 🐛 HAUTE
- **Fichier**: `backend/server.js`
- **Problème**: Les erreurs SQLite ne sont pas catchées (sauf UNIQUE)
- **Impact**: Crash du serveur sur erreur DB
- **Solution**: Ajouter try-catch sur toutes les requêtes DB

### 11. **BUG - Alertes générées à chaque requête** 🐛 MOYENNE
- **Fichier**: `backend/db.js`
- **Problème**: `genererAlertes()` appelée à chaque GET /api/alertes
- **Impact**: Doublons d'alertes, performance dégradée
- **Solution**: Générer les alertes une seule fois au démarrage ou via cron

### 12. **BUG - Pas de gestion des transactions concurrentes** 🐛 MOYENNE
- **Fichier**: `backend/db.js`
- **Problème**: Pas de transactions DB pour opérations multi-étapes
- **Impact**: Risque d'incohérence des données
- **Solution**: Utiliser `db.transaction()` pour les opérations critiques

### 13. **PERFORMANCE - Pas d'index sur les colonnes fréquemment filtrées** 🐢 MOYENNE
- **Fichier**: `backend/db.js`
- **Problème**: Pas d'index sur `transactions.date`, `paie.periode`, etc.
- **Impact**: Requêtes lentes avec beaucoup de données
- **Solution**: Ajouter des index

### 14. **BUG - Pas de validation des catégories** 🐛 MOYENNE
- **Fichier**: `backend/server.js`
- **Problème**: Les catégories ne sont pas validées contre la liste autorisée
- **Impact**: Catégories invalides dans la DB
- **Solution**: Valider contre CATEGORIES whitelist

### 15. **FRONTEND - Pas de gestion des erreurs réseau** 🐛 HAUTE
- **Fichier**: `frontend/api.js`
- **Problème**: `apiFetch` ne gère pas les erreurs réseau (timeout, offline)
- **Impact**: L'app crash silencieusement
- **Solution**: Ajouter gestion des erreurs réseau

### 16. **FRONTEND - Pas de validation des inputs** 🐛 HAUTE
- **Fichier**: `frontend/app.js`
- **Problème**: Les inputs utilisateur ne sont pas validés avant envoi
- **Impact**: Données invalides, XSS potentiel
- **Solution**: Valider tous les inputs côté client

### 17. **FRONTEND - Pas de protection XSS** 🐛 HAUTE
- **Fichier**: `frontend/app.js`
- **Problème**: Utilisation de `.innerHTML` avec données utilisateur
- **Impact**: Injection XSS possible
- **Solution**: Utiliser `.textContent` ou échapper les données

### 18. **FRONTEND - Pas de gestion des sessions expirées** 🐛 MOYENNE
- **Fichier**: `frontend/app.js`
- **Problème**: Pas de refresh automatique du token
- **Impact**: Utilisateur déconnecté sans prévenir
- **Solution**: Implémenter refresh token

### 19. **BUG - Calcul de marge incorrect** 🐛 HAUTE
- **Fichier**: `backend/server.js` + `frontend/app.js`
- **Problème**: Marge = (benefice/revenu)*100, mais si revenu=0 → marge=0 (devrait être undefined)
- **Impact**: Statistiques incorrectes
- **Solution**: Gérer le cas revenu=0

### 20. **FRONTEND - Pas de confirmation avant suppression** 🐛 MOYENNE
- **Fichier**: `frontend/app.js`
- **Problème**: Les suppressions ne demandent pas de confirmation
- **Impact**: Suppressions accidentelles
- **Solution**: Ajouter confirmDialog avant DELETE

---

## ✅ CORRECTIONS À APPLIQUER

### Phase 1: Sécurité critique (IMMÉDIAT)
1. ✅ Générer JWT_SECRET aléatoire
2. ✅ Valider tous les montants (>= 0, <= 999999999)
3. ✅ Valider tous les IDs (> 0)
4. ✅ Valider les dates (format ISO 8601)
5. ✅ Valider les catégories (whitelist)
6. ✅ Ajouter try-catch sur toutes les requêtes DB

### Phase 2: Sécurité moyenne (URGENT)
7. ✅ Ajouter pagination (LIMIT 100)
8. ✅ Ajouter HTTPS redirect en production
9. ✅ Valider les rôles (whitelist)
10. ✅ Standardiser paiement → mode_paiement

### Phase 3: Bugs et performance (IMPORTANT)
11. ✅ Fixer génération des alertes (une seule fois)
12. ✅ Ajouter index sur colonnes fréquentes
13. ✅ Fixer calcul de marge (revenu=0)
14. ✅ Ajouter gestion erreurs réseau frontend
15. ✅ Ajouter validation inputs frontend
16. ✅ Fixer XSS (innerHTML → textContent)
17. ✅ Ajouter confirmDialog avant DELETE
18. ✅ Implémenter refresh token

---

## 📊 RÉSUMÉ

| Sévérité | Nombre | Statut |
|----------|--------|--------|
| 🔴 CRITIQUE | 3 | À corriger |
| 🟠 HAUTE | 7 | À corriger |
| 🟡 MOYENNE | 8 | À corriger |
| 🟢 BASSE | 2 | À corriger |
| **TOTAL** | **20** | **À corriger** |

