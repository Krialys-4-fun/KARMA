import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

const SUPABASE_URL = 'https://urjykqfscmpffromuumk.supabase.co';
const SUPABASE_KEY = 'sb_publishable_PXBdXxiUUwgP3SUdnK8ghQ_MylQODoe';

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// ========== MULTIPLICATEUR DE PHASE ==========
function getPhaseMultiplier(phase) {
  if (!phase) return 1;
  const p = phase.toLowerCase();
  if (p.startsWith('groupe') || p.startsWith('poule')) return 1;
  if (p.includes('seizi')) return 1.5;   // Seizièmes de finale
  if (p.includes('huiti')) return 1.5;   // Huitièmes de finale
  if (p.includes('quart')) return 2;
  if (p.includes('demi')) return 3;
  if (p.includes('petite')) return 3;    // Petite finale
  if (p.includes('finale')) return 4;   // Finale (doit être après "demi" et "petite")
  return 1; // fallback
}
