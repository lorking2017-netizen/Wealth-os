
const data = window.APP_DATA;
const TRANSACTION_KEY = 'wealth-os-transactions';

const viewMeta = {
  dashboard: ['Dashboard', 'Vista generale di patrimonio, performance e cash flow.'],
  portfolio: ['Portfolio Engine', 'Storico del net worth, return, drawdown e metriche.'],
  allocation: ['Asset Allocation', 'Allocazione attuale, target e gap da colmare.'],
  annual: ['Assets 2024-2026', 'Replica ordinata dei fogli annuali con vista per anno.'],
  sterline: ['Sterline', 'Tracking completo delle sterline 2024, 2025 e 2026.'],
  finance: ['Entrate / Uscite', 'Nuova area per controllare cash flow personale, spese e risparmio.']
};

function euro(v) {
  if (isPrivacyHidden()) return '€ ' + maskValue();
  return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 2 }).format(Number(v || 0));
}
function pct(v) {
  return `${(Number(v || 0) * 100).toFixed(2)}%`;
}
function num(v) {
  if (v === null || v === undefined || v === '') return '-';
  if (isPrivacyHidden()) return maskValue();
  return new Intl.NumberFormat('it-IT', { maximumFractionDigits: 2 }).format(Number(v));
}
function monthLabel(dateStr) {
  const d = new Date(dateStr);
  return d.toLocaleDateString('it-IT', { month: 'short', year: '2-digit' });
}
function isPrivacyHidden() {
  return sessionStorage.getItem('wealth-os-privacy-hidden') !== 'false';
}

function setPrivacyHidden(hidden) {
  sessionStorage.setItem('wealth-os-privacy-hidden', hidden ? 'true' : 'false');
}

function togglePrivacyHidden() {
  setPrivacyHidden(!isPrivacyHidden());
}

function maskValue() {
  return '••••••';
}


function setView(name) {
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  document.querySelectorAll('.nav-btn').forEach(v => v.classList.remove('active'));
  document.getElementById(name).classList.add('active');
  const btn = document.querySelector(`.nav-btn[data-view="${name}"]`);
  if (btn) btn.classList.add('active');
  document.getElementById('viewTitle').textContent = viewMeta[name][0];
  document.getElementById('viewSubtitle').textContent = viewMeta[name][1];
  const sectionSelect = document.getElementById('quickSection');
  if (sectionSelect) sectionSelect.value = name;
}

document.querySelectorAll('.nav-btn').forEach(btn => {
  btn.addEventListener('click', () => setView(btn.dataset.view));
});

