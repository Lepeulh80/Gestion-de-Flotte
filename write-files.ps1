# NC Mali Fleet Manager - Write index.html and app.js
# FILE 1: index.html
$html = @'
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>🚛 Gestion de Flotte — NC Mali</title>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link href="https://fonts.googleapis.com/css2?family=Open+Sans:wght@400;500;600;700&family=Poppins:wght@600;700;800&display=swap" rel="stylesheet" />
  <script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js"></script>
  <link rel="stylesheet" href="styles.css" />
</head>
<body>

<!-- LOGIN SCREEN -->
<div id="login-screen" class="login-screen" style="display:none">
  <div class="login-card">
    <img src="https://ncmali.com/wp-content/uploads/2025/08/Design-sans-titre.png"
         onerror="this.style.display='none'" alt="NC Mali" class="login-logo-img" />
    <h1 class="gradient-text">NC Mali</h1>
    <p class="login-subtitle">Gestion de Flotte</p>
    <form id="login-form">
      <div class="form-group">
        <label>Email</label>
        <input type="email" id="login-email" class="form-control"
               placeholder="admin@ncmali.com" required autocomplete="email" />
      </div>
      <div class="form-group">
        <label>Mot de passe</label>
        <input type="password" id="login-password" class="form-control"
               placeholder="••••••••" required autocomplete="current-password" />
      </div>
      <button type="submit" class="btn btn-nc-primary btn-full">🔐 Se connecter</button>
    </form>
    <p class="login-hint">admin@ncmali.com / admin123</p>
  </div>
</div>

