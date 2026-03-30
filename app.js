
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
  return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 2 }).format(Number(v || 0));
}
function pct(v) {
  return `${(Number(v || 0) * 100).toFixed(2)}%`;
}
function num(v) {
  if (v === null || v === undefined || v === '') return '-';
  return new Intl.NumberFormat('it-IT', { maximumFractionDigits: 2 }).format(Number(v));
}
function monthLabel(dateStr) {
  const d = new Date(dateStr);
  return d.toLocaleDateString('it-IT', { month: 'short', year: '2-digit' });
}

function setView(name) {
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  document.querySelectorAll('.nav-btn').forEach(v => v.classList.remove('active'));
  document.getElementById(name).classList.add('active');
  document.querySelector(`.nav-btn[data-view="${name}"]`).classList.add('active');
  document.getElementById('viewTitle').textContent = viewMeta[name][0];
  document.getElementById('viewSubtitle').textContent = viewMeta[name][1];
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

function renderDashboard() {
  const latest = data.portfolioHistory[data.portfolioHistory.length - 1];
  const prev = data.portfolioHistory[data.portfolioHistory.length - 2];
  const monthlyDelta = latest.netWorth - prev.netWorth;

  const cards = `
    <div class="cards">
      <article class="card"><h3>Net Worth attuale</h3><p class="metric">${euro(latest.netWorth)}</p><div class="metric-sub">${monthLabel(latest.date)}</div></article>
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
                <td class="${row.delta >= 0 ? 'delta-pos' : 'delta-neg'}">${euro(row.delta)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </article>
    </div>
  `;

  document.getElementById('dashboard').innerHTML = cards + metrics;
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
  document.getElementById('allocation').innerHTML = `
    <div class="grid-2">
      <article class="panel">
        <h3>Macro Allocation</h3>
        <div class="table-wrap">
          <table>
            <thead><tr><th>Asset</th><th>Current</th><th>Target %</th><th>Target EUR</th><th>Delta</th></tr></thead>
            <tbody>
              ${data.allocationMacro.map(row => `
                <tr>
                  <td>${row.asset}</td>
                  <td>${euro(row.current)}</td>
                  <td>${pct(row.targetPct)}</td>
                  <td>${euro(row.targetEur)}</td>
                  <td class="${row.delta >= 0 ? 'delta-pos' : 'delta-neg'}">${euro(row.delta)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </article>
      <article class="panel">
        <h3>Dettaglio Allocation</h3>
        <div class="table-wrap">
          <table>
            <thead><tr><th>Gruppo</th><th>Asset</th><th>Ticker</th><th>Current</th><th>Target %</th><th>Target EUR</th><th>Delta</th></tr></thead>
            <tbody>
              ${data.allocationDetail.map(row => `
                <tr>
                  <td>${row.group}</td>
                  <td>${row.asset}</td>
                  <td>${row.ticker || '-'}</td>
                  <td>${euro(row.current)}</td>
                  <td>${pct(row.targetPct)}</td>
                  <td>${row.targetEur === null ? '-' : euro(row.targetEur)}</td>
                  <td class="${(row.delta || 0) >= 0 ? 'delta-pos' : 'delta-neg'}">${row.delta === null ? '-' : euro(row.delta)}</td>
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
    const summaryRows = Object.entries(summary).map(([key, values]) => `
      <tr>
        <td>${key}</td>
        ${values.map(v => `<td>${typeof v === 'number' ? num(v) : (v || '-')}</td>`).join('')}
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

  function paint(year) {
    const yearData = data.sterlineData[year];
    const cols = ['Start', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    const totals = `
      <article class="panel">
        <h3>Totali ${year}</h3>
        <div class="table-wrap">
          <table>
            <thead><tr><th>Voce</th>${cols.map(c => `<th>${c}</th>`).join('')}</tr></thead>
            <tbody>
              <tr><td>Total Value</td>${yearData.totals.totalValue.map(v => `<td>${typeof v === 'number' ? num(v) : (v || '-')}</td>`).join('')}</tr>
              <tr><td>Value Change</td>${yearData.totals.valueChange.map(v => `<td>${typeof v === 'number' ? num(v) : (v || '-')}</td>`).join('')}</tr>
              <tr><td>Change %</td>${yearData.totals.changePct.map(v => `<td>${typeof v === 'number' ? pct(v) : (v || '-')}</td>`).join('')}</tr>
            </tbody>
          </table>
        </div>
      </article>
    `;

    const table = `
      <article class="panel">
        <h3>Elenco Sterline ${year}</h3>
        <div class="table-wrap">
          <table>
            <thead><tr><th>Nome</th>${cols.map(c => `<th>${c}</th>`).join('')}</tr></thead>
            <tbody>
              ${yearData.items.map(item => `
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

viewMeta.updates = ['Aggiornamenti', 'Inserisci l’aggiornamento mensile senza perdere grafici e dati storici.'];

function loadPortfolioOverrides() {
  try { return JSON.parse(localStorage.getItem(PORTFOLIO_OVERRIDES_KEY) || '[]'); }
  catch { return []; }
}
function savePortfolioOverrides(items) {
  localStorage.setItem(PORTFOLIO_OVERRIDES_KEY, JSON.stringify(items));
}
function loadAllocationOverrides() {
  try { return JSON.parse(localStorage.getItem(ALLOCATION_OVERRIDES_KEY) || '[]'); }
  catch { return []; }
}
function saveAllocationOverrides(items) {
  localStorage.setItem(ALLOCATION_OVERRIDES_KEY, JSON.stringify(items));
}

function safeMonthToDate(monthValue) {
  return monthValue ? `${monthValue}-01` : '';
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

function getCurrentAllocationMacro() {
  const baseRows = data.allocationMacro.map(row => ({ ...row }));
  const overrides = loadAllocationOverrides().sort((a, b) => b.date.localeCompare(a.date));
  if (!overrides.length) return baseRows;

  const latest = overrides[0];
  const values = {
    stocks: Number(latest.stocks || 0),
    commodities: Number(latest.commodities || 0),
    cash: Number(latest.cash || 0)
  };

  return baseRows.map(row => {
    const key = row.asset.toLowerCase();
    const current = key in values ? values[key] : Number(row.current || 0);
    return {
      ...row,
      current,
      delta: Number(row.targetEur || 0) - current
    };
  });
}

const _renderDashboard = renderDashboard;
renderDashboard = function() {
  const originalHistory = data.portfolioHistory;
  const originalAlloc = data.allocationMacro;
  data.portfolioHistory = getMergedPortfolioHistory();
  data.allocationMacro = getCurrentAllocationMacro();
  try {
    _renderDashboard();
  } finally {
    data.portfolioHistory = originalHistory;
    data.allocationMacro = originalAlloc;
  }
};

const _renderPortfolio = renderPortfolio;
renderPortfolio = function() {
  const originalHistory = data.portfolioHistory;
  data.portfolioHistory = getMergedPortfolioHistory();
  try {
    _renderPortfolio();
  } finally {
    data.portfolioHistory = originalHistory;
  }
};

const _renderAllocation = renderAllocation;
renderAllocation = function() {
  const originalAlloc = data.allocationMacro;
  data.allocationMacro = getCurrentAllocationMacro();
  try {
    _renderAllocation();
  } finally {
    data.allocationMacro = originalAlloc;
  }
};

function renderUpdates() {
  const portfolioOverrides = loadPortfolioOverrides().sort((a, b) => b.date.localeCompare(a.date));
  const allocationOverrides = loadAllocationOverrides().sort((a, b) => b.date.localeCompare(a.date));
  const latestPortfolio = portfolioOverrides[0];
  const latestAllocation = allocationOverrides[0];

  document.getElementById('updates').innerHTML = `
    <div class="notice">
      Questa sezione aggiunge valori mensili sopra i dati storici del file originale, senza cancellare grafici, tabelle o colori del sito.
    </div>

    <div class="stack">
      <article class="form-card">
        <h3>Aggiorna Portfolio Engine</h3>
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
            <button type="submit">Salva aggiornamento portfolio</button>
          </div>
        </form>
        ${latestPortfolio ? `<p class="success-msg">Ultimo portfolio salvato: ${latestPortfolio.date} · ${euro(latestPortfolio.netWorth)}</p>` : ''}
      </article>

      <article class="form-card">
        <h3>Aggiorna Asset Allocation</h3>
        <div class="helper">Inserisci i valori attuali di Stocks, Commodities e Cash.</div>
        <form id="allocationUpdateForm" class="form-grid">
          <label>
            Mese
            <input type="month" id="allocMonth" required />
          </label>
          <label>
            Stocks (€)
            <input type="number" id="allocStocks" step="0.01" min="0" required />
          </label>
          <label>
            Commodities (€)
            <input type="number" id="allocCommodities" step="0.01" min="0" required />
          </label>
          <label>
            Cash (€)
            <input type="number" id="allocCash" step="0.01" min="0" required />
          </label>
          <div class="full form-actions">
            <button type="submit">Salva allocation</button>
          </div>
        </form>
        ${latestAllocation ? `<p class="success-msg">Ultima allocation salvata: ${latestAllocation.date}</p>` : ''}
      </article>

      <article class="panel">
        <h3>Storico aggiornamenti portfolio</h3>
        <div class="history-list">
          ${portfolioOverrides.length ? portfolioOverrides.map(item => `
            <div class="history-item">
              <div>
                <strong>${item.date}</strong>
                <div class="small">Net Worth: ${euro(item.netWorth)} · Cash Flow: ${euro(item.cashFlow)}</div>
              </div>
              <button class="secondary" data-delete-portfolio="${item.date}">Elimina</button>
            </div>
          `).join('') : '<div class="small">Nessun aggiornamento inserito dal sito.</div>'}
        </div>
      </article>

      <article class="panel">
        <h3>Storico aggiornamenti allocation</h3>
        <div class="history-list">
          ${allocationOverrides.length ? allocationOverrides.map(item => `
            <div class="history-item">
              <div>
                <strong>${item.date}</strong>
                <div class="small">Stocks: ${euro(item.stocks)} · Commodities: ${euro(item.commodities)} · Cash: ${euro(item.cash)}</div>
              </div>
              <button class="secondary" data-delete-allocation="${item.date}">Elimina</button>
            </div>
          `).join('') : '<div class="small">Nessun aggiornamento allocation inserito dal sito.</div>'}
        </div>
      </article>
    </div>
  `;

  const portfolioForm = document.getElementById('portfolioUpdateForm');
  const allocationForm = document.getElementById('allocationUpdateForm');

  portfolioForm.addEventListener('submit', (e) => {
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

  allocationForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const date = safeMonthToDate(document.getElementById('allocMonth').value);
    const item = {
      date,
      stocks: Number(document.getElementById('allocStocks').value),
      commodities: Number(document.getElementById('allocCommodities').value),
      cash: Number(document.getElementById('allocCash').value)
    };
    const items = loadAllocationOverrides().filter(x => x.date !== date);
    items.push(item);
    saveAllocationOverrides(items);
    rerenderAll();
    setView('updates');
  });

  document.querySelectorAll('[data-delete-portfolio]').forEach(btn => {
    btn.addEventListener('click', () => {
      const items = loadPortfolioOverrides().filter(x => x.date !== btn.dataset.deletePortfolio);
      savePortfolioOverrides(items);
      rerenderAll();
      setView('updates');
    });
  });

  document.querySelectorAll('[data-delete-allocation]').forEach(btn => {
    btn.addEventListener('click', () => {
      const items = loadAllocationOverrides().filter(x => x.date !== btn.dataset.deleteAllocation);
      saveAllocationOverrides(items);
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
  renderSterline();
  renderFinance();
  renderUpdates();
}

rerenderAll();
