// ============================================================
// APP.JS v3 - NC Mali Fleet Manager
// Complet, propre, sans doublons
// ============================================================

// ---- Constants ----
const CATEGORIES = [
  { id: 'REVENU',      label: 'Revenu',         icon: '💰', color: '#10B981' },
  { id: 'CARBURANT',   label: 'Carburant',      icon: '⛽', color: '#F59E0B' },
  { id: 'REPARATION',  label: 'Réparation',     icon: '🔧', color: '#EF4444' },
  { id: 'ENTRETIEN',   label: 'Entretien',      icon: '🛠️', color: '#8B5CF6' },
  { id: 'SALAIRE',     label: 'Salaire',        icon: '💼', color: '#3B82F6' },
  { id: 'PRIME',       label: 'Prime',          icon: '🎁', color: '#06B6D4' },
  { id: 'FRAIS_ROUTE', label: 'Frais de route', icon: '🛣️', color: '#EB6B00' },
  { id: 'AUTRES',      label: 'Autres',         icon: '⚙️', color: '#6B7280' }
];

// ---- State ----
let currentPage     = 'dashboard';
let currentCamionId = null;
let txFilter        = 'ALL';
let txSearch        = '';
let txDateDebut     = '';
let txDateFin       = '';
let _editTxId       = null;
let _editCamionId   = null;
let _rapportAllTx   = [];
let _lastCamionStats = null;
let _isLoading      = false;

// ============================================================
// HELPERS
// ============================================================
const fmt = n => (n == null || isNaN(n)) ? '—' : new Intl.NumberFormat('fr-FR').format(Math.round(n)) + ' FCFA';
const fmtK = n => {
  if (n == null || isNaN(n)) return '—';
  const abs = Math.abs(n);
  const sign = n < 0 ? '-' : '';
  if (abs >= 1000000) return sign + (abs/1000000).toFixed(1) + 'M FCFA';
  if (abs >= 1000)    return sign + (abs/1000).toFixed(0) + 'k FCFA';
  return fmt(n);
};
const fmtPct = n => (n == null || isNaN(n)) ? '—' : (n >= 0 ? '+' : '') + n.toFixed(1) + '%';
const fmtDate = d => {
  if (!d) return '—';
  const s = d.split('T')[0];
  const [y, m, j] = s.split('-');
  return j + '/' + m + '/' + y;
};
const fmtMonth = m => {
  if (!m) return '—';
  const [y, mo] = m.split('-');
  return new Date(y, mo-1).toLocaleDateString('fr-FR', { month: 'short', year: '2-digit' });
};

const catInfo = id => CATEGORIES.find(c => c.id === id) || { label: id, icon: '⚙️', color: '#6B7280' };

const catBadge = id => {
  const c = catInfo(id);
  const cls = { REVENU:'badge-success', CARBURANT:'badge-warning', REPARATION:'badge-danger',
    ENTRETIEN:'badge-orange', SALAIRE:'badge-info', PRIME:'badge-info',
    FRAIS_ROUTE:'badge-orange', AUTRES:'badge-muted' };
  return `<span class="badge ${cls[id]||'badge-muted'}">${c.icon} ${c.label}</span>`;
};

const beneficeHtml = v => {
  if (v > 0) return `<span class="text-success font-bold">${fmt(v)}</span>`;
  if (v < 0) return `<span class="text-danger font-bold">${fmt(v)}</span>`;
  return `<span class="text-muted">0 FCFA</span>`;
};

const statutBadge = s => {
  const map = { actif:'badge-success', inactif:'badge-muted', maintenance:'badge-warning' };
  const icons = { actif:'✅', inactif:'⏸️', maintenance:'🔧' };
  return `<span class="badge ${map[s]||'badge-muted'}">${icons[s]||''} ${s||'—'}</span>`;
};

const calcStats = txs => {
  const rev = txs.reduce((s,t) => s+(t.revenu||0), 0);
  const dep = txs.reduce((s,t) => s+(t.depense||0), 0);
  return { rev, dep, ben: rev-dep, marge: rev>0 ? ((rev-dep)/rev)*100 : 0 };
};

// ============================================================
// TOAST
// ============================================================
function toast(msg, type = 'info') {
  const icons = { success:'✅', error:'❌', warning:'⚠️', info:'ℹ️' };
  const container = document.getElementById('toast-container');
  if (!container) return;
  const el = document.createElement('div');
  el.className = `toast toast-${type === 'error' ? 'danger' : type}`;
  el.innerHTML = `<span class="toast-icon">${icons[type]||'ℹ️'}</span><div class="toast-content"><div class="toast-message">${msg}</div></div><button class="toast-close" onclick="this.parentElement.remove()">✕</button>`;
  container.appendChild(el);
  setTimeout(() => { el.classList.add('toast-exit'); setTimeout(() => el.remove(), 300); }, 4500);
}

// ============================================================
// LOADING STATE
// ============================================================
function setLoading(id, on) {
  const el = document.getElementById(id);
  if (!el) return;
  if (on) { el.classList.add('skeleton'); el.dataset.orig = el.textContent; el.textContent = '...'; }
  else    { el.classList.remove('skeleton'); if (el.dataset.orig !== undefined) { el.textContent = el.dataset.orig; delete el.dataset.orig; } }
}

// ============================================================
// MODAL HELPERS
// ============================================================
function openModal(id) {
  const el = document.getElementById(id);
  if (el) el.style.display = 'flex';
}
function closeModal(id) {
  const el = document.getElementById(id);
  if (el) el.style.display = 'none';
}

// ESC key closes modals
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    document.querySelectorAll('.modal-overlay[style*="flex"]').forEach(m => m.style.display = 'none');
  }
});

// ============================================================
// CONFIRM DIALOG (styled)
// ============================================================
function confirmDialog(msg, onConfirm) {
  const id = 'confirm-modal';
  document.getElementById('confirm-msg').textContent = msg;
  document.getElementById('confirm-ok').onclick = () => { closeModal(id); onConfirm(); };
  openModal(id);
}

// ============================================================
// ROUTER
// ============================================================

// ---- Clock Update ----
function updateClock() {
  const now = new Date();
  
  // Format date: "Lun 08 Avr"
  const days = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];
  const months = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];
  
  const dayName = days[now.getDay()];
  const dayNum = String(now.getDate()).padStart(2, '0');
  const monthName = months[now.getMonth()];
  const dateString = `${dayName} ${dayNum} ${monthName}`;
  
  // Format time: "14:32:45"
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');
  const timeString = `${hours}:${minutes}:${seconds}`;
  
  const dateEl = document.getElementById('clock-date');
  const timeEl = document.getElementById('clock-time');
  
  if (dateEl) dateEl.textContent = dateString;
  if (timeEl) timeEl.textContent = timeString;
}

// Mettre à jour l'horloge toutes les secondes
setInterval(updateClock, 1000);
updateClock(); // Appel initial

function navigate(page, camionId = null) {
  currentPage = page;
  if (camionId !== null) currentCamionId = camionId;

  document.querySelectorAll('.page-content').forEach(p => p.style.display = 'none');
  document.querySelectorAll('.nav-item').forEach(a => {
    const match = a.dataset.page === page && (page !== 'camion' || parseInt(a.dataset.camion) === currentCamionId);
    a.classList.toggle('active', match);
  });

  const titles = {
    dashboard:   'Tableau de Bord',
    comparatif:  'Comparatif Performance',
    rapports:    'Analyse Financière',
    flotte:      'Gestion de la Flotte',
    users:       'Utilisateurs',
    parametres:  'Paramètres & Profil',
    maintenance: 'Gestion de la Maintenance',
    paie:        'Paie & Salaires',
    alertes:     'Alertes & Notifications',
    camion:      ''
  };
  const titleEl = document.getElementById('page-title');
  if (titleEl) titleEl.textContent = titles[page] || '';

  const pageEl = document.getElementById('page-' + page);
  if (pageEl) pageEl.style.display = 'block';

  const dispatch = {
    dashboard:   renderDashboard,
    comparatif:  renderComparatif,
    rapports:    renderAnalyse,
    flotte:      renderFlotte,
    users:       renderUsers,
    parametres:  renderParametres,
    maintenance: renderMaintenance,
    paie:        renderPaie,
    alertes:     renderAlertes,
    camion:      () => renderCamion(currentCamionId),
  };
  if (dispatch[page]) dispatch[page]();
}

// ============================================================
// DASHBOARD
// ============================================================
async function renderDashboard() {
  try {
    const [stats, allCamions] = await Promise.all([API.getStats(), API.getStatsCamionsAll()]);
    // Actifs pour les graphiques de performance, tous pour le tableau résumé
    const camionsActifs = allCamions.filter(c => c.statut === 'actif');

    // KPIs avec animation
    const kpiMap = {
      'dash-revenu':   fmt(stats.totalRevenu),
      'dash-depense':  fmt(stats.totalDepense),
      'dash-benefice': fmt(stats.benefice),
      'dash-marge':    fmtPct(stats.marge),
      'dash-actifs':   String(camionsActifs.length),
    };
    Object.entries(kpiMap).forEach(([id, val]) => {
      const el = document.getElementById(id);
      if (el) el.textContent = val;
    });
    const bEl = document.getElementById('dash-benefice');
    if (bEl) bEl.className = 'kpi-value ' + (stats.benefice >= 0 ? 'text-success' : 'text-danger');
    const mEl = document.getElementById('dash-marge');
    if (mEl) mEl.className = 'kpi-value ' + (stats.marge >= 0 ? 'text-success' : 'text-danger');
    const metaEl = document.getElementById('dash-actifs-meta');
    if (metaEl) metaEl.textContent = `sur ${allCamions.length} camions`;
    const margeMetaEl = document.getElementById('dash-marge-meta');
    if (margeMetaEl) margeMetaEl.textContent = `Marge ${fmtPct(stats.marge)}`;

    // Alertes intelligentes (tous les camions)
    const alertsEl = document.getElementById('dash-alerts');
    if (alertsEl) {
      const alerts = allCamions.filter(c => c.marge < 0 || c.statut === 'maintenance').map(c => {
        if (c.statut === 'maintenance')
          return `<div class="alert alert-warning"><span class="alert-icon">🔧</span><div><div class="alert-title">${c.nom} en maintenance</div></div></div>`;
        if (c.marge < -20)
          return `<div class="alert alert-danger"><span class="alert-icon">🚨</span><div><div class="alert-title">${c.nom} — marge critique ${fmtPct(c.marge)}</div><div class="alert-body">Dépenses supérieures aux revenus de ${fmt(Math.abs(c.benefice))}</div></div></div>`;
        return `<div class="alert alert-warning"><span class="alert-icon">⚠️</span><div><div class="alert-title">${c.nom} — marge négative ${fmtPct(c.marge)}</div></div></div>`;
      });
      alertsEl.innerHTML = alerts.join('');
    }

    // Tableau résumé — tous les camions
    const tbody = document.getElementById('dash-table-body');
    if (tbody) {
      tbody.innerHTML = allCamions.map(c => {
        const pct = Math.min(Math.abs(c.marge), 100);
        const barColor = c.marge >= 0 ? 'fill-green' : 'fill-red';
        return `<tr>
          <td class="td-primary">${statutBadge(c.statut)} ${c.nom}</td>
          <td>${c.chauffeur || '<span class="text-faint">—</span>'}</td>
          <td class="text-right">${fmt(c.totalRevenu)}</td>
          <td class="text-right">${fmt(c.totalDepense)}</td>
          <td class="text-right">${beneficeHtml(c.benefice)}</td>
          <td class="text-right" style="min-width:130px">
            <span class="${c.marge >= 0 ? 'text-success' : 'text-danger'}">${fmtPct(c.marge)}</span>
            <div class="progress-bar-wrap thin" style="margin-top:4px">
              <div class="progress-bar-fill ${barColor}" style="width:${pct}%"></div>
            </div>
          </td>
          <td><button class="btn btn-ghost btn-sm" onclick="navigate('camion',${c.id})">Voir →</button></td>
        </tr>`;
      }).join('');
    }

    // Activité récente
    const allTx = await API.getTransactions();
    const actEl = document.getElementById('dash-activity');
    if (actEl) {
      actEl.innerHTML = allTx.slice(0, 10).map(t => {
        const c = allCamions.find(x => x.id === t.camion_id);
        const ci = catInfo(t.categorie);
        const dotClass = t.revenu > 0 ? 'dot-green' : t.categorie === 'REPARATION' ? 'dot-red' : 'dot-orange';
        return `<div class="activity-item">
          <div class="activity-dot ${dotClass}">${ci.icon}</div>
          <div class="activity-content">
            <div class="activity-text"><strong>${c ? c.nom : '?'}</strong> — ${t.description || '—'}</div>
            <div class="activity-time">${fmtDate(t.date)} · ${t.revenu > 0 ? `<span class="text-success">+${fmt(t.revenu)}</span>` : `<span class="text-danger">-${fmt(t.depense)}</span>`}</div>
          </div>
        </div>`;
      }).join('') || '<div class="empty-state"><div class="empty-state-icon">📭</div><div class="empty-state-text">Aucune activité</div></div>';
    }

    // Graphiques — seulement les camions ACTIFS
    const labels = camionsActifs.map(c => c.nom);
    Charts.bar('chart-perf', labels, [
      { label: 'Revenus',  data: camionsActifs.map(c => c.totalRevenu),  color: '#10B981' },
      { label: 'Dépenses', data: camionsActifs.map(c => c.totalDepense), color: '#EB0046' },
      { label: 'Bénéfice', data: camionsActifs.map(c => c.benefice),     color: '#EB6B00' },
    ]);
    Charts.doughnut('chart-revenus',  labels, camionsActifs.map(c => c.totalRevenu));
    Charts.doughnut('chart-depenses', labels, camionsActifs.map(c => c.totalDepense));
    if (stats.monthly?.length) {
      Charts.line('chart-evol', stats.monthly.map(m => fmtMonth(m.mois)), [
        { label: 'Revenus',  data: stats.monthly.map(m => m.revenu),  color: '#10B981' },
        { label: 'Dépenses', data: stats.monthly.map(m => m.depense), color: '#EB0046' },
        { label: 'Bénéfice', data: stats.monthly.map(m => m.revenu - m.depense), color: '#EB6B00', fill: false },
      ]);
    }

    // Mini gauge marge
    const gaugeEl = document.getElementById('chart-marge-gauge');
    if (gaugeEl) {
      const marge = Math.max(0, Math.min(stats.marge, 100));
      const color = marge >= 20 ? '#10B981' : marge >= 0 ? '#F59E0B' : '#EF4444';
      Charts.gauge('chart-marge-gauge', marge, 100, color);
    }

  } catch(e) { toast('Erreur dashboard: ' + e.message, 'error'); }
}

