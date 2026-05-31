// ========== MULTIPLICATEUR DE PHASE ==========
export function getPhaseMultiplier(phase) {
  if (!phase) return 1;
  const p = phase.toLowerCase();
  if (p.startsWith('groupe') || p.startsWith('poule')) return 1;
  if (p.includes('seizi')) return 1.5;
  if (p.includes('huiti')) return 1.5;
  if (p.includes('quart')) return 2;
  if (p.includes('demi')) return 3;
  if (p.includes('petite')) return 3;
  if (p.includes('finale')) return 4;
  return 1;
}

// ========== TABLEAU DE COMPÉTITION KARMA ==========

const GROUPES_FIFA = {
  'Groupe A': ['Mexique', 'Afrique du Sud', 'République de Corée', 'Tchéquie'],
  'Groupe B': ['Canada', 'Bosnie-et-Herzégovine', 'Qatar', 'Suisse'],
  'Groupe C': ['Brésil', 'Maroc', 'Haïti', 'Écosse'],
  'Groupe D': ['États-Unis', 'Paraguay', 'Australie', 'Turquie'],
  'Groupe E': ['Allemagne', 'Curaçao', "Côte d'Ivoire", 'Équateur'],
  'Groupe F': ['Pays-Bas', 'Japon', 'Suède', 'Tunisie'],
  'Groupe G': ['Belgique', 'Égypte', 'RI Iran', 'Nouvelle-Zélande'],
  'Groupe H': ['Espagne', 'Cap-Vert', 'Arabie saoudite', 'Uruguay'],
  'Groupe I': ['France', 'Sénégal', 'Irak', 'Norvège'],
  'Groupe J': ['Argentine', 'Algérie', 'Autriche', 'Jordanie'],
  'Groupe K': ['Portugal', 'RD Congo', 'Ghana', 'Panamá'],
  'Groupe L': ['Angleterre', 'Croatie', 'Ouzbékistan', 'Colombie'],
};

const PHASES_ELIM = [
  'Seizièmes de finale',
  'Huitièmes de finale',
  'Quarts de finale',
  'Demi-finales',
  'Petite finale',
  'Finale',
];

function flagUrl(equipe) {
  const codes = {
    'Mexique': 'mx', 'Afrique du Sud': 'za', 'République de Corée': 'kr', 'Tchéquie': 'cz',
    'Canada': 'ca', 'Bosnie-et-Herzégovine': 'ba', 'Qatar': 'qa', 'Suisse': 'ch',
    'Brésil': 'br', 'Maroc': 'ma', 'Haïti': 'ht', 'Écosse': 'gb-sct',
    'États-Unis': 'us', 'Paraguay': 'py', 'Australie': 'au', 'Turquie': 'tr',
    'Allemagne': 'de', 'Curaçao': 'cw', "Côte d'Ivoire": 'ci', 'Équateur': 'ec',
    'Pays-Bas': 'nl', 'Japon': 'jp', 'Suède': 'se', 'Tunisie': 'tn',
    'Belgique': 'be', 'Égypte': 'eg', 'RI Iran': 'ir', 'Nouvelle-Zélande': 'nz',
    'Espagne': 'es', 'Cap-Vert': 'cv', 'Arabie saoudite': 'sa', 'Uruguay': 'uy',
    'France': 'fr', 'Sénégal': 'sn', 'Irak': 'iq', 'Norvège': 'no',
    'Argentine': 'ar', 'Algérie': 'dz', 'Autriche': 'at', 'Jordanie': 'jo',
    'Portugal': 'pt', 'RD Congo': 'cd', 'Ghana': 'gh', 'Panamá': 'pa',
    'Angleterre': 'gb-eng', 'Croatie': 'hr', 'Ouzbékistan': 'uz', 'Colombie': 'co',
  };
  const code = codes[equipe];
  return code ? `<img src="https://flagcdn.com/16x12/${code}.png" style="margin-right:5px; vertical-align:middle;">` : '';
}

