import { supabase } from './supabase.js';

// ========== INIT ==========
const user = requireAuth();

document.getElementById('mode-badge').textContent = user.mode;
document.getElementById('avatar').textContent = user.login.substring(0, 2).toUpperCase();

// ========== CHARGEMENT ==========
async function loadHome() {
  await loadCurrentEvent();
  await loadNextEvent();
  await loadLastEvent();
}

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
        <div style="font-size:12px; color:#4a7a9b; margin-top:2px;">${event.nom_complet}</div>
      </div>
      <span class="badge badge-live">En cours</span>
    </div>
    <a href="event.html?id=${event.id}">
      <button style="margin-top:0;">Voir l'évènement →</button>
    </a>
  `;

  await loadCurrentRanking(event.id);
}

// ========== CLASSEMENT PROVISOIRE ==========
async function loadCurrentRanking(eventId) {
  const { data: votes } = await supabase
    .from('votes')
    .select('*, matches!inner(event_id, score_final_1, score_final_2, statut), users!inner(login, mode)')
    .eq('matches.event_id', eventId)
    .eq('matches.statut', 'termine');

  const { data: votesBonus } = await supabase
    .from('votes_bonus')
    .select('*, events!inner(nom)')
    .eq('event_id', eventId);

  if (!votes) return;

  // Calcul des points
  const scores = {};

  votes.forEach(v => {
    const login = v.users.login;
    const mode = v.users.mode;
    if (!scores[login]) scores[login] = { login, points: 0, mode };

    const r1 = v.matches.score_final_1;
    const r2 = v.matches.score_final_2;
    const v1 = v.score_vote_1;
    const v2 = v.score_vote_2;

    const bonGagnant = (r1 > r2 && v1 > v2) || (r1 < r2 && v1 < v2) || (r1 === r2 && v1 === v2);
    if (bonGagnant) scores[login].points += 3;

    const scoreExact = r1 === v1 && r2 === v2;
    if (scoreExact) scores[login].points += 1;
  });

  // Bonus "seul" pour les Experts
  const matchGroups = {};
  votes.forEach(v => {
    const key = v.match_id;
    if (!matchGroups[key]) matchGroups[key] = [];
    matchGroups[key].push(v);
  });

  Object.values(matchGroups).forEach(matchVotes => {
    const exactVotes = matchVotes.filter(v =>
      v.score_vote_1 === v.matches.score_final_1 &&
      v.score_vote_2 === v.matches.score_final_2
    );
    if (exactVotes.length === 1 && exactVotes[0].users.mode === 'EXPERT') {
      scores[exactVotes[0].users.login].points += 1;
    }
  });

  // Bonus vainqueur tournoi
  if (votesBonus) {
    const { data: eventData } = await supabase
      .from('events')
      .select('vainqueur')
      .eq('id', eventId)
      .single();

    if (eventData?.vainqueur) {
      votesBonus.forEach(vb => {
        if (vb.equipe_gagnante_vote === eventData.vainqueur) {
          const login = vb.users?.login;
          if (login && scores[login]) scores[login].points += 10;
        }
      });
    }
  }

  // Tri
  const ranking = Object.values(scores).sort((a, b) => b.points - a.points);

  if (ranking.length === 0) {
    document.getElementById('current-ranking').innerHTML = `
      <div style="font-size:13px; color:#4a7a9b; text-align:center; padding:12px;">Aucun match terminé pour l'instant</div>
    `;
    return;
  }

  let html = `<table class="data-table">
    <thead><tr>
      <th></th><th>Joueur</th><th>Mode</th><th style="text-align:right;">Points</th>
    </tr></thead><tbody>`;

  ranking.forEach((r, i) => {
    const isMe = r.login === user.login;
    html += `<tr class="${isMe ? 'me' : ''}">
      <td style="color:#4a7a9b; width:24px;">${i + 1}</td>
      <td>${r.login}</td>
      <td><span class="badge badge-${r.mode.toLowerCase()}">${r.mode}</span></td>
      <td style="text-align:right; font-weight:500;">${r.points}</td>
    </tr>`;
  });

  html += '</tbody></table>';
  document.getElementById('current-ranking').innerHTML = html;
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
        <div style="font-size:12px; color:#4a7a9b; margin-top:2px;">${event.nom_complet}</div>
      </div>
      <span class="badge badge-soon">À venir</span>
    </div>
    <a href="event.html?id=${event.id}">
      <button style="margin-top:0;">Voir l'évènement →</button>
    </a>
  `;
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

  // Classement top 3
  const { data: votes } = await supabase
    .from('votes')
    .select('*, matches!inner(event_id, score_final_1, score_final_2), users!inner(login, mode)')
    .eq('matches.event_id', event.id);

  const scores = {};
  if (votes) {
    votes.forEach(v => {
      const login = v.users.login;
      if (!scores[login]) scores[login] = { login, points: 0 };
      const r1 = v.matches.score_final_1;
      const r2 = v.matches.score_final_2;
      const v1 = v.score_vote_1;
      const v2 = v.score_vote_2;
      const bonGagnant = (r1 > r2 && v1 > v2) || (r1 < r2 && v1 < v2) || (r1 === r2 && v1 === v2);
      if (bonGagnant) scores[login].points += 3;
      if (r1 === v1 && r2 === v2) scores[login].points += 1;
    });
  }

  const top3 = Object.values(scores).sort((a, b) => b.points - a.points).slice(0, 3);

  document.getElementById('last-event-section').style.display = 'block';

  let podiumHtml = '';
  if (top3.length > 0) {
    podiumHtml = `<div style="display:flex; gap:8px; margin-bottom:12px;">`;
    const order = top3.length >= 3 ? [1, 0, 2] : top3.length === 2 ? [0, 1] : [0];
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
    </a>
  `;
}

// ========== UTILITAIRES ==========
function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
}

// ========== LANCEMENT ==========
loadHome();