// ============================================================
// COMPARATIF
// ============================================================
async function renderComparatif() {
  try {
    // Seulement les camions actifs dans le comparatif
    const camions = await API.getStatsCamions();
    const sorted = [...camions].sort((a, b) => b.benefice - a.benefice);
    const medals = ['🥇', '🥈', '🥉'];

    // Indicateur "actifs seulement" dans le header
    const header = document.querySelector('#page-comparatif .page-header');
    if (header && !document.getElementById('actifs-badge')) {
      const badge = document.createElement('span');
      badge.id = 'actifs-badge';
      badge.className = 'badge badge-success';
      badge.style.cssText = 'margin-left:10px;font-size:0.72rem;vertical-align:middle';
      badge.textContent = `✅ ${camions.length} camion${camions.length !== 1 ? 's' : ''} actif${camions.length !== 1 ? 's' : ''}`;
      const titleEl = header.querySelector('.page-title');
      if (titleEl) titleEl.appendChild(badge);
    } else if (document.getElementById('actifs-badge')) {
      document.getElementById('actifs-badge').textContent = `✅ ${camions.length} camion${camions.length !== 1 ? 's' : ''} actif${camions.length !== 1 ? 's' : ''}`;
    }

    // Podium
    const podiumEl = document.getElementById('podium');
    if (podiumEl) {
      podiumEl.innerHTML = sorted.slice(0, 3).map((c, i) => {
        const initials = c.nom.replace(/[^A-Z0-9]/gi, '').slice(0, 2).toUpperCase() || c.nom.slice(0, 2).toUpperCase();
        return `<div class="podium-item">
          <div class="podium-avatar">${initials}</div>
          <div class="podium-name">${medals[i]} ${c.nom}</div>
          <div class="podium-score">${fmt(c.benefice)}</div>
          <div class="podium-marge">${fmtPct(c.marge)}</div>
          <div class="podium-bar"></div>
        </div>`;
      }).join('');
    }

    // Table
    const tbody = document.getElementById('comp-table-body');
    if (tbody) {
      tbody.innerHTML = sorted.map((c, i) => `<tr>
        <td><strong>#${i+1}</strong></td>
        <td class="td-primary">${medals[i]||''} ${c.nom}</td>
        <td>${c.chauffeur || '—'}</td>
        <td class="text-right">${fmt(c.totalRevenu)}</td>
        <td class="text-right">${fmt(c.totalDepense)}</td>
        <td class="text-right">${beneficeHtml(c.benefice)}</td>
        <td class="text-right"><span class="${c.marge >= 0 ? 'text-success' : 'text-danger'}">${fmtPct(c.marge)}</span></td>
        <td>${statutBadge(c.statut)}</td>
      </tr>`).join('');
    }

    // Graphiques
    Charts.bar('chart-comp-benefice', sorted.map(c => c.nom), [
      { label: 'Bénéfice net', data: sorted.map(c => c.benefice), color: sorted.map(c => c.benefice >= 0 ? '#10B981' : '#EF4444') }
    ]);
    Charts.bar('chart-comp-marge', sorted.map(c => c.nom), [
      { label: 'Marge %', data: sorted.map(c => c.marge), color: sorted.map(c => c.marge >= 0 ? '#EB6B00' : '#EB0046') }
    ]);

    // Radar comparatif (si canvas existe)
    const radarEl = document.getElementById('chart-comp-radar');
    if (radarEl && sorted.length >= 2) {
      const radarLabels = ['Revenus', 'Dépenses', 'Bénéfice', 'Marge', 'Efficacité'];
      const maxRev = Math.max(...sorted.map(c => c.totalRevenu), 1);
      const maxDep = Math.max(...sorted.map(c => c.totalDepense), 1);
      const maxBen = Math.max(...sorted.map(c => Math.abs(c.benefice)), 1);
      Charts.radar('chart-comp-radar', radarLabels,
        sorted.slice(0, 3).map((c, i) => ({
          label: c.nom,
          data: [
            (c.totalRevenu / maxRev) * 100,
            100 - (c.totalDepense / maxDep) * 100,
            ((c.benefice + maxBen) / (2 * maxBen)) * 100,
            Math.max(0, Math.min(c.marge + 50, 100)),
            c.statut === 'actif' ? 100 : 30,
          ],
          color: ['#EB6B00','#10B981','#3B82F6'][i],
        }))
      );
    }
  } catch(e) { toast('Erreur comparatif: ' + e.message, 'error'); }
}

// ============================================================
// ANALYSE FINANCIERE
// ============================================================
async function renderAnalyse() {
  try {
    const [allTx, allCamions] = await Promise.all([API.getTransactions(), API.getCamions()]);
    // Seulement les camions actifs pour l'analyse
    const camions = allCamions.filter(c => c.statut === 'actif');
    _rapportAllTx = allTx;

    // Populate selectors
    const periodeA = document.getElementById('periode-a');
    const periodeB = document.getElementById('periode-b');
    const analyseCamion = document.getElementById('analyse-camion');

    if (periodeA && periodeA.options.length <= 1) {
      const months = [...new Set(allTx.map(t => t.date?.substring(0,7)).filter(Boolean))].sort();
      months.forEach(m => {
        const [y, mo] = m.split('-');
        const label = new Date(y, mo-1).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
        [periodeA, periodeB].forEach(sel => {
          const opt = document.createElement('option');
          opt.value = m; opt.textContent = label;
          sel.appendChild(opt);
        });
      });
      if (months.length >= 2) { periodeA.value = months[months.length-2]; periodeB.value = months[months.length-1]; }
      else if (months.length === 1) periodeA.value = months[0];
    }

    if (analyseCamion && analyseCamion.options.length <= 1) {
      // Seulement les camions actifs dans le sélecteur
      camions.forEach(c => {
        const opt = document.createElement('option');
        opt.value = c.id; opt.textContent = c.nom;
        analyseCamion.appendChild(opt);
      });
    }

    const selCamion = parseInt(analyseCamion?.value) || null;
    const pA = periodeA?.value || '';
    const pB = periodeB?.value || '';
    let txFiltered = selCamion ? allTx.filter(t => t.camion_id == selCamion) : allTx;

    const txA = pA ? txFiltered.filter(t => t.date?.startsWith(pA)) : txFiltered;
    const txB = pB ? txFiltered.filter(t => t.date?.startsWith(pB)) : [];
    const sA = calcStats(txA), sB = calcStats(txB);

    // KPIs avec delta
    const delta = (a, b, isMarge) => {
      if (!pB) return '';
      const diff = a - b;
      const pct = b !== 0 ? ((diff/Math.abs(b))*100).toFixed(1) : '—';
      const cls = diff > 0 ? 'positive' : diff < 0 ? 'negative' : 'neutral';
      const arrow = diff > 0 ? '▲' : diff < 0 ? '▼' : '—';
      return `<div class="kpi-delta ${cls}">${arrow} ${isMarge ? diff.toFixed(1)+'%' : fmtK(Math.abs(diff))} (${pct}%)</div>`;
    };

    const kpiEl = document.getElementById('analyse-kpis');
    if (kpiEl) kpiEl.innerHTML = [
      ['nc-green','💰', pA ? `Revenus ${pA}` : 'Revenus', fmt(sA.rev), delta(sA.rev, sB.rev)],
      ['nc-red',  '💳', pA ? `Dépenses ${pA}` : 'Dépenses', fmt(sA.dep), delta(sA.dep, sB.dep)],
      ['nc-orange','📈', pA ? `Bénéfice ${pA}` : 'Bénéfice', fmt(sA.ben), delta(sA.ben, sB.ben)],
      ['nc-blue', '🎯', 'Marge', fmtPct(sA.marge), delta(sA.marge, sB.marge, true)],
    ].map(([cls,icon,label,val,d]) =>
      `<div class="kpi-card ${cls}"><div class="kpi-icon">${icon}</div><div class="kpi-label">${label}</div><div class="kpi-value">${val}</div>${d}</div>`
    ).join('');

    // Évolution mensuelle
    const monthly = {};
    txFiltered.forEach(t => {
      if (!t.date) return;
      const m = t.date.substring(0,7);
      if (!monthly[m]) monthly[m] = { rev:0, dep:0 };
      monthly[m].rev += t.revenu||0;
      monthly[m].dep += t.depense||0;
    });
    const mKeys = Object.keys(monthly).sort();
    const mLabels = mKeys.map(fmtMonth);

    Charts.line('chart-analyse-evol', mLabels, [
      { label:'Revenus',  data: mKeys.map(k => monthly[k].rev), color:'#10B981' },
      { label:'Dépenses', data: mKeys.map(k => monthly[k].dep), color:'#EB0046' },
      { label:'Bénéfice', data: mKeys.map(k => monthly[k].rev - monthly[k].dep), color:'#EB6B00', fill: false },
    ]);

    // Comparatif A vs B
    if (pA && pB) {
      Charts.bar('chart-analyse-compare', ['Revenus','Dépenses','Bénéfice'], [
        { label: pA, data: [sA.rev, sA.dep, sA.ben], color: '#EB6B00' },
        { label: pB, data: [sB.rev, sB.dep, sB.ben], color: '#3B82F6' },
      ]);
    }

    // Dépenses par catégorie
    const byCat = {};
    txFiltered.filter(t => t.depense > 0).forEach(t => { byCat[t.categorie] = (byCat[t.categorie]||0) + t.depense; });
    const catKeys = Object.keys(byCat).sort((a,b) => byCat[b] - byCat[a]);
    if (catKeys.length) Charts.doughnut('chart-analyse-depenses', catKeys.map(k => catInfo(k).icon+' '+catInfo(k).label), catKeys.map(k => byCat[k]));

    // Bénéfice par camion par mois
    const camionColors = ['#EB6B00','#EB0046','#10B981','#3B82F6','#8B5CF6'];
    Charts.bar('chart-analyse-benefice', mLabels,
      camions.map((c,i) => ({
        label: c.nom,
        data: mKeys.map(m => {
          const txs = allTx.filter(t => t.camion_id==c.id && t.date?.startsWith(m));
          return txs.reduce((s,t)=>s+(t.revenu||0),0) - txs.reduce((s,t)=>s+(t.depense||0),0);
        }),
        color: camionColors[i % camionColors.length],
      }))
    );

    // Tableau synthèse mensuelle
    const tbody = document.getElementById('analyse-monthly-body');
    if (tbody) {
      tbody.innerHTML = mKeys.map((m, i) => {
        const { rev, dep } = monthly[m];
        const ben = rev - dep, mg = rev > 0 ? (ben/rev)*100 : 0;
        const prev = i > 0 ? monthly[mKeys[i-1]] : null;
        const prevBen = prev ? prev.rev - prev.dep : null;
        let trend = '<span class="trend-flat">—</span>';
        if (prevBen !== null) {
          const diff = ben - prevBen;
          trend = diff > 0 ? `<span class="trend-up">▲ ${fmtK(diff)}</span>` : diff < 0 ? `<span class="trend-down">▼ ${fmtK(Math.abs(diff))}</span>` : '<span class="trend-flat">=</span>';
        }
        const [y, mo] = m.split('-');
        const label = new Date(y, mo-1).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
        return `<tr>
          <td class="td-primary">${label}</td>
          <td class="text-right text-success">${fmt(rev)}</td>
          <td class="text-right text-danger">${fmt(dep)}</td>
          <td class="text-right">${beneficeHtml(ben)}</td>
          <td class="text-right"><span class="${mg>=0?'text-success':'text-danger'}">${fmtPct(mg)}</span></td>
          <td class="text-right">${trend}</td>
        </tr>`;
      }).join('') || '<tr><td colspan=6 style="text-align:center;padding:24px;color:var(--text-faint)">Aucune donnée</td></tr>';
    }

    renderRapportTableData(txFiltered, camions);
  } catch(e) { toast('Erreur analyse: ' + e.message, 'error'); }
}

