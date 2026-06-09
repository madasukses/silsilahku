# SilsilahKu 🌳
Aplikasi pohon silsilah keluarga berbasis web.
**Stack:** Vanilla HTML/CSS/JS · Supabase · Vercel · GitHub

---

## 🚀 Cara Setup (3 Langkah)

### Langkah 1 — Supabase

1. Buka [supabase.com](https://supabase.com) → **New Project**
2. Catat **Project URL** dan **anon public key** dari:
   `Settings → API → Project URL & Project API keys`

3. Buka **SQL Editor → New Query**, paste isi file `supabase_schema.sql`, klik **Run**

4. Buat admin user:
   - `Authentication → Users → Add User`
   - Email: `admin@silsilahku.id`
   - Password: `admin123`

5. Pastikan bucket **avatars** sudah dibuat (otomatis dari SQL, atau buat manual di Storage)

---

### Langkah 2 — Konfigurasi

Edit file `js/config.js`:

```js
const SUPABASE_URL  = 'https://XXXX.supabase.co';   // ← ganti ini
const SUPABASE_ANON = 'eyXXXX...';                   // ← ganti ini
```

---

### Langkah 3 — Deploy ke Vercel via GitHub

1. Push folder ini ke GitHub:
```bash
git init
git add .
git commit -m "init: SilsilahKu"
git remote add origin https://github.com/USERNAME/silsilahku.git
git push -u origin main
```

2. Buka [vercel.com](https://vercel.com) → **New Project** → Import dari GitHub
3. Pilih repo `silsilahku`, klik **Deploy**
4. Selesai! Akses di `https://silsilahku.vercel.app`

---

## 📂 Struktur File

```
silsilahku/
├── index.html              ← Dashboard publik (pohon silsilah)
├── supabase_schema.sql     ← Jalankan 1x di Supabase SQL Editor
├── css/
│   ├── global.css          ← Style global
│   ├── tree.css            ← Style pohon silsilah
│   ├── popup.css           ← Style popup biografi
│   └── admin.css           ← Style panel admin
├── js/
│   ├── config.js           ← ⚠️ ISI URL & KEY SUPABASE DI SINI
│   ├── tree.js             ← Render pohon rekursif
│   └── popup.js            ← Bio popup sheet
└── pages/
    ├── login.html          ← Login admin
    ├── admin.html          ← Daftar anggota (CRUD)
    ├── member-form.html    ← Form tambah/edit anggota
    └── settings.html       ← Pengaturan sistem
```

---

## 🔐 Login Admin

| Field    | Value                  |
|----------|------------------------|
| URL      | `/pages/login.html`    |
| Email    | `admin@silsilahku.id`  |
| Password | `admin123`             |

> Ganti password di: **Admin → Pengaturan → Ganti Password Admin**

---

## 🗄️ Tabel Database

| Tabel      | Keterangan                          |
|------------|-------------------------------------|
| `members`  | Data anggota keluarga               |
| `families` | Data keluarga/marga                 |
| `settings` | Konfigurasi tampilan & info keluarga|

Kolom penting di `members`:
- `father_id`, `mother_id` → relasi orang tua (pohon rekursif)
- `spouse_id` → pasangan (tampil berdampingan)
- `is_inlaw` → menantu (garis putus di pohon)
- `is_deceased` → almarhum (badge 🌹)
- `generation` → nomor generasi (1–7)

---

## ✨ Fitur

- 🌳 Pohon silsilah vertikal rekursif (atas→bawah)
- 👨‍👩‍👧 Anak & cucu sejajar tepat di bawah orang tuanya
- 💍 Menantu tampil dengan garis putus
- 🌹 Badge mawar untuk almarhum/almarhumah
- 👆 Klik avatar → popup biografi + garis keturunan
- 🖼️ Upload foto avatar ke Supabase Storage
- 🔐 Login admin via Supabase Auth
- ⚙️ Pengaturan nama keluarga, tampilan pohon
- 📥 Export data ke CSV
- 📱 Responsive (mobile friendly)
