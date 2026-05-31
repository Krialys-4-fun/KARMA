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

// ========== DRAPEAUX ==========
const FLAG_CODES = {
  'Mexique':'mx','Afrique du Sud':'za','République de Corée':'kr','Tchéquie':'cz',
  'Canada':'ca','Bosnie-et-Herzégovine':'ba','Qatar':'qa','Suisse':'ch',
  'Brésil':'br','Maroc':'ma','Haïti':'ht','Écosse':'gb-sct',
  'États-Unis':'us','Paraguay':'py','Australie':'au','Turquie':'tr',
  'Allemagne':'de','Curaçao':'cw',"Côte d'Ivoire":'ci','Équateur':'ec',
  'Pays-Bas':'nl','Japon':'jp','Suède':'se','Tunisie':'tn',
  'Belgique':'be','Égypte':'eg','RI Iran':'ir','Nouvelle-Zélande':'nz',
  'Espagne':'es','Cap-Vert':'cv','Arabie saoudite':'sa','Uruguay':'uy',
  'France':'fr','Sénégal':'sn','Irak':'iq','Norvège':'no',
  'Argentine':'ar','Algérie':'dz','Autriche':'at','Jordanie':'jo',
  'Portugal':'pt','RD Congo':'cd','Ghana':'gh','Panamá':'pa',
  'Angleterre':'gb-eng','Croatie':'hr','Ouzbékistan':'uz','Colombie':'co',
};

function flagUrl(equipe) {
  const c = FLAG_CODES[equipe];
  return c ? `<img src="https://flagcdn.com/16x12/${c}.png" style="margin-right:5px;vertical-align:middle;">` : '';
}

// ========== GROUPES ==========
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

export async function buildTableauHTML(supabase, eventId) {
  const { data: matches } = await supabase
    .from('matches').select('*').eq('event_id', eventId).eq('statut', 'termine');
  const matchesTermines = matches || [];

  const classements = {};
  for (const [groupe, equipes] of Object.entries(GROUPES_FIFA)) {
    classements[groupe] = {};
    for (const eq of equipes) classements[groupe][eq] = { v:0, n:0, d:0, bp:0, bc:0 };
  }
  for (const m of matchesTermines) {
    if (!m.phase.startsWith('Groupe')) continue;
    const g = m.phase;
    if (!classements[g]) continue;
    const { equipe_1: e1, equipe_2: e2, score_final_1: s1, score_final_2: s2 } = m;
    if (!classements[g][e1]) classements[g][e1] = { v:0, n:0, d:0, bp:0, bc:0 };
    if (!classements[g][e2]) classements[g][e2] = { v:0, n:0, d:0, bp:0, bc:0 };
    classements[g][e1].bp += s1; classements[g][e1].bc += s2;
    classements[g][e2].bp += s2; classements[g][e2].bc += s1;
    if (s1 > s2) { classements[g][e1].v++; classements[g][e2].d++; }
    else if (s1 < s2) { classements[g][e2].v++; classements[g][e1].d++; }
    else { classements[g][e1].n++; classements[g][e2].n++; }
  }

  // Style helpers — UNE seule déclaration style par élément
  const th = (w, extra='') => `style="padding:6px 8px;font-size:11px;color:#4a7a9b;text-align:left;border-bottom:0.5px solid #1a3a5c;${w?`width:${w};`:''}${extra}"`;
  const td = (extra='') => `style="padding:6px 8px;font-size:12px;border-bottom:0.5px solid #1a3a5c;${extra}"`;

  let groupesHtml = '';
  for (const [groupe, equipes] of Object.entries(GROUPES_FIFA)) {
    const rows = equipes.map(eq => {
      const s = classements[groupe][eq] || { v:0, n:0, d:0, bp:0, bc:0 };
      return { eq, joues: s.v+s.n+s.d, pts: s.v*3+s.n, diff: s.bp-s.bc, ...s };
    }).sort((a,b) => b.pts-a.pts || b.diff-a.diff || b.bp-a.bp);

    groupesHtml += `
      <div style="margin-bottom:20px;">
        <div style="font-size:12px;font-weight:700;color:#f97316;margin-bottom:8px;">${groupe}</div>
        <table style="width:100%;border-collapse:collapse;table-layout:fixed;">
          <thead><tr>
            <th ${th('20px')}>#</th>
            <th ${th('','overflow:hidden;text-overflow:ellipsis;white-space:nowrap;')}>Équipe</th>
            <th ${th('22px','text-align:center;')}>J</th>
            <th ${th('22px','text-align:center;')}>V</th>
            <th ${th('22px','text-align:center;')}>N</th>
            <th ${th('22px','text-align:center;')}>D</th>
            <th ${th('36px','text-align:center;')}>Diff</th>
            <th ${th('30px','text-align:center;color:#f97316;')}>Pts</th>
          </tr></thead>
          <tbody>
            ${rows.map((r,i) => `
              <tr style="${i<2?'background:rgba(56,189,248,0.07);':''}">
                <td ${td('color:#4a7a9b;')}>${i+1}</td>
                <td ${td('overflow:hidden;text-overflow:ellipsis;white-space:nowrap;')}>${flagUrl(r.eq)}${r.eq}</td>
                <td ${td('text-align:center;color:#aac0d4;')}>${r.joues}</td>
                <td ${td('text-align:center;color:#4ade80;')}>${r.v}</td>
                <td ${td('text-align:center;color:#aac0d4;')}>${r.n}</td>
                <td ${td('text-align:center;color:#f87171;')}>${r.d}</td>
                <td ${td('text-align:center;color:#aac0d4;')}>${r.diff>=0?'+':''}${r.diff}</td>
                <td ${td('text-align:center;color:#f97316;font-weight:700;')}>${r.pts}</td>
              </tr>`).join('')}
          </tbody>
        </table>
      </div>`;
  }
  return { groupesHtml };
}