function filterRapportTable() {
  const search = (document.getElementById('rapport-search')?.value||'').toLowerCase();
  const cat    = document.getElementById('rapport-cat-filter')?.value||'';
  API.getCamions().then(camions => {
    let txs = _rapportAllTx;
    if (cat)    txs = txs.filter(t => t.categorie === cat);
    if (search) txs = txs.filter(t => (t.description||'').toLowerCase().includes(search) || (camions.find(c=>c.id==t.camion_id)?.nom||'').toLowerCase().includes(search));
    renderRapportTableData(txs, camions);
  });
}

function renderRapportTableData(txs, camions) {
  const tbody = document.getElementById('rapport-table-body');
  if (!tbody) return;
  if (!txs.length) { tbody.innerHTML = '<tr><td colspan=7 style="text-align:center;padding:32px;color:var(--text-faint)">Aucune transaction</td></tr>'; return; }
  tbody.innerHTML = txs.map(t => {
    const c = camions.find(x => x.id == t.camion_id);
    return `<tr>
      <td class="td-mono">${fmtDate(t.date)}</td>
      <td>${c ? c.nom : '—'}</td>
      <td>${catBadge(t.categorie)}</td>
      <td>${t.description||'—'}</td>
      <td class="text-right">${t.revenu>0 ? `<span class="text-success">${fmt(t.revenu)}</span>` : '—'}</td>
      <td class="text-right">${t.depense>0 ? `<span class="text-danger">${fmt(t.depense)}</span>` : '—'}</td>
      <td><span class="badge badge-muted">${t.mode_paiement||'—'}</span></td>
    </tr>`;
  }).join('');
}

// ============================================================
// FICHE CAMION 360°
// ============================================================
function switchCamionTab(tab) {
  document.querySelectorAll('.camion-tab').forEach(el => el.style.display = 'none');
  document.querySelectorAll('#camion-tabs .tab-btn').forEach(btn => btn.classList.toggle('active', btn.dataset.tab === tab));
  const el = document.getElementById('tab-' + tab);
  if (el) el.style.display = '';
  if (tab === 'graphiques')  renderCamionCharts(_lastCamionStats);
  if (tab === 'reparations') renderReparations(currentCamionId);
  if (tab === 'historique')  renderHistorique360(currentCamionId);
}

async function renderCamion(camionId) {
  try {
    const [camions, stats] = await Promise.all([API.getCamions(), API.getStats(camionId)]);
    const camion = camions.find(c => c.id == camionId);
    if (!camion) { toast('Camion introuvable', 'error'); return; }
    _lastCamionStats = stats;

    document.getElementById('page-title').textContent = camion.nom;
    document.getElementById('camion-nom').textContent    = camion.nom;
    document.getElementById('camion-modele').textContent = camion.modele || '';
    document.getElementById('camion-driver').textContent = camion.chauffeur || 'Non assigné';
    document.getElementById('camion-immat').textContent  = camion.immatriculation || '—';
    document.getElementById('camion-statut').innerHTML   = statutBadge(camion.statut);

    document.getElementById('camion-revenu').textContent  = fmt(stats.totalRevenu);
    document.getElementById('camion-depense').textContent = fmt(stats.totalDepense);
    const bEl = document.getElementById('camion-benefice');
    bEl.textContent = fmt(stats.benefice);
    bEl.className = 'kpi-value ' + (stats.benefice >= 0 ? 'text-success' : 'text-danger');
    const mEl = document.getElementById('camion-marge');
    mEl.textContent = fmtPct(stats.marge);
    mEl.className = 'kpi-value ' + (stats.marge >= 0 ? 'text-success' : 'text-danger');

    switchCamionTab('transactions');
    txFilter = 'ALL'; txSearch = ''; txDateDebut = ''; txDateFin = '';
    await renderTransactions(camionId);
  } catch(e) { toast('Erreur camion: ' + e.message, 'error'); }
}

function renderCamionCharts(stats) {
  if (!stats) return;
  if (stats.monthly?.length) {
    const labels = stats.monthly.map(m => fmtMonth(m.mois));
    Charts.line('chart-camion-evol', labels, [
      { label: 'Revenus',  data: stats.monthly.map(m => m.revenu),  color: '#10B981' },
      { label: 'Dépenses', data: stats.monthly.map(m => m.depense), color: '#EB0046' },
    ]);
    Charts.bar('chart-camion-benefice-monthly', labels, [
      { label: 'Bénéfice', data: stats.monthly.map(m => m.revenu - m.depense),
        color: stats.monthly.map(m => (m.revenu - m.depense) >= 0 ? '#10B981' : '#EF4444') }
    ]);
  }
  if (stats.byCategorie?.length) {
    const cats = stats.byCategorie.filter(c => c.id !== 'REVENU' && c.total > 0);
    if (cats.length) Charts.doughnut('chart-camion-cat', cats.map(c => catInfo(c.id).icon+' '+catInfo(c.id).label), cats.map(c => c.total));
  }
}

async function renderTransactions(camionId) {
  try {
    let txs = await API.getTransactions(camionId);

    // Filtre catégorie
    if (txFilter !== 'ALL') txs = txs.filter(t => t.categorie === txFilter);

    // Filtre texte
    if (txSearch) txs = txs.filter(t => (t.description||'').toLowerCase().includes(txSearch.toLowerCase()));

    // Filtre date par sélecteurs Jour/Mois/Année
    const jourD  = document.getElementById('tx-jour-debut')?.value  || '';
    const moisD  = document.getElementById('tx-mois-debut')?.value  || '';
    const anneeD = document.getElementById('tx-annee-debut')?.value || '';
    const jourF  = document.getElementById('tx-jour-fin')?.value    || '';
    const moisF  = document.getElementById('tx-mois-fin')?.value    || '';
    const anneeF = document.getElementById('tx-annee-fin')?.value   || '';

    // Construire les dates ISO depuis les sélecteurs
    const buildDate = (annee, mois, jour) => {
      if (!annee && !mois && !jour) return '';
      const a = annee || '0000';
      const m = mois  || '01';
      const j = jour  || '01';
      return `${a}-${m}-${j.padStart(2,'0')}`;
    };
    const buildDateFin = (annee, mois, jour) => {
      if (!annee && !mois && !jour) return '';
      const a = annee || '9999';
      const m = mois  || '12';
      // Dernier jour du mois si jour non précisé
      const j = jour ? jour.padStart(2,'0') : new Date(parseInt(a), parseInt(m), 0).getDate().toString().padStart(2,'0');
      return `${a}-${m}-${j}`;
    };

    const dateDebut = buildDate(anneeD, moisD, jourD);
    const dateFin   = buildDateFin(anneeF, moisF, jourF);

    if (dateDebut) txs = txs.filter(t => t.date && t.date.split('T')[0] >= dateDebut);
    if (dateFin)   txs = txs.filter(t => t.date && t.date.split('T')[0] <= dateFin);

    const hasDateFilter = jourD || moisD || anneeD || jourF || moisF || anneeF;

    // Compteur
    const countEl = document.getElementById('tx-count');
    if (countEl) countEl.textContent = `${txs.length} transaction${txs.length !== 1 ? 's' : ''}`;
    const badgeEl = document.getElementById('tx-date-badge');
    if (badgeEl) badgeEl.style.display = hasDateFilter ? 'inline-flex' : 'none';

    const tbody = document.getElementById('tx-table-body');
    if (!tbody) return;

    if (!txs.length) {
      tbody.innerHTML = `<tr><td colspan=7 style="text-align:center;padding:40px;color:var(--text-faint)">
        <div style="font-size:1.5rem;margin-bottom:8px">🔍</div>
        Aucune transaction pour ces filtres
        <br><small style="font-size:.75rem;margin-top:4px;display:block">Modifiez les filtres ou la période</small>
      </td></tr>`;
      return;
    }

    const canW = Auth.canWrite();
    tbody.innerHTML = txs.map(t => {
      const actions = canW ? `<div class="d-flex gap-4">
        <button class="btn btn-ghost btn-sm" onclick="openEditTx(${t.id})" title="Modifier">✏️</button>
        <button class="btn btn-ghost btn-sm" style="color:var(--danger)" onclick="deleteTx(${t.id})" title="Supprimer">🗑️</button>
      </div>` : '';
      return `<tr>
        <td class="td-mono">${fmtDate(t.date)}</td>
        <td>${catBadge(t.categorie)}</td>
        <td>${t.description||'—'}</td>
        <td class="text-right">${t.revenu>0 ? `<span class="text-success">${fmt(t.revenu)}</span>` : '—'}</td>
        <td class="text-right">${t.depense>0 ? `<span class="text-danger">${fmt(t.depense)}</span>` : '—'}</td>
        <td><span class="badge badge-muted">${t.mode_paiement||'—'}</span></td>
        <td>${actions}</td>
      </tr>`;
    }).join('');

    // Sync filtres catégorie
    document.querySelectorAll('.tx-filter-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.cat === txFilter);
      btn.onclick = () => { txFilter = btn.dataset.cat; renderTransactions(camionId); };
    });

    // Sync recherche texte
    const se = document.getElementById('tx-search');
    if (se) { se.value = txSearch; se.oninput = e => { txSearch = e.target.value; renderTransactions(camionId); }; }

    // Peupler les années dynamiquement depuis les transactions
    _populateDateSelectors(txs, camionId);

    // Sync sélecteurs date → re-render
    ['tx-jour-debut','tx-mois-debut','tx-annee-debut','tx-jour-fin','tx-mois-fin','tx-annee-fin'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.onchange = () => renderTransactions(camionId);
    });

    // Bouton reset
    const resetBtn = document.getElementById('tx-date-reset');
    if (resetBtn) resetBtn.onclick = () => {
      ['tx-jour-debut','tx-mois-debut','tx-annee-debut','tx-jour-fin','tx-mois-fin','tx-annee-fin'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = '';
      });
      renderTransactions(camionId);
    };

  } catch(e) { toast('Erreur transactions: ' + e.message, 'error'); }
}

