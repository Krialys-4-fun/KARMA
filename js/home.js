import { supabase } from './supabase.js';
import { renderNavbar } from './navbar.js';

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

window.addEventListener('load', async () => {
  currentUser = renderNavbar('home');
  if (!currentUser) return;

  await loadCurrentEvent();
  await loadNextEvent();
  await loadLastEvent();
  await loadNotifications();
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
        <div style="font-size:16px; font-weight:700; color:#ffffff; margin-bottom:4px;">⚽ ${event.nom}</div>
        <div style="font-size:12px; color:#93c5fd; margin-bottom:2px;">${event.sport} · ${formatDate(event.date_debut)} — ${formatDate(event.date_fin)}</div>
        <div style="font-size:12px; color:#93c5fd; margin-top:2px; font-style:italic;">${event.nom_complet || ''}</div>
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

  const { data: matches } = await supabase
    .from('matches')
    .select('*')
    .eq('event_id', eventId)
    .eq('statut', 'termine');

  if (!matches || matches.length === 0) {
    container.innerHTML = '<div style="font-size:13px; color:#4a7a9b; text-align:center; padding:12px;">Aucun match terminé pour l\'instant</div>';
    return;
  }

  const matchIds = matches.map(m => m.id);
  const { data: votes } = await supabase
    .from('votes')
    .select('*, users!inner(login, mode)')
    .in('match_id', matchIds);

  if (!votes || votes.length === 0) {
    container.innerHTML = '<div style="font-size:13px; color:#4a7a9b; text-align:center; padding:12px;">Aucun vote enregistré pour l\'instant</div>';
    return;
  }

  const matchMap = {};
  matches.forEach(m => { matchMap[m.id] = m; });

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
    if (r1 === v1 && r2 === v2) scores[login].points += 1;
  });

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

  let top3 = [];

  if (event.classement_json) {
    try {
      const ranking = JSON.parse(event.classement_json);
      top3 = ranking.slice(0, 3);
    } catch(e) { top3 = []; }
  } else {
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

    top3 = Object.values(scores).sort((a, b) => b.points - a.points).slice(0, 3);
  }

  if (top3.length === 0) return;

  const medals = ['🥇', '🥈', '🥉'];
  const order = top3.length >= 3 ? [1, 0, 2] : top3.length === 2 ? [0, 1] : [0];

  let podiumHtml = `<div style="display:flex; gap:8px; margin-bottom:12px;">`;
  order.forEach(i => {
    if (!top3[i]) return;
    const isFirst = i === 0;
    podiumHtml += `
      <div style="flex:1; background:#0a1628; border-radius:8px; padding:10px 8px; text-align:center; border:0.5px solid ${isFirst ? '#f97316' : '#1a3a5c'};">
        <div style="font-size:18px; margin-bottom:4px;">${medals[i]}</div>
        <div style="font-size:13px; font-weight:600; color:${isFirst ? '#f97316' : '#fff'};">${top3[i].login}</div>
        <div style="font-size:11px; color:#4a7a9b; margin-top:2px;">${top3[i].points} pts</div>
      </div>`;
  });
  podiumHtml += `</div>`;

  document.getElementById('last-event-section').style.display = 'block';
  document.getElementById('last-event-card').innerHTML = `
    <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:12px;">
      <div>
        <div style="font-size:15px; font-weight:500; color:#fff; margin-bottom:4px;">🏉 ${event.nom}</div>
        <div style="font-size:12px; color:#4a7a9b;">${event.sport} · ${formatDate(event.date_debut)} — ${formatDate(event.date_fin)}</div>
      </div>
      <span class="badge badge-done">Terminé</span>
    </div>
    ${podiumHtml}
    <a href="historique.html">
      <button class="btn-secondary" style="margin-top:0; width:auto; padding:7px 16px;">Voir l'historique complet →</button>
    </a>`;
}

// ========== UTILITAIRES ==========
function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
}

// ========== NOTIFICATIONS ==========
async function loadNotifications() {
  const notifs = [];
  const hier = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  // Nouveaux résultats dans les 24h
  const { data: recentMatches } = await supabase
    .from('matches')
    .select('equipe_1, equipe_2, score_final_1, score_final_2, phase')
    .eq('statut', 'termine')
    .gte('updated_at', hier)
    .order('updated_at', { ascending: false })
    .limit(5);

  if (recentMatches && recentMatches.length > 0) {
    const scores = recentMatches
      .map(m => `${m.equipe_1} ${m.score_final_1}-${m.score_final_2} ${m.equipe_2}`)
      .join(' · ');
    notifs.push(`🆕 <strong>Nouveaux résultats :</strong> ${scores}`);
  }

  // Matchs à voter aujourd'hui
  const demain = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
  const { data: matchsAujourdhui } = await supabase
    .from('matches')
    .select('equipe_1, equipe_2, date_heure')
    .eq('statut', 'a_venir')
    .gte('date_heure', new Date().toISOString())
    .lte('date_heure', demain)
    .order('date_heure')
    .limit(3);

  if (matchsAujourdhui && matchsAujourdhui.length > 0) {
    const matchs = matchsAujourdhui
      .map(m => `${m.equipe_1} vs ${m.equipe_2} à ${new Date(m.date_heure).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`)
      .join(' · ');
    notifs.push(`⏰ <strong>Matchs à voter aujourd'hui :</strong> ${matchs}`);
  }

  if (notifs.length === 0) return;

  const banner = document.getElementById('notif-banner');
  const content = document.getElementById('notif-content');

  content.innerHTML = notifs.map(n => `
    <div style="display:flex; align-items:center; gap:10px; font-size:13px; color:#ccd6e0;">
      <span>${n}</span>
      <a href="event.html?id=" style="color:#38bdf8; font-size:12px; white-space:nowrap;">Voter →</a>
    </div>`).join('');

  banner.style.display = 'block';
}
