// src/core/auth.ts
// Menangani QR code dan pairing code authentication

import qrcode from 'qrcode-terminal'
import type { WaClient } from 'zapo-js'

/**
 * Daftarkan listener auth ke client.
 *
 * Mode ditentukan dari env:
 *  - PHONE_NUMBER di-set → pairing code
 *  - tidak di-set        → QR code (default)
 */
export function setupAuth(client: WaClient): void {
  const rawPhone = process.env.PHONE_NUMBER?.trim()
  // Bersihkan format nomor: hanya angka
  const phoneNumber = rawPhone ? rawPhone.replace(/\D/g, '') : ''

  if (phoneNumber) {
    console.log(`[Auth] Mode: Pairing Code (nomor: ${phoneNumber})`)

    let isRequesting = false

    // Begitu server siap (emisi QR/companion refs pertama), request pairing code
    client.on('auth_qr', async () => {
      if (isRequesting) return
      isRequesting = true

      console.log('[Auth] Menghubungkan ke WhatsApp, meminta pairing code...')
      try {
        await client.auth.requestPairingCode(phoneNumber)
      } catch (err) {
        console.error('[Auth] Gagal meminta pairing code:', err)
        isRequesting = false
      }
    })

    // Tangkap kode saat di-emit oleh zapo
    client.on('auth_pairing_code', ({ code }) => {
      const formatted = code.match(/.{1,4}/g)?.join('-') ?? code
      console.log('\n----------------------------------------')
      console.log('        MASUKKAN KODE INI DI HP:        ')
      console.log(`             ${formatted.padEnd(27)}`)
      console.log('----------------------------------------')
      console.log('WhatsApp > Perangkat Tertaut > Tautkan dengan nomor telepon\n')
    })

    // Jika server meminta refresh kode pairing
    client.on('auth_pairing_required', async ({ forceManual }) => {
      if (forceManual) {
        console.log('[Auth] Kode pairing kedaluwarsa, meminta kode baru...')
        try {
          await client.auth.requestPairingCode(phoneNumber)
        } catch (err) {
          console.error('[Auth] Gagal refresh pairing code:', err)
        }
      }
    })
  } else {
    console.log('[Auth] Mode: QR Code')

    client.on('auth_qr', ({ qr, ttlMs }) => {
      console.clear()
      console.log(`\nBot WhatsApp - Scan QR (berlaku ${Math.round(ttlMs / 1000)}s)\n`)
      qrcode.generate(qr, { small: true })
      console.log('\nWhatsApp > Perangkat Tertaut > Tautkan perangkat\n')
    })
  }

  client.on('auth_paired', ({ credentials }) => {
    console.log(`\n[Auth] Berhasil terhubung dan ter-pair sebagai: ${credentials.meJid}\n`)
  })
}
