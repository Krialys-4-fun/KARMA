export function renderNavbar(activePage) {
  const u = localStorage.getItem('karma_user');
  const user = u ? JSON.parse(u) : null;
  if (!user) { window.location.href = 'index.html'; return null; }

  const pages = [
    { id: 'home', label: 'Accueil', href: 'home.html' },
    { id: 'events', label: 'Évènements', href: 'events.html' },
    { id: 'historique', label: 'Historique', href: 'historique.html' },
    { id: 'faq', label: 'FAQ', href: 'faq.html' },
    { id: 'admin', label: 'Admin', href: 'admin.html', adminOnly: true },
  ];

  const links = pages
    .filter(p => !p.adminOnly || user.role === 'ADMIN')
    .map(p => `<a class="navbar-link ${p.id === activePage ? 'active' : ''}" href="${p.href}">${p.label}</a>`)
    .join('');

  const navHtml = `
    <nav class="navbar">
      <div class="navbar-logo"><span>K</span>ARMA</div>

      <!-- DESKTOP -->
      <div class="navbar-links" id="nav-desktop">${links}</div>

      <!-- USER + HAMBURGER -->
      <div class="navbar-user">
        <span class="mode-badge">${user.mode}</span>
        <div class="avatar" id="karma-avatar">${user.login.substring(0, 2).toUpperCase()}</div>
        <button class="hamburger" id="hamburger-btn" aria-label="Menu">
          <span></span><span></span><span></span>
        </button>
      </div>
    </nav>

    <!-- MENU MOBILE -->
    <div class="mobile-menu" id="mobile-menu">
      ${links}
      <div class="mobile-menu-footer">
        <span class="mode-badge">${user.mode}</span>
        <button onclick="karmaLogout()" class="btn-secondary" style="width:auto; padding:6px 14px; margin-top:0;">Déconnexion</button>
      </div>
    </div>`;

  const container = document.getElementById('navbar-container');
  if (container) {
    container.innerHTML = navHtml;
  } else {
    document.body.insertAdjacentHTML('afterbegin', navHtml);
  }

  // Logout avatar desktop
  document.getElementById('karma-avatar').onclick = () => {
    localStorage.removeItem('karma_user');
    window.location.href = 'index.html';
  };

  // Hamburger toggle
  document.getElementById('hamburger-btn').onclick = () => {
    const menu = document.getElementById('mobile-menu');
    menu.classList.toggle('open');
    document.getElementById('hamburger-btn').classList.toggle('open');
  };

  // Fermer le menu si on clique ailleurs
  document.addEventListener('click', (e) => {
    const menu = document.getElementById('mobile-menu');
    const btn = document.getElementById('hamburger-btn');
    if (menu && !menu.contains(e.target) && !btn.contains(e.target)) {
      menu.classList.remove('open');
      btn.classList.remove('open');
    }
  });

  window.karmaLogout = () => {
    localStorage.removeItem('karma_user');
    window.location.href = 'index.html';
  };

  return user;
}
