# zabun

Bot WhatsApp modern, modular, dan berkecepatan tinggi yang dibangun di atas runtime **Bun** dan library **[zapo-js](https://github.com/vinikjkkj/zapo)** dengan persistensi database SQLite bawaan. Respons instan (~2–5 ms), konsumsi RAM sangat minim (heap ~8–16 MB).

Saluran WhatsApp Resmi: **[Ikuti Saluran WhatsApp](https://whatsapp.com/channel/0029VbCjhoj9Gv7PuINMbo2Z)**

---

## Fitur Utama

- **Ultra-Ringan & Cepat:** Berjalan di atas engine JavaScriptCore milik Bun. Bebas *bloatware*, waktu respon internal bot hanya 2–5 ms dengan alokasi heap RAM sekitar 8–16 MB.
- **Autentikasi Fleksibel:** Mendukung **Pairing Code** (kode tautan 8 digit) maupun scan **QR Code**. Sesi disimpan di SQLite lokal (`.auth/state.sqlite`).
- **Auto-Reconnect Pintar:** Dilengkapi *exponential backoff retry* (1s s/d 30s) untuk menjaga koneksi tetap stabil tanpa *crash loop*.
- **Arsitektur Modular (1 Fitur = 1 File):** Sistem *auto-loader* otomatis mendeteksi dan mendaftarkan perintah di folder `src/plugins/` tanpa memerlukan file `index.ts` penghubung di setiap subfolder.
- **Tampilan Minimalis & Profesional:** Format pesan bersih, rapi, dan datar tanpa ornamen emoji berlebihan.

---

## Prasyarat Sistem

Sebelum menjalankan bot, pastikan server atau komputer Anda telah terpasang:
1. **[Bun](https://bun.sh/)** (versi 1.1 ke atas)
   ```bash
   curl -fsSL https://bun.sh/install | bash
   ```
2. **FFmpeg** (diperlukan untuk konversi stiker & video)
   ```bash
   # Debian / Ubuntu
   sudo apt-get update && sudo apt-get install -y ffmpeg zip
   ```

---

## Instalasi & Menjalankan Bot

1. **Clone repositori ini:**
   ```bash
   git clone https://github.com/v1slvffy/zabun.git
   cd zabun
   ```

2. **Pasang dependensi:**
   ```bash
   bun install
   ```

3. **Konfigurasi Environment:**
   Salin file template `.env.example` menjadi `.env`:
   ```bash
   cp .env.example .env
   ```
   Buka file `.env` dan sesuaikan nilainya:
   ```env
   # Masukkan nomor bot Anda jika ingin menggunakan Pairing Code
   PHONE_NUMBER=628xxxxxxxxxx
   
   PREFIX=!
   OWNER_NUMBER=628xxxxxxxxxx
   STICKER_PACKNAME=Zabun By
   STICKER_AUTHOR=v1slvffy
   ```

4. **Jalankan Bot:**
   ```bash
   bun start
   ```

5. **Hubungkan Perangkat:**
   - Jika Anda mengisi `PHONE_NUMBER`, terminal akan memunculkan **Pairing Code** 8 digit. Masukkan kode tersebut di aplikasi WhatsApp:
     > **WhatsApp $\to$ Perangkat Tertaut $\to$ Tautkan dengan nomor telepon**
   - Jika `PHONE_NUMBER` dikosongkan, terminal akan menampilkan **QR Code** untuk di-scan.

---

## Menjalankan di Latar Belakang (PM2)

Untuk deployment di VPS agar bot otomatis restart saat crash atau server reboot:

```bash
# Pasang PM2 secara global
bun add -g pm2

# Jalankan bot dengan PM2
pm2 start src/index.ts --interpreter bun --name "zabun"

# Simpan proses agar berjalan otomatis saat boot
pm2 save
pm2 startup
```

Melihat log:
```bash
pm2 logs zapo-bot
```

---

## Menambah Fitur Baru (Struktur Modular)

Cukup buat file `.ts` baru di dalam folder `src/plugins/<kategori>/`, misalnya `src/plugins/general/hello.ts`:

```typescript
import type { SubCommand } from '../../types/index.ts'

export const helloCommand: SubCommand = {
  name: 'hello',
  alias: ['hi'],
  category: 'general',
  description: 'Menyapa pengguna',

  async handler({ client, remoteJid, senderName, event }) {
    await client.message.send(
      remoteJid,
      `Halo, ${senderName || 'kawan'}! Senang bertemu denganmu.`,
      { quote: event }
    )
  },
}

export default helloCommand
```
File akan otomatis ter-load saat bot dijalankan ulang!

---

## Struktur Direktori

```text
├── .auth/                  # Database sesi WhatsApp
├── src/
│   ├── core/               # Inti bot (auth, config, group, loader, reconnect, stats, sticker, store)
│   ├── plugins/            # Modul fitur
│   │   ├── downloader/     # tiktok.ts
│   │   ├── general/        # help.ts, menu.ts, ping.ts
│   │   ├── group/          # demote.ts, hidetag.ts, infogrup.ts, kick.ts, linkgrup.ts, promote.ts, toggle.ts
│   │   ├── owner/          # backup.ts, mode.ts
│   │   └── sticker/        # sticker.ts
│   ├── types/              # Definisi interface TypeScript
│   └── index.ts            # Entry point bot
├── .env.example            # Template variabel environment
├── .gitignore              # Proteksi file sensitif & sesi
├── package.json
└── tsconfig.json
```

---

## Komunitas & Pembaruan

Ikuti saluran WhatsApp resmi untuk mendapatkan informasi pembaruan skrip, fitur baru, dan diskusi:

- **WhatsApp Channel:** [https://whatsapp.com/channel/0029VbCjhoj9Gv7PuINMbo2Z](https://whatsapp.com/channel/0029VbCjhoj9Gv7PuINMbo2Z)
- **GitHub Profile:** [@v1slvffy](https://github.com/v1slvffy)

---

## Lisensi

Didistribusikan di bawah lisensi MIT. Silakan gunakan dan kembangkan sesuai kebutuhan Anda.