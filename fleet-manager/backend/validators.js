// ============================================================
// VALIDATORS.JS - Validation centralisée
// ============================================================

const VALID_CATEGORIES = ['REVENU', 'CARBURANT', 'REPARATION', 'ENTRETIEN', 'SALAIRE', 'PRIME', 'FRAIS_ROUTE', 'AUTRES'];
const VALID_ROLES = ['admin', 'manager', 'viewer'];
const VALID_STATUTS_CAMION = ['actif', 'inactif', 'maintenance'];
const VALID_STATUTS_MAINTENANCE = ['fait', 'planifie', 'en_retard'];
const VALID_STATUTS_PAIE = ['paye', 'en_attente'];
const VALID_TYPES_MAINTENANCE = ['VIDANGE', 'PNEU', 'VISITE_TECHNIQUE', 'AUTRE'];
const VALID_TYPES_PAIE = ['SALAIRE', 'PRIME', 'AVANCE', 'BONUS'];

// Validation email
const isValidEmail = email => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

// Sanitization
const sanitizeStr = s => (typeof s === 'string' ? s.trim().slice(0, 500) : '');
const sanitizeInt = n => { const v = parseInt(n); return isNaN(v) ? 0 : v; };
const sanitizeFloat = n => { const v = parseFloat(n); return isNaN(v) ? 0 : v; };

// Validation ID (doit être > 0)
const isValidId = id => {
  const parsed = parseInt(id);
  return !isNaN(parsed) && parsed > 0;
};

// Validation montant (>= 0, <= 999999999)
const isValidMontant = amount => {
  const parsed = parseFloat(amount);
  return !isNaN(parsed) && parsed >= 0 && parsed <= 999999999;
};

// Validation date (format ISO 8601: YYYY-MM-DD)
const isValidDate = date => {
  if (typeof date !== 'string') return false;
  const regex = /^\d{4}-\d{2}-\d{2}$/;
  if (!regex.test(date)) return false;
  const d = new Date(date + 'T00:00:00Z');
  return d instanceof Date && !isNaN(d);
};

// Validation catégorie
const isValidCategorie = cat => VALID_CATEGORIES.includes(cat);

// Validation rôle
const isValidRole = role => VALID_ROLES.includes(role);

// Validation statut camion
const isValidStatutCamion = statut => VALID_STATUTS_CAMION.includes(statut);

// Validation statut maintenance
const isValidStatutMaintenance = statut => VALID_STATUTS_MAINTENANCE.includes(statut);

// Validation statut paie
const isValidStatutPaie = statut => VALID_STATUTS_PAIE.includes(statut);

// Validation type maintenance
const isValidTypeMaintenance = type => VALID_TYPES_MAINTENANCE.includes(type);

// Validation type paie
const isValidTypePaie = type => VALID_TYPES_PAIE.includes(type);

module.exports = {
  isValidEmail,
  sanitizeStr,
  sanitizeInt,
  sanitizeFloat,
  isValidId,
  isValidMontant,
  isValidDate,
  isValidCategorie,
  isValidRole,
  isValidStatutCamion,
  isValidStatutMaintenance,
  isValidStatutPaie,
  isValidTypeMaintenance,
  isValidTypePaie,
  VALID_CATEGORIES,
  VALID_ROLES,
  VALID_STATUTS_CAMION,
};
