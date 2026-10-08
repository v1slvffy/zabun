// src/plugins/group/linkgrup.ts

import type { SubCommand } from '../../types/index.ts'

export const linkGrupCommand: SubCommand = {
  name: 'linkgrup',
  alias: ['linkgc'],
  category: 'groupAdmin',
  description: 'Dapatkan link undangan grup WhatsApp',
  groupOnly: true,
  adminOnly: true,
  botAdminRequired: true,

  async handler({ client, remoteJid, event }) {
    try {
      const code = await client.group.queryInviteCode(remoteJid)
      await client.message.send(
        remoteJid,
        `*Tautan Undangan Grup:*\nhttps://chat.whatsapp.com/${code}`,
        { quote: event }
      )
    } catch (err) {
      await client.message.send(remoteJid, 'Gagal mengambil link grup.', { quote: event })
    }
  },
}

export default linkGrupCommand
