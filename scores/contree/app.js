/* ============================================
   Contrée — logique de comptage
   Modes : contrat / contrat + réalisé / réalisé
   ============================================ */

// ---------- État ----------
let rounds = [];
let totalA = 0;
let totalB = 0;
let attacker = null;        // 'a' | 'b'
let contract = null;        // 80..160, 250 (capot), 270 (capot beloté)
let coincheMult = 1;        // 1 | 2 | 4
let beloteTeam = null;      // 'a' | 'b' | null
let whoSaisit = 'a';
let mode = 'contrat';       // 'contrat' | 'mixte' | 'realise'
let targetManuallySet = false;

const STORAGE_KEY = 'contree-state-v1';
const CONTRACTS = [80, 90, 100, 110, 120, 130, 140, 150, 160, 250, 270];
const CONTRACT_LABELS = { 250: 'Capot', 270: 'Capot beloté' };
const CHUTE_DEFENSE = 160;

// ---------- Persistance ----------
function saveState() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      rounds, totalA, totalB, mode, targetManuallySet,
      nameA: document.getElementById('name-a').value,
      nameB: document.getElementById('name-b').value,
      target: document.getElementById('target').value,
      arrondi: document.getElementById('opt-arrondi').checked,
      beloteComptee: document.getElementById('opt-belote').checked
    }));
  } catch (e) { /* sans persistance */ }
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const s = JSON.parse(raw);
    rounds = s.rounds || [];
    totalA = s.totalA || 0;
    totalB = s.totalB || 0;
    mode = s.mode || 'contrat';
    targetManuallySet = !!s.targetManuallySet;
    if (s.nameA) document.getElementById('name-a').value = s.nameA;
    if (s.nameB) document.getElementById('name-b').value = s.nameB;
    if (s.target) document.getElementById('target').value = s.target;
    document.getElementById('opt-arrondi').checked = !!s.arrondi;
    document.getElementById('opt-belote').checked = !!s.beloteComptee;
  } catch (e) { /* état corrompu : on repart de zéro */ }
}

// ---------- Helpers ----------
function getNames() {
  return {
    a: document.getElementById('name-a').value.trim() || 'Équipe A',
    b: document.getElementById('name-b').value.trim() || 'Équipe B'
  };
}

// Arrondi à la dizaine : reste ≤ 5 → vers le bas, ≥ 6 → vers le haut
function roundTen(x) {
  const r = x % 10;
  return r <= 5 ? x - r : x + (10 - r);
}

function defaultTarget() {
  const arrondi = document.getElementById('opt-arrondi').checked;
  if (mode === 'contrat') return 1010;
  if (mode === 'mixte') return arrondi ? 2010 : 2001;
  return arrondi ? 1010 : 1001;
}

// ---------- Sélections ----------
function selectMode(m) {
  mode = m;
  document.getElementById('mode-contrat').className = 'chip' + (m === 'contrat' ? ' active' : '');
  document.getElementById('mode-mixte').className = 'chip' + (m === 'mixte' ? ' active' : '');
  document.getElementById('mode-realise').className = 'chip' + (m === 'realise' ? ' active' : '');
  document.getElementById('row-arrondi').style.display = m === 'contrat' ? 'none' : 'flex';
  document.getElementById('row-belote-comptee').style.display = m === 'contrat' ? 'flex' : 'none';
  if (!targetManuallySet) document.getElementById('target').value = defaultTarget();
  calcPreview();
  saveState();
}

function onOptionsChange() {
  if (!targetManuallySet) document.getElementById('target').value = defaultTarget();
  calcPreview();
  saveState();
}

function selectAttacker(t) {
  attacker = t;
  document.getElementById('att-a').className = 'chip' + (t === 'a' ? ' active-amber' : '');
  document.getElementById('att-b').className = 'chip' + (t === 'b' ? ' active-amber' : '');
  calcPreview();
}

function selectContract(v) {
  contract = v;
  document.querySelectorAll('#contract-row .chip').forEach(c => {
    c.className = 'chip' + (parseInt(c.dataset.val) === v ? ' active' : '');
  });
  calcPreview();
}

function selectCoinche(m) {
  coincheMult = m;
  document.getElementById('co-0').className = 'chip' + (m === 1 ? ' active' : '');
  document.getElementById('co-2').className = 'chip' + (m === 2 ? ' active' : '');
  document.getElementById('co-4').className = 'chip' + (m === 4 ? ' active' : '');
  calcPreview();
}

function selectBelote(t) {
  beloteTeam = t;
  document.getElementById('bel-none').className = 'chip' + (t === null ? ' active' : '');
  document.getElementById('bel-a').className = 'chip' + (t === 'a' ? ' active' : '');
  document.getElementById('bel-b').className = 'chip' + (t === 'b' ? ' active' : '');
  calcPreview();
}

