// src/plugins/general/menu.ts

import type { SubCommand } from '../../types/index.ts'
import { botConfig } from '../../core/config.ts'
import { getAllCommands } from '../../core/loader.ts'

export const menuCommand: SubCommand = {
  name: 'menu',
  alias: ['helpall'],
  category: 'general',
  description: 'Tampilkan daftar fitur bot',

  async handler({ client, remoteJid, senderName, isOwner, isAdmin, isBotAdmin, isGroup, event }) {
    const prefix = process.env.PREFIX ?? '!'
    const currentMode = botConfig.getMode().toUpperCase()
    const allCommands = getAllCommands()

    let roleLabel = 'User'
    if (isGroup) {
      if (isAdmin) {
        roleLabel = 'Admin Grup'
      } else if (isOwner) {
        roleLabel = 'Owner'
      } else {
        roleLabel = 'Member'
      }
    } else if (isOwner) {
      roleLabel = 'Owner'
    }

    const formatList = (cmds: SubCommand[]) =>
      cmds.map((c) => `  • ${prefix}${c.name}`)

    const generalCmds = allCommands.filter(
      (c) => c.category === 'general' || (!c.category && !c.ownerOnly && !c.adminOnly && !c.groupOnly)
    )
    const stickerCmds = allCommands.filter((c) => c.category === 'sticker')
    const downloadCmds = allCommands.filter((c) => c.category === 'downloader')
    const groupMemberCmds = allCommands.filter(
      (c) => c.category === 'group' || (c.groupOnly && !c.adminOnly && !c.ownerOnly)
    )
    const groupAdminCmds = allCommands.filter((c) => c.category === 'groupAdmin' || (c.adminOnly && !c.ownerOnly))
    const ownerCmds = allCommands.filter((c) => c.category === 'owner' || c.ownerOnly)

    const bodyParts: string[] = [
      `*MENU*`,
      `User: ${senderName || 'Pengguna'} | Role: ${roleLabel} | Mode: ${currentMode}`,
      ``,
      `*Utama*`,
      ...formatList(generalCmds),
    ]

    if (downloadCmds.length > 0) {
      bodyParts.push(``, `*Downloader*`, ...formatList(downloadCmds))
    }

    if (stickerCmds.length > 0) {
      bodyParts.push(``, `*Stiker*`, ...formatList(stickerCmds))
    }

    if (isGroup && groupMemberCmds.length > 0) {
      bodyParts.push(``, `*Grup*`, ...formatList(groupMemberCmds))
    }

    // Fitur Admin Grup: HANYA jika di grup dan pengirim adalah Admin Grup asli
    // Jika bot bukan admin grup, sembunyikan fitur yang membutuhkan bot admin
    if (isGroup && isAdmin) {
      const availableAdminCmds = groupAdminCmds.filter((c) => {
        if (c.botAdminRequired && !isBotAdmin) return false
        return true
      })

      if (availableAdminCmds.length > 0) {
        bodyParts.push(``, `*Admin Grup*`, ...formatList(availableAdminCmds))
      }
    }

    if (isOwner && ownerCmds.length > 0) {
      bodyParts.push(``, `*Owner*`, ...formatList(ownerCmds))
    }

    bodyParts.push(``, `Ketik *${prefix}help <cmd>* untuk info detail.`)

    await client.message.send(remoteJid, bodyParts.join('\n'), { quote: event })
  },
}

export default menuCommand
