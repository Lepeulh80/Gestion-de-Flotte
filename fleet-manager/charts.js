// ============================================================
// CHARTS.JS v3 - NC Mali Fleet Manager
// Graphiques complets, animés, interactifs
// ============================================================
const Charts = (() => {
  const instances = {};
  const P = ['#EB6B00','#EB0046','#10B981','#3B82F6','#8B5CF6','#F59E0B','#06B6D4','#6B7280','#EC4899','#84CC16'];

  Chart.defaults.font.family = "'Open Sans', sans-serif";
  Chart.defaults.animation.duration = 600;

  const tooltip = {
    backgroundColor: '#0F1E30', borderColor: '#1E3A5F', borderWidth: 1,
    titleColor: '#F1F5F9', bodyColor: '#94A3B8', padding: 12, cornerRadius: 8,
    callbacks: {
      label: ctx => {
        const v = ctx.parsed?.y ?? ctx.parsed;
        if (typeof v !== 'number') return '';
        return ' ' + new Intl.NumberFormat('fr-FR').format(Math.round(v)) + ' FCFA';
      }
    }
  };

  const scales = (yLabel) => ({
    x: { ticks: { color: '#64748B', font: { size: 10 } }, grid: { color: 'rgba(30,58,95,0.3)', drawBorder: false } },
    y: {
      ticks: { color: '#64748B', font: { size: 10 }, callback: v => {
        if (Math.abs(v) >= 1000000) return (v/1000000).toFixed(1) + 'M';
        if (Math.abs(v) >= 1000) return (v/1000).toFixed(0) + 'k';
        return v;
      }},
      grid: { color: 'rgba(30,58,95,0.3)', drawBorder: false },
      title: yLabel ? { display: true, text: yLabel, color: '#64748B', font: { size: 10 } } : undefined
    }
  });

  function destroy(id) { if (instances[id]) { instances[id].destroy(); delete instances[id]; } }

  return {
    bar(id, labels, datasets, opts = {}) {
      destroy(id);
      const ctx = document.getElementById(id);
      if (!ctx) return;
      instances[id] = new Chart(ctx, {
        type: 'bar',
        data: {
          labels,
          datasets: datasets.map((d, i) => ({
            label: d.label,
            data: d.data,
            borderRadius: 5,
            borderWidth: 0,
            backgroundColor: Array.isArray(d.color) ? d.color.map(c => c + 'CC') : (d.color || P[i]) + 'CC',
            borderColor: Array.isArray(d.color) ? d.color : (d.color || P[i]),
            hoverBackgroundColor: Array.isArray(d.color) ? d.color : (d.color || P[i]),
          }))
        },
        options: {
          responsive: true, maintainAspectRatio: true,
          plugins: { legend: { labels: { color: '#94A3B8', font: { size: 11 }, boxWidth: 12, padding: 16 } }, tooltip },
          scales: scales(opts.yLabel),
          interaction: { mode: 'index', intersect: false }
        }
      });
    },

    line(id, labels, datasets, opts = {}) {
      destroy(id);
      const ctx = document.getElementById(id);
      if (!ctx) return;
      instances[id] = new Chart(ctx, {
        type: 'line',
        data: {
          labels,
          datasets: datasets.map((d, i) => ({
            label: d.label,
            data: d.data,
            borderColor: d.color || P[i],
            backgroundColor: (d.color || P[i]) + '18',
            fill: d.fill !== false,
            tension: 0.4,
            pointRadius: 4,
            pointHoverRadius: 7,
            pointBackgroundColor: d.color || P[i],
            pointBorderColor: '#0F1E30',
            pointBorderWidth: 2,
            borderWidth: 2.5,
          }))
        },
        options: {
          responsive: true, maintainAspectRatio: true,
          plugins: { legend: { labels: { color: '#94A3B8', font: { size: 11 }, boxWidth: 12, padding: 16 } }, tooltip },
          scales: scales(opts.yLabel),
          interaction: { mode: 'index', intersect: false }
        }
      });
    },

    doughnut(id, labels, data, opts = {}) {
      destroy(id);
      const ctx = document.getElementById(id);
      if (!ctx) return;
      const colors = opts.colors || P;
      instances[id] = new Chart(ctx, {
        type: 'doughnut',
        data: {
          labels,
          datasets: [{
            data,
            backgroundColor: colors.map((c, i) => (data[i] > 0 ? c + 'CC' : c + '33')),
            borderColor: '#0F172A',
            borderWidth: 3,
            hoverOffset: 8,
            hoverBorderColor: '#EB6B00',
          }]
        },
        options: {
          responsive: true, maintainAspectRatio: true,
          cutout: '68%',
          plugins: {
            legend: { position: 'right', labels: { color: '#94A3B8', font: { size: 10 }, boxWidth: 10, padding: 10 } },
            tooltip: { ...tooltip, callbacks: { label: ctx => ' ' + new Intl.NumberFormat('fr-FR').format(Math.round(ctx.parsed)) + ' FCFA (' + ((ctx.parsed / ctx.dataset.data.reduce((a,b)=>a+b,0))*100).toFixed(1) + '%)' } }
          }
        }
      });
    },

    radar(id, labels, datasets) {
      destroy(id);
      const ctx = document.getElementById(id);
      if (!ctx) return;
      instances[id] = new Chart(ctx, {
        type: 'radar',
        data: {
          labels,
          datasets: datasets.map((d, i) => ({
            label: d.label,
            data: d.data,
            borderColor: d.color || P[i],
            backgroundColor: (d.color || P[i]) + '22',
            pointBackgroundColor: d.color || P[i],
            borderWidth: 2,
          }))
        },
        options: {
          responsive: true, maintainAspectRatio: true,
          plugins: { legend: { labels: { color: '#94A3B8', font: { size: 11 } } }, tooltip },
          scales: { r: { ticks: { color: '#64748B', backdropColor: 'transparent', font: { size: 9 } }, grid: { color: 'rgba(30,58,95,0.4)' }, pointLabels: { color: '#94A3B8', font: { size: 10 } } } }
        }
      });
    },

    gauge(id, value, max, color) {
      destroy(id);
      const ctx = document.getElementById(id);
      if (!ctx) return;
      const pct = Math.min(Math.max(value / max, 0), 1);
      instances[id] = new Chart(ctx, {
        type: 'doughnut',
        data: {
          datasets: [{
            data: [pct, 1 - pct],
            backgroundColor: [color + 'CC', '#1E3A5F33'],
            borderWidth: 0,
            circumference: 180,
            rotation: 270,
          }]
        },
        options: {
          responsive: true, maintainAspectRatio: true,
          cutout: '75%',
          plugins: { legend: { display: false }, tooltip: { enabled: false } }
        }
      });
    },

    destroy(id) { destroy(id); },
    destroyAll() { Object.keys(instances).forEach(id => destroy(id)); }
  };
})();
