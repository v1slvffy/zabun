// src/plugins/group/hidetag.ts

import type { SubCommand } from '../../types/index.ts'
import { getGroupMetadata } from '../../core/group.ts'

export const hidetagCommand: SubCommand = {
  name: 'hidetag',
  alias: ['tagall'],
  category: 'groupAdmin',
  description: 'Tag / mention seluruh anggota grup dengan pesan. Contoh: !hidetag Pengumuman!',
  groupOnly: true,
  adminOnly: true,

  async handler({ client, remoteJid, args, groupMetadata, event }) {
    const meta = groupMetadata ?? (await getGroupMetadata(client, remoteJid))
    if (!meta || !Array.isArray(meta.participants)) {
      await client.message.send(remoteJid, 'Gagal mengambil data anggota grup.', { quote: event })
      return
    }

    const messageText = args.join(' ').trim() || 'Pengumuman untuk seluruh anggota grup!'
    const mentions = meta.participants.map((p: any) => p.jid).filter(Boolean)

    await client.message.send(
      remoteJid,
      {
        type: 'text',
        text: `*PENGUMUMAN*\n\n${messageText}`,
      },
      {
        mentions,
        quote: event,
      }
    )
  },
}

export default hidetagCommand
