// ============================================================
// SERVER.JS - Express API
// ============================================================
require('dotenv').config(); // Charger .env en premier
const express      = require('express');
const cors         = require('cors');
const helmet       = require('helmet');
const rateLimit    = require('express-rate-limit');
const compression  = require('compression');
const bcrypt       = require('bcryptjs');
const dbModule     = require('./db');
const db           = dbModule.db || dbModule;
const genererAlertes = dbModule.genererAlertes || (() => {});
const { signToken, requireAuth, requireRole } = require('./auth');
const {
  isValidEmail, sanitizeStr, sanitizeInt, sanitizeFloat,
  isValidId, isValidMontant, isValidDate, isValidCategorie,
  isValidRole, isValidStatutCamion, VALID_CATEGORIES,
  isValidTypeMaintenance, isValidStatutMaintenance,
  isValidTypePaie, isValidStatutPaie
} = require('./validators');

const app  = express();
const PORT = process.env.PORT || 3001;

// ---- Sécurité : headers HTTP ----
app.use(compression()); // Gzip compression
app.use(helmet({
  contentSecurityPolicy: false, // désactivé car on sert le frontend statique
  crossOriginEmbedderPolicy: false,
}));

// ---- HTTPS redirect en production ----
if (process.env.NODE_ENV === 'production') {
  app.use((req, res, next) => {
    if (req.header('x-forwarded-proto') !== 'https') {
      res.redirect(`https://${req.header('host')}${req.url}`);
    } else {
      next();
    }
  });
  app.use(helmet.hsts({ maxAge: 31536000, includeSubDomains: true }));
}

// ---- CORS : restreint en production ----
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim())
  : ['http://localhost:3001', 'http://127.0.0.1:3001'];

app.use(cors({
  origin: (origin, cb) => {
    // Autoriser les requêtes sans origin (même domaine, Postman, curl)
    if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
    cb(new Error('CORS non autorisé'));
  },
  credentials: true,
}));

app.use(express.json({ limit: '1mb' })); // limite la taille des requêtes

// ---- Rate limiting ----
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Trop de requêtes, réessayez dans 15 minutes' },
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20, // max 20 tentatives de login par 15 min
  message: { error: 'Trop de tentatives de connexion, réessayez dans 15 minutes' },
});

app.use('/api', globalLimiter);
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);

// ---- Serve frontend statique ----
const path = require('path');
const isProd = process.env.NODE_ENV === 'production';
// En production : cache 7 jours pour JS/CSS, pas de cache pour HTML
app.use(express.static(path.join(__dirname, '..'), {
  maxAge: isProd ? '7d' : 0,
  setHeaders: (res, filePath) => {
    // Pas de cache pour index.html (toujours la dernière version)
    if (filePath.endsWith('.html')) {
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    }
  }
}));

// ============================================================
// AUTH ROUTES
// ============================================================

// POST /api/auth/login
app.post('/api/auth/login', (req, res) => {
  try {
    const email    = sanitizeStr(req.body.email).toLowerCase();
    const password = req.body.password;
    if (!email || !password) return res.status(400).json({ error: 'Email et mot de passe requis' });
    if (!isValidEmail(email)) return res.status(400).json({ error: 'Email invalide' });

    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
    if (!user || !bcrypt.compareSync(password, user.password)) {
      return res.status(401).json({ error: 'Email ou mot de passe incorrect' });
    }

    const token = signToken({ id: user.id, nom: user.nom, email: user.email, role: user.role });
    res.json({ token, user: { id: user.id, nom: user.nom, email: user.email, role: user.role } });
  } catch (e) {
    console.error('Login error:', e);
    res.status(500).json({ error: 'Erreur lors de la connexion' });
  }
});

// POST /api/auth/register
app.post('/api/auth/register', (req, res) => {
  try {
    const nom      = sanitizeStr(req.body.nom);
    const email    = sanitizeStr(req.body.email).toLowerCase();
    const password = req.body.password;
    if (!nom || !email || !password) return res.status(400).json({ error: 'Nom, email et mot de passe requis' });
    if (!isValidEmail(email)) return res.status(400).json({ error: 'Email invalide' });
    if (password.length < 6) return res.status(400).json({ error: 'Mot de passe trop court (min 6 caractères)' });
    if (nom.length < 2) return res.status(400).json({ error: 'Nom trop court' });

    const result = db.prepare('INSERT INTO users (nom, email, password, role) VALUES (?,?,?,?)')
      .run(nom, email, bcrypt.hashSync(password, 12), 'viewer'); // bcrypt cost 12
    const user = { id: result.lastInsertRowid, nom, email, role: 'viewer' };
    const token = signToken(user);
    res.status(201).json({ token, user });
  } catch (e) {
    if (e.message.includes('UNIQUE')) return res.status(409).json({ error: 'Cet email est déjà utilisé' });
    console.error('Register error:', e);
    res.status(500).json({ error: 'Erreur lors de l\'inscription' });
  }
});

