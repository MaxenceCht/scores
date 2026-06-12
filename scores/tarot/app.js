/* ============================================
   Tarot — logique de comptage (barème FFT)
   3, 4 ou 5 joueurs · poignées · petit au bout · chelem
   ============================================ */

// ---------- État ----------
let playerCount = 4;
let playerNames = ['Joueur 1', 'Joueur 2', 'Joueur 3', 'Joueur 4', 'Joueur 5'];
let totals = [0, 0, 0, 0, 0];
let donnes = [];

let preneur = null;      // index joueur
let partner = null;      // index joueur (5j) ; peut être = preneur (appel à soi-même)
let contractMult = null; // 1 | 2 | 4 | 6
let bouts = null;        // 0..3
let pab = null;          // null | 'att' | 'def'
let poigneeAtt = 0;      // 0 | 20 | 30 | 40
let poigneeDef = 0;
let chelem = 0;          // 0 | 200 | 400 | -200

const STORAGE_KEY = 'tarot-state-v1';
const NEEDED = [56, 51, 41, 36]; // points requis selon le nombre de bouts

// ---------- Persistance ----------
function saveState() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      playerCount, playerNames, totals, donnes
    }));
  } catch (e) { /* sans persistance */ }
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const s = JSON.parse(raw);
    playerCount = s.playerCount || 4;
    playerNames = s.playerNames || playerNames;
    totals = s.totals || [0, 0, 0, 0, 0];
    donnes = s.donnes || [];
  } catch (e) { /* état corrompu */ }
}

// ---------- Cœur du calcul ----------
// Retourne null si saisie incomplète, sinon { deltas: [par joueur], detail, success }
function computeDonne() {
  if (preneur === null || contractMult === null || bouts === null) return null;
  if (playerCount === 5 && partner === null) return null;
  const pts = parseFloat(document.getElementById('pts-main').value);
  if (isNaN(pts) || pts < 0 || pts > 91) return null;

  const needed = NEEDED[bouts];
  const diff = pts - needed;
  const success = diff >= 0;

  // Score de base de la donne (toujours positif), signé ensuite
  let score = (25 + Math.ceil(Math.abs(diff))) * contractMult;
  let signed = success ? score : -score;

  // Petit au bout : ±10 × multiplicateur, algébrique
  if (pab === 'att') signed += 10 * contractMult;
  if (pab === 'def') signed -= 10 * contractMult;

  // Poignées : le montant va au camp vainqueur de la donne, quelle que soit l'équipe qui l'a montrée
  const poignees = poigneeAtt + poigneeDef;
  signed += success ? poignees : -poignees;

  // Chelem : algébrique côté attaque
  signed += chelem;

  // Répartition
  const deltas = new Array(playerCount).fill(0);
  if (playerCount === 3) {
    deltas[preneur] = 2 * signed;
    for (let i = 0; i < 3; i++) if (i !== preneur) deltas[i] = -signed;
  } else if (playerCount === 4) {
    deltas[preneur] = 3 * signed;
    for (let i = 0; i < 4; i++) if (i !== preneur) deltas[i] = -signed;
  } else {
    if (partner === preneur) {
      // Appel à soi-même : seul contre 4
      deltas[preneur] = 4 * signed;
      for (let i = 0; i < 5; i++) if (i !== preneur) deltas[i] = -signed;
    } else {
      deltas[preneur] = 2 * signed;
      deltas[partner] = signed;
      for (let i = 0; i < 5; i++) if (i !== preneur && i !== partner) deltas[i] = -signed;
    }
  }

  const ctNames = { 1: 'Petite', 2: 'Garde', 4: 'Garde sans', 6: 'Garde contre' };
  let detail = playerNames[preneur] + ' — ' + ctNames[contractMult] + ', ' + bouts + ' bout(s), ' + pts + ' pts';
  if (playerCount === 5) detail += partner === preneur ? ', seul' : ', avec ' + playerNames[partner];

  return { deltas, detail, success, diff };
}

