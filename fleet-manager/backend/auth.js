// ============================================================
// AUTH.JS - JWT middleware + role guard
// ============================================================
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

// ⚠️ SÉCURITÉ: JWT_SECRET DOIT être défini en variable d'environnement en production
// Générer une clé aléatoire si non définie (développement uniquement)
const JWT_SECRET  = process.env.JWT_SECRET || (() => {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('❌ JWT_SECRET doit être défini en variable d\'environnement en production');
  }
  console.warn('⚠️  JWT_SECRET non défini, génération d\'une clé aléatoire (développement uniquement)');
  return crypto.randomBytes(32).toString('hex');
})();

const JWT_EXPIRES = process.env.JWT_EXPIRES || '8h';

function signToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES });
}

// Middleware: vérifie le token Bearer
function requireAuth(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token manquant' });
  }
  try {
    req.user = jwt.verify(header.slice(7), JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ error: 'Token invalide ou expiré' });
  }
}

// Middleware: restreint aux rôles autorisés
function requireRole(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.user?.role)) {
      return res.status(403).json({ error: 'Accès refusé' });
    }
    next();
  };
}

module.exports = { signToken, requireAuth, requireRole };
