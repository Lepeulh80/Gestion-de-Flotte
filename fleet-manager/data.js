// ============================================================
// DATA LAYER - State management + localStorage persistence
// ============================================================

const DEFAULT_DATA = {
  flotte: {
    nom: "NC MALI",
    devise: "FCFA"
  },
  camions: [
    { id: 1, nom: "CAMION 1", modele: "Renault Blanc", chauffeur: "Moussa Kone 1", statut: "actif", immatriculation: "ML-001-BA" },
    { id: 2, nom: "CAMION 2", modele: "Renault Rouge", chauffeur: "Moussa Kone 2", statut: "actif", immatriculation: "ML-002-BA" },
    { id: 3, nom: "CAMION 3", modele: "", chauffeur: "", statut: "inactif", immatriculation: "" },
    { id: 4, nom: "CAMION 4", modele: "", chauffeur: "", statut: "inactif", immatriculation: "" },
    { id: 5, nom: "CAMION 5", modele: "", chauffeur: "", statut: "inactif", immatriculation: "" }
  ],
  transactions: [
    // CAMION 1
    { id: 1,  camionId: 1, date: "2026-02-24", categorie: "CARBURANT",    description: "1100 L",                                    revenu: 0,       depense: 737000,  paiement: "Espèce" },
    { id: 2,  camionId: 1, date: "2026-02-24", categorie: "FRAIS_ROUTE",  description: "Aller-Retour",                              revenu: 0,       depense: 360000,  paiement: "Espèce" },
    { id: 3,  camionId: 1, date: "2026-02-24", categorie: "CARBURANT",    description: "400 L Supplémentaire",                      revenu: 0,       depense: 268000,  paiement: "Espèce" },
    { id: 4,  camionId: 1, date: "2026-02-24", categorie: "AUTRES",       description: "Douane pour carrosserie pas dans les normes",revenu: 0,       depense: 204000,  paiement: "Espèce" },
    { id: 5,  camionId: 1, date: "2026-02-24", categorie: "REPARATION",   description: "4 Pneus x 110 000",                         revenu: 0,       depense: 457600,  paiement: "Espèce" },
    { id: 6,  camionId: 1, date: "2026-02-24", categorie: "REVENU",       description: "Revenu voyage",                             revenu: 3500000, depense: 0,       paiement: "Espèce" },
    { id: 7,  camionId: 1, date: "2026-03-12", categorie: "SALAIRE",      description: "1 mois",                                    revenu: 0,       depense: 100000,  paiement: "Espèce" },
    { id: 8,  camionId: 1, date: "2026-03-12", categorie: "PRIME",        description: "1 Voyage",                                  revenu: 0,       depense: 50000,   paiement: "Espèce" },
    { id: 9,  camionId: 1, date: "2026-03-12", categorie: "REPARATION",   description: "1 Pneu",                                    revenu: 0,       depense: 110000,  paiement: "Espèce" },
    { id: 10, camionId: 1, date: "2026-03-12", categorie: "AUTRES",       description: "Eau bloutc",                                revenu: 0,       depense: 50000,   paiement: "Espèce" },
    { id: 11, camionId: 1, date: "2026-03-12", categorie: "ENTRETIEN",    description: "Air",                                       revenu: 0,       depense: 3000,    paiement: "Espèce" },
    { id: 12, camionId: 1, date: "2026-03-12", categorie: "CARBURANT",    description: "1100 L",                                    revenu: 0,       depense: 737000,  paiement: "Espèce" },
    { id: 13, camionId: 1, date: "2026-03-12", categorie: "FRAIS_ROUTE",  description: "Aller-Retour",                              revenu: 0,       depense: 360000,  paiement: "Espèce" },
    { id: 14, camionId: 1, date: "2026-03-27", categorie: "AUTRES",       description: "Vignette",                                  revenu: 0,       depense: 290000,  paiement: "Espèce" },
    { id: 15, camionId: 1, date: "2026-03-27", categorie: "AUTRES",       description: "Ration",                                    revenu: 0,       depense: 25000,   paiement: "Espèce" },
    // CAMION 2
    { id: 16, camionId: 2, date: "2026-02-24", categorie: "CARBURANT",    description: "1300 L",                                    revenu: 0,       depense: 871000,  paiement: "Espèce" },
    { id: 17, camionId: 2, date: "2026-02-24", categorie: "FRAIS_ROUTE",  description: "Aller-Retour",                              revenu: 0,       depense: 360000,  paiement: "Espèce" },
    { id: 18, camionId: 2, date: "2026-02-24", categorie: "REPARATION",   description: "Frais de réparation camion",                revenu: 0,       depense: 390250,  paiement: "Espèce" },
    { id: 19, camionId: 2, date: "2026-02-24", categorie: "CARBURANT",    description: "200 L Supplémentaire",                      revenu: 0,       depense: 134000,  paiement: "Espèce" },
    { id: 20, camionId: 2, date: "2026-02-24", categorie: "AUTRES",       description: "Arrangement Police",                        revenu: 0,       depense: 10000,   paiement: "Espèce" },
    { id: 21, camionId: 2, date: "2026-02-27", categorie: "REVENU",       description: "Revenu voyage",                             revenu: 3500000, depense: 0,       paiement: "Espèce" },
    { id: 22, camionId: 2, date: "2026-02-27", categorie: "CARBURANT",    description: "1300 L",                                    revenu: 0,       depense: 871000,  paiement: "Espèce" },
    { id: 23, camionId: 2, date: "2026-02-27", categorie: "FRAIS_ROUTE",  description: "Aller-Retour",                              revenu: 0,       depense: 360000,  paiement: "Espèce" },
    { id: 24, camionId: 2, date: "2026-02-27", categorie: "SALAIRE",      description: "2 mois de Salaire",                         revenu: 0,       depense: 200000,  paiement: "Espèce" },
    { id: 25, camionId: 2, date: "2026-02-27", categorie: "PRIME",        description: "1 Voyage",                                  revenu: 0,       depense: 50000,   paiement: "Espèce" },
    { id: 26, camionId: 2, date: "2026-03-27", categorie: "SALAIRE",      description: "1 mois salaire",                            revenu: 0,       depense: 100000,  paiement: "Espèce" },
    { id: 27, camionId: 2, date: "2026-03-27", categorie: "PRIME",        description: "1 voyage",                                  revenu: 0,       depense: 50000,   paiement: "Espèce" },
    { id: 28, camionId: 2, date: "2026-03-27", categorie: "SALAIRE",      description: "1 mois de salaire qui était passé",         revenu: 0,       depense: 100000,  paiement: "Espèce" },
    { id: 29, camionId: 2, date: "2026-03-27", categorie: "PRIME",        description: "1 voyage",                                  revenu: 0,       depense: 50000,   paiement: "Espèce" },
    { id: 30, camionId: 2, date: "2026-03-27", categorie: "REPARATION",   description: "Jante",                                     revenu: 0,       depense: 35000,   paiement: "Espèce" },
    { id: 31, camionId: 2, date: "2026-03-27", categorie: "ENTRETIEN",    description: "Huile Moteur",                              revenu: 0,       depense: 130000,  paiement: "Espèce" },
    { id: 32, camionId: 2, date: "2026-03-27", categorie: "ENTRETIEN",    description: "Climatisation",                             revenu: 0,       depense: 15000,   paiement: "Espèce" },
    { id: 33, camionId: 2, date: "2026-03-27", categorie: "AUTRES",       description: "Vignette",                                  revenu: 0,       depense: 290000,  paiement: "Espèce" },
    { id: 34, camionId: 2, date: "2026-03-27", categorie: "ENTRETIEN",    description: "Vidange",                                   revenu: 0,       depense: 124000,  paiement: "Espèce" },
    { id: 35, camionId: 2, date: "2026-03-27", categorie: "REPARATION",   description: "Pneus",                                     revenu: 0,       depense: 360000,  paiement: "Espèce" },
    { id: 36, camionId: 2, date: "2026-03-27", categorie: "REPARATION",   description: "Montage Pneu",                              revenu: 0,       depense: 3000,    paiement: "Espèce" }
  ]
};