function calcPreview() {
  const verdict = document.getElementById('verdict');
  const grid = document.getElementById('preview-grid');
  const res = computeDonne();

  grid.className = 'players-grid p' + playerCount;
  grid.innerHTML = '';

  if (!res) {
    verdict.style.display = 'none';
    for (let i = 0; i < playerCount; i++) {
      grid.innerHTML += `<div class="player-card"><div class="player-name">${esc(playerNames[i])}</div><div class="player-pts">—</div></div>`;
    }
    return;
  }

  verdict.style.display = 'block';
  verdict.className = 'verdict ' + (res.success ? 'ok' : 'ko');
  verdict.textContent = res.success
    ? 'Contrat réussi (+' + Math.ceil(Math.abs(res.diff)) + ')'
    : 'Contrat chuté (−' + Math.ceil(Math.abs(res.diff)) + ')';

  res.deltas.forEach((d, i) => {
    const cls = d > 0 ? 'pos' : d < 0 ? 'neg' : '';
    grid.innerHTML += `<div class="player-card"><div class="player-name">${esc(playerNames[i])}</div><div class="player-pts ${cls}">${d > 0 ? '+' : ''}${d}</div></div>`;
  });
}

// ---------- Sélections ----------
function selectPreneur(i) {
  preneur = i;
  renderChipRow('preneur-row', i, 'active-amber');
  calcPreview();
}

function selectPartner(i) {
  partner = i;
  renderChipRow('partner-row', i, 'active-teal');
  calcPreview();
}

function renderChipRow(rowId, activeIdx, activeClass) {
  document.querySelectorAll('#' + rowId + ' .chip').forEach((c, idx) => {
    c.className = 'chip' + (idx === activeIdx ? ' ' + activeClass : '');
  });
}

function selectContract(m) {
  contractMult = m;
  [1, 2, 4, 6].forEach(v => document.getElementById('ct-' + v).className = 'chip' + (v === m ? ' active' : ''));
  calcPreview();
}

function selectBouts(b) {
  bouts = b;
  [0, 1, 2, 3].forEach(v => document.getElementById('bt-' + v).className = 'chip' + (v === b ? ' active' : ''));
  calcPreview();
}

function selectPab(v) {
  pab = v;
  document.getElementById('pab-none').className = 'chip' + (v === null ? ' active' : '');
  document.getElementById('pab-att').className = 'chip' + (v === 'att' ? ' active' : '');
  document.getElementById('pab-def').className = 'chip' + (v === 'def' ? ' active' : '');
  calcPreview();
}

function selectPoignee(camp, v) {
  if (camp === 'att') {
    poigneeAtt = v;
    [0, 20, 30, 40].forEach(x => document.getElementById('pa-' + x).className = 'chip' + (x === v ? ' active' : ''));
  } else {
    poigneeDef = v;
    [0, 20, 30, 40].forEach(x => document.getElementById('pd-' + x).className = 'chip' + (x === v ? ' active' : ''));
  }
  calcPreview();
}

function selectChelem(v) {
  chelem = v;
  document.getElementById('ch-0').className = 'chip' + (v === 0 ? ' active' : '');
  document.getElementById('ch-200').className = 'chip' + (v === 200 ? ' active' : '');
  document.getElementById('ch-400').className = 'chip' + (v === 400 ? ' active' : '');
  document.getElementById('ch-m200').className = 'chip' + (v === -200 ? ' active' : '');
  calcPreview();
}

// ---------- Validation ----------
function addDonne() {
  const err = document.getElementById('err-msg');
  err.textContent = '';
  if (preneur === null) { err.textContent = 'Désigne le preneur.'; return; }
  if (playerCount === 5 && partner === null) { err.textContent = 'Désigne le partenaire (ou le preneur lui-même).'; return; }
  if (contractMult === null) { err.textContent = 'Choisis le contrat.'; return; }
  if (bouts === null) { err.textContent = 'Indique le nombre de bouts.'; return; }
  const res = computeDonne();
  if (!res) { err.textContent = 'Saisis les points du preneur (0–91).'; return; }

  res.deltas.forEach((d, i) => totals[i] += d);
  donnes.push({ deltas: res.deltas.slice(), totals: totals.slice(0, playerCount), detail: res.detail, success: res.success });

  renderScoreboard();
  renderHistory();
  resetForm();
  saveState();
}

// ---------- Configuration joueurs ----------
function setPlayerCount(n) {
  if (donnes.length > 0 && n !== playerCount) {
    if (!confirm('Changer le nombre de joueurs réinitialise la partie en cours. Continuer ?')) return;
    donnes = [];
    totals = [0, 0, 0, 0, 0];
  }
  playerCount = n;
  [3, 4, 5].forEach(v => document.getElementById('np-' + v).className = 'chip' + (v === n ? ' active' : ''));
  renderNameInputs();
  renderPlayerChips();
  renderScoreboard();
  renderHistory();
  resetForm();
  saveState();
}

