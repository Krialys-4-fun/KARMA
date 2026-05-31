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

// ========== BRACKET PHASES ÉLIMINATOIRES ==========

// Structure fixe du bracket CdM 2026
// Basée sur l'image fournie : 16 seizièmes → 8 huitièmes → 4 quarts → 2 demis → finale + 3e place
const BRACKET_STRUCTURE = {
  seiziemes: [
    { num: 74, date: '29 juin', heure: '22:30', label: 'N°74' },
    { num: 77, date: '30 juin', heure: '23:00', label: 'N°77' },
    { num: 73, date: '28 juin', heure: '21:00', label: 'N°73' },
    { num: 75, date: '30 juin', heure: '03:00', label: 'N°75' },
    { num: 83, date: '3 juil.', heure: '01:00', label: 'N°83' },
    { num: 84, date: '2 juil.', heure: '21:00', label: 'N°84' },
    { num: 81, date: '2 juil.', heure: '02:00', label: 'N°81' },
    { num: 82, date: '1 juil.', heure: '22:00', label: 'N°82' },
    { num: 76, date: '29 juin', heure: '19:00', label: 'N°76' },
    { num: 78, date: '30 juin', heure: '19:00', label: 'N°78' },
    { num: 79, date: '1 juil.', heure: '03:00', label: 'N°79' },
    { num: 80, date: '1 juil.', heure: '18:00', label: 'N°80' },
    { num: 86, date: '4 juil.', heure: '00:00', label: 'N°86' },
    { num: 88, date: '3 juil.', heure: '20:00', label: 'N°88' },
    { num: 85, date: '3 juil.', heure: '05:00', label: 'N°85' },
    { num: 87, date: '4 juil.', heure: '03:30', label: 'N°87' },
  ],
  huitiemes: [
    { num: 89, date: '4 juil.', heure: '23:00' },
    { num: 90, date: '4 juil.', heure: '19:00' },
    { num: 93, date: '6 juil.', heure: '21:00' },
    { num: 94, date: '7 juil.', heure: '02:00' },
    { num: 91, date: '5 juil.', heure: '22:00' },
    { num: 92, date: '6 juil.', heure: '02:00' },
    { num: 95, date: '7 juil.', heure: '18:00' },
    { num: 96, date: '7 juil.', heure: '22:00' },
  ],
  quarts: [
    { num: 97, date: '9 juil.', heure: '22:00' },
    { num: 98, date: '10 juil.', heure: '21:00' },
    { num: 99, date: '11 juil.', heure: '23:00' },
    { num: 100, date: '12 juil.', heure: '03:00' },
  ],
  demis: [
    { num: 101, date: '14 juil.', heure: '21:00' },
    { num: 102, date: '15 juil.', heure: '21:00' },
  ],
  troisieme: { num: 103, date: '18 juil.', heure: '23:00' },
  finale: { num: 104, date: '19 juil.', heure: '21:00' },
};

function buildMatchBox(matchNum, matchesMap, showDate = true) {
  const m = matchesMap[matchNum];
  const info = getAllBracketInfo(matchNum);
  const e1 = m ? m.equipe_1 : '?';
  const e2 = m ? m.equipe_2 : '?';
  const score = m && m.statut === 'termine' ? `${m.score_final_1}–${m.score_final_2}` : null;
  const gagnant = score ? (m.score_final_1 > m.score_final_2 ? e1 : m.score_final_1 < m.score_final_2 ? e2 : null) : null;

  const dateStr = info ? `${info.date} ${info.heure}` : '';

  return `
    <div class="bk-match" data-num="${matchNum}">
      ${showDate && dateStr ? `<div class="bk-match-date">${dateStr}</div>` : ''}
      <div class="bk-team ${gagnant === e1 ? 'winner' : gagnant ? 'loser' : ''}">
        ${e1 !== '?' ? `<img src="https://flagcdn.com/16x12/${getFlagCode(e1)}.png" onerror="this.style.display='none'" style="vertical-align:middle;margin-right:4px;">` : ''}
        <span>${e1}</span>
        ${score ? `<span class="bk-score">${m.score_final_1}</span>` : ''}
      </div>
      <div class="bk-team ${gagnant === e2 ? 'winner' : gagnant ? 'loser' : ''}">
        ${e2 !== '?' ? `<img src="https://flagcdn.com/16x12/${getFlagCode(e2)}.png" onerror="this.style.display='none'" style="vertical-align:middle;margin-right:4px;">` : ''}
        <span>${e2}</span>
        ${score ? `<span class="bk-score">${m.score_final_2}</span>` : ''}
      </div>
    </div>`;
}

