// ============================================================
//  SilsilahKu — Konfigurasi
//  Ganti SUPABASE_URL dan SUPABASE_ANON sesuai project Anda
//  Supabase Dashboard > Settings > API
// ============================================================

const SUPABASE_URL  = 'https://uzqtpojnaonrltumhwzj.supabase.co';
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV6cXRwb2puYW9ucmx0dW1od3pqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEwMjQ0NTgsImV4cCI6MjA5NjYwMDQ1OH0.EncfshMnJr-0GmokMnbF9tI8r6T_bGkskWO166ij99k';

// Pakai window._db agar tidak bentrok dengan nama global 'supabase' dari CDN
window._db = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON);
