// src/plugins/owner/mode.ts

import type { SubCommand } from '../../types/index.ts'
import { botConfig } from '../../core/config.ts'

export const selfCommand: SubCommand = {
  name: 'self',
  category: 'owner',
  description: 'Ubah bot ke mode Private/Self (hanya owner yang bisa akses)',
  ownerOnly: true,

  async handler({ client, remoteJid, event }) {
    botConfig.setMode('self')
    await client.message.send(
      remoteJid,
      `*Mode Bot Diubah*\nBot sekarang berada dalam mode *SELF* (hanya Owner yang dapat menggunakan bot).`,
      { quote: event }
    )
  },
}

export const publicCommand: SubCommand = {
  name: 'public',
  category: 'owner',
  description: 'Ubah bot ke mode Public (semua pengguna bisa akses)',
  ownerOnly: true,

  async handler({ client, remoteJid, event }) {
    botConfig.setMode('public')
    await client.message.send(
      remoteJid,
      `*Mode Bot Diubah*\nBot sekarang berada dalam mode *PUBLIC* (semua pengguna dapat menggunakan bot).`,
      { quote: event }
    )
  },
}

export default [selfCommand, publicCommand]
