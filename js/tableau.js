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


export async function buildBracketHTML(supabase, eventId) {
  const PHASES = ['Seizièmes de finale','Huitièmes de finale','Quarts de finale','Demi-finales','Petite finale','Finale'];
  const { data: matches } = await supabase.from('matches').select('*').eq('event_id', eventId).in('phase', PHASES);

  const byPhase = {};
  PHASES.forEach(p => { byPhase[p] = []; });
  (matches || []).forEach(m => { if (byPhase[m.phase]) byPhase[m.phase].push(m); });
  PHASES.forEach(p => { byPhase[p].sort((a,b) => new Date(a.date_heure)-new Date(b.date_heure)); });

  function fmt(dateStr) {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString('fr-FR',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit',timeZone:'Europe/Paris'});
  }

  function flag(eq) {
    const codes = {
      'Mexique':'mx','Afrique du Sud':'za','République de Corée':'kr','Tchéquie':'cz',
      'Canada':'ca','Bosnie-et-Herzégovine':'ba','Qatar':'qa','Suisse':'ch',
      'Brésil':'br','Maroc':'ma','Haïti':'ht','Écosse':'gb-sct',
      'États-Unis':'us','Paraguay':'py','Australie':'au','Turquie':'tr',
      'Allemagne':'de','Curaçao':'cw',"Côte d\'Ivoire":'ci','Équateur':'ec',
      'Pays-Bas':'nl','Japon':'jp','Suède':'se','Tunisie':'tn',
      'Belgique':'be','Égypte':'eg','RI Iran':'ir','Nouvelle-Zélande':'nz',
      'Espagne':'es','Cap-Vert':'cv','Arabie saoudite':'sa','Uruguay':'uy',
      'France':'fr','Sénégal':'sn','Irak':'iq','Norvège':'no',
      'Argentine':'ar','Algérie':'dz','Autriche':'at','Jordanie':'jo',
      'Portugal':'pt','RD Congo':'cd','Ghana':'gh','Panamá':'pa',
      'Angleterre':'gb-eng','Croatie':'hr','Ouzbékistan':'uz','Colombie':'co',
    };
    const c = codes[eq];
    return c ? `<img src="https://flagcdn.com/16x12/${c}.png" style="margin-right:3px;vertical-align:middle;">` : '';
  }

  function card(m, date, l1, l2) {
    const e1 = m?.equipe_1 || null;
    const e2 = m?.equipe_2 || null;
    const done = m?.statut === 'termine';
    const w = done ? (m.score_final_1>m.score_final_2 ? e1 : m.score_final_1<m.score_final_2 ? e2 : null) : null;
    const d = m ? fmt(m.date_heure) : date;
    const row = (eq, lbl, sc, isW, isL) => `<div style="display:flex;align-items:center;padding:4px 7px;font-size:11px;border-bottom:0.5px solid #0d1f3c;color:${isW?'#4ade80':isL?'#4a7a9b':'#ccd6e0'};font-weight:${isW?700:400};">
      ${eq ? flag(eq)+`<span style="flex:1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${eq}</span>` : `<span style="flex:1;color:#4a7a9b;font-style:italic;font-size:10px;">${lbl}</span>`}
      ${sc!=null?`<span style="color:#f97316;font-weight:700;margin-left:4px;">${sc}</span>`:''}
    </div>`;
    return `<div style="background:rgba(13,31,60,0.95);border:0.5px solid #1a3a5c;border-radius:6px;overflow:hidden;">
      <div style="font-size:9px;color:#4a7a9b;padding:2px 6px;background:rgba(0,0,0,0.25);">${d}</div>
      ${row(e1,l1,done?m.score_final_1:null,w===e1,w&&w!==e1)}
      ${row(e2,l2,done?m.score_final_2:null,w===e2,w&&w!==e2)}
    </div>`;
  }

  // Données structurelles
  const SEI = [(73, "28 juin 21:00", "2A", "2B"), (74, "29 juin 22:30", "1E", "3e ABCDF"), (77, "30 juin 23:00", "1I", "3e CDFGH"), (75, "30 juin 03:00", "1F", "2C"), (83, "3 juil. 01:00", "2K", "2L"), (84, "2 juil. 21:00", "1H", "2J"), (81, "2 juil. 02:00", "1D", "3e BEFIJ"), (82, "1 juil. 22:00", "1G", "3e AEHIJ"), (76, "29 juin 19:00", "1C", "3e AEFIJ"), (78, "30 juin 19:00", "2E", "3e BGHIJ"), (79, "1 juil. 03:00", "1A", "3e CEFHI"), (80, "1 juil. 18:00", "1L", "3e EHIJK"), (86, "4 juil. 00:00", "1J", "3e DEIKL"), (88, "3 juil. 20:00", "2D", "2G"), (85, "3 juil. 05:00", "1B", "3e EFGIJ"), (87, "4 juil. 03:30", "1K", "3e DEIJL")];
  const HUI = [(89, "4 juil. 23:00"), (90, "4 juil. 19:00"), (93, "6 juil. 21:00"), (94, "7 juil. 02:00"), (91, "5 juil. 22:00"), (92, "6 juil. 02:00"), (95, "7 juil. 18:00"), (96, "7 juil. 22:00")];
  const QUA = [(97, "9 juil. 22:00"), (98, "10 juil. 21:00"), (99, "11 juil. 23:00"), (100, "12 juil. 03:00")];
  const DEM = [(101, "14 juil. 21:00"), (102, "15 juil. 21:00")];

  // Centres de positionnement (en row-units de 3px chacune)
  const seiC = [3, 6, 9, 12, 15, 18, 21, 24, 27, 30, 33, 36, 39, 42, 45, 48];
  const huiC = [4, 10, 16, 22, 28, 34, 40, 46];
  const quaC = [7, 19, 31, 43];
  const demC = [13, 37];
  const finC = 25;
  const tplC = 28;
  const TOTAL_ROWS = 52;

  // Construire les cellules
  function cell(col, center, content) {
    return `<div style="grid-column:${col};grid-row:${center-1}/${center+2};display:flex;align-items:center;">${content}</div>`;
  }

  // Connecteurs horizontaux entre les colonnes
  function connector(col, c1, c2) {
    const top = Math.min(c1,c2);
    const bot = Math.max(c1,c2);
    const mid = Math.round((c1+c2)/2);
    return `
      <!-- ligne droite depuis c1 -->
      <div style="grid-column:${col};grid-row:${c1-1}/${c1+2};border-right:1px solid #2a4a6c;align-self:center;height:50%;"></div>
      <!-- ligne droite depuis c2 -->
      <div style="grid-column:${col};grid-row:${c2-1}/${c2+2};border-right:1px solid #2a4a6c;align-self:center;height:50%;"></div>
      <!-- ligne verticale reliant -->
      <div style="grid-column:${col};grid-row:${top}/${bot+1};border-right:1px solid #2a4a6c;justify-self:end;width:1px;"></div>
    `;
  }

  let cells = '';
  let conn = '';

  // Seizièmes
  SEI.forEach((s,i) => {
    const m = byPhase['Seizièmes de finale'][i] || null;
    cells += cell(1, seiC[i], card(m, s[1], s[2], s[3]));
  });

  // Huitièmes + connecteurs depuis seizièmes
  HUI.forEach((h,i) => {
    const m = byPhase['Huitièmes de finale'][i] || null;
    const l1 = `V N°${SEI[i*2][0]}`;
    const l2 = `V N°${SEI[i*2+1][0]}`;
    cells += cell(3, huiC[i], card(m, h[1], l1, l2));
  });

  // Quarts + connecteurs depuis huitièmes
  QUA.forEach((q,i) => {
    const m = byPhase['Quarts de finale'][i] || null;
    cells += cell(5, quaC[i], card(m, q[1], `V N°${HUI[i*2][0]}`, `V N°${HUI[i*2+1][0]}`));
  });

  // Demis
  DEM.forEach((d,i) => {
    const m = byPhase['Demi-finales'][i] || null;
    cells += cell(7, demC[i], card(m, d[1], `V N°${QUA[i*2][0]}`, `V N°${QUA[i*2+1][0]}`));
  });

  // Finale
  const mFin = byPhase['Finale'][0] || null;
  cells += cell(9, finC, card(mFin, '19 juil. 21:00', 'Vainqueur demi 1', 'Vainqueur demi 2'));

  // Petite finale
  const mTpl = byPhase['Petite finale'][0] || null;
  cells += cell(9, tplC, `<div><div style="font-size:10px;color:#4a7a9b;margin-bottom:4px;">🥉 Petite finale</div>${card(mTpl,'18 juil. 23:00','Perdant demi 1','Perdant demi 2')}</div>`);

  const css = `<style>
    .bk-wrap { overflow-x:auto; padding-bottom:16px; }
    .bk-grid {
      display:grid;
      grid-template-columns: 150px 16px 150px 16px 150px 16px 150px 16px 160px;
      grid-template-rows: repeat(${TOTAL_ROWS}, 14px);
      min-width: 820px;
    }
    .bk-header { font-size:11px;font-weight:700;color:#f97316;text-align:center;letter-spacing:1px;text-transform:uppercase;grid-row:1;padding-bottom:4px;align-self:end; }
  </style>`;

  const headers = `
    <div class="bk-header" style="grid-column:1;">Seizièmes</div>
    <div class="bk-header" style="grid-column:3;">Huitièmes</div>
    <div class="bk-header" style="grid-column:5;">Quarts</div>
    <div class="bk-header" style="grid-column:7;">Demi-finales</div>
    <div class="bk-header" style="grid-column:9;">Finale</div>
  `;

  return `${css}<div class="bk-wrap"><div class="bk-grid">${headers}${cells}</div></div>
    <div style="font-size:11px;color:#4a7a9b;text-align:center;margin-top:8px;">
      Les équipes s'affichent dès qu'elles sont qualifiées
    </div>`;
}