<!-- APP SHELL -->
<div id="app-shell" style="display:none;flex-direction:row;width:100%;min-height:100vh">

  <!-- SIDEBAR -->
  <nav id="sidebar" class="sidebar">
    <div class="sidebar-logo">
      <img src="https://ncmali.com/wp-content/uploads/2025/08/Design-sans-titre.png"
           onerror="this.style.display='none'" alt="NC Mali" class="sidebar-logo-img" />
      <div>
        <div class="sidebar-brand">NC Mali</div>
        <div class="sidebar-tagline">Gestion de Flotte</div>
      </div>
    </div>

    <div class="sidebar-nav">
      <div class="nav-section">GÉNÉRAL</div>
      <a class="nav-item" data-page="dashboard" onclick="navigate('dashboard')">
        <span>📊</span> Dashboard
      </a>
      <a class="nav-item" data-page="comparatif" onclick="navigate('comparatif')">
        <span>🏆</span> Comparatif
      </a>
      <a class="nav-item" data-page="voyages" onclick="navigate('voyages')">
        <span>🗺️</span> Voyages
      </a>
      <a class="nav-item" data-page="maintenance" onclick="navigate('maintenance')">
        <span>🔧</span> Maintenance
      </a>

      <div class="nav-section">FLOTTE</div>
      <a class="nav-item" data-page="flotte" onclick="navigate('flotte')">
        <span>⚙️</span> Gestion Flotte
      </a>
      <a class="nav-item" data-page="users" id="nav-users" onclick="navigate('users')" style="display:none">
        <span>👥</span> Utilisateurs
      </a>

      <div class="nav-section">CAMIONS</div>
      <div id="sidebar-camions"></div>
    </div>

    <div class="sidebar-footer">
      <div class="user-info" id="sidebar-user-info">
        <div class="user-avatar" id="user-avatar-initials">?</div>
        <div>
          <div class="user-name" id="sidebar-user-name">—</div>
          <div class="user-role" id="sidebar-user-role">—</div>
        </div>
      </div>
      <button class="btn btn-ghost btn-sm" onclick="openChangePassword()">🔑 Mot de passe</button>
      <button class="btn logout-btn" id="btn-logout">🚪 Déconnexion</button>
    </div>
  </nav>

  <!-- MAIN CONTENT -->
  <div class="main-content">
    <!-- TOPBAR -->
    <div class="topbar">
      <div class="topbar-left">
        <button id="sidebar-toggle" class="btn btn-ghost btn-icon sidebar-toggle-btn">☰</button>
        <h2 id="page-title">📊 Dashboard</h2>
      </div>
      <div class="topbar-right">
        <span id="topbar-date" class="topbar-date"></span>
        <button class="btn btn-ghost btn-sm" onclick="exportCSV()">⬇️ Export CSV</button>
        <button class="btn btn-nc-primary btn-sm" onclick="openAddTx(null)">➕ Transaction</button>
      </div>
    </div>

    <!-- PAGE CONTENT -->
    <div class="page-content">

      <!-- DASHBOARD -->
      <div id="page-dashboard" class="page">
        <div id="dash-alerts"></div>

        <div class="kpi-grid">
          <div class="kpi-card nc-orange">
            <div class="kpi-label">💰 REVENUS TOTAUX</div>
            <div class="kpi-value" id="dash-revenu">—</div>
            <div class="kpi-icon">💰</div>
            <div class="kpi-meta" id="dash-revenu-meta"></div>
          </div>
          <div class="kpi-card nc-red">
            <div class="kpi-label">💳 DÉPENSES TOTALES</div>
            <div class="kpi-value" id="dash-depense">—</div>
            <div class="kpi-icon">💳</div>
          </div>
          <div class="kpi-card nc-green">
            <div class="kpi-label">📈 BÉNÉFICE NET</div>
            <div class="kpi-value" id="dash-benefice">—</div>
            <div class="kpi-icon">📈</div>
          </div>
          <div class="kpi-card nc-blue">
            <div class="kpi-label">🎯 MARGE MOYENNE</div>
            <div class="kpi-value" id="dash-marge">—</div>
            <div class="kpi-icon">🎯</div>
          </div>
          <div class="kpi-card nc-purple">
            <div class="kpi-label">🚚 CAMIONS ACTIFS</div>
            <div class="kpi-value" id="dash-actifs">—</div>
            <div class="kpi-icon">🚚</div>
          </div>
        </div>

        <div class="charts-grid">
          <div class="chart-card chart-full">
            <h3>📊 Performance par camion</h3>
            <canvas id="chart-perf"></canvas>
          </div>
          <div class="chart-card">
            <h3>💰 Répartition revenus</h3>
            <canvas id="chart-revenus"></canvas>
          </div>
          <div class="chart-card">
            <h3>💳 Répartition dépenses</h3>
            <canvas id="chart-depenses"></canvas>
          </div>
          <div class="chart-card chart-wide">
            <h3>📅 Évolution mensuelle</h3>
            <canvas id="chart-evol"></canvas>
          </div>
        </div>

        <div class="table-card">
          <div class="table-header">
            <h3>🚚 Résumé par camion</h3>
          </div>
          <div class="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Camion</th><th>Chauffeur</th>
                  <th class="text-right">Revenu</th><th class="text-right">Dépense</th>
                  <th class="text-right">Bénéfice</th><th class="text-right">Marge</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody id="dash-table-body"></tbody>
            </table>
          </div>
        </div>

        <div class="quick-actions-section">
          <h3>⚡ Actions rapides</h3>
          <div class="quick-action-grid">
            <button class="quick-action-btn" onclick="openAddVoyage()">🗺️ Nouveau voyage</button>
            <button class="quick-action-btn" onclick="openAddTx(null)">💳 Ajouter dépense</button>
            <button class="quick-action-btn" onclick="exportCSV()">📄 Rapport mensuel</button>
            <button class="quick-action-btn" onclick="exportCSV()">⬇️ Exporter CSV</button>
          </div>
        </div>

        <div class="activity-section">
          <h3>🕐 Activité récente</h3>
          <div class="activity-feed" id="activity-feed"></div>
        </div>
      </div>

      <!-- COMPARATIF -->
      <div id="page-comparatif" class="page">
        <div class="podium-container" id="podium"></div>
        <div class="charts-grid">
          <div class="chart-card">
            <h3>💰 Bénéfice net par camion</h3>
            <canvas id="chart-comp-benefice"></canvas>
          </div>
          <div class="chart-card">
            <h3>🎯 Marge bénéficiaire %</h3>
            <canvas id="chart-comp-marge"></canvas>
          </div>
        </div>
        <div class="table-card">
          <div class="table-header"><h3>🏆 Classement de rentabilité</h3></div>
          <div class="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Rang</th><th>Camion</th><th>Chauffeur</th>
                  <th class="text-right">Revenu</th><th class="text-right">Dépense</th>
                  <th class="text-right">Bénéfice</th><th class="text-right">Marge</th><th>Statut</th>
                </tr>
              </thead>
              <tbody id="comp-table-body"></tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- FICHE CAMION -->
      <div id="page-camion" class="page">
        <div class="table-card camion-info-card">
          <div class="table-header">
            <div>
              <h3 id="camion-nom">—</h3>
              <div class="camion-meta">
                <span id="camion-modele"></span>
                <span>·</span> Chauffeur : <strong id="camion-driver"></strong>
                <span>·</span> Immat : <span id="camion-immat"></span>
                <span>·</span> <span id="camion-statut"></span>
              </div>
            </div>
            <div class="camion-actions">
              <button class="btn btn-ghost btn-sm" onclick="openEditCamion(currentCamionId)">✏️ Modifier</button>
              <button class="btn btn-nc-primary btn-sm" onclick="openAddTx(currentCamionId)">➕ Transaction</button>
              <button class="btn btn-ghost btn-sm" onclick="exportCSV(currentCamionId)">⬇️ CSV</button>
            </div>
          </div>
        </div>

        <div class="kpi-grid">
          <div class="kpi-card nc-green">
            <div class="kpi-label">💰 Revenus</div>
            <div class="kpi-value" id="camion-revenu">—</div>
            <div class="kpi-icon">💰</div>
          </div>
          <div class="kpi-card nc-red">
            <div class="kpi-label">💳 Dépenses</div>
            <div class="kpi-value" id="camion-depense">—</div>
            <div class="kpi-icon">💳</div>
          </div>
          <div class="kpi-card nc-blue">
            <div class="kpi-label">📈 Bénéfice</div>
            <div class="kpi-value" id="camion-benefice">—</div>
            <div class="kpi-icon">📈</div>
          </div>
          <div class="kpi-card nc-orange">
            <div class="kpi-label">🎯 Marge</div>
            <div class="kpi-value" id="camion-marge">—</div>
            <div class="kpi-icon">🎯</div>
          </div>
        </div>

        <div class="charts-grid">
          <div class="chart-card">
            <h3>📅 Évolution mensuelle</h3>
            <canvas id="chart-camion-evol"></canvas>
          </div>
          <div class="chart-card">
            <h3>💳 Dépenses par catégorie</h3>
            <canvas id="chart-camion-cat"></canvas>
          </div>
        </div>

        <div class="fuel-section">
          <h3>⛽ Niveau carburant estimé</h3>
          <div class="fuel-gauge">
            <div class="fuel-gauge-fill" id="fuel-gauge-fill"></div>
          </div>
          <span id="fuel-level-text">—</span>
        </div>

        <div class="table-card">
          <div class="table-header">
            <h3>📋 Transactions</h3>
            <input type="text" id="tx-search" class="search-input" placeholder="🔍 Rechercher..." />
          </div>
          <div class="filter-bar">
            <button class="filter-btn tx-filter-btn active" data-cat="ALL">Tout</button>
            <button class="filter-btn tx-filter-btn" data-cat="REVENU">💰 Revenu</button>
            <button class="filter-btn tx-filter-btn" data-cat="CARBURANT">⛽ Carburant</button>
            <button class="filter-btn tx-filter-btn" data-cat="REPARATION">🔧 Réparation</button>
            <button class="filter-btn tx-filter-btn" data-cat="ENTRETIEN">🛠️ Entretien</button>
            <button class="filter-btn tx-filter-btn" data-cat="SALAIRE">💼 Salaire</button>
            <button class="filter-btn tx-filter-btn" data-cat="PRIME">🎁 Prime</button>
            <button class="filter-btn tx-filter-btn" data-cat="FRAIS_ROUTE">🛣️ Frais route</button>
            <button class="filter-btn tx-filter-btn" data-cat="AUTRES">⚙️ Autres</button>
          </div>
          <div class="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Date</th><th>Catégorie</th><th>Description</th>
                  <th class="text-right">Revenu</th><th class="text-right">Dépense</th>
                  <th>Paiement</th><th>Actions</th>
                </tr>
              </thead>
              <tbody id="tx-table-body"></tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- VOYAGES -->
      <div id="page-voyages" class="page">
        <div class="page-header">
          <h3>Tous les voyages</h3>
          <button class="btn btn-nc-primary btn-sm" onclick="openAddVoyage()">➕ Nouveau voyage</button>
        </div>
        <div class="table-card">
          <div class="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Date</th><th>Camion</th><th>Destination</th>
                  <th>Distance</th><th class="text-right">Revenu</th><th>Notes</th><th>Actions</th>
                </tr>
              </thead>
              <tbody id="voyages-table-body"></tbody>
            </table>
          </div>
        </div>
        <div class="voyages-grid" id="voyages-grid"></div>
      </div>

      <!-- MAINTENANCE -->
      <div id="page-maintenance" class="page">
        <div class="page-header">
          <h3>🔧 Maintenance</h3>
          <button class="btn btn-nc-primary btn-sm" onclick="openAddMaintenance()">➕ Ajouter</button>
        </div>
        <div id="maintenance-alerts"></div>
        <div class="table-card">
          <div class="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Date</th><th>Camion</th><th>Type</th>
                  <th>Description</th><th class="text-right">Coût</th><th>Actions</th>
                </tr>
              </thead>
              <tbody id="maintenance-table-body"></tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- FLOTTE -->
      <div id="page-flotte" class="page">
        <div class="page-header">
          <h3>⚙️ Gestion de la flotte</h3>
          <button class="btn btn-nc-primary btn-sm" onclick="openAddCamion()">➕ Ajouter un camion</button>
        </div>
        <div class="camion-grid" id="flotte-grid"></div>
      </div>

      <!-- USERS -->
      <div id="page-users" class="page"></div>

    </div><!-- /page-content -->
  </div><!-- /main-content -->