// ========== BUILD HTML GROUPES ==========
export async function buildTableauHTML(supabase, eventId) {
  const { data: matches } = await supabase
    .from('matches')
    .select('*')
    .eq('event_id', eventId)
    .eq('statut', 'termine');

  const matchesTermines = matches || [];

  // ── CALCUL CLASSEMENTS GROUPES ──
  const classements = {};
  for (const [groupe, equipes] of Object.entries(GROUPES_FIFA)) {
    classements[groupe] = {};
    for (const eq of equipes) {
      classements[groupe][eq] = { v: 0, n: 0, d: 0, bp: 0, bc: 0 };
    }
  }

  for (const m of matchesTermines) {
    if (!m.phase.startsWith('Groupe')) continue;
    const groupe = m.phase;
    if (!classements[groupe]) continue;
    const { equipe_1, equipe_2, score_final_1: s1, score_final_2: s2 } = m;
    if (!classements[groupe][equipe_1]) classements[groupe][equipe_1] = { v: 0, n: 0, d: 0, bp: 0, bc: 0 };
    if (!classements[groupe][equipe_2]) classements[groupe][equipe_2] = { v: 0, n: 0, d: 0, bp: 0, bc: 0 };
    classements[groupe][equipe_1].bp += s1;
    classements[groupe][equipe_1].bc += s2;
    classements[groupe][equipe_2].bp += s2;
    classements[groupe][equipe_2].bc += s1;
    if (s1 > s2) {
      classements[groupe][equipe_1].v++;
      classements[groupe][equipe_2].d++;
    } else if (s1 < s2) {
      classements[groupe][equipe_2].v++;
      classements[groupe][equipe_1].d++;
    } else {
      classements[groupe][equipe_1].n++;
      classements[groupe][equipe_2].n++;
    }
  }

  // ── BUILD HTML ──
  const tdS = (extra = '') => `style="padding:6px 8px; font-size:12px; border-bottom:0.5px solid #1a3a5c; ${extra}"`;
  const thS = (extra = '') => `style="padding:6px 8px; font-size:11px; color:#4a7a9b; text-align:left; border-bottom:0.5px solid #1a3a5c; ${extra}"`;

  let groupesHtml = '';
  for (const [groupe, equipes] of Object.entries(GROUPES_FIFA)) {
    const rows = equipes
      .map(eq => {
        const s = classements[groupe][eq] || { v: 0, n: 0, d: 0, bp: 0, bc: 0 };
        const joues = s.v + s.n + s.d;
        const pts = s.v * 3 + s.n;
        const diff = s.bp - s.bc;
        return { eq, joues, pts, diff, ...s };
      })
      .sort((a, b) => b.pts - a.pts || b.diff - a.diff || b.bp - a.bp);

    groupesHtml += `
      <div style="margin-bottom:20px;">
        <div style="font-size:12px; font-weight:700; color:#f97316; margin-bottom:8px;">${groupe}</div>
        <table style="width:100%; border-collapse:collapse; table-layout:fixed;">
          <thead>
            <tr>
              <th ${thS('width:20px;')}>#</th>
              <th ${thS('overflow:hidden; text-overflow:ellipsis; white-space:nowrap;')}>Équipe</th>
              <th ${thS('width:22px; text-align:center;')}>J</th>
              <th ${thS('width:22px; text-align:center;')}>V</th>
              <th ${thS('width:22px; text-align:center;')}>N</th>
              <th ${thS('width:22px; text-align:center;')}>D</th>
              <th ${thS('width:34px; text-align:center;')}>Diff</th>
              <th ${thS('width:28px; text-align:center; color:#f97316;')}>Pts</th>
            </tr>
          </thead>
          <tbody>
            ${rows.map((r, i) => `
              <tr style="${i < 2 ? 'background:rgba(56,189,248,0.07);' : ''}">
                <td ${tdS('color:#4a7a9b;')}>${i + 1}</td>
                <td ${tdS('overflow:hidden; text-overflow:ellipsis; white-space:nowrap;')}>${flagUrl(r.eq)}${r.eq}</td>
                <td ${tdS('text-align:center; color:#aac0d4;')}>${r.joues}</td>
                <td ${tdS('text-align:center; color:#4ade80;')}>${r.v}</td>
                <td ${tdS('text-align:center; color:#aac0d4;')}>${r.n}</td>
                <td ${tdS('text-align:center; color:#f87171;')}>${r.d}</td>
                <td ${tdS('text-align:center; color:#aac0d4;')}>${r.diff >= 0 ? '+' : ''}${r.diff}</td>
                <td ${tdS('text-align:center; color:#f97316; font-weight:700;')}>${r.pts}</td>
              </tr>`).join('')}
          </tbody>
        </table>
      </div>`;
  }

  return { groupesHtml };
}