// Peupler les sélecteurs Jour et Année depuis les données réelles
function _populateDateSelectors(txs, camionId) {
  // Années disponibles
  const annees = [...new Set(txs.map(t => t.date?.substring(0,4)).filter(Boolean))].sort().reverse();
  ['tx-annee-debut','tx-annee-fin'].forEach(id => {
    const sel = document.getElementById(id);
    if (!sel) return;
    const cur = sel.value;
    // Ne repeupler que si vide ou différent
    const existing = [...sel.options].map(o => o.value).filter(v => v);
    if (JSON.stringify(existing) === JSON.stringify(annees)) return;
    sel.innerHTML = '<option value="">Année</option>' + annees.map(a => `<option value="${a}">${a}</option>`).join('');
    if (cur) sel.value = cur;
  });
  // Jours 1-31
  ['tx-jour-debut','tx-jour-fin'].forEach(id => {
    const sel = document.getElementById(id);
    if (!sel || sel.options.length > 2) return;
    sel.innerHTML = '<option value="">Jour</option>' +
      Array.from({length:31}, (_,i) => i+1).map(d => `<option value="${String(d).padStart(2,'0')}">${d}</option>`).join('');
  });
}

async function renderReparations(camionId) {
  try {
    const txs = await API.getTransactions(camionId);
    const reps = txs.filter(t => t.categorie === 'REPARATION' || t.categorie === 'ENTRETIEN');
    const totalRep = reps.filter(t => t.categorie==='REPARATION').reduce((s,t) => s+(t.depense||0), 0);
    const totalEnt = reps.filter(t => t.categorie==='ENTRETIEN').reduce((s,t) => s+(t.depense||0), 0);

    const sumEl = document.getElementById('reparations-summary');
    if (sumEl) sumEl.innerHTML = [
      ['🔧','Réparations', fmt(totalRep), 'text-danger'],
      ['🛠️','Entretiens',  fmt(totalEnt), 'text-warning'],
      ['💰','Total maint.', fmt(totalRep+totalEnt), 'text-orange'],
    ].map(([icon,label,val,cls]) =>
      `<div class="card card-sm" style="text-align:center"><div style="font-size:1.2rem">${icon}</div><div class="text-muted text-xs" style="margin:4px 0">${label}</div><div class="font-bold ${cls}">${val}</div></div>`
    ).join('');

    const tbody = document.getElementById('reparations-body');
    if (!tbody) return;
    if (!reps.length) { tbody.innerHTML = '<tr><td colspan=6 style="text-align:center;padding:32px;color:var(--text-faint)">Aucune réparation enregistrée</td></tr>'; return; }
    tbody.innerHTML = reps.sort((a,b) => b.date.localeCompare(a.date)).map(t =>
      `<tr>
        <td class="td-mono">${fmtDate(t.date)}</td>
        <td>${catBadge(t.categorie)}</td>
        <td>${t.description||'—'}</td>
        <td class="text-right text-danger">${fmt(t.depense)}</td>
        <td><span class="badge badge-muted">${t.mode_paiement||'—'}</span></td>
        <td><div class="d-flex gap-4">
          <button class="btn btn-ghost btn-sm" onclick="openEditTx(${t.id})">✏️</button>
          <button class="btn btn-ghost btn-sm" style="color:var(--danger)" onclick="deleteTx(${t.id})">🗑️</button>
        </div></td>
      </tr>`
    ).join('');
  } catch(e) { toast('Erreur réparations: ' + e.message, 'error'); }
}

async function renderHistorique360(camionId) {
  try {
    const [txs, camions] = await Promise.all([API.getTransactions(camionId), API.getCamions()]);
    const camion = camions.find(c => c.id == camionId);

    // Timeline
    const timelineEl = document.getElementById('camion-timeline');
    if (timelineEl) {
      const sorted = [...txs].sort((a,b) => b.date.localeCompare(a.date));
      timelineEl.innerHTML = sorted.slice(0, 25).map(t => {
        const ci = catInfo(t.categorie);
        const dotClass = t.revenu>0 ? 'dot-green' : t.categorie==='REPARATION' ? 'dot-red' : t.categorie==='CARBURANT' ? 'dot-orange' : 'dot-blue';
        return `<div class="activity-item">
          <div class="activity-dot ${dotClass}">${ci.icon}</div>
          <div class="activity-content">
            <div class="activity-text"><strong>${ci.label}</strong> — ${t.description||'—'}</div>
            <div class="activity-time">${fmtDate(t.date)}${t.revenu>0 ? ` · <span class="text-success">+${fmt(t.revenu)}</span>` : t.depense>0 ? ` · <span class="text-danger">-${fmt(t.depense)}</span>` : ''}</div>
          </div>
        </div>`;
      }).join('') || '<div class="empty-state"><div class="empty-state-icon">📭</div><div class="empty-state-text">Aucun historique</div></div>';
    }

    // Chauffeur
    const chauffeursEl = document.getElementById('camion-chauffeurs');
    if (chauffeursEl) {
      const driver = camion?.chauffeur || 'Non assigné';
      chauffeursEl.innerHTML = `<div class="chauffeur-item">
        <div class="chauffeur-avatar">${driver.charAt(0).toUpperCase()}</div>
        <div><div style="font-weight:600;color:var(--text-primary)">${driver}</div><div class="text-muted text-xs">Chauffeur actuel</div></div>
      </div>`;
    }

    // Stats détaillées
    const statsEl = document.getElementById('camion-stats-detail');
    if (statsEl) {
      const totalRev  = txs.reduce((s,t) => s+(t.revenu||0), 0);
      const totalDep  = txs.reduce((s,t) => s+(t.depense||0), 0);
      const nbVoyages = txs.filter(t => t.categorie==='REVENU').length;
      const totalCarb = txs.filter(t => t.categorie==='CARBURANT').reduce((s,t) => s+(t.depense||0), 0);
      const totalRep  = txs.filter(t => t.categorie==='REPARATION').reduce((s,t) => s+(t.depense||0), 0);
      const totalSal  = txs.filter(t => t.categorie==='SALAIRE').reduce((s,t) => s+(t.depense||0), 0);
      statsEl.innerHTML = [
        ['🚛','Voyages', `${nbVoyages} voyage(s)`],
        ['💰','Revenu total', fmt(totalRev)],
        ['⛽','Carburant', fmt(totalCarb)],
        ['🔧','Réparations', fmt(totalRep)],
        ['💼','Salaires', fmt(totalSal)],
        ['📊','Ratio carb./rev.', totalRev>0 ? ((totalCarb/totalRev)*100).toFixed(1)+'%' : '—'],
      ].map(([icon,label,val]) =>
        `<div class="stat-row"><span class="stat-row-label">${icon} ${label}</span><span class="stat-row-value">${val}</span></div>`
      ).join('');
    }

    // Chart carburant mensuel
    const carbMonthly = {};
    txs.filter(t => t.categorie==='CARBURANT').forEach(t => {
      const m = t.date?.substring(0,7) || '?';
      carbMonthly[m] = (carbMonthly[m]||0) + (t.depense||0);
    });
    const cKeys = Object.keys(carbMonthly).sort();
    if (cKeys.length) Charts.bar('chart-camion-carburant', cKeys.map(fmtMonth), [{ label:'Carburant', data: cKeys.map(k => carbMonthly[k]), color:'#F59E0B' }]);

  } catch(e) { toast('Erreur historique: ' + e.message, 'error'); }
}

// ============================================================
// GESTION FLOTTE
// ============================================================
async function renderFlotte() {
  try {
    const camions = await API.getCamions();
    const grid = document.getElementById('flotte-grid');
    if (!grid) return;
    if (!camions.length) {
      grid.innerHTML = '<div class="empty-state"><div class="empty-state-icon">🚚</div><div class="empty-state-title">Aucun camion</div><div class="empty-state-text">Ajoutez votre premier camion</div></div>';
      return;
    }
    const statsAll = await Promise.all(camions.map(c => API.getStats(c.id)));
    grid.innerHTML = camions.map((c, i) => {
      const s = statsAll[i];
      const statusDot = { actif: 'var(--success)', inactif: 'var(--text-faint)', maintenance: 'var(--warning)' };
      return `<div class="camion-card" onclick="navigate('camion',${c.id})">
        <div class="camion-card-header">
          <span class="camion-plate">${c.immatriculation || c.nom}</span>
          ${statutBadge(c.statut)}
        </div>
        <div class="camion-model">${c.modele || ''}${c.chauffeur ? ' · 👤 '+c.chauffeur : ''}</div>
        <div class="camion-stats">
          <div class="camion-stat"><div class="camion-stat-label">Revenu</div><div class="camion-stat-value text-success">${fmt(s.totalRevenu)}</div></div>
          <div class="camion-stat"><div class="camion-stat-label">Bénéfice</div><div class="camion-stat-value ${s.benefice>=0?'text-success':'text-danger'}">${fmt(s.benefice)}</div></div>
          <div class="camion-stat"><div class="camion-stat-label">Marge</div><div class="camion-stat-value ${s.marge>=0?'text-success':'text-danger'}">${fmtPct(s.marge)}</div></div>
          <div class="camion-stat"><div class="camion-stat-label">Dépenses</div><div class="camion-stat-value text-danger">${fmt(s.totalDepense)}</div></div>
        </div>
        ${Auth.canWrite() ? `<div class="d-flex gap-8" style="margin-top:14px" onclick="event.stopPropagation()">
          <button class="btn btn-ghost btn-sm" onclick="openEditCamion(${c.id})">✏️ Modifier</button>
          ${Auth.isAdmin() ? `<button class="btn btn-ghost btn-sm" style="color:var(--danger)" onclick="event.stopPropagation();confirmDialog('Supprimer ${c.nom} et toutes ses transactions ?', () => deleteCamion(${c.id}))">🗑️</button>` : ''}
        </div>` : ''}
      </div>`;
    }).join('');
  } catch(e) { toast('Erreur flotte: ' + e.message, 'error'); }
}

// ============================================================
// UTILISATEURS
// ============================================================
async function renderUsers() {
  if (!Auth.isAdmin()) { toast('Accès refusé', 'error'); return; }
  try {
    const users = await API.getUsers();
    const el = document.getElementById('users-content');
    if (!el) return;
    el.innerHTML = `<div class="table-card">
      <div class="table-wrapper">
        <table>
          <thead><tr><th>Nom</th><th>Email</th><th>Rôle</th><th>Créé le</th><th>Actions</th></tr></thead>
          <tbody>
            ${users.map(u => `<tr>
              <td class="td-primary">${u.nom}</td>
              <td class="td-mono">${u.email}</td>
              <td><span class="badge ${u.role==='admin'?'badge-danger':u.role==='manager'?'badge-warning':'badge-muted'}">${u.role}</span></td>
              <td class="td-mono">${fmtDate(u.created_at)}</td>
              <td><button class="btn btn-ghost btn-sm" style="color:var(--danger)" onclick="confirmDialog('Supprimer ${u.nom} ?', () => deleteUser(${u.id}))">🗑️</button></td>
            </tr>`).join('')}
          </tbody>
        </table>
      </div>
    </div>`;
  } catch(e) { toast('Erreur utilisateurs: ' + e.message, 'error'); }
}

function openAddUser() {
  if (!Auth.isAdmin()) { toast('Accès refusé', 'error'); return; }
  const nom = prompt('Nom complet :'); if (!nom) return;
  const email = prompt('Email :'); if (!email) return;
  const role = prompt('Rôle (admin/manager/viewer) :', 'viewer'); if (!role) return;
  const password = prompt('Mot de passe (min 6 car.) :'); if (!password) return;
  API.createUser({ nom, email, role, password })
    .then(() => { toast('Utilisateur créé', 'success'); renderUsers(); })
    .catch(e => toast(e.message, 'error'));
}

async function deleteUser(id) {
  try { await API.deleteUser(id); toast('Supprimé', 'success'); renderUsers(); }
  catch(e) { toast(e.message, 'error'); }
}

