import { supabase } from './supabase.js';
import './auth.js';

// ========== DRAPEAUX ==========
function flag(equipe) {
  const codes = {
    'Mexique': 'mx', 'Afrique du Sud': 'za', 'Canada': 'ca',
    'Bosnie-Herzégovine': 'ba', 'Allemagne': 'de', "Côte d'Ivoire": 'ci',
    'États-Unis': 'us', 'Paraguay': 'py', 'Brésil': 'br', 'Maroc': 'ma',
    'Qatar': 'qa', 'Suisse': 'ch', 'Argentine': 'ar', 'Slovaquie': 'sk',
    'Japon': 'jp', 'Sénégal': 'sn', 'Espagne': 'es', 'Suède': 'se',
    'Portugal': 'pt', 'Zimbabwe': 'zw', 'France': 'fr', 'Uruguay': 'uy',
    'Belgique': 'be', 'Tunisie': 'tn', 'Angleterre': 'gb-eng', 'Croatie': 'hr',
    'Pays-Bas': 'nl', 'Arabie Saoudite': 'sa', 'Australie': 'au',
    'Nigeria': 'ng', 'Corée du Sud': 'kr', 'Tchéquie': 'cz'
  };
  const code = codes[equipe];
  if (!code) return equipe;
  return `<img src="https://flagcdn.com/16x12/${code}.png" style="vertical-align:middle; margin-right:4px;"/> ${equipe}`;
}

// ========== INIT ==========
let currentUser = null;
if (currentUser.role === 'ADMIN') {
  document.getElementById('admin-link').style.display = 'block';
}

window.addEventListener('load', async () => {
  const u = localStorage.getItem('karma_user');
  currentUser = u ? JSON.parse(u) : null;
  if (!currentUser) { window.location.href = 'login.html'; return; }

  document.getElementById('mode-badge').textContent = currentUser.mode;
  document.getElementById('avatar').textContent = currentUser.login.substring(0, 2).toUpperCase();

  await loadCurrentEvent();
  await loadNextEvent();
  await loadLastEvent();
});

// ========== EVENEMENT EN COURS ==========
async function loadCurrentEvent() {
  const { data: events } = await supabase
    .from('events')
    .select('*')
    .eq('statut', 'en_cours')
    .limit(1);

  if (!events || events.length === 0) return;
  const event = events[0];

  document.getElementById('current-event-section').style.display = 'block';
  document.getElementById('current-event-card').innerHTML = `
    <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:12px;">
      <div>
        <div style="font-size:15px; font-weight:500; color:#fff; margin-bottom:4px;">${event.nom}</div>
        <div style="font-size:12px; color:#4a7a9b;">${event.sport} · ${formatDate(event.date_debut)} — ${formatDate(event.date_fin)}</div>
        <div style="font-size:12px; color:#4a7a9b; margin-top:2px;">${event.nom_complet || ''}</div>
      </div>
      <span class="badge badge-live">En cours</span>
    </div>
    <a href="event.html?id=${event.id}">
      <button style="margin-top:0;">Voter →</button>
    </a>`;

  await loadCurrentRanking(event.id);
}

// ========== CLASSEMENT PROVISOIRE ==========
async function loadCurrentRanking(eventId) {
  const container = document.getElementById('current-ranking');

  // Récupérer tous les matchs terminés
  const { data: matches } = await supabase
    .from('matches')
    .select('*')
    .eq('event_id', eventId)
    .eq('statut', 'termine');

  if (!matches || matches.length === 0) {
    container.innerHTML = '<div style="font-size:13px; color:#4a7a9b; text-align:center; padding:12px;">Aucun match terminé pour l\'instant</div>';
    return;
  }

  // Récupérer tous les votes pour ces matchs
  const matchIds = matches.map(m => m.id);
  const { data: votes } = await supabase
    .from('votes')
    .select('*, users!inner(login, mode)')
    .in('match_id', matchIds);

  if (!votes || votes.length === 0) {
    container.innerHTML = '<div style="font-size:13px; color:#4a7a9b; text-align:center; padding:12px;">Aucun vote enregistré pour l\'instant</div>';
    return;
  }

  // Créer un map des matchs
  const matchMap = {};
  matches.forEach(m => { matchMap[m.id] = m; });

  // Calculer les points par joueur
  const scores = {};
  votes.forEach(v => {
    const login = v.users.login;
    const mode = v.users.mode;
    if (!scores[login]) scores[login] = { login, mode, points: 0 };

    const match = matchMap[v.match_id];
    if (!match) return;

    const r1 = match.score_final_1;
    const r2 = match.score_final_2;
    const v1 = v.score_vote_1;
    const v2 = v.score_vote_2;

    const bonGagnant = (r1 > r2 && v1 > v2) || (r1 < r2 && v1 < v2) || (r1 === r2 && v1 === v2);
    if (bonGagnant) scores[login].points += 3;

    const scoreExact = r1 === v1 && r2 === v2;
    if (scoreExact) scores[login].points += 1;
  });

  // Bonus "seul" pour les Experts
  matchIds.forEach(matchId => {
    const match = matchMap[matchId];
    if (!match) return;

    const votesMatch = votes.filter(v => v.match_id === matchId);
    const exactVotes = votesMatch.filter(v =>
      v.score_vote_1 === match.score_final_1 &&
      v.score_vote_2 === match.score_final_2
    );

    if (exactVotes.length === 1 && exactVotes[0].users.mode === 'EXPERT') {
      scores[exactVotes[0].users.login].points += 1;
    }
  });

  // Tri par points
  const ranking = Object.values(scores).sort((a, b) => b.points - a.points);

  let html = `<table class="data-table">
    <thead><tr>
      <th>#</th><th>Joueur</th><th>Mode</th><th style="text-align:right;">Points</th>
    </tr></thead><tbody>`;

  ranking.forEach((r, i) => {
    const isMe = r.login === currentUser.login;
    html += `<tr class="${isMe ? 'me' : ''}">
      <td style="color:#4a7a9b; width:24px;">${i + 1}</td>
      <td>${r.login}</td>
      <td><span class="badge badge-${r.mode.toLowerCase()}">${r.mode}</span></td>
      <td style="text-align:right; font-weight:500;">${r.points}</td>
    </tr>`;
  });

  html += '</tbody></table>';
  container.innerHTML = html;
}