// GET /api/auth/me
app.get('/api/auth/me', requireAuth, (req, res) => {
  try {
    const user = db.prepare('SELECT id, nom, email, role, created_at FROM users WHERE id = ?').get(req.user.id);
    if (!user) return res.status(404).json({ error: 'Utilisateur introuvable' });
    res.json(user);
  } catch (e) {
    console.error('GET auth/me error:', e);
    res.status(500).json({ error: 'Erreur lors de la récupération du profil' });
  }
});

// POST /api/auth/change-password
app.post('/api/auth/change-password', requireAuth, (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) return res.status(400).json({ error: 'Champs requis' });
    if (newPassword.length < 6) return res.status(400).json({ error: 'Mot de passe trop court (min 6 caractères)' });

    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
    if (!bcrypt.compareSync(currentPassword, user.password)) {
      return res.status(401).json({ error: 'Mot de passe actuel incorrect' });
    }

    db.prepare('UPDATE users SET password = ? WHERE id = ?').run(bcrypt.hashSync(newPassword, 10), req.user.id);
    res.json({ message: 'Mot de passe mis à jour' });
  } catch (e) {
    console.error('Change password error:', e);
    res.status(500).json({ error: 'Erreur lors de la mise à jour du mot de passe' });
  }
});

// ============================================================
// USERS (admin only)
// ============================================================

// GET /api/users
app.get('/api/users', requireAuth, requireRole('admin'), (req, res) => {
  try {
    const users = db.prepare('SELECT id, nom, email, role, created_at FROM users ORDER BY id').all();
    res.json(users);
  } catch (e) {
    console.error('GET users error:', e);
    res.status(500).json({ error: 'Erreur lors de la récupération des utilisateurs' });
  }
});

// POST /api/users
app.post('/api/users', requireAuth, requireRole('admin'), (req, res) => {
  try {
    const { nom, email, password, role } = req.body;
    if (!nom || !email || !password) return res.status(400).json({ error: 'Champs requis' });
    if (!isValidEmail(email)) return res.status(400).json({ error: 'Email invalide' });
    if (!isValidRole(role)) return res.status(400).json({ error: 'Rôle invalide' });

    const result = db.prepare('INSERT INTO users (nom, email, password, role) VALUES (?,?,?,?)')
      .run(sanitizeStr(nom), email.toLowerCase().trim(), bcrypt.hashSync(password, 10), role || 'viewer');
    res.status(201).json({ id: result.lastInsertRowid, nom, email, role });
  } catch (e) {
    if (e.message.includes('UNIQUE')) return res.status(409).json({ error: 'Email déjà utilisé' });
    console.error('POST users error:', e);
    res.status(500).json({ error: 'Erreur lors de la création de l\'utilisateur' });
  }
});

// DELETE /api/users/:id
app.delete('/api/users/:id', requireAuth, requireRole('admin'), (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (!isValidId(id)) return res.status(400).json({ error: 'ID invalide' });
    if (id === req.user.id) return res.status(400).json({ error: 'Impossible de supprimer votre propre compte' });
    db.prepare('DELETE FROM users WHERE id = ?').run(id);
    res.json({ message: 'Utilisateur supprimé' });
  } catch (e) {
    console.error('DELETE users error:', e);
    res.status(500).json({ error: 'Erreur lors de la suppression' });
  }
});

// PUT /api/users/:id (admin ou soi-même)
app.put('/api/users/:id', requireAuth, (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (!isValidId(id)) return res.status(400).json({ error: 'ID invalide' });
    if (id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Accès refusé' });
    }
    const { nom, email } = req.body;
    if (!nom || !email) return res.status(400).json({ error: 'Nom et email requis' });
    if (!isValidEmail(email)) return res.status(400).json({ error: 'Email invalide' });
    
    db.prepare(`UPDATE users SET nom=?, email=? WHERE id=?`).run(sanitizeStr(nom), email.toLowerCase().trim(), id);
    const updated = db.prepare('SELECT id, nom, email, role, created_at FROM users WHERE id=?').get(id);
    res.json(updated);
  } catch(e) {
    if (e.message.includes('UNIQUE')) return res.status(409).json({ error: 'Email déjà utilisé' });
    console.error('PUT users error:', e);
    res.status(500).json({ error: 'Erreur lors de la mise à jour' });
  }
});

