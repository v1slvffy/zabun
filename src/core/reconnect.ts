// src/core/reconnect.ts
// Loop reconnect dengan exponential backoff

import type { WaClient } from 'zapo-js'

const MAX_ATTEMPTS = 10
const BASE_DELAY_MS = 1_000
const MAX_DELAY_MS = 30_000

/**
 * Hubungkan client dan pasang handler reconnect otomatis.
 */
export async function connectWithRetry(client: WaClient): Promise<void> {
  let attempt = 0
  let reconnecting = false

  client.on('connection', (event) => {
    if (event.status === 'open') {
      attempt = 0
      reconnecting = false
      const creds = client.getCredentials()
      const jid = creds?.meJid?.split(':')[0] ?? creds?.meJid ?? 'WhatsApp'
      console.log(`[Koneksi] Bot aktif & terhubung! [${jid}]`)
      return
    }

    const reason = event.reason ?? 'unknown'

    if (event.isLogout) {
      console.error('[Koneksi] Sesi di-logout dari HP. Hapus folder .auth/ untuk pair ulang.')
      process.exit(1)
    }

    console.warn(`[Koneksi] Koneksi terputus (${reason})`)

    if (!reconnecting) {
      reconnecting = true
      void scheduleReconnect()
    }
  })

  async function scheduleReconnect(): Promise<void> {
    if (attempt >= MAX_ATTEMPTS) {
      console.error(`[Koneksi] Reconnect gagal setelah ${attempt} percobaan.`)
      process.exit(1)
    }

    const delayMs = Math.min(MAX_DELAY_MS, BASE_DELAY_MS * 2 ** attempt)
    attempt++
    console.log(`[Koneksi] Reconnect ke-${attempt} dalam ${Math.round(delayMs / 1000)}s...`)

    await Bun.sleep(delayMs)

    try {
      await client.connect()
    } catch (err) {
      void scheduleReconnect()
    }
  }

  // Koneksi awal
  await client.connect()
}
