-- ============================================================
--  SilsilahKu — Supabase Schema
--  Jalankan di: Supabase Dashboard > SQL Editor > New Query
-- ============================================================

-- ── 1. FAMILIES ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS families (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  city        TEXT,
  description TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ── 2. MEMBERS ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS members (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id   UUID REFERENCES families(id) ON DELETE SET NULL,
  name        TEXT NOT NULL,
  initials    TEXT,                    -- auto-generated jika kosong
  gender      TEXT CHECK (gender IN ('male','female','other')),
  birth_date  DATE,
  birth_city  TEXT,
  death_date  DATE,
  is_deceased BOOLEAN DEFAULT FALSE,
  is_inlaw    BOOLEAN DEFAULT FALSE,   -- menantu (garis putus)
  generation  INT CHECK (generation BETWEEN 1 AND 10),
  job         TEXT,
  address     TEXT,
  avatar_url  TEXT,
  father_id   UUID REFERENCES members(id) ON DELETE SET NULL,
  mother_id   UUID REFERENCES members(id) ON DELETE SET NULL,
  spouse_id   UUID REFERENCES members(id) ON DELETE SET NULL,
  notes       TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ── 3. ADMIN SETTINGS ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS settings (
  key   TEXT PRIMARY KEY,
  value TEXT
);

-- ── 4. AUTO-UPDATE updated_at ────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS members_updated_at ON members;
CREATE TRIGGER members_updated_at
  BEFORE UPDATE ON members
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ── 5. RLS ───────────────────────────────────────────────────
ALTER TABLE families ENABLE ROW LEVEL SECURITY;
ALTER TABLE members  ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

-- families: semua orang bisa baca (dashboard publik)
CREATE POLICY "families_public_read"
  ON families FOR SELECT
  USING (true);

-- families: hanya authenticated (admin) bisa write
CREATE POLICY "families_admin_write"
  ON families FOR ALL
  USING (auth.role() = 'authenticated');

-- members: semua bisa baca
CREATE POLICY "members_public_read"
  ON members FOR SELECT
  USING (true);

-- members: hanya admin bisa write
CREATE POLICY "members_admin_write"
  ON members FOR ALL
  USING (auth.role() = 'authenticated');

-- settings: hanya admin
CREATE POLICY "settings_admin_all"
  ON settings FOR ALL
  USING (auth.role() = 'authenticated');

-- ── 6. STORAGE BUCKET untuk avatar ──────────────────────────
-- Buat di: Supabase Dashboard > Storage > New Bucket
-- Nama: avatars
-- Public: YES
-- Atau jalankan via SQL:
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policy: semua bisa baca avatar
CREATE POLICY "avatar_public_read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'avatars');

-- Storage policy: hanya authenticated bisa upload
CREATE POLICY "avatar_admin_upload"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'avatars' AND auth.role() = 'authenticated');

CREATE POLICY "avatar_admin_update"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'avatars' AND auth.role() = 'authenticated');

CREATE POLICY "avatar_admin_delete"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'avatars' AND auth.role() = 'authenticated');

-- ── 7. SEED DATA ─────────────────────────────────────────────

-- Default settings
INSERT INTO settings (key, value) VALUES
  ('family_title',       'Keluarga Besar Soehardjo'),
  ('family_city',        'Surabaya, Jawa Timur'),
  ('family_description', 'Keluarga besar Soehardjo yang berpusat di Surabaya.'),
  ('show_birth_year',    'true'),
  ('show_inlaw_dashed',  'true'),
  ('show_rose_badge',    'true'),
  ('max_generations',    '7'),
  ('dashboard_public',   'true')
ON CONFLICT (key) DO NOTHING;

-- Family
INSERT INTO families (id, name, city, description) VALUES
  ('00000000-0000-0000-0000-000000000001', 'Soehardjo', 'Surabaya', 'Keluarga inti Soehardjo')
ON CONFLICT (id) DO NOTHING;

-- Members (Gen 1)
INSERT INTO members (id, family_id, name, initials, gender, birth_date, death_date, is_deceased, is_inlaw, generation, job, birth_city, father_id, mother_id, spouse_id) VALUES
  ('10000000-0000-0000-0000-000000000001',
   '00000000-0000-0000-0000-000000000001',
   'Soehardjo', 'S', 'male', '1921-01-01', '1998-06-15', true, false, 1,
   'Petani', 'Surabaya', NULL, NULL,
   '10000000-0000-0000-0000-000000000002'),

  ('10000000-0000-0000-0000-000000000002',
   '00000000-0000-0000-0000-000000000001',
   'Suminah', 'M', 'female', '1925-03-10', '2005-11-20', true, false, 1,
   'Ibu Rumah Tangga', 'Surabaya', NULL, NULL,
   '10000000-0000-0000-0000-000000000001')
ON CONFLICT (id) DO NOTHING;

