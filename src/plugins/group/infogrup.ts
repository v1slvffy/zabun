// src/plugins/group/infogrup.ts

import type { SubCommand } from '../../types/index.ts'
import { getGroupMetadata } from '../../core/group.ts'

export const infoGrupCommand: SubCommand = {
  name: 'infogrup',
  category: 'group',
  description: 'Tampilkan informasi detail grup dan daftar admin',
  groupOnly: true,

  async handler({ client, remoteJid, groupMetadata, event }) {
    const meta = groupMetadata ?? (await getGroupMetadata(client, remoteJid))
    if (!meta) {
      await client.message.send(remoteJid, 'Gagal memuat informasi grup.', { quote: event })
      return
    }

    const participants = meta.participants ?? []
    const admins = participants.filter((p: any) => p.isAdmin || p.isSuperAdmin)

    const adminList = admins
      .map((a: any, i: number) => {
        const displayNum = (a.phoneNumber || a.jid || '').split(':')[0]?.split('@')[0] ?? ''
        return `  ${i + 1}. @${displayNum}`
      })
      .join('\n')

    const body = [
      `*INFORMASI GRUP*`,
      `Nama: ${meta.subject}`,
      `ID: ${remoteJid}`,
      `Total Anggota: ${participants.length}`,
      `Total Admin: ${admins.length}`,
      `Status Chat: ${meta.announce ? 'Hanya Admin' : 'Semua Anggota'}`,
      ``,
      `*Daftar Admin Grup:*`,
      adminList || '  (Tidak ada data admin)',
    ].join('\n')

    const adminMentions = Array.from(
      new Set(admins.flatMap((a: any) => [a.jid, a.lid, a.phoneNumber].filter(Boolean)))
    )
    await client.message.send(remoteJid, body, {
      mentions: adminMentions,
      quote: event,
    })
  },
}

export default infoGrupCommand
