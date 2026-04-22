import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

const SUPABASE_URL = 'https://urjykqfscmpffromuumk.supabase.co';
const SUPABASE_KEY = 'ta_publishable_key_complète_ici';

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
