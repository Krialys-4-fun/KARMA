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

// ========== BUILD HTML (partagé entre modal et page dédiée) ==========
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

  // ── CALCUL MATCHS ÉLIM ──
  const matchesElim = PHASES_ELIM.map(phase => ({
    phase,
    matchs: matchesTermines.filter(m => m.phase === phase),
  })).filter(p => p.matchs.length > 0);

  // ── BUILD HTML ──
  const tdS = 'style="padding:6px 8px; font-size:12px; border-bottom:0.5px solid #1a3a5c;"';
  const thS = 'style="padding:6px 8px; font-size:11px; color:#4a7a9b; text-align:left; border-bottom:0.5px solid #1a3a5c;"';
  
  // Groupes HTML
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
              <th ${thS} style="width:20px;">#</th>
              <th ${thS}>Équipe</th>
              <th ${thS} style="width:22px; text-align:center;">J</th>
              <th ${thS} style="width:22px; text-align:center;">V</th>
              <th ${thS} style="width:22px; text-align:center;">N</th>
              <th ${thS} style="width:22px; text-align:center;">D</th>
              <th ${thS} style="width:34px; text-align:center;">Diff</th>
              <th ${thS} style="width:28px; text-align:center; color:#f97316;">Pts</th>
            </tr>
          </thead>
          
          <tbody>
            ${rows.map((r, i) => `
              <tr style="${i < 2 ? 'background:rgba(56,189,248,0.07);' : ''}">
                <td ${tdS} style="color:#4a7a9b;">${i + 1}</td>
                <td ${tdS} style="white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${flagUrl(r.eq)}${r.eq}</td>
                <td ${tdS} style="text-align:center; color:#aac0d4;">${r.joues}</td>
                <td ${tdS} style="text-align:center; color:#4ade80;">${r.v}</td>
                <td ${tdS} style="text-align:center; color:#aac0d4;">${r.n}</td>
                <td ${tdS} style="text-align:center; color:#f87171;">${r.d}</td>
                <td ${tdS} style="text-align:center; color:#aac0d4;">${r.diff >= 0 ? '+' : ''}${r.diff}</td>
                <td ${tdS} style="text-align:center; color:#f97316; font-weight:700;">${r.pts}</td>
              </tr>`).join('')}
          </tbody>
        </table>
      </div>`;
  }

  // Élim HTML
  let elimHtml = '';
  if (matchesElim.length === 0) {
    elimHtml = '<div style="font-size:13px; color:#4a7a9b; text-align:center; padding:20px;">Les phases éliminatoires ne sont pas encore commencées.</div>';
  } else {
    for (const { phase, matchs } of matchesElim) {
      elimHtml += `
        <div style="margin-bottom:20px;">
          <div style="font-size:12px; font-weight:700; color:#f97316; margin-bottom:8px;">${phase}</div>
          ${matchs.map(m => {
            const gagnant = m.score_final_1 > m.score_final_2 ? m.equipe_1
              : m.score_final_1 < m.score_final_2 ? m.equipe_2 : null;
            return `
              <div style="display:flex; align-items:center; gap:8px; padding:8px 0; border-bottom:0.5px solid #1a3a5c; font-size:12px;">
                <span style="flex:1; color:${gagnant === m.equipe_1 ? '#fff' : '#4a7a9b'}; font-weight:${gagnant === m.equipe_1 ? '600' : '400'};">
                  ${flagUrl(m.equipe_1)}${m.equipe_1}
                </span>
                <span style="color:#f97316; font-weight:700; min-width:40px; text-align:center;">
                  ${m.score_final_1} — ${m.score_final_2}
                </span>
                <span style="flex:1; text-align:right; color:${gagnant === m.equipe_2 ? '#fff' : '#4a7a9b'}; font-weight:${gagnant === m.equipe_2 ? '600' : '400'};">
                  ${m.equipe_2}${flagUrl(m.equipe_2)}
                </span>
              </div>`;
          }).join('')}
        </div>`;
    }
  }

  return { groupesHtml, elimHtml };
}

// ========== MODAL (conservé pour compatibilité events.html) ==========
export async function openTableauModal(supabase, eventId) {
  const { groupesHtml, elimHtml } = await buildTableauHTML(supabase, eventId);

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