-- Gen 2 — Anak kandung
INSERT INTO members (id, family_id, name, initials, gender, birth_date, death_date, is_deceased, is_inlaw, generation, job, birth_city, father_id, mother_id, spouse_id) VALUES
  ('20000000-0000-0000-0000-000000000001',
   '00000000-0000-0000-0000-000000000001',
   'Bambang Soehardjo', 'B', 'male', '1948-04-02', NULL, false, false, 2,
   'PNS Purnawirawan', 'Surabaya',
   '10000000-0000-0000-0000-000000000001',
   '10000000-0000-0000-0000-000000000002',
   '20000000-0000-0000-0000-000000000004'),

  ('20000000-0000-0000-0000-000000000002',
   '00000000-0000-0000-0000-000000000001',
   'Suharto Wirawan', 'H', 'male', '1951-08-17', '2020-03-05', true, false, 2,
   'Wiraswasta', 'Surabaya',
   '10000000-0000-0000-0000-000000000001',
   '10000000-0000-0000-0000-000000000002',
   '20000000-0000-0000-0000-000000000005'),

  ('20000000-0000-0000-0000-000000000003',
   '00000000-0000-0000-0000-000000000001',
   'Sri Wahyuni', 'W', 'female', '1955-12-01', NULL, false, false, 2,
   'Guru SD', 'Surabaya',
   '10000000-0000-0000-0000-000000000001',
   '10000000-0000-0000-0000-000000000002',
   '20000000-0000-0000-0000-000000000006')
ON CONFLICT (id) DO NOTHING;

-- Gen 2 — Menantu
INSERT INTO members (id, family_id, name, initials, gender, birth_date, death_date, is_deceased, is_inlaw, generation, job, birth_city, father_id, mother_id, spouse_id) VALUES
  ('20000000-0000-0000-0000-000000000004',
   NULL,
   'Ratna Dewi', 'R', 'female', '1950-07-20', NULL, false, true, 2,
   'Bidan', 'Malang', NULL, NULL,
   '20000000-0000-0000-0000-000000000001'),

  ('20000000-0000-0000-0000-000000000005',
   NULL,
   'Nurul Hasanah', 'N', 'female', '1953-09-14', NULL, false, true, 2,
   'Apoteker', 'Gresik', NULL, NULL,
   '20000000-0000-0000-0000-000000000002'),

  ('20000000-0000-0000-0000-000000000006',
   NULL,
   'Darsono Purwanto', 'D', 'male', '1952-05-30', '2018-01-10', true, true, 2,
   'Pegawai Bank', 'Sidoarjo', NULL, NULL,
   '20000000-0000-0000-0000-000000000003')
ON CONFLICT (id) DO NOTHING;

-- Gen 3 — Cucu dari Bambang + Ratna
INSERT INTO members (id, family_id, name, initials, gender, birth_date, is_deceased, is_inlaw, generation, job, birth_city, father_id, mother_id, spouse_id) VALUES
  ('30000000-0000-0000-0000-000000000001',
   '00000000-0000-0000-0000-000000000001',
   'Ahmad Fauzi', 'A', 'male', '1972-02-14', false, false, 3,
   'Software Engineer', 'Surabaya',
   '20000000-0000-0000-0000-000000000001',
   '20000000-0000-0000-0000-000000000004',
   '30000000-0000-0000-0000-000000000006'),

  ('30000000-0000-0000-0000-000000000002',
   '00000000-0000-0000-0000-000000000001',
   'Dewi Kartika', 'D', 'female', '1975-06-08', false, false, 3,
   'Dokter', 'Surabaya',
   '20000000-0000-0000-0000-000000000001',
   '20000000-0000-0000-0000-000000000004',
   NULL),

  ('30000000-0000-0000-0000-000000000003',
   '00000000-0000-0000-0000-000000000001',
   'Rizky Pratama', 'R', 'male', '1978-10-22', false, false, 3,
   'Pengacara', 'Surabaya',
   '20000000-0000-0000-0000-000000000001',
   '20000000-0000-0000-0000-000000000004',
   '30000000-0000-0000-0000-000000000007')
ON CONFLICT (id) DO NOTHING;

-- Gen 3 — Cucu dari Suharto + Nurul
INSERT INTO members (id, family_id, name, initials, gender, birth_date, is_deceased, is_inlaw, generation, job, birth_city, father_id, mother_id, spouse_id) VALUES
  ('30000000-0000-0000-0000-000000000004',
   '00000000-0000-0000-0000-000000000001',
   'Yuni Astuti', 'Y', 'female', '1980-03-17', false, false, 3,
   'Desainer Grafis', 'Malang',
   '20000000-0000-0000-0000-000000000002',
   '20000000-0000-0000-0000-000000000005',
   NULL),

  ('30000000-0000-0000-0000-000000000005',
   '00000000-0000-0000-0000-000000000001',
   'Bagus Wicaksono', 'G', 'male', '1983-11-05', false, false, 3,
   'Arsitek', 'Malang',
   '20000000-0000-0000-0000-000000000002',
   '20000000-0000-0000-0000-000000000005',
   '30000000-0000-0000-0000-000000000008')
