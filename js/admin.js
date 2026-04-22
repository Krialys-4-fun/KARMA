import { supabase } from './supabase.js';

// ========== INIT ==========
document.addEventListener('DOMContentLoaded', () => {
  const user = requireAdmin();
  if (!user) return;
  document.getElementById('avatar').textContent = user.login.substring(0, 2).toUpperCase();
  loadUsers();
  loadEvents();
  loadEventSelects();
});

// ========== NAVIGATION ==========
window.showSection = function(section) {
  document.querySelectorAll('.admin-section').forEach(s => s.style.display = 'none');
  document.querySelectorAll('.sidebar-item').forEach(s => s.classList.remove('active'));
  document.getElementById('s-' + section).style.display = 'block';
  document.getElementById('menu-' + section).classList.add('active');
}

// ========== UTILISATEURS ==========
window.showAddUser = function() {
  document.getElementById('add-user-form').style.display = 'block';
}

window.hideAddUser = function() {
  document.getElementById('add-user-form').style.display = 'none';
}

async function loadUsers() {
  const { data: users } = await supabase
    .from('users')
    .select('*')
    .order('login');

  const tbody = document.getElementById('users-tbody');
  tbody.innerHTML = '';

  users.forEach(u => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${u.login}</td>
      <td><span class="badge ${u.role === 'ADMIN' ? 'badge-live' : 'badge-soon'}">${u.role}</span></td>
      <td><span class="badge badge-${u.mode.toLowerCase()}">${u.mode}</span></td>
      <td><span class="badge ${u.actif ? 'badge-done' : 'badge-locked'}">${u.actif ? 'Actif' : 'Inactif'}</span></td>
      <td style="display:flex; gap:6px; flex-wrap:wrap;">
        <button class="btn-small" onclick="toggleMode('${u.id}', '${u.mode}')">Mode</button>
        <button class="btn-small" onclick="resetPassword('${u.id}')">Mdp</button>
        <button class="btn-small ${u.actif ? 'btn-danger' : ''}" 
          onclick="toggleActif('${u.id}', ${u.actif})">
          ${u.actif ? 'Désactiver' : 'Réactiver'}
        </button>
      </td>`;
    tbody.appendChild(tr);
  });
}

window.addUser = async function() {
  const login = document.getElementById('new-login').value.trim();
  const password = document.getElementById('new-password').value.trim();
  const role = document.getElementById('new-role').value;
  const errorDiv = document.getElementById('add-user-error');

  if (!login || !password) {
    errorDiv.textContent = 'Merci de remplir tous les champs.';
    errorDiv.style.display = 'block';
    return;
  }

  const { error } = await supabase.from('users').insert({
    login, mot_de_passe: password, role,
    mode: 'EXPERT', mode_modifiable: true, actif: true
  });

  if (error) {
    errorDiv.textContent = 'Erreur : ' + error.message;
    errorDiv.style.display = 'block';
    return;
  }

  document.getElementById('new-login').value = '';
  document.getElementById('new-password').value = '';
  errorDiv.style.display = 'none';
  hideAddUser();
  loadUsers();
}

window.toggleMode = async function(id, currentMode) {
  const newMode = currentMode === 'EXPERT' ? 'MOUTON' : 'EXPERT';
  if (!confirm(`Changer le mode vers ${newMode} ?`)) return;
  await supabase.from('users').update({ mode: newMode }).eq('id', id);
  loadUsers();
}

window.resetPassword = async function(id) {
  const newPwd = prompt('Nouveau mot de passe :');
  if (!newPwd) return;
  await supabase.from('users').update({ mot_de_passe: newPwd }).eq('id', id);
  alert('Mot de passe mis à jour !');
}

window.toggleActif = async function(id, currentActif) {
  const action = currentActif ? 'désactiver' : 'réactiver';
  if (!confirm(`Voulez-vous ${action} cet utilisateur ?`)) return;
  await supabase.from('users').update({ actif: !currentActif }).eq('id', id);
  loadUsers();
}

// ========== EVENEMENTS ==========
async function loadEvents() {
  const { data: events } = await supabase
    .from('events')
    .select('*')
    .order('date_debut', { ascending: false });

  const list = document.getElementById('events-list');
  list.innerHTML = '';

  if (!events || events.length === 0) {
    list.innerHTML = '<div style="font-size:13px; color:#4a7a9b;">Aucun évènement créé.</div>';
    return;
  }

  events.forEach(ev => {
    const badgeClass = ev.statut === 'en_cours' ? 'badge-live' : ev.statut === 'a_venir' ? 'badge-soon' : 'badge-done';
    const badgeLabel = ev.statut === 'en_cours' ? 'En cours' : ev.statut === 'a_venir' ? 'À venir' : 'Terminé';
    list.innerHTML += `
      <div class="card" style="display:flex; justify-content:space-between; align-items:center;">
        <div>
          <div style="font-size:14px; font-weight:500; color:#fff;">${ev.nom}</div>
          <div style="font-size:12px; color:#4a7a9b;">${ev.sport} · ${formatDate(ev.date_debut)} — ${formatDate(ev.date_fin)}</div>
        </div>
        <div style="display:flex; gap:8px; align-items:center;">
          <span class="badge ${badgeClass}">${badgeLabel}</span>
          <button class="btn-small" onclick="changeStatut('${ev.id}', '${ev.statut}')">Statut</button>
        </div>
      </div>`;
  });
}

window.createEvent = async function() {
  const nom = document.getElementById('ev-nom').value.trim();
  const nom_complet = document.getElementById('ev-nom-complet').value.trim();
  const sport = document.getElementById('ev-sport').value;
  const date_debut = document.getElementById('ev-debut').value;
  const date_fin = document.getElementById('ev-fin').value;
  const errorDiv = document.getElementById('ev-error');

  if (!nom || !date_debut || !date_fin) {
    errorDiv.textContent = 'Merci de remplir tous les champs obligatoires.';
    errorDiv.style.display = 'block';
    return;
  }

  const { error } = await supabase.from('events').insert({
    nom, nom_complet, sport, date_debut, date_fin, statut: 'a_venir'
  });

  if (error) {
    errorDiv.textContent = 'Erreur : ' + error.message;
    errorDiv.style.display = 'block';
    return;
  }

  errorDiv.style.display = 'none';
  document.getElementById('ev-nom').value = '';
  document.getElementById('ev-nom-complet').value = '';
  document.getElementById('ev-debut').value = '';
  document.getElementById('ev-fin').value = '';
  loadEvents();
  loadEventSelects();
}

window.changeStatut = async function(id, current) {
  const statuts = ['a_venir', 'en_cours', 'termine'];
  const labels = ['À venir', 'En cours', 'Terminé'];
  const next = statuts[(statuts.indexOf(current) + 1) % statuts.length];
  if (!confirm(`Passer le statut à "${labels[statuts.indexOf(next)]}" ?`)) return;
  await supabase.from('events').update({ statut: next }).eq('id', id);
  loadEvents();
}

// ========== RESULTATS ==========
async function loadEventSelects() {
  const { data: events } = await supabase
    .from('events')
    .select('*')
    .order('date_debut', { ascending: false });

  ['results-event-select', 'phases-event-select'].forEach(selectId => {
    const select = document.getElementById(selectId);
    if (!select) return;
    select.innerHTML = '<option value="">-- Choisir un évènement --</option>';
    events?.forEach(ev => {
      select.innerHTML += `<option value="${ev.id}">${ev.nom}</option>`;
    });
  });
}

window.loadMatchesToResult = async function() {
  const eventId = document.getElementById('results-event-select').value;
  const container = document.getElementById('matches-to-result');
  if (!eventId) { container.innerHTML = ''; return; }

  const { data: matches } = await supabase
    .from('matches')
    .select('*')
    .eq('event_id', eventId)
    .order('date_heure');

  if (!matches || matches.length === 0) {
    container.innerHTML = '<div style="font-size:13px; color:#4a7a9b;">Aucun match trouvé.</div>';
    return;
  }

  container.innerHTML = '';
  matches.forEach(m => {
    const isTermine = m.statut === 'termine';
    container.innerHTML += `
      <div class="card" style="margin-bottom:8px;">
        <div style="display:flex; justify-content:space-between; margin-bottom:8px;">
          <span style="font-size:11px; color:#4a7a9b;">${formatDate(m.date_heure)} · ${m.phase}</span>
          <span class="badge ${isTermine ? 'badge-done' : 'badge-live'}">${isTermine ? 'Terminé' : 'À saisir'}</span>
        </div>
        <div style="display:flex; align-items:center; gap:10px; margin-bottom:10px;">
          <span style="flex:1; font-size:13px; color:#fff;">${m.equipe_1}</span>
          <input type="number" min="0" id="s1-${m.id}" value="${m.score_final_1 ?? ''}" 
            style="width:40px; background:#0a1628; border:0.5px solid #1a3a5c; border-radius:6px; color:#fff; text-align:center; padding:4px;"/>
          <span style="color:#4a7a9b;">—</span>
          <input type="number" min="0" id="s2-${m.id}" value="${m.score_final_2 ?? ''}"
            style="width:40px; background:#0a1628; border:0.5px solid #1a3a5c; border-radius:6px; color:#fff; text-align:center; padding:4px;"/>
          <span style="flex:1; font-size:13px; color:#fff; text-align:right;">${m.equipe_2}</span>
        </div>
        <button class="btn-secondary" style="width:auto; padding:6px 14px;" 
          onclick="saveResult('${m.id}')">Enregistrer</button>
      </div>`;
  });
}

window.saveResult = async function(matchId) {
  const s1 = parseInt(document.getElementById('s1-' + matchId).value);
  const s2 = parseInt(document.getElementById('s2-' + matchId).value);

  if (isNaN(s1) || isNaN(s2)) {
    alert('Merci de saisir les deux scores.');
    return;
  }

  const { error } = await supabase.from('matches').update({
    score_final_1: s1,
    score_final_2: s2,
    statut: 'termine'
  }).eq('id', matchId);

  if (error) { alert('Erreur : ' + error.message); return; }

  await supabase.from('votes').update({ verrouille: true }).eq('match_id', matchId);

  alert('Résultat enregistré !');
  loadMatchesToResult();
}

// ========== PHASES ==========
window.loadPhases = async function() {
  const eventId = document.getElementById('phases-event-select').value;
  const container = document.getElementById('phases-list');
  if (!eventId) { container.innerHTML = ''; return; }

  const phases = ['Groupes', 'Huitièmes de finale', 'Quarts de finale', 'Demi-finales', 'Finale'];

  const { data: matches } = await supabase
    .from('matches')
    .select('phase')
    .eq('event_id', eventId);

  const phasesActives = [...new Set(matches?.map(m => m.phase) || [])];

  container.innerHTML = '';
  phases.forEach(phase => {
    const isActive = phasesActives.includes(phase);
    container.innerHTML += `
      <div style="display:flex; justify-content:space-between; align-items:center; 
        background:#0d1f3c; border:0.5px solid #1a3a5c; border-radius:8px; 
        padding:12px 16px; margin-bottom:8px;">
        <div>
          <div style="font-size:13px; color:#ccd6e0;">${phase}</div>
          <div style="font-size:11px; color:${isActive ? '#4ade80' : '#4a7a9b'}; margin-top:2px;">
            ${isActive ? 'Déverrouillée' : 'Verrouillée'}
          </div>
        </div>
        ${!isActive ? `<button class="btn-small" onclick="unlockPhase('${eventId}', '${phase}')">Déverrouiller</button>` : '<span class="badge badge-done">Active</span>'}
      </div>`;
  });
}

window.unlockPhase = async function(eventId, phase) {
  if (!confirm(`Déverrouiller la phase "${phase}" ?`)) return;
  window.location.href = `add-matches.html?event=${eventId}&phase=${encodeURIComponent(phase)}`;
}

// ========== UTILITAIRES ==========
function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
}