// ========== BRACKET PHASES ÉLIMINATOIRES ==========

// Structure des matchs : [num, date heure française, label eq1, label eq2]
const SEI_INFO = [
  [73,  '28 juin 21:00', '2A',         '2B'          ],
  [74,  '29 juin 22:30', '1E',         '3e ABCDF'    ],
  [77,  '30 juin 23:00', '1I',         '3e CDFGH'    ],
  [75,  '30 juin 03:00', '1F',         '2C'          ],
  [83,  '3 juil. 01:00', '2K',         '2L'          ],
  [84,  '2 juil. 21:00', '1H',         '2J'          ],
  [81,  '2 juil. 02:00', '1D',         '3e BEFIJ'    ],
  [82,  '1 juil. 22:00', '1G',         '3e AEHIJ'    ],
  [76,  '29 juin 19:00', '1C',         '3e AEFIJ'    ],
  [78,  '30 juin 19:00', '2E',         '3e BGHIJ'    ],
  [79,  '1 juil. 03:00', '1A',         '3e CEFHI'    ],
  [80,  '1 juil. 18:00', '1L',         '3e EHIJK'    ],
  [86,  '4 juil. 00:00', '1J',         '3e DEIKL'    ],
  [88,  '3 juil. 20:00', '2D',         '2G'          ],
  [85,  '3 juil. 05:00', '1B',         '3e EFGIJ'    ],
  [87,  '4 juil. 03:30', '1K',         '3e DEIJL'    ],
];
const HUI_INFO = [
  [89, '4 juil. 23:00'], [90, '4 juil. 19:00'],
  [93, '6 juil. 21:00'], [94, '7 juil. 02:00'],
  [91, '5 juil. 22:00'], [92, '6 juil. 02:00'],
  [95, '7 juil. 18:00'], [96, '7 juil. 22:00'],
];
const QUA_INFO = [
  [97,  '9 juil. 22:00'], [98, '10 juil. 21:00'],
  [99, '11 juil. 23:00'], [100,'12 juil. 03:00'],
];
const DEM_INFO = [
  [101, '14 juil. 21:00'],
  [102, '15 juil. 21:00'],
];