// ============================================================
// CAMIONS
// ============================================================

// GET /api/camions
app.get('/api/camions', requireAuth, (req, res) => {
  try {
    const camions = db.prepare('SELECT * FROM camions ORDER BY id').all();
    res.json(camions);
  } catch (e) {
    console.error('GET camions error:', e);
    res.status(500).json({ error: 'Erreur lors de la récupération des camions' });
  }
});

// POST /api/camions
app.post('/api/camions', requireAuth, requireRole('admin', 'manager'), (req, res) => {
  try {
    const { nom, modele, chauffeur, immatriculation, statut } = req.body;
    if (!nom || nom.trim().length === 0) return res.status(400).json({ error: 'Nom requis' });
    if (statut && !isValidStatutCamion(statut)) return res.status(400).json({ error: 'Statut invalide' });
    
    const result = db.prepare(
      'INSERT INTO camions (nom, modele, chauffeur, immatriculation, statut) VALUES (?,?,?,?,?)'
    ).run(sanitizeStr(nom), sanitizeStr(modele || ''), sanitizeStr(chauffeur || ''), sanitizeStr(immatriculation || ''), statut || 'inactif');
    res.status(201).json(db.prepare('SELECT * FROM camions WHERE id = ?').get(result.lastInsertRowid));
  } catch (e) {
    console.error('POST camions error:', e);
    res.status(500).json({ error: 'Erreur lors de la création du camion' });
  }
});

// PUT /api/camions/:id
app.put('/api/camions/:id', requireAuth, requireRole('admin', 'manager'), (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (!isValidId(id)) return res.status(400).json({ error: 'ID invalide' });
    
    const { nom, modele, chauffeur, immatriculation, statut } = req.body;
    if (!nom || nom.trim().length === 0) return res.status(400).json({ error: 'Nom requis' });
    if (statut && !isValidStatutCamion(statut)) return res.status(400).json({ error: 'Statut invalide' });
    
    db.prepare(
      `UPDATE camions SET nom=?, modele=?, chauffeur=?, immatriculation=?, statut=?, updated_at=datetime('now') WHERE id=?`
    ).run(sanitizeStr(nom), sanitizeStr(modele || ''), sanitizeStr(chauffeur || ''), sanitizeStr(immatriculation || ''), statut || 'inactif', id);
    res.json(db.prepare('SELECT * FROM camions WHERE id = ?').get(id));
  } catch (e) {
    console.error('PUT camions error:', e);
    res.status(500).json({ error: 'Erreur lors de la mise à jour du camion' });
  }
});

// DELETE /api/camions/:id
app.delete('/api/camions/:id', requireAuth, requireRole('admin'), (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (!isValidId(id)) return res.status(400).json({ error: 'ID invalide' });
    db.prepare('DELETE FROM camions WHERE id = ?').run(id);
    res.json({ message: 'Camion supprimé' });
  } catch (e) {
    console.error('DELETE camions error:', e);
    res.status(500).json({ error: 'Erreur lors de la suppression' });
  }
});

// ============================================================
// TRANSACTIONS
// ============================================================

// GET /api/transactions?camion_id=X&limit=100&offset=0
app.get('/api/transactions', requireAuth, (req, res) => {
  try {
    const { camion_id } = req.query;
    const limit = Math.min(parseInt(req.query.limit) || 100, 1000); // max 1000
    const offset = Math.max(parseInt(req.query.offset) || 0, 0);
    
    if (camion_id && !isValidId(camion_id)) {
      return res.status(400).json({ error: 'ID camion invalide' });
    }

    const select = `SELECT id, camion_id, date, categorie, description, revenu, depense, paiement as mode_paiement, created_by, created_at, updated_at FROM transactions`;
    const query = camion_id
      ? select + ' WHERE camion_id = ? ORDER BY date DESC, id DESC LIMIT ? OFFSET ?'
      : select + ' ORDER BY date DESC, id DESC LIMIT ? OFFSET ?';
    
    const rows = camion_id
      ? db.prepare(query).all(parseInt(camion_id), limit, offset)
      : db.prepare(query).all(limit, offset);
    
    res.json(rows);
  } catch (e) {
    console.error('GET transactions error:', e);
    res.status(500).json({ error: 'Erreur lors de la récupération des transactions' });
  }
});