// ========== PROCHAIN EVENEMENT ==========
async function loadNextEvent() {
  const { data: events } = await supabase
    .from('events')
    .select('*')
    .eq('statut', 'a_venir')
    .order('date_debut', { ascending: true })
    .limit(1);

  if (!events || events.length === 0) return;
  const event = events[0];

  document.getElementById('next-event-section').style.display = 'block';
  document.getElementById('next-event-card').innerHTML = `
    <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:12px;">
      <div>
        <div style="font-size:15px; font-weight:500; color:#fff; margin-bottom:4px;">${event.nom}</div>
        <div style="font-size:12px; color:#4a7a9b;">${event.sport} · ${formatDate(event.date_debut)} — ${formatDate(event.date_fin)}</div>
        <div style="font-size:12px; color:#4a7a9b; margin-top:2px;">${event.nom_complet || ''}</div>
      </div>
      <span class="badge badge-soon">À venir</span>
    </div>
    <a href="event.html?id=${event.id}">
      <button style="margin-top:0;">Voir l'évènement →</button>
    </a>`;
}

// ========== DERNIER EVENEMENT TERMINE ==========
async function loadLastEvent() {
  const { data: events } = await supabase
    .from('events')
    .select('*')
    .eq('statut', 'termine')
    .order('date_fin', { ascending: false })
    .limit(1);

  if (!events || events.length === 0) return;
  const event = events[0];

  // Récupérer les matchs terminés
  const { data: matches } = await supabase
    .from('matches')
    .select('*')
    .eq('event_id', event.id)
    .eq('statut', 'termine');

  if (!matches || matches.length === 0) return;

  const matchIds = matches.map(m => m.id);
  const { data: votes } = await supabase
    .from('votes')
    .select('*, users!inner(login)')
    .in('match_id', matchIds);

  // Calcul points top 3
  const scores = {};
  const matchMap = {};
  matches.forEach(m => { matchMap[m.id] = m; });

  votes?.forEach(v => {
    const login = v.users.login;
    if (!scores[login]) scores[login] = { login, points: 0 };
    const match = matchMap[v.match_id];
    if (!match) return;
    const r1 = match.score_final_1;
    const r2 = match.score_final_2;
    const bonGagnant = (r1 > r2 && v.score_vote_1 > v.score_vote_2) ||
                       (r1 < r2 && v.score_vote_1 < v.score_vote_2) ||
                       (r1 === r2 && v.score_vote_1 === v.score_vote_2);
    if (bonGagnant) scores[login].points += 3;
    if (r1 === v.score_vote_1 && r2 === v.score_vote_2) scores[login].points += 1;
  });

  const top3 = Object.values(scores).sort((a, b) => b.points - a.points).slice(0, 3);

  let podiumHtml = '';
  if (top3.length > 0) {
    const order = top3.length >= 3 ? [1, 0, 2] : top3.length === 2 ? [0, 1] : [0];
    podiumHtml = `<div style="display:flex; gap:8px; margin-bottom:12px;">`;
    order.forEach(i => {
      if (!top3[i]) return;
      const isFirst = i === 0;
      podiumHtml += `
        <div style="flex:1; background:#0a1628; border-radius:8px; padding:10px 8px; text-align:center; border:0.5px solid ${isFirst ? '#f97316' : '#1a3a5c'};">
          <div style="font-size:11px; color:${isFirst ? '#f97316' : '#4a7a9b'}; margin-bottom:4px;">${i === 0 ? '🏆 1er' : i === 1 ? '2e' : '3e'}</div>
          <div style="font-size:13px; font-weight:500; color:#fff;">${top3[i].login}</div>
          <div style="font-size:11px; color:#4a7a9b; margin-top:2px;">${top3[i].points} pts</div>
        </div>`;
    });
    podiumHtml += `</div>`;
  }

  document.getElementById('last-event-section').style.display = 'block';
  document.getElementById('last-event-card').innerHTML = `
    <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:12px;">
      <div>
        <div style="font-size:15px; font-weight:500; color:#fff; margin-bottom:4px;">${event.nom}</div>
        <div style="font-size:12px; color:#4a7a9b;">${event.sport} · ${formatDate(event.date_debut)} — ${formatDate(event.date_fin)}</div>
      </div>
      <span class="badge badge-done">Terminé</span>
    </div>
    ${podiumHtml}
    <a href="event.html?id=${event.id}">
      <button class="btn-secondary" style="margin-top:0;">Voir le détail →</button>
    </a>`;
}

// ========== UTILITAIRES ==========
function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
}
