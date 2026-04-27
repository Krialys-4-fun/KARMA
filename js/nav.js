import { supabase } from './supabase.js';

export function initNav() {
  const u = localStorage.getItem('karma_user');
  const user = u ? JSON.parse(u) : null;
  if (!user) { window.location.href = 'login.html'; return null; }

  // Mode badge
  const modeBadge = document.getElementById('mode-badge');
  if (modeBadge) modeBadge.textContent = user.mode;

  // Avatar
  const avatar = document.getElementById('avatar');
  if (avatar) {
    avatar.textContent = user.login.substring(0, 2).toUpperCase();
    avatar.onclick = () => {
      localStorage.removeItem('karma_user');
      window.location.href = 'login.html';
    };
  }

  // Lien Admin
  const adminLink = document.getElementById('admin-link');
  if (adminLink && user.role === 'ADMIN') {
    adminLink.style.display = 'block';
  }

  return user;
}