// POST /api/transactions
app.post('/api/transactions', requireAuth, requireRole('admin', 'manager'), (req, res) => {
  try {
    const { camion_id, date, categorie, description, revenu, depense, paiement } = req.body;
    
    // Validations
    if (!isValidId(camion_id)) return res.status(400).json({ error: 'ID camion invalide' });
    if (!isValidDate(date)) return res.status(400).json({ error: 'Date invalide (format: YYYY-MM-DD)' });
    if (!isValidCategorie(categorie)) return res.status(400).json({ error: 'Catégorie invalide' });
    if (!description || description.trim().length === 0) return res.status(400).json({ error: 'Description requise' });
    if (!isValidMontant(revenu || 0)) return res.status(400).json({ error: 'Revenu invalide' });
    if (!isValidMontant(depense || 0)) return res.status(400).json({ error: 'Dépense invalide' });
    if (revenu && depense && revenu > 0 && depense > 0) {
      return res.status(400).json({ error: 'Une transaction ne peut pas avoir à la fois revenu et dépense' });
    }

    const modePaiement = sanitizeStr(req.body.mode_paiement || paiement || 'Espèce');
    const result = db.prepare(
      `INSERT INTO transactions (camion_id, date, categorie, description, revenu, depense, paiement, created_by)
       VALUES (?,?,?,?,?,?,?,?)`
    ).run(camion_id, date, categorie, sanitizeStr(description), revenu || 0, depense || 0, modePaiement, req.user.id);
    
    res.status(201).json(db.prepare('SELECT id, camion_id, date, categorie, description, revenu, depense, paiement as mode_paiement, created_at FROM transactions WHERE id = ?').get(result.lastInsertRowid));
  } catch (e) {
    console.error('POST transaction error:', e);
    res.status(500).json({ error: 'Erreur lors de la création de la transaction' });
  }
});

// PUT /api/transactions/:id
app.put('/api/transactions/:id', requireAuth, requireRole('admin', 'manager'), (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (!isValidId(id)) return res.status(400).json({ error: 'ID invalide' });
    
    const { camion_id, date, categorie, description, revenu, depense, paiement } = req.body;
    
    // Validations
    if (!isValidId(camion_id)) return res.status(400).json({ error: 'ID camion invalide' });
    if (!isValidDate(date)) return res.status(400).json({ error: 'Date invalide (format: YYYY-MM-DD)' });
    if (!isValidCategorie(categorie)) return res.status(400).json({ error: 'Catégorie invalide' });
    if (!description || description.trim().length === 0) return res.status(400).json({ error: 'Description requise' });
    if (!isValidMontant(revenu || 0)) return res.status(400).json({ error: 'Revenu invalide' });
    if (!isValidMontant(depense || 0)) return res.status(400).json({ error: 'Dépense invalide' });
    if (revenu && depense && revenu > 0 && depense > 0) {
      return res.status(400).json({ error: 'Une transaction ne peut pas avoir à la fois revenu et dépense' });
    }

    db.prepare(
      `UPDATE transactions SET camion_id=?, date=?, categorie=?, description=?, revenu=?, depense=?, paiement=?, updated_at=datetime('now') WHERE id=?`
    ).run(camion_id, date, categorie, sanitizeStr(description), revenu || 0, depense || 0, paiement || 'Espèce', id);
    
    res.json(db.prepare('SELECT id, camion_id, date, categorie, description, revenu, depense, paiement as mode_paiement, updated_at FROM transactions WHERE id = ?').get(id));
  } catch (e) {
    console.error('PUT transaction error:', e);
    res.status(500).json({ error: 'Erreur lors de la mise à jour de la transaction' });
  }
});

// DELETE /api/transactions/:id
app.delete('/api/transactions/:id', requireAuth, requireRole('admin', 'manager'), (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (!isValidId(id)) return res.status(400).json({ error: 'ID invalide' });
    db.prepare('DELETE FROM transactions WHERE id = ?').run(id);
    res.json({ message: 'Transaction supprimée' });
  } catch (e) {
    console.error('DELETE transaction error:', e);
    res.status(500).json({ error: 'Erreur lors de la suppression' });
  }
});

// ============================================================
// STATS (computed)
// ============================================================

