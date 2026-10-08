// src/plugins/group/toggle.ts
// Fitur toggle buka / tutup grup untuk pesan anggota biasa

import type { SubCommand } from '../../types/index.ts'
import { invalidateGroupCache } from '../../core/group.ts'

export const groupToggleCommand: SubCommand = {
  name: 'group',
  category: 'groupAdmin',
  description: 'Buka atau tutup izin chat grup. Contoh: !group open / !group close',
  groupOnly: true,
  adminOnly: true,
  botAdminRequired: true,

  async handler({ client, remoteJid, args, event }) {
    const action = args[0]?.toLowerCase()

    if (action === 'open' || action === 'buka') {
      await client.group.setSetting(remoteJid, 'announcement', false)
      invalidateGroupCache(remoteJid)
      await client.message.send(
        remoteJid,
        '*Grup Dibuka*\nSekarang semua anggota grup dapat mengirim pesan.',
        { quote: event }
      )
    } else if (action === 'close' || action === 'tutup') {
      await client.group.setSetting(remoteJid, 'announcement', true)
      invalidateGroupCache(remoteJid)
      await client.message.send(
        remoteJid,
        '*Grup Ditutup*\nSekarang hanya Admin grup yang dapat mengirim pesan.',
        { quote: event }
      )
    } else {
      await client.message.send(
        remoteJid,
        '*Format Salah*\nGunakan:\n• `!group open` (membuka grup)\n• `!group close` (menutup grup)',
        { quote: event }
      )
    }
  },
}

export default groupToggleCommand
