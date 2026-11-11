# 🚀 STELLAR STRIKE: CYBER TYPING INTERCEPTOR
### *Next.js & Node.js Arcade Space Shooter Typing Game with Score-Unlocked Skills & Real-time Multiplayer*

**Stellar Strike** adalah game arkade retro synthwave yang memadukan intensitas *classic space shooter* (seperti *Galaga*, *Geometry Wars*, dan *Space Invaders*) dengan *high-speed typing combat* (*The Typing of the Dead* & *ZType*).

Kini game telah ditingkatkan sepenuhnya dengan arsitektur **Next.js & Node.js**, **Sistem Skill Khusus Berdasarkan Skor**, serta **Fitur Multiplayer Co-Op Real-time dengan Kode Ruang (Room Code)**!

---

## ⚡ Cara Menjalankan Game

Tersedia beberapa cara mudah untuk menjalankan game:

### Opsi 1: Menjalankan Server Node.js & Multiplayer (Rekomendasi)
Cukup klik dua kali berkas [`start-server.bat`](file:///e:/VSCode/start-server.bat) atau jalankan di terminal:
```powershell
.\start-server.bat
```
Server Node.js akan aktif di `http://localhost:3001` dengan dukungan server WebSocket untuk ruangan multiplayer.

### Opsi 2: Menjalankan Next.js Dev Server
Klik dua kali berkas [`start-dev.bat`](file:///e:/VSCode/start-dev.bat) atau jalankan:
```powershell
npm run dev
```
Aplikasi Next.js akan berjalan di `http://localhost:3000`.

### Opsi 3: Buka Langsung di Browser (Offline / Standalone)
Klik dua kali file [`index.html`](file:///e:/VSCode/index.html) di browser mana saja. Multiplayer lokal antar-tab juga tetap berfungsi via `BroadcastChannel`!

---

## 💥 Sistem Skill Khusus (Terbuka Berdasarkan Skor)

Pesawat Anda kini dilengkapi dengan **Skill Tree & Hotbar Taktis** `[1]` sampai `[6]`. Setiap skill membutuhkan pencapaian skor tempur tertentu untuk terbuka:

| Hotkey | Nama Skill | Skor Diperlukan | Jenis | Efek Taktis |
| :---: | :--- | :---: | :---: | :--- |
| **`[1]`** | **Plasma Nova** | **1,000 PTS** | Tembakan Khusus | Menembakkan berkas laser plasma raksasa yang **menembus dan meledakkan seluruh musuh di jalur lurus**. |
| **`[2]`** | **Orbital Drone** | **2,500 PTS** | Pendukung Otonom | Memanggil drone tempur yang mengitari kapal selama **15 detik**, otomatis **menembak jatuh rudal musuh**! |
| **`[3]`** | **Chrono Stasis** | **5,000 PTS** | Distorsi Waktu | Memperlambat waktu dan pergerakan musuh sebesar **70% selama 6 detik** (efek gerak lambat / slow-mo). Memberi ruang mengetik kata sulit dengan tenang! |
| **`[4]`** | **Multi-Vector Spread** | **8,500 PTS** | Buff Senjata | Mengubah tembakan utama menjadi **5 berkas laser menyebar (spread beam)** selama **10 detik** untuk menyapu gerombolan drone! |
| **`[5]`** | **Nanite Shield Repair** | **13,000 PTS** | Pemulihan | Melepaskan kawanan nanobot cerdas yang langsung **memulihkan +50% perisai armada**. |
| **`[6]`** | **Supernova Annihilator** | **20,000 PTS** | Serangan Pamungkas | Ledakan kosmik layar penuh yang **melenyapkan seluruh armada biasa** seketika dan menimbulkan kerusakan kritis pada Bos! |

* **Progress Bar:** Tampilan HUD di bagian bawah menunjukkan progres skor menuju skill berikutnya secara *real-time* (contoh: `PROGRESS: 1,450 / 2,500 PTS ➔ [Orbital Drone]`).
* **Pengumuman Suara:** Saat skill baru terbuka, sistem audio akan membunyikan *fanfare* dan suara robotik mengumumkan skill tersebut siap digunakan.
* **Penggunaan:** Tekan tombol angka `[1]` - `[6]` di keyboard atau klik ikon skill pada hotbar.

---

## 👥 Main Bersama Teman (Multiplayer dengan Kode Ruang)

Sekarang Anda bisa bermain bersama teman dalam satu arena antariksa menggunakan sistem **Kode Ruang (Room Code)**:

1. Di menu utama, klik tombol **"👥 MAIN BERSAMA TEMAN (KODE RUANG)"**.
2. **Sebagai Tuan Rumah (Host):**
   * Klik **"➕ BUAT RUANG BARU"**.
   * Sistem akan otomatis membuatkan kode ruang unik (contoh: `GALAXY-8824`).
   * Salin dan kirimkan kode tersebut ke teman Anda!
3. **Sebagai Kawan (Guest):**
   * Buka game di browser atau komputer lain, lalu pilih tab **"🔑 GABUNG RUANG"**.
   * Masukkan kode yang diberikan (misalnya `GALAXY-8824`), lalu klik **"🔗 HUBUNGKAN KE RUANG TEMAN"**.
4. **Mulai Tempur:**
   * Begitu teman Anda terhubung, daftar pemain akan berubah status menjadi **"TERHUBUNG ✅"**.
   * Klik tombol **"🚀 LUNCURKAN ARMADA CO-OP"** untuk mulai bertempur berdampingan!
5. **Mekanik Co-Op:**
   * **Kapal Berdampingan:** Pemain 1 menerbangkan Kapal Biru Cyan (*Pilot Alfa*), dan Pemain 2 menerbangkan Kapal Magenta (*Pilot Beta*).
   * **Bidikan & Tembakan Bersama:** Laser kedua pemain tampak di layar secara *real-time*.
   * **Saling Melindungi:** Entah Pemain 1 atau Pemain 2 yang mengetik huruf pada rudal, rudal tersebut akan meledak untuk kedua pemain!
   * **Sinergi Skill:** Saat teman Anda mengaktifkan *Chrono Stasis*, waktu melambat untuk kalian berdua! Mengaktifkan *Nanite Repair* juga menyembuhkan armada bersama!
   * **Status Co-Pilot:** Panel khusus di sudut atas menampilkan status perisai dan WPM kawan Anda.

---

## 🏆 Sistem Leaderboard Galaksi (Supabase Cloud + Lokal)

Game kini dilengkapi fitur **Leaderboard Global Online** yang terintegrasi langsung dengan database **Supabase** serta penyimpanan cadangan lokal:

* **Tampilan Podium & Badges:** Peringkat 1 (🥇 Emas/Kuning Neon), 2 (🥈 Perak/Magenta Neon), dan 3 (🥉 Perunggu/Cyan Neon) memiliki efek visual menyala khusus.
* **Statistik Lengkap:** Mencatat Nama Pilot, Total Skor, Gelombang (Wave), WPM, Akurasi Mengetik, dan Tanggal.
* **Dual Mode:** Jika `.env` belum diisi, game otomatis berjalan dalam **Mode Lokal** tanpa error/freeze. Begitu kunci Supabase dimasukkan, sistem langsung beralih ke **Mode Global Cloud** 🌐!
* **Simpan Skor:** Di layar Game Over (Perisai Hancur), masukkan nama pilot Anda lalu tekan tombol **"📤 KIRIM SKOR"**.

### 🛠️ Langkah Menghubungkan ke Supabase:

1. **Buat Proyek di Supabase:**
   * Buka [supabase.com](https://supabase.com) dan buat proyek baru (gratis).
2. **Jalankan SQL Query:**
   * Masuk ke menu **SQL Editor** di dashboard Supabase.
   * Salin seluruh isi file [`supabase_schema.sql`](file:///e:/VSCode/supabase_schema.sql) dan jalankan (**Run**). Tabel `leaderboard` serta kebijakan keamanannya (RLS) akan dibuat otomatis.
3. **Isi File `.env`:**
   * Buka file [`.env`](file:///e:/VSCode/.env) di root folder proyek:
     ```env
     NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
     NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key-here
     PORT=3001
     ```
   * *URL* dan *Anon Key* bisa ditemukan di **Project Settings > API** pada dashboard Supabase.
4. **Jalankan Ulang Server:**
   * Jalankan `.\start-server.bat` atau `npm run dev`. Status badge di leaderboard akan berubah menjadi **`🌐 SUPABASE CLOUD: ONLINE`**!

---

## 📂 Struktur Berkas Proyek

```
e:\VSCode\
├── .env                      # File konfigurasi Supabase (URL & Anon Key)
├── .env.example              # Template contoh konfigurasi environment
├── supabase_schema.sql       # Script SQL pembuatan tabel leaderboard di Supabase
├── package.json              # Konfigurasi Next.js 14, React 18, dan dependensi Node.js
├── tsconfig.json             # Konfigurasi TypeScript
├── next.config.js            # Konfigurasi Next.js App Router
├── server.js                 # Server HTTP, WebSocket & REST API Leaderboard Node.js
├── start-server.bat          # Launcher 1-klik untuk server Node.js & WebSocket
├── start-dev.bat             # Launcher 1-klik untuk Next.js Dev Server
├── index.html                # Tampilan utama game arcade & modal leaderboard
├── css/
│   └── style.css             # Tema retro cyberpunk, HUD meters, skill hotbar, scanlines & leaderboard
├── js/
│   ├── words.js              # Bank kata Bahasa Indonesia & Inggris + intercept pool
│   ├── audio.js              # Web Audio API Synth & Voice Announcer
│   ├── skills.js             # Logika 6 skill khusus dan batasan skor
│   ├── multiplayer.js        # Klien sinkronisasi WebSocket & BroadcastChannel
│   ├── leaderboard.js        # Modul Leaderboard Supabase & fallback lokal
│   ├── entities.js           # Pesawat, Drone, Musuh, Rudal, dan Bos
│   └── game.js               # Mesin utama game & integrasi event loop
└── src/
    ├── app/
    │   ├── api/
    │   │   ├── config/route.ts       # Next.js API route konfigurasi Supabase
    │   │   └── leaderboard/route.ts  # Next.js API route GET/POST leaderboard
    │   ├── layout.tsx                # Next.js Root Layout
    │   ├── page.tsx                  # Next.js Page Client Component
    │   └── globals.css               # Next.js Global Styles
    ├── lib/
    │   ├── types.ts                  # Definisi tipe data TypeScript
    │   ├── skills.ts                 # Modul TypeScript Skill System
    │   └── multiplayer.ts            # Modul TypeScript Multiplayer Client
    └── components/                   # Komponen React untuk game
```

---

*Selamat bertempur bersama teman mu lur! Buktikan kecepatan jarimu di medan tempur antariksa!* 🚀✨