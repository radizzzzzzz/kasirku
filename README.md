# KasirKu – Aplikasi Kasir, Presensi, dan Manajemen Shift Berbasis Mobile

Aplikasi mobile kasir modern (**Point of Sale**) yang mengintegrasikan pencatatan pesanan, katalog menu, pembuatan nota transaksi otomatis, presensi kehadiran pekerja, dan manajemen pergantian shift kasir (rekonsiliasi saldo fisik vs sistem).

Aplikasi ini dibangun menggunakan **React Native + Expo** dengan bahasa **JavaScript** dan penyimpanan lokal **AsyncStorage**, siap dijalankan langsung di smartphone melalui **Expo Go**.

---

## 🌟 Masalah & Solusi yang Diatasi

- **Masalah:**
  1. Transaksi, presensi, dan pergantian shift kasir yang masih manual rawan human-error.
  2. Pemilik usaha kesulitan memantau pekerja yang bertugas pada setiap transaksi.
  3. Ketidaksesuaian antara uang tunai di laci kasir dengan total penjualan di sistem saat serah terima shift.
- **Solusi:**
  1. Integrasi kasir digital: Pilih menu, tentukan jumlah & catatan khusus, hitung diskon dan subtotal secara otomatis.
  2. Pembuatan **Nota Digital** bergaya thermal receipt lengkap dengan nama kasir, shift aktif, nomor nota, dan fitur **Bagikan Nota** (Share via WhatsApp/Notes).
  3. **Presensi Pekerja**: Catat jam masuk (Clock-In) dan jam pulang (Clock-Out) dengan deteksi status *Tepat Waktu* atau *Terlambat*.
  4. **Manajemen Shift**: Input modal awal laci (*Opening Cash*), rekapitulasi real-time penjualan tunai & QRIS, serta rekonsiliasi uang fisik saat tutup shift (*Closing Cash*) dengan deteksi selisih otomatis.

---

## 📱 Core Fitur

### 1. Kasir (Point of Sale)
- Filter kategori menu (*Semua, Makanan, Minuman, Snack, Paket*).
- Kolom pencarian menu real-time.
- Pemilihan produk dengan kontrol kuantitas (+ / -), deteksi batas stok, dan catatan kustom per item (*misal: "Kurang manis", "Pedas"*).
- Floating Bar Keranjang & Drawer Keranjang lengkap.
- Pembayaran fleksibel:
  - **Tunai / Cash**: Tombol pecahan uang cepat (*Uang Pas, Rp 20.000, Rp 50.000, Rp 100.000*), input nominal kustom, dan hitung uang kembalian otomatis.
  - **QRIS / Transfer**: Tampilan barcode QRIS standar nasional dan verifikasi otomatis.
  - Fitur diskon persentase (Normal, 5%, 10%, 15%).

### 2. Nota Digital
- Desain struk belanja digital thermal yang rapi dan elegan.
- Rincian toko, nomor nota unik, tanggal & waktu transaksi, nama kasir, shift, rincian pesanan, subtotal, diskon, grand total, dan metode pembayaran.
- Tombol **Bagikan Nota** menggunakan native Share dialog untuk dikirimkan ke pelanggan via WhatsApp, SMS, dll.

### 3. Katalog Menu & Harga
- Menampilkan seluruh daftar menu beserta harga jual, harga modal, dan sisa stok.
- Tambah menu baru (Nama, Kategori, Harga Jual, Modal, Stok, Deskripsi).
- Edit data menu dan hapus menu dengan dialog konfirmasi.
- Toggle ketersediaan menu secara cepat (*Tersedia / Habis*).

### 4. Manajemen Shift & Rekonsiliasi Kas
- Informasi shift aktif (*Pagi, Siang, Malam*), jam mulai, dan kasir yang bertugas.
- Menampilkan nominal **Uang Seharusnya di Laci** (*Modal Awal + Total Penjualan Tunai*).
- **Tutup Shift & Rekap Kasir**:
  - Input jumlah uang fisik aktual di laci.
  - Sistem otomatis menghitung selisih (*Kas Sesuai, Kelebihan Kas, atau Kekurangan Kas*).
  - Catatan serah terima shift.
- Buka shift baru dengan menentukan modal awal kasir.
- Riwayat seluruh serah terima shift sebelumnya.