// ========== BUILD HTML PHASES ÉLIMINATOIRES (liste verticale par phase) ==========

// Structure des seizièmes : qualifiés attendus par match
const SEIZIEMES = [
  { num: 73, date: '28 juin 21:00', eq1: '2A', eq2: '2B' },
  { num: 74, date: '29 juin 22:30', eq1: '1E', eq2: '3e ABCDF' },
  { num: 75, date: '30 juin 03:00', eq1: '1F', eq2: '2C' },
  { num: 76, date: '29 juin 19:00', eq1: '1C', eq2: '3e AEFIJ' },  
  { num: 77, date: '30 juin 23:00', eq1: '1I', eq2: '3e CDFGH' },
  { num: 78, date: '30 juin 19:00', eq1: '2E', eq2: '3e BGHIJ' },
  { num: 79, date: '1 juil. 03:00', eq1: '1A', eq2: '3e CEFHI' },
  { num: 80, date: '1 juil. 18:00', eq1: '1L', eq2: '3e EHIJK' },
  { num: 81, date: '2 juil. 02:00', eq1: '1D', eq2: '3e BEFIJ' },
  { num: 82, date: '1 juil. 22:00', eq1: '1G', eq2: '3e AEHIJ' },
  { num: 83, date: '3 juil. 01:00', eq1: '2K', eq2: '2L' },
  { num: 84, date: '2 juil. 21:00', eq1: '1H', eq2: '2J' },
  { num: 85, date: '3 juil. 05:00', eq1: '1B', eq2: '3e EFGIJ' },
  { num: 86, date: '4 juil. 00:00', eq1: '1J', eq2: '3e DEIKL' },
  { num: 87, date: '4 juil. 03:30', eq1: '1K', eq2: '3e DEIJL' },
  { num: 88, date: '3 juil. 20:00', eq1: '2D', eq2: '2G' },
];

const HUITIEMES = [
  { num: 89, date: '4 juil. 23:00' },
  { num: 90, date: '4 juil. 19:00' },
  { num: 91, date: '5 juil. 22:00' },
  { num: 92, date: '6 juil. 02:00' },
  { num: 93, date: '6 juil. 21:00' },
  { num: 94, date: '7 juil. 02:00' },
  { num: 95, date: '7 juil. 18:00' },
  { num: 96, date: '7 juil. 22:00' },
];

const QUARTS = [
  { num: 97, date: '9 juil. 22:00' },
  { num: 98, date: '10 juil. 21:00' },
  { num: 99, date: '11 juil. 23:00' },
  { num: 100, date: '12 juil. 03:00' },
];

const DEMIS = [
  { num: 101, date: '14 juil. 21:00' },
  { num: 102, date: '15 juil. 21:00' },
];