</div><!-- /app-shell -->

<!-- MODAL: TRANSACTION -->
<div id="tx-modal" class="modal-overlay" style="display:none">
  <div class="modal-card">
    <div class="modal-header">
      <h3 id="tx-modal-title">Transaction</h3>
      <button class="btn btn-ghost btn-icon" onclick="closeModal('tx-modal')">✕</button>
    </div>
    <div class="modal-body">
      <form id="tx-form" onsubmit="event.preventDefault(); saveTx()">
        <input type="hidden" id="tx-camion-id" />
        <div class="form-row">
          <div class="form-group">
            <label>Date *</label>
            <input type="date" id="tx-date" class="form-control" required />
          </div>
          <div class="form-group">
            <label>Catégorie *</label>
            <select id="tx-categorie" class="form-control" required>
              <option value="">— Choisir —</option>
              <option value="REVENU">💰 Revenu</option>
              <option value="CARBURANT">⛽ Carburant</option>
              <option value="REPARATION">🔧 Réparation</option>
              <option value="ENTRETIEN">🛠️ Entretien</option>
              <option value="SALAIRE">💼 Salaire</option>
              <option value="PRIME">🎁 Prime</option>
              <option value="FRAIS_ROUTE">🛣️ Frais de route</option>
              <option value="AUTRES">⚙️ Autres</option>
            </select>
          </div>
        </div>
        <div class="form-group">
          <label>Description *</label>
          <input type="text" id="tx-description" class="form-control" placeholder="Ex: 1100 L carburant" required />
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>Revenu (FCFA)</label>
            <input type="number" id="tx-revenu" class="form-control" min="0" placeholder="0" />
          </div>
          <div class="form-group">
            <label>Dépense (FCFA)</label>
            <input type="number" id="tx-depense" class="form-control" min="0" placeholder="0" />
          </div>
        </div>
        <div class="form-group">
          <label>Mode de paiement</label>
          <select id="tx-paiement" class="form-control">
            <option value="Espèce">Espèce</option>
            <option value="Virement">Virement</option>
            <option value="Chèque">Chèque</option>
            <option value="Mobile Money">Mobile Money</option>
          </select>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-ghost" onclick="closeModal('tx-modal')">Annuler</button>
          <button type="submit" class="btn btn-nc-primary">💾 Enregistrer</button>
        </div>
      </form>
    </div>
  </div>