function selectWho(t) {
  whoSaisit = t;
  document.getElementById('who-a').className = 'who-btn' + (t === 'a' ? ' active' : '');
  document.getElementById('who-b').className = 'who-btn' + (t === 'b' ? ' active' : '');
  const n = getNames();
  document.getElementById('derived-team-lbl').textContent = n[t === 'a' ? 'b' : 'a'];
  calcPreview();
}

// ---------- Cœur du calcul ----------
// Retourne null si la saisie est incomplète, sinon { success, scoreA, scoreB, detail }
function computeRound() {
  if (!attacker || !contract) return null;
  const raw = parseInt(document.getElementById('pts-main').value);
  if (isNaN(raw) || raw < 0 || raw > 162) return null;

  const defender = attacker === 'a' ? 'b' : 'a';
  const realized = { a: 0, b: 0 };
  realized[whoSaisit] = raw;
  realized[whoSaisit === 'a' ? 'b' : 'a'] = 162 - raw;

  // Totaux belote incluse — c'est sur ces totaux que se joue réussite/chute
  const withBel = {
    a: realized.a + (beloteTeam === 'a' ? 20 : 0),
    b: realized.b + (beloteTeam === 'b' ? 20 : 0)
  };

  // Réussite du contrat
  let success;
  if (contract === 250) {
    success = realized[defender] === 0;
  } else if (contract === 270) {
    success = realized[defender] === 0 && beloteTeam === attacker;
  } else {
    success = withBel[attacker] >= contract && withBel[attacker] > withBel[defender];
  }

  const arrondi = document.getElementById('opt-arrondi').checked;
  const rnd = x => arrondi ? roundTen(x) : x;
  const score = { a: 0, b: 0 };
  let detail = '';

  // --- Part "contrat" (modes contrat et mixte) ---
  if (mode === 'contrat' || mode === 'mixte') {
    if (success) {
      score[attacker] += contract * coincheMult;
    } else {
      score[defender] += CHUTE_DEFENSE * coincheMult;
    }
  }

  // --- Belote marquée au score (mode contrat uniquement, si option cochée) ---
  if (mode === 'contrat' && beloteTeam && document.getElementById('opt-belote').checked) {
    score[beloteTeam] += 20;
  }

  // --- Part "réalisé" (modes mixte et réalisé) ---
  if (mode === 'mixte' || mode === 'realise') {
    if (success) {
      score.a += rnd(withBel.a);
      score.b += rnd(withBel.b);
    } else {
      // Chute : l'annonceur ne marque rien au réalisé, la défense ramasse tout
      score[defender] += rnd(CHUTE_DEFENSE + (beloteTeam === defender ? 20 : 0)) * (mode === 'realise' ? coincheMult : 1);
    }
  }

  const n = getNames();
  const coincheTxt = coincheMult === 2 ? ' coinché' : coincheMult === 4 ? ' surcoinché' : '';
  const contractTxt = CONTRACT_LABELS[contract] || contract;
  detail = n[attacker] + ' : ' + contractTxt + coincheTxt + (success ? ' ✓' : ' ✗ chute');

  return { success, scoreA: score.a, scoreB: score.b, detail };
}

function calcPreview() {
  const verdict = document.getElementById('verdict');
  const res = computeRound();
  const raw = document.getElementById('pts-main').value;

  document.getElementById('derived-row').style.display = raw !== '' ? 'block' : 'none';
  if (raw !== '') {
    const v = parseInt(raw);
    document.getElementById('derived-val').textContent = isNaN(v) ? '—' : (162 - v);
  }

  if (!res) {
    verdict.style.display = 'none';
    document.getElementById('tot-a').textContent = '—';
    document.getElementById('tot-b').textContent = '—';
    return;
  }
  verdict.style.display = 'block';
  verdict.className = 'verdict ' + (res.success ? 'ok' : 'ko');
  verdict.textContent = res.success ? 'Contrat réussi' : 'Contrat chuté';
  document.getElementById('tot-a').textContent = res.scoreA;
  document.getElementById('tot-b').textContent = res.scoreB;
}