// GET /api/stats
app.get('/api/stats', requireAuth, (req, res) => {
  try {
    const { camion_id } = req.query;
    if (camion_id && !isValidId(camion_id)) {
      return res.status(400).json({ error: 'ID camion invalide' });
    }

    const where = camion_id ? 'WHERE camion_id = ?' : '';
    const args  = camion_id ? [parseInt(camion_id)] : [];

    const row = db.prepare(
      `SELECT COALESCE(SUM(revenu),0) as totalRevenu, COALESCE(SUM(depense),0) as totalDepense FROM transactions ${where}`
    ).get(...args);

    const benefice = row.totalRevenu - row.totalDepense;
    // FIX: Marge = undefined si revenu = 0 (au lieu de 0)
    const marge    = row.totalRevenu > 0 ? (benefice / row.totalRevenu) * 100 : null;

    // Par catégorie
    const byCategorie = db.prepare(
      `SELECT categorie as id, COALESCE(SUM(depense),0) as total FROM transactions ${where} GROUP BY categorie`
    ).all(...args);

    // Évolution mensuelle
    const monthly = db.prepare(
      `SELECT substr(date,1,7) as mois,
              COALESCE(SUM(revenu),0)  as revenu,
              COALESCE(SUM(depense),0) as depense
       FROM transactions ${where}
       GROUP BY mois ORDER BY mois`
    ).all(...args);

    // Camions actifs (only for global stats)
    const camionsActifs = camion_id ? undefined :
      db.prepare("SELECT COUNT(*) as n FROM camions WHERE statut = 'actif'").get().n;

    res.json({ totalRevenu: row.totalRevenu, totalDepense: row.totalDepense, benefice, marge, byCategorie, monthly, camionsActifs });
  } catch (e) {
    console.error('GET stats error:', e);
    res.status(500).json({ error: 'Erreur lors du calcul des statistiques' });
  }
});

// GET /api/stats/camions - stats par camion ACTIF uniquement
app.get('/api/stats/camions', requireAuth, (req, res) => {
  try {
    const { all } = req.query;
    // Par défaut : seulement les camions actifs. ?all=1 pour tous.
    const camions = all
      ? db.prepare('SELECT * FROM camions ORDER BY id').all()
      : db.prepare("SELECT * FROM camions WHERE statut = 'actif' ORDER BY id").all();
    
    const result = camions.map(c => {
      const s = db.prepare(
        `SELECT COALESCE(SUM(revenu),0) as totalRevenu, COALESCE(SUM(depense),0) as totalDepense FROM transactions WHERE camion_id = ?`
      ).get(c.id);
      const benefice = s.totalRevenu - s.totalDepense;
      // FIX: Marge = null si revenu = 0
      const marge    = s.totalRevenu > 0 ? (benefice / s.totalRevenu) * 100 : null;
      return { ...c, totalRevenu: s.totalRevenu, totalDepense: s.totalDepense, benefice, marge };
    });
    res.json(result);
  } catch (e) {
    console.error('GET stats/camions error:', e);
    res.status(500).json({ error: 'Erreur lors du calcul des statistiques' });
  }
});

// ============================================================
// MAINTENANCE ROUTES
// ============================================================

// GET /api/maintenance?camion_id=X&limit=100&offset=0
app.get('/api/maintenance', requireAuth, (req, res) => {
  try {
    const { camion_id } = req.query;
    const limit = Math.min(parseInt(req.query.limit) || 100, 1000);
    const offset = Math.max(parseInt(req.query.offset) || 0, 0);
    
    if (camion_id && !isValidId(camion_id)) {
      return res.status(400).json({ error: 'ID camion invalide' });
    }

    const q = camion_id
      ? `SELECT m.*, c.nom as camion_nom FROM maintenance m JOIN camions c ON c.id=m.camion_id WHERE m.camion_id=? ORDER BY m.date_fait DESC LIMIT ? OFFSET ?`
      : `SELECT m.*, c.nom as camion_nom FROM maintenance m JOIN camions c ON c.id=m.camion_id ORDER BY m.date_fait DESC LIMIT ? OFFSET ?`;
    
    const rows = camion_id 
      ? db.prepare(q).all(parseInt(camion_id), limit, offset) 
      : db.prepare(q).all(limit, offset);
    res.json(rows);
  } catch (e) {
    console.error('GET maintenance error:', e);
    res.status(500).json({ error: 'Erreur lors de la récupération des maintenances' });
  }
});