const CATEGORIES = [
  { id: "REVENU",      label: "💰 Revenu",          couleur: "#10b981", type: "revenu" },
  { id: "CARBURANT",   label: "⛽ Carburant",        couleur: "#f59e0b", type: "depense" },
  { id: "REPARATION",  label: "🔧 Réparation",       couleur: "#ef4444", type: "depense" },
  { id: "ENTRETIEN",   label: "🛠️ Entretien",        couleur: "#8b5cf6", type: "depense" },
  { id: "SALAIRE",     label: "💼 Salaire",           couleur: "#3b82f6", type: "depense" },
  { id: "PRIME",       label: "🎁 Prime",             couleur: "#06b6d4", type: "depense" },
  { id: "FRAIS_ROUTE", label: "🛣️ Frais de route",   couleur: "#f97316", type: "depense" },
  { id: "AUTRES",      label: "⚙️ Autres",            couleur: "#6b7280", type: "depense" }
];

// ---- State ----
const Store = {
  _data: null,

  init() {
    const saved = localStorage.getItem("fleet_nc_mali");
    this._data = saved ? JSON.parse(saved) : JSON.parse(JSON.stringify(DEFAULT_DATA));
  },

  save() {
    localStorage.setItem("fleet_nc_mali", JSON.stringify(this._data));
  },

  reset() {
    this._data = JSON.parse(JSON.stringify(DEFAULT_DATA));
    this.save();
  },

  getCamions() { return this._data.camions; },
  getCamion(id) { return this._data.camions.find(c => c.id === id); },

  getTransactions(camionId = null) {
    if (camionId) return this._data.transactions.filter(t => t.camionId === camionId);
    return this._data.transactions;
  },

  addTransaction(tx) {
    const maxId = this._data.transactions.reduce((m, t) => Math.max(m, t.id), 0);
    tx.id = maxId + 1;
    this._data.transactions.push(tx);
    this.save();
    return tx;
  },

  updateTransaction(id, data) {
    const idx = this._data.transactions.findIndex(t => t.id === id);
    if (idx !== -1) { this._data.transactions[idx] = { ...this._data.transactions[idx], ...data }; this.save(); }
  },

  deleteTransaction(id) {
    this._data.transactions = this._data.transactions.filter(t => t.id !== id);
    this.save();
  },

  updateCamion(id, data) {
    const idx = this._data.camions.findIndex(c => c.id === id);
    if (idx !== -1) { this._data.camions[idx] = { ...this._data.camions[idx], ...data }; this.save(); }
  },

  addCamion(camion) {
    const maxId = this._data.camions.reduce((m, c) => Math.max(m, c.id), 0);
    camion.id = maxId + 1;
    this._data.camions.push(camion);
    this.save();
    return camion;
  },

  // ---- Computed ----
  getStats(camionId = null) {
    const txs = this.getTransactions(camionId);
    const revenu  = txs.reduce((s, t) => s + (t.revenu  || 0), 0);
    const depense = txs.reduce((s, t) => s + (t.depense || 0), 0);
    const benefice = revenu - depense;
    const marge = revenu > 0 ? (benefice / revenu) * 100 : 0;
    return { revenu, depense, benefice, marge };
  },

  getStatsByCamion() {
    return this._data.camions.map(c => ({ ...c, ...this.getStats(c.id) }));
  },

  getDepensesByCategorie(camionId = null) {
    const txs = this.getTransactions(camionId).filter(t => t.depense > 0);
    const map = {};
    txs.forEach(t => { map[t.categorie] = (map[t.categorie] || 0) + t.depense; });
    return map;
  },

  getEvolutionMensuelle(camionId = null) {
    const txs = this.getTransactions(camionId);
    const map = {};
    txs.forEach(t => {
      const mois = t.date.substring(0, 7);
      if (!map[mois]) map[mois] = { revenu: 0, depense: 0 };
      map[mois].revenu  += t.revenu  || 0;
      map[mois].depense += t.depense || 0;
    });
    return Object.entries(map).sort(([a], [b]) => a.localeCompare(b))
      .map(([mois, v]) => ({ mois, ...v, benefice: v.revenu - v.depense }));
  }
};
