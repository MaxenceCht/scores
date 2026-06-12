/* ============================================
   Compteur Belote — logique
   ============================================ */

// ---------- État ----------
let rounds = [];
let totalA = 0;
let totalB = 0;
let pendingLitige = null; // 'a' | 'b' | null — équipe qui récupère 81 pts à sa prochaine manche gagnée
let beloteA = false;
let beloteB = false;
let capotTeam = null;
let litigeDefender = null;
let whoSaisit = 'a';

const STORAGE_KEY = 'belote-state-v1';

// ---------- Persistance (la partie survit à un rechargement de page) ----------
function saveState() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      rounds, totalA, totalB, pendingLitige,
      nameA: document.getElementById('name-a').value,
      nameB: document.getElementById('name-b').value,
      target: document.getElementById('target').value
    }));
  } catch (e) { /* stockage indisponible : on continue sans persistance */ }
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const s = JSON.parse(raw);
    rounds = s.rounds || [];
    totalA = s.totalA || 0;
    totalB = s.totalB || 0;
    pendingLitige = s.pendingLitige ?? null;
    if (s.nameA) document.getElementById('name-a').value = s.nameA;
    if (s.nameB) document.getElementById('name-b').value = s.nameB;
    if (s.target) document.getElementById('target').value = s.target;
  } catch (e) { /* état corrompu : on repart de zéro */ }
}

// ---------- Helpers ----------
function getNames() {
  return {
    a: document.getElementById('name-a').value.trim() || 'Équipe A',
    b: document.getElementById('name-b').value.trim() || 'Équipe B'
  };
}

function updateLabels() {
  const n = getNames();
  ['a', 'b'].forEach(t => {
    document.getElementById('label-' + t).textContent = n[t];
    document.getElementById('tot-lbl-' + t).textContent = 'Manche ' + n[t];
  });
  document.getElementById('belote-a-sub').textContent = n.a + ' (+20)';
  document.getElementById('belote-b-sub').textContent = n.b + ' (+20)';
  document.getElementById('who-a').textContent = n.a;
  document.getElementById('who-b').textContent = n.b;
  document.getElementById('capot-btn-a').textContent = n.a;
  document.getElementById('capot-btn-b').textContent = n.b;
  document.getElementById('litige-btn-a').textContent = n.a;
  document.getElementById('litige-btn-b').textContent = n.b;
  updateWhoLabel();
  renderHistoryHeaders();
  saveState();
}

function updateWhoLabel() {
  const n = getNames();
  const other = whoSaisit === 'a' ? 'b' : 'a';
  document.getElementById('derived-team-lbl').textContent = n[other];
}

// ---------- Sélections ----------
function selectWho(t) {
  whoSaisit = t;
  document.getElementById('who-a').className = 'who-btn' + (t === 'a' ? ' active' : '');
  document.getElementById('who-b').className = 'who-btn' + (t === 'b' ? ' active' : '');
  updateWhoLabel();
  calcPreview();
}

function selectCapot(t) {
  capotTeam = t;
  document.getElementById('capot-btn-a').className = 'team-btn' + (t === 'a' ? ' selected-teal' : '');
  document.getElementById('capot-btn-b').className = 'team-btn' + (t === 'b' ? ' selected-teal' : '');
  calcCapotPreview();
}

function selectLitige(t) {
  litigeDefender = t;
  document.getElementById('litige-btn-a').className = 'team-btn' + (t === 'a' ? ' selected-amber' : '');
  document.getElementById('litige-btn-b').className = 'team-btn' + (t === 'b' ? ' selected-amber' : '');
}

function toggleBelote(t) {
  if (t === 'a') {
    beloteA = !beloteA;
    document.getElementById('belote-btn-a').className = 'belote-btn' + (beloteA ? ' active' : '');
  } else {
    beloteB = !beloteB;
    document.getElementById('belote-btn-b').className = 'belote-btn' + (beloteB ? ' active' : '');
  }
  calcPreview();
}