// ============================================================
// PARAMÈTRES & PROFIL
// ============================================================
async function renderParametres() {
  try {
    const user = Auth.getUser();
    if (!user) return;
    const initials = (user.nom||user.email||'?').charAt(0).toUpperCase();
    const av = document.getElementById('profil-avatar');
    if (av) av.textContent = initials;
    const nomEl = document.getElementById('profil-nom');
    if (nomEl) nomEl.textContent = user.nom || '—';
    const emailEl = document.getElementById('profil-email');
    if (emailEl) emailEl.textContent = user.email || '—';
    const roleEl = document.getElementById('profil-role');
    if (roleEl) roleEl.innerHTML = `<span class="badge ${user.role==='admin'?'badge-danger':user.role==='manager'?'badge-warning':'badge-muted'}">${user.role}</span>`;
    const nomInput = document.getElementById('profil-nom-input');
    if (nomInput) nomInput.value = user.nom || '';
    const emailInput = document.getElementById('profil-email-input');
    if (emailInput) emailInput.value = user.email || '';

    const prefs = JSON.parse(localStorage.getItem('fleet_prefs')||'{}');
    const deviseEl = document.getElementById('pref-devise');
    if (deviseEl) deviseEl.value = prefs.devise || 'FCFA';
    const dateEl = document.getElementById('pref-date');
    if (dateEl) dateEl.value = prefs.dateFormat || 'DD/MM/YYYY';
    const alertsEl = document.getElementById('pref-alerts');
    if (alertsEl) alertsEl.checked = prefs.alerts !== false;
    updateThemeBtns();
  } catch(e) { toast('Erreur paramètres: ' + e.message, 'error'); }
}

async function saveProfile() {
  const nom   = document.getElementById('profil-nom-input')?.value.trim();
  const email = document.getElementById('profil-email-input')?.value.trim();
  if (!nom || !email) { toast('Nom et email requis', 'error'); return; }
  try {
    const user = Auth.getUser();
    const updated = await API.updateUser(user.id, { nom, email });
    Auth.setSession(Auth.getToken(), { ...user, nom: updated.nom, email: updated.email });
    renderParametres();
    buildSidebar();
    toast('Profil mis à jour', 'success');
  } catch(e) { toast(e.message, 'error'); }
}

async function savePassword() {
  const cur  = document.getElementById('pwd-current')?.value;
  const nw   = document.getElementById('pwd-new')?.value;
  const conf = document.getElementById('pwd-confirm')?.value;
  const errEl = document.getElementById('pwd-error');
  if (errEl) errEl.style.display = 'none';
  if (!cur || !nw || !conf) { showPwdError('Tous les champs sont requis'); return; }
  if (nw.length < 6) { showPwdError('Minimum 6 caractères'); return; }
  if (nw !== conf) { showPwdError('Les mots de passe ne correspondent pas'); return; }
  try {
    await API.changePassword(cur, nw);
    toast('Mot de passe modifié', 'success');
    document.getElementById('password-form')?.reset();
    const fill = document.getElementById('pwd-strength-fill');
    const label = document.getElementById('pwd-strength-label');
    if (fill) { fill.style.width = '0'; fill.className = ''; }
    if (label) label.textContent = '';
  } catch(e) { showPwdError(e.message); }
}

function showPwdError(msg) {
  const el = document.getElementById('pwd-error');
  if (el) { el.style.display = 'flex'; el.textContent = msg; }
  toast(msg, 'error');
}

function checkPwdStrength() {
  const pwd = document.getElementById('pwd-new')?.value || '';
  const fill = document.getElementById('pwd-strength-fill');
  const label = document.getElementById('pwd-strength-label');
  if (!fill || !label) return;
  let score = 0;
  if (pwd.length >= 6)  score++;
  if (pwd.length >= 10) score++;
  if (/[A-Z]/.test(pwd)) score++;
  if (/[0-9]/.test(pwd)) score++;
  if (/[^A-Za-z0-9]/.test(pwd)) score++;
  const levels = [
    { pct:'20%', cls:'weak',   text:'Très faible', color:'var(--danger)' },
    { pct:'40%', cls:'weak',   text:'Faible',       color:'var(--danger)' },
    { pct:'60%', cls:'medium', text:'Moyen',        color:'var(--warning)' },
    { pct:'80%', cls:'strong', text:'Fort',         color:'var(--success)' },
    { pct:'100%',cls:'strong', text:'Très fort',    color:'var(--success)' },
  ];
  const lvl = levels[Math.min(score, 4)];
  fill.style.width = lvl.pct;
  fill.className = lvl.cls;
  label.textContent = lvl.text;
  label.style.color = lvl.color;
}

function togglePwd(id) {
  const el = document.getElementById(id);
  if (el) el.type = el.type === 'password' ? 'text' : 'password';
}

function savePrefs() {
  const prefs = {
    devise:     document.getElementById('pref-devise')?.value || 'FCFA',
    dateFormat: document.getElementById('pref-date')?.value   || 'DD/MM/YYYY',
    alerts:     document.getElementById('pref-alerts')?.checked !== false,
  };
  localStorage.setItem('fleet_prefs', JSON.stringify(prefs));
  toast('Préférences sauvegardées', 'success');
}

// ============================================================
// TRANSACTION CRUD
// ============================================================
async function openAddTx(camionId, preCategorie) {
  _editTxId = null;
  document.getElementById('tx-modal-title').textContent = '➕ Nouvelle transaction';
  document.getElementById('tx-camion-id').value  = camionId ?? currentCamionId ?? '';
  document.getElementById('tx-date').value        = new Date().toISOString().split('T')[0];
  document.getElementById('tx-categorie').value   = preCategorie || '';
  document.getElementById('tx-description').value = '';
  document.getElementById('tx-revenu').value      = '';
  document.getElementById('tx-depense').value     = '';
  document.getElementById('tx-paiement').value    = 'Espèce';
  openModal('tx-modal');
}

async function openEditTx(id) {
  try {
    const txs = await API.getTransactions(currentCamionId);
    const tx = txs.find(t => t.id == id);
    if (!tx) { toast('Transaction introuvable', 'error'); return; }
    _editTxId = id;
    document.getElementById('tx-modal-title').textContent = '✏️ Modifier transaction';
    document.getElementById('tx-camion-id').value  = tx.camion_id;
    document.getElementById('tx-date').value        = tx.date ? tx.date.split('T')[0] : '';
    document.getElementById('tx-categorie').value   = tx.categorie;
    document.getElementById('tx-description').value = tx.description;
    document.getElementById('tx-revenu').value      = tx.revenu || '';
    document.getElementById('tx-depense').value     = tx.depense || '';
    document.getElementById('tx-paiement').value    = tx.mode_paiement || 'Espèce';
    openModal('tx-modal');
  } catch(e) { toast(e.message, 'error'); }
}

async function saveTx() {
  const camionId    = document.getElementById('tx-camion-id').value;
  const date        = document.getElementById('tx-date').value;
  const categorie   = document.getElementById('tx-categorie').value;
  const description = document.getElementById('tx-description').value.trim();
  if (!date || !categorie || !description) { toast('Remplissez tous les champs obligatoires', 'error'); return; }
  const payload = {
    camion_id: camionId, date, categorie, description,
    revenu:  parseFloat(document.getElementById('tx-revenu').value)  || 0,
    depense: parseFloat(document.getElementById('tx-depense').value) || 0,
    mode_paiement: document.getElementById('tx-paiement').value,
  };
  try {
    if (_editTxId) { await API.updateTransaction(_editTxId, payload); toast('Transaction mise à jour', 'success'); }
    else           { await API.createTransaction(payload);            toast('Transaction ajoutée', 'success'); }
    closeModal('tx-modal');
    if (currentPage === 'camion') {
      await renderTransactions(currentCamionId);
      const s = await API.getStats(currentCamionId);
      _lastCamionStats = s;
      // Refresh KPIs
      document.getElementById('camion-revenu').textContent  = fmt(s.totalRevenu);
      document.getElementById('camion-depense').textContent = fmt(s.totalDepense);
      const bEl = document.getElementById('camion-benefice');
      bEl.textContent = fmt(s.benefice);
      bEl.className = 'kpi-value ' + (s.benefice >= 0 ? 'text-success' : 'text-danger');
      const mEl = document.getElementById('camion-marge');
      mEl.textContent = fmtPct(s.marge);
      mEl.className = 'kpi-value ' + (s.marge >= 0 ? 'text-success' : 'text-danger');
    } else if (currentPage === 'dashboard') renderDashboard();
    else if (currentPage === 'rapports')   renderAnalyse();
  } catch(e) { toast(e.message, 'error'); }
}

async function deleteTx(id) {
  confirmDialog('Supprimer cette transaction ?', async () => {
    try {
      await API.deleteTransaction(id);
      toast('Transaction supprimée', 'success');
      await renderTransactions(currentCamionId);
      const s = await API.getStats(currentCamionId);
      _lastCamionStats = s;
    } catch(e) { toast(e.message, 'error'); }
  });
}

// ============================================================
// CAMION CRUD
// ============================================================
async function openEditCamion(id) {
  try {
    const camions = await API.getCamions();
    const c = camions.find(x => x.id == id);
    if (!c) { toast('Camion introuvable', 'error'); return; }
    _editCamionId = id;
    document.getElementById('camion-modal-title').textContent = '✏️ Modifier camion';
    document.getElementById('edit-camion-nom').value    = c.nom || '';
    document.getElementById('edit-camion-modele').value = c.modele || '';
    document.getElementById('edit-camion-driver').value = c.chauffeur || '';
    document.getElementById('edit-camion-immat').value  = c.immatriculation || '';
    document.getElementById('edit-camion-statut').value = c.statut || 'actif';
    openModal('camion-modal');
  } catch(e) { toast(e.message, 'error'); }
}

function openAddCamion() {
  _editCamionId = null;
  document.getElementById('camion-modal-title').textContent = '➕ Nouveau camion';
  ['edit-camion-nom','edit-camion-modele','edit-camion-driver','edit-camion-immat'].forEach(id => document.getElementById(id).value = '');
  document.getElementById('edit-camion-statut').value = 'actif';
  openModal('camion-modal');
}

async function saveCamion() {
  const nom = document.getElementById('edit-camion-nom').value.trim();
  if (!nom) { toast('Le nom est obligatoire', 'error'); return; }
  const payload = {
    nom,
    modele:          document.getElementById('edit-camion-modele').value.trim(),
    chauffeur:       document.getElementById('edit-camion-driver').value.trim(),
    immatriculation: document.getElementById('edit-camion-immat').value.trim(),
    statut:          document.getElementById('edit-camion-statut').value,
  };
  try {
    if (_editCamionId) { await API.updateCamion(_editCamionId, payload); toast('Camion mis à jour', 'success'); }
    else               { await API.createCamion(payload);                toast('Camion ajouté', 'success'); }
    closeModal('camion-modal');
    await buildSidebar();
    if (currentPage === 'flotte') renderFlotte();
    else if (currentPage === 'camion') renderCamion(currentCamionId);
  } catch(e) { toast(e.message, 'error'); }
}

async function deleteCamion(id) {
  try {
    await API.deleteCamion(id);
    toast('Camion supprimé', 'success');
    await buildSidebar();
    navigate('flotte');
  } catch(e) { toast(e.message, 'error'); }
}

