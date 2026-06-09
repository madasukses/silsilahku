// ============================================================
//  SilsilahKu — Konfigurasi
//  Ganti SUPABASE_URL dan SUPABASE_ANON_KEY dengan milik Anda
//  dari: Supabase Dashboard > Settings > API
// ============================================================

const SUPABASE_URL  = 'https://uzqtpojnaonrltumhwzj.supabase.co';
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV6cXRwb2puYW9ucmx0dW1od3pqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEwMjQ0NTgsImV4cCI6MjA5NjYwMDQ1OH0.EncfshMnJr-0GmokMnbF9tI8r6T_bGkskWO166ij99k';

// Jangan ubah di bawah ini
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON);