// POST /api/maintenance
app.post('/api/maintenance', requireAuth, requireRole('admin','manager'), (req, res) => {
  try {
    const { camion_id, type, description, date_fait, date_prochain, km_fait, km_prochain, cout, statut, notes } = req.body;
    
    if (!isValidId(camion_id)) return res.status(400).json({ error: 'ID camion invalide' });
    if (!type || !isValidTypeMaintenance(type)) return res.status(400).json({ error: 'Type maintenance invalide' });
    if (!description || description.trim().length === 0) return res.status(400).json({ error: 'Description requise' });
    if (!isValidDate(date_fait)) return res.status(400).json({ error: 'Date invalide (format: YYYY-MM-DD)' });
    if (date_prochain && !isValidDate(date_prochain)) return res.status(400).json({ error: 'Date prochaine invalide' });
    if (!isValidMontant(cout || 0)) return res.status(400).json({ error: 'Coût invalide' });
    if (statut && !isValidStatutMaintenance(statut)) return res.status(400).json({ error: 'Statut invalide' });
    
    const result = db.prepare(
      `INSERT INTO maintenance (camion_id,type,description,date_fait,date_prochain,km_fait,km_prochain,cout,statut,notes,created_by) VALUES (?,?,?,?,?,?,?,?,?,?,?)`
    ).run(camion_id, type, sanitizeStr(description), date_fait, date_prochain||null, sanitizeInt(km_fait)||0, sanitizeInt(km_prochain)||0, sanitizeFloat(cout)||0, statut||'fait', sanitizeStr(notes)||null, req.user.id);
    
    try { genererAlertes(); } catch(e) {}
    res.status(201).json(db.prepare('SELECT * FROM maintenance WHERE id=?').get(result.lastInsertRowid));
  } catch (e) {
    console.error('POST maintenance error:', e);
    res.status(500).json({ error: 'Erreur lors de la création de la maintenance' });
  }
});

// PUT /api/maintenance/:id
app.put('/api/maintenance/:id', requireAuth, requireRole('admin','manager'), (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (!isValidId(id)) return res.status(400).json({ error: 'ID invalide' });
    
    const { type, description, date_fait, date_prochain, km_fait, km_prochain, cout, statut, notes } = req.body;
    
    if (!type || !isValidTypeMaintenance(type)) return res.status(400).json({ error: 'Type maintenance invalide' });
    if (!description || description.trim().length === 0) return res.status(400).json({ error: 'Description requise' });
    if (!isValidDate(date_fait)) return res.status(400).json({ error: 'Date invalide (format: YYYY-MM-DD)' });
    if (date_prochain && !isValidDate(date_prochain)) return res.status(400).json({ error: 'Date prochaine invalide' });
    if (!isValidMontant(cout || 0)) return res.status(400).json({ error: 'Coût invalide' });
    if (statut && !isValidStatutMaintenance(statut)) return res.status(400).json({ error: 'Statut invalide' });
    
    db.prepare(
      `UPDATE maintenance SET type=?,description=?,date_fait=?,date_prochain=?,km_fait=?,km_prochain=?,cout=?,statut=?,notes=? WHERE id=?`
    ).run(type, sanitizeStr(description), date_fait, date_prochain||null, sanitizeInt(km_fait)||0, sanitizeInt(km_prochain)||0, sanitizeFloat(cout)||0, statut||'fait', sanitizeStr(notes)||null, id);
    try { genererAlertes(); } catch(e) {}
    res.json(db.prepare('SELECT * FROM maintenance WHERE id=?').get(id));
  } catch (e) {
    console.error('PUT maintenance error:', e);
    res.status(500).json({ error: 'Erreur lors de la mise à jour de la maintenance' });
  }
});

// DELETE /api/maintenance/:id
app.delete('/api/maintenance/:id', requireAuth, requireRole('admin','manager'), (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (!isValidId(id)) return res.status(400).json({ error: 'ID invalide' });
    db.prepare('DELETE FROM maintenance WHERE id=?').run(id);
    res.json({ message: 'Supprimé' });
  } catch (e) {
    console.error('DELETE maintenance error:', e);
    res.status(500).json({ error: 'Erreur lors de la suppression' });
  }
});

// GET /api/maintenance/stats — résumé par camion
app.get('/api/maintenance/stats', requireAuth, (req, res) => {
  try {
    const stats = db.prepare(`
      SELECT camion_id, c.nom as camion_nom,
        COUNT(*) as total,
        SUM(cout) as cout_total,
        MAX(date_fait) as derniere_date,
        MIN(date_prochain) as prochaine_echeance
      FROM maintenance m JOIN camions c ON c.id=m.camion_id
      GROUP BY camion_id
    `).all();
    res.json(stats);
  } catch (e) {
    console.error('GET maintenance/stats error:', e);
    res.status(500).json({ error: 'Erreur lors du calcul des statistiques' });
  }
});

// ============================================================
// PAIE ROUTES
// ============================================================

