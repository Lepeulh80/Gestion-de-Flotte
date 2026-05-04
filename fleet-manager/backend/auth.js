// ============================================================
// AUTH.JS - JWT middleware + role guard
// ============================================================
const jwt    = require('jsonwebtoken');
const crypto = require('crypto');

// JWT_SECRET : obligatoire en prod, généré aléatoirement en dev
// Sur Render : définir JWT_SECRET dans Environment Variables
let JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  // Jamais bloquer le démarrage — générer une clé temporaire
  JWT_SECRET = crypto.randomBytes(32).toString('hex');
  if (process.env.NODE_ENV === 'production') {
    console.warn('⚠️  JWT_SECRET non défini en production ! Définissez-le dans les variables d\'environnement Render.');
    console.warn('   Les sessions seront invalidées à chaque redémarrage du serveur.');
  } else {
    console.warn('⚠️  JWT_SECRET non défini, clé aléatoire générée (développement uniquement)');
  }
}

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
