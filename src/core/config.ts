// src/core/config.ts

import type { WaClient } from 'zapo-js'

export type BotMode = 'public' | 'self'

class BotConfig {
  /** Mode akses bot: 'public' (semua orang) atau 'self' (hanya owner) */
  mode: BotMode = 'public'

  /** Daftar nomor owner tambahan dari .env (angka saja, tanpa +) */
  private extraOwners: Set<string> = new Set()

  constructor() {
    this.reloadOwners()
  }

  /** Reload daftar owner dari env */
  reloadOwners(): void {
    this.extraOwners.clear()
    const envOwners = process.env.OWNER_NUMBER ?? ''
    for (const num of envOwners.split(',')) {
      const clean = num.replace(/\D/g, '').trim()
      if (clean) this.extraOwners.add(clean)
    }
  }

  /** Set mode bot */
  setMode(mode: BotMode): void {
    this.mode = mode
  }

  /** Ambil mode bot saat ini */
  getMode(): BotMode {
    return this.mode
  }

  isOwner(senderJid: string, fromMe: boolean, client: WaClient): boolean {
    // Bot itu sendiri selalu owner
    if (fromMe) return true

    const creds = client.getCredentials()
    const botNumber = creds?.meJid?.split(':')[0]?.split('@')[0] ?? ''

    // Bersihkan sender number (hanya angka)
    const senderNumber = senderJid.split(':')[0]?.split('@')[0]?.replace(/\D/g, '') ?? ''

    if (botNumber && senderNumber === botNumber) {
      return true
    }

    if (this.extraOwners.has(senderNumber)) {
      return true
    }

    return false
  }
}

export const botConfig = new BotConfig()
