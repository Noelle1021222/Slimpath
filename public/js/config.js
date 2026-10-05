// Supabase project settings (Dashboard → Project Settings → API).
// The anon/publishable key is designed to be public: Row Level Security in
// supabase/schema.sql makes sure each user can only reach their own rows.
// When deploying with GitHub Actions these values can instead come from the
// repository variables SUPABASE_URL and SUPABASE_ANON_KEY (see README).
export const SUPABASE_URL = '';
export const SUPABASE_ANON_KEY = '';
