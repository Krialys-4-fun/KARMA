import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

const SUPABASE_URL = 'https://urjykqfscmpffromuumk.supabase.co';
const SUPABASE_KEY = 'sb_publishable_PXBdXxiUUwgP3SUdnK8ghQ_MylQODoe';

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