export async function buildBracketHTML(supabase, eventId) {
  const PHASES = ['Seizièmes de finale', 'Huitièmes de finale', 'Quarts de finale', 'Demi-finales', 'Petite finale', 'Finale'];
  const { data: matches } = await supabase
    .from('matches').select('*').eq('event_id', eventId)
    .in('phase', PHASES);

  // Trier par date et indexer par phase
  const byPhase = {};
  PHASES.forEach(p => { byPhase[p] = []; });
  (matches || []).forEach(m => { if (byPhase[m.phase]) byPhase[m.phase].push(m); });
  PHASES.forEach(p => { byPhase[p].sort((a, b) => new Date(a.date_heure) - new Date(b.date_heure)); });

  function formatDateHeure(dateStr) {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Paris' });
  }

  function matchCard(m, fallbackDate, eq1Label, eq2Label) {
    const e1 = m ? m.equipe_1 : null;
    const e2 = m ? m.equipe_2 : null;
    const termine = m && m.statut === 'termine';
    const gagnant = termine ? (m.score_final_1 > m.score_final_2 ? e1 : m.score_final_1 < m.score_final_2 ? e2 : null) : null;
    const date = m ? formatDateHeure(m.date_heure) : fallbackDate;

    const teamRow = (equipe, label, score, isWinner, isLoser) => `
      <div style="display:flex; align-items:center; padding:6px 10px; border-bottom:0.5px solid #0d1f3c;
        color:${isWinner ? '#4ade80' : isLoser ? '#4a7a9b' : '#ccd6e0'};
        font-weight:${isWinner ? '700' : '400'}; font-size:12px;">
        ${equipe ? `${flagUrl(equipe)}<span style="flex:1;">${equipe}</span>` : `<span style="flex:1; color:#4a7a9b; font-style:italic;">${label}</span>`}
        ${score !== null && score !== undefined ? `<span style="color:#f97316; font-weight:700; margin-left:8px;">${score}</span>` : ''}
      </div>`;

    return `
      <div style="background:rgba(13,31,60,0.95); border:0.5px solid #1a3a5c; border-radius:8px; margin-bottom:8px; overflow:hidden;">
        <div style="font-size:10px; color:#4a7a9b; padding:4px 10px; border-bottom:0.5px solid #1a3a5c;">${date}</div>
        ${teamRow(e1, eq1Label, termine ? m.score_final_1 : null, gagnant === e1, gagnant && gagnant !== e1)}
        ${teamRow(e2, eq2Label, termine ? m.score_final_2 : null, gagnant === e2, gagnant && gagnant !== e2)}
      </div>`;
  }

  function section(titre, icon, items, phaseKey, structure) {
    const ms = byPhase[phaseKey];
    let html = `<div style="margin-bottom:24px;">
      <div style="font-size:13px; font-weight:700; color:#f97316; margin-bottom:10px;">${icon} ${titre}</div>`;
    structure.forEach((info, i) => {
      const m = ms[i] || null;
      const eq1 = info.eq1 || `V${info.num - (structure.length)}`;
      const eq2 = info.eq2 || `V${info.num - (structure.length) + 1}`;
      html += matchCard(m, info.date, eq1, eq2);
    });
    html += `</div>`;
    return html;
  }

  // Seizièmes
  let html = section('Seizièmes de finale', '⚔️', SEIZIEMES, 'Seizièmes de finale', SEIZIEMES);

  // Huitièmes
  html += `<div style="margin-bottom:24px;">
    <div style="font-size:13px; font-weight:700; color:#f97316; margin-bottom:10px;">🔥 Huitièmes de finale</div>`;
  HUITIEMES.forEach((info, i) => {
    const m = byPhase['Huitièmes de finale'][i] || null;
    html += matchCard(m, info.date, `V match ${SEIZIEMES[i*2]?.num || '?'}`, `V match ${SEIZIEMES[i*2+1]?.num || '?'}`);
  });
  html += `</div>`;

  // Quarts
  html += `<div style="margin-bottom:24px;">
    <div style="font-size:13px; font-weight:700; color:#f97316; margin-bottom:10px;">⚡ Quarts de finale</div>`;
  QUARTS.forEach((info, i) => {
    const m = byPhase['Quarts de finale'][i] || null;
    html += matchCard(m, info.date, `V match ${HUITIEMES[i*2]?.num || '?'}`, `V match ${HUITIEMES[i*2+1]?.num || '?'}`);
  });
  html += `</div>`;

  // Demis
  html += `<div style="margin-bottom:24px;">
    <div style="font-size:13px; font-weight:700; color:#f97316; margin-bottom:10px;">🌟 Demi-finales</div>`;
  DEMIS.forEach((info, i) => {
    const m = byPhase['Demi-finales'][i] || null;
    html += matchCard(m, info.date, `V match ${QUARTS[i*2]?.num || '?'}`, `V match ${QUARTS[i*2+1]?.num || '?'}`);
  });
  html += `</div>`;

  // Petite finale
  html += `<div style="margin-bottom:24px;">
    <div style="font-size:13px; font-weight:700; color:#4a7a9b; margin-bottom:10px;">🥉 Petite finale — 18 juil. 23:00</div>`;
  html += matchCard(byPhase['Petite finale'][0] || null, '18 juil. 23:00', 'Perdant demi 1', 'Perdant demi 2');
  html += `</div>`;

  // Finale
  html += `<div style="margin-bottom:24px;">
    <div style="font-size:13px; font-weight:700; color:#f97316; margin-bottom:10px;">🏆 Finale — 19 juil. 21:00</div>`;
  html += matchCard(byPhase['Finale'][0] || null, '19 juil. 21:00', 'Vainqueur demi 1', 'Vainqueur demi 2');
  html += `</div>`;

  return html;
}

