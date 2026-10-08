// src/plugins/general/help.ts

import type { SubCommand } from '../../types/index.ts'
import { getAllCommands } from '../../core/loader.ts'

export const helpCommand: SubCommand = {
  name: 'help',
  category: 'general',
  description: 'Info penggunaan sebuah command. Contoh: !help ping',

  async handler({ client, remoteJid, args, event }) {
    const prefix = process.env.PREFIX ?? '!'
    const target = args[0]?.toLowerCase()
    const allCommands = getAllCommands()

    if (!target) {
      const body = [
        `*PANDUAN PENGGUNAAN BOT*`,
        ``,
        `• Ketik *${prefix}<command>* untuk menjalankan fitur`,
        `• Ketik *${prefix}menu* untuk daftar seluruh menu`,
        `• Ketik *${prefix}help <nama>* untuk detail command tertentu`,
        ``,
        `Contoh: *${prefix}help ping*`,
      ].join('\n')
      await client.message.send(remoteJid, body, { quote: event })
      return
    }

    const found = allCommands.find(
      (c) => c.name === target || (Array.isArray(c.alias) && c.alias.includes(target))
    )
    if (!found) {
      await client.message.send(
        remoteJid,
        `Command *${prefix}${target}* tidak ditemukan.\nKetik *${prefix}menu* untuk daftar command.`,
        { quote: event }
      )
      return
    }

    const badges: string[] = []
    if (found.ownerOnly) badges.push('Khusus Owner')
    if (found.adminOnly) badges.push('Khusus Admin Grup')
    if (found.groupOnly) badges.push('Khusus di Grup')
    if (found.botAdminRequired) badges.push('Bot Harus Admin')

    const badgeStr = badges.length > 0 ? `\n_(${badges.join(' | ')})_` : ''
    const aliasStr = Array.isArray(found.alias) && found.alias.length > 0
      ? `\nAlias: ${found.alias.map((a) => `${prefix}${a}`).join(', ')}`
      : ''

    await client.message.send(
      remoteJid,
      `*BANTUAN: ${prefix}${found.name}*${badgeStr}${aliasStr}\n\n${found.description}`,
      { quote: event }
    )
  },
}

export default helpCommand