function makeLineChart(points, { min = null, max = null, fill = false } = {}) {
  if (!points.length) return '<div class="small">Nessun dato.</div>';
  const width = 1000, height = 320, pad = 34;
  const values = points.map(p => Number(p.value));
  const low = min !== null ? min : Math.min(...values);
  const high = max !== null ? max : Math.max(...values);
  const span = (high - low) || 1;

  const xy = points.map((p, i) => {
    const x = pad + (i * (width - pad * 2) / Math.max(points.length - 1, 1));
    const y = height - pad - ((Number(p.value) - low) / span) * (height - pad * 2);
    return [x, y];
  });

  const line = xy.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p[0]} ${p[1]}`).join(' ');
  const area = `${line} L ${xy[xy.length - 1][0]} ${height - pad} L ${xy[0][0]} ${height - pad} Z`;

  const labels = points.map((p, i) => {
    if (i !== 0 && i !== points.length - 1 && i % Math.ceil(points.length / 6) !== 0) return '';
    return `<text x="${xy[i][0]}" y="${height - 8}" text-anchor="middle" fill="#99a7c2" font-size="11">${p.label}</text>`;
  }).join('');

  const grid = [0, 1, 2, 3, 4].map(i => {
    const y = pad + i * ((height - pad * 2) / 4);
    const val = (high - (i / 4) * span);
    return `
      <line x1="${pad}" y1="${y}" x2="${width - pad}" y2="${y}" stroke="rgba(153,167,194,0.18)" />
      <text x="${pad - 8}" y="${y + 4}" text-anchor="end" fill="#99a7c2" font-size="11">${num(val)}</text>
    `;
  }).join('');

  return `
    <svg viewBox="0 0 ${width} ${height}" preserveAspectRatio="none">
      ${grid}
      ${fill ? `<path d="${area}" fill="rgba(248,113,113,0.18)"></path>` : ''}
      <path d="${line}" fill="none" stroke="${fill ? '#f87171' : '#7dd3fc'}" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"></path>
      ${xy.map(([x, y]) => `<circle cx="${x}" cy="${y}" r="3" fill="${fill ? '#f87171' : '#7dd3fc'}"></circle>`).join('')}
      ${labels}
    </svg>
  `;
}

function makeDonutChart(rows, centerLabel = 'Allocazione') {
  const validRows = rows.filter(row => Number(row.current || 0) > 0);
  const total = validRows.reduce((sum, row) => sum + Number(row.current || 0), 0) || 1;
  const palette = ['#8c7350', '#1f7a63', '#b05555', '#9a7c2f', '#6b7280', '#bda27c'];
  let acc = 0;

  const segments = validRows.map((row, idx) => {
    const pctValue = Number(row.current || 0) / total;
    const start = acc;
    const end = acc + pctValue;
    acc = end;
    const largeArc = pctValue > 0.5 ? 1 : 0;
    const startAngle = start * Math.PI * 2 - Math.PI / 2;
    const endAngle = end * Math.PI * 2 - Math.PI / 2;
    const x1 = 50 + 36 * Math.cos(startAngle);
    const y1 = 50 + 36 * Math.sin(startAngle);
    const x2 = 50 + 36 * Math.cos(endAngle);
    const y2 = 50 + 36 * Math.sin(endAngle);

    return {
      row,
      pctValue,
      color: palette[idx % palette.length],
      path: `M 50 50 L ${x1.toFixed(3)} ${y1.toFixed(3)} A 36 36 0 ${largeArc} 1 ${x2.toFixed(3)} ${y2.toFixed(3)} Z`
    };
  });

  return `
    <div class="donut-layout">
      <svg viewBox="0 0 100 100" class="donut-chart" aria-label="${centerLabel}">
        ${segments.map(seg => `<path d="${seg.path}" fill="${seg.color}"></path>`).join('')}
        <circle cx="50" cy="50" r="18" fill="#ffffff"></circle>
        <text x="50" y="46" text-anchor="middle" class="donut-total-label">${centerLabel}</text>
        <text x="50" y="56" text-anchor="middle" class="donut-total-value">${Math.round(total).toLocaleString('it-IT')}</text>
      </svg>
      <div class="donut-legend">
        ${segments.map(seg => `
          <div class="legend-row">
            <span class="legend-dot" style="background:${seg.color}"></span>
            <span class="legend-name">${seg.row.asset}</span>
            <span class="legend-pct">${pct(seg.pctValue)}</span>
          </div>
        `).join('')}
      </div>
    </div>
  `;
}

function renderDashboard() {
  const latest = data.portfolioHistory[data.portfolioHistory.length - 1];
  const prev = data.portfolioHistory[data.portfolioHistory.length - 2];
  const monthlyDelta = latest.netWorth - prev.netWorth;

  const cards = `
    <div class="cards">
      <article class="card privacy-toggle-card" id="privacyToggleCard"><h3>Net Worth attuale</h3><p class="metric">${euro(latest.netWorth)}</p><div class="metric-sub">${monthLabel(latest.date)} · Tocca per ${isPrivacyHidden() ? 'mostrare' : 'nascondere'} tutti gli importi</div></article>
      <article class="card"><h3>Crescita totale</h3><p class="metric good">${pct(data.portfolioMetrics.netWorthGrowth)}</p><div class="metric-sub">Da inizio tracking</div></article>
      <article class="card"><h3>Variazione ultimo mese</h3><p class="metric ${monthlyDelta >= 0 ? 'good' : 'bad'}">${euro(monthlyDelta)}</p><div class="metric-sub">${pct(data.portfolioMetrics.ytdReturn)} YTD</div></article>
      <article class="card"><h3>Max Drawdown</h3><p class="metric bad">${pct(data.portfolioMetrics.maxDrawdown)}</p><div class="metric-sub">Recovery: ${num(data.portfolioMetrics.recoveryTime)} mesi</div></article>
    </div>
  `;

  const equityPoints = data.portfolioHistory.map(item => ({ label: monthLabel(item.date), value: item.netWorth }));
  const drawdownPoints = data.portfolioHistory.map(item => ({ label: monthLabel(item.date), value: item.drawdown * 100 }));

  const metrics = `
    <div class="grid-2">
      <article class="panel">
        <h3>Equity Curve</h3>
        <div class="chart-wrap">${makeLineChart(equityPoints)}</div>
      </article>
      <article class="panel">
        <h3>Performance / Rischio / Efficienza</h3>
        <table>
          <tbody>
            <tr><td>Net Worth Growth</td><td>${pct(data.portfolioMetrics.netWorthGrowth)}</td></tr>
            <tr><td>CAGR</td><td>${pct(data.portfolioMetrics.cagr)}</td></tr>
            <tr><td>YTD Return</td><td>${pct(data.portfolioMetrics.ytdReturn)}</td></tr>
            <tr><td>Volatilità annualizzata</td><td>${pct(data.portfolioMetrics.volatility)}</td></tr>
            <tr><td>Sharpe Ratio</td><td>${num(data.portfolioMetrics.sharpe)}</td></tr>
            <tr><td>Calmar Ratio</td><td>${num(data.portfolioMetrics.calmar)}</td></tr>
          </tbody>
        </table>
      </article>
    </div>
    <div class="grid-2">
      <article class="panel">
        <h3>Drawdown</h3>
        <div class="chart-wrap">${makeLineChart(drawdownPoints, { fill: true, min: Math.min(...drawdownPoints.map(x => x.value), -1), max: 0 })}</div>
      </article>
      <article class="panel">
        <h3>Asset Allocation attuale</h3>
        <table>
          <thead><tr><th>Asset</th><th>Current</th><th>Target</th><th>Delta</th></tr></thead>
          <tbody>
            ${data.allocationMacro.map(row => `
              <tr>
                <td>${row.asset}</td>
                <td>${euro(row.current)}</td>
                <td>${pct(row.targetPct)}</td>
                <td class="${row.delta >= 0 ? 'delta-pos' : 'delta-neg'}">${row.delta > 0 ? '+' : ''}${euro(row.delta)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </article>
    </div>
  `;

  document.getElementById('dashboard').innerHTML = cards + metrics;
  const privacyToggle = document.getElementById('privacyToggleCard');
  if (privacyToggle) {
    privacyToggle.addEventListener('click', () => {
      togglePrivacyHidden();
      rerenderAll();
    });
  }
}

function renderPortfolio() {
  const rows = data.portfolioHistory.map(item => `
    <tr>
      <td>${item.date}</td>
      <td>${euro(item.netWorth)}</td>
      <td>${euro(item.cashFlow)}</td>
      <td class="${item.return >= 0 ? 'delta-pos' : 'delta-neg'}">${pct(item.return)}</td>
      <td class="${item.cumReturn >= 0 ? 'delta-pos' : 'delta-neg'}">${pct(item.cumReturn)}</td>
      <td>${euro(item.runningMax)}</td>
      <td class="${item.drawdown >= 0 ? 'delta-pos' : 'delta-neg'}">${pct(item.drawdown)}</td>
    </tr>
  `).join('');

  document.getElementById('portfolio').innerHTML = `
    <div class="cards">
      <article class="card"><h3>CAGR</h3><p class="metric">${pct(data.portfolioMetrics.cagr)}</p></article>
      <article class="card"><h3>Volatilità</h3><p class="metric">${pct(data.portfolioMetrics.volatility)}</p></article>
      <article class="card"><h3>Sharpe</h3><p class="metric">${num(data.portfolioMetrics.sharpe)}</p></article>
      <article class="card"><h3>Calmar</h3><p class="metric">${num(data.portfolioMetrics.calmar)}</p></article>
    </div>
    <article class="panel">
      <h3>Storico Portfolio Engine</h3>
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Data</th><th>NW (EUR)</th><th>Cash Flow</th><th>Return</th><th>Cum Return</th><th>Running Max</th><th>Drawdown</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
    </article>
  `;
}

function renderAllocation() {
  const macroRows = data.allocationMacro.map(row => ({ ...row }));
  const detailRows = data.allocationDetail.map(row => ({ ...row }));
  const totalAllocation = macroRows.reduce((sum, row) => sum + Number(row.current || 0), 0);

  const groupTotals = {};
  detailRows.forEach(row => {
    const group = row.group || 'Other';
    groupTotals[group] = (groupTotals[group] || 0) + Number(row.current || 0);
  });
  const groupRows = Object.entries(groupTotals).map(([asset, current]) => ({ asset, current }));

  const macroBars = `
    <div class="alloc-bars">
      ${macroRows.map(row => {
        const actualPct = totalAllocation ? Number(row.current || 0) / totalAllocation : 0;
        const driftPct = actualPct - Number(row.targetPct || 0);
        return `
          <div class="alloc-row">
            <div class="alloc-head">
              <span class="alloc-name">${row.asset}</span>
              <span class="alloc-meta">${euro(row.current)} · ${pct(actualPct)}</span>
            </div>
            <div class="alloc-track">
              <div class="alloc-target" style="width:${Math.max(0, Math.min(100, Number(row.targetPct || 0) * 100))}%"></div>
              <div class="alloc-fill ${driftPct >= 0 ? 'over' : 'under'}" style="width:${Math.max(0, Math.min(100, actualPct * 100))}%"></div>
            </div>
            <div class="alloc-foot">
              <span>Target ${pct(row.targetPct)}</span>
              <span class="${Number(row.delta || 0) >= 0 ? 'delta-pos' : 'delta-neg'}">${Number(row.delta || 0) > 0 ? '+' : ''}${euro(row.delta)}</span>
            </div>
          </div>
        `;
      }).join('')}
    </div>
  `;

  document.getElementById('allocation').innerHTML = `
    <div class="grid-2">
      <article class="panel">
        <h3>Macro Allocation</h3>
        ${makeDonutChart(macroRows, 'Macro')}
        ${macroBars}
        <div class="table-wrap">
          <table>
            <thead><tr><th>Asset</th><th>Current</th><th>Target %</th><th>Target EUR</th><th>Delta</th></tr></thead>
            <tbody>
              ${macroRows.map(row => `
                <tr>
                  <td>${row.asset}</td>
                  <td>${euro(row.current)}</td>
                  <td>${pct(row.targetPct)}</td>
                  <td>${euro(row.targetEur)}</td>
                  <td class="${Number(row.delta || 0) >= 0 ? 'delta-pos' : 'delta-neg'}">${Number(row.delta || 0) > 0 ? '+' : ''}${euro(row.delta)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </article>
      <article class="panel">
        <h3>Dettaglio Allocation</h3>
        ${makeDonutChart(groupRows, 'Gruppi')}
        <div class="table-wrap">
          <table>
            <thead><tr><th>Gruppo</th><th>Asset</th><th>Ticker</th><th>Current</th><th>Target %</th><th>Target EUR</th><th>Delta</th></tr></thead>
            <tbody>
              ${detailRows.map(row => `
                <tr>
                  <td>${row.group}</td>
                  <td>${row.asset}</td>
                  <td>${row.ticker || '-'}</td>
                  <td>${euro(row.current)}</td>
                  <td>${pct(row.targetPct)}</td>
                  <td>${row.targetEur === null ? '-' : euro(row.targetEur)}</td>
                  <td class="${(row.delta || 0) >= 0 ? 'delta-pos' : 'delta-neg'}">${row.delta === null ? '-' : `${row.delta > 0 ? '+' : ''}${euro(row.delta)}`}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </article>
    </div>
  `;
}
function renderAnnual() {
  const container = document.getElementById('annual');
  container.innerHTML = `
    <div class="section-tabs" id="annualTabs">
      <button class="chip active" data-year="2024">2024</button>
      <button class="chip" data-year="2025">2025</button>
      <button class="chip" data-year="2026">2026</button>
    </div>
    <div id="annualContent"></div>
  `;

  function paint(year) {
    const yearData = data.annualData[year];
    const cols = ['Start', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    const sectionHtml = Object.entries(yearData.sections).map(([sectionName, rows]) => `
      <article class="panel">
        <h3>${sectionName}</h3>
        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Nome</th>
                <th>Cur</th>
                ${cols.map(col => `<th>${col}</th>`).join('')}
              </tr>
            </thead>
            <tbody>
              ${rows.map(row => `
                <tr>
                  <td>${row.name}</td>
                  <td>${row.currency || '-'}</td>
                  ${row.values.map(v => `<td>${typeof v === 'number' ? num(v) : (v || '-')}</td>`).join('')}
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </article>
    `).join('');

    const summary = yearData.summary;
    const summaryLabelMap = {
      nwEur: 'NW (EUR)',
      nwEurChange: 'NW Change',
      nwEurPct: 'Change %',
      nwChf: 'NW (CHF)',
      nwUsd: 'NW (USD)'
    };
    const percentRows = new Set(['nwEurPct']);

    const summaryRows = Object.entries(summary).map(([key, values]) => `
      <tr>
        <td>${summaryLabelMap[key] || key}</td>
        ${values.map(v => {
          if (v === null || v === undefined || v === '') return `<td>-</td>`;
          if (percentRows.has(key) && typeof v === 'number') {
            const cls = v >= 0 ? 'delta-pos' : 'delta-neg';
            return `<td class="${cls}">${pct(v)}</td>`;
          }
          if (typeof v === 'number') return `<td>${num(v)}</td>`;
          return `<td>${v || '-'}</td>`;
        }).join('')}
      </tr>
    `).join('');

    document.getElementById('annualContent').innerHTML = `
      <article class="panel">
        <h3>Riepilogo ${year}</h3>
        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Voce</th>
                ${cols.map(col => `<th>${col}</th>`).join('')}
              </tr>
            </thead>
            <tbody>${summaryRows}</tbody>
          </table>
        </div>
      </article>
      ${sectionHtml}
    `;
  }

  document.querySelectorAll('#annualTabs .chip').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('#annualTabs .chip').forEach(x => x.classList.remove('active'));
      btn.classList.add('active');
      paint(btn.dataset.year);
    });
  });

  paint('2024');
}

function renderSterline() {
  const container = document.getElementById('sterline');
  container.innerHTML = `
    <div class="section-tabs" id="sterlineTabs">
      <button class="chip active" data-year="2024">Sterline 2024</button>
      <button class="chip" data-year="2025">Sterline 2025</button>
      <button class="chip" data-year="2026">Sterline 2026</button>
    </div>
    <div id="sterlineContent"></div>
  `;

  function getTopRowValues(yearData, label) {
    const keyMap = {
      'Total Value': 'totalValue',
      'Value Change': 'valueChange',
      'Change %': 'changePct'
    };
    const totalsKey = keyMap[label];
    const fromTotals = yearData.totals && Array.isArray(yearData.totals[totalsKey]) ? yearData.totals[totalsKey] : [];
    const fromItems = yearData.items.find(item => item.name === label)?.values || [];
    const hasFromItems = fromItems.some(v => v !== null && v !== undefined && v !== '');
    return hasFromItems ? fromItems : fromTotals;
  }

  function paint(year) {
    const yearData = data.sterlineData[year];
    const cols = ['Start', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    const totalValueRow = getTopRowValues(yearData, 'Total Value');
    const valueChangeRow = getTopRowValues(yearData, 'Value Change');
    const changePctRow = getTopRowValues(yearData, 'Change %');

    const totals = `
      <article class="panel">
        <h3>Totali ${year}</h3>
        <div class="table-wrap">
          <table>
            <thead><tr><th>Voce</th>${cols.map(c => `<th>${c}</th>`).join('')}</tr></thead>
            <tbody>
              <tr class="summary-emphasis"><td>Total Value</td>${totalValueRow.map(v => `<td>${typeof v === 'number' ? num(v) : (v || '-')}</td>`).join('')}</tr>
              <tr><td>Value Change</td>${valueChangeRow.map(v => `<td class="${typeof v === 'number' ? (v >= 0 ? 'delta-pos' : 'delta-neg') : ''}">${typeof v === 'number' ? `${v > 0 ? '+' : ''}${num(v)}` : (v || '-')}</td>`).join('')}</tr>
              <tr><td>Change %</td>${changePctRow.map(v => `<td class="${typeof v === 'number' ? (v >= 0 ? 'delta-pos' : 'delta-neg') : ''}">${typeof v === 'number' ? pct(v) : (v || '-')}</td>`).join('')}</tr>
            </tbody>
          </table>
        </div>
      </article>
    `;

    const filteredItems = yearData.items.filter(item => !['Total Value', 'Value Change', 'Change %'].includes(item.name));

    const table = `
      <article class="panel">
        <h3>Elenco Sterline ${year}</h3>
        <div class="table-wrap">
          <table>
            <thead><tr><th>Nome</th>${cols.map(c => `<th>${c}</th>`).join('')}</tr></thead>
            <tbody>
              ${filteredItems.map(item => `
                <tr>
                  <td>${item.name}</td>
                  ${item.values.map(v => `<td>${typeof v === 'number' ? num(v) : (v || '-')}</td>`).join('')}
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </article>
    `;

    document.getElementById('sterlineContent').innerHTML = totals + table;
  }

  document.querySelectorAll('#sterlineTabs .chip').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('#sterlineTabs .chip').forEach(x => x.classList.remove('active'));
      btn.classList.add('active');
      paint(btn.dataset.year);
    });
  });

  paint('2024');
}
function loadTransactions() {
  const raw = localStorage.getItem(TRANSACTION_KEY);
  if (!raw) {
    const seed = [
      { id: crypto.randomUUID(), date: new Date().toISOString().slice(0, 10), type: 'income', category: 'Stipendio', account: 'Conto', amount: 2200, description: 'Entrata mensile', note: '' },
      { id: crypto.randomUUID(), date: new Date().toISOString().slice(0, 10), type: 'expense', category: 'Spesa', account: 'Carta', amount: 120, description: 'Supermercato', note: '' },
      { id: crypto.randomUUID(), date: new Date().toISOString().slice(0, 10), type: 'transfer', category: 'Investimento', account: 'Broker', amount: 500, description: 'Trasferimento al broker', note: 'Non conteggiare come spesa reale' }
    ];
    localStorage.setItem(TRANSACTION_KEY, JSON.stringify(seed));
    return seed;
  }
  return JSON.parse(raw);
}
function saveTransactions(items) {
  localStorage.setItem(TRANSACTION_KEY, JSON.stringify(items));
}
function financeStats(items) {
  const income = items.filter(x => x.type === 'income').reduce((a, b) => a + Number(b.amount), 0);
  const expense = items.filter(x => x.type === 'expense').reduce((a, b) => a + Number(b.amount), 0);
  const transfer = items.filter(x => x.type === 'transfer').reduce((a, b) => a + Number(b.amount), 0);
  return { income, expense, transfer, savings: income - expense };
}
function renderFinance() {
  const container = document.getElementById('finance');
  const items = loadTransactions();
  const stats = financeStats(items);

  container.innerHTML = `
    <div class="cards">
      <article class="card"><h3>Entrate</h3><p class="metric good">${euro(stats.income)}</p></article>
      <article class="card"><h3>Uscite reali</h3><p class="metric bad">${euro(stats.expense)}</p></article>
      <article class="card"><h3>Risparmio netto</h3><p class="metric ${stats.savings >= 0 ? 'good' : 'bad'}">${euro(stats.savings)}</p></article>
      <article class="card"><h3>Trasferimenti a investimenti</h3><p class="metric warn">${euro(stats.transfer)}</p></article>
    </div>

    <article class="panel">
      <h3>Nuovo movimento</h3>
      <form id="txForm" class="form-grid">
        <input type="date" id="txDate" required />
        <select id="txType" required>
          <option value="income">Entrata</option>
          <option value="expense">Uscita</option>
          <option value="transfer">Trasferimento interno / investimento</option>
        </select>
        <input type="text" id="txCategory" placeholder="Categoria" required />
        <input type="text" id="txAccount" placeholder="Conto" required />
        <input type="number" id="txAmount" min="0" step="0.01" placeholder="Importo" required />
        <input type="text" id="txDescription" placeholder="Descrizione" required />
        <input class="full" type="text" id="txNote" placeholder="Nota facoltativa" />
        <div class="full"><button type="submit">Salva movimento</button></div>
      </form>
    </article>

    <article class="panel">
      <h3>Movimenti</h3>
      <div class="table-wrap">
        <table>
          <thead>
            <tr><th>Data</th><th>Tipo</th><th>Categoria</th><th>Conto</th><th>Descrizione</th><th>Importo</th><th>Nota</th><th>Azioni</th></tr>
          </thead>
          <tbody>
            ${items.sort((a,b) => b.date.localeCompare(a.date)).map(item => `
              <tr>
                <td>${item.date}</td>
                <td>${item.type}</td>
                <td>${item.category}</td>
                <td>${item.account}</td>
                <td>${item.description}</td>
                <td class="${item.type === 'income' ? 'delta-pos' : item.type === 'expense' ? 'delta-neg' : 'warn'}">${euro(item.amount)}</td>
                <td>${item.note || '-'}</td>
                <td><button class="secondary" data-delete="${item.id}">Elimina</button></td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </article>
  `;

  document.getElementById('txDate').value = new Date().toISOString().slice(0, 10);

  document.getElementById('txForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const updated = loadTransactions();
    updated.push({
      id: crypto.randomUUID(),
      date: document.getElementById('txDate').value,
      type: document.getElementById('txType').value,
      category: document.getElementById('txCategory').value.trim(),
      account: document.getElementById('txAccount').value.trim(),
      amount: Number(document.getElementById('txAmount').value),
      description: document.getElementById('txDescription').value.trim(),
      note: document.getElementById('txNote').value.trim()
    });
    saveTransactions(updated);
    renderFinance();
  });

  container.querySelectorAll('[data-delete]').forEach(btn => {
    btn.addEventListener('click', () => {
      const updated = loadTransactions().filter(x => x.id !== btn.dataset.delete);
      saveTransactions(updated);
      renderFinance();
    });
  });
}

renderDashboard();
renderPortfolio();
renderAllocation();
renderAnnual();
renderSterline();
renderFinance();



const PORTFOLIO_OVERRIDES_KEY = 'wealth-os-portfolio-overrides';
const ALLOCATION_OVERRIDES_KEY = 'wealth-os-allocation-overrides';
const POSITION_HISTORY_KEY = 'wealth-os-position-history';
const WATCHLIST_KEY = 'wealth-os-watchlist';

viewMeta.positions = ['Posizioni', 'Quote, prezzo, valore e peso delle posizioni correnti.'];
viewMeta.watchlist = ['Watchlist', 'Tracking manuale dei tuoi strumenti preferiti.'];
viewMeta.updates = ['Aggiornamenti', 'Aggiorna Net Worth, ETF, cash, commodities e watchlist mese per mese.'];

const DEFAULT_WATCHLIST = [
  {
    "name": "BIT:iShares Core MSCI World UCITS ETF USD (Acc)",
    "ticker": "BIT:iShares Core MSCI World UCITS ETF USD (Acc)",
    "price": 104.99,
    "ytd": 0.2348859091978357,
    "lastMonth": -0.006152972358954956,
    "note": "Importato da 2024"
  },
  {
    "name": "BIT:Core S&P 500 USD (Acc)",
    "ticker": "BIT:Core S&P 500 USD (Acc)",
    "price": 608.54,
    "ytd": 0.2880789094911522,
    "lastMonth": -0.0037000654878847072,
    "note": "Importato da 2024"
  },
  {
    "name": "BIT:Core MSCI EM IMI USD (Acc)",
    "ticker": "BIT:Core MSCI EM IMI USD (Acc)",
    "price": 33.21,
    "ytd": 0.17142857142857149,
    "lastMonth": 0.006363636363636349,
    "note": "Importato da 2024"
  },
  {
    "name": "Gold (ounce)",
    "ticker": "Gold (ounce)",
    "price": 4470.5,
    "ytd": 0.040594958217918586,
    "lastMonth": 0.040594958217918586,
    "note": "Importato da 2026"
  },
  {
    "name": "Bitcoin",
    "ticker": "Bitcoin",
    "price": 56850.21,
    "ytd": -0.23292526277441206,
    "lastMonth": -0.23292526277441206,
    "note": "Importato da 2026"
  },
  {
    "name": "Palantir Technologies, Inc.",
    "ticker": "Palantir Technologies, Inc.",
    "price": 73.92,
    "ytd": 3.918163672654691,
    "lastMonth": 0.18708848562710778,
    "note": "Importato da 2024"
  },
  {
    "name": "SWDA SW",
    "ticker": "SWDA SW",
    "price": 113.35,
    "ytd": 0.012324729838349535,
    "lastMonth": 0.012324729838349535,
    "note": "Importato da 2026"
  },
  {
    "name": "CSSPX SW",
    "ticker": "CSSPX SW",
    "price": 551.04,
    "ytd": -0.10935833198642331,
    "lastMonth": 0.04971996799634226,
    "note": "Importato da 2025"
  },
  {
    "name": "EIMI SW",
    "ticker": "EIMI SW",
    "price": 43.51,
    "ytd": 0.06799214531173292,
    "lastMonth": 0.06799214531173292,
    "note": "Importato da 2026"
  },
  {
    "name": "EURCHF",
    "ticker": "EURCHF",
    "price": 0.928,
    "ytd": -0.015906680805938378,
    "lastMonth": -0.0042918454935622075,
    "note": "Importato da 2025"
  },
  {
    "name": "EURUSD",
    "ticker": "EURUSD",
    "price": 1.181,
    "ytd": -0.0033755274261603185,
    "lastMonth": -0.0033755274261603185,
    "note": "Importato da 2026"
  },
  {
    "name": "USDCHF",
    "ticker": "USDCHF",
    "price": 0.769,
    "ytd": -0.01029601029601035,
    "lastMonth": -0.01029601029601035,
    "note": "Importato da 2026"
  }
];

const DEFAULT_POSITION_HISTORY = [
  {
    "date": "2024-01-01",
    "name": "Core MSCI World USD (Acc)",
    "ticker": "Core MSCI World USD (Acc)",
    "category": "Stocks",
    "currency": "EUR",
    "quotes": null,
    "price": null,
    "valueOverride": 0.0
  },
  {
    "date": "2024-02-01",
    "name": "Core MSCI World USD (Acc)",
    "ticker": "Core MSCI World USD (Acc)",
    "category": "Stocks",
    "currency": "EUR",
    "quotes": null,
    "price": null,
    "valueOverride": 0.0
  },
  {
    "date": "2024-03-01",
    "name": "Core MSCI World USD (Acc)",
    "ticker": "Core MSCI World USD (Acc)",
    "category": "Stocks",
    "currency": "EUR",
    "quotes": null,
    "price": null,
    "valueOverride": 0.0
  },
  {
    "date": "2024-04-01",
    "name": "Core MSCI World USD (Acc)",
    "ticker": "Core MSCI World USD (Acc)",
    "category": "Stocks",
    "currency": "EUR",
    "quotes": null,
    "price": null,
    "valueOverride": 0.0
  },
  {
    "date": "2024-05-01",
    "name": "Core MSCI World USD (Acc)",
    "ticker": "Core MSCI World USD (Acc)",
    "category": "Stocks",
    "currency": "EUR",
    "quotes": null,
    "price": null,
    "valueOverride": 50.0
  },
  {
    "date": "2024-06-01",
    "name": "Core MSCI World USD (Acc)",
    "ticker": "Core MSCI World USD (Acc)",
    "category": "Stocks",
    "currency": "EUR",
    "quotes": null,
    "price": null,
    "valueOverride": 101.03
  },
  {
    "date": "2024-07-01",
    "name": "Core MSCI World USD (Acc)",
    "ticker": "Core MSCI World USD (Acc)",
    "category": "Stocks",
    "currency": "EUR",
    "quotes": null,
    "price": null,
    "valueOverride": 145.87
  },
  {
    "date": "2024-08-01",
    "name": "Core MSCI World USD (Acc)",
    "ticker": "Core MSCI World USD (Acc)",
    "category": "Stocks",
    "currency": "EUR",
    "quotes": null,
    "price": null,
    "valueOverride": 199.7
  },
  {
    "date": "2024-09-01",
    "name": "Core MSCI World USD (Acc)",
    "ticker": "Core MSCI World USD (Acc)",
    "category": "Stocks",
    "currency": "EUR",
    "quotes": null,
    "price": null,
    "valueOverride": 255.73
  },
  {
    "date": "2024-10-01",
    "name": "Core MSCI World USD (Acc)",
    "ticker": "Core MSCI World USD (Acc)",
    "category": "Stocks",
    "currency": "EUR",
    "quotes": null,
    "price": null,
    "valueOverride": 309.91
  },
  {
    "date": "2024-11-01",
    "name": "Core MSCI World USD (Acc)",
    "ticker": "Core MSCI World USD (Acc)",
    "category": "Stocks",
    "currency": "EUR",
    "quotes": null,
    "price": null,
    "valueOverride": 484.24
  },
  {
    "date": "2024-12-01",
    "name": "Core MSCI World USD (Acc)",
    "ticker": "Core MSCI World USD (Acc)",
    "category": "Stocks",
    "currency": "EUR",
    "quotes": null,
    "price": null,
    "valueOverride": 581.0
  },
  {
    "date": "2024-01-01",
    "name": "Core S&P 500 USD (Acc)",
    "ticker": "Core S&P 500 USD (Acc)",
    "category": "Stocks",
    "currency": "EUR",
    "quotes": null,
    "price": null,
    "valueOverride": 0.0
  },
  {
    "date": "2024-02-01",
    "name": "Core S&P 500 USD (Acc)",
    "ticker": "Core S&P 500 USD (Acc)",
    "category": "Stocks",
    "currency": "EUR",
    "quotes": null,
    "price": null,
    "valueOverride": 0.0
  },
  {
    "date": "2024-03-01",
    "name": "Core S&P 500 USD (Acc)",
    "ticker": "Core S&P 500 USD (Acc)",
    "category": "Stocks",
    "currency": "EUR",
    "quotes": null,
    "price": null,
    "valueOverride": 0.0
  },
  {
    "date": "2024-04-01",
    "name": "Core S&P 500 USD (Acc)",
    "ticker": "Core S&P 500 USD (Acc)",
    "category": "Stocks",
    "currency": "EUR",
    "quotes": null,
    "price": null,
    "valueOverride": 0.0
  },
  {
    "date": "2024-05-01",
    "name": "Core S&P 500 USD (Acc)",
    "ticker": "Core S&P 500 USD (Acc)",
    "category": "Stocks",
    "currency": "EUR",
    "quotes": null,
    "price": null,
    "valueOverride": 0.0
  },
  {
    "date": "2024-06-01",
    "name": "Core S&P 500 USD (Acc)",
    "ticker": "Core S&P 500 USD (Acc)",
    "category": "Stocks",
    "currency": "EUR",
    "quotes": null,
    "price": null,
    "valueOverride": 0.0
  },
  {
    "date": "2024-07-01",
    "name": "Core S&P 500 USD (Acc)",
    "ticker": "Core S&P 500 USD (Acc)",
    "category": "Stocks",
    "currency": "EUR",
    "quotes": null,
    "price": null,
    "valueOverride": 24.68
  },
  {
    "date": "2024-08-01",
    "name": "Core S&P 500 USD (Acc)",
    "ticker": "Core S&P 500 USD (Acc)",
    "category": "Stocks",
    "currency": "EUR",
    "quotes": null,
    "price": null,
    "valueOverride": 25.92
  },
  {
    "date": "2024-09-01",
    "name": "Core S&P 500 USD (Acc)",
    "ticker": "Core S&P 500 USD (Acc)",
    "category": "Stocks",
    "currency": "EUR",
    "quotes": null,
    "price": null,
    "valueOverride": 126.61
  },
  {
    "date": "2024-10-01",
    "name": "Core S&P 500 USD (Acc)",
    "ticker": "Core S&P 500 USD (Acc)",
    "category": "Stocks",
    "currency": "EUR",
    "quotes": null,
    "price": null,
    "valueOverride": 229.62
  },
  {
    "date": "2024-11-01",
    "name": "Core S&P 500 USD (Acc)",
    "ticker": "Core S&P 500 USD (Acc)",
    "category": "Stocks",
    "currency": "EUR",
    "quotes": null,
    "price": null,
    "valueOverride": 301.26
  },
  {
    "date": "2024-12-01",
    "name": "Core S&P 500 USD (Acc)",
    "ticker": "Core S&P 500 USD (Acc)",
    "category": "Stocks",
    "currency": "EUR",
    "quotes": null,
    "price": null,
    "valueOverride": 325.11
  },
  {
    "date": "2024-01-01",
    "name": "Core MSCI EM IMI USD (Acc)",
    "ticker": "Core MSCI EM IMI USD (Acc)",
    "category": "Stocks",
    "currency": "EUR",
    "quotes": null,
    "price": null,
    "valueOverride": 0.0
  },
  {
    "date": "2024-02-01",
    "name": "Core MSCI EM IMI USD (Acc)",
    "ticker": "Core MSCI EM IMI USD (Acc)",
    "category": "Stocks",
    "currency": "EUR",
    "quotes": null,
    "price": null,
    "valueOverride": 0.0
  },
  {
    "date": "2024-03-01",
    "name": "Core MSCI EM IMI USD (Acc)",
    "ticker": "Core MSCI EM IMI USD (Acc)",
    "category": "Stocks",
    "currency": "EUR",
    "quotes": null,
    "price": null,
    "valueOverride": 0.0
  },
  {
    "date": "2024-04-01",
    "name": "Core MSCI EM IMI USD (Acc)",
    "ticker": "Core MSCI EM IMI USD (Acc)",
    "category": "Stocks",
    "currency": "EUR",
    "quotes": null,
    "price": null,
    "valueOverride": 0.0
  },
  {
    "date": "2024-05-01",
    "name": "Core MSCI EM IMI USD (Acc)",
    "ticker": "Core MSCI EM IMI USD (Acc)",
    "category": "Stocks",
    "currency": "EUR",
    "quotes": null,
    "price": null,
    "valueOverride": 0.0
  },
  {
    "date": "2024-06-01",
    "name": "Core MSCI EM IMI USD (Acc)",
    "ticker": "Core MSCI EM IMI USD (Acc)",
    "category": "Stocks",
    "currency": "EUR",
    "quotes": null,
    "price": null,
    "valueOverride": 0.0
  },
  {
    "date": "2024-07-01",
    "name": "Core MSCI EM IMI USD (Acc)",
    "ticker": "Core MSCI EM IMI USD (Acc)",
    "category": "Stocks",
    "currency": "EUR",
    "quotes": null,
    "price": null,
    "valueOverride": 24.81
  },
  {
    "date": "2024-08-01",
    "name": "Core MSCI EM IMI USD (Acc)",
    "ticker": "Core MSCI EM IMI USD (Acc)",
    "category": "Stocks",
    "currency": "EUR",
    "quotes": null,
    "price": null,
    "valueOverride": 25.56
  },
  {
    "date": "2024-09-01",
    "name": "Core MSCI EM IMI USD (Acc)",
    "ticker": "Core MSCI EM IMI USD (Acc)",
    "category": "Stocks",
    "currency": "EUR",
    "quotes": null,
    "price": null,
    "valueOverride": 126.61
  },
  {
    "date": "2024-10-01",
    "name": "Core MSCI EM IMI USD (Acc)",
    "ticker": "Core MSCI EM IMI USD (Acc)",
    "category": "Stocks",
    "currency": "EUR",
    "quotes": null,
    "price": null,
    "valueOverride": 223.11
  },
  {
    "date": "2024-11-01",
    "name": "Core MSCI EM IMI USD (Acc)",
    "ticker": "Core MSCI EM IMI USD (Acc)",
    "category": "Stocks",
    "currency": "EUR",
    "quotes": null,
    "price": null,
    "valueOverride": 274.74
  },
  {
    "date": "2024-12-01",
    "name": "Core MSCI EM IMI USD (Acc)",
    "ticker": "Core MSCI EM IMI USD (Acc)",
    "category": "Stocks",
    "currency": "EUR",
    "quotes": null,
    "price": null,
    "valueOverride": 301.6
  },
  {
    "date": "2024-01-01",
    "name": "Palantir Technologies, Inc.",
    "ticker": "Palantir Technologies, Inc.",
    "category": "Stocks",
    "currency": "EUR",
    "quotes": null,
    "price": null,
    "valueOverride": 0.0
  },
  {
    "date": "2024-02-01",
    "name": "Palantir Technologies, Inc.",
    "ticker": "Palantir Technologies, Inc.",
    "category": "Stocks",
    "currency": "EUR",
    "quotes": null,
    "price": null,
    "valueOverride": 0.0
  },
  {
    "date": "2024-03-01",
    "name": "Palantir Technologies, Inc.",
    "ticker": "Palantir Technologies, Inc.",
    "category": "Stocks",
    "currency": "EUR",
    "quotes": null,
    "price": null,
    "valueOverride": 0.0
  },
  {
    "date": "2024-04-01",
    "name": "Palantir Technologies, Inc.",
    "ticker": "Palantir Technologies, Inc.",
    "category": "Stocks",
    "currency": "EUR",
    "quotes": null,
    "price": null,
    "valueOverride": 0.0
  },
  {
    "date": "2024-05-01",
    "name": "Palantir Technologies, Inc.",
    "ticker": "Palantir Technologies, Inc.",
    "category": "Stocks",
    "currency": "EUR",
    "quotes": null,
    "price": null,
    "valueOverride": 0.0
  },
  {
    "date": "2024-06-01",
    "name": "Palantir Technologies, Inc.",
    "ticker": "Palantir Technologies, Inc.",
    "category": "Stocks",
    "currency": "EUR",
    "quotes": null,
    "price": null,
    "valueOverride": 0.0
  },
  {
    "date": "2024-07-01",
    "name": "Palantir Technologies, Inc.",
    "ticker": "Palantir Technologies, Inc.",
    "category": "Stocks",
    "currency": "EUR",
    "quotes": null,
    "price": null,
    "valueOverride": 0.0
  },
  {
    "date": "2024-08-01",
    "name": "Palantir Technologies, Inc.",
    "ticker": "Palantir Technologies, Inc.",
    "category": "Stocks",
    "currency": "EUR",
    "quotes": null,
    "price": null,
    "valueOverride": 0.0
  },
  {
    "date": "2024-09-01",
    "name": "Palantir Technologies, Inc.",
    "ticker": "Palantir Technologies, Inc.",
    "category": "Stocks",
    "currency": "EUR",
    "quotes": null,
    "price": null,
    "valueOverride": 0.0
  },
  {
    "date": "2024-10-01",
    "name": "Palantir Technologies, Inc.",
    "ticker": "Palantir Technologies, Inc.",
    "category": "Stocks",
    "currency": "EUR",
    "quotes": null,
    "price": null,
    "valueOverride": 0.0
  },
  {
    "date": "2024-11-01",
    "name": "Palantir Technologies, Inc.",
    "ticker": "Palantir Technologies, Inc.",
    "category": "Stocks",
    "currency": "EUR",
    "quotes": null,
    "price": null,
    "valueOverride": 0.0
  },
  {
    "date": "2024-12-01",
    "name": "Palantir Technologies, Inc.",
    "ticker": "Palantir Technologies, Inc.",
    "category": "Stocks",
    "currency": "EUR",
    "quotes": null,
    "price": null,
    "valueOverride": 501.27
  },
  {
    "date": "2024-01-01",
    "name": "Bitcoin EUR (BTC-EUR)",
    "ticker": "Bitcoin EUR (BTC-EUR)",
    "category": "Stocks",
    "currency": "EUR",
    "quotes": null,
    "price": null,
    "valueOverride": 0.0
  },
  {
    "date": "2024-02-01",
    "name": "Bitcoin EUR (BTC-EUR)",
    "ticker": "Bitcoin EUR (BTC-EUR)",
    "category": "Stocks",
    "currency": "EUR",
    "quotes": null,
    "price": null,
    "valueOverride": 0.0
  },
  {
    "date": "2024-03-01",
    "name": "Bitcoin EUR (BTC-EUR)",
    "ticker": "Bitcoin EUR (BTC-EUR)",
    "category": "Stocks",
    "currency": "EUR",
    "quotes": null,
    "price": null,
    "valueOverride": 0.0
  },
  {
    "date": "2024-04-01",
    "name": "Bitcoin EUR (BTC-EUR)",
    "ticker": "Bitcoin EUR (BTC-EUR)",
    "category": "Stocks",
    "currency": "EUR",
    "quotes": null,
    "price": null,
    "valueOverride": 0.0
  },
  {
    "date": "2024-05-01",
    "name": "Bitcoin EUR (BTC-EUR)",
    "ticker": "Bitcoin EUR (BTC-EUR)",
    "category": "Stocks",
    "currency": "EUR",
    "quotes": null,
    "price": null,
    "valueOverride": 0.0
  },
  {
    "date": "2024-06-01",
    "name": "Bitcoin EUR (BTC-EUR)",
    "ticker": "Bitcoin EUR (BTC-EUR)",
    "category": "Stocks",
    "currency": "EUR",
    "quotes": null,
    "price": null,
    "valueOverride": 0.0
  },
  {
    "date": "2024-07-01",
    "name": "Bitcoin EUR (BTC-EUR)",
    "ticker": "Bitcoin EUR (BTC-EUR)",
    "category": "Stocks",
    "currency": "EUR",
    "quotes": null,
    "price": null,
    "valueOverride": 0.0
  },
  {
    "date": "2024-08-01",
    "name": "Bitcoin EUR (BTC-EUR)",
    "ticker": "Bitcoin EUR (BTC-EUR)",
    "category": "Stocks",
    "currency": "EUR",
    "quotes": null,
    "price": null,
    "valueOverride": 0.0
  },
  {
    "date": "2024-09-01",
    "name": "Bitcoin EUR (BTC-EUR)",
    "ticker": "Bitcoin EUR (BTC-EUR)",
    "category": "Stocks",
    "currency": "EUR",
    "quotes": null,
    "price": null,
    "valueOverride": 0.0
  },
  {
    "date": "2024-10-01",
    "name": "Bitcoin EUR (BTC-EUR)",
    "ticker": "Bitcoin EUR (BTC-EUR)",
    "category": "Stocks",
    "currency": "EUR",
    "quotes": null,
    "price": null,
    "valueOverride": 0.0
  },
  {
    "date": "2024-11-01",
    "name": "Bitcoin EUR (BTC-EUR)",
    "ticker": "Bitcoin EUR (BTC-EUR)",
    "category": "Stocks",
    "currency": "EUR",
    "quotes": null,
    "price": null,
    "valueOverride": 0.0
  },
  {
    "date": "2024-12-01",
    "name": "Bitcoin EUR (BTC-EUR)",
    "ticker": "Bitcoin EUR (BTC-EUR)",
    "category": "Stocks",
    "currency": "EUR",
    "quotes": null,
    "price": null,
    "valueOverride": 1150.98
  },
  {
    "date": "2025-01-01",
    "name": "SWDA SW",
    "ticker": "SWDA SW",
    "category": "Stocks",
    "currency": "EUR",
    "quotes": null,
    "price": null,
    "valueOverride": 952.06
  },
  {
    "date": "2025-02-01",
    "name": "SWDA SW",
    "ticker": "SWDA SW",
    "category": "Stocks",
    "currency": "EUR",
    "quotes": null,
    "price": null,
    "valueOverride": 1004.78
  },
  {
    "date": "2025-03-01",
    "name": "SWDA SW",
    "ticker": "SWDA SW",
    "category": "Stocks",
    "currency": "EUR",
    "quotes": null,
    "price": null,
    "valueOverride": 963.48
  },
  {
    "date": "2025-04-01",
    "name": "SWDA SW",
    "ticker": "SWDA SW",
    "category": "Stocks",
    "currency": "EUR",
    "quotes": null,
    "price": null,
    "valueOverride": 941.65
  },
  {
    "date": "2025-05-01",
    "name": "SWDA SW",
    "ticker": "SWDA SW",
    "category": "Stocks",
    "currency": "EUR",
    "quotes": null,
    "price": null,
    "valueOverride": 2050.16
  },
  {
    "date": "2025-06-01",
    "name": "SWDA SW",
    "ticker": "SWDA SW",
    "category": "Stocks",
    "currency": "EUR",
    "quotes": null,
    "price": null,
    "valueOverride": 2217.19
  },
  {
    "date": "2025-07-01",
    "name": "SWDA SW",
    "ticker": "SWDA SW",
    "category": "Stocks",
    "currency": "EUR",
    "quotes": null,
    "price": null,
    "valueOverride": 2463.81
  },
  {
    "date": "2025-08-01",
    "name": "SWDA SW",
    "ticker": "SWDA SW",
    "category": "Stocks",
    "currency": "EUR",
    "quotes": null,
    "price": null,
    "valueOverride": 1991.3
  },
  {
    "date": "2025-09-01",
    "name": "SWDA SW",
    "ticker": "SWDA SW",
    "category": "Stocks",
    "currency": "EUR",
    "quotes": null,
    "price": null,
    "valueOverride": 2299.18
  },
  {
    "date": "2025-10-01",
    "name": "SWDA SW",
    "ticker": "SWDA SW",
    "category": "Stocks",
    "currency": "EUR",
    "quotes": null,
    "price": null,
    "valueOverride": 2395.53
  },
  {
    "date": "2025-11-01",
    "name": "SWDA SW",
    "ticker": "SWDA SW",
    "category": "Stocks",
    "currency": "EUR",
    "quotes": null,
    "price": null,
    "valueOverride": 3080.87
  },
  {
    "date": "2025-12-01",
    "name": "SWDA SW",
    "ticker": "SWDA SW",
    "category": "Stocks",
    "currency": "EUR",
    "quotes": null,
    "price": null,
    "valueOverride": 3118.23
  },
  {
    "date": "2025-01-01",
    "name": "CSSPX SW",
    "ticker": "CSSPX SW",
    "category": "Stocks",
    "currency": "EUR",
    "quotes": null,
    "price": null,
    "valueOverride": 682.49
  },
  {
    "date": "2025-02-01",
    "name": "CSSPX SW",
    "ticker": "CSSPX SW",
    "category": "Stocks",
    "currency": "EUR",
    "quotes": null,
    "price": null,
    "valueOverride": 689.86
  },
  {
    "date": "2025-03-01",
    "name": "CSSPX SW",
    "ticker": "CSSPX SW",
    "category": "Stocks",
    "currency": "EUR",
    "quotes": null,
    "price": null,
    "valueOverride": 656.41
  },
  {
    "date": "2025-04-01",
    "name": "CSSPX SW",
    "ticker": "CSSPX SW",
    "category": "Stocks",
    "currency": "EUR",
    "quotes": null,
    "price": null,
    "valueOverride": 633.97
  },
  {
    "date": "2025-05-01",
    "name": "CSSPX SW",
    "ticker": "CSSPX SW",
    "category": "Stocks",
    "currency": "EUR",
    "quotes": null,
    "price": null,
    "valueOverride": 0.0
  },
  {
    "date": "2025-06-01",
    "name": "CSSPX SW",
    "ticker": "CSSPX SW",
    "category": "Stocks",
    "currency": "EUR",
    "quotes": null,
    "price": null,
    "valueOverride": 0.0
  },
  {
    "date": "2025-07-01",
    "name": "CSSPX SW",
    "ticker": "CSSPX SW",
    "category": "Stocks",
    "currency": "EUR",
    "quotes": null,
    "price": null,
    "valueOverride": 0.0
  },
  {
    "date": "2025-08-01",
    "name": "CSSPX SW",
    "ticker": "CSSPX SW",
    "category": "Stocks",
    "currency": "EUR",
    "quotes": null,
    "price": null,
    "valueOverride": 0.0
  },
  {
    "date": "2025-09-01",
    "name": "CSSPX SW",
    "ticker": "CSSPX SW",
    "category": "Stocks",
    "currency": "EUR",
    "quotes": null,
    "price": null,
    "valueOverride": 0.0
  },
  {
    "date": "2025-10-01",
    "name": "CSSPX SW",
    "ticker": "CSSPX SW",
    "category": "Stocks",
    "currency": "EUR",
    "quotes": null,
    "price": null,
    "valueOverride": 0.0
  },
  {
    "date": "2025-11-01",
    "name": "CSSPX SW",
    "ticker": "CSSPX SW",
    "category": "Stocks",
    "currency": "EUR",
    "quotes": null,
    "price": null,
    "valueOverride": 0.0
  },
  {
    "date": "2025-12-01",
    "name": "CSSPX SW",
    "ticker": "CSSPX SW",
    "category": "Stocks",
    "currency": "EUR",
    "quotes": null,
    "price": null,
    "valueOverride": 0.0
  },
  {
    "date": "2025-01-01",
    "name": "EIMI SW",
    "ticker": "EIMI SW",
    "category": "Stocks",
    "currency": "EUR",
    "quotes": null,
    "price": null,
    "valueOverride": 386.49
  },
  {
    "date": "2025-02-01",
    "name": "EIMI SW",
    "ticker": "EIMI SW",
    "category": "Stocks",
    "currency": "EUR",
    "quotes": null,
    "price": null,
    "valueOverride": 428.08
  },
  {
    "date": "2025-03-01",
    "name": "EIMI SW",
    "ticker": "EIMI SW",
    "category": "Stocks",
    "currency": "EUR",
    "quotes": null,
    "price": null,
    "valueOverride": 428.7
  },
  {
    "date": "2025-04-01",
    "name": "EIMI SW",
    "ticker": "EIMI SW",
    "category": "Stocks",
    "currency": "EUR",
    "quotes": null,
    "price": null,
    "valueOverride": 423.36
  },
  {
    "date": "2025-05-01",
    "name": "EIMI SW",
    "ticker": "EIMI SW",
    "category": "Stocks",
    "currency": "EUR",
    "quotes": null,
    "price": null,
    "valueOverride": 594.32
  },
  {
    "date": "2025-06-01",
    "name": "EIMI SW",
    "ticker": "EIMI SW",
    "category": "Stocks",
    "currency": "EUR",
    "quotes": null,
    "price": null,
    "valueOverride": 690.72
  },
  {
    "date": "2025-07-01",
    "name": "EIMI SW",
    "ticker": "EIMI SW",
    "category": "Stocks",
    "currency": "EUR",
    "quotes": null,
    "price": null,
    "valueOverride": 762.63
  },
  {
    "date": "2025-08-01",
    "name": "EIMI SW",
    "ticker": "EIMI SW",
    "category": "Stocks",
    "currency": "EUR",
    "quotes": null,
    "price": null,
    "valueOverride": 810.24
  },
  {
    "date": "2025-09-01",
    "name": "EIMI SW",
    "ticker": "EIMI SW",
    "category": "Stocks",
    "currency": "EUR",
    "quotes": null,
    "price": null,
    "valueOverride": 592.73
  },
  {
    "date": "2025-10-01",
    "name": "EIMI SW",
    "ticker": "EIMI SW",
    "category": "Stocks",
    "currency": "EUR",
    "quotes": null,
    "price": null,
    "valueOverride": 630.7
  },
  {
    "date": "2025-11-01",
    "name": "EIMI SW",
    "ticker": "EIMI SW",
    "category": "Stocks",
    "currency": "EUR",
    "quotes": null,
    "price": null,
    "valueOverride": 847.49
  },
  {
    "date": "2025-12-01",
    "name": "EIMI SW",
    "ticker": "EIMI SW",
    "category": "Stocks",
    "currency": "EUR",
    "quotes": null,
    "price": null,
    "valueOverride": 881.9
  },
  {
    "date": "2025-01-01",
    "name": "BTC",
    "ticker": "BTC",
    "category": "Stocks",
    "currency": "EUR",
    "quotes": null,
    "price": null,
    "valueOverride": 945.61
  },
  {
    "date": "2025-02-01",
    "name": "BTC",
    "ticker": "BTC",
    "category": "Stocks",
    "currency": "EUR",
    "quotes": null,
    "price": null,
    "valueOverride": 815.23
  },
  {
    "date": "2025-03-01",
    "name": "BTC",
    "ticker": "BTC",
    "category": "Stocks",
    "currency": "EUR",
    "quotes": null,
    "price": null,
    "valueOverride": 771.55
  },
  {
    "date": "2025-04-01",
    "name": "BTC",
    "ticker": "BTC",
    "category": "Stocks",
    "currency": "EUR",
    "quotes": null,
    "price": null,
    "valueOverride": 841.0
  },
  {
    "date": "2025-05-01",
    "name": "BTC",
    "ticker": "BTC",
    "category": "Stocks",
    "currency": "EUR",
    "quotes": null,
    "price": null,
    "valueOverride": 295.45
  },
  {
    "date": "2025-06-01",
    "name": "BTC",
    "ticker": "BTC",
    "category": "Stocks",
    "currency": "EUR",
    "quotes": null,
    "price": null,
    "valueOverride": 299.98
  },
  {
    "date": "2025-07-01",
    "name": "BTC",
    "ticker": "BTC",
    "category": "Stocks",
    "currency": "EUR",
    "quotes": null,
    "price": null,
    "valueOverride": 317.71
  },
  {
    "date": "2025-08-01",
    "name": "BTC",
    "ticker": "BTC",
    "category": "Stocks",
    "currency": "EUR",
    "quotes": null,
    "price": null,
    "valueOverride": 0.0
  },
  {
    "date": "2025-09-01",
    "name": "BTC",
    "ticker": "BTC",
    "category": "Stocks",
    "currency": "EUR",
    "quotes": null,
    "price": null,
    "valueOverride": 0.0
  },
  {
    "date": "2025-10-01",
    "name": "BTC",
    "ticker": "BTC",
    "category": "Stocks",
    "currency": "EUR",
    "quotes": null,
    "price": null,
    "valueOverride": 63.53
  },
  {
    "date": "2025-11-01",
    "name": "BTC",
    "ticker": "BTC",
    "category": "Stocks",
    "currency": "EUR",
    "quotes": null,
    "price": null,
    "valueOverride": 0.0
  },
  {
    "date": "2025-12-01",
    "name": "BTC",
    "ticker": "BTC",
    "category": "Stocks",
    "currency": "EUR",
    "quotes": null,
    "price": null,
    "valueOverride": 0.0
  },
  {
    "date": "2026-01-01",
    "name": "SWDA SW",
    "ticker": "SWDA SW",
    "category": "Stocks",
    "currency": "EUR",
    "quotes": null,
    "price": null,
    "valueOverride": 3269.09
  },
  {
    "date": "2026-02-01",
    "name": "SWDA SW",
    "ticker": "SWDA SW",
    "category": "Stocks",
    "currency": "EUR",
    "quotes": null,
    "price": null,
    "valueOverride": 3762.01
  },
  {
    "date": "2026-03-01",
    "name": "SWDA SW",
    "ticker": "SWDA SW",
    "category": "Stocks",
    "currency": "EUR",
    "quotes": null,
    "price": null,
    "valueOverride": 0.0
  },
  {
    "date": "2026-04-01",
    "name": "SWDA SW",
    "ticker": "SWDA SW",
    "category": "Stocks",
    "currency": "EUR",
    "quotes": null,
    "price": null,
    "valueOverride": 0.0
  },
  {
    "date": "2026-05-01",
    "name": "SWDA SW",
    "ticker": "SWDA SW",
    "category": "Stocks",
    "currency": "EUR",
    "quotes": null,
    "price": null,
    "valueOverride": 0.0
  },
  {
    "date": "2026-06-01",
    "name": "SWDA SW",
    "ticker": "SWDA SW",
    "category": "Stocks",
    "currency": "EUR",
    "quotes": null,
    "price": null,
    "valueOverride": 0.0
  },
  {
    "date": "2026-07-01",
    "name": "SWDA SW",
    "ticker": "SWDA SW",
    "category": "Stocks",
    "currency": "EUR",
    "quotes": null,
    "price": null,
    "valueOverride": 0.0
  },
  {
    "date": "2026-08-01",
    "name": "SWDA SW",
    "ticker": "SWDA SW",
    "category": "Stocks",
    "currency": "EUR",
    "quotes": null,
    "price": null,
    "valueOverride": 0.0
  },
  {
    "date": "2026-09-01",
    "name": "SWDA SW",
    "ticker": "SWDA SW",
    "category": "Stocks",
    "currency": "EUR",
    "quotes": null,
    "price": null,
    "valueOverride": 0.0
  },
  {
    "date": "2026-10-01",
    "name": "SWDA SW",
    "ticker": "SWDA SW",
    "category": "Stocks",
    "currency": "EUR",
    "quotes": null,
    "price": null,
    "valueOverride": 0.0
  },
  {
    "date": "2026-11-01",
    "name": "SWDA SW",
    "ticker": "SWDA SW",
    "category": "Stocks",
    "currency": "EUR",
    "quotes": null,
    "price": null,
    "valueOverride": 0.0
  },
  {
    "date": "2026-12-01",
    "name": "SWDA SW",
    "ticker": "SWDA SW",
    "category": "Stocks",
    "currency": "EUR",
    "quotes": null,
    "price": null,
    "valueOverride": 0.0
  },
  {
    "date": "2026-01-01",
    "name": "EIMI SW",
    "ticker": "EIMI SW",
    "category": "Stocks",
    "currency": "EUR",
    "quotes": null,
    "price": null,
    "valueOverride": 906.28
  },
  {
    "date": "2026-02-01",
    "name": "EIMI SW",
    "ticker": "EIMI SW",
    "category": "Stocks",
    "currency": "EUR",
    "quotes": null,
    "price": null,
    "valueOverride": 967.83
  },
  {
    "date": "2026-03-01",
    "name": "EIMI SW",
    "ticker": "EIMI SW",
    "category": "Stocks",
    "currency": "EUR",
    "quotes": null,
    "price": null,
    "valueOverride": 0.0
  },
  {
    "date": "2026-04-01",
    "name": "EIMI SW",
    "ticker": "EIMI SW",
    "category": "Stocks",
    "currency": "EUR",
    "quotes": null,
    "price": null,
    "valueOverride": 0.0
  },
  {
    "date": "2026-05-01",
    "name": "EIMI SW",
    "ticker": "EIMI SW",
    "category": "Stocks",
    "currency": "EUR",
    "quotes": null,
    "price": null,
    "valueOverride": 0.0
  },
  {
    "date": "2026-06-01",
    "name": "EIMI SW",
    "ticker": "EIMI SW",
    "category": "Stocks",
    "currency": "EUR",
    "quotes": null,
    "price": null,
    "valueOverride": 0.0
  },
  {
    "date": "2026-07-01",
    "name": "EIMI SW",
    "ticker": "EIMI SW",
    "category": "Stocks",
    "currency": "EUR",
    "quotes": null,
    "price": null,
    "valueOverride": 0.0
  },
  {
    "date": "2026-08-01",
    "name": "EIMI SW",
    "ticker": "EIMI SW",
    "category": "Stocks",
    "currency": "EUR",
    "quotes": null,
    "price": null,
    "valueOverride": 0.0
  },
  {
    "date": "2026-09-01",
    "name": "EIMI SW",
    "ticker": "EIMI SW",
    "category": "Stocks",
    "currency": "EUR",
    "quotes": null,
    "price": null,
    "valueOverride": 0.0
  },
  {
    "date": "2026-10-01",
    "name": "EIMI SW",
    "ticker": "EIMI SW",
    "category": "Stocks",
    "currency": "EUR",
    "quotes": null,
    "price": null,
    "valueOverride": 0.0
  },
  {
    "date": "2026-11-01",
    "name": "EIMI SW",
    "ticker": "EIMI SW",
    "category": "Stocks",
    "currency": "EUR",
    "quotes": null,
    "price": null,
    "valueOverride": 0.0
  },
  {
    "date": "2026-12-01",
    "name": "EIMI SW",
    "ticker": "EIMI SW",
    "category": "Stocks",
    "currency": "EUR",
    "quotes": null,
    "price": null,
    "valueOverride": 0.0
  }
];

function loadJson(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}
function saveJson(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function loadPortfolioOverrides() { return loadJson(PORTFOLIO_OVERRIDES_KEY, []); }
function savePortfolioOverrides(items) { saveJson(PORTFOLIO_OVERRIDES_KEY, items); }

function loadAllocationOverrides() { return loadJson(ALLOCATION_OVERRIDES_KEY, []); }
function saveAllocationOverrides(items) { saveJson(ALLOCATION_OVERRIDES_KEY, items); }

function loadPositionHistory() {
  const existing = loadJson(POSITION_HISTORY_KEY, null);
  if (existing === null) {
    saveJson(POSITION_HISTORY_KEY, DEFAULT_POSITION_HISTORY);
    return [...DEFAULT_POSITION_HISTORY];
  }
  return existing;
}
function savePositionHistory(items) { saveJson(POSITION_HISTORY_KEY, items); }

function loadWatchlist() {
  const existing = loadJson(WATCHLIST_KEY, null);
  if (existing === null) {
    saveJson(WATCHLIST_KEY, DEFAULT_WATCHLIST);
    return [...DEFAULT_WATCHLIST];
  }
  return existing;
}
function saveWatchlist(items) { saveJson(WATCHLIST_KEY, items); }

function safeMonthToDate(monthValue) {
  return monthValue ? `${monthValue}-01` : '';
}

function monthInputFromDate(dateStr) {
  return dateStr ? dateStr.slice(0, 7) : '';
}

function getMergedPortfolioHistory() {
  const byDate = new Map();
  data.portfolioHistory.forEach(item => byDate.set(item.date, { ...item }));
  loadPortfolioOverrides().forEach(item => {
    if (!item.date) return;
    byDate.set(item.date, {
      date: item.date,
      netWorth: Number(item.netWorth || 0),
      cashFlow: Number(item.cashFlow || 0),
      return: 0,
      cumReturn: 0,
      runningMax: 0,
      drawdown: 0,
      year: new Date(item.date).getFullYear(),
      month: new Date(item.date).getMonth() + 1
    });
  });

  const merged = Array.from(byDate.values()).sort((a, b) => a.date.localeCompare(b.date));
  let runningMax = 0;
  let cumFactor = 1;

  merged.forEach((item, idx) => {
    const currentNW = Number(item.netWorth || 0);
    if (idx === 0) {
      item.return = Number(item.return || 0);
      cumFactor = 1 + item.return;
    } else {
      const prevNW = Number(merged[idx - 1].netWorth || 0);
      item.return = prevNW ? ((currentNW - prevNW) / prevNW) : 0;
      cumFactor *= (1 + item.return);
    }
    item.cumReturn = cumFactor - 1;
    runningMax = Math.max(runningMax, currentNW);
    item.runningMax = runningMax;
    item.drawdown = runningMax ? ((currentNW - runningMax) / runningMax) : 0;
  });

  return merged;
}

function getLatestPositionRows() {
  const items = loadPositionHistory();
  if (!items.length) return [];
  const latestDate = items.map(x => x.date).sort().slice(-1)[0];
  const latest = items.filter(x => x.date === latestDate).map(x => {
    const hasManualValue = x.valueOverride !== undefined && x.valueOverride !== null && x.valueOverride !== '';
    const quotes = (x.quotes === null || x.quotes === undefined || x.quotes === '') ? null : Number(x.quotes);
    const price = (x.price === null || x.price === undefined || x.price === '') ? null : Number(x.price);
    const value = hasManualValue ? Number(x.valueOverride) : Number(quotes || 0) * Number(price || 0);

    return {
      ...x,
      quotes,
      price,
      value
    };
  });
  const total = latest.reduce((sum, row) => sum + Number(row.value || 0), 0);
  return latest.map(row => ({
    ...row,
    weight: total ? row.value / total : 0
  }));
}

function getCurrentAllocationMacro() {
  const baseRows = data.allocationMacro.map(row => ({ ...row }));
  const positionRows = getLatestPositionRows();
  const stockTotal = positionRows
    .filter(x => (x.category || '').toLowerCase() === 'stocks')
    .reduce((sum, x) => sum + x.value, 0);

  const overrides = loadAllocationOverrides().sort((a, b) => b.date.localeCompare(a.date));
  let values = {
    stocks: stockTotal || Number(baseRows.find(x => x.asset === 'Stocks')?.current || 0),
    commodities: Number(baseRows.find(x => x.asset === 'Commodities')?.current || 0),
    cash: Number(baseRows.find(x => x.asset === 'Cash')?.current || 0)
  };

  if (overrides.length) {
    const latest = overrides[0];
    values = {
      stocks: stockTotal || Number(latest.stocks || 0),
      commodities: Number(latest.commodities || 0),
      cash: Number(latest.cash || 0)
    };
  }

  return baseRows.map(row => {
    const key = row.asset.toLowerCase();
    const current = key in values ? values[key] : Number(row.current || 0);
    return {
      ...row,
      current,
      delta: current - Number(row.targetEur || 0)
    };
  });
}

const _renderDashboard = renderDashboard;
renderDashboard = function() {
  const originalHistory = data.portfolioHistory;
  const originalAlloc = data.allocationMacro;
  data.portfolioHistory = getMergedPortfolioHistory();
  data.allocationMacro = getCurrentAllocationMacro();
  try { _renderDashboard(); } finally {
    data.portfolioHistory = originalHistory;
    data.allocationMacro = originalAlloc;
  }
};

const _renderPortfolio = renderPortfolio;
renderPortfolio = function() {
  const originalHistory = data.portfolioHistory;
  data.portfolioHistory = getMergedPortfolioHistory();
  try { _renderPortfolio(); } finally {
    data.portfolioHistory = originalHistory;
  }
};

const _renderAllocation = renderAllocation;
renderAllocation = function() {
  const originalAlloc = data.allocationMacro;
  data.allocationMacro = getCurrentAllocationMacro();
  try { _renderAllocation(); } finally {
    data.allocationMacro = originalAlloc;
  }
};

function renderPositions() {
  const rows = getLatestPositionRows();
  const totalValue = rows.reduce((sum, row) => sum + row.value, 0);
  const totalQuotes = rows.reduce((sum, row) => sum + row.quotes, 0);
  const stockTotal = rows.filter(x => x.category === 'Stocks').reduce((sum, row) => sum + row.value, 0);
  const latestDate = rows[0]?.date || '-';

  document.getElementById('positions').innerHTML = `
    <div class="cards">
      <article class="card"><h3>Ultimo mese posizioni</h3><p class="metric">${latestDate}</p></article>
      <article class="card"><h3>Valore totale posizioni</h3><p class="metric">${euro(totalValue)}</p></article>
      <article class="card"><h3>Quote totali</h3><p class="metric">${num(totalQuotes)}</p></article>
      <article class="card"><h3>Totale Stocks</h3><p class="metric">${euro(stockTotal)}</p></article>
    </div>
    <article class="panel">
      <h3>Posizioni correnti</h3>
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Strumento</th><th>Ticker</th><th>Categoria</th><th>Quote</th><th>Prezzo</th><th>Valore</th><th>Peso %</th><th>Valuta</th>
            </tr>
          </thead>
          <tbody>
            ${rows.length ? rows.map(row => `
              <tr>
                <td>${row.name}</td>
                <td>${row.ticker || '-'}</td>
                <td>${row.category || '-'}</td>
                <td>${row.quotes === null || row.quotes === undefined ? '-' : num(row.quotes)}</td>
                <td>${row.price === null || row.price === undefined ? '-' : euro(row.price)}</td>
                <td>${euro(row.value)}</td>
                <td>${pct(row.weight)}</td>
                <td>${row.currency || 'EUR'}</td>
              </tr>
            `).join('') : '<tr><td colspan="8" class="empty-state">Nessuna posizione ancora inserita.</td></tr>'}
          </tbody>
        </table>
      </div>
    </article>
  `;
}

function renderWatchlist() {
  const items = loadWatchlist();
  document.getElementById('watchlist').innerHTML = `
    <article class="panel">
      <h3>Strumenti preferiti</h3>
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Nome</th><th>Ticker</th><th>Prezzo</th><th>YTD</th><th>Last M</th><th>Note</th><th>Azioni</th>
            </tr>
          </thead>
          <tbody>
            ${items.length ? items.map((item, idx) => `
              <tr>
                <td>${item.name}</td>
                <td>${item.ticker || '-'}</td>
                <td>${num(item.price)}</td>
                <td class="${Number(item.ytd || 0) >= 0 ? 'delta-pos' : 'delta-neg'}">${item.ytd === null || item.ytd === '' ? '-' : pct(item.ytd)}</td>
                <td class="${Number(item.lastMonth || 0) >= 0 ? 'delta-pos' : 'delta-neg'}">${item.lastMonth === null || item.lastMonth === '' ? '-' : pct(item.lastMonth)}</td>
                <td>${item.note || '-'}</td>
                <td><button class="secondary" data-delete-watch="${idx}">Elimina</button></td>
              </tr>
            `).join('') : '<tr><td colspan="7" class="empty-state">Nessuno strumento in watchlist.</td></tr>'}
          </tbody>
        </table>
      </div>
    </article>
  `;

  document.querySelectorAll('[data-delete-watch]').forEach(btn => {
    btn.addEventListener('click', () => {
      const items = loadWatchlist();
      items.splice(Number(btn.dataset.deleteWatch), 1);
      saveWatchlist(items);
      rerenderAll();
      setView('watchlist');
    });
  });
}

function renderUpdates() {
  const portfolioOverrides = loadPortfolioOverrides().sort((a, b) => b.date.localeCompare(a.date));
  const allocationOverrides = loadAllocationOverrides().sort((a, b) => b.date.localeCompare(a.date));
  const positionHistory = loadPositionHistory().sort((a, b) => b.date.localeCompare(a.date));
  const watchlist = loadWatchlist();

  const latestPortfolio = portfolioOverrides[0];
  const latestAllocation = allocationOverrides[0];
  const latestPositionDate = positionHistory[0]?.date || '';
  const latestMonthPositions = latestPositionDate ? positionHistory.filter(x => x.date === latestPositionDate) : [];
  const totalLatestPositions = latestMonthPositions.reduce((sum, x) => {
    const hasManualValue = x.valueOverride !== undefined && x.valueOverride !== null && x.valueOverride !== '';
    const value = hasManualValue ? Number(x.valueOverride) : Number(x.quotes || 0) * Number(x.price || 0);
    return sum + value;
  }, 0);

  document.getElementById('updates').innerHTML = `
    <div class="notice">
      Aggiorna qui il mese corrente. Le posizioni ETF determinano automaticamente il totale Stocks nella Asset Allocation.
    </div>

    <div class="stack">
      <article class="form-card">
        <h3>Portfolio Engine</h3>
        <div class="helper">Inserisci il Net Worth totale e il Cash Flow del mese.</div>
        <form id="portfolioUpdateForm" class="form-grid">
          <label>
            Mese
            <input type="month" id="updMonth" required />
          </label>
          <label>
            Net Worth totale (€)
            <input type="number" id="updNetWorth" step="0.01" min="0" required />
          </label>
          <label>
            Cash Flow del mese (€)
            <input type="number" id="updCashFlow" step="0.01" required />
          </label>
          <div></div>
          <div class="full form-actions">
            <button type="submit">Salva portfolio</button>
          </div>
        </form>
        ${latestPortfolio ? `<p class="success-msg">Ultimo portfolio: ${latestPortfolio.date} · ${euro(latestPortfolio.netWorth)}</p>` : ''}
      </article>

      <article class="form-card">
        <h3>Posizioni ETF / Azioni</h3>
        <div class="helper">I dati storici del file sono già importati. Per i nuovi mesi puoi inserire quote e prezzo; per quelli importati il valore arriva direttamente dallo spreadsheet.</div>
        <form id="positionUpdateForm" class="form-grid">
          <label>
            Mese
            <input type="month" id="posMonth" required value="${monthInputFromDate(latestPositionDate)}" />
          </label>
          <label>
            Strumento
            <input type="text" id="posName" placeholder="Es. SWDA" required />
          </label>
          <label>
            Ticker
            <input type="text" id="posTicker" placeholder="Es. SWDA SW" />
          </label>
          <label>
            Categoria
            <select id="posCategory">
              <option value="Stocks">Stocks</option>
              <option value="Commodities">Commodities</option>
              <option value="Cash">Cash</option>
              <option value="Other">Other</option>
            </select>
          </label>
          <label>
            Quote
            <input type="number" id="posQuotes" step="0.0001" min="0" required />
          </label>
          <label>
            Prezzo (€)
            <input type="number" id="posPrice" step="0.0001" min="0" required />
          </label>
          <label>
            Valuta
            <input type="text" id="posCurrency" value="EUR" />
          </label>
          <div></div>
          <div class="full form-actions">
            <button type="submit">Salva posizione</button>
          </div>
        </form>
        <p class="success-msg">Ultimo mese posizioni: ${latestPositionDate || '-'} · Totale ${euro(totalLatestPositions)}</p>
      </article>

      <article class="form-card">
        <h3>Cash e Commodities</h3>
        <div class="helper">Inserisci cash e commodities del mese. Stocks viene preso automaticamente dalle posizioni.</div>
        <form id="allocationUpdateForm" class="form-grid">
          <label>
            Mese
            <input type="month" id="allocMonth" required />
          </label>
          <label>
            Commodities (€)
            <input type="number" id="allocCommodities" step="0.01" min="0" required />
          </label>
          <label>
            Cash (€)
            <input type="number" id="allocCash" step="0.01" min="0" required />
          </label>
          <div></div>
          <div class="full form-actions">
            <button type="submit">Salva cash/commodities</button>
          </div>
        </form>
        ${latestAllocation ? `<p class="success-msg">Ultimo cash/commodities: ${latestAllocation.date}</p>` : ''}
      </article>

      <article class="form-card">
        <h3>Watchlist / Strumenti preferiti</h3>
        <div class="helper">Aggiungi o aggiorna manualmente i tuoi strumenti monitorati.</div>
        <form id="watchlistForm" class="form-grid">
          <label>
            Nome
            <input type="text" id="watchName" placeholder="Es. Gold" required />
          </label>
          <label>
            Ticker
            <input type="text" id="watchTicker" placeholder="Es. Gold (ounce)" />
          </label>
          <label>
            Prezzo
            <input type="number" id="watchPrice" step="0.0001" min="0" required />
          </label>
          <label>
            YTD %
            <input type="number" id="watchYtd" step="0.0001" placeholder="0.1776 = 17.76%" />
          </label>
          <label>
            Last Month %
            <input type="number" id="watchLastMonth" step="0.0001" placeholder="0.0406 = 4.06%" />
          </label>
          <label class="full">
            Note
            <input type="text" id="watchNote" placeholder="Nota facoltativa" />
          </label>
          <div class="full form-actions">
            <button type="submit">Salva strumento watchlist</button>
          </div>
        </form>
        <p class="success-msg">Strumenti in watchlist: ${watchlist.length}</p>
      </article>

      <article class="panel">
        <h3>Posizioni dell’ultimo mese</h3>
        <div class="table-wrap">
          <table>
            <thead>
              <tr><th>Data</th><th>Strumento</th><th>Ticker</th><th>Categoria</th><th>Quote</th><th>Prezzo</th><th>Valore</th><th>Azioni</th></tr>
            </thead>
            <tbody>
              ${latestMonthPositions.length ? latestMonthPositions.map((item, idx) => `
                <tr>
                  <td>${item.date}</td>
                  <td>${item.name}</td>
                  <td>${item.ticker || '-'}</td>
                  <td>${item.category || '-'}</td>
                  <td>${item.quotes === null || item.quotes === undefined ? '-' : num(item.quotes)}</td>
                  <td>${item.price === null || item.price === undefined ? '-' : euro(item.price)}</td>
                  <td>${euro((item.valueOverride !== undefined && item.valueOverride !== null && item.valueOverride !== '') ? Number(item.valueOverride) : Number(item.quotes || 0) * Number(item.price || 0))}</td>
                  <td><button class="secondary" data-delete-position="${item.date}__${item.name}__${idx}">Elimina</button></td>
                </tr>
              `).join('') : '<tr><td colspan="8" class="empty-state">Nessuna posizione nell’ultimo mese.</td></tr>'}
            </tbody>
          </table>
        </div>
      </article>
    </div>
  `;

  document.getElementById('portfolioUpdateForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const date = safeMonthToDate(document.getElementById('updMonth').value);
    const item = {
      date,
      netWorth: Number(document.getElementById('updNetWorth').value),
      cashFlow: Number(document.getElementById('updCashFlow').value)
    };
    const items = loadPortfolioOverrides().filter(x => x.date !== date);
    items.push(item);
    savePortfolioOverrides(items);
    rerenderAll();
    setView('updates');
  });

  document.getElementById('positionUpdateForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const date = safeMonthToDate(document.getElementById('posMonth').value);
    const item = {
      date,
      name: document.getElementById('posName').value.trim(),
      ticker: document.getElementById('posTicker').value.trim(),
      category: document.getElementById('posCategory').value,
      quotes: Number(document.getElementById('posQuotes').value),
      price: Number(document.getElementById('posPrice').value),
      currency: document.getElementById('posCurrency').value.trim() || 'EUR'
    };
    const items = loadPositionHistory().filter(x => !(x.date === item.date && x.name.toLowerCase() === item.name.toLowerCase()));
    items.push(item);
    savePositionHistory(items);
    rerenderAll();
    setView('updates');
  });

  document.getElementById('allocationUpdateForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const date = safeMonthToDate(document.getElementById('allocMonth').value);
    const latestStocks = getLatestPositionRows()
      .filter(x => x.category === 'Stocks')
      .reduce((sum, x) => sum + x.value, 0);

    const item = {
      date,
      stocks: latestStocks,
      commodities: Number(document.getElementById('allocCommodities').value),
      cash: Number(document.getElementById('allocCash').value)
    };
    const items = loadAllocationOverrides().filter(x => x.date !== date);
    items.push(item);
    saveAllocationOverrides(items);
    rerenderAll();
    setView('updates');
  });

  document.getElementById('watchlistForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const item = {
      name: document.getElementById('watchName').value.trim(),
      ticker: document.getElementById('watchTicker').value.trim(),
      price: Number(document.getElementById('watchPrice').value),
      ytd: document.getElementById('watchYtd').value === '' ? null : Number(document.getElementById('watchYtd').value),
      lastMonth: document.getElementById('watchLastMonth').value === '' ? null : Number(document.getElementById('watchLastMonth').value),
      note: document.getElementById('watchNote').value.trim()
    };
    const items = loadWatchlist().filter(x => x.name.toLowerCase() !== item.name.toLowerCase());
    items.push(item);
    saveWatchlist(items);
    rerenderAll();
    setView('updates');
  });

  document.querySelectorAll('[data-delete-position]').forEach(btn => {
    btn.addEventListener('click', () => {
      const [date, name] = btn.dataset.deletePosition.split('__');
      const items = loadPositionHistory().filter(x => !(x.date === date && x.name === name));
      savePositionHistory(items);
      rerenderAll();
      setView('updates');
    });
  });
}

function rerenderAll() {
  renderDashboard();
  renderPortfolio();
  renderAllocation();
  renderAnnual();
  renderPositions();
  renderWatchlist();
  renderSterline();
  renderFinance();
  renderUpdates();
}

// rerender with enhanced views
rerenderAll();