ON CONFLICT (id) DO NOTHING;

-- Gen 3 — Cucu dari Sri + Darsono
INSERT INTO members (id, family_id, name, initials, gender, birth_date, is_deceased, is_inlaw, generation, job, birth_city, father_id, mother_id, spouse_id) VALUES
  ('30000000-0000-0000-0000-000000000009',
   '00000000-0000-0000-0000-000000000001',
   'Cantika Sari', 'C', 'female', '1985-07-19', false, false, 3,
   'Apoteker', 'Sidoarjo',
   '20000000-0000-0000-0000-000000000003',
   '20000000-0000-0000-0000-000000000006',
   NULL)
ON CONFLICT (id) DO NOTHING;

-- Gen 3 — Menantu
INSERT INTO members (id, family_id, name, initials, gender, birth_date, is_deceased, is_inlaw, generation, job, birth_city, father_id, mother_id, spouse_id) VALUES
  ('30000000-0000-0000-0000-000000000006',
   NULL,
   'Laila Nasution', 'L', 'female', '1974-04-01', false, true, 3,
   'Guru SD', 'Jakarta', NULL, NULL,
   '30000000-0000-0000-0000-000000000001'),

  ('30000000-0000-0000-0000-000000000007',
   NULL,
   'Hendra Kurnia', 'K', 'male', '1976-08-25', false, true, 3,
   'Insinyur', 'Bandung', NULL, NULL,
   '30000000-0000-0000-0000-000000000003'),

  ('30000000-0000-0000-0000-000000000008',
   NULL,
   'Fitriani Muhsin', 'F', 'female', '1982-01-13', false, true, 3,
   'Pebisnis', 'Surabaya', NULL, NULL,
   '30000000-0000-0000-0000-000000000005')
ON CONFLICT (id) DO NOTHING;

-- Gen 4 — Cicit dari Ahmad + Laila
INSERT INTO members (id, family_id, name, initials, gender, birth_date, is_deceased, is_inlaw, generation, job, birth_city, father_id, mother_id) VALUES
  ('40000000-0000-0000-0000-000000000001',
   '00000000-0000-0000-0000-000000000001',
   'Zahra Nabila', 'Z', 'female', '1998-09-03', false, false, 4,
   'Mahasiswi', 'Surabaya',
   '30000000-0000-0000-0000-000000000001',
   '30000000-0000-0000-0000-000000000006'),

  ('40000000-0000-0000-0000-000000000002',
   '00000000-0000-0000-0000-000000000001',
   'Farhan Ali', 'F', 'male', '2001-12-11', false, false, 4,
   'Pelajar', 'Surabaya',
   '30000000-0000-0000-0000-000000000001',
   '30000000-0000-0000-0000-000000000006')
ON CONFLICT (id) DO NOTHING;

-- Gen 4 — dari Rizky + Hendra
INSERT INTO members (id, family_id, name, initials, gender, birth_date, is_deceased, is_inlaw, generation, job, birth_city, father_id, mother_id) VALUES
  ('40000000-0000-0000-0000-000000000003',
   '00000000-0000-0000-0000-000000000001',
   'Dimas Rizky', 'D', 'male', '2003-05-28', false, false, 4,
   'Pelajar', 'Gresik',
   '30000000-0000-0000-0000-000000000003',
   '30000000-0000-0000-0000-000000000007')
ON CONFLICT (id) DO NOTHING;

-- Gen 4 — dari Bagus + Fitriani
INSERT INTO members (id, family_id, name, initials, gender, birth_date, is_deceased, is_inlaw, generation, job, birth_city, father_id, mother_id) VALUES
  ('40000000-0000-0000-0000-000000000004',
   '00000000-0000-0000-0000-000000000001',
   'Nadia Bagus', 'N', 'female', '2005-02-14', false, false, 4,
   'Pelajar', 'Malang',
   '30000000-0000-0000-0000-000000000005',
   '30000000-0000-0000-0000-000000000008')
ON CONFLICT (id) DO NOTHING;

-- Gen 5 — Canggah dari Zahra
INSERT INTO members (id, family_id, name, initials, gender, birth_date, is_deceased, is_inlaw, generation, job, birth_city, father_id, mother_id) VALUES
  ('50000000-0000-0000-0000-000000000001',
   '00000000-0000-0000-0000-000000000001',
   'Zian Fauzi', 'Z', 'male', '2018-07-07', false, false, 5,
   'Balita', 'Surabaya',
   '40000000-0000-0000-0000-000000000001',
   NULL)
ON CONFLICT (id) DO NOTHING;

-- ── 8. ADMIN USER ────────────────────────────────────────────
-- Buat manual di: Supabase > Authentication > Users > Add User
-- Email   : admin@silsilahku.id
-- Password: admin123
-- (Setelah create, copy user UUID ke sini jika perlu)
