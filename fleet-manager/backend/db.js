// ============================================================
// DB.JS - SQLite setup, migrations & seed data
// ============================================================
const Database = require('better-sqlite3');
const bcrypt   = require('bcryptjs');
const path     = require('path');

// Sur Render : utiliser /var/data pour la persistance (disque monté)
// En local : utiliser le dossier backend/
const DB_PATH = process.env.DATABASE_PATH ||
  (process.env.RENDER ? '/var/data/fleet.db' : path.join(__dirname, 'fleet.db'));

const db = new Database(DB_PATH);

// Performance pragmas
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// ---- Schema ----
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    nom        TEXT    NOT NULL,
    email      TEXT    NOT NULL UNIQUE,
    password   TEXT    NOT NULL,
    role       TEXT    NOT NULL DEFAULT 'viewer',  -- admin | manager | viewer
    created_at TEXT    NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS camions (
    id             INTEGER PRIMARY KEY AUTOINCREMENT,
    nom            TEXT NOT NULL,
    modele         TEXT,
    chauffeur      TEXT,
    immatriculation TEXT,
    statut         TEXT NOT NULL DEFAULT 'inactif',
    created_at     TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at     TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS transactions (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    camion_id   INTEGER NOT NULL REFERENCES camions(id) ON DELETE CASCADE,
    date        TEXT    NOT NULL,
    categorie   TEXT    NOT NULL,
    description TEXT    NOT NULL,
    revenu      REAL    NOT NULL DEFAULT 0,
    depense     REAL    NOT NULL DEFAULT 0,
    paiement    TEXT    NOT NULL DEFAULT 'Espèce',
    created_by  INTEGER REFERENCES users(id),
    created_at  TEXT    NOT NULL DEFAULT (datetime('now')),
    updated_at  TEXT    NOT NULL DEFAULT (datetime('now'))
  );

  CREATE INDEX IF NOT EXISTS idx_tx_camion    ON transactions(camion_id);
  CREATE INDEX IF NOT EXISTS idx_tx_date      ON transactions(date);
  CREATE INDEX IF NOT EXISTS idx_tx_categorie ON transactions(categorie);
`);

// ---- Nouvelles tables : Maintenance, Paie, Alertes ----
db.exec(`
  -- Maintenance : vidanges, pneus, visites techniques
  CREATE TABLE IF NOT EXISTS maintenance (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    camion_id   INTEGER NOT NULL REFERENCES camions(id) ON DELETE CASCADE,
    type        TEXT    NOT NULL, -- VIDANGE | PNEU | VISITE_TECHNIQUE | AUTRE
    description TEXT    NOT NULL,
    date_fait   TEXT    NOT NULL,
    date_prochain TEXT,           -- prochaine échéance
    km_fait     INTEGER DEFAULT 0,
    km_prochain INTEGER DEFAULT 0,
    cout        REAL    DEFAULT 0,
    statut      TEXT    NOT NULL DEFAULT 'fait', -- fait | planifie | en_retard
    notes       TEXT,
    created_by  INTEGER REFERENCES users(id),
    created_at  TEXT    NOT NULL DEFAULT (datetime('now'))
  );

  -- Paie : salaires, primes, avances par chauffeur/camion
  CREATE TABLE IF NOT EXISTS paie (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    camion_id   INTEGER NOT NULL REFERENCES camions(id) ON DELETE CASCADE,
    chauffeur   TEXT    NOT NULL,
    type        TEXT    NOT NULL, -- SALAIRE | PRIME | AVANCE | BONUS
    montant     REAL    NOT NULL DEFAULT 0,
    periode     TEXT    NOT NULL, -- ex: 2026-03
    date_paiement TEXT  NOT NULL,
    statut      TEXT    NOT NULL DEFAULT 'paye', -- paye | en_attente
    description TEXT,
    created_by  INTEGER REFERENCES users(id),
    created_at  TEXT    NOT NULL DEFAULT (datetime('now'))
  );

  -- Alertes : notifications automatiques
  CREATE TABLE IF NOT EXISTS alertes (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    camion_id   INTEGER REFERENCES camions(id) ON DELETE CASCADE,
    type        TEXT    NOT NULL, -- MAINTENANCE | MARGE | PNEU | VIDANGE | VISITE | PAIE
    titre       TEXT    NOT NULL,
    message     TEXT    NOT NULL,
    niveau      TEXT    NOT NULL DEFAULT 'info', -- info | warning | danger
    lue         INTEGER NOT NULL DEFAULT 0,
    date_alerte TEXT    NOT NULL DEFAULT (datetime('now')),
    created_at  TEXT    NOT NULL DEFAULT (datetime('now'))
  );

  CREATE INDEX IF NOT EXISTS idx_maint_camion  ON maintenance(camion_id);
  CREATE INDEX IF NOT EXISTS idx_paie_camion   ON paie(camion_id);
  CREATE INDEX IF NOT EXISTS idx_alertes_lue   ON alertes(lue);
`);

// ---- Seed: admin user + données initiales ----
const seedDone = db.prepare("SELECT COUNT(*) as n FROM users").get().n > 0;

if (!seedDone) {
  const hash = bcrypt.hashSync('admin123', 10);

  db.prepare(`INSERT INTO users (nom, email, password, role) VALUES (?,?,?,?)`)
    .run('Administrateur', 'admin@ncmali.com', hash, 'admin');

  db.prepare(`INSERT INTO users (nom, email, password, role) VALUES (?,?,?,?)`)
    .run('Manager', 'manager@ncmali.com', bcrypt.hashSync('manager123', 10), 'manager');

  // Camions
  const insertCamion = db.prepare(`INSERT INTO camions (nom, modele, chauffeur, immatriculation, statut) VALUES (?,?,?,?,?)`);
  const c1 = insertCamion.run('CAMION 1', 'Renault Blanc', 'Moussa Kone 1', 'ML-001-BA', 'actif').lastInsertRowid;
  const c2 = insertCamion.run('CAMION 2', 'Renault Rouge', 'Moussa Kone 2', 'ML-002-BA', 'actif').lastInsertRowid;
  const c3 = insertCamion.run('CAMION 3', '', '', '', 'inactif').lastInsertRowid;
  insertCamion.run('CAMION 4', '', '', '', 'inactif');
  insertCamion.run('CAMION 5', '', '', '', 'inactif');

  // Transactions Camion 1
  const ins = db.prepare(`INSERT INTO transactions (camion_id,date,categorie,description,revenu,depense,paiement) VALUES (?,?,?,?,?,?,?)`);
  const txC1 = [
    [c1,'2026-02-24','CARBURANT',   '1100 L',                                     0,       737000, 'Espèce'],
    [c1,'2026-02-24','FRAIS_ROUTE', 'Aller-Retour',                               0,       360000, 'Espèce'],
    [c1,'2026-02-24','CARBURANT',   '400 L Supplémentaire',                       0,       268000, 'Espèce'],
    [c1,'2026-02-24','AUTRES',      'Douane pour carrosserie pas dans les normes', 0,       204000, 'Espèce'],
    [c1,'2026-02-24','REPARATION',  '4 Pneus x 110 000',                          0,       457600, 'Espèce'],
    [c1,'2026-02-24','REVENU',      'Revenu voyage',                               3500000, 0,      'Espèce'],
    [c1,'2026-03-12','SALAIRE',     '1 mois',                                     0,       100000, 'Espèce'],
    [c1,'2026-03-12','PRIME',       '1 Voyage',                                   0,       50000,  'Espèce'],
    [c1,'2026-03-12','REPARATION',  '1 Pneu',                                     0,       110000, 'Espèce'],
    [c1,'2026-03-12','AUTRES',      'Eau bloutc',                                 0,       50000,  'Espèce'],
    [c1,'2026-03-12','ENTRETIEN',   'Air',                                        0,       3000,   'Espèce'],
    [c1,'2026-03-12','CARBURANT',   '1100 L',                                     0,       737000, 'Espèce'],
    [c1,'2026-03-12','FRAIS_ROUTE', 'Aller-Retour',                               0,       360000, 'Espèce'],
    [c1,'2026-03-27','AUTRES',      'Vignette',                                   0,       290000, 'Espèce'],
    [c1,'2026-03-27','AUTRES',      'Ration',                                     0,       25000,  'Espèce'],
  ];
  // Transactions Camion 2
  const txC2 = [
    [c2,'2026-02-24','CARBURANT',   '1300 L',                              0,       871000, 'Espèce'],
    [c2,'2026-02-24','FRAIS_ROUTE', 'Aller-Retour',                        0,       360000, 'Espèce'],
    [c2,'2026-02-24','REPARATION',  'Frais de réparation camion',          0,       390250, 'Espèce'],
    [c2,'2026-02-24','CARBURANT',   '200 L Supplémentaire',                0,       134000, 'Espèce'],
    [c2,'2026-02-24','AUTRES',      'Arrangement Police',                  0,       10000,  'Espèce'],
    [c2,'2026-02-27','REVENU',      'Revenu voyage',                       3500000, 0,      'Espèce'],
    [c2,'2026-02-27','CARBURANT',   '1300 L',                              0,       871000, 'Espèce'],
    [c2,'2026-02-27','FRAIS_ROUTE', 'Aller-Retour',                        0,       360000, 'Espèce'],
    [c2,'2026-02-27','SALAIRE',     '2 mois de Salaire',                   0,       200000, 'Espèce'],
    [c2,'2026-02-27','PRIME',       '1 Voyage',                            0,       50000,  'Espèce'],
    [c2,'2026-03-27','SALAIRE',     '1 mois salaire',                      0,       100000, 'Espèce'],
    [c2,'2026-03-27','PRIME',       '1 voyage',                            0,       50000,  'Espèce'],
    [c2,'2026-03-27','SALAIRE',     '1 mois de salaire qui était passé',   0,       100000, 'Espèce'],
    [c2,'2026-03-27','PRIME',       '1 voyage',                            0,       50000,  'Espèce'],
    [c2,'2026-03-27','REPARATION',  'Jante',                               0,       35000,  'Espèce'],
    [c2,'2026-03-27','ENTRETIEN',   'Huile Moteur',                        0,       130000, 'Espèce'],
    [c2,'2026-03-27','ENTRETIEN',   'Climatisation',                       0,       15000,  'Espèce'],
    [c2,'2026-03-27','AUTRES',      'Vignette',                            0,       290000, 'Espèce'],
    [c2,'2026-03-27','ENTRETIEN',   'Vidange',                             0,       124000, 'Espèce'],
    [c2,'2026-03-27','REPARATION',  'Pneus',                               0,       360000, 'Espèce'],
    [c2,'2026-03-27','REPARATION',  'Montage Pneu',                        0,       3000,   'Espèce'],
  ];

  const insertMany = db.transaction((rows) => { rows.forEach(r => ins.run(...r)); });
  insertMany(txC1);
  insertMany(txC2);

  // Seed maintenance
  const insMaint = db.prepare(`INSERT INTO maintenance (camion_id,type,description,date_fait,date_prochain,km_fait,km_prochain,cout,statut) VALUES (?,?,?,?,?,?,?,?,?)`);
  insMaint.run(c1,'VIDANGE',       'Vidange huile moteur 15W40',  '2026-02-24','2026-05-24',45000,50000,35000,'fait');
  insMaint.run(c1,'PNEU',          '4 pneus avant remplacés',     '2026-02-24','2026-08-24',45000,65000,457600,'fait');
  insMaint.run(c1,'VISITE_TECHNIQUE','Visite technique annuelle',  '2026-01-15','2027-01-15',44000,0,    50000,'fait');
  insMaint.run(c2,'VIDANGE',       'Vidange + filtre à huile',    '2026-03-27','2026-06-27',62000,67000,124000,'fait');
  insMaint.run(c2,'PNEU',          'Pneus arrière x2',            '2026-03-27','2026-09-27',62000,82000,360000,'fait');
  insMaint.run(c2,'VISITE_TECHNIQUE','Visite technique',           '2025-12-10','2026-12-10',58000,0,    50000,'fait');

  // Seed paie
  const insPaye = db.prepare(`INSERT INTO paie (camion_id,chauffeur,type,montant,periode,date_paiement,statut,description) VALUES (?,?,?,?,?,?,?,?)`);
  insPaye.run(c1,'Moussa Kone 1','SALAIRE',100000,'2026-03','2026-03-12','paye','Salaire mars 2026');
  insPaye.run(c1,'Moussa Kone 1','PRIME',  50000, '2026-03','2026-03-12','paye','Prime 1 voyage');
  insPaye.run(c2,'Moussa Kone 2','SALAIRE',200000,'2026-02','2026-02-27','paye','Salaire 2 mois (jan+fév)');
  insPaye.run(c2,'Moussa Kone 2','PRIME',  50000, '2026-02','2026-02-27','paye','Prime 1 voyage');
  insPaye.run(c2,'Moussa Kone 2','SALAIRE',100000,'2026-03','2026-03-27','paye','Salaire mars 2026');
  insPaye.run(c2,'Moussa Kone 2','PRIME',  50000, '2026-03','2026-03-27','paye','Prime voyage mars');
  insPaye.run(c2,'Moussa Kone 2','SALAIRE',100000,'2026-03','2026-03-27','paye','Rattrapage salaire passé');

  console.log('✅ Base de données initialisée avec les données de démo');
}

// ---- Génération automatique des alertes ----
function genererAlertes() {
  const today = new Date().toISOString().split('T')[0];
  const in30  = new Date(Date.now() + 30*24*60*60*1000).toISOString().split('T')[0];

  // Alertes maintenance : échéances dans 30 jours ou dépassées
  const maintenances = db.prepare(`SELECT m.*, c.nom as camion_nom FROM maintenance m JOIN camions c ON c.id=m.camion_id WHERE m.date_prochain IS NOT NULL AND m.date_prochain != ''`).all();
  maintenances.forEach(m => {
    const existe = db.prepare(`SELECT id FROM alertes WHERE camion_id=? AND type=? AND titre LIKE ? AND lue=0`).get(m.camion_id, 'MAINTENANCE', `%${m.type}%`);
    if (existe) return;
    if (m.date_prochain <= today) {
      db.prepare(`INSERT INTO alertes (camion_id,type,titre,message,niveau) VALUES (?,?,?,?,?)`).run(
        m.camion_id, 'MAINTENANCE',
        `⚠️ ${m.type} en retard — ${m.camion_nom}`,
        `${m.description} était prévu le ${m.date_prochain}. Intervention requise.`,
        'danger'
      );
    } else if (m.date_prochain <= in30) {
      db.prepare(`INSERT INTO alertes (camion_id,type,titre,message,niveau) VALUES (?,?,?,?,?)`).run(
        m.camion_id, 'MAINTENANCE',
        `🔔 ${m.type} à venir — ${m.camion_nom}`,
        `${m.description} prévu le ${m.date_prochain}. Planifiez l'intervention.`,
        'warning'
      );
    }
  });

  // Alertes marge négative
  const camions = db.prepare(`SELECT id, nom FROM camions`).all();
  camions.forEach(c => {
    const s = db.prepare(`SELECT COALESCE(SUM(revenu),0) as rev, COALESCE(SUM(depense),0) as dep FROM transactions WHERE camion_id=?`).get(c.id);
    const marge = s.rev > 0 ? ((s.rev - s.dep) / s.rev) * 100 : 0;
    if (marge < -10) {
      const existe = db.prepare(`SELECT id FROM alertes WHERE camion_id=? AND type='MARGE' AND lue=0`).get(c.id);
      if (!existe) {
        db.prepare(`INSERT INTO alertes (camion_id,type,titre,message,niveau) VALUES (?,?,?,?,?)`).run(
          c.id, 'MARGE',
          `📉 Marge critique — ${c.nom}`,
          `La marge de ${c.nom} est à ${marge.toFixed(1)}%. Les dépenses dépassent les revenus.`,
          'danger'
        );
      }
    }
  });
}

// Générer les alertes au démarrage
try { genererAlertes(); } catch(e) { console.warn('Alertes:', e.message); }

module.exports = { db, genererAlertes };