export async function buildBracketHTML(supabase, eventId) {
  const PHASES = ['Seizièmes de finale','Huitièmes de finale','Quarts de finale','Demi-finales','Petite finale','Finale'];
  const { data: matches } = await supabase.from('matches').select('*')
    .eq('event_id', eventId).in('phase', PHASES);

  const byPhase = {};
  PHASES.forEach(p => { byPhase[p] = []; });
  (matches || []).forEach(m => { if (byPhase[m.phase]) byPhase[m.phase].push(m); });
  PHASES.forEach(p => { byPhase[p].sort((a,b) => new Date(a.date_heure)-new Date(b.date_heure)); });

  function fmt(dateStr) {
    return new Date(dateStr).toLocaleDateString('fr-FR',{
      day:'numeric',month:'short',hour:'2-digit',minute:'2-digit',timeZone:'Europe/Paris'
    });
  }

  function card(m, fallbackDate, l1, l2) {
    const e1 = m?.equipe_1 || null;
    const e2 = m?.equipe_2 || null;
    const done = m?.statut === 'termine';
    const w = done ? (m.score_final_1>m.score_final_2 ? e1 : m.score_final_1<m.score_final_2 ? e2 : null) : null;
    const d = m ? fmt(m.date_heure) : fallbackDate;
    const teamRow = (eq, lbl, sc, isW, isL) => `
      <div style="display:flex;align-items:center;padding:4px 8px;font-size:11px;
        border-bottom:0.5px solid #0d1f3c;
        color:${isW?'#4ade80':isL?'#4a7a9b':'#ccd6e0'};
        font-weight:${isW?700:400};">
        ${eq
          ? flagUrl(eq)+`<span style="flex:1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${eq}</span>`
          : `<span style="flex:1;color:#4a7a9b;font-style:italic;font-size:10px;">${lbl}</span>`
        }
        ${sc!=null ? `<span style="color:#f97316;font-weight:700;margin-left:4px;">${sc}</span>` : ''}
      </div>`;
    return `
      <div style="background:rgba(13,31,60,0.95);border:0.5px solid #1a3a5c;border-radius:6px;overflow:hidden;width:100%;">
        <div style="font-size:9px;color:#4a7a9b;padding:2px 8px;background:rgba(0,0,0,0.25);">${d}</div>
        ${teamRow(e1,l1,done?m.score_final_1:null,w===e1,w&&w!==e1)}
        ${teamRow(e2,l2,done?m.score_final_2:null,w===e2,w&&w!==e2)}
      </div>`;
  }

  // Centres de positionnement (grille de rows de 20px chacune)
  // 16 seizièmes espacés de 5 rows chacun → centres à 3,8,13,...78
  const STEP = 5;
  const seiC = Array.from({length:16}, (_,i) => 3 + i*STEP);
  const huiC = Array.from({length:8},  (_,i) => Math.round((seiC[i*2]+seiC[i*2+1])/2));
  const quaC = Array.from({length:4},  (_,i) => Math.round((huiC[i*2]+huiC[i*2+1])/2));
  const demC = Array.from({length:2},  (_,i) => Math.round((quaC[i*2]+quaC[i*2+1])/2));
  const finC = Math.round((demC[0]+demC[1])/2);
  const tplC = finC + 6;
  const ROWS = seiC[15] + 4;

  let cells = '';

  // Seizièmes (col 1)
  SEI_INFO.forEach((s,i) => {
    const m = byPhase['Seizièmes de finale'][i] || null;
    cells += `<div style="grid-column:1;grid-row:${seiC[i]-2}/${seiC[i]+3};display:flex;align-items:center;">
      ${card(m, s[1], s[2], s[3])}
    </div>`;
  });

  // Connecteurs sei→hui (col 2)
  for (let i=0; i<8; i++) {
    const r1 = seiC[i*2], r2 = seiC[i*2+1];
    const rMid = huiC[i];
    cells += `<div style="grid-column:2;grid-row:${r1}/${r2+2};
      border-right:1px solid #2a4a6c;border-top:1px solid #2a4a6c;border-bottom:1px solid #2a4a6c;"></div>`;
  }

  // Huitièmes (col 3)
  HUI_INFO.forEach((h,i) => {
    const m = byPhase['Huitièmes de finale'][i] || null;
    cells += `<div style="grid-column:3;grid-row:${huiC[i]-2}/${huiC[i]+3};display:flex;align-items:center;">
      ${card(m, h[1], `V N°${SEI_INFO[i*2][0]}`, `V N°${SEI_INFO[i*2+1][0]}`)}
    </div>`;
  });

  // Connecteurs hui→qua (col 4)
  for (let i=0; i<4; i++) {
    const r1 = huiC[i*2], r2 = huiC[i*2+1];
    cells += `<div style="grid-column:4;grid-row:${r1}/${r2+2};
      border-right:1px solid #2a4a6c;border-top:1px solid #2a4a6c;border-bottom:1px solid #2a4a6c;"></div>`;
  }

  // Quarts (col 5)
  QUA_INFO.forEach((q,i) => {
    const m = byPhase['Quarts de finale'][i] || null;
    cells += `<div style="grid-column:5;grid-row:${quaC[i]-2}/${quaC[i]+3};display:flex;align-items:center;">
      ${card(m, q[1], `V N°${HUI_INFO[i*2][0]}`, `V N°${HUI_INFO[i*2+1][0]}`)}
    </div>`;
  });

  // Connecteurs qua→dem (col 6)
  for (let i=0; i<2; i++) {
    const r1 = quaC[i*2], r2 = quaC[i*2+1];
    cells += `<div style="grid-column:6;grid-row:${r1}/${r2+2};
      border-right:1px solid #2a4a6c;border-top:1px solid #2a4a6c;border-bottom:1px solid #2a4a6c;"></div>`;
  }

  // Demis (col 7)
  DEM_INFO.forEach((d,i) => {
    const m = byPhase['Demi-finales'][i] || null;
    cells += `<div style="grid-column:7;grid-row:${demC[i]-2}/${demC[i]+3};display:flex;align-items:center;">
      ${card(m, d[1], `V N°${QUA_INFO[i*2][0]}`, `V N°${QUA_INFO[i*2+1][0]}`)}
    </div>`;
  });

  // Connecteurs dem→fin (col 8)
  const r1d = demC[0], r2d = demC[1];
  cells += `<div style="grid-column:8;grid-row:${r1d}/${r2d+2};
    border-right:1px solid #2a4a6c;border-top:1px solid #2a4a6c;border-bottom:1px solid #2a4a6c;"></div>`;

  // Finale (col 9)
  const mFin = byPhase['Finale'][0] || null;
  cells += `<div style="grid-column:9;grid-row:${finC-2}/${finC+3};display:flex;align-items:center;">
    ${card(mFin, '19 juil. 21:00', 'Vainqueur demi 1', 'Vainqueur demi 2')}
  </div>`;

  // Petite finale (col 9, sous la finale)
  const mTpl = byPhase['Petite finale'][0] || null;
  cells += `<div style="grid-column:9;grid-row:${tplC-2}/${tplC+3};display:flex;flex-direction:column;align-items:center;gap:4px;">
    <div style="font-size:10px;color:#4a7a9b;font-weight:600;">🥉 Petite finale</div>
    ${card(mTpl, '18 juil. 23:00', 'Perdant demi 1', 'Perdant demi 2')}
  </div>`;

  return `
    <style>
      .bk-outer { overflow-x:auto; overflow-y:hidden; width:100%; padding-bottom:12px; }
      .bk-grid {
        display:grid;
        grid-template-columns: 145px 18px 145px 18px 145px 18px 145px 18px 155px;
        grid-template-rows: repeat(${ROWS}, 20px);
        min-width: 840px;
        width: max-content;
      }
      .bk-title { font-size:11px;font-weight:700;color:#f97316;text-align:center;letter-spacing:1px;text-transform:uppercase; }
    </style>
    <div class="bk-outer">
      <div class="bk-grid">
        <div class="bk-title" style="grid-column:1;grid-row:1;">Seizièmes</div>
        <div class="bk-title" style="grid-column:3;grid-row:1;">Huitièmes</div>
        <div class="bk-title" style="grid-column:5;grid-row:1;">Quarts</div>
        <div class="bk-title" style="grid-column:7;grid-row:1;">Demi-finales</div>
        <div class="bk-title" style="grid-column:9;grid-row:1;">Finale</div>
        ${cells}
      </div>
    </div>
    <div style="font-size:11px;color:#4a7a9b;text-align:center;margin-top:8px;">
      Les équipes s'affichent dès qu'elles sont qualifiées
    </div>`;
}

