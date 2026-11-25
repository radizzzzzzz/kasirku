/**
 * KasirKu Push Notification Backend Server (Node.js Native HTTP / Zero-Dependency)
 * 
 * Mengadaptasi alur Task 01 & Task 02 ke dalam backend arsitektur KasirKu:
 * 1. POST /api/notifications/register -> Menerima token dari mobile app & mencatat ke database
 * 2. POST /api/notifications/send     -> Mengirim push notifikasi via Expo Push API (https://exp.host/--/api/v2/push/send)
 * 3. GET  /api/notifications/tokens   -> Melihat daftar perangkat terdaftar
 * 4. POST /api/notifications/test-tx  -> Endpoint uji coba simulasi transaksi kasir
 * 
 * Skema Database (MySQL / PostgreSQL):
 * -----------------------------------------------------------------------------
 * CREATE TABLE device_tokens (
 *     id INT AUTO_INCREMENT PRIMARY KEY,
 *     user_id VARCHAR(64) NOT NULL,
 *     user_name VARCHAR(128) NOT NULL,
 *     push_token VARCHAR(255) NOT NULL UNIQUE,
 *     platform VARCHAR(32) DEFAULT 'expo',
 *     device_name VARCHAR(128),
 *     created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
 *     updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
 * );
 * -----------------------------------------------------------------------------
 */

const http = require('http');
const url = require('url');

const PORT = process.env.PORT || 3000;

// In-Memory Storage (Representasi Tabel `device_tokens`)
const deviceTokensDb = new Map();

// Helper validasi Expo Push Token (Format: ExponentPushToken[xxxx] atau ExpoPushToken[xxxx])
function isValidExpoPushToken(token) {
  return typeof token === 'string' && (token.startsWith('ExponentPushToken[') || token.startsWith('ExpoPushToken['));
}

// Helper pengirim response JSON
function sendJSON(res, statusCode, data) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  });
  res.end(JSON.stringify(data));
}

// Helper pembaca body JSON
function parseBody(req) {
  return new Promise((resolve) => {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk.toString();
    });
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (e) {
        resolve({});
      }
    });
  });
}

