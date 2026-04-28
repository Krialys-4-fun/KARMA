import { supabase } from './supabase.js';

// ========== BCRYPT VIA CDN ==========
async function hashPassword(password) {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hash = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hash));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// ========== CONNEXION ==========
window.handleLogin = async function () {
  const login = document.getElementById('login').value.trim();
  const password = document.getElementById('password').value.trim();

  if (!login || !password) {
    showError('Merci de remplir tous les champs.');
    return;
  }

  const { data: users, error } = await supabase
    .from('users')
    .select('*')
    .eq('login', login)
    .eq('actif', true);

  if (error || !users || users.length === 0) {
    showError('Login ou mot de passe incorrect.');
    return;
  }

  const user = users[0];

  // Vérification — supporte les deux formats (clair et hashé)
  const hashedInput = await hashPassword(password);
  const isValid = user.mot_de_passe === password || user.mot_de_passe === hashedInput;

  if (!isValid) {
    showError('Login ou mot de passe incorrect.');
    return;
  }

  // Si mot de passe encore en clair, on le hashe automatiquement
  if (user.mot_de_passe === password) {
    await supabase.from('users').update({ mot_de_passe: hashedInput }).eq('id', user.id);
  }

  localStorage.setItem('karma_user', JSON.stringify({
    id: user.id,
    login: user.login,
    role: user.role,
    mode: user.mode
  }));

  if (user.role === 'ADMIN') {
    window.location.href = 'admin.html';
  } else {
    if (user.mode_modifiable) {
      window.location.href = 'onboarding.html';
    } else {
      window.location.href = 'home.html';
    }
  }
}

// ========== DÉCONNEXION ==========
window.handleLogout = function () {
  localStorage.removeItem('karma_user');
  window.location.href = 'index.html';
}

// ========== UTILITAIRES ==========
window.getUser = function () {
  const u = localStorage.getItem('karma_user');
  return u ? JSON.parse(u) : null;
}

window.requireAuth = function () {
  const user = window.getUser();
  if (!user) window.location.href = 'index.html';
  return user;
}

window.requireAdmin = function () {
  const user = window.getUser();
  if (!user || user.role !== 'ADMIN') window.location.href = 'home.html';
  return user;
}

function showError(msg) {
  const errorDiv = document.getElementById('login-error');
  if (errorDiv) {
    errorDiv.textContent = msg;
    errorDiv.style.display = 'block';
  }
}

// Attache le bouton de login
const loginBtn = document.getElementById('login-btn');
if (loginBtn) {
  loginBtn.addEventListener('click', window.handleLogin);
}