// ========== MODAL ==========
export async function openTableauModal(supabase, eventId) {
  const { groupesHtml } = await buildTableauHTML(supabase, eventId);
  const elimHtml = await buildBracketHTML(supabase, eventId);

  document.getElementById('karma-tableau-modal')?.remove();
  const modal = document.createElement('div');
  modal.id = 'karma-tableau-modal';
  modal.style.cssText = 'position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,0.75);display:flex;align-items:flex-start;justify-content:center;padding:20px;overflow-y:auto;';
  modal.innerHTML = `
    <div style="background:#0d1f3c;border:0.5px solid #1a3a5c;border-radius:14px;width:100%;max-width:680px;padding:24px;position:relative;margin:auto;">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;">
        <div style="font-size:16px;font-weight:700;color:#fff;">🏆 Tableau de la compétition</div>
        <button onclick="document.getElementById('karma-tableau-modal').remove()"
          style="background:none;border:none;color:#4a7a9b;font-size:20px;cursor:pointer;line-height:1;">✕</button>
      </div>
      <div style="display:flex;gap:8px;margin-bottom:20px;">
        <button id="tab-groupes" onclick="switchTab('groupes')"
          style="flex:1;padding:8px;border-radius:8px;border:0.5px solid #1a3a5c;background:#f97316;color:#fff;font-size:13px;font-weight:600;cursor:pointer;">
          Phase de groupes</button>
        <button id="tab-elim" onclick="switchTab('elim')"
          style="flex:1;padding:8px;border-radius:8px;border:0.5px solid #1a3a5c;background:#0a1628;color:#4a7a9b;font-size:13px;font-weight:600;cursor:pointer;">
          Phases éliminatoires</button>
      </div>
      <div id="tab-content-groupes">${groupesHtml}</div>
      <div id="tab-content-elim" style="display:none;">${elimHtml}</div>
      <div style="font-size:11px;color:#4a7a9b;margin-top:12px;text-align:center;">
        Les 2 premiers de chaque groupe sont qualifiés (surlignés en bleu)</div>
    </div>`;
  document.body.appendChild(modal);
  modal.addEventListener('click', e => { if (e.target===modal) modal.remove(); });
  window.switchTab = function(tab) {
    document.getElementById('tab-content-groupes').style.display = tab==='groupes'?'block':'none';
    document.getElementById('tab-content-elim').style.display = tab==='elim'?'block':'none';
    document.getElementById('tab-groupes').style.background = tab==='groupes'?'#f97316':'#0a1628';
    document.getElementById('tab-groupes').style.color = tab==='groupes'?'#fff':'#4a7a9b';
    document.getElementById('tab-elim').style.background = tab==='elim'?'#f97316':'#0a1628';
    document.getElementById('tab-elim').style.color = tab==='elim'?'#fff':'#4a7a9b';
  };
}