const server = http.createServer(async (req, res) => {
  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;
  const method = req.method;

  // Handle CORS Preflight
  if (method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    });
    return res.end();
  }

  // ---------------------------------------------------------------------------
  // TASK 01: POST /api/notifications/register
  // ---------------------------------------------------------------------------
  if (pathname === '/api/notifications/register' && method === 'POST') {
    const body = await parseBody(req);
    const { pushToken, user, platform = 'unknown' } = body;

    if (!pushToken) {
      return sendJSON(res, 400, {
        success: false,
        message: 'Parameter pushToken wajib disertakan!',
      });
    }

    const record = {
      pushToken,
      userId: user?.id || 'ANONYMOUS',
      userName: user?.name || 'Kasir',
      userRole: user?.role || 'Staff',
      platform,
      updatedAt: new Date().toISOString(),
    };

    deviceTokensDb.set(pushToken, record);
    console.log(`[Backend] Token berhasil didaftarkan: ${pushToken.substring(0, 30)}... untuk user: ${record.userName}`);

    return sendJSON(res, 200, {
      success: true,
      message: 'Perangkat berhasil didaftarkan untuk Push Notification KasirKu.',
      data: record,
    });
  }

  // ---------------------------------------------------------------------------
  // TASK 02: POST /api/notifications/send
  // ---------------------------------------------------------------------------
  if (pathname === '/api/notifications/send' && method === 'POST') {
    const body = await parseBody(req);
    const { to, title, body: notifBody, data = {} } = body;

    let targetTokens = [];
    if (to) {
      targetTokens = [to];
    } else {
      targetTokens = Array.from(deviceTokensDb.keys());
    }

    if (targetTokens.length === 0) {
      return sendJSON(res, 404, {
        success: false,
        message: 'Tidak ada device token terdaftar untuk dikirimi notifikasi.',
      });
    }

    const messages = targetTokens
      .filter((token) => isValidExpoPushToken(token))
      .map((token) => ({
        to: token,
        sound: 'default',
        title: title || 'KasirKu POS',
        body: notifBody || 'Pemberitahuan transaksi dari KasirKu',
        data: data,
        priority: 'high',
        channelId: 'default',
      }));

    if (messages.length === 0) {
      return sendJSON(res, 400, {
        success: false,
        message: 'Format token tidak valid untuk Expo Push Service. Pastikan berformat ExponentPushToken[...]',
      });
    }

    try {
      const response = await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Accept-Encoding': 'gzip, deflate',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(messages),
      });

      const expoResult = await response.json();
      console.log('[Backend] Hasil pengiriman Expo Push API:', expoResult);

      return sendJSON(res, 200, {
        success: true,
        message: `Notifikasi berhasil dikirim ke ${messages.length} perangkat.`,
        result: expoResult,
      });
    } catch (err) {
      console.error('[Backend] Gagal mengirim ke Expo Push API:', err);
      return sendJSON(res, 500, {
        success: false,
        message: 'Terjadi kesalahan saat memproses pengiriman notifikasi ke Expo Push Service.',
        error: err.message,
      });
    }
  }

  // ---------------------------------------------------------------------------
  // TASK 02 Helper: POST /api/notifications/test-tx
  // ---------------------------------------------------------------------------
  if (pathname === '/api/notifications/test-tx' && method === 'POST') {
    const body = await parseBody(req);
    const { token, total = 'Rp 85.000' } = body;
    const targetToken = token || Array.from(deviceTokensDb.keys())[0];

    if (!targetToken) {
      return sendJSON(res, 400, {
        success: false,
        message: 'Daftarkan minimal satu perangkat terlebih dahulu melalui mobile app!',
      });
    }

    const payload = {
      to: targetToken,
      title: 'Pembayaran Sukses! (KasirKu)',
      body: `Transaksi tunai senilai ${total} berhasil diterima oleh kasir.`,
      data: {
        screen: 'RIWAYAT',
        transactionId: `TRX-${Date.now().toString().slice(-4)}`,
        timestamp: new Date().toISOString(),
      },
    };

    try {
      const response = await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });
      const result = await response.json();
      return sendJSON(res, 200, { success: true, payload, result });
    } catch (e) {
      return sendJSON(res, 500, { success: false, error: e.message });
    }
  }

  // ---------------------------------------------------------------------------
  // GET /api/notifications/tokens (Daftar Perangkat)
  // ---------------------------------------------------------------------------
  if (pathname === '/api/notifications/tokens' && method === 'GET') {
    const tokens = Array.from(deviceTokensDb.values());
    return sendJSON(res, 200, {
      total: tokens.length,
      devices: tokens,
    });
  }

  // Health check endpoint
  if (pathname === '/' || pathname === '/health') {
    return sendJSON(res, 200, {
      status: 'OK',
      app: 'KasirKu Push Notification Server',
      registeredDevices: deviceTokensDb.size,
      timestamp: new Date().toISOString(),
    });
  }

  return sendJSON(res, 404, { error: 'Endpoint tidak ditemukan' });
});

if (require.main === module) {
  server.listen(PORT, () => {
    console.log(`=======================================================`);
    console.log(` KasirKu Push Notification Server Berjalan di Port ${PORT}`);
    console.log(` URL Server: http://localhost:${PORT}`);
    console.log(` - Registrasi Token: POST http://localhost:${PORT}/api/notifications/register`);
    console.log(` - Kirim Push Notif: POST http://localhost:${PORT}/api/notifications/send`);
    console.log(` - Uji Transaksi:    POST http://localhost:${PORT}/api/notifications/test-tx`);
    console.log(` - Cek Token:        GET  http://localhost:${PORT}/api/notifications/tokens`);
    console.log(`=======================================================`);
  });
}

module.exports = server;