// ========== MODAL (conservé pour compatibilité events.html) ==========
export async function openTableauModal(supabase, eventId) {
  const { groupesHtml } = await buildTableauHTML(supabase, eventId);
  const elimHtml = await buildBracketHTML(supabase, eventId);

  document.getElementById('karma-tableau-modal')?.remove();

  const modal = document.createElement('div');
  modal.id = 'karma-tableau-modal';
  modal.style.cssText = `
    position:fixed; inset:0; z-index:9999;
    background:rgba(0,0,0,0.75);
    display:flex; align-items:flex-start; justify-content:center;
    padding:20px; overflow-y:auto;
  `;

  modal.innerHTML = `
    <div style="
      background:#0d1f3c; border:0.5px solid #1a3a5c; border-radius:14px;
      width:100%; max-width:680px; padding:24px; position:relative;
      margin:auto;
    ">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px;">
        <div style="font-size:16px; font-weight:700; color:#fff;">🏆 Tableau de la compétition</div>
        <button onclick="document.getElementById('karma-tableau-modal').remove()"
          style="background:none; border:none; color:#4a7a9b; font-size:20px; cursor:pointer; line-height:1;">✕</button>
      </div>
      <div style="display:flex; gap:8px; margin-bottom:20px;">
        <button id="tab-groupes" onclick="switchTab('groupes')"
          style="flex:1; padding:8px; border-radius:8px; border:0.5px solid #1a3a5c;
          background:#f97316; color:#fff; font-size:13px; font-weight:600; cursor:pointer;">
          Phase de groupes
        </button>
        <button id="tab-elim" onclick="switchTab('elim')"
          style="flex:1; padding:8px; border-radius:8px; border:0.5px solid #1a3a5c;
          background:#0a1628; color:#4a7a9b; font-size:13px; font-weight:600; cursor:pointer;">
          Phases éliminatoires
        </button>
      </div>
      <div id="tab-content-groupes">${groupesHtml}</div>
      <div id="tab-content-elim" style="display:none;">${elimHtml}</div>
      <div style="font-size:11px; color:#4a7a9b; margin-top:12px; text-align:center;">
        Les 2 premiers de chaque groupe sont qualifiés (surlignés en bleu)
      </div>
    </div>`;

  document.body.appendChild(modal);
  modal.addEventListener('click', e => { if (e.target === modal) modal.remove(); });

  window.switchTab = function(tab) {
    document.getElementById('tab-content-groupes').style.display = tab === 'groupes' ? 'block' : 'none';
    document.getElementById('tab-content-elim').style.display = tab === 'elim' ? 'block' : 'none';
    document.getElementById('tab-groupes').style.background = tab === 'groupes' ? '#f97316' : '#0a1628';
    document.getElementById('tab-groupes').style.color = tab === 'groupes' ? '#fff' : '#4a7a9b';
    document.getElementById('tab-elim').style.background = tab === 'elim' ? '#f97316' : '#0a1628';
    document.getElementById('tab-elim').style.color = tab === 'elim' ? '#fff' : '#4a7a9b';
  };
}
