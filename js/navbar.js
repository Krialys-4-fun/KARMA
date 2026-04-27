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

  const navbar = document.createElement('nav');
  navbar.className = 'navbar';
  navbar.innerHTML = `
    <div class="navbar-logo"><span>K</span>ARMA</div>
    <div class="navbar-links">${links}</div>
    <div class="navbar-user">
      <span class="mode-badge">${user.mode}</span>
      <div class="avatar" id="avatar">${user.login.substring(0, 2).toUpperCase()}</div>
    </div>`;

  document.body.insertBefore(navbar, document.body.firstChild);

  document.getElementById('avatar').onclick = () => {
    localStorage.removeItem('karma_user');
    window.location.href = 'index.html';
  };

  return user;
}
