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
│   │   ├── jwt.js           # Generator & Verifikator standar JWT (Header.Payload.Signature)
│   │   ├── api.js           # API Service, Client interceptor, & Protected Endpoint
│   │   ├── storage.js       # Local Storage (AsyncStorage) untuk operasional offline
│   │   └── secureStorage.js # Secure Storage (Hardware Keystore/Keychain) untuk access_token
│   ├── components/
│   │   ├── Header.js        # Header atas dengan profil kasir, logout & status shift
│   │   ├── ProductCard.js   # Kartu produk dengan kontrol jumlah & stok
│   │   ├── CartModal.js     # Drawer keranjang pesanan
│   │   ├── PaymentModal.js  # Modal pembayaran Tunai & QRIS
│   │   └── ReceiptModal.js  # Modal Nota Digital + Fitur Share
│   ├── screens/
│   │   ├── AuthScreen.js    # Layar Autentikasi (Login, Register & Modal Token Diterima)
│   │   ├── KasirScreen.js   # Layar Kasir POS utama
│   │   ├── MenuScreen.js    # Layar Manajemen Menu & Harga (Toggle Responsif & Sync API)
│   │   ├── ShiftScreen.js   # Layar Buka & Tutup Shift (Rekonsiliasi Kas)
│   │   ├── PresensiScreen.js# Layar Presensi Masuk & Pulang Pekerja
│   │   └── RiwayatScreen.js # Layar Riwayat Transaksi & Ringkasan Omset
├── App.js                   # State Utama, Navigasi Tab, Uji Coba Token & Log Console
├── app.json                 # Konfigurasi Expo
├── babel.config.js          # Babel preset Expo
└── package.json             # Dependensi proyek
```

---

## 🔐 Implementasi Token Authentication (Sesuai Materi Kuliah)

Aplikasi telah mengimplementasikan arsitektur keamanan API berbasis token sesuai Task 01, Task 02, dan Task 03:

### 1. Task 01 – Login & Store Access Token (SecureStore)
- Pengguna memasukkan username/email dan password di layar Login.
- Request dikirimkan ke endpoint `POST /login`.
- Server mengembalikan response JSON berisi `access_token` (format standar JWT: `Header.Payload.Signature`) dan data user.
- Token disimpan secara aman di perangkat menggunakan `SecureStore` (Hardware Keystore di Android / Keychain di iOS) dengan key `"access_token"`.
- Muncul modal konfirmasi *"Login Berhasil: Token berhasil diterima dan disimpan"* lengkap dengan preview token.

### 2. Task 02 – Attach Token to Protected API Request
- Saat membuka katalog menu atau memuat data, aplikasi mengambil token dari SecureStore:
  `const token = await SecureStore.getItemAsync("access_token");`
- Token dikirimkan melalui header `Authorization`:
  `Authorization: Bearer <access_token>`
- Server memvalidasi tanda tangan (signature) dan masa berlaku (*exp*) token:
  - **Jika token valid**: Mengembalikan data menu (HTTP 200 OK).
  - **Jika tanpa token / tidak valid**: Server menolak dengan status HTTP 401 Unauthorized.

### 3. Task 03 – Protect Session & Logout (Hapus Token)
- Pengguna dapat keluar kapan saja dengan menekan tombol Logout di Header atau Modal Profil.
- Token dihapus secara permanen dari SecureStore:
  `await SecureStore.deleteItemAsync("access_token");`
- State `authSession` direset menjadi `null` dan aplikasi secara otomatis kembali ke layar Login (*Unauthenticated*).

---

## ⚡ Implementasi Sprint 05 – Error Handling, Loading, Timeout, & Offline

Sesuai materi **Sprint 05 Mobile Programming** (TASK 01, TASK 02, TASK 03, dan FINAL CHECKLIST), aplikasi KasirKu telah dilengkapi dengan penanganan kondisi API dan jaringan yang tangguh:

### 1. Task 01 – Handle API Error (2xx, 4xx, 5xx, & Network)
- **Status 2xx (Success)**: Menampilkan katalog menu dan daftar harga ketika request berhasil diterima.
- **Status 4xx (Client Error)**: Menangani error client seperti `404 Not Found` atau `401 Unauthorized`. Menampilkan ilustrasi peringatan merah *"Data tidak ditemukan. Menu yang Anda cari tidak tersedia. (404 Not Found)"* disertai tombol *"Coba Lagi"*. Data tidak ditampilkan saat gagal.
- **Status 5xx (Server Error)**: Menangani gangguan server seperti `500 Internal Server Error`. Menampilkan icon stack server rusak *"Terjadi kesalahan pada server. Server sedang mengalami gangguan. Silakan coba lagi nanti. (500 Internal Server Error)"* disertai tombol *"Coba Lagi"*.
- **Response Diperiksa**: Menggunakan kode standar:
  ```javascript
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }
  const data = await response.json();
  ```

### 2. Task 02 – Loading, Error & Retry Flow
- **Alur Request**: `REQUEST -> LOADING -> ERROR -> RETRY -> REQUEST AGAIN`.
- **Loading State**: Spinner animasi lingkaran + teks *"Memuat data... Mohon tunggu sebentar."*.
- **Retrying State**: Ketika tombol *"Coba Lagi"* ditekan, tampilan bertransisi ke *"Mencoba lagi... Mengambil data terbaru."*.
- **Retry Mechanism**: Mengirim ulang request ke API secara otomatis tanpa perlu restart aplikasi.

### 3. Task 03 – Handle Offline & Feedback Jaringan
- **Alur Offline**: `REQUEST -> NO INTERNET -> OFFLINE STATE -> USER FEEDBACK -> RETRY`.
- **Offline State**: Icon Wi-Fi silang merah + teks *"Tidak ada koneksi internet. Periksa koneksi Anda dan coba lagi."* + tombol *"Coba Lagi"*.
- **Offline Banner Global**: Banner merah melayang di bawah Header pada seluruh halaman saat offline terdeteksi.
- **Auto Reconnect / Retry**: Menampilkan *"Mencoba lagi... Menghubungkan ke internet."* lalu memuat data normal saat koneksi kembali aktif.

### 4. Sprint 05 – Integrasi Langsung Pada Siklus Hidup Aplikasi
Fitur error handling, loading, timeout, dan offline diterapkan secara langsung pada siklus hidup aplikasi (*natural & native application lifecycle*):
- **Deteksi Jaringan Nyata**: Aplikasi mendeteksi status internet HP/Browser secara langsung. Jika Wi-Fi atau data seluler dimatikan, aplikasi langsung menampilkan **Offline State View** dan **Banner Global Offline**.
- **Pull to Refresh**: Pengguna dapat menarik layar ke bawah (*pull-to-refresh*) untuk memuat ulang data terbaru dari API.
- **Empty State Alami**: Jika belum ada menu di database lokal, aplikasi otomatis menampilkan ilustrasi kotak kosong (*"Belum ada data"*) dan tombol *"Muat Menu Bawaan"*.
- **Timeout Otomatis**: Jika request melebihi batas waktu 4 detik, request dibatalkan (*Abort*) dan memicu tampilan *"Waktu permintaan habis"*.

---

## 🎯 Panduan Menjawab Pertanyaan Dosen Saat Demo

| No | Pertanyaan Demo | Jawaban Tepat Sesuai Arsitektur |
|---|---|---|
| **1** | **Bagaimana aplikasi menangani status response API?** | Aplikasi memeriksa properti `response.ok` dan kode status HTTP. Jika status berada di luar rentang 2xx (seperti 4xx atau 5xx), aplikasi melempar error terstruktur (`ApiError`) dan menampilkan UI error ramah pengguna beserta tombol Coba Lagi tanpa menyebabkan crash. |
| **2** | **Apa yang terjadi jika server sedang down (HTTP 500)?** | Ditangkap oleh blok `catch`, status diubah menjadi `error`, dan komponen `ApiStateView` menampilkan icon gangguan server dengan pesan spesifik 500 serta tombol Coba Lagi. Data lama atau rusak tidak ditampilkan ke layar. |
| **3** | **Bagaimana aplikasi menangani kondisi offline?** | Layanan `NetworkService` memantau konektivitas internet. Jika tidak ada koneksi, request langsung memicu tampilan offline dengan icon Wi-Fi silang dan banner offline global. Tombol "Coba Lagi" akan mencoba menghubungkan kembali perangkat ke internet. |
| **4** | **Bagaimana cara kerja Timeout Handling?** | Request dibungkus dengan batas waktu (misal 4 detik). Jika server tidak membalas dalam batas waktu tersebut, request dibatalkan (*abort*) dan memicu state Timeout dengan icon jam waktu *"Waktu permintaan habis. Server tidak merespons"*. |
| **5** | **Bagaimana cara mendemokan kondisi offline & error langsung?** | **Uji Offline**: Matikan Wi-Fi atau aktifkan *Airplane Mode* pada HP / browser -> Buka tab **Menu** -> Aplikasi otomatis menampilkan layar Offline dengan tombol *"Coba Lagi"* dan banner merah atas. Nyalakan Wi-Fi kembali lalu klik *"Coba Lagi"* -> data langsung pulih (**Success State**)! |

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