// ============================================================
// EXPORT CSV
// ============================================================
async function exportCSV(camionId) {
  try {
    const cid = (camionId != null) ? camionId : (currentPage === 'camion' ? currentCamionId : null);
    const [txs, camions] = await Promise.all([API.getTransactions(cid), API.getCamions()]);
    const headers = ['Date','Camion','Catégorie','Description','Revenu (FCFA)','Dépense (FCFA)','Paiement'];
    const rows = txs.map(t => {
      const c = camions.find(x => x.id == t.camion_id);
      return [t.date?.split('T')[0]||'', c?.nom||'', catInfo(t.categorie).label,
        `"${(t.description||'').replace(/"/g,'""')}"`, t.revenu||0, t.depense||0, t.mode_paiement||''];
    });
    const csv = [headers, ...rows].map(r => r.join(';')).join('\n');
    const blob = new Blob(['\uFEFF'+csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ncmali_flotte_${cid?'camion'+cid:'all'}_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast('Export CSV téléchargé', 'success');
  } catch(e) { toast(e.message, 'error'); }
}

// ============================================================
// EXPORT XLSX
// ============================================================
async function exportXLSX(mode) {
  try {
    if (typeof XLSX === 'undefined') { toast('SheetJS non chargé', 'error'); return; }
    const [allTx, camions] = await Promise.all([API.getTransactions(), API.getCamions()]);
    const wb = XLSX.utils.book_new();

    if (mode === 'comptable') {
      // Résumé flotte
      const statsAll = await Promise.all(camions.map(c => API.getStats(c.id)));
      const resumeData = [
        ['RAPPORT COMPTABLE — NC MALI GESTION DE FLOTTE'],
        [`Généré le : ${new Date().toLocaleDateString('fr-FR')}`],
        [],
        ['Camion','Chauffeur','Immatriculation','Revenus (FCFA)','Dépenses (FCFA)','Bénéfice (FCFA)','Marge %','Statut'],
        ...camions.map((c,i) => {
          const s = statsAll[i];
          return [c.nom, c.chauffeur||'—', c.immatriculation||'—', s.totalRevenu, s.totalDepense, s.benefice, parseFloat(s.marge.toFixed(2)), c.statut];
        }),
        [],
        ['TOTAL','','',
          statsAll.reduce((s,x)=>s+x.totalRevenu,0),
          statsAll.reduce((s,x)=>s+x.totalDepense,0),
          statsAll.reduce((s,x)=>s+x.benefice,0),'',''],
      ];
      const ws1 = XLSX.utils.aoa_to_sheet(resumeData);
      ws1['!cols'] = [{wch:16},{wch:20},{wch:16},{wch:18},{wch:18},{wch:18},{wch:10},{wch:12}];
      XLSX.utils.book_append_sheet(wb, ws1, 'Résumé Flotte');

      // Synthèse mensuelle
      const monthly = {};
      allTx.forEach(t => {
        if (!t.date) return;
        const m = t.date.substring(0,7);
        if (!monthly[m]) monthly[m] = { rev:0, dep:0 };
        monthly[m].rev += t.revenu||0;
        monthly[m].dep += t.depense||0;
      });
      const monthData = [['Mois','Revenus (FCFA)','Dépenses (FCFA)','Bénéfice (FCFA)','Marge %'],
        ...Object.keys(monthly).sort().map(m => {
          const { rev, dep } = monthly[m];
          const [y,mo] = m.split('-');
          return [new Date(y,mo-1).toLocaleDateString('fr-FR',{month:'long',year:'numeric'}), rev, dep, rev-dep, rev>0?parseFloat(((rev-dep)/rev*100).toFixed(2)):0];
        })
      ];
      const ws2 = XLSX.utils.aoa_to_sheet(monthData);
      ws2['!cols'] = [{wch:20},{wch:18},{wch:18},{wch:18},{wch:10}];
      XLSX.utils.book_append_sheet(wb, ws2, 'Synthèse Mensuelle');

    } else {
      // Toutes transactions
      const globalData = [['Date','Camion','Catégorie','Description','Revenu (FCFA)','Dépense (FCFA)','Paiement'],
        ...allTx.map(t => {
          const c = camions.find(x => x.id==t.camion_id);
          return [t.date?.split('T')[0]||'', c?.nom||'—', catInfo(t.categorie).label, t.description||'', t.revenu||0, t.depense||0, t.mode_paiement||''];
        })
      ];
      const wsG = XLSX.utils.aoa_to_sheet(globalData);
      wsG['!cols'] = [{wch:12},{wch:14},{wch:16},{wch:30},{wch:16},{wch:16},{wch:14}];
      XLSX.utils.book_append_sheet(wb, wsG, 'Toutes Transactions');

      // Une feuille par camion
      for (const c of camions) {
        const txsCamion = allTx.filter(t => t.camion_id == c.id);
        if (!txsCamion.length) continue;
        const sheetData = [
          [c.nom + ' — ' + (c.chauffeur||'Sans chauffeur')],
          ['Immatriculation: '+(c.immatriculation||'—'), '', 'Statut: '+c.statut],
          [],
          ['Date','Catégorie','Description','Revenu (FCFA)','Dépense (FCFA)','Paiement'],
          ...txsCamion.map(t => [t.date?.split('T')[0]||'', catInfo(t.categorie).label, t.description||'', t.revenu||0, t.depense||0, t.mode_paiement||'']),
          [],
          ['TOTAL','','', txsCamion.reduce((s,t)=>s+(t.revenu||0),0), txsCamion.reduce((s,t)=>s+(t.depense||0),0), ''],
        ];
        const ws = XLSX.utils.aoa_to_sheet(sheetData);
        ws['!cols'] = [{wch:12},{wch:16},{wch:28},{wch:16},{wch:16},{wch:14}];
        XLSX.utils.book_append_sheet(wb, ws, c.nom.substring(0,31));
      }
    }

    const filename = mode === 'comptable'
      ? `NCMali_Rapport_Comptable_${new Date().toISOString().split('T')[0]}.xlsx`
      : `NCMali_Flotte_${new Date().toISOString().split('T')[0]}.xlsx`;
    XLSX.writeFile(wb, filename);
    toast('Export Excel téléchargé', 'success');
  } catch(e) { toast('Erreur export: ' + e.message, 'error'); console.error(e); }
}

// ============================================================
// SIDEBAR
// ============================================================
async function buildSidebar() {
  try {
    const camions = await API.getCamions();
    const container = document.getElementById('sidebar-camions');
    if (!container) return;
    container.innerHTML = camions.map(c => {
      const maint = c.statut === 'maintenance' ? '<span class="maintenance-badge" style="margin-left:auto;font-size:.6rem">🔧</span>' : '';
      return `<a class="nav-item" data-page="camion" data-camion="${c.id}" onclick="navigate('camion',${c.id})"><span class="nav-icon">🚚</span> ${c.nom}${maint}</a>`;
    }).join('');
    if (currentPage === 'camion') {
      container.querySelectorAll('.nav-item').forEach(a => a.classList.toggle('active', parseInt(a.dataset.camion) === currentCamionId));
    }
    const navUsers = document.getElementById('nav-users');
    if (navUsers) navUsers.style.display = Auth.isAdmin() ? '' : 'none';
  } catch(e) { console.warn('sidebar:', e.message); }
}

// ============================================================
// THEME TOGGLE — Dark / Light
// ============================================================
function toggleTheme() {
  const html = document.documentElement;
  const isDark = html.getAttribute('data-theme') !== 'light';
  const newTheme = isDark ? 'light' : 'dark';
  applyTheme(newTheme);
  localStorage.setItem('fleet_theme', newTheme);
}

function applyTheme(theme) {
  const html = document.documentElement;
  const btn  = document.getElementById('theme-toggle');
  if (theme === 'light') {
    html.setAttribute('data-theme', 'light');
    if (btn) btn.textContent = '☀️';
    if (btn) btn.title = 'Passer en mode sombre';
  } else {
    html.removeAttribute('data-theme');
    if (btn) btn.textContent = '🌙';
    if (btn) btn.title = 'Passer en mode clair';
  }
  updateThemeBtns();
}

function updateThemeBtns() {
  const isLight = document.documentElement.getAttribute('data-theme') === 'light';
  const btnDark  = document.getElementById('theme-btn-dark');
  const btnLight = document.getElementById('theme-btn-light');
  if (btnDark)  btnDark.className  = 'btn btn-sm ' + (isLight ? 'btn-ghost' : 'btn-nc-primary');
  if (btnLight) btnLight.className = 'btn btn-sm ' + (isLight ? 'btn-nc-primary' : 'btn-ghost');
}

// Appliquer le thème sauvegardé dès le chargement (avant DOMContentLoaded)
(function() {
  const saved = localStorage.getItem('fleet_theme');
  if (saved === 'light') document.documentElement.setAttribute('data-theme', 'light');
})();
function switchAuthTab(tab) {
  const isLogin = tab === 'login';
  document.getElementById('auth-login-panel').style.display    = isLogin ? '' : 'none';
  document.getElementById('auth-register-panel').style.display = isLogin ? 'none' : '';
  document.getElementById('tab-login-btn').classList.toggle('active', isLogin);
  document.getElementById('tab-register-btn').classList.toggle('active', !isLogin);
  // Reset erreurs
  ['login-error','register-error'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.style.display = 'none';
  });
}

async function handleRegister() {
  const nom      = document.getElementById('reg-nom')?.value.trim();
  const email    = document.getElementById('reg-email')?.value.trim();
  const password = document.getElementById('reg-password')?.value;
  const confirm  = document.getElementById('reg-confirm')?.value;
  const errEl    = document.getElementById('register-error');
  const btnText  = document.getElementById('reg-btn-text');
  const spinner  = document.getElementById('reg-spinner');

  if (errEl) errEl.style.display = 'none';

  if (!nom || !email || !password) {
    if (errEl) { errEl.style.display = 'flex'; errEl.textContent = 'Tous les champs sont requis.'; }
    return;
  }
  if (password.length < 6) {
    if (errEl) { errEl.style.display = 'flex'; errEl.textContent = 'Mot de passe trop court (min 6 caractères).'; }
    return;
  }
  if (password !== confirm) {
    if (errEl) { errEl.style.display = 'flex'; errEl.textContent = 'Les mots de passe ne correspondent pas.'; }
    return;
  }

  if (btnText) btnText.style.display = 'none';
  if (spinner) spinner.style.display = 'inline-block';

  try {
    const res = await API.register(nom, email, password);
    Auth.setSession(res.token, res.user);
    showApp();
    await buildSidebar();
    navigate('dashboard');
    toast(`Bienvenue ${res.user.nom} 🎉 Compte créé avec succès !`, 'success');
  } catch(e) {
    if (errEl) { errEl.style.display = 'flex'; errEl.textContent = e.message; }
    toast(e.message, 'error');
  } finally {
    if (btnText) btnText.style.display = '';
    if (spinner) spinner.style.display = 'none';
  }
}

function checkRegPwd() {
  const pwd   = document.getElementById('reg-password')?.value || '';
  const fill  = document.getElementById('reg-pwd-fill');
  const label = document.getElementById('reg-pwd-label');
  if (!fill || !label) return;
  let score = 0;
  if (pwd.length >= 6)  score++;
  if (pwd.length >= 10) score++;
  if (/[A-Z]/.test(pwd)) score++;
  if (/[0-9]/.test(pwd)) score++;
  if (/[^A-Za-z0-9]/.test(pwd)) score++;
  const levels = [
    { pct:'20%', color:'var(--danger)',  text:'Très faible' },
    { pct:'40%', color:'var(--danger)',  text:'Faible' },
    { pct:'60%', color:'var(--warning)', text:'Moyen' },
    { pct:'80%', color:'var(--success)', text:'Fort' },
    { pct:'100%',color:'var(--success)', text:'Très fort' },
  ];
  const lvl = levels[Math.min(score, 4)];
  fill.style.width = lvl.pct;
  fill.style.background = lvl.color;
  label.textContent = lvl.text;
  label.style.color = lvl.color;
}

// ============================================================
// AUTH
// ============================================================
function showLogin() {
  document.getElementById('login-screen').style.display = 'flex';
  document.getElementById('app-shell').style.display = 'none';
}

function showApp() {
  document.getElementById('login-screen').style.display = 'none';
  document.getElementById('app-shell').style.display = 'flex';
  const user = Auth.getUser();
  if (user) {
    const av = document.getElementById('sidebar-avatar');
    const un = document.getElementById('sidebar-username');
    const ur = document.getElementById('sidebar-role');
    if (av) av.textContent = (user.nom||user.email||'?').charAt(0).toUpperCase();
    if (un) un.textContent = user.nom || user.email;
    if (ur) ur.textContent = user.role;
  }
}

async function handleLogin() {
  const email    = document.getElementById('login-email').value.trim();
  const password = document.getElementById('login-password').value;
  const errEl    = document.getElementById('login-error');
  const btnText  = document.getElementById('login-btn-text');
  const spinner  = document.getElementById('login-spinner');
  if (!email || !password) { if (errEl) { errEl.style.display='flex'; errEl.textContent='Remplissez tous les champs.'; } return; }
  if (errEl) errEl.style.display = 'none';
  if (btnText) btnText.style.display = 'none';
  if (spinner) spinner.style.display = 'inline-block';
  try {
    const res = await API.login(email, password);
    Auth.setSession(res.token, res.user);
    showApp();
    await buildSidebar();
    navigate('dashboard');
    toast(`Bienvenue ${res.user?.nom || res.user?.email} 👋`, 'success');
    refreshAlertsBadge();
  } catch(e) {
    if (errEl) { errEl.style.display='flex'; errEl.textContent=e.message; }
    toast(e.message, 'error');
  } finally {
    if (btnText) btnText.style.display = '';
    if (spinner) spinner.style.display = 'none';
  }
}

function logout() {
  Auth.clear();
  Charts.destroyAll();
  showLogin();
  toast('Déconnecté', 'info');
}

// ============================================================
// INIT
// ============================================================
document.addEventListener('DOMContentLoaded', async () => {
  // Appliquer le thème sauvegardé et mettre à jour l'icône
  const savedTheme = localStorage.getItem('fleet_theme') || 'dark';
  applyTheme(savedTheme);
  const loginForm = document.getElementById('login-form');
  if (loginForm) loginForm.addEventListener('submit', e => { e.preventDefault(); handleLogin(); });
  const logoutBtn = document.getElementById('btn-logout');
  if (logoutBtn) logoutBtn.addEventListener('click', logout);

  if (Auth.isLoggedIn()) {
    showApp();
    await buildSidebar();
    navigate('dashboard');
    refreshAlertsBadge();
  } else {
    showLogin();
  }
});

// ============================================================
// MAINTENANCE
// ============================================================
let _editMaintId = null;
const MAINT_TYPES = { VIDANGE:'🛢️ Vidange', PNEU:'🔄 Pneus', VISITE_TECHNIQUE:'📋 Visite technique', AUTRE:'⚙️ Autre' };
const MAINT_STATUT = { fait:'✅ Fait', planifie:'📅 Planifié', en_retard:'🚨 En retard' };
const MAINT_STATUT_CLS = { fait:'badge-success', planifie:'badge-info', en_retard:'badge-danger' };

async function renderMaintenance() {
  try {
    const [maintenances, camions] = await Promise.all([API.getMaintenance(), API.getCamions()]);

    // Peupler filtre camion
    const fc = document.getElementById('maint-filter-camion');
    if (fc && fc.options.length <= 1) {
      camions.forEach(c => { const o = document.createElement('option'); o.value=c.id; o.textContent=c.nom; fc.appendChild(o); });
    }

    // KPIs
    const totalCout = maintenances.reduce((s,m) => s+(m.cout||0), 0);
    const enRetard  = maintenances.filter(m => m.statut==='en_retard').length;
    const aVenir30  = maintenances.filter(m => {
      if (!m.date_prochain) return false;
      const diff = (new Date(m.date_prochain) - new Date()) / (1000*60*60*24);
      return diff >= 0 && diff <= 30;
    }).length;
    const kpiEl = document.getElementById('maint-kpis');
    if (kpiEl) kpiEl.innerHTML = [
      ['nc-orange','🔧','Total interventions', maintenances.length+' opérations'],
      ['nc-red',   '🚨','En retard',           enRetard+' intervention'+(enRetard!==1?'s':'')],
      ['nc-blue',  '📅','Échéances 30j',       aVenir30+' à planifier'],
      ['nc-green', '💰','Coût total maint.',   fmt(totalCout)],
    ].map(([cls,icon,label,val]) =>
      `<div class="kpi-card ${cls}"><div class="kpi-icon">${icon}</div><div class="kpi-label">${label}</div><div class="kpi-value" style="font-size:1.2rem">${val}</div></div>`
    ).join('');

    // Prochaines échéances
    const echeancesEl = document.getElementById('maint-echeances');
    if (echeancesEl) {
      const today = new Date();
      const prochaines = maintenances
        .filter(m => m.date_prochain)
        .sort((a,b) => a.date_prochain.localeCompare(b.date_prochain))
        .slice(0, 6);
      echeancesEl.innerHTML = prochaines.length ? prochaines.map(m => {
        const diff = Math.ceil((new Date(m.date_prochain) - today) / (1000*60*60*24));
        const cls = diff < 0 ? 'badge-danger' : diff <= 7 ? 'badge-warning' : 'badge-info';
        const label = diff < 0 ? `${Math.abs(diff)}j de retard` : diff === 0 ? "Aujourd'hui" : `Dans ${diff}j`;
        return `<div class="echeance-card">
          <div class="echeance-icon">${MAINT_TYPES[m.type]?.split(' ')[0]||'⚙️'}</div>
          <div class="echeance-info">
            <div class="echeance-camion">${m.camion_nom}</div>
            <div class="echeance-type">${MAINT_TYPES[m.type]||m.type}</div>
            <div class="echeance-date">${fmtDate(m.date_prochain)}</div>
          </div>
          <span class="badge ${cls}">${label}</span>
        </div>`;
      }).join('') : '<span class="text-muted">Aucune échéance planifiée</span>';
    }

    // Filtres
    const filterCamion = document.getElementById('maint-filter-camion')?.value || '';
    const filterType   = document.getElementById('maint-filter-type')?.value   || '';
    const filterStatut = document.getElementById('maint-filter-statut')?.value || '';
    const search       = (document.getElementById('maint-search')?.value||'').toLowerCase();

    let filtered = maintenances;
    if (filterCamion) filtered = filtered.filter(m => m.camion_id == filterCamion);
    if (filterType)   filtered = filtered.filter(m => m.type === filterType);
    if (filterStatut) filtered = filtered.filter(m => m.statut === filterStatut);
    if (search)       filtered = filtered.filter(m => (m.description||'').toLowerCase().includes(search) || (m.camion_nom||'').toLowerCase().includes(search));

    const tbody = document.getElementById('maint-table-body');
    if (!tbody) return;
    if (!filtered.length) { tbody.innerHTML = '<tr><td colspan=8 style="text-align:center;padding:32px;color:var(--text-faint)">Aucune intervention</td></tr>'; return; }

    tbody.innerHTML = filtered.map(m => `<tr>
      <td class="td-primary">${m.camion_nom}</td>
      <td>${MAINT_TYPES[m.type]||m.type}</td>
      <td>${m.description}</td>
      <td class="td-mono">${fmtDate(m.date_fait)}</td>
      <td class="td-mono">${m.date_prochain ? fmtDate(m.date_prochain) : '<span class="text-faint">—</span>'}</td>
      <td class="text-right">${m.cout > 0 ? fmt(m.cout) : '—'}</td>
      <td><span class="badge ${MAINT_STATUT_CLS[m.statut]||'badge-muted'}">${MAINT_STATUT[m.statut]||m.statut}</span></td>
      <td><div class="d-flex gap-4">
        <button class="btn btn-ghost btn-sm" onclick="openEditMaintenance(${m.id})">✏️</button>
        <button class="btn btn-ghost btn-sm" style="color:var(--danger)" onclick="confirmDialog('Supprimer cette intervention ?',()=>deleteMaintenance(${m.id}))">🗑️</button>
      </div></td>
    </tr>`).join('');
  } catch(e) { toast('Erreur maintenance: '+e.message,'error'); }
}

async function openAddMaintenance(camionId) {
  _editMaintId = null;
  document.getElementById('maint-modal-title').textContent = '➕ Nouvelle intervention';
  await _fillMaintCamionSelect(camionId);
  document.getElementById('maint-type').value = '';
  document.getElementById('maint-description').value = '';
  document.getElementById('maint-date-fait').value = new Date().toISOString().split('T')[0];
  document.getElementById('maint-date-prochain').value = '';
  document.getElementById('maint-km-fait').value = '';
  document.getElementById('maint-km-prochain').value = '';
  document.getElementById('maint-cout').value = '';
  document.getElementById('maint-statut').value = 'fait';
  document.getElementById('maint-notes').value = '';
  openModal('maint-modal');
}

async function openEditMaintenance(id) {
  try {
    const all = await API.getMaintenance();
    const m = all.find(x => x.id == id);
    if (!m) { toast('Introuvable','error'); return; }
    _editMaintId = id;
    document.getElementById('maint-modal-title').textContent = '✏️ Modifier intervention';
    await _fillMaintCamionSelect(m.camion_id);
    document.getElementById('maint-type').value = m.type;
    document.getElementById('maint-description').value = m.description;
    document.getElementById('maint-date-fait').value = m.date_fait;
    document.getElementById('maint-date-prochain').value = m.date_prochain||'';
    document.getElementById('maint-km-fait').value = m.km_fait||'';
    document.getElementById('maint-km-prochain').value = m.km_prochain||'';
    document.getElementById('maint-cout').value = m.cout||'';
    document.getElementById('maint-statut').value = m.statut;
    document.getElementById('maint-notes').value = m.notes||'';
    openModal('maint-modal');
  } catch(e) { toast(e.message,'error'); }
}

async function _fillMaintCamionSelect(selectedId) {
  const sel = document.getElementById('maint-camion-id');
  if (!sel) return;
  const camions = await API.getCamions();
  sel.innerHTML = camions.map(c => `<option value="${c.id}" ${c.id==selectedId?'selected':''}>${c.nom}</option>`).join('');
}

async function saveMaintenance() {
  const payload = {
    camion_id:     document.getElementById('maint-camion-id').value,
    type:          document.getElementById('maint-type').value,
    description:   document.getElementById('maint-description').value.trim(),
    date_fait:     document.getElementById('maint-date-fait').value,
    date_prochain: document.getElementById('maint-date-prochain').value || null,
    km_fait:       parseInt(document.getElementById('maint-km-fait').value)||0,
    km_prochain:   parseInt(document.getElementById('maint-km-prochain').value)||0,
    cout:          parseFloat(document.getElementById('maint-cout').value)||0,
    statut:        document.getElementById('maint-statut').value,
    notes:         document.getElementById('maint-notes').value.trim()||null,
  };
  if (!payload.camion_id||!payload.type||!payload.description||!payload.date_fait) { toast('Champs requis manquants','error'); return; }
  try {
    if (_editMaintId) { await API.updateMaintenance(_editMaintId, payload); toast('Intervention mise à jour','success'); }
    else              { await API.createMaintenance(payload);               toast('Intervention ajoutée','success'); }
    closeModal('maint-modal');
    renderMaintenance();
    refreshAlertsBadge();
  } catch(e) { toast(e.message,'error'); }
}

async function deleteMaintenance(id) {
  try { await API.deleteMaintenance(id); toast('Supprimé','success'); renderMaintenance(); } catch(e) { toast(e.message,'error'); }
}

// ============================================================
// PAIE & SALAIRES
// ============================================================
let _editPaieId = null;
const PAIE_TYPES = { SALAIRE:'💼 Salaire', PRIME:'🎁 Prime', AVANCE:'💵 Avance', BONUS:'⭐ Bonus' };
const PAIE_STATUT_CLS = { paye:'badge-success', en_attente:'badge-warning' };

async function renderPaie() {
  try {
    const [paies, camions, stats] = await Promise.all([API.getPaie(), API.getCamions(), API.getPaieStats()]);

    // Peupler filtres
    const fc = document.getElementById('paie-filter-camion');
    if (fc && fc.options.length <= 1) {
      camions.forEach(c => { const o=document.createElement('option'); o.value=c.id; o.textContent=c.nom; fc.appendChild(o); });
    }
    const fp = document.getElementById('paie-filter-periode');
    if (fp && fp.options.length <= 1) {
      const periodes = [...new Set(paies.map(p=>p.periode))].sort().reverse();
      periodes.forEach(p => { const o=document.createElement('option'); o.value=p; o.textContent=p; fp.appendChild(o); });
    }

    // KPIs
    const totalSalaires = paies.filter(p=>p.type==='SALAIRE').reduce((s,p)=>s+(p.montant||0),0);
    const totalPrimes   = paies.filter(p=>p.type==='PRIME').reduce((s,p)=>s+(p.montant||0),0);
    const totalAvances  = paies.filter(p=>p.type==='AVANCE').reduce((s,p)=>s+(p.montant||0),0);
    const enAttente     = paies.filter(p=>p.statut==='en_attente').reduce((s,p)=>s+(p.montant||0),0);
    const kpiEl = document.getElementById('paie-kpis');
    if (kpiEl) kpiEl.innerHTML = [
      ['nc-blue',  '💼','Total salaires',  fmt(totalSalaires)],
      ['nc-orange','🎁','Total primes',    fmt(totalPrimes)],
      ['nc-purple','💵','Total avances',   fmt(totalAvances)],
      ['nc-red',   '⏳','En attente',      fmt(enAttente)],
    ].map(([cls,icon,label,val]) =>
      `<div class="kpi-card ${cls}"><div class="kpi-icon">${icon}</div><div class="kpi-label">${label}</div><div class="kpi-value">${val}</div></div>`
    ).join('');

    // Résumé par chauffeur
    const resumeEl = document.getElementById('paie-resume-chauffeurs');
    if (resumeEl && stats.length) {
      resumeEl.innerHTML = `<div class="table-wrapper"><table>
        <thead><tr><th>Camion</th><th>Chauffeur</th><th class="text-right">Salaires</th><th class="text-right">Primes</th><th class="text-right">Avances</th><th class="text-right">Total</th></tr></thead>
        <tbody>${stats.map(s=>`<tr>
          <td>${s.camion_nom}</td>
          <td class="td-primary">${s.chauffeur}</td>
          <td class="text-right">${fmt(s.total_salaires)}</td>
          <td class="text-right">${fmt(s.total_primes)}</td>
          <td class="text-right">${fmt(s.total_avances)}</td>
          <td class="text-right font-bold">${fmt(s.total)}</td>
        </tr>`).join('')}</tbody>
      </table></div>`;
    }

    // Graphiques
    const byCamion = {};
    paies.forEach(p => {
      if (!byCamion[p.camion_id]) byCamion[p.camion_id] = { nom: p.camion_nom, sal:0, prime:0, avance:0 };
      if (p.type==='SALAIRE') byCamion[p.camion_id].sal   += p.montant||0;
      if (p.type==='PRIME')   byCamion[p.camion_id].prime += p.montant||0;
      if (p.type==='AVANCE')  byCamion[p.camion_id].avance+= p.montant||0;
    });
    const camLabels = Object.values(byCamion).map(x=>x.nom);
    Charts.bar('chart-paie-type', camLabels, [
      { label:'Salaires', data: Object.values(byCamion).map(x=>x.sal),   color:'#3B82F6' },
      { label:'Primes',   data: Object.values(byCamion).map(x=>x.prime), color:'#EB6B00' },
      { label:'Avances',  data: Object.values(byCamion).map(x=>x.avance),color:'#8B5CF6' },
    ]);

    const monthly = {};
    paies.forEach(p => { monthly[p.periode]=(monthly[p.periode]||0)+(p.montant||0); });
    const mKeys = Object.keys(monthly).sort();
    if (mKeys.length) Charts.line('chart-paie-evol', mKeys.map(fmtMonth), [
      { label:'Total paie', data: mKeys.map(k=>monthly[k]), color:'#EB6B00' }
    ]);

    // Filtres
    const filterCamion = document.getElementById('paie-filter-camion')?.value||'';
    const filterPeriode= document.getElementById('paie-filter-periode')?.value||'';
    const filterType   = document.getElementById('paie-filter-type')?.value||'';
    let filtered = paies;
    if (filterCamion)  filtered = filtered.filter(p=>p.camion_id==filterCamion);
    if (filterPeriode) filtered = filtered.filter(p=>p.periode===filterPeriode);
    if (filterType)    filtered = filtered.filter(p=>p.type===filterType);

    const tbody = document.getElementById('paie-table-body');
    if (!tbody) return;
    if (!filtered.length) { tbody.innerHTML='<tr><td colspan=8 style="text-align:center;padding:32px;color:var(--text-faint)">Aucun paiement</td></tr>'; return; }
    tbody.innerHTML = filtered.map(p=>`<tr>
      <td>${p.camion_nom}</td>
      <td class="td-primary">${p.chauffeur}</td>
      <td>${PAIE_TYPES[p.type]||p.type}</td>
      <td class="td-mono">${p.periode}</td>
      <td class="td-mono">${fmtDate(p.date_paiement)}</td>
      <td class="text-right font-bold">${fmt(p.montant)}</td>
      <td><span class="badge ${PAIE_STATUT_CLS[p.statut]||'badge-muted'}">${p.statut==='paye'?'✅ Payé':'⏳ En attente'}</span></td>
      <td><div class="d-flex gap-4">
        <button class="btn btn-ghost btn-sm" onclick="openEditPaie(${p.id})">✏️</button>
        <button class="btn btn-ghost btn-sm" style="color:var(--danger)" onclick="confirmDialog('Supprimer ce paiement ?',()=>deletePaie(${p.id}))">🗑️</button>
      </div></td>
    </tr>`).join('');
  } catch(e) { toast('Erreur paie: '+e.message,'error'); }
}

async function openAddPaie(camionId) {
  _editPaieId = null;
  document.getElementById('paie-modal-title').textContent = '➕ Nouveau paiement';
  await _fillPaieCamionSelect(camionId);
  document.getElementById('paie-type').value = '';
  document.getElementById('paie-montant').value = '';
  document.getElementById('paie-periode').value = new Date().toISOString().substring(0,7);
  document.getElementById('paie-date').value = new Date().toISOString().split('T')[0];
  document.getElementById('paie-statut').value = 'paye';
  document.getElementById('paie-description').value = '';
  openModal('paie-modal');
}

async function openEditPaie(id) {
  try {
    const all = await API.getPaie();
    const p = all.find(x=>x.id==id);
    if (!p) { toast('Introuvable','error'); return; }
    _editPaieId = id;
    document.getElementById('paie-modal-title').textContent = '✏️ Modifier paiement';
    await _fillPaieCamionSelect(p.camion_id);
    document.getElementById('paie-chauffeur').value = p.chauffeur;
    document.getElementById('paie-type').value = p.type;
    document.getElementById('paie-montant').value = p.montant;
    document.getElementById('paie-periode').value = p.periode;
    document.getElementById('paie-date').value = p.date_paiement;
    document.getElementById('paie-statut').value = p.statut;
    document.getElementById('paie-description').value = p.description||'';
    openModal('paie-modal');
  } catch(e) { toast(e.message,'error'); }
}

async function _fillPaieCamionSelect(selectedId) {
  const sel = document.getElementById('paie-camion-id');
  if (!sel) return;
  const camions = await API.getCamions();
  sel.innerHTML = camions.map(c=>`<option value="${c.id}" ${c.id==selectedId?'selected':''}>${c.nom}</option>`).join('');
  autoFillChauffeur();
}

async function autoFillChauffeur() {
  const camionId = document.getElementById('paie-camion-id')?.value;
  if (!camionId) return;
  const camions = await API.getCamions();
  const c = camions.find(x=>x.id==camionId);
  const chaufEl = document.getElementById('paie-chauffeur');
  if (chaufEl && c?.chauffeur) chaufEl.value = c.chauffeur;
}

async function savePaie() {
  const payload = {
    camion_id:     document.getElementById('paie-camion-id').value,
    chauffeur:     document.getElementById('paie-chauffeur').value.trim(),
    type:          document.getElementById('paie-type').value,
    montant:       parseFloat(document.getElementById('paie-montant').value)||0,
    periode:       document.getElementById('paie-periode').value,
    date_paiement: document.getElementById('paie-date').value,
    statut:        document.getElementById('paie-statut').value,
    description:   document.getElementById('paie-description').value.trim()||null,
  };
  if (!payload.camion_id||!payload.chauffeur||!payload.type||!payload.montant||!payload.periode||!payload.date_paiement) { toast('Champs requis manquants','error'); return; }
  try {
    if (_editPaieId) { await API.updatePaie(_editPaieId, payload); toast('Paiement mis à jour','success'); }
    else             { await API.createPaie(payload);               toast('Paiement ajouté','success'); }
    closeModal('paie-modal');
    renderPaie();
  } catch(e) { toast(e.message,'error'); }
}

async function deletePaie(id) {
  try { await API.deletePaie(id); toast('Supprimé','success'); renderPaie(); } catch(e) { toast(e.message,'error'); }
}

// ============================================================
// ALERTES
// ============================================================
let _alerteFilter = 'all';

async function renderAlertes() {
  try {
    const alertes = await API.getAlertes();
    _renderAlertesFiltered(alertes, _alerteFilter);
    refreshAlertsBadge();
  } catch(e) { toast('Erreur alertes: '+e.message,'error'); }
}

function filterAlertes(filter) {
  _alerteFilter = filter;
  document.querySelectorAll('[id^="alerte-filter-"]').forEach(btn => btn.classList.remove('active'));
  const btn = document.getElementById('alerte-filter-'+filter);
  if (btn) btn.classList.add('active');
  API.getAlertes().then(alertes => _renderAlertesFiltered(alertes, filter)).catch(e=>toast(e.message,'error'));
}

function _renderAlertesFiltered(alertes, filter) {
  let filtered = alertes;
  if (filter === 'non-lues') filtered = alertes.filter(a=>!a.lue);
  else if (filter === 'danger')  filtered = alertes.filter(a=>a.niveau==='danger');
  else if (filter === 'warning') filtered = alertes.filter(a=>a.niveau==='warning');
  else if (['MAINTENANCE','MARGE','PNEU','VIDANGE','VISITE','PAIE'].includes(filter)) filtered = alertes.filter(a=>a.type===filter);

  const el = document.getElementById('alertes-list');
  if (!el) return;

  if (!filtered.length) {
    el.innerHTML = `<div class="empty-state"><div class="empty-state-icon">🔔</div><div class="empty-state-title">Aucune alerte</div><div class="empty-state-text">Tout est en ordre !</div></div>`;
    return;
  }

  const niveauCls = { danger:'alert-danger', warning:'alert-warning', info:'alert-info' };
  const niveauIcon = { danger:'🚨', warning:'⚠️', info:'ℹ️' };

  el.innerHTML = filtered.map(a => `
    <div class="alert ${niveauCls[a.niveau]||'alert-info'}" style="margin-bottom:10px;opacity:${a.lue?0.55:1};transition:opacity .2s" id="alerte-${a.id}">
      <span class="alert-icon">${niveauIcon[a.niveau]||'ℹ️'}</span>
      <div style="flex:1">
        <div class="alert-title">${a.titre}</div>
        <div class="alert-body">${a.message}</div>
        <div style="font-size:0.7rem;color:var(--text-faint);margin-top:4px">${fmtDate(a.date_alerte)} ${a.camion_nom?'· '+a.camion_nom:''}</div>
      </div>
      <div class="d-flex gap-4" style="flex-shrink:0">
        ${!a.lue ? `<button class="btn btn-ghost btn-sm" onclick="lireAlerte(${a.id})" title="Marquer comme lu">✓</button>` : ''}
        <button class="btn btn-ghost btn-sm" style="color:var(--danger)" onclick="supprimerAlerte(${a.id})" title="Supprimer">🗑️</button>
      </div>
    </div>
  `).join('');
}

async function lireAlerte(id) {
  try {
    await API.lireAlerte(id);
    const el = document.getElementById('alerte-'+id);
    if (el) el.style.opacity = '0.55';
    refreshAlertsBadge();
  } catch(e) { toast(e.message,'error'); }
}

async function supprimerAlerte(id) {
  try {
    await API.deleteAlerte(id);
    const el = document.getElementById('alerte-'+id);
    if (el) { el.style.transform='translateX(100%)'; el.style.opacity='0'; setTimeout(()=>el.remove(),300); }
    refreshAlertsBadge();
  } catch(e) { toast(e.message,'error'); }
}

async function marquerToutLu() {
  try {
    await API.lireToutAlertes();
    toast('Toutes les alertes marquées comme lues','success');
    renderAlertes();
    refreshAlertsBadge();
  } catch(e) { toast(e.message,'error'); }
}

async function refreshAlertsBadge() {
  try {
    const { count } = await API.getAlertesCount();
    const badge = document.getElementById('alertes-badge');
    if (badge) {
      badge.textContent = count;
      badge.style.display = count > 0 ? 'inline-flex' : 'none';
    }
  } catch(e) {}
}