// GET /api/paie?camion_id=X&periode=2026-03&limit=100&offset=0
app.get('/api/paie', requireAuth, (req, res) => {
  try {
    const { camion_id, periode } = req.query;
    const limit = Math.min(parseInt(req.query.limit) || 100, 1000);
    const offset = Math.max(parseInt(req.query.offset) || 0, 0);
    
    if (camion_id && !isValidId(camion_id)) {
      return res.status(400).json({ error: 'ID camion invalide' });
    }
    if (periode && !/^\d{4}-\d{2}$/.test(periode)) {
      return res.status(400).json({ error: 'Période invalide (format: YYYY-MM)' });
    }

    let q = `SELECT p.*, c.nom as camion_nom FROM paie p JOIN camions c ON c.id=p.camion_id WHERE 1=1`;
    const params = [];
    if (camion_id) { q += ' AND p.camion_id=?'; params.push(parseInt(camion_id)); }
    if (periode)   { q += ' AND p.periode=?';   params.push(periode); }
    q += ' ORDER BY p.date_paiement DESC, p.id DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);
    
    res.json(db.prepare(q).all(...params));
  } catch (e) {
    console.error('GET paie error:', e);
    res.status(500).json({ error: 'Erreur lors de la récupération des paies' });
  }
});

// POST /api/paie
app.post('/api/paie', requireAuth, requireRole('admin','manager'), (req, res) => {
  try {
    const { camion_id, chauffeur, type, montant, periode, date_paiement, statut, description } = req.body;
    
    if (!isValidId(camion_id)) return res.status(400).json({ error: 'ID camion invalide' });
    if (!chauffeur || chauffeur.trim().length === 0) return res.status(400).json({ error: 'Chauffeur requis' });
    if (!type || !isValidTypePaie(type)) return res.status(400).json({ error: 'Type paie invalide' });
    if (!isValidMontant(montant)) return res.status(400).json({ error: 'Montant invalide' });
    if (!/^\d{4}-\d{2}$/.test(periode)) return res.status(400).json({ error: 'Période invalide (format: YYYY-MM)' });
    if (!isValidDate(date_paiement)) return res.status(400).json({ error: 'Date paiement invalide (format: YYYY-MM-DD)' });
    if (statut && !isValidStatutPaie(statut)) return res.status(400).json({ error: 'Statut invalide' });
    
    const result = db.prepare(
      `INSERT INTO paie (camion_id,chauffeur,type,montant,periode,date_paiement,statut,description,created_by) VALUES (?,?,?,?,?,?,?,?,?)`
    ).run(camion_id, sanitizeStr(chauffeur), type, sanitizeFloat(montant), periode, date_paiement, statut||'paye', sanitizeStr(description)||null, req.user.id);
    res.status(201).json(db.prepare('SELECT * FROM paie WHERE id=?').get(result.lastInsertRowid));
  } catch (e) {
    console.error('POST paie error:', e);
    res.status(500).json({ error: 'Erreur lors de la création de la paie' });
  }
});

// PUT /api/paie/:id
app.put('/api/paie/:id', requireAuth, requireRole('admin','manager'), (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (!isValidId(id)) return res.status(400).json({ error: 'ID invalide' });
    
    const { chauffeur, type, montant, periode, date_paiement, statut, description } = req.body;
    
    if (!chauffeur || chauffeur.trim().length === 0) return res.status(400).json({ error: 'Chauffeur requis' });
    if (!type || !isValidTypePaie(type)) return res.status(400).json({ error: 'Type paie invalide' });
    if (!isValidMontant(montant)) return res.status(400).json({ error: 'Montant invalide' });
    if (!/^\d{4}-\d{2}$/.test(periode)) return res.status(400).json({ error: 'Période invalide (format: YYYY-MM)' });
    if (!isValidDate(date_paiement)) return res.status(400).json({ error: 'Date paiement invalide (format: YYYY-MM-DD)' });
    if (statut && !isValidStatutPaie(statut)) return res.status(400).json({ error: 'Statut invalide' });
    
    db.prepare(
      `UPDATE paie SET chauffeur=?,type=?,montant=?,periode=?,date_paiement=?,statut=?,description=? WHERE id=?`
    ).run(sanitizeStr(chauffeur), type, sanitizeFloat(montant), periode, date_paiement, statut||'paye', sanitizeStr(description)||null, id);
    res.json(db.prepare('SELECT * FROM paie WHERE id=?').get(id));
  } catch (e) {
    console.error('PUT paie error:', e);
    res.status(500).json({ error: 'Erreur lors de la mise à jour de la paie' });
  }
});

// DELETE /api/paie/:id
app.delete('/api/paie/:id', requireAuth, requireRole('admin','manager'), (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (!isValidId(id)) return res.status(400).json({ error: 'ID invalide' });
    db.prepare('DELETE FROM paie WHERE id=?').run(id);
    res.json({ message: 'Supprimé' });
  } catch (e) {
    console.error('DELETE paie error:', e);
    res.status(500).json({ error: 'Erreur lors de la suppression' });
  }
});