### 5. Presensi & Kehadiran Pekerja
- Jam digital real-time (*Live Clock*) dan tanggal hari ini.
- Presensi Masuk (*Clock-In*) dengan deteksi otomatis status *Tepat Waktu* atau *Terlambat*.
- Presensi Pulang (*Clock-Out*) dengan perhitungan durasi jam kerja.
- Ganti akun pekerja yang sedang bertugas (*Multi-employee support*).
- Log riwayat kehadiran pekerja.

### 6. Riwayat Transaksi & Ringkasan Keuangan
- Ringkasan omset total, total transaksi, total penjualan tunai, dan total QRIS.
- Filter transaksi berdasarkan metode pembayaran (*Semua, Tunai, QRIS*).
- Klik kartu transaksi mana saja untuk membuka kembali **Nota Digital**.

### 7. Otentikasi & Arsitektur Dual-Storage (Secure Storage & Local Storage)
- **Layar Login & Registrasi Akun**:
  - Validasi username/email dan password sebelum dapat mengakses sistem kasir.
  - Fitur intip password (show/hide password).
  - Opsi *Ingat Sesi Login* (*Remember Me*).
  - Pilihan cepat akun demo (1-klik isi akun bawaan untuk mempermudah testing).
  - Registrasi user baru dengan pemilihan peran (*Kasir & Barista, Kasir & Kitchen, Supervisor, Admin*).
  - Fitur **Logout / Keluar Sesi** langsung dari Header atau modal profil kasir.
- **Arsitektur Dual Storage**:
  - 🔐 **Secure Storage (`expo-secure-store`)**: Menyimpan kata sandi, token otentikasi sesi aktif, dan kredensial login terenkripsi secara aman menggunakan hardware Keystore (Android) / Keychain (iOS) dengan fallback yang aman.
  - 💾 **Local Storage (`AsyncStorage`)**: Menyimpan data operasional aplikasi offline seperti katalog produk, keranjang, riwayat shift, transaksi, dan data toko.

---

## 📁 Struktur Folder Proyek

```
try_mobile/
├── assets/                  # Icon dan asset visual
├── src/
│   ├── constants/
│   │   ├── initialData.js   # Data awal produk, pekerja, info toko
│   │   └── theme.js         # Sistem warna, tipografi, bayangan (shadow)
│   ├── services/
│   │   ├── storage.js       # Local Storage (AsyncStorage) untuk data transaksi, katalog, shift
│   │   └── secureStorage.js # Secure Storage (Hardware Keystore/Keychain) untuk auth & password
│   ├── components/
│   │   ├── Header.js        # Header atas dengan profil kasir, logout & status shift
│   │   ├── ProductCard.js   # Kartu produk dengan kontrol jumlah & stok
│   │   ├── CartModal.js     # Drawer keranjang pesanan
│   │   ├── PaymentModal.js  # Modal pembayaran Tunai & QRIS
│   │   └── ReceiptModal.js  # Modal Nota Digital + Fitur Share
│   └── screens/
│       ├── AuthScreen.js    # Layar Autentikasi (Login & Registrasi User)
│       ├── KasirScreen.js   # Layar Kasir POS utama
│       ├── MenuScreen.js    # Layar Manajemen Menu & Harga
│       ├── ShiftScreen.js   # Layar Buka & Tutup Shift (Rekonsiliasi Kas)
│       ├── PresensiScreen.js# Layar Presensi Masuk & Pulang Pekerja
│       └── RiwayatScreen.js # Layar Riwayat Transaksi & Ringkasan Omset
├── App.js                   # Navigasi Tab Bottom Bar & State Utama
├── app.json                 # Konfigurasi Expo
├── babel.config.js          # Babel preset Expo
└── package.json             # Dependensi proyek
```

---

## 🚀 Cara Menjalankan di Expo Go (HP Smartphone)

1. **Pastikan HP dan Laptop terhubung ke jaringan Wi-Fi yang sama** (atau hotspot HP).
2. Install aplikasi **Expo Go** di smartphone melalui Google Play Store (Android) atau App Store (iOS).
3. Buka terminal di folder proyek ini (`try_mobile`), lalu jalankan perintah:
   ```bash
   npx expo start
   ```
   *(atau `npm start`)*
4. Terminal akan menampilkan **QR Code**:
   - **Android**: Buka aplikasi Expo Go di HP, pilih tombol **"Scan QR code"**, lalu arahkan kamera ke QR code di terminal.
   - **iOS**: Buka aplikasi Kamera bawaan iPhone, arahkan ke QR code, lalu klik banner untuk membuka di Expo Go.
5. Aplikasi **KasirKu** akan langsung terbuka dan siap didemokan!