</div>

<!-- MODAL: CAMION -->
<div id="camion-modal" class="modal-overlay" style="display:none">
  <div class="modal-card">
    <div class="modal-header">
      <h3 id="camion-modal-title">Camion</h3>
      <button class="btn btn-ghost btn-icon" onclick="closeModal('camion-modal')">✕</button>
    </div>
    <div class="modal-body">
      <form id="camion-form" onsubmit="event.preventDefault(); saveCamion()">
        <div class="form-row">
          <div class="form-group">
            <label>Nom *</label>
            <input type="text" id="edit-camion-nom" class="form-control" placeholder="CAMION 6" required />
          </div>
          <div class="form-group">
            <label>Modèle</label>
            <input type="text" id="edit-camion-modele" class="form-control" placeholder="Renault Blanc" />
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>Chauffeur</label>
            <input type="text" id="edit-camion-driver" class="form-control" placeholder="Nom du chauffeur" />
          </div>
          <div class="form-group">
            <label>Immatriculation</label>
            <input type="text" id="edit-camion-immat" class="form-control" placeholder="ML-001-BA" />
          </div>
        </div>
        <div class="form-group">
          <label>Statut</label>
          <select id="edit-camion-statut" class="form-control">
            <option value="actif">Actif</option>
            <option value="inactif">Inactif</option>
            <option value="maintenance">En maintenance</option>
          </select>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-ghost" onclick="closeModal('camion-modal')">Annuler</button>
          <button type="submit" class="btn btn-nc-primary">💾 Enregistrer</button>
        </div>
      </form>
    </div>
  </div>