// GET /api/paie/stats — résumé par chauffeur/camion
app.get('/api/paie/stats', requireAuth, (req, res) => {
  try {
    const stats = db.prepare(`
      SELECT p.camion_id, c.nom as camion_nom, p.chauffeur,
        SUM(CASE WHEN type='SALAIRE' THEN montant ELSE 0 END) as total_salaires,
        SUM(CASE WHEN type='PRIME'   THEN montant ELSE 0 END) as total_primes,
        SUM(CASE WHEN type='AVANCE'  THEN montant ELSE 0 END) as total_avances,
        SUM(montant) as total,
        COUNT(*) as nb_paiements
      FROM paie p JOIN camions c ON c.id=p.camion_id
      GROUP BY p.camion_id, p.chauffeur
      ORDER BY total DESC
    `).all();
    res.json(stats);
  } catch (e) {
    console.error('GET paie/stats error:', e);
    res.status(500).json({ error: 'Erreur lors du calcul des statistiques' });
  }
});

// ============================================================
// ALERTES ROUTES
// ============================================================

// GET /api/alertes?lue=0&limit=100&offset=0
app.get('/api/alertes', requireAuth, (req, res) => {
  try {
    const { lue } = req.query;
    const limit = Math.min(parseInt(req.query.limit) || 100, 1000);
    const offset = Math.max(parseInt(req.query.offset) || 0, 0);
    
    let q = `SELECT a.*, c.nom as camion_nom FROM alertes a LEFT JOIN camions c ON c.id=a.camion_id WHERE 1=1`;
    const params = [];
    if (lue !== undefined) { q += ' AND a.lue=?'; params.push(parseInt(lue)); }
    q += ' ORDER BY a.created_at DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);
    
    // Regénérer avant de retourner (une seule fois par jour en production)
    try { genererAlertes(); } catch(e) {}
    res.json(db.prepare(q).all(...params));
  } catch (e) {
    console.error('GET alertes error:', e);
    res.status(500).json({ error: 'Erreur lors de la récupération des alertes' });
  }
});

// PUT /api/alertes/:id/lire
app.put('/api/alertes/:id/lire', requireAuth, (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (!isValidId(id)) return res.status(400).json({ error: 'ID invalide' });
    db.prepare('UPDATE alertes SET lue=1 WHERE id=?').run(id);
    res.json({ message: 'Alerte marquée comme lue' });
  } catch (e) {
    console.error('PUT alertes lire error:', e);
    res.status(500).json({ error: 'Erreur lors de la mise à jour' });
  }
});

// PUT /api/alertes/lire-tout
app.put('/api/alertes/lire-tout', requireAuth, (req, res) => {
  try {
    db.prepare('UPDATE alertes SET lue=1').run();
    res.json({ message: 'Toutes les alertes marquées comme lues' });
  } catch (e) {
    console.error('PUT alertes lire-tout error:', e);
    res.status(500).json({ error: 'Erreur lors de la mise à jour' });
  }
});

// DELETE /api/alertes/:id
app.delete('/api/alertes/:id', requireAuth, (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (!isValidId(id)) return res.status(400).json({ error: 'ID invalide' });
    db.prepare('DELETE FROM alertes WHERE id=?').run(id);
    res.json({ message: 'Supprimée' });
  } catch (e) {
    console.error('DELETE alertes error:', e);
    res.status(500).json({ error: 'Erreur lors de la suppression' });
  }
});

// GET /api/alertes/count — nombre non lues
app.get('/api/alertes/count', requireAuth, (req, res) => {
  try {
    const count = db.prepare('SELECT COUNT(*) as n FROM alertes WHERE lue=0').get().n;
    res.json({ count });
  } catch (e) {
    console.error('GET alertes/count error:', e);
    res.status(500).json({ error: 'Erreur lors du calcul' });
  }
});

// ============================================================
// Error handler global
// ============================================================
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Erreur serveur interne' });
});

// ============================================================
// START SERVER
// ============================================================
app.listen(PORT, () => {
  const env = process.env.NODE_ENV || 'development';
  console.log(`\n🚛 Fleet Manager — ${env.toUpperCase()}`);
  console.log(`   URL     : http://localhost:${PORT}`);
  console.log(`   Admin   : admin@ncmali.com / admin123`);
  console.log(`   Manager : manager@ncmali.com / manager123`);
  if (env === 'production') {
    console.log(`   ⚠️  Pensez à changer les mots de passe par défaut !`);
  }
  console.log('');
});