function getAllBracketInfo(num) {
  const all = [
    ...BRACKET_STRUCTURE.seiziemes,
    ...BRACKET_STRUCTURE.huitiemes,
    ...BRACKET_STRUCTURE.quarts,
    ...BRACKET_STRUCTURE.demis,
    BRACKET_STRUCTURE.troisieme,
    BRACKET_STRUCTURE.finale,
  ];
  return all.find(x => x.num === num) || null;
}

function getFlagCode(equipe) {
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
  return codes[equipe] || '';
}

export async function buildBracketHTML(supabase, eventId) {
  const PHASES = ['Seizièmes de finale', 'Huitièmes de finale', 'Quarts de finale', 'Demi-finales', 'Petite finale', 'Finale'];
  const { data: matches } = await supabase
    .from('matches').select('*').eq('event_id', eventId)
    .in('phase', PHASES);

  // Map par numéro de match (on utilise l'ordre d'import par phase)
  // Comme on n'a pas de numéro de match en base, on mappe par ordre de la structure
  const byPhase = {};
  PHASES.forEach(p => { byPhase[p] = []; });
  (matches || []).forEach(m => { if (byPhase[m.phase]) byPhase[m.phase].push(m); });
  // Trier par date
  PHASES.forEach(p => { byPhase[p].sort((a, b) => new Date(a.date_heure) - new Date(b.date_heure)); });

  // Construire la map num → match
  const matchesMap = {};
  const assign = (nums, phase) => {
    nums.forEach((num, i) => {
      if (byPhase[phase] && byPhase[phase][i]) matchesMap[num] = byPhase[phase][i];
    });
  };
  assign(BRACKET_STRUCTURE.seiziemes.map(x => x.num), 'Seizièmes de finale');
  assign(BRACKET_STRUCTURE.huitiemes.map(x => x.num), 'Huitièmes de finale');
  assign(BRACKET_STRUCTURE.quarts.map(x => x.num), 'Quarts de finale');
  assign(BRACKET_STRUCTURE.demis.map(x => x.num), 'Demi-finales');
  assign([BRACKET_STRUCTURE.troisieme.num], 'Petite finale');
  assign([BRACKET_STRUCTURE.finale.num], 'Finale');

  const mb = (num) => buildMatchBox(num, matchesMap);

  // CSS bracket
  const css = `
    <style>
      .bracket-wrapper { overflow-x: auto; padding-bottom: 16px; }
      .bracket { display: flex; gap: 0; align-items: stretch; min-width: 900px; }
      .bk-col { display: flex; flex-direction: column; justify-content: space-around; flex: 1; padding: 0 4px; }
      .bk-col-title { font-size: 11px; font-weight: 700; color: #f97316; text-align: center; padding: 6px 0 10px; letter-spacing: 1px; text-transform: uppercase; }
      .bk-match { background: rgba(13,31,60,0.95); border: 0.5px solid #1a3a5c; border-radius: 8px; margin: 4px 0; overflow: hidden; }
      .bk-match-date { font-size: 10px; color: #4a7a9b; padding: 4px 8px 2px; border-bottom: 0.5px solid #0d1f3c; }
      .bk-team { display: flex; align-items: center; padding: 5px 8px; font-size: 11px; color: #ccd6e0; border-bottom: 0.5px solid #0d1f3c; justify-content: space-between; }
      .bk-team:last-child { border-bottom: none; }
      .bk-team.winner { color: #4ade80; font-weight: 700; }
      .bk-team.loser { color: #4a7a9b; }
      .bk-team span:first-child { flex: 1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
      .bk-score { font-weight: 700; color: #f97316; margin-left: 6px; min-width: 14px; text-align: right; }
      .bk-center { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 12px; flex: 1; padding: 0 4px; }
      .bk-finale-title { font-size: 13px; font-weight: 700; color: #f97316; text-align: center; margin-bottom: 4px; }
      .bk-3place-title { font-size: 11px; font-weight: 600; color: #4a7a9b; text-align: center; margin-bottom: 4px; }
      .bk-spacer { flex: 1; }
    </style>`;

  // Gauche : S73,S74 → H89 | S75,S77 → H90 | S83,S84 → H93 | S81,S82 → H94
  // Droite : S76,S78 → H91 | S79,S80 → H92 | S86,S88 → H95 | S85,S87 → H96
  // Quarts G : H89,H90 → Q97 | H93,H94 → Q98
  // Quarts D : H91,H92 → Q99 | H95,H96 → Q100
  // Demis : Q97,Q98 → D101 | Q99,Q100 → D102
  // Finale : D101,D102 → F104 | 3e place : P101,P102 → T103

  const html = `
    ${css}
    <div class="bracket-wrapper">
      <div class="bracket">

        <!-- COL 1 : Seizièmes gauche (8 matchs) -->
        <div class="bk-col">
          <div class="bk-col-title">Seizièmes</div>
          ${mb(74)}
          ${mb(77)}
          <div class="bk-spacer"></div>
          ${mb(73)}
          ${mb(75)}
          <div class="bk-spacer"></div>
          ${mb(83)}
          ${mb(84)}
          <div class="bk-spacer"></div>
          ${mb(81)}
          ${mb(82)}
        </div>

        <!-- COL 2 : Huitièmes gauche (4 matchs) -->
        <div class="bk-col">
          <div class="bk-col-title">Huitièmes</div>
          <div class="bk-spacer"></div>
          ${mb(89)}
          <div class="bk-spacer"></div>
          ${mb(90)}
          <div class="bk-spacer"></div>
          ${mb(93)}
          <div class="bk-spacer"></div>
          ${mb(94)}
          <div class="bk-spacer"></div>
        </div>

        <!-- COL 3 : Quarts gauche (2 matchs) -->
        <div class="bk-col">
          <div class="bk-col-title">Quarts</div>
          <div class="bk-spacer"></div>
          ${mb(97)}
          <div class="bk-spacer"></div>
          <div class="bk-spacer"></div>
          ${mb(98)}
          <div class="bk-spacer"></div>
        </div>

        <!-- COL 4 : Demi gauche -->
        <div class="bk-col">
          <div class="bk-col-title">Demis</div>
          <div class="bk-spacer"></div>
          <div class="bk-spacer"></div>
          ${mb(101)}
          <div class="bk-spacer"></div>
          <div class="bk-spacer"></div>
        </div>

        <!-- COL 5 : Centre Finale + 3e place -->
        <div class="bk-center">
          <div class="bk-col-title" style="color:#f97316;">🏆 Finale</div>
          ${mb(104)}
          <div style="margin-top:16px;">
            <div class="bk-3place-title">🥉 3e place</div>
            ${mb(103)}
          </div>
        </div>

        <!-- COL 6 : Demi droite -->
        <div class="bk-col">
          <div class="bk-col-title">Demis</div>
          <div class="bk-spacer"></div>
          <div class="bk-spacer"></div>
          ${mb(102)}
          <div class="bk-spacer"></div>
          <div class="bk-spacer"></div>
        </div>

        <!-- COL 7 : Quarts droite (2 matchs) -->
        <div class="bk-col">
          <div class="bk-col-title">Quarts</div>
          <div class="bk-spacer"></div>
          ${mb(99)}
          <div class="bk-spacer"></div>
          <div class="bk-spacer"></div>
          ${mb(100)}
          <div class="bk-spacer"></div>
        </div>

        <!-- COL 8 : Huitièmes droite (4 matchs) -->
        <div class="bk-col">
          <div class="bk-col-title">Huitièmes</div>
          <div class="bk-spacer"></div>
          ${mb(91)}
          <div class="bk-spacer"></div>
          ${mb(92)}
          <div class="bk-spacer"></div>
          ${mb(95)}
          <div class="bk-spacer"></div>
          ${mb(96)}
          <div class="bk-spacer"></div>
        </div>

        <!-- COL 9 : Seizièmes droite (8 matchs) -->
        <div class="bk-col">
          <div class="bk-col-title">Seizièmes</div>
          ${mb(76)}
          ${mb(78)}
          <div class="bk-spacer"></div>
          ${mb(79)}
          ${mb(80)}
          <div class="bk-spacer"></div>
          ${mb(86)}
          ${mb(88)}
          <div class="bk-spacer"></div>
          ${mb(85)}
          ${mb(87)}
        </div>

      </div>
    </div>
    <div style="font-size:11px; color:#4a7a9b; text-align:center; margin-top:8px;">
      Les équipes et résultats s'affichent au fur et à mesure de la compétition
    </div>`;

  return html;
}