// ---------- Validation ----------
function addRound() {
  const err = document.getElementById('err-msg');
  err.textContent = '';
  if (!attacker) { err.textContent = "Désigne l'équipe annonceuse."; return; }
  if (!contract) { err.textContent = 'Choisis le contrat.'; return; }
  const res = computeRound();
  if (!res) { err.textContent = 'Saisis les points réalisés (0–162).'; return; }
  if (contract === 270 && beloteTeam !== attacker) {
    err.textContent = "Capot beloté : l'annonceur doit avoir la belote.";
    return;
  }

  totalA += res.scoreA;
  totalB += res.scoreB;
  rounds.push({
    scoreA: res.scoreA, scoreB: res.scoreB,
    totalA, totalB,
    detail: res.detail, success: res.success
  });

  updateScoreboard();
  renderHistory();
  resetForm();
  saveState();

  const target = parseInt(document.getElementById('target').value);
  const n = getNames();
  if (target > 0 && (totalA >= target || totalB >= target)) {
    const winner = totalA >= totalB ? n.a : n.b;
    setTimeout(() => alert('🎉 ' + winner + ' remporte la partie !'), 150);
  }
}

// ---------- Rendu ----------
function updateLabels() {
  const n = getNames();
  document.getElementById('label-a').textContent = n.a;
  document.getElementById('label-b').textContent = n.b;
  document.getElementById('att-a').textContent = n.a;
  document.getElementById('att-b').textContent = n.b;
  document.getElementById('bel-a').textContent = n.a;
  document.getElementById('bel-b').textContent = n.b;
  document.getElementById('who-a').textContent = n.a;
  document.getElementById('who-b').textContent = n.b;
  document.getElementById('tot-lbl-a').textContent = 'Donne ' + n.a;
  document.getElementById('tot-lbl-b').textContent = 'Donne ' + n.b;
  document.getElementById('derived-team-lbl').textContent = n[whoSaisit === 'a' ? 'b' : 'a'];
  renderHistoryHeaders();
  saveState();
}

function updateScoreboard() {
  document.getElementById('score-a').textContent = totalA;
  document.getElementById('score-b').textContent = totalB;
  document.getElementById('score-a').className = 'team-score' + (totalA > totalB ? ' leader' : '');
  document.getElementById('score-b').className = 'team-score' + (totalB > totalA ? ' leader' : '');
  document.getElementById('card-a').className = 'team-card' + (totalA > totalB ? ' leader' : '');
  document.getElementById('card-b').className = 'team-card' + (totalB > totalA ? ' leader' : '');
}

function renderHistoryHeaders() {
  const n = getNames();
  document.getElementById('th-a').textContent = n.a;
  document.getElementById('th-b').textContent = n.b;
  document.getElementById('th-ta').textContent = 'Tot. ' + n.a;
  document.getElementById('th-tb').textContent = 'Tot. ' + n.b;
}

function renderHistory() {
  renderHistoryHeaders();
  const body = document.getElementById('history-body');
  body.innerHTML = '';
  [...rounds].reverse().forEach((r, ri) => {
    const i = rounds.length - 1 - ri;
    const tr = document.createElement('tr');
    if (!r.success) tr.classList.add('litige-row');
    tr.innerHTML =
      `<td title="${r.detail || ''}">D${i + 1} ${r.success ? '' : '✗'}</td>` +
      `<td>${r.scoreA}</td><td>${r.scoreB}</td>` +
      `<td class="${r.totalA > r.totalB ? 'hi' : ''}">${r.totalA}</td>` +
      `<td class="${r.totalB > r.totalA ? 'hi' : ''}">${r.totalB}</td>`;
    body.appendChild(tr);
  });
  document.getElementById('history-section').style.display = rounds.length ? 'block' : 'none';
}

function resetForm() {
  attacker = null;
  contract = null;
  coincheMult = 1;
  beloteTeam = null;
  document.getElementById('pts-main').value = '';
  document.getElementById('derived-row').style.display = 'none';
  document.getElementById('verdict').style.display = 'none';
  document.getElementById('tot-a').textContent = '—';
  document.getElementById('tot-b').textContent = '—';
  document.getElementById('err-msg').textContent = '';
  selectCoinche(1);
  selectBelote(null);
  document.getElementById('att-a').className = 'chip';
  document.getElementById('att-b').className = 'chip';
  document.querySelectorAll('#contract-row .chip').forEach(c => c.className = 'chip');
}

function resetAll() {
  if (!confirm('Réinitialiser toute la partie ?')) return;
  rounds = [];
  totalA = 0;
  totalB = 0;
  updateScoreboard();
  renderHistory();
  resetForm();
  saveState();
}

// ---------- Initialisation ----------
(function init() {
  // Génération des chips de contrat
  const row = document.getElementById('contract-row');
  CONTRACTS.forEach(v => {
    const b = document.createElement('button');
    b.className = 'chip';
    b.dataset.val = v;
    b.textContent = CONTRACT_LABELS[v] || v;
    b.onclick = () => selectContract(v);
    row.appendChild(b);
  });

  loadState();
  selectMode(mode);
  updateLabels();
  updateScoreboard();
  renderHistory();
})();