</div>

<!-- MODAL: VOYAGE -->
<div id="voyage-modal" class="modal-overlay" style="display:none">
  <div class="modal-card">
    <div class="modal-header">
      <h3 id="voyage-modal-title">Nouveau voyage</h3>
      <button class="btn btn-ghost btn-icon" onclick="closeModal('voyage-modal')">✕</button>
    </div>
    <div class="modal-body">
      <form id="voyage-form" onsubmit="event.preventDefault(); saveVoyage()">
        <div class="form-group">
          <label>Camion *</label>
          <select id="voyage-camion" class="form-control" required></select>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>Date départ *</label>
            <input type="date" id="voyage-date-depart" class="form-control" required />
          </div>
          <div class="form-group">
            <label>Date retour</label>
            <input type="date" id="voyage-date-retour" class="form-control" />
          </div>
        </div>
        <div class="form-group">
          <label>Destination *</label>
          <input type="text" id="voyage-destination" class="form-control" placeholder="Ex: Bamako → Mopti" required />
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>Distance (km)</label>
            <input type="number" id="voyage-distance" class="form-control" min="0" placeholder="0" />
          </div>
          <div class="form-group">
            <label>Revenu (FCFA)</label>
            <input type="number" id="voyage-revenu" class="form-control" min="0" placeholder="0" />
          </div>
        </div>
        <div class="form-group">
          <label>Notes</label>
          <textarea id="voyage-notes" class="form-control" rows="2" placeholder="Observations..."></textarea>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-ghost" onclick="closeModal('voyage-modal')">Annuler</button>
          <button type="submit" class="btn btn-nc-primary">💾 Enregistrer</button>
        </div>
      </form>
    </div>
  </div>
</div>

<!-- MODAL: MAINTENANCE -->
<div id="maintenance-modal" class="modal-overlay" style="display:none">
  <div class="modal-card">
    <div class="modal-header">
      <h3 id="maintenance-modal-title">Maintenance</h3>
      <button class="btn btn-ghost btn-icon" onclick="closeModal('maintenance-modal')">✕</button>
    </div>
    <div class="modal-body">
      <form id="maintenance-form" onsubmit="event.preventDefault(); saveMaintenance()">
        <div class="form-row">
          <div class="form-group">
            <label>Camion *</label>
            <select id="maint-camion" class="form-control" required></select>
          </div>
          <div class="form-group">
            <label>Date *</label>
            <input type="date" id="maint-date" class="form-control" required />
          </div>
        </div>
        <div class="form-group">
          <label>Type *</label>
          <select id="maint-type" class="form-control" required>
            <option value="">— Choisir —</option>
            <option value="VIDANGE">🛢️ Vidange</option>
            <option value="PNEUS">🔄 Pneus</option>
            <option value="FREINS">🛑 Freins</option>
            <option value="MOTEUR">⚙️ Moteur</option>
            <option value="CARROSSERIE">🚛 Carrosserie</option>
            <option value="AUTRE">🔧 Autre</option>
          </select>
        </div>
        <div class="form-group">
          <label>Description</label>
          <input type="text" id="maint-description" class="form-control" placeholder="Détails de l'intervention" />
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>Coût (FCFA)</label>
            <input type="number" id="maint-cout" class="form-control" min="0" placeholder="0" />
          </div>
          <div class="form-group">
            <label>Prochain entretien (km)</label>
            <input type="number" id="maint-prochain-km" class="form-control" min="0" placeholder="0" />
          </div>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-ghost" onclick="closeModal('maintenance-modal')">Annuler</button>
          <button type="submit" class="btn btn-nc-primary">💾 Enregistrer</button>
        </div>
      </form>
    </div>
  </div>
</div>

<!-- TOAST CONTAINER -->
<div id="toast-container" class="toast-container"></div>

<script src="api.js"></script>
<script src="charts.js"></script>
<script src="app.js"></script>
</body>
</html>
'@

Set-Content -Path "fleet-manager/index.html" -Value $html -Encoding UTF8
Write-Host "index.html written."