function onCapotChange() {
  const isCapot = document.getElementById('capot-check').checked;
  document.getElementById('capot-section').style.display = isCapot ? 'block' : 'none';
  document.getElementById('normal-section').style.display = isCapot ? 'none' : 'block';
  document.getElementById('litige-section').style.display = 'none';
  capotTeam = null;
  document.getElementById('capot-btn-a').className = 'team-btn';
  document.getElementById('capot-btn-b').className = 'team-btn';
  document.getElementById('tot-a').textContent = '—';
  document.getElementById('tot-b').textContent = '—';
  document.getElementById('err-msg').textContent = '';
  if (!isCapot) calcPreview();
}

// ---------- Aperçus ----------
function calcCapotPreview() {
  if (!capotTeam) return;
  const ba = beloteA ? 20 : 0;
  const bb = beloteB ? 20 : 0;
  document.getElementById('tot-a').textContent = (capotTeam === 'a' ? 250 : 0) + ba;
  document.getElementById('tot-b').textContent = (capotTeam === 'b' ? 250 : 0) + bb;
}

function calcPreview() {
  if (document.getElementById('capot-check').checked) { calcCapotPreview(); return; }
  const raw = parseInt(document.getElementById('pts-main').value);
  const other = whoSaisit === 'a' ? 'b' : 'a';
  const ba = beloteA ? 20 : 0;
  const bb = beloteB ? 20 : 0;

  if (isNaN(raw) || raw < 0) {
    document.getElementById('derived-row').style.display = 'none';
    document.getElementById('tot-a').textContent = '—';
    document.getElementById('tot-b').textContent = '—';
    document.getElementById('litige-section').style.display = 'none';
    return;
  }

  const derived = 162 - raw;
  document.getElementById('derived-val').textContent = derived;
  document.getElementById('derived-row').style.display = 'block';

  const pts = { a: 0, b: 0 };
  pts[whoSaisit] = raw;
  pts[other] = derived;

  const isLitige = pts.a === 81 && pts.b === 81;
  document.getElementById('litige-section').style.display = isLitige ? 'block' : 'none';

  if (!isLitige) {
    document.getElementById('tot-a').textContent = pts.a + ba;
    document.getElementById('tot-b').textContent = pts.b + bb;
  } else {
    document.getElementById('tot-a').textContent = '81' + (ba ? '+20' : '');
    document.getElementById('tot-b').textContent = '81' + (bb ? '+20' : '');
  }
}

// ---------- Validation d'une manche ----------
function addRound() {
  const err = document.getElementById('err-msg');
  err.textContent = '';
  const n = getNames();
  const ba = beloteA ? 20 : 0;
  const bb = beloteB ? 20 : 0;
  const isCapot = document.getElementById('capot-check').checked;

  let roundA = 0, roundB = 0, note = '', isLitige = false, isCapotRound = false;

  if (isCapot) {
    if (!capotTeam) { err.textContent = "Désigne l'équipe qui fait capot."; return; }
    roundA = (capotTeam === 'a' ? 250 : 0) + ba;
    roundB = (capotTeam === 'b' ? 250 : 0) + bb;
    note = 'Capot ' + n[capotTeam];
    isCapotRound = true;

    // Un litige en attente est remporté par l'équipe qui fait capot
    if (pendingLitige !== null) {
      if (capotTeam === 'a') roundA += 81; else roundB += 81;
      note += ' + litige → ' + n[capotTeam];
      pendingLitige = null;
    }
  } else {
    const raw = parseInt(document.getElementById('pts-main').value);
    const other = whoSaisit === 'a' ? 'b' : 'a';
    if (isNaN(raw) || raw < 0 || raw > 162) {
      err.textContent = 'Saisis un nombre de points valide (0–162).';
      return;
    }

    const pts = { a: 0, b: 0 };
    pts[whoSaisit] = raw;
    pts[other] = 162 - raw;
    isLitige = pts.a === 81 && pts.b === 81;

    if (isLitige) {
      if (!litigeDefender) { err.textContent = "Désigne l'équipe défendante."; return; }
      const attacker = litigeDefender === 'a' ? 'b' : 'a';
      roundA = (litigeDefender === 'a' ? 81 : 0) + ba;
      roundB = (litigeDefender === 'b' ? 81 : 0) + bb;
      pendingLitige = attacker;
      note = 'Litige — 81 pts en attente pour ' + n[attacker];
    } else {
      roundA = pts.a + ba;
      roundB = pts.b + bb;

      // Résolution d'un litige en attente : le gagnant de la manche empoche les 81 pts
      if (pendingLitige !== null) {
        const winner = pts.a > pts.b ? 'a' : pts.b > pts.a ? 'b' : null;
        if (winner !== null) {
          if (winner === 'a') roundA += 81; else roundB += 81;
          note = '+ 81 pts de litige → ' + n[winner];
          pendingLitige = null;
        } else {
          note = 'Égalité — litige reporté';
        }
      }
    }
  }

  totalA += roundA;
  totalB += roundB;
  rounds.push({ roundA, roundB, totalA, totalB, note, isLitige, isCapotRound });

  updateScoreboard();
  renderHistory();
  resetForm();
  saveState();

  const target = parseInt(document.getElementById('target').value);
  if (target > 0 && (totalA >= target || totalB >= target)) {
    const winner = totalA >= totalB ? n.a : n.b;
    setTimeout(() => alert('🎉 ' + winner + ' remporte la partie !'), 150);
  }
}

