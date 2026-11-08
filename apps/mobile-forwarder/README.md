# 📱 PayGateway Forwarder (Flutter Android)

Aplikasi Android resmi mandiri untuk **PayGateway Hub**. Berfungsi sebagai jembatan sinkronisasi mutasi otomatis dari aplikasi e-Wallet (DANA, GoPay) dan Bank (BCA, Mandiri, BRI) di HP Android Anda ke server tanpa perlu aplikasi pihak ketiga seperti MacroDroid.

---

## 🚀 Fitur Utama

1. **Auto-Listener Notifikasi (100% Gratis & Open-Source):**
   - Menggunakan Android `NotificationListenerService` resmi.
   - Mendengarkan notifikasi uang masuk dari **DANA**, **GoPay**, **BCA**, **Mandiri**, dan **BRI**.
2. **Filter Fleksibel:**
   - Filter chip interaktif untuk memilih e-Wallet / Bank mana saja yang ingin disinkronkan.
3. **Smart Parser Terintegrasi:**
   - Mengirim teks notifikasi secara otomatis ke server `pay.josapratama.com`.
   - Server otomatis mengekstrak nominal uang (contoh: `Rp 149.998` -> `149998`), mencocokkan dengan invoice pending, dan membuka akses kursus secara instan.
4. **Live Activity Feed:**
   - Melihat riwayat transfer yang berhasil di-forward ke server lengkap dengan timestamp dan status HTTP (200 OK).
5. **Tombol "Test Kirim Mutasi":**
   - Menguji koneksi langsung ke server tanpa perlu transfer uang asli.
6. **Simpan Pengaturan Lokal:**
   - Menggunakan `shared_preferences` untuk menyimpan Server URL dan Admin Secret Key.

---

## 🛠️ Cara Build APK & Install ke HP

### 1. Build APK Debug / Release
Jalankan perintah ini di terminal:
```bash
cd "d:\coding\raspberry pi\project\paygateway_forwarder"
flutter build apk --release
```
File APK siap instal akan berada di:
`build/app/outputs/flutter-apk/app-release.apk`

### 2. Pasang ke HP Android
1. Kirim file `app-release.apk` ke HP Android Anda (bisa lewat WhatsApp, Google Drive, atau kabel USB).
2. Buka file APK di HP dan pilih **Install** (Izinkan instal dari sumber tidak dikenal jika diminta).

### 3. Penggunaan Pertama Kali di HP
1. Buka aplikasi **PayGateway Forwarder**.
2. Di bagian atas, ketuk tombol biru **"Beri Izin"** (*Notification Access*).
3. Cari nama aplikasi **PayGateway Forwarder** di daftar pengaturan Android, lalu ubah ke posisi **Aktif (Izinkan)**.
4. Kembali ke aplikasi, status akan langsung berubah menjadi hijau: **Akses Notifikasi Aktif**.
5. Ketuk tombol **"Test Kirim Mutasi"** untuk memastikan koneksi ke server berhasil (`200 OK`).

Selesai! Sekarang setiap kali ada uang masuk di DANA atau GoPay, aplikasi akan otomatis mem-forward ke server dan melunasi transaksi dalam 1 detik!