function renderNameInputs() {
  const block = document.getElementById('names-block');
  block.innerHTML = '';
  for (let i = 0; i < playerCount; i++) {
    block.innerHTML += `
      <div class="config-row">
        <span class="config-label">Joueur ${i + 1}</span>
        <input class="config-input" id="pname-${i}" value="${esc(playerNames[i])}" oninput="onNameChange(${i}, this.value)" />
      </div>`;
  }
}

function onNameChange(i, v) {
  playerNames[i] = v.trim() || ('Joueur ' + (i + 1));
  renderPlayerChips();
  renderScoreboard();
  renderHistory();
  calcPreview();
  saveState();
}

function renderPlayerChips() {
  const pr = document.getElementById('preneur-row');
  const par = document.getElementById('partner-row');
  pr.innerHTML = '';
  par.innerHTML = '';
  for (let i = 0; i < playerCount; i++) {
    const b1 = document.createElement('button');
    b1.className = 'chip' + (preneur === i ? ' active-amber' : '');
    b1.textContent = playerNames[i];
    b1.onclick = () => selectPreneur(i);
    pr.appendChild(b1);

    const b2 = document.createElement('button');
    b2.className = 'chip' + (partner === i ? ' active-teal' : '');
    b2.textContent = playerNames[i];
    b2.onclick = () => selectPartner(i);
    par.appendChild(b2);
  }
  document.getElementById('partner-block').style.display = playerCount === 5 ? 'block' : 'none';
}

// ---------- Rendu ----------
function esc(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function renderScoreboard() {
  const grid = document.getElementById('players-grid');
  grid.className = 'players-grid p' + playerCount;
  grid.innerHTML = '';
  const max = Math.max(...totals.slice(0, playerCount));
  for (let i = 0; i < playerCount; i++) {
    const t = totals[i];
    const leader = donnes.length > 0 && t === max && max > Math.min(...totals.slice(0, playerCount));
    const cls = t > 0 ? 'pos' : t < 0 ? 'neg' : '';
    grid.innerHTML += `
      <div class="player-card${leader ? ' leader' : ''}">
        <div class="player-name">${esc(playerNames[i])}</div>
        <div class="player-pts ${cls}">${t}</div>
      </div>`;
  }
}

function renderHistory() {
  const head = document.getElementById('histo-head');
  head.innerHTML = '<th>Donne</th>' + playerNames.slice(0, playerCount).map(n => '<th>' + esc(n) + '</th>').join('');
  const body = document.getElementById('history-body');
  body.innerHTML = '';
  [...donnes].reverse().forEach((d, ri) => {
    const i = donnes.length - 1 - ri;
    const tr = document.createElement('tr');
    if (!d.success) tr.classList.add('litige-row');
    tr.innerHTML = `<td title="${esc(d.detail)}">D${i + 1} ${d.success ? '' : '✗'}</td>` +
      d.deltas.map(x => `<td class="${x > 0 ? 'hi' : ''}">${x > 0 ? '+' : ''}${x}</td>`).join('');
    body.appendChild(tr);
  });
  document.getElementById('history-section').style.display = donnes.length ? 'block' : 'none';
}

function resetForm() {
  preneur = null;
  partner = null;
  contractMult = null;
  bouts = null;
  pab = null;
  poigneeAtt = 0;
  poigneeDef = 0;
  chelem = 0;
  document.getElementById('pts-main').value = '';
  document.getElementById('verdict').style.display = 'none';
  document.getElementById('err-msg').textContent = '';
  renderPlayerChips();
  [1, 2, 4, 6].forEach(v => document.getElementById('ct-' + v).className = 'chip');
  [0, 1, 2, 3].forEach(v => document.getElementById('bt-' + v).className = 'chip');
  selectPab(null);
  selectPoignee('att', 0);
  selectPoignee('def', 0);
  selectChelem(0);
}

function resetAll() {
  if (!confirm('Réinitialiser toute la partie ?')) return;
  donnes = [];
  totals = [0, 0, 0, 0, 0];
  renderScoreboard();
  renderHistory();
  resetForm();
  saveState();
}

// ---------- Initialisation ----------
loadState();
[3, 4, 5].forEach(v => document.getElementById('np-' + v).className = 'chip' + (v === playerCount ? ' active' : ''));
renderNameInputs();
renderPlayerChips();
renderScoreboard();
renderHistory();
calcPreview();