// ---------- Rendu ----------
function updateScoreboard() {
  document.getElementById('score-a').textContent = totalA;
  document.getElementById('score-b').textContent = totalB;
  document.getElementById('score-a').className = 'team-score' + (totalA > totalB ? ' leader' : '');
  document.getElementById('score-b').className = 'team-score' + (totalB > totalA ? ' leader' : '');
  document.getElementById('card-a').className = 'team-card' + (totalA > totalB ? ' leader' : '') + (pendingLitige === 'a' ? ' litige-pending' : '');
  document.getElementById('card-b').className = 'team-card' + (totalB > totalA ? ' leader' : '') + (pendingLitige === 'b' ? ' litige-pending' : '');
  document.getElementById('litige-badge-a').style.display = pendingLitige === 'a' ? 'block' : 'none';
  document.getElementById('litige-badge-b').style.display = pendingLitige === 'b' ? 'block' : 'none';
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
  // Affichage du plus récent au plus ancien
  [...rounds].reverse().forEach((r, ri) => {
    const i = rounds.length - 1 - ri;
    const tr = document.createElement('tr');
    if (r.isLitige) tr.classList.add('litige-row');
    if (r.isCapotRound) tr.classList.add('capot-row');
    const emoji = r.isCapotRound ? '🃏' : r.isLitige ? '⚖️' : '';
    const label = emoji ? 'M' + (i + 1) + ' ' + emoji : 'M' + (i + 1);
    tr.innerHTML =
      `<td title="${r.note || ''}">${label}</td>` +
      `<td>${r.roundA}</td><td>${r.roundB}</td>` +
      `<td class="${r.totalA > r.totalB ? 'hi' : ''}">${r.totalA}</td>` +
      `<td class="${r.totalB > r.totalA ? 'hi' : ''}">${r.totalB}</td>`;
    body.appendChild(tr);
  });
  document.getElementById('history-section').style.display = rounds.length ? 'block' : 'none';
}

function resetForm() {
  document.getElementById('capot-check').checked = false;
  document.getElementById('capot-section').style.display = 'none';
  document.getElementById('normal-section').style.display = 'block';
  document.getElementById('pts-main').value = '';
  document.getElementById('derived-row').style.display = 'none';
  document.getElementById('litige-section').style.display = 'none';
  document.getElementById('tot-a').textContent = '—';
  document.getElementById('tot-b').textContent = '—';
  document.getElementById('err-msg').textContent = '';
  beloteA = false;
  beloteB = false;
  document.getElementById('belote-btn-a').className = 'belote-btn';
  document.getElementById('belote-btn-b').className = 'belote-btn';
  capotTeam = null;
  litigeDefender = null;
  document.getElementById('capot-btn-a').className = 'team-btn';
  document.getElementById('capot-btn-b').className = 'team-btn';
  document.getElementById('litige-btn-a').className = 'team-btn';
  document.getElementById('litige-btn-b').className = 'team-btn';
}

function resetAll() {
  if (!confirm('Réinitialiser toute la partie ?')) return;
  rounds = [];
  totalA = 0;
  totalB = 0;
  pendingLitige = null;
  updateScoreboard();
  renderHistory();
  resetForm();
  saveState();
}

// ---------- Initialisation ----------
loadState();
updateLabels();
updateScoreboard();
renderHistory();
